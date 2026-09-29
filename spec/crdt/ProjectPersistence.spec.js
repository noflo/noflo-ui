import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createProjectDoc,
  getProjectMetadata,
  PROJECT_SCHEMA_VERSION,
} from "../../src/crdt/ProjectDoc.js";
import {
  checkEviction,
  EVICTION_WARN_FRACTION,
  migrateLoadedProject,
} from "../../src/crdt/ProjectPersistence.js";

describe("checkEviction", () => {
  it("returns null when storage estimates are unsupported", async () => {
    assert.equal(await checkEviction(undefined), null);
    assert.equal(await checkEviction({}), null);
  });

  it("reports ok under the warn threshold", async () => {
    const status = await checkEviction({
      estimate: async () => ({ usage: 100, quota: 1000 }),
    });
    assert.ok(status);
    assert.equal(status.level, "ok");
    assert.equal(status.fraction, 0.1);
  });

  it("warns when usage crosses the threshold", async () => {
    const status = await checkEviction(
      { estimate: async () => ({ usage: 850, quota: 1000 }) },
      { warnFraction: EVICTION_WARN_FRACTION },
    );
    assert.ok(status);
    assert.equal(status.level, "warning");
  });

  it("honors a custom warn fraction", async () => {
    const status = await checkEviction(
      { estimate: async () => ({ usage: 500, quota: 1000 }) },
      { warnFraction: 0.4 },
    );
    assert.ok(status);
    assert.equal(status.level, "warning");
  });
});

describe("migrateLoadedProject", () => {
  it("stamps and migrates a freshly loaded legacy document", () => {
    const doc = createProjectDoc("p");
    getProjectMetadata(doc).delete("schemaVersion");

    const result = migrateLoadedProject(doc);
    assert.equal(result.migrated, true);
    assert.equal(
      getProjectMetadata(doc).get("schemaVersion"),
      PROJECT_SCHEMA_VERSION,
    );
  });

  it("is a no-op for current documents", () => {
    const doc = createProjectDoc("p");
    const result = migrateLoadedProject(doc);
    assert.equal(result.migrated, false);
  });
});
