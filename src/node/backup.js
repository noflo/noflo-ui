/**
 * @file backup.js — the Companion's server-side CRDT backup (work
 * document #47 scope item 5, SPEC "The NoFlo UI Companion"): the
 * Companion holds project snapshots as a mesh-side backup, distinct from
 * the device-state persistence in the project folder (which survives
 * Companion restarts but not folder loss).
 *
 * Snapshots are `Y.encodeStateAsUpdate` blobs written into the Companion
 * state directory — never inside a project folder (SPEC: Companion state
 * is per-instance, outside workdirs) — keyed by project id and timestamp.
 * Retention keeps the newest N snapshots per project and prunes older
 * ones. Restoration is deliberately manual (copy a snapshot over the
 * folder's `.noflo-doc.bin` or apply it into a fresh doc): a backup that
 * silently auto-restores can overwrite newer work; the human decides.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import * as Y from "../../vendor/yjs.js";

/** Default retention: the newest 24 snapshots per project. */
export const DEFAULT_KEEP = 24;

/**
 * Creates a debounced snapshot writer for a project document.
 *
 * Emits EventTarget events:
 * - `"snapshot"` — `{ detail: { file } }` after each snapshot write.
 * - `"pruned"`   — `{ detail: { removed: string[] } }` when retention
 *   pruned older snapshots.
 *
 * @param {object} options
 * @param {Y.Doc} options.doc - The project document.
 * @param {string} options.dir - The backup root (a Companion state path).
 * @param {string} options.projectId - Stable project identity.
 * @param {number} [options.keep] - Snapshots retained per project.
 * @param {number} [options.debounceMs] - Doc-update debounce (default 60s).
 * @param {{ writeFileSync: typeof writeFileSync, renameSync: typeof renameSync, mkdirSync: typeof mkdirSync, readdirSync: typeof readdirSync, existsSync: typeof existsSync, unlinkSync: typeof unlinkSync }} [options.fs]
 *   Injectable fs surface (tests).
 * @param {() => number} [options.now] - Injectable clock (tests).
 * @returns {{
 *   addEventListener: EventTarget["addEventListener"],
 *   start: () => void,
 *   stop: () => void,
 *   snapshotNow: () => Promise<string>,
 * }}
 */
export function createBackupWriter({
  doc,
  dir,
  projectId,
  keep = DEFAULT_KEEP,
  debounceMs = 60_000,
  fs = {
    writeFileSync,
    renameSync,
    mkdirSync,
    readdirSync,
    existsSync,
    unlinkSync,
  },
  now = Date.now,
}) {
  const emitter = new EventTarget();
  const projectDir = path.join(dir, projectId);
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  let stopped = false;

  /**
   * Writes one snapshot atomically (temp file + rename) and prunes.
   *
   * @returns {Promise<string>} The snapshot file path.
   */
  async function snapshotNow() {
    const update = Y.encodeStateAsUpdate(doc);
    fs.mkdirSync(projectDir, { recursive: true });
    const file = path.join(
      projectDir,
      `${new Date(now()).toISOString().replaceAll(":", "-")}.bin`,
    );
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, update);
    fs.renameSync(temp, file);
    emitter.dispatchEvent(new CustomEvent("snapshot", { detail: { file } }));
    prune();
    return file;
  }

  /**
   * Retention: keep the newest `keep` snapshots, prune the rest.
   */
  function prune() {
    if (!fs.existsSync(projectDir)) return;
    const files = fs
      .readdirSync(projectDir)
      .filter((name) => name.endsWith(".bin"))
      .sort();
    if (files.length <= keep) return;
    const removed = files.slice(0, files.length - keep);
    for (const name of removed) {
      try {
        fs.unlinkSync(path.join(projectDir, name));
      } catch {
        /* best effort */
      }
    }
    emitter.dispatchEvent(new CustomEvent("pruned", { detail: { removed } }));
  }

  return {
    /** Subscribes to lifecycle events. */
    addEventListener: /** @type {EventTarget["addEventListener"]} */ (
      emitter.addEventListener.bind(emitter)
    ),
    /**
     * Starts watching the document: updates schedule a debounced
     * snapshot (one pending at a time; a burst produces one write).
     */
    start() {
      stopped = false;
      doc.on("update", () => {
        if (stopped || timer) return;
        timer = setTimeout(() => {
          timer = null;
          if (stopped) return;
          snapshotNow().catch(() => {});
        }, debounceMs);
        if (timer.unref) timer.unref();
      });
    },
    /** Stops watching and cancels the pending debounce. */
    stop() {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
    /** Writes a snapshot immediately (boot, shutdown, tests). */
    snapshotNow,
  };
}
