/**
 * @file piRpc.js
 *
 * `PiRpcClient` spawns and supervises `pi --mode rpc`, speaking the JSONL
 * RPC protocol documented in pi's `docs/rpc.md`. Lifted from pi-lxmf
 * `src/rpc.js` (work document #44: "copy, don't extract"), adapted for the
 * Companion:
 *
 * - No Program Status Protocol (OSC 7501) extraction: the bridge never
 *   sets `PI_PROGRAM_STATUS`, so pi emits no OSC sequences and the strict
 *   JSONL framing holds; stray non-JSON stdout lines are logged and
 *   skipped.
 * - No `setCwd()`: the Companion spawns one client per project with a
 *   fixed workdir; project switches spawn a fresh client.
 * - Session resumption (`--session`) and the typed command helpers the
 *   chat surface maps onto (`/sessions`, `/resume`, `/compact`, `/abort`,
 *   `/model`…) are kept as-is.
 *
 * - Commands are JSON objects written to the child's stdin, one per line.
 * - Responses (`type: "response"`) are correlated by `id`.
 * - All other output records are agent/runtime events, forwarded to the
 *   bridge via the `"event"` EventTarget event.
 *
 * Framing follows the protocol's strict JSONL semantics: records are
 * delimited by LF (`\n`) only, a trailing `\r` is tolerated, and Node's
 * `readline` is deliberately NOT used (it also splits on U+2028/U+2029,
 * which are valid inside JSON strings).
 *
 * The client supervises the child: an unexpected exit triggers a respawn
 * (re-applying `--session` from the last known pointer) with backoff, and a
 * crash loop (3 restarts within a minute) gives up with a `"dead"` event.
 */

import { spawn as nodeSpawn } from "node:child_process";
import { existsSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";

/** Thrown when a Pi RPC command fails (`success: false`) or times out. */
export class RpcError extends Error {
  /**
   * @param {string} message
   * @param {string} [command]
   */
  constructor(message, command) {
    super(command ? `${message} (${command})` : message);
    this.name = "RpcError";
    this.command = command;
  }
}

/** Upper bound for a single stdout line (assistant payloads are large). */
const MAX_LINE_BYTES = 8 * 1024 * 1024;

/** Guard bound before a line is even parsed. */
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

/**
 * Creates a strict-JSONL line reader: `push()` accepts string or Buffer
 * chunks (multi-byte UTF-8 sequences may straddle chunks) and invokes
 * `onLine` per complete LF-terminated record. A trailing `\r` is stripped;
 * U+2028/U+2029 never split records. `flush()` emits a final unterminated
 * line, if any.
 *
 * @param {(line: string) => void} onLine
 * @returns {{push: (chunk: string|Buffer) => void, flush: () => void}}
 */
export function createJsonlReader(onLine) {
  const decoder = new StringDecoder("utf8");
  let buffer = "";
  return {
    push(chunk) {
      buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
      if (buffer.length > MAX_BUFFER_BYTES) {
        throw new Error(
          `RPC line exceeded ${MAX_BUFFER_BYTES} bytes without a newline`,
        );
      }
      let newlineAt = buffer.indexOf("\n");
      while (newlineAt !== -1) {
        emit(buffer.slice(0, newlineAt));
        buffer = buffer.slice(newlineAt + 1);
        newlineAt = buffer.indexOf("\n");
      }
    },
    flush() {
      buffer += decoder.end();
      if (buffer.length > 0) emit(buffer);
      buffer = "";
    },
  };

  /** @param {string} raw */
  function emit(raw) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line.length > 0) onLine(line);
  }
}

/**
 * Extracts the concatenated text blocks of an assistant (or any) message.
 *
 * @param {{role?: string, content?: string|Array<{type?: string, text?: string, [key: string]: any}>}} message
 * @returns {string}
 */
export function assistantText(message) {
  if (!message || typeof message !== "object") return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block) =>
        block && block.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("\n\n")
    .trim();
}

/**
 * A supervised client for `pi --mode rpc`.
 *
 * Emits EventTarget events:
 * - `"event"`      — `{ detail: event }` for every non-response Pi event.
 * - `"ready"`      — the child is accepting commands (initially and after restarts).
 * - `"restarting"` — `{ detail: { code, signal, attempt } }` unexpected exit; respawn scheduled.
 * - `"dead"`       — `{ detail: { reason } }` no more respawns will be attempted.
 */
export class PiRpcClient extends EventTarget {
  /**
   * @param {object} options
   * @param {string} [options.piBin="pi"] - Pi binary to spawn.
   * @param {string|null} [options.model] - `--model` pattern passed to Pi.
   * @param {string} [options.cwd] - Working directory for Pi (the project workdir).
   * @param {string|null} [options.sessionPath] - Session file resumed via `--session`.
   * @param {Function} [options.spawnFn] - Injectable spawn (tests). Defaults to `node:child_process` spawn.
   * @param {number} [options.restartBaseDelayMs=1000] - Base backoff between restarts (tests shrink it).
   * @param {(msg: string) => void} [options.log] - Diagnostic sink. Defaults to console.log.
   */
  constructor(options = {}) {
    super();
    this.piBin = options.piBin || "pi";
    this.model = options.model || null;
    this.cwd = options.cwd || process.cwd();
    this.sessionPath = options.sessionPath || null;
    this.spawnFn = options.spawnFn || nodeSpawn;
    this.restartBaseDelayMs = options.restartBaseDelayMs ?? 1000;
    this.log = options.log || ((msg) => console.log(msg));

    /** @type {import("node:child_process").ChildProcess|null} */
    this.child = null;
    /** @type {import("node:stream").Writable|null} */
    this.stdin = null;
    /** @type {Map<string, {resolve: (e: any) => void, reject: (e: Error) => void, timer: NodeJS.Timeout}>} */
    this.pending = new Map();
    this.nextId = 0;
    this.stopped = false;
    /** @type {number[]} */
    this.restartTimestamps = [];
    this.ready = false;
    /** @type {Promise<void>|null} */
    this.firstReady = null;
  }

  /**
   * Builds the child argv.
   *
   * @returns {string[]}
   */
  argv() {
    const args = ["--mode", "rpc"];
    if (this.model) args.push("--model", this.model);
    if (this.sessionPath && existsSync(this.sessionPath)) {
      args.push("--session", this.sessionPath);
    }
    return args;
  }

  /**
   * Spawns Pi and resolves once it answers commands. Rejects if the child
   * cannot be spawned or never becomes ready within `readyTimeoutMs`.
   *
   * @param {object} [options]
   * @param {number} [options.readyTimeoutMs=30000]
   * @returns {Promise<void>}
   */
  async start(options = {}) {
    if (this.child) throw new Error("PiRpcClient already started");
    const readyTimeoutMs = options.readyTimeoutMs ?? 30000;
    this.firstReady = new Promise((resolve, reject) => {
      this.spawnChild();
      const startedAt = Date.now();
      const probe = () => {
        if (this.stopped) {
          reject(new Error("Companion stopped before pi became ready"));
          return;
        }
        if (!this.child) {
          reject(new Error("pi exited before becoming ready"));
          return;
        }
        this.request({ type: "get_state" }, 2000)
          .then(() => this.markReady())
          .then(resolve)
          .catch(() => {
            if (Date.now() - startedAt > readyTimeoutMs) {
              this.giveUp(
                `pi did not answer RPC commands within ${readyTimeoutMs} ms`,
              );
              reject(new RpcError(`pi not ready within ${readyTimeoutMs} ms`));
            } else {
              setTimeout(probe, 500);
            }
          });
      };
      setTimeout(probe, 300);
    });
    return this.firstReady;
  }

  /**
   * Spawns the child process and attaches readers. Used by `start()` and by
   * the restart path.
   *
   * @private
   */
  spawnChild() {
    const child = this.spawnFn(this.piBin, this.argv(), {
      cwd: this.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    this.stdin = child.stdin ?? null;
    this.ready = false;

    const stdout = createJsonlReader((line) => this.routeLine(line));
    child.stdout?.on("data", (/** @type {Buffer} */ chunk) => {
      try {
        stdout.push(chunk);
      } catch (e) {
        this.log(`companion: rpc stdout framing error: ${e}`);
      }
    });
    child.stdout?.on("end", () => stdout.flush());

    const stderr = createJsonlReader((line) =>
      this.log(`pi stderr: ${line.slice(0, 400)}`),
    );
    child.stderr?.on("data", (/** @type {Buffer} */ chunk) => {
      try {
        stderr.push(chunk);
      } catch {
        /* oversized stderr line: dropped */
      }
    });

    child.on("error", (/** @type {Error} */ e) => {
      this.log(`companion: could not run ${this.piBin}: ${e.message}`);
      this.handleExit(-1, null);
    });
    child.on(
      "exit",
      (
        /** @type {number|null} */ code,
        /** @type {NodeJS.Signals|null} */ signal,
      ) => this.handleExit(code, signal),
    );
    this.log(
      `companion: spawned ${this.piBin} ${this.argv().join(" ")} (cwd ${this.cwd})`,
    );
  }

  /**
   * Routes one stdout line: responses resolve pending requests, everything
   * else is forwarded as an `"event"`.
   *
   * @param {string} line
   * @private
   */
  routeLine(line) {
    if (line.length > MAX_LINE_BYTES) return;
    /** @type {any} */
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      this.log(`companion: unparseable stdout line: ${line.slice(0, 200)}`);
      return;
    }
    if (event && event.type === "response" && typeof event.id === "string") {
      const waiter = this.pending.get(event.id);
      if (waiter) {
        this.pending.delete(event.id);
        clearTimeout(waiter.timer);
        waiter.resolve(event);
      }
      return;
    }
    this.dispatchEvent(new CustomEvent("event", { detail: event }));
  }

  /**
   * Handles child exit: fails pending requests and either stops (intentional)
   * or schedules a supervised restart.
   *
   * @param {number|null} code
   * @param {NodeJS.Signals|null} signal
   * @private
   */
  handleExit(code, signal) {
    if (!this.child) return;
    this.child = null;
    this.stdin = null;
    const wasReady = this.ready;
    this.ready = false;
    const error = new RpcError(
      `pi exited (code ${code ?? "?"} signal ${signal ?? "?"})`,
    );
    for (const [, waiter] of this.pending) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();

    if (this.stopped) return;

    const now = Date.now();
    this.restartTimestamps = this.restartTimestamps.filter(
      (t) => now - t < 60000,
    );
    if (this.restartTimestamps.length >= 3) {
      this.giveUp(
        `pi crashed ${this.restartTimestamps.length} times within a minute`,
      );
      return;
    }
    const attempt = this.restartTimestamps.length + 1;
    this.restartTimestamps.push(now);
    const backoffMs = Math.min(
      this.restartBaseDelayMs * 2 ** (attempt - 1),
      this.restartBaseDelayMs * 8,
    );
    if (wasReady || this.firstReady === null) {
      this.dispatchEvent(
        new CustomEvent("restarting", { detail: { code, signal, attempt } }),
      );
    }
    this.log(
      `companion: pi exited (code ${code} signal ${signal}); restart #${attempt} in ${backoffMs} ms`,
    );
    setTimeout(() => {
      if (this.stopped || this.child) return;
      this.spawnChild();
      this.probeUntilReady();
    }, backoffMs);
  }

  /**
   * Probes until the respawned child answers, then marks it ready.
   *
   * @private
   */
  probeUntilReady() {
    const step = () => {
      if (this.stopped || !this.child) return;
      this.request({ type: "get_state" }, 2000)
        .then(() => {
          this.markReady();
        })
        .catch(() => setTimeout(step, 500));
    };
    setTimeout(step, 300);
  }

  /**
   * @private
   */
  markReady() {
    if (this.ready) return;
    this.ready = true;
    this.dispatchEvent(new CustomEvent("ready"));
  }

  /**
   * @param {string} reason
   * @private
   */
  giveUp(reason) {
    this.stopped = true;
    this.log(`companion: giving up on pi: ${reason}`);
    this.dispatchEvent(new CustomEvent("dead", { detail: { reason } }));
    if (this.child) {
      this.child.kill("SIGKILL");
    }
  }

  /**
   * Updates the session path used by the next spawn (`--session`).
   *
   * @param {string|null} path
   */
  setSessionPath(path) {
    this.sessionPath = path;
  }

  /**
   * Writes one JSON command as a line to pi's stdin.
   *
   * @param {Record<string, any>} cmd
   * @private
   */
  write(cmd) {
    if (!this.stdin) throw new RpcError("pi is not running");
    this.stdin.write(`${JSON.stringify(cmd)}\n`);
  }

  /**
   * Sends a command with a generated id and awaits the matching response.
   *
   * @param {Record<string, any>} cmd - Command without `id`.
   * @param {number} [timeoutMs=30000]
   * @returns {Promise<any>} The response event.
   */
  request(cmd, timeoutMs = 30000) {
    const id = `r${++this.nextId}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new RpcError(`timed out after ${timeoutMs} ms`, cmd.type));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.write({ ...cmd, id });
      } catch (e) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(e);
      }
    });
  }

  /**
   * Asserts a response is successful and returns its `data`.
   *
   * @param {any} response
   * @param {string} command
   * @returns {any}
   */
  static dataOf(response, command) {
    if (response?.success !== true) {
      throw new RpcError(response?.error || "command failed", command);
    }
    return response.data;
  }

  // --- Typed command helpers ---------------------------------------------

  /**
   * Sends a user prompt. `streamingBehavior` ("steer"|"followUp") is
   * required by pi when a run is already active. Returns the raw response
   * so the caller can inspect acceptance and retry on races.
   *
   * @param {string} message
   * @param {"steer"|"followUp"} [streamingBehavior]
   * @returns {Promise<any>}
   */
  prompt(message, streamingBehavior) {
    const cmd = /** @type {Record<string, any>} */ ({
      type: "prompt",
      message,
    });
    if (streamingBehavior) cmd.streamingBehavior = streamingBehavior;
    return this.request(cmd, 30000);
  }

  /**
   * @returns {Promise<any>} `get_state` data (model, isStreaming, sessionFile, …).
   */
  async getState() {
    return PiRpcClient.dataOf(
      await this.request({ type: "get_state" }),
      "get_state",
    );
  }

  /**
   * @returns {Promise<any>} `new_session` data (`{ cancelled }`).
   */
  async newSession() {
    return PiRpcClient.dataOf(
      await this.request({ type: "new_session" }, 30000),
      "new_session",
    );
  }

  /**
   * @param {string} [customInstructions]
   * @returns {Promise<any>} `compact` data.
   */
  async compact(customInstructions) {
    const cmd = /** @type {Record<string, any>} */ ({ type: "compact" });
    if (customInstructions) cmd.customInstructions = customInstructions;
    return PiRpcClient.dataOf(await this.request(cmd, 180000), "compact");
  }

  /**
   * @param {string} provider
   * @param {string} modelId
   * @returns {Promise<any>} The new model object.
   */
  async setModel(provider, modelId) {
    return PiRpcClient.dataOf(
      await this.request({ type: "set_model", provider, modelId }, 30000),
      "set_model",
    );
  }

  /**
   * @returns {Promise<any[]>} Available model objects.
   */
  async getAvailableModels() {
    const data = PiRpcClient.dataOf(
      await this.request({ type: "get_available_models" }, 30000),
      "get_available_models",
    );
    return data?.models ?? [];
  }

  /**
   * @returns {Promise<any[]>} Commands invokable via `prompt` (extensions, templates, skills).
   */
  async getCommands() {
    const data = PiRpcClient.dataOf(
      await this.request({ type: "get_commands" }, 30000),
      "get_commands",
    );
    return data?.commands ?? [];
  }

  /**
   * Removes queued steering/follow-up messages. Returns the raw response so
   * callers can tolerate older pi builds without `clear_queue`.
   *
   * @returns {Promise<any>}
   */
  clearQueue() {
    return this.request({ type: "clear_queue" }, 5000);
  }

  /**
   * Fire-and-forget abort of the current run.
   */
  abort() {
    try {
      this.write({ type: "abort" });
    } catch {
      /* pi not running: nothing to abort */
    }
  }

  /**
   * Answers an `extension_ui_request`. With `cancelled: true` the dialog is
   * declined (nobody is at a TUI on a headless Companion).
   *
   * @param {string} id
   * @param {Record<string, any>} payload
   */
  respondUi(id, payload) {
    try {
      this.write({ type: "extension_ui_response", id, ...payload });
    } catch {
      /* pi not running */
    }
  }

  /**
   * Intentional shutdown: no restart will be scheduled.
   */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.child) {
      this.child.kill("SIGINT");
      const child = this.child;
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* already gone */
        }
      }, 3000).unref();
    }
  }
}
