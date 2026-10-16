// node_modules/@noflo/runtime-client/src/index.js
import {
  ANNOUNCE_ASPECT,
  CMD_BREAKPOINT_CLEAR,
  CMD_BREAKPOINT_SET,
  CMD_CRDT_UPDATE,
  CMD_FLOWTRACE_CHUNK,
  CMD_HWM_SET,
  CMD_OP_REJECTED,
  CMD_PACKET_SEND,
  CMD_PROCESS_CTRL,
  CMD_PROCESS_LIST,
  CMD_RUN_CTRL,
  decodeAnnounceAppData,
  decodeAuthResponse,
  decodeCompManifest as decodeCompManifest2,
  decodeCompSourceRes,
  decodeCrdtStaleEpoch,
  decodeCrdtUpToDate,
  decodeFrame,
  decodeGetStatusRes,
  decodePlaneListRes,
  encodeCompSourceReq,
  encodeCompSyncReq as encodeCompSyncReq2,
  encodeCompWrite,
  encodeCrdtSyncReq,
  encodeCrdtUpdate,
  encodeGetStatus,
  encodePlaneList,
  PROTOCOL_VERSION
} from "./fbp-protocol.js";
import { GraphModel } from "./graph.js";
import { Destination, fromHex as fromHex2, Packet, PacketType } from "./reticulum-core.js";

// node_modules/@noflo/runtime-client/src/execution.js
import {
  encodeBreakpointClear,
  encodeBreakpointSet,
  encodeHwmSet,
  encodePacketSend,
  encodeProcessCtrl,
  encodeProcessListReq,
  encodeRunCtrl,
  PROCESS_ACTION,
  RUN_ACTION
} from "./fbp-protocol.js";
import {
  PROCESS_ACTION as PROCESS_ACTION2,
  RUN_ACTION as RUN_ACTION2
} from "./fbp-protocol.js";
var ExecutionClient = class {
  /** @type {(payload: Uint8Array) => Promise<void>} */
  #send;
  /**
   * @param {Object} deps
   * @param {(payload: Uint8Array) => Promise<void>} deps.send - Frame sender over the established link
   */
  constructor({ send }) {
    this.#send = send;
  }
  /**
   * Run control: pause, resume, step, start, or stop the network.
   *
   * @param {keyof typeof RUN_ACTION | number} action
   * @param {number|string|null} [planeId] - nil addresses the main plane
   * @returns {Promise<void>}
   */
  runControl(action, planeId = null) {
    const resolved = typeof action === "string" ? RUN_ACTION[action] : action;
    return this.#send(encodeRunCtrl(resolved, planeId));
  }
  /**
   * Set a data breakpoint: the runtime pauses when a packet arrives at
   * the node's triggering inport.
   *
   * @param {Object} bp
   * @param {string} bp.breakpointId
   * @param {string} bp.nodeId
   * @param {string|null} [bp.port] - nil matches any port
   * @returns {Promise<void>}
   */
  setBreakpoint({ breakpointId, nodeId, port = null }) {
    return this.#send(encodeBreakpointSet({ breakpointId, nodeId, port }));
  }
  /**
   * Clear one breakpoint, or all when no id is given.
   *
   * @param {string|null} [breakpointId] - nil clears every breakpoint
   * @returns {Promise<void>}
   */
  clearBreakpoints(breakpointId = null) {
    return this.#send(encodeBreakpointClear(breakpointId));
  }
  /**
   * Per-process execution control: a disabled node stops activating;
   * queued packets are kept and resume when enabled.
   *
   * @param {string} nodeId
   * @param {keyof typeof PROCESS_ACTION | number} action
   * @returns {Promise<void>}
   */
  processControl(nodeId, action) {
    const resolved = typeof action === "string" ? PROCESS_ACTION[action] : action;
    return this.#send(encodeProcessCtrl({ nodeId, action: resolved }));
  }
  /**
   * Request the live process listing (the authoritative view of the
   * current graph epoch — clients never infer stub-ness by name
   * matching). The listing arrives as an inbound `0x45` frame, re-emitted
   * by the client as a typed `processlist` event.
   *
   * @returns {Promise<void>}
   */
  requestProcesses() {
    return this.#send(encodeProcessListReq());
  }
  /**
   * Set the default edge capacity (high-water mark) for the runtime.
   *
   * @param {number|null} highWaterMark
   * @returns {Promise<void>}
   */
  setHwm(highWaterMark) {
    return this.#send(encodeHwmSet(highWaterMark));
  }
  /**
   * Inject one packet into a running network's inport — the remote
   * counterpart of feeding IIPs, and the fbp-spec runner's sequenced
   * case-input mechanism.
   *
   * @param {Object} packet
   * @param {number|string|null} [packet.planeId] - nil = main plane
   * @param {string} packet.port - Inport name
   * @param {any} packet.payload
   * @returns {Promise<void>}
   */
  injectPacket({ planeId = null, port, payload }) {
    return this.#send(encodePacketSend({ planeId, port, payload }));
  }
};

// node_modules/@noflo/runtime-client/src/registry-cache.js
import {
  decodeCompDetailRes,
  decodeCompManifest,
  decodeCompUpToDate,
  encodeCompDetailReq,
  encodeCompSyncReq,
  registryHash
} from "./fbp-protocol.js";
var RegistryCache = class {
  /** @type {(payload: Uint8Array) => Promise<Uint8Array>} */
  #requestReply;
  /** @type {RegistryCatalog} */
  #catalog = {};
  /** @type {string|undefined} The runtime's registry hash from the latest sync */
  #registryHash = void 0;
  /**
   * @param {Object} deps
   * @param {(payload: Uint8Array) => Promise<Uint8Array>} deps.requestReply - Send and await the next inbound frame
   */
  constructor({ requestReply }) {
    this.#requestReply = requestReply;
  }
  /**
   * The catalog after the latest sync.
   *
   * @returns {RegistryCatalog}
   */
  catalog() {
    return this.#catalog;
  }
  /**
   * The runtime's registry hash from the latest manifest.
   *
   * @returns {string|undefined}
   */
  registryHashValue() {
    return this.#registryHash;
  }
  /**
   * Run the Two-Step Cache sync: send the locally computed registry hash
   * (or `"stale"` to force a manifest), merge the manifest into the
   * catalog, and request details for entries whose signature hash is new
   * or changed. Entries keep their previous details when their signature
   * hash is unchanged.
   *
   * @param {string} [localRegistryHash] - `"stale"` (default) forces a full manifest; otherwise the hash of the client's known catalog
   * @returns {Promise<RegistryCatalog>} The merged catalog
   */
  async sync(localRegistryHash = "stale") {
    const reply = await this.#requestReply(
      encodeCompSyncReq(localRegistryHash)
    );
    try {
      decodeCompUpToDate(reply);
      return this.#catalog;
    } catch {
    }
    const manifest = decodeCompManifest(reply);
    this.#registryHash = manifest.newRegistryHash;
    const fresh = {};
    const needDetails = [];
    for (const [name, entry] of Object.entries(manifest.entries ?? {})) {
      const known = this.#catalog[name];
      const sigHash = entry.sigHash;
      fresh[name] = {
        sigHash,
        type: entry.type,
        ...known && known.sigHash === sigHash && known.signature ? { signature: known.signature } : {}
      };
      if (!known || known.sigHash !== sigHash) {
        needDetails.push(name);
      }
    }
    this.#catalog = fresh;
    if (needDetails.length > 0) {
      const details = decodeCompDetailRes(
        await this.#requestReply(encodeCompDetailReq(needDetails))
      );
      for (const [name, signature] of Object.entries(
        details.components ?? {}
      )) {
        if (this.#catalog[name]) {
          this.#catalog[name].signature = signature;
        }
      }
    }
    return this.#catalog;
  }
  /**
   * The locally computed registry hash for a catalog — the value to pass
   * as `localRegistryHash` on subsequent syncs (the codec pins the
   * algorithm).
   *
   * @param {RegistryCatalog} [catalog]
   * @returns {Promise<string>}
   */
  async computeLocalHash(catalog = this.#catalog) {
    const entries = {};
    for (const [name, entry] of Object.entries(catalog)) {
      if (entry.sigHash !== void 0 && entry.type !== void 0) {
        entries[name] = { sigHash: entry.sigHash, type: entry.type };
      }
    }
    return registryHash(entries);
  }
  /**
   * The cached full signature for a component, if its detail was fetched.
   *
   * @param {string} name - Library-namespaced component name
   * @returns {any|undefined}
   */
  signature(name) {
    return this.#catalog[name]?.signature;
  }
};

// node_modules/@noflo/runtime-client/src/schema-cache.js
import {
  collectSchemaRefs,
  decodeSchemaRes,
  digestSchema,
  encodeSchemaReq,
  parseSchemaRef
} from "./fbp-protocol.js";
import { fromHex } from "./reticulum-core.js";
var SchemaCache = class {
  /** @type {(payload: Uint8Array) => Promise<Uint8Array>} */
  #requestReply;
  /** @type {Map<string, Record<string, any>>} */
  #bodies = /* @__PURE__ */ new Map();
  /**
   * @param {Object} deps
   * @param {(payload: Uint8Array) => Promise<Uint8Array>} deps.requestReply - Send and await the next inbound frame
   */
  constructor({ requestReply }) {
    this.#requestReply = requestReply;
  }
  /**
   * The bodies currently held, keyed by hex digest.
   *
   * @returns {Map<string, Record<string, any>>}
   */
  bodies() {
    return new Map(this.#bodies);
  }
  /**
   * @param {string} digest Hex digest.
   * @returns {boolean}
   */
  has(digest) {
    return this.#bodies.has(digest);
  }
  /**
   * @param {string} digest Hex digest.
   * @returns {Record<string, any>|undefined}
   */
  body(digest) {
    return this.#bodies.get(digest);
  }
  /**
   * Compute the digests of a fetch: the requested digests the store does
   * not hold, plus the transitive `$ref` digests of held bodies the store
   * does not hold — closure completeness is checked from the local cache
   * alone.
   *
   * @param {string[]} digests Hex digests wanted for use.
   * @returns {string[]} Missing hex digests, deduplicated.
   */
  missing(digests) {
    const out = /* @__PURE__ */ new Set();
    const walk = (digest) => {
      if (out.has(digest) || this.#bodies.has(digest)) return;
      out.add(digest);
    };
    for (const digest of digests) {
      walk(digest);
      const held = this.#bodies.get(digest);
      if (held) {
        for (const ref of refsOf(held)) walk(ref);
      }
    }
    return [...out];
  }
  /**
   * Whether the requested digests are usable: every digest present, and
   * every `$ref` digest in their transitive closures present too. A
   * missing entry is requested before use, never assumed.
   *
   * @param {string[]} digests Hex digests wanted for use.
   * @returns {boolean}
   */
  isClosureComplete(digests) {
    return this.missing(digests).length === 0;
  }
  /**
   * Fetch bodies by digest over `0x28`, with closure bundling on: each
   * returned body is digest-verified client-side — a mismatch is discarded
   * and treated as absent — before it enters the store. Bundled entries
   * are verified against their `$id` digest the same way. Accepts bodies
   * held locally through the request when a closure bundle widens beyond
   * the asked digests.
   *
   * @param {string[]} digests Hex digests to fetch.
   * @param {Object} [options]
   * @param {boolean} [options.bundle] Request closure-bundled responses (default on).
   * @returns {Promise<Map<string, Record<string, any>>>} The verified bodies this round fetched.
   *   A nil or resource-ref entry is treated as absent; the returned map
   *   may be empty when the runtime holds none of the requested digests —
   *   degradation, never an error. A closure left incomplete by the
   *   bundle cap or by nil entries is the caller's signal to iterate with
   *   further requests.
   */
  async fetch(digests, options = {}) {
    const { bundle = true } = options;
    const wanted = digests.filter((digest) => !this.#bodies.has(digest));
    if (wanted.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const reply = await this.#requestReply(
      encodeSchemaReq(
        wanted.map((digest) => fromHex(digest)),
        bundle
      )
    );
    const { bodies } = decodeSchemaRes(reply);
    const verified = /* @__PURE__ */ new Map();
    for (const [digest, value] of Object.entries(bodies)) {
      if (value === null || typeof value === "string") {
        continue;
      }
      const computed = await digestSchema(value);
      if (computed !== digest) {
        continue;
      }
      this.#bodies.set(digest, value);
      verified.set(digest, value);
    }
    const missing = this.missing(digests);
    if (missing.length > 0) {
      return verified;
    }
    return verified;
  }
};
function refsOf(body) {
  return collectSchemaRefs(body).map((ref) => parseSchemaRef(ref).digest).filter((digest) => digest !== null);
}

// node_modules/@noflo/runtime-client/src/index.js
import {
  ANNOUNCE_ASPECT as ANNOUNCE_ASPECT2,
  decodeAnnounceAppData as decodeAnnounceAppData2,
  decodeAuthResponse as decodeAuthResponse2,
  decodeCompManifest as decodeCompManifest3,
  decodeCrdtStaleEpoch as decodeCrdtStaleEpoch2,
  decodeCrdtUpdate,
  decodeCrdtUpToDate as decodeCrdtUpToDate2,
  decodeFlowtraceChunk as decodeFlowtraceChunk2,
  decodeGetStatusRes as decodeGetStatusRes2,
  decodeOpRejected,
  decodePlaneListRes as decodePlaneListRes2,
  encodeCompManifest,
  encodeCompSourceRes,
  encodeCompSyncReq as encodeCompSyncReq3,
  encodeCrdtStaleEpoch,
  encodeCrdtSyncReq as encodeCrdtSyncReq2,
  encodeCrdtUpdate as encodeCrdtUpdate2,
  encodeCrdtUpToDate,
  encodeGetStatus as encodeGetStatus2,
  encodeGetStatusRes,
  encodePlaneList as encodePlaneList2,
  encodePlaneListRes,
  encodePubsubSub as encodePubsubSub2,
  OP_TYPE,
  PROTOCOL_VERSION as PROTOCOL_VERSION2,
  RUN_STATE
} from "./fbp-protocol.js";

// node_modules/@noflo/runtime-client/src/telemetry.js
import { decodeFlowtraceChunk, encodePubsubSub } from "./fbp-protocol.js";
var TelemetryClient = class {
  /** @type {(payload: Uint8Array) => Promise<void>} */
  #send;
  /** @type {((chunk: TelemetryChunk) => void)|undefined} */
  #onChunk;
  /** @type {TelemetryFilters} */
  #filters;
  /** @type {string} */
  #subId;
  /** @type {string} */
  #targetId;
  /**
   * @param {Object} deps
   * @param {(payload: Uint8Array) => Promise<void>} deps.send - Frame sender over the established link
   * @param {string} [deps.subId] - Client-chosen subscription identifier
   * @param {string} [deps.targetId] - The telemetry target (the runtime's main graph)
   * @param {TelemetryFilters} [deps.filters] - Client-side event-type filters
   */
  constructor({
    send,
    subId = "noflo-client-telemetry",
    targetId = "main",
    filters = {}
  }) {
    this.#send = send;
    this.#subId = subId;
    this.#targetId = targetId;
    this.#filters = filters;
  }
  /**
   * Subscribe to the runtime's telemetry stream (`0x30`).
   *
   * @param {Object} [options]
   * @param {number} [options.flushIntervalMs] - Requested flush cadence (default 100ms)
   * @returns {Promise<void>}
   */
  subscribe(options = {}) {
    const { flushIntervalMs = 100 } = options ?? {};
    return this.#send(
      encodePubsubSub({
        subId: this.#subId,
        targetType: "graph",
        targetId: this.#targetId,
        requestedFlushIntervalMs: flushIntervalMs
      })
    );
  }
  /**
   * Set the callback for inbound `0x32` chunks.
   *
   * @param {(chunk: TelemetryChunk) => void} onChunk
   */
  onChunk(onChunk) {
    this.#onChunk = onChunk;
  }
  /**
   * Handle an inbound `0x32` chunk frame (wired by the client host to
   * the link's frame events): decodes the chunk and hands it to the
   * decoded handler.
   *
   * @param {Uint8Array} frame
   */
  handleChunkFrame(frame) {
    this.handleDecoded(decodeFlowtraceChunk(frame));
  }
  /**
   * Handle an already-decoded chunk (wired to the client's typed
   * `telemetry` event): applies the deltas to absolute timestamps,
   * filters by event type, and emits the result through the `onChunk`
   * callback.
   *
   * @param {{ subId: string|number, planeId: number|string|null, baseTimestampMs: number, events?: Array<{ timeDeltaMs: number, eventType: number, payload: any }> }} decoded
   */
  handleDecoded(decoded) {
    const filters = this.#filters;
    const events = (decoded.events ?? []).map((event) => ({
      timestampMs: decoded.baseTimestampMs + event.timeDeltaMs,
      timeDeltaMs: event.timeDeltaMs,
      eventType: event.eventType,
      payload: event.payload
    })).filter((event) => {
      if (filters.types && filters.types.length > 0 && !filters.types.includes(event.eventType)) {
        return false;
      }
      return true;
    });
    if (this.#onChunk) {
      this.#onChunk({
        subId: decoded.subId,
        planeId: decoded.planeId,
        baseTimestampMs: decoded.baseTimestampMs,
        events
      });
    }
  }
};

// node_modules/@noflo/runtime-client/src/ui-events.js
var UiEventSurface = class extends EventTarget {
  /** @type {import("./index.js").RuntimeClient} */
  #client;
  /** @type {TelemetryClient} */
  #telemetry;
  /** @type {boolean} */
  #wired = false;
  /**
   * @param {Object} options
   * @param {import("./index.js").RuntimeClient} options.client - The established protocol client
   * @param {import("./telemetry.js").TelemetryFilters} [options.filters] - Telemetry event-type filters
   * @param {string} [options.telemetrySubId] - The telemetry subscription id
   */
  constructor({ client, filters = {}, telemetrySubId }) {
    super();
    this.#client = client;
    this.#telemetry = new TelemetryClient({
      send: (payload) => client.send(payload),
      subId: telemetrySubId,
      filters
    });
    this.#telemetry.onChunk((chunk) => {
      this.dispatchEvent(
        new CustomEvent("packets", { detail: (
          /** @type {any} */
          chunk
        ) })
      );
    });
    client.addEventListener("telemetry", (event) => {
      this.#telemetry.handleDecoded(event.detail);
    });
    client.addEventListener("oprejected", (event) => {
      this.dispatchEvent(
        new CustomEvent("oprejected", { detail: event.detail })
      );
    });
    client.addEventListener("execution", (event) => {
      this.dispatchEvent(
        new CustomEvent("execution", { detail: event.detail })
      );
    });
  }
  /**
   * The wrapped protocol client.
   *
   * @returns {import("./index.js").RuntimeClient}
   */
  get client() {
    return this.#client;
  }
  /**
   * The telemetry consumer (for filter changes and direct chunk access).
   *
   * @returns {TelemetryClient}
   */
  get telemetry() {
    return this.#telemetry;
  }
  /**
   * The execution-control sender (run control, breakpoints, process
   * control, packet injection) over the same link.
   *
   * @returns {import("./execution.js").ExecutionClient}
   */
  get execution() {
    return this.#client.execution;
  }
  /**
   * Wire the surface to the client's frame stream: graph ops become
   * `graphchanged` events, `0x45` process listings become `processes`
   * events. Idempotent — the wiring happens once on the first `start`.
   *
   * @returns {void}
   */
  #wire() {
    if (this.#wired) {
      return;
    }
    this.#wired = true;
    this.#client.addEventListener("op", (event) => {
      this.dispatchEvent(
        new CustomEvent("graphchanged", { detail: event.detail })
      );
    });
    this.#client.addEventListener("processlist", (event) => {
      this.dispatchEvent(
        new CustomEvent("processes", {
          detail: (
            /** @type {any} */
            { entries: event.detail.entries }
          )
        })
      );
    });
  }
  /**
   * Start the UI session: sync the graph mirror and the component
   * registry (emitting `graph` and `components`), wire the frame
   * stream, and subscribe to telemetry.
   *
   * @param {Object} [options]
   * @param {boolean} [options.telemetry] - Subscribe to the telemetry stream (default true)
   * @returns {Promise<void>}
   */
  async start(options = {}) {
    const { telemetry = true } = options;
    this.#wire();
    const graphSync = this.#client.syncGraph().then((sync) => {
      this.dispatchEvent(
        new CustomEvent("graph", {
          detail: (
            /** @type {any} */
            {
              epochId: sync.epochId,
              graph: sync.graph,
              upToDate: sync.upToDate
            }
          )
        })
      );
    });
    const registrySync = this.#client.syncComponents().then(async (catalog) => {
      const schemaBodies = await this.#client.syncSchemaBodies(catalog);
      this.dispatchEvent(
        new CustomEvent("components", {
          detail: (
            /** @type {any} */
            { catalog, schemaBodies }
          )
        })
      );
    });
    await Promise.all([graphSync, registrySync]);
    if (telemetry) {
      await this.#telemetry.subscribe();
    }
  }
};

// node_modules/@noflo/runtime-client/src/index.js
function recallRuntimeFromCache(reticulum, nodeName) {
  const cache = (
    /** @type {any} */
    reticulum.transport?.caches?.knownDestinations
  );
  if (!cache) {
    return null;
  }
  let firstMatch = null;
  for (
    const [hashHex, entry] of
    /** @type {any} */
    cache.entries()
  ) {
    if (!entry?.appData) {
      continue;
    }
    try {
      const decoded = decodeAnnounceAppData(new Uint8Array(entry.appData));
      if (decoded.protocolVersion !== PROTOCOL_VERSION) {
        continue;
      }
      if (nodeName && decoded.nodeName !== nodeName) {
        continue;
      }
      const destinationHash = fromHex2(hashHex);
      if (reticulum.transport.hasPath(destinationHash)) {
        return { destinationHash, nodeName: decoded.nodeName };
      }
      firstMatch ??= { destinationHash, nodeName: decoded.nodeName };
    } catch {
    }
  }
  return firstMatch;
}
async function discoverRuntime(options) {
  const {
    reticulum,
    timeoutMs = 3e4,
    nodeName = null,
    solicit = false
  } = options;
  await /** @type {any} */
  reticulum.persistorLoadPromise?.catch?.(() => {
  });
  const transport = reticulum.transport;
  const cached = recallRuntimeFromCache(reticulum, nodeName);
  if (!solicit && cached && transport.hasPath(cached.destinationHash)) {
    return cached;
  }
  return new Promise((resolve, reject) => {
    let timer;
    const listener = (event) => {
      if (!event.detail?.appData) {
        return;
      }
      try {
        const decoded = decodeAnnounceAppData(event.detail.appData);
        if (decoded.protocolVersion !== PROTOCOL_VERSION) {
          return;
        }
        if (nodeName && decoded.nodeName !== nodeName) {
          return;
        }
        cleanup();
        resolve({
          destinationHash: decoded.destinationHash,
          nodeName: decoded.nodeName
        });
      } catch {
      }
    };
    function cleanup() {
      clearTimeout(timer);
      reticulum.transport.removeEventListener("announce", listener);
    }
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("timed out waiting for a runtime announce"));
    }, timeoutMs);
    reticulum.transport.addEventListener("announce", listener);
    if (cached) {
      const solicited = solicit ? transport.requestPath(cached.destinationHash) : transport.requestPathAuto(cached.destinationHash);
      solicited?.catch(() => {
      });
    }
  });
}
async function connectRuntime(options) {
  const { reticulum, destinationHash, identity, timeoutMs = 15e3 } = options;
  const destination = await Destination.recalled(
    ANNOUNCE_ASPECT,
    destinationHash,
    reticulum
  );
  const link = await destination.createLink();
  const frames = [];
  const frameListener = (event) => {
    frames.push(event.detail.packet.payload);
  };
  link.addEventListener("data", frameListener);
  await link.identify(identity);
  const deadline = Date.now() + timeoutMs;
  while (frames.length === 0) {
    if (Date.now() > deadline) {
      link.removeEventListener("data", frameListener);
      throw new Error("timed out waiting for the 0x02 auth response");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const auth = decodeAuthResponse(frames[0]);
  if (auth.protocolVersion !== PROTOCOL_VERSION) {
    link.removeEventListener("data", frameListener);
    throw new Error(
      `protocol version mismatch: runtime ${auth.protocolVersion}, client ${PROTOCOL_VERSION}`
    );
  }
  const client = new RuntimeClient({ link, auth });
  return { link, auth, client };
}
var RuntimeClient = class extends EventTarget {
  /**
   * @param {Object} options
   * @param {import("@reticulum/core").Link} options.link - The established protocol link
   * @param {{ protocolVersion: number, capabilityMask: number }} options.auth - The decoded auth response
   * @param {string} [options.clientId] - This client's identity in the CRDT op stream; required before `sendGraphOp`
   */
  constructor({ link, auth, clientId }) {
    super();
    this.link = link;
    this.auth = auth;
    this.clientId = clientId ?? null;
    this.logicalClock = 0;
    this.graph = void 0;
    this.epoch = void 0;
    this.onGraphOp = () => {
    };
    this.pending = [];
    this.waiters = [];
    this.registry = new RegistryCache({
      requestReply: async (payload) => {
        const reply = this.nextFrame();
        await this.send(payload);
        return reply;
      }
    });
    this.schemas = new SchemaCache({
      requestReply: async (payload) => {
        const reply = this.nextFrame();
        await this.send(payload);
        return reply;
      }
    });
    this.execution = new ExecutionClient({
      send: (payload) => this.send(payload)
    });
    link.addEventListener("data", (event) => {
      const payload = event.detail.packet.payload;
      let decoded = null;
      try {
        decoded = /** @type {any} */
        decodeFrame(payload);
      } catch {
      }
      if (decoded) {
        switch (decoded.cmd) {
          case CMD_CRDT_UPDATE:
            this.dispatchEvent(
              new CustomEvent("op", {
                detail: { planeId: decoded.planeId, op: decoded }
              })
            );
            this.onGraphOp(decoded);
            break;
          case CMD_OP_REJECTED:
            this.dispatchEvent(
              new CustomEvent("oprejected", {
                detail: {
                  rejectedCmd: decoded.rejectedCmd,
                  planeId: decoded.planeId,
                  detail: decoded.detail
                }
              })
            );
            break;
          case CMD_PROCESS_LIST:
            this.dispatchEvent(
              new CustomEvent("processlist", {
                detail: { epochId: decoded.epochId, entries: decoded.entries }
              })
            );
            break;
          case CMD_FLOWTRACE_CHUNK:
            this.dispatchEvent(
              new CustomEvent("telemetry", { detail: decoded })
            );
            break;
          case CMD_RUN_CTRL:
          case CMD_BREAKPOINT_SET:
          case CMD_BREAKPOINT_CLEAR:
          case CMD_PROCESS_CTRL:
          case CMD_HWM_SET:
          case CMD_PACKET_SEND:
            this.dispatchEvent(
              new CustomEvent("execution", { detail: decoded })
            );
            break;
        }
      }
      this.dispatchEvent(new CustomEvent("frame", { detail: { payload } }));
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter(payload);
      } else {
        this.pending.push(payload);
        if (this.pending.length > 256) {
          this.pending.shift();
        }
      }
    });
  }
  /**
   * Send a raw protocol payload over the link.
   *
   * @param {Uint8Array} payload
   * @returns {Promise<void>}
   */
  async send(payload) {
    const packet = new /** @type {any} */
    Packet({
      packetType: PacketType.DATA,
      payload
    });
    await this.link.send(packet);
  }
  /**
   * Take the next inbound frame payload: a FIFO reply queue where each
   * frame is delivered to exactly one waiter, in arrival order. Frames
   * that arrived while no waiter was armed are served from the buffer.
   * The returned promise carries a `cancel()` — an abandoned waiter (the
   * sync loop re-arms per frame) must never reject into the void after
   * its consumer left.
   *
   * @param {number} [timeoutMs]
   * @returns {Promise<Uint8Array> & { cancel: () => void }}
   */
  nextFrame(timeoutMs = 15e3) {
    const existing = this.pending.shift();
    if (existing) {
      const resolved = (
        /** @type {any} */
        Promise.resolve(existing)
      );
      resolved.cancel = () => {
      };
      return resolved;
    }
    let waiter;
    let timer;
    const promise = (
      /** @type {any} */
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          const i = this.waiters.indexOf(waiter);
          if (i !== -1) {
            this.waiters.splice(i, 1);
          }
          reject(new Error("timed out waiting for a frame"));
        }, timeoutMs);
        waiter = (payload) => {
          clearTimeout(timer);
          resolve(payload);
        };
        this.waiters.push(waiter);
      })
    );
    promise.cancel = () => {
      clearTimeout(timer);
      const i = this.waiters.indexOf(waiter);
      if (i !== -1) {
        this.waiters.splice(i, 1);
      }
    };
    return promise;
  }
  /**
   * Registry Two-Step Cache, client side: request the manifest for a
   * registry hash and return the decoded entry list.
   *
   * @param {string} [registryHash] - The locally computed registry hash ("stale" forces a full manifest)
   * @returns {Promise<{ cmd: number, entries: Object<string, any> }>}
   */
  async syncRegistry(registryHash2 = "stale") {
    const reply = this.nextFrame();
    await this.send(encodeCompSyncReq2(registryHash2));
    return decodeCompManifest2(await reply);
  }
  /**
   * Run the Two-Step Cache sync: compute the local registry hash from
   * the known catalog, request the manifest, fetch details for new or
   * changed components, and return the full catalog with signatures.
   *
   * @returns {Promise<RegistryCatalog>}
   */
  syncComponents() {
    return this.registry.sync();
  }
  /**
   * Fetch the schema bodies the synced catalog references (work document
   * #37 phase 2): every port schema digest and component config-catalog
   * digest in the catalog's cached details is requested when not held
   * locally, with closure bundling; every arriving body is digest-verified
   * before it enters the store. A runtime without a schema table answers
   * all-nil and the store stays empty — the degradation ladder, not an
   * error.
   *
   * @param {RegistryCatalog} [catalog] Defaults to the last synced catalog.
   * @returns {Promise<Map<string, Record<string, any>>>} The verified bodies this round fetched.
   */
  async syncSchemaBodies(catalog = this.registry.catalog()) {
    const digests = /* @__PURE__ */ new Set();
    for (const entry of Object.values(catalog)) {
      const signature = (
        /** @type {any} */
        entry.signature
      );
      if (!signature) continue;
      for (const side of ["in", "out"]) {
        for (const port of signature[side] ?? []) {
          if (port.schema?.digest) digests.add(port.schema.digest);
        }
      }
      if (signature.metadata?.digest) digests.add(signature.metadata.digest);
    }
    const missing = this.schemas.missing([...digests]);
    if (missing.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    return this.schemas.fetch(missing, { bundle: true });
  }
  /**
   * List the runtime's graph planes (`0x16`).
   *
   * @returns {Promise<{ cmd: number, entries: any[] }>}
   */
  async planes() {
    const reply = this.nextFrame();
    await this.send(encodePlaneList());
    return decodePlaneListRes(await reply);
  }
  /**
   * Ask the runtime for its status (`0x48`): the main plane's epoch,
   * run state, uptime, and the full advertised capability mask.
   *
   * @returns {Promise<{ cmd: number, epochId: number|string, runState: number, uptimeMs: number, advertisedMask: number }>}
   */
  async status() {
    const reply = this.nextFrame();
    await this.send(encodeGetStatus());
    return decodeGetStatusRes(await reply);
  }
  /**
   * Read a component's source from the runtime (`0x26`): nil when the
   * runtime holds no source for the component.
   *
   * @param {string} componentName - Library-namespaced component name
   * @returns {Promise<{ cmd: number, componentName: string, source: string|null }>}
   */
  async getSource(componentName) {
    const reply = this.nextFrame();
    await this.send(encodeCompSourceReq(componentName));
    return decodeCompSourceRes(await reply);
  }
  /**
   * Write a component's full source to the runtime (`0x25`, atomic):
   * for sources over 500 bytes callers SHOULD pass a Reticulum Resource
   * hash instead of the raw string. The registry hash changes; the next
   * Two-Step sync picks up the new signature.
   *
   * @param {string} componentName - Library-namespaced component name
   * @param {string} source - Full source string or RNS resource hash
   * @returns {Promise<void>}
   */
  setSource(componentName, source) {
    return this.send(encodeCompWrite(componentName, source));
  }
  /**
   * The graph mirror sync (§5 of work document #28): run the epoch
   * handshake for the main plane. On `0x11 UP_TO_DATE` the existing
   * mirror stands; on `0x12 STALE_EPOCH` the canonical baseline is
   * fetched via `link.request` and imported into the mirror.
   *
   * @param {Object} [options]
   * @param {string} [options.planeId] - Plane id (nil = main graph)
   * @param {string} [options.epochId] - The client's current epoch ("0000" = no mirror)
   * @param {Object<string, number>} [options.clocks] - Per-client logical clocks
   * @param {number} [options.timeoutMs] - Baseline fetch timeout
   * @returns {Promise<{ upToDate: boolean, epochId: string, graph: GraphModel }>} The mirror after sync
   */
  async syncGraph(options = {}) {
    const currentEpoch = this.epoch;
    const {
      planeId = null,
      epochId = currentEpoch ?? "0000",
      clocks = {},
      timeoutMs = 3e4
    } = options;
    let deadline = Date.now() + timeoutMs;
    let reply = this.nextFrame(Math.max(1e3, deadline - Date.now()));
    await this.send(encodeCrdtSyncReq(planeId, epochId, clocks));
    for (; ; ) {
      const frame = await reply;
      deadline = Date.now() + timeoutMs;
      try {
        const upToDate = decodeCrdtUpToDate(frame);
        if (upToDate.cmd === 17 && upToDate.epochId === epochId) {
          this.epoch = epochId;
          return {
            upToDate: true,
            epochId: (
              /** @type {string} */
              epochId
            ),
            graph: (
              /** @type {GraphModel} */
              this.graph ?? new GraphModel()
            )
          };
        }
      } catch {
      }
      let stale;
      try {
        stale = decodeCrdtStaleEpoch(frame);
      } catch {
        reply = this.nextFrame(Math.max(1e3, deadline - Date.now()));
        continue;
      }
      if (stale.cmd !== 18) {
        reply = this.nextFrame(Math.max(1e3, deadline - Date.now()));
        continue;
      }
      this.epoch = stale.newEpochId;
      const baseline = await this.link.request(stale.rnsResourceHash);
      const canonical = JSON.parse(new TextDecoder().decode(baseline));
      this.graph = GraphModel.fromCanonical(canonical);
      return {
        upToDate: false,
        epochId: (
          /** @type {string} */
          stale.newEpochId
        ),
        graph: (
          /** @type {GraphModel} */
          this.graph
        )
      };
    }
  }
  /**
   * Emit a `0x14` graph op to the runtime. The client id and logical
   * clock default to the client's own (`clientId`, `logicalClock`
   * incremented per emission) so callers send semantic ops without
   * touching CRDT bookkeeping.
   *
   * @param {Object} op
   * @param {number|string} [op.planeId] - the plane id (per the codec d.ts, non-nil)
   * @param {string} [op.clientId] - Defaults to the client's own id
   * @param {number} [op.logicalClock] - Defaults to the next clock tick
   * @param {number} op.opType
   * @param {string} op.entityId
   * @param {any} op.payload
   * @returns {Promise<void>}
   */
  async sendGraphOp(op) {
    const clientId = op.clientId ?? this.clientId;
    if (!clientId) {
      throw new Error(
        "the client has no CRDT identity: set clientId before emitting graph ops"
      );
    }
    let logicalClock = op.logicalClock;
    if (logicalClock === void 0) {
      this.logicalClock += 1;
      logicalClock = this.logicalClock;
    }
    await this.send(
      encodeCrdtUpdate({
        ...op,
        planeId: op.planeId ?? null,
        clientId,
        logicalClock
      })
    );
  }
  /**
   * Tear down the link.
   *
   * @returns {Promise<void>}
   */
  async close() {
    await this.link.teardown();
  }
};
export {
  ANNOUNCE_ASPECT2 as ANNOUNCE_ASPECT,
  ExecutionClient,
  OP_TYPE,
  PROCESS_ACTION2 as PROCESS_ACTIONS,
  PROTOCOL_VERSION2 as PROTOCOL_VERSION,
  RUN_ACTION2 as RUN_ACTIONS,
  RUN_STATE,
  RegistryCache,
  RuntimeClient,
  SchemaCache,
  TelemetryClient,
  UiEventSurface,
  connectRuntime,
  decodeAnnounceAppData2 as decodeAnnounceAppData,
  decodeAuthResponse2 as decodeAuthResponse,
  decodeCompManifest3 as decodeCompManifest,
  decodeCrdtStaleEpoch2 as decodeCrdtStaleEpoch,
  decodeCrdtUpToDate2 as decodeCrdtUpToDate,
  decodeCrdtUpdate,
  decodeFlowtraceChunk2 as decodeFlowtraceChunk,
  decodeGetStatusRes2 as decodeGetStatusRes,
  decodeOpRejected,
  decodePlaneListRes2 as decodePlaneListRes,
  discoverRuntime,
  encodeCompManifest,
  encodeCompSourceRes,
  encodeCompSyncReq3 as encodeCompSyncReq,
  encodeCrdtStaleEpoch,
  encodeCrdtSyncReq2 as encodeCrdtSyncReq,
  encodeCrdtUpToDate,
  encodeCrdtUpdate2 as encodeCrdtUpdate,
  encodeGetStatus2 as encodeGetStatus,
  encodeGetStatusRes,
  encodePlaneList2 as encodePlaneList,
  encodePlaneListRes,
  encodePubsubSub2 as encodePubsubSub
};
