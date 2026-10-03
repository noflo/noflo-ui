//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@reticulum/core/src/crypto/keys.js
/**
* @module @reticulum/core/src/crypto/keys.js
* @description X25519 / Ed25519 generation and parsing — Web Crypto
*   import/export helpers for raw keys (the operations SubtleCrypto supports;
*   used by key sealing and rfed channel derivation).
*/
/**
* An asymmetric key pair (private + public CryptoKey).
* @typedef KeyPair
* @property {CryptoKey} privateKey
* @property {CryptoKey} publicKey
*/
/**
* Generates an Ed25519 key pair.
* @returns {Promise<KeyPair>}
*/
async function generateEd25519KeyPair() {
	return crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
}
/**
* Generates an X25519 key pair.
* @returns {Promise<KeyPair>}
*/
async function generateX25519KeyPair() {
	return crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveKey", "deriveBits"]);
}
/**
* Exports the public key as a raw Uint8Array.
* @param {CryptoKey} publicKey
* @returns {Promise<Uint8Array>}
*/
async function exportPublicKey(publicKey) {
	const exported = await crypto.subtle.exportKey("raw", publicKey);
	return new Uint8Array(exported);
}
/**
* Imports a raw Ed25519 public key.
* @param {Uint8Array} rawKey
* @returns {Promise<CryptoKey>}
*/
async function importEd25519PublicKey(rawKey) {
	return await crypto.subtle.importKey("raw", rawKey, { name: "Ed25519" }, true, ["verify"]);
}
/**
* Imports a raw X25519 public key.
* @param {Uint8Array} rawKey
* @returns {Promise<CryptoKey>}
*/
async function importX25519PublicKey(rawKey) {
	return await crypto.subtle.importKey("raw", rawKey, { name: "X25519" }, true, []);
}
/**
* Exports the private key as raw bytes (32 bytes).
* @param {CryptoKey} privateKey
* @returns {Promise<Uint8Array>}
*/
async function exportRawPrivateKey(privateKey) {
	const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
	return new Uint8Array(pkcs8).slice(-32);
}
/**
* Imports an Ed25519 private key from raw bytes.
* @param {Uint8Array} rawKey
* @returns {Promise<CryptoKey>}
*/
async function importRawEd25519PrivateKey(rawKey) {
	const wrapped = new Uint8Array([
		48,
		46,
		2,
		1,
		0,
		48,
		5,
		6,
		3,
		43,
		101,
		112,
		4,
		34,
		4,
		32,
		...rawKey
	]);
	return await crypto.subtle.importKey("pkcs8", wrapped, { name: "Ed25519" }, true, ["sign"]);
}
/**
* Decodes an unpadded base64url string into a byte array.
* @param {string} s
* @returns {Uint8Array}
* @private
*/
function base64urlToBytes(s) {
	const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - s.length % 4);
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}
/**
* Derives the public key corresponding to an OKP (X25519 / Ed25519) private
* key.
*
* WebCrypto has no direct "give me my public key" call, but exporting an OKP
* private key as JWK yields the public component in the `x` field
* (RFC 8037), which we re-import as a raw public key. Used by
* {@link import("../core/identity.js").Identity.fromPrivateKey} to build a
* full identity from private-key material alone.
* @param {CryptoKey} privateKey An extractable X25519 or Ed25519 private key.
* @returns {Promise<{publicKey: CryptoKey, raw: Uint8Array}>} The matching
*   public key, both as a CryptoKey and as 32 raw bytes.
*/
async function derivePublicKeyFromPrivate(privateKey) {
	const raw = base64urlToBytes((await crypto.subtle.exportKey("jwk", privateKey)).x);
	const algorithm = privateKey.algorithm;
	return {
		publicKey: await crypto.subtle.importKey("raw", raw, { name: algorithm.name }, true, algorithm.name === "Ed25519" ? ["verify"] : []),
		raw
	};
}
/**
* Imports an X25519 private key from raw bytes.
* @param {Uint8Array} rawKey
* @returns {Promise<CryptoKey>}
*/
async function importRawX25519PrivateKey(rawKey) {
	const wrapped = new Uint8Array([
		48,
		46,
		2,
		1,
		0,
		48,
		5,
		6,
		3,
		43,
		101,
		110,
		4,
		34,
		4,
		32,
		...rawKey
	]);
	return await crypto.subtle.importKey("pkcs8", wrapped, { name: "X25519" }, true, ["deriveKey", "deriveBits"]);
}
//#endregion
//#region node_modules/@reticulum/core/src/crypto/hmac.js
/**
* @file hmac.js
* @description HMAC implementation using Web Crypto API
*/
/**
* Computes an HMAC-SHA256 signature.
* @param {any} key - The key for HMAC.
* @param {any} data - The data to sign.
* @returns {Promise<Uint8Array>} The resulting HMAC signature.
*/
async function hmac(key, data) {
	const cryptoKey = await crypto.subtle.importKey("raw", key, {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	const cleanData = new Uint8Array(data);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, cleanData);
	return new Uint8Array(signature);
}
//#endregion
//#region node_modules/@reticulum/core/src/crypto/ciphers.js
/**
* @file ciphers.js
* @description AES-128-CBC, HKDF derivation
*/
/**
* Performs HKDF to derive bits.
* @param {any} masterKey
* @param {any} salt
* @param {any} info
* @param {number} lengthInBytes
* @returns {Promise<Uint8Array>}
*/
async function hkdf(masterKey, salt, info, lengthInBytes) {
	const prk = await hmac(salt.length === 0 ? /* @__PURE__ */ new Uint8Array(32) : salt, masterKey);
	const okm = new Uint8Array(lengthInBytes);
	let lastT = /* @__PURE__ */ new Uint8Array(0);
	let offset = 0;
	let counter = 1;
	while (offset < lengthInBytes) {
		const input = new Uint8Array(lastT.length + info.length + 1);
		input.set(lastT, 0);
		input.set(info, lastT.length);
		input[input.length - 1] = counter;
		const t = await hmac(prk, input);
		const toCopy = Math.min(t.length, lengthInBytes - offset);
		okm.set(t.slice(0, toCopy), offset);
		offset += toCopy;
		lastT = t;
		counter++;
	}
	return okm;
}
/**
* Encrypts a Uint8Array using AES-CBC.
* @param {CryptoKey} key - The AES-CBC key.
* @param {Uint8Array} iv - 16-byte initialization vector.
* @param {Uint8Array} data - Plaintext data.
* @returns {Promise<Uint8Array>}
*/
async function encryptAES(key, iv, data) {
	const encrypted = await crypto.subtle.encrypt({
		name: "AES-CBC",
		iv
	}, key, data);
	return new Uint8Array(encrypted);
}
/**
* Decrypts a Uint8Array using AES-CBC.
* @param {CryptoKey} key - The AES-CBC key.
* @param {Uint8Array} iv - 16-byte initialization vector.
* @param {Uint8Array} data - Ciphertext data.
* @returns {Promise<Uint8Array>}
*/
async function decryptAES(key, iv, data) {
	const decrypted = await crypto.subtle.decrypt({
		name: "AES-CBC",
		iv
	}, key, data);
	return new Uint8Array(decrypted);
}
//#endregion
//#region node_modules/@reticulum/core/src/crypto/token.js
/**
* @file token.js
* @description Token implementation (modified Fernet)
*/
/**
* Token encryption cipher modes.
* @enum {string}
*/
const MODE = {
	AES_128_CBC: "AES_128_CBC",
	AES_256_CBC: "AES_256_CBC"
};
/**
* This class provides a slightly modified implementation of the Fernet spec.
* Reticulum strips the version and timestamp fields from the token to reduce overhead.
*/
var Token = class {
	/**
	* @param {Uint8Array} key
	* @param {string} [mode=MODE.AES_256_CBC]
	*/
	constructor(key, mode = MODE.AES_256_CBC) {
		if (!key) throw new Error("Token key cannot be null");
		if (mode === MODE.AES_128_CBC) {
			if (key.length !== 32) throw new Error("Token key must be 32 bytes for AES_128_CBC");
			this.mode = MODE.AES_128_CBC;
			this.signingKey = key.slice(0, 16);
			this.encryptionKey = key.slice(16);
			this.algorithm = "AES-CBC";
		} else if (mode === MODE.AES_256_CBC) {
			if (key.length !== 64) throw new Error("Token key must be 64 bytes for AES_256_CBC");
			this.mode = MODE.AES_256_CBC;
			this.signingKey = key.slice(0, 32);
			this.encryptionKey = key.slice(32);
			this.algorithm = "AES-CBC";
		} else throw new Error("Invalid token mode");
	}
	/**
	* Generates a new random token key.
	* @param {string} [mode=MODE.AES_256_CBC]
	* @returns {Promise<Uint8Array>}
	*/
	static async generateKey(mode = MODE.AES_256_CBC) {
		const length = mode === MODE.AES_128_CBC ? 32 : 64;
		return crypto.getRandomValues(new Uint8Array(length));
	}
	/**
	* Verifies the HMAC of a token.
	* @param {Uint8Array} token
	* @returns {Promise<boolean>}
	*/
	async verifyHmac(token) {
		if (token.length <= 32) throw new Error("Cannot verify HMAC on token of only " + token.length + " bytes");
		const receivedHmac = token.slice(-32);
		const dataToVerify = token.slice(0, -32);
		const expectedHmac = await hmac(this.signingKey, dataToVerify);
		return this.constantTimeCompare(receivedHmac, expectedHmac);
	}
	/**
	* Encrypts the provided data.
	* @param {Uint8Array} data
	* @returns {Promise<Uint8Array>}
	*/
	async encrypt(data) {
		if (!(data instanceof Uint8Array)) throw new TypeError("Token plaintext input must be Uint8Array");
		const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
		const ciphertext = await encryptAES(await crypto.subtle.importKey("raw", this.encryptionKey, { name: this.algorithm }, false, ["encrypt"]), iv, data);
		const signedParts = new Uint8Array(iv.length + ciphertext.length);
		signedParts.set(iv, 0);
		signedParts.set(ciphertext, iv.length);
		const mac = await hmac(this.signingKey, signedParts);
		const token = new Uint8Array(signedParts.length + mac.length);
		token.set(signedParts, 0);
		token.set(mac, signedParts.length);
		return token;
	}
	/**
	* Decrypts the provided token.
	* @param {Uint8Array} token
	* @returns {Promise<Uint8Array>}
	*/
	async decrypt(token) {
		if (!(token instanceof Uint8Array)) throw new TypeError("Token must be Uint8Array");
		if (!await this.verifyHmac(token)) throw new Error("Token HMAC was invalid");
		const iv = token.slice(0, 16);
		const ciphertext = token.slice(16, -32);
		const decryptedPlaintext = await decryptAES(await crypto.subtle.importKey("raw", this.encryptionKey, { name: this.algorithm }, false, ["decrypt"]), iv, ciphertext);
		return new Uint8Array(decryptedPlaintext);
	}
	/**
	* Performs a constant-time comparison of two Uint8Arrays.
	* @param {Uint8Array} a
	* @param {Uint8Array} b
	* @returns {boolean}
	* @private
	*/
	constantTimeCompare(a, b) {
		if (a.length !== b.length) return false;
		let result = 0;
		for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
		return result === 0;
	}
};
//#endregion
//#region node_modules/@reticulum/core/src/utils/encoding.js
/**
* @module @reticulum/core/src/utils/encoding.js
* @description Minimal, zero-dependency encoding utilities for the Reticulum Network System.
* Strictly utilizes standard ES6 TypedArrays and Strings.
*/
/**
* Converts a Uint8Array to a lowercase hexadecimal string.
* This is primarily used for indexing Routing Tables and displaying Destination Hashes.
* * @param {Uint8Array} bytes - The raw byte array to convert.
* @returns {string} The resulting hexadecimal string.
*/
function toHex(bytes) {
	if (!(bytes instanceof Uint8Array)) throw new TypeError("toHex expects a Uint8Array");
	const hex = new Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) hex[i] = bytes[i].toString(16).padStart(2, "0");
	return hex.join("");
}
/**
* Constant-time-ish equality check for two Uint8Arrays.
*
* Used for comparing hashes / public keys where short-circuiting on the first
* differing byte would leak timing information. Returns true only when both
* arrays are the same length and every byte matches.
*
* @param {Uint8Array} a
* @param {Uint8Array} b
* @returns {boolean}
*/
function bytesEqual(a, b) {
	if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) throw new TypeError("bytesEqual expects Uint8Array arguments");
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
/**
* Concatenates a variable number of Uint8Array (or array-like byte sources)
* into a single new Uint8Array. Accepts Uint8Array values directly; anything
* else is coerced via `new Uint8Array(source)`.
*
* @param {...Uint8Array | ArrayLike<number>} arrays
* @returns {Uint8Array}
*/
function concatBytes(...arrays) {
	/** @type {Uint8Array[]} */
	const parts = arrays.map((a) => a instanceof Uint8Array ? a : new Uint8Array(a));
	let total = 0;
	for (const p of parts) total += p.length;
	const out = new Uint8Array(total);
	let offset = 0;
	for (const p of parts) {
		out.set(p, offset);
		offset += p.length;
	}
	return out;
}
/**
* Encodes a Uint8Array into standard (RFC 4648) base64.
*
* Pure-JS implementation (no `Buffer`/`btoa`) so it runs unchanged on every
* WinterTC-compatible runtime.
*
* @param {Uint8Array} bytes
* @returns {string}
*/
function bytesToBase64(bytes) {
	if (!(bytes instanceof Uint8Array)) throw new TypeError("bytesToBase64 expects a Uint8Array");
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let out = "";
	let i = 0;
	for (; i + 2 < bytes.length; i += 3) {
		const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
		out += chars[n >> 18 & 63];
		out += chars[n >> 12 & 63];
		out += chars[n >> 6 & 63];
		out += chars[n & 63];
	}
	const rem = bytes.length - i;
	if (rem === 1) {
		const n = bytes[i] << 16;
		out += chars[n >> 18 & 63];
		out += chars[n >> 12 & 63];
		out += "==";
	} else if (rem === 2) {
		const n = bytes[i] << 16 | bytes[i + 1] << 8;
		out += chars[n >> 18 & 63];
		out += chars[n >> 12 & 63];
		out += chars[n >> 6 & 63];
		out += "=";
	}
	return out;
}
const B64_DEC = (() => {
	const t = (/* @__PURE__ */ new Int8Array(128)).fill(-1);
	const std = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	for (let i = 0; i < 64; i++) t[std.charCodeAt(i)] = i;
	t["-".charCodeAt(0)] = 62;
	t["_".charCodeAt(0)] = 63;
	return t;
})();
/**
* Decodes a (standard or URL-safe, padded or unpadded) base64 string.
*
* Tolerant in the same ways the Python LXMF reference is when ingesting paper
* URIs: stray padding is ignored and missing padding is restored.
*
* @param {string} str
* @returns {Uint8Array}
*/
function base64ToBytes(str) {
	if (typeof str !== "string") throw new TypeError("base64ToBytes expects a string");
	let s = str.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
	const pad = (4 - s.length % 4) % 4;
	if (pad) s += "=".repeat(pad);
	const out = new Uint8Array(s.length / 4 * 3);
	let o = 0;
	for (let i = 0; i < s.length; i += 4) {
		const c0 = B64_DEC[s.charCodeAt(i)];
		const c1 = B64_DEC[s.charCodeAt(i + 1)];
		const c2 = s.charCodeAt(i + 2) === "=".charCodeAt(0) ? -1 : B64_DEC[s.charCodeAt(i + 2)];
		const c3 = s.charCodeAt(i + 3) === "=".charCodeAt(0) ? -1 : B64_DEC[s.charCodeAt(i + 3)];
		const n = c0 << 18 | c1 << 12 | (c2 & 63) << 6 | c3 & 63;
		out[o++] = n >> 16 & 255;
		if (c2 !== -1) out[o++] = n >> 8 & 255;
		if (c3 !== -1) out[o++] = n & 255;
	}
	return out.subarray(0, o);
}
/**
* Encodes bytes as URL-safe base64 **without** padding, the exact form used by
* the LXMF paper-message `lxm://` URI (`LXMessage.as_uri`).
*
* @param {Uint8Array} bytes
* @returns {string}
*/
function bytesToBase64Url(bytes) {
	return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/**
* Decodes a URL-safe (or standard) base64 string, tolerating missing padding —
* the inverse of {@link bytesToBase64Url}.
*
* @param {string} str
* @returns {Uint8Array}
*/
function base64UrlToBytes(str) {
	return base64ToBytes(str);
}
/**
* Converts a hexadecimal string back into a raw Uint8Array.
* Useful for parsing user-provided destination hashes or static routing configurations.
*
* @param {string} hexString - The hexadecimal string to convert.
* @returns {Uint8Array} The resulting raw byte array.
*/
function fromHex(hexString) {
	if (typeof hexString !== "string") throw new TypeError("fromHex expects a string");
	const cleanHex = hexString.replace(/[\s-]/g, "");
	if (cleanHex.length % 2 !== 0) throw new Error("Hex string must have an even number of characters");
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		const start = i * 2;
		bytes[i] = parseInt(cleanHex.substring(start, start + 2), 16);
	}
	return bytes;
}
//#endregion
//#region node_modules/@reticulum/core/src/utils/log.js
/**
* @module @reticulum/core/src/utils/log.js
* @description Logging utilities for the Reticulum Network System: log levels,
* threshold control, and the `log()` emitter. Log levels and names follow
* RNS conventions (the familiar `LOG_*` levels).
*/
/**
* Log levels, following RNS conventions (the familiar `LOG_*` levels).
*
* Names, ordering and numeric values match the Python reference so that
* `RETICULUM_LOG_LEVEL` / `setLogLevel` accept familiar names
* (`ERROR`, `NOTICE`, `DEBUG`, …) and behave as Reticulum users expect.
*
* @enum {number}
*/
const LogLevel = {
	NONE: -1,
	CRITICAL: 0,
	ERROR: 1,
	WARNING: 2,
	NOTICE: 3,
	INFO: 4,
	VERBOSE: 5,
	DEBUG: 6,
	PATHING: 7,
	EXTREME: 8
};
/** Environment variable consulted at module load for the initial threshold. */
const LOG_LEVEL_ENV = "RETICULUM_LOG_LEVEL";
/** Default threshold when nothing else is configured. */
const DEFAULT_LOG_LEVEL = LogLevel.NOTICE;
const LEVEL_BY_NAME = new Map(Object.entries(LogLevel).map(([name, value]) => [name.toLowerCase(), value]));
/**
* Reads an environment variable in a platform-neutral, dependency-free way.
*
* Works on Node (`process.env`) and Deno (`Deno.env`); returns `undefined`
* in browsers and other runtimes without an environment. Access is wrapped
* so runtimes that throw on env access are treated as "unset".
* @param {string} name
* @returns {string | undefined}
*/
function readEnv(name) {
	try {
		/** @type {any} */
		const g = globalThis;
		const fromProcess = g?.process?.env?.[name];
		if (fromProcess !== void 0) return fromProcess;
		const fromDeno = g?.Deno?.env?.get?.(name);
		if (fromDeno !== void 0) return fromDeno;
	} catch {}
}
/**
* Parses a log level from a name (case-insensitive, e.g. `"DEBUG"`) or a
* number. Out-of-range numbers are clamped to `[CRITICAL, EXTREME]`.
* Unknown names fall back to `fallback`.
* @param {string | number | undefined} value - name, number, or empty.
* @param {number} [fallback] - {@link LogLevel} used when `value` is
*   missing or unrecognised. Defaults to {@link LogLevel.NOTICE}.
* @returns {number} a {@link LogLevel} value.
*/
function parseLogLevel(value, fallback = DEFAULT_LOG_LEVEL) {
	if (value === void 0 || value === null || value === "") return fallback;
	if (typeof value === "number") return clamp(Number.isFinite(value) ? Math.trunc(value) : fallback);
	const trimmed = String(value).trim();
	if (/^-?\d+$/.test(trimmed)) return clamp(Number.parseInt(trimmed, 10));
	return LEVEL_BY_NAME.get(trimmed.toLowerCase()) ?? fallback;
}
/** @param {number} n */
const clamp = (n) => Math.min(LogLevel.EXTREME, Math.max(LogLevel.CRITICAL, n));
let logLevel = parseLogLevel(readEnv(LOG_LEVEL_ENV), DEFAULT_LOG_LEVEL);
/**
* Sets the active log level (the threshold above which messages are dropped).
*
* Accepts a {@link LogLevel} value, a level name, or a numeric level; see
* {@link parseLogLevel}. Takes precedence over the `RETICULUM_LOG_LEVEL`
* environment variable.
* @param {number | string} level
* @returns {void}
*/
function setLogLevel(level) {
	logLevel = parseLogLevel(level, logLevel);
}
/**
* Returns the currently active {@link LogLevel} threshold.
* @returns {number}
*/
function getLogLevel() {
	return logLevel;
}
/**
* Emits a log message if `level` is at or below the active threshold.
*
* The default message level is {@link LogLevel.DEBUG}, so bare
* `log("Mod", msg)` calls stay quiet unless the operator raises the
* threshold to `DEBUG` (or higher). Call sites that should appear at the
* default `NOTICE` verbosity pass an explicit level.
*
* @param {string} module - short tag identifying the emitting subsystem.
* @param {string} message - the message body.
* @param {number} [level=LogLevel.DEBUG] - {@link LogLevel} of this message.
* @returns {void}
*/
function log(module, message, level = LogLevel.DEBUG) {
	if (level > logLevel) return;
	console.log((/* @__PURE__ */ new Date()).toISOString(), `[${module}]`, message);
}
//#endregion
//#region node_modules/@reticulum/core/src/core/identity.js
/**
* @module @reticulum/core/src/core/identity.js
* @description Identity creation, signing, and verification
*/
var identity_exports = /* @__PURE__ */ __exportAll({ Identity: () => Identity });
/**
* Result of a successful announce validation (SPEC.md §4.5).
*
* @typedef {Object} AnnounceValidation
* @property {Identity} identity - Identity reconstructed from the announced public key.
* @property {Uint8Array} nameHash - 10-byte name_hash from the announce body.
* @property {Uint8Array} randomHash - 10-byte random_hash (5 random || 5-byte BE uint40 timestamp).
* @property {Uint8Array|null} ratchet - 32-byte ratchet X25519 pub if context_flag was set, else null.
* @property {Uint8Array} signature - 64-byte Ed25519 signature.
* @property {Uint8Array|null} appData - app_data bytes if present in the announce, else null.
*/
/**
* Represents a Reticulum Identity.
* @description Identity creation, signing, and verification
*/
var Identity = class Identity extends EventTarget {
	/**
	* Truncated-hash length in bytes. Destination, identity, and address
	* hashes are the first 16 bytes of a SHA-256 digest (the Python reference
	* expresses this as `RNS.Reticulum.TRUNCATED_HASHLENGTH//8`, in bits).
	*/
	static TRUNCATED_HASH_LENGTH = 16;
	appData = /* @__PURE__ */ new Uint8Array();
	/**
	* Low-level constructor. Prefer the static factories (`Identity.generate`,
	* `Identity.fromPublicKey`, `Identity.fromBytes`).
	* @param {CryptoKey|null} x25519Priv
	* @param {CryptoKey|null} ed25519Priv
	* @param {CryptoKey} x25519Pub
	* @param {CryptoKey} ed25519Pub
	* @param {Uint8Array} publicKey
	* @param {Uint8Array} identityHash
	*/
	constructor(x25519Priv, ed25519Priv, x25519Pub, ed25519Pub, publicKey, identityHash) {
		super();
		this.x25519Priv = x25519Priv;
		this.ed25519Priv = ed25519Priv;
		this.x25519Pub = x25519Pub;
		this.ed25519Pub = ed25519Pub;
		this.publicKey = publicKey;
		this.identityHash = identityHash;
	}
	/**
	* Sets the application-specific metadata attached to announcements.
	* @param {string} data
	*/
	setAppData(data) {
		this.appData = new TextEncoder().encode(data);
	}
	/**
	* Returns the application-specific metadata as a UTF-8 string.
	* @returns {string}
	*/
	getAppData() {
		return new TextDecoder().decode(this.appData);
	}
	/**
	* Attempts to load an identity from a storage adapter, or generates and
	* saves a new one.
	*
	* Fail-loud semantics: an identity *is* the node's cryptographic address, so
	* we never silently mint a fresh one over an existing key. Only a genuinely
	* absent key file (the adapter returns `null`) leads to generation; a read
	* error or an unusable/corrupt stored blob is surfaced to the operator
	* rather than quietly overwritten, which would break every peer that has
	* cached the old public key.
	*
	* @param {any} [storageAdapter] - Must implement async loadKey() and async saveKey(bytes)
	* @returns {Promise<Identity>}
	* @throws {Error} if a stored key exists but cannot be loaded, or if reading
	*   or persisting the key fails for any non-"missing file" reason.
	*/
	static async loadOrGenerate(storageAdapter) {
		if (!storageAdapter) {
			log("Identity", "No storage adapter provided. Generating ephemeral identity.", LogLevel.WARNING);
			return await Identity.generate();
		}
		let savedBytes = null;
		try {
			savedBytes = await storageAdapter.loadKey();
		} catch (e) {
			log("Identity", `Failed to read identity from storage: ${e}`, LogLevel.ERROR);
			throw new Error(`Failed to read identity from storage: ${e}`);
		}
		if (savedBytes) {
			if (savedBytes.length === 128) {
				const identity = await Identity.fromBytes(savedBytes);
				if (identity) return identity;
			}
			log("Identity", "Stored identity key is present but could not be loaded (corrupt or wrong length). Refusing to overwrite; remove the file manually to regenerate.", LogLevel.ERROR);
			throw new Error("Stored identity key is present but could not be loaded; refusing to overwrite it");
		}
		const newIdentity = await Identity.generate();
		const privateBytes = await newIdentity.getPrivateKey();
		try {
			await storageAdapter.saveKey(privateBytes);
		} catch (e) {
			log("Identity", `Failed to persist new identity: ${e}`, LogLevel.ERROR);
			throw new Error(`Failed to persist new identity: ${e}`);
		}
		return newIdentity;
	}
	/**
	* Get a SHA-256 hash of passed data.
	* @param {Uint8Array} data
	* @returns {Promise<Uint8Array>}
	*/
	static async fullHash(data) {
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		return new Uint8Array(hashBuffer);
	}
	/**
	* Get a truncated SHA-256 hash of passed data.
	* @param {Uint8Array} data
	* @returns {Promise<Uint8Array>}
	*/
	static async truncatedHash(data) {
		return (await Identity.fullHash(data)).slice(0, Identity.TRUNCATED_HASH_LENGTH);
	}
	/**
	* Returns `Identity.TRUNCATED_HASH_LENGTH` (16) fresh random bytes.
	*
	* Mirrors `RNS.Identity.get_random_hash()`. Despite the name this is plain
	* randomness, not a hash of anything. It is the source of the random half
	* of the announce `random_hash` (SPEC.md §4.1) and the Resource random-hash
	* prefix (§10.2 step 3).
	*
	* @returns {Uint8Array} 16 random bytes.
	*/
	static getRandomHash() {
		return crypto.getRandomValues(new Uint8Array(Identity.TRUNCATED_HASH_LENGTH));
	}
	/**
	* Load an identity from a public key.
	* @param {Uint8Array} publicKey
	* @returns {Promise<Identity>}
	*/
	static async fromPublicKey(publicKey) {
		const ed25519PubBytes = /* @__PURE__ */ new Uint8Array(32);
		const x25519PubBytes = /* @__PURE__ */ new Uint8Array(32);
		x25519PubBytes.set(publicKey.subarray(0, 32), 0);
		ed25519PubBytes.set(publicKey.subarray(32, 64), 0);
		const x25519Pub = await crypto.subtle.importKey("raw", x25519PubBytes, { name: "X25519" }, true, []);
		const ed25519Pub = await crypto.subtle.importKey("raw", ed25519PubBytes, { name: "Ed25519" }, true, ["verify"]);
		const cleanPublicKey = /* @__PURE__ */ new Uint8Array(64);
		cleanPublicKey.set(publicKey.subarray(0, 64), 0);
		return new Identity(null, null, x25519Pub, ed25519Pub, cleanPublicKey, await Identity.truncatedHash(cleanPublicKey));
	}
	/**
	* Create a new random identity.
	* @returns {Promise<Identity>}
	*/
	static async generate() {
		const x25519 = await generateX25519KeyPair();
		const ed25519 = await generateEd25519KeyPair();
		const x25519PubBytes = await exportPublicKey(x25519.publicKey);
		const ed25519PubBytes = await exportPublicKey(ed25519.publicKey);
		const publicKey = /* @__PURE__ */ new Uint8Array(64);
		publicKey.set(x25519PubBytes, 0);
		publicKey.set(ed25519PubBytes, 32);
		const identityHash = await Identity.truncatedHash(publicKey);
		return new Identity(x25519.privateKey, ed25519.privateKey, x25519.publicKey, ed25519.publicKey, publicKey, identityHash);
	}
	/**
	* Get the raw private key bytes (64 bytes).
	* @returns {Promise<Uint8Array>}
	*/
	async getPrivateKey() {
		if (!this.x25519Priv || !this.ed25519Priv) throw new Error("Cannot get private key because identity does not hold a private key");
		const x25519PrivBytes = await exportRawPrivateKey(this.x25519Priv);
		const ed25519PrivBytes = await exportRawPrivateKey(this.ed25519Priv);
		const x25519PubBytes = await exportPublicKey(this.x25519Pub);
		const ed25519PubBytes = await exportPublicKey(this.ed25519Pub);
		const privKey = /* @__PURE__ */ new Uint8Array(128);
		privKey.set(x25519PrivBytes, 0);
		privKey.set(x25519PubBytes, 32);
		privKey.set(ed25519PrivBytes, 64);
		privKey.set(ed25519PubBytes, 96);
		return privKey;
	}
	/**
	* Get the public key as bytes.
	* @returns {Promise<Uint8Array>}
	*/
	async getPublicKey() {
		const x25519PubBytes = await exportPublicKey(this.x25519Pub);
		const ed25519PubBytes = await exportPublicKey(this.ed25519Pub);
		const publicKey = /* @__PURE__ */ new Uint8Array(64);
		publicKey.set(x25519PubBytes, 0);
		publicKey.set(ed25519PubBytes, 32);
		return publicKey;
	}
	/**
	* Build an identity from a 64-byte private-key blob.
	*
	* The input is **private key material only** — the first 32 bytes are the
	* X25519 private key, the last
	* 32 bytes the Ed25519 private key — and the public keys are derived from
	* them (rather than supplied, as in {@link Identity.fromBytes}, which takes
	* the full 128-byte priv+pub export).
	*
	* Used to instantiate the {@link import("./ifac.js").deriveIfac IFAC
	* identity} from an HKDF-derived 64-byte key, matching upstream
	* `Identity.from_bytes(ifac_key)`. Returns `null` on invalid input.
	* @param {Uint8Array} bytes 64 bytes: `[x25519Priv(32) || ed25519Priv(32)]`.
	* @returns {Promise<Identity|null>}
	*/
	static async fromPrivateKey(bytes) {
		try {
			if (bytes.length !== 64) throw new Error(`Expected 64 bytes of private key material, got ${bytes.length}`);
			const x25519Priv = await importRawX25519PrivateKey(bytes.slice(0, 32));
			const ed25519Priv = await importRawEd25519PrivateKey(bytes.slice(32, 64));
			const x25519 = await derivePublicKeyFromPrivate(x25519Priv);
			const ed25519 = await derivePublicKeyFromPrivate(ed25519Priv);
			const publicKey = /* @__PURE__ */ new Uint8Array(64);
			publicKey.set(x25519.raw, 0);
			publicKey.set(ed25519.raw, 32);
			const identityHash = await Identity.truncatedHash(publicKey);
			return new Identity(x25519Priv, ed25519Priv, x25519.publicKey, ed25519.publicKey, publicKey, identityHash);
		} catch (e) {
			log("Identity", `Failed to load identity from private key: ${e}`, LogLevel.ERROR);
			return null;
		}
	}
	/**
	* Load an identity from raw bytes.
	* @param {Uint8Array} bytes
	* @returns {Promise<Identity|null>}
	*/
	static async fromBytes(bytes) {
		try {
			const x25519Priv = await importRawX25519PrivateKey(bytes.slice(0, 32));
			const x25519Pub = await importX25519PublicKey(bytes.slice(32, 64));
			const ed25519Priv = await importRawEd25519PrivateKey(bytes.slice(64, 96));
			const ed25519Pub = await importEd25519PublicKey(bytes.slice(96, 128));
			const publicKey = /* @__PURE__ */ new Uint8Array(64);
			publicKey.set(bytes.slice(32, 64), 0);
			publicKey.set(bytes.slice(96, 128), 32);
			return new Identity(x25519Priv, ed25519Priv, x25519Pub, ed25519Pub, publicKey, await Identity.truncatedHash(publicKey));
		} catch (e) {
			log("Identity", `Failed to load identity from bytes: ${e}`, LogLevel.ERROR);
			return null;
		}
	}
	/**
	* Get the salt for HKDF.
	* @returns {Uint8Array}
	*/
	getSalt() {
		return this.identityHash;
	}
	/**
	* Get the context for HKDF.
	* @returns {Uint8Array|null}
	*/
	getContext() {
		return null;
	}
	/**
	* Encrypt information for the identity.
	* @param {Uint8Array} plaintext
	* @param {Uint8Array|null} ratchet
	* @returns {Promise<Uint8Array>}
	*/
	async encrypt(plaintext, ratchet = null) {
		if (!this.ed25519Pub) throw new Error("Encryption failed because identity does not hold a public key");
		const ephemeralKey = await generateX25519KeyPair();
		const ephemeralPubBytes = await exportPublicKey(ephemeralKey.publicKey);
		let targetPublicKey;
		if (ratchet) targetPublicKey = await crypto.subtle.importKey("raw", ratchet, { name: "X25519" }, true, []);
		else targetPublicKey = this.x25519Pub;
		const sharedKeyBuffer = await crypto.subtle.deriveBits({
			name: "X25519",
			public: targetPublicKey
		}, ephemeralKey.privateKey, 256);
		const ciphertext = await new Token(await hkdf(new Uint8Array(sharedKeyBuffer), this.getSalt(), this.getContext() || /* @__PURE__ */ new Uint8Array(0), 64)).encrypt(plaintext);
		const result = new Uint8Array(ephemeralPubBytes.length + ciphertext.length);
		result.set(ephemeralPubBytes, 0);
		result.set(ciphertext, ephemeralPubBytes.length);
		return result;
	}
	/**
	* Decrypt information for the identity.
	* @param {Uint8Array} ciphertextToken
	* @param {Array<Uint8Array>|null} ratchets
	* @returns {Promise<Uint8Array|null>}
	*/
	async decrypt(ciphertextToken, ratchets = null) {
		if (!this.ed25519Priv) throw new Error("Decryption failed because identity does not hold a private key");
		if (ciphertextToken.length > 32) {
			const peerPubBytes = ciphertextToken.slice(0, 32);
			const ciphertext = ciphertextToken.slice(32);
			const peerPub = await crypto.subtle.importKey("raw", peerPubBytes, { name: "X25519" }, true, []);
			let plaintext = null;
			if (ratchets) for (const ratchet of ratchets) try {
				const ratchetPrv = await importRawX25519PrivateKey(ratchet);
				const sharedKeyBuffer = await crypto.subtle.deriveBits({
					name: "X25519",
					public: peerPub
				}, ratchetPrv, 256);
				plaintext = await new Token(await hkdf(new Uint8Array(sharedKeyBuffer), this.getSalt(), this.getContext() || /* @__PURE__ */ new Uint8Array(0), 64)).decrypt(ciphertext);
				if (plaintext) break;
			} catch (e) {}
			if (!plaintext) try {
				const sharedKeyBuffer = await crypto.subtle.deriveBits({
					name: "X25519",
					public: peerPub
				}, this.x25519Priv, 256);
				plaintext = await new Token(await hkdf(new Uint8Array(sharedKeyBuffer), this.getSalt(), this.getContext() || /* @__PURE__ */ new Uint8Array(0), 64)).decrypt(ciphertext);
			} catch (e) {
				plaintext = null;
			}
			return plaintext;
		} else return null;
	}
	/**
	* Signs information by the identity.
	* @param {Uint8Array} message
	* @returns {Promise<Uint8Array>}
	*/
	async sign(message) {
		if (!this.ed25519Priv) throw new Error("Signing failed because identity does not hold a private key");
		const signature = await crypto.subtle.sign("Ed25519", this.ed25519Priv, message);
		const sigArray = new Uint8Array(signature);
		if (sigArray.length !== 64) throw new Error(`CRITICAL: Signature length is ${sigArray.length}, expected 64!`);
		return sigArray;
	}
	/**
	* Validates the signature of a signed message.
	* @param {Uint8Array} signature
	* @param {Uint8Array} messageId
	* @returns {Promise<boolean>}
	*/
	async validate(signature, messageId) {
		if (signature.length !== 64) return false;
		const signatureView = new Uint8Array(signature.buffer, signature.byteOffset, 64);
		const dataView = new Uint8Array(messageId.buffer, messageId.byteOffset, messageId.byteLength);
		return await crypto.subtle.verify("Ed25519", this.ed25519Pub, signatureView, dataView);
	}
	/**
	* Validates an announce exactly like the Python reference's
	* `validate_announce` (SPEC.md §4.5 steps 1-3).
	*
	* Parses the announce body — branching on `contextFlag` so a ratchet-bearing
	* announce shifts the signature 32 bytes deeper (§4.5 step 1) — verifies the
	* Ed25519 signature over the §4.2 `signed_data` (step 2), and recomputes the
	* destination hash from `(name_hash, public_key)` to confirm it matches the
	* outer packet header (step 3).
	*
	* The caller is responsible for the §4.5 step 4 public-key collision check
	* and step 6 caching, since those touch the transport's identity cache.
	*
	* @param {Uint8Array} destinationHash - 16-byte dest_hash from the outer packet header.
	* @param {boolean} contextFlag - the packet header's context_flag bit (ratchet present).
	* @param {Uint8Array} data - the announce body (packet payload).
	* @returns {Promise<AnnounceValidation|null>} null on any validation failure.
	*/
	static async validateAnnounce(destinationHash, contextFlag, data) {
		const sigOffset = contextFlag ? 116 : 84;
		const sigEnd = sigOffset + 64;
		if (data.length < sigEnd) {
			log("Identity", `Announce body too short (${data.length} bytes; need ${sigEnd} for context_flag=${contextFlag ? 1 : 0})`, LogLevel.WARNING);
			return null;
		}
		const publicKey = data.subarray(0, 64);
		const nameHash = data.subarray(64, 74);
		const randomHash = data.subarray(74, 84);
		/** @type {Uint8Array|null} */
		let ratchet = null;
		if (contextFlag) ratchet = data.subarray(84, 116);
		const signature = data.subarray(sigOffset, sigEnd);
		const appData = data.length > sigEnd ? data.slice(sigEnd) : null;
		const identity = await Identity.fromPublicKey(publicKey);
		const ratchetForSig = ratchet ?? /* @__PURE__ */ new Uint8Array(0);
		const appDataForSig = appData ?? /* @__PURE__ */ new Uint8Array(0);
		const signedData = new Uint8Array(destinationHash.length + publicKey.length + nameHash.length + randomHash.length + ratchetForSig.length + appDataForSig.length);
		let offset = 0;
		signedData.set(destinationHash, offset);
		offset += destinationHash.length;
		signedData.set(publicKey, offset);
		offset += publicKey.length;
		signedData.set(nameHash, offset);
		offset += nameHash.length;
		signedData.set(randomHash, offset);
		offset += randomHash.length;
		signedData.set(ratchetForSig, offset);
		offset += ratchetForSig.length;
		signedData.set(appDataForSig, offset);
		if (!await identity.validate(signature, signedData)) {
			log("Identity", "Announce signature verification failed — rejecting", LogLevel.WARNING);
			return null;
		}
		const combined = new Uint8Array(nameHash.length + identity.identityHash.length);
		combined.set(nameHash, 0);
		combined.set(identity.identityHash, nameHash.length);
		if (!bytesEqual(await Identity.truncatedHash(combined), destinationHash)) {
			log("Identity", "Announce destination_hash mismatch — rejecting", LogLevel.WARNING);
			return null;
		}
		identity.appData = appData ?? /* @__PURE__ */ new Uint8Array();
		return {
			identity,
			nameHash,
			randomHash,
			ratchet,
			signature,
			appData
		};
	}
};
//#endregion
export { __exportAll as C, generateX25519KeyPair as S, Token as _, getLogLevel as a, exportRawPrivateKey as b, setLogLevel as c, bytesEqual as d, bytesToBase64 as f, toHex as g, fromHex as h, LogLevel as i, base64ToBytes as l, concatBytes as m, identity_exports as n, log as o, bytesToBase64Url as p, LOG_LEVEL_ENV as r, parseLogLevel as s, Identity as t, base64UrlToBytes as u, hkdf as v, generateEd25519KeyPair as x, exportPublicKey as y };
