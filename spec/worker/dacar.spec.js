import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizationFingerprint,
  computeGrantId,
  createDacarNode,
  generateSalt,
  mintAuthorization,
  projectResource,
  WILDCARD_RESOURCE,
} from "../../src/worker/Dacar.js";
import { Identity, toHex } from "../../vendor/reticulum-core.js";

describe("Dacar grants (work document #25 §2, §4.2)", async () => {
  const anchor = await Identity.generate();
  const joiner = await Identity.generate();
  const anchorHash = toHex(anchor.getSalt());
  const joinerHash = toHex(joiner.getSalt());
  const projectId = "a40871e2-36c1-4b11-9a4f-6d21051fa8b2";
  const salt = "7f".repeat(32);

  /**
   * Builds a Dacar node configured as a recipient of this project's grants.
   *
   * @returns {Promise<ReturnType<typeof createDacarNode>>}
   */
  const recipient = async () => {
    const node = createDacarNode();
    node.configure({
      anchorHashHex: anchorHash,
      anchorPubkeyHex: toHex(await anchor.getPublicKey()),
      salt,
    });
    return node;
  };

  /**
   * @param {string} subjectHex
   * @param {string} [role]
   */
  const mint = (subjectHex, role = "developer") =>
    mintAuthorization({
      anchorIdentity: anchor,
      subjectHex,
      projectId,
      role,
      salt,
    });

  it("mints a grant that authorizes through the Dacar Engine", async () => {
    const authorization = await mint(joinerHash);
    assert.equal(authorization.anchor.hash, anchorHash);
    assert.equal(authorization.subject, joinerHash);
    assert.equal(authorization.resource, projectResource(projectId));
    assert.deepEqual(authorization.permissions, ["sync", "write"]);
    assert.equal(authorization.salt, salt);
    assert.ok(Number.isFinite(authorization.issued_at), "mint timestamp");
    // Clock-drift safety (§7): grants never expire by default
    assert.equal(authorization.expires, null);
    assert.ok(authorization.deltas.length > 0, "carries a signed batch");

    const node = await recipient();
    assert.equal(await node.ingestAuthorization(authorization), 2);
    assert.equal(
      await node.evaluate(projectId, "sync", joinerHash),
      true,
      "sync allowed",
    );
    assert.equal(
      await node.evaluate(projectId, "write", joinerHash),
      true,
      "write allowed",
    );
    // A peer without a grant is not authorized
    const outsider = await Identity.generate();
    assert.equal(
      await node.evaluate(projectId, "sync", toHex(outsider.getSalt())),
      false,
    );
  });

  it("grants observer only the sync permission", async () => {
    const authorization = await mint(joinerHash, "observer");
    const node = await recipient();
    assert.equal(await node.ingestAuthorization(authorization), 1);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), true);
    assert.equal(await node.evaluate(projectId, "write", joinerHash), false);
  });

  it("rejects an unknown role and a malformed salt", async () => {
    await assert.rejects(
      mint(anchorHash, "admin"),
      /Unknown role for Dacar grant/,
    );
    await assert.rejects(
      mintAuthorization({
        anchorIdentity: anchor,
        subjectHex: joinerHash,
        projectId,
        role: "developer",
        salt: "short",
      }),
      /salt must be 32/,
    );
  });

  it("drops only the forged element of a tampered batch", async () => {
    const authorization = await mint(joinerHash);
    const raw = atob(authorization.deltas);
    // Flip a byte inside the last payload's trailing Ed25519 signature:
    // verify-on-ingest drops that delta and keeps the rest
    const tampered = btoa(
      raw.slice(0, raw.length - 5) +
        String.fromCharCode(raw.charCodeAt(raw.length - 5) ^ 0xff) +
        raw.slice(raw.length - 4),
    );
    const node = await recipient();
    assert.equal(await node.ingestDeltas(base64ToBytes(tampered)), 1);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), true);
    assert.equal(await node.evaluate(projectId, "write", joinerHash), false);
  });

  it("evaluates a foreign-salt grant as unauthorized", async () => {
    // Signature verification is salt-agnostic: the grant still ingests, but
    // the Engine hashes requests with the configured salt, so the plaintext
    // scope never matches (§10.2 salt rotation works the same way)
    const authorization = await mint(joinerHash);
    const node = createDacarNode();
    node.configure({
      anchorHashHex: anchorHash,
      anchorPubkeyHex: toHex(await anchor.getPublicKey()),
      salt: "cd".repeat(32),
    });
    assert.equal(await node.ingestAuthorization(authorization), 2);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), false);
  });

  it("refuses a grant whose subject is not the grantee", async () => {
    const authorization = await mint(joinerHash);
    const impostor = await Identity.generate();
    const node = await recipient();
    // The Engine evaluates the impostor's hash: no tuple grants it
    await node.ingestAuthorization(authorization);
    assert.equal(
      await node.evaluate(projectId, "sync", toHex(impostor.getSalt())),
      false,
    );
  });

  it("refuses an unknown trust anchor (work document #25 §7)", async () => {
    const impostor = await Identity.generate();
    const authorization = await mintAuthorization({
      anchorIdentity: impostor,
      subjectHex: joinerHash,
      projectId,
      role: "developer",
      salt,
    });
    const node = await recipient();
    // The recipient is configured for the real anchor: the impostor's grant
    // is bound against the designated anchor and refused before ingestion
    assert.equal(await node.ingestAuthorization(authorization), 0);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), false);
  });

  it("refuses an anchor whose public key does not hash to its claim", async () => {
    const authorization = await mint(joinerHash);
    const other = await Identity.generate();
    const node = await recipient();
    const forged = {
      ...authorization,
      anchor: {
        ...authorization.anchor,
        pubkey: toHex(await other.getPublicKey()),
      },
    };
    assert.equal(await node.ingestAuthorization(forged), 0);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), false);
  });

  it("refuses deltas while unconfigured", async () => {
    const authorization = await mint(joinerHash);
    const node = createDacarNode();
    // No designated anchor known yet: nothing is authenticated or applied
    assert.equal(
      await node.ingestDeltas(base64ToBytes(authorization.deltas)),
      0,
    );
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), null);
  });

  it("resets state on demand (tombstone rebuilds)", async () => {
    const authorization = await mint(joinerHash);
    const node = await recipient();
    await node.ingestAuthorization(authorization);
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), true);
    node.reset();
    assert.equal(await node.evaluate(projectId, "sync", joinerHash), false);
  });

  it("derives deterministic wallet grant ids", async () => {
    const first = await computeGrantId(joinerHash, projectResource(projectId));
    const second = await computeGrantId(joinerHash, projectResource(projectId));
    assert.equal(first, second);
    const otherSubject = await computeGrantId(
      anchorHash,
      projectResource(projectId),
    );
    const otherResource = await computeGrantId(joinerHash, WILDCARD_RESOURCE);
    assert.notEqual(first, otherSubject);
    assert.notEqual(first, otherResource);
  });

  it("fingerprints grant content stably for dedupe", async () => {
    const authorization = await mint(joinerHash);
    assert.equal(
      authorizationFingerprint(authorization),
      authorizationFingerprint(JSON.parse(JSON.stringify(authorization))),
    );
    const other = await mint(anchorHash);
    assert.notEqual(
      authorizationFingerprint(authorization),
      authorizationFingerprint(other),
    );
  });

  it("generates 32-byte salts", async () => {
    const generated = await generateSalt();
    assert.match(generated, /^[0-9a-f]{64}$/);
    assert.notEqual(generated, salt);
  });
});

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
