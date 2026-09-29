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
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  now: () => Date.now(),
};

/**
 * @typedef {Object} SupervisorOptions
 * @property {() => WorkerLike} createWorker Factory creating a fresh worker.
 * @property {(message: any) => void} onMessage Echoes and heartbeats from the Engine.
 * @property {() => void} [onRespin] Called after a worker was respawned, so the
 *   Glass can re-subscribe.
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
 */

/**
 * @param {SupervisorOptions} options
 * @returns {{ send: (message: any) => void, stop: () => void, respins: number }}
 */
export function createSupervisor({
  createWorker,
  onMessage,
  onRespin,
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
    worker = createWorker();
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
