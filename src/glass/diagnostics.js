/**
 * @file The Glass error boundary and the diagnostics recorder (work
 * document #63's stream catalog, the app diagnostics tenant): the
 * window-level `error` and `unhandledrejection` listeners catch everything
 * the worker's `onerror` does not, and each event becomes a persisted
 * record plus a legible line on the `diagnostics` telemetry stream. The
 * mesh connectivity transitions ride the same log — the persisted history
 * SPEC's diagnostics promise asks for, local only, no remote telemetry.
 *
 * No silent failures, and never a second authority: the recorder observes
 * and persists; it mutates nothing else. The boundary itself must never
 * throw — a failure to record is swallowed, never propagated.
 */

import { openDiagnosticsStore } from "./diagnosticsStore.js";
import { telemetryBus } from "./telemetryBus.js";

/** One legible line at most: the terminal grammar's main column. */
const MESSAGE_MAX = 200;

/** The installed recorder, for the connectivity transitions app.js feeds.
 *
 * @type {{ record: (entry: Record<string, any>) => void } | null}
 */
let recorder = null;

/**
 * Truncates a message to the terminal grammar's column width.
 *
 * @param {string} text
 * @returns {string}
 */
function clip(text) {
  const line = String(text ?? "")
    .replaceAll("\n", " ⏎ ")
    .trim();
  return line.length > MESSAGE_MAX
    ? `${line.slice(0, MESSAGE_MAX - 1)}…`
    : line;
}

/**
 * Extracts the legible facts from an error value.
 *
 * @param {any} error
 * @returns {{ message: string, detail: string }}
 */
function describeErrorValue(error) {
  if (!error) return { message: "unknown failure", detail: "" };
  const message = clip(error.message ?? String(error));
  const stack = String(error.stack ?? "");
  // The stack's head carries the origin frames; the whole trace is noise
  // in a one-line log
  const detail = clip(stack.split("\n").slice(1, 3).join(" ⏎ "));
  return { message, detail };
}

/**
 * The mesh connectivity word for the log: what changed, in one term.
 *
 * @param {{ connected?: boolean, synced?: boolean, peers?: number } | null} status
 * @param {string} meshError
 * @returns {string}
 */
export function connectivityWord(status, meshError) {
  if (meshError) return "mesh error";
  if (status?.connected === true) {
    return status.synced === true ? "up to date" : "syncing";
  }
  return "offline";
}

/**
 * Installs the Glass error boundary. Every caught event publishes on the
 * `diagnostics` stream (the wires accordion beside the sync panel) and
 * persists to the diagnostics store. `onCrash` fires once per unacknowledged
 * crash — the attention path's badge hook.
 *
 * @param {{ onCrash?: () => void }} [options]
 * @returns {() => void} the teardown that removes the listeners
 */
export function installDiagnostics(options = {}) {
  /** @type {(entry: any) => void} */
  const record = (entry) => {
    // The bus publish first: the wires stream flows even when storage
    // refuses (private-mode browsers, evicted storage)
    try {
      telemetryBus().publish("diagnostics", {
        message: entry.message,
        status: entry.status,
        tone: entry.tone ?? "",
      });
    } catch {
      // Never throw from the boundary
    }
    try {
      openDiagnosticsStore(/** @type {any} */ (globalThis).indexedDB)
        .then((store) => store.append(entry))
        .catch(() => {
          // Persistence is best-effort; the log survives in memory
        });
    } catch {
      // Never throw from the boundary: an environment without IndexedDB
      // (the unit DOM, hardened browsers) must not break recording
    }
  };

  /** Guards against the recording path itself throwing. */
  let recording = false;

  const boundary = (/** @type {any} */ build) => {
    if (recording) return;
    recording = true;
    try {
      const entry = build();
      if (!entry) return;
      record(entry);
      if (
        (entry.kind === "crash" || entry.kind === "rejection") &&
        options.onCrash
      ) {
        options.onCrash();
      }
    } catch {
      // Never throw from the boundary
    } finally {
      recording = false;
    }
  };

  const errorListener = (/** @type {Event} */ event) => {
    boundary(() => {
      const error = /** @type {ErrorEvent} */ (event);
      // Resource-load errors carry no error object and no message — not
      // crashes, and the console already reports them
      if (!error.message && !error.error) return null;
      const described = describeErrorValue(error.error ?? error.message);
      return {
        kind: "crash",
        at: Date.now(),
        message: described.message,
        detail: clip(
          [error.filename, error.lineno ? `line ${error.lineno}` : ""]
            .filter(Boolean)
            .join(":") || described.detail,
        ),
        status: "CRASH",
        tone: "fail",
      };
    });
  };

  const rejectionListener = (/** @type {Event} */ event) => {
    boundary(() => {
      const rejection = /** @type {PromiseRejectionEvent} */ (event);
      const described = describeErrorValue(rejection.reason);
      return {
        kind: "rejection",
        at: Date.now(),
        message: described.message,
        detail: described.detail,
        status: "REJECT",
        tone: "fail",
      };
    });
  };

  window.addEventListener("error", errorListener);
  window.addEventListener("unhandledrejection", rejectionListener);

  recorder = { record };

  return () => {
    window.removeEventListener("error", errorListener);
    window.removeEventListener("unhandledrejection", rejectionListener);
    recorder = null;
  };
}

/**
 * Records one mesh connectivity transition (the connectivity history
 * beside the crash reports). No-op before the boundary installed.
 *
 * @param {string} word The connectivity word (`connectivityWord`).
 * @param {string} [detail]
 * @returns {void}
 */
export function recordMeshState(word, detail = "") {
  if (!recorder) return;
  recorder.record({
    kind: "mesh",
    at: Date.now(),
    message: clip(
      detail ? `connectivity · ${word} · ${detail}` : `connectivity · ${word}`,
    ),
    status: word === "mesh error" ? "FAIL" : word === "offline" ? "DOWN" : "UP",
    tone: word === "mesh error" ? "fail" : word === "offline" ? "" : "ok",
  });
}
