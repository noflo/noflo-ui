import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listNofloDatabases,
  performFactoryReset,
} from "../../src/worker/FactoryReset.js";

/**
 * A fake IDBFactory: records deleteDatabase calls; a delete completes only
 * when its database is in `completing` (Safari's "blocked" behavior is
 * simulated by a name in `blocked`, which never completes).
 *
 * @param {{ completing: string[], blocked: string[] }} options
 * @returns {{ indexeddb: IDBFactory, deleted: string[] }}
 */
function fakeIndexeddb({ blocked }) {
  /** @type {string[]} */
  const deleted = [];
  const indexeddb = {
    deleteDatabase(/** @type {string} */ name) {
      const request = {
        onsuccess: /** @type {(() => void) | null} */ (null),
        onerror: /** @type {(() => void) | null} */ (null),
        onblocked: /** @type {(() => void) | null} */ (null),
      };
      if (blocked.includes(name)) {
        setTimeout(() => request.onblocked?.(), 10);
        setTimeout(() => request.onsuccess?.(), 60_000); // never reached
      } else {
        setTimeout(() => {
          deleted.push(name);
          request.onsuccess?.();
        }, 5);
      }
      return request;
    },
  };
  return { indexeddb: /** @type {any} */ (indexeddb), deleted };
}

describe("Factory reset (work document #26)", () => {
  it("closes storages and deletes every requested database", async () => {
    const { indexeddb, deleted } = fakeIndexeddb({
      completing: ["noflo-mesh", "noflo-dacar"],
      blocked: [],
    });
    /** @type {string[]} */
    const closed = [];
    await performFactoryReset({
      indexeddb,
      storages: [
        { close: () => closed.push("a") },
        undefined,
        { close: () => closed.push("c") },
      ],
      databaseNames: ["noflo-mesh", "noflo-dacar"],
    });
    assert.deepEqual(closed, ["a", "c"], "every storage closed");
    assert.deepEqual(deleted.sort(), ["noflo-dacar", "noflo-mesh"]);
  });

  it("resolves past a Safari-blocked delete via the timeout", async () => {
    const { indexeddb, deleted } = fakeIndexeddb({
      completing: ["noflo-mesh"],
      blocked: ["noflo-project-x"],
    });
    await performFactoryReset({
      indexeddb,
      databaseNames: ["noflo-mesh", "noflo-project-x"],
      timeoutMs: 100,
    });
    assert.deepEqual(deleted, ["noflo-mesh"], "the blocked delete never lands");
  });

  it("tolerates storage close() failures", async () => {
    const { indexeddb, deleted } = fakeIndexeddb({
      completing: ["noflo-mesh"],
      blocked: [],
    });
    await performFactoryReset({
      indexeddb,
      storages: [
        {
          close() {
            throw new Error("close failed");
          },
        },
      ],
      databaseNames: ["noflo-mesh"],
    });
    assert.deepEqual(deleted, ["noflo-mesh"]);
  });

  it("lists noflo databases, filtered from everything else", async () => {
    const indexeddb = /** @type {any} */ ({
      async databases() {
        return [
          { name: "noflo-mesh" },
          { name: "noflo-project-abc" },
          { name: "unrelated-app" },
        ];
      },
    });
    const names = await listNofloDatabases(indexeddb, [
      "noflo-dacar",
      "noflo-project",
    ]);
    assert.deepEqual(names.sort(), [
      "noflo-dacar",
      "noflo-mesh",
      "noflo-project",
      "noflo-project-abc",
    ]);
  });

  it("falls back to the known names when enumeration is unsupported", async () => {
    const indexeddb = /** @type {any} */ ({}); // no databases()
    const names = await listNofloDatabases(indexeddb, ["noflo-mesh"]);
    assert.deepEqual(names, ["noflo-mesh"]);
  });
});
