var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@noflo/fbp-protocol/src/schema-identity.js
var schema_identity_exports = {};
__export(schema_identity_exports, {
  SCHEMA_DIGEST_HEX_LENGTH: () => SCHEMA_DIGEST_HEX_LENGTH,
  SCHEMA_URN_PREFIX: () => SCHEMA_URN_PREFIX,
  canonicalizeJson: () => canonicalizeJson,
  collectSchemaRefs: () => collectSchemaRefs,
  detectRefCycles: () => detectRefCycles,
  digestSchema: () => digestSchema,
  isValidSchemaId: () => isValidSchemaId,
  normalizeSchemaBody: () => normalizeSchemaBody,
  parseSchemaRef: () => parseSchemaRef,
  pinSchemaRefs: () => pinSchemaRefs,
  schemaUrn: () => schemaUrn
});
function isValidSchemaId(id) {
  return typeof id === "string" && /^[a-z][a-z0-9_-]*\/[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(id);
}
function parseSchemaRef(ref) {
  if (typeof ref !== "string" || ref.length === 0) {
    throw new TypeError("schema reference must be a non-empty string");
  }
  let rest = ref;
  if (rest.startsWith(SCHEMA_URN_PREFIX)) {
    rest = rest.slice(SCHEMA_URN_PREFIX.length);
  } else if (ref.includes("://") || ref.startsWith("urn:")) {
    throw new TypeError(
      `unsupported schema reference '${ref}': only ns/name authoring sugar and urn:noflo:\u2026 published form are accepted`
    );
  }
  const hashIndex = rest.indexOf("#");
  const fragment = hashIndex === -1 ? null : rest.slice(hashIndex + 1);
  if (hashIndex !== -1) rest = rest.slice(0, hashIndex);
  const atSign = rest.lastIndexOf("@");
  let digest = null;
  if (atSign !== -1) {
    digest = rest.slice(atSign + 1);
    rest = rest.slice(0, atSign);
    if (!/^[0-9a-f]{64}$/.test(digest)) {
      throw new TypeError(
        `schema reference '${ref}' carries a malformed digest`
      );
    }
  }
  if (!isValidSchemaId(rest)) {
    throw new TypeError(`schema reference '${ref}' is not a valid ns/name id`);
  }
  if (fragment !== null && !fragment.startsWith("/")) {
    throw new TypeError(
      `schema reference '${ref}' carries a non-JSON-Pointer fragment`
    );
  }
  return { id: rest, digest, fragment };
}
function schemaUrn(id, digest, fragment = null) {
  if (!isValidSchemaId(id)) {
    throw new TypeError(`'${id}' is not a valid ns/name id`);
  }
  if (typeof digest !== "string" || digest.length !== SCHEMA_DIGEST_HEX_LENGTH) {
    throw new TypeError("schema digest must be a 64-character hex string");
  }
  return `${SCHEMA_URN_PREFIX}${id}@${digest}${fragment === null ? "" : `#${fragment}`}`;
}
function normalizeSchemaBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("schema body must be an object");
  }
  if (body.$id === void 0) {
    return { ...body };
  }
  if (typeof body.$id !== "string") {
    throw new TypeError("schema $id must be a string");
  }
  const parsed = parseSchemaRef(body.$id);
  if (parsed.digest !== null || parsed.fragment !== null) {
    throw new TypeError(
      `schema $id '${body.$id}' must be a bare ns/name id: a document cannot name a revision of itself`
    );
  }
  return { ...body, $id: parsed.id };
}
async function digestSchema(body) {
  const canonical = canonicalizeJson(normalizeSchemaBody(body));
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function collectSchemaRefs(body) {
  const refs = [];
  const seen = /* @__PURE__ */ new Set();
  walk(body, (value) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.$ref === "string" && !value.$ref.startsWith("#")) {
      if (!seen.has(value.$ref)) {
        seen.add(value.$ref);
        refs.push(value.$ref);
      }
    }
  });
  return refs;
}
async function pinSchemaRefs(body, resolveDigest) {
  const refs = collectSchemaRefs(body);
  const pinned = /* @__PURE__ */ new Map();
  for (const ref of refs) {
    const digest = await resolveDigest(ref);
    if (digest === null || digest === void 0) {
      throw new Error(`unresolvable schema reference '${ref}'`);
    }
    pinned.set(ref, digest);
  }
  const walkPinned = (value) => {
    if (Array.isArray(value)) return value.map(walkPinned);
    if (value !== null && typeof value === "object") {
      const out = {};
      for (const [key, entry] of Object.entries(value)) {
        if (key === "$ref" && typeof entry === "string" && !entry.startsWith("#") && pinned.has(entry)) {
          const parsed = parseSchemaRef(entry);
          out[key] = schemaUrn(
            parsed.id,
            /** @type {string} */
            pinned.get(entry),
            parsed.fragment
          );
          continue;
        }
        out[key] = walkPinned(entry);
      }
      return out;
    }
    return value;
  };
  return (
    /** @type {Record<string, any>} */
    walkPinned(body)
  );
}
function detectRefCycles(documents) {
  const edges = /* @__PURE__ */ new Map();
  for (const { id, body } of documents) {
    const targets = new Set(
      collectSchemaRefs(body).map((ref) => parseSchemaRef(ref).id).filter((target) => target !== id)
    );
    edges.set(id, targets);
  }
  const color = /* @__PURE__ */ new Map();
  const GRAY = 1;
  const BLACK = 2;
  for (const start of edges.keys()) {
    if (color.get(start) === BLACK) continue;
    const path = [start];
    color.set(start, GRAY);
    const stack = [[start, [...edges.get(start) ?? []]]];
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const [current, targets] = top;
      const next = targets.pop();
      if (next === void 0) {
        color.set(current, BLACK);
        stack.pop();
        path.pop();
        continue;
      }
      const nextColor = color.get(next) ?? 0;
      if (nextColor === GRAY) {
        return [...path.slice(path.indexOf(next)), next];
      }
      if (nextColor === BLACK) continue;
      color.set(next, GRAY);
      path.push(next);
      stack.push([next, [...edges.get(next) ?? []]]);
    }
  }
  return null;
}
function canonicalizeJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${canonicalString(key)}:${canonicalizeJson(value[key])}`).join(",")}}`;
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return canonicalNumber(value);
    case "string":
      return canonicalString(value);
    default:
      throw new TypeError(
        "canonicalization requires JSON data: strings, numbers, booleans, null, arrays, objects"
      );
  }
}
function canonicalNumber(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("non-finite numbers cannot be canonicalized");
  }
  return String(value);
}
function canonicalString(value) {
  for (const char of value) {
    const code = (
      /** @type {number} */
      char.codePointAt(0)
    );
    if (code >= 55296 && code <= 57343) {
      throw new TypeError(
        "strings carrying lone surrogates cannot be canonicalized"
      );
    }
  }
  return JSON.stringify(value);
}
function walk(value, visit) {
  visit(value);
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, visit);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) walk(entry, visit);
  }
}
var SCHEMA_URN_PREFIX, SCHEMA_DIGEST_HEX_LENGTH;
var init_schema_identity = __esm({
  "node_modules/@noflo/fbp-protocol/src/schema-identity.js"() {
    SCHEMA_URN_PREFIX = "urn:noflo:";
    SCHEMA_DIGEST_HEX_LENGTH = 64;
  }
});

// node_modules/@noflo/fbp-protocol/src/schemas/catalog-runtime.js
var RuntimeCatalog = {
  $schema: "urn:noflo:noflo/meta-catalog@278e7057c1cce1a8f33fb75aab757450cbdcde7bb5135858d18ac0ca1bfe62c9",
  title: "The runtime metadata catalog",
  description: "Config-class runtime behavior (work document #37 \xA73.2): keys that change what the network does. They are graph state riding insert payloads, merge as one map per entity, and are never droppable. runtime.highWaterMark is the edge backpressure buffer size the field SPEC \xA75 already names (work document #46's inspector field); a config edit is a node/edge re-instantiation trigger.",
  entries: {
    "runtime.highWaterMark": {
      schema: {
        type: "integer",
        minimum: 1
      },
      class: "config",
      kinds: ["edge"]
    }
  }
};

// node_modules/@noflo/fbp-protocol/src/schemas/catalog-std.js
var StdCatalog = {
  title: "The std datatype catalog",
  description: "Maps the 13 core datatypes to form/validation behavior (work document #37 \xA73.3). Where a natural JSON Schema exists, one is given; where none exists, the mapping is the explicit marker opaque \u2014 no form is rendered, IIP validation is skipped, and UIs may still render non-form affordances. Opaque is a defined outcome, not a gap: non-JSON-able packets generally hit the same path, since validation and forms apply to JSON-able data only. all carries the empty schema: it accepts anything and renders a raw JSON editor.",
  types: {
    string: {
      schema: {
        type: "string"
      }
    },
    number: {
      schema: {
        type: "number"
      }
    },
    int: {
      schema: {
        type: "integer"
      }
    },
    boolean: {
      schema: {
        type: "boolean"
      }
    },
    array: {
      schema: {
        type: "array"
      }
    },
    object: {
      schema: {
        type: "object"
      }
    },
    color: {
      schema: {
        type: "string",
        format: "color"
      }
    },
    date: {
      schema: {
        type: "string",
        format: "date"
      }
    },
    all: {
      schema: {}
    },
    bang: {
      opaque: true,
      description: "Unit packet \u2014 no payload to validate."
    },
    buffer: {
      opaque: true,
      description: "Binary; MsgPack bin is not JSON. UIs may render a file picker backed by out-of-band transfer."
    },
    function: {
      opaque: true,
      description: "Not serializable as data."
    },
    stream: {
      opaque: true,
      description: "A delivery shape, not a value shape."
    }
  }
};

// node_modules/@noflo/fbp-protocol/src/schemas/catalog-ui.js
var UiCatalog = {
  $schema: "urn:noflo:noflo/meta-catalog@278e7057c1cce1a8f33fb75aab757450cbdcde7bb5135858d18ac0ca1bfe62c9",
  title: "The ui metadata catalog",
  description: "Positional canvas metadata (work document #37 \xA73.2): keys that change only how a graph is drawn. They may travel the 0x05 UI-metadata op, merge per key, and may be dropped by constrained nodes without semantic loss. ui.x and ui.y are the canvas positions of nodes, exported ports, and IIPs (noflo-ui SPEC Appendix A intents); ui.route and ui.routePoints are edge routing (noflo-ui WD #35's live semantics, re-declared here rather than carried over as legacy).",
  entries: {
    "ui.x": {
      schema: {
        type: "number"
      },
      class: "positional",
      kinds: ["node", "export", "iip"]
    },
    "ui.y": {
      schema: {
        type: "number"
      },
      class: "positional",
      kinds: ["node", "export", "iip"]
    },
    "ui.route": {
      schema: {
        type: "string"
      },
      class: "positional",
      kinds: ["edge"]
    },
    "ui.routePoints": {
      schema: {
        type: "array"
      },
      class: "positional",
      kinds: ["edge"]
    }
  }
};

// node_modules/@noflo/fbp-protocol/src/catalogs.js
var CATALOGS = {
  std: StdCatalog,
  ui: UiCatalog,
  runtime: RuntimeCatalog
};
function catalogBody(namespace) {
  const body = CATALOGS[namespace];
  if (!body) {
    throw new TypeError(`unknown default catalog '${namespace}'`);
  }
  return body;
}
async function catalogDigest(namespace) {
  const { digestSchema: digestSchema2 } = await Promise.resolve().then(() => (init_schema_identity(), schema_identity_exports));
  return digestSchema2(catalogBody(namespace));
}

// node_modules/@noflo/fbp-protocol/src/errors.js
var ProtocolError = class extends Error {
  /**
   * Create a protocol error, annotating it with the offending command code
   * when known.
   *
   * @param {string} message
   * @param {number} [opcode] Command code the frame claimed, when known.
   * @param {number} [reason] REASON code classifying the failure for `0x17`
   *   answers (work document #4 update #43): unrecognized opcodes carry
   *   `REASON.UNKNOWN_COMMAND`; receivers answer known-but-malformed
   *   payloads with `REASON.MALFORMED`.
   */
  constructor(message, opcode, reason) {
    super(
      opcode === void 0 ? message : `${message} (opcode 0x${opcode.toString(16)})`
    );
    this.name = "ProtocolError";
    this.opcode = opcode;
    this.reason = reason;
  }
};

// node_modules/@noflo/fbp-protocol/src/constants.js
var PROTOCOL_VERSION = 2;
var ANNOUNCE_ASPECT = "fbp.runtime";
var CMD_AUTH_RESPONSE = 2;
var CAPABILITY = {
  GRAPH_READ: 1,
  GRAPH_EDIT: 2,
  METADATA_SYNC: 4,
  TELEMETRY_READ: 8,
  COMPONENT_READ: 16,
  COMPONENT_WRITE: 32,
  LIFECYCLE_CTRL: 64,
  ADMIN: 128
};
var LIMITATION = {
  FULL_ACCESS: 0,
  HARDWARE_CONSTRAINED: 1,
  PERMISSION_DENIED: 2,
  LINK_SATURATED: 3,
  CONCURRENCY_LOCK: 4
};
var REASON = {
  /** Fallback — discouraged: prefer a specific code. */
  UNSPECIFIED: 0,
  /** The runtime's hardware cannot serve this (same meaning as the `0x02` limitation code). */
  HARDWARE_CONSTRAINED: 1,
  /** The peer's capability grant does not cover this (same meaning as the `0x02` limitation code). */
  PERMISSION_DENIED: 2,
  /** The link or runtime is saturated (same meaning as the `0x02` limitation code). */
  LINK_SATURATED: 3,
  /** Another operation holds the runtime busy (same meaning as the `0x02` limitation code). */
  CONCURRENCY_LOCK: 4,
  /** Known to the protocol generation but outside this runtime's declared surface — e.g. no ephemeral planes, no component writes, a reserved identifier. */
  UNSUPPORTED: 5,
  /** The opcode is not recognized by this runtime. */
  UNKNOWN_COMMAND: 6,
  /** The frame failed structural decode. */
  MALFORMED: 7,
  /** A payload value sits outside the runtime's declared value model. */
  PAYLOAD_UNSUPPORTED: 8,
  /** The targeted component is a declared stub without implementation. */
  STUB: 9,
  /** The command is valid but the runtime's state cannot execute it — e.g. packet send before the plane's network is built. */
  INVALID_STATE: 10,
  /** A referenced object does not exist — unknown plane, unknown exported port. */
  UNKNOWN_TARGET: 11
};
function capabilitiesMask(names) {
  let mask = 0;
  for (const name of names) {
    const bit = CAPABILITY[name];
    if (bit === void 0) {
      throw new ProtocolError(`unknown capability name: ${name}`);
    }
    mask |= bit;
  }
  return mask;
}
var CMD_CRDT_SYNC_REQ = 16;
var CMD_CRDT_UP_TO_DATE = 17;
var CMD_CRDT_STALE_EPOCH = 18;
var CMD_CRDT_UPDATE = 20;
var CMD_PLANE_DROP = 21;
var CMD_PLANE_LIST = 22;
var CMD_OP_REJECTED = 23;
var PLANE_KIND = {
  MAIN: "main",
  SUBGRAPH: "subgraph",
  EPHEMERAL: "ephemeral"
};
var OP_TYPE = {
  INSERT_NODE: 1,
  INSERT_EDGE: 2,
  INSERT_IIP: 3,
  TOMBSTONE: 4,
  UI_METADATA: 5,
  INSERT_EXPORT: 6,
  INSERT_GROUP: 7
};
var CMD_COMP_SYNC_REQ = 32;
var CMD_COMP_UP_TO_DATE = 33;
var CMD_COMP_MANIFEST = 34;
var CMD_COMP_DETAIL_REQ = 35;
var CMD_COMP_DETAIL_RES = 36;
var CMD_COMP_WRITE = 37;
var CMD_COMP_SOURCE = 38;
var CMD_COMP_INSTALL_REQ = 39;
var CMD_SCHEMA_REQ = 40;
var CMD_SCHEMA_RES = 41;
var CMD_SCHEMA_WRITE = 42;
var COMPONENT_TYPE = {
  ELEMENTARY: "elementary",
  SUBGRAPH: "subgraph",
  STUB: "stub"
};
var SCHEMA_INLINE_LIMIT = 4096;
var SCHEMA_BUNDLE_MAX_ENTRIES = 32;
var CMD_PUBSUB_SUB = 48;
var CMD_FLOWTRACE_CHUNK = 50;
var EVENT_TYPE = {
  DATA: 1,
  BEGIN_BRACKET: 2,
  END_BRACKET: 3,
  ERROR: 4,
  CONSOLE: 5,
  LIFECYCLE: 6,
  VISUAL_STATE: 7,
  /**
   * A data breakpoint fired: the payload is the positional tuple
   * `[breakpoint_id, node_id, port]`. The runtime is paused when this event
   * is emitted (a `0x05 PAUSED` lifecycle event accompanies it); the packet
   * itself travels as its own `0x01 DATA` event.
   */
  BREAKPOINT_HIT: 8,
  /**
   * An error raised by a stub component — the `StubNotImplementedError` of
   * the StubComponent contract (work document #19) — when a data packet
   * reaches a component with no implementation. The payload is the
   * exception string, exactly as in `0x04 ERROR`; the event type itself
   * classifies the error as *unimplemented* rather than a genuine component
   * failure (work document #4 update #9), with no string-parsing
   * convention.
   */
  STUB_ERROR: 9,
  /**
   * A backpressure sample: one event per edge per flush, the payload the
   * positional tuple `[edge_id, in_flight, desired_size]` — the number of
   * admitted in-flight packets and the live remaining capacity
   * (`desiredSize()`), nil when the edge is unbounded. Sampling rides the
   * subscription's flush cadence (the runtime's physical-policy decision)
   * and the sample's delta places it at flush time. Backpressure is normal
   * operation, not a fault: this is a data-channel observation, never an
   * error (work document #4 update #9).
   */
  EDGE_CAPACITY: 10,
  /**
   * A connection opened: packets may now flow on the edge — the framing
   * 1.x UIs animate edge activity with (external review, update #35 point:
   * connection events). The payload is the positional tuple
   * `[src_node, src_port, tgt_node, tgt_port]`.
   */
  CONNECTION_OPEN: 11,
  /**
   * A connection closed: the edge no longer carries packets. Payload as in
   * `0x0b CONNECTION_OPEN`.
   */
  CONNECTION_CLOSE: 12
};
var LIFECYCLE_CODE = {
  START: 1,
  STOP: 2,
  SAFE_MODE: 3,
  FAILED: 4,
  PAUSED: 5,
  RESUMED: 6
};
var VISUAL_FORMAT = {
  FONTAWESOME: 1,
  NETPBM_MONO_84: 2,
  NETPBM_RGB_18: 3
};
var CMD_RUN_CTRL = 64;
var CMD_BREAKPOINT_SET = 65;
var CMD_BREAKPOINT_CLEAR = 66;
var CMD_PROCESS_CTRL = 67;
var RUN_ACTION = {
  PAUSE: 1,
  RESUME: 2,
  STEP: 3,
  START: 4,
  STOP: 5
};
var PROCESS_ACTION = {
  DISABLE: 1,
  ENABLE: 2
};
var CMD_PROCESS_LIST_REQ = 68;
var CMD_PROCESS_LIST = 69;
var EXECUTION_STATE = {
  ENABLED: 1,
  DISABLED: 2
};
var CMD_HWM_SET = 70;
var CMD_PACKET_SEND = 71;
var CMD_GET_STATUS = 72;
var RUN_STATE = {
  STOPPED: 0,
  RUNNING: 1,
  PAUSED: 2,
  FAILED: 3
};
var TRACE_SNAPSHOT = 240;

// node_modules/@noflo/fbp-protocol/src/debug.js
import { MsgPack } from "./reticulum-core.js";
function encodeRunCtrl(action, planeId = void 0) {
  assertRunAction(action);
  return MsgPack.encode([CMD_RUN_CTRL, action, planeId ?? null]);
}
function decodeRunCtrl(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_RUN_CTRL, 3);
  assertRunAction(frame[1], CMD_RUN_CTRL);
  return { cmd: CMD_RUN_CTRL, action: frame[1], planeId: frame[2] ?? null };
}
function encodeBreakpointSet({ breakpointId, nodeId, port = null }) {
  assertId(breakpointId, CMD_BREAKPOINT_SET, "breakpoint_id");
  assertName(nodeId, CMD_BREAKPOINT_SET, "node_id");
  if (port !== null && (typeof port !== "string" || port.length === 0)) {
    throw new ProtocolError(
      "port must be a non-empty string or null (any triggering inport)",
      CMD_BREAKPOINT_SET
    );
  }
  return MsgPack.encode([CMD_BREAKPOINT_SET, breakpointId, nodeId, port]);
}
function decodeBreakpointSet(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_BREAKPOINT_SET, 4);
  const [cmd, breakpointId, nodeId, port] = frame;
  assertId(breakpointId, cmd, "breakpoint_id");
  assertName(nodeId, cmd, "node_id");
  if (port !== null && (typeof port !== "string" || port.length === 0)) {
    throw new ProtocolError(
      "port must be a non-empty string or null (any triggering inport)",
      cmd
    );
  }
  return { cmd, breakpointId, nodeId, port };
}
function encodeBreakpointClear(breakpointId) {
  if (breakpointId !== null) {
    assertId(breakpointId, CMD_BREAKPOINT_CLEAR, "breakpoint_id");
  }
  return MsgPack.encode([CMD_BREAKPOINT_CLEAR, breakpointId]);
}
function decodeBreakpointClear(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_BREAKPOINT_CLEAR, 2);
  if (frame[1] !== null) {
    assertId(frame[1], CMD_BREAKPOINT_CLEAR, "breakpoint_id");
  }
  return { cmd: CMD_BREAKPOINT_CLEAR, breakpointId: frame[1] };
}
function encodeProcessCtrl({ nodeId, action }) {
  assertName(nodeId, CMD_PROCESS_CTRL, "node_id");
  assertProcessAction(action);
  return MsgPack.encode([CMD_PROCESS_CTRL, nodeId, action]);
}
function decodeProcessCtrl(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_PROCESS_CTRL, 3);
  const [cmd, nodeId, action] = frame;
  assertName(nodeId, cmd, "node_id");
  assertProcessAction(action, cmd);
  return { cmd, nodeId, action };
}
function encodeProcessListReq() {
  return MsgPack.encode([CMD_PROCESS_LIST_REQ]);
}
function decodeProcessListReq(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_PROCESS_LIST_REQ, 1);
  return { cmd: CMD_PROCESS_LIST_REQ };
}
function encodeProcessList(epochId, entries) {
  assertEntries(entries);
  const wire = {};
  for (const [nodeId, entry] of Object.entries(entries)) {
    wire[nodeId] = [entry.component, entry.type, entry.state];
  }
  return MsgPack.encode([CMD_PROCESS_LIST, epochId, wire]);
}
function decodeProcessList(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_PROCESS_LIST, 3);
  const [cmd, epochId, wireEntries] = frame;
  assertWireEntries(wireEntries, cmd);
  const entries = {};
  for (const [nodeId, [component, type, state]] of Object.entries(
    wireEntries
  )) {
    entries[nodeId] = { component, type, state };
  }
  return { cmd, epochId, entries };
}
function encodeHwmSet(highWaterMark) {
  assertHighWaterMark(highWaterMark, CMD_HWM_SET);
  return MsgPack.encode([CMD_HWM_SET, highWaterMark]);
}
function decodeHwmSet(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_HWM_SET, 2);
  assertHighWaterMark(frame[1], CMD_HWM_SET);
  return { cmd: CMD_HWM_SET, highWaterMark: frame[1] };
}
function expectFrame(frame, opcode, arity) {
  if (!Array.isArray(frame) || frame[0] !== opcode) {
    throw new ProtocolError("unexpected frame opcode", opcode);
  }
  if (frame.length !== arity) {
    throw new ProtocolError(
      `frame must carry exactly ${arity} elements`,
      opcode
    );
  }
}
function assertRunAction(action, opcode) {
  if (!Object.values(RUN_ACTION).includes(action)) {
    throw new ProtocolError("unknown run action", opcode ?? CMD_RUN_CTRL);
  }
}
function assertProcessAction(action, opcode) {
  if (!Object.values(PROCESS_ACTION).includes(action)) {
    throw new ProtocolError(
      "unknown process action",
      opcode ?? CMD_PROCESS_CTRL
    );
  }
}
function assertId(id, opcode, field) {
  const valid = typeof id === "string" && id.length > 0 || typeof id === "number" && Number.isInteger(id) && id >= 0;
  if (!valid) {
    throw new ProtocolError(
      `${field} must be a non-empty string or a non-negative integer`,
      opcode
    );
  }
}
function assertHighWaterMark(highWaterMark, opcode) {
  if (highWaterMark !== null && (typeof highWaterMark !== "number" || !Number.isInteger(highWaterMark) || highWaterMark < 0)) {
    throw new ProtocolError(
      "high_water_mark must be a non-negative integer or null (unbounded)",
      opcode
    );
  }
}
function assertName(name, opcode, field) {
  if (typeof name !== "string" || name.length === 0) {
    throw new ProtocolError(`${field} must be a non-empty string`, opcode);
  }
}
function assertEntries(entries) {
  if (entries === null || typeof entries !== "object" || Array.isArray(entries)) {
    throw new ProtocolError(
      "process entries must be a map of node id to process entry",
      CMD_PROCESS_LIST
    );
  }
  for (const [nodeId, entry] of Object.entries(entries)) {
    assertName(nodeId, CMD_PROCESS_LIST, "node id");
    assertEntry(entry, nodeId);
  }
}
function assertWireEntries(entries, opcode) {
  if (entries === null || typeof entries !== "object" || Array.isArray(entries)) {
    throw new ProtocolError(
      "process entries must be a map of node id to [component, kind, state] tuple",
      opcode
    );
  }
  for (const [nodeId, tuple] of Object.entries(entries)) {
    assertName(nodeId, opcode, "node id");
    if (!Array.isArray(tuple) || tuple.length !== 3 || typeof tuple[0] !== "string" || tuple[0].length === 0 || !Object.values(COMPONENT_TYPE).includes(tuple[1]) || !Object.values(EXECUTION_STATE).includes(tuple[2])) {
      throw new ProtocolError(
        `process entry for ${nodeId} must be a [component, kind, state] tuple carrying a declared component kind and execution state`,
        opcode
      );
    }
  }
}
function assertEntry(entry, nodeId) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    throw new ProtocolError(
      `process entry for ${nodeId} must be a map with component, type, and state`,
      CMD_PROCESS_LIST
    );
  }
  assertName(entry.component, CMD_PROCESS_LIST, "component");
  if (!Object.values(COMPONENT_TYPE).includes(entry.type)) {
    throw new ProtocolError(
      `process entry for ${nodeId} must declare a component kind from the shared vocabulary`,
      CMD_PROCESS_LIST
    );
  }
  if (!Object.values(EXECUTION_STATE).includes(entry.state)) {
    throw new ProtocolError(
      `process entry for ${nodeId} must carry an execution state`,
      CMD_PROCESS_LIST
    );
  }
}
function encodePacketSend({ planeId, port, payload }) {
  if (typeof port !== "string" || port.length === 0) {
    throw new ProtocolError("port must be a non-empty string", CMD_PACKET_SEND);
  }
  return MsgPack.encode([CMD_PACKET_SEND, planeId, port, payload]);
}
function decodePacketSend(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_PACKET_SEND, 4);
  const [cmd, planeId, port, payload] = frame;
  if (typeof port !== "string" || port.length === 0) {
    throw new ProtocolError("port must be a non-empty string", cmd);
  }
  return { cmd: CMD_PACKET_SEND, planeId, port, payload };
}
function encodeGetStatus() {
  return MsgPack.encode([CMD_GET_STATUS]);
}
function decodeGetStatus(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_GET_STATUS, 1);
  return { cmd: CMD_GET_STATUS };
}
function encodeGetStatusRes({
  epochId,
  runState,
  uptimeMs,
  advertisedMask
}) {
  if (!Object.values(RUN_STATE).includes(runState)) {
    throw new ProtocolError(
      "run_state must be from the vocabulary",
      CMD_GET_STATUS
    );
  }
  if (!Number.isInteger(uptimeMs) || uptimeMs < 0) {
    throw new ProtocolError(
      "uptime_ms must be a non-negative integer",
      CMD_GET_STATUS
    );
  }
  return MsgPack.encode([
    CMD_GET_STATUS,
    epochId,
    runState,
    uptimeMs,
    advertisedMask
  ]);
}
function decodeGetStatusRes(bytes) {
  const frame = MsgPack.decode(bytes);
  expectFrame(frame, CMD_GET_STATUS, 5);
  const [cmd, epochId, runState, uptimeMs, advertisedMask] = frame;
  if (!Object.values(RUN_STATE).includes(runState)) {
    throw new ProtocolError("run_state must be from the vocabulary", cmd);
  }
  if (!Number.isInteger(uptimeMs) || uptimeMs < 0) {
    throw new ProtocolError("uptime_ms must be a non-negative integer", cmd);
  }
  return { cmd: CMD_GET_STATUS, epochId, runState, uptimeMs, advertisedMask };
}

// node_modules/@noflo/fbp-protocol/src/decode.js
import { MsgPack as MsgPack6 } from "./reticulum-core.js";

// node_modules/@noflo/fbp-protocol/src/graph.js
import { MsgPack as MsgPack2 } from "./reticulum-core.js";
function encodeCrdtSyncReq(planeId, epochId, clientClocks) {
  assertClocks(clientClocks);
  return MsgPack2.encode([CMD_CRDT_SYNC_REQ, planeId, epochId, clientClocks]);
}
function decodeCrdtSyncReq(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_CRDT_SYNC_REQ, 4);
  const [cmd, planeId, epochId, clocks] = frame;
  assertClocks(clocks, cmd);
  return { cmd, planeId, epochId, clientClocks: { ...clocks } };
}
function encodeCrdtUpToDate(planeId, epochId) {
  return MsgPack2.encode([CMD_CRDT_UP_TO_DATE, planeId, epochId]);
}
function decodeCrdtUpToDate(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_CRDT_UP_TO_DATE, 3);
  const [cmd, planeId, epochId] = frame;
  return { cmd, planeId, epochId };
}
function encodeCrdtStaleEpoch(planeId, newEpochId, rnsResourceHash) {
  if (typeof rnsResourceHash !== "string" || rnsResourceHash.length === 0) {
    throw new ProtocolError(
      "rns_resource_hash must be a non-empty string",
      CMD_CRDT_STALE_EPOCH
    );
  }
  return MsgPack2.encode([
    CMD_CRDT_STALE_EPOCH,
    planeId,
    newEpochId,
    rnsResourceHash
  ]);
}
function decodeCrdtStaleEpoch(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_CRDT_STALE_EPOCH, 4);
  const [cmd, planeId, newEpochId, rnsResourceHash] = frame;
  if (typeof rnsResourceHash !== "string" || rnsResourceHash.length === 0) {
    throw new ProtocolError(
      "rns_resource_hash must be a non-empty string",
      cmd
    );
  }
  return { cmd, planeId, newEpochId, rnsResourceHash };
}
function encodeCrdtUpdate({
  planeId,
  clientId,
  logicalClock,
  opType,
  entityId,
  payload
}) {
  assertOpType(opType);
  assertClock(logicalClock);
  return MsgPack2.encode([
    CMD_CRDT_UPDATE,
    planeId,
    clientId,
    logicalClock,
    opType,
    entityId,
    payload
  ]);
}
function decodeCrdtUpdate(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_CRDT_UPDATE, 7);
  const [cmd, planeId, clientId, logicalClock, opType, entityId, payload] = frame;
  if (typeof clientId !== "string" || clientId.length === 0) {
    throw new ProtocolError("client_id must be a non-empty string", cmd);
  }
  assertClock(logicalClock, cmd);
  assertOpType(opType, cmd);
  return {
    cmd,
    planeId,
    clientId,
    logicalClock,
    opType,
    entityId,
    payload
  };
}
function encodePlaneDrop(planeId) {
  if (planeId === null || planeId === void 0) {
    throw new ProtocolError(
      "the main plane is not droppable; name an ephemeral plane",
      CMD_PLANE_DROP
    );
  }
  return MsgPack2.encode([CMD_PLANE_DROP, planeId]);
}
function decodePlaneDrop(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_PLANE_DROP, 2);
  const [cmd, planeId] = frame;
  if (planeId === null || planeId === void 0) {
    throw new ProtocolError("the main plane is not droppable", cmd);
  }
  return { cmd, planeId };
}
function encodePlaneList() {
  return MsgPack2.encode([CMD_PLANE_LIST]);
}
function decodePlaneList(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_PLANE_LIST, 1);
  return { cmd: CMD_PLANE_LIST };
}
function encodePlaneListRes(entries) {
  assertPlaneEntries(entries);
  return MsgPack2.encode([
    CMD_PLANE_LIST,
    entries.map((entry) => [
      entry.planeId,
      entry.kind,
      entry.parentPlane ?? null,
      entry.nodeId ?? null,
      entry.componentName ?? null,
      entry.name
    ])
  ]);
}
function decodePlaneListRes(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_PLANE_LIST, 2);
  const [cmd, raw] = frame;
  if (!Array.isArray(raw)) {
    throw new ProtocolError("the plane listing must be an array", cmd);
  }
  const entries = raw.map((tuple) => {
    if (!Array.isArray(tuple) || tuple.length !== 6) {
      throw new ProtocolError(
        "each plane entry must be a 6-element tuple",
        cmd
      );
    }
    const [planeId, kind, parentPlane, nodeId, componentName, name] = tuple;
    if (!Object.values(PLANE_KIND).includes(kind)) {
      throw new ProtocolError("unknown plane kind", cmd);
    }
    if (typeof name !== "string" || name.length === 0) {
      throw new ProtocolError("plane name must be a non-empty string", cmd);
    }
    return {
      planeId,
      kind,
      parentPlane,
      nodeId,
      componentName,
      name
    };
  });
  return { cmd: CMD_PLANE_LIST, entries };
}
function encodeOpRejected({ rejectedCmd, planeId, detail }) {
  return MsgPack2.encode([CMD_OP_REJECTED, rejectedCmd, planeId, detail]);
}
function decodeOpRejected(bytes) {
  const frame = MsgPack2.decode(bytes);
  expectFrame2(frame, CMD_OP_REJECTED, 4);
  const [cmd, rejectedCmd, planeId, detail] = frame;
  if (!Number.isInteger(rejectedCmd)) {
    throw new ProtocolError("rejected_cmd must be a command code", cmd);
  }
  return { cmd, rejectedCmd, planeId, detail };
}
function assertPlaneEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new ProtocolError("plane entries must be an array", CMD_PLANE_LIST);
  }
  for (const entry of entries) {
    if (entry === null || typeof entry !== "object" || !Object.values(PLANE_KIND).includes(entry.kind) || typeof entry.name !== "string" || entry.name.length === 0) {
      throw new ProtocolError(
        "each plane entry needs a kind from the vocabulary and a name",
        CMD_PLANE_LIST
      );
    }
  }
}
function expectFrame2(frame, opcode, arity) {
  if (!Array.isArray(frame) || frame[0] !== opcode) {
    throw new ProtocolError("unexpected frame opcode", opcode);
  }
  if (frame.length !== arity) {
    throw new ProtocolError(
      `frame must carry exactly ${arity} elements`,
      opcode
    );
  }
}
function assertClock(clock, opcode) {
  if (!Number.isInteger(clock) || clock < 0) {
    throw new ProtocolError(
      "logical clock must be a non-negative integer",
      opcode
    );
  }
}
function assertOpType(opType, opcode) {
  if (!Object.values(OP_TYPE).includes(opType)) {
    throw new ProtocolError("unknown op_type", opcode ?? CMD_CRDT_UPDATE);
  }
}
function assertClocks(clocks, opcode) {
  if (clocks === null || typeof clocks !== "object" || Array.isArray(clocks)) {
    throw new ProtocolError(
      "client clocks must be a map of client id to logical clock",
      opcode
    );
  }
  for (const [clientId, clock] of Object.entries(clocks)) {
    if (typeof clientId !== "string" || clientId.length === 0) {
      throw new ProtocolError(
        "client clocks must be keyed by non-empty client ids",
        opcode
      );
    }
    assertClock(clock, opcode);
  }
}

// node_modules/@noflo/fbp-protocol/src/registry.js
import { fromHex, MsgPack as MsgPack3, toHex } from "./reticulum-core.js";

// node_modules/@noflo/fbp-protocol/src/schema-guards.js
var GUARD_ENUM_LIMIT = 64;
var GUARD_TYPES = /* @__PURE__ */ new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object"
]);
function validateGuard(guard) {
  if (guard === null || typeof guard !== "object" || Array.isArray(guard)) {
    throw new TypeError("guard must be an object");
  }
  for (const key of Object.keys(guard)) {
    if (!["type", "enum", "min", "max", "required"].includes(key)) {
      throw new TypeError(
        `guard key '${key}' is outside the closed vocabulary`
      );
    }
  }
  if (guard.type !== void 0) {
    if (typeof guard.type !== "string" || !GUARD_TYPES.has(guard.type)) {
      throw new TypeError("guard type must be one of the vocabulary types");
    }
  }
  if (guard.enum !== void 0) {
    if (!Array.isArray(guard.enum)) {
      throw new TypeError("guard enum must be an array");
    }
    if (guard.enum.length > GUARD_ENUM_LIMIT) {
      throw new TypeError(
        `guard enum exceeds the ${GUARD_ENUM_LIMIT}-entry bound`
      );
    }
    for (const entry of guard.enum) {
      if (typeof entry !== "string" && typeof entry !== "number" && typeof entry !== "boolean" || typeof entry === "number" && !Number.isFinite(entry)) {
        throw new TypeError("guard enum entries must be scalars");
      }
    }
  }
  for (const key of ["min", "max"]) {
    const bound = guard[key];
    if (bound !== void 0 && (typeof bound !== "number" || !Number.isFinite(bound))) {
      throw new TypeError(`guard ${key} must be a finite number`);
    }
  }
  if (guard.required !== void 0) {
    if (!Array.isArray(guard.required) || guard.required.some((key) => typeof key !== "string")) {
      throw new TypeError("guard required must be an array of property names");
    }
  }
}
function projectGuard(schema, resolveRef = null) {
  const guard = {};
  if (typeof schema?.type === "string" && GUARD_TYPES.has(schema.type)) {
    guard.type = schema.type;
  }
  if (Array.isArray(schema?.enum) && schema.enum.length <= GUARD_ENUM_LIMIT && schema.enum.every(
    (entry) => typeof entry === "string" || typeof entry === "number" && Number.isFinite(entry) || typeof entry === "boolean"
  )) {
    guard.enum = [...schema.enum];
  }
  if (typeof schema?.minimum === "number" && Number.isFinite(schema.minimum) && schema.exclusiveMinimum === void 0) {
    guard.min = schema.minimum;
  }
  if (typeof schema?.maximum === "number" && Number.isFinite(schema.maximum) && schema.exclusiveMaximum === void 0) {
    guard.max = schema.maximum;
  }
  const required = projectRequired(schema, resolveRef, /* @__PURE__ */ new Set());
  if (required) guard.required = required;
  return guard;
}
function projectRequired(schema, resolveRef, seen) {
  const union = /* @__PURE__ */ new Set();
  if (isRequiredList(schema.required)) {
    for (const key of schema.required) union.add(key);
  }
  if (Array.isArray(schema.allOf)) {
    for (const member of schema.allOf) {
      if (member === null || typeof member !== "object" || Array.isArray(member)) {
        return void 0;
      }
      if (typeof member.$ref === "string") {
        if (member.$ref.startsWith("#") || seen.has(member.$ref)) continue;
        const resolved = resolveRef?.(member.$ref);
        if (!resolved || typeof resolved !== "object") return void 0;
        const nested = projectRequired(
          resolved,
          resolveRef,
          /* @__PURE__ */ new Set([...seen, member.$ref])
        );
        if (!nested) return void 0;
        for (const key of nested) union.add(key);
        continue;
      }
      if (isRequiredList(member.required)) {
        for (const key of member.required) union.add(key);
      }
    }
  }
  if (union.size === 0) return void 0;
  return [...union].sort();
}
function isRequiredList(value) {
  return Array.isArray(value) && value.length > 0 && value.every((key) => typeof key === "string");
}
function checkGuard(guard, value) {
  if (guard === null || typeof guard !== "object") return true;
  if (guard.type !== void 0 && !guardTypeMatches(guard.type, value)) {
    return false;
  }
  if (guard.enum !== void 0 && !guard.enum.some((entry) => entry === value)) {
    return false;
  }
  if (typeof value === "number") {
    if (guard.min !== void 0 && value < guard.min) return false;
    if (guard.max !== void 0 && value > guard.max) return false;
  }
  if (guard.required !== void 0 && (value === null || typeof value !== "object" || Array.isArray(value) || guard.required.some((key) => !(key in value)))) {
    return false;
  }
  return true;
}
function guardTypeMatches(type, value) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    default:
      return true;
  }
}

// node_modules/@noflo/fbp-protocol/src/registry.js
init_schema_identity();
function encodeCompSyncReq(localRegistryHash) {
  assertHash(localRegistryHash, CMD_COMP_SYNC_REQ, "local_registry_hash");
  return MsgPack3.encode([CMD_COMP_SYNC_REQ, localRegistryHash]);
}
function decodeCompSyncReq(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_SYNC_REQ, 2);
  assertHash(frame[1], CMD_COMP_SYNC_REQ, "local_registry_hash");
  return { cmd: CMD_COMP_SYNC_REQ, localRegistryHash: frame[1] };
}
function encodeCompManifest(newRegistryHash, entries) {
  assertHash(newRegistryHash, CMD_COMP_MANIFEST, "new_registry_hash");
  assertEntries2(entries);
  const wire = {};
  for (const [name, entry] of Object.entries(entries)) {
    wire[name] = [entry.sigHash, entry.type];
  }
  return MsgPack3.encode([CMD_COMP_MANIFEST, newRegistryHash, wire]);
}
function decodeCompManifest(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_MANIFEST, 3);
  assertHash(frame[1], CMD_COMP_MANIFEST, "new_registry_hash");
  assertWireEntries2(frame[2]);
  const entries = {};
  for (const [name, [sigHash2, type]] of Object.entries(frame[2])) {
    entries[name] = { sigHash: sigHash2, type };
  }
  return {
    cmd: CMD_COMP_MANIFEST,
    newRegistryHash: frame[1],
    entries
  };
}
function encodeCompUpToDate() {
  return MsgPack3.encode([CMD_COMP_UP_TO_DATE]);
}
function decodeCompUpToDate(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_UP_TO_DATE, 1);
  return { cmd: CMD_COMP_UP_TO_DATE };
}
function encodeCompDetailReq(names) {
  assertNames(names);
  return MsgPack3.encode([CMD_COMP_DETAIL_REQ, names]);
}
function decodeCompDetailReq(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_DETAIL_REQ, 2);
  assertNames(frame[1]);
  return { cmd: CMD_COMP_DETAIL_REQ, names: [...frame[1]] };
}
function encodeCompDetailRes(components) {
  assertDetails(components);
  const wire = toWireDetails(components);
  return MsgPack3.encode([CMD_COMP_DETAIL_RES, wire]);
}
function decodeCompDetailRes(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_DETAIL_RES, 2);
  assertWireDetails(frame[1]);
  return { cmd: CMD_COMP_DETAIL_RES, components: fromWireDetails(frame[1]) };
}
function encodeCompWrite(componentName, source) {
  assertName2(componentName, CMD_COMP_WRITE, "component_name");
  if (typeof source !== "string" || source.length === 0) {
    throw new ProtocolError(
      "source must be a non-empty string",
      CMD_COMP_WRITE
    );
  }
  return MsgPack3.encode([CMD_COMP_WRITE, componentName, source]);
}
function decodeCompWrite(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_WRITE, 3);
  assertName2(frame[1], CMD_COMP_WRITE, "component_name");
  if (typeof frame[2] !== "string" || frame[2].length === 0) {
    throw new ProtocolError(
      "source must be a non-empty string",
      CMD_COMP_WRITE
    );
  }
  return { cmd: CMD_COMP_WRITE, componentName: frame[1], source: frame[2] };
}
function encodeCompInstallReq(packageUri) {
  if (typeof packageUri !== "string" || packageUri.length === 0) {
    throw new ProtocolError(
      "package_uri must be a non-empty string",
      CMD_COMP_INSTALL_REQ
    );
  }
  return MsgPack3.encode([CMD_COMP_INSTALL_REQ, packageUri]);
}
function decodeCompInstallReq(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_INSTALL_REQ, 2);
  if (typeof frame[1] !== "string" || frame[1].length === 0) {
    throw new ProtocolError(
      "package_uri must be a non-empty string",
      CMD_COMP_INSTALL_REQ
    );
  }
  return { cmd: CMD_COMP_INSTALL_REQ, packageUri: frame[1] };
}
function assertRawDigests(digests, opcode) {
  if (!Array.isArray(digests) || digests.length === 0) {
    throw new ProtocolError(
      "digests must be a non-empty array of raw 32-byte digests",
      opcode
    );
  }
  for (const digest of digests) {
    if (!(digest instanceof Uint8Array) || digest.length !== 32) {
      throw new ProtocolError(
        "schema digests must be raw 32-byte digests",
        opcode
      );
    }
  }
}
function assertSchemaBodies(entries, opcode) {
  if (entries === null || typeof entries !== "object" || Array.isArray(entries)) {
    throw new ProtocolError(
      "schema bodies must be a map keyed by hex digest",
      opcode
    );
  }
  for (const [key, value] of Object.entries(entries)) {
    if (!/^[0-9a-f]{64}$/.test(key)) {
      throw new ProtocolError(
        "schema bodies must be keyed by 64-character hex digests",
        opcode
      );
    }
    assertSchemaEntry(value, opcode);
  }
}
function assertSchemaEntries(entries, opcode) {
  if (!Array.isArray(entries)) {
    throw new ProtocolError(
      "schema bodies must be a list of [digest, entry] tuples",
      opcode
    );
  }
  for (const [digest, value] of entries) {
    if (!(digest instanceof Uint8Array) || digest.length !== 32) {
      throw new ProtocolError(
        "schema body digests must be raw 32-byte digests",
        opcode
      );
    }
    assertSchemaEntry(value, opcode);
  }
}
function assertSchemaEntry(value, opcode) {
  if (value === null) return;
  if (typeof value === "string") {
    if (value.length === 0) {
      throw new ProtocolError(
        "resource refs must be non-empty strings",
        opcode
      );
    }
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ProtocolError(
      "schema bodies must be inline documents, resource refs, or nil",
      opcode
    );
  }
  if (MsgPack3.encode(value).length > SCHEMA_INLINE_LIMIT) {
    throw new ProtocolError(
      `inline schema bodies must stay within the ${SCHEMA_INLINE_LIMIT}-byte cap; use the resource form`,
      opcode
    );
  }
}
function canonicalSignature(signature) {
  assertDetail(signature, null);
  const json = {
    type: signature.type,
    in: signature.in.map(portJson),
    out: signature.out.map(portJson)
  };
  if (signature.description !== void 0) {
    json.description = signature.description;
  }
  if (signature.icon !== void 0) json.icon = signature.icon;
  if (signature.metadata !== void 0) json.metadata = signature.metadata;
  return stableStringify(json);
}
function encodeCompSourceReq(componentName) {
  assertName2(componentName, CMD_COMP_SOURCE, "component_name");
  return MsgPack3.encode([CMD_COMP_SOURCE, componentName]);
}
function decodeCompSourceReq(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_SOURCE, 2);
  assertName2(frame[1], CMD_COMP_SOURCE, "component_name");
  return { cmd: CMD_COMP_SOURCE, componentName: frame[1] };
}
function encodeCompSourceRes(componentName, source) {
  assertName2(componentName, CMD_COMP_SOURCE, "component_name");
  if (source !== null && (typeof source !== "string" || source.length === 0)) {
    throw new ProtocolError(
      "source must be a non-empty string or nil",
      CMD_COMP_SOURCE
    );
  }
  return MsgPack3.encode([CMD_COMP_SOURCE, componentName, source ?? null]);
}
function decodeCompSourceRes(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_COMP_SOURCE, 3);
  assertName2(frame[1], CMD_COMP_SOURCE, "component_name");
  const source = frame[2];
  if (source !== null && (typeof source !== "string" || source.length === 0)) {
    throw new ProtocolError(
      "source must be a non-empty string or nil",
      CMD_COMP_SOURCE
    );
  }
  return { cmd: CMD_COMP_SOURCE, componentName: frame[1], source };
}
async function sigHash(signature) {
  const bytes = new TextEncoder().encode(canonicalSignature(signature));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canonicalManifest(entries) {
  assertEntries2(entries);
  const json = {};
  for (const name of Object.keys(entries).sort()) {
    json[name] = [entries[name].sigHash, entries[name].type];
  }
  return stableStringify(json);
}
async function registryHash(entries) {
  const bytes = new TextEncoder().encode(canonicalManifest(entries));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function portJson(port) {
  const json = { id: port.id, type: port.type };
  if (port.addressable !== void 0) json.addressable = port.addressable;
  if (port.description !== void 0) json.description = port.description;
  if (port.required !== void 0) json.required = port.required;
  if (port.control !== void 0) json.control = port.control;
  if (port.schema !== void 0) json.schema = port.schema;
  if (port.guard !== void 0) json.guard = port.guard;
  return json;
}
function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function expectFrame3(frame, opcode, arity) {
  if (!Array.isArray(frame) || frame[0] !== opcode) {
    throw new ProtocolError("unexpected frame opcode", opcode);
  }
  if (frame.length !== arity) {
    throw new ProtocolError(
      `frame must carry exactly ${arity} elements`,
      opcode
    );
  }
}
function assertHash(hash, opcode, field) {
  if (typeof hash !== "string" || hash.length === 0) {
    throw new ProtocolError(`${field} must be a non-empty string`, opcode);
  }
}
function assertName2(name, opcode, field) {
  if (typeof name !== "string" || name.length === 0) {
    throw new ProtocolError(`${field} must be a non-empty string`, opcode);
  }
}
function assertNames(names) {
  if (!Array.isArray(names)) {
    throw new ProtocolError(
      "component names must be an array",
      CMD_COMP_DETAIL_REQ
    );
  }
  for (const name of names) {
    assertName2(name, CMD_COMP_DETAIL_REQ, "component name");
  }
}
function assertEntries2(entries) {
  if (entries === null || typeof entries !== "object" || Array.isArray(entries)) {
    throw new ProtocolError(
      "manifest entries must be a map of component name to manifest entry",
      CMD_COMP_MANIFEST
    );
  }
  for (const [name, entry] of Object.entries(entries)) {
    assertName2(name, CMD_COMP_MANIFEST, "component name");
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ProtocolError(
        `manifest entry for ${name} must be a map with sigHash and type`,
        CMD_COMP_MANIFEST
      );
    }
    assertHash(entry.sigHash, CMD_COMP_MANIFEST, "sig_hash");
    if (!Object.values(COMPONENT_TYPE).includes(entry.type)) {
      throw new ProtocolError(
        `manifest entry for ${name} must declare a component kind from the shared vocabulary`,
        CMD_COMP_MANIFEST
      );
    }
  }
}
function assertWireEntries2(entries) {
  if (entries === null || typeof entries !== "object" || Array.isArray(entries)) {
    throw new ProtocolError(
      "manifest entries must be a map of component name to [sig_hash, kind] tuple",
      CMD_COMP_MANIFEST
    );
  }
  for (const [name, tuple] of Object.entries(entries)) {
    assertName2(name, CMD_COMP_MANIFEST, "component name");
    if (!Array.isArray(tuple) || tuple.length !== 2 || typeof tuple[0] !== "string" || tuple[0].length === 0 || !Object.values(COMPONENT_TYPE).includes(tuple[1])) {
      throw new ProtocolError(
        `manifest entry for ${name} must be a [sig_hash, kind] tuple carrying a declared component kind`,
        CMD_COMP_MANIFEST
      );
    }
  }
}
function assertDetails(components, wireForm = false) {
  if (components === null || typeof components !== "object" || Array.isArray(components)) {
    throw new ProtocolError(
      "component details must be a map of component name to definition",
      CMD_COMP_DETAIL_RES
    );
  }
  for (const [name, detail] of Object.entries(components)) {
    assertName2(name, CMD_COMP_DETAIL_RES, "component name");
    assertDetail(detail, name, wireForm);
  }
}
function assertWireDetails(components) {
  assertDetails(components, true);
}
function assertDetail(detail, name, wireForm = false) {
  const where = name === null ? "component detail" : `component ${name}`;
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) {
    throw new ProtocolError(`${where} must be a map`, CMD_COMP_DETAIL_RES);
  }
  if (!Object.values(COMPONENT_TYPE).includes(detail.type)) {
    throw new ProtocolError(
      `${where} must declare a component kind from the shared vocabulary`,
      CMD_COMP_DETAIL_RES
    );
  }
  for (const side of ["in", "out"]) {
    if (!Array.isArray(detail[side])) {
      throw new ProtocolError(
        `${where} must declare its ${side}ports as an array`,
        CMD_COMP_DETAIL_RES
      );
    }
    for (const port of detail[side]) {
      assertPort(port, where, side, wireForm);
    }
  }
  assertPortSchemaRef(
    detail.metadata,
    where,
    "component",
    "metadata",
    wireForm
  );
}
function assertPort(port, where, side, wireForm = false) {
  if (port === null || typeof port !== "object" || Array.isArray(port)) {
    throw new ProtocolError(
      `${where} ${side}port must be a map`,
      CMD_COMP_DETAIL_RES
    );
  }
  if (typeof port.id !== "string" || port.id.length === 0) {
    throw new ProtocolError(
      `${where} ${side}port must carry a non-empty id`,
      CMD_COMP_DETAIL_RES
    );
  }
  if (typeof port.type !== "string" || port.type.length === 0) {
    throw new ProtocolError(
      `${where} ${side}port ${port.id} must carry a datatype`,
      CMD_COMP_DETAIL_RES
    );
  }
  for (const flag of ["addressable", "required", "control"]) {
    if (port[flag] !== void 0 && typeof port[flag] !== "boolean") {
      throw new ProtocolError(
        `${where} ${side}port ${port.id} ${flag} must be a boolean`,
        CMD_COMP_DETAIL_RES
      );
    }
  }
  assertPortSchemaRef(port.schema, where, side, port.id, wireForm);
  if (port.guard !== void 0) {
    try {
      validateGuard(port.guard);
    } catch (error) {
      throw new ProtocolError(
        `${where} ${side}port ${port.id} guard must stay within the closed vocabulary: ${error instanceof Error ? error.message : String(error)}`,
        CMD_COMP_DETAIL_RES
      );
    }
  }
}
function assertPortSchemaRef(ref, where, side, portId, wireForm = false) {
  if (ref === void 0) return;
  if (ref === null || typeof ref !== "object" || Array.isArray(ref)) {
    throw new ProtocolError(
      `${where} ${side}port ${portId} schema must be a map with id and digest`,
      CMD_COMP_DETAIL_RES
    );
  }
  for (const key of Object.keys(ref)) {
    if (key !== "id" && key !== "digest") {
      throw new ProtocolError(
        `${where} ${side}port ${portId} schema carries the unknown field '${key}'`,
        CMD_COMP_DETAIL_RES
      );
    }
  }
  if (ref.id !== void 0) {
    if (typeof ref.id !== "string" || !isValidSchemaId(ref.id)) {
      throw new ProtocolError(
        `${where} ${side}port ${portId} schema id must be a bare ns/name id`,
        CMD_COMP_DETAIL_RES
      );
    }
  }
  if (ref.digest !== void 0) {
    const digest = (
      /** @type {any} */
      ref.digest
    );
    const digestOk = wireForm ? digest instanceof Uint8Array && digest.length === 32 : typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest);
    if (!digestOk) {
      throw new ProtocolError(
        wireForm ? `${where} ${side}port ${portId} schema digest must be a raw 32-byte digest on the wire` : `${where} ${side}port ${portId} schema digest must be a 64-character hex string`,
        CMD_COMP_DETAIL_RES
      );
    }
  }
  if (ref.id === void 0 && ref.digest === void 0) {
    throw new ProtocolError(
      `${where} ${side}port ${portId} schema must carry an id or a digest`,
      CMD_COMP_DETAIL_RES
    );
  }
}
function toWireDetails(components) {
  const wire = {};
  for (const [name, detail] of Object.entries(components)) {
    wire[name] = {
      ...detail,
      in: detail.in.map(portToWire),
      out: detail.out.map(portToWire),
      ...detail.metadata?.digest !== void 0 ? {
        metadata: {
          ...detail.metadata,
          digest: fromHex(detail.metadata.digest)
        }
      } : {}
    };
  }
  return wire;
}
function fromWireDetails(wire) {
  const components = {};
  for (const [name, detail] of Object.entries(wire)) {
    const meta = detail.metadata;
    components[name] = {
      ...detail,
      in: detail.in.map(portFromWire),
      out: detail.out.map(portFromWire),
      ...meta !== void 0 && meta !== null && typeof meta === "object" && meta.digest instanceof Uint8Array ? { metadata: { ...meta, digest: toHex(meta.digest) } } : {}
    };
  }
  return (
    /** @type {ComponentDetails} */
    components
  );
}
function portToWire(port) {
  if (port.schema?.digest === void 0) return { ...port };
  return {
    ...port,
    schema: {
      ...port.schema,
      digest: fromHex(
        /** @type {string} */
        port.schema.digest
      )
    }
  };
}
function portFromWire(port) {
  const ref = port.schema;
  if (ref === void 0 || ref === null || typeof ref !== "object" || !(ref.digest instanceof Uint8Array)) {
    return { ...port };
  }
  return {
    ...port,
    schema: { ...ref, digest: toHex(ref.digest) }
  };
}
function encodeSchemaReq(digests, bundle = true) {
  assertRawDigests(digests, CMD_SCHEMA_REQ);
  if (typeof bundle !== "boolean") {
    throw new ProtocolError("bundle must be a boolean", CMD_SCHEMA_REQ);
  }
  return MsgPack3.encode([CMD_SCHEMA_REQ, digests, bundle]);
}
function decodeSchemaReq(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_SCHEMA_REQ, 3);
  assertRawDigests(frame[1], CMD_SCHEMA_REQ);
  if (typeof frame[2] !== "boolean") {
    throw new ProtocolError("bundle must be a boolean", CMD_SCHEMA_REQ);
  }
  return { cmd: CMD_SCHEMA_REQ, digests: frame[1], bundle: frame[2] };
}
function encodeSchemaRes(entries) {
  assertSchemaBodies(entries, CMD_SCHEMA_RES);
  const wire = Object.keys(entries).sort().map((key) => [fromHex(key), entries[key]]);
  return MsgPack3.encode([CMD_SCHEMA_RES, wire]);
}
function decodeSchemaRes(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_SCHEMA_RES, 2);
  assertSchemaEntries(frame[1], CMD_SCHEMA_RES);
  const bodies = {};
  for (const [digest, value] of frame[1]) {
    bodies[toHex(digest)] = value;
  }
  return { cmd: CMD_SCHEMA_RES, bodies };
}
function encodeSchemaWrite(digest, bodyOrRef) {
  if (typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest)) {
    throw new ProtocolError(
      "digest must be a 64-character hex string",
      CMD_SCHEMA_WRITE
    );
  }
  if (typeof bodyOrRef === "string") {
    if (bodyOrRef.length === 0) {
      throw new ProtocolError(
        "resource ref must be a non-empty string",
        CMD_SCHEMA_WRITE
      );
    }
  } else if (bodyOrRef === null || typeof bodyOrRef !== "object" || Array.isArray(bodyOrRef)) {
    throw new ProtocolError(
      "body must be an inline document or a resource ref string",
      CMD_SCHEMA_WRITE
    );
  } else if (MsgPack3.encode(bodyOrRef).length > SCHEMA_INLINE_LIMIT) {
    throw new ProtocolError(
      `inline schema bodies must stay within the ${SCHEMA_INLINE_LIMIT}-byte cap; use the resource form`,
      CMD_SCHEMA_WRITE
    );
  }
  return MsgPack3.encode([CMD_SCHEMA_WRITE, fromHex(digest), bodyOrRef]);
}
function decodeSchemaWrite(bytes) {
  const frame = MsgPack3.decode(bytes);
  expectFrame3(frame, CMD_SCHEMA_WRITE, 3);
  const digestBytes = frame[1];
  if (!(digestBytes instanceof Uint8Array) || digestBytes.length !== 32) {
    throw new ProtocolError(
      "digest must be a raw 32-byte digest",
      CMD_SCHEMA_WRITE
    );
  }
  const value = frame[2];
  if (typeof value === "string") {
    if (value.length === 0) {
      throw new ProtocolError(
        "resource ref must be a non-empty string",
        CMD_SCHEMA_WRITE
      );
    }
    return {
      cmd: CMD_SCHEMA_WRITE,
      digest: toHex(digestBytes),
      body: null,
      ref: value
    };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProtocolError(
      "body must be an inline document or a resource ref string",
      CMD_SCHEMA_WRITE
    );
  }
  if (MsgPack3.encode(value).length > SCHEMA_INLINE_LIMIT) {
    throw new ProtocolError(
      `inline schema bodies must stay within the ${SCHEMA_INLINE_LIMIT}-byte cap; use the resource form`,
      CMD_SCHEMA_WRITE
    );
  }
  return {
    cmd: CMD_SCHEMA_WRITE,
    digest: toHex(digestBytes),
    body: value,
    ref: null
  };
}

// node_modules/@noflo/fbp-protocol/src/telemetry.js
import { MsgPack as MsgPack4 } from "./reticulum-core.js";
function encodePubsubSub({
  subId,
  targetType,
  targetId,
  requestedFlushIntervalMs
}) {
  assertFlushInterval(requestedFlushIntervalMs);
  if (typeof targetType !== "string" || targetType.length === 0) {
    throw new ProtocolError(
      "target_type must be a non-empty string",
      CMD_PUBSUB_SUB
    );
  }
  if (typeof targetId !== "string" || targetId.length === 0) {
    throw new ProtocolError(
      "target_id must be a non-empty string",
      CMD_PUBSUB_SUB
    );
  }
  return MsgPack4.encode([
    CMD_PUBSUB_SUB,
    subId,
    targetType,
    targetId,
    requestedFlushIntervalMs
  ]);
}
function decodePubsubSub(bytes) {
  const frame = MsgPack4.decode(bytes);
  expectFrame4(frame, CMD_PUBSUB_SUB, 5);
  const [, subId, targetType, targetId, requestedFlushIntervalMs] = frame;
  if (typeof targetType !== "string" || targetType.length === 0) {
    throw new ProtocolError(
      "target_type must be a non-empty string",
      CMD_PUBSUB_SUB
    );
  }
  if (typeof targetId !== "string" || targetId.length === 0) {
    throw new ProtocolError(
      "target_id must be a non-empty string",
      CMD_PUBSUB_SUB
    );
  }
  assertFlushInterval(requestedFlushIntervalMs);
  return {
    cmd: CMD_PUBSUB_SUB,
    subId,
    targetType,
    targetId,
    requestedFlushIntervalMs
  };
}
function encodeFlowtraceChunk({
  subId,
  planeId,
  baseTimestampMs,
  events
}) {
  assertTimestamp(baseTimestampMs);
  return MsgPack4.encode([
    CMD_FLOWTRACE_CHUNK,
    subId,
    planeId ?? null,
    baseTimestampMs,
    events.map(eventTuple)
  ]);
}
function encodeFlowtraceChunkFromTimestamps({ subId, planeId, events }) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new ProtocolError(
      "a flowtrace chunk needs at least one event",
      CMD_FLOWTRACE_CHUNK
    );
  }
  const baseTimestampMs = events[0].timestampMs;
  for (const event of events) {
    assertTimestamp(event.timestampMs);
    if (event.timestampMs < baseTimestampMs) {
      throw new ProtocolError(
        "events must arrive in chronological order",
        CMD_FLOWTRACE_CHUNK
      );
    }
  }
  return encodeFlowtraceChunk({
    subId,
    planeId,
    baseTimestampMs,
    events: events.map((event) => ({
      timeDeltaMs: event.timestampMs - baseTimestampMs,
      eventType: event.eventType,
      payload: event.payload
    }))
  });
}
function decodeFlowtraceChunk(bytes) {
  const frame = MsgPack4.decode(bytes);
  expectFrame4(frame, CMD_FLOWTRACE_CHUNK, 5);
  const [cmd, subId, planeId, baseTimestampMs, tuples] = frame;
  assertTimestamp(baseTimestampMs, cmd);
  if (!Array.isArray(tuples)) {
    throw new ProtocolError("trace_events_array must be an array", cmd);
  }
  const events = tuples.map((tuple) => {
    if (!Array.isArray(tuple) || tuple.length !== 3) {
      throw new ProtocolError(
        "each trace event must be a [time_delta_ms, event_type, payload] tuple",
        cmd
      );
    }
    const [timeDeltaMs, eventType, payload] = tuple;
    if (!Number.isInteger(timeDeltaMs) || timeDeltaMs < 0 || timeDeltaMs > 4294967295) {
      throw new ProtocolError("time_delta_ms must be a uint32", cmd);
    }
    return { timeDeltaMs, eventType, payload };
  });
  return { cmd, subId, planeId, baseTimestampMs, events };
}
function dataEventEnvelope(src, tgt, value) {
  return [portRef(src), portRef(tgt), value];
}
function portRef(ref) {
  if (!ref) return null;
  const out = [ref.node, ref.port];
  if (ref.index !== void 0) out.push(ref.index);
  return out;
}
function eventTuple(event) {
  if (event === null || typeof event !== "object") {
    throw new ProtocolError(
      "each trace event must be a [time_delta_ms, event_type, payload] tuple",
      CMD_FLOWTRACE_CHUNK
    );
  }
  const { timeDeltaMs, eventType, payload } = event;
  if (!Number.isInteger(timeDeltaMs) || timeDeltaMs < 0 || timeDeltaMs > 4294967295) {
    throw new ProtocolError(
      "time_delta_ms must be a uint32",
      CMD_FLOWTRACE_CHUNK
    );
  }
  return [timeDeltaMs, eventType, payload];
}
function assertTimestamp(timestamp, opcode) {
  if (!Number.isInteger(timestamp) || timestamp < 0) {
    throw new ProtocolError(
      "timestamps must be non-negative epoch milliseconds",
      opcode
    );
  }
}
function assertFlushInterval(interval, opcode) {
  if (!Number.isInteger(interval) || interval < 0) {
    throw new ProtocolError(
      "requested_flush_interval_ms must be a non-negative integer",
      opcode
    );
  }
}
function expectFrame4(frame, opcode, arity) {
  if (!Array.isArray(frame) || frame[0] !== opcode) {
    throw new ProtocolError("unexpected frame opcode", opcode);
  }
  if (frame.length !== arity) {
    throw new ProtocolError(
      `frame must carry exactly ${arity} elements`,
      opcode
    );
  }
}

// node_modules/@noflo/fbp-protocol/src/transport.js
import { MsgPack as MsgPack5 } from "./reticulum-core.js";
var DESTINATION_HASH_BYTES = 16;
function encodeAnnounceAppData({
  protocolVersion = PROTOCOL_VERSION,
  destinationHash,
  nodeName
}) {
  return MsgPack5.encode([
    protocolVersion,
    destinationHashBytes(destinationHash),
    nodeName
  ]);
}
function decodeAnnounceAppData(bytes) {
  const frame = MsgPack5.decode(bytes);
  if (!Array.isArray(frame) || frame.length !== 3) {
    throw new ProtocolError("announce app_data must be a 3-element array");
  }
  const [protocolVersion, destinationHash, nodeName] = frame;
  if (!Number.isInteger(protocolVersion) || protocolVersion < 0) {
    throw new ProtocolError(
      "announce app_data protocol_version must be a uint"
    );
  }
  const hash = destinationHashBytes(destinationHash);
  return {
    protocolVersion,
    destinationHash: hash,
    destinationHashHex: hashHex(hash),
    nodeName
  };
}
function encodeAuthResponse({
  protocolVersion = PROTOCOL_VERSION,
  capabilityMask,
  limitationCode = LIMITATION.FULL_ACCESS,
  runtimeMetadata = null,
  advertisedMask = capabilityMask
}) {
  return MsgPack5.encode([
    CMD_AUTH_RESPONSE,
    protocolVersion,
    capabilityMask,
    limitationCode,
    runtimeMetadata,
    advertisedMask
  ]);
}
function decodeAuthResponse(bytes) {
  const frame = MsgPack5.decode(bytes);
  if (!Array.isArray(frame) || frame[0] !== CMD_AUTH_RESPONSE) {
    throw new ProtocolError(
      "expected an auth response frame",
      CMD_AUTH_RESPONSE
    );
  }
  if (frame.length !== 6) {
    throw new ProtocolError(
      "auth response must carry opcode, protocol_version, capability_mask, limitation_code, runtime_metadata, and advertised_mask",
      CMD_AUTH_RESPONSE
    );
  }
  const [
    ,
    protocolVersion,
    capabilityMask,
    limitationCode,
    runtimeMetadata,
    advertisedMask
  ] = frame;
  for (const field of [
    protocolVersion,
    capabilityMask,
    limitationCode,
    advertisedMask
  ]) {
    if (!Number.isInteger(field) || field < 0 || field > 255) {
      throw new ProtocolError(
        "auth response fields must be uint8 values",
        CMD_AUTH_RESPONSE
      );
    }
  }
  return {
    cmd: CMD_AUTH_RESPONSE,
    protocolVersion,
    capabilityMask,
    limitationCode,
    runtimeMetadata,
    advertisedMask
  };
}
function destinationHashBytes(value) {
  if (typeof value === "string") {
    const cleaned = value.startsWith("0x") ? value.slice(2) : value;
    if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length !== DESTINATION_HASH_BYTES * 2) {
      throw new ProtocolError(
        "destination hash hex string must carry exactly 16 bytes"
      );
    }
    const bytes = new Uint8Array(DESTINATION_HASH_BYTES);
    for (let i = 0; i < DESTINATION_HASH_BYTES; i++) {
      bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  if (value instanceof Uint8Array) {
    if (value.byteLength !== DESTINATION_HASH_BYTES) {
      throw new ProtocolError(
        `destination hash must be exactly ${DESTINATION_HASH_BYTES} bytes, got ${value.byteLength}`
      );
    }
    return value;
  }
  throw new ProtocolError("destination hash must be raw bytes or a hex string");
}
function hashHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// node_modules/@noflo/fbp-protocol/src/decode.js
function decodeFrame(bytes) {
  const head = MsgPack6.decode(bytes);
  const opcode = Array.isArray(head) ? head[0] : void 0;
  switch (opcode) {
    case CMD_AUTH_RESPONSE:
      return decodeAuthResponse(bytes);
    case CMD_CRDT_SYNC_REQ:
      return decodeCrdtSyncReq(bytes);
    case CMD_CRDT_UP_TO_DATE:
      return decodeCrdtUpToDate(bytes);
    case CMD_CRDT_STALE_EPOCH:
      return decodeCrdtStaleEpoch(bytes);
    case CMD_CRDT_UPDATE:
      return decodeCrdtUpdate(bytes);
    case CMD_PLANE_DROP:
      return decodePlaneDrop(bytes);
    case CMD_PLANE_LIST:
      return head.length === 1 ? decodePlaneList(bytes) : decodePlaneListRes(bytes);
    case CMD_OP_REJECTED:
      return decodeOpRejected(bytes);
    case CMD_COMP_SYNC_REQ:
      return decodeCompSyncReq(bytes);
    case CMD_COMP_UP_TO_DATE:
      return decodeCompUpToDate(bytes);
    case CMD_COMP_MANIFEST:
      return decodeCompManifest(bytes);
    case CMD_COMP_DETAIL_REQ:
      return decodeCompDetailReq(bytes);
    case CMD_COMP_DETAIL_RES:
      return decodeCompDetailRes(bytes);
    case CMD_COMP_WRITE:
      return decodeCompWrite(bytes);
    case CMD_COMP_SOURCE:
      return head.length === 2 ? decodeCompSourceReq(bytes) : decodeCompSourceRes(bytes);
    case CMD_COMP_INSTALL_REQ:
      return decodeCompInstallReq(bytes);
    case CMD_SCHEMA_REQ:
      return decodeSchemaReq(bytes);
    case CMD_SCHEMA_RES:
      return decodeSchemaRes(bytes);
    case CMD_SCHEMA_WRITE:
      return decodeSchemaWrite(bytes);
    case CMD_PUBSUB_SUB:
      return decodePubsubSub(bytes);
    case CMD_FLOWTRACE_CHUNK:
      return decodeFlowtraceChunk(bytes);
    case CMD_RUN_CTRL:
      return decodeRunCtrl(bytes);
    case CMD_PACKET_SEND:
      return decodePacketSend(bytes);
    case CMD_GET_STATUS:
      return head.length === 1 ? decodeGetStatus(bytes) : decodeGetStatusRes(bytes);
    case CMD_BREAKPOINT_SET:
      return decodeBreakpointSet(bytes);
    case CMD_BREAKPOINT_CLEAR:
      return decodeBreakpointClear(bytes);
    case CMD_PROCESS_CTRL:
      return decodeProcessCtrl(bytes);
    case CMD_PROCESS_LIST_REQ:
      return decodeProcessListReq(bytes);
    case CMD_PROCESS_LIST:
      return decodeProcessList(bytes);
    case CMD_HWM_SET:
      return decodeHwmSet(bytes);
    default: {
      throw new ProtocolError(
        opcode === void 0 ? "frame does not start with an opcode" : "unknown command code",
        typeof opcode === "number" ? opcode : void 0,
        opcode === void 0 ? REASON.MALFORMED : REASON.UNKNOWN_COMMAND
      );
    }
  }
}

// node_modules/@noflo/fbp-protocol/src/lxmf.js
import { MsgPack as MsgPack7 } from "./reticulum-core.js";
function encodeLxmTelemetry(telemetry) {
  assertTelemetry(telemetry);
  const { timestamp, uptime, isSafeMode, metrics, visual, errors } = telemetry;
  return MsgPack7.encode([
    timestamp,
    uptime,
    isSafeMode,
    [metrics.battery, metrics.solar, metrics.ram, metrics.cpu],
    [visual.format, visual.bitmap],
    errors
  ]);
}
function decodeLxmTelemetry(bytes) {
  const frame = MsgPack7.decode(bytes);
  if (!Array.isArray(frame) || frame.length !== 6) {
    throw new ProtocolError("lxmf telemetry payload must be a 6-element array");
  }
  const [timestamp, uptime, isSafeMode, metrics, visual, errors] = frame;
  assertTimestamp2(timestamp, "timestamp");
  assertTimestamp2(uptime, "uptime");
  if (typeof isSafeMode !== "boolean") {
    throw new ProtocolError("is_safe_mode must be a boolean");
  }
  if (!Array.isArray(metrics) || metrics.length !== 4) {
    throw new ProtocolError(
      "device metrics must be a [battery, solar, ram, cpu] array"
    );
  }
  for (const value of metrics) {
    if (value !== null && typeof value !== "number") {
      throw new ProtocolError("device metrics must be numbers or null");
    }
  }
  if (!Array.isArray(visual) || visual.length !== 2) {
    throw new ProtocolError(
      "visual state must be a [visual_format, visual_bitmap] pair"
    );
  }
  const [format, bitmap] = visual;
  if (!Object.values(VISUAL_FORMAT).includes(format)) {
    throw new ProtocolError("visual_format must be a documented format type");
  }
  if (bitmap !== null && !(bitmap instanceof Uint8Array)) {
    throw new ProtocolError("visual_bitmap must be binary or null");
  }
  if (!Array.isArray(errors) || errors.some((error) => typeof error !== "string")) {
    throw new ProtocolError("errors must be an array of strings");
  }
  return {
    timestamp,
    uptime,
    isSafeMode,
    metrics: {
      battery: metrics[0],
      solar: metrics[1],
      ram: metrics[2],
      cpu: metrics[3]
    },
    visual: { format, bitmap: bitmap === null ? null : new Uint8Array(bitmap) },
    errors: [...errors]
  };
}
function assertTelemetry(telemetry) {
  if (telemetry === null || typeof telemetry !== "object") {
    throw new ProtocolError("telemetry must be a payload object");
  }
  assertTimestamp2(telemetry.timestamp, "timestamp");
  assertTimestamp2(telemetry.uptime, "uptime");
  if (typeof telemetry.isSafeMode !== "boolean") {
    throw new ProtocolError("is_safe_mode must be a boolean");
  }
  const { metrics, visual, errors } = telemetry;
  if (metrics === null || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new ProtocolError(
      "device metrics must be a [battery, solar, ram, cpu] object"
    );
  }
  for (const key of ["battery", "solar", "ram", "cpu"]) {
    const value = metrics[key];
    if (value !== null && value !== void 0 && typeof value !== "number") {
      throw new ProtocolError(`device metric ${key} must be a number or null`);
    }
  }
  if (visual === null || typeof visual !== "object" || Array.isArray(visual)) {
    throw new ProtocolError("visual state must be a { format, bitmap } object");
  }
  if (!Object.values(VISUAL_FORMAT).includes(visual.format)) {
    throw new ProtocolError("visual format must be a documented format type");
  }
  if (visual.bitmap !== null && visual.bitmap !== void 0 && !(visual.bitmap instanceof Uint8Array)) {
    throw new ProtocolError("visual bitmap must be binary or null");
  }
  if (!Array.isArray(errors) || errors.some((error) => typeof error !== "string")) {
    throw new ProtocolError("errors must be an array of strings");
  }
}
function assertTimestamp2(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ProtocolError(`${field} must be non-negative epoch milliseconds`);
  }
}

// node_modules/@noflo/fbp-protocol/src/schemas/noflo-extension-vocabulary.js
var extensionVocabulary = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "noflo/extension-vocabulary",
  title: "NoFlo extension vocabulary for JSON Schema 2020-12",
  description: "Declares the keywords NoFlo adds to JSON Schema 2020-12 through the spec's own $vocabulary mechanism (work document #37 \xA71, \xA73.2). The NoFlo vocabulary is declared optional (the false form), so validators that do not know our keywords ignore them rather than refusing the document. discriminator is OpenAPI vocabulary, declared here rather than smuggled into core. implements is a root-level keyword computed at publish over root-level allOf/$ref members only.",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    "https://json-schema.org/draft/2020-12/vocab/content": true,
    "urn:noflo:vocab/extension": false
  },
  allOf: [
    {
      $ref: "https://json-schema.org/draft/2020-12/schema"
    }
  ],
  properties: {
    discriminator: {
      $ref: "#/$defs/discriminator"
    },
    implements: {
      type: "array",
      description: "Root-level declaration of the interface ids this schema implements. Computed at publish as the closure over the document's root-level allOf/$ref members; a properties-nested $ref is not an implementation.",
      items: {
        type: "string",
        pattern: "^[a-z][a-z0-9_-]*/"
      }
    }
  },
  $defs: {
    discriminator: {
      type: "object",
      description: "OpenAPI-style discriminator for oneOf pickers: the property whose value selects the implementation, plus the optional value-to-schema mapping.",
      required: ["propertyName"],
      properties: {
        propertyName: {
          type: "string"
        },
        mapping: {
          type: "object",
          additionalProperties: {
            type: "string"
          }
        }
      }
    }
  }
};

// node_modules/@noflo/fbp-protocol/src/schemas/noflo-meta-catalog.js
var metaCatalog = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "noflo/meta-catalog",
  title: "NoFlo metadata catalog document format",
  description: "The published meta-schema for metadata catalog documents (work document #37 \xA73.2): one document per namespace, each entry carrying the key's schema, its class (positional or config), and the entity kinds it applies to. Catalogs are data about schemas, not schemas themselves, and are digest-addressed like every other artifact. Runtimes never load catalogs: metadata validation is editor-side.",
  type: "object",
  required: ["entries"],
  properties: {
    entries: {
      type: "object",
      description: "Namespace keys (`ns.key`) to their declarations.",
      additionalProperties: {
        type: "object",
        required: ["schema", "class", "kinds"],
        properties: {
          schema: {
            type: "object",
            description: "JSON Schema 2020-12 document the key's values must satisfy. Validated editor-side only."
          },
          class: {
            description: "positional keys may travel the 0x05 UI-metadata op and merge per key; config keys are graph state riding insert payloads and merge as one map per entity.",
            enum: ["positional", "config"]
          },
          kinds: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: {
              enum: ["node", "edge", "iip", "export", "group", "graph"]
            }
          }
        }
      }
    }
  }
};

// node_modules/@noflo/fbp-protocol/src/meta-schemas.js
var META_SCHEMAS = {
  "noflo/extension-vocabulary": extensionVocabulary,
  "noflo/meta-catalog": metaCatalog
};
function metaSchemaBody(id) {
  const body = META_SCHEMAS[id];
  if (!body) {
    throw new TypeError(`unknown meta-schema '${id}'`);
  }
  return body;
}
async function metaSchemaDigest(id) {
  const { digestSchema: digestSchema2 } = await Promise.resolve().then(() => (init_schema_identity(), schema_identity_exports));
  return digestSchema2(metaSchemaBody(id));
}

// node_modules/@noflo/fbp-protocol/src/index.js
init_schema_identity();

// node_modules/@noflo/fbp-protocol/src/tracefile.js
import { MsgPack as MsgPack8 } from "./reticulum-core.js";

// node_modules/@noflo/fbp-protocol/src/msgpack-frames.js
var MAX_DEPTH = 128;
function msgpackValueLength(bytes, offset = 0) {
  const [length] = valueLength(bytes, offset, 0);
  return length;
}
function splitMsgpackFrames(bytes) {
  const frames = [];
  let offset = 0;
  while (offset < bytes.byteLength) {
    const length = msgpackValueLength(bytes, offset);
    frames.push(bytes.subarray(offset, offset + length));
    offset += length;
  }
  return frames;
}
function valueLength(bytes, offset, depth) {
  if (depth > MAX_DEPTH) {
    throw new ProtocolError(
      "msgpack nesting depth exceeded while walking frames"
    );
  }
  if (offset >= bytes.byteLength) {
    throw new ProtocolError("truncated msgpack value");
  }
  const marker = bytes[offset];
  if (marker <= 127 || marker >= 224) return [1, 0];
  if (marker >= 128 && marker <= 143)
    return containerLength(bytes, offset, depth, marker & 15, 2);
  if (marker >= 144 && marker <= 159)
    return containerLength(bytes, offset, depth, marker & 15, 1);
  if (marker >= 160 && marker <= 191) return [1 + (marker & 31), 0];
  switch (marker) {
    case 192:
    // nil
    case 194:
    // false
    case 195:
      return [1, 0];
    case 196:
      return fixed(bytes, offset, 1, 1);
    // bin 8
    case 197:
      return fixed(bytes, offset, 2, 1);
    // bin 16
    case 198:
      return fixed(bytes, offset, 4, 1);
    // bin 32
    case 199:
      return extLength(bytes, offset, 1);
    // ext 8
    case 200:
      return extLength(bytes, offset, 2);
    // ext 16
    case 201:
      return extLength(bytes, offset, 4);
    // ext 32
    case 202:
      return fixed(bytes, offset, 0, 4);
    // float 32
    case 203:
      return fixed(bytes, offset, 0, 8);
    // float 64
    case 204:
      return fixed(bytes, offset, 0, 1);
    // uint 8
    case 205:
      return fixed(bytes, offset, 0, 2);
    // uint 16
    case 206:
      return fixed(bytes, offset, 0, 4);
    // uint 32
    case 207:
      return fixed(bytes, offset, 0, 8);
    // uint 64
    case 208:
      return fixed(bytes, offset, 0, 1);
    // int 8
    case 209:
      return fixed(bytes, offset, 0, 2);
    // int 16
    case 210:
      return fixed(bytes, offset, 0, 4);
    // int 32
    case 211:
      return fixed(bytes, offset, 0, 8);
    // int 64
    case 212:
      return fixed(bytes, offset, 1, 1);
    // fixext 1
    case 213:
      return fixed(bytes, offset, 1, 2);
    // fixext 2
    case 214:
      return fixed(bytes, offset, 1, 4);
    // fixext 4
    case 215:
      return fixed(bytes, offset, 1, 8);
    // fixext 8
    case 216:
      return fixed(bytes, offset, 1, 16);
    // fixext 16
    case 217:
      return fixed(bytes, offset, 1, 1);
    // str 8
    case 218:
      return fixed(bytes, offset, 2, 1);
    // str 16
    case 219:
      return fixed(bytes, offset, 4, 1);
    // str 32
    case 220:
      return containerLength(
        bytes,
        offset,
        depth,
        readUint(bytes, offset, 2),
        1
      );
    // array 16
    case 221:
      return containerLength(
        bytes,
        offset,
        depth,
        readUint(bytes, offset, 4),
        1
      );
    // array 32
    case 222:
      return containerLength(
        bytes,
        offset,
        depth,
        readUint(bytes, offset, 2),
        2
      );
    // map 16
    case 223:
      return containerLength(
        bytes,
        offset,
        depth,
        readUint(bytes, offset, 4),
        2
      );
    // map 32
    default:
      throw new ProtocolError(
        `unknown msgpack marker 0x${marker.toString(16)}`
      );
  }
}
function fixed(bytes, offset, headerBytes, bodyBytes) {
  const total = 1 + headerBytes + bodyBytes;
  if (headerBytes > 0 && bodyBytes === 1) {
    const length = readUint(bytes, offset, headerBytes);
    return [1 + headerBytes + length, 0];
  }
  if (headerBytes > 0) {
    throw new ProtocolError("unexpected length-prefixed value shape");
  }
  return [total, 0];
}
function extLength(bytes, offset, headerBytes) {
  const length = readUint(bytes, offset, headerBytes);
  return [1 + headerBytes + 1 + length, 0];
}
function containerLength(bytes, offset, depth, count, stride) {
  let consumed = 1;
  let cursor = offset + 1;
  for (let i = 0; i < count * stride; i++) {
    const [length] = valueLength(bytes, cursor, depth + 1);
    consumed += length;
    cursor += length;
  }
  return [consumed, count];
}
function readUint(bytes, offset, width) {
  let value = 0;
  for (let i = 0; i < width; i++) {
    if (offset + 1 + i >= bytes.byteLength) {
      throw new ProtocolError("truncated msgpack value");
    }
    value = value * 256 + bytes[offset + 1 + i];
  }
  return value;
}

// node_modules/@noflo/fbp-protocol/src/tracefile.js
function encodeTraceSnapshot({
  formatVersion = 1,
  timestampMs,
  runtimeMetadata = null,
  graphDefinition
}) {
  if (!Number.isInteger(timestampMs) || timestampMs < 0) {
    throw new ProtocolError(
      "timestamp_ms must be non-negative epoch milliseconds",
      TRACE_SNAPSHOT
    );
  }
  if (!Number.isInteger(formatVersion) || formatVersion <= 0) {
    throw new ProtocolError(
      "format_ver must be a positive integer",
      TRACE_SNAPSHOT
    );
  }
  return MsgPack8.encode([
    TRACE_SNAPSHOT,
    formatVersion,
    timestampMs,
    runtimeMetadata,
    graphDefinition
  ]);
}
function assembleTraceFile({
  runtimeMetadata,
  graphDefinition,
  chunks,
  timestampMs = Date.now(),
  formatVersion = 1
}) {
  if (!Array.isArray(chunks)) {
    throw new ProtocolError(
      "chunks must be an array of encoded 0x32 frames",
      TRACE_SNAPSHOT
    );
  }
  for (const chunk of chunks) {
    decodeFlowtraceChunk(chunk);
  }
  const parts = [
    encodeTraceSnapshot({
      formatVersion,
      timestampMs,
      runtimeMetadata,
      graphDefinition
    }),
    ...chunks
  ];
  return concat(parts);
}
function readTraceFile(bytes) {
  const frames = splitMsgpackFrames(bytes);
  if (frames.length === 0) {
    throw new ProtocolError(
      "a trace file needs at least the snapshot frame",
      TRACE_SNAPSHOT
    );
  }
  const snapshotFrame = MsgPack8.decode(frames[0]);
  if (!Array.isArray(snapshotFrame) || snapshotFrame[0] !== TRACE_SNAPSHOT) {
    throw new ProtocolError(
      "the first frame of a trace file must be the 0xF0 snapshot",
      TRACE_SNAPSHOT
    );
  }
  if (snapshotFrame.length !== 5) {
    throw new ProtocolError(
      "snapshot frame must carry opcode, format_ver, timestamp_ms, runtime_metadata, and graph_definition",
      TRACE_SNAPSHOT
    );
  }
  const [, formatVersion, timestampMs, runtimeMetadata, graphDefinition] = snapshotFrame;
  if (!Number.isInteger(formatVersion) || formatVersion <= 0) {
    throw new ProtocolError(
      "format_ver must be a positive integer",
      TRACE_SNAPSHOT
    );
  }
  if (!Number.isInteger(timestampMs) || timestampMs < 0) {
    throw new ProtocolError(
      "timestamp_ms must be non-negative epoch milliseconds",
      TRACE_SNAPSHOT
    );
  }
  const chunks = [];
  for (let i = 1; i < frames.length; i++) {
    const chunk = decodeFlowtraceChunk(frames[i]);
    chunks.push(chunk);
  }
  return {
    snapshot: { formatVersion, timestampMs, runtimeMetadata, graphDefinition },
    chunks
  };
}
function assembleTraceFileFromRecorder(state) {
  const snapshot = state?.snapshot;
  if (!snapshot) {
    throw new ProtocolError("recorder state needs a snapshot", TRACE_SNAPSHOT);
  }
  if (!Array.isArray(state.chunks)) {
    throw new ProtocolError(
      "recorder state needs a chunks array",
      TRACE_SNAPSHOT
    );
  }
  const chunks = [];
  if (state.chunks.length > 0) {
    chunks.push(
      encodeFlowtraceChunk({
        subId: 0,
        // A single-plane recording: the main plane (nil) unless the
        // snapshot names one. Multi-plane recordings are staged.
        planeId: null,
        baseTimestampMs: snapshot.timestampMs,
        events: state.chunks.map((tuple) => {
          const meta = tuple[3] ?? null;
          if (tuple[1] === EVENT_TYPE.DATA && meta) {
            const ref = (p) => p ? [p.node, p.port, ...p.index !== void 0 ? [p.index] : []] : null;
            return {
              timeDeltaMs: tuple[0],
              eventType: tuple[1],
              payload: [ref(meta.src), ref(meta.tgt), tuple[2]]
            };
          }
          if ((tuple[1] === EVENT_TYPE.CONNECTION_OPEN || tuple[1] === EVENT_TYPE.CONNECTION_CLOSE) && meta?.src && meta?.tgt) {
            return {
              timeDeltaMs: tuple[0],
              eventType: tuple[1],
              payload: [
                meta.src.node,
                meta.src.port,
                meta.tgt.node,
                meta.tgt.port
              ]
            };
          }
          return {
            timeDeltaMs: tuple[0],
            eventType: tuple[1],
            payload: tuple[2]
          };
        })
      })
    );
  }
  return assembleTraceFile({
    runtimeMetadata: snapshot.runtimeMetadata,
    graphDefinition: snapshot.graphDefinition,
    chunks,
    timestampMs: snapshot.timestampMs,
    formatVersion: snapshot.formatVersion
  });
}
function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
export {
  ANNOUNCE_ASPECT,
  CAPABILITY,
  CATALOGS,
  CMD_AUTH_RESPONSE,
  CMD_BREAKPOINT_CLEAR,
  CMD_BREAKPOINT_SET,
  CMD_COMP_DETAIL_REQ,
  CMD_COMP_DETAIL_RES,
  CMD_COMP_INSTALL_REQ,
  CMD_COMP_MANIFEST,
  CMD_COMP_SOURCE,
  CMD_COMP_SYNC_REQ,
  CMD_COMP_UP_TO_DATE,
  CMD_COMP_WRITE,
  CMD_CRDT_STALE_EPOCH,
  CMD_CRDT_SYNC_REQ,
  CMD_CRDT_UPDATE,
  CMD_CRDT_UP_TO_DATE,
  CMD_FLOWTRACE_CHUNK,
  CMD_GET_STATUS,
  CMD_HWM_SET,
  CMD_OP_REJECTED,
  CMD_PACKET_SEND,
  CMD_PLANE_DROP,
  CMD_PLANE_LIST,
  CMD_PROCESS_CTRL,
  CMD_PROCESS_LIST,
  CMD_PROCESS_LIST_REQ,
  CMD_PUBSUB_SUB,
  CMD_RUN_CTRL,
  CMD_SCHEMA_REQ,
  CMD_SCHEMA_RES,
  CMD_SCHEMA_WRITE,
  COMPONENT_TYPE,
  EVENT_TYPE,
  EXECUTION_STATE,
  GUARD_ENUM_LIMIT,
  GUARD_TYPES,
  LIFECYCLE_CODE,
  LIMITATION,
  META_SCHEMAS,
  OP_TYPE,
  PLANE_KIND,
  PROCESS_ACTION,
  PROTOCOL_VERSION,
  ProtocolError,
  REASON,
  RUN_ACTION,
  RUN_STATE,
  SCHEMA_BUNDLE_MAX_ENTRIES,
  SCHEMA_DIGEST_HEX_LENGTH,
  SCHEMA_INLINE_LIMIT,
  SCHEMA_URN_PREFIX,
  TRACE_SNAPSHOT,
  VISUAL_FORMAT,
  assembleTraceFile,
  assembleTraceFileFromRecorder,
  canonicalManifest,
  canonicalSignature,
  canonicalizeJson,
  capabilitiesMask,
  catalogBody,
  catalogDigest,
  checkGuard,
  collectSchemaRefs,
  dataEventEnvelope,
  decodeAnnounceAppData,
  decodeAuthResponse,
  decodeBreakpointClear,
  decodeBreakpointSet,
  decodeCompDetailReq,
  decodeCompDetailRes,
  decodeCompInstallReq,
  decodeCompManifest,
  decodeCompSourceReq,
  decodeCompSourceRes,
  decodeCompSyncReq,
  decodeCompUpToDate,
  decodeCompWrite,
  decodeCrdtStaleEpoch,
  decodeCrdtSyncReq,
  decodeCrdtUpToDate,
  decodeCrdtUpdate,
  decodeFlowtraceChunk,
  decodeFrame,
  decodeGetStatus,
  decodeGetStatusRes,
  decodeHwmSet,
  decodeLxmTelemetry,
  decodeOpRejected,
  decodePacketSend,
  decodePlaneDrop,
  decodePlaneList,
  decodePlaneListRes,
  decodeProcessCtrl,
  decodeProcessList,
  decodeProcessListReq,
  decodePubsubSub,
  decodeRunCtrl,
  decodeSchemaReq,
  decodeSchemaRes,
  decodeSchemaWrite,
  detectRefCycles,
  digestSchema,
  encodeAnnounceAppData,
  encodeAuthResponse,
  encodeBreakpointClear,
  encodeBreakpointSet,
  encodeCompDetailReq,
  encodeCompDetailRes,
  encodeCompInstallReq,
  encodeCompManifest,
  encodeCompSourceReq,
  encodeCompSourceRes,
  encodeCompSyncReq,
  encodeCompUpToDate,
  encodeCompWrite,
  encodeCrdtStaleEpoch,
  encodeCrdtSyncReq,
  encodeCrdtUpToDate,
  encodeCrdtUpdate,
  encodeFlowtraceChunk,
  encodeFlowtraceChunkFromTimestamps,
  encodeGetStatus,
  encodeGetStatusRes,
  encodeHwmSet,
  encodeLxmTelemetry,
  encodeOpRejected,
  encodePacketSend,
  encodePlaneDrop,
  encodePlaneList,
  encodePlaneListRes,
  encodeProcessCtrl,
  encodeProcessList,
  encodeProcessListReq,
  encodePubsubSub,
  encodeRunCtrl,
  encodeSchemaReq,
  encodeSchemaRes,
  encodeSchemaWrite,
  encodeTraceSnapshot,
  isValidSchemaId,
  metaSchemaBody,
  metaSchemaDigest,
  normalizeSchemaBody,
  parseSchemaRef,
  pinSchemaRefs,
  projectGuard,
  readTraceFile,
  registryHash,
  schemaUrn,
  sigHash,
  validateGuard
};
