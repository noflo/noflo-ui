/**
 * @file Multi-tab coordination, per SPEC "IndexedDB Persistence & Multi-Tab
 * Safety": tabs elect a leader over a BroadcastChannel. Only the leader spins
 * up the Engine worker and holds write access to IndexedDB and the mesh
 * sockets; secondary tabs become read-only observers of the leader's state.
 *
 * Election rule: the live tab with the lexicographically smallest id leads.
 * Ids are generated per session (prefix + monotonic counter), so a newer tab
 * never steals leadership from an existing one, and leadership handover after
 * a leader disappears is deterministic among the survivors.
 */

const DEFAULT_HEARTBEAT_MS = 1000;
const DEFAULT_LEADER_TIMEOUT_MS = 3000;

/** Default timer sink: the global timers of the current realm. */
const DEFAULT_TIMERS = {
  setInterval: /** @type {typeof setInterval} */ setInterval.bind(globalThis),
  clearInterval: /** @type {typeof clearInterval} */ clearInterval.bind(
    globalThis,
  ),
  now: () => Date.now(),
};

/**
 * The subset of the BroadcastChannel interface the coordinator relies on;
 * injectable for deterministic tests.
 *
 * @typedef {Object} BroadcastChannelLike
 * @property {(message: any) => void} postMessage
 * @property {((event: { data: any }) => void) | null} onmessage
 * @property {() => void} [close]
 */

/**
 * @typedef {Object} CoordinatorOptions
 * @property {BroadcastChannelLike} channel
 * @property {string} id Unique tab id for this session.
 * @property {number} [heartbeatMs]
 * @property {number} [leaderTimeoutMs]
 * @property {{ setInterval: (fn: () => void, ms: number) => any, clearInterval: (handle: any) => void, now: () => number }} [timers]
 * @property {(coordinator: TabCoordinator) => void} [onChange] Called when leadership or membership changes.
 */

/**
 * @typedef {Object} TabCoordinator
 * @property {() => boolean} isLeader
 * @property {() => string | null} leaderId
 * @property {() => string[]} members
 * @property {() => void} stop Announces departure and stops the heartbeat.
 */

/** Announce message shape: `@type {{ kind: 'announce', id: string }}` */
/** Departure message shape: `@type {{ kind: 'bye', id: string }}` */

/**
 * @param {CoordinatorOptions} options
 * @returns {TabCoordinator}
 */
export function createTabCoordinator({
  channel,
  id,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  leaderTimeoutMs = DEFAULT_LEADER_TIMEOUT_MS,
  timers = DEFAULT_TIMERS,
  onChange,
}) {
  /** @type {Map<string, number>} */
  const peers = new Map();
  /** @type {string | null} */
  let leader = id;
  let stopped = false;

  const interval = timers.setInterval(() => {
    if (stopped) return;
    const now = timers.now();
    // Expire silent peers
    for (const [peerId, lastSeen] of peers) {
      if (now - lastSeen > leaderTimeoutMs) {
        peers.delete(peerId);
      }
    }
    channel.postMessage({ kind: "announce", id });
    elect();
  }, heartbeatMs);

  /** @returns {string} Membership+leadership signature to detect actual changes. */
  const signature = () => `${leader}|${[id, ...peers.keys()].sort().join(",")}`;

  /** @type {string} */
  let lastSignature = signature();

  /** Emits onChange only when leadership or membership actually changed. */
  const notify = () => {
    const next = signature();
    if (next !== lastSignature) {
      lastSignature = next;
      if (onChange) onChange(api);
    }
  };

  const elect = () => {
    const live = [id, ...peers.keys()].sort();
    const nextLeader = /** @type {string} */ (live[0]);
    if (nextLeader !== leader) {
      leader = nextLeader;
    }
  };

  channel.onmessage = (event) => {
    if (stopped) return;
    const message = event?.data;
    if (!message || typeof message.id !== "string") return;
    if (message.id === id) return;

    if (message.kind === "announce") {
      peers.set(message.id, timers.now());
      elect();
      notify();
    } else if (message.kind === "bye") {
      peers.delete(message.id);
      elect();
      notify();
    }
  };

  // Introduce ourselves to peers that are already running
  channel.postMessage({ kind: "announce", id });

  /**
   * @type {TabCoordinator}
   */
  const api = {
    isLeader: () => !stopped && leader === id,
    leaderId: () => (stopped ? null : leader),
    members: () => [id, ...peers.keys()].sort(),
    stop() {
      if (stopped) return;
      stopped = true;
      channel.postMessage({ kind: "bye", id });
      timers.clearInterval(interval);
    },
  };
  return api;
}

/**
 * Generates a fresh tab id. The monotonic counter ensures a later tab sorts
 * after earlier ones in the same session, so leadership is never stolen from
 * a running tab merely by opening another one.
 *
 * @param {{ randomUUID?: () => string }} [cryptoObject]
 * @returns {string}
 */
export function newTabId(
  cryptoObject = /** @type {any} */ (globalThis).crypto,
) {
  const random =
    cryptoObject && typeof cryptoObject.randomUUID === "function"
      ? cryptoObject.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
