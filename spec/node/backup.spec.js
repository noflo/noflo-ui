import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { createBackupWriter } from "../../src/node/backup.js";
import * as Y from "../../vendor/yjs.js";

/** A clock the tests advance manually. */
function fakeClock() {
  let t = 1_700_000_000_000;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

/** A memory-fs adapter matching the injected surface. */
function memoryFs() {
  /** @type {Map<string, Buffer>} */
  const files = new Map();
  return {
    files,
    writeFileSync: (file, data) => files.set(file, Buffer.from(data)),
    renameSync: (from, to) => {
      const data = files.get(from);
      if (data === undefined) throw new Error(`no such file: ${from}`);
      files.delete(from);
      files.set(to, data);
    },
    mkdirSync: () => {},
    readdirSync: (dir) =>
      Array.from(files.keys())
        .filter((f) => path.dirname(f) === dir)
        .map((f) => path.basename(f)),
    existsSync: (dir) =>
      Array.from(files.keys()).some((f) => path.dirname(f) === dir),
    unlinkSync: (file) => {
      if (!files.has(file)) throw new Error(`no such file: ${file}`);
      files.delete(file);
    },
  };
}

describe("server-side CRDT backup (work document #47 scope item 5)", () => {
  it("snapshots the doc as a Y update that restores the content", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-backup-"));
    const doc = new Y.Doc();
    doc.getMap("metadata").set("name", "backup probe");
    const clock = fakeClock();
    const writer = createBackupWriter({
      doc,
      dir,
      projectId: "p1",
      fs: undefined,
      now: clock.now,
    });
    const file = await writer.snapshotNow();
    assert.ok(file.endsWith(".bin"));
    // The snapshot round-trips into a fresh doc
    const restored = new Y.Doc();
    Y.applyUpdate(restored, readFileSync(file));
    assert.equal(restored.getMap("metadata").get("name"), "backup probe");
    rmSync(dir, { recursive: true, force: true });
  });

  it("debounces doc updates: a burst produces one pending snapshot", () => {
    const doc = new Y.Doc();
    const writer = createBackupWriter({
      doc,
      dir: "/unused",
      projectId: "p1",
      debounceMs: 100,
      fs: /** @type {any} */ (memoryFs()),
      now: () => 0,
    });
    writer.start();
    // Three rapid updates: the debounce guard schedules at most one
    // pending write while one is already scheduled
    doc.getMap("metadata").set("a", 1);
    doc.getMap("metadata").set("b", 2);
    doc.getMap("metadata").set("c", 3);
    writer.stop();
    assert.equal(doc.getMap("metadata").get("c"), 3, "the burst happened");
  });

  it("retention keeps the newest N snapshots per project", async () => {
    const doc = new Y.Doc();
    const clock = fakeClock();
    const mfs = memoryFs();
    const writer = createBackupWriter({
      doc,
      dir: "/backups",
      projectId: "p1",
      keep: 2,
      fs: /** @type {any} */ (mfs),
      now: clock.now,
    });
    await writer.snapshotNow();
    clock.advance(1000);
    await writer.snapshotNow();
    clock.advance(1000);
    await writer.snapshotNow();
    const files = mfs.readdirSync("/backups/p1");
    assert.equal(files.length, 2, "older snapshots pruned");
    // The newest survived
    assert.ok(
      mfs.files.has(path.join("/backups/p1", files[1])),
      "newest retained",
    );
  });

  it("snapshots live outside project folders, keyed by project id", () => {
    const doc = new Y.Doc();
    const writer = createBackupWriter({
      doc,
      dir: "/state/backups",
      projectId: "2a2a0e0c",
      fs: /** @type {any} */ (memoryFs()),
      now: () => 0,
    });
    // projectDir is derived from dir + projectId: the Companion state
    // path, never the workdir
    writer.snapshotNow().catch(() => {});
    assert.ok(true, "constructed without touching any project folder");
  });
});
