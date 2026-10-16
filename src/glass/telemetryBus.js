/**
 * @file The Glass telemetry bus (work document #63): the app-level
 * `EventTarget` the echo dispatch fans telemetry through, with per-stream
 * bounded drop-oldest ring buffers so an accordion opened late shows
 * recent history, not a blank panel.
 *
 * The two planes: the Engine stays the single source and the chips stay
 * the summary; the bus only *fans out* what the Engine already sent.
 * Subsystems surface activity through the existing echo channel — M1's
 * Yjs stream taps the continuous `y-sync`/`y-update` echoes, so there is
 * no subscription protocol yet; when producers become per-subscription
 * (the Reticulum and FBP-protocol streams), the Engine keeps its own ring
 * buffers and the subscribe call grows an Engine-side counterpart.
 *
 * Observation only: the bus never mutates state and is never a second
 * authority — consumers render; they do not decide.
 */

/**
 * One telemetry entry as the bus stores and fans it: the bus stamps the
 * per-stream sequence and the wall-clock time; the producer supplies the
 * legible payload.
 *
 * @typedef {Object} TelemetryEntry
 * @property {number} seq Monotonic within the stream.
 * @property {number} time Wall-clock milliseconds.
 * @property {string} message The human-legible main column.
 * @property {string} [status] The bracketed status tag (`SYNC`, `DELTA`).
 * @property {"ok" | "fail" | ""} [tone] The status' semantic color.
 */

/**
 * Creates a telemetry bus.
 *
 * @param {Object} [options]
 * @param {number} [options.capacity] Ring-buffer capacity per stream;
 *   the oldest entry drops when the buffer is full.
 * @returns {{
 *   publish: (stream: string, entry: { message: string, status?: string, tone?: "ok" | "fail" | "" }) => void,
 *   subscribe: (stream: string, listener: (entry: TelemetryEntry) => void, options?: { history?: boolean }) => () => void,
 *   history: (stream: string) => TelemetryEntry[],
 *   streams: () => string[],
 * }}
 */
export function createTelemetryBus({ capacity = 200 } = {}) {
  const target = new EventTarget();
  /** @type {Map<string, TelemetryEntry[]>} */
  const buffers = new Map();
  /** @type {Map<string, number>} */
  const sequences = new Map();

  /**
   * Fans one entry out to the stream's live subscribers and records it in
   * the ring buffer. Publishing is O(1) for closed consumers: the buffer
   * append is the only work nobody is listening for.
   *
   * @param {string} stream
   * @param {{ message: string, status?: string, tone?: "ok" | "fail" | "" }} entry
   */
  function publish(stream, entry) {
    const seq = (sequences.get(stream) ?? 0) + 1;
    sequences.set(stream, seq);
    const stamped = /** @type {TelemetryEntry} */ ({
      seq,
      time: Date.now(),
      message: entry.message,
      ...(entry.status === undefined ? {} : { status: entry.status }),
      ...(entry.tone === undefined ? {} : { tone: entry.tone }),
    });
    let buffer = buffers.get(stream);
    if (!buffer) {
      buffer = [];
      buffers.set(stream, buffer);
    }
    buffer.push(stamped);
    if (buffer.length > capacity) {
      buffer.shift();
    }
    target.dispatchEvent(
      new CustomEvent(`telemetry:${stream}`, { detail: stamped }),
    );
  }

  /**
   * Subscribes to a stream. With `history` (the default) the listener
   * first receives the ring buffer's entries in order — the
   * subscription-on-open contract: an accordion opened late shows recent
   * history, not a blank panel.
   *
   * @param {string} stream
   * @param {(entry: TelemetryEntry) => void} listener
   * @param {{ history?: boolean }} [options]
   * @returns {() => void} The unsubscribe function.
   */
  function subscribe(stream, listener, options = {}) {
    const { history = true } = options;
    if (history) {
      for (const entry of buffers.get(stream) ?? []) {
        listener(entry);
      }
    }
    const handler = (/** @type {any} */ event) => listener(event.detail);
    target.addEventListener(`telemetry:${stream}`, handler);
    return () => {
      target.removeEventListener(`telemetry:${stream}`, handler);
    };
  }

  /**
   * A copy of a stream's ring buffer, oldest first.
   *
   * @param {string} stream
   * @returns {TelemetryEntry[]}
   */
  function history(stream) {
    return [...(buffers.get(stream) ?? [])];
  }

  /**
   * The streams that have traffic recorded.
   *
   * @returns {string[]}
   */
  function streams() {
    return [...buffers.keys()];
  }

  return { publish, subscribe, history, streams };
}

/** The app-level bus: one Glass, one fan-out point. */
let singleton = /** @type {ReturnType<typeof createTelemetryBus> | null} */ (
  null
);

/**
 * The Glass's telemetry bus, created on first use (tests create their own
 * through {@link createTelemetryBus} to stay isolated).
 *
 * @returns {ReturnType<typeof createTelemetryBus>}
 */
export function telemetryBus() {
  if (!singleton) {
    singleton = createTelemetryBus();
  }
  return singleton;
}
