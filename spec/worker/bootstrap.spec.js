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
 * Builds a host + joiner pair over a TCP loopback with the minimal decision
 * hooks, plus the test's handles into the host decision engine.
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

  /** @type {string[]} */
  const approvalPrompts = [];
  /** @type {Array<(decision: "approved" | "declined") => void>} */
  const approvalResolvers = [];
  const minted = [];

  const host = await createBootstrapHost({
    reticulum: rnsHost,
    identity: identityHost,
    projectId: "test-project-id",
    projectName: "Test project",
    isGranted: () => options.granted === true,
    getGrant: (/** @type {string} */ peerHash) => ({
      peerHash,
      role: "developer",
      issued: 1234,
    }),
    mintGrant: (/** @type {string} */ peerHash) => {
      minted.push(peerHash);
      return { peerHash, role: "developer", issued: Date.now() };
    },
    hasAuthority: () => options.authority !== false,
    requestApproval: (/** @type {string} */ identityHash) => {
      approvalPrompts.push(identityHash);
      return new Promise((resolve) => approvalResolvers.push(resolve));
    },
    isValidInviteToken: () => options.validToken !== false,
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
    approvalPrompts,
    approvalResolvers,
    minted,
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
      assert.equal(response.grant.peerHash, pair.joinerHash);
      assert.equal(response.grant.role, "developer");
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
      assert.equal(response.grant.peerHash, pair.joinerHash);
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
      assert.equal(second.grant.issued, response.grant.issued);
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
