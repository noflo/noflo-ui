import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDacarNode, mintAuthorization } from "../../src/worker/Dacar.js";
import {
  createDacarLinkAuthorizer,
  createPayloadReassembler,
  encodeAuthPayload,
} from "../../src/worker/DacarLinkAuth.js";
import { Identity, toHex } from "../../vendor/reticulum-core.js";

/**
 * A fake link authorization exchange: collects sent chunks, replays a
 * scripted peer response to the first receive.
 *
 * @param {any[]} responses
 * @returns {{ exchange: any, sent: any[] }}
 */
function fakeExchange(responses = []) {
  /** @type {any[]} */
  const sent = [];
  return {
    sent,
    exchange: {
      send: async (/** @type {Uint8Array} */ chunk) => {
        sent.push(chunk);
      },
      receive: async () => {
        const next = responses.shift();
        if (!next) throw new Error("no scripted response");
        return next;
      },
    },
  };
}

describe("Dacar link authorization (work document #25 §6.2)", async () => {
  const anchor = await Identity.generate();
  const joiner = await Identity.generate();
  const outsider = await Identity.generate();
  const joinerHash = toHex(joiner.getSalt());
  const projectId = "p1";
  const salt = "7f".repeat(32);
  const { mintAuthorization: mint } = await import("../../src/worker/Dacar.js");

  const mintJoiner = () =>
    mintAuthorization({
      anchorIdentity: anchor,
      subjectHex: joinerHash,
      projectId,
      role: "developer",
      salt,
    });

  /**
   * A configured Dacar node that knows the real anchor.
   *
   * @returns {Promise<ReturnType<typeof createDacarNode>>}
   */
  const configuredNode = async () => {
    const node = createDacarNode();
    node.configure({
      anchorHashHex: toHex(anchor.getSalt()),
      anchorPubkeyHex: toHex(await anchor.getPublicKey()),
      salt,
    });
    return node;
  };

  it("round-trips a large payload through chunking", () => {
    const payload = {
      grants: [{ subject: joinerHash, deltas: "x".repeat(900) }],
    };
    const chunks = encodeAuthPayload(payload);
    assert.ok(chunks.length > 1, "payload split into chunks");
    const reassembler = createPayloadReassembler();
    /** @type {any} */
    let result = null;
    for (const chunk of chunks) {
      result = reassembler.push(chunk);
    }
    assert.deepEqual(result, payload);
  });

  it("passes a single-part payload through unchanged", () => {
    const payload = { grants: [] };
    const chunks = encodeAuthPayload(payload);
    assert.equal(chunks.length, 1);
    assert.deepEqual(createPayloadReassembler().push(chunks[0]), payload);
  });

  it("allows a peer whose grant the local node already holds", async () => {
    const authorizer = createDacarLinkAuthorizer({
      isGranted: (hash) => hash === joinerHash,
      isInRequesterMode: () => false,
      ownAuthorization: () => null,
      ensureDacarNode: configuredNode,
      projectId: () => projectId,
    });
    const { exchange, sent } = fakeExchange();
    assert.equal(
      await authorizer({
        remoteIdentityHash: joinerHash,
        exchange,
      }),
      true,
    );
    assert.equal(sent.length, 0, "no exchange needed for locally known peers");
  });

  it("allows a requester-mode device to dial", async () => {
    const authorizer = createDacarLinkAuthorizer({
      isGranted: () => false,
      isInRequesterMode: () => true,
      ownAuthorization: () => null,
      ensureDacarNode: configuredNode,
      projectId: () => projectId,
    });
    const { exchange, sent } = fakeExchange();
    assert.equal(
      await authorizer({ remoteIdentityHash: joinerHash, exchange }),
      true,
    );
    assert.equal(sent.length, 0);
  });

  it("verifies a peer presenting its own valid assertion", async () => {
    const node = await configuredNode();
    const authorization = await mintJoiner();
    // The presenting side's response: chunked like the wire
    const chunks = encodeAuthPayload({ grants: [authorization] });
    const authorizer = createDacarLinkAuthorizer({
      isGranted: () => false,
      isInRequesterMode: () => false,
      ownAuthorization: () => null,
      ensureDacarNode: async () => node,
      projectId: () => projectId,
    });
    const { exchange, sent } = fakeExchange(chunks);
    assert.equal(
      await authorizer({ remoteIdentityHash: joinerHash, exchange }),
      true,
      "the Engine allows the verified grantee",
    );
    assert.ok(sent.length > 0, "our own assertion was presented");
  });

  it("refuses a third party's replayed assertion", async () => {
    const node = await configuredNode();
    const authorization = await mintJoiner();
    const chunks = encodeAuthPayload({ grants: [authorization] });
    const authorizer = createDacarLinkAuthorizer({
      isGranted: () => false,
      isInRequesterMode: () => false,
      ownAuthorization: () => null,
      ensureDacarNode: async () => node,
      projectId: () => projectId,
    });
    const { exchange } = fakeExchange(chunks);
    // The proven remote identity is the outsider, not the grant's subject
    assert.equal(
      await authorizer({
        remoteIdentityHash: toHex(outsider.getSalt()),
        exchange,
      }),
      false,
      "a grant naming someone else proves nothing",
    );
  });

  it("refuses a peer with no verifiable grant", async () => {
    const node = await configuredNode();
    const chunks = encodeAuthPayload({ grants: [] });
    const authorizer = createDacarLinkAuthorizer({
      isGranted: () => false,
      isInRequesterMode: () => false,
      ownAuthorization: () => null,
      ensureDacarNode: async () => node,
      projectId: () => projectId,
    });
    const { exchange } = fakeExchange(chunks);
    assert.equal(
      await authorizer({ remoteIdentityHash: joinerHash, exchange }),
      false,
    );
  });

  it("refuses when the local node is unconfigured", async () => {
    const chunks = encodeAuthPayload({ grants: [] });
    const authorizer = createDacarLinkAuthorizer({
      isGranted: () => false,
      isInRequesterMode: () => false,
      ownAuthorization: () => null,
      ensureDacarNode: async () => null,
      projectId: () => projectId,
    });
    const { exchange } = fakeExchange(chunks);
    assert.equal(
      await authorizer({ remoteIdentityHash: joinerHash, exchange }),
      false,
      "no designated anchor means no verification is possible",
    );
  });
});
