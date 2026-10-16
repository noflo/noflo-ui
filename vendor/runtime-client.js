var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// node_modules/@noflo/fbp-protocol/src/schema-identity.js
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
var SCHEMA_URN_PREFIX;
var init_schema_identity = __esm({
  "node_modules/@noflo/fbp-protocol/src/schema-identity.js"() {
    SCHEMA_URN_PREFIX = "urn:noflo:";
  }
});

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
var CMD_PUBSUB_SUB = 48;
var CMD_FLOWTRACE_CHUNK = 50;
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
  assertEntries(entries);
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
function canonicalManifest(entries) {
  assertEntries(entries);
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
function assertEntries(entries) {
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

// node_modules/@noflo/fbp-protocol/src/index.js
init_schema_identity();

// node_modules/@noflo/fbp-protocol/src/tracefile.js
import { MsgPack as MsgPack8 } from "./reticulum-core.js";

// node_modules/@noflo/runtime-client/src/index.js
import { GraphModel } from "./graph.js";
import { Destination, fromHex as fromHex3, Packet, PacketType } from "./reticulum-core.js";

// node_modules/@noflo/runtime-client/src/execution.js
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
      const sigHash2 = entry.sigHash;
      fresh[name] = {
        sigHash: sigHash2,
        type: entry.type,
        ...known && known.sigHash === sigHash2 && known.signature ? { signature: known.signature } : {}
      };
      if (!known || known.sigHash !== sigHash2) {
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
import { fromHex as fromHex2 } from "./reticulum-core.js";
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
    const walk2 = (digest) => {
      if (out.has(digest) || this.#bodies.has(digest)) return;
      out.add(digest);
    };
    for (const digest of digests) {
      walk2(digest);
      const held = this.#bodies.get(digest);
      if (held) {
        for (const ref of refsOf(held)) walk2(ref);
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
        wanted.map((digest) => fromHex2(digest)),
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

// node_modules/@noflo/runtime-client/src/telemetry.js
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
    const [hashHex2, entry] of
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
      const destinationHash = fromHex3(hashHex2);
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
    await this.send(encodeCompSyncReq(registryHash2));
    return decodeCompManifest(await reply);
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
  ANNOUNCE_ASPECT,
  ExecutionClient,
  OP_TYPE,
  PROCESS_ACTION as PROCESS_ACTIONS,
  PROTOCOL_VERSION,
  RUN_ACTION as RUN_ACTIONS,
  RUN_STATE,
  RegistryCache,
  RuntimeClient,
  SchemaCache,
  TelemetryClient,
  UiEventSurface,
  connectRuntime,
  decodeAnnounceAppData,
  decodeAuthResponse,
  decodeCompManifest,
  decodeCrdtStaleEpoch,
  decodeCrdtUpToDate,
  decodeCrdtUpdate,
  decodeFlowtraceChunk,
  decodeGetStatusRes,
  decodeOpRejected,
  decodePlaneListRes,
  discoverRuntime,
  encodeCompManifest,
  encodeCompSourceRes,
  encodeCompSyncReq,
  encodeCrdtStaleEpoch,
  encodeCrdtSyncReq,
  encodeCrdtUpToDate,
  encodeCrdtUpdate,
  encodeGetStatus,
  encodeGetStatusRes,
  encodePlaneList,
  encodePlaneListRes,
  encodePubsubSub
};
