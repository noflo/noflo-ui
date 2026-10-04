// @ts-nocheck
import * as Y from "./yjs.js";
import { CEType, ChannelException, DestType, Destination, Identity, LinkStatus, MessageBase, Resource, toHex } from "./reticulum-core.js";
//#region src/shims/bzip2-stub.js
/**
* @file Vendor build shim: `@digitaldefiance/bzip2-wasm` is a hard dependency
* of y-reticulum used only for compressing large sync payloads. It ships a
* WASM binary that does not belong in the vendor bundle, so the build aliases
* this stub in its place. y-reticulum's compression module catches init
* failures and falls back to uncompressed Resources, so this stub only means
* large updates travel uncompressed.
*/
var BZip2Stub = class {
	async init() {
		throw new Error("bzip2 compression is not bundled; large CRDT updates travel uncompressed");
	}
};
//#endregion
//#region ../y-reticulum/src/compression.js
/**
* @file compression.js
* @description Shared bzip2 provider for compressing Reticulum Resources.
*
* `@digitaldefiance/bzip2-wasm` is a hard dependency of y-reticulum, so both
* peers can always compress/decompress large sync payloads (an initial doc
* state or a big update). The WASM module needs a one-time async `init()`; this
* module exposes a shared, lazily-initialized instance. If init ever fails we
* resolve to `null` and sync transparently falls back to uncompressed Resources.
*/
/** @type {Promise<import("@digitaldefiance/bzip2-wasm").default | null> | null} */
let initPromise = null;
/**
* Returns a shared, initialized BZip2 instance, or `null` if the WASM module
* failed to load. Safe to call repeatedly — initialization runs only once.
*
* @returns {Promise<import("@digitaldefiance/bzip2-wasm").default | null>}
*/
function getCompressionProvider() {
	if (!initPromise) initPromise = (async () => {
		try {
			const bz2 = new BZip2Stub();
			await bz2.init();
			return bz2;
		} catch {
			return null;
		}
	})();
	return initPromise;
}
//#endregion
//#region ../y-reticulum/src/destination.js
/**
* @file destination.js
* @description Helpers mapping a Yjs room name to a Reticulum destination.
*
* Two peers that pass the same room name must arrive at the same Reticulum
* "aspect" so they can discover each other via the Announce mechanism. We hash
* the room name into the aspect so the cleartext name is not leaked on the wire,
* and so the resulting 10-byte `nameHash` doubles as the room-membership filter
* when comparing inbound announces (see SPEC.md → Discovery model).
*/
/**
* App-name prefix shared by every y-reticulum sync destination. The trailing
* segment is a hex digest of the room name (see {@link roomDestinationName}).
*/
const DESTINATION_APP_PREFIX = "y-reticulum.sync";
/**
* Derives the deterministic Reticulum destination app-name for a Yjs room.
*
* The room name is hashed (first 8 bytes of its SHA-256, rendered as 16 hex
* chars) so the on-wire aspect does not leak the cleartext room name. Two peers
* that pass the same `roomName` arrive at the same app-name — and therefore the
* same 10-byte `nameHash` — which is exactly what room peer-discovery filters on
* when comparing inbound announces.
*
* @param {string} roomName
* @returns {Promise<string>} app-name like `y-reticulum.sync.<16 hex chars>`
*/
async function roomDestinationName(roomName) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(roomName));
	const bytes = new Uint8Array(digest);
	let hex = "";
	for (let i = 0; i < 8; i++) hex += bytes[i].toString(16).padStart(2, "0");
	return `${DESTINATION_APP_PREFIX}.${hex}`;
}
//#endregion
//#region ../y-reticulum/node_modules/lib0/math.js
/**
* Common Math expressions.
*
* @module math
*/
const floor = Math.floor;
/**
* @function
* @param {number} a
* @param {number} b
* @return {number} The smaller element of a and b
*/
const min = (a, b) => a < b ? a : b;
/**
* @function
* @param {number} a
* @param {number} b
* @return {number} The bigger element of a and b
*/
const max = (a, b) => a > b ? a : b;
Number.isNaN;
//#endregion
//#region ../y-reticulum/node_modules/lib0/number.js
/**
* Utility helpers for working with numbers.
*
* @module number
*/
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
Number.MIN_SAFE_INTEGER;
Number.isInteger;
Number.isNaN;
Number.parseInt;
//#endregion
//#region ../y-reticulum/node_modules/lib0/set.js
/**
* Utility module to work with sets.
*
* @module set
*/
const create$2 = () => /* @__PURE__ */ new Set();
//#endregion
//#region ../y-reticulum/node_modules/lib0/array.js
/**
* Transforms something array-like to an actual Array.
*
* @function
* @template T
* @param {ArrayLike<T>|Iterable<T>} arraylike
* @return {T}
*/
const from = Array.from;
Array.isArray;
//#endregion
//#region ../y-reticulum/node_modules/lib0/string.js
/**
* Utility module to work with strings.
*
* @module string
*/
const fromCharCode = String.fromCharCode;
String.fromCodePoint;
fromCharCode(65535);
/**
* @param {string} str
* @return {Uint8Array<ArrayBuffer>}
*/
const _encodeUtf8Polyfill = (str) => {
	const encodedString = unescape(encodeURIComponent(str));
	const len = encodedString.length;
	const buf = new Uint8Array(len);
	for (let i = 0; i < len; i++) buf[i] = encodedString.codePointAt(i);
	return buf;
};
/* c8 ignore next */
const utf8TextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
/**
* @param {string} str
* @return {Uint8Array<ArrayBuffer>}
*/
const _encodeUtf8Native = (str) => utf8TextEncoder.encode(str);
/**
* @param {string} str
* @return {Uint8Array}
*/
/* c8 ignore next */
const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;
/* c8 ignore next */
let utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
/* c8 ignore start */
if (utf8TextDecoder && utf8TextDecoder.decode(/* @__PURE__ */ new Uint8Array()).length === 1)
 /* c8 ignore next */
utf8TextDecoder = null;
//#endregion
//#region ../y-reticulum/node_modules/lib0/error.js
/**
* Error helpers.
*
* @module error
*/
/**
* @param {string} s
* @return {Error}
*/
/* c8 ignore next */
const create$1 = (s) => new Error(s);
//#endregion
//#region ../y-reticulum/node_modules/lib0/encoding.js
/**
* Efficient schema-less binary encoding with support for variable length encoding.
*
* Use [lib0/encoding] with [lib0/decoding]. Every encoding function has a corresponding decoding function.
*
* Encodes numbers in little-endian order (least to most significant byte order)
* and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
* which is also used in Protocol Buffers.
*
* ```js
* // encoding step
* const encoder = encoding.createEncoder()
* encoding.writeVarUint(encoder, 256)
* encoding.writeVarString(encoder, 'Hello world!')
* const buf = encoding.toUint8Array(encoder)
* ```
*
* ```js
* // decoding step
* const decoder = decoding.createDecoder(buf)
* decoding.readVarUint(decoder) // => 256
* decoding.readVarString(decoder) // => 'Hello world!'
* decoding.hasContent(decoder) // => false - all data is read
* ```
*
* @module encoding
*/
/**
* A BinaryEncoder handles the encoding to an Uint8Array.
*/
var Encoder = class {
	constructor() {
		this.cpos = 0;
		this.cbuf = /* @__PURE__ */ new Uint8Array(100);
		/**
		* @type {Array<Uint8Array>}
		*/
		this.bufs = [];
	}
};
/**
* @function
* @return {Encoder}
*/
const createEncoder = () => new Encoder();
/**
* The current length of the encoded data.
*
* @function
* @param {Encoder} encoder
* @return {number}
*/
const length = (encoder) => {
	let len = encoder.cpos;
	for (let i = 0; i < encoder.bufs.length; i++) len += encoder.bufs[i].length;
	return len;
};
/**
* Transform to Uint8Array.
*
* @function
* @param {Encoder} encoder
* @return {Uint8Array<ArrayBuffer>} The created ArrayBuffer.
*/
const toUint8Array = (encoder) => {
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
/**
* Write one byte to the encoder.
*
* @function
* @param {Encoder} encoder
* @param {number} num The byte that is to be encoded.
*/
const write = (encoder, num) => {
	const bufferLen = encoder.cbuf.length;
	if (encoder.cpos === bufferLen) {
		encoder.bufs.push(encoder.cbuf);
		encoder.cbuf = new Uint8Array(bufferLen * 2);
		encoder.cpos = 0;
	}
	encoder.cbuf[encoder.cpos++] = num;
};
/**
* Write a variable length unsigned integer. Max encodable integer is 2^53.
*
* @function
* @param {Encoder} encoder
* @param {number} num The number that is to be encoded.
*/
const writeVarUint = (encoder, num) => {
	while (num > 127) {
		write(encoder, 128 | 127 & num);
		num = floor(num / 128);
	}
	write(encoder, 127 & num);
};
/**
* A cache to store strings temporarily
*/
const _strBuffer = /* @__PURE__ */ new Uint8Array(3e4);
const _maxStrBSize = _strBuffer.length / 3;
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
const _writeVarStringNative = (encoder, str) => {
	if (str.length < _maxStrBSize) {
		/* c8 ignore next */
		const written = utf8TextEncoder.encodeInto(str, _strBuffer).written || 0;
		writeVarUint(encoder, written);
		for (let i = 0; i < written; i++) write(encoder, _strBuffer[i]);
	} else writeVarUint8Array(encoder, encodeUtf8(str));
};
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
const _writeVarStringPolyfill = (encoder, str) => {
	const encodedString = unescape(encodeURIComponent(str));
	const len = encodedString.length;
	writeVarUint(encoder, len);
	for (let i = 0; i < len; i++) write(encoder, encodedString.codePointAt(i));
};
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
/* c8 ignore next */
const writeVarString = utf8TextEncoder && utf8TextEncoder.encodeInto ? _writeVarStringNative : _writeVarStringPolyfill;
/**
* Append fixed-length Uint8Array to the encoder.
*
* @function
* @param {Encoder} encoder
* @param {Uint8Array} uint8Array
*/
const writeUint8Array = (encoder, uint8Array) => {
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
/**
* Append an Uint8Array to Encoder.
*
* @function
* @param {Encoder} encoder
* @param {Uint8Array} uint8Array
*/
const writeVarUint8Array = (encoder, uint8Array) => {
	writeVarUint(encoder, uint8Array.byteLength);
	writeUint8Array(encoder, uint8Array);
};
//#endregion
//#region ../y-reticulum/node_modules/lib0/decoding.js
/**
* Efficient schema-less binary decoding with support for variable length encoding.
*
* Use [lib0/decoding] with [lib0/encoding]. Every encoding function has a corresponding decoding function.
*
* Encodes numbers in little-endian order (least to most significant byte order)
* and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
* which is also used in Protocol Buffers.
*
* ```js
* // encoding step
* const encoder = encoding.createEncoder()
* encoding.writeVarUint(encoder, 256)
* encoding.writeVarString(encoder, 'Hello world!')
* const buf = encoding.toUint8Array(encoder)
* ```
*
* ```js
* // decoding step
* const decoder = decoding.createDecoder(buf)
* decoding.readVarUint(decoder) // => 256
* decoding.readVarString(decoder) // => 'Hello world!'
* decoding.hasContent(decoder) // => false - all data is read
* ```
*
* @module decoding
*/
const errorUnexpectedEndOfArray = create$1("Unexpected end of array");
const errorIntegerOutOfRange = create$1("Integer out of Range");
/**
* A Decoder handles the decoding of an Uint8Array.
* @template {ArrayBufferLike} [Buf=ArrayBufferLike]
*/
var Decoder = class {
	/**
	* @param {Uint8Array<Buf>} uint8Array Binary data to decode
	*/
	constructor(uint8Array) {
		/**
		* Decoding target.
		*
		* @type {Uint8Array<Buf>}
		*/
		this.arr = uint8Array;
		/**
		* Current decoding position.
		*
		* @type {number}
		*/
		this.pos = 0;
	}
};
/**
* @function
* @template {ArrayBufferLike} Buf
* @param {Uint8Array<Buf>} uint8Array
* @return {Decoder<Buf>}
*/
const createDecoder = (uint8Array) => new Decoder(uint8Array);
/**
* Create an Uint8Array view of the next `len` bytes and advance the position by `len`.
*
* Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
*            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
*
* @function
* @template {ArrayBufferLike} Buf
* @param {Decoder<Buf>} decoder The decoder instance
* @param {number} len The length of bytes to read
* @return {Uint8Array<Buf>}
*/
const readUint8Array = (decoder, len) => {
	const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
	decoder.pos += len;
	return view;
};
/**
* Read variable length Uint8Array.
*
* Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
*            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
*
* @function
* @template {ArrayBufferLike} Buf
* @param {Decoder<Buf>} decoder
* @return {Uint8Array<Buf>}
*/
const readVarUint8Array = (decoder) => readUint8Array(decoder, readVarUint(decoder));
/**
* Read one byte as unsigned integer.
* @function
* @param {Decoder} decoder The decoder instance
* @return {number} Unsigned 8-bit integer
*/
const readUint8 = (decoder) => decoder.arr[decoder.pos++];
/**
* Read unsigned integer (32bit) with variable length.
* 1/8th of the storage is used as encoding overhead.
*  * numbers < 2^7 is stored in one bytlength
*  * numbers < 2^14 is stored in two bylength
*
* @function
* @param {Decoder} decoder
* @return {number} An unsigned integer.length
*/
const readVarUint = (decoder) => {
	let num = 0;
	let mult = 1;
	const len = decoder.arr.length;
	while (decoder.pos < len) {
		const r = decoder.arr[decoder.pos++];
		num = num + (r & 127) * mult;
		mult *= 128;
		if (r < 128) return num;
		/* c8 ignore start */
		if (num > MAX_SAFE_INTEGER) throw errorIntegerOutOfRange;
	}
	throw errorUnexpectedEndOfArray;
};
/**
* We don't test this function anymore as we use native decoding/encoding by default now.
* Better not modify this anymore..
*
* Transforming utf8 to a string is pretty expensive. The code performs 10x better
* when String.fromCodePoint is fed with all characters as arguments.
* But most environments have a maximum number of arguments per functions.
* For effiency reasons we apply a maximum of 10000 characters at once.
*
* @function
* @param {Decoder} decoder
* @return {String} The read String.
*/
/* c8 ignore start */
const _readVarStringPolyfill = (decoder) => {
	let remainingLen = readVarUint(decoder);
	if (remainingLen === 0) return "";
	else {
		let encodedString = String.fromCodePoint(readUint8(decoder));
		if (--remainingLen < 100) while (remainingLen--) encodedString += String.fromCodePoint(readUint8(decoder));
		else while (remainingLen > 0) {
			const nextLen = remainingLen < 1e4 ? remainingLen : 1e4;
			const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
			decoder.pos += nextLen;
			encodedString += String.fromCodePoint.apply(null, bytes);
			remainingLen -= nextLen;
		}
		return decodeURIComponent(escape(encodedString));
	}
};
/* c8 ignore stop */
/**
* @function
* @param {Decoder} decoder
* @return {String} The read String
*/
const _readVarStringNative = (decoder) => utf8TextDecoder.decode(readVarUint8Array(decoder));
/**
* Read string of variable length
* * varUint is used to store the length of the string
*
* @function
* @param {Decoder} decoder
* @return {String} The read String
*
*/
/* c8 ignore next */
const readVarString = utf8TextDecoder ? _readVarStringNative : _readVarStringPolyfill;
//#endregion
//#region ../y-reticulum/node_modules/lib0/time.js
/**
* Return current unix time.
*
* @return {number}
*/
const getUnixTime = Date.now;
//#endregion
//#region ../y-reticulum/node_modules/lib0/map.js
/**
* Utility module to work with key-value stores.
*
* @module map
*/
/**
* @template K
* @template V
* @typedef {Map<K,V>} GlobalMap
*/
/**
* Creates a new Map instance.
*
* @function
* @return {Map<any, any>}
*
* @function
*/
const create = () => /* @__PURE__ */ new Map();
/**
* Get map property. Create T if property is undefined and set T on map.
*
* ```js
* const listeners = map.setIfUndefined(events, 'eventName', set.create)
* listeners.add(listener)
* ```
*
* @function
* @template {Map<any, any>} MAP
* @template {MAP extends Map<any,infer V> ? function():V : unknown} CF
* @param {MAP} map
* @param {MAP extends Map<infer K,any> ? K : unknown} key
* @param {CF} createT
* @return {ReturnType<CF>}
*/
const setIfUndefined = (map, key, createT) => {
	let set = map.get(key);
	if (set === void 0) map.set(key, set = createT());
	return set;
};
//#endregion
//#region ../y-reticulum/node_modules/lib0/observable.js
/**
* Observable class prototype.
*
* @module observable
*/
/**
* Handles named events.
* @experimental
*
* This is basically a (better typed) duplicate of Observable, which will replace Observable in the
* next release.
*
* @template {{[key in keyof EVENTS]: function(...any):void}} EVENTS
*/
var ObservableV2 = class {
	constructor() {
		/**
		* Some desc.
		* @type {Map<string, Set<any>>}
		*/
		this._observers = create();
	}
	/**
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name
	* @param {EVENTS[NAME]} f
	*/
	on(name, f) {
		setIfUndefined(this._observers, name, create$2).add(f);
		return f;
	}
	/**
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name
	* @param {EVENTS[NAME]} f
	*/
	once(name, f) {
		/**
		* @param  {...any} args
		*/
		const _f = (...args) => {
			this.off(name, _f);
			f(...args);
		};
		this.on(name, _f);
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
			if (observers.size === 0) this._observers.delete(name);
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
		return from((this._observers.get(name) || create()).values()).forEach((f) => f(...args));
	}
	destroy() {
		this._observers = create();
	}
};
/* c8 ignore start */
/**
* Handles named events.
*
* @deprecated
* @template N
*/
var Observable = class {
	constructor() {
		/**
		* Some desc.
		* @type {Map<N, any>}
		*/
		this._observers = create();
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	on(name, f) {
		setIfUndefined(this._observers, name, create$2).add(f);
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	once(name, f) {
		/**
		* @param  {...any} args
		*/
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
			if (observers.size === 0) this._observers.delete(name);
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
		return from((this._observers.get(name) || create()).values()).forEach((f) => f(...args));
	}
	destroy() {
		this._observers = create();
	}
};
/* c8 ignore end */
//#endregion
//#region ../y-reticulum/node_modules/lib0/trait/equality.js
const EqualityTraitSymbol = Symbol("Equality");
//#endregion
//#region ../y-reticulum/node_modules/lib0/object.js
/**
* @param {Object<string,any>} obj
*/
const keys = Object.keys;
/**
* @param {Object<string,any>} obj
* @return {number}
*/
const size = (obj) => keys(obj).length;
/**
* Calls `Object.prototype.hasOwnProperty`.
*
* @param {any} obj
* @param {string|number|symbol} key
* @return {boolean}
*/
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
//#endregion
//#region ../y-reticulum/node_modules/lib0/function.js
/* c8 ignore start */
/**
* @param {any} a
* @param {any} b
* @return {boolean}
*/
const equalityDeep = (a, b) => {
	if (a === b) return true;
	if (a == null || b == null || a.constructor !== b.constructor && (a.constructor || Object) !== (b.constructor || Object)) return false;
	if (a[EqualityTraitSymbol] != null) return a[EqualityTraitSymbol](b);
	switch (a.constructor) {
		case ArrayBuffer:
			a = new Uint8Array(a);
			b = new Uint8Array(b);
		case Uint8Array:
			if (a.byteLength !== b.byteLength) return false;
			for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
			break;
		case Set:
			if (a.size !== b.size) return false;
			for (const value of a) if (!b.has(value)) return false;
			break;
		case Map:
			if (a.size !== b.size) return false;
			for (const key of a.keys()) if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) return false;
			break;
		case void 0:
		case Object:
			if (size(a) !== size(b)) return false;
			for (const key in a) if (!hasProperty(a, key) || !equalityDeep(a[key], b[key])) return false;
			break;
		case Array:
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) if (!equalityDeep(a[i], b[i])) return false;
			break;
		default: return false;
	}
	return true;
};
//#endregion
//#region ../y-reticulum/node_modules/y-protocols/awareness.js
/**
* @module awareness-protocol
*/
const outdatedTimeout = 3e4;
/**
* @typedef {Object} MetaClientState
* @property {number} MetaClientState.clock
* @property {number} MetaClientState.lastUpdated unix timestamp
*/
/**
* The Awareness class implements a simple shared state protocol that can be used for non-persistent data like awareness information
* (cursor, username, status, ..). Each client can update its own local state and listen to state changes of
* remote clients. Every client may set a state of a remote peer to `null` to mark the client as offline.
*
* Each client is identified by a unique client id (something we borrow from `doc.clientID`). A client can override
* its own state by propagating a message with an increasing timestamp (`clock`). If such a message is received, it is
* applied if the known state of that client is older than the new state (`clock < newClock`). If a client thinks that
* a remote client is offline, it may propagate a message with
* `{ clock: currentClientClock, state: null, client: remoteClient }`. If such a
* message is received, and the known clock of that client equals the received clock, it will override the state with `null`.
*
* Before a client disconnects, it should propagate a `null` state with an updated clock.
*
* Awareness states must be updated every 30 seconds. Otherwise the Awareness instance will delete the client state.
*
* @extends {Observable<string>}
*/
var Awareness = class extends Observable {
	/**
	* @param {Y.Doc} doc
	*/
	constructor(doc) {
		super();
		this.doc = doc;
		/**
		* @type {number}
		*/
		this.clientID = doc.clientID;
		/**
		* Maps from client id to client state
		* @type {Map<number, Object<string, any>>}
		*/
		this.states = /* @__PURE__ */ new Map();
		/**
		* @type {Map<number, MetaClientState>}
		*/
		this.meta = /* @__PURE__ */ new Map();
		this._checkInterval = setInterval(() => {
			const now = getUnixTime();
			if (this.getLocalState() !== null && 3e4 / 2 <= now - this.meta.get(this.clientID).lastUpdated) this.setLocalState(this.getLocalState());
			/**
			* @type {Array<number>}
			*/
			const remove = [];
			this.meta.forEach((meta, clientid) => {
				if (clientid !== this.clientID && 3e4 <= now - meta.lastUpdated && this.states.has(clientid)) remove.push(clientid);
			});
			if (remove.length > 0) removeAwarenessStates(this, remove, "timeout");
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
		if (state === null) this.states.delete(clientID);
		else this.states.set(clientID, state);
		this.meta.set(clientID, {
			clock,
			lastUpdated: getUnixTime()
		});
		const added = [];
		const updated = [];
		const filteredUpdated = [];
		const removed = [];
		if (state === null) removed.push(clientID);
		else if (prevState == null) {
			if (state != null) added.push(clientID);
		} else {
			updated.push(clientID);
			if (!equalityDeep(prevState, state)) filteredUpdated.push(clientID);
		}
		if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) this.emit("change", [{
			added,
			updated: filteredUpdated,
			removed
		}, "local"]);
		this.emit("update", [{
			added,
			updated,
			removed
		}, "local"]);
	}
	/**
	* @param {string} field
	* @param {any} value
	*/
	setLocalStateField(field, value) {
		const state = this.getLocalState();
		if (state !== null) this.setLocalState({
			...state,
			[field]: value
		});
	}
	/**
	* @return {Map<number,Object<string,any>>}
	*/
	getStates() {
		return this.states;
	}
};
/**
* Mark (remote) clients as inactive and remove them from the list of active peers.
* This change will be propagated to remote clients.
*
* @param {Awareness} awareness
* @param {Array<number>} clients
* @param {any} origin
*/
const removeAwarenessStates = (awareness, clients, origin) => {
	const removed = [];
	for (let i = 0; i < clients.length; i++) {
		const clientID = clients[i];
		if (awareness.states.has(clientID)) {
			awareness.states.delete(clientID);
			if (clientID === awareness.clientID) {
				const curMeta = awareness.meta.get(clientID);
				awareness.meta.set(clientID, {
					clock: curMeta.clock + 1,
					lastUpdated: getUnixTime()
				});
			}
			removed.push(clientID);
		}
	}
	if (removed.length > 0) {
		awareness.emit("change", [{
			added: [],
			updated: [],
			removed
		}, origin]);
		awareness.emit("update", [{
			added: [],
			updated: [],
			removed
		}, origin]);
	}
};
/**
* @param {Awareness} awareness
* @param {Array<number>} clients
* @return {Uint8Array}
*/
const encodeAwarenessUpdate = (awareness, clients, states = awareness.states) => {
	const len = clients.length;
	const encoder = createEncoder();
	writeVarUint(encoder, len);
	for (let i = 0; i < len; i++) {
		const clientID = clients[i];
		const state = states.get(clientID) || null;
		const clock = awareness.meta.get(clientID).clock;
		writeVarUint(encoder, clientID);
		writeVarUint(encoder, clock);
		writeVarString(encoder, JSON.stringify(state));
	}
	return toUint8Array(encoder);
};
/**
* @param {Awareness} awareness
* @param {Uint8Array} update
* @param {any} origin This will be added to the emitted change event
*/
const applyAwarenessUpdate = (awareness, update, origin) => {
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
			if (state === null) if (clientID === awareness.clientID && awareness.getLocalState() != null) clock++;
			else awareness.states.delete(clientID);
			else awareness.states.set(clientID, state);
			awareness.meta.set(clientID, {
				clock,
				lastUpdated: timestamp
			});
			if (clientMeta === void 0 && state !== null) added.push(clientID);
			else if (clientMeta !== void 0 && state === null) removed.push(clientID);
			else if (state !== null) {
				if (!equalityDeep(state, prevState)) filteredUpdated.push(clientID);
				updated.push(clientID);
			}
		}
	}
	if (added.length > 0 || filteredUpdated.length > 0 || removed.length > 0) awareness.emit("change", [{
		added,
		updated: filteredUpdated,
		removed
	}, origin]);
	if (added.length > 0 || updated.length > 0 || removed.length > 0) awareness.emit("update", [{
		added,
		updated,
		removed
	}, origin]);
};
/**
* Create a sync step 1 message based on the state of the current shared document.
*
* @param {encoding.Encoder} encoder
* @param {Y.Doc} doc
*/
const writeSyncStep1 = (encoder, doc) => {
	writeVarUint(encoder, 0);
	writeVarUint8Array(encoder, Y.encodeStateVector(doc));
};
/**
* @param {encoding.Encoder} encoder
* @param {Y.Doc} doc
* @param {Uint8Array} [encodedStateVector]
*/
const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
	writeVarUint(encoder, 1);
	writeVarUint8Array(encoder, Y.encodeStateAsUpdate(doc, encodedStateVector));
};
/**
* Read SyncStep1 message and reply with SyncStep2.
*
* @param {decoding.Decoder} decoder The reply to the received message
* @param {encoding.Encoder} encoder The received message
* @param {Y.Doc} doc
*/
const readSyncStep1 = (decoder, encoder, doc) => writeSyncStep2(encoder, doc, readVarUint8Array(decoder));
/**
* Read and apply Structs and then DeleteStore to a y instance.
*
* @param {decoding.Decoder} decoder
* @param {Y.Doc} doc
* @param {any} transactionOrigin
* @param {(error:Error)=>any} [errorHandler]
*/
const readSyncStep2 = (decoder, doc, transactionOrigin, errorHandler) => {
	try {
		Y.applyUpdate(doc, readVarUint8Array(decoder), transactionOrigin);
	} catch (error) {
		if (errorHandler != null) errorHandler(error);
		console.error("Caught error while handling a Yjs update", error);
	}
};
/**
* @param {encoding.Encoder} encoder
* @param {Uint8Array} update
*/
const writeUpdate = (encoder, update) => {
	writeVarUint(encoder, 2);
	writeVarUint8Array(encoder, update);
};
/**
* Read and apply Structs and then DeleteStore to a y instance.
*
* @param {decoding.Decoder} decoder
* @param {Y.Doc} doc
* @param {any} transactionOrigin
* @param {(error:Error)=>any} [errorHandler]
*/
const readUpdate = readSyncStep2;
/**
* @param {decoding.Decoder} decoder A message received from another client
* @param {encoding.Encoder} encoder The reply message. Does not need to be sent if empty.
* @param {Y.Doc} doc
* @param {any} transactionOrigin
* @param {(error:Error)=>any} [errorHandler] Optional error handler that catches errors when reading Yjs messages.
*/
const readSyncMessage = (decoder, encoder, doc, transactionOrigin, errorHandler) => {
	const messageType = readVarUint(decoder);
	switch (messageType) {
		case 0:
			readSyncStep1(decoder, encoder, doc);
			break;
		case 1:
			readSyncStep2(decoder, doc, transactionOrigin, errorHandler);
			break;
		case 2:
			readUpdate(decoder, doc, transactionOrigin, errorHandler);
			break;
		default: throw new Error("Unknown message type");
	}
	return messageType;
};
//#endregion
//#region ../y-reticulum/src/messages.js
/**
* @file messages.js
* @description The Yjs sync wire protocol used over a peer Link.
*
* This is y-webrtc's framing, minus its BroadcastChannel peer-id message
* (tag 4) which has no Reticulum equivalent. Each message is a 1-byte tag
* followed by a lib0-encoded body:
*
*   0  sync        — carries syncStep1 / syncStep2 / update (y-protocols/sync)
*   1  awareness   — an awareness update (y-protocols/awareness)
*   3  queryAwareness — request the peer's full awareness state
*
* Bytes flow through {@link PeerConn}; this module only knows how to decode
* them and apply them to a Doc / Awareness.
*/
/** @type {0} */
const messageSync = 0;
/** @type {1} */
const messageAwareness = 1;
/**
* Decodes one inbound framed message, applying it to the doc / awareness, and
* returns the bytes of a reply to send back to the same peer (or `null`).
*
* Mirrors y-webrtc's `readMessage`: a `syncStep1` requests our state and so
* produces a `syncStep2` reply; a `syncStep2` delivers the peer's state and
* marks the room synced (once, via `onSynced`); `queryAwareness` produces an
* awareness reply.
*
* @param {import("yjs").Doc} doc
* @param {awarenessProtocol.Awareness} awareness
* @param {Uint8Array} buf
* @param {any} origin - transactionOrigin for any updates this applies.
* @param {boolean} roomSynced - whether the room is already synced (gates the
*   one-shot `onSynced` callback, matching y-webrtc).
* @param {() => void} onSynced - invoked once when a syncStep2 first arrives.
* @returns {Uint8Array | null} reply bytes, or `null` when no reply is needed.
*/
function readMessage(doc, awareness, buf, origin, roomSynced, onSynced) {
	const decoder = createDecoder(buf);
	const encoder = createEncoder();
	const messageType = readVarUint(decoder);
	let sendReply = false;
	switch (messageType) {
		case 0: {
			writeVarUint(encoder, 0);
			const syncMessageType = readSyncMessage(decoder, encoder, doc, origin);
			if (syncMessageType === 1 && !roomSynced) onSynced();
			if (syncMessageType === 0) sendReply = true;
			break;
		}
		case 3:
			writeVarUint(encoder, 1);
			writeVarUint8Array(encoder, encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys())));
			sendReply = true;
			break;
		case 1:
			applyAwarenessUpdate(awareness, readVarUint8Array(decoder), origin);
			break;
		default: return null;
	}
	return sendReply ? toUint8Array(encoder) : null;
}
//#endregion
//#region ../y-reticulum/src/peer-conn.js
/**
* @file peer-conn.js
* @description Wrapper around a Reticulum {@link Link} to a single Yjs peer.
*
* Owns link lifecycle and the low-level send/receive of raw framed bytes. It
* carries no Yjs semantics of its own: the Room plugs the sync/awareness
* protocol into the bytes that flow through here.
*
* Small payloads travel as reliable {@link Channel} messages: the channel adds
* automatic retries, send-window flow control, and in-order / dedup'd delivery
* over the link, so a sync update or awareness change dropped on a lossy hop is
* retransmitted rather than lost. Payloads larger than the channel MDU (an
* initial doc state or a large update) cannot fit in a single channel message
* and are instead transported as a chunked, integrity-checked, bz2-compressed
* Reticulum {@link Resource}, reassembled before delivery.
*/
/**
* Application message type used on every y-reticulum {@link Channel}. Its body
* is a single raw Yjs wire frame (the y-webrtc tag + lib0 payload), carried
* verbatim — the channel envelope adds the framing Reticulum needs for
* reliability, ordering, and flow control, so nothing here touches the Yjs
* bytes.
*
* @extends {MessageBase}
*/
var YjsSyncMessage = class extends MessageBase {
	/** Unique y-reticulum message type on the channel (< 0xf000). */
	static MSGTYPE = 1;
	constructor() {
		super();
		/** @type {Uint8Array} */
		this.data = /* @__PURE__ */ new Uint8Array(0);
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
/**
* Application message type reserved for the room's link-authorization phase.
* Its body is raw application bytes (e.g. a Dacar assertion), carried verbatim;
* the channel envelope provides the usual reliability and ordering. Only used
* while a link is being authorized, before any Yjs traffic flows.
*
* @extends {MessageBase}
*/
var LinkAuthMessage = class extends MessageBase {
	/** Unique y-reticulum message type on the channel (< 0xf000). */
	static MSGTYPE = 2;
	constructor() {
		super();
		/** @type {Uint8Array} */
		this.data = /* @__PURE__ */ new Uint8Array(0);
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
/**
* A peer-to-peer connection over a Reticulum Link.
*
* Exactly one PeerConn exists per established Link. `send` writes a raw byte
* payload — as a reliable Channel message when it fits the channel MDU, else as
* a compressed Resource. Inbound payloads arrive via the channel's message
* handler (small) or the link's `resource` event (large) and are forwarded to
* the room. The peer id is the hex link_id — identical on both ends of a link,
* so both peers agree on the id.
*/
var PeerConn = class {
	/**
	* @param {object} options
	* @param {import("@reticulum/core").Link} options.link
	* @param {Uint8Array|null} options.remoteDestHash
	*   The peer's destination hash. Known on the initiator side (from the
	*   announce that triggered the link); `null` on the responder side.
	* @param {import("@digitaldefiance/bzip2-wasm").default | null} [options.bz2]
	*   Shared bzip2 provider; set on the link so inbound Resources can be
	*   decompressed, and used to compress outbound ones. `null` disables it.
	* @param {(payload: Uint8Array, peer: PeerConn) => void} options.onData
	* @param {(peer: PeerConn) => void} options.onClose
	*/
	constructor({ link, remoteDestHash, bz2, onData, onClose }) {
		this.link = link;
		this.link.bz2 = bz2 ?? void 0;
		this.remoteDestHash = remoteDestHash;
		/** @type {import("@digitaldefiance/bzip2-wasm").default | undefined} */
		this.bz2 = bz2 ?? void 0;
		/** Reliable typed-message channel over the link (retries + flow control). */
		this.channel = link.getChannel();
		this.channel.registerMessageType(YjsSyncMessage);
		this._onChannelMessage = this._onChannelMessage.bind(this);
		this.channel.addMessageHandler(this._onChannelMessage);
		/** Hex link_id; used as the peer id (symmetric across both ends). */
		this.peerId = toHex(link.linkId);
		/** Whether the Yjs doc is synced with this peer. */
		this.synced = false;
		this.closed = false;
		this._onData = onData;
		this._onClose = onClose;
		link.addEventListener("resource", (event) => {
			const resource = event.detail.resource;
			resource.whenComplete().then(() => {
				if (resource.data) this._onData(resource.data, this);
			}).catch(() => {});
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
		for (;;) {
			if (this.closed || this.channel._shutDown) return;
			while (!this.channel.isReadyToSend()) {
				if (this.closed || this.channel._shutDown) return;
				await new Promise((r) => setTimeout(r, 50));
			}
			try {
				await this.channel.send(message);
				return;
			} catch (err) {
				if (err instanceof ChannelException && err.type === CEType.ME_LINK_NOT_READY) continue;
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
		await new Resource({
			data: payload,
			link: this.link,
			bz2: this.bz2,
			autoCompress: true
		}).advertise();
	}
	/**
	* Silently tears down the link (does not invoke `onClose` — the caller is
	* responsible for bookkeeping, e.g. a bulk disconnect).
	*/
	destroy() {
		if (this.closed) return;
		this.closed = true;
		this.link.teardown().catch(() => {});
	}
	/** Internal: a `close` event arrived from the link (peer dropped / timeout). */
	_handleClose() {
		if (this.closed) return;
		this.closed = true;
		this._onClose(this);
	}
};
//#endregion
//#region ../y-reticulum/src/room.js
/**
* @file room.js
* @description The per-room mesh for a {@link ReticulumProvider}.
*
* A Room owns the local Reticulum destination for a Yjs room, announces it for
* discovery, learns peers from their announces, and maintains a pairwise
* {@link PeerConn} (Link) to each one. Over each link it runs the Yjs sync
* protocol (y-protocols/sync) and awareness protocol, broadcasting local Doc
* and Awareness updates and applying inbound ones.
*
* To avoid the two peers both trying to open a Link to each other (WebRTC
* "glare"), exactly one side initiates: the peer whose destination hash is
* lexicographically smaller. The other simply accepts.
*/
/**
* Delay after a peer Link drops before the initiator re-requests the peer's
* path, accelerating re-discovery beyond the periodic announce cadence. Small
* enough to beat the default announce interval, large enough to skip transient
* blips and to no-op if the peer comes back via the next announce first.
*/
const RECONNECT_PATH_REQUEST_DELAY_MS = 1500;
/** Constant-time-ish equality for two equal-length byte arrays. */
function bytesEqual(a, b) {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
/**
* Context handed to a room's {@link LinkPolicy} for every inbound and
* outbound peer link.
*
* @typedef {Object} LinkPolicyContext
* @property {string} remoteIdentityHash Hex truncated hash of the remote
*   peer's long-term identity. Cryptographically bound: on the initiator
*   side it comes from the peer's announce, on the responder side from the
*   signed identify handshake over the link.
* @property {string|null} remoteDestinationHash Hex destination hash of the
*   remote room destination, when known (initiator side).
* @property {boolean} initiator Whether this side initiated the link.
*/
/**
* Decides whether a peer link may carry room traffic. Called on both the
* initiator and responder sides once the remote identity is proven.
*
* @typedef {(context: LinkPolicyContext) => boolean | Promise<boolean>} LinkPolicy
*/
/**
* Exchange API handed to a room's {@link LinkAuthorizer} for the
* application-defined authorization phase on a newly established link. `send`
* delivers an application payload to the peer; `receive` resolves with the
* next application payload from the peer (payloads arriving before the call
* are queued). Both are scoped to this link and stop working once the
* authorization phase ends.
*
* @typedef {Object} LinkAuthorizationExchange
* @property {(payload: Uint8Array) => Promise<void>} send
* @property {() => Promise<Uint8Array>} receive
*/
/**
* Context handed to a room's {@link LinkAuthorizer}. Carries the same identity
* proof as {@link LinkPolicyContext}, plus the live link and a
* {@link LinkAuthorizationExchange} so the application can run its own
* protocol (e.g. a Dacar assertion exchange) before any room traffic flows.
*
* @typedef {Object} LinkAuthorizationContext
* @property {import("@reticulum/core").Link} link The established link.
* @property {string} remoteIdentityHash Hex truncated hash of the remote
*   peer's long-term identity, proven over the link.
* @property {string|null} remoteDestinationHash Hex destination hash of the
*   remote room destination, when known (initiator side).
* @property {boolean} initiator Whether this side initiated the link.
* @property {LinkAuthorizationExchange} exchange
*/
/**
* Application-defined authorization for a peer link, run after the identity
* is proven and before any room traffic flows. May exchange messages with the
* peer via `context.exchange`; return (or resolve) `false` to refuse the
* link. Throwing is treated as a refusal.
*
* @typedef {(context: LinkAuthorizationContext) => boolean | Promise<boolean>} LinkAuthorizer
*/
/**
* @typedef {Object} RoomCallbacks
* @property {(added: string[], removed: string[]) => void} onPeers
*   Fired whenever peers are discovered or drop off. Ids are hex link_ids.
* @property {(synced: boolean) => void} onSynced
*   Fired when the room's overall sync state changes.
* @property {(refusals: Array<{ destinationHash: string | null, identityHash: string | null, initiator: boolean, reason?: string }>) => void} [onRefused]
*   Fired when a peer link was refused by the link policy or the
*   authorization phase. `reason` is `"identify-timeout"` (the peer never
*   proved its identity), `"link-policy"` (policy declined),
*   `"authorization"` (the authorizer declined or threw) or
*   `"authorization-timeout"` (the authorization phase exceeded
*   `authorizeTimeoutMs`). Apps can use this to surface access requests
*   (e.g. "peer X wants to join").
*/
/**
* One Yjs room: a local destination that announces for discovery, plus the set
* of pairwise {@link PeerConn} links to discovered peers, with the Yjs sync
* and awareness protocols running over each link.
*/
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
	* @param {RoomCallbacks} options.callbacks
	*/
	constructor({ doc, awareness, reticulum, identity, appName, maxConns, announceIntervalMs, linkPolicy, identifyTimeoutMs = 1e4, authorizeLink, authorizeTimeoutMs = 1e4, callbacks }) {
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
		this.callbacks = callbacks;
		/** @type {import("@reticulum/core").Destination|null} */
		this.dest = null;
		/** Hex of this room destination's hash; set once connected. */
		this.myHex = "";
		this.connected = false;
		/** Whether the Doc is synced with the current peer mesh. */
		this.synced = false;
		/** Shared bzip2 provider for Resource compression; set on connect(). */
		this.bz2 = null;
		/** @type {Map<string, PeerConn>} hex link_id → conn */
		this.peerConns = /* @__PURE__ */ new Map();
		/** Destination hashes we currently have an outgoing link to (initiator side). */
		this.linkedDestHexes = /* @__PURE__ */ new Set();
		/** Destination hashes with an in-flight createLink() (de-bounces announces). */
		this.pendingInitiates = /* @__PURE__ */ new Set();
		/** Destination hex → scheduled reconnect path-request timer (initiator side). */
		this.pendingPathRequests = /* @__PURE__ */ new Map();
		/** Link → payloads stashed before the peer's PeerConn existed (see
		* {@link Room._primeChannel}). */
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
		this.dest = await Destination.IN(this.appName, DestType.SINGLE, this.identity, this.rns);
		this.myHex = toHex(this.dest.destinationHash);
		this.rns.transport.bindLocalDestination(this.dest);
		this.rns.transport.addEventListener("announce", this._onAnnounce);
		this.dest.addEventListener("link_request", this._onLinkRequest);
		this.doc.on("update", this._docUpdateHandler);
		this.awareness.on("update", this._awarenessUpdateHandler);
		this.dest.startAnnouncing({ intervalMs: this.announceIntervalMs });
		this.connected = true;
	}
	/** Stops announcing, tears down all peer links, and unbinds the destination. */
	async disconnect() {
		if (!this.connected) return;
		this.connected = false;
		this.dest?.stopAnnouncing();
		for (const timer of this.pendingPathRequests.values()) clearTimeout(timer);
		this.pendingPathRequests.clear();
		this.rns.transport.removeEventListener("announce", this._onAnnounce);
		this.dest?.removeEventListener("link_request", this._onLinkRequest);
		this.doc.off("update", this._docUpdateHandler);
		this.awareness.off("update", this._awarenessUpdateHandler);
		removeAwarenessStates(this.awareness, [this.doc.clientID], "disconnect");
		const removed = [...this.peerConns.keys()];
		for (const conn of this.peerConns.values()) conn.destroy();
		this.peerConns.clear();
		this.linkedDestHexes.clear();
		this.pendingInitiates.clear();
		this.synced = false;
		if (removed.length) this.callbacks.onPeers([], removed);
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
		const detail = event.detail;
		if (!bytesEqual(detail.nameHash, this.dest.nameHash)) return;
		const remoteHex = toHex(detail.destinationHash);
		if (remoteHex === this.myHex) return;
		if (this.peerConns.size >= this.maxConns) return;
		if (this.linkedDestHexes.has(remoteHex)) {
			const staleConns = [...this.peerConns.values()].filter((conn) => conn.remoteDestHash && toHex(conn.remoteDestHash) === remoteHex && conn.link.status !== LinkStatus.ACTIVE);
			if ([...this.peerConns.values()].some((conn) => conn.remoteDestHash && toHex(conn.remoteDestHash) === remoteHex) && staleConns.length === 0) return;
			for (const conn of staleConns) conn.destroy();
			this.linkedDestHexes.delete(remoteHex);
			this.linkedDestHexes.delete(remoteHex);
		}
		if (this.pendingInitiates.has(remoteHex)) return;
		if (this.myHex > remoteHex) return;
		this.pendingInitiates.add(remoteHex);
		const needsProvenIdentity = Boolean(this.linkPolicy || this.authorizeLink);
		/** @type {string} */
		let initiatorIdentityHash = "";
		if (needsProvenIdentity) initiatorIdentityHash = toHex(await Identity.truncatedHash(detail.identity.publicKey));
		if (this.linkPolicy) {
			if (!await this.linkPolicy({
				remoteIdentityHash: initiatorIdentityHash,
				remoteDestinationHash: remoteHex,
				initiator: true
			})) {
				this.pendingInitiates.delete(remoteHex);
				this.callbacks.onRefused?.([{
					destinationHash: remoteHex,
					identityHash: initiatorIdentityHash,
					initiator: true,
					reason: "link-policy"
				}]);
				return;
			}
		}
		let link = null;
		try {
			link = await (await Destination.OUT(this.appName, DestType.SINGLE, detail.identity, this.rns)).createLink();
			if (!this.connected) {
				await link.teardown();
				return;
			}
			this._primeChannel(link);
			if (needsProvenIdentity) await link.identify(this.identity);
			if (this.authorizeLink) {
				const verdict = await this._authorizeLink(link, {
					remoteIdentityHash: initiatorIdentityHash,
					remoteDestinationHash: remoteHex,
					initiator: true
				});
				if (!verdict.allowed) {
					this._unprimeChannel(link);
					await link.teardown();
					this.callbacks.onRefused?.([{
						destinationHash: remoteHex,
						identityHash: initiatorIdentityHash,
						initiator: true,
						reason: verdict.timedOut ? "authorization-timeout" : "authorization"
					}]);
					return;
				}
			}
			this.linkedDestHexes.add(remoteHex);
			this._registerPeer(link, detail.destinationHash);
		} catch {
			if (link) this._unprimeChannel(link);
		} finally {
			this.pendingInitiates.delete(remoteHex);
		}
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
		const packet = event.detail.packet;
		let link = null;
		try {
			link = await this.dest.acceptLink(packet);
			if (!this.connected) {
				await link.teardown();
				return;
			}
			this._primeChannel(link);
			if (this.linkPolicy || this.authorizeLink) {
				const identityHash = await this._awaitIdentify(link);
				if (!identityHash) {
					this._unprimeChannel(link);
					await link.teardown();
					this.callbacks.onRefused?.([{
						destinationHash: null,
						identityHash: null,
						initiator: false,
						reason: "identify-timeout"
					}]);
					return;
				}
				if (this.linkPolicy) {
					if (!await this.linkPolicy({
						remoteIdentityHash: identityHash,
						remoteDestinationHash: null,
						initiator: false
					})) {
						this._unprimeChannel(link);
						await link.teardown();
						this.callbacks.onRefused?.([{
							destinationHash: null,
							identityHash,
							initiator: false,
							reason: "link-policy"
						}]);
						return;
					}
				}
				if (this.authorizeLink) {
					const verdict = await this._authorizeLink(link, {
						remoteIdentityHash: identityHash,
						remoteDestinationHash: null,
						initiator: false
					});
					if (!verdict.allowed) {
						this._unprimeChannel(link);
						await link.teardown();
						this.callbacks.onRefused?.([{
							destinationHash: null,
							identityHash,
							initiator: false,
							reason: verdict.timedOut ? "authorization-timeout" : "authorization"
						}]);
						return;
					}
				}
			}
			this._registerPeer(link, null);
		} catch {
			if (link) this._unprimeChannel(link);
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
				const identity = event.detail?.identity;
				resolve(identity ? toHex(identity.getSalt()) : null);
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
		const channel = link.getChannel();
		channel.registerMessageType(YjsSyncMessage);
		channel.registerMessageType(LinkAuthMessage);
		const payloads = [];
		const stash = (msg) => {
			if (!(msg instanceof YjsSyncMessage)) return false;
			payloads.push(msg.data);
			return true;
		};
		channel.addMessageHandler(stash);
		const authPayloads = [];
		/** @type {Array<{ resolve: (payload: Uint8Array) => void, reject: (err: Error) => void }>} */
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
		for (const waiter of primed.authWaiters.splice(0)) waiter.reject(/* @__PURE__ */ new Error("authorization channel closed"));
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
	* @returns {Promise<{ allowed: boolean, timedOut: boolean }>}
	*/
	async _authorizeLink(link, { remoteIdentityHash, remoteDestinationHash, initiator }) {
		if (!this.authorizeLink) return {
			allowed: true,
			timedOut: false
		};
		const primed = this._primedChannels.get(link);
		if (!primed) return {
			allowed: false,
			timedOut: false
		};
		const channel = link.getChannel();
		/** Mirrors PeerConn._sendChannel's readiness/retry loop, for auth bytes. */
		const send = async (payload) => {
			const message = new LinkAuthMessage();
			message.data = payload;
			for (;;) {
				if (!this._primedChannels.has(link) || channel._shutDown) throw new Error("authorization channel closed");
				while (!channel.isReadyToSend()) {
					if (!this._primedChannels.has(link) || channel._shutDown) throw new Error("authorization channel closed");
					await new Promise((r) => setTimeout(r, 50));
				}
				try {
					await channel.send(message);
					return;
				} catch (err) {
					if (err instanceof ChannelException && err.type === CEType.ME_LINK_NOT_READY) continue;
					throw err;
				}
			}
		};
		const receive = () => {
			const queued = primed.authPayloads.shift();
			if (queued) return Promise.resolve(queued);
			return new Promise((resolve, reject) => {
				primed.authWaiters.push({
					resolve,
					reject
				});
			});
		};
		let timer = null;
		try {
			return {
				allowed: await Promise.race([Promise.resolve(this.authorizeLink({
					link,
					remoteIdentityHash,
					remoteDestinationHash,
					initiator,
					exchange: {
						send,
						receive
					}
				})), new Promise((_resolve, reject) => {
					timer = setTimeout(() => reject(/* @__PURE__ */ new Error("authorization timed out")), this.authorizeTimeoutMs);
				})]) !== false,
				timedOut: false
			};
		} catch {
			return {
				allowed: false,
				timedOut: true
			};
		} finally {
			if (timer !== null) clearTimeout(timer);
		}
	}
	/**
	* Registers a newly active peer and kicks off the Yjs sync handshake
	* (syncStep1 + local awareness), mirroring y-webrtc's peer-on-connect path.
	* @param {import("@reticulum/core").Link} link
	* @param {Uint8Array|null} remoteDestHash
	*/
	_registerPeer(link, remoteDestHash) {
		const stashed = this._unprimeChannel(link);
		const peer = new PeerConn({
			link,
			remoteDestHash,
			bz2: this.bz2,
			onData: (payload, p) => this._onPeerData(payload, p),
			onClose: (p) => this._onPeerClose(p)
		});
		this.peerConns.set(peer.peerId, peer);
		this.callbacks.onPeers([peer.peerId], []);
		for (const payload of stashed) this._onPeerData(payload, peer);
		this._sendInitialSync(peer);
	}
	/** @param {PeerConn} peer */
	_onPeerClose(peer) {
		if (!this.peerConns.delete(peer.peerId)) return;
		if (peer.remoteDestHash) {
			const remoteHex = toHex(peer.remoteDestHash);
			this.linkedDestHexes.delete(remoteHex);
			this._scheduleReconnectPathRequest(remoteHex, peer.remoteDestHash);
		}
		this.callbacks.onPeers([], [peer.peerId]);
		this._checkSynced();
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
			this.rns.transport.requestPath(remoteDestHash).catch(() => {});
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
		const reply = readMessage(this.doc, this.awareness, payload, peer, this.synced, () => {
			peer.synced = true;
			this._checkSynced();
		});
		if (reply) this._send(peer, reply);
	}
	/**
	* Local Doc update → broadcast a sync `update` to every peer.
	* @param {Uint8Array} update
	* @param {any} _origin
	*/
	_docUpdateHandler(update, _origin) {
		const encoder = createEncoder();
		writeVarUint(encoder, 0);
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
		writeVarUint(encoder, 1);
		writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changedClients));
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
		writeVarUint(step1, 0);
		writeSyncStep1(step1, this.doc);
		this._send(peer, toUint8Array(step1));
		const clients = Array.from(this.awareness.getStates().keys());
		if (clients.length > 0) {
			const aw = createEncoder();
			writeVarUint(aw, 1);
			writeVarUint8Array(aw, encodeAwarenessUpdate(this.awareness, clients));
			this._send(peer, toUint8Array(aw));
		}
	}
	/** @param {Uint8Array} bytes */
	_broadcast(bytes) {
		for (const peer of this.peerConns.values()) this._send(peer, bytes);
	}
	/** @param {PeerConn} peer @param {Uint8Array} bytes */
	_send(peer, bytes) {
		peer.send(bytes).catch(() => {});
	}
	/**
	* Recomputes room-level sync state and emits on change. A room with no peers
	* is *not* synced — an empty mesh carries no sync guarantee — so this flips
	* back to `synced: false` when the last peer drops, rather than vacuously
	* `true`.
	*/
	_checkSynced() {
		let synced = this.peerConns.size > 0;
		for (const peer of this.peerConns.values()) if (!peer.synced) {
			synced = false;
			break;
		}
		if (synced !== this.synced) {
			this.synced = synced;
			this.callbacks.onSynced(synced);
		}
	}
};
//#endregion
//#region ../y-reticulum/src/provider.js
/**
* @file provider.js
* @description Reticulum provider for Yjs.
*
* Wraps a {@link Y.Doc} and synchronizes it with peers discovered over the
* Reticulum mesh. Each provider owns (or borrows) a {@link Reticulum} instance
* and a {@link Room} that announces a destination derived from the room name
* and maintains pairwise Links to peers.
*
* Phase 2 (this file) implements the connection lifecycle and peer mesh:
* announcing, discovery and `peers` events. Yjs sync/awareness over those Links
* lands in Phase 3.
*/
/**
* Options accepted by {@link ReticulumProvider}.
*
* @typedef {Object} ProviderOptions
* @property {import("@reticulum/core").Reticulum} reticulum
*   A configured Reticulum instance with at least one (default) interface
*   attached. The provider does not open interfaces itself.
* @property {import("@reticulum/core").Identity} [identity]
*   Identity for this peer's room destination. Generated (non-persistent) if
*   omitted; supply your own to keep a stable address across restarts.
* @property {awarenessProtocol.Awareness} [awareness]
*   Reuse an existing Awareness instance. A fresh one is created when omitted.
* @property {number} [maxConns]
*   Upper bound on simultaneous peer Links. Mirrors y-webrtc's `maxConns`.
* @property {number} [announceIntervalMs]
*   Cadence (ms) at which the room destination is re-announced for discovery.
*   Forwarded to `Destination.startAnnouncing`, which clamps it to the
*   §9.7 60 s floor (sub-minute intervals trigger ingress rate limiting).
* @property {import("./room.js").LinkPolicy} [linkPolicy]
*   When set, peer links must prove their identity (the initiator runs the
*   signed identify handshake over the link) and pass the policy before any
*   room traffic flows. Refused links are torn down and reported via the
*   `refused` event, which apps can use to surface access requests.
* @property {import("./room.js").LinkAuthorizer} [authorizeLink]
*   When set, runs an application-defined authorization phase on every peer
*   link after the identity is proven and before any room traffic flows. The
*   authorizer receives the live link plus a `send`/`receive` exchange bound
*   to the link's channel, so it can run its own protocol (e.g. a Dacar
*   assertion exchange) before Yjs sync is allowed to start. A `false`
*   verdict, a throw, or exceeding `authorizeTimeoutMs` tears the link down
*   and reports it via the `refused` event. Composes with `linkPolicy`,
*   which is evaluated first.
* @property {number} [identifyTimeoutMs]
*   How long the responder waits for the initiator's identify handshake
*   before refusing the link.
* @property {number} [authorizeTimeoutMs]
*   How long the authorization phase may run before the link is refused.
*   Only relevant with an `authorizeLink`.
*/
/**
* Events emitted by {@link ReticulumProvider}. Mirrors the y-webrtc event
* surface so consumers can switch providers with minimal changes.
*
* @typedef {Object} ReticulumProviderEvents
* @property {(event: { connected: boolean }) => void} status
*   Fired when the provider (dis)connects from the mesh.
* @property {(event: { synced: boolean }) => void} synced
*   Fired when sync state with the peer mesh changes. (Phase 3.)
* @property {(event: { added: Array<string>, removed: Array<string> }) => void} peers
*   Fired when peers are discovered or drop off.
* @property {(event: { refusals: Array<{ destinationHash: string | null, identityHash: string | null, initiator: boolean, reason?: string }> }) => void} refused
*   Fired when a peer link was refused by the link policy or the
*   authorization phase.
*/
/**
* Reticulum provider for Yjs.
*
* @extends {ObservableV2<ReticulumProviderEvents>}
*/
var ReticulumProvider = class extends ObservableV2 {
	/**
	* @param {string} roomName
	* @param {Y.Doc} doc
	* @param {ProviderOptions} opts
	*/
	constructor(roomName, doc, opts) {
		super();
		if (!opts || !opts.reticulum) throw new Error("ReticulumProvider requires a `reticulum` instance.");
		this.roomName = roomName;
		this.doc = doc;
		this.reticulum = opts.reticulum;
		/** @type {awarenessProtocol.Awareness} */
		this.awareness = opts.awareness ?? new Awareness(doc);
		this.maxConns = opts.maxConns ?? 20;
		this.announceIntervalMs = opts.announceIntervalMs ?? 6e4;
		this.linkPolicy = opts.linkPolicy ?? null;
		this.identifyTimeoutMs = opts.identifyTimeoutMs ?? 1e4;
		this.authorizeLink = opts.authorizeLink ?? null;
		this.authorizeTimeoutMs = opts.authorizeTimeoutMs ?? 1e4;
		/** Resolved with the room destination's identity on connect(). */
		this.identityPromise = opts.identity ? Promise.resolve(opts.identity) : Identity.generate();
		/** @type {Identity|null} */
		this.identity = opts.identity ?? null;
		/** @type {Room|null} */
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
			identity: this.identity,
			appName,
			maxConns: this.maxConns,
			announceIntervalMs: this.announceIntervalMs,
			linkPolicy: this.linkPolicy,
			identifyTimeoutMs: this.identifyTimeoutMs,
			authorizeLink: this.authorizeLink,
			authorizeTimeoutMs: this.authorizeTimeoutMs,
			callbacks: {
				onPeers: (added, removed) => this.emit("peers", [{
					added,
					removed
				}]),
				onSynced: (synced) => this.emit("synced", [{ synced }]),
				onRefused: (refusals) => this.emit("refused", [{ refusals }])
			}
		});
		await this.room.connect();
		this.emit("status", [{ connected: true }]);
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
//#endregion
export { PeerConn, ReticulumProvider, Room, getCompressionProvider, messageAwareness, messageSync, readMessage, roomDestinationName };
