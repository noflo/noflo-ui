import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildInviteUri,
  createBootstrapHost,
  DECLINE_REASON,
  generateInviteToken,
  joinViaBootstrapInvite,
  STATE,
} from "../../src/worker/Bootstrap.js";
import {
  createDacarNode,
  mintAuthorization as mintDacar,
} from "../../src/worker/Dacar.js";
import { Identity, toHex } from "../../vendor/reticulum-core.js";
import { makeLoopback } from "./loopback-peer.js";

/** Tracks live loopbacks so afterEach can tear them down. */
/** @type {Array<{ close: () => Promise<void> }>} */
const openLoopbacks = [];

afterEach(async () => {
  for (const entry of openLoopbacks.splice(0)) {
    await entry.close().catch(() => {});
  }
});

/**
 * Builds a host + joiner pair over a TCP loopback with Dacar-backed decision
 * hooks (the host identity acts as the project Trust Anchor), plus the
 * test's handles into the host decision engine.
 *
 * @param {{ granted?: boolean, authority?: boolean, validToken?: boolean }} [options]
 */
async function makePair(options = {}) {
  const loopback = await makeLoopback();
  openLoopbacks.push(loopback);
  const rnsHost = loopback.rnsA;
  const rnsJoiner = loopback.rnsB;
  const identityHost = await Identity.generate();
  const identityJoiner = await Identity.generate();
  const joinerHash = toHex(identityJoiner.getSalt());
  const projectId = "test-project-id";

  /** @type {string[]} */
  const approvalPrompts = [];
  /** @type {Array<(decision: "approved" | "declined") => void>} */
  const approvalResolvers = [];
  const minted = [];
  /** @type {Map<string, any>} */
  const authorizations = new Map();
  /** Grants delivered via the §11 direct-link push, per joiner hash. */
  /** @type {Array<{ peerHash: string, authorization: any }>} */
  const deliveries = [];

  const mintAuthorization = async (/** @type {string} */ peerHash) => {
    const authorization = await mintDacar({
      anchorIdentity: identityHost,
      subjectHex: peerHash,
      projectId,
      role: "developer",
      salt: "ab".repeat(32),
    });
    authorizations.set(peerHash, authorization);
    minted.push(peerHash);
    return authorization;
  };

  const host = await createBootstrapHost({
    reticulum: rnsHost,
    identity: identityHost,
    projectId,
    projectName: "Test project",
    isGranted: () => options.granted === true,
    getAuthorization: (/** @type {string} */ peerHash) =>
      authorizations.get(peerHash) ?? null,
    mintAuthorization,
    hasAuthority: () => options.authority !== false,
    requestApproval: (/** @type {string} */ identityHash) => {
      approvalPrompts.push(identityHash);
      return new Promise((resolve) => approvalResolvers.push(resolve));
    },
    isValidInviteToken: () => options.validToken !== false,
    deliverAuthorization: async (
      /** @type {string} */ peerHash,
      /** @type {any} */ authorization,
    ) => {
      deliveries.push({ peerHash, authorization });
    },
    announceIntervalMs: 60_000,
  });

  const invite = {
    hostDestinationHash: host.destinationHash,
    token: generateInviteToken(),
  };
  return {
    loopback,
    rnsHost,
    rnsJoiner,
    host,
    invite,
    inviteUri: buildInviteUri(invite),
    identityHost,
    identityJoiner,
    joinerHash,
    projectId,
    approvalPrompts,
    approvalResolvers,
    minted,
    authorizations,
    deliveries,
  };
}

describe("bootstrap host decision engine (work document #25 §3.1)", () => {
  it("approves a knock after the host user approves and hands off the grant", {
    timeout: 30_000,
  }, async () => {
    const pair = await makePair();
    /** @type {string[]} */
    const states = [];
    const joinPromise = joinViaBootstrapInvite({
      reticulum: /** @type {any} */ (pair.rnsJoiner),
      identity: pair.identityJoiner,
      invite: pair.invite,
      onState: (/** @type {string} */ state) => states.push(state),
      timeoutMs: 20_000,
    });
    // The host user approves when the prompt surfaces
    const poll = setInterval(() => {
      for (const resolve of pair.approvalResolvers.splice(0))
        resolve("approved");
    }, 200);
    try {
      const response = await joinPromise;
      clearInterval(poll);
      assert.equal(response.status, "approved");
      assert.equal(response.project.id, "test-project-id");
      assert.equal(response.project.name, "Test project");
      // §4.2/§10: the wire response carries the small Dacar node bootstrap
      // (Trust Anchor + salt); the signed grant travels via the §11
      // direct-link Delta push
      assert.ok(response.config, "handoff carries a Dacar node config");
      assert.equal(
        response.config.anchor.hash,
        toHex(pair.identityHost.getSalt()),
      );
      assert.equal(response.config.salt, "ab".repeat(32));
      assert.deepEqual(response.config.permissions, ["sync", "write"]);
      assert.equal(response.authorization, undefined, "no grant on the wire");
      assert.equal(pair.deliveries.length, 1, "grant pushed out-of-band");
      assert.equal(pair.deliveries[0].peerHash, pair.joinerHash);
      // A recipient configured from the handoff authorizes through the
      // Dacar Engine once the pushed grant is ingested
      const node = createDacarNode();
      node.configure({
        anchorHashHex: response.config.anchor.hash,
        anchorPubkeyHex: response.config.anchor.pubkey,
        salt: response.config.salt,
      });
      assert.equal(
        await node.ingestAuthorization(pair.deliveries[0].authorization),
        2,
      );
      assert.equal(
        await node.evaluate(pair.projectId, "sync", pair.joinerHash),
        true,
      );
      assert.equal(
        await node.evaluate(pair.projectId, "write", pair.joinerHash),
        true,
      );
      assert.ok(pair.minted.includes(pair.joinerHash), "grant minted");
      assert.ok(
        states.includes(STATE.REQUESTING_PATH) &&
          states.includes(STATE.LINKING) &&
          states.includes(STATE.KNOCKING) &&
          states.includes(STATE.WAIT_RESPONSE) &&
          states.includes(STATE.APPROVED),
        `state machine ran: ${states.join(" → ")}`,
      );
    } finally {
      clearInterval(poll);
      await pair.host.stop();
    }
  });

  it("declines with host_rejected when the host user declines", {
    timeout: 30_000,
  }, async () => {
    const pair = await makePair();
    const poll = setInterval(() => {
      for (const resolve of pair.approvalResolvers.splice(0))
        resolve("declined");
    }, 200);
    try {
      const response = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      clearInterval(poll);
      assert.equal(response.status, "declined");
      assert.equal(response.reason, DECLINE_REASON.HOST_REJECTED);
      assert.equal(pair.minted.length, 0, "no grant minted on decline");
    } finally {
      clearInterval(poll);
      await pair.host.stop();
    }
  });

  it("declines with host_lacks_authority when the host holds no authority", {
    timeout: 30_000,
  }, async () => {
    const pair = await makePair({ authority: false });
    try {
      const response = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      assert.equal(response.status, "declined");
      assert.equal(response.reason, DECLINE_REASON.HOST_LACKS_AUTHORITY);
      assert.equal(pair.approvalPrompts.length, 0, "no UI prompt");
    } finally {
      await pair.host.stop();
    }
  });

  it("declines with invalid_token for tokens the host never issued", {
    timeout: 30_000,
  }, async () => {
    const pair = await makePair({ validToken: false });
    try {
      const response = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      assert.equal(response.status, "declined");
      assert.equal(response.reason, DECLINE_REASON.INVALID_TOKEN);
      assert.equal(pair.approvalPrompts.length, 0, "no UI prompt");
    } finally {
      await pair.host.stop();
    }
  });

  it("answers an already-granted joiner immediately and re-dials idempotently", {
    timeout: 45_000,
  }, async () => {
    const pair = await makePair({ granted: true });
    try {
      const response = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      assert.equal(response.status, "approved");
      assert.equal(
        pair.approvalPrompts.length,
        0,
        "no prompt for an already-granted joiner",
      );
      // Re-dial: same idempotent answer, still no prompt
      const second = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      assert.equal(second.status, "approved");
      assert.equal(
        second.config.salt,
        response.config.salt,
        "the stored grant re-handoffs",
      );
      assert.equal(pair.approvalPrompts.length, 0);
    } finally {
      await pair.host.stop();
    }
  });

  it("remembers a decline: a re-dial gets the same answer without a new prompt", {
    timeout: 45_000,
  }, async () => {
    const pair = await makePair();
    const poll = setInterval(() => {
      for (const resolve of pair.approvalResolvers.splice(0))
        resolve("declined");
    }, 200);
    try {
      const first = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      clearInterval(poll);
      assert.equal(first.status, "declined");
      assert.equal(first.reason, DECLINE_REASON.HOST_REJECTED);
      const second = await joinViaBootstrapInvite({
        reticulum: /** @type {any} */ (pair.rnsJoiner),
        identity: pair.identityJoiner,
        invite: pair.invite,
        timeoutMs: 20_000,
      });
      assert.equal(second.status, "declined");
      assert.equal(second.reason, DECLINE_REASON.HOST_REJECTED);
      assert.equal(pair.approvalPrompts.length, 1, "prompted exactly once");
    } finally {
      clearInterval(poll);
      await pair.host.stop();
    }
  });
});
