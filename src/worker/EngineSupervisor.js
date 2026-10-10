/**
 * @file Worker supervisor (main thread), per SPEC "Worker Internals &
 * Resilience": monitors the Engine worker's heartbeat and seamlessly respins
 * it when it crashes or is terminated, resubscribing to the CRDT and
 * re-establishing connections.
 */

const HEARTBEAT_TIMEOUT_MS = 30_000;
const CHECK_INTERVAL_MS = 5_000;

/** Default timer sink: the global timers of the current realm. */
const DEFAULT_TIMERS = {
  setTimeout: /** @type {typeof setTimeout} */ setTimeout.bind(globalThis),
  clearTimeout: /** @type {typeof clearTimeout} */ clearTimeout.bind(
    globalThis,
  ),
  setInterval: /** @type {typeof setInterval} */ setInterval.bind(globalThis),
  clearInterval: /** @type {typeof clearInterval} */ clearInterval.bind(
    globalThis,
  ),
  now: () => Date.now(),
};

/**
 * @typedef {Object} SupervisorOptions
 * @property {((onError: (error: { message: string, filename?: string, lineno?: number }) => void) => WorkerLike)} createWorker
 *   Factory creating a fresh worker; the supervisor hands it its error
 *   sink so the worker's error events reach the narrator.
 * @property {(message: any) => void} onMessage Echoes and heartbeats from the Engine.
 * @property {() => void} [onRespin] Called after a worker was respawned, so the
 *   Glass can re-subscribe.
 * @property {((error: { message: string, filename?: string, lineno?: number }) => void)} [onError]
 *   Called when the worker fires an error event — a load or module-graph
 *   failure. The heartbeat watchdog respawns such a worker on its own
 *   schedule; this hook exists so the death is *narrated* (work document
 *   #34) instead of respawning silently (work document #56's finding: two
 *   worker spawns and an empty mirror were the only symptoms).
 * @property {number} [heartbeatTimeoutMs]
 * @property {number} [checkIntervalMs]
 * @property {{ setTimeout: typeof setTimeout, clearTimeout: typeof clearTimeout, setInterval: typeof setInterval, clearInterval: typeof clearInterval, now: () => number }} [timers]
 */

/**
 * The subset of the Worker interface the supervisor relies on; injectable for
 * deterministic tests.
 *
 * @typedef {Object} WorkerLike
 * @property {(message: any) => void} postMessage
 * @property {(handler: (event: { data: any }) => void) => void} onMessage
 * @property {() => void} terminate
 * @property {((handler: (event: { message?: string, filename?: string, lineno?: number }) => void) => void) | undefined} [onError]
 *   Optional: REGISTERS the worker's error handler, symmetric with
 *   `onMessage` (module-graph failures die silently without it).
 */

/**
 * @param {SupervisorOptions} options
 * @returns {{ send: (message: any) => void, stop: () => void, respins: number }}
 */
export function createSupervisor({
  createWorker,
  onMessage,
  onRespin,
  onError,
  heartbeatTimeoutMs = HEARTBEAT_TIMEOUT_MS,
  checkIntervalMs = CHECK_INTERVAL_MS,
  timers = DEFAULT_TIMERS,
}) {
  /** @type {WorkerLike | null} */
  let worker = null;
  /** @type {number | null} */
  let lastHeartbeat = null;
  /** @type {number | null} */
  let checkInterval = null;
  let respins = 0;

  const spinUp = () => {
    // The factory receives the error handler to REGISTER on the worker
    // (symmetric with onMessage): a worker whose module graph fails to
    // load fires the error event instead of ever heartbeating — the
    // watchdog's silent respawn would otherwise be the only symptom
    // (work document #56)
    worker = createWorker((/** @type {any} */ event) =>
      onError?.({
        message: event?.message ?? "unknown worker error",
        filename: event?.filename,
        lineno: event?.lineno,
      }),
    );
    lastHeartbeat = timers.now();
    worker.onMessage((event) => {
      if (
        event.data &&
        event.data.protocol === "system" &&
        event.data.command === "heartbeat"
      ) {
        lastHeartbeat = timers.now();
        return;
      }
      onMessage(event.data);
    });
  };

  const check = () => {
    if (!worker) return;
    if (
      timers.now() - /** @type {number} */ (lastHeartbeat) >
      heartbeatTimeoutMs
    ) {
      worker.terminate();
      spinUp();
      respins++;
      if (onRespin) onRespin();
    }
  };

  spinUp();
  checkInterval = /** @type {any} */ (timers).setInterval(
    check,
    checkIntervalMs,
  );

  return {
    /**
     * Sends a message to the current Engine worker. Messages sent while a
     * respawn is pending are queued by the caller if critical (SPEC: critical
     * intents are queued sequentially).
     *
     * @param {any} message
     */
    send(message) {
      if (worker) {
        worker.postMessage(message);
      }
    },
    /**
     * Stops the supervisor: clears the watchdog and terminates the worker.
     */
    stop() {
      if (checkInterval !== null) {
        timers.clearInterval(/** @type {any} */ (checkInterval));
        checkInterval = null;
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
    get respins() {
      return respins;
    },
  };
}
