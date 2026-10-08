import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bindFilePersistence,
  createFileStorage,
} from "../../src/node/persistence.js";
import * as Y from "../../vendor/yjs.js";

describe("file-backed persistence (work document #44, M1)", () => {
  it("restores the doc state across a destroy/rebind cycle", async () => {
    const filePath = `/tmp/noflo-persistence-spec-${Date.now()}.bin`;
    const first = new Y.Doc();
    const binder = bindFilePersistence(first, filePath, { debounceMs: 10 });
    await binder.ready;
    first.getMap("metadata").set("id", "project-1");
    first.getMap("graphs").set("main", new Y.Map());
    await new Promise((resolve) => setTimeout(resolve, 50));
    await binder.destroy();

    const second = new Y.Doc();
    const rebound = bindFilePersistence(second, filePath, { debounceMs: 10 });
    await rebound.ready;
    assert.equal(second.getMap("metadata").get("id"), "project-1");
    assert.ok(second.getMap("graphs").get("main"), "the graph restores");
    await rebound.destroy();
  });

  it("survives unmerged remote updates: the snapshot merges", async () => {
    const filePath = `/tmp/noflo-persistence-spec-${Date.now()}-b.bin`;
    // A "remote" doc writes state the local doc has never seen
    const remote = new Y.Doc();
    remote.getMap("metadata").set("name", "From the mesh");
    const update = Y.encodeStateAsUpdate(remote);

    const local = new Y.Doc();
    const binder = bindFilePersistence(local, filePath, { debounceMs: 10 });
    await binder.ready;
    Y.applyUpdate(local, update);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await binder.destroy();

    const reopened = new Y.Doc();
    const rebound = bindFilePersistence(reopened, filePath, { debounceMs: 10 });
    await rebound.ready;
    assert.equal(reopened.getMap("metadata").get("name"), "From the mesh");
    await rebound.destroy();
  });

  it("the file-backed mesh storage round-trips", async () => {
    const filePath = `/tmp/noflo-storage-spec-${Date.now()}.json`;
    const storage = createFileStorage(filePath);
    await storage.set("activeProjectId", "project-9");
    const reopened = createFileStorage(filePath);
    assert.equal(await reopened.get("activeProjectId"), "project-9");
    assert.equal(await reopened.get("missing"), null);
  });
});
