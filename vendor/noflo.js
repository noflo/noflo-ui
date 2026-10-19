var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@noflo/noflo/src/lib/NoFlo.js
import { exportFbpJson as exportFbpJson2, GraphModel as GraphModel4, importFbpJson as importFbpJson2 } from "./graph.js";

// node_modules/@noflo/noflo/src/lib/Network.js
import { exportFbpJson, sameRef } from "./graph.js";

// node_modules/@noflo/noflo/src/lib/ComponentLoader.js
import { GraphModel as GraphModel2 } from "./graph.js";

// node_modules/@noflo/noflo/src/components/Subgraph.js
import { GraphModel, importFbpJson } from "./graph.js";

// node_modules/@noflo/noflo/src/lib/EventBase.js
var makeDetailEvent = typeof globalThis.CustomEvent === "function" ? (type, detail) => new globalThis.CustomEvent(type, {
  detail,
  bubbles: false,
  composed: false
}) : (type, detail) => {
  const event = new Event(type, { bubbles: false, composed: false });
  event.detail = detail;
  return event;
};
var registries = /* @__PURE__ */ new WeakMap();
function registryFor(instance) {
  let registry = registries.get(instance);
  if (!registry) {
    registry = { active: /* @__PURE__ */ new Map() };
    registries.set(instance, registry);
  }
  return registry;
}
function EventTargetMixin(Base) {
  return class EventBase extends Base {
    /**
     * Track listener registrations, so `listeners()` can answer the
     * "is anyone listening" question EventTarget can't, and so
     * `dispatchLifecycleEvent` can invoke listeners synchronously.
     *
     * @param {string} type
     * @param {Function} listener
     * @param {any} [options]
     */
    addEventListener(type, listener, options) {
      const registry = registryFor(this);
      if (!registry.active.has(type)) registry.active.set(type, []);
      const listeners = (
        /** @type {{ listener: Function, once: boolean }[]} */
        registry.active.get(type)
      );
      if (listeners.some((entry) => entry.listener === listener)) {
        return;
      }
      const once = typeof options === "object" && options !== null && options.once;
      listeners.push({ listener, once });
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {Function} listener
     * @param {any} [options]
     */
    removeEventListener(type, listener, options) {
      const registry = registryFor(this);
      const listeners = registry.active.get(type);
      if (listeners) {
        const index = listeners.findIndex(
          (entry) => entry.listener === listener
        );
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
      super.removeEventListener(type, listener, options);
    }
    /**
     * Listeners registered for an event type. The count is the contractual
     * part (the engine's error escalation checks it); the array is provided
     * for introspection.
     *
     * @param {string} type
     * @returns {Function[]}
     */
    listeners(type) {
      const registry = registryFor(this);
      return (registry.active.get(type) || []).map((entry) => entry.listener);
    }
    /**
     * Remove registrations for one event type, or for all types when no
     * type is given. `EventTarget` cannot enumerate listeners, so the
     * registry provides the removal path.
     *
     * @param {string} [type]
     * @returns {this}
     */
    removeAllListeners(type) {
      const registry = registryFor(this);
      const types = type ? [type] : [...registry.active.keys()];
      for (const eventType of types) {
        for (const entry of [...registry.active.get(eventType) || []]) {
          this.removeEventListener(eventType, entry.listener);
        }
      }
      return this;
    }
    /**
     * Internal, clean-room dispatch used by engine code paths. Invokes the
     * registered listeners synchronously, in registration order, letting
     * listener exceptions propagate to the caller (matching the
     * synchronous propagation NoFlo's error escalation relies on).
     *
     * @param {string} type
     * @param {any} [detail]
     * @returns {boolean}
     */
    dispatchLifecycleEvent(type, detail) {
      const registry = registryFor(this);
      const listeners = registry.active.get(type) || [];
      if (!listeners.length) {
        return false;
      }
      const event = makeDetailEvent(type, detail);
      for (const entry of [...listeners]) {
        if (entry.once) {
          this.removeEventListener(type, entry.listener);
        }
        entry.listener(event);
      }
      return true;
    }
  };
}
var EventBase = EventTargetMixin(EventTarget);

// node_modules/@noflo/noflo/src/lib/logger.js
function getPattern() {
  if (typeof process !== "undefined" && process.versions) {
    if (!process.env) return null;
    return process.env.DEBUG || null;
  }
  const stored = globalThis.localStorage?.getItem("debug");
  return stored || null;
}
var cachedPattern;
var cachedMatchers = null;
function parsePatterns(patternString) {
  if (patternString === cachedPattern) {
    return (
      /** @type {PatternMatcher[]} */
      cachedMatchers
    );
  }
  const matchers = (patternString || "").split(",").map((pattern) => pattern.trim()).filter(Boolean).map((pattern) => {
    const negate = pattern.startsWith("-");
    const clean = negate ? pattern.slice(1) : pattern;
    const regexSource = clean.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return {
      regex: new RegExp(`^${regexSource}$`),
      negate
    };
  });
  cachedPattern = patternString;
  cachedMatchers = matchers;
  return matchers;
}
function isEnabled(namespace) {
  const pattern = getPattern();
  if (!pattern) {
    return false;
  }
  let enabled = false;
  for (const { regex, negate } of parsePatterns(pattern)) {
    if (regex.test(namespace)) {
      enabled = !negate;
    }
  }
  return enabled;
}
function namespaceHue(namespace) {
  const hash = namespace.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0);
  return Math.abs(hash) % 360;
}
function createDebug(namespace) {
  const log = (...args) => {
    if (!log.enabled) {
      return;
    }
    if (typeof window !== "undefined") {
      const color = `hsl(${namespaceHue(namespace)}, 80%, 40%)`;
      console.debug(
        `%c${namespace}`,
        `color: ${color}; font-weight: bold;`,
        ...args
      );
      return;
    }
    const colorCode = namespaceHue(namespace) % 6 + 31;
    console.error(`\x1B[${colorCode};1m${namespace}\x1B[0m`, ...args);
  };
  Object.defineProperty(log, "enabled", {
    get: () => isEnabled(namespace)
  });
  return log;
}

// node_modules/@noflo/noflo/src/lib/BasePort.js
var debugPort = createDebug("noflo:ports");
var validTypes = [
  "all",
  "string",
  "number",
  "int",
  "object",
  "array",
  "boolean",
  "color",
  "date",
  "bang",
  "function",
  "buffer",
  "stream"
];
function handleOptions(options) {
  const datatype = options.datatype || "all";
  const required = options.required || false;
  if (validTypes.indexOf(datatype) === -1) {
    throw new Error(
      `Invalid port datatype '${datatype}' specified, valid are ${validTypes.join(", ")}`
    );
  }
  const schema = options.schema || null;
  if (
    /** @type {Record<string, any>} */
    options.type !== void 0
  ) {
    debugPort(
      `port option 'type' is retired: use 'datatype' for the payload datatype or 'schema' for a schema artifact reference \u2014 the value is ignored`
    );
  }
  if (schema !== null && schema !== void 0) {
    const validSchema = typeof schema === "string" && /^[a-z][a-z0-9_-]*\/[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(schema) || typeof schema === "object" && !Array.isArray(schema);
    if (!validSchema) {
      throw new Error(
        `Invalid port schema '${typeof schema === "string" ? schema : "[complex]"}' specified. Use a ns/name schema artifact id or an inline JSON Schema object`
      );
    }
  }
  const scoped = typeof options.scoped === "boolean" ? options.scoped : true;
  const description = options.description || "";
  return Object.assign({}, options, {
    description,
    datatype,
    required,
    schema,
    scoped
  });
}
var BasePort = class extends EventBase {
  /**
   * @param {BaseOptions} options
   */
  constructor(options) {
    super();
    this.options = handleOptions(options);
    this.sockets = [];
    this.node = null;
    this.nodeInstance = null;
    this.name = null;
  }
  getId() {
    if (!this.node || !this.name) {
      return "Port";
    }
    return `${this.node} ${this.name}`;
  }
  /**
   * @returns {string}
   */
  getDataType() {
    return this.options.datatype || "all";
  }
  getSchema() {
    return this.options.schema || null;
  }
  getDescription() {
    return this.options.description;
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  attach(socket, index = null) {
    let idx = (
      /** @type {number} */
      index
    );
    if (!this.isAddressable() || index === null) {
      idx = this.sockets.length;
    }
    this.sockets[idx] = socket;
    this.attachSocket(socket, idx);
    if (this.isAddressable()) {
      this.dispatchLifecycleEvent("attach", [socket, idx]);
      return;
    }
    this.dispatchLifecycleEvent("attach", socket);
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  // biome-ignore lint/correctness/noUnusedFunctionParameters: Overridden in implementation class
  attachSocket(socket, index = null) {
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   */
  detach(socket) {
    const index = this.sockets.indexOf(socket);
    if (index === -1) {
      return;
    }
    this.sockets[index] = void 0;
    if (this.isAddressable()) {
      this.dispatchLifecycleEvent("detach", [socket, index]);
      return;
    }
    this.dispatchLifecycleEvent("detach", socket);
  }
  isAddressable() {
    if (this.options.addressable) {
      return true;
    }
    return false;
  }
  isRequired() {
    if (this.options.required) {
      return true;
    }
    return false;
  }
  /**
   * @param {number|null} socketId
   * @returns {boolean}
   */
  isAttached(socketId = null) {
    if (this.isAddressable() && socketId !== null) {
      if (this.sockets[socketId]) {
        return true;
      }
      return false;
    }
    if (this.sockets.length) {
      return true;
    }
    return false;
  }
  listAttached() {
    const attached = [];
    for (let idx = 0; idx < this.sockets.length; idx += 1) {
      const socket = this.sockets[idx];
      if (socket) {
        attached.push(idx);
      }
    }
    return attached;
  }
  /**
   * @param {number|null} socketId
   * @returns {boolean}
   */
  isConnected(socketId = null) {
    if (this.isAddressable()) {
      if (socketId === null) {
        throw new Error(`${this.getId()}: Socket ID required`);
      }
      if (!this.sockets[socketId]) {
        throw new Error(`${this.getId()}: Socket ${socketId} not available`);
      }
      const socket = (
        /** @type {import("./InternalSocket.js").InternalSocket} */
        this.sockets[socketId]
      );
      return socket.isConnected();
    }
    let connected = false;
    this.sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      if (socket.isConnected()) {
        connected = true;
      }
    });
    return connected;
  }
  /* eslint-disable class-methods-use-this */
  canAttach() {
    return true;
  }
};

// node_modules/@noflo/noflo/src/lib/InPort.js
var InPort = class extends BasePort {
  /**
   * Create an input port. Control and scoping behavior default to
   * non-control and scoped respectively; the buffer structures are
   * prepared for regular and addressable use.
   *
   * @param {PortOptions} [options]
   */
  constructor(options = {}) {
    const opts = options;
    if (opts.control == null) {
      opts.control = false;
    }
    if (opts.scoped == null) {
      opts.scoped = true;
    }
    super(opts);
    const baseOptions = this.options;
    this.options = /** @type {PortOptions} */
    baseOptions;
    this.nodeInstance = null;
    this.eot = true;
    this.prepareBuffer();
  }
  /**
   * Subscribe the port to a socket and forward its events into the port's
   * buffers and lifecycle events.
   *
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [localId]
   */
  attachSocket(socket, localId = null) {
    socket.addEventListener("connect", () => {
      this.#setEot(false);
      if (this.isAddressable()) {
        this.dispatchLifecycleEvent("connect", [socket, localId]);
        return;
      }
      this.dispatchLifecycleEvent("connect", socket);
    });
    socket.addEventListener("disconnect", () => {
      this.#refreshEot();
      if (this.isAddressable()) {
        this.dispatchLifecycleEvent("disconnect", [socket, localId]);
      } else {
        this.dispatchLifecycleEvent("disconnect", socket);
      }
    });
    socket.addEventListener(
      "ip",
      (event) => this.handleIP(event.detail, localId)
    );
    this.#refreshEot();
  }
  /**
   * Whether the input is at end of transmission: every attached socket has been
   * terminally closed by its sender, or none are attached (nothing can
   * arrive). A later `connect` or `attach` re-opens the input.
   *
   * @returns {boolean}
   */
  isEot() {
    return this.eot;
  }
  /**
   * @param {boolean} value
   * @returns {void}
   */
  #setEot(value) {
    this.eot = value;
  }
  /**
   * @returns {void}
   */
  #refreshEot() {
    let live = false;
    for (const socket of this.sockets) {
      if (!socket) {
        continue;
      }
      if (!socket.isTerminal()) {
        this.#setEot(false);
        return;
      }
      live = true;
    }
    this.#setEot(true);
  }
  /**
   * Remove a socket from the port. The remaining attached sockets
   * re-determine the port's EOT state.
   *
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @returns {void}
   */
  detach(socket) {
    super.detach(socket);
    this.#refreshEot();
  }
  /**
   * Receive an Information Packet from a socket: stamp it with ownership,
   * index, and port datatype/schema, buffer it, and emit the `ip` event.
   *
   * @param {import("./IP.js").default} packet
   * @param {number|null} [index]
   */
  handleIP(packet, index = null) {
    const ip = packet;
    ip.owner = this.nodeInstance;
    if (this.isAddressable()) {
      ip.index = index;
    }
    if (ip.datatype === "all") {
      ip.datatype = this.getDataType();
    }
    if (this.getSchema() && !ip.schema) {
      ip.schema = this.getSchema();
    }
    const buf = this.prepareBufferForIP(ip);
    if (this.options.control) {
      if (packet.type === "openBracket" && buf.length > 0) {
        buf.length = 0;
      }
      if (packet.type === "data" && !buf.some((buffered) => buffered.type === "openBracket")) {
        buf.length = 0;
      }
    }
    buf.push(ip);
    this.dispatchLifecycleEvent("ip", ip);
  }
  /**
   * Initialize the port's packet buffers: per-scope and per-index structures
   * for scoped and/or addressable ports, plus the separate IIP buffer.
   *
   * @returns {void}
   */
  prepareBuffer() {
    if (this.isAddressable()) {
      if (this.options.scoped) {
        this.indexedScopedBuffer = {};
      }
      this.indexedIipBuffer = {};
      this.indexedBuffer = {};
      return;
    }
    if (this.options.scoped) {
      this.scopedBuffer = {};
    }
    this.iipBuffer = [];
    this.buffer = [];
  }
  /**
   * Pick the buffer an incoming IP belongs to, creating missing scope or
   * index entries as needed: the scoped buffer for scoped IPs, the IIP
   * buffer for initial packets, and the regular buffer otherwise.
   *
   * @param {import("./IP.js").default} ip
   * @returns {Array<import("./IP.js").default>}
   */
  prepareBufferForIP(ip) {
    if (this.isAddressable()) {
      if (ip.scope != null && this.options.scoped) {
        if (!(ip.scope in this.indexedScopedBuffer)) {
          this.indexedScopedBuffer[ip.scope] = [];
        }
        if (!(ip.index in this.indexedScopedBuffer[ip.scope])) {
          this.indexedScopedBuffer[ip.scope][ip.index] = [];
        }
        return this.indexedScopedBuffer[ip.scope][ip.index];
      }
      if (ip.initial) {
        if (!(ip.index in this.indexedIipBuffer)) {
          this.indexedIipBuffer[ip.index] = [];
        }
        return this.indexedIipBuffer[ip.index];
      }
      if (!(ip.index in this.indexedBuffer)) {
        this.indexedBuffer[ip.index] = [];
      }
      return this.indexedBuffer[ip.index];
    }
    if (ip.scope != null && this.options.scoped) {
      if (!(ip.scope in this.scopedBuffer)) {
        this.scopedBuffer[ip.scope] = [];
      }
      return this.scopedBuffer[ip.scope];
    }
    if (ip.initial) {
      return this.iipBuffer;
    }
    return this.buffer;
  }
  /**
   * Get the packet buffer for a given scope and addressable-port index.
   * Returns `undefined` when the scope or index has no buffer yet.
   *
   * @param {string|null} scope
   * @param {number|null} index
   * @param {boolean} [initial]
   * @returns {Array<import("./IP.js").default>}
   */
  getBuffer(scope, index, initial = false) {
    if (this.isAddressable()) {
      if (scope != null && this.options.scoped) {
        if (!(scope in this.indexedScopedBuffer)) {
          return void 0;
        }
        if (!(index in this.indexedScopedBuffer[scope])) {
          return void 0;
        }
        return this.indexedScopedBuffer[scope][index];
      }
      if (initial) {
        if (!(index in this.indexedIipBuffer)) {
          return void 0;
        }
        return this.indexedIipBuffer[index];
      }
      if (!(index in this.indexedBuffer)) {
        return void 0;
      }
      return this.indexedBuffer[index];
    }
    if (scope != null && this.options.scoped) {
      if (!(scope in this.scopedBuffer)) {
        return void 0;
      }
      return this.scopedBuffer[scope];
    }
    if (initial) {
      return this.iipBuffer;
    }
    return this.buffer;
  }
  /**
   * Fetch the next packet from the buffer for a given scope and index.
   * Control ports read non-consumingly, returning the latest data IP of the
   * buffered stream instead of shifting it.
   *
   * @param {string|null} scope
   * @param {number|null} index
   * @param {boolean} [initial]
   * @returns {import("./IP.js").default|undefined}
   */
  getFromBuffer(scope, index, initial = false) {
    const buf = this.getBuffer(scope, index, initial);
    if (!(buf != null ? buf.length : void 0)) {
      return void 0;
    }
    if (this.options.control) {
      for (let i = buf.length - 1; i >= 0; i -= 1) {
        if (buf[i].type === "data") {
          return buf[i];
        }
      }
      return void 0;
    }
    return buf.shift();
  }
  /**
   * The stream-completeness check: the validator is bracket-aware, so on
   * control ports the buffered stream's framing — not just data presence
   * — decides completeness. A closeBracket completing a stream with data
   * inside is the completion moment (work document #47).
   *
   * @param {string|null} scope
   * @param {() => HasValidationCallback} makeValidate - Factory for the
   *   per-walk validator; each buffer walk gets fresh framing state
   * @returns {boolean}
   */
  hasStream(scope, makeValidate) {
    if (typeof makeValidate !== "function") {
      throw new TypeError(
        "InPort.hasStream takes a validator factory: hasStream(scope, () => validator)"
      );
    }
    if (this.hasIPinBuffer(scope, null, makeValidate())) {
      return true;
    }
    return this.hasIIP(null, makeValidate());
  }
  /**
   * Fetches a packet from the port
   * @param {string|null} scope
   * @param {number|null} [index]
   */
  get(scope, index = null) {
    const res = this.getFromBuffer(scope, index);
    if (res !== void 0) {
      if (!this.options.control) {
        res.move(this.nodeInstance);
      }
      return res;
    }
    const iip = this.getFromBuffer(null, index, true);
    if (iip !== void 0 && !this.options.control) {
      iip.move(this.nodeInstance);
    }
    return iip;
  }
  /**
   * Fetches a packet from the port
   * @param {string|null} scope
   * @param {number|null} index
   * @param {HasValidationCallback} validate
   * @param {boolean} [initial]
   */
  hasIPinBuffer(scope, index, validate, initial = false) {
    const buf = this.getBuffer(scope, index, initial);
    if (!(buf != null ? buf.length : void 0)) {
      return false;
    }
    for (let i = 0; i < buf.length; i += 1) {
      if (validate(buf[i])) {
        return true;
      }
    }
    return false;
  }
  /**
   * Check whether the port holds an initial information packet for the given
   * addressable-port index, optionally validated.
   *
   * @param {number|null} index
   * @param {HasValidationCallback} validate
   */
  hasIIP(index, validate) {
    return this.hasIPinBuffer(null, index, validate, true);
  }
  /**
   * Returns true if port contains packet(s) matching the validator
   * @param {string|null} scope
   * @param {number|null|HasValidationCallback} index
   * @param {() => HasValidationCallback} makeValidate - Factory for the
   *   per-walk validator; the regular-buffer and IIP-buffer walks each
   *   get fresh framing state
   */
  has(scope, index, makeValidate) {
    if (typeof makeValidate !== "function") {
      throw new TypeError(
        "InPort.has takes a validator factory: has(scope, index|null, () => validator)"
      );
    }
    const idx = (
      /** @type {number|null} */
      index
    );
    const walk = () => {
      let valid = makeValidate();
      if (this.options.control) {
        const original = valid;
        valid = (ip) => {
          const verdict = original(ip);
          return verdict && ip.type === "data";
        };
      }
      return valid;
    };
    if (this.hasIPinBuffer(scope, idx, walk())) {
      return true;
    }
    if (this.hasIIP(idx, walk())) {
      return true;
    }
    return false;
  }
  /**
   * Clear all inport buffers, resetting the port to an empty state.
   *
   * @returns {void}
   */
  clear() {
    return this.prepareBuffer();
  }
  /**
   * Counts the IPs currently buffered on this port, across the regular,
   * IIP, scoped, and indexed buffer shapes. Used by the component's
   * shutdown path to report unconsumed data.
   *
   * @returns {number}
   */
  /**
   * Counts the IPs currently buffered on this port, across the regular,
   * IIP, scoped, and indexed buffer shapes. Used by the component's
   * shutdown path to report unconsumed data.
   *
   * Control ports always buffer their latest stream non-consumingly by
   * design, so they are excluded: a configured control port holding its
   * value at shutdown is correct usage, not a footgun.
   *
   * @returns {number}
   */
  countBuffered() {
    if (this.options.control) {
      return 0;
    }
    let count = 0;
    if (this.isAddressable()) {
      if (this.options.scoped) {
        Object.keys(this.indexedScopedBuffer ?? {}).forEach((scope) => {
          Object.keys(this.indexedScopedBuffer[scope] ?? {}).forEach(
            (index) => {
              count += (this.indexedScopedBuffer[scope][index] ?? []).length;
            }
          );
        });
      }
      Object.keys(this.indexedIipBuffer ?? {}).forEach((index) => {
        count += (this.indexedIipBuffer[index] ?? []).length;
      });
      Object.keys(this.indexedBuffer ?? {}).forEach((index) => {
        count += (this.indexedBuffer[index] ?? []).length;
      });
      return count;
    }
    if (this.options.scoped) {
      Object.keys(this.scopedBuffer ?? {}).forEach((scope) => {
        count += (this.scopedBuffer[scope] ?? []).length;
      });
    }
    count += (this.iipBuffer ?? []).length;
    count += (this.buffer ?? []).length;
    return count;
  }
  /**
   * Bracket framing residue in this port's buffers: bracket IPs that can
   * never pair with arriving data once the port's senders have terminally
   * disconnected. One entry per (scope, index) buffer holding brackets.
   * Control ports are scanned like regular ones — a standing data value
   * is legitimate, but bracket framing around it is the stranded class
   * (work document #40 update #13).
   *
   * @returns {Array<{scope: string|null, index: number|null, open: number, close: number}>}
   */
  strandedFraming() {
    const residue = [];
    const scan = (buf, scope, index) => {
      let open = 0;
      let close = 0;
      for (const ip of buf ?? []) {
        if (ip.type === "openBracket") {
          open += 1;
        } else if (ip.type === "closeBracket") {
          close += 1;
        }
      }
      if (open > 0 || close > 0) {
        residue.push({ scope, index, open, close });
      }
    };
    if (this.isAddressable()) {
      if (this.options.scoped) {
        Object.keys(this.indexedScopedBuffer ?? {}).forEach((scope) => {
          Object.keys(this.indexedScopedBuffer[scope] ?? {}).forEach(
            (index) => {
              scan(
                this.indexedScopedBuffer[scope][index],
                scope,
                Number(index)
              );
            }
          );
        });
      }
      Object.keys(this.indexedBuffer ?? {}).forEach((index) => {
        scan(this.indexedBuffer[index], null, Number(index));
      });
      return residue;
    }
    if (this.options.scoped) {
      Object.keys(this.scopedBuffer ?? {}).forEach((scope) => {
        scan(this.scopedBuffer[scope], scope, null);
      });
    }
    scan(this.buffer, null, null);
    return residue;
  }
};

// node_modules/@noflo/noflo/src/lib/IP.js
var IP = class _IP {
  /**
   * Detect whether an arbitrary value is an IP object.
   *
   * @param {any} obj
   * @returns {boolean}
   */
  static isIP(obj) {
    return obj && typeof obj === "object" && obj.isIP === true;
  }
  /**
   * Create a new IP object. Valid types are `data`, `openBracket`, and
   * `closeBracket`; options are applied onto the instance as properties.
   *
   * @param {string} type
   * @param {any} data
   * @param {IPOptions} [options]
   */
  constructor(type, data = null, options = {}) {
    this.type = type || "data";
    this.data = data;
    this.isIP = true;
    this.scope = null;
    this.owner = null;
    this.clonable = true;
    this.index = null;
    this.schema = null;
    this.datatype = "all";
    this.initial = false;
    if (typeof options === "object") {
      Object.keys(options).forEach((key) => {
        this[key] = options[key];
      });
    }
  }
  /**
   * Create a fresh IP envelope carrying the same payload by reference.
   * This is the always-safe clone used for fan-out: the new envelope has
   * its own identity (and no owner), while `data` and the other metadata
   * are shared with the original. The `clonable` declaration carries
   * over, so a further fan-out of the envelope behaves like the original.
   *
   * @returns {IP}
   */
  envelope() {
    const ip = new _IP(this.type);
    Object.keys(this).forEach((key) => {
      if (key === "owner") {
        return;
      }
      ip[key] = this[key];
    });
    return ip;
  }
  /**
   * Create a new IP copying its contents by value, not reference. The owner
   * is not copied.
   *
   * The payload is deep-copied with `structuredClone`, which round-trips
   * typed arrays, `Map`s, `Set`s, `Date`s, and cyclic references that the
   * 1.x JSON-based copy silently corrupted. Payloads the structured clone
   * algorithm cannot copy (functions, symbols) throw; send such payloads
   * with `clonable: false` and let fan-out share the reference, or deliver
   * them to a single edge.
   *
   * @returns {IP}
   */
  clone() {
    const ip = new _IP(this.type);
    Object.keys(this).forEach((key) => {
      const val = this[key];
      if (key === "owner") {
        return;
      }
      if (val === null) {
        return;
      }
      if (typeof val === "object") {
        try {
          ip[key] = structuredClone(val);
        } catch (error) {
          throw new Error(
            `IP property '${key}' is not clonable: ${/** @type {Error} */
            error.message}`
          );
        }
      } else {
        ip[key] = val;
      }
    });
    return ip;
  }
  /**
   * Move the IP to a different owning component.
   *
   * @param {import("./Component.js").Component|null} owner
   */
  move(owner) {
    this.owner = owner;
    return this;
  }
  /**
   * Free the IP contents. The packet object becomes empty and unusable.
   *
   * @returns {void}
   */
  drop() {
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
};

// node_modules/@noflo/noflo/src/lib/OutPort.js
var OutPort = class extends BasePort {
  /**
   * Create an output port. Ports are scoped by default.
   *
   * @param {PortOptions} options - Options for the outport
   */
  constructor(options = {}) {
    const opts = options;
    if (opts.scoped == null) {
      opts.scoped = true;
    }
    super(opts);
    const baseOptions = this.options;
    this.options = /** @type {PortOptions} */
    baseOptions;
    this.lastWrite = Promise.resolve();
  }
  /**
   * Attach a socket to the port.
   *
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  attach(socket, index = null) {
    super.attach(socket, index);
  }
  /**
   * Connect the port's socket(s), checking required ports first. On
   * addressable ports only the given slot is affected; on regular ports all
   * attached sockets are.
   *
   * @param {number|null} [index]
   */
  connect(index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.connect();
    });
  }
  /**
   * Send a data packet to the port's socket(s).
   *
   * @param {any} data
   * @param {number|null} [index]
   */
  send(data, index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.send(data);
    });
  }
  /**
   * Disconnect the port's socket(s).
   *
   * @param {number|null} [index]
   */
  disconnect(index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.disconnect();
    });
  }
  /**
   * Terminally disconnect every attached socket, without the required-port
   * check: closing down a component must not fail on an unconnected
   * outport. Each disconnect drains first, so downstream sees
   * EOT after the in-flight packets (work document #45).
   *
   * @returns {void}
   */
  disconnectAll() {
    this.sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.disconnect();
    });
  }
  /**
   * Send an Information Packet to the port's socket(s), stamping it with the
   * port's datatype and schema, and returning `this`. The admission Promise
   * for the send is available on {@link OutPort#lastWrite}; it resolves once
   * every receiving edge has admitted the packet per its high-water mark.
   *
   * @param {string|IP} type
   * @param {any} [data]
   * @param {import("./IP.js").IPOptions} [options]
   * @param {number|null} [index]
   */
  sendIP(type, data, options, index = null) {
    let ip;
    let idx = index;
    if (IP.isIP(type)) {
      ip = /** @type {IP} */
      type;
      idx = ip.index;
    } else if (typeof type === "string") {
      ip = new IP(type, data, options);
    } else {
      throw new Error("Unknown type for IP type");
    }
    const sockets = this.getSockets(idx);
    this.checkRequired(sockets);
    if (ip.datatype === "all") {
      ip.datatype = this.getDataType();
    }
    if (this.getSchema() && !ip.schema) {
      ip.schema = this.getSchema();
    }
    const targets = sockets.filter((socket) => socket);
    const fanout = targets.length > 1;
    if (fanout && !ip.clonable && !this.isFanoutRefs()) {
      throw new Error(
        `${this.getId()}: fan-out to ${targets.length} connections of an IP marked clonable: false \u2014 enable the fanoutRefs option on this outport to share the payload reference, or route the packet through a splitter component`
      );
    }
    ip.owner = null;
    const writes = [];
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      let outgoing = ip;
      if (fanout) {
        outgoing = this.isFanoutRefs() ? ip.envelope() : ip.clone();
      }
      writes.push(socket.post(outgoing));
    });
    const admission = Promise.all(writes).then(() => void 0);
    admission.catch(() => {
    });
    this.lastWrite = admission;
    return this;
  }
  /**
   * Send an open-bracket IP to the port.
   *
   * @param {string|null} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  openBracket(data = null, options = {}, index = null) {
    return this.sendIP("openBracket", data, options, index);
  }
  /**
   * Send a data IP to the port.
   *
   * @param {any} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  data(data, options = {}, index = null) {
    return this.sendIP("data", data, options, index);
  }
  /**
   * Send a close-bracket IP to the port.
   *
   * @param {string|null} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  closeBracket(data = null, options = {}, index = null) {
    return this.sendIP("closeBracket", data, options, index);
  }
  /**
   * Throw when the port is required but none of its sockets are connected.
   *
   * @param {Array<import("./InternalSocket.js").InternalSocket|void>} sockets
   * @returns {void}
   */
  checkRequired(sockets) {
    if (sockets.length === 0 && this.isRequired()) {
      throw new Error(`${this.getId()}: No connections available`);
    }
  }
  /**
   * Get the socket(s) a send should target: the single slot for addressable
   * ports (index required), or all attached sockets for regular ports.
   *
   * @param {number|null} index
   * @returns {Array<import("./InternalSocket.js").InternalSocket|void>}
   */
  getSockets(index) {
    if (this.isAddressable()) {
      if (index === null) {
        throw new Error(`${this.getId()} Socket ID required`);
      }
      const idx = (
        /** @type {number} */
        index
      );
      if (!this.sockets[idx]) {
        return [];
      }
      return [this.sockets[idx]];
    }
    if (index !== null) {
      throw new Error(
        `${this.getId()} is not addressable, but the packet carries index ${index} \u2014 clear ip.index before sending to a non-addressable port`
      );
    }
    return this.sockets;
  }
  /**
   * Check whether this port opts into reference-sharing fan-out for IPs
   * marked `clonable: false`.
   *
   * @returns {boolean}
   */
  isFanoutRefs() {
    if (this.options.fanoutRefs) {
      return true;
    }
    return false;
  }
};

// node_modules/@noflo/noflo/src/lib/Platform.js
function makeAsync(func, sameLoop = false) {
  if (typeof process !== "undefined" && typeof process.nextTick === "function") {
    if (sameLoop && typeof setImmediate === "function") {
      setImmediate(() => {
        func();
      });
      return;
    }
    process.nextTick(func);
    return;
  }
  setTimeout(func, 0);
}

// node_modules/@noflo/noflo/src/lib/Ports.js
var Ports = class extends EventBase {
  /**
   * Create a ports collection. Port definitions are given as a map of port
   * name to port instance or port options; entries are added in order.
   *
   * @param {Object<string, import("./BasePort.js").default|PortOptions>} ports
   * @param {typeof import("./BasePort.js").default} model
   */
  constructor(ports, model) {
    super();
    this.model = model;
    this.ports = {};
    if (!ports) {
      return;
    }
    Object.keys(ports).forEach((name) => {
      const options = ports[name];
      this.add(name, options);
    });
  }
  /**
   * Add a port to the collection, replacing any previous port with the same
   * name. The port is also exposed as a property of the collection under its
   * name. Port names are case-significant and may contain alphanumeric
   * characters, underscores, dots, or slashes; `add` and `remove` are
   * reserved (work document #15: the 2.x naming policy preserves author
   * casing — `out` and `OUT` are distinct ports).
   *
   * @param {string} name
   * @param {Object|import("./BasePort.js").default|PortOptions} [options]
   */
  add(name, options = {}) {
    if (name === "add" || name === "remove") {
      throw new Error("Add and remove are restricted port names");
    }
    if (!name.match(/^[a-zA-Z0-9_./]+$/)) {
      throw new Error(
        `Port names can only contain alphanumeric characters, underscores, dots, or slashes. '${name}' not allowed`
      );
    }
    if (this.ports[name]) {
      this.remove(name);
    }
    const maybePort = (
      /** @type {import("./BasePort.js").default} */
      options
    );
    if (typeof maybePort === "object" && maybePort.canAttach) {
      this.ports[name] = maybePort;
    } else {
      const Model = this.model;
      this.ports[name] = new Model(options);
    }
    this[name] = this.ports[name];
    this.dispatchLifecycleEvent("add", name);
    return this;
  }
  /**
   * Remove a port from the collection.
   *
   * @param {string} name
   */
  remove(name) {
    if (!this.ports[name]) {
      throw new Error(`Port ${name} not defined`);
    }
    delete this.ports[name];
    delete this[name];
    this.dispatchLifecycleEvent("remove", name);
    return this;
  }
};
var InPorts = class extends Ports {
  /**
   * Create an input-ports collection holding {@link InPort} instances.
   *
   * @param {InPortsOptions} [ports]
   */
  constructor(ports = {}) {
    super(ports, InPort);
    const basePorts = this.ports;
    this.ports = /** @type {Object<string, InPort>} */
    basePorts;
  }
};
var OutPorts = class extends Ports {
  /**
   * Create an output-ports collection holding {@link OutPort} instances.
   *
   * @param {OutPortsOptions} [ports]
   */
  constructor(ports = {}) {
    super(ports, OutPort);
    const basePorts = this.ports;
    this.ports = /** @type {Object<string, OutPort>} */
    basePorts;
  }
  /**
   * Connect an output port, either to a specific attached socket or to all
   * of them. See {@link OutPort#connect}.
   *
   * @param {string} name
   * @param {number|null} [socketId]
   */
  connect(name, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.connect(socketId);
  }
  /**
   * Send a data packet to an output port. See {@link OutPort#send}.
   *
   * @param {string} name
   * @param {any} data
   * @param {number|null} [socketId]
   */
  send(name, data, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.send(data, socketId);
  }
  /**
   * Disconnect an output port. See {@link OutPort#disconnect}.
   *
   * @param {string} name
   * @param {number|null} [socketId]
   */
  disconnect(name, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.disconnect(socketId);
  }
};
function normalizePortName(name) {
  const port = { name };
  if (name.indexOf("[") === -1) {
    return port;
  }
  const matched = name.match(/(.*)\[([0-9]+)\]/);
  if (!matched || matched.length < 3) {
    return port;
  }
  return {
    name: matched[1],
    index: matched[2]
  };
}

// node_modules/@noflo/noflo/src/lib/ProcessContext.js
var ProcessContext = class {
  /**
   * @param {import("./IP.js").default} ip - IP for this processing context
   * @param {import("./Component.js").Component} nodeInstance - Component being run
   * @param {import("./InPort.js").default} port - InPort that triggered this context
   * @param {Object<string, any>} result
   */
  constructor(ip, nodeInstance, port, result) {
    this.ip = ip;
    this.nodeInstance = nodeInstance;
    this.port = port;
    this.result = result;
    this.scope = this.ip.scope;
    this.activated = false;
    this.deactivated = false;
    this.consumed = 0;
    this.sentOutput = false;
  }
  activate() {
    if (this.result.__resolved || this.nodeInstance.outputQ.indexOf(this.result) === -1) {
      this.result = {};
    }
    this.nodeInstance.activate(this);
  }
  deactivate() {
    if (!this.result.__resolved) {
      this.result.__resolved = true;
    }
    this.nodeInstance.deactivate(this);
  }
};

// node_modules/@noflo/noflo/src/lib/ProcessInput.js
var debugComponent = createDebug("noflo:component");
var debugStream = createDebug("noflo:component:stream");
var ProcessInput = class {
  /**
   * @param {import("./Ports.js").InPorts} ports - Component inports
   * @param {import("./ProcessContext.js").default} context - Processing context
   */
  constructor(ports, context) {
    this.ports = ports;
    this.context = context;
    this.nodeInstance = this.context.nodeInstance;
    this.ip = this.context.ip;
    this.port = this.context.port;
    this.result = this.context.result;
    this.scope = this.context.scope;
  }
  /**
   * Error message for accessing a port the component does not have: names
   * the component, the requested port, and the ports that exist (#1041).
   *
   * @param {string} portname
   * @returns {string}
   */
  #missingPortMessage(portname) {
    const available = Object.keys(this.ports.ports);
    const listing = available.length ? `available ports: '${available.join("', '")}'` : "no ports are defined";
    return `Node ${this.nodeInstance.nodeId} has no port '${portname}' \u2014 ${listing}`;
  }
  /**
   * Fetch a port implementation for buffered access, throwing a descriptive
   * error when the port does not exist (the misspelled-port crash of
   * #1041) or when the access form does not match the port kind.
   *
   * @param {string} portname
   * @param {boolean} addressable - Whether the access form expects an addressable port
   * @returns {import("./InPort.js").default}
   */
  #validatedPort(portname, addressable) {
    const portImpl = this.ports.ports[portname];
    if (!portImpl) {
      throw new Error(this.#missingPortMessage(portname));
    }
    if (addressable && !portImpl.isAddressable()) {
      throw new Error(
        "Non-addressable ports, access must be with string portname"
      );
    }
    if (!addressable && portImpl.isAddressable()) {
      throw new Error(
        `For addressable ports, access must be with array [${portname}, idx]`
      );
    }
    return portImpl;
  }
  // When preconditions are met, set component state to `activated`
  activate() {
    if (this.context.activated) {
      return;
    }
    if (this.nodeInstance.isOrdered()) {
      this.result.__resolved = false;
    }
    this.nodeInstance.activate(this.context);
    if (this.port.isAddressable()) {
      debugComponent(
        `${this.nodeInstance.nodeId} packet on '${this.port.name}[${this.ip.index}]' caused activation ${this.nodeInstance.load}: ${this.ip.type}`
      );
    } else {
      debugComponent(
        `${this.nodeInstance.nodeId} packet on '${this.port.name}' caused activation ${this.nodeInstance.load}: ${this.ip.type}`
      );
    }
  }
  // ## Connection listing
  // This allows components to check which input ports are attached. This is
  // useful mainly for addressable ports
  /**
   * @param {...string} params - Port names to check for attachment
   * @returns {Array<number> | Array<Array<number>>}
   */
  attached(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const res = [];
    args.forEach((port) => {
      if (!this.ports.ports[port]) {
        throw new Error(
          `Node ${this.nodeInstance.nodeId} has no port '${port}'`
        );
      }
      res.push(this.ports.ports[port].listAttached());
    });
    if (args.length === 1) {
      return res[0];
    }
    return res;
  }
  // ## Input preconditions
  // When the processing function is called, it can check if input buffers
  // contain the packets needed for the process to fire.
  // This precondition handling is done via the `has` and `hasStream` methods.
  // Returns true if a port (or ports joined by logical AND) has a new IP
  // Passing a validation callback as a last argument allows more selective
  // checking of packets.
  /**
   * @typedef {string|Array<string|number>} GetArgument
   * @typedef {import("./InPort.js").HasValidationCallback} HasValidationCallback
   */
  /**
   * @typedef {GetArgument|HasValidationCallback} HasArgument
   */
  /**
   * @param {...(string | HasArgument | Array<string|number>)} params
   */
  has(...params) {
    let validate;
    let args = params.filter((p) => typeof p !== "function");
    if (!args.length) {
      args = ["in"];
    }
    if (typeof params[params.length - 1] === "function") {
      validate = /** @type {HasValidationCallback} */
      params[params.length - 1];
    } else {
      validate = () => true;
    }
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      if (Array.isArray(port)) {
        const portImpl = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[port[0]]
        );
        if (!portImpl) {
          throw new Error(
            this.#missingPortMessage(
              /** @type {string} */
              port[0]
            )
          );
        }
        if (!portImpl.isAddressable()) {
          throw new Error(
            `Non-addressable ports, access must be with string ${port[0]}`
          );
        }
        const portIdx = typeof port[1] === "string" ? parseInt(port[1], 10) : port[1];
        if (!portImpl.has(this.scope, portIdx, () => validate)) {
          return false;
        }
      } else if (typeof port === "string") {
        const portImpl = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[port]
        );
        if (!portImpl) {
          throw new Error(this.#missingPortMessage(port));
        }
        if (portImpl.isAddressable()) {
          throw new Error(
            `For addressable ports, access must be with array [${port}, idx]`
          );
        }
        if (!portImpl.has(this.scope, null, () => validate)) {
          return false;
        }
      } else {
        throw new Error(`Unknown port type ${typeof port}`);
      }
    }
    return true;
  }
  // Returns true if the ports contain data packets
  /**
   * @param {...(string | Array<string|number>)} params - Port names to
   *   check for data packets; addressable access passes `(port, index)`
   *   pairs as arrays
   * @returns {boolean}
   */
  hasData(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const hasArgs = [
      ...args,
      /**
       * @param {import("./IP.js").default} ip
       */
      (ip) => ip.type === "data"
    ];
    return this.has(...hasArgs);
  }
  // Returns true if a port has a complete stream in its input buffer.
  /**
   * @param {...(string | HasArgument | Array<string|number>)} params - Port
   *   names to check for streams; addressable access passes `(port, index)`
   *   pairs as arrays
   * @returns {boolean}
   */
  hasStream(...params) {
    let args = params;
    let validateStream;
    if (!args.length) {
      args = ["in"];
    }
    if (typeof args[args.length - 1] === "function") {
      validateStream = /** @type {Function} */
      args.pop();
    } else {
      validateStream = () => true;
    }
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      const makeValidate = () => {
        const portBrackets = [];
        let hasData = false;
        return (ip) => {
          if (ip.type === "openBracket") {
            portBrackets.push(ip.data);
            return false;
          }
          if (ip.type === "data") {
            hasData = validateStream(ip, portBrackets);
            if (!portBrackets.length) {
              return hasData;
            }
            return false;
          }
          if (ip.type === "closeBracket") {
            portBrackets.pop();
            if (portBrackets.length) {
              return false;
            }
            if (!hasData) {
              return false;
            }
            return true;
          }
          return false;
        };
      };
      if (typeof port === "string") {
        const portImpl2 = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[port]
        );
        if (!portImpl2) {
          throw new Error(this.#missingPortMessage(port));
        }
        if (portImpl2.options.control && !portImpl2.isAddressable()) {
          if (!portImpl2.hasStream(this.scope, makeValidate)) {
            return false;
          }
          continue;
        }
        if (portImpl2.options.control && portImpl2.isAddressable()) {
          debugStream(
            `${this.nodeInstance?.nodeId ?? ""} stream-completeness gating on addressable control port '${port}' is not supported: the data-presence check cannot see the stream's framing`
          );
        }
        if (!portImpl2.has(this.scope, null, makeValidate)) {
          return false;
        }
        continue;
      }
      const portRef = (
        /** @type {Array<string|number>} */
        port
      );
      const portImpl = (
        /** @type {import("./InPort.js").default} */
        this.ports.ports[portRef[0]]
      );
      if (!portImpl) {
        throw new Error(
          this.#missingPortMessage(
            /** @type {string} */
            portRef[0]
          )
        );
      }
      const portIdx = typeof portRef[1] === "string" ? parseInt(portRef[1], 10) : portRef[1];
      if (!portImpl.has(this.scope, portIdx, makeValidate)) {
        return false;
      }
    }
    return true;
  }
  // ## Input processing
  //
  // Once preconditions have been met, the processing function can read from
  // the input buffers. Reading packets sets the component as "activated".
  //
  // Fetches IP object(s) for port(s)
  /**
   * @param {...GetArgument} params
   * @returns {void|IP|Array<IP|void>}
   */
  get(...params) {
    this.activate();
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const res = [];
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      let idx;
      let ip;
      let portname;
      let portImpl;
      if (Array.isArray(port)) {
        [portname, idx] = Array.from(port);
        portImpl = this.#validatedPort(
          /** @type {string} */
          portname,
          true
        );
      } else {
        portname = port;
        portImpl = this.#validatedPort(
          /** @type {string} */
          portname,
          false
        );
      }
      const name = (
        /** @type {string} */
        portname
      );
      const idxName = (
        /** @type {number} */
        idx
      );
      if (this.nodeInstance.isForwardingInport(name)) {
        ip = this.__getForForwarding(name, idxName);
        res.push(ip);
      } else {
        ip = portImpl.get(this.scope, idxName);
        res.push(ip);
        if (ip && !portImpl.options.control) {
          this.context.consumed += 1;
        }
      }
    }
    if (args.length === 1) {
      return res[0];
    }
    return res;
  }
  /**
   * @private
   * @param {string} port
   * @param {number} [idx]
   * @returns {IP|void}
   */
  __getForForwarding(port, idx) {
    const prefix = [];
    let dataIp;
    let ok = true;
    while (ok) {
      const portImpl = (
        /** @type {import("./InPort.js").default} */
        this.ports.ports[port]
      );
      const ip = portImpl.get(this.scope, idx);
      if (!ip) {
        break;
      }
      this.context.consumed += 1;
      if (ip.type === "data") {
        dataIp = ip;
        ok = false;
        break;
      }
      prefix.push(ip);
    }
    for (let i = 0; i < prefix.length; i += 1) {
      const ip = prefix[i];
      if (ip.type === "closeBracket") {
        if (!this.result.__bracketClosingBefore) {
          this.result.__bracketClosingBefore = [];
        }
        const context = this.nodeInstance.getBracketContext("in", port, this.scope, idx).pop();
        context.closeIp = ip;
        this.result.__bracketClosingBefore.push(context);
      } else if (ip.type === "openBracket") {
        this.nodeInstance.getBracketContext("in", port, this.scope, idx).push({
          ip,
          ports: [],
          source: port
        });
      }
    }
    if (!this.result.__bracketContext) {
      this.result.__bracketContext = {};
    }
    this.result.__bracketContext[port] = this.nodeInstance.getBracketContext("in", port, this.scope, idx).slice(0);
    return dataIp;
  }
  // Fetches `data` property of IP object(s) for given port(s)
  /**
   * @param {...GetArgument} params
   * @returns {any|Array<any>}
   */
  getData(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const datas = [];
    args.forEach((port) => {
      let packet = (
        /** @type {IP} */
        this.get(port)
      );
      if (packet == null) {
        datas.push(packet);
        return;
      }
      while (packet.type !== "data") {
        packet = /** @type {IP} */
        this.get(port);
        if (!packet) {
          break;
        }
      }
      datas.push(packet.data);
    });
    if (args.length === 1) {
      return datas.pop();
    }
    return datas;
  }
  // Fetches a complete data stream from the buffer.
  /**
   * @param {...GetArgument} params
   * @returns {void|Array<IP>|Array<void|Array<IP>>}
   */
  getStream(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const datas = [];
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      const portname = (
        /** @type {string} */
        Array.isArray(port) ? port[0] : port
      );
      const idx = Array.isArray(port) ? (
        /** @type {number|undefined} */
        port[1]
      ) : void 0;
      if (this.nodeInstance.isForwardingInport(portname)) {
        datas.push(this.__getStreamForForwarding(portname, idx));
        continue;
      }
      const portBrackets = [];
      const portImpl = (
        /** @type {import("./InPort.js").default} */
        this.ports.ports[portname]
      );
      if (portImpl?.options?.control) {
        const buffered = portImpl.getBuffer(this.scope, idx);
        const scanned = [];
        for (const ip2 of buffered) {
          if (ip2.type === "openBracket") {
            portBrackets.push(ip2.data);
          }
          if (ip2.type === "closeBracket") {
            portBrackets.pop();
          }
          if (ip2.type === "data") {
            scanned.push(ip2);
          }
        }
        datas.push(scanned);
        continue;
      }
      let portPackets = [];
      let hasData = false;
      let ip = (
        /** @type {IP} */
        this.get(port)
      );
      if (!ip) {
        datas.push(void 0);
      }
      while (ip) {
        if (ip.type === "openBracket") {
          if (!portBrackets.length) {
            portPackets = [];
            hasData = false;
          }
          portBrackets.push(ip.data);
          portPackets.push(ip);
        }
        if (ip.type === "data") {
          portPackets.push(ip);
          hasData = true;
          if (!portBrackets.length) {
            break;
          }
        }
        if (ip.type === "closeBracket") {
          portPackets.push(ip);
          portBrackets.pop();
          if (hasData && !portBrackets.length) {
            break;
          }
        }
        ip = /** @type {IP} */
        this.get(port);
      }
      datas.push(portPackets);
    }
    if (args.length === 1) {
      return datas[0];
    }
    return datas;
  }
  /**
   * Collect the complete stream buffered for a forwarding inport,
   * consuming it including its brackets (issue #545). Bracket openings
   * and closings are mirrored into the bracket forwarding context so
   * that output forwarding keeps working.
   *
   * @private
   * @param {string} port
   * @param {number|null} [idx]
   * @returns {Array<IP>}
   */
  __getStreamForForwarding(port, idx) {
    const portImpl = (
      /** @type {import("./InPort.js").default} */
      this.ports.ports[port]
    );
    const stream = [];
    const portBrackets = [];
    let hasData = false;
    for (; ; ) {
      const buffer = portImpl.getBuffer(this.scope, idx);
      if (!buffer.length) {
        break;
      }
      const ip = (
        /** @type {IP} */
        portImpl.get(this.scope, idx)
      );
      stream.push(ip);
      this.context.consumed += 1;
      if (ip.type === "openBracket") {
        portBrackets.push(ip.data);
        this.nodeInstance.getBracketContext("in", port, this.scope, idx).push({ ip, ports: [], source: port });
        continue;
      }
      if (ip.type === "data") {
        hasData = true;
        if (!portBrackets.length) {
          break;
        }
        continue;
      }
      if (ip.type === "closeBracket") {
        portBrackets.pop();
        const context = this.nodeInstance.getBracketContext("in", port, this.scope, idx).pop();
        if (context) {
          context.closeIp = ip;
        }
        if (hasData && !portBrackets.length) {
          break;
        }
      }
    }
    if (!this.result.__bracketContext) {
      this.result.__bracketContext = {};
    }
    this.result.__bracketContext[port] = this.nodeInstance.getBracketContext("in", port, this.scope, idx).slice(0);
    return stream;
  }
};

// node_modules/@noflo/noflo/src/lib/ProcessOutput.js
var debugComponent2 = createDebug("noflo:component");
function isError(err) {
  return err instanceof Error || Array.isArray(err) && err.length > 0 && err[0] instanceof Error;
}
var ProcessOutput = class {
  /**
   * @param {import("./Ports.js").OutPorts} ports - Component outports
   * @param {import("./ProcessContext.js").default} context - Processing context
   */
  constructor(ports, context) {
    this.ports = ports;
    this.context = context;
    this.nodeInstance = this.context.nodeInstance;
    this.result = this.context.result;
    this.scope = this.context.scope;
  }
  // Sends an error object
  /**
   * @param {Error|Error[]} err
   * @returns {void}
   */
  error(err) {
    const errs = Array.isArray(err) ? err : [err];
    if (this.ports.ports.error && (this.ports.ports.error.isAttached() || !this.ports.ports.error.isRequired())) {
      if (errs.length > 1) {
        this.sendIP("error", new IP("openBracket"));
      }
      errs.forEach((e) => {
        this.sendIP("error", e);
      });
      if (errs.length > 1) {
        this.sendIP("error", new IP("closeBracket"));
      }
    } else {
      errs.forEach((e) => {
        throw e;
      });
    }
  }
  // Sends a single IP object to a port
  /**
   * @param {string} port - Port to send to
   * @param {IP|any} packet - IP or data to send
   * @returns {Promise<void>|void} Resolves when the packet has been
   *   admitted by the receiving edge per its high-water mark. Fire-and-
   *   forget compatible: callers may ignore the Promise.
   */
  sendIP(port, packet) {
    this.context.sentOutput = true;
    const ip = IP.isIP(packet) ? packet : new IP("data", packet);
    if (this.scope !== null && ip.scope === null) {
      ip.scope = this.scope;
    }
    if (!this.nodeInstance.outPorts.ports[port]) {
      throw new Error(
        `Node ${this.nodeInstance.nodeId} does not have outport ${port}`
      );
    }
    const portImpl = (
      /** @type {import("./OutPort.js").default} */
      this.nodeInstance.outPorts.ports[port]
    );
    if (portImpl.isAddressable() && ip.index === null) {
      throw new Error(
        `Sending packets to addressable port ${this.nodeInstance.nodeId} ${port} requires specifying index`
      );
    }
    if (this.nodeInstance.isOrdered()) {
      this.nodeInstance.addToResult(this.result, port, ip);
      return;
    }
    if (!portImpl.options.scoped) {
      ip.scope = null;
    }
    portImpl.sendIP(ip);
    return portImpl.lastWrite;
  }
  // Sends packets for each port as a key in the map
  // or sends Error or a list of Errors if passed such
  /**
   * @param {Error|Array<Error>|Object<string, any>} outputMap
   * @returns {Promise<void>|void} Resolves when all sent packets have
   *   been admitted by their edges per the high-water marks. Callers may
   *   await it for backpressure; fire-and-forget use stays safe (send
   *   errors escalate through the socket error path).
   */
  send(outputMap) {
    if (!isError(outputMap) && this.context.deactivated) {
      const componentName = this.nodeInstance?.nodeId ?? "unknown";
      const contractError = new Error(
        `${componentName}: send outside the activation contract \u2014 the process resolved without sending; return the promise so the activation holds until the send completes`
      );
      const errorPort = this.nodeInstance.outPorts.ports.error;
      if (errorPort?.isAttached()) {
        for (const socket of errorPort.sockets) {
          if (!socket) {
            continue;
          }
          socket.post(new IP("error", contractError));
        }
      } else {
        throw contractError;
      }
    }
    if (isError(outputMap)) {
      const errors = (
        /** @type {Error|Array<Error>} */
        outputMap
      );
      this.error(errors);
      return;
    }
    const componentPorts = [];
    let mapIsInPorts = false;
    Object.keys(this.ports.ports).forEach((port) => {
      if (port !== "error" && port !== "ports") {
        componentPorts.push(port);
      }
      if (!mapIsInPorts && outputMap != null && typeof outputMap === "object" && Object.keys(outputMap).indexOf(port) !== -1) {
        mapIsInPorts = true;
      }
    });
    if (componentPorts.length === 1 && !mapIsInPorts) {
      return this.sendIP(componentPorts[0], outputMap);
    }
    if (componentPorts.length > 1 && !mapIsInPorts) {
      throw new Error("Port must be specified for sending output");
    }
    if (outputMap == null) {
      throw new Error(
        `${this.nodeInstance.nodeId}: send() requires a value or an output map \u2014 call done() to finish without sending`
      );
    }
    const writes = [];
    Object.keys(outputMap).forEach((port) => {
      const packet = outputMap[port];
      writes.push(this.sendIP(port, packet));
    });
    const admission = Promise.all(writes).then(() => void 0);
    admission.catch(() => {
    });
    return admission;
  }
  // Sends the argument via `send()` and marks activation as `done()`.
  // Every argument is sent — a null becomes a null-payload data IP; a
  // component that wants to finish without sending calls `done()`.
  /**
   * @param {Error|Array<Error>|Object<string, any>|any} outputMap
   * @returns {Promise<void>|void} Resolves when sent packets have been
   *   admitted and the activation has been marked done
   */
  sendDone(outputMap) {
    const sent = this.send(outputMap);
    this.done();
    return sent;
  }
  // Makes a map-style component pass a result value to `out`
  // keeping all IP metadata received from `in`,
  // or modifying it if `options` is provided
  /**
   * @param {Error|Array<Error>} [error]
   */
  done(error) {
    this.result.__resolved = true;
    this.nodeInstance.activate(this.context);
    if (error) {
      this.error(error);
    }
    const isLast = () => {
      const resultsOnly = this.nodeInstance.outputQ.filter((q) => {
        if (!q.__resolved) {
          return true;
        }
        if (Object.keys(q).length === 2 && q.__bracketClosingAfter) {
          return false;
        }
        return true;
      });
      const pos = resultsOnly.indexOf(this.result);
      const len = resultsOnly.length;
      const { load } = this.nodeInstance;
      if (pos === len - 1) {
        return true;
      }
      if (pos === -1 && load === len + 1) {
        return true;
      }
      if (len <= 1 && load === 1) {
        return true;
      }
      return false;
    };
    if (this.nodeInstance.isOrdered() && isLast()) {
      Object.keys(this.nodeInstance.bracketContext.in).forEach((port) => {
        const contexts = this.nodeInstance.bracketContext.in[port];
        if (!contexts[this.scope]) {
          return;
        }
        const nodeContext = contexts[this.scope];
        if (!nodeContext.length) {
          return;
        }
        const context = nodeContext[nodeContext.length - 1];
        const inPorts = (
          /** @type {import("./InPort.js").default} */
          this.nodeInstance.inPorts.ports[context.source]
        );
        const buf = inPorts.getBuffer(context.ip.scope, context.ip.index);
        while (buf.length > 0 && buf[0].type === "closeBracket") {
          const ip = inPorts.get(context.ip.scope, context.ip.index);
          const ctx = nodeContext.pop();
          ctx.closeIp = ip;
          if (!this.result.__bracketClosingAfter) {
            this.result.__bracketClosingAfter = [];
          }
          this.result.__bracketClosingAfter.push(ctx);
        }
      });
    }
    debugComponent2(
      `${this.nodeInstance.nodeId} finished processing ${this.nodeInstance.load}`
    );
    this.nodeInstance.deactivate(this.context);
  }
};

// node_modules/@noflo/noflo/src/lib/Component.js
var debugComponent3 = createDebug("noflo:component");
var debugBrackets = createDebug("noflo:component:brackets");
var debugSend = createDebug("noflo:component:send");
var Component = class extends EventBase {
  /** Identity of the built-in forwarding default, when in effect; null once the component declares its own rules
   * @type {Object<string, string[]> | null}
   */
  #defaultForwarding = null;
  /**
   * Create a component. Ports, icon, description, ordering behavior, and the
   * process function can all be provided via options, or set up imperatively
   * afterwards (ports via `component.inPorts.add`, the process function via
   * {@link Component#process}).
   *
   * @param {ComponentOptions} [options]
   */
  constructor(options = {}) {
    super();
    const opts = options;
    const knownOptionKeys = [
      "inPorts",
      "outPorts",
      "icon",
      "description",
      "process",
      "ordered",
      "autoOrdering",
      "forwardBrackets"
    ];
    Object.keys(opts).forEach((key) => {
      if (knownOptionKeys.includes(key)) {
        return;
      }
      const caseMatch = knownOptionKeys.find(
        (known) => known.toLowerCase() === key.toLowerCase()
      );
      if (caseMatch) {
        debugComponent3(
          `${this.nodeId ?? "component"} received unknown option '${key}' \u2014 did you mean '${caseMatch}'? Unknown options are silently ignored`
        );
      }
    });
    if (!opts.inPorts) {
      opts.inPorts = {};
    }
    this.inPorts = opts.inPorts instanceof InPorts ? opts.inPorts : new InPorts(opts.inPorts);
    if (!opts.outPorts) {
      opts.outPorts = {};
    }
    this.outPorts = opts.outPorts instanceof OutPorts ? opts.outPorts : new OutPorts(opts.outPorts);
    this.icon = opts.icon ? opts.icon : "";
    this.description = opts.description ? opts.description : "";
    this.componentName = null;
    this.baseDir = null;
    this.started = false;
    this.load = 0;
    this.closedDown = false;
    this.ordered = opts.ordered != null ? opts.ordered : false;
    this.autoOrdering = opts.autoOrdering != null ? opts.autoOrdering : null;
    this.outputQ = [];
    this.bracketContext = {
      in: {},
      out: {}
    };
    if (!opts.forwardBrackets) {
      opts.forwardBrackets = { in: ["out", "error"] };
      this.#defaultForwarding = opts.forwardBrackets;
    } else {
      this.#defaultForwarding = null;
    }
    this.forwardBrackets = opts.forwardBrackets;
    this.handle = typeof opts.process === "function" ? opts.process : null;
    if (typeof opts.process === "function") {
      this.process(opts.process);
    }
    this.nodeId = null;
  }
  /**
   * Get the component description.
   *
   * @returns {string}
   */
  getDescription() {
    return this.description;
  }
  /**
   * Check whether the component is ready to be started. Always true for
   * elementary components; subclasses may override with actual readiness
   * checks.
   *
   * @returns {boolean}
   */
  isReady() {
    return true;
  }
  /**
   * Check whether the component is a subgraph. Always false for elementary
   * components; the subgraph component class overrides this.
   *
   * @returns {boolean}
   */
  isSubgraph() {
    return false;
  }
  /**
   * Check whether the component is a signature-only stub placeholder:
   * a declared interface with no implementation behind it (work document
   * #19). Always false for regular components; the stub component class
   * overrides this. UIs, runtimes, and flowtraces label "not yet
   * implemented" from this authoritative runtime information instead of
   * inferring from registry lookups that can drift.
   *
   * @returns {boolean}
   */
  isStub() {
    return false;
  }
  /**
   * Set the component icon and inform the network about the change.
   *
   * @param {string} icon - Updated icon for the component
   */
  setIcon(icon) {
    this.icon = icon;
    this.dispatchLifecycleEvent("icon", this.icon);
  }
  /**
   * Get the component icon name.
   *
   * @returns {string}
   */
  getIcon() {
    return this.icon;
  }
  /**
   * Report an error from the component. If the component has an `error`
   * outport that is connected, the error is sent there as an IP object. If
   * the port is not connected and not optional, the error is thrown.
   *
   * @param {Error} e
   */
  error(e) {
    const outPort = (
      /** @type {OutPort} */
      this.outPorts.ports.error
    );
    if (outPort && (outPort.isAttached() || !outPort.isRequired())) {
      outPort.data(e, {});
      return;
    }
    throw e;
  }
  /**
   * Component-specific initialization, called at network start-up. Override
   * in a component implementation to do component-specific setup work.
   * Return a Promise to delay start-up until it resolves; throw to fail the
   * network start.
   *
   * @returns {Promise<void>}
   */
  setUp() {
    return Promise.resolve();
  }
  /**
   * Component-specific cleanup, called at network shutdown. Override in a
   * component implementation to do component-specific cleanup work, like
   * clearing any accumulated state.
   *
   * @returns {Promise<void>}
   */
  tearDown() {
    return Promise.resolve();
  }
  /**
   * Start the component: calls {@link Component#setUp} and marks the
   * component started. Called by the network on start-up.
   *
   * @returns {Promise<void>}
   */
  start() {
    if (this.isStarted()) {
      return Promise.resolve();
    }
    return Promise.resolve().then(() => this.setUp()).then(() => {
      this.started = true;
      this.closedDown = false;
      this.dispatchLifecycleEvent("start");
    });
  }
  /**
   * Shut the component down: calls {@link Component#tearDown}, waits for all
   * active processing contexts to finish, clears the inport buffers and
   * bracket contexts, and marks the component stopped. Called by the network
   * on shutdown.
   *
   * @returns {Promise<void>}
   */
  shutdown() {
    return Promise.resolve().then(() => this.tearDown()).then(
      () => new Promise((resolve) => {
        if (this.load > 0) {
          const checkLoad = (event) => {
            if (event.detail > 0) {
              return;
            }
            this.removeEventListener("deactivate", checkLoad);
            resolve();
          };
          this.addEventListener("deactivate", checkLoad);
          return;
        }
        resolve();
      })
    ).then(() => {
      const inPortsForReport = this.inPorts.ports || this.inPorts;
      Object.keys(inPortsForReport).forEach((portName) => {
        const reportedPort = (
          /** @type {InPort} */
          inPortsForReport[portName]
        );
        if (typeof reportedPort.countBuffered !== "function") {
          return;
        }
        const buffered = reportedPort.countBuffered();
        if (buffered > 0) {
          debugComponent3(
            `${this.nodeId} port '${portName}' holds ${buffered} unconsumed IPs at shutdown. Either data arrived that no activation consumed, or an activation consumed data it should not have before waiting for more \u2014 in that case the pending activation never re-invokes (check the has/get order)`
          );
        }
      });
      Object.keys(this.bracketContext.out).forEach((portName) => {
        Object.keys(this.bracketContext.out[portName]).forEach((scope) => {
          const opens = this.bracketContext.out[portName][scope];
          if (opens.length > 0) {
            debugBrackets(
              `${this.nodeId} bracket context on '${portName}' discarded at shutdown with ${opens.length} unattached open brackets \u2014 forwarded brackets attach to actual sends`
            );
          }
        });
      });
      const inPorts = this.inPorts.ports || this.inPorts;
      Object.keys(inPorts).forEach((portName) => {
        const inPort = (
          /** @type {InPort} */
          inPorts[portName]
        );
        if (typeof inPort.clear !== "function") {
          return;
        }
        inPort.clear();
      });
      this.bracketContext = {
        in: {},
        out: {}
      };
      if (!this.isStarted()) {
        return Promise.resolve();
      }
      this.started = false;
      this.dispatchLifecycleEvent("end");
      return Promise.resolve();
    });
  }
  /**
   * Check whether the component is currently started.
   *
   * @returns {boolean}
   */
  isStarted() {
    return this.started;
  }
  /**
   * Ensure the bracket forwarding map only references ports that actually
   * exist on the component.
   *
   * @returns {void}
   */
  prepareForwarding() {
    const defaulted = this.#defaultForwarding != null && this.forwardBrackets === this.#defaultForwarding;
    Object.keys(this.forwardBrackets).forEach((inPort) => {
      const outPorts = this.forwardBrackets[inPort];
      if (!(inPort in this.inPorts.ports)) {
        if (!defaulted) {
          throw new Error(
            `forwardBrackets references inport '${inPort}' which the component does not have \u2014 declared forwarding rules must name existing ports`
          );
        }
        delete this.forwardBrackets[inPort];
        return;
      }
      const tmp = [];
      outPorts.forEach((outPort) => {
        if (outPort in this.outPorts.ports) {
          tmp.push(outPort);
          return;
        }
        if (!defaulted) {
          throw new Error(
            `forwardBrackets rule for inport '${inPort}' references outport '${outPort}' which the component does not have \u2014 declared forwarding rules must name existing ports`
          );
        }
      });
      if (tmp.length === 0) {
        if (defaulted) {
          delete this.forwardBrackets[inPort];
        } else {
          this.forwardBrackets[inPort] = [];
        }
      } else {
        this.forwardBrackets[inPort] = tmp;
      }
    });
  }
  /**
   * Set the Process API handler function for the component.
   *
   * @param {ProcessingFunction} handle - Processing function
   * @returns {this}
   */
  process(handle) {
    if (typeof handle !== "function") {
      throw new Error("Process handler must be a function");
    }
    if (!this.inPorts) {
      throw new Error(
        "Component ports must be defined before process function"
      );
    }
    this.prepareForwarding();
    this.handle = handle;
    Object.keys(this.inPorts.ports).forEach((name) => {
      const port = (
        /** @type {InPort} */
        this.inPorts.ports[name]
      );
      if (!port.name) {
        port.name = name;
      }
      port.addEventListener("ip", (event) => this.handleIP(event.detail, port));
      port.addEventListener("disconnect", () => this.#handleInputStateChange());
      port.addEventListener("connect", () => this.#handleInputStateChange());
    });
    Object.keys(this.outPorts.ports).forEach((name) => {
      const port = (
        /** @type {import("./OutPort.js").default} */
        this.outPorts.ports[name]
      );
      if (!port.name) {
        port.name = name;
      }
      port.addEventListener("attach", () => {
        if (this.closedDown) {
          port.disconnectAll();
        }
      });
    });
    return this;
  }
  /**
   * Check whether a given inport is set up for automatic bracket forwarding.
   *
   * @param {InPort|string} port
   * @returns {boolean}
   */
  isForwardingInport(port) {
    let portName;
    if (typeof port === "string") {
      portName = port;
    } else {
      portName = port.name;
    }
    if (portName && portName in this.forwardBrackets) {
      return true;
    }
    return false;
  }
  /**
   * Check whether a given inport/outport pair is set up for automatic
   * bracket forwarding.
   *
   * @param {InPort|string} inport
   * @param {OutPort|string} outport
   * @returns {boolean}
   */
  isForwardingOutport(inport, outport) {
    let inportName;
    let outportName;
    if (typeof inport === "string") {
      inportName = inport;
    } else {
      inportName = inport.name;
    }
    if (typeof outport === "string") {
      outportName = outport;
    } else {
      outportName = outport.name;
    }
    if (!inportName || !outportName) {
      return false;
    }
    if (!this.forwardBrackets[inportName]) {
      return false;
    }
    if (this.forwardBrackets[inportName].indexOf(outportName) !== -1) {
      return true;
    }
    return false;
  }
  /**
   * Check whether the component sends packets in the same order they were
   * received.
   *
   * @returns {boolean}
   */
  isOrdered() {
    if (this.ordered) {
      return true;
    }
    if (this.autoOrdering) {
      return true;
    }
    return false;
  }
  /**
   * Handle an Information Packet that arrived on an inport: check the firing
   * pattern preconditions and invoke the process function as needed.
   *
   * @param {IP} ip
   * @param {InPort} port
   * @returns {void}
   */
  handleIP(ip, port) {
    if (this.isForwardingInport(port)) {
      this.fireProcess(ip, port);
      return;
    }
    if (port.options.control && port.options.scoped && ip.scope == null) {
      debugComponent3(
        `${this.nodeId} unscoped control IP on scoped control port '${port.name}': the control value cannot be read; declare the port scoped: false`
      );
    }
    const ready = this.#readyScopes();
    if (!ready.length) {
      return;
    }
    ready.forEach((readyScope) => {
      const contextIp = readyScope.scope === null ? ip : new IP(ip.type, ip.data, { scope: readyScope.scope });
      this.fireProcess(contextIp, readyScope.port);
    });
  }
  /**
   * Scan the inport buffers for scopes holding deliverable input: the
   * unscoped default buffers, each scoped buffer, each addressable index,
   * and the IIP buffers. Control buffers are standing state, not pending
   * work, and are never scanned. Each entry carries the scope's head IP
   * as captured during the scan, so the drain pump's offer never
   * re-fetches across buffer shapes. Shared by the arrival walk
   * (handleIP) and the drain pump (the post-completion re-offer, work
   * document #47).
   *
   * @returns {Array<{scope: string|null, port: import("./InPort.js").default, head: import("./IP.js").default}>}
   */
  #readyScopes() {
    const ready = [];
    Object.keys(this.inPorts.ports).forEach((name) => {
      const port = this.inPorts.ports[name];
      if (port.options.control) {
        return;
      }
      const mark = (scope, head) => {
        if (ready.some((entry) => entry.scope === scope)) {
          return;
        }
        ready.push({ scope, port, head });
      };
      if (port.isAddressable()) {
        Object.keys(port.indexedBuffer ?? {}).forEach((index) => {
          const buf = port.indexedBuffer[index] ?? [];
          if (buf.length > 0) {
            mark(null, buf[0]);
          }
        });
        Object.keys(port.indexedIipBuffer ?? {}).forEach((index) => {
          const buf = port.indexedIipBuffer[index] ?? [];
          if (buf.length > 0) {
            mark(null, buf[0]);
          }
        });
        Object.keys(port.indexedScopedBuffer ?? {}).forEach((scope) => {
          Object.keys(port.indexedScopedBuffer[scope] ?? {}).forEach(
            (index) => {
              const buf = port.indexedScopedBuffer[scope][index] ?? [];
              if (buf.length > 0) {
                mark(scope, buf[0]);
              }
            }
          );
        });
        return;
      }
      const regular = port.getBuffer(null, null) ?? [];
      if (regular.length > 0) {
        mark(null, regular[0]);
      }
      if ((port.iipBuffer ?? []).length > 0) {
        mark(null, port.iipBuffer[0]);
      }
      Object.keys(port.scopedBuffer ?? {}).forEach((scope) => {
        const buf = port.scopedBuffer[scope] ?? [];
        if (buf.length > 0) {
          mark(scope, buf[0]);
        }
      });
    });
    return ready;
  }
  /**
   * The drain pump: after a consuming activation completes, re-offer the
   * process for every scope still holding deliverable input. Scheduled,
   * so a multi-pair drain does not recurse; each scheduled offer either
   * consumes (progress) or declines (the buffers unchanged, no further
   * offer) — the pump terminates with the buffers (work document #47).
   *
   * The closedown interaction (work document #48): the closedown
   * predicate runs synchronously inside `deactivate`, and the pump offer
   * scheduled by that same deactivation fires later — the closedown
   * would set `closedDown` first and the pump's guard would cancel the
   * one offer that could drain buffers which became deliverable before
   * end of transmission (the silent-drop race the noflo-jekyll testbed
   * reproduced). The pending flag makes the closedown evaluation defer
   * until the offer has settled, and the offer re-evaluates closedown
   * after its pass: an offer that consumed leaves open activations whose
   * deactivations re-evaluate; an offer that declined declares the
   * residue stranded with the loud diagnostics the #45 contract
   * promises.
   *
   * @returns {void}
   */
  #offerResumption() {
    makeAsync(() => {
      this.#pendingOffer = false;
      if (this.closedDown || this.load > 0) {
        this.#evaluateClosedown();
        return;
      }
      const ready = this.#readyScopes();
      for (const readyScope of ready) {
        const contextIp = readyScope.scope === null ? readyScope.head : new IP(readyScope.head.type, readyScope.head.data, {
          scope: readyScope.scope
        });
        this.fireProcess(contextIp, readyScope.port);
      }
      this.#evaluateClosedown();
    });
  }
  /**
   * Run the processing function for an Information Packet in a prepared
   * context. Precondition checks (forwarding brackets, firing gates)
   * are the caller's responsibility.
   *
   * @param {IP} ip
   * @param {InPort} port
   */
  fireProcess(ip, port) {
    if (ip.type === "openBracket" && this.autoOrdering === null && !this.ordered) {
      debugComponent3(
        `${this.nodeId} port '${port.name}' entered auto-ordering mode`
      );
      this.autoOrdering = true;
    }
    let result = {};
    if (this.isForwardingInport(port)) {
      const forwardingTargets = this.forwardBrackets[port.name] ?? [];
      if (forwardingTargets.length === 0 && (ip.type === "openBracket" || ip.type === "closeBracket")) {
        const terminating = port.getBuffer(ip.scope, ip.index);
        if (terminating) {
          const at = terminating.indexOf(ip);
          if (at !== -1) {
            terminating.splice(at, 1);
          }
        }
        return;
      }
      if (ip.type === "openBracket") {
        return;
      }
      if (ip.type === "closeBracket") {
        const buf = port.getBuffer(ip.scope, ip.index);
        const dataPackets = buf.filter((p) => p.type === "data");
        if (this.outputQ.length >= this.load && dataPackets.length === 0) {
          if (buf[0] !== ip) {
            return;
          }
          if (!port.name) {
            return;
          }
          port.get(ip.scope, ip.index);
          const bracketCtx = this.getBracketContext(
            "in",
            port.name,
            ip.scope,
            ip.index
          ).pop();
          bracketCtx.closeIp = ip;
          debugBrackets(
            `${this.nodeId} closeBracket-C from '${bracketCtx.source}' to ${bracketCtx.ports}: '${ip.data}'`
          );
          result = {
            __resolved: true,
            __bracketClosingAfter: [bracketCtx]
          };
          this.outputQ.push(result);
          this.processOutputQueue();
        }
        if (!dataPackets.length) {
          return;
        }
      }
    }
    const context = new ProcessContext(ip, this, port, result);
    const input = new ProcessInput(this.inPorts, context);
    const output = new ProcessOutput(this.outPorts, context);
    try {
      if (!this.handle) {
        throw new Error("Processing function not defined");
      }
      const res = this.handle(input, output, context);
      if (res && res.then) {
        res.then(
          (data) => {
            if (data === void 0) {
              output.done();
              return;
            }
            output.sendDone(data);
          },
          (err) => output.done(err)
        );
      }
    } catch (e) {
      this.deactivate(context);
      output.sendDone(e);
    }
    if (context.activated) {
      if (!context.consumed && !context.sentOutput) {
        debugComponent3(
          `${this.nodeId} process function returned without completing the activation it opened (nothing consumed, nothing sent) \u2014 the activation will remain open until done() is called`
        );
      }
      return;
    }
    if (port.isAddressable()) {
      debugComponent3(
        `${this.nodeId} packet on '${port.name}[${ip.index}]' didn't match preconditions: ${ip.type}`
      );
      return;
    }
    debugComponent3(
      `${this.nodeId} packet on '${port.name}' didn't match preconditions: ${ip.type}`
    );
  }
  // Get the current bracket forwarding context for an IP object
  /**
   * Get (or initialize) the bracket forwarding contexts for a port in a
   * given direction and scope.
   *
   * @param {string} type
   * @param {string} port
   * @param {string|null} scope
   * @param {number|null} [idx]
   */
  getBracketContext(type, port, scope, idx = null) {
    let { name, index } = normalizePortName(port);
    if (idx != null) {
      index = `${idx}`;
    }
    const portsList = type === "in" ? this.inPorts : this.outPorts;
    if (portsList.ports[name].isAddressable()) {
      name = `${name}[${index}]`;
    } else {
      name = port;
    }
    if (!this.bracketContext[type][name]) {
      this.bracketContext[type][name] = {};
    }
    if (!this.bracketContext[type][name][scope]) {
      this.bracketContext[type][name][scope] = [];
    }
    return this.bracketContext[type][name][scope];
  }
  /**
   * Add an IP object to the list of results to be sent in order.
   *
   * @param {ProcessResult} result
   * @param {Object} port
   * @param {IP} packet
   * @param {boolean} [before]
   */
  addToResult(result, port, packet, before = false) {
    const res = result;
    const ip = packet;
    const { name, index } = normalizePortName(port);
    const method = before ? "unshift" : "push";
    if (this.outPorts.ports[name].isAddressable()) {
      const idx = (
        /** @type {number} */
        index ? parseInt(index, 10) : ip.index
      );
      if (!res[name]) {
        res[name] = {};
      }
      if (!res[name][idx]) {
        res[name][idx] = [];
      }
      ip.index = idx;
      res[name][idx][method](ip);
      return;
    }
    if (!res[name]) {
      res[name] = [];
    }
    res[name][method](ip);
  }
  /**
   * Get bracket contexts that can be forwarded with this inport/outport
   * pair.
   *
   * @private
   * @param inport
   * @param outport
   * @param contexts
   */
  getForwardableContexts(inport, outport, contexts) {
    const { name, index } = normalizePortName(outport);
    const forwardable = [];
    contexts.forEach((ctx, idx) => {
      if (!this.isForwardingOutport(inport, name)) {
        return;
      }
      if (ctx.ports.indexOf(outport) !== -1) {
        return;
      }
      const outContext = this.getBracketContext(
        "out",
        name,
        ctx.ip.scope,
        parseInt(index, 10)
      )[idx];
      if (outContext) {
        if (outContext.ip.data === ctx.ip.data && outContext.ports.indexOf(outport) !== -1) {
          return;
        }
      }
      forwardable.push(ctx);
    });
    return forwardable;
  }
  /**
   * Add any bracket forwards needed to the result queue.
   *
   * @private
   * @param result
   */
  addBracketForwards(result) {
    const res = result;
    if (res.__bracketClosingBefore != null ? res.__bracketClosingBefore.length : void 0) {
      res.__bracketClosingBefore.forEach((context) => {
        debugBrackets(
          `${this.nodeId} closeBracket-A from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`
        );
        if (!context.ports.length) {
          return;
        }
        context.ports.forEach((port) => {
          const ipClone = context.closeIp.envelope();
          this.addToResult(res, port, ipClone, true);
          this.getBracketContext("out", port, ipClone.scope).pop();
        });
      });
    }
    if (res.__bracketContext) {
      Object.keys(res.__bracketContext).reverse().forEach((inport) => {
        const context = res.__bracketContext[inport];
        if (!context.length) {
          return;
        }
        Object.keys(res).forEach((outport) => {
          let datas;
          let forwardedOpens;
          let unforwarded;
          const ips = res[outport];
          if (outport.indexOf("__") === 0) {
            return;
          }
          if (this.outPorts[outport].isAddressable()) {
            Object.keys(ips).forEach((idx) => {
              const idxIps = ips[idx];
              datas = idxIps.filter((ip) => ip.type === "data");
              if (!datas.length) {
                return;
              }
              const portIdentifier = `${outport}[${idx}]`;
              unforwarded = this.getForwardableContexts(
                inport,
                portIdentifier,
                context
              );
              if (!unforwarded.length) {
                return;
              }
              forwardedOpens = [];
              unforwarded.forEach((ctx) => {
                debugBrackets(
                  `${this.nodeId} openBracket from '${inport}' to '${portIdentifier}': '${ctx.ip.data}'`
                );
                const ipClone = ctx.ip.envelope();
                ipClone.index = parseInt(idx, 10);
                forwardedOpens.push(ipClone);
                ctx.ports.push(portIdentifier);
                this.getBracketContext(
                  "out",
                  outport,
                  ctx.ip.scope,
                  ipClone.index
                ).push(ctx);
              });
              forwardedOpens.reverse();
              forwardedOpens.forEach((ip) => {
                this.addToResult(res, outport, ip, true);
              });
            });
            return;
          }
          datas = ips.filter((ip) => ip.type === "data");
          if (!datas.length) {
            return;
          }
          unforwarded = this.getForwardableContexts(inport, outport, context);
          if (!unforwarded.length) {
            return;
          }
          forwardedOpens = [];
          unforwarded.forEach((ctx) => {
            debugBrackets(
              `${this.nodeId} openBracket from '${inport}' to '${outport}': '${ctx.ip.data}'`
            );
            forwardedOpens.push(ctx.ip.envelope());
            ctx.ports.push(outport);
            this.getBracketContext("out", outport, ctx.ip.scope).push(ctx);
          });
          forwardedOpens.reverse();
          forwardedOpens.forEach((ip) => {
            this.addToResult(res, outport, ip, true);
          });
        });
      });
    }
    if (res.__bracketClosingAfter != null ? res.__bracketClosingAfter.length : void 0) {
      res.__bracketClosingAfter.forEach((context) => {
        debugBrackets(
          `${this.nodeId} closeBracket-B from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`
        );
        if (!context.ports.length) {
          return;
        }
        context.ports.forEach((port) => {
          const ipClone = context.closeIp.envelope();
          this.addToResult(res, port, ipClone, false);
          this.getBracketContext("out", port, ipClone.scope).pop();
        });
      });
    }
    delete res.__bracketClosingBefore;
    delete res.__bracketContext;
    delete res.__bracketClosingAfter;
  }
  /**
   * Send all resolved output from the output queue in order. Called whenever
   * an execution context finishes.
   *
   * @private
   * @returns {void}
   */
  processOutputQueue() {
    while (this.outputQ.length > 0) {
      if (!this.outputQ[0].__resolved) {
        break;
      }
      const result = this.outputQ.shift();
      this.addBracketForwards(result);
      Object.keys(result).forEach((port) => {
        let portIdentifier;
        const ips = result[port];
        if (port.indexOf("__") === 0) {
          return;
        }
        if (this.outPorts.ports[port].isAddressable()) {
          Object.keys(ips).forEach((index) => {
            const idxIps = ips[index];
            const idx = parseInt(index, 10);
            if (!this.outPorts.ports[port].isAttached(idx)) {
              return;
            }
            idxIps.forEach((packet) => {
              const ip = packet;
              portIdentifier = `${port}[${ip.index}]`;
              if (ip.type === "openBracket") {
                debugSend(
                  `${this.nodeId} sending ${portIdentifier} < '${ip.data}'`
                );
              } else if (ip.type === "closeBracket") {
                debugSend(
                  `${this.nodeId} sending ${portIdentifier} > '${ip.data}'`
                );
              } else {
                debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
              }
              if (!this.outPorts[port].options.scoped) {
                ip.scope = null;
              }
              this.outPorts[port].sendIP(ip);
            });
          });
          return;
        }
        if (!this.outPorts.ports[port].isAttached()) {
          return;
        }
        ips.forEach((packet) => {
          const ip = packet;
          portIdentifier = port;
          if (ip.type === "openBracket") {
            debugSend(
              `${this.nodeId} sending ${portIdentifier} < '${ip.data}'`
            );
          } else if (ip.type === "closeBracket") {
            debugSend(
              `${this.nodeId} sending ${portIdentifier} > '${ip.data}'`
            );
          } else {
            debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
          }
          if (!this.outPorts[port].options.scoped) {
            ip.scope = null;
          }
          this.outPorts[port].sendIP(ip);
        });
      });
    }
  }
  // Signal that component has activated. There may be multiple
  // activated contexts at the same time
  /**
   * Signal that a processing context has activated. There may be multiple
   * activated contexts at the same time.
   *
   * @param {ActivationContext} context - The lifecycle context: whether
   *   it is active, completed, and (for ProcessContext instances) the
   *   ordered-output result.
   */
  activate(context) {
    if (context.activated) {
      return;
    }
    context.activated = true;
    context.deactivated = false;
    this.load += 1;
    this.dispatchLifecycleEvent("activate", this.load);
    if (this.ordered || this.autoOrdering) {
      this.outputQ.push(context.result);
    }
  }
  /**
   * Signal that a processing context has deactivated. There may be multiple
   * activated contexts at the same time.
   *
   * @param {ActivationContext} context - The lifecycle context: whether
   *   it is active and completed.
   */
  deactivate(context) {
    if (context.deactivated) {
      return;
    }
    context.deactivated = true;
    context.activated = false;
    if (this.isOrdered()) {
      this.processOutputQueue();
    }
    this.load -= 1;
    this.dispatchLifecycleEvent("deactivate", this.load);
    if (context.consumed > 0 && !this.closedDown) {
      this.#pendingOffer = true;
      makeAsync(() => {
        this.#offerResumption();
      });
    }
    this.#evaluateClosedown();
  }
  /**
   * Whether the component has closed down: every input at EOT, no open
   * activation, nothing buffered left to deliver. Its outports have been
   * terminally disconnected — downstream sees EOT.
   *
   * @returns {boolean}
   */
  isClosedDown() {
    return this.closedDown;
  }
  /**
   * React to an input state change (a socket connecting or terminally
   * disconnecting): a reconnect revives a closed-down component, and
   * every transition re-evaluates the closedown predicate.
   *
   * @returns {void}
   */
  /**
   * Whether a drain-pump offer is scheduled but has not run yet. The
   * closedown evaluation defers while one is pending: the offer may
   * drain buffers that would otherwise be declared stranded at end of
   * transmission (work document #48). The flag is set when the offer is
   * scheduled and cleared when the offer's body runs, which then
   * re-evaluates the closedown itself — no evaluation is lost.
   *
   * @type {boolean}
   */
  #pendingOffer = false;
  /**
   * Whether any inport holds buffered packets the pump's own reach
   * covers: the data a pending pump offer might drain. The shapes mirror
   * `#readyScopes()` exactly — the regular, scoped, and addressable
   * buffers plus the IIP buffers, whose non-control contents are
   * consumable work like any other. Control ports are excluded — their
   * standing values are legitimate at quiescence and never block closing
   * (work document #45). A deferral keyed to a narrower set than the
   * pump's reach would let the closedown strand packets the pump could
   * have drained (work document #48).
   *
   * @returns {boolean}
   */
  #inputBuffersHold() {
    const portNames = Object.keys(this.inPorts.ports);
    for (const name of portNames) {
      const port = (
        /** @type {import("./InPort.js").default} */
        this.inPorts.ports[name]
      );
      if (port.options.control) {
        continue;
      }
      if ((port.buffer ?? []).length > 0) {
        return true;
      }
      if ((port.iipBuffer ?? []).length > 0) {
        return true;
      }
      for (const buf of Object.values(port.scopedBuffer ?? {})) {
        if ((buf ?? []).length > 0) {
          return true;
        }
      }
      for (const buf of Object.values(port.indexedBuffer ?? {})) {
        if ((buf ?? []).length > 0) {
          return true;
        }
      }
      for (const buf of Object.values(port.indexedIipBuffer ?? {})) {
        if ((buf ?? []).length > 0) {
          return true;
        }
      }
      for (const scoped of Object.values(port.indexedScopedBuffer ?? {})) {
        for (const buf of Object.values(scoped ?? {})) {
          if ((buf ?? []).length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }
  #handleInputStateChange() {
    if (typeof this.isSubgraph === "function" && this.isSubgraph()) {
      return;
    }
    if (this.closedDown) {
      const reopened = Object.keys(this.inPorts.ports).some(
        (name) => !this.inPorts.ports[name].isEot()
      );
      if (reopened) {
        this.closedDown = false;
      }
    }
    this.#evaluateClosedown();
  }
  /**
   * Evaluate the classical cascading-closedown rule (work document #45):
   * a component closes down when every input is at EOT, no activation is
   * open, and no buffered deliverable data remains (control ports are
   * excluded — their standing values are legitimate at quiescence). On
   * closedown the outports are terminally disconnected, so downstream
   * ports reach EOT and the rule recurses. Runs on every state
   * transition that can complete the condition: port EOT and activation
   * close.
   *
   * The evaluation defers while a drain-pump offer is pending (#48): the
   * offer may drain buffered data that this rule would otherwise declare
   * stranded at end of transmission; the offer's own tail re-invokes
   * this evaluation.
   *
   * @returns {void}
   */
  #evaluateClosedown() {
    if (this.closedDown) {
      return;
    }
    if (this.#pendingOffer && this.#inputBuffersHold()) {
      return;
    }
    if (typeof this.isSubgraph === "function" && this.isSubgraph()) {
      return;
    }
    const portNames = Object.keys(this.inPorts.ports);
    for (const name of portNames) {
      const port = (
        /** @type {InPort} */
        this.inPorts.ports[name]
      );
      if (!port.isEot()) {
        return;
      }
    }
    if (this.load !== 0) {
      return;
    }
    if (this.isOrdered() && this.outputQ.length > 0) {
      return;
    }
    this.closedDown = true;
    const disconnects = [];
    Object.keys(this.outPorts.ports).forEach((name) => {
      const port = (
        /** @type {import("./OutPort.js").default} */
        this.outPorts.ports[name]
      );
      port.sockets.forEach((socket) => {
        if (!socket) {
          return;
        }
        disconnects.push(socket.disconnect());
      });
    });
    Promise.all(disconnects).then(() => {
      this.dispatchLifecycleEvent("closedown", this);
    }).catch((err) => {
      debugComponent3(
        `${this.nodeId} terminal disconnect failed during closedown: ${err?.message ?? err}`
      );
    });
  }
};
Component.description = "";
Component.icon = null;

// node_modules/@noflo/noflo/src/components/Subgraph.js
var Subgraph = class extends Component {
  /**
   * Create a subgraph component for the given graph definition, taking the
   * same options a `Network` takes.
   *
   * @param {import("@noflo/graph").GraphModel|Object<string, any>} graph
   *   A live graph model or an FBP JSON definition
   * @param {SubgraphOptions} [options]
   */
  constructor(graph, options = {}) {
    super();
    if (graph === void 0 || graph === null) {
      throw new Error(
        "Subgraph requires a graph definition: pass a GraphModel or FBP JSON document"
      );
    }
    this.metadata = options.metadata;
    this.network = null;
    this.ready = true;
    this.started = false;
    this.starting = false;
    this.load = 0;
    this.startingPromise = null;
    this.inPorts = new InPorts({});
    this.outPorts = new OutPorts({});
    this.ready = false;
    this.prepared = this.createNetwork(
      graph instanceof GraphModel ? graph : importFbpJson(graph),
      options
    );
  }
  /**
   * Build the internal network for the graph, wiring it up and mapping the
   * exported ports onto this component.
   *
   * @protected
   * @param {import("@noflo/graph").GraphModel} graph
   * @param {SubgraphOptions} [options]
   * @returns {Promise<void>}
   */
  createNetwork(graph, options = {}) {
    const graphMetadata = graph.graphMetadata();
    this.description = graphMetadata.description || "";
    this.icon = graphMetadata.icon || this.icon;
    const graphObj = graph;
    if (!graphObj.name && this.nodeId) {
      graphObj.name = this.nodeId;
    }
    const network = new Network(graphObj, options);
    return Promise.resolve().then(() => {
      this.network = network;
      this.dispatchLifecycleEvent("network", network);
      this.subscribeNetwork(network);
      return network.connect();
    }).then(() => {
      Object.keys(network.processes).forEach((name) => {
        const node = network.processes[name];
        this.findEdgePorts(name, node);
      });
      this.setToReady();
    });
  }
  /**
   * @typedef SubgraphContext
   * @property {boolean} activated
   * @property {boolean} deactivated
   */
  /**
   * @param {import("../lib/Network.js").Network} network
   */
  subscribeNetwork(network) {
    const contexts = [];
    network.addEventListener("start", () => {
      const ctx = {
        activated: false,
        deactivated: false,
        result: {}
      };
      contexts.push(ctx);
      this.activate(ctx);
    });
    network.addEventListener("end", () => {
      const ctx = contexts.pop();
      if (!ctx) {
        return;
      }
      this.deactivate(ctx);
      this.closedDown = true;
      this.dispatchLifecycleEvent("closedown", this);
    });
  }
  /**
   * @param {import("../lib/InPort.js").default} _port
   * @param {string} nodeName
   * @param {string} portName
   * @returns {boolean|string}
   */
  isExportedInport(_port, nodeName, portName) {
    if (!this.network) {
      return false;
    }
    for (const exp of this.network.graph.exports()) {
      if (exp.direction !== "inport" || exp.internal.node !== nodeName || exp.internal.port !== portName) {
        continue;
      }
      return exp.public;
    }
    return false;
  }
  /**
   * @param {import("../lib/OutPort.js").default} _port
   * @param {string} nodeName
   * @param {string} portName
   * @returns {boolean|string}
   */
  isExportedOutport(_port, nodeName, portName) {
    if (!this.network) {
      return false;
    }
    for (const exp of this.network.graph.exports()) {
      if (exp.direction !== "outport" || exp.internal.node !== nodeName || exp.internal.port !== portName) {
        continue;
      }
      return exp.public;
    }
    return false;
  }
  setToReady() {
    makeAsync(() => {
      this.ready = true;
      this.dispatchLifecycleEvent("ready");
    });
  }
  /**
   * @param {string} name
   * @param {import("../lib/Network.js").NetworkProcess} process
   * @returns {boolean}
   */
  findEdgePorts(name, process2) {
    if (!process2.component) {
      return false;
    }
    const inPorts = process2.component.inPorts.ports;
    const outPorts = process2.component.outPorts.ports;
    Object.keys(inPorts).forEach((portName) => {
      const port = inPorts[portName];
      const targetPortName = this.isExportedInport(port, name, portName);
      if (typeof targetPortName !== "string") {
        return;
      }
      this.inPorts.add(targetPortName, port);
      this.inPorts.ports[targetPortName].addEventListener("connect", () => {
        if (this.starting || !this.network) {
          return;
        }
        if (this.network.isStarted()) {
          return;
        }
        if (this.network.startupDate) {
          this.network.setStarted(true);
          return;
        }
        this.setUp();
      });
    });
    Object.keys(outPorts).forEach((portName) => {
      const port = outPorts[portName];
      const targetPortName = this.isExportedOutport(port, name, portName);
      if (typeof targetPortName !== "string") {
        return;
      }
      this.outPorts.add(targetPortName, port);
    });
    return true;
  }
  isReady() {
    return this.ready;
  }
  isSubgraph() {
    return true;
  }
  setUp() {
    if (!this.isReady()) {
      this.startingPromise = new Promise((resolve, reject) => {
        const onReady = (_event) => {
          this.removeEventListener("ready", onReady);
          this.setUp().then(resolve, reject);
        };
        this.addEventListener("ready", onReady);
      });
      return this.startingPromise;
    }
    if (this.starting) {
      return this.startingPromise;
    }
    this.starting = true;
    if (!this.network) {
      this.starting = false;
      return Promise.resolve();
    }
    if (this.network.isStarted()) {
      this.starting = false;
      return Promise.resolve();
    }
    this.startingPromise = this.network.start().then(() => {
      this.starting = false;
    });
    return this.startingPromise;
  }
  tearDown() {
    this.starting = false;
    if (!this.network) {
      return Promise.resolve();
    }
    return this.network.stop().then(() => {
    });
  }
};

// node_modules/@noflo/noflo/src/lib/ComponentLoader.js
var ComponentLoader = class {
  /**
   * Create a component loader. When an application registry is supplied, its
   * catalog is read synchronously at construction and the loader subscribes
   * to its `change` and `invalidate` events (if any) to keep the cache in
   * sync.
   *
   * @param {ComponentLoaderOptions} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.registry = this.options.registry || null;
    this.components = {};
    this.libraryIcons = {};
    if (this.registry && typeof this.registry.list === "function") {
      const list = this.registry.list();
      Object.keys(list || {}).forEach((name) => {
        this.components[name] = list[name];
      });
    }
    if (this.registry && typeof /** @type {any} */
    this.registry.addEventListener === "function") {
      this.registry.addEventListener(
        "change",
        (event) => {
          const name = event.detail?.name;
          if (!name || !this.components) {
            return;
          }
          if (typeof this.registry?.get !== "function") {
            return;
          }
          Promise.resolve(this.registry.get(name)).then((impl) => {
            if (!this.components) {
              return;
            }
            if (impl) {
              this.components[name] = impl;
            } else {
              delete this.components[name];
            }
          }).catch(() => {
          });
        }
      );
      this.registry.addEventListener("invalidate", () => {
        this.components = {};
        if (this.registry && typeof this.registry.list === "function") {
          const list = this.registry.list();
          Object.keys(list || {}).forEach((name) => {
            this.components[name] = list[name];
          });
        }
      });
    }
  }
  /**
   * Get the library prefix for a given module name. This is mostly used for
   * generating valid names for namespaced NPM modules, as well as for
   * convenience renaming all `noflo-` prefixed modules with just their base
   * name.
   *
   * Examples:
   *
   * - `my-project` becomes `my-project`
   * - `@foo/my-project` becomes `my-project`
   * - `noflo-core` becomes `core`
   *
   * @param {string} name
   * @returns {string}
   */
  getModulePrefix(name) {
    if (!name) {
      return "";
    }
    let res = name;
    if (res === "noflo") {
      return "";
    }
    if (res[0] === "@") {
      res = res.replace(/@[a-z-]+\//, "");
    }
    return res.replace(/^noflo-/, "");
  }
  /**
   * Get the list of all available components. The catalog is already
   * populated at construction, so the returned Promise resolves
   * immediately.
   *
   * @returns {Promise<ComponentList>} Promise resolving to list of loaded components
   */
  listComponents() {
    return Promise.resolve(this.components);
  }
  /**
   * Load an instance of a specific component. If the registered component is
   * a graph model or FBP JSON definition, it will be loaded as an instance of
   * the NoFlo subgraph component.
   *
   * @param {string} name - Component name
   * @param {Object<string, any>} [meta] - Node metadata
   * @returns {Promise<import("./Component.js").Component>}
   */
  load(name, meta) {
    const metadata = meta;
    const promise = new Promise((resolve, reject) => {
      if (!this.components) {
        reject(new Error(`Component ${name} not available`));
        return;
      }
      let component = this.components[name];
      if (!component) {
        const keys = Object.keys(this.components);
        for (let i = 0; i < keys.length; i += 1) {
          const componentName = keys[i];
          if (componentName.split("/")[1] === name) {
            component = this.components[componentName];
            break;
          }
        }
      }
      if (!component) {
        if (this.registry && typeof this.registry.get === "function") {
          resolve(
            Promise.resolve(this.registry.get(name)).then((impl) => {
              if (!impl) {
                reject(new Error(`Component ${name} not available`));
                return void 0;
              }
              return impl;
            })
          );
          return;
        }
      }
      if (!component) {
        reject(new Error(`Component ${name} not available`));
        return;
      }
      resolve(component);
    }).then((component) => {
      if (this.isGraph(component)) {
        return (
          /** @type {Promise<import("./Component.js").Component>} */
          this.loadGraph(name, component, metadata)
        );
      }
      return this.createComponent(name, component, metadata).then(
        (instance) => {
          if (!instance) {
            return Promise.reject(
              new Error(`Component ${name} could not be loaded.`)
            );
          }
          const inst = instance;
          if (typeof name === "string") {
            inst.componentName = name;
          }
          this.setIcon(name, inst);
          return inst;
        }
      );
    });
    return promise;
  }
  /**
   * Creates an instance of a component.
   * @param {string} name
   * @param {ComponentDefinition} component
   * @param {Object<string, any>} [metadata]
   * @returns {Promise<import("./Component.js").Component>}
   */
  createComponent(name, component, metadata) {
    const implementation = component;
    if (!implementation) {
      return Promise.reject(new Error(`Component ${name} not available`));
    }
    let instance;
    const impl = (
      /** @type ModuleComponent */
      implementation
    );
    if (typeof impl.getComponent === "function") {
      try {
        instance = impl.getComponent(metadata);
      } catch (error) {
        return Promise.reject(error);
      }
    } else if (typeof implementation === "function") {
      try {
        const isClass = implementation.prototype?.constructor === implementation && /^\s*class\s/.test(String(implementation));
        instance = isClass ? new /** @type {any} */
        implementation(metadata) : implementation(metadata);
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(
        new Error(
          `Invalid type ${typeof implementation} for component ${name}.`
        )
      );
    }
    return Promise.resolve(instance);
  }
  /**
   * Check whether a given value is a graph definition: a live graph model,
   * an FBP JSON object with a `nodes` array, or a `.json`/`.fbp` file path.
   *
   * @param {import("@noflo/graph").GraphModel|object|string} cPath
   * @returns {boolean}
   */
  isGraph(cPath) {
    if (cPath instanceof GraphModel2) {
      return true;
    }
    if (typeof cPath !== "object") {
      return false;
    }
    if (Array.isArray(cPath.nodes)) {
      return true;
    }
    if (typeof cPath.processes === "object" && cPath.processes !== null && !Array.isArray(cPath.processes)) {
      return true;
    }
    return false;
  }
  // Load a graph as a NoFlo subgraph component instance
  /**
   * Load a graph definition as an instance of the subgraph component.
   *
   * @protected
   * @param {string} name
   * @param {import("@noflo/graph").GraphModel} component
   * @param {Object<string, any>} [metadata]
   * @returns {Promise<Subgraph>}
   */
  loadGraph(name, component, metadata) {
    const subgraph = new Subgraph(component, {
      // Cast bridges the source-inferred and declaration-emitted identities
      // of ComponentLoader (the protected loadGraph member makes them
      // nominal)
      componentLoader: (
        /** @type {import("./ComponentLoader.js").ComponentLoader} */
        /** @type {unknown} */
        this
      ),
      metadata
    });
    this.setIcon(name, subgraph);
    return subgraph.prepared.then(() => subgraph);
  }
  // Set icon for the component instance. If the instance
  // has an icon set, then this is a no-op. Otherwise we
  /**
   * Determine an icon for a loaded component based on the module it comes
   * from, or use a fallback icon separately for subgraphs and elementary
   * components. Does nothing when the component already carries an icon.
   *
   * @param {string} name - Component name to derive the library icon from
   * @param {import("./Component.js").Component} instance
   */
  setIcon(name, instance) {
    if (!instance.getIcon || instance.getIcon()) {
      return;
    }
    const [library, componentName] = name.split("/");
    if (componentName && this.getLibraryIcon(library)) {
      instance.setIcon(this.getLibraryIcon(library));
      return;
    }
    if (instance.isSubgraph()) {
      instance.setIcon("sitemap");
      return;
    }
    instance.setIcon("gear");
  }
  /**
   * Get the icon name registered for a library prefix, if any.
   *
   * @param {string} prefix
   * @returns {string|null}
   */
  getLibraryIcon(prefix) {
    if (this.libraryIcons[prefix]) {
      return this.libraryIcons[prefix];
    }
    return null;
  }
  /**
   * Register an icon name for a library prefix, used when instantiating
   * components from that library.
   *
   * @param {string} prefix
   * @param {string} icon
   */
  setLibraryIcon(prefix, icon) {
    this.libraryIcons[prefix] = icon;
  }
  /**
   * Build the full component name for a component inside a library,
   * normalizing the library prefix via the module prefix rules. A component
   * registered without a package id keeps its bare name.
   *
   * @param {string} packageId
   * @param {string} name
   * @returns {string}
   */
  normalizeName(packageId, name) {
    const prefix = this.getModulePrefix(packageId);
    let fullName = `${prefix}/${name}`;
    if (!packageId) {
      fullName = name;
    }
    return fullName;
  }
  /**
   * Register a NoFlo Component constructor or factory method as a component
   * available for loading, in addition to the components provided by the
   * registry.
   *
   * @param {string} packageId
   * @param {string} name
   * @param {ComponentDefinition} cPath
   * @returns {Promise<void>}
   */
  registerComponent(packageId, name, cPath) {
    const fullName = this.normalizeName(packageId, name);
    this.components[fullName] = cPath;
    return Promise.resolve();
  }
  /**
   * Register a graph model as a loadable component.
   *
   * @param {string} packageId
   * @param {string} name
   * @param {import("@noflo/graph").GraphModel} gPath
   * @returns {Promise<void>}
   */
  registerGraph(packageId, name, gPath) {
    return this.registerComponent(packageId, name, gPath);
  }
};

// node_modules/@noflo/noflo/src/lib/Edge.js
function validateHighWaterMark(value, source) {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(
      `Edge highWaterMark from ${source} must be a non-negative integer or null, got ${value}`
    );
  }
  return value;
}
var DEFAULT_HIGH_WATER_MARK = 16;
function resolveHighWaterMark(metadata, componentDefault, runtimeDefault) {
  const fromMetadata = metadata ? metadata.highWaterMark : void 0;
  if (fromMetadata !== void 0) {
    return validateHighWaterMark(fromMetadata, "edge metadata");
  }
  if (componentDefault !== void 0) {
    return validateHighWaterMark(componentDefault, "component default");
  }
  if (runtimeDefault !== void 0) {
    return validateHighWaterMark(runtimeDefault, "runtime default");
  }
  return DEFAULT_HIGH_WATER_MARK;
}
var Edge = class {
  /**
   * @param {EdgeOptions} [options]
   */
  constructor(options = {}) {
    this.highWaterMark = options.highWaterMark === void 0 || options.highWaterMark === null ? null : validateHighWaterMark(options.highWaterMark, "options");
    this.observers = [];
    this.lastError = null;
    this.closed = false;
    this.inFlight = 0;
    this.waitingWriters = [];
    this.pendingDeliveries = 0;
    this.drainResolvers = [];
    const self = this;
    if (this.highWaterMark !== null) {
      this.writableStream = new WritableStream({
        // Delivery runs one microtask after the write call, matching the
        // pump design's timing: the sending side's bookkeeping settles
        // before the receiving side's cascade begins. The sink completes
        // once the delivery handler has released the IP, so the
        // writer-side queue reflects undelivered packets.
        write(ip) {
          return Promise.resolve().then(() => {
            let release = null;
            try {
              if (self.deliver) {
                release = self.deliver(ip);
              }
            } catch (error) {
              self.#markDelivered();
              self.#released();
              if (self.onError) {
                self.onError(error);
                return;
              }
              self.lastError = error;
              return;
            }
            self.#markDelivered();
            const finish = () => {
              self.#released();
            };
            if (release && typeof release.then === "function") {
              return release.then(
                () => finish(),
                () => finish()
              );
            }
            finish();
          });
        },
        abort(reason) {
          self.lastError = reason;
        }
      });
      this.writer = this.writableStream.getWriter();
    }
  }
  /**
   * Settle one reserved delivery slot: decrement the pending count and
   * resolve any drain waiters once the edge is fully drained. Called when
   * an IP has been handed to the delivery handler, and on the rejection
   * paths of a write that never delivers.
   */
  #markDelivered() {
    this.pendingDeliveries -= 1;
    if (this.pendingDeliveries > 0) {
      return;
    }
    const resolvers = this.drainResolvers;
    this.drainResolvers = [];
    for (const resolver of resolvers) {
      resolver();
    }
  }
  /**
   * Resolve once every IP written to the edge has been handed to the
   * delivery handler. Resolves immediately when nothing is pending.
   *
   * @returns {Promise<void>}
   */
  whenDrained() {
    if (this.pendingDeliveries <= 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }
  /**
   * Deliver one IP to the registered handler. If the handler returns a
   * Promise, the completion link is registered so that the release
   * (delivery consumed) frees writer capacity.
   * Handler exceptions propagate synchronously to the caller.
   *
   * @param {any} ip
   */
  #deliver(ip) {
    if (this.deliver) {
      const release = this.deliver(ip);
      if (release && typeof release.then === "function") {
        release.then(
          () => this.#released(),
          () => this.#released()
        );
        return;
      }
      this.#released();
    }
  }
  /**
   * Mark delivery as consumed: decrement in-flight count and admit a
   * parked writer if one is waiting.
   */
  #released() {
    if (this.highWaterMark === null) {
      return;
    }
    this.inFlight -= 1;
    const next = this.waitingWriters.shift();
    if (next) {
      this.inFlight += 1;
      next.resolve();
    }
    const completion = this.pendingSinkCompletion;
    this.pendingSinkCompletion = null;
    if (completion) {
      completion();
    }
  }
  /**
   * Register the delivery handler invoked for each IP entering the edge.
   * At most one handler is active. If the handler returns a Promise, the
   * IP is considered delivered only once that Promise resolves
   * (consumer-paced backpressure).
   *
   * @param {(ip: any) => void | Promise<void>} handler
   * @returns {this}
   */
  onDelivery(handler) {
    this.deliver = handler;
    return this;
  }
  /**
   * Register the error handler invoked when delivery throws. Without
   * one, the error is recorded on the edge and delivery stops.
   *
   * @param {(error: any) => void} handler
   * @returns {this}
   */
  onErrorDelivery(handler) {
    this.onError = handler;
    return this;
  }
  /**
   * Register an observation middleware. Observers run synchronously,
   * in registration order, before an IP is delivered. Each observer
   * receives the IP and a `next()` to continue the chain.
   *
   * @param {(ip: any, next: () => void) => void} callback
   * @returns {this}
   */
  observe(callback) {
    this.observers.push(callback);
    return this;
  }
  /**
   * Track bracket stream integrity across the transport.
   *
   * @param {any} ip
   */
  #validateBrackets(ip) {
    if (!ip || typeof ip !== "object") {
      return;
    }
    if (ip.type === "openBracket") {
      this.bracketDepth = (this.bracketDepth || 0) + 1;
      return;
    }
    if (ip.type === "closeBracket") {
      this.bracketDepth = (this.bracketDepth || 0) - 1;
      if (this.bracketDepth < 0) {
        this.bracketDepth = 0;
        throw new Error(
          "Edge received a closeBracket without a matching openBracket"
        );
      }
    }
  }
  /**
   * Write an IP into the edge. The returned Promise resolves when the
   * write is admitted per the high-water mark: immediately for
   * unbounded edges and while capacity remains for bounded ones; once
   * the packet has been consumed for `highWaterMark: 0`.
   *
   * @param {any} ip
   * @returns {Promise<void>}
   */
  write(ip) {
    if (this.closed) {
      return Promise.reject(new Error("Edge is closed for writing"));
    }
    try {
      this.#validateBrackets(ip);
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.highWaterMark === null) {
      const deliverSync = () => {
        if (this.deliver) {
          const release = this.deliver(ip);
          if (release && typeof release.then === "function") {
            release.then(
              () => this.#released(),
              () => this.#released()
            );
          }
        }
      };
      const observers2 = this.observers;
      if (!observers2.length) {
        deliverSync();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const runObserver = (index) => {
          if (index >= observers2.length) {
            deliverSync();
            resolve();
            return;
          }
          observers2[index](ip, () => runObserver(index + 1));
        };
        runObserver(0);
      });
    }
    this.pendingDeliveries += 1;
    const unreserve = () => {
      this.#markDelivered();
    };
    const observers = this.observers;
    const admitted = (resolve, reject) => {
      if (this.highWaterMark > 0) {
        this.writer.write(ip).then(null, (error) => {
          this.lastError = error;
          unreserve();
        });
        resolve();
        return;
      }
      this.writer.write(ip).then(
        () => resolve(),
        (error) => {
          this.lastError = error;
          unreserve();
          reject(error);
        }
      );
    };
    const admittedThroughObservers = (resolve, reject) => {
      const runObserver = (index) => {
        if (index >= observers.length) {
          admitted(resolve, reject);
          return;
        }
        observers[index](ip, () => runObserver(index + 1));
      };
      runObserver(0);
    };
    return this.#admission().then(
      () => new Promise(observers.length ? admittedThroughObservers : admitted),
      (error) => {
        unreserve();
        return Promise.reject(error);
      }
    );
  }
  /**
   * Admission control per the resolved high-water mark.
   *
   * @returns {Promise<void>}
   */
  #admission() {
    if (this.highWaterMark === null) {
      return Promise.resolve();
    }
    if (this.highWaterMark === 0) {
      return Promise.resolve();
    }
    if (this.inFlight < this.highWaterMark) {
      this.inFlight += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.waitingWriters.push({ resolve, reject });
    });
  }
  /**
   * Current backpressure signal: how many more IPs can be admitted
   * before writers should wait. Positive means room available.
   *
   * @returns {number|null}
   */
  desiredSize() {
    if (this.highWaterMark === null) {
      return Infinity;
    }
    return this.highWaterMark - this.inFlight;
  }
  /**
   * Close the edge for writing. The delivery handler finishes with the
   * remaining IPs.
   *
   * @returns {Promise<void>}
   */
  close() {
    this.closed = true;
    const parked = this.waitingWriters;
    this.waitingWriters = [];
    for (const waiter of parked) {
      waiter.reject(new Error("Edge is closed for writing"));
    }
    if (this.writer) {
      return this.writer.close();
    }
    return Promise.resolve();
  }
};

// node_modules/@noflo/noflo/src/lib/InternalSocket.js
var InternalSocket_exports = {};
__export(InternalSocket_exports, {
  InternalSocket: () => InternalSocket,
  createSocket: () => createSocket
});
var InternalSocket = class extends EventBase {
  /**
   * @private
   */
  regularEmitEvent(event, data) {
    this.dispatchLifecycleEvent(event, data);
  }
  /**
   * @private
   */
  debugEmitEvent(event, data) {
    try {
      this.dispatchLifecycleEvent(event, data);
    } catch (error) {
      if (error.id && error.metadata && error.error) {
        if (this.listeners("error").length === 0) {
          throw error.error;
        }
        this.dispatchLifecycleEvent("error", error);
        return;
      }
      if (this.listeners("error").length === 0) {
        throw error;
      }
      this.dispatchLifecycleEvent("error", {
        id: this.to ? this.to.process.id : null,
        error,
        metadata: this.metadata
      });
    }
  }
  /**
   * @typedef InternalSocketOptions
   * @property {boolean} [debug] - Whether to catch exceptions caused by IP transmission
   * @property {boolean} [async] - Whether IP transmission should be asynchronous
   * @property {number|null} [highWaterMark] - Pre-resolved default (component ∪ runtime levels); the socket's edge metadata still takes precedence
   */
  /**
   * @param {Object<string, any>} [metadata]
   * @param {InternalSocketOptions} [options]
   */
  constructor(metadata = {}, options = {}) {
    super();
    this.metadata = metadata;
    this.brackets = [];
    this.connected = false;
    this.terminal = false;
    this.debug = options.debug || false;
    this.async = options.async || false;
    this.from = null;
    this.to = null;
    this.edge = new Edge({
      highWaterMark: resolveHighWaterMark(metadata, options.highWaterMark)
    });
    this.edge.onDelivery((ip) => this.#deliverIP(ip));
    this.edge.onErrorDelivery((error) => {
      if (this.listeners("error").length === 0) {
        setImmediate(() => {
          throw error;
        });
        return;
      }
      this.dispatchLifecycleEvent("error", {
        id: this.to ? this.to.process.id : null,
        error,
        metadata: this.metadata
      });
    });
  }
  /**
   * Deliver an IP from the edge to the socket's listeners.
   *
   * @param {IP} ip
   */
  #deliverIP(ip) {
    this.emitEvent("ip", ip);
  }
  emitEvent(event, data) {
    if (this.debug) {
      if (this.async) {
        makeAsync(() => this.debugEmitEvent(event, data));
        return;
      }
      this.debugEmitEvent(event, data);
      return;
    }
    if (this.async) {
      makeAsync(() => this.regularEmitEvent(event, data));
      return;
    }
    this.regularEmitEvent(event, data);
  }
  // ## Socket connections
  //
  // Sockets that are attached to the ports of processes may be
  // either connected or disconnected. The semantical meaning of
  // a connection is that the outport is in the process of sending
  // data. Disconnecting means an end of transmission.
  //
  // This can be used for example to signal the beginning and end
  // of information packets resulting from the reading of a single
  // file or a database query.
  //
  // Example, disconnecting when a file has been completely read:
  //
  //     readBuffer: (fd, position, size, buffer) ->
  //       fs.read fd, buffer, 0, buffer.length, position, (err, bytes, buffer) =>
  //         # Send data. The first send will also connect if not
  //         # already connected.
  //         @outPorts.out.send buffer.slice 0, bytes
  //         position += buffer.length
  //
  //         # Disconnect when the file has been completely read
  //         return @outPorts.out.disconnect() if position >= size
  //
  //         # Otherwise, call same method recursively
  //         @readBuffer fd, position, size, buffer
  connect() {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.terminal = false;
    this.emitEvent("connect", null);
  }
  /**
   * Disconnect the socket. With per-burst auto-disconnect removed, every
   * disconnect is terminal: the sender is done — nothing more will come
   * from it (work document #40 update #5). The `disconnect` event is
   * emitted once every IP posted before the disconnect has been delivered
   * through the edge, so receiving ends never observe a disconnect
   * overtaking data; on an unbounded edge (synchronous delivery) it
   * resolves immediately. A socket that never connected also closes: a
   * sender that finishes without ever transmitting still signals EOT
   * downstream.
   *
   * @returns {Promise<void>} Resolves when the disconnect event has been
   *   emitted
   */
  disconnect() {
    if (this.terminal) {
      return Promise.resolve();
    }
    this.terminal = true;
    if (!this.connected) {
      this.emitEvent("disconnect", null);
      return Promise.resolve();
    }
    this.connected = false;
    const drained = this.edge.whenDrained();
    if (this.edge.pendingDeliveries <= 0) {
      this.emitEvent("disconnect", null);
      return drained;
    }
    return drained.then(() => {
      this.emitEvent("disconnect", null);
    });
  }
  /**
   * Whether the socket has been terminally closed by its sender: nothing
   * more will arrive through it until a new transmission re-opens it.
   *
   * @returns {boolean}
   */
  isTerminal() {
    return this.terminal;
  }
  isConnected() {
    return this.connected;
  }
  // ## Sending information packets
  //
  // The _send_ method is used by a processe's outport to
  // send information packets. The actual packet contents are
  // not defined by NoFlo, and may be any valid JavaScript data
  // structure.
  //
  // The packet contents however should be such that may be safely
  // serialized or deserialized via JSON. This way the NoFlo networks
  // can be constructed with more flexibility, as file buffers or
  // message queues can be used as additional packet relay mechanisms.
  send(data) {
    return this.post(new IP("data", data));
  }
  // ## Sending information packets without open bracket
  //
  // Single IP objects can be sent without open/close brackets; the
  // connection stays open after the send. Ending a transmission is a
  // sender decision — `disconnect()` — not an automatic side effect of
  // sending (work document #40 update #5: disconnect is sender-terminal
  // EOT, not per-burst framing).
  /**
   * @param {IP} packet
   * @returns {Promise<void>|void} Resolves when the packet has been
   *   admitted by the edge per its high-water mark, and rejects on send
   *   errors — which also escalate through the socket error path
   *   (process-error with a listener, loud throw without). Void when the
   *   packet is silently dropped (e.g. a stray bracket closing).
   *   Fire-and-forget compatible: callers may ignore the Promise —
   *   internal handling keeps ignored rejections off the unhandled
   *   channel.
   */
  post(packet) {
    const ip = packet;
    if (!this.isConnected() && this.brackets.length === 0) {
      this.connect();
    }
    let write;
    if (ip.type === "closeBracket" && this.brackets.length === 0) {
    } else {
      if (ip.type === "openBracket") {
        this.brackets.push(ip.data);
      }
      if (ip.type === "closeBracket") {
        if (ip.data == null) {
          ip.data = this.brackets[this.brackets.length - 1];
        }
        this.brackets.pop();
      }
      write = this.edge.write(ip);
      write.catch((error) => {
        if (this.listeners("error").length === 0) {
          setImmediate(() => {
            throw error;
          });
          return;
        }
        this.dispatchLifecycleEvent("error", {
          id: this.to ? this.to.process.id : null,
          error,
          metadata: this.metadata
        });
      });
    }
    return write;
  }
  // ## Brackets and streams
  //
  // Packets can carry structure as bracket substreams: an `openBracket`
  // IP opens a stream, the packets belonging to it follow, and a
  // `closeBracket` IP closes it. Brackets nest, so tree structures can be
  // transmitted as a stream of packets. The stream name travels in the
  // bracket IP payloads — an `openBracket` for `article` followed by data
  // for its fields reads as:
  //
  // * `openBracket "article"`
  // * `data "Lorem ipsum"` (title)
  // * `data "Henri Bergius"` (author)
  // * `closeBracket "article"`
  //
  // Components are free to ignore brackets, but are recommended to
  // forward them onward if the data structures remain intact through
  // the component's processing — a stream that arrives grouped should
  // leave grouped.
  // ## Socket debug mode
  //
  // Sockets can catch exceptions happening in processes when data is
  // sent to them. These errors can then be reported to the network for
  // notification to the developer.
  setDebug(active) {
    this.debug = active;
  }
  // ## Socket identifiers
  //
  // Socket identifiers are mainly used for debugging purposes.
  // Typical identifiers look like _ReadFile:OUT -> Display:IN_,
  // but for sockets sending initial information packets to
  // components may also loom like _DATA -> ReadFile:SOURCE_.
  getId() {
    const fromStr = (from) => `${from.process.id}() ${from.port.toUpperCase()}`;
    const toStr = (to) => `${to.port.toUpperCase()} ${to.process.id}()`;
    if (!this.from && !this.to) {
      return "UNDEFINED";
    }
    if (this.from && !this.to) {
      return `${fromStr(this.from)} -> ANON`;
    }
    if (!this.from) {
      return `DATA -> ${toStr(this.to)}`;
    }
    return `${fromStr(this.from)} -> ${toStr(this.to)}`;
  }
};
function createSocket(metadata = {}, options = {}) {
  return new InternalSocket(metadata, options);
}

// node_modules/@noflo/noflo/src/lib/PortMetadata.js
var PORT_BEHAVIOR_KEYS = [
  "noflo.control",
  "noflo.scoped",
  "noflo.forwardBrackets"
];
function applyPortMetadata(component, metadata = {}) {
  const overrides = Object.keys(metadata ?? {}).filter((key) => key.startsWith("noflo.")).map((key) => {
    if (!PORT_BEHAVIOR_KEYS.includes(key)) {
      throw new Error(
        `Unknown 'noflo.' metadata key '${key}' \u2014 the noflo/port-behavior schema declares: ${PORT_BEHAVIOR_KEYS.join(", ")}`
      );
    }
    return [key.slice("noflo.".length), metadata[key]];
  });
  if (!overrides.length) {
    return;
  }
  if (component.isSubgraph?.()) {
    throw new Error(
      "noflo.* overrides do not apply to subgraph nodes: the relay semantics for exported ports are not defined \u2014 place the override on the inner graph's node"
    );
  }
  for (const [key, value] of overrides) {
    if (key === "control") {
      applyControl(component, value);
      continue;
    }
    if (key === "scoped") {
      applyScoped(component, value);
      continue;
    }
    if (key === "forwardBrackets") {
      applyForwardBrackets(component, value);
      continue;
    }
    throw new Error(`Unknown 'noflo.' metadata key '${key}'`);
  }
}
function applyControl(component, value) {
  if (!Array.isArray(value)) {
    throw new Error(
      `noflo.control must be an array of inport names \u2014 got ${typeof value}`
    );
  }
  for (const name of value) {
    if (typeof name !== "string") {
      throw new Error(
        `noflo.control entries must be port names \u2014 got ${typeof name}`
      );
    }
    const port = component.inPorts.ports[name];
    if (!port) {
      throw new Error(
        `noflo.control names inport '${name}', which the component does not have`
      );
    }
    if (port.isAddressable()) {
      throw new Error(
        `noflo.control names addressable inport '${name}' \u2014 the gate model does not support addressable ports`
      );
    }
  }
  for (const name of value) {
    component.inPorts.ports[name].options.control = true;
  }
  for (const [name, port] of Object.entries(component.inPorts.ports)) {
    if (!value.includes(name)) {
      port.options.control = false;
    }
  }
}
function applyScoped(component, value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `noflo.scoped must be an object of port-name to boolean \u2014 got ${typeof value}`
    );
  }
  for (const [name, scoped] of Object.entries(value)) {
    if (typeof scoped !== "boolean") {
      throw new Error(
        `noflo.scoped values must be booleans \u2014 '${name}' got ${typeof scoped}`
      );
    }
    if (!component.inPorts.ports[name]) {
      throw new Error(
        component.outPorts.ports[name] ? `noflo.scoped names outport '${name}' \u2014 the outport-side scoped flip interacts with the ordered-output and forwarding machinery and is not supported yet (work document #44)` : `noflo.scoped names port '${name}', which the component does not have`
      );
    }
  }
  for (const [name, scoped] of Object.entries(value)) {
    const inPort = component.inPorts.ports[name];
    if (inPort) {
      if (inPort.options.scoped !== scoped) {
        inPort.options.scoped = scoped;
        inPort.prepareBuffer();
      }
      continue;
    }
    component.outPorts.ports[name].options.scoped = scoped;
  }
}
function applyForwardBrackets(component, value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `noflo.forwardBrackets must be an object of inport-name to outport-name array \u2014 got ${typeof value}`
    );
  }
  for (const [inPortName, outPorts] of Object.entries(value)) {
    if (typeof inPortName !== "string") {
      throw new Error(
        `noflo.forwardBrackets keys must be inport names \u2014 got ${typeof inPortName}`
      );
    }
    const port = component.inPorts.ports[inPortName];
    if (!port) {
      throw new Error(
        `noflo.forwardBrackets names inport '${inPortName}', which the component does not have`
      );
    }
    if (!Array.isArray(outPorts)) {
      throw new Error(
        `noflo.forwardBrackets values must be arrays of outport names \u2014 '${inPortName}' got ${typeof outPorts}`
      );
    }
    for (const outPortName of outPorts) {
      if (typeof outPortName !== "string") {
        throw new Error(
          `noflo.forwardBrackets entries must be outport names \u2014 '${inPortName}' got ${typeof outPortName}`
        );
      }
      if (!component.outPorts.ports[outPortName]) {
        throw new Error(
          `noflo.forwardBrackets for inport '${inPortName}' references outport '${outPortName}', which the component does not have`
        );
      }
    }
  }
  component.forwardBrackets = {
    ...component.forwardBrackets,
    ...value
  };
}

// node_modules/@noflo/noflo/src/lib/Network.js
var debugNetwork = createDebug("noflo:network");
function connectPort(socket, process2, port, index, inbound) {
  if (inbound) {
    socket.to = {
      process: process2,
      port,
      index
    };
    if (!process2.component?.inPorts?.ports[port]) {
      return Promise.reject(
        new Error(
          `No inport '${port}' defined in process ${process2.id} (${socket.getId()})`
        )
      );
    }
    if (process2.component.inPorts.ports[port].isAddressable()) {
      process2.component.inPorts.ports[port].attach(socket, index);
      return Promise.resolve(socket);
    }
    process2.component.inPorts.ports[port].attach(socket);
    return Promise.resolve(socket);
  }
  socket.from = {
    process: process2,
    port,
    index
  };
  if (!process2.component?.outPorts?.ports[port]) {
    return Promise.reject(
      new Error(
        `No outport '${port}' defined in process ${process2.id} (${socket.getId()})`
      )
    );
  }
  if (process2.component.outPorts.ports[port].isAddressable()) {
    process2.component.outPorts.ports[port].attach(socket, index);
    return Promise.resolve(socket);
  }
  process2.component.outPorts.ports[port].attach(socket);
  return Promise.resolve(socket);
}
var Network = class extends EventBase {
  /**
   * All NoFlo networks are instantiated with a graph. Upon instantiation
   * they will load all the needed components, instantiate them, and
   * set up the defined connections and IIPs.
   *
   * @param {import("@noflo/graph").GraphModel} graph - Graph definition to build a Network for
   * @param {NetworkOptions} options - Network options
   */
  constructor(graph, options = {}) {
    super();
    this.options = options;
    this.processes = {};
    this.connections = [];
    this.closingDebounceMs = options.closingDebounceMs ?? 10;
    this.closingCheckScheduled = false;
    this.edgeObservers = [];
    this.initials = [];
    this.nextInitials = [];
    this.graph = graph;
    this.started = false;
    this.stopped = true;
    this.debug = true;
    this.asyncDelivery = options.asyncDelivery || false;
    this.eventBuffer = [];
    this.startupDate = null;
    if (options.componentLoader) {
      this.loader = options.componentLoader;
    } else {
      this.loader = new ComponentLoader({
        registry: options.registry
      });
    }
    this.flowtrace = null;
    this.flowtraceName = null;
    this.setFlowtrace(options.flowtrace || null, null);
  }
  /**
   * The uptime of the network: current time minus start-up time.
   *
   * @returns {number} Uptime in milliseconds
   */
  uptime() {
    if (!this.startupDate) {
      return 0;
    }
    return Date.now() - this.startupDate.getTime();
  }
  /**
   * Get the IDs of processes that are currently actively processing.
   *
   * @returns {string[]}
   */
  getActiveProcesses() {
    const active = [];
    if (!this.started) {
      return active;
    }
    Object.keys(this.processes).forEach((name) => {
      const process2 = this.processes[name];
      if (!process2?.component) {
        return;
      }
      if (process2.component.load > 0) {
        active.push(name);
      }
    });
    return active;
  }
  /**
   * Record a network event to Flowtrace, when tracing is enabled. The main
   * graph logs events from its subgraphs as well.
   *
   * @private
   * @param {string} event
   * @param {any} payload
   */
  traceEvent(event, payload) {
    if (!this.flowtrace) {
      return;
    }
    if (this.flowtraceName && this.flowtraceName !== this.flowtrace.mainGraph) {
      if (event !== "start" && event !== "end") {
        return;
      }
    }
    switch (event) {
      case "ip": {
        let type = "data";
        if (payload.type === "openBracket") {
          type = "begingroup";
        } else if (payload.type === "closeBracket") {
          type = "endgroup";
        }
        const src = payload.socket.from ? {
          node: payload.socket.from.process.id,
          port: payload.socket.from.port
        } : null;
        const tgt = payload.socket.to ? {
          node: payload.socket.to.process.id,
          port: payload.socket.to.port
        } : null;
        this.flowtrace.addNetworkPacket(
          `network:${type}`,
          src,
          tgt,
          this.flowtraceName,
          {
            subgraph: payload.subgraph,
            group: payload.group,
            datatype: payload.datatype,
            schema: payload.schema,
            data: payload.data
          }
        );
        break;
      }
      case "start": {
        this.flowtrace.addNetworkStarted(this.flowtraceName);
        break;
      }
      case "end": {
        this.flowtrace.addNetworkStopped(this.flowtraceName);
        break;
      }
      case "stranded": {
        this.flowtrace.addNetworkStranded(
          this.flowtraceName,
          payload.id,
          payload.port,
          payload.scope,
          payload.open,
          payload.close
        );
        break;
      }
      case "connection": {
        const to = payload.socket.to ? {
          node: payload.socket.to.process.id,
          port: payload.socket.to.port
        } : null;
        this.flowtrace.addNetworkConnection(
          this.flowtraceName,
          to,
          payload.open
        );
        break;
      }
      case "process-error": {
        this.flowtrace.addNetworkError(
          this.flowtraceName,
          payload?.error ?? payload
        );
        break;
      }
      case "activation": {
        if (payload.ended) {
          this.flowtrace.addNetworkDeactivation(
            this.flowtraceName,
            payload.id,
            payload.load,
            payload.subgraph ?? null
          );
          break;
        }
        this.flowtrace.addNetworkActivation(
          this.flowtraceName,
          payload.id,
          payload.load,
          payload.subgraph ?? null
        );
        break;
      }
      default: {
      }
    }
  }
  /**
   * Emit a network lifecycle event, buffering events emitted before the
   * network has started and flushing the buffer on start. Errors, icons, and
   * network end are emitted immediately.
   *
   * @protected
   * @param {string} event
   * @param {any} payload
   */
  bufferedEmit(event, payload) {
    this.traceEvent(event, payload);
    if (["icon", "process-error", "end", "stranded"].includes(event)) {
      this.dispatchLifecycleEvent(event, payload);
      return;
    }
    if (!this.isStarted() && event !== "end") {
      this.eventBuffer.push({
        type: event,
        payload
      });
      return;
    }
    this.dispatchLifecycleEvent(event, payload);
    if (event === "start") {
      this.eventBuffer.forEach((ev) => {
        this.dispatchLifecycleEvent(ev.type, ev.payload);
      });
      this.eventBuffer = [];
    }
  }
  /**
   * Load a component instance by name through the network's component
   * loader.
   *
   * @param {string} component
   * @param {Object<string, any>} metadata
   * @returns {Promise<import("./Component.js").Component>}
   */
  load(component, metadata) {
    return this.loader.load(component, metadata);
  }
  // ## Add a process to the network
  /**
   * Add a process to the network. The process is also registered with the
   * current graph. Processes can be added at start-up time or later; the
   * node definition carries the component to instantiate and its metadata.
   *
   * @param {import("@noflo/graph").GraphNode} node
   * @param {Object} [options]
   * @returns {Promise<NetworkProcess>}
   */
  addNode(node, options = {}) {
    let promise;
    if (this.processes[node.entity_id]) {
      promise = Promise.resolve(this.processes[node.entity_id]);
    } else {
      const process2 = { id: node.entity_id };
      if (!node.component) {
        this.processes[process2.id] = process2;
        promise = Promise.resolve(process2);
      } else {
        const preloaded = this.options.instances?.[node.entity_id];
        promise = (preloaded ? Promise.resolve(preloaded) : this.load(node.component, node.metadata)).then((instance) => {
          instance.nodeId = node.entity_id;
          process2.component = instance;
          process2.componentName = node.component;
          const inPorts = process2.component.inPorts.ports;
          const outPorts = process2.component.outPorts.ports;
          Object.keys(inPorts).forEach((name) => {
            const port = inPorts[name];
            port.node = node.entity_id;
            port.nodeInstance = instance;
            port.name = name;
          });
          Object.keys(outPorts).forEach((name) => {
            const port = outPorts[name];
            port.node = node.entity_id;
            port.nodeInstance = instance;
            port.name = name;
          });
          if (instance.isSubgraph?.() && Object.keys(node.metadata ?? {}).some(
            (key) => key.startsWith("noflo.")
          )) {
            throw new Error(
              `Node ${node.entity_id}: noflo.* overrides do not apply to subgraph nodes \u2014 place the override on the inner graph's node`
            );
          }
          try {
            applyPortMetadata(instance, node.metadata);
          } catch (error) {
            throw new Error(
              `Node ${node.entity_id}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          if (instance.isSubgraph()) {
            this.subscribeSubgraph(process2);
          }
          this.subscribeNode(process2);
          this.processes[process2.id] = process2;
          return process2;
        });
      }
    }
    return promise.then((process2) => {
      if (!options.initial && !this.graph.hasNode(node.entity_id)) {
        this.graph.addNode(node);
      }
      return process2;
    });
  }
  /**
   * Remove a process from the network. The process is shut down and also
   * removed from the current graph.
   *
   * @param {import("@noflo/graph").GraphNode} node
   * @returns {Promise<void>}
   */
  removeNode(node) {
    const process2 = this.getNode(node.entity_id);
    if (!process2) {
      return Promise.reject(new Error(`Node ${node.entity_id} not found`));
    }
    let promise;
    if (!process2.component) {
      delete this.processes[node.entity_id];
      promise = Promise.resolve();
    } else {
      promise = process2.component.shutdown().then(() => {
        delete this.processes[node.entity_id];
        return Promise.resolve();
      });
    }
    return promise.then(() => {
      this.graph.removeNode(node.entity_id);
    });
  }
  /**
   * Rename a process in the network. Renaming also rewrites the process's
   * entry in the current graph, informing the ports of the new name.
   *
   * @param {string} oldId
   * @param {string} newId
   * @returns {Promise<void>}
   */
  renameNode(oldId, newId) {
    const process2 = this.getNode(oldId);
    if (!process2) {
      return Promise.reject(new Error(`Process ${oldId} not found`));
    }
    process2.id = newId;
    if (process2.component) {
      const inPorts = process2.component.inPorts.ports;
      const outPorts = process2.component.outPorts.ports;
      Object.keys(inPorts).forEach((name) => {
        const port = inPorts[name];
        if (!port) {
          return;
        }
        port.node = newId;
      });
      Object.keys(outPorts).forEach((name) => {
        const port = outPorts[name];
        if (!port) {
          return;
        }
        port.node = newId;
      });
    }
    this.processes[newId] = process2;
    delete this.processes[oldId];
    return Promise.resolve().then(() => {
      this.graph.renameNode(oldId, newId);
    });
  }
  /**
   * Get a process of this network by its node id.
   *
   * @param {string} id - Identifier of the process
   * @returns {NetworkProcess|void}
   */
  getNode(id) {
    return this.processes[id];
  }
  /**
   * Wire the network up: instantiate every node, edge, and IIP from the
   * current graph, then attach default-value sockets. This is the step that
   * turns a graph model into running processes and connected sockets.
   *
   * @returns {Promise<this>}
   */
  connect() {
    const handleAll = (entities, method) => entities.reduce(
      (chain, entity) => chain.then(
        () => this[method](entity, {
          initial: true
        })
      ),
      Promise.resolve()
    );
    const promise = Promise.resolve().then(() => handleAll(this.graph.nodes(), "addNode")).then(() => handleAll(this.graph.edges(), "addEdge")).then(() => handleAll(this.graph.iips(), "addInitial")).then(() => this);
    return promise;
  }
  /**
   * Subscribe to a subgraph component's internal network, re-emitting its
   * `ip` and `process-error` events with the subgraph path prepended.
   *
   * @private
   * @param {NetworkProcess} node
   */
  subscribeSubgraph(node) {
    if (!node.component) {
      return;
    }
    if (!node.component.isReady()) {
      const onReady = (_event) => {
        node.component.removeEventListener("ready", onReady);
        this.subscribeSubgraph(node);
      };
      node.component.addEventListener("ready", onReady);
      return;
    }
    const instance = (
      /** @type {import("../components/Subgraph.js").Subgraph} */
      node.component
    );
    if (!instance.network) {
      return;
    }
    instance.network.setDebug(this.debug);
    instance.network.asyncDelivery = this.asyncDelivery;
    instance.network.connections.forEach((socket) => {
      socket.async = this.asyncDelivery;
    });
    if (this.flowtrace) {
      instance.network.setFlowtrace(this.flowtrace, node.componentName, false);
    }
    const emitSub = (type, data) => {
      if (type === "process-error" && this.listeners("process-error").length === 0) {
        if (data.id && data.metadata && data.error) {
          throw data.error;
        }
        throw data;
      }
      if (!data) {
        data = {};
      }
      if (data.subgraph) {
        if (!data.subgraph.unshift) {
          data.subgraph = [data.subgraph];
        }
        data.subgraph.unshift(node.id);
      } else {
        data.subgraph = [node.id];
      }
      this.bufferedEmit(type, data);
    };
    instance.network.addEventListener("ip", (event) => {
      emitSub("ip", event.detail);
    });
    instance.network.addEventListener("process-error", (event) => {
      emitSub("process-error", event.detail);
    });
    instance.network.addEventListener("activation", (event) => {
      emitSub("activation", event.detail);
    });
  }
  /**
   * Subscribe to events from a socket: forward packet traffic to the edge
   * observers and the network `ip` event, and escalate process errors when
   * nobody listens.
   *
   * @param {internalSocket.InternalSocket} socket
   */
  subscribeSocket(socket) {
    socket.edge.observe((ip, next) => {
      let advanced = false;
      const advance = () => {
        if (advanced) {
          return;
        }
        advanced = true;
        next();
      };
      for (const observer of this.edgeObservers) {
        observer(ip, socket, advance);
      }
      advance();
    });
    socket.addEventListener("ip", (event) => {
      const ip = event.detail;
      this.bufferedEmit("ip", {
        id: socket.getId(),
        type: ip.type,
        socket,
        data: ip.data,
        metadata: socket.metadata
      });
      this.scheduleClosingCheck();
    });
    socket.addEventListener("error", (event) => {
      const errEvent = event.detail;
      if (this.listeners("process-error").length === 0) {
        if (errEvent.id && errEvent.metadata && errEvent.error) {
          throw errEvent.error;
        }
        throw errEvent;
      }
      this.bufferedEmit("process-error", errEvent);
    });
    socket.addEventListener("connect", () => {
      if (socket.from) {
        return;
      }
      this.bufferedEmit("connection", { socket, open: true });
    });
    socket.addEventListener("disconnect", () => {
      if (socket.from) {
        return;
      }
      this.bufferedEmit("connection", { socket, open: false });
    });
  }
  /**
   * Subscribe to a component's lifecycle events: activation counts for
   * end-detection, activation state for trace recording, and icon changes.
   *
   * @param {NetworkProcess} node
   */
  /**
   * When a port's last attached socket terminally disconnects, any bracket
   * framing still buffered on the port can never pair with arriving data:
   * the future is known. Surface the residue as a per-port, per-scope
   * diagnostic — logged at debug level and recorded to Flowtrace as a
   * `0x0f STRANDED` event — instead of it surfacing only in the shutdown
   * buffer dump (work document #40 update #13). Reporting, not
   * consumption: a component may legitimately decline a closeBracket now
   * and consume it after its other input arrives.
   *
   * @param {NetworkProcess} node
   * @param {string} portName
   * @returns {void}
   */
  #reportStrandedFraming(node, portName) {
    const instance = this.processes[node.id]?.component;
    if (!instance) {
      return;
    }
    const port = instance.inPorts.ports[portName];
    if (!port) {
      return;
    }
    const sockets = (
      /** @type {import("./InternalSocket.js").InternalSocket[]} */
      port.sockets ?? []
    );
    if (!sockets.length || !sockets.every((socket) => socket?.isTerminal())) {
      return;
    }
    const residue = port.strandedFraming();
    for (const entry of residue) {
      debugNetwork(
        `${node.id} port '${portName}' holds stranded bracket framing at end of transmission (scope ${entry.scope ?? "unscoped"}${entry.index != null ? `[${entry.index}]` : ""}: ${entry.open} open, ${entry.close} close) \u2014 the framing can never pair with arriving data`
      );
      this.bufferedEmit("stranded", {
        id: node.id,
        port: portName,
        scope: entry.scope,
        index: entry.index,
        open: entry.open,
        close: entry.close
      });
    }
  }
  subscribeNode(node) {
    if (!node.component) {
      return;
    }
    const instance = (
      /** @type {import("./Component.js").Component} */
      node.component
    );
    instance.addEventListener("activate", () => {
      this.bufferedEmit("activation", {
        id: node.id,
        load: instance.load,
        ended: false
      });
    });
    instance.addEventListener("closedown", () => {
      this.scheduleClosingCheck();
    });
    instance.addEventListener(
      "deactivate",
      /** @param {Event & { detail: number }} event */
      (event) => {
        this.bufferedEmit("activation", {
          id: node.id,
          load: instance.load,
          ended: true
        });
        this.scheduleClosingCheck();
      }
    );
    Object.keys(instance.inPorts.ports).forEach((portName) => {
      instance.inPorts.ports[portName].addEventListener("disconnect", () => {
        this.#reportStrandedFraming(node, portName);
        this.scheduleClosingCheck();
      });
    });
    if (!instance.getIcon) {
      return;
    }
    instance.addEventListener("icon", () => {
      this.bufferedEmit("icon", {
        id: node.id,
        icon: instance.getIcon()
      });
    });
  }
  /**
   * Wait until a node's component is ready to be wired up, rejecting when
   * the node or its component is missing.
   *
   * @protected
   * @param {string} node
   * @param {string} direction
   * @returns Promise<NetworkProcess>
   */
  ensureNode(node, direction) {
    const instance = this.getNode(node);
    if (!instance) {
      return Promise.reject(
        new Error(`No process defined for ${direction} node ${node}`)
      );
    }
    if (!instance.component) {
      return Promise.reject(
        new Error(`No component defined for ${direction} node ${node}`)
      );
    }
    const comp = (
      /** @type {import("./Component.js").Component} */
      instance.component
    );
    if (!comp.isReady()) {
      return new Promise((resolve) => {
        const onReady = (_event) => {
          comp.removeEventListener("ready", onReady);
          resolve(instance);
        };
        comp.addEventListener("ready", onReady);
      });
    }
    return Promise.resolve(instance);
  }
  /**
   * Register a transport-level observer for every edge in this network:
   * the middleware sees each Information Packet on each edge before it is
   * delivered, as `(ip, socket, next)`. Call `next()` to continue delivery.
   * Applies to edges wired before and after registration. This is the
   * observability hook for fbp-protocol and Flowtrace; packet tracing via
   * network events is unaffected.
   *
   * @param {(ip: any, socket: internalSocket.InternalSocket, next: () => void) => void} callback
   * @returns {this}
   */
  observe(callback) {
    this.edgeObservers.push(callback);
    return this;
  }
  /**
   * Add a connection to the network: create the socket, attach it between
   * the two ports, and register the edge with the current graph.
   *
   * @param {import("@noflo/graph").GraphEdge} edge
   * @param {Object} [options]
   * @returns {Promise<internalSocket.InternalSocket>}
   */
  addEdge(edge, options = {}) {
    const promise = this.ensureNode(edge.from.node, "outbound").then((from) => {
      const sourcePort = (
        /** @type {any} */
        from.component.outPorts.ports[edge.from.port]
      );
      const portDefault = sourcePort?.options?.highWaterMark;
      const socket = createSocket(edge.metadata, {
        debug: this.debug,
        async: this.asyncDelivery,
        highWaterMark: resolveHighWaterMark(
          void 0,
          portDefault,
          this.options.highWaterMark
        )
      });
      return this.ensureNode(edge.to.node, "inbound").then((to) => {
        this.subscribeSocket(socket);
        return connectPort(socket, to, edge.to.port, edge.to.index, true);
      }).then(
        () => connectPort(socket, from, edge.from.port, edge.from.index, false)
      ).then(() => {
        this.connections.push(socket);
        return socket;
      });
    });
    return promise.then((socket) => {
      if (!options.initial) {
        this.graph.addEdge({
          from: edge.from,
          to: edge.to,
          ...edge.metadata === void 0 ? {} : { metadata: edge.metadata }
        });
      }
      return socket;
    });
  }
  /**
   * Remove a connection from the network: detach the socket from both of
   * its ports and remove the edge from the current graph.
   *
   * @param {import("@noflo/graph").GraphEdge} edge
   * @returns {Promise<void>}
   */
  removeEdge(edge) {
    this.connections.forEach((connection) => {
      if (!connection) {
        return;
      }
      if (edge.to.node !== connection.to.process.id || edge.to.port !== connection.to.port) {
        return;
      }
      connection.to.process.component.inPorts[connection.to.port].detach(
        connection
      );
      if (edge.from.node) {
        if (connection.from && edge.from.node === connection.from.process.id && edge.from.port === connection.from.port) {
          connection.from.process.component.outPorts[connection.from.port].detach(connection);
        }
      }
      this.connections.splice(this.connections.indexOf(connection), 1);
    });
    return Promise.resolve().then(() => {
      this.removeGraphEdge(edge);
    });
  }
  /**
   * Add an initial Information Packet to the network: create and attach its
   * socket, queue the packet, and register the IIP with the current graph.
   * When the network is running, the IIP is sent immediately.
   *
   * @param {import("@noflo/graph").GraphIIP} initializer
   * @param {Object} [options]
   * @returns {Promise<internalSocket.InternalSocket>}
   */
  addInitial(initializer, options = {}) {
    const promise = this.ensureNode(initializer.to.node, "inbound").then((to) => {
      const socket = createSocket(initializer.metadata, {
        debug: this.debug,
        async: this.asyncDelivery
      });
      this.subscribeSocket(socket);
      return connectPort(
        socket,
        to,
        initializer.to.port,
        initializer.to.index,
        true
      );
    }).then((socket) => {
      this.connections.push(socket);
      const init = {
        socket,
        data: initializer.from.data
      };
      this.initials.push(init);
      this.nextInitials.push(init);
      if (this.isRunning()) {
        this.sendInitials();
      } else if (!this.isStopped()) {
        this.setStarted(true);
        this.sendInitials();
      }
      return socket;
    });
    return promise.then((socket) => {
      if (!options.initial) {
        this.graph.addIIP({
          data: initializer.from.data,
          to: initializer.to,
          ...initializer.metadata === void 0 ? {} : { metadata: initializer.metadata }
        });
      }
      return socket;
    });
  }
  /**
   * Attach a persistent external driver socket to a process inport,
   * without sending anything. Unlike the IIP path — where each injection
   * is a self-contained single-packet stream that disconnects after its
   * packet — the driver socket stays connected: each `send()`/`post()` on
   * the returned socket delivers through the normal edge path with back
   * pressure respected, the receiving port stays connected (not at EOT),
   * and `disconnect()` marks the port at end of transmission, driving the
   * drain-based network closing cascade. This is the embedder and runtime
   * lever for boundary end-of-transmission: the boundary owns EOT, and a
   * driver is how an outside sender exercises it across multiple packets
   * (work documents #40, #45).
   *
   * The caller keeps the returned socket and is responsible for
   * disconnecting it; a driver left open keeps the network from ending.
   * Attaching does not change the network's run state.
   *
   * @param {{ node: string, port: string, index?: number }} initializer
   * @param {Object} [options]
   * @param {Object} [options.metadata]
   * @returns {Promise<internalSocket.InternalSocket>} The attached driver
   *   socket
   */
  addDriver(initializer, options = {}) {
    return this.ensureNode(initializer.node, "inbound").then((to) => {
      const socket = createSocket(options.metadata, {
        debug: this.debug,
        async: this.asyncDelivery
      });
      this.subscribeSocket(socket);
      return connectPort(
        socket,
        to,
        initializer.port,
        initializer.index,
        true
      ).then((attached) => {
        this.connections.push(attached);
        return attached;
      });
    });
  }
  /**
   * Remove an initial Information Packet from the network and the current
   * graph.
   *
   * @param {import("@noflo/graph").GraphIIP} initializer
   * @returns {Promise<void>}
   */
  removeInitial(initializer) {
    this.connections.forEach((connection) => {
      if (!connection) {
        return;
      }
      if (initializer.to.node !== connection.to.process.id || initializer.to.port !== connection.to.port) {
        return;
      }
      connection.to.process.component.inPorts[connection.to.port].detach(
        connection
      );
      this.connections.splice(this.connections.indexOf(connection), 1);
      for (let i = 0; i < this.initials.length; i += 1) {
        const init = this.initials[i];
        if (!init) {
          return;
        }
        if (init.socket !== connection) {
          return;
        }
        this.initials.splice(this.initials.indexOf(init), 1);
      }
      for (let i = 0; i < this.nextInitials.length; i += 1) {
        const init = this.nextInitials[i];
        if (!init) {
          return;
        }
        if (init.socket !== connection) {
          return;
        }
        this.nextInitials.splice(this.nextInitials.indexOf(init), 1);
      }
    });
    return Promise.resolve().then(() => {
      this.removeGraphIIP(initializer);
    });
  }
  /**
   * Remove the edge matching the given connection from the graph.
   *
   * @param {import("@noflo/graph").GraphEdge} edge
   * @returns {void}
   */
  removeGraphEdge(edge) {
    const match = this.graph.edges().find(
      (candidate) => sameRef(candidate.from, edge.from) && sameRef(candidate.to, edge.to)
    );
    if (!match) {
      throw new Error(
        `No edge from ${edge.from.node}:${edge.from.port} to ${edge.to.node}:${edge.to.port} to remove`
      );
    }
    this.graph.removeEdge(match.entity_id);
  }
  /**
   * Remove the IIP matching the given initializer from the graph.
   *
   * @param {import("@noflo/graph").GraphIIP} iip
   * @returns {void}
   */
  removeGraphIIP(iip) {
    const match = this.graph.iips().find((candidate) => sameRef(candidate.to, iip.to));
    if (!match) {
      throw new Error(
        `No IIP targeting ${iip.to.node}:${iip.to.port} to remove`
      );
    }
    this.graph.removeIIP(match.entity_id);
  }
  /**
   * Send all queued initial Information Packets and clear the queue.
   *
   * @returns Promise<void>
   */
  sendInitials() {
    return new Promise((resolve) => {
      makeAsync(resolve, true);
    }).then(
      () => this.initials.reduce(
        (chain, initial) => chain.then(() => {
          initial.socket.post(
            new IP("data", initial.data, {
              initial: true
            })
          );
          return initial.socket.disconnect();
        }),
        Promise.resolve()
      )
    ).then(() => {
      this.initials = [];
      return Promise.resolve();
    });
  }
  /**
   * Check whether the network is currently started.
   *
   * @returns {boolean}
   */
  isStarted() {
    return this.started;
  }
  /**
   * Check whether the network is currently stopped.
   *
   * @returns {boolean}
   */
  isStopped() {
    return this.stopped;
  }
  /**
   * Check whether the network has any actively processing components.
   *
   * @returns {boolean}
   */
  isRunning() {
    return this.getActiveProcesses().length > 0;
  }
  /**
   * Start every component in the network, in parallel.
   *
   * @protected
   * @returns Promise<void>
   */
  startComponents() {
    if (!this.processes || !Object.keys(this.processes).length) {
      return Promise.resolve();
    }
    return Promise.all(
      Object.keys(this.processes).map((id) => {
        const process2 = this.processes[id];
        if (!process2.component) {
          return Promise.resolve();
        }
        return process2.component.start();
      })
    ).then(() => {
    });
  }
  /**
   * Start the network: start all components, send the initial Information
   * Packets. Starting an already-started
   * network stops it first.
   *
   * @returns {Promise<this>}
   */
  start() {
    if (this.started) {
      return this.stop().then(() => this.start());
    }
    this.initials = this.nextInitials.slice(0);
    this.eventBuffer = [];
    return this.startComponents().then(() => this.sendInitials()).then(() => {
      this.setStarted(true);
      return Promise.resolve(this);
    });
  }
  /**
   * Stop the network: disconnect all connections and shut every component
   * down. Stopping an already-stopped network resolves immediately.
   *
   * @returns {Promise<this>}
   */
  stop() {
    if (!this.started) {
      this.stopped = true;
      return Promise.resolve(this);
    }
    this.connections.forEach((connection) => {
      if (!connection.isConnected()) {
        return;
      }
      connection.disconnect();
    });
    if (!this.processes || !Object.keys(this.processes).length) {
      this.setStarted(false);
      this.stopped = true;
      return Promise.resolve(this);
    }
    return Promise.all(
      Object.keys(this.processes).map((id) => {
        if (!this.processes[id].component) {
          return Promise.resolve();
        }
        const comp = (
          /** @type {import("./Component.js").Component} */
          this.processes[id].component
        );
        return comp.shutdown();
      })
    ).then(() => {
      this.setStarted(false);
      this.stopped = true;
      return Promise.resolve(this);
    });
  }
  /**
   * Mark the network started or ended, emitting the corresponding lifecycle
   * event and maintaining the start-up timestamp.
   *
   * @param {boolean} started
   */
  setStarted(started) {
    if (this.started === started) {
      return;
    }
    if (!started) {
      this.started = false;
      this.bufferedEmit("end", {
        start: this.startupDate,
        end: /* @__PURE__ */ new Date(),
        uptime: this.uptime()
      });
      return;
    }
    if (!this.startupDate) {
      this.startupDate = /* @__PURE__ */ new Date();
    }
    this.started = true;
    this.stopped = false;
    this.bufferedEmit("start", {
      start: this.startupDate
    });
  }
  /**
   * End the network when its boundary inputs are all at end of transmission and
   * the network is quiescent (work document #45): no open activation, no
   * buffered deliverable data, no packet in flight on any edge. The
   * boundary owns end-of-transmission — a network's own inports (exported
   * ports and IIP feeds) are what can reach EOT; internal edges and cycles
   * need no closedown, because a quiescent network with all sources
   * finished is absorbing: no future event can occur inside it. A network
   * whose boundary inputs never terminate (long-running graphs, remote
   * subgraphs, generators) never ends.
   *
   * The evaluation is a pure predicate over state transitions — boundary
   * EOT arrivals, activation closes, buffer consumption, edge delivery —
   * with no quiet-window timer.
   *
   * @protected
   * @returns {void}
   */
  scheduleClosingCheck() {
    if (this.closingCheckScheduled) {
      return;
    }
    this.closingCheckScheduled = true;
    setTimeout(() => {
      this.closingCheckScheduled = false;
      this.#evaluateClosing();
    }, this.closingDebounceMs);
  }
  /**
   * Evaluate the drain-based closing predicate.
   *
   * @returns {void}
   */
  #evaluateClosing() {
    if (this.isRunning()) {
      return;
    }
    const exports = this.graph.exports().filter((exp) => exp.direction === "inport");
    for (const exp of exports) {
      const port = this.processes[exp.internal.node]?.component?.inPorts.ports[exp.internal.port];
      if (!port) {
        return;
      }
      let external = 0;
      let terminal = 0;
      for (const socket of port.sockets) {
        if (!socket) {
          continue;
        }
        const fromInternal = socket.from?.process && this.processes[socket.from.process.id];
        const toInternal = socket.to?.process && this.processes[socket.to.process.id];
        if (fromInternal && toInternal) {
          continue;
        }
        external += 1;
        if (socket.isTerminal()) {
          terminal += 1;
        }
      }
      if (external === 0 || terminal !== external) {
        return;
      }
    }
    for (const name of Object.keys(this.processes)) {
      const component = this.processes[name]?.component;
      if (!component || component.load !== 0) {
        return;
      }
    }
    for (const connection of this.connections) {
      if ((connection.edge?.pendingDeliveries ?? 0) > 0) {
        return;
      }
    }
    this.setStarted(false);
  }
  /**
   * Get the current debug mode of the network.
   *
   * @returns {boolean}
   */
  getDebug() {
    return this.debug;
  }
  /**
   * Enable or disable debug mode, propagating the setting to all sockets and
   * subgraph networks.
   *
   * @param {boolean} active
   */
  setDebug(active) {
    if (active === this.debug) {
      return;
    }
    this.debug = active;
    this.connections.forEach((socket) => {
      socket.setDebug(active);
    });
    Object.keys(this.processes).forEach((processId) => {
      const process2 = this.processes[processId];
      if (!process2.component) {
        return;
      }
      const instance = process2.component;
      if (instance.isSubgraph()) {
        const inst = (
          /** @type {import("../components/Subgraph.js").Subgraph} */
          instance
        );
        inst.network.setDebug(active);
      }
    });
  }
  /**
   * Enable Flowtrace recording for this network, registering the graph and
   * all existing subgraph networks under the given name. Passing a falsy
   * value disables tracing.
   *
   * @param {import("./Flowtrace.js").Flowtrace|null} flowtrace
   * @param {string|null} [name]
   * @param {boolean} [main]
   */
  setFlowtrace(flowtrace, name = null, main = true) {
    if (!flowtrace) {
      this.flowtraceName = null;
      this.flowtrace = null;
      return;
    }
    if (this.flowtrace) {
      return;
    }
    this.flowtrace = flowtrace;
    this.flowtraceName = name || this.graph.name;
    this.flowtrace.addGraph(
      this.flowtraceName,
      exportFbpJson(this.graph),
      main
    );
    Object.keys(this.processes).forEach((nodeId) => {
      const node = this.processes[nodeId];
      const inst = (
        /** @type {import("../components/Subgraph.js").Subgraph} */
        node.component
      );
      if (!inst.isSubgraph() || !inst.network) {
        return;
      }
      inst.network.setFlowtrace(this.flowtrace, node.componentName, false);
    });
  }
};

// node_modules/@noflo/noflo/src/lib/NoFlo.js
import { exportFbpJson as exportFbpJson3, GraphModel as GraphModel5, importFbpJson as importFbpJson3 } from "./graph.js";

// node_modules/@noflo/noflo/src/lib/Flowtrace.js
var EVENT_TYPE = {
  DATA: 1,
  BEGIN_BRACKET: 2,
  END_BRACKET: 3,
  ERROR: 4,
  CONSOLE: 5,
  LIFECYCLE: 6,
  CONNECTION_OPEN: 11,
  CONNECTION_CLOSE: 12,
  ACTIVATION_BEGIN: 13,
  ACTIVATION_END: 14,
  STRANDED: 15
};
var LIFECYCLE_CODE = {
  START: 1,
  STOP: 2,
  SAFE_MODE: 3,
  FAILED: 4,
  PAUSED: 5,
  RESUMED: 6
};
var TRACE_FORMAT_VERSION = 1;
function frugalize(value) {
  if (value === null) {
    return null;
  }
  if (typeof value !== "object" && typeof value !== "function") {
    return value;
  }
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return `DATA ${typeof value}`;
  }
}
var Flowtrace = class {
  /**
   * @param {object} [options]
   * @param {any} [options.runtimeMetadata] Free-form identifying
   *   information embedded in the snapshot (runtime name, host, version).
   * @param {number} [options.timestampMs] Recording start time; defaults to
   *   construction time.
   */
  constructor(options = {}) {
    const { runtimeMetadata = null, timestampMs = Date.now() } = options ?? {};
    this.graphs = {};
    this.mainGraphName = null;
    this.runtimeMetadata = runtimeMetadata;
    this.timestampMs = timestampMs;
    this.events = [];
  }
  /**
   * Name of the main graph, as the duck-typed contract exposes it.
   *
   * @returns {string|null}
   */
  get mainGraph() {
    return this.mainGraphName;
  }
  /**
   * Register a graph definition with the recording. The main network passes
   * its definition with `main = true`; subgraph networks register under
   * their component names.
   *
   * @param {string} graphName
   * @param {any} graphDefinition
   * @param {boolean} [main]
   * @returns {void}
   */
  addGraph(graphName, graphDefinition, main = false) {
    this.graphs[graphName] = graphDefinition;
    if (main || this.mainGraphName === null) {
      this.mainGraphName = graphName;
    }
  }
  /**
   * Record a network packet event. Accepts the duck-typed event names the
   * network emits: `network:data`, `network:begingroup`,
   * `network:endgroup`.
   *
   * @param {string} event
   * @param {FlowtracePacketPort|null} src
   * @param {FlowtracePacketPort|null} tgt
   * @param {string} graph
   * @param {object} payload
   * @returns {void}
   */
  addNetworkPacket(event, src, tgt, graph, payload) {
    let eventType;
    let value;
    switch (event) {
      case "network:data": {
        eventType = EVENT_TYPE.DATA;
        value = payload.data;
        break;
      }
      case "network:begingroup": {
        eventType = EVENT_TYPE.BEGIN_BRACKET;
        value = payload.data ?? payload.group ?? "";
        break;
      }
      case "network:endgroup": {
        eventType = EVENT_TYPE.END_BRACKET;
        value = payload.data ?? payload.group ?? "";
        break;
      }
      default: {
        throw new Error(`Unknown network packet event ${event}`);
      }
    }
    this.#record(eventType, value, {
      graph,
      subgraph: payload.subgraph ?? null,
      src: src ?? null,
      tgt: tgt ?? null,
      datatype: payload.datatype ?? null,
      schema: payload.schema ?? null
    });
  }
  /**
   * Record a network start as a `0x06 LIFECYCLE` START event.
   *
   * @param {string} graph
   * @returns {void}
   */
  addNetworkStarted(graph) {
    this.#record(EVENT_TYPE.LIFECYCLE, LIFECYCLE_CODE.START, { graph });
  }
  /**
   * Record a network stop as a `0x06 LIFECYCLE` STOP event.
   *
   * @param {string} graph
   * @returns {void}
   */
  addNetworkStopped(graph) {
    this.#record(EVENT_TYPE.LIFECYCLE, LIFECYCLE_CODE.STOP, { graph });
  }
  /**
   * Record a boundary stream lifecycle event: an external sender opened or
   * closed a stream into one of the graph's inports (`0x0b
   * CONNECTION_OPEN` / `0x0c CONNECTION_CLOSE`). The sender is outside the
   * graph, so only the receiving side is identified. Driver-attached
   * streams and IIP single-packet streams both surface here, making the
   * boundary end-of-transmission observable in the artifact (work
   * documents #40, #45).
   *
   * @param {string} graph
   * @param {{ node: string, port: string }|null} target
   * @param {boolean} open
   * @returns {void}
   */
  addNetworkConnection(graph, target, open) {
    this.#record(
      open ? EVENT_TYPE.CONNECTION_OPEN : EVENT_TYPE.CONNECTION_CLOSE,
      null,
      { graph, tgt: target ?? null }
    );
  }
  /**
   * Record a stranded-framing diagnostic as a `0x0f STRANDED` event:
   * bracket framing buffered on an input port whose senders have all
   * terminally disconnected — the framing can never pair with arriving
   * data. The residue is reported, not consumed; the payload is the flat
   * tuple `[node, port, scope|null, open_count, close_count]` (work
   * document #40 update #13).
   *
   * @param {string} graph
   * @param {string} node
   * @param {string} port
   * @param {string|null} scope
   * @param {number} open
   * @param {number} close
   * @returns {void}
   */
  addNetworkStranded(graph, node, port, scope, open, close) {
    this.#record(EVENT_TYPE.STRANDED, [node, port, scope, open, close], {
      graph
    });
  }
  /**
   * Record a process error as a `0x04 ERROR` event. The payload is the
   * exception string, exactly as the wire carries it; the detail an
   * exception object would add is intentionally not preserved.
   *
   * @param {string} graph
   * @param {any} error
   * @returns {void}
   */
  addNetworkError(graph, error) {
    const err = error ?? "unknown error";
    const message = typeof err?.message === "string" ? err.message : String(err);
    this.#record(EVENT_TYPE.ERROR, message, { graph });
  }
  /**
   * Record process output as a `0x05 CONSOLE` event. The payload is the
   * positional tuple `[stream_id, log_string]`.
   *
   * @param {string} graph
   * @param {object} payload
   * @param {string} [payload.stream]
   * @param {any} [payload.message]
   * @returns {void}
   */
  addNetworkOutput(graph, payload) {
    const message = typeof payload?.message === "string" ? payload.message : String(payload?.message ?? "");
    this.#record(EVENT_TYPE.CONSOLE, [payload?.stream ?? "output", message], {
      graph
    });
  }
  /**
   * Record a process activation as an `0x0d ACTIVATION_BEGIN` event. The
   * payload is the positional tuple `[node_id, load]` — the load after the
   * increment (work document #43).
   *
   * @param {string} graph
   * @param {string} nodeId
   * @param {number} load
   * @param {string[]|null} [subgraph] Subgraph path of the event.
   * @returns {void}
   */
  addNetworkActivation(graph, nodeId, load, subgraph = null) {
    this.#record(EVENT_TYPE.ACTIVATION_BEGIN, [nodeId, load], {
      graph,
      subgraph: subgraph ?? null
    });
  }
  /**
   * Record a process deactivation as an `0x0e ACTIVATION_END` event. The
   * payload is the positional tuple `[node_id, load]` — the load after the
   * decrement; `0` marks the node going idle (work document #43).
   *
   * @param {string} graph
   * @param {string} nodeId
   * @param {number} load
   * @param {string[]|null} [subgraph] Subgraph path of the event.
   * @returns {void}
   */
  addNetworkDeactivation(graph, nodeId, load, subgraph = null) {
    this.#record(EVENT_TYPE.ACTIVATION_END, [nodeId, load], {
      graph,
      subgraph: subgraph ?? null
    });
  }
  /**
   * Append an event to the stream.
   *
   * @param {number} eventType
   * @param {any} payload
   * @param {FlowtraceEventMeta} meta
   * @returns {void}
   */
  #record(eventType, payload, meta) {
    this.events.push({
      timestampMs: Date.now(),
      eventType,
      payload,
      meta
    });
  }
  /**
   * Export the recording as the JSON rendering of the streamable trace file
   * (work document #4 §10): the `0xF0` snapshot content first, then the
   * event stream as delta-encoded tuples. Payloads are frugalized lazily at
   * export time — an unserializable DATA value becomes a type-named
   * placeholder instead of failing the recording.
   *
   * The binary encoding of this state is
   * `assembleTraceFileFromRecorder` in `@noflo/fbp-protocol`; a round-trip
   * spec in `@noflo/runtime` pins the two representations together.
   *
   * @returns {FlowtraceJson}
   */
  toJSON() {
    return {
      snapshot: {
        formatVersion: TRACE_FORMAT_VERSION,
        timestampMs: this.timestampMs,
        runtimeMetadata: this.runtimeMetadata,
        graphDefinition: this.mainGraphName ? this.graphs[this.mainGraphName] ?? null : null,
        graphs: { ...this.graphs },
        main: this.mainGraphName
      },
      chunks: this.events.map((event) => [
        Math.max(0, event.timestampMs - this.timestampMs),
        event.eventType,
        frugalize(event.payload),
        event.meta
      ])
    };
  }
};

// node_modules/@noflo/noflo/src/components/StubComponent.js
var StubNotImplementedError = class extends Error {
  /**
   * @param {string} componentName - Full name of the unimplemented component
   * @param {string|null} [portName] - The triggering inport the data
   *   packet arrived on, when known
   */
  constructor(componentName, portName = null) {
    const at = portName ? ` on inport '${portName}'` : "";
    super(
      `Component ${componentName} is not implemented: a stub component received data${at}`
    );
    this.name = "StubNotImplementedError";
    this.componentName = componentName;
  }
};
var StubComponent = class _StubComponent extends Component {
  /**
   * Create a stub component for the given declared signature.
   *
   * @param {StubComponentOptions} [options]
   */
  constructor(options = {}) {
    const policy = options.onPacket ?? "throw";
    if (policy !== "throw" && policy !== "drop") {
      throw new Error(
        `Unknown StubComponent packet policy '${policy}' \u2014 use "throw" (default) or "drop"`
      );
    }
    if (typeof options.process === "function") {
      throw new Error(
        "StubComponent cannot take a process function: the placeholder behavior is fixed by the stub contract"
      );
    }
    super({
      ...options,
      // A silent placeholder never forwards brackets: output ports are
      // declared but never sourced (work document #19). Enforced after the
      // spread so a caller cannot unsilence the placeholder
      forwardBrackets: {}
    });
    this.stubName = options.name ?? null;
    this.packetPolicy = policy;
    const triggering = Object.keys(this.inPorts.ports).filter(
      (name) => !/** @type {import("../lib/InPort.js").default} */
      this.inPorts.ports[name].options.control
    );
    if (policy === "throw" && triggering.length === 0) {
      throw new Error(
        `StubComponent ${this.stubName ?? "(unnamed)"} declares no triggering inports: the "throw" packet policy could never fire \u2014 declare the config ports control: true, add a triggering inport, or use the "drop" policy`
      );
    }
    this.process((input, output) => {
      this.#absorb(input, output);
    });
  }
  /**
   * Absorb the activation's buffered input: every non-control inport's
   * buffer for the activation's scope is drained — data and brackets alike
   * — and nothing is emitted. Control ports are skipped: their buffers are
   * standing state read non-consumingly, and they never fire the process.
   *
   * Under the `throw` policy, data in the drained input raises
   * {@link StubNotImplementedError}; brackets alone stay silent.
   *
   * @param {import("../lib/ProcessInput.js").default} input
   * @param {import("../lib/ProcessOutput.js").default} output
   * @returns {void}
   */
  #absorb(input, output) {
    let dataArrival = null;
    Object.keys(this.inPorts.ports).forEach((portName) => {
      const port = (
        /** @type {import("../lib/InPort.js").default} */
        this.inPorts.ports[portName]
      );
      if (port.options.control) {
        return;
      }
      if (port.isAddressable()) {
        const attached = (
          /** @type {number[]} */
          input.attached(portName)
        );
        for (const index of attached) {
          for (; ; ) {
            const ip = (
              /** @type {IP|void} */
              input.get([
                portName,
                /** @type {number} */
                index
              ])
            );
            if (!ip) {
              break;
            }
            if (ip.type === "data" && !dataArrival) {
              dataArrival = { port: portName, index };
            }
          }
        }
        return;
      }
      for (; ; ) {
        const ip = (
          /** @type {IP|void} */
          input.get(portName)
        );
        if (!ip) {
          break;
        }
        if (ip.type === "data" && !dataArrival) {
          dataArrival = { port: portName, index: null };
        }
      }
    });
    if (this.packetPolicy === "throw" && dataArrival) {
      const componentName = this.componentName ?? this.stubName ?? "unknown component";
      output.done(new StubNotImplementedError(componentName, dataArrival.port));
      return;
    }
    output.done();
  }
  /**
   * Stub components self-describe as unimplemented: UIs, runtimes, and
   * flowtraces label "not yet implemented" from this authoritative runtime
   * information instead of inferring from registry lookups that can drift.
   *
   * @returns {boolean}
   */
  isStub() {
    return true;
  }
  /**
   * Build a stub component from a component signature: the declared ports
   * as data, with no implementation behind them.
   *
   * Both signature entry paths the contract defines are accepted:
   *
   * - The full signature shape (publish-time manifest entries, registry
   *   protocol detail answers): ports carry `name`, `datatype`,
   *   `addressable`, `description`, `required`, and — inports only —
   *   `control`.
   * - The narrower on-disk sidecar shape noflo-ui materializes
   *   (`components/<name>.json`): ports carry `name`, `type` (the
   *   datatype), and `addressable`. Missing datatypes default to `all`
   *   and missing flags to absent/false, matching the materializer's
   *   emission.
   *
   * The mapping is field-for-field lossless: `type` and `datatype` name
   * the same port option, `control: true` maps onto the core gate-port
   * option of the same name. The signature stays data — the stub
   * validates shape, not semantics.
   *
   * @param {string} name - Full component name (e.g. `fs/ReadFile`),
   *   recorded as the stub's declared name
   * @param {Object<string, any>} signature - The component signature:
   *   `description`, `icon`, `inports`, `outports`
   * @param {{ onPacket?: StubPacketPolicy }} [options] - Stub-specific
   *   options; see {@link StubComponentOptions}
   * @returns {StubComponent}
   */
  static fromSignature(name, signature, options = {}) {
    if (typeof name !== "string" || !name) {
      throw new Error("StubComponent.fromSignature requires a component name");
    }
    if (!signature || typeof signature !== "object") {
      throw new Error(
        `StubComponent ${name}: the signature must be an object with inports/outports arrays`
      );
    }
    return new _StubComponent({
      name,
      description: typeof signature.description === "string" ? signature.description : "",
      icon: typeof signature.icon === "string" ? signature.icon : "",
      inPorts: signaturePorts(name, "inports", signature.inports),
      outPorts: signaturePorts(name, "outports", signature.outports),
      ...options
    });
  }
};
function signaturePorts(componentName, direction, ports) {
  const mapped = {};
  if (ports == null) {
    return mapped;
  }
  if (!Array.isArray(ports)) {
    throw new Error(
      `StubComponent ${componentName}: signature ${direction} must be an array of port entries`
    );
  }
  ports.forEach((port, position) => {
    const at = `${direction}[${position}]`;
    if (!port || typeof port !== "object") {
      throw new Error(
        `StubComponent ${componentName}: signature ${at} is not a port entry object`
      );
    }
    if (typeof port.name !== "string" || !port.name) {
      throw new Error(
        `StubComponent ${componentName}: signature ${at} is missing a port name`
      );
    }
    if (direction === "outports" && port.control !== void 0) {
      throw new Error(
        `StubComponent ${componentName}: signature ${at} declares control on an outport \u2014 control is an inport flag (work document #40)`
      );
    }
    if (mapped[port.name]) {
      throw new Error(
        `StubComponent ${componentName}: signature ${direction} declares port '${port.name}' twice`
      );
    }
    const datatype = port.datatype ?? port.type;
    if (datatype !== void 0 && typeof datatype !== "string") {
      throw new Error(
        `StubComponent ${componentName}: signature ${at} port '${port.name}' has a non-string datatype`
      );
    }
    const portOptions = {
      // The sidecar shape names the datatype `type`; the manifest shape
      // `datatype`. Both map onto the port option of the latter name
      datatype: datatype ?? "all",
      addressable: flag(
        componentName,
        at,
        port.name,
        "addressable",
        port.addressable
      ),
      description: typeof port.description === "string" ? port.description : ""
    };
    if (port.required !== void 0) {
      portOptions.required = flag(
        componentName,
        at,
        port.name,
        "required",
        port.required
      );
    }
    if (port.control !== void 0) {
      portOptions.control = flag(
        componentName,
        at,
        port.name,
        "control",
        port.control
      );
    }
    mapped[port.name] = portOptions;
  });
  return mapped;
}
function flag(componentName, at, portName, flagName, value) {
  if (value === void 0) {
    return void 0;
  }
  if (typeof value !== "boolean") {
    throw new Error(
      `StubComponent ${componentName}: signature ${at} port '${portName}' has a non-boolean ${flagName} flag`
    );
  }
  return value;
}

// node_modules/@noflo/noflo/src/lib/AsPromise.js
import { GraphModel as GraphModel3 } from "./graph.js";
function normalizeOptions(options, component) {
  if (!options) {
    options = {};
  }
  if (!options.name && typeof component === "string") {
    options.name = component;
  }
  if (!options.loader) {
    options.loader = new ComponentLoader({
      registry: options.registry
    });
  }
  if (!options.raw) {
    options.raw = false;
  }
  if (!options.asyncDelivery) {
    options.asyncDelivery = false;
  }
  return options;
}
function prepareNetwork(component, options) {
  if (component instanceof GraphModel3) {
    const network = new Network(component, {
      ...options,
      componentLoader: options.loader
    });
    return network.connect();
  }
  if (!options.loader) {
    return Promise.reject(new Error("No component loader provided"));
  }
  return options.loader.load(component, {}).then((instance) => {
    const graph = new GraphModel3(
      options.name === void 0 ? {} : { name: options.name }
    );
    const nodeName = options.name || "AsPromise";
    graph.addNode({ entity_id: nodeName, component });
    const inPorts = instance.inPorts.ports;
    const outPorts = instance.outPorts.ports;
    Object.keys(inPorts).forEach((port) => {
      graph.addExport({
        direction: "inport",
        public: port,
        internal: { node: nodeName, port }
      });
    });
    Object.keys(outPorts).forEach((port) => {
      graph.addExport({
        direction: "outport",
        public: port,
        internal: { node: nodeName, port }
      });
    });
    const network = new Network(graph, {
      ...options,
      componentLoader: options.loader,
      instances: { [nodeName]: instance }
    });
    return network.connect();
  });
}
function runNetwork(network, inputs) {
  return new Promise((resolve, reject) => {
    let inSockets = {};
    const received = [];
    const outPorts = network.graph.exports().filter((exp) => exp.direction === "outport");
    let outSockets = {};
    outPorts.forEach((portDef) => {
      const process2 = network.getNode(portDef.internal.node);
      if (!process2) {
        return;
      }
      if (!process2.component) {
        return;
      }
      outSockets[portDef.public] = createSocket(
        {},
        {
          debug: false
        }
      );
      network.subscribeSocket(outSockets[portDef.public]);
      process2.component.outPorts.ports[portDef.internal.port].attach(
        outSockets[portDef.public]
      );
      outSockets[portDef.public].from = {
        process: process2,
        port: portDef.internal.port
      };
      outSockets[portDef.public].addEventListener("ip", (event) => {
        const ip = event.detail;
        const res = {};
        res[portDef.public] = ip;
        received.push(res);
      });
    });
    let onEnd;
    const onError = (event) => {
      network.removeEventListener("process-error", onError);
      const err = event.detail;
      reject(err.error);
      network.removeEventListener("end", onEnd);
    };
    network.addEventListener("process-error", onError);
    onEnd = () => {
      network.removeEventListener("end", onEnd);
      Object.keys(outSockets).forEach((port) => {
        const socket = outSockets[port];
        socket.from.process.component.outPorts[socket.from.port].detach(socket);
      });
      outSockets = {};
      inSockets = {};
      resolve(received);
      network.removeEventListener("process-error", onError);
    };
    network.addEventListener("end", onEnd);
    network.start().then(() => {
      for (let i = 0; i < inputs.length; i += 1) {
        const inputMap = inputs[i];
        const keys = Object.keys(inputMap);
        for (let j = 0; j < keys.length; j += 1) {
          const port = keys[j];
          const value = inputMap[port];
          if (!inSockets[port]) {
            const portDef = network.graph.exports().find((exp) => exp.direction === "inport" && exp.public === port);
            if (!portDef) {
              reject(new Error(`Port ${port} not available in the graph`));
              return;
            }
            const process2 = network.getNode(portDef.internal.node);
            if (!process2) {
              reject(
                new Error(
                  `Process ${portDef.internal.node} for port ${port} not available in the graph`
                )
              );
              return;
            }
            if (!process2.component) {
              reject(
                new Error(
                  `Process ${portDef.internal.node} for port ${port} not available in the graph`
                )
              );
              return;
            }
            inSockets[port] = createSocket(
              {},
              {
                debug: false
              }
            );
            network.subscribeSocket(inSockets[port]);
            inSockets[port].to = {
              process: process2,
              port
            };
            process2.component.inPorts.ports[portDef.internal.port].attach(
              inSockets[port]
            );
          }
          try {
            if (IP.isIP(value)) {
              inSockets[port].post(value);
            } else {
              inSockets[port].post(new IP("data", value));
            }
          } catch (e) {
            reject(e);
            network.removeEventListener("process-error", onError);
            network.removeEventListener("end", onEnd);
            return;
          }
        }
        Promise.all(keys.map((port) => inSockets[port].disconnect())).catch(
          () => {
          }
        );
      }
    }, reject);
  });
}
function getType(inputs, network) {
  if (typeof inputs !== "object" || !inputs) {
    return "simple";
  }
  if (Array.isArray(inputs)) {
    const maps = inputs.filter((entry) => getType(entry, network) === "map");
    if (maps.length === inputs.length) {
      return "sequence";
    }
    return "simple";
  }
  const keys = Object.keys(inputs);
  if (!keys.length) {
    return "simple";
  }
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (!network.graph.exports().some((exp) => exp.direction === "inport" && exp.public === key)) {
      return "simple";
    }
  }
  return "map";
}
function prepareInputMap(inputs, inputType, network) {
  if (inputType === "sequence") {
    return inputs;
  }
  if (inputType === "map") {
    return [inputs];
  }
  const exportedInports = network.graph.exports().filter((exp) => exp.direction === "inport");
  let inPort = exportedInports.length > 0 ? exportedInports[0].public : null;
  if (!inPort) {
    return {};
  }
  if (exportedInports.some((exp) => exp.public === "in")) {
    inPort = "in";
  }
  const map = {};
  map[inPort] = inputs;
  return [map];
}
function normalizeOutput(values, options) {
  if (options.raw) {
    return values;
  }
  const result = [];
  let previous = null;
  let current = result;
  values.forEach((packet) => {
    if (packet.type === "openBracket") {
      previous = current;
      current = [];
      previous.push(current);
    }
    if (packet.type === "data") {
      current.push(packet.data);
    }
    if (packet.type === "closeBracket") {
      current = /** @type {Array<any>} */
      previous;
    }
  });
  if (result.length === 1) {
    return result[0];
  }
  return result;
}
function sendOutputMap(outputs, resultType, options) {
  const errors = outputs.filter((map) => map.error != null).map((map) => map.error);
  if (errors.length) {
    return Promise.reject(normalizeOutput(errors, options));
  }
  if (resultType === "sequence") {
    return Promise.resolve(
      outputs.map((map) => {
        const res = {};
        Object.keys(map).forEach((key) => {
          const val = map[key];
          if (options.raw) {
            res[key] = val;
            return;
          }
          res[key] = normalizeOutput([val], options);
        });
        return res;
      })
    );
  }
  const mappedOutputs = {};
  outputs.forEach((map) => {
    Object.keys(map).forEach((key) => {
      const val = map[key];
      if (!mappedOutputs[key]) {
        mappedOutputs[key] = [];
      }
      mappedOutputs[key].push(val);
    });
  });
  const outputKeys = Object.keys(mappedOutputs);
  const withValue = outputKeys.filter(
    (outport) => mappedOutputs[outport].length > 0
  );
  if (withValue.length === 0) {
    return Promise.resolve(null);
  }
  if (withValue.length === 1 && resultType === "simple") {
    return Promise.resolve(
      normalizeOutput(mappedOutputs[withValue[0]], options)
    );
  }
  const result = {};
  Object.keys(mappedOutputs).forEach((port) => {
    const packets = mappedOutputs[port];
    result[port] = normalizeOutput(packets, options);
  });
  return Promise.resolve(result);
}
function asPromise(component, options) {
  if (!component) {
    throw new Error("No component or graph provided");
  }
  options = normalizeOptions(options, component);
  return (inputs) => prepareNetwork(component, options).then((network) => {
    if (options.networkCallback) {
      options.networkCallback(network);
    }
    const resultType = getType(inputs, network);
    const inputMap = prepareInputMap(inputs, resultType, network);
    return runNetwork(network, inputMap).then(
      (outputMap) => sendOutputMap(outputMap, resultType, options)
    );
  });
}

// node_modules/@noflo/noflo/src/lib/NoFlo.js
function createNetwork(graphInstance, options = {}) {
  const network = new Network(graphInstance, options);
  const promise = Promise.resolve().then(() => {
    if (options.delay) {
      return network;
    }
    return network.connect().then(() => network.start());
  });
  return promise;
}
var NoFlo_default = {
  GraphModel: GraphModel4,
  importFbpJson: importFbpJson2,
  exportFbpJson: exportFbpJson2,
  ComponentLoader,
  Component,
  StubComponent,
  StubNotImplementedError,
  InPorts,
  OutPorts,
  InPort,
  OutPort,
  internalSocket: InternalSocket_exports,
  IP,
  createNetwork,
  asPromise
};
export {
  Component,
  ComponentLoader,
  EVENT_TYPE,
  Flowtrace,
  GraphModel5 as GraphModel,
  IP,
  InPort,
  InPorts,
  LIFECYCLE_CODE,
  Network,
  OutPort,
  OutPorts,
  PORT_BEHAVIOR_KEYS,
  StubComponent,
  StubNotImplementedError,
  applyPortMetadata,
  asPromise,
  createNetwork,
  NoFlo_default as default,
  exportFbpJson3 as exportFbpJson,
  importFbpJson3 as importFbpJson,
  InternalSocket_exports as internalSocket
};
