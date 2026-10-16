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

import * as fbpProtocol from "../../vendor/fbp-protocol.js";
import { CAPABILITY, RUN_ACTION } from "../../vendor/fbp-protocol.js";

/**
 * The wire's opcode names, derived from the protocol package's constants:
 * the frame tap's messages name commands without hand-writing a table
 * that would drift from the wire.
 * @type {Record<number, string>}
 */
const CMD_NAMES = {};
for (const [name, value] of Object.entries(fbpProtocol)) {
  if (name.startsWith("CMD_") && typeof value === "number") {
    CMD_NAMES[value] = name.slice(4);
  }
}

/**
 * Describes one frame for the wires layer: the direction arrow, the
 * opcode, its name, and the fields that identify the command's target
 * when the decode carries them. Undecodable frames stay honest — a byte
 * count, not a guess.
 *
 * @param {Uint8Array} payload
 * @param {"TX" | "RX"} direction
 * @returns {{ message: string, status: string, tone?: "ok" | "fail" | "" }}
 */
function describeFrame(payload, direction) {
  const arrow = direction === "TX" ? "→" : "←";
  try {
    const decoded = fbpProtocol.decodeFrame(payload);
    const name = CMD_NAMES[decoded.cmd] ?? `0x${decoded.cmd.toString(16)}`;
    const target =
      /** @type {any} */ (decoded).entityId !== undefined
        ? ` · ${/** @type {any} */ (decoded).entityId}`
        : /** @type {any} */ (decoded).planeId !== null &&
            /** @type {any} */ (decoded).planeId !== undefined
          ? ` · plane ${/** @type {any} */ (decoded).planeId}`
          : "";
    return {
      message: `${arrow} 0x${decoded.cmd.toString(16)} ${name}${target}`,
      status: direction,
    };
  } catch {
    return {
      message: `${arrow} frame · ${payload.length} B (undecodable)`,
      status: direction,
      tone: "fail",
    };
  }
}

import {
  connectRuntime,
  decodeAnnounceAppData,
} from "../../vendor/runtime-client.js";
import { graphViewToOps } from "./runtimeDeploy.js";

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
 * Decodes an advertised capability mask into the relation names the wire
 * defines (noflo board WD #4): per-bit relations, with the coarse
 * all-relations grant short-circuiting the list. Unknown bits keep their
 * positions — a forward protocol version may advertise relations this
 * client does not know yet.
 *
 * @param {number} mask
 * @returns {string[]}
 */
export function decodeCapabilityMask(mask) {
  if ((mask & 0xff) === 0xff) return ["all"];
  /** @type {string[]} */
  const names = [];
  for (const [name, bit] of Object.entries(CAPABILITY)) {
    if ((mask & Number(bit)) === Number(bit)) {
      names.push(name.toLowerCase().replaceAll("_", "."));
    }
  }
  for (let bit = 0x100; bit !== 0 && bit <= 0x80000000; bit *= 2) {
    if ((mask & bit) === bit) names.push(`bit${bit.toString(16)}`);
  }
  return names;
}

/**
 * Run-state words for the `0x40` execution echoes, keyed by the wire's
 * run actions (work document #4 §7).
 */
const RUN_STATE = {
  [RUN_ACTION.START]: "running",
  [RUN_ACTION.RESUME]: "running",
  [RUN_ACTION.PAUSE]: "paused",
  [RUN_ACTION.STOP]: "stopped",
  [RUN_ACTION.STEP]: "running",
};

/**
 * Creates the runtime bridge.
 *
 * @param {Object} options
 * @param {() => any} options.getReticulum The mesh layer's shared Reticulum
 *   instance accessor (null before the mesh started).
 * @param {() => Promise<any>} options.getIdentity The device's mesh
 *   identity accessor — the protocol client identity (`link.identify`).
 * @param {(graphId: string) => any} options.projectGraph The graph
 *   projection: the Engine binds the project document, the bridge asks by
 *   graph id (the Appendix B view the deploy path converts).
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
 *   deploy: (destinationHashHex: string, graphId: string) => Promise<void>,
 *   run: (destinationHashHex: string, action: 'start' | 'stop') => Promise<void>,
 *   stop: () => Promise<void>,
 * }}
 */
export function createRuntimeBridge({
  getReticulum,
  getIdentity,
  projectGraph,
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
    const mask = facts.capabilityMask;
    postMessage({
      kind: "runtime-connection",
      destinationHash: destinationHashHex,
      state,
      nodeName:
        facts.nodeName ?? discovered.get(destinationHashHex)?.nodeName ?? null,
      ...(mask === undefined ? {} : { capabilityMask: mask }),
      ...(mask === undefined
        ? {}
        : { capabilities: decodeCapabilityMask(mask) }),
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
      // The CRDT op-stream identity (work document #59's Phase A
      // decision): the device's mesh identity hash, a stable per-device
      // string. The Yjs numeric-clientID mapping stays open for Phase B.
      try {
        client.clientId = await identityHashOf(identity);
      } catch {
        // Ops without a client id cannot be sent; the deploy path
        // surfaces the gap when it hits it
      }
      wireClientEvents(destinationHashHex, client);
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
      // The initial process list rides the connection: an observe-only
      // runtime shows its state without a deploy first
      client.execution.requestProcesses().catch(() => {});
    } catch (/** @type {any} */ err) {
      postConnection(destinationHashHex, "error", {
        error: err?.message ?? String(err),
      });
    }
  }

  /**
   * Derives the CRDT client id from the device's mesh identity: the
   * identity's public key hex, the same string the mesh layer displays
   * as the identity hash.
   *
   * @param {any} identity
   * @returns {Promise<string>}
   */
  async function identityHashOf(identity) {
    if (typeof identity === "string") return identity;
    if (typeof identity.identityHash === "string") return identity.identityHash;
    const { toHex } = await import("../../vendor/reticulum-core.js");
    return toHex(await identity.getPublicKey());
  }

  /**
   * Wires the client's event surface to the echo channel: process lists
   * (`0x45`), op rejections (`0x17`), and execution-control echoes
   * (`0x40` family). The listeners ride the connection's lifetime.
   *
   * @param {string} destinationHashHex
   * @param {any} client
   */
  function wireClientEvents(destinationHashHex, client) {
    // The FBP protocol stream (work document #63 M3): every frame the
    // client exchanges with the runtime, both directions, decoded to the
    // wire's own vocabulary. Inbound frames ride the client's frame
    // event; outbound frames ride a send wrapper restored at teardown.
    const frameListener = (/** @type {any} */ event) => {
      if (!event.detail?.payload) return;
      const described = describeFrame(event.detail.payload, "RX");
      postMessage({
        kind: "runtime-telemetry",
        destinationHash: destinationHashHex,
        direction: "in",
        time: Date.now(),
        ...described,
      });
    };
    client.addEventListener("frame", frameListener);
    const originalSend = client.send.bind(client);
    /** @type {any} */ (client).send = (/** @type {Uint8Array} */ payload) => {
      const described = describeFrame(payload, "TX");
      postMessage({
        kind: "runtime-telemetry",
        destinationHash: destinationHashHex,
        direction: "out",
        time: Date.now(),
        ...described,
      });
      return originalSend(payload);
    };
    connectionRestores.set(destinationHashHex, () => {
      client.removeEventListener("frame", frameListener);
      /** @type {any} */ (client).send = originalSend;
    });
    const listeners = [
      [
        "processlist",
        (/** @type {any} */ event) => {
          postMessage({
            kind: "runtime-processes",
            destinationHash: destinationHashHex,
            epochId: event.detail?.epochId ?? null,
            entries: event.detail?.entries ?? {},
          });
        },
      ],
      [
        "oprejected",
        (/** @type {any} */ event) => {
          postMessage({
            kind: "runtime-op-rejected",
            destinationHash: destinationHashHex,
            rejectedCmd: event.detail?.rejectedCmd ?? null,
            detail: event.detail?.detail ?? null,
          });
        },
      ],
      [
        "execution",
        (/** @type {any} */ event) => {
          const decoded = event.detail ?? {};
          if (decoded.cmd !== 0x40) return;
          postMessage({
            kind: "runtime-run",
            destinationHash: destinationHashHex,
            state: RUN_STATE[decoded.action] ?? "unknown",
            action: decoded.action,
          });
        },
      ],
    ];
    for (const [type, listener] of listeners) {
      client.addEventListener(type, listener);
    }
    connectionListeners.set(destinationHashHex, listeners);
  }

  /** Per-connection event listener pairs, for teardown. */
  const connectionListeners = new Map();
  /** Per-connection restores for the taps that wrap client surfaces. */
  const connectionRestores = new Map();

  /**
   * Removes a connection's echo listeners.
   *
   * @param {string} destinationHashHex
   * @param {any} client
   */
  function unwireClientEvents(destinationHashHex, client) {
    const listeners = connectionListeners.get(destinationHashHex);
    if (!listeners) return;
    for (const [type, listener] of listeners) {
      client.removeEventListener(type, listener);
    }
    connectionListeners.delete(destinationHashHex);
    connectionRestores.get(destinationHashHex)?.();
    connectionRestores.delete(destinationHashHex);
  }

  /**
   * Whether the runtime's graph mirror already holds an entity: the
   * per-kind accessors are the GraphModel's surface — a `hasEntity` does
   * not exist.
   *
   * @param {any} mirror
   * @param {string} entityId
   * @returns {boolean}
   */
  function mirrorHasEntity(mirror, entityId) {
    if (!mirror) return false;
    return Boolean(
      mirror.node?.(entityId) ||
        mirror.edge?.(entityId) ||
        mirror.iip?.(entityId) ||
        mirror.export?.(entityId) ||
        mirror.group?.(entityId),
    );
  }

  /**
   * Deploys a project graph onto a connected runtime (work document #59
   * Phase A): sync the runtime's mirror, then stream the projected graph
   * as `0x14` ops for entities the mirror lacks, then read the mirror
   * back. Deploy and run are separate commands; the deploy does not start
   * the network.
   *
   * @param {string} destinationHashHex
   * @param {string} graphId
   */
  async function deploy(destinationHashHex, graphId) {
    const connection = connections.get(destinationHashHex);
    const client = connection?.client;
    postMessage({
      kind: "runtime-deploy",
      destinationHash: destinationHashHex,
      graphId,
      state: "deploying",
    });
    if (!client) {
      postMessage({
        kind: "runtime-deploy",
        destinationHash: destinationHashHex,
        graphId,
        state: "error",
        error: "not connected",
      });
      return;
    }
    const view = projectView(graphId);
    if (!view) {
      postMessage({
        kind: "runtime-deploy",
        destinationHash: destinationHashHex,
        graphId,
        state: "error",
        error: `unknown graph ${graphId}`,
      });
      return;
    }
    try {
      const { graph: mirror } = await client.syncGraph({ timeoutMs: 30_000 });
      const ops = graphViewToOps(view);
      let sent = 0;
      for (const op of ops) {
        if (mirrorHasEntity(mirror, op.entityId)) {
          // The mirror already holds the entity: the deploy converges
          // onto the same entity ids rather than duplicating
          continue;
        }
        await client.sendGraphOp({
          planeId: null,
          opType: op.opType,
          entityId: op.entityId,
          payload: op.payload,
        });
        sent += 1;
      }
      // Read the mirror back: the runtime's epoch advanced if it applied
      // the ops, and the re-sync is the deploy's verification
      await client.syncGraph({ timeoutMs: 30_000 }).catch(() => {});
      postMessage({
        kind: "runtime-deploy",
        destinationHash: destinationHashHex,
        graphId,
        state: "deployed",
        ops: sent,
        skipped: ops.length - sent,
      });
      // The deploy may have started processes: refresh the listing
      client.execution.requestProcesses().catch(() => {});
    } catch (/** @type {any} */ err) {
      postMessage({
        kind: "runtime-deploy",
        destinationHash: destinationHashHex,
        graphId,
        state: "error",
        error: err?.message ?? String(err),
      });
    }
  }

  /**
   * Run control over a connected runtime's main plane (work document #59
   * Phase A): the command is fire-and-forget on the wire; the runtime's
   * `0x40` echoes arrive as `runtime-run` state.
   *
   * @param {string} destinationHashHex
   * @param {'start' | 'stop'} action
   */
  async function run(destinationHashHex, action) {
    const connection = connections.get(destinationHashHex);
    const wireAction = action === "start" ? RUN_ACTION.START : RUN_ACTION.STOP;
    try {
      if (!connection) throw new Error("not connected");
      await connection.client.execution.runControl(wireAction);
      postMessage({
        kind: "runtime-run",
        destinationHash: destinationHashHex,
        state: action === "start" ? "running" : "stopped",
        requested: true,
      });
      // The listing follows the run state change
      connection.client.execution.requestProcesses().catch(() => {});
    } catch (/** @type {any} */ err) {
      postMessage({
        kind: "runtime-run",
        destinationHash: destinationHashHex,
        state: "error",
        error: err?.message ?? String(err),
      });
    }
  }

  /**
   * The projected graph view for the deploy path: the Engine injects the
   * projection function and holds the document (the bridge stays
   * CRDT-agnostic).
   *
   * @param {string} graphId
   */
  function projectView(graphId) {
    if (!projectGraph) return null;
    return projectGraph(graphId);
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
      unwireClientEvents(destinationHashHex, existing.client);
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
      unwireClientEvents(hex, existing.client);
      await existing.client.close().catch(() => {});
    }
    if (attachedTransport) {
      attachedTransport.removeEventListener("announce", onAnnounce);
      attachedTransport = null;
    }
  }

  return { attach, report, connect, disconnect, deploy, run, stop };
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
