import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "../../src/crdt/MeshConfig.js";
import { computeGrantId, projectResource } from "../../src/worker/Dacar.js";
import {
  listWalletGrants,
  loadWalletGrant,
  saveWalletGrant,
} from "../../src/worker/DacarWallet.js";
import { Identity, toHex } from "../../vendor/reticulum-core.js";

describe("Dacar wallet (work document #25 §5.2)", async () => {
  const anchor = await Identity.generate();
  const joiner = await Identity.generate();
  const joinerHash = toHex(joiner.getSalt());
  const projectId = "a40871e2-36c1-4b11-9a4f-6d21051fa8b2";
  const salt = "7f".repeat(32);
  const { mintAuthorization } = await import("../../src/worker/Dacar.js");

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

  it("catalogs an authorization keyed by sha256(subject + resource)", async () => {
    const storage = createMemoryStorage();
    const authorization = await mint(joinerHash);
    const record = await saveWalletGrant(storage, {
      projectId,
      authorization,
    });
    assert.ok(record);
    const grantId = await computeGrantId(
      joinerHash,
      projectResource(projectId),
    );
    assert.equal(record.grantId, grantId);
    assert.equal(record.projectId, projectId);
    assert.equal(record.trustAnchor.hash, toHex(anchor.getSalt()));
    assert.equal(record.assertion.subject, joinerHash);
    assert.equal(record.assertion.resource, projectResource(projectId));
    assert.deepEqual(record.assertion.permissions, ["sync", "write"]);
    assert.equal(record.assertion.expires, null);
    assert.equal(record.unblindedScope, projectResource(projectId));
    assert.ok(record.deltas.length > 0, "carries the signed batch");
    assert.deepEqual(await loadWalletGrant(storage, grantId), record);
    assert.deepEqual(await listWalletGrants(storage), [record]);
  });

  it("overwrites the same grant id on idempotent re-save", async () => {
    const storage = createMemoryStorage();
    const authorization = await mint(joinerHash);
    await saveWalletGrant(storage, { projectId, authorization });
    await saveWalletGrant(storage, { projectId, authorization });
    assert.equal((await listWalletGrants(storage)).length, 1);
  });

  it("keeps distinct grants in distinct slots", async () => {
    const storage = createMemoryStorage();
    await saveWalletGrant(storage, {
      projectId,
      authorization: await mint(joinerHash),
    });
    const other = await Identity.generate();
    await saveWalletGrant(storage, {
      projectId,
      authorization: await mint(toHex(other.getSalt())),
    });
    const wildcard = await mint(joinerHash, "observer");
    await saveWalletGrant(storage, {
      projectId: "other-project",
      authorization: { ...wildcard, resource: "noflo-ui:*" },
    });
    assert.equal((await listWalletGrants(storage)).length, 3);
  });

  it("refuses to catalog an authorization without subject or resource", async () => {
    const storage = createMemoryStorage();
    assert.equal(
      await saveWalletGrant(storage, {
        projectId,
        authorization: { assertions: [] },
      }),
      null,
    );
    assert.equal((await listWalletGrants(storage)).length, 0);
  });
});
