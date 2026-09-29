import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createProjectDoc,
  getProjectMetadata,
  PROJECT_SCHEMA_VERSION,
} from "../../src/crdt/ProjectDoc.js";
import { migrateLoadedProject } from "../../src/crdt/ProjectPersistence.js";

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
