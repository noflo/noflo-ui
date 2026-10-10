// src/shims/bzip2-stub.js
var BZip2Stub = class {
  async init() {
    throw new Error(
      "bzip2 compression is not bundled; large CRDT updates travel uncompressed"
    );
  }
};

// node_modules/y-reticulum/src/compression.js
var initPromise = null;
function getCompressionProvider() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const bz2 = new BZip2Stub();
        await bz2.init();
        return bz2;
      } catch {
        return null;
      }
    })();
  }
  return initPromise;
}

// node_modules/y-reticulum/src/destination.js
import { fromHex, Identity, toHex } from "./reticulum-core.js";
var DESTINATION_APP_PREFIX = "y-reticulum.sync";
async function roomDestinationHash(roomName, peerIdentityHashHex) {
  const appName = await roomDestinationName(roomName);
  const nameHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(appName)
  );
  const nameHash = new Uint8Array(nameHashBuffer.slice(0, 10));
  const identityHash = fromHex(peerIdentityHashHex);
  const combined = new Uint8Array(nameHash.length + identityHash.length);
  combined.set(nameHash, 0);
  combined.set(identityHash, nameHash.length);
  const destinationHash = await Identity.truncatedHash(combined);
  return toHex(destinationHash);
}
async function roomDestinationName(roomName) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(roomName)
  );
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return `${DESTINATION_APP_PREFIX}.${hex}`;
}

// node_modules/lib0/binary.js
var BIT8 = 128;
var BIT18 = 1 << 17;
var BIT19 = 1 << 18;
var BIT20 = 1 << 19;
var BIT21 = 1 << 20;
var BIT22 = 1 << 21;
var BIT23 = 1 << 22;
var BIT24 = 1 << 23;
var BIT25 = 1 << 24;
var BIT26 = 1 << 25;
var BIT27 = 1 << 26;
var BIT28 = 1 << 27;
var BIT29 = 1 << 28;
var BIT30 = 1 << 29;
var BIT31 = 1 << 30;
var BIT32 = 1 << 31;
var BITS7 = 127;
var BITS17 = BIT18 - 1;
var BITS18 = BIT19 - 1;
var BITS19 = BIT20 - 1;
var BITS20 = BIT21 - 1;
var BITS21 = BIT22 - 1;
var BITS22 = BIT23 - 1;
var BITS23 = BIT24 - 1;
var BITS24 = BIT25 - 1;
var BITS25 = BIT26 - 1;
var BITS26 = BIT27 - 1;
var BITS27 = BIT28 - 1;
var BITS28 = BIT29 - 1;
var BITS29 = BIT30 - 1;
var BITS30 = BIT31 - 1;

// node_modules/lib0/math.js
var floor = Math.floor;
var min = (a, b) => a < b ? a : b;
var max = (a, b) => a > b ? a : b;
var isNaN = Number.isNaN;

// node_modules/lib0/number.js
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
var MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
var LOWEST_INT32 = 1 << 31;
var isInteger = Number.isInteger || ((num) => typeof num === "number" && isFinite(num) && floor(num) === num);
var isNaN2 = Number.isNaN;
var parseInt = Number.parseInt;

// node_modules/lib0/set.js
var create = () => /* @__PURE__ */ new Set();

// node_modules/lib0/array.js
var from = Array.from;

// node_modules/lib0/string.js
var fromCharCode = String.fromCharCode;
var fromCodePoint = String.fromCodePoint;
var MAX_UTF16_CHARACTER = fromCharCode(65535);
var _encodeUtf8Polyfill = (str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */
    encodedString.codePointAt(i);
  }
  return buf;
};
var utf8TextEncoder = (
  /** @type {TextEncoder} */
  typeof TextEncoder !== "undefined" ? new TextEncoder() : null
);
var _encodeUtf8Native = (str) => utf8TextEncoder.encode(str);
var encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;
var utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
if (utf8TextDecoder && utf8TextDecoder.decode(new Uint8Array()).length === 1) {
  utf8TextDecoder = null;
}

// node_modules/lib0/error.js
var create2 = (s) => new Error(s);

// node_modules/lib0/encoding.js
var Encoder = class {
  constructor() {
    this.cpos = 0;
    this.cbuf = new Uint8Array(100);
    this.bufs = [];
  }
};
var createEncoder = () => new Encoder();
var length = (encoder) => {
  let len = encoder.cpos;
  for (let i = 0; i < encoder.bufs.length; i++) {
    len += encoder.bufs[i].length;
  }
  return len;
};
var toUint8Array = (encoder) => {
  const uint8arr = new Uint8Array(length(encoder));
  let curPos = 0;
  for (let i = 0; i < encoder.bufs.length; i++) {
    const d = encoder.bufs[i];
    uint8arr.set(d, curPos);
    curPos += d.length;
  }
  uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
  return uint8arr;
};
var write = (encoder, num) => {
  const bufferLen = encoder.cbuf.length;
  if (encoder.cpos === bufferLen) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(bufferLen * 2);
    encoder.cpos = 0;
  }
  encoder.cbuf[encoder.cpos++] = num;
};
var writeVarUint = (encoder, num) => {
  while (num > BITS7) {
    write(encoder, BIT8 | BITS7 & num);
    num = floor(num / 128);
  }
  write(encoder, BITS7 & num);
};
var _strBuffer = new Uint8Array(3e4);
var _maxStrBSize = _strBuffer.length / 3;
var _writeVarStringNative = (encoder, str) => {
  if (str.length < _maxStrBSize) {
    const written = utf8TextEncoder.encodeInto(str, _strBuffer).written || 0;
    writeVarUint(encoder, written);
    for (let i = 0; i < written; i++) {
      write(encoder, _strBuffer[i]);
    }
  } else {
    writeVarUint8Array(encoder, encodeUtf8(str));
  }
};
var _writeVarStringPolyfill = (encoder, str) => {
  const encodedString = unescape(encodeURIComponent(str));
  const len = encodedString.length;
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    write(
      encoder,
      /** @type {number} */
      encodedString.codePointAt(i)
    );
  }
};
var writeVarString = utf8TextEncoder && /** @type {any} */
utf8TextEncoder.encodeInto ? _writeVarStringNative : _writeVarStringPolyfill;
var writeUint8Array = (encoder, uint8Array) => {
  const bufferLen = encoder.cbuf.length;
  const cpos = encoder.cpos;
  const leftCopyLen = min(bufferLen - cpos, uint8Array.length);
  const rightCopyLen = uint8Array.length - leftCopyLen;
  encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos);
  encoder.cpos += leftCopyLen;
  if (rightCopyLen > 0) {
    encoder.bufs.push(encoder.cbuf);
    encoder.cbuf = new Uint8Array(max(bufferLen * 2, rightCopyLen));
    encoder.cbuf.set(uint8Array.subarray(leftCopyLen));
    encoder.cpos = rightCopyLen;
  }
};
var writeVarUint8Array = (encoder, uint8Array) => {
  writeVarUint(encoder, uint8Array.byteLength);
  writeUint8Array(encoder, uint8Array);
};
var floatTestBed = new DataView(new ArrayBuffer(4));

// node_modules/lib0/decoding.js
var errorUnexpectedEndOfArray = create2("Unexpected end of array");
var errorIntegerOutOfRange = create2("Integer out of Range");
var Decoder = class {
  /**
   * @param {Uint8Array<Buf>} uint8Array Binary data to decode
   */
  constructor(uint8Array) {
    this.arr = uint8Array;
    this.pos = 0;
  }
};
var createDecoder = (uint8Array) => new Decoder(uint8Array);
var readUint8Array = (decoder, len) => {
  const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
  decoder.pos += len;
  return view;
};
var readVarUint8Array = (decoder) => readUint8Array(decoder, readVarUint(decoder));
var readUint8 = (decoder) => decoder.arr[decoder.pos++];
var readVarUint = (decoder) => {
  let num = 0;
  let mult = 1;
  const len = decoder.arr.length;
  while (decoder.pos < len) {
    const r = decoder.arr[decoder.pos++];
    num = num + (r & BITS7) * mult;
    mult *= 128;
    if (r < BIT8) {
      return num;
    }
    if (num > MAX_SAFE_INTEGER) {
      throw errorIntegerOutOfRange;
    }
  }
  throw errorUnexpectedEndOfArray;
};
var _readVarStringPolyfill = (decoder) => {
  let remainingLen = readVarUint(decoder);
  if (remainingLen === 0) {
    return "";
  } else {
    let encodedString = String.fromCodePoint(readUint8(decoder));
    if (--remainingLen < 100) {
      while (remainingLen--) {
        encodedString += String.fromCodePoint(readUint8(decoder));
      }
    } else {
      while (remainingLen > 0) {
        const nextLen = remainingLen < 1e4 ? remainingLen : 1e4;
        const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
        decoder.pos += nextLen;
        encodedString += String.fromCodePoint.apply(
          null,
          /** @type {any} */
          bytes
        );
        remainingLen -= nextLen;
      }
    }
    return decodeURIComponent(escape(encodedString));
  }
};
var _readVarStringNative = (decoder) => (
  /** @type any */
  utf8TextDecoder.decode(readVarUint8Array(decoder))
);
var readVarString = utf8TextDecoder ? _readVarStringNative : _readVarStringPolyfill;

// node_modules/lib0/time.js
var getUnixTime = Date.now;

// node_modules/lib0/map.js
var create3 = () => /* @__PURE__ */ new Map();
var setIfUndefined = (map, key, createT) => {
  let set = map.get(key);
  if (set === void 0) {
    map.set(key, set = createT());
  }
  return set;
};

// node_modules/lib0/observable.js
var ObservableV2 = class {
  constructor() {
    this._observers = create3();
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  on(name, f) {
    setIfUndefined(
      this._observers,
      /** @type {string} */
      name,
      create
    ).add(f);
    return f;
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  once(name, f) {
    const _f = (...args) => {
      this.off(
        name,
        /** @type {any} */
        _f
      );
      f(...args);
    };
    this.on(
      name,
      /** @type {any} */
      _f
    );
  }
  /**
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name
   * @param {EVENTS[NAME]} f
   */
  off(name, f) {
    const observers = this._observers.get(name);
    if (observers !== void 0) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @template {keyof EVENTS & string} NAME
   * @param {NAME} name The event name.
   * @param {Parameters<EVENTS[NAME]>} args The arguments that are applied to the event listener.
   */
  emit(name, args) {
    return from((this._observers.get(name) || create3()).values()).forEach((f) => f(...args));
  }
  destroy() {
    this._observers = create3();
  }
};
var Observable = class {
  constructor() {
    this._observers = create3();
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  on(name, f) {
    setIfUndefined(this._observers, name, create).add(f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  once(name, f) {
    const _f = (...args) => {
      this.off(name, _f);
      f(...args);
    };
    this.on(name, _f);
  }
  /**
   * @param {N} name
   * @param {function} f
   */
  off(name, f) {
    const observers = this._observers.get(name);
    if (observers !== void 0) {
      observers.delete(f);
      if (observers.size === 0) {
        this._observers.delete(name);
      }
    }
  }
  /**
   * Emit a named event. All registered event listeners that listen to the
   * specified name will receive the event.
   *
   * @todo This should catch exceptions
   *
   * @param {N} name The event name.
   * @param {Array<any>} args The arguments that are applied to the event listener.
   */
  emit(name, args) {
    return from((this._observers.get(name) || create3()).values()).forEach((f) => f(...args));
  }
  destroy() {
    this._observers = create3();
  }
};

// node_modules/lib0/trait/equality.js
var EqualityTraitSymbol = /* @__PURE__ */ Symbol("Equality");

// node_modules/lib0/object.js
var keys = Object.keys;
var size = (obj) => keys(obj).length;
var hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// node_modules/lib0/function.js
var equalityDeep = (a, b) => {
  if (a === b) {
    return true;
  }
  if (a == null || b == null || a.constructor !== b.constructor && (a.constructor || Object) !== (b.constructor || Object)) {
    return false;
  }
  if (a[EqualityTraitSymbol] != null) {
    return a[EqualityTraitSymbol](b);
  }
  switch (a.constructor) {
    case ArrayBuffer:
      a = new Uint8Array(a);
      b = new Uint8Array(b);
    // eslint-disable-next-line no-fallthrough
    case Uint8Array: {
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return false;
        }
      }
      break;
    }
    case Set: {
      if (a.size !== b.size) {
        return false;
      }
      for (const value of a) {
        if (!b.has(value)) {
          return false;
        }
      }
      break;
    }
    case Map: {
      if (a.size !== b.size) {
        return false;
      }
      for (const key of a.keys()) {
        if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) {
          return false;
        }
      }
      break;
    }
    case void 0:
    case Object:
      if (size(a) !== size(b)) {
        return false;
      }
      for (const key in a) {
        if (!hasProperty(a, key) || !equalityDeep(a[key], b[key])) {
          return false;
        }
      }
      break;
    case Array:
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!equalityDeep(a[i], b[i])) {
          return false;
        }
      }
      break;
    default:
      return false;
  }
  return true;
};

// node_modules/y-protocols/awareness.js
import * as Y from "./yjs.js";
var outdatedTimeout = 3e4;
var Awareness = class extends Observable {
  /**
   * @param {Y.Doc} doc
   */
  constructor(doc) {
    super();
    this.doc = doc;
    this.clientID = doc.clientID;
    this.states = /* @__PURE__ */ new Map();
    this.meta = /* @__PURE__ */ new Map();
    this._checkInterval = /** @type {any} */
    setInterval(() => {
      const now = getUnixTime();
      if (this.getLocalState() !== null && outdatedTimeout / 2 <= now - /** @type {{lastUpdated:number}} */
      this.meta.get(this.clientID).lastUpdated) {
        this.setLocalState(this.getLocalState());
      }
      const remove = [];
      this.meta.forEach((meta, clientid) => {
        if (clientid !== this.clientID && outdatedTimeout <= now - meta.lastUpdated && this.states.has(clientid)) {
          remove.push(clientid);
        }
      });
      if (remove.length > 0) {
        removeAwarenessStates(this, remove, "timeout");
      }
    }, floor(outdatedTimeout / 10));
    doc.on("destroy", () => {
      this.destroy();
    });
    this.setLocalState({});
  }
  destroy() {
    this.emit("destroy", [this]);
    this.setLocalState(null);
    super.destroy();
    clearInterval(this._checkInterval);
  }
  /**
   * @return {Object<string,any>|null}
   */
  getLocalState() {
    return this.states.get(this.clientID) || null;
  }
  /**
   * @param {Object<string,any>|null} state
   */
  setLocalState(state) {
    const clientID = this.clientID;
    const currLocalMeta = this.meta.get(clientID);
    const clock = currLocalMeta === void 0 ? 0 : currLocalMeta.clock + 1;
    const prevState = this.states.get(clientID);
    if (state === null) {
      this.states.delete(clientID);
    } else {
      this.states.set(clientID, state);
    }
    this.meta.set(clientID, {
      clock,
      lastUpdated: getUnixTime()
    });
    const added = [];
    const updated = [];
    const filteredUpdated = [];
    const removed = [];
    if (state === null) {
      removed.push(clientID);
    } else if (prevState == null) {
      if (state != null) {
        added.push(clientID);
      }
    } else {
      updated.push(clientID);
      if (!equalityDeep(prevState, state)) {
        filteredUpdated.push(clientID);
      }
    }
    if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
      this.emit("change", [{ added, updated: filteredUpdated, removed }, "local"]);
    }
    this.emit("update", [{ added, updated, removed }, "local"]);
  }
  /**
   * @param {string} field
   * @param {any} value
   */
  setLocalStateField(field, value) {
    const state = this.getLocalState();
    if (state !== null) {
      this.setLocalState({
        ...state,
        [field]: value
      });
    }
  }
  /**
   * @return {Map<number,Object<string,any>>}
   */
  getStates() {
    return this.states;
  }
};
var removeAwarenessStates = (awareness, clients, origin) => {
  const removed = [];
  for (let i = 0; i < clients.length; i++) {
    const clientID = clients[i];
    if (awareness.states.has(clientID)) {
      awareness.states.delete(clientID);
      if (clientID === awareness.clientID) {
        const curMeta = (
          /** @type {MetaClientState} */
          awareness.meta.get(clientID)
        );
        awareness.meta.set(clientID, {
          clock: curMeta.clock + 1,
          lastUpdated: getUnixTime()
        });
      }
      removed.push(clientID);
    }
  }
  if (removed.length > 0) {
    awareness.emit("change", [{ added: [], updated: [], removed }, origin]);
    awareness.emit("update", [{ added: [], updated: [], removed }, origin]);
  }
};
var encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
  const len = clients.length;
  const encoder = createEncoder();
  writeVarUint(encoder, len);
  for (let i = 0; i < len; i++) {
    const clientID = clients[i];
    const state = states.get(clientID) || null;
    const clock = (
      /** @type {MetaClientState} */
      awareness.meta.get(clientID).clock
    );
    writeVarUint(encoder, clientID);
    writeVarUint(encoder, clock);
    writeVarString(encoder, JSON.stringify(state));
  }
  return toUint8Array(encoder);
};
var applyAwarenessUpdate = (awareness, update, origin) => {
  const decoder = createDecoder(update);
  const timestamp = getUnixTime();
  const added = [];
  const updated = [];
  const filteredUpdated = [];
  const removed = [];
  const len = readVarUint(decoder);
  for (let i = 0; i < len; i++) {
    const clientID = readVarUint(decoder);
    let clock = readVarUint(decoder);
    const state = JSON.parse(readVarString(decoder));
    const clientMeta = awareness.meta.get(clientID);
    const prevState = awareness.states.get(clientID);
    const currClock = clientMeta === void 0 ? 0 : clientMeta.clock;
    if (currClock < clock || currClock === clock && state === null && awareness.states.has(clientID)) {
      if (state === null) {
        if (clientID === awareness.clientID && awareness.getLocalState() != null) {
          clock++;
        } else {
          awareness.states.delete(clientID);
        }
      } else {
        awareness.states.set(clientID, state);
      }
      awareness.meta.set(clientID, {
        clock,
        lastUpdated: timestamp
      });
      if (clientMeta === void 0 && state !== null) {
        added.push(clientID);
      } else if (clientMeta !== void 0 && state === null) {
        removed.push(clientID);
      } else if (state !== null) {
        if (!equalityDeep(state, prevState)) {
          filteredUpdated.push(clientID);
        }
        updated.push(clientID);
      }
    }
  }
  if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) {
    awareness.emit("change", [{
      added,
      updated: filteredUpdated,
      removed
    }, origin]);
  }
  if (added.length > 0 || updated.length > 0 || removed.length > 0) {
    awareness.emit("update", [{
      added,
      updated,
      removed
    }, origin]);
  }
};

// node_modules/y-protocols/sync.js
import * as Y2 from "./yjs.js";
var messageYjsSyncStep1 = 0;
var messageYjsSyncStep2 = 1;
var messageYjsUpdate = 2;
var writeSyncStep1 = (encoder, doc) => {
  writeVarUint(encoder, messageYjsSyncStep1);
  const sv = Y2.encodeStateVector(doc);
  writeVarUint8Array(encoder, sv);
};
var writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  writeVarUint(encoder, messageYjsSyncStep2);
  writeVarUint8Array(encoder, Y2.encodeStateAsUpdate(doc, encodedStateVector));
};
var readSyncStep1 = (decoder, encoder, doc) => writeSyncStep2(encoder, doc, readVarUint8Array(decoder));
var readSyncStep2 = (decoder, doc, transactionOrigin, errorHandler) => {
  try {
    Y2.applyUpdate(doc, readVarUint8Array(decoder), transactionOrigin);
  } catch (error) {
    if (errorHandler != null) errorHandler(
      /** @type {Error} */
      error
    );
    console.error("Caught error while handling a Yjs update", error);
  }
};
var writeUpdate = (encoder, update) => {
  writeVarUint(encoder, messageYjsUpdate);
  writeVarUint8Array(encoder, update);
};
var readUpdate = readSyncStep2;
var readSyncMessage = (decoder, encoder, doc, transactionOrigin, errorHandler) => {
  const messageType = readVarUint(decoder);
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, doc);
      break;
    case messageYjsSyncStep2:
      readSyncStep2(decoder, doc, transactionOrigin, errorHandler);
      break;
    case messageYjsUpdate:
      readUpdate(decoder, doc, transactionOrigin, errorHandler);
      break;
    default:
      throw new Error("Unknown message type");
  }
  return messageType;
};

// node_modules/y-reticulum/src/messages.js
var messageSync = 0;
var messageAwareness = 1;
var messageQueryAwareness = 3;
function readMessage(doc, awareness, buf, origin, roomSynced, onSynced, canWrite = true) {
  const decoder = createDecoder(buf);
  const encoder = createEncoder();
  const messageType = readVarUint(decoder);
  let sendReply = false;
  switch (messageType) {
    case messageSync: {
      writeVarUint(encoder, messageSync);
      if (!canWrite) {
        const syncMessageType2 = readVarUint(decoder);
        if (syncMessageType2 === messageYjsSyncStep1) {
          const stateVector = readVarUint8Array(decoder);
          writeSyncStep2(encoder, doc, stateVector);
          sendReply = true;
        } else if (syncMessageType2 === messageYjsSyncStep2 && !roomSynced) {
          onSynced();
        }
        break;
      }
      const syncMessageType = readSyncMessage(
        decoder,
        encoder,
        doc,
        origin
      );
      if (syncMessageType === messageYjsSyncStep2 && !roomSynced) {
        onSynced();
      }
      if (syncMessageType === messageYjsSyncStep1) {
        sendReply = true;
      }
      break;
    }
    case messageQueryAwareness:
      writeVarUint(encoder, messageAwareness);
      writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(
          awareness,
          Array.from(awareness.getStates().keys())
        )
      );
      sendReply = true;
      break;
    case messageAwareness:
      applyAwarenessUpdate(
        awareness,
        readVarUint8Array(decoder),
        origin
      );
      break;
    default:
      return null;
  }
  return sendReply ? toUint8Array(encoder) : null;
}

// node_modules/y-reticulum/src/peer-conn.js
import {
  CEType,
  ChannelException,
  MessageBase,
  Resource,
  toHex as toHex2
} from "./reticulum-core.js";
var YjsSyncMessage = class extends MessageBase {
  /** Unique y-reticulum message type on the channel (< 0xf000). */
  static MSGTYPE = 1;
  constructor() {
    super();
    this.data = new Uint8Array(0);
  }
  /** @returns {Uint8Array} */
  pack() {
    return this.data;
  }
  /** @param {Uint8Array} raw */
  unpack(raw) {
    this.data = raw;
  }
};
var LinkAuthMessage = class extends MessageBase {
  /** Unique y-reticulum message type on the channel (< 0xf000). */
  static MSGTYPE = 2;
  constructor() {
    super();
    this.data = new Uint8Array(0);
  }
  /** @returns {Uint8Array} */
  pack() {
    return this.data;
  }
  /** @param {Uint8Array} raw */
  unpack(raw) {
    this.data = raw;
  }
};
var PeerConn = class {
  /**
   * @param {object} options
   * @param {import("@reticulum/core").Link} options.link
   * @param {Uint8Array|null} options.remoteDestHash
   *   The peer's destination hash. Known on the initiator side (from the
   *   announce that triggered the link); `null` on the responder side.
   * @param {string|null} options.remoteIdentityHash
   *   Hex truncated identity hash of the remote peer, when it is known at
   *   registration: proven on the initiator side by the announce or dial's
   *   identity recall, on the responder side by the signed identify
   *   handshake. `null` when the peer never proved its identity (no link
   *   policy / authorization configured).
   * @param {{ sync: boolean, write: boolean } | null} [options.capability]
   *   Capability verdict the authorization phase resolved for this peer
   *   (work document #3): `write: false` makes this a read-only peer whose
   *   inbound Doc updates are dropped while awareness and reads still flow.
   *   `null` when no authorization phase ran — the link gates carried the
   *   full sync+write capability, as before.
   * @param {import("@digitaldefiance/bzip2-wasm").default | null} [options.bz2]
   *   Shared bzip2 provider; set on the link so inbound Resources can be
   *   decompressed, and used to compress outbound ones. `null` disables it.
   * @param {(payload: Uint8Array, peer: PeerConn) => void} options.onData
   * @param {(peer: PeerConn) => void} options.onClose
   */
  constructor({
    link,
    remoteDestHash,
    remoteIdentityHash,
    capability = null,
    bz2,
    onData,
    onClose
  }) {
    this.link = link;
    this.link.bz2 = bz2 ?? void 0;
    this.remoteDestHash = remoteDestHash;
    this.remoteIdentityHash = remoteIdentityHash ?? null;
    this.capability = capability ?? null;
    this.canWrite = this.capability ? this.capability.write === true : true;
    this.bz2 = bz2 ?? void 0;
    this.channel = link.getChannel();
    this.channel.registerMessageType(YjsSyncMessage);
    this._onChannelMessage = this._onChannelMessage.bind(this);
    this.channel.addMessageHandler(this._onChannelMessage);
    this.peerId = toHex2(link.linkId);
    this.synced = false;
    this.closed = false;
    this._onData = onData;
    this._onClose = onClose;
    link.addEventListener("resource", (event) => {
      const resource = event.detail.resource;
      resource.whenComplete().then(() => {
        if (resource.data) this._onData(resource.data, this);
      }).catch(() => {
      });
    });
    link.addEventListener("close", () => this._handleClose());
  }
  /**
   * Inbound Yjs channel message: forward the raw body to the room. Returns
   * `true` to claim the message (no other handlers are registered).
   * @param {import("@reticulum/core").MessageBase} msg
   * @returns {boolean}
   */
  _onChannelMessage(msg) {
    if (!(msg instanceof YjsSyncMessage)) return false;
    this._onData(msg.data, this);
    return true;
  }
  /**
   * Sends a raw byte payload to the peer. Small payloads go as a reliable
   * Channel message (waiting for the send window if it is momentarily full);
   * payloads larger than the channel MDU travel as a compressed Resource.
   * @param {Uint8Array} payload
   */
  async send(payload) {
    if (this.closed) return;
    if (payload.length > this.channel.mdu) {
      await this._sendResource(payload);
      return;
    }
    await this._sendChannel(payload);
  }
  /**
   * Sends `payload` as a reliable Channel message. Waits while the send window
   * is full (backpressure) and re-arms if the window fills between the readiness
   * check and the serialized send — matching the library's buffer-layer loop.
   * @param {Uint8Array} payload
   */
  async _sendChannel(payload) {
    const message = new YjsSyncMessage();
    message.data = payload;
    for (; ; ) {
      if (this.closed || this.channel._shutDown) return;
      while (!this.channel.isReadyToSend()) {
        if (this.closed || this.channel._shutDown) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      try {
        await this.channel.send(message);
        return;
      } catch (err) {
        if (err instanceof ChannelException && err.type === CEType.ME_LINK_NOT_READY) {
          continue;
        }
        throw err;
      }
    }
  }
  /**
   * Transfers `payload` as a chunked Reticulum Resource, bz2-compressed when
   * that shrinks it. Only the advertisement is awaited; the chunked transfer
   * then proceeds on the link and the receiver reassembles (and decompresses)
   * it before delivery.
   * @param {Uint8Array} payload
   */
  async _sendResource(payload) {
    const resource = new Resource({
      data: payload,
      link: this.link,
      bz2: this.bz2,
      autoCompress: true
    });
    await resource.advertise();
  }
  /**
   * Silently tears down the link (does not invoke `onClose` — the caller is
   * responsible for bookkeeping, e.g. a bulk disconnect).
   */
  destroy() {
    if (this.closed) return;
    this.closed = true;
    this.link.teardown().catch(() => {
    });
  }
  /** Internal: a `close` event arrived from the link (peer dropped / timeout). */
  _handleClose() {
    if (this.closed) return;
    this.closed = true;
    this._onClose(this);
  }
};

// node_modules/y-reticulum/src/provider.js
import { Identity as Identity3 } from "./reticulum-core.js";
import * as Y4 from "./yjs.js";

// node_modules/y-reticulum/src/room.js
import {
  CEType as CEType2,
  ChannelException as ChannelException2,
  Destination,
  DestType,
  fromHex as fromHex2,
  Identity as Identity2,
  LinkStatus,
  toHex as toHex3
} from "./reticulum-core.js";
import * as Y3 from "./yjs.js";
var RECONNECT_PATH_REQUEST_DELAY_MS = 1500;
var EARLY_ANNOUNCE_DELAYS_MS = [1e3, 4e3, 1e4];
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
var FULL_CAPABILITY = (
  /** @type {{ sync: boolean, write: boolean }} */
  Object.freeze({ sync: true, write: true })
);
function normalizeCapability(verdict) {
  if (verdict === true) return FULL_CAPABILITY;
  if (verdict !== null && typeof verdict === "object") {
    const capability = {
      sync: verdict.sync === true,
      write: verdict.write === true
    };
    if (capability.sync || capability.write) return capability;
  }
  return null;
}
var Room = class {
  /**
   * @param {object} options
   * @param {Y.Doc} options.doc
   * @param {awarenessProtocol.Awareness} options.awareness
   * @param {import("@reticulum/core").Reticulum} options.reticulum
   * @param {import("@reticulum/core").Identity} options.identity
   * @param {string} options.appName - Deterministic destination app-name for the room.
   * @param {number} options.maxConns
   * @param {number} options.announceIntervalMs
   * @param {LinkPolicy | null} [options.linkPolicy] When set, peer links must prove
   *   their identity (initiator runs the identify handshake) and pass the
   *   policy before any room traffic flows; refused links are torn down.
   * @param {number} [options.identifyTimeoutMs] How long the responder waits
   *   for the initiator's identify handshake before refusing.
   * @param {LinkAuthorizer | null} [options.authorizeLink] When set, runs the
   *   application-defined authorization phase on every peer link after the
   *   identity is proven and before any room traffic flows. The authorizer
   *   may exchange messages with the peer over the link; a `false` verdict,
   *   a throw, or exceeding `authorizeTimeoutMs` refuses and tears down the
   *   link (reported via `onRefused`). Composes with `linkPolicy`, which is
   *   evaluated first.
   * @param {number} [options.authorizeTimeoutMs] How long the authorization
   *   phase may run before the link is refused.
   * @param {number} [options.maxResourceSize] Cap (bytes) on the uncompressed
   *   size of inbound Resource transfers accepted on peer links. Applied from
   *   link establishment — including the pre-authorization window — so peers
   *   held in the gate window cannot make us buffer advertisements we would
   *   never deliver. Defaults to the `@reticulum/core` cap (32 MiB).
   * @param {RoomCallbacks} options.callbacks
   */
  constructor({
    doc,
    awareness,
    reticulum,
    identity,
    appName,
    maxConns,
    announceIntervalMs,
    linkPolicy,
    identifyTimeoutMs = 1e4,
    authorizeLink,
    authorizeTimeoutMs = 1e4,
    maxResourceSize,
    callbacks
  }) {
    this.doc = doc;
    this.awareness = awareness;
    this.rns = reticulum;
    this.identity = identity;
    this.appName = appName;
    this.maxConns = maxConns;
    this.announceIntervalMs = announceIntervalMs;
    this.linkPolicy = linkPolicy ?? null;
    this.identifyTimeoutMs = identifyTimeoutMs;
    this.authorizeLink = authorizeLink ?? null;
    this.authorizeTimeoutMs = authorizeTimeoutMs;
    this.maxResourceSize = maxResourceSize;
    this.callbacks = callbacks;
    this.inFlightHandshakes = 0;
    this.maxInFlightHandshakes = maxConns * 2;
    this.dest = null;
    this.myHex = "";
    this.connected = false;
    this.synced = false;
    this.bz2 = null;
    this.peerConns = /* @__PURE__ */ new Map();
    this.linkedDestHexes = /* @__PURE__ */ new Set();
    this.pendingInitiates = /* @__PURE__ */ new Set();
    this.pendingPathRequests = /* @__PURE__ */ new Map();
    this.earlyAnnounceTimers = /* @__PURE__ */ new Set();
    this._primedChannels = /* @__PURE__ */ new Map();
    this._onAnnounce = this._onAnnounce.bind(this);
    this._onLinkRequest = this._onLinkRequest.bind(this);
    this._docUpdateHandler = this._docUpdateHandler.bind(this);
    this._awarenessUpdateHandler = this._awarenessUpdateHandler.bind(this);
  }
  /** Creates + binds the room destination, announces, and starts discovery. */
  async connect() {
    if (this.connected) return;
    this.bz2 = await getCompressionProvider();
    this.dest = await Destination.IN(
      this.appName,
      DestType.SINGLE,
      this.identity,
      this.rns
    );
    this.myHex = toHex3(
      /** @type {Uint8Array} */
      this.dest.destinationHash
    );
    this.rns.transport.bindLocalDestination(this.dest);
    this.rns.transport.addEventListener("announce", this._onAnnounce);
    this.dest.addEventListener("link_request", this._onLinkRequest);
    this.doc.on("update", this._docUpdateHandler);
    this.awareness.on("update", this._awarenessUpdateHandler);
    this.dest.startAnnouncing({ intervalMs: this.announceIntervalMs });
    this.dest.addEventListener(
      "announced",
      () => this.callbacks.onAnnounced?.()
    );
    for (const delay of EARLY_ANNOUNCE_DELAYS_MS) {
      const timer = setTimeout(() => {
        this.earlyAnnounceTimers.delete(timer);
        if (this.connected && this.dest) {
          this.dest.announce().catch(
            (err) => this.callbacks.onAnnounceFailed?.(
              /** @type {any} */
              err?.message ?? String(err)
            )
          );
        }
      }, delay);
      this.earlyAnnounceTimers.add(timer);
    }
    this.connected = true;
  }
  /** Stops announcing, tears down all peer links, and unbinds the destination. */
  async disconnect() {
    if (!this.connected) return;
    this.connected = false;
    for (const timer of this.earlyAnnounceTimers) clearTimeout(timer);
    this.earlyAnnounceTimers.clear();
    this.dest?.stopAnnouncing();
    for (const timer of this.pendingPathRequests.values()) clearTimeout(timer);
    this.pendingPathRequests.clear();
    this.rns.transport.removeEventListener("announce", this._onAnnounce);
    this.dest?.removeEventListener("link_request", this._onLinkRequest);
    this.doc.off("update", this._docUpdateHandler);
    this.awareness.off("update", this._awarenessUpdateHandler);
    removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "disconnect"
    );
    const removed = [...this.peerConns.keys()];
    for (const conn of this.peerConns.values()) conn.destroy();
    this.peerConns.clear();
    this.linkedDestHexes.clear();
    this.pendingInitiates.clear();
    this.synced = false;
    if (removed.length) this.callbacks.onPeers([], removed, {});
    if (this.dest) {
      this.rns.transport.unbindLocalDestination(this.dest);
      this.dest = null;
    }
    this.myHex = "";
  }
  /**
   * Initiator path: a peer in our room announced. Open a Link to it unless we
   * already have one, we're at capacity, or the glare rule says the peer should
   * initiate instead.
   * @param {Event} event
   */
  async _onAnnounce(event) {
    if (!this.connected || !this.dest) return;
    const detail = (
      /** @type {any} */
      event.detail
    );
    if (!bytesEqual(
      /** @type {Uint8Array} */
      detail.nameHash,
      /** @type {Uint8Array} */
      this.dest.nameHash
    )) {
      return;
    }
    const remoteHex = toHex3(
      /** @type {Uint8Array} */
      detail.destinationHash
    );
    if (remoteHex === this.myHex) return;
    this.callbacks.onDiscovered?.(
      remoteHex,
      toHex3(detail.identity?.publicKey ?? [])
    );
    if (this.peerConns.size >= this.maxConns) return;
    if (this.linkedDestHexes.has(remoteHex)) {
      const conns = [...this.peerConns.values()].filter(
        (conn) => conn.remoteDestHash && toHex3(conn.remoteDestHash) === remoteHex
      );
      if (conns.some((conn) => conn.link.status === LinkStatus.ACTIVE)) return;
      for (const conn of conns) {
        conn.destroy();
        this._onPeerClose(conn);
      }
    }
    if (this.pendingInitiates.has(remoteHex)) {
      return;
    }
    if (this.myHex > remoteHex) return;
    this.pendingInitiates.add(remoteHex);
    const initiatorIdentityHash = toHex3(
      await Identity2.truncatedHash(detail.identity.publicKey)
    );
    const out = await Destination.OUT(
      this.appName,
      DestType.SINGLE,
      detail.identity,
      this.rns
    );
    await this._establishOutgoingLink(remoteHex, out, initiatorIdentityHash);
  }
  /**
   * Establishes an outgoing peer link to a room peer: the link policy,
   * signed identify, and application authorization phases all run before
   * any room traffic. Shared by the announce-driven initiate and the
   * direct dial (work document #34).
   *
   * @param {string} remoteHex Hex of the peer's room destination hash.
   * @param {InstanceType<typeof Destination>} out The OUT destination
   *   targeting the peer — from its announce identity, or recalled by hash
   *   when the peer's identity hash is known from project state.
   * @param {string} initiatorIdentityHash Hex of the remote peer's truncated
   *   identity hash, proven by its announce (initiate path) or the transport's
   *   identity recall (dial path); feeds the link-policy context.
   * @returns {Promise<boolean>} Whether a link was established.
   */
  async _establishOutgoingLink(remoteHex, out, initiatorIdentityHash) {
    let link = (
      /** @type {import("@reticulum/core").Link|null} */
      null
    );
    try {
      if (this.linkPolicy) {
        const allowed = await this.linkPolicy({
          remoteIdentityHash: initiatorIdentityHash,
          remoteDestinationHash: remoteHex,
          initiator: true
        });
        if (!allowed) {
          this.callbacks.onRefused?.([
            {
              destinationHash: remoteHex,
              identityHash: initiatorIdentityHash,
              initiator: true,
              reason: "link-policy"
            }
          ]);
          return false;
        }
      }
      link = await out.createLink();
      if (!this.connected) {
        await link.teardown();
        return false;
      }
      this._primeChannel(link);
      if (this.linkPolicy || this.authorizeLink) {
        await link.identify(this.identity);
      }
      let capability;
      if (this.authorizeLink) {
        const verdict = await this._authorizeLink(link, {
          remoteIdentityHash: initiatorIdentityHash,
          remoteDestinationHash: remoteHex,
          initiator: true
        });
        if (!verdict.capability) {
          this._unprimeChannel(link);
          await link.teardown();
          this.callbacks.onRefused?.([
            {
              destinationHash: remoteHex,
              identityHash: initiatorIdentityHash,
              initiator: true,
              reason: verdict.timedOut ? "authorization-timeout" : "authorization"
            }
          ]);
          return false;
        }
        capability = verdict.capability;
      }
      this.linkedDestHexes.add(remoteHex);
      this._registerPeer(
        link,
        out.destinationHash,
        initiatorIdentityHash || null,
        capability
      );
      return true;
    } catch {
      if (link) this._unprimeChannel(link);
      return false;
    } finally {
      this.pendingInitiates.delete(remoteHex);
    }
  }
  /**
   * Dials a peer's room destination directly from its destination hash,
   * without waiting for announce-driven discovery (work document #34): for
   * peers whose room destination hash the application knows through its own
   * channels. The peer proves its identity during the identify phase; the
   *   same identify/authorization sequence as the announce-driven initiate
   *   applies. The initiator-side link policy runs once the transport
   *   recalls (or solicits) the peer's proven identity; when the peer stays
   *   unknown the link is not attempted, so the responder-side policy
   *   (evaluated after identify) remains the gate.
   *
   * @param {string} remoteHex Hex of the peer's room destination hash.
   * @param {string} [remoteIdentityHashHex] Hex of the peer's identity
   *   hash, when the application knows it — reported in refusal payloads
   *   and used as the policy context fallback.
   * @returns {Promise<boolean>} Whether a link was established (true also
   *   when an active link to this peer already existed, or a link attempt
   *   is in flight).
   */
  async dialHash(remoteHex, remoteIdentityHashHex = "") {
    if (!this.connected || !this.dest) return false;
    const remoteHashBytes = fromHex2(remoteHex);
    const existing = [...this.peerConns.values()].some(
      (conn) => conn.remoteDestHash && toHex3(conn.remoteDestHash) === remoteHex && conn.link.status === LinkStatus.ACTIVE
    );
    if (existing) return true;
    if (this.pendingInitiates.has(remoteHex)) return true;
    this.pendingInitiates.add(remoteHex);
    try {
      const remoteIdentity = await this.rns.transport.recallOrSolicitIdentity?.(remoteHashBytes, 1e4).catch(() => null) ?? null;
      const initiatorIdentityHash = remoteIdentity ? toHex3(await Identity2.truncatedHash(remoteIdentity.publicKey)) : remoteIdentityHashHex;
      if (this.linkPolicy && remoteIdentity) {
        const allowed = await this.linkPolicy({
          remoteIdentityHash: initiatorIdentityHash,
          remoteDestinationHash: remoteHex,
          initiator: true
        });
        if (!allowed) {
          this.callbacks.onRefused?.([
            {
              destinationHash: remoteHex,
              identityHash: initiatorIdentityHash,
              initiator: true,
              reason: "link-policy"
            }
          ]);
          return false;
        }
      }
      if (!this.rns.transport.hasPath?.(remoteHashBytes)) {
        await this.rns.transport.requestPath?.(remoteHashBytes).catch(() => {
        });
        const pathDeadline = Date.now() + 1e4;
        while (!this.rns.transport.hasPath?.(remoteHashBytes) && Date.now() < pathDeadline) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (!this.rns.transport.hasPath?.(remoteHashBytes)) return false;
      }
      const out = remoteIdentity ? await Destination.OUT(
        this.appName,
        DestType.SINGLE,
        remoteIdentity,
        this.rns
      ) : await Destination.recalled(
        this.appName,
        remoteHashBytes,
        this.rns,
        1e4
      );
      return await this._establishOutgoingLink(
        remoteHex,
        out,
        initiatorIdentityHash
      );
    } catch {
      return false;
    } finally {
      this.pendingInitiates.delete(remoteHex);
    }
  }
  /**
   * Dials a peer's room destination directly from a known identity (work
   * document #34): for peers whose identity the application learned
   * through its own channels.
   *
   * @param {InstanceType<typeof Identity>} remoteIdentity
   * @returns {Promise<boolean>} Whether a link was established.
   */
  async dial(remoteIdentity) {
    if (!this.connected || !this.dest) return false;
    const out = await Destination.OUT(
      this.appName,
      DestType.SINGLE,
      remoteIdentity,
      this.rns
    );
    const remoteHex = toHex3(
      /** @type {Uint8Array} */
      out.destinationHash
    );
    if (remoteHex === this.myHex) return false;
    const existing = [...this.peerConns.values()].some(
      (conn) => conn.remoteDestHash && toHex3(conn.remoteDestHash) === remoteHex && conn.link.status === LinkStatus.ACTIVE
    );
    if (existing || this.pendingInitiates.has(remoteHex)) return true;
    this.pendingInitiates.add(remoteHex);
    const initiatorIdentityHash = toHex3(
      await Identity2.truncatedHash(remoteIdentity.publicKey)
    );
    return await this._establishOutgoingLink(
      remoteHex,
      out,
      initiatorIdentityHash
    );
  }
  /**
   * Responder path: a peer is opening a Link to us. Accept it. With a link
   * policy, the peer must prove its identity over the link (signed identify
   * handshake) before the policy decides and any room traffic flows.
   * @param {Event} event
   */
  async _onLinkRequest(event) {
    if (!this.connected || !this.dest) return;
    if (this.peerConns.size >= this.maxConns) return;
    if (this.inFlightHandshakes >= this.maxInFlightHandshakes) return;
    this.inFlightHandshakes += 1;
    const packet = (
      /** @type {any} */
      event.detail.packet
    );
    let link = (
      /** @type {import("@reticulum/core").Link|null} */
      null
    );
    try {
      link = await this.dest.acceptLink(packet);
      if (!this.connected) {
        await link.teardown();
        return;
      }
      this._primeChannel(link);
      let identityHash = null;
      let capability;
      if (this.linkPolicy || this.authorizeLink) {
        identityHash = await this._awaitIdentify(link);
        if (!identityHash) {
          this._unprimeChannel(link);
          await link.teardown();
          this.callbacks.onRefused?.([
            {
              destinationHash: null,
              identityHash: null,
              initiator: false,
              reason: "identify-timeout"
            }
          ]);
          return;
        }
        if (this.linkPolicy) {
          const allowed = await this.linkPolicy({
            remoteIdentityHash: identityHash,
            remoteDestinationHash: null,
            initiator: false
          });
          if (!allowed) {
            this._unprimeChannel(link);
            await link.teardown();
            this.callbacks.onRefused?.([
              {
                destinationHash: null,
                identityHash,
                initiator: false,
                reason: "link-policy"
              }
            ]);
            return;
          }
        }
        if (this.authorizeLink) {
          const verdict = await this._authorizeLink(link, {
            remoteIdentityHash: identityHash,
            remoteDestinationHash: null,
            initiator: false
          });
          if (!verdict.capability) {
            this._unprimeChannel(link);
            await link.teardown();
            this.callbacks.onRefused?.([
              {
                destinationHash: null,
                identityHash,
                initiator: false,
                reason: verdict.timedOut ? "authorization-timeout" : "authorization"
              }
            ]);
            return;
          }
          capability = verdict.capability;
        }
      }
      this._registerPeer(link, null, identityHash, capability);
    } catch {
      if (link) this._unprimeChannel(link);
    } finally {
      this.inFlightHandshakes -= 1;
    }
  }
  /**
   * Waits for the initiator's signed identify handshake on this link.
   *
   * @param {import("@reticulum/core").Link} link
   * @returns {Promise<string|null>} Hex remote identity hash, or null when
   *   the peer did not identify within the timeout.
   */
  _awaitIdentify(link) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        link.removeEventListener("identify", onIdentify);
        resolve(null);
      }, this.identifyTimeoutMs);
      const onIdentify = (event) => {
        clearTimeout(timer);
        const detail = (
          /** @type {any} */
          event.detail
        );
        const identity = detail?.identity;
        resolve(identity ? toHex3(identity.getSalt()) : null);
      };
      link.addEventListener("identify", onIdentify, { once: true });
    });
  }
  /**
   * Registers the Yjs and link-authorization message types on the link's
   * channel and stashes any inbound payloads that arrive before the
   * {@link PeerConn} exists (Yjs) or before the application consumes them
   * (authorization). Without the Yjs stash, a payload arriving during the
   * identify / link-policy / authorization awaits is dropped by the channel
   * with `Unable to find constructor for Channel MSGTYPE 0x1`.
   * @param {import("@reticulum/core").Link} link
   */
  _primeChannel(link) {
    link.maxResourceSize = this.maxResourceSize;
    const channel = link.getChannel();
    channel.registerMessageType(YjsSyncMessage);
    channel.registerMessageType(LinkAuthMessage);
    const payloads = (
      /** @type {Uint8Array[]} */
      []
    );
    const stash = (msg) => {
      if (!(msg instanceof YjsSyncMessage)) return false;
      payloads.push(msg.data);
      return true;
    };
    channel.addMessageHandler(stash);
    const authPayloads = (
      /** @type {Uint8Array[]} */
      []
    );
    const authWaiters = [];
    const authStash = (msg) => {
      if (!(msg instanceof LinkAuthMessage)) return false;
      const waiter = authWaiters.shift();
      if (waiter) waiter.resolve(msg.data);
      else authPayloads.push(msg.data);
      return true;
    };
    channel.addMessageHandler(authStash);
    this._primedChannels.set(link, {
      payloads,
      stash,
      authPayloads,
      authStash,
      authWaiters
    });
  }
  /**
   * Removes the stash handlers installed by {@link Room._primeChannel} and
   * returns the Yjs payloads received before the PeerConn took over the
   * channel. Pending authorization `receive()` calls are rejected.
   * @param {import("@reticulum/core").Link} link
   * @returns {Uint8Array[]}
   */
  _unprimeChannel(link) {
    const primed = this._primedChannels.get(link);
    if (!primed) return [];
    this._primedChannels.delete(link);
    const channel = link.getChannel();
    channel.removeMessageHandler(primed.stash);
    channel.removeMessageHandler(primed.authStash);
    for (const waiter of primed.authWaiters.splice(0)) {
      waiter.reject(new Error("authorization channel closed"));
    }
    return primed.payloads;
  }
  /**
   * Runs the application-defined authorization phase on an established link:
   * hands the authorizer the link plus a send/receive exchange bound to this
   * link's channel, and races it against `authorizeTimeoutMs`. Any `false`
   * verdict, throw, or timeout refuses the link. Inbound Yjs traffic is
   * stashed by `_primeChannel` meanwhile and only delivered once the phase
   * passes, so no sync flows before the verdict.
   *
   * @param {import("@reticulum/core").Link} link
   * @param {{ remoteIdentityHash: string, remoteDestinationHash: string | null, initiator: boolean }} proven
   * @returns {Promise<{ capability: { sync: boolean, write: boolean } | null, timedOut: boolean }>}
   *   `capability: null` refuses the link (fail-closed: an authorizer that
   *   resolves `undefined` does not grant access).
   */
  async _authorizeLink(link, { remoteIdentityHash, remoteDestinationHash, initiator }) {
    if (!this.authorizeLink) return { capability: null, timedOut: false };
    const primed = this._primedChannels.get(link);
    if (!primed) return { capability: null, timedOut: false };
    const channel = link.getChannel();
    const send = async (payload) => {
      const message = new LinkAuthMessage();
      message.data = payload;
      for (; ; ) {
        if (!this._primedChannels.has(link) || channel._shutDown) {
          throw new Error("authorization channel closed");
        }
        while (!channel.isReadyToSend()) {
          if (!this._primedChannels.has(link) || channel._shutDown) {
            throw new Error("authorization channel closed");
          }
          await new Promise((r) => setTimeout(r, 50));
        }
        try {
          await channel.send(message);
          return;
        } catch (err) {
          if (err instanceof ChannelException2 && err.type === CEType2.ME_LINK_NOT_READY) {
            continue;
          }
          throw err;
        }
      }
    };
    const receive = () => {
      const queued = primed.authPayloads.shift();
      if (queued) return Promise.resolve(queued);
      return new Promise((resolve, reject) => {
        primed.authWaiters.push({ resolve, reject });
      });
    };
    let timer = null;
    try {
      const verdict = await Promise.race([
        Promise.resolve(
          this.authorizeLink({
            link,
            remoteIdentityHash,
            remoteDestinationHash,
            initiator,
            exchange: { send, receive }
          })
        ),
        new Promise((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("authorization timed out")),
            this.authorizeTimeoutMs
          );
        })
      ]);
      return { capability: normalizeCapability(verdict), timedOut: false };
    } catch {
      return { capability: null, timedOut: true };
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }
  /**
   * Registers a newly active peer and kicks off the Yjs sync handshake
   * (syncStep1 + local awareness), mirroring y-webrtc's peer-on-connect path.
   * @param {import("@reticulum/core").Link} link
   * @param {Uint8Array|null} remoteDestHash
   * @param {string|null} remoteIdentityHash Hex truncated identity hash of
   *   the remote peer, when proven during establishment.
   * @param {{ sync: boolean, write: boolean } | null} [capability] Capability
   *   the authorization phase resolved for this peer; `null`/undefined when
   *   no authorization phase ran (full sync+write, as before).
   */
  _registerPeer(link, remoteDestHash, remoteIdentityHash = null, capability = null) {
    const stashed = this._unprimeChannel(link);
    const peer = new PeerConn({
      link,
      remoteDestHash,
      remoteIdentityHash,
      capability,
      bz2: this.bz2,
      onData: (payload, p) => this._onPeerData(payload, p),
      onClose: (p) => this._onPeerClose(p)
    });
    this.peerConns.set(peer.peerId, peer);
    this.callbacks.onPeers([peer.peerId], [], {
      [peer.peerId]: peer.remoteIdentityHash
    });
    if (remoteIdentityHash == null) {
      link.addEventListener(
        "identify",
        (event) => {
          const identity = (
            /** @type {any} */
            event.detail?.identity
          );
          if (!identity || peer.closed) return;
          peer.remoteIdentityHash = toHex3(identity.getSalt());
          this.callbacks.onPeers([], [], {
            [peer.peerId]: peer.remoteIdentityHash
          });
        },
        { once: true }
      );
    }
    for (const payload of stashed) this._onPeerData(payload, peer);
    this._sendInitialSync(peer);
  }
  /** @param {PeerConn} peer */
  _onPeerClose(peer) {
    if (!this.peerConns.delete(peer.peerId)) return;
    if (peer.remoteDestHash) {
      const remoteHex = toHex3(peer.remoteDestHash);
      this.linkedDestHexes.delete(remoteHex);
      this._scheduleReconnectPathRequest(remoteHex, peer.remoteDestHash);
    }
    this.callbacks.onPeers([], [peer.peerId]);
    this._checkSynced();
  }
  /**
   * Tears down a live peer link by peer id (hex link id, as reported on the
   * `peers` event). Sync with that peer stops immediately and it is reported
   * as removed. Used when the application's authorization for a peer changes
   * after the link was established (e.g. a grant revocation).
   *
   * @param {string} peerId
   * @returns {boolean} Whether a live peer was dropped.
   */
  dropPeer(peerId) {
    const peer = this.peerConns.get(peerId);
    if (!peer) return false;
    peer.destroy();
    this._onPeerClose(peer);
    return true;
  }
  /**
   * Tears down every live peer link whose remote proved the given truncated
   * identity hash (hex). Identity-proofed peers register their hash on both
   * link sides — announce/identify on the initiator side, the signed
   * identify handshake on the responder side — so this covers peers we
   * initiated to and peers that dialed us. Peers registered without an
   * identity proof (no link policy / authorization configured) cannot be
   * matched by hash; drop those by peer id with {@link Room.dropPeer}.
   *
   * @param {string} remoteIdentityHash Hex truncated identity hash.
   * @returns {number} How many live peers were dropped.
   */
  revokePeer(remoteIdentityHash) {
    let dropped = 0;
    for (const peer of [...this.peerConns.values()]) {
      if (peer.remoteIdentityHash !== remoteIdentityHash) continue;
      peer.destroy();
      this._onPeerClose(peer);
      dropped += 1;
    }
    return dropped;
  }
  /**
   * Schedules a one-shot path request for a dropped peer so the mesh answers
   * with a fresh path-response announce, beating the periodic announce
   * cadence. Coalesces flaps to one in-flight request per peer and is a no-op
   * if the peer already came back (via a normal announce) by the time it fires.
   *
   * @param {string} remoteHex
   * @param {Uint8Array} remoteDestHash
   */
  _scheduleReconnectPathRequest(remoteHex, remoteDestHash) {
    if (!this.connected || this.pendingPathRequests.has(remoteHex)) return;
    const timer = setTimeout(() => {
      this.pendingPathRequests.delete(remoteHex);
      if (!this.connected || !this.dest) return;
      if (this.linkedDestHexes.has(remoteHex)) return;
      this.rns.transport.requestPath(remoteDestHash).catch(() => {
      });
    }, RECONNECT_PATH_REQUEST_DELAY_MS);
    this.pendingPathRequests.set(remoteHex, timer);
  }
  /**
   * Inbound raw bytes from a peer: decode and apply, send back any reply, and
   * mark the peer (and possibly the room) synced.
   * @param {Uint8Array} payload
   * @param {PeerConn} peer
   */
  _onPeerData(payload, peer) {
    const reply = readMessage(
      this.doc,
      this.awareness,
      payload,
      peer,
      this.synced,
      () => {
        peer.synced = true;
        this._checkSynced();
      },
      peer.canWrite
    );
    if (reply) this._send(peer, reply);
  }
  /**
   * Local Doc update → broadcast a sync `update` to every peer.
   * @param {Uint8Array} update
   * @param {any} _origin
   */
  _docUpdateHandler(update, _origin) {
    const encoder = createEncoder();
    writeVarUint(encoder, messageSync);
    writeUpdate(encoder, update);
    this._broadcast(toUint8Array(encoder));
  }
  /**
   * Local Awareness update → broadcast an awareness update to every peer.
   * @param {{added: number[], updated: number[], removed: number[]}} changes
   * @param {any} _origin
   */
  _awarenessUpdateHandler({ added, updated, removed }, _origin) {
    const changedClients = added.concat(updated, removed);
    const encoder = createEncoder();
    writeVarUint(encoder, messageAwareness);
    writeVarUint8Array(
      encoder,
      encodeAwarenessUpdate(this.awareness, changedClients)
    );
    this._broadcast(toUint8Array(encoder));
  }
  /**
   * Sends the initial sync handshake to a freshly connected peer: a syncStep1
   * (requesting their state) and, if we have any, our awareness state. Both
   * sides do this, so state flows both ways.
   * @param {PeerConn} peer
   */
  _sendInitialSync(peer) {
    const step1 = createEncoder();
    writeVarUint(step1, messageSync);
    writeSyncStep1(step1, this.doc);
    this._send(peer, toUint8Array(step1));
    const clients = Array.from(this.awareness.getStates().keys());
    if (clients.length > 0) {
      const aw = createEncoder();
      writeVarUint(aw, messageAwareness);
      writeVarUint8Array(
        aw,
        encodeAwarenessUpdate(this.awareness, clients)
      );
      this._send(peer, toUint8Array(aw));
    }
  }
  /** @param {Uint8Array} bytes */
  _broadcast(bytes) {
    for (const peer of this.peerConns.values()) this._send(peer, bytes);
  }
  /** @param {PeerConn} peer @param {Uint8Array} bytes */
  _send(peer, bytes) {
    peer.send(bytes).catch(() => {
    });
  }
  /**
   * Recomputes room-level sync state and emits on change. A room with no peers
   * is *not* synced — an empty mesh carries no sync guarantee — so this flips
   * back to `synced: false` when the last peer drops, rather than vacuously
   * `true`.
   */
  _checkSynced() {
    let synced = this.peerConns.size > 0;
    for (const peer of this.peerConns.values()) {
      if (!peer.synced) {
        synced = false;
        break;
      }
    }
    if (synced !== this.synced) {
      this.synced = synced;
      this.callbacks.onSynced(synced);
    }
  }
};

// node_modules/y-reticulum/src/provider.js
var ReticulumProvider = class extends ObservableV2 {
  /**
   * @param {string} roomName
   * @param {Y.Doc} doc
   * @param {ProviderOptions} opts
   */
  constructor(roomName, doc, opts) {
    super();
    if (!opts || !opts.reticulum) {
      throw new Error("ReticulumProvider requires a `reticulum` instance.");
    }
    this.roomName = roomName;
    this.doc = doc;
    this.reticulum = opts.reticulum;
    this.awareness = opts.awareness ?? new Awareness(doc);
    this.maxConns = opts.maxConns ?? 20;
    this.announceIntervalMs = opts.announceIntervalMs ?? 6e4;
    this.linkPolicy = opts.linkPolicy ?? null;
    this.identifyTimeoutMs = opts.identifyTimeoutMs ?? 1e4;
    this.authorizeLink = opts.authorizeLink ?? null;
    this.authorizeTimeoutMs = opts.authorizeTimeoutMs ?? 1e4;
    this.maxResourceSize = opts.maxResourceSize;
    this.identityPromise = opts.identity ? Promise.resolve(opts.identity) : Identity3.generate();
    this.identity = opts.identity ?? null;
    this.room = null;
    this.shouldConnect = false;
  }
  /**
   * Whether the provider is announcing and accepting peer Links. Does not imply
   * that any peer is reachable; only that we are looking.
   *
   * @type {boolean}
   */
  get connected() {
    return this.room !== null && this.shouldConnect;
  }
  /** Begin announcing and maintaining the peer mesh. */
  async connect() {
    if (this.shouldConnect) return;
    this.shouldConnect = true;
    this.identity ??= await this.identityPromise;
    const appName = await roomDestinationName(this.roomName);
    this.room = new Room({
      doc: this.doc,
      awareness: this.awareness,
      reticulum: this.reticulum,
      identity: (
        /** @type {Identity} */
        this.identity
      ),
      appName,
      maxConns: this.maxConns,
      announceIntervalMs: this.announceIntervalMs,
      linkPolicy: this.linkPolicy,
      identifyTimeoutMs: this.identifyTimeoutMs,
      authorizeLink: this.authorizeLink,
      authorizeTimeoutMs: this.authorizeTimeoutMs,
      maxResourceSize: this.maxResourceSize,
      callbacks: {
        onPeers: (added, removed, identities) => this.emit("peers", [
          { added, removed, identities: identities ?? {} }
        ]),
        onDiscovered: (remoteHex, publicKeyHex) => this.emit("discovered", [{ remoteHex, publicKeyHex }]),
        onAnnounced: () => this.emit("announced", [{}]),
        onAnnounceFailed: (error) => this.emit("announce-failed", [{ error }]),
        onSynced: (synced) => this.emit("synced", [{ synced }]),
        onRefused: (refusals) => this.emit("refused", [{ refusals }])
      }
    });
    await this.room.connect();
    this.emit("status", [{ connected: true }]);
  }
  /**
   * Dials a peer's room destination directly from its destination hash (work
   * document #34): for peers whose room destination hash the application
   * knows through its own channels. See the Room's dialHash.
   *
   * @param {string} remoteHex Hex of the peer's room destination hash.
   * @param {string} [remoteIdentityHashHex] Hex of the peer's identity hash,
   *   when the application knows it.
   * @returns {Promise<boolean>} Whether a link was established.
   */
  async dialHash(remoteHex, remoteIdentityHashHex = "") {
    return await this.room?.dialHash(remoteHex, remoteIdentityHashHex) ?? false;
  }
  /**
   * Dials a peer's room destination directly from a known identity (work
   * document #34): for peers whose identity the application learned
   * through its own channels.
   *
   * @param {InstanceType<typeof Identity>} remoteIdentity
   * @returns {Promise<boolean>} Whether a link was established.
   */
  async dialPeer(remoteIdentity) {
    return await this.room?.dial(remoteIdentity) ?? false;
  }
  /**
   * Tears down a live peer link by peer id (hex link id, as reported on the
   * `peers` event) — see `Room.dropPeer`. Used when the application's
   * authorization for a peer changes after the link was established.
   *
   * @param {string} peerId
   * @returns {boolean} Whether a live peer was dropped.
   */
  dropPeer(peerId) {
    return this.room?.dropPeer(peerId) ?? false;
  }
  /**
   * Tears down every live peer link whose remote proved the given truncated
   * identity hash (hex) — see `Room.revokePeer`. Identity hashes surface on
   * the `peers` event's `identities` map and in `refused` payloads. Peers
   * registered without identity proof (no `linkPolicy`/`authorizeLink`
   * configured) cannot be matched by hash; use `dropPeer` for those.
   *
   * @param {string} remoteIdentityHash Hex truncated identity hash.
   * @returns {number} How many live peers were dropped.
   */
  revokePeer(remoteIdentityHash) {
    return this.room?.revokePeer(remoteIdentityHash) ?? 0;
  }
  /** Stop announcing, tear down all peer Links, and release the destination. */
  async disconnect() {
    if (!this.shouldConnect) return;
    this.shouldConnect = false;
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.emit("status", [{ connected: false }]);
  }
  /** Permanently release all resources. */
  async destroy() {
    await this.disconnect();
    super.destroy();
  }
};
export {
  PeerConn,
  ReticulumProvider,
  Room,
  getCompressionProvider,
  messageAwareness,
  messageSync,
  readMessage,
  roomDestinationHash,
  roomDestinationName
};
