/**
 * @file piManager.js — the work-driven pi lifecycle for the Companion
 * (work document #44, M2): pi children spawn on prompt arrival, shut
 * down when settled and idle, and suspend/resume by persisting the
 * session pointer. Presence is never gated on the owner being online.
 *
 * Lifecycle:
 * - `prompt(text)` spawns the client if needed (resuming `--session`),
 *   sends the prompt, and arms the idle timer.
 * - Engine events (`agent_end` etc.) re-arm the idle timer; when the
 *   grace expires with nothing streaming, the child is stopped.
 * - `suspend()` stops the child immediately; the session pointer stays
 *   persisted, so the next prompt resumes where pi left off.
 *
 * Pi availability is detected from the executable being on PATH with a
 * version check (SPEC, Companion configuration); when absent the
 * capability is unavailable and prompts fail with a diagnostic.
 */

import { spawn as nodeSpawn } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { PiRpcClient } from "./piRpc.js";

/** Default idle grace before the child shuts down (ms). */
const DEFAULT_IDLE_GRACE_MS = 5 * 60 * 1000;

/**
 * Detects the pi executable: absolute path when given, otherwise a PATH
 * lookup, plus a `--version` check. Resolves `{ available, version }`.
 *
 * @param {{ piBin?: string, execFile?: Function }} [options]
 * @returns {Promise<{ available: boolean, version: string | null }>}
 */
export async function discoverPi(options = {}) {
  const piBin = options.piBin ?? "pi";
  const execFile = options.execFile ?? nodeSpawn;
  // Absolute or explicit binary: check executability directly
  if (piBin.includes("/")) {
    try {
      await access(piBin, constants.X_OK);
    } catch {
      return { available: false, version: null };
    }
  } else {
    const dirs = (process.env.PATH ?? "").split(":").filter(Boolean);
    let found = false;
    for (const dir of dirs) {
      try {
        await access(`${dir}/${piBin}`, constants.X_OK);
        found = true;
        break;
      } catch {
        /* keep looking */
      }
    }
    if (!found) return { available: false, version: null };
  }
  const version = await new Promise((resolve) => {
    const child = execFile(piBin, ["--version"]);
    let out = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve(null);
    }, 5000);
    child.stdout?.on("data", (/** @type {Buffer} */ chunk) => {
      out += chunk.toString();
    });
    child.stdout?.on("end", () => {
      clearTimeout(timer);
      resolve(out.trim() || null);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
  if (version === null) return { available: false, version: null };
  return { available: true, version };
}

/**
 * The lifecycle manager's surface, as the chat command surface consumes it.
 *
 * @typedef {Object} PiManagerHandle
 * @property {() => boolean} isRunning Whether a child is running.
 * @property {(text: string) => Promise<any>} prompt Work-driven entry.
 * @property {() => Promise<any|null>} status The pi state, or null.
 * @property {(customInstructions?: string) => Promise<any|null>} compact
 * @property {(provider: string, modelId: string) => Promise<any|null>} setModel
 * @property {() => Promise<any|null>} newSession
 * @property {() => void} suspend Immediate sleep; the pointer persists.
 * @property {() => void} stop Final shutdown.
 * @property {import("./piRpc.js").PiRpcClient | null} client
 */

/**
 * A per-project pi lifecycle manager. Phase A: one active project.
 *
 * Emits EventTarget events:
 * - `"spawned"`    — the client started (fresh or resumed).
 * - `"stopped"`    — the child stopped (idle grace, suspend, or dead).
 * - `"event"`      — forwarded pi runtime events (from the RPC client).
 * - `"narration"`  — `{ detail: { text } }` notable lifecycle moments,
 *   for the chat surface's narration replies.
 *
 * @param {object} options
 * @param {string} options.workdir - The materialized project folder.
 * @param {{ get: (key: string) => Promise<any>, set: (key: string, value: any) => Promise<void> }} options.state
 *   Session-pointer persistence.
 * @param {string} [options.piBin]
 * @param {string|null} [options.model]
 * @param {number} [options.idleGraceMs]
 * @param {Function} [options.spawnFn] - Injectable spawn (tests).
 * @param {Function} [options.execFile] - Injectable exec for discovery (tests).
 * @param {(msg: string) => void} [options.log]
 * @returns {{ prompt: (text: string) => Promise<any>, suspend: () => void, stop: () => void, status: () => Promise<any>, compact: (customInstructions?: string) => Promise<any|null>, setModel: (provider: string, modelId: string) => Promise<any|null>, newSession: () => Promise<any|null>, client: PiRpcClient | null, isRunning: () => boolean, addEventListener: PiRpcClient["addEventListener"] }}
 */
export function createPiManager(options) {
  const workdir = options.workdir;
  const state = options.state;
  const idleGraceMs = options.idleGraceMs ?? DEFAULT_IDLE_GRACE_MS;
  const log = options.log ?? ((msg) => console.log(msg));
  const spawnFn =
    options.spawnFn ??
    ((
      /** @type {string} */ bin,
      /** @type {string[]} */ args,
      /** @type {any} */ opts,
    ) => nodeSpawn(bin, args, opts));
  const emitter = new EventTarget();

  /** @type {PiRpcClient | null} */
  let client = null;
  /** @type {Promise<void> | null} */
  let spawning = null;
  /** @type {NodeJS.Timeout | null} */
  let idleTimer = null;
  /** @type {string | null} */
  let sessionPath = null;
  let stopped = false;

  const rearmIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimer = null;
      stopClient("idle grace expired").catch(() => {});
    }, idleGraceMs);
    if (idleTimer.unref) idleTimer.unref();
  };

  const narrate = (/** @type {string} */ text) => {
    emitter.dispatchEvent(new CustomEvent("narration", { detail: { text } }));
  };

  /**
   * Stops the client, keeping the session pointer for the next spawn.
   *
   * @param {string} reason
   * @returns {Promise<void>}
   */
  async function stopClient(reason) {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (!client) return;
    const current = client;
    client = null;
    current.stop();
    emitter.dispatchEvent(new CustomEvent("stopped", { detail: { reason } }));
    log(`companion: pi stopped (${reason})`);
  }

  /**
   * Starts the client, resuming the persisted session when there is one.
   *
   * @returns {Promise<void>}
   */
  async function startClient() {
    if (client) return;
    spawning = (async () => {
      const pointer = await state.get("session").catch(() => null);
      sessionPath =
        typeof pointer?.sessionFile === "string" ? pointer.sessionFile : null;
      const next = new PiRpcClient({
        piBin: options.piBin ?? "pi",
        model: options.model ?? null,
        cwd: workdir,
        sessionPath,
        spawnFn,
        log,
      });
      next.addEventListener("event", (/** @type {any} */ e) => {
        rearmIdle();
        emitter.dispatchEvent(new CustomEvent("event", { detail: e.detail }));
        observeStateEvent(e.detail);
      });
      next.addEventListener("restarting", (/** @type {any} */ e) => {
        narrate(`pi restarted (attempt ${e.detail.attempt})`);
      });
      next.addEventListener("dead", (/** @type {any} */ e) => {
        narrate(`pi gave up: ${e.detail.reason}`);
        client = null;
        emitter.dispatchEvent(
          new CustomEvent("stopped", { detail: { reason: e.detail.reason } }),
        );
      });
      await next.start();
      client = next;
      emitter.dispatchEvent(
        new CustomEvent("spawned", {
          detail: { resumed: sessionPath !== null },
        }),
      );
      narrate(
        sessionPath
          ? "pi resumed the previous session"
          : "pi started a fresh session",
      );
    })();
    try {
      await spawning;
    } finally {
      spawning = null;
    }
  }

  /**
   * Adds a session file to the persisted resume index (the `/sessions`
   * surface), newest first, capped.
   *
   * @param {string} file
   * @returns {Promise<void>}
   */
  async function rememberSession(file) {
    const index = await state
      .get("sessions")
      .then((list) => (Array.isArray(list) ? list : []))
      .catch(() => []);
    const next = [
      { file, mtimeMs: Date.now() },
      ...index.filter((/** @type {any} */ entry) => entry?.file !== file),
    ].slice(0, 20);
    await state.set("sessions", next);
  }

  /**
   * Tracks session-file changes from `get_state`-carrying events and
   * persists the pointer. pi emits a `get_state` result in its
   * `agent_start`/`session` events; the manager also probes state after
   * each prompt.
   *
   * @param {any} event
   */
  function observeStateEvent(event) {
    const file = event?.state?.sessionFile ?? event?.sessionFile;
    if (typeof file !== "string" || !file || file === sessionPath) return;
    sessionPath = file;
    state
      .set("session", { sessionFile: file, workdir })
      .catch((error) => log(`companion: session pointer not saved: ${error}`));
    rememberSession(file).catch(() => {});
  }

  return {
    /** The active RPC client, or null while stopped. */
    get client() {
      return client;
    },

    /**
     * Work-driven entry: spawns on demand, sends the prompt, arms the
     * idle grace. Rejects when pi is unavailable or crashed out.
     *
     * @param {string} text
     * @returns {Promise<any>} The prompt response.
     */
    async prompt(text) {
      if (stopped) throw new Error("pi manager is stopped");
      await startClient();
      if (!client) throw new Error("pi is not running");
      rearmIdle();
      let response;
      try {
        response = await client.prompt(text);
      } catch (error) {
        // pi busy: retry once as a follow-up (the queued-message race)
        if (/** @type {any} */ (error)?.message?.includes("already active")) {
          response = await client.prompt(text, "followUp");
        } else {
          throw error;
        }
      }
      // Track the session pointer right away
      try {
        observeStateEvent(await client.getState());
      } catch {
        /* state probe is best-effort */
      }
      return response;
    },

    /**
     * Immediate sleep: stops the child; the session pointer persists.
     */
    suspend() {
      stopped = false;
      stopClient("suspended").catch(() => {});
    },

    /**
     * Final shutdown: no further spawns.
     */
    stop() {
      stopped = true;
      stopClient("stopped").catch(() => {});
    },

    /**
     * @returns {Promise<any>} The pi state, or null when not running.
     */
    async status() {
      if (!client) return null;
      try {
        return await client.getState();
      } catch {
        return null;
      }
    },

    /**
     * Compacts the active session (the `/compact` surface). Resolves null
     * when pi is not running.
     *
     * @param {string} [customInstructions]
     * @returns {Promise<any|null>}
     */
    async compact(customInstructions) {
      if (!client) return null;
      return client.compact(customInstructions);
    },

    /**
     * Switches the model of the active session (the `/model` surface).
     *
     * @param {string} provider
     * @param {string} modelId
     * @returns {Promise<any|null>}
     */
    async setModel(provider, modelId) {
      if (!client) return null;
      return client.setModel(provider, modelId);
    },

    /**
     * Starts a fresh session (the `/new` surface); the previous session
     * file stays on disk and is added to the resume index.
     *
     * @returns {Promise<any|null>}
     */
    async newSession() {
      if (!client) return null;
      const previous = sessionPath;
      const result = await client.newSession();
      if (typeof previous === "string" && previous) {
        await rememberSession(previous);
      }
      return result;
    },

    /** @returns {boolean} Whether a child is running. */
    isRunning() {
      return client !== null;
    },

    /**
     * Subscribes to lifecycle events (delegated to the manager emitter
     * and the active client's pi events).
     */
    addEventListener: /** @type {EventTarget["addEventListener"]} */ (
      emitter.addEventListener.bind(emitter)
    ),
  };
}
