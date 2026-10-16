/**
 * @file The runtime bridge (work document #59): the Worker-side host of the
 * FBP Protocol 2.0 client. The bridge tracks the runtime population from
 * the transport's announce stream (the same announces peer discovery
 * already hears), connects to a runtime on command, and reports connection
 * state to the Glass through the contract's runtime echo family.
 *
 * The bridge owns no Reticulum instance of its own: it runs against the
 * mesh layer's shared instance (one RNS instance per process), fetched
 * lazily through the injected accessor so a mesh that starts later (or
 * restarts) is picked up on the next command. Discovery attaches to the
 * transport idempotently per instance.
 *
 * The Glass never speaks the protocol: destination hashes cross the
 * boundary as hex strings, and every runtime fact arrives as a
 * `runtime-discovered` / `runtime-connection` echo (Appendix A).
 */

import {
  connectRuntime,
  decodeAnnounceAppData,
} from "../../vendor/runtime-client.js";

/**
 * A runtime in the discovered population: the decoded FBP announce plus
 * the last-seen timestamp. `destinationHash` is the hex form the IPC
 * boundary speaks; the raw bytes are kept for `connectRuntime`.
 *
 * @typedef {Object} DiscoveredRuntime
 * @property {string} destinationHash Hex destination hash.
 * @property {Uint8Array} destinationHashBytes Raw hash for link creation.
 * @property {string} nodeName The runtime's announced name.
 * @property {number} protocolVersion The announced protocol version.
 * @property {number} lastSeen Wall-clock ms of the latest announce.
 */

/**
 * An open runtime connection: the client from the vendored library plus
 * the identity facts the Glass renders.
 *
 * @typedef {Object} RuntimeConnection
 * @property {any} client The RuntimeClient over the established link.
 * @property {any} link The established protocol link.
 * @property {string | null} nodeName The name from discovery, when known.
 * @property {number} capabilityMask The auth response's advertised mask.
 * @property {number} protocolVersion The auth response's protocol version.
 */

/**
 * Creates the runtime bridge.
 *
 * @param {Object} options
 * @param {() => any} options.getReticulum The mesh layer's shared Reticulum
 *   instance accessor (null before the mesh started).
 * @param {() => Promise<any>} options.getIdentity The device's mesh
 *   identity accessor — the protocol client identity (`link.identify`).
 * @param {(echo: any) => void} options.postMessage The Engine → Glass
 *   echo channel.
 * @param {(options: any) => Promise<any>} [options.establishLink] The link
 *   establishment function; the vendored `connectRuntime` by default,
 *   injectable for tests.
 * @returns {{
 *   attach: () => void,
 *   report: () => void,
 *   connect: (destinationHashHex: string) => Promise<void>,
 *   disconnect: (destinationHashHex: string) => Promise<void>,
 *   stop: () => Promise<void>,
 * }}
 */
export function createRuntimeBridge({
  getReticulum,
  getIdentity,
  postMessage,
  establishLink = /** @type {any} */ (connectRuntime),
}) {
  /** @type {Map<string, DiscoveredRuntime>} */
  const discovered = new Map();
  /** @type {Map<string, RuntimeConnection>} */
  const connections = new Map();
  /** The transport whose announce stream is currently observed. */
  let attachedTransport = /** @type {any} */ (null);

  /**
   * Observes the transport's announce stream for FBP-typed announces.
   * Idempotent per transport instance: a mesh restart swaps the RNS
   * instance, and the next command re-attaches to the new one.
   */
  function attach() {
    const reticulum = getReticulum();
    const transport = reticulum?.transport ?? null;
    if (!transport || transport === attachedTransport) return;
    if (attachedTransport) {
      attachedTransport.removeEventListener("announce", onAnnounce);
    }
    attachedTransport = transport;
    transport.addEventListener("announce", onAnnounce);
    // The cache may already hold runtimes heard before this attach (a
    // restart, or discovery outrunning the mesh start): sweep it so the
    // population reflects what the transport knows
    sweepDestinationCache(reticulum);
  }

  /**
   * Pulls cached FBP announces out of the transport's destination cache:
   * entries the transport heard while we were not listening (or from a
   * previous session's cache hydration) still belong to the population.
   *
   * @param {any} reticulum
   */
  function sweepDestinationCache(reticulum) {
    const cache = reticulum.transport.caches?.knownDestinations;
    if (!(cache instanceof Map)) return;
    for (const [hashHex, entry] of cache) {
      if (!entry?.appData) continue;
      try {
        recordAnnounce(hashHex, entry.appData, false);
      } catch {
        // Not an FBP announce; ignore.
      }
    }
  }

  /**
   * The transport's announce listener: decode the app_data, and track the
   * FBP-protocol population. Non-FBP announces (every other mesh app)
   * fail the decode silently — they are somebody else's peers.
   *
   * @param {any} event
   */
  function onAnnounce(event) {
    if (!event.detail?.appData) return;
    try {
      recordAnnounce(null, event.detail.appData, true);
    } catch {
      // Not an FBP announce; ignore.
    }
  }

  /**
   * Records one decoded announce into the population. New entries and
   * name changes echo to the Glass; every announce refreshes lastSeen
   * silently so the echo channel does not carry the announce cadence.
   *
   * @param {string | null} knownHex The hash when the caller already knows
   *   it (cache sweep); decoded from the app_data otherwise.
   * @param {Uint8Array} appData The announce's app_data payload.
   * @param {boolean} reportNew Whether a new-or-changed entry echoes.
   */
  function recordAnnounce(knownHex, appData, reportNew) {
    const decoded = decodeAnnounceAppData(appData);
    if (decoded.protocolVersion !== 2) return;
    const hex = knownHex ?? decoded.destinationHashHex;
    const existing = discovered.get(hex);
    const changed =
      !existing ||
      existing.nodeName !== decoded.nodeName ||
      existing.protocolVersion !== decoded.protocolVersion;
    discovered.set(hex, {
      destinationHash: hex,
      destinationHashBytes: decoded.destinationHash,
      nodeName: decoded.nodeName,
      protocolVersion: decoded.protocolVersion,
      lastSeen: Date.now(),
    });
    if (reportNew && changed) postDiscovered();
  }

  /**
   * Reports the discovered population to the Glass.
   */
  function postDiscovered() {
    postMessage({
      kind: "runtime-discovered",
      runtimes: [...discovered.values()]
        .map(({ destinationHashBytes, ...entry }) => entry)
        .sort((a, b) =>
          a.nodeName === b.nodeName
            ? a.destinationHash < b.destinationHash
              ? -1
              : 1
            : a.nodeName < b.nodeName
              ? -1
              : 1,
        ),
    });
  }

  /**
   * Reports one connection's state to the Glass.
   *
   * @param {string} destinationHashHex
   * @param {"connected" | "disconnected" | "error"} state
   * @param {{ nodeName?: string | null, capabilityMask?: number, protocolVersion?: number, error?: string }} [facts]
   */
  function postConnection(destinationHashHex, state, facts = {}) {
    postMessage({
      kind: "runtime-connection",
      destinationHash: destinationHashHex,
      state,
      nodeName:
        facts.nodeName ?? discovered.get(destinationHashHex)?.nodeName ?? null,
      ...(facts.capabilityMask === undefined
        ? {}
        : { capabilityMask: facts.capabilityMask }),
      ...(facts.protocolVersion === undefined
        ? {}
        : { protocolVersion: facts.protocolVersion }),
      ...(facts.error === undefined ? {} : { error: facts.error }),
    });
  }

  /**
   * Re-reports the current population (the `runtimeDiscover` command).
   */
  function report() {
    attach();
    postDiscovered();
  }

  /**
   * Connects to a discovered runtime: establishes the protocol link with
   * the device's mesh identity and reports the connection. Connecting an
   * already-connected runtime re-reports its state.
   *
   * @param {string} destinationHashHex
   */
  async function connect(destinationHashHex) {
    attach();
    const known = discovered.get(destinationHashHex);
    if (connections.has(destinationHashHex)) {
      const existing = connections.get(destinationHashHex);
      postConnection(destinationHashHex, "connected", {
        nodeName: existing?.nodeName ?? null,
        capabilityMask: existing?.capabilityMask,
        protocolVersion: existing?.protocolVersion,
      });
      return;
    }
    const reticulum = getReticulum();
    if (!reticulum) {
      postConnection(destinationHashHex, "error", {
        error: "mesh is not running",
      });
      return;
    }
    let identity = null;
    try {
      identity = await getIdentity();
    } catch {
      identity = null;
    }
    if (!identity) {
      postConnection(destinationHashHex, "error", {
        error: "no mesh identity",
      });
      return;
    }
    try {
      const { link, auth, client } = await establishLink({
        reticulum,
        destinationHash:
          known?.destinationHashBytes ?? fromHex(destinationHashHex),
        identity,
      });
      connections.set(destinationHashHex, {
        client,
        link,
        nodeName: known?.nodeName ?? null,
        capabilityMask: auth.capabilityMask,
        protocolVersion: auth.protocolVersion,
      });
      postConnection(destinationHashHex, "connected", {
        nodeName: known?.nodeName ?? null,
        capabilityMask: auth.capabilityMask,
        protocolVersion: auth.protocolVersion,
      });
    } catch (/** @type {any} */ err) {
      postConnection(destinationHashHex, "error", {
        error: err?.message ?? String(err),
      });
    }
  }

  /**
   * Tears a connection down. Disconnecting an unknown runtime is
   * idempotent: the disconnected state is the answer either way.
   *
   * @param {string} destinationHashHex
   */
  async function disconnect(destinationHashHex) {
    const existing = connections.get(destinationHashHex);
    connections.delete(destinationHashHex);
    if (existing) {
      await existing.client.close().catch(() => {});
    }
    postConnection(destinationHashHex, "disconnected", {
      nodeName: existing?.nodeName ?? null,
    });
  }

  /**
   * Tears everything down (Engine shutdown): every connection closed, the
   * announce listener removed.
   */
  async function stop() {
    for (const [hex, existing] of connections) {
      connections.delete(hex);
      await existing.client.close().catch(() => {});
    }
    if (attachedTransport) {
      attachedTransport.removeEventListener("announce", onAnnounce);
      attachedTransport = null;
    }
  }

  return { attach, report, connect, disconnect, stop };
}

/**
 * Hex → bytes for destinations the Glass names without discovery having
 * seen them (the connect command is authoritative either way: an unknown
 * destination fails at link creation with the runtime's silence).
 *
 * @param {string} hex
 * @returns {Uint8Array}
 */
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
