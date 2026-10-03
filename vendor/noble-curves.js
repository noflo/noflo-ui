//#region node_modules/@noble/hashes/_u64.js
const U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
const _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
	if (le) return {
		h: Number(n & U32_MASK64),
		l: Number(n >> _32n & U32_MASK64)
	};
	return {
		h: Number(n >> _32n & U32_MASK64) | 0,
		l: Number(n & U32_MASK64) | 0
	};
}
function split(lst, le = false) {
	const len = lst.length;
	let Ah = new Uint32Array(len);
	let Al = new Uint32Array(len);
	for (let i = 0; i < len; i++) {
		const { h, l } = fromBig(lst[i], le);
		[Ah[i], Al[i]] = [h, l];
	}
	return [Ah, Al];
}
const fromNumH = (n) => n / 2 ** 32 | 0;
const fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
	const h = fromNumH(n);
	const l = fromNumL(n);
	view.setUint32(byteOffset, isLE ? l : h, isLE);
	view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
const shrSH = (h, _l, s) => h >>> s;
const shrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrSH = (h, l, s) => h >>> s | l << 32 - s;
const rotrSL = (h, l, s) => h << 32 - s | l >>> s;
const rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
const rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
	const l = (Al >>> 0) + (Bl >>> 0);
	return {
		h: Ah + Bh + (l / 2 ** 32 | 0) | 0,
		l: l | 0
	};
}
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
//#endregion
//#region node_modules/@noble/hashes/utils.js
/**
* Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
* @param a - value to test
* @returns `true` when the value is a Uint8Array-compatible view.
* @example
* Check whether a value is a Uint8Array-compatible view.
* ```ts
* isBytes(new Uint8Array([1, 2, 3]));
* ```
*/
function isBytes$1(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
const atitle$1 = (title) => title ? `"${title}" ` : "";
/**
* Asserts something is a non-negative integer.
* @param n - number to validate
* @param title - label included in thrown errors
* @returns The validated number.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a non-negative integer option.
* ```ts
* anumber(32, 'length');
* ```
*/
function anumber$1(n, title = "") {
	if (typeof n !== "number") throw new TypeError(atitle$1(title) + "expected number, got " + typeof n);
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle$1(title) + "expected integer >= 0, got " + n);
	return n;
}
/**
* Asserts something is Uint8Array.
* @param value - value to validate
* @param length - optional exact length constraint
* @param title - label included in thrown errors
* @returns The validated byte array.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate that a value is a byte array.
* ```ts
* abytes(new Uint8Array([1, 2, 3]));
* ```
*/
function abytes$1(value, length, title = "") {
	if (isBytes$1(value) && (length === void 0 || value.length === length)) return value;
	if (length !== void 0) anumber$1(length, "length");
	const bytes = isBytes$1(value);
	const ofLen = length !== void 0 ? ` of length ${length}` : "";
	const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
	const message = atitle$1(title) + "expected Uint8Array" + ofLen + ", got " + got;
	if (!bytes) throw new TypeError(message);
	throw new RangeError(message);
}
const aobject$1 = (value, label) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
const aopts = (value, label) => {
	aobject$1(value, label);
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) throw new TypeError(`"${label}" expected plain object`);
	if (Object.hasOwn(value, "__proto__")) throw new TypeError(`"${label}.__proto__" is not allowed`);
};
/**
* Asserts a hash instance has not been destroyed or finished.
* @param instance - hash instance to validate
* @param checkFinished - whether to reject finalized instances
* @throws If the hash instance has already been destroyed or finalized. {@link Error}
* @example
* Validate that a hash instance is still usable.
* ```ts
* import { aexists } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aexists(hash);
* ```
*/
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("hash was destroyed");
	if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
* Asserts output is a sufficiently-sized byte array.
* @param out - destination buffer
* @param instance - hash instance providing output length
* Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a caller-provided digest buffer.
* ```ts
* import { aoutput } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aoutput(new Uint8Array(hash.outputLen), hash);
* ```
*/
function aoutput(out, instance) {
	abytes$1(out, void 0, "output");
	const min = instance.outputLen;
	if (!(out.length >= min)) throw new RangeError("\"output\" expected length >= " + min);
}
/**
* Zeroizes typed arrays in place. Warning: JS provides no guarantees.
* @param arrays - arrays to overwrite with zeros
* @example
* Zeroize sensitive buffers in place.
* ```ts
* clean(new Uint8Array([1, 2, 3]));
* ```
*/
function clean(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
* Creates a DataView for byte-level manipulation.
* @param arr - source typed array
* @returns DataView over the same buffer region.
* @example
* Create a DataView over an existing buffer.
* ```ts
* createView(new Uint8Array(4));
* ```
*/
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
const hasHexBuiltin = /* @__PURE__ */ (() => typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function")();
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
/**
* Convert byte array to hex string.
* Uses the built-in function when available and assumes it matches the tested
* fallback semantics.
* @param bytes - bytes to encode
* @returns Lowercase hexadecimal string.
* @throws On wrong argument types. {@link TypeError}
* @example
* Convert bytes to lowercase hexadecimal.
* ```ts
* bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])); // 'cafe0123'
* ```
*/
function bytesToHex$1(bytes) {
	abytes$1(bytes);
	if (hasHexBuiltin) return bytes.toHex();
	let hex = "";
	for (let i = 0; i < bytes.length; i++) hex += hexes[bytes[i]];
	return hex;
}
function asciiToBase16(ch) {
	return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - 55 : ch >= 97 && ch <= 102 ? ch - 87 : void 0;
}
/**
* Convert hex string to byte array. Uses built-in function, when available.
* @param hex - hexadecimal string to decode
* @returns Decoded bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Decode lowercase hexadecimal into bytes.
* ```ts
* hexToBytes('cafe0123'); // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
* ```
*/
function hexToBytes$1(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	if (hasHexBuiltin) try {
		return Uint8Array.fromHex(hex);
	} catch (error) {
		if (error instanceof SyntaxError) throw new RangeError(error.message);
		throw error;
	}
	const hl = hex.length;
	const al = hl / 2;
	if (hl % 2) throw new RangeError("hex string expected, got unpadded hex of length " + hl);
	const array = new Uint8Array(al);
	for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
		const n1 = asciiToBase16(hex.charCodeAt(hi));
		const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
		if (n1 === void 0 || n2 === void 0) {
			const char = hex[hi] + hex[hi + 1];
			throw new RangeError("hex string expected, got non-hex character \"" + char + "\" at index " + hi);
		}
		array[ai] = n1 * 16 + n2;
	}
	return array;
}
/**
* Converts string to bytes using UTF8 encoding.
* Built-in doesn't validate input to be string: we do the check.
* Non-ASCII details are delegated to the platform `TextEncoder`.
* @param str - string to encode
* @returns UTF-8 encoded bytes.
* @throws On wrong argument types. {@link TypeError}
* @example
* Encode a string as UTF-8 bytes.
* ```ts
* utf8ToBytes('abc'); // Uint8Array.from([97, 98, 99])
* ```
*/
function utf8ToBytes(str) {
	if (typeof str !== "string") throw new TypeError("string expected");
	const encoded = new TextEncoder().encode(str);
	try {
		return new Uint8Array(encoded);
	} finally {
		clean(encoded);
	}
}
/**
* Copies several Uint8Arrays into one.
* @param arrays - arrays to concatenate
* @returns Concatenated byte array.
* @throws On wrong argument types. {@link TypeError}
* @example
* Concatenate multiple byte arrays.
* ```ts
* concatBytes(new Uint8Array([1]), new Uint8Array([2]));
* ```
*/
function concatBytes$1(...arrays) {
	let sum = 0;
	for (let i = 0; i < arrays.length; i++) {
		const a = arrays[i];
		abytes$1(a);
		sum += a.length;
	}
	const res = new Uint8Array(sum);
	for (let i = 0, pad = 0; i < arrays.length; i++) {
		const a = arrays[i];
		res.set(a, pad);
		pad += a.length;
	}
	return res;
}
/**
* Merges default options and passed options.
* @param defaults - base option object
* @param opts - user overrides
* @param title - label included in thrown override errors
* @returns Fresh merged option object with a null prototype.
* @throws On wrong argument types. {@link TypeError}
* @example
* Merge user overrides onto default options.
* ```ts
* checkOpts({ dkLen: 32 }, { asyncTick: 10 });
* ```
*/
function checkOpts(defaults, opts, title = "opts") {
	aopts(defaults, "defaults");
	if (opts !== void 0) aopts(opts, title);
	return Object.assign(Object.create(null), defaults, opts);
}
/**
* Creates a callable hash function from a stateful class constructor.
* @param hashCons - hash constructor or factory
* @param info - optional metadata such as DER OID
* @returns Frozen callable hash wrapper with `.create()`.
*   Wrapper construction eagerly calls `hashCons(undefined)` once to read
*   `outputLen` / `blockLen`, so constructor side effects happen at module
*   init time.
* @throws On wrong argument types. {@link TypeError}
* @example
* Wrap a stateful hash constructor into a callable helper.
* ```ts
* import { createHasher } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const wrapped = createHasher(sha256.create, { oid: sha256.oid });
* wrapped(new Uint8Array([1]));
* ```
*/
function createHasher$1(hashCons, info = {}) {
	if (typeof hashCons !== "function") throw new TypeError("\"hashCons\" expected function, got type=" + typeof hashCons);
	info = checkOpts({}, info, "info");
	const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	const tmp = hashCons(void 0);
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.canXOF = tmp.canXOF;
	hashC.create = (opts) => hashCons(opts);
	Object.assign(hashC, info);
	return Object.freeze(hashC);
}
/**
* Cryptographically secure PRNG backed by `crypto.getRandomValues`.
* @param bytesLength - number of random bytes to generate
* @returns Random bytes.
* The platform `getRandomValues()` implementation still defines any
* single-call length cap, and this helper rejects oversize requests
* with a stable library `RangeError` instead of host-specific errors.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If the current runtime does not provide `crypto.getRandomValues`. {@link Error}
* @example
* Generate a fresh random key or nonce.
* ```ts
* const key = randomBytes(16);
* ```
*/
function randomBytes$1(bytesLength = 32) {
	anumber$1(bytesLength, "bytesLength");
	const cr = typeof globalThis === "object" ? globalThis.crypto : null;
	if (typeof cr?.getRandomValues !== "function") throw new Error("crypto.getRandomValues must be defined");
	if (bytesLength > 65536) throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
	return cr.getRandomValues(new Uint8Array(bytesLength));
}
/**
* Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
* @param suffix - final OID byte for the selected hash.
*   The helper accepts any byte even though only the documented NIST hash
*   suffixes are meaningful downstream.
* @returns Object containing the DER-encoded OID.
* @example
* Build OID metadata for a NIST hash.
* ```ts
* oidNist(0x01);
* ```
*/
const oidNist = (suffix) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	suffix
]) });
//#endregion
//#region node_modules/@noble/hashes/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
* Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
* strings with partial-byte tails.
* @param blockLen - internal block size in bytes
* @param outputLen - digest size in bytes
* @param padOffset - trailing length field size in bytes
* @param isLE - whether length and state words are encoded in little-endian
* @example
* Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
* ```ts
* import { _SHA1 } from '@noble/hashes/legacy.js';
* const hash = new _SHA1();
* hash.update(new Uint8Array([97, 98, 99]));
* hash.digest();
* ```
*/
var HashMD = class {
	blockLen;
	outputLen;
	canXOF = false;
	padOffset;
	isLE;
	buffer;
	view;
	finished = false;
	length = 0;
	pos = 0;
	destroyed = false;
	constructor(blockLen, outputLen, padOffset, isLE) {
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		abytes$1(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		let processed = false;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				processed = true;
				continue;
			}
			buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
				processed = true;
			}
		}
		this.length += data.length;
		if (processed) this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		buffer.fill(0, pos);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			buffer.fill(0);
		}
		setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
		this.process(view, 0);
		this.roundClean();
		const oview = out === buffer ? view : createView(out);
		const len = this.outputLen;
		const outLen = len / 4;
		const state = this.get();
		if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneIntoMeta(to) {
		const { buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (pos) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/** Initial SHA512 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
* big-endian 32-bit halves. Derived from the fractional parts of the square roots of the first
* eight prime numbers. Exported as a shared table; callers must treat it as read-only because
* constructors copy halves from it by index. */
const SHA512_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	4089235720,
	3144134277,
	2227873595,
	1013904242,
	4271175723,
	2773480762,
	1595750129,
	1359893119,
	2917565137,
	2600822924,
	725511199,
	528734635,
	4215389547,
	1541459225,
	327033209
]);
//#endregion
//#region node_modules/@noble/hashes/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
* @module
*/
const K512 = /* @__PURE__ */ (() => split([
	"0x428a2f98d728ae22",
	"0x7137449123ef65cd",
	"0xb5c0fbcfec4d3b2f",
	"0xe9b5dba58189dbbc",
	"0x3956c25bf348b538",
	"0x59f111f1b605d019",
	"0x923f82a4af194f9b",
	"0xab1c5ed5da6d8118",
	"0xd807aa98a3030242",
	"0x12835b0145706fbe",
	"0x243185be4ee4b28c",
	"0x550c7dc3d5ffb4e2",
	"0x72be5d74f27b896f",
	"0x80deb1fe3b1696b1",
	"0x9bdc06a725c71235",
	"0xc19bf174cf692694",
	"0xe49b69c19ef14ad2",
	"0xefbe4786384f25e3",
	"0x0fc19dc68b8cd5b5",
	"0x240ca1cc77ac9c65",
	"0x2de92c6f592b0275",
	"0x4a7484aa6ea6e483",
	"0x5cb0a9dcbd41fbd4",
	"0x76f988da831153b5",
	"0x983e5152ee66dfab",
	"0xa831c66d2db43210",
	"0xb00327c898fb213f",
	"0xbf597fc7beef0ee4",
	"0xc6e00bf33da88fc2",
	"0xd5a79147930aa725",
	"0x06ca6351e003826f",
	"0x142929670a0e6e70",
	"0x27b70a8546d22ffc",
	"0x2e1b21385c26c926",
	"0x4d2c6dfc5ac42aed",
	"0x53380d139d95b3df",
	"0x650a73548baf63de",
	"0x766a0abb3c77b2a8",
	"0x81c2c92e47edaee6",
	"0x92722c851482353b",
	"0xa2bfe8a14cf10364",
	"0xa81a664bbc423001",
	"0xc24b8b70d0f89791",
	"0xc76c51a30654be30",
	"0xd192e819d6ef5218",
	"0xd69906245565a910",
	"0xf40e35855771202a",
	"0x106aa07032bbd1b8",
	"0x19a4c116b8d2d0c8",
	"0x1e376c085141ab53",
	"0x2748774cdf8eeb99",
	"0x34b0bcb5e19b48a8",
	"0x391c0cb3c5c95a63",
	"0x4ed8aa4ae3418acb",
	"0x5b9cca4f7763e373",
	"0x682e6ff3d6b2b8a3",
	"0x748f82ee5defb2fc",
	"0x78a5636f43172f60",
	"0x84c87814a1f0ab72",
	"0x8cc702081a6439ec",
	"0x90befffa23631e28",
	"0xa4506cebde82bde9",
	"0xbef9a3f7b2c67915",
	"0xc67178f2e372532b",
	"0xca273eceea26619c",
	"0xd186b8c721c0c207",
	"0xeada7dd6cde0eb1e",
	"0xf57d4f7fee6ed178",
	"0x06f067aa72176fba",
	"0x0a637dc5a2c898a6",
	"0x113f9804bef90dae",
	"0x1b710b35131c471b",
	"0x28db77f523047d84",
	"0x32caab7b40c72493",
	"0x3c9ebe0a15c9bebc",
	"0x431d67c49c100d4c",
	"0x4cc5d4becb3e42b6",
	"0x597f299cfc657e2a",
	"0x5fcb6fab3ad6faec",
	"0x6c44198c4a475817"
].map((n) => BigInt(n))))();
const SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
const SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA-384 / SHA-512 compression engine from RFC 6234 §6.4. */
var SHA2_64B = class extends HashMD {
	Ah = 0;
	Al = 0;
	Bh = 0;
	Bl = 0;
	Ch = 0;
	Cl = 0;
	Dh = 0;
	Dl = 0;
	Eh = 0;
	El = 0;
	Fh = 0;
	Fl = 0;
	Gh = 0;
	Gl = 0;
	Hh = 0;
	Hl = 0;
	constructor(outputLen, IV) {
		super(128, outputLen, 16, false);
		this.Ah = IV[0] | 0;
		this.Al = IV[1] | 0;
		this.Bh = IV[2] | 0;
		this.Bl = IV[3] | 0;
		this.Ch = IV[4] | 0;
		this.Cl = IV[5] | 0;
		this.Dh = IV[6] | 0;
		this.Dl = IV[7] | 0;
		this.Eh = IV[8] | 0;
		this.El = IV[9] | 0;
		this.Fh = IV[10] | 0;
		this.Fl = IV[11] | 0;
		this.Gh = IV[12] | 0;
		this.Gl = IV[13] | 0;
		this.Hh = IV[14] | 0;
		this.Hl = IV[15] | 0;
	}
	get() {
		const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		return [
			Ah,
			Al,
			Bh,
			Bl,
			Ch,
			Cl,
			Dh,
			Dl,
			Eh,
			El,
			Fh,
			Fl,
			Gh,
			Gl,
			Hh,
			Hl
		];
	}
	set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
		this.Ah = Ah | 0;
		this.Al = Al | 0;
		this.Bh = Bh | 0;
		this.Bl = Bl | 0;
		this.Ch = Ch | 0;
		this.Cl = Cl | 0;
		this.Dh = Dh | 0;
		this.Dl = Dl | 0;
		this.Eh = Eh | 0;
		this.El = El | 0;
		this.Fh = Fh | 0;
		this.Fl = Fl | 0;
		this.Gh = Gh | 0;
		this.Gl = Gl | 0;
		this.Hh = Hh | 0;
		this.Hl = Hl | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) {
			SHA512_W_H[i] = view.getUint32(offset);
			SHA512_W_L[i] = view.getUint32(offset += 4);
		}
		for (let i = 16; i < 80; i++) {
			const W15h = SHA512_W_H[i - 15] | 0;
			const W15l = SHA512_W_L[i - 15] | 0;
			const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
			const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
			const W2h = SHA512_W_H[i - 2] | 0;
			const W2l = SHA512_W_L[i - 2] | 0;
			const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
			const SUMl = add4L(s0l, rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6), SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
			SHA512_W_H[i] = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]) | 0;
			SHA512_W_L[i] = SUMl | 0;
		}
		let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
		for (let i = 0; i < 80; i++) {
			const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
			const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
			const CHIh = Eh & Fh ^ ~Eh & Gh;
			const CHIl = El & Fl ^ ~El & Gl;
			const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
			const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
			const T1l = T1ll | 0;
			const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
			const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
			const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
			const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
			Hh = Gh | 0;
			Hl = Gl | 0;
			Gh = Fh | 0;
			Gl = Fl | 0;
			Fh = Eh | 0;
			Fl = El | 0;
			({h: Eh, l: El} = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
			Dh = Ch | 0;
			Dl = Cl | 0;
			Ch = Bh | 0;
			Cl = Bl | 0;
			Bh = Ah | 0;
			Bl = Al | 0;
			const All = add3L(T1l, sigma0l, MAJl);
			Ah = add3H(All, T1h, sigma0h, MAJh);
			Al = All | 0;
		}
		({h: Ah, l: Al} = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
		({h: Bh, l: Bl} = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
		({h: Ch, l: Cl} = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
		({h: Dh, l: Dl} = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
		({h: Eh, l: El} = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
		({h: Fh, l: Fl} = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
		({h: Gh, l: Gl} = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
		({h: Hh, l: Hl} = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
		this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
	}
	roundClean() {
		clean(SHA512_W_H, SHA512_W_L);
	}
	destroy() {
		this.destroyed = true;
		clean(this.buffer);
		this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
	}
};
/** Internal SHA-512 hash class grounded in RFC 6234 §6.3 and §6.4. */
var _SHA512 = class extends SHA2_64B {
	constructor() {
		super(64, SHA512_IV);
	}
};
/**
* SHA2-512 hash function from RFC 4634.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-512.
* ```ts
* sha512(new Uint8Array([97, 98, 99]));
* ```
*/
const sha512 = /* @__PURE__ */ createHasher$1(() => new _SHA512(), /* @__PURE__ */ oidNist(3));
//#endregion
//#region node_modules/@noble/curves/utils.js
/**
* Hex, bytes and number utilities.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
/**
* Validates that a value is an array, optionally validating each element.
* @param item - Value to validate.
* @param title - Label included in thrown errors.
* @param inner - Optional per-element validator, called with the element and its label.
* @returns The validated array.
* @example
* Validate an array of points before batch processing.
*
* ```ts
* aarray([1n, 2n], 'scalars');
* ```
*/
function aarray(item, title, inner = () => {}) {
	if (!Array.isArray(item)) throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
	for (let i = 0; i < item.length; i++) inner(item[i], `${title}[${i}]`);
	return item;
}
/**
* Validates that a value is a byte array.
* @param value - Value to validate.
* @param length - Optional exact byte length.
* @param title - Optional field name.
* @returns Original byte array.
* @example
* Reject non-byte input before passing data into curve code.
*
* ```ts
* abytes(new Uint8Array(1));
* ```
*/
const abytes = (value, length, title) => abytes$1(value, length, title);
/**
* Validates that a value is a non-negative safe integer.
* @param n - Value to validate.
* @param title - Optional field name.
* @returns The validated number.
* @example
* Validate a numeric length before allocating buffers.
*
* ```ts
* anumber(1);
* ```
*/
const anumber = anumber$1;
/**
* Asserts something is a string.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated string.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate a label string.
*
* ```ts
* astring('example', 'label');
* ```
*/
function astring(value, title = "") {
	if (typeof value !== "string") {
		const prefix = title && `"${title}" `;
		throw new TypeError(prefix + "expected string, got type=" + typeof value);
	}
	return value;
}
/**
* Asserts something is a plain object-ish value, not null or array.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated object.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate an options object before checking fields.
*
* ```ts
* aobject({ flag: true });
* ```
*/
function aobject(value, title = "object") {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
	return value;
}
/**
* Asserts something is a function.
* @param value - Value to validate.
* @param title - Label included in thrown errors.
* @returns The validated function.
* @throws On wrong argument types. {@link TypeError}
* @example
* Validate a required method before calling it.
*
* ```ts
* afunction(() => true, 'predicate');
* ```
*/
function afunction(value, title) {
	if (typeof value !== "function") throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
	return value;
}
/**
* Encodes bytes as lowercase hex.
* @param bytes - Bytes to encode.
* @returns Lowercase hex string.
* @example
* Serialize bytes as hex for logging or fixtures.
*
* ```ts
* bytesToHex(Uint8Array.of(1, 2, 3));
* ```
*/
const bytesToHex = bytesToHex$1;
/**
* Concatenates byte arrays.
* @param arrays - Byte arrays to join.
* @returns Concatenated bytes.
* @example
* Join domain-separated chunks into one buffer.
*
* ```ts
* concatBytes(Uint8Array.of(1), Uint8Array.of(2));
* ```
*/
const concatBytes = (...arrays) => concatBytes$1(...arrays);
/**
* Decodes lowercase or uppercase hex into bytes.
* @param hex - Hex string to decode.
* @returns Decoded bytes.
* @example
* Parse fixture hex into bytes before hashing.
*
* ```ts
* hexToBytes('0102');
* ```
*/
const hexToBytes = (hex) => hexToBytes$1(hex);
/**
* Checks whether a value is a Uint8Array.
* @param a - Value to inspect.
* @returns `true` when `a` is a Uint8Array.
* @example
* Branch on byte input before decoding it.
*
* ```ts
* isBytes(new Uint8Array(1));
* ```
*/
const isBytes = isBytes$1;
/**
* Reads random bytes from the platform CSPRNG.
* @param bytesLength - Number of random bytes to read.
* @returns Fresh random bytes.
* @example
* Generate a random seed for a keypair.
*
* ```ts
* randomBytes(2);
* ```
*/
const randomBytes = (bytesLength) => randomBytes$1(bytesLength);
const _0n$5 = /* @__PURE__ */ BigInt(0);
const _1n$5 = /* @__PURE__ */ BigInt(1);
const atitle = (title) => title ? `"${title}" ` : "";
/**
* Validates that a flag is boolean.
* @param value - Value to validate.
* @param title - Optional field name.
* @returns Original value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Reject non-boolean option flags early.
*
* ```ts
* abool(true);
* ```
*/
function abool(value, title = "") {
	if (typeof value !== "boolean") throw new TypeError(atitle(title) + "expected boolean, got type=" + typeof value);
	return value;
}
/**
* Validates that a value is a non-negative bigint or safe integer.
* @param n - Value to validate.
* @returns The same validated value.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate one integer-like value before serializing it.
*
* ```ts
* abignumber(1n);
* ```
*/
function abignumber(n) {
	if (typeof n === "bigint") {
		if (!isPosBig(n)) throw new RangeError("positive bigint expected, got " + n);
	} else anumber(n);
	return n;
}
/**
* Validates that a value is a safe integer.
* @param value - Integer to validate.
* @param title - Optional field name.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a window size before scalar arithmetic uses it.
*
* ```ts
* asafenumber(1);
* ```
*/
function asafenumber(value, title = "") {
	if (typeof value !== "number") {
		const prefix = title && `"${title}" `;
		throw new TypeError(prefix + "expected number, got type=" + typeof value);
	}
	if (!Number.isSafeInteger(value)) {
		const prefix = title && `"${title}" `;
		throw new RangeError(prefix + "expected safe integer, got " + value);
	}
}
/**
* Parses a big-endian hex string into bigint.
* Accepts odd-length hex through the native `BigInt('0x' + hex)` parser and currently surfaces the
* same native `SyntaxError` for malformed hex instead of wrapping it in a library-specific error.
* @param hex - Hex string without `0x`.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Parse a scalar from fixture hex.
*
* ```ts
* hexToNumber('ff');
* ```
*/
function hexToNumber(hex) {
	if (typeof hex !== "string") throw new TypeError("hex string expected, got " + typeof hex);
	return hex === "" ? _0n$5 : BigInt("0x" + hex);
}
/**
* Parses big-endian bytes into bigint.
* @param bytes - Bytes in big-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in network byte order.
*
* ```ts
* bytesToNumberBE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberBE(bytes) {
	return hexToNumber(bytesToHex$1(bytes));
}
/**
* Parses little-endian bytes into bigint.
* @param bytes - Bytes in little-endian order.
* @returns Parsed bigint value.
* @throws On wrong argument types. {@link TypeError}
* @example
* Read a scalar encoded in little-endian form.
*
* ```ts
* bytesToNumberLE(Uint8Array.of(1, 0));
* ```
*/
function bytesToNumberLE(bytes) {
	return hexToNumber(bytesToHex$1(copyBytes(abytes$1(bytes)).reverse()));
}
/**
* Encodes a bigint into fixed-length big-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes. Must be greater than zero.
* @returns Big-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar into a 32-byte field element.
*
* ```ts
* numberToBytesBE(255n, 2);
* ```
*/
function numberToBytesBE(n, len) {
	anumber$1(len);
	if (len === 0) throw new Error("zero output length is invalid");
	n = abignumber(n);
	const expectedLen = len * 2;
	const hex = n.toString(16);
	if (hex.length > expectedLen) throw new RangeError("number is too large");
	return hexToBytes$1(hex.padStart(expectedLen, "0"));
}
/**
* Encodes a bigint into fixed-length little-endian bytes.
* @param n - Number to encode.
* @param len - Output length in bytes.
* @returns Little-endian byte array.
* @throws On wrong argument ranges or values. {@link RangeError}
* @throws If a documented runtime validation or state check fails. {@link Error}
* @example
* Serialize a scalar for little-endian protocols.
*
* ```ts
* numberToBytesLE(255n, 2);
* ```
*/
function numberToBytesLE(n, len) {
	return numberToBytesBE(n, len).reverse();
}
/**
* Compares two byte arrays in constant-ish time.
* @param a - Left byte array.
* @param b - Right byte array.
* @returns `true` when bytes match.
* @example
* Compare two encoded points without early exit.
*
* ```ts
* equalBytes(Uint8Array.of(1), Uint8Array.of(1));
* ```
*/
function equalBytes(a, b) {
	a = abytes(a);
	b = abytes(b);
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
/**
* Copies Uint8Array. We can't use u8a.slice(), because u8a can be Buffer,
* and Buffer#slice creates mutable copy. Never use Buffers!
* @param bytes - Bytes to copy.
* @returns Detached copy.
* @example
* Make an isolated copy before mutating serialized bytes.
*
* ```ts
* copyBytes(Uint8Array.of(1, 2, 3));
* ```
*/
function copyBytes(bytes) {
	return Uint8Array.from(abytes(bytes));
}
/**
* Decodes 7-bit ASCII string to Uint8Array, throws on non-ascii symbols
* Should be safe to use for things expected to be ASCII.
* Returns exact same result as `TextEncoder` for ASCII or throws.
* @param ascii - ASCII input text.
* @returns Encoded bytes.
* @throws On wrong argument types. {@link TypeError}
* @example
* Encode an ASCII domain-separation tag.
*
* ```ts
* asciiToBytes('ABC');
* ```
*/
function asciiToBytes(ascii) {
	if (typeof ascii !== "string") throw new TypeError("ascii string expected, got " + typeof ascii);
	return Uint8Array.from(ascii, (c, i) => {
		const charCode = c.charCodeAt(0);
		if (c.length !== 1 || charCode > 127) throw new RangeError(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
		return charCode;
	});
}
/**
* Checks whether n is non-negative bigint. Historical name.
* @param n - candidate value
* @returns `true` when the value is bigint and 0 or larger
* @example
* Check a candidate scalar before range validation.
*
* ```ts
* isPosBig(2n);
* ```
*/
function isPosBig(n) {
	return typeof n === "bigint" && _0n$5 <= n;
}
/**
* Checks whether a bigint lies inside a half-open range.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* @returns `true` when the value is inside the range.
* @example
* Check whether a candidate scalar fits the field order.
*
* ```ts
* inRange(2n, 1n, 3n);
* ```
*/
function inRange(n, min, max) {
	return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
/**
* Asserts `min <= n < max`. NOTE: upper bound is exclusive.
* @param title - Value label for error messages.
* @param n - Candidate value.
* @param min - Inclusive lower bound.
* @param max - Exclusive upper bound.
* Wrong-type inputs are not separated from out-of-range values here: they still flow through the
* shared `RangeError` path because this is only a throwing wrapper around `inRange(...)`.
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Assert that a bigint stays within one half-open range.
*
* ```ts
* aInRange('x', 2n, 1n, 256n);
* ```
*/
function aInRange(title, n, min, max) {
	if (!inRange(n, min, max)) throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
/**
* Calculates amount of bits in a bigint.
* Same as `n.toString(2).length`
* TODO: merge with nLength in modular
* @param n - Value to inspect.
* @returns Bit length.
* @throws If the value is negative. {@link Error}
* @example
* Measure the bit length of a scalar before serialization.
*
* ```ts
* bitLen(8n);
* ```
*/
function bitLen(n) {
	if (n < _0n$5) throw new Error("expected non-negative bigint, got " + n);
	return n === _0n$5 ? 0 : n.toString(2).length;
}
/**
* Calculate mask for N bits. Not using ** operator with bigints because of old engines.
* Same as BigInt(`0b${Array(i).fill('1').join('')}`)
* @param n - Number of bits. Negative widths are currently passed through to raw bigint shift
*   semantics and therefore produce `-1n`.
* @returns Bitmask value.
* @example
* Calculate mask for N bits.
*
* ```ts
* bitMask(4);
* ```
*/
const bitMask = (n) => {
	asafenumber(n, "n");
	return (_1n$5 << BigInt(n)) - _1n$5;
};
/**
* Validates declared required and optional field types on a plain object.
* Extra keys are intentionally ignored because many callers validate only the subset they use from
* richer option bags or runtime objects.
* This walks field schemas and formats detailed errors, so avoid it on hot paths; use direct
* one-line guards such as `aobject()`, `afunction()`, `abool()`, or `asafenumber()` instead.
* @param object - Object to validate.
* @param fields - Required field types.
* @param optFields - Optional field types.
* @param title - Object label included in thrown errors.
* @throws On wrong argument types. {@link TypeError}
* @example
* Check user options before building a curve helper.
*
* ```ts
* validateObject({ flag: true }, { flag: 'boolean' });
* ```
*/
function validateObject(object, fields = {}, optFields = {}, title = "object") {
	aobject(object, title);
	aobject(fields, "fields");
	aobject(optFields, "optFields");
	function checkField(fieldName, expectedType, isOpt) {
		const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
		const val = object[fieldName];
		if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) throw new TypeError(`${label} is invalid: expected own property`);
		if (isOpt && val === void 0) return;
		const current = typeof val;
		if (current !== expectedType || val === null) throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
	}
	const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
	iter(fields, false);
	iter(optFields, true);
}
/**
* Throws not implemented error.
* @returns Never returns.
* @throws If the unfinished code path is reached. {@link Error}
* @example
* Surface the placeholder error from an unfinished code path.
*
* ```ts
* try {
*   notImplemented();
* } catch {}
* ```
*/
const notImplemented = () => {
	throw new Error("not implemented");
};
//#endregion
//#region node_modules/@noble/curves/abstract/modular.js
/**
* Utils for modular division and fields.
* Field over 11 is a finite (Galois) field is integer number operations `mod 11`.
* There is no division: it is replaced by modular multiplicative inverse.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$4 = /* @__PURE__ */ BigInt(0), _1n$4 = /* @__PURE__ */ BigInt(1), _2n$3 = /* @__PURE__ */ BigInt(2);
const _3n$1 = /* @__PURE__ */ BigInt(3), _4n$2 = /* @__PURE__ */ BigInt(4), _5n$1 = /* @__PURE__ */ BigInt(5);
const _7n = /* @__PURE__ */ BigInt(7), _8n$2 = /* @__PURE__ */ BigInt(8), _9n = /* @__PURE__ */ BigInt(9);
const _15n = /* @__PURE__ */ BigInt(15), _16n = /* @__PURE__ */ BigInt(16);
const POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
/**
* @param a - Dividend value.
* @param b - Positive modulus.
* @returns Reduced value in `[0, b)` only when `b` is positive.
* @throws If the modulus is not positive. {@link Error}
* @example
* Normalize a bigint into one field residue.
*
* ```ts
* mod(-1n, 5n);
* ```
*/
function mod(a, b) {
	if (b <= _0n$4) throw new Error("mod: expected positive modulus, got " + b);
	const result = a % b;
	return result >= _0n$4 ? result : b + result;
}
/**
* Efficiently raise num to a power with modular reduction.
* Unsafe in some contexts: uses ladder, so can expose bigint bits.
* Low-level helper: callers that need canonical residues must pass a valid `num` for the chosen
* modulus instead of relying on the `power===0/1` fast paths to normalize it.
* @param num - Base value.
* @param power - Exponent value.
* @param modulo - Reduction modulus.
* @returns Modular exponentiation result.
* @throws If the modulus or exponent is invalid. {@link Error}
* @example
* Raise one bigint to a modular power.
*
* ```ts
* pow(2n, 6n, 11n) // 64n % 11n == 9n
* ```
*/
function pow(num, power, modulo) {
	if (modulo <= _1n$4) throw new Error("pow: expected modulus > 1, got " + modulo);
	if (typeof power !== "bigint") throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
	if (power < _0n$4) throw new Error("invalid exponent, negatives unsupported");
	if (power === _0n$4) return _1n$4;
	if (power === _1n$4) return num;
	let d = num % modulo;
	if (d < _0n$4) d += modulo;
	if (power < POW_WINDOWED_MIN) {
		let p = _1n$4;
		while (power > _0n$4) {
			if (power & _1n$4) p = p * d % modulo;
			d = d * d % modulo;
			power >>= _1n$4;
		}
		return p;
	}
	const digits = [];
	while (power > _0n$4) {
		digits.push(Number(power & _15n));
		power >>= _4n$2;
	}
	const table = new Array(16);
	table[0] = _1n$4;
	table[1] = d;
	for (let i = 2; i < 16; i++) table[i] = table[i - 1] * d % modulo;
	let p = table[digits[digits.length - 1]];
	for (let w = digits.length - 2; w >= 0; w--) {
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		p = p * p % modulo;
		const digit = digits[w];
		if (digit !== 0) p = p * table[digit] % modulo;
	}
	return p;
}
/**
* Does `x^(2^power)` mod p. `pow2(30, 4)` == `30^(2^4)`.
* Low-level helper: callers that need canonical residues must pass a valid `x` for the chosen
* modulus; the `power===0` fast path intentionally returns the input unchanged.
* @param x - Base value.
* @param power - Number of squarings.
* @param modulo - Reduction modulus.
* @returns Repeated-squaring result.
* @throws If the exponent is negative. {@link Error}
* @example
* Apply repeated squaring inside one field.
*
* ```ts
* pow2(3n, 2n, 11n);
* ```
*/
function pow2(x, power, modulo) {
	if (modulo <= _1n$4) throw new Error("pow2: expected modulus > 1, got " + modulo);
	if (power < _0n$4) throw new Error("pow2: expected non-negative exponent, got " + power);
	let res = x;
	while (power-- > _0n$4) {
		res *= res;
		res %= modulo;
	}
	return res;
}
/**
* Inverses number over modulo.
* Implemented using the {@link https://brilliant.org/wiki/extended-euclidean-algorithm/ | extended Euclidean algorithm}.
* @param number - Value to invert.
* @param modulo - Modulus greater than 1.
* @returns Multiplicative inverse.
* @throws If the modulus is invalid or the inverse does not exist. {@link Error}
* @example
* Compute one modular inverse with the extended Euclidean algorithm.
*
* ```ts
* invert(3n, 11n);
* ```
*/
function invert(number, modulo) {
	if (number === _0n$4) throw new Error("invert: expected non-zero number");
	if (modulo <= _1n$4) throw new Error("invert: expected modulus > 1, got " + modulo);
	let a = mod(number, modulo);
	let b = modulo;
	let x = _0n$4, u = _1n$4;
	while (a !== _0n$4) {
		const q = b / a;
		const r = b - a * q;
		const m = x - u * q;
		b = a, a = r, x = u, u = m;
	}
	if (b !== _1n$4) throw new Error("invert: does not exist");
	return mod(x, modulo);
}
/**
* Inverses number over modulo using Fermat's little theorem: `a^(p-2) ≡ a⁻¹ (mod p)`.
*
* Unlike {@link invert} (extended Euclidean), the exponent `p-2` is a public constant, so the
* underlying square-and-multiply has the same control flow for every secret `a`: there is no
* data-dependent branching or loop count that could leak `a` through timing (e.g. Minerva-style
* ECDSA nonce-inversion attacks). This is only "algorithmically" constant-time — JS bigint
* multiplication/reduction is still value-dependent — and it is roughly 4x slower than
* {@link invert}.
*
* REQUIRES a prime modulus; Fermat's theorem does not hold otherwise. The result is verified to be
* a real inverse, so a non-prime modulus (or a non-invertible input) fails closed with an error
* instead of returning a wrong value.
* @param a - Value to invert.
* @param prime - Prime modulus.
* @returns Multiplicative inverse in `[1, prime)`.
* @throws If the modulus is below 2, the input reduces to zero, or the inverse does not exist.
*   {@link Error}
* @example
* Compute one modular inverse without secret-dependent branching.
*
* ```ts
* invertCt(3n, 11n); // 4n, since 3 * 4 = 12 ≡ 1 (mod 11)
* ```
*/
function invertCt(a, prime) {
	if (prime <= _1n$4) throw new Error("invertCt: expected prime modulus > 1, got " + prime);
	const an = mod(a, prime);
	if (an === _0n$4) throw new Error("invertCt: expected non-zero number");
	const inverse = pow(an, prime - _2n$3, prime);
	if (mod(an * inverse, prime) !== _1n$4) throw new Error("invertCt: does not exist");
	return inverse;
}
function assertIsSquare(Fp, root, n) {
	const F = Fp;
	if (!F.eql(F.sqr(root), n)) throw new Error("Cannot find square root");
}
function aoddModulus(order, fnName) {
	if ((order & _1n$4) === _0n$4) throw new Error(fnName + ": expected odd modulus, got " + order);
}
function sqrt3mod4(Fp, n) {
	const F = Fp;
	const p1div4 = (F.ORDER + _1n$4) / _4n$2;
	const root = F.pow(n, p1div4);
	assertIsSquare(F, root, n);
	return root;
}
function sqrt5mod8(Fp, n) {
	const F = Fp;
	const p5div8 = (F.ORDER - _5n$1) / _8n$2;
	const n2 = F.mul(n, _2n$3);
	const v = F.pow(n2, p5div8);
	const nv = F.mul(n, v);
	const i = F.mul(F.mul(nv, _2n$3), v);
	const root = F.mul(nv, F.sub(i, F.ONE));
	assertIsSquare(F, root, n);
	return root;
}
function sqrt9mod16(P) {
	const Fp_ = Field(P);
	const tn = tonelliShanks(P);
	const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
	const c2 = tn(Fp_, c1);
	const c3 = tn(Fp_, Fp_.neg(c1));
	const c4 = (P + _7n) / _16n;
	return ((Fp, n) => {
		const F = Fp;
		let tv1 = F.pow(n, c4);
		let tv2 = F.mul(tv1, c1);
		const tv3 = F.mul(tv1, c2);
		const tv4 = F.mul(tv1, c3);
		const e1 = F.eql(F.sqr(tv2), n);
		const e2 = F.eql(F.sqr(tv3), n);
		tv1 = F.cmov(tv1, tv2, e1);
		tv2 = F.cmov(tv4, tv3, e2);
		const e3 = F.eql(F.sqr(tv2), n);
		const root = F.cmov(tv1, tv2, e3);
		assertIsSquare(F, root, n);
		return root;
	});
}
/**
* Tonelli-Shanks square root search algorithm.
* This implementation is variable-time: it searches data-dependently for the first non-residue `Z`
* and for the smallest `i` in the main loop, unlike RFC 9380 Appendix I.4's constant-time shape.
* 1. {@link https://eprint.iacr.org/2012/685.pdf | eprint 2012/685}, page 12
* 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
* @param P - field order
* @returns function that takes field Fp (created from P) and number n
* @throws If the field is too small, non-prime, or the square root does not exist. {@link Error}
* @example
* Construct a square-root helper for primes that need Tonelli-Shanks.
*
* ```ts
* import { Field, tonelliShanks } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = tonelliShanks(17n)(Fp, 4n);
* ```
*/
function tonelliShanks(P) {
	if (P < _3n$1) throw new Error("sqrt is not defined for small field");
	aoddModulus(P, "tonelliShanks");
	let Q = P - _1n$4;
	let S = 0;
	while (Q % _2n$3 === _0n$4) {
		Q /= _2n$3;
		S++;
	}
	let Z = _2n$3;
	const _Fp = Field(P);
	while (FpLegendre(_Fp, Z) === 1) if (Z++ > 1e3) throw new Error("Cannot find square root: probably non-prime P");
	if (S === 1) return sqrt3mod4;
	let cc = _Fp.pow(Z, Q);
	const Q1div2 = (Q + _1n$4) / _2n$3;
	return function tonelliSlow(Fp, n) {
		const F = Fp;
		if (F.is0(n)) return n;
		if (FpLegendre(F, n) !== 1) throw new Error("Cannot find square root");
		let M = S;
		let c = F.mul(F.ONE, cc);
		let t = F.pow(n, Q);
		let R = F.pow(n, Q1div2);
		while (!F.eql(t, F.ONE)) {
			if (F.is0(t)) throw new Error("Cannot find square root: probably non-prime P");
			let i = 1;
			let t_tmp = F.sqr(t);
			while (!F.eql(t_tmp, F.ONE)) {
				i++;
				t_tmp = F.sqr(t_tmp);
				if (i === M) throw new Error("Cannot find square root");
			}
			const exponent = _1n$4 << BigInt(M - i - 1);
			const b = F.pow(c, exponent);
			M = i;
			c = F.sqr(b);
			t = F.mul(t, c);
			R = F.mul(R, b);
		}
		return R;
	};
}
/**
* Square root for a finite field. Will try optimized versions first:
*
* 1. P ≡ 3 (mod 4)
* 2. P ≡ 5 (mod 8)
* 3. P ≡ 9 (mod 16)
* 4. Tonelli-Shanks algorithm
*
* Different algorithms can give different roots, it is up to user to decide which one they want.
* For example there is FpSqrtOdd/FpSqrtEven to choose a root by oddness
* (used for hash-to-curve).
* @param P - Field order.
* @returns Square-root helper. The generic fallback inherits Tonelli-Shanks' variable-time
*   behavior and this selector assumes prime-field-style integer moduli.
* @throws If the field is unsupported or the square root does not exist. {@link Error}
* @example
* Choose the square-root helper appropriate for one field modulus.
*
* ```ts
* import { Field, FpSqrt } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const sqrt = FpSqrt(17n)(Fp, 4n);
* ```
*/
function FpSqrt(P) {
	aoddModulus(P, "Fp.sqrt");
	if (P % _4n$2 === _3n$1) return sqrt3mod4;
	if (P % _8n$2 === _5n$1) return sqrt5mod8;
	if (P % _16n === _9n) return sqrt9mod16(P);
	return tonelliShanks(P);
}
/**
* @param num - Value to inspect.
* @param modulo - Field modulus.
* @returns `true` when the least-significant little-endian bit is set.
* @throws If the modulus is invalid for `mod(...)`. {@link Error}
* @example
* Inspect the low bit used by little-endian sign conventions.
*
* ```ts
* isNegativeLE(3n, 11n);
* ```
*/
const isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n$4) === _1n$4;
const FIELD_FIELDS = [
	"create",
	"isValid",
	"is0",
	"neg",
	"inv",
	"sqrt",
	"sqr",
	"eql",
	"add",
	"sub",
	"mul",
	"pow",
	"div",
	"addN",
	"subN",
	"mulN",
	"sqrN"
];
/**
* @param field - Field implementation.
* @returns Validated field. This only checks the arithmetic subset needed by generic helpers; it
*   does not guarantee full runtime-method coverage for serialization, batching, `cmov`, or
*   field-specific extras beyond positive `BYTES` / `BITS`.
* @throws If the field shape or numeric metadata are invalid. {@link Error}
* @example
* Check that a field implementation exposes the operations curve code expects.
*
* ```ts
* import { Field, validateField } from '@noble/curves/abstract/modular.js';
* const Fp = validateField(Field(17n));
* ```
*/
function validateField(field) {
	aobject(field, "field");
	if (typeof field.ORDER !== "bigint") throw new TypeError("param \"ORDER\" is invalid: expected bigint, got " + typeof field.ORDER);
	asafenumber(field.BYTES, "BYTES");
	asafenumber(field.BITS, "BITS");
	for (const name of FIELD_FIELDS) afunction(field[name], "field." + name);
	if (field.BYTES < 1 || field.BITS < 1) throw new Error("invalid field: expected BYTES/BITS > 0");
	if (field.ORDER <= _1n$4) throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
	return field;
}
function FpInvertBatch(Fp, nums, passZero = false) {
	validateField(Fp);
	aarray(nums, "nums");
	abool(passZero, "passZero");
	const F = Fp;
	const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
	const multipliedAcc = nums.reduce((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = acc;
		return F.mul(acc, num);
	}, F.ONE);
	const invertedAcc = F.inv(multipliedAcc);
	nums.reduceRight((acc, num, i) => {
		if (F.is0(num)) return acc;
		inverted[i] = F.mul(acc, inverted[i]);
		return F.mul(acc, num);
	}, invertedAcc);
	return inverted;
}
/**
* Legendre symbol.
* Legendre constant is used to calculate Legendre symbol (a | p)
* which denotes the value of a^((p-1)/2) (mod p).
*
* * (a | p) ≡ 1    if a is a square (mod p), quadratic residue
* * (a | p) ≡ -1   if a is not a square (mod p), quadratic non residue
* * (a | p) ≡ 0    if a ≡ 0 (mod p)
* @param Fp - Field implementation.
* @param n - Value to inspect.
* @returns Legendre symbol.
* @throws If the powered value does not match a valid Legendre symbol. {@link Error}
* @example
* Compute the Legendre symbol of one field element.
*
* ```ts
* import { Field, FpLegendre } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const symbol = FpLegendre(Fp, 4n);
* ```
*/
function FpLegendre(Fp, n) {
	validateField(Fp);
	const F = Fp;
	aoddModulus(F.ORDER, "FpLegendre");
	const p1mod2 = (F.ORDER - _1n$4) / _2n$3;
	const powered = F.pow(n, p1mod2);
	const yes = F.eql(powered, F.ONE);
	const zero = F.eql(powered, F.ZERO);
	const no = F.eql(powered, F.neg(F.ONE));
	if (!yes && !zero && !no) throw new Error("invalid Legendre symbol result");
	return yes ? 1 : zero ? 0 : -1;
}
/**
* @param n - Curve order. Callers are expected to pass a positive order.
* @param nBitLength - Optional cached bit length. Callers are expected to pass a positive cached
*   value when overriding the derived bit length.
* @returns Byte and bit lengths.
* @throws If the order or cached bit length is invalid. {@link Error}
* @example
* Measure the encoding sizes needed for one modulus.
*
* ```ts
* nLength(255n);
* ```
*/
function nLength(n, nBitLength) {
	if (nBitLength !== void 0) anumber(nBitLength);
	if (n <= _0n$4) throw new Error("invalid n length: expected positive n, got " + n);
	if (nBitLength !== void 0 && nBitLength < 1) throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
	const bits = bitLen(n);
	if (nBitLength !== void 0 && nBitLength < bits) throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
	const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
	return {
		nBitLength: _nBitLength,
		nByteLength: Math.ceil(_nBitLength / 8)
	};
}
const FIELD_SQRT = /* @__PURE__ */ new WeakMap();
var _Field = class {
	ORDER;
	BITS;
	BYTES;
	isLE;
	ZERO = _0n$4;
	ONE = _1n$4;
	_lengths;
	_mod;
	constructor(ORDER, opts = {}) {
		if (ORDER <= _1n$4) throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
		let _nbitLength = void 0;
		this.isLE = false;
		if (opts != null && typeof opts === "object") {
			if (typeof opts.BITS === "number") _nbitLength = opts.BITS;
			if (typeof opts.sqrt === "function") Object.defineProperty(this, "sqrt", {
				value: opts.sqrt,
				enumerable: true
			});
			if (typeof opts.isLE === "boolean") this.isLE = opts.isLE;
			if (opts.allowedLengths) this._lengths = Object.freeze(opts.allowedLengths.slice());
			if (typeof opts.modFromBytes === "boolean") this._mod = opts.modFromBytes;
		}
		const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
		if (nByteLength > 2048) throw new Error("invalid field: expected ORDER of <= 2048 bytes");
		this.ORDER = ORDER;
		this.BITS = nBitLength;
		this.BYTES = nByteLength;
		Object.freeze(this);
	}
	create(num) {
		return mod(num, this.ORDER);
	}
	isValid(num) {
		if (typeof num !== "bigint") throw new TypeError("invalid field element: expected bigint, got " + typeof num);
		return _0n$4 <= num && num < this.ORDER;
	}
	is0(num) {
		return num === _0n$4;
	}
	isValidNot0(num) {
		return !this.is0(num) && this.isValid(num);
	}
	isOdd(num) {
		return (num & _1n$4) === _1n$4;
	}
	neg(num) {
		return mod(-num, this.ORDER);
	}
	eql(lhs, rhs) {
		return lhs === rhs;
	}
	sqr(num) {
		return mod(num * num, this.ORDER);
	}
	add(lhs, rhs) {
		return mod(lhs + rhs, this.ORDER);
	}
	sub(lhs, rhs) {
		return mod(lhs - rhs, this.ORDER);
	}
	mul(lhs, rhs) {
		return mod(lhs * rhs, this.ORDER);
	}
	pow(num, power) {
		return pow(num, power, this.ORDER);
	}
	div(lhs, rhs) {
		return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
	}
	sqrN(num) {
		return num * num;
	}
	addN(lhs, rhs) {
		return lhs + rhs;
	}
	subN(lhs, rhs) {
		return lhs - rhs;
	}
	mulN(lhs, rhs) {
		return lhs * rhs;
	}
	inv(num) {
		return invert(num, this.ORDER);
	}
	sqrt(num) {
		let sqrt = FIELD_SQRT.get(this);
		if (!sqrt) FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
		return sqrt(this, num);
	}
	toBytes(num) {
		return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
	}
	fromBytes(bytes, skipValidation = false) {
		abytes(bytes);
		const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
		if (allowedLengths) {
			if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
			const padded = new Uint8Array(BYTES);
			padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
			bytes = padded;
		}
		if (bytes.length !== BYTES) throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
		let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
		if (modFromBytes) scalar = mod(scalar, ORDER);
		if (!skipValidation) {
			if (!this.isValid(scalar)) throw new Error("invalid field element: outside of range 0..ORDER");
		}
		return scalar;
	}
	invertBatch(lst) {
		return FpInvertBatch(this, lst, true);
	}
	cmov(a, b, condition) {
		abool(condition, "condition");
		return condition ? b : a;
	}
};
/**
* Creates a finite field. Major performance optimizations:
* * 1. Denormalized operations like mulN instead of mul.
* * 2. Identical object shape: never add or remove keys.
* * 3. Frozen stable object shape; the lazy sqrt cache lives in a module-level `WeakMap`.
* Fragile: always run a benchmark on a change.
* Security note: operations and low-level serializers like `toBytes` don't check `isValid` for
* all elements for performance and protocol-flexibility reasons; callers are responsible for
* supplying valid elements when they need canonical field behavior.
* This is low-level code, please make sure you know what you're doing.
*
* Note about field properties:
* * CHARACTERISTIC p = prime number, number of elements in main subgroup.
* * ORDER q = similar to cofactor in curves, may be composite `q = p^m`.
*
* @param ORDER - field order, probably prime, or could be composite
* @param opts - Field options such as bit length or endianness. See {@link FieldOpts}.
* @returns Frozen field instance with a stable object shape. This wrapper forwards `opts` straight
*   into `_Field`, so it inherits `_Field`'s assumptions about cached sizes and `allowedLengths`.
* @example
* Construct one prime field with optional overrides.
*
* ```ts
* Field(11n);
* ```
*/
function Field(ORDER, opts = {}) {
	Object.freeze(_Field.prototype);
	return new _Field(ORDER, opts);
}
/**
* @param Fp - Field implementation.
* @param elm - Value to square-root.
* @returns Even square root.
* @throws If the field lacks oddness checks or the square root does not exist. {@link Error}
* @example
* Select the even square root when two roots exist.
*
* ```ts
* import { Field, FpSqrtEven } from '@noble/curves/abstract/modular.js';
* const Fp = Field(17n);
* const root = FpSqrtEven(Fp, 4n);
* ```
*/
function FpSqrtEven(Fp, elm) {
	validateField(Fp);
	const F = Fp;
	if (!F.isOdd) throw new Error("Field doesn't have isOdd");
	const root = F.sqrt(elm);
	return F.isOdd(root) ? F.neg(root) : root;
}
/**
* Returns total number of bytes consumed by the field element.
* For example, 32 bytes for usual 256-bit weierstrass curve.
* @param fieldOrder - number of field elements, usually CURVE.n. Callers are expected to pass an
*   order greater than 1.
* @returns byte length of field
* @throws If the field order is not a bigint. {@link Error}
* @example
* Read the fixed-width byte length of one field.
*
* ```ts
* getFieldBytesLength(255n);
* ```
*/
function getFieldBytesLength(fieldOrder) {
	if (typeof fieldOrder !== "bigint") throw new Error("field order must be bigint");
	if (fieldOrder <= _1n$4) throw new Error("field order must be greater than 1");
	const bitLength = bitLen(fieldOrder - _1n$4);
	return Math.ceil(bitLength / 8);
}
/**
* Returns minimal amount of bytes that can be safely reduced
* by field order.
* Should be 2^-128 for 128-bit curve such as P256.
* This is the reduction / modulo-bias lower bound; higher-level helpers may still impose a larger
* absolute floor for policy reasons.
* @param fieldOrder - number of field elements greater than 1, usually CURVE.n.
* @returns byte length of target hash
* @throws If the field order is invalid. {@link Error}
* @example
* Compute the minimum hash length needed for field reduction.
*
* ```ts
* getMinHashLength(255n);
* ```
*/
function getMinHashLength(fieldOrder) {
	const length = getFieldBytesLength(fieldOrder);
	return length + Math.ceil(length / 2);
}
/**
* "Constant-time" private key generation utility.
* Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
* and convert them into private scalar, with the modulo bias being negligible.
* Needs at least 48 bytes of input for 32-byte private key. The implementation also keeps a hard
* 16-byte minimum even when `getMinHashLength(...)` is smaller, so toy-small inputs do not look
* accidentally acceptable for real scalar derivation.
* See {@link https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/ | Kudelski's modulo-bias guide},
* {@link https://csrc.nist.gov/publications/detail/fips/186/5/final | FIPS 186-5 appendix A.2}, and
* {@link https://www.rfc-editor.org/rfc/rfc9380#section-5 | RFC 9380 section 5}. Unlike RFC 9380
* `hash_to_field`, this helper intentionally maps into the non-zero private-scalar range `1..n-1`.
* @param key - Uniform input bytes.
* @param fieldOrder - Size of subgroup.
* @param isLE - interpret hash bytes as LE num
* @returns valid private scalar
* @throws If the hash length or field order is invalid for scalar reduction. {@link Error}
* @example
* Map hash output into a private scalar range.
*
* ```ts
* mapHashToField(new Uint8Array(48).fill(1), 255n);
* ```
*/
function mapHashToField(key, fieldOrder, isLE = false) {
	abytes(key);
	const len = key.length;
	const fieldLen = getFieldBytesLength(fieldOrder);
	const minLen = Math.max(getMinHashLength(fieldOrder), 16);
	if (len < minLen || len > 1024) throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
	const reduced = mod(isLE ? bytesToNumberLE(key) : bytesToNumberBE(key), fieldOrder - _1n$4) + _1n$4;
	return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}
//#endregion
//#region node_modules/@noble/curves/abstract/curve.js
/**
* Methods for elliptic curve multiplication by scalars.
* Contains wNAF-based ScalarMultiplier, pippenger.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$3 = /* @__PURE__ */ BigInt(0);
const _1n$3 = /* @__PURE__ */ BigInt(1);
const _4n$1 = /* @__PURE__ */ BigInt(4);
const BLIND_BYTES = 16;
const BLIND_BITS = 128;
const FW_WINDOW = 5;
const TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
/**
* Validates the static surface of a point constructor.
* This is only a cheap sanity check for the constructor hooks and fields consumed by generic
* factories; it does not certify `BASE`/`ZERO` semantics or prove the curve implementation itself.
* @param Point - Runtime point constructor.
* @throws On missing constructor hooks or malformed field metadata. {@link TypeError}
* @example
* Check that one point constructor exposes the static hooks generic helpers need.
*
* ```ts
* import { ed25519 } from '@noble/curves/ed25519.js';
* import { validatePointCons } from '@noble/curves/abstract/curve.js';
* validatePointCons(ed25519.Point);
* ```
*/
function validatePointCons(Point) {
	const pc = Point;
	if (typeof pc !== "function") throw new TypeError("\"Point\" expected constructor, got type=" + typeof Point);
	afunction(pc.fromAffine, "Point.fromAffine");
	afunction(pc.fromBytes, "Point.fromBytes");
	afunction(pc.fromHex, "Point.fromHex");
	aobject(pc.BASE, "Point.BASE");
	aobject(pc.ZERO, "Point.ZERO");
	validateField(pc.Fp);
	validateField(pc.Fn);
}
/**
* Takes a bunch of Projective Points but executes only one
* inversion on all of them. Inversion is very slow operation,
* so this improves performance massively.
* Optimization: converts a list of projective points to a list of identical points with Z=1.
* Input points are left unchanged; the normalized points are returned as fresh instances.
* @param c - Point constructor.
* @param points - Projective points.
* @returns Fresh projective points reconstructed from normalized affine coordinates.
* @example
* Batch-normalize projective points with a single shared inversion.
*
* ```ts
* import { normalizeZ } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const points = normalizeZ(p256.Point, [p256.Point.BASE, p256.Point.BASE.double()]);
* ```
*/
function normalizeZ(c, points) {
	validatePointCons(c);
	validateMSMPoints(points, c);
	const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
	return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits, min = 1) {
	if (!Number.isSafeInteger(W) || W < min || W > bits) throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
}
function validateTableBytes(numPoints, fpBytes) {
	const bytes = numPoints * (4 * fpBytes + 128);
	if (bytes > TABLE_BYTES_MAX) throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
}
/**
* Probes an RNG once, at construction time: returns `undefined` when it is unavailable —
* throws or returns malformed bytes — so callers can downgrade to their unblinded /
* deterministic constant-time fallback. Blinding is defense-in-depth (DPA/template
* hardening), not a correctness or key-secrecy requirement, so availability-based
* downgrade is acceptable.
*
* The downgrade decision is deliberately static. After a successful probe the RNG becomes
* part of the trusted contract: later misbehavior must fail closed in per-call validation
* (throw), never downgrade — a dynamic fallback would let a tampered RNG silently strip
* blinding on demand. A probe can only ever classify broken environments, not adversarial
* RNGs: a stateful RNG can always behave while probed and misbehave later.
* @param randomBytes - RNG to probe, or `undefined` when the environment provides none.
* @param length - Byte length requested from the probe call.
* @returns The RNG when the probe produced `length` valid bytes; `undefined` otherwise.
* @example
* Probe an RNG once before enabling scalar blinding.
*
* ```ts
* import { probeRandomBytes } from '@noble/curves/abstract/curve.js';
* import { randomBytes } from '@noble/hashes/utils.js';
* const rng = probeRandomBytes(randomBytes, 16);
* ```
*/
function probeRandomBytes(randomBytes, length) {
	if (randomBytes === void 0) return void 0;
	afunction(randomBytes, "randomBytes");
	try {
		const probe = randomBytes(length);
		if (!isBytes(probe) || probe.length !== length) return void 0;
	} catch {
		return;
	}
	return randomBytes;
}
function validateMSMPoints(points, c) {
	aarray(points, "points");
	points.forEach((p, i) => {
		if (!(p instanceof c)) throw new Error("invalid point at index " + i);
	});
}
function validateMSMScalars(scalars, field, maxScalar) {
	if (!Array.isArray(scalars)) throw new Error("array of scalars expected");
	scalars.forEach((s, i) => {
		if (!(maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar)) throw new Error("invalid scalar at index " + i);
	});
}
const pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getWindowSize(P) {
	return pointWindowSizes.get(P) || 1;
}
/** Table of odd multiples [1P, 3P, ..., (2⋅size−1)P]; width-W wNAF uses size = 2^(W−2). */
function oddMultiples(p, size) {
	const dbl = p.double();
	const t = [p];
	for (let j = 1; j < size; j++) t.push(t[j - 1].add(dbl));
	return t;
}
/**
* Width-W wNAF signed-digit recoding (W >= 2), LSB-first: digits are 0 or odd with
* |digit| < 2^(W−1); nonzero density ~1/(W+1) (a nonzero digit is followed by W−1 zeros).
*/
function wnafDigits(n, W) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const d = [];
	while (n > _0n$3) {
		let w = 0;
		if (n & _1n$3) {
			w = Number(n & mask);
			if (w >= half) w -= size;
			n -= BigInt(w);
		}
		d.push(w);
		n >>= _1n$3;
	}
	return d;
}
/**
* Fixed-position signed-window recoding for precomputed wNAF: `n = Σ digits[w]⋅2^(w⋅W)` with
* digits in `[−2^(W−1)+1, 2^(W−1)]`. Digit count is fixed by `windows` (callers reserve one
* extra window for the final carry), so recoding length does not depend on the scalar.
*/
function signedWindowDigits(n, W, windows) {
	const size = 2 ** W;
	const half = size / 2;
	const mask = BigInt(size - 1);
	const shiftBy = BigInt(W);
	const d = [];
	for (let w = 0; w < windows; w++) {
		let v = Number(n & mask);
		n >>= shiftBy;
		if (v > half) {
			v -= size;
			n += _1n$3;
		}
		d.push(v);
	}
	if (n !== _0n$3) throw new Error("invalid wnaf");
	return d;
}
/**
* Shared vartime walk over per-scalar wNAF digit streams: one doubling of a single shared
* accumulator per bit position of the longest recoding, one signed table addition per
* nonzero digit. `tables[i]` must hold the odd multiples of the i-th point.
*/
function wnafWalk(zero, tables, digits) {
	let max = 0;
	for (const d of digits) max = Math.max(max, d.length);
	let acc = zero;
	for (let bit = max - 1; bit >= 0; bit--) {
		if (bit !== max - 1) acc = acc.double();
		for (let i = 0; i < digits.length; i++) {
			const w = digits[i][bit];
			if (w) {
				const item = tables[i][Math.abs(w) - 1 >> 1];
				acc = acc.add(w < 0 ? item.negate() : item);
			}
		}
	}
	return acc;
}
/**
* Elliptic curve multiplication of Point by scalar.
* Routes between cached-table, fixed-window, and one-shot wNAF paths; entry points validate
* their own scalars (`mulCT`/`mulCTBlinded`: `1 <= s < Fn.ORDER`; `mulUnsafe`: up to the
* `Fn.ORDER^4` DoS cap via {@link mulAddUnsafe}).
* Table generation is expensive and happens on first call of `multiply()`
* (or eagerly via `precompute(W, false)`). By default, `BASE` point is precomputed.
*
* Cached algorithm is signed fixed-window wNAF:
* - table stores, for every window w, the multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P` — all doublings
*   are baked in, so a multiplication is exactly one table addition per window
* - window count is fixed (`ceil(bits/W) + 1`), so the point-operation count is scalar-independent
*   (basis of the constant-time path)
* - for a 256-bit curve and W=6: 44⋅32 = 1408 table points, 44 additions per multiply
* - secret scalars are additionally blinded (see {@link ScalarMultiplier.mulCTBlinded}), which
*   widens tables by 128 bits
* @param Point - Point constructor.
* @param randomBytes - RNG used for scalar blinding; required by the blinded secret path.
* @example
* Elliptic curve multiplication of Point by scalar.
*
* ```ts
* import { ScalarMultiplier } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const mul = new ScalarMultiplier(p256.Point);
* ```
*/
var ScalarMultiplier = class {
	Point;
	BASE;
	ZERO;
	randomBytes;
	wnafPrecomputes = /* @__PURE__ */ new WeakMap();
	baseCanBeBlinded;
	bits;
	constructor(Point, randomBytes) {
		validatePointCons(Point);
		this.randomBytes = probeRandomBytes(randomBytes, BLIND_BYTES);
		this.Point = Point;
		this.BASE = Point.BASE;
		this.ZERO = Point.ZERO;
		this.bits = Point.Fn.BITS;
	}
	/**
	* Creates a signed fixed-window wNAF precomputation table: for every window w, the
	* multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
	* so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
	* window absorbs the final carry of signed-digit recoding.
	* For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
	* @param point - Point instance
	* @param W - window size
	* @param bits - scalar bitlength the table must cover
	*/
	buildWnafTable(point, W, bits) {
		const windows = Math.ceil(bits / W) + 1;
		const half = 2 ** (W - 1);
		const comp = [];
		let base = point;
		for (let w = 0; w < windows; w++) {
			let acc = base;
			for (let i = 0; i < half; i++) {
				comp.push(acc);
				acc = acc.add(base);
			}
			base = comp[comp.length - 1].double();
		}
		return {
			W,
			bits,
			windows,
			comp
		};
	}
	/**
	* Implements ec multiplication using precomputed signed fixed-window wNAF tables.
	* Constant-time: fixed window count with one table addition per window — zero digits feed
	* the fake accumulator — and no doublings; the lookup scans the whole window slice.
	* Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
	* {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
	* signedWindowDigits throws if `n` exceeds the table.
	* @returns real and fake (for const-time) points
	*/
	wnafCachedCT(precomputes, n) {
		const { W, windows, comp } = precomputes;
		const half = 2 ** (W - 1);
		const digits = signedWindowDigits(n, W, windows);
		let p = this.ZERO;
		let f = this.BASE;
		for (let w = 0; w < windows; w++) {
			const digit = digits[w];
			const start = w * half;
			const idx = Math.abs(digit) - 1;
			let sel = comp[start];
			for (let i = 1; i < half; i++) sel = i === idx ? comp[start + i] : sel;
			const neg = sel.negate();
			if (digit === 0) f = f.add(comp[start]);
			else p = p.add(digit < 0 ? neg : sel);
		}
		return {
			p,
			f
		};
	}
	getWnafPrecomputes(W, point, bits, transform) {
		let entries = this.wnafPrecomputes.get(point);
		let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
		if (!comp) {
			comp = this.buildWnafTable(point, W, bits);
			if (typeof transform === "function") comp = {
				...comp,
				comp: transform(comp.comp)
			};
			if (!entries) {
				entries = [];
				this.wnafPrecomputes.set(point, entries);
			}
			entries.push(comp);
		}
		return comp;
	}
	assertPoint(point) {
		if (!(point instanceof this.Point)) throw new TypeError("\"point\" expected Point instance, got type=" + typeof point);
	}
	validateMulInput(point, scalar) {
		this.assertPoint(point);
		if (!inRange(scalar, _1n$3, this.Point.Fn.ORDER)) throw new Error("invalid scalar");
	}
	runCT(point, n, bits, transform) {
		const W = getWindowSize(point);
		if (W === 1) return this.fixedWindowCT(point, n, bits);
		return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
	}
	mulCT(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		return this.runCT(point, scalar, this.bits, transform);
	}
	mulCTBlinded(point, scalar, transform) {
		this.validateMulInput(point, scalar);
		if (this.randomBytes === void 0) throw new Error("randomBytes is required for scalar blinding");
		const bits = this.Point.Fn.BITS + BLIND_BITS;
		const blind = this.randomBytes(BLIND_BYTES);
		if (!isBytes(blind) || blind.length !== BLIND_BYTES) throw new Error("randomBytes returned invalid byte array");
		blind[0] = blind[0] & 63 | 128;
		const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
		return this.runCT(point, n, bits, transform);
	}
	/**
	* Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
	* A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
	* far cheaper to build for a single use. The point-operation sequence is independent of `n`:
	* build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
	* every table entry, and one addition (adds the identity when the window digit is 0 — never
	* skipped).
	*
	* `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
	* add), which holds for the Weierstrass/Edwards point types used here. The table is left in
	* projective form (no normalizeZ): normalizing this small a table costs more than the
	* mixed-add savings it would buy for a single multiply.
	* @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
	* (this path needs no fake accumulator — its op-count is already scalar-independent).
	*/
	fixedWindowCT(point, n, bits) {
		const W = FW_WINDOW;
		const size = 1 << W;
		const mask = bitMask(W);
		const table = new Array(size);
		table[0] = this.ZERO;
		for (let i = 1; i < size; i++) table[i] = table[i - 1].add(point);
		const windows = Math.ceil(bits / W);
		let acc = this.ZERO;
		for (let window = windows - 1; window >= 0; window--) {
			if (window !== windows - 1) for (let d = 0; d < W; d++) acc = acc.double();
			const digit = Number(n >> BigInt(window * W) & mask);
			let sel = table[0];
			for (let i = 1; i < size; i++) sel = i === digit ? table[i] : sel;
			acc = acc.add(sel);
		}
		return {
			p: acc,
			f: acc
		};
	}
	shouldBlind(point, cofactor) {
		if (this.randomBytes === void 0) return false;
		if (cofactor === _1n$3) return true;
		if (point !== this.BASE) return false;
		if (this.baseCanBeBlinded === void 0) this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
		return this.baseCanBeBlinded;
	}
	mulSecret(point, scalar, cofactor, transform) {
		return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
	}
	mulUnsafe(point, scalar, transform) {
		this.assertPoint(point);
		if (!isPosBig(scalar)) throw new Error("invalid scalar");
		const W = getWindowSize(point);
		if (W === 1 || scalar >= this.Point.Fn.ORDER) return mulAddUnsafe(this.Point, [point], [scalar], true);
		const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
		return this.wnafCachedCT(precomputes, scalar).p;
	}
	setWindowSize(point, W) {
		this.assertPoint(point);
		validateW(W, this.bits);
		validateTableBytes((Math.ceil((this.bits + BLIND_BITS) / W) + 1) * 2 ** (W - 1), this.Point.Fp.BYTES);
		pointWindowSizes.set(point, W);
		this.wnafPrecomputes.delete(point);
	}
	hasWindowSize(point) {
		return getWindowSize(point) !== 1;
	}
};
/**
* Combined multi-scalar multiplication `Σ scalars[i]⋅points[i]` via interleaved width-4 wNAF
* (Strauss–Shamir). Every input gets its own table of odd multiples `[1P, 3P, 5P, 7P]` and
* signed-digit recoding, but all walks share one doubling chain, so total cost is
* `~bits` doublings + `L⋅bits/5` additions instead of `L⋅bits` doublings for separate
* multiplications. Intended for the 2-4 point shapes of signature verification
* (`R = u1⋅G + u2⋅P`); use {@link pippenger} for larger batches.
*
* Not constant-time: only for public inputs. Scalars must satisfy `0 <= s < Fn.ORDER`;
* fold negative signs into the points before calling.
* @param c - Point constructor.
* @param points - Array of curve points.
* @param scalars - Array of non-negative scalars, same length as points.
* @param allowOversized - Replace the `s < Fn.ORDER` scalar check with a `Fn.ORDER^4` DoS cap.
*   Off by default. For scalars that must NOT be reduced mod ORDER: torsion checks
*   (`Fn.ORDER⋅P ≟ O`) and cofactor-clearing multiples. Walk length grows with `bitLen(s)`.
* @returns Combined multiplication result; identity for empty input.
* @throws If the point set or scalar set is invalid. {@link Error}
* @example
* Combined multi-scalar multiplication via Strauss–Shamir.
*
* ```ts
* import { mulAddUnsafe } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const G = p256.Point.BASE;
* const R = mulAddUnsafe(p256.Point, [G, G.double()], [2n, 3n]); // 2⋅G + 3⋅(2⋅G)
* ```
*/
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
	validatePointCons(c);
	validateMSMPoints(points, c);
	abool(allowOversized, "allowOversized");
	validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n$1 : void 0);
	if (points.length !== scalars.length) throw new Error("arrays of points and scalars must have equal length");
	const tables = points.map((p) => oddMultiples(p, 4));
	const digits = scalars.map((n) => wnafDigits(n, 4));
	return wnafWalk(c.ZERO, tables, digits);
}
function createField(order, field, isLE) {
	if (field) {
		if (field.ORDER !== order) throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
		validateField(field);
		return field;
	} else return Field(order, { isLE });
}
/**
* Validates basic CURVE shape and field membership, then creates fields.
* This does not prove that the generator is on-curve, that subgroup/order data are consistent, or
* that the curve equation itself is otherwise sane.
* @param type - Curve family.
* @param CURVE - Curve parameters.
* @param curveOpts - Optional field overrides. See {@link FpFn}:
*   - `Fp` (optional): Optional base-field override.
*   - `Fn` (optional): Optional scalar-field override.
* @param FpFnLE - Whether field encoding is little-endian.
* @returns Frozen curve parameters and fields.
* @throws If the curve parameters or field overrides are invalid. {@link Error}
* @example
* Build curve fields from raw constants before constructing a curve instance.
*
* ```ts
* const curve = createCurveFields('weierstrass', {
*   p: 17n,
*   n: 19n,
*   h: 1n,
*   a: 2n,
*   b: 2n,
*   Gx: 5n,
*   Gy: 1n,
* });
* ```
*/
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
	if (type !== "weierstrass" && type !== "edwards") throw new Error("expected curve type \"weierstrass\" or \"edwards\"");
	if (FpFnLE === void 0) FpFnLE = type === "edwards";
	if (!CURVE || typeof CURVE !== "object") throw new Error(`expected valid ${type} CURVE object`);
	validateObject(curveOpts);
	for (const p of [
		"p",
		"n",
		"h"
	]) {
		const val = CURVE[p];
		if (!(isPosBig(val) && val !== _0n$3)) throw new Error(`CURVE.${p} must be positive bigint`);
	}
	const Fp = createField(CURVE.p, curveOpts.Fp, FpFnLE);
	const Fn = createField(CURVE.n, curveOpts.Fn, FpFnLE);
	const params = [
		"Gx",
		"Gy",
		"a",
		type === "weierstrass" ? "b" : "d"
	];
	for (const p of params) if (!Fp.isValid(CURVE[p])) throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
	CURVE = Object.freeze(Object.assign({}, CURVE));
	return {
		CURVE,
		Fp,
		Fn
	};
}
/**
* @param randomSecretKey - Secret-key generator.
* @param getPublicKey - Public-key derivation helper.
* @returns Keypair generator.
* @example
* Build a `keygen()` helper from existing secret-key and public-key primitives.
*
* ```ts
* import { createKeygen } from '@noble/curves/abstract/curve.js';
* import { p256 } from '@noble/curves/nist.js';
* const keygen = createKeygen(p256.utils.randomSecretKey, p256.getPublicKey);
* const pair = keygen();
* ```
*/
function createKeygen(randomSecretKey, getPublicKey) {
	return function keygen(seed) {
		const secretKey = randomSecretKey(seed);
		return {
			secretKey,
			publicKey: getPublicKey(secretKey)
		};
	};
}
//#endregion
//#region node_modules/@noble/curves/abstract/edwards.js
/**
* Twisted Edwards curve. The formula is: ax² + y² = 1 + dx²y².
* For design rationale of types / exports, see weierstrass module documentation.
* Untwisted Edwards curves exist, but they aren't used in real-world protocols.
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$2 = /* @__PURE__ */ BigInt(0), _1n$2 = /* @__PURE__ */ BigInt(1), _2n$2 = /* @__PURE__ */ BigInt(2), _4n = /* @__PURE__ */ BigInt(4), _8n$1 = /* @__PURE__ */ BigInt(8);
function isEdValidXY(Fp, CURVE, x, y) {
	const x2 = Fp.sqr(x);
	const y2 = Fp.sqr(y);
	const left = Fp.add(Fp.mul(CURVE.a, x2), y2);
	const right = Fp.add(Fp.ONE, Fp.mul(CURVE.d, Fp.mul(x2, y2)));
	return Fp.eql(left, right);
}
/**
* @param params - Curve parameters. See {@link EdwardsOpts}.
* @param extraOpts - Optional helpers and overrides. See {@link EdwardsExtraOpts}.
* @returns Edwards point constructor. Generator validation here only checks
*   that `(Gx, Gy)` satisfies the affine Edwards equation.
*   RFC 8032 base-point constraints like `B != (0,1)` and `[L]B = 0`
*   are left to the caller's chosen parameters, since eager subgroup
*   validation here adds about 10-15ms to heavyweight imports like ed448.
*   The returned constructor also eagerly marks `Point.BASE` for W=6
*   precompute caching. Some code paths still assume
*   `Fp.BYTES === Fn.BYTES`, so mismatched byte lengths are not fully audited here.
* @throws If the curve parameters or Edwards overrides are invalid. {@link Error}
* @example
* ```ts
* import { edwards } from '@noble/curves/abstract/edwards.js';
* import { jubjub } from '@noble/curves/misc.js';
* // Build a point constructor from explicit curve parameters, then use its base point.
* const Point = edwards(jubjub.Point.CURVE());
* Point.BASE.toHex();
* ```
*/
function edwards(params, extraOpts = {}) {
	validateObject(extraOpts, {}, {}, "extraOpts");
	const opts = extraOpts;
	const validated = createCurveFields("edwards", params, opts, opts.FpFnLE);
	const { Fp, Fn } = validated;
	let CURVE = validated.CURVE;
	const { h: cofactor } = CURVE;
	if (FpLegendre(Fp, CURVE.a) !== 1) throw new Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
	if (FpLegendre(Fp, CURVE.d) !== -1) throw new Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
	validateObject(opts, {}, {
		uvRatio: "function",
		randomBytes: "function"
	});
	const randomBytes$2 = opts.randomBytes === void 0 ? randomBytes : opts.randomBytes;
	const MASK = _2n$2 << BigInt(Fp.BYTES * 8) - _1n$2;
	function isOdd(n) {
		if (!Fp.isOdd) throw new Error("Field does not have .isOdd()");
		return Fp.isOdd(n);
	}
	const uvRatio = opts.uvRatio === void 0 ? (u, v) => {
		try {
			return {
				isValid: true,
				value: Fp.sqrt(Fp.div(u, v))
			};
		} catch (e) {
			return {
				isValid: false,
				value: _0n$2
			};
		}
	} : opts.uvRatio;
	if (!isEdValidXY(Fp, CURVE, CURVE.Gx, CURVE.Gy)) throw new Error("bad curve params: generator point");
	const mulA = Fp.eql(CURVE.a, Fp.neg(Fp.ONE)) ? (x) => Fp.neg(x) : Fp.eql(CURVE.a, Fp.ONE) ? (x) => x : (x) => Fp.mul(CURVE.a, x);
	/**
	* Asserts coordinate is valid: 0 <= n < MASK.
	* Coordinates >= Fp.ORDER are allowed for zip215.
	*/
	function acoord(title, n, banZero = false) {
		const min = banZero ? _1n$2 : _0n$2;
		aInRange("coordinate " + title, n, min, MASK);
		return n;
	}
	function aedpoint(other) {
		if (!(other instanceof Point)) throw new Error("EdwardsPoint expected");
	}
	class Point {
		static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE, Fp.mul(CURVE.Gx, CURVE.Gy));
		static ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ONE, Fp.ZERO);
		static Fp = Fp;
		static Fn = Fn;
		X;
		Y;
		Z;
		T;
		constructor(X, Y, Z, T) {
			this.X = acoord("x", X);
			this.Y = acoord("y", Y);
			this.Z = acoord("z", Z, true);
			this.T = acoord("t", T);
			Object.freeze(this);
		}
		static CURVE() {
			return CURVE;
		}
		/**
		* Create one extended Edwards point from affine coordinates.
		* Does NOT validate that the point is on-curve or torsion-free.
		* Use `.assertValidity()` on adversarial inputs.
		*/
		static fromAffine(p) {
			if (p instanceof Point) throw new Error("extended point not allowed");
			const { x, y } = p || {};
			acoord("x", x);
			acoord("y", y);
			return new Point(x, y, Fp.ONE, Fp.mul(x, y));
		}
		static fromBytes(bytes, zip215 = false) {
			const len = Fp.BYTES;
			const { a, d } = CURVE;
			bytes = copyBytes(abytes(bytes, len, "point"));
			abool(zip215, "zip215");
			const normed = copyBytes(bytes);
			const lastByte = bytes[len - 1];
			normed[len - 1] = lastByte & -129;
			const y = bytesToNumberLE(normed);
			aInRange("point.y", y, _0n$2, zip215 ? MASK : Fp.ORDER);
			const y2 = Fp.sqr(y);
			let { isValid, value: x } = uvRatio(Fp.sub(y2, Fp.ONE), Fp.sub(Fp.mulN(d, y2), a));
			if (!isValid) throw new Error("bad point: invalid y coordinate");
			const isXOdd = isOdd(x);
			const isLastByteOdd = (lastByte & 128) !== 0;
			if (!zip215 && Fp.is0(x) && isLastByteOdd) throw new Error("bad point: x=0 and x_0=1");
			if (isLastByteOdd !== isXOdd) x = Fp.neg(x);
			return Point.fromAffine({
				x,
				y
			});
		}
		static fromHex(hex, zip215 = false) {
			return Point.fromBytes(hexToBytes(hex), zip215);
		}
		get x() {
			return this.toAffine().x;
		}
		get y() {
			return this.toAffine().y;
		}
		precompute(windowSize = 6, isLazy = true) {
			wnaf.setWindowSize(this, windowSize);
			if (!isLazy) this.multiply(_2n$2);
			return this;
		}
		assertValidity() {
			const p = this;
			const { a, d } = CURVE;
			if (p.is0()) throw new Error("bad point: ZERO");
			const { X, Y, Z, T } = p;
			const X2 = Fp.sqr(X);
			const Y2 = Fp.sqr(Y);
			const Z2 = Fp.sqr(Z);
			const Z4 = Fp.sqr(Z2);
			const aX2 = Fp.mul(X2, a);
			const left = Fp.mul(Fp.add(aX2, Y2), Z2);
			const right = Fp.add(Z4, Fp.mul(d, Fp.mul(X2, Y2)));
			if (!Fp.eql(left, right)) throw new Error("bad point: equation left != right (1)");
			const XY = Fp.mul(X, Y);
			const ZT = Fp.mul(Z, T);
			if (!Fp.eql(XY, ZT)) throw new Error("bad point: equation left != right (2)");
		}
		equals(other) {
			aedpoint(other);
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const { X: X2, Y: Y2, Z: Z2 } = other;
			const X1Z2 = Fp.mul(X1, Z2);
			const X2Z1 = Fp.mul(X2, Z1);
			const Y1Z2 = Fp.mul(Y1, Z2);
			const Y2Z1 = Fp.mul(Y2, Z1);
			return Fp.eql(X1Z2, X2Z1) && Fp.eql(Y1Z2, Y2Z1);
		}
		is0() {
			return this.equals(Point.ZERO);
		}
		negate() {
			return new Point(Fp.neg(this.X), this.Y, this.Z, Fp.neg(this.T));
		}
		double() {
			const { X: X1, Y: Y1, Z: Z1 } = this;
			const A = Fp.sqr(X1);
			const B = Fp.sqr(Y1);
			const C = Fp.mul(Fp.sqr(Z1), _2n$2);
			const D = mulA(A);
			const x1y1 = Fp.addN(X1, Y1);
			const E = Fp.sub(Fp.subN(Fp.sqr(x1y1), A), B);
			const G = Fp.addN(D, B);
			const F = Fp.subN(G, C);
			const H = Fp.subN(D, B);
			const X3 = Fp.mul(E, F);
			const Y3 = Fp.mul(G, H);
			const T3 = Fp.mul(E, H);
			return new Point(X3, Y3, Fp.mul(F, G), T3);
		}
		add(other) {
			aedpoint(other);
			const { d } = CURVE;
			const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
			const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
			const A = Fp.mul(X1, X2);
			const B = Fp.mul(Y1, Y2);
			const C = Fp.mul(Fp.mulN(T1, d), T2);
			const D = Fp.mul(Z1, Z2);
			const E = Fp.sub(Fp.subN(Fp.mulN(Fp.addN(X1, Y1), Fp.addN(X2, Y2)), A), B);
			const F = Fp.subN(D, C);
			const G = Fp.addN(D, C);
			const H = Fp.sub(B, mulA(A));
			const X3 = Fp.mul(E, F);
			const Y3 = Fp.mul(G, H);
			const T3 = Fp.mul(E, H);
			return new Point(X3, Y3, Fp.mul(F, G), T3);
		}
		subtract(other) {
			aedpoint(other);
			return this.add(other.negate());
		}
		multiply(scalar) {
			if (!Fn.isValidNot0(scalar)) throw new RangeError("invalid scalar: expected 1 <= sc < curve.n");
			const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
			return normalize([p, f])[0];
		}
		multiplyUnsafe(scalar) {
			if (!Fn.isValid(scalar)) throw new RangeError("invalid scalar: expected 0 <= sc < curve.n");
			if (scalar === _0n$2) return Point.ZERO;
			if (this.is0() || scalar === _1n$2) return this;
			return wnaf.mulUnsafe(this, scalar, normalize);
		}
		isSmallOrder() {
			return this.clearCofactor().is0();
		}
		isTorsionFree() {
			return wnaf.mulUnsafe(this, CURVE.n).is0();
		}
		toAffine(invertedZ) {
			const p = this;
			let iz = invertedZ;
			if (iz != null && typeof iz !== "bigint") throw new TypeError("\"invertedZ\" expected bigint, got type=" + typeof iz);
			const { X, Y, Z } = p;
			const is0 = p.is0();
			if (iz == null) iz = is0 ? Fp.create(_8n$1) : Fp.inv(Z);
			const x = Fp.mul(X, iz);
			const y = Fp.mul(Y, iz);
			const zz = Fp.mul(Z, iz);
			if (is0) return {
				x: Fp.ZERO,
				y: Fp.ONE
			};
			if (!Fp.eql(zz, Fp.ONE)) throw new Error("invZ was invalid");
			return {
				x,
				y
			};
		}
		clearCofactor() {
			if (cofactor === _1n$2) return this;
			if (cofactor === _2n$2) return this.double();
			if (cofactor === _4n) return this.double().double();
			if (cofactor === _8n$1) return this.double().double().double();
			return this.multiplyUnsafe(cofactor);
		}
		toBytes() {
			const { x, y } = this.toAffine();
			const bytes = Fp.toBytes(y);
			bytes[bytes.length - 1] |= isOdd(x) ? 128 : 0;
			return bytes;
		}
		toHex() {
			return bytesToHex(this.toBytes());
		}
		toString() {
			return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
		}
	}
	const normalize = (points) => normalizeZ(Point, points);
	const wnaf = new ScalarMultiplier(Point, randomBytes$2);
	if (wnaf.bits >= 6) Point.BASE.precompute(6);
	Object.freeze(Point.prototype);
	Object.freeze(Point);
	return Point;
}
/**
* Base class for prime-order points like Ristretto255 and Decaf448.
* These points eliminate cofactor issues by representing equivalence classes
* of Edwards curve points. Multiple Edwards representatives can describe the
* same abstract wrapper element, so wrapper validity is not the same thing as
* the hidden representative being torsion-free.
* @param ep - Backing Edwards point.
* @example
* Base class for prime-order points like Ristretto255 and Decaf448.
*
* ```ts
* import { ristretto255 } from '@noble/curves/ed25519.js';
* const point = ristretto255.Point.BASE.multiply(2n);
* ```
*/
var PrimeEdwardsPoint = class {
	static BASE;
	static ZERO;
	static Fp;
	static Fn;
	ep;
	/**
	* Wrap one internal Edwards representative directly.
	* This is not a canonical encoding boundary: alternate Edwards
	* representatives may still describe the same abstract wrapper element.
	*/
	constructor(ep) {
		this.ep = ep;
	}
	static fromBytes(_bytes) {
		notImplemented();
	}
	static fromHex(_hex) {
		notImplemented();
	}
	get x() {
		return this.toAffine().x;
	}
	get y() {
		return this.toAffine().y;
	}
	clearCofactor() {
		return this;
	}
	assertValidity() {
		this.ep.assertValidity();
	}
	/**
	* Return affine coordinates of the current internal Edwards representative.
	* This is a convenience helper, not a canonical Ristretto/Decaf encoding.
	* Equal abstract elements may expose different `x` / `y`; use
	* `toBytes()` / `fromBytes()` for canonical roundtrips.
	*/
	toAffine(invertedZ) {
		return this.ep.toAffine(invertedZ);
	}
	toHex() {
		return bytesToHex(this.toBytes());
	}
	toString() {
		return this.toHex();
	}
	isTorsionFree() {
		return true;
	}
	isSmallOrder() {
		return false;
	}
	add(other) {
		this.assertSame(other);
		return this.init(this.ep.add(other.ep));
	}
	subtract(other) {
		this.assertSame(other);
		return this.init(this.ep.subtract(other.ep));
	}
	multiply(scalar) {
		return this.init(this.ep.multiply(scalar));
	}
	multiplyUnsafe(scalar) {
		return this.init(this.ep.multiplyUnsafe(scalar));
	}
	double() {
		return this.init(this.ep.double());
	}
	negate() {
		return this.init(this.ep.negate());
	}
	precompute(windowSize, isLazy) {
		this.ep.precompute(windowSize, isLazy);
		return this;
	}
};
/**
* Initializes EdDSA signatures over given Edwards curve.
* @param Point - Edwards point constructor.
* @param cHash - Hash function.
* @param eddsaOpts - Optional signature helpers. See {@link EdDSAOpts}.
* @returns EdDSA helper namespace.
* @throws If the hash function, options, or derived point operations are invalid. {@link Error}
* @example
* Initializes EdDSA signatures over given Edwards curve.
*
* ```ts
* import { eddsa } from '@noble/curves/abstract/edwards.js';
* import { jubjub } from '@noble/curves/misc.js';
* import { sha512 } from '@noble/hashes/sha2.js';
* const sigs = eddsa(jubjub.Point, sha512);
* const { secretKey, publicKey } = sigs.keygen();
* const msg = new TextEncoder().encode('hello noble');
* const sig = sigs.sign(msg, secretKey);
* const isValid = sigs.verify(sig, msg, publicKey);
* ```
*/
function eddsa(Point, cHash, eddsaOpts = {}) {
	validatePointCons(Point);
	if (typeof cHash !== "function") throw new Error("\"hash\" function param is required");
	const hash = cHash;
	const opts = eddsaOpts;
	validateObject(opts, {}, {
		adjustScalarBytes: "function",
		randomBytes: "function",
		domain: "function",
		prehash: "function",
		zip215: "boolean",
		mapToCurve: "function",
		toMontgomery: "function",
		toMontgomerySecret: "function"
	});
	const { prehash } = opts;
	const { BASE, Fp, Fn } = Point;
	const outputLen = hash.outputLen;
	const expectedLen = 2 * Fp.BYTES;
	if (outputLen !== void 0) {
		asafenumber(outputLen, "hash.outputLen");
		if (outputLen !== expectedLen) throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
	}
	const randomBytes$3 = opts.randomBytes === void 0 ? randomBytes : opts.randomBytes;
	const toMontgomery = opts.toMontgomery;
	const toMontgomerySecret = opts.toMontgomerySecret;
	const adjustScalarBytes = opts.adjustScalarBytes === void 0 ? (bytes) => bytes : opts.adjustScalarBytes;
	const domain = opts.domain === void 0 ? (data, ctx, phflag) => {
		abool(phflag, "phflag");
		if (ctx.length || phflag) throw new Error("Contexts/pre-hash are not supported");
		return data;
	} : opts.domain;
	function modN_LE(hash) {
		return Fn.create(bytesToNumberLE(hash));
	}
	function getPrivateScalar(key) {
		const len = lengths.secretKey;
		abytes(key, lengths.secretKey, "secretKey");
		const hashed = abytes(hash(key), 2 * len, "hashedSecretKey");
		const head = adjustScalarBytes(hashed.slice(0, len));
		return {
			head,
			prefix: hashed.slice(len, 2 * len),
			scalar: modN_LE(head)
		};
	}
	/** Convenience method that creates public key from scalar. RFC8032 5.1.5
	* Also exposes the derived scalar/prefix tuple and point form reused by sign().
	*/
	function getExtendedPublicKey(secretKey) {
		const { head, prefix, scalar } = getPrivateScalar(secretKey);
		const point = BASE.multiply(scalar);
		return {
			head,
			prefix,
			scalar,
			point,
			pointBytes: point.toBytes()
		};
	}
	/** Calculates EdDSA pub key. RFC8032 5.1.5. */
	function getPublicKey(secretKey) {
		return getExtendedPublicKey(secretKey).pointBytes;
	}
	function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
		return modN_LE(hash(domain(concatBytes(...msgs), abytes(context, void 0, "context"), !!prehash)));
	}
	/** Signs message with secret key. RFC8032 5.1.6 */
	function sign(msg, secretKey, options = {}) {
		validateObject(options, {}, {}, "options");
		msg = copyBytes(abytes(msg, void 0, "message"));
		if (prehash) msg = prehash(msg);
		const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
		const r = hashDomainToScalar(options.context, prefix, msg);
		const R = BASE.multiply(r).toBytes();
		const k = hashDomainToScalar(options.context, R, pointBytes, msg);
		const s = Fn.create(r + k * scalar);
		if (!Fn.isValid(s)) throw new Error("sign failed: invalid s");
		return abytes(concatBytes(R, Fn.toBytes(s)), lengths.signature, "result");
	}
	const verifyOpts = { zip215: opts.zip215 };
	/**
	* Verifies EdDSA signature against message and public key. RFC 8032 §§5.1.7 and 5.2.7.
	* A cofactored verification equation is checked.
	*/
	function verify(sig, msg, publicKey, options = verifyOpts) {
		validateObject(options);
		const { context } = options;
		const zip215 = options.zip215 === void 0 ? !!verifyOpts.zip215 : options.zip215;
		const len = lengths.signature;
		sig = abytes(sig, len, "signature");
		msg = abytes(msg, void 0, "message");
		publicKey = abytes(publicKey, lengths.publicKey, "publicKey");
		if (zip215 !== void 0) abool(zip215, "zip215");
		if (prehash) msg = prehash(msg);
		const mid = len / 2;
		const r = sig.subarray(0, mid);
		const s = bytesToNumberLE(sig.subarray(mid, len));
		let A, R, SB;
		try {
			A = Point.fromBytes(publicKey, zip215);
			R = Point.fromBytes(r, zip215);
			SB = BASE.multiplyUnsafe(s);
		} catch (error) {
			return false;
		}
		if (!zip215 && A.isSmallOrder()) return false;
		const k = hashDomainToScalar(context, r, publicKey, msg);
		return R.add(A.multiplyUnsafe(k)).subtract(SB).clearCofactor().is0();
	}
	const _size = Fp.BYTES;
	const lengths = {
		secretKey: _size,
		publicKey: _size,
		signature: 2 * _size,
		seed: _size
	};
	function randomSecretKey(seed) {
		seed = seed === void 0 ? randomBytes$3(lengths.seed) : seed;
		return abytes(seed, lengths.seed, "seed");
	}
	function isValidSecretKey(key) {
		return isBytes(key) && key.length === lengths.secretKey;
	}
	function isValidPublicKey(key, zip215) {
		try {
			return !!Point.fromBytes(key, zip215 === void 0 ? verifyOpts.zip215 : zip215);
		} catch (error) {
			return false;
		}
	}
	const utils = {
		getExtendedPublicKey,
		randomSecretKey,
		isValidSecretKey,
		isValidPublicKey,
		/** Converts an Edwards public key to a companion Montgomery public key. */
		toMontgomery(publicKey) {
			if (toMontgomery === void 0) throw new Error("Montgomery conversion is not supported for this curve");
			return toMontgomery(Point.fromBytes(publicKey));
		},
		toMontgomerySecret(secretKey) {
			if (toMontgomerySecret === void 0) throw new Error("Montgomery conversion is not supported for this curve");
			return toMontgomerySecret(secretKey);
		}
	};
	Object.freeze(lengths);
	Object.freeze(utils);
	return Object.freeze({
		keygen: createKeygen(randomSecretKey, getPublicKey),
		getPublicKey,
		sign,
		verify,
		utils,
		Point,
		lengths
	});
}
//#endregion
//#region node_modules/@noble/curves/abstract/fft.js
function checkU32(n, title = "n") {
	if (typeof n !== "number") throw new TypeError(`wrong u32 integer "${title}": expected number, got type=${typeof n}`);
	if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295) throw new RangeError(`wrong u32 integer "${title}": expected 0..4294967295, got ${n}`);
	return n;
}
/**
* Checks if integer is in form of `1 << X`.
* @param x - Integer to inspect.
* @returns `true` when the value is a power of two.
* @example
* Validate that an FFT size is a power of two.
*
* ```ts
* isPowerOfTwo(8);
* ```
*/
function isPowerOfTwo(x) {
	checkU32(x, "x");
	return (x & x - 1) === 0 && x !== 0;
}
/**
* @param n - Input value.
* @returns Next power of two within the u32/array-length domain.
* @throws If `n` is not a valid unsigned 32-bit integer. {@link Error}
* @example
* Round an integer up to the FFT size it needs.
*
* ```ts
* nextPowerOfTwo(9);
* ```
*/
function nextPowerOfTwo(n) {
	checkU32(n);
	if (n <= 1) return 1;
	if (n > 2147483648) throw new Error("nextPowerOfTwo overflow: result does not fit u32");
	return 1 << log2(n - 1) + 1 >>> 0;
}
/**
* Similar to `bitLen(x)-1` but much faster for small integers, like indices.
* @param n - Input value.
* @returns Base-2 logarithm. For `n = 0`, the current implementation returns `-1`.
* @example
* Compute the radix-2 stage count for one transform size.
*
* ```ts
* log2(8);
* ```
*/
function log2(n) {
	checkU32(n);
	return 31 - Math.clz32(n);
}
function poly(field, roots, create, fft, length) {
	validateField(field);
	const F = field;
	const _create = create || ((len, elm) => new Array(len).fill(elm ?? F.ZERO));
	const isPoly = (x) => {
		if (Array.isArray(x)) return true;
		if (!ArrayBuffer.isView(x)) return false;
		const v = x;
		return typeof v.length === "number" && typeof v.slice === "function" && typeof v[Symbol.iterator] === "function";
	};
	const checkPoly = (title, value) => {
		if (!isPoly(value)) throw new TypeError(`"${title}" expected polynomial, got type=${typeof value}`);
	};
	const checkLength = (a, b) => {
		checkPoly("a", a);
		const L = a.length;
		if (b !== void 0) {
			checkPoly("b", b);
			if (b.length !== L) throw new Error(`poly: mismatched lengths ${L} vs ${b.length}`);
		}
		if (length !== void 0 && L !== length) throw new Error(`poly: expected fixed length ${length}, got ${L}`);
		return L;
	};
	function findOmegaIndex(x, n, brp = false, weights) {
		if (!isPowerOfTwo(n)) throw new Error("poly.lagrange: expected power of two length, got " + n);
		const omega = weights || (brp ? roots.brp(log2(n)) : roots.roots(log2(n)));
		for (let i = 0; i < n; i++) if (F.eql(x, omega[i])) return i;
		return -1;
	}
	return {
		roots,
		create: _create,
		length,
		extend: (a, len) => {
			checkLength(a);
			const out = _create(len, F.ZERO);
			for (let i = 0; i < Math.min(a.length, len); i++) out[i] = a[i];
			return out;
		},
		degree: (a) => {
			checkLength(a);
			for (let i = a.length - 1; i >= 0; i--) if (!F.is0(a[i])) return i;
			return -1;
		},
		add: (a, b) => {
			const len = checkLength(a, b);
			const out = _create(len);
			for (let i = 0; i < len; i++) out[i] = F.add(a[i], b[i]);
			return out;
		},
		sub: (a, b) => {
			const len = checkLength(a, b);
			const out = _create(len);
			for (let i = 0; i < len; i++) out[i] = F.sub(a[i], b[i]);
			return out;
		},
		dot: (a, b) => {
			const len = checkLength(a, b);
			const out = _create(len);
			for (let i = 0; i < len; i++) out[i] = F.mul(a[i], b[i]);
			return out;
		},
		mul: (a, b) => {
			if (isPoly(b)) {
				const len = checkLength(a, b);
				if (fft) {
					const A = fft.direct(a, false, true);
					const B = fft.direct(b, false, true);
					for (let i = 0; i < A.length; i++) A[i] = F.mul(A[i], B[i]);
					return fft.inverse(A, true, false);
				} else {
					const res = _create(len);
					for (let i = 0; i < len; i++) for (let j = 0; j < len; j++) {
						const k = (i + j) % len;
						res[k] = F.add(res[k], F.mul(a[i], b[j]));
					}
					return res;
				}
			} else {
				const out = _create(checkLength(a));
				for (let i = 0; i < out.length; i++) out[i] = F.mul(a[i], b);
				return out;
			}
		},
		convolve(a, b) {
			checkPoly("a", a);
			checkPoly("b", b);
			const len = nextPowerOfTwo(a.length + b.length - 1);
			return this.mul(this.extend(a, len), this.extend(b, len));
		},
		shift(p, factor) {
			checkPoly("p", p);
			const out = _create(p.length);
			if (length !== void 0 && p.length !== length) throw new Error(`poly: expected fixed length ${length}, got ${p.length}`);
			if (!p.length) return out;
			out[0] = p[0];
			for (let i = 1, power = F.ONE; i < p.length; i++) {
				power = F.mul(power, factor);
				out[i] = F.mul(p[i], power);
			}
			return out;
		},
		clone: (a) => {
			checkLength(a);
			const out = _create(a.length);
			for (let i = 0; i < a.length; i++) out[i] = a[i];
			return out;
		},
		eval: (a, basis) => {
			checkLength(a, basis);
			let acc = F.ZERO;
			for (let i = 0; i < a.length; i++) acc = F.add(acc, F.mul(a[i], basis[i]));
			return acc;
		},
		monomial: {
			basis: (x, n) => {
				const out = _create(n);
				let pow = F.ONE;
				for (let i = 0; i < n; i++) {
					out[i] = pow;
					pow = F.mul(pow, x);
				}
				return out;
			},
			eval: (a, x) => {
				checkLength(a);
				let acc = F.ZERO;
				for (let i = a.length - 1; i >= 0; i--) acc = F.add(F.mul(acc, x), a[i]);
				return acc;
			}
		},
		lagrange: {
			basis: (x, n, brp = false, weights) => {
				if (!isPowerOfTwo(n)) throw new Error("poly.lagrange: expected power of two length, got " + n);
				const bits = log2(n);
				const cache = weights || (brp ? roots.brp(bits) : roots.roots(bits));
				const out = _create(n);
				const idx = findOmegaIndex(x, n, brp, weights);
				if (idx !== -1) {
					out[idx] = F.ONE;
					return out;
				}
				const tm = F.pow(x, BigInt(n));
				const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n)));
				const denom = _create(n);
				for (let i = 0; i < n; i++) denom[i] = F.sub(x, cache[i]);
				const inv = F.invertBatch(denom);
				for (let i = 0; i < n; i++) out[i] = F.mul(c, F.mul(cache[i], inv[i]));
				return out;
			},
			eval(a, x, brp = false) {
				checkLength(a);
				const idx = findOmegaIndex(x, a.length, brp);
				if (idx !== -1) return a[idx];
				const L = this.basis(x, a.length, brp);
				let acc = F.ZERO;
				for (let i = 0; i < a.length; i++) if (!F.is0(a[i])) acc = F.add(acc, F.mul(a[i], L[i]));
				return acc;
			}
		},
		vanishing(roots) {
			checkPoly("roots", roots);
			if (length !== void 0 && roots.length !== length) throw new Error(`poly: expected fixed length ${length}, got ${roots.length}`);
			const out = _create(roots.length + 1, F.ZERO);
			out[0] = F.ONE;
			for (const r of roots) {
				const neg = F.neg(r);
				for (let j = out.length - 1; j > 0; j--) out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
				out[0] = F.mul(out[0], neg);
			}
			return out;
		}
	};
}
//#endregion
//#region node_modules/@noble/curves/abstract/hash-to-curve.js
const os2ip = bytesToNumberBE;
function i2osp(value, length) {
	asafenumber(value);
	asafenumber(length);
	if (length < 0 || length > 4) throw new Error("invalid I2OSP length: " + length);
	if (value < 0 || value > 2 ** (8 * length) - 1) throw new Error("invalid I2OSP input: " + value);
	const res = Array.from({ length }).fill(0);
	for (let i = length - 1; i >= 0; i--) {
		res[i] = value & 255;
		value >>>= 8;
	}
	return new Uint8Array(res);
}
function strxor(a, b) {
	const arr = new Uint8Array(a.length);
	for (let i = 0; i < a.length; i++) arr[i] = a[i] ^ b[i];
	return arr;
}
function normDST(DST) {
	if (!isBytes(DST) && typeof DST !== "string") throw new Error("DST must be Uint8Array or ascii string");
	const dst = typeof DST === "string" ? asciiToBytes(DST) : DST;
	if (dst.length === 0) throw new Error("DST must be non-empty");
	return dst;
}
/**
* Produces a uniformly random byte string using a cryptographic hash
* function H that outputs b bits.
* See {@link https://www.rfc-editor.org/rfc/rfc9380#section-5.3.1 | RFC 9380 section 5.3.1}.
* @param msg - Input message.
* @param DST - Domain separation tag. This helper normalizes DST, rejects empty DSTs, and
*   oversize-hashes DST when needed.
* @param lenInBytes - Output length.
* @param H - Hash function.
* @returns Uniform byte string.
* @throws If the message, DST, hash, or output length is invalid. {@link Error}
* @example
* Expand one message into uniform bytes with the XMD construction.
*
* ```ts
* import { expand_message_xmd } from '@noble/curves/abstract/hash-to-curve.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const uniform = expand_message_xmd(new TextEncoder().encode('hello noble'), 'DST', 32, sha256);
* ```
*/
function expand_message_xmd(msg, DST, lenInBytes, H) {
	abytes(msg);
	asafenumber(lenInBytes);
	if (typeof H !== "function") throw new Error("expand_message_xmd: expected hash function");
	asafenumber(H.outputLen, "hash.outputLen");
	asafenumber(H.blockLen, "hash.blockLen");
	DST = normDST(DST);
	if (DST.length > 255) DST = H(concatBytes(asciiToBytes("H2C-OVERSIZE-DST-"), DST));
	const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
	const ell = Math.ceil(lenInBytes / b_in_bytes);
	if (lenInBytes > 65535 || ell > 255) throw new Error("expand_message_xmd: invalid lenInBytes");
	const DST_prime = concatBytes(DST, i2osp(DST.length, 1));
	const Z_pad = new Uint8Array(r_in_bytes);
	const l_i_b_str = i2osp(lenInBytes, 2);
	const b = new Array(ell);
	const b_0 = H(concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
	b[0] = H(concatBytes(b_0, i2osp(1, 1), DST_prime));
	for (let i = 1; i < ell; i++) b[i] = H(concatBytes(...[
		strxor(b_0, b[i - 1]),
		i2osp(i + 1, 1),
		DST_prime
	]));
	return concatBytes(...b).slice(0, lenInBytes);
}
/**
* Produces a uniformly random byte string using an extendable-output function (XOF) H.
* 1. The collision resistance of H MUST be at least k bits.
* 2. H MUST be an XOF that has been proved indifferentiable from
*    a random oracle under a reasonable cryptographic assumption.
* See {@link https://www.rfc-editor.org/rfc/rfc9380#section-5.3.2 | RFC 9380 section 5.3.2}.
* @param msg - Input message.
* @param DST - Domain separation tag. This helper normalizes DST, rejects empty DSTs, and
*   oversize-hashes DST when needed.
* @param lenInBytes - Output length.
* @param k - Target security level.
* @param H - XOF hash function.
* @returns Uniform byte string.
* @throws If the message, DST, XOF, or output length is invalid. {@link Error}
* @example
* Expand one message into uniform bytes with the XOF construction.
*
* ```ts
* import { expand_message_xof } from '@noble/curves/abstract/hash-to-curve.js';
* import { shake256 } from '@noble/hashes/sha3.js';
* const uniform = expand_message_xof(
*   new TextEncoder().encode('hello noble'),
*   'DST',
*   32,
*   128,
*   shake256
* );
* ```
*/
function expand_message_xof(msg, DST, lenInBytes, k, H) {
	abytes(msg);
	asafenumber(lenInBytes);
	asafenumber(k, "k");
	if (k < 0) throw new Error("expand_message_xof: invalid k");
	if (typeof H !== "function") throw new Error("expand_message_xof: expected XOF function");
	if (typeof H.create !== "function") throw new Error("expand_message_xof: expected XOF create");
	DST = normDST(DST);
	if (lenInBytes < 0 || lenInBytes > 65535) throw new Error("expand_message_xof: invalid lenInBytes");
	if (DST.length > 255) {
		const dkLen = Math.ceil(2 * k / 8);
		DST = H.create({ dkLen }).update(asciiToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
	}
	if (DST.length > 255) throw new Error("expand_message_xof: invalid DST");
	return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
}
/**
* Hashes arbitrary-length byte strings to a list of one or more elements of a finite field F.
* See {@link https://www.rfc-editor.org/rfc/rfc9380#section-5.2 | RFC 9380 section 5.2}.
* @param msg - Input message bytes.
* @param count - Number of field elements to derive. Must be `>= 1`.
* @param options - RFC 9380 options. See {@link H2COpts}. `m` must be `>= 1`.
* @returns `[u_0, ..., u_(count - 1)]`, a list of field elements.
* @throws If the expander choice or RFC 9380 options are invalid. {@link Error}
* @example
* Hash one message into field elements before mapping it onto a curve.
*
* ```ts
* import { hash_to_field } from '@noble/curves/abstract/hash-to-curve.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const scalars = hash_to_field(new TextEncoder().encode('hello noble'), 2, {
*   DST: 'DST',
*   p: 17n,
*   m: 1,
*   k: 128,
*   expand: 'xmd',
*   hash: sha256,
* });
* ```
*/
function hash_to_field(msg, count, options) {
	validateObject(options, {
		p: "bigint",
		m: "number",
		k: "number",
		hash: "function"
	});
	const { p, k, m, hash, expand, DST } = options;
	asafenumber(hash.outputLen, "valid hash");
	abytes(msg);
	asafenumber(count);
	asafenumber(m, "m");
	asafenumber(k, "k");
	if (p <= BigInt(1)) throw new Error("hash_to_field: expected valid field characteristic");
	if (count < 1) throw new Error("hash_to_field: expected count >= 1");
	if (m < 1) throw new Error("hash_to_field: expected m >= 1");
	if (k < 0) throw new Error("hash_to_field: invalid k");
	const log2p = p.toString(2).length;
	const L = Math.ceil((log2p + k) / 8);
	const len_in_bytes = count * m * L;
	let prb;
	if (expand === "xmd") prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
	else if (expand === "xof") prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
	else if (expand === "_internal_pass") prb = msg;
	else throw new Error("expand must be \"xmd\" or \"xof\"");
	const u = new Array(count);
	for (let i = 0; i < count; i++) {
		const e = new Array(m);
		for (let j = 0; j < m; j++) {
			const elm_offset = L * (j + i * m);
			e[j] = mod(os2ip(prb.subarray(elm_offset, elm_offset + L)), p);
		}
		u[i] = e;
	}
	return u;
}
const _DST_scalar = "HashToScalar-";
/**
* Creates hash-to-curve methods from EC Point and mapToCurve function. See {@link H2CHasher}.
* @param Point - Point constructor.
* @param mapToCurve - Map-to-curve function.
* @param defaults - Default hash-to-curve options. A frozen detached snapshot is reused as the
*   shared defaults bundle for the returned helpers.
* @returns Hash-to-curve helper namespace.
* @throws If the map-to-curve callback or default hash-to-curve options are invalid. {@link Error}
* @example
* Bundle hash-to-curve, hash-to-scalar, and encode-to-curve helpers for one curve.
*
* ```ts
* import { createHasher } from '@noble/curves/abstract/hash-to-curve.js';
* import { p256 } from '@noble/curves/nist.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hasher = createHasher(p256.Point, () => p256.Point.BASE.toAffine(), {
*   DST: 'P256_XMD:SHA-256_SSWU_RO_',
*   encodeDST: 'P256_XMD:SHA-256_SSWU_NU_',
*   p: p256.Point.Fp.ORDER,
*   m: 1,
*   k: 128,
*   expand: 'xmd',
*   hash: sha256,
* });
* const point = hasher.encodeToCurve(new TextEncoder().encode('hello noble'));
* ```
*/
function createHasher(Point, mapToCurve, defaults) {
	if (typeof mapToCurve !== "function") throw new Error("mapToCurve() must be defined");
	validateObject(defaults);
	const snapshot = (src) => Object.freeze({
		...src,
		DST: isBytes(src.DST) ? copyBytes(src.DST) : src.DST,
		...src.encodeDST === void 0 ? {} : { encodeDST: isBytes(src.encodeDST) ? copyBytes(src.encodeDST) : src.encodeDST }
	});
	const safeDefaults = snapshot(defaults);
	const dstOverride = (options) => options && options.DST !== void 0 ? { DST: options.DST } : void 0;
	function map(num) {
		return Point.fromAffine(mapToCurve(num));
	}
	function clear(initial) {
		const P = initial.clearCofactor();
		if (P.equals(Point.ZERO)) return Point.ZERO;
		P.assertValidity();
		return P;
	}
	return Object.freeze({
		get defaults() {
			return snapshot(safeDefaults);
		},
		Point,
		hashToCurve(msg, options) {
			const u = hash_to_field(msg, 2, Object.assign({}, safeDefaults, dstOverride(options)));
			const u0 = map(u[0]);
			const u1 = map(u[1]);
			return clear(u0.add(u1));
		},
		encodeToCurve(msg, options) {
			const optsDst = safeDefaults.encodeDST === void 0 ? {} : { DST: safeDefaults.encodeDST };
			return clear(map(hash_to_field(msg, 1, Object.assign({}, safeDefaults, optsDst, dstOverride(options)))[0]));
		},
		/** See {@link H2CHasher} */
		mapToCurve(scalars) {
			if (safeDefaults.m === 1) {
				if (typeof scalars !== "bigint") throw new Error("expected bigint (m=1)");
				return clear(map([scalars]));
			}
			if (!Array.isArray(scalars)) throw new Error("expected array of bigints");
			if (scalars.length !== safeDefaults.m) throw new Error(`expected array of ${safeDefaults.m} bigints`);
			for (const i of scalars) if (typeof i !== "bigint") throw new Error("expected array of bigints");
			return clear(map(scalars));
		},
		hashToScalar(msg, options) {
			const N = Point.Fn.ORDER;
			return hash_to_field(msg, 1, Object.assign({}, safeDefaults, { DST: _DST_scalar }, dstOverride(options), {
				p: N,
				m: 1
			}))[0][0];
		}
	});
}
//#endregion
//#region node_modules/@noble/curves/abstract/frost.js
/**
* FROST: Flexible Round-Optimized Schnorr Threshold Protocol for Two-Round Schnorr Signatures.
*
* See {@link https://datatracker.ietf.org/doc/rfc9591/ | RFC 9591} and
* {@link https://frost.zfnd.org | frost.zfnd.org}.
* @module
*/
const validateSigners = (signers, title = "signers") => {
	validateObject(signers, {
		min: "number",
		max: "number"
	}, {}, title);
	asafenumber(signers.min, title + ".min");
	asafenumber(signers.max, title + ".max");
	if (signers.min < 2 || signers.max < 2 || signers.min > signers.max) throw new Error("Wrong signers info: min=" + signers.min + " max=" + signers.max);
};
const validateCommitmentsNum = (signers, len) => {
	if (len < signers.min || len > signers.max) throw new Error("Wrong number of commitments=" + len);
};
var AggErr = class extends Error {
	cheaters;
	constructor(msg, cheaters) {
		super(msg);
		this.cheaters = cheaters;
	}
};
/**
* Builds a FROST ciphersuite API from concrete curve and hash hooks.
* @param opts - Ciphersuite construction options. See {@link FrostOpts}.
* @returns FROST API bound to the supplied ciphersuite.
* @example
* Create a suite from a curve-specific option object.
* ```ts
* import { createFROST } from '@noble/curves/abstract/frost.js';
* import { ed25519 } from '@noble/curves/ed25519.js';
* import { sha512 } from '@noble/hashes/sha2.js';
* const frost = createFROST({
*   name: 'FROST-ED25519-SHA512-v1',
*   Point: ed25519.Point,
*   hash: sha512,
* });
* ```
*/
function createFROST(opts) {
	validateObject(opts, {
		name: "string",
		hash: "function"
	}, {
		hashToScalar: "function",
		validatePoint: "function",
		parsePublicKey: "function",
		adjustScalar: "function",
		adjustPoint: "function",
		challenge: "function",
		adjustNonces: "function",
		adjustSecret: "function",
		adjustPublic: "function",
		adjustGroupCommitmentShare: "function",
		adjustTx: "object",
		adjustDKG: "function"
	});
	validatePointCons(opts.Point);
	const { Point, validatePoint, parsePublicKey, adjustScalar, adjustPoint: adjustPointHook, challenge, adjustNonces, adjustSecret, adjustPublic, adjustGroupCommitmentShare, adjustDKG } = opts;
	const Fn = opts.Fn === void 0 ? Point.Fn : opts.Fn;
	const adjustTx = opts.adjustTx === void 0 ? void 0 : {
		encode: opts.adjustTx.encode,
		decode: opts.adjustTx.decode
	};
	if (adjustTx) validateObject(adjustTx, {
		encode: "function",
		decode: "function"
	});
	const hashBytes = opts.hash;
	const hashToScalar = opts.hashToScalar === void 0 ? (msg, opts = { DST: /* @__PURE__ */ new Uint8Array() }) => {
		const t = hashBytes(concatBytes(opts.DST, msg));
		return Fn.create(Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t));
	} : opts.hashToScalar;
	const H1Prefix = utf8ToBytes(opts.H1 !== void 0 ? opts.H1 : opts.name + "rho");
	const H2Prefix = utf8ToBytes(opts.H2 !== void 0 ? opts.H2 : opts.name + "chal");
	const H3Prefix = utf8ToBytes(opts.H3 !== void 0 ? opts.H3 : opts.name + "nonce");
	const H4Prefix = utf8ToBytes(opts.H4 !== void 0 ? opts.H4 : opts.name + "msg");
	const H5Prefix = utf8ToBytes(opts.H5 !== void 0 ? opts.H5 : opts.name + "com");
	const HDKGPrefix = utf8ToBytes(opts.HDKG !== void 0 ? opts.HDKG : opts.name + "dkg");
	const HIDPrefix = utf8ToBytes(opts.HID !== void 0 ? opts.HID : opts.name + "id");
	const H1 = (msg) => hashToScalar(msg, { DST: H1Prefix });
	const H2 = (msg) => hashToScalar(msg, { DST: H2Prefix });
	const H3 = (msg) => hashToScalar(msg, { DST: H3Prefix });
	const H4 = (msg) => hashBytes(concatBytes(H4Prefix, msg));
	const H5 = (msg) => hashBytes(concatBytes(H5Prefix, msg));
	const HDKG = (msg) => hashToScalar(msg, { DST: HDKGPrefix });
	const HID = (msg) => hashToScalar(msg, { DST: HIDPrefix });
	const randomScalar = (rng = randomBytes) => {
		if (typeof rng !== "function") throw new TypeError("\"rng\" expected function, got type=" + typeof rng);
		const t = mapHashToField(rng(getMinHashLength(Fn.ORDER)), Fn.ORDER, Fn.isLE);
		return Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
	};
	const serializePoint = (p) => p.toBytes();
	const validatePublicPoint = (p) => {
		p.assertValidity();
		if (p.is0()) throw new Error("invalid point: identity");
		if (!p.isTorsionFree()) throw new Error("bad point: not in prime-order subgroup");
		if (validatePoint) validatePoint(p);
		return p;
	};
	const parsePoint = (bytes) => validatePublicPoint(Point.fromBytes(bytes));
	const nonceCommitments = (identifier, nonces) => ({
		identifier,
		hiding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.hiding))),
		binding: serializePoint(Point.BASE.multiply(Fn.fromBytes(nonces.binding)))
	});
	const adjustPoint = adjustPointHook === void 0 ? (n) => n : adjustPointHook;
	const validateIdentifier = (n) => {
		if (!Fn.isValid(n) || Fn.is0(n)) throw new Error("Invalid identifier " + n);
		return n;
	};
	const serializeIdentifier = (id) => bytesToHex(Fn.toBytes(validateIdentifier(id)));
	const parseIdentifier = (id, title = "identifier") => {
		astring(id, title);
		const n = validateIdentifier(Fn.fromBytes(hexToBytes(id)));
		if (serializeIdentifier(n) !== id) throw new Error("expected canonical identifier hex");
		return n;
	};
	const copyRound1Package = (p) => ({
		identifier: serializeIdentifier(parseIdentifier(p.identifier)),
		commitment: p.commitment.map((c) => copyBytes(c)),
		proofOfKnowledge: copyBytes(p.proofOfKnowledge)
	});
	const canonicalRound1Packages = (packages) => {
		const snapshot = packages.map(copyRound1Package);
		snapshot.sort((a, b) => {
			const ai = parseIdentifier(a.identifier);
			const bi = parseIdentifier(b.identifier);
			return ai < bi ? -1 : ai > bi ? 1 : 0;
		});
		return snapshot;
	};
	const equalRound1Transcripts = (a, b) => {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			const p = a[i];
			const q = b[i];
			if (p.identifier !== q.identifier || p.commitment.length !== q.commitment.length) return false;
			for (let j = 0; j < p.commitment.length; j++) if (!equalBytes(p.commitment[j], q.commitment[j])) return false;
			if (!equalBytes(p.proofOfKnowledge, q.proofOfKnowledge)) return false;
		}
		return true;
	};
	const Signature = {
		encode: (R, z) => {
			let res = concatBytes(serializePoint(R), Fn.toBytes(z));
			if (adjustTx) res = adjustTx.encode(res);
			return res;
		},
		decode: (sig) => {
			if (adjustTx) sig = adjustTx.decode(sig);
			const Rbytes = sig.subarray(0, -Fn.BYTES);
			const R = parsePoint(Rbytes);
			if (serializePoint(R).length !== Rbytes.length) throw new Error("invalid signature encoding");
			return {
				R,
				z: Fn.fromBytes(sig.subarray(-Fn.BYTES))
			};
		}
	};
	const genPointScalarPair = (rng = randomBytes) => {
		let n = randomScalar(rng);
		if (adjustScalar) n = adjustScalar(n);
		let p = Point.BASE.multiply(n);
		return {
			scalar: n,
			point: p
		};
	};
	const nrErr = "roots are unavailable in FROST polynomial mode";
	const Poly = poly(Fn, {
		info: {
			G: Fn.ZERO,
			oddFactor: Fn.ZERO,
			powerOfTwo: 0
		},
		roots() {
			throw new Error(nrErr);
		},
		brp() {
			throw new Error(nrErr);
		},
		inverse() {
			throw new Error(nrErr);
		},
		omega() {
			throw new Error(nrErr);
		},
		clear() {}
	});
	const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
	const polynomialEvaluate = (x, coeffs) => {
		if (!coeffs.length) throw new Error("empty coefficients");
		return Poly.monomial.eval(coeffs, x);
	};
	const deriveInterpolatingValue = (L, xi) => {
		const err = "invalid parameters";
		if (!L.some((x) => Fn.eql(x, xi))) throw new Error(err);
		const Lset = new Set(L);
		if (Lset.size !== L.length) throw new Error(err);
		if (!Lset.has(xi)) throw new Error(err);
		let num = Fn.ONE;
		let den = Fn.ONE;
		for (const x of L) {
			if (Fn.eql(x, xi)) continue;
			num = Fn.mul(num, x);
			den = Fn.mul(den, Fn.sub(x, xi));
		}
		return Fn.div(num, den);
	};
	const evalutateVSS = (identifier, commitment) => {
		return msm(commitment, Poly.monomial.basis(identifier, commitment.length));
	};
	const generateSecretPolynomial = (signers, secret, coeffs, rng = randomBytes) => {
		validateSigners(signers);
		if (secret !== void 0) abytes(secret, Fn.BYTES, "secret");
		if (coeffs !== void 0) aarray(coeffs, "coeffs");
		if (typeof rng !== "function") throw new TypeError("\"rng\" expected function, got type=" + typeof rng);
		const secretScalar = secret === void 0 ? randomScalar(rng) : Fn.fromBytes(secret);
		if (!coeffs) {
			coeffs = [];
			for (let i = 0; i < signers.min - 1; i++) coeffs.push(randomScalar(rng));
		}
		if (coeffs.length !== signers.min - 1) throw new Error("wrong coefficients length");
		const coefficients = [secretScalar, ...coeffs];
		return {
			coefficients,
			commitment: coefficients.map((i) => Point.BASE.multiply(i)),
			secret: secretScalar
		};
	};
	const ProofOfKnowledge = {
		challenge: (id, verKey, R) => HDKG(concatBytes(Fn.toBytes(id), serializePoint(verKey), serializePoint(R))),
		compute(id, coefficents, commitments, rng = randomBytes) {
			if (coefficents.length < 1) throw new Error("coefficients should have at least one element");
			const { point: R, scalar: k } = genPointScalarPair(rng);
			const verKey = commitments[0];
			const c = this.challenge(id, verKey, R);
			const mu = Fn.add(k, Fn.mul(coefficents[0], c));
			return Signature.encode(R, mu);
		},
		validate(id, commitment, proof) {
			if (commitment.length < 1) throw new Error("commitment should have at least one element");
			const { R, z } = Signature.decode(proof);
			const phi = parsePoint(commitment[0]);
			const c = this.challenge(id, phi, R);
			if (!R.equals(Point.BASE.multiplyUnsafe(z).subtract(phi.multiplyUnsafe(c)))) throw new Error("invalid proof of knowledge");
		}
	};
	const Basic = {
		challenge: (R, PK, msg) => {
			if (challenge) return challenge(R, PK, msg);
			return H2(concatBytes(serializePoint(R), serializePoint(PK), msg));
		},
		sign(msg, sk, rng = randomBytes) {
			const { point: R, scalar: r } = genPointScalarPair(rng);
			const PK = Point.BASE.multiply(sk);
			const c = this.challenge(R, PK, msg);
			return [R, Fn.add(r, Fn.mul(c, sk))];
		},
		verify(msg, R, z, PK) {
			if (adjustPointHook) PK = adjustPointHook(PK);
			if (adjustPointHook) R = adjustPointHook(R);
			const c = this.challenge(R, PK, msg);
			const zB = Point.BASE.multiplyUnsafe(z);
			const cA = PK.multiplyUnsafe(c);
			let check = zB.subtract(cA).subtract(R);
			if (check.clearCofactor) check = check.clearCofactor();
			return Point.ZERO.equals(check);
		}
	};
	const validateSecretShare = (identifier, commitment, signingShare) => {
		if (!Point.BASE.multiply(signingShare).equals(evalutateVSS(identifier, commitment))) throw new Error("invalid secret share");
	};
	const Identifier = {
		fromNumber(n) {
			if (!Number.isSafeInteger(n)) throw new Error("expected safe interger");
			return serializeIdentifier(BigInt(n));
		},
		derive(s) {
			astring(s, "s");
			return serializeIdentifier(HID(utf8ToBytes(s)));
		}
	};
	const generateNonce = (secret, rng = randomBytes) => H3(concatBytes(rng(32), Fn.toBytes(secret)));
	const getGroupCommitment = (GPK, commitmentList, msg) => {
		const CL = commitmentList.map((i) => [
			i.identifier,
			parseIdentifier(i.identifier),
			parsePoint(i.hiding),
			parsePoint(i.binding)
		]);
		CL.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
		const Cbytes = [];
		for (const [_, id, hC, bC] of CL) Cbytes.push(Fn.toBytes(id), serializePoint(hC), serializePoint(bC));
		const encodedCommitmentHash = H5(concatBytes(...Cbytes));
		const rhoPrefix = concatBytes(serializePoint(GPK), H4(msg), encodedCommitmentHash);
		const bindingFactors = {};
		for (const [i, id] of CL) bindingFactors[i] = H1(concatBytes(rhoPrefix, Fn.toBytes(id)));
		let hidingSum = Point.ZERO;
		const points = [];
		const scalars = [];
		for (const [i, _, hC, bC] of CL) {
			if (Point.ZERO.equals(hC) || Point.ZERO.equals(bC)) throw new Error("infinity commitment");
			hidingSum = hidingSum.add(hC);
			points.push(bC);
			scalars.push(bindingFactors[i]);
		}
		const groupCommitment = hidingSum.add(msm(points, scalars));
		return {
			identifiers: CL.map((i) => i[1]),
			groupCommitment,
			bindingFactors
		};
	};
	const prepareShare = (PK, commitmentList, msg, identifier) => {
		const GPK = adjustPoint(parsePoint(PK));
		const id = parseIdentifier(identifier);
		const { identifiers, groupCommitment, bindingFactors } = getGroupCommitment(GPK, commitmentList, msg);
		const bindingFactor = bindingFactors[identifier];
		return {
			lambda: deriveInterpolatingValue(identifiers, id),
			challenge: Basic.challenge(groupCommitment, GPK, msg),
			bindingFactor,
			groupCommitment
		};
	};
	Object.freeze(Identifier);
	const frost = {
		Identifier,
		DKG: Object.freeze({
			round1: (id, signers, secret, rng = randomBytes) => {
				const idNum = parseIdentifier(id, "id");
				validateSigners(signers);
				const { coefficients, commitment } = generateSecretPolynomial(signers, secret, void 0, rng);
				const proofOfKnowledge = ProofOfKnowledge.compute(idNum, coefficients, commitment, rng);
				const commitmentBytes = commitment.map(serializePoint);
				return {
					public: {
						identifier: serializeIdentifier(idNum),
						commitment: commitmentBytes,
						proofOfKnowledge
					},
					secret: {
						identifier: idNum,
						coefficients,
						commitment: commitment.map(serializePoint),
						signers: {
							min: signers.min,
							max: signers.max
						},
						step: 1
					}
				};
			},
			round2: (secret, others) => {
				validateObject(secret, {
					identifier: "bigint",
					commitment: "object",
					signers: "object"
				}, {
					coefficients: "object",
					round1Cache: "object",
					round2Cache: "object",
					step: "number"
				}, "secret");
				validateSigners(secret.signers, "secret.signers");
				aarray(others, "others");
				if (others.length !== secret.signers.max - 1) throw new Error("wrong number of round1 packages");
				if (!secret.coefficients || secret.step === 3) throw new Error("round3 package used in round2");
				const authenticatedRound1 = canonicalRound1Packages(others);
				if (secret.round2Cache !== void 0) {
					if (secret.round1Cache === void 0 || !equalRound1Transcripts(secret.round1Cache, authenticatedRound1)) throw new Error("round1 packages do not match authenticated transcript");
					return secret.round2Cache;
				}
				const res = {};
				for (const p of authenticatedRound1) {
					if (p.commitment.length !== secret.signers.min) throw new Error("wrong number of commitments");
					const id = parseIdentifier(p.identifier);
					if (id === secret.identifier) throw new Error("duplicate id=" + serializeIdentifier(id));
					ProofOfKnowledge.validate(id, p.commitment, p.proofOfKnowledge);
					for (const c of p.commitment) parsePoint(c);
					if (res[p.identifier]) throw new Error("Duplicate id=" + id);
					const signingShare = Fn.toBytes(polynomialEvaluate(id, secret.coefficients));
					res[p.identifier] = {
						identifier: serializeIdentifier(secret.identifier),
						signingShare
					};
				}
				secret.round1Cache = authenticatedRound1;
				secret.round2Cache = res;
				secret.step = 2;
				return res;
			},
			round3: (secret, round1, round2) => {
				validateObject(secret, {
					identifier: "bigint",
					commitment: "object",
					signers: "object"
				}, {
					coefficients: "object",
					round1Cache: "object",
					round2Cache: "object",
					step: "number"
				}, "secret");
				validateSigners(secret.signers, "secret.signers");
				aarray(round1, "round1");
				aarray(round2, "round2");
				if (round1.length !== secret.signers.max - 1) throw new Error("wrong length of round1 packages");
				if (!secret.coefficients || secret.step !== 2 || !secret.round1Cache) throw new Error("round2 package used in round3");
				const suppliedRound1 = canonicalRound1Packages(round1);
				const authenticatedRound1 = secret.round1Cache;
				if (!equalRound1Transcripts(authenticatedRound1, suppliedRound1)) throw new Error("round1 packages do not match authenticated transcript");
				if (round2.length !== authenticatedRound1.length) throw new Error("wrong length of round2 packages");
				const merged = {};
				for (const r1 of authenticatedRound1) {
					if (!r1.identifier || !r1.commitment) throw new Error("wrong round1 share");
					merged[r1.identifier] = { ...r1 };
				}
				for (const r2 of round2) {
					if (!r2.identifier || !r2.signingShare) throw new Error("wrong round2 share");
					if (!merged[r2.identifier]) throw new Error("round1 share for " + r2.identifier + " is missing");
					merged[r2.identifier].signingShare = r2.signingShare;
				}
				if (Object.keys(merged).length !== authenticatedRound1.length) throw new Error("mismatch identifiers between rounds");
				let signingShare = Fn.ZERO;
				if (secret.commitment.length !== secret.signers.min) throw new Error("wrong commitments length");
				const localCommitment = secret.commitment.map(parsePoint);
				const localShare = polynomialEvaluate(secret.identifier, secret.coefficients);
				validateSecretShare(secret.identifier, localCommitment, localShare);
				const localCommitmentBytes = localCommitment.map(serializePoint);
				const commitments = { [serializeIdentifier(secret.identifier)]: localCommitmentBytes };
				for (const k in merged) {
					const v = merged[k];
					if (!v.signingShare || !v.commitment) throw new Error("mismatch identifiers");
					const id = parseIdentifier(k);
					const signingSharePart = Fn.fromBytes(v.signingShare);
					const commitment = v.commitment.map(parsePoint);
					validateSecretShare(secret.identifier, commitment, signingSharePart);
					signingShare = Fn.add(signingShare, signingSharePart);
					const idSer = serializeIdentifier(id);
					if (commitments[idSer]) throw new Error("duplicated id=" + idSer);
					commitments[idSer] = v.commitment;
				}
				signingShare = Fn.add(signingShare, localShare);
				const mergedCommitment = new Array(secret.signers.min).fill(Point.ZERO);
				for (const k in commitments) {
					const v = commitments[k];
					if (v.length !== secret.signers.min) throw new Error("wrong commitments length");
					for (let i = 0; i < v.length; i++) mergedCommitment[i] = mergedCommitment[i].add(parsePoint(v[i]));
				}
				const mergedCommitmentBytes = mergedCommitment.map(serializePoint);
				const verifyingShares = {};
				for (const k in commitments) verifyingShares[k] = serializePoint(evalutateVSS(parseIdentifier(k), mergedCommitment));
				let res = {
					public: {
						signers: {
							min: secret.signers.min,
							max: secret.signers.max
						},
						commitments: mergedCommitmentBytes,
						verifyingShares: Object.fromEntries(Object.entries(verifyingShares).map(([k, v]) => [k, v.slice()]))
					},
					secret: {
						identifier: serializeIdentifier(secret.identifier),
						signingShare: Fn.toBytes(signingShare)
					}
				};
				if (adjustDKG) res = adjustDKG(res);
				for (let i = 0; i < secret.coefficients.length; i++) secret.coefficients[i] -= secret.coefficients[i];
				delete secret.coefficients;
				delete secret.round1Cache;
				delete secret.round2Cache;
				secret.step = 3;
				return res;
			},
			clean(secret) {
				validateObject(secret, {
					identifier: "bigint",
					commitment: "object",
					signers: "object"
				}, {
					coefficients: "object",
					round1Cache: "object",
					round2Cache: "object",
					step: "number"
				}, "secret");
				secret.identifier -= secret.identifier;
				if (secret.coefficients) for (let i = 0; i < secret.coefficients.length; i++) secret.coefficients[i] -= secret.coefficients[i];
				delete secret.round1Cache;
				delete secret.round2Cache;
				secret.step = 3;
			}
		}),
		trustedDealer(signers, identifiers, secret, rng = randomBytes) {
			validateSigners(signers);
			if (identifiers === void 0) {
				identifiers = [];
				for (let i = 1; i <= signers.max; i++) identifiers.push(Identifier.fromNumber(i));
			} else {
				aarray(identifiers, "identifiers");
				if (identifiers.length !== signers.max) throw new Error("identifiers should be array of " + signers.max);
			}
			const identifierNums = {};
			for (const id of identifiers) {
				const idNum = parseIdentifier(id);
				if (id in identifierNums) throw new Error("duplicated id=" + id);
				identifierNums[id] = idNum;
			}
			const sp = generateSecretPolynomial(signers, secret, void 0, rng);
			const commitmentBytes = sp.commitment.map(serializePoint);
			const secretShares = {};
			const verifyingShares = {};
			for (const id of identifiers) {
				const signingShare = polynomialEvaluate(identifierNums[id], sp.coefficients);
				verifyingShares[id] = serializePoint(Point.BASE.multiply(signingShare));
				secretShares[id] = {
					identifier: id,
					signingShare: Fn.toBytes(signingShare)
				};
			}
			return {
				public: {
					signers: {
						min: signers.min,
						max: signers.max
					},
					commitments: commitmentBytes,
					verifyingShares
				},
				secretShares
			};
		},
		validateSecret(secret, pub) {
			validateObject(secret, {
				identifier: "string",
				signingShare: "object"
			}, {}, "secret");
			abytes(secret.signingShare, Fn.BYTES, "secret.signingShare");
			validateObject(pub, {
				signers: "object",
				commitments: "object",
				verifyingShares: "object"
			}, {}, "pub");
			validateSigners(pub.signers, "pub.signers");
			aarray(pub.commitments, "pub.commitments");
			validateSecretShare(parseIdentifier(secret.identifier), pub.commitments.map(parsePoint), Fn.fromBytes(secret.signingShare));
		},
		commit(secret, rng = randomBytes) {
			validateObject(secret, {
				identifier: "string",
				signingShare: "object"
			}, {}, "secret");
			abytes(secret.signingShare, Fn.BYTES, "secret.signingShare");
			if (typeof rng !== "function") throw new TypeError("\"rng\" expected function, got type=" + typeof rng);
			const secretScalar = Fn.fromBytes(secret.signingShare);
			const hiding = generateNonce(secretScalar, rng);
			const binding = generateNonce(secretScalar, rng);
			const nonces = {
				hiding: Fn.toBytes(hiding),
				binding: Fn.toBytes(binding)
			};
			return {
				nonces,
				commitments: nonceCommitments(secret.identifier, nonces)
			};
		},
		signShare(secret, pub, nonces, commitmentList, msg) {
			validateObject(secret, {
				identifier: "string",
				signingShare: "object"
			}, {}, "secret");
			abytes(secret.signingShare, Fn.BYTES, "secret.signingShare");
			validateObject(pub, {
				signers: "object",
				commitments: "object",
				verifyingShares: "object"
			}, {}, "pub");
			validateSigners(pub.signers, "pub.signers");
			aarray(pub.commitments, "pub.commitments");
			validateObject(nonces, {
				hiding: "object",
				binding: "object"
			}, {}, "nonces");
			abytes(nonces.hiding, Fn.BYTES, "nonces.hiding");
			abytes(nonces.binding, Fn.BYTES, "nonces.binding");
			aarray(commitmentList, "commitmentList");
			abytes(msg, void 0, "msg");
			validateCommitmentsNum(pub.signers, commitmentList.length);
			const hidingNonce0 = Fn.fromBytes(nonces.hiding);
			const bindingNonce0 = Fn.fromBytes(nonces.binding);
			if (Fn.is0(hidingNonce0) || Fn.is0(bindingNonce0)) throw new Error("signing nonces already used");
			const expectedCommitment = {
				identifier: secret.identifier,
				hiding: serializePoint(Point.BASE.multiply(hidingNonce0)),
				binding: serializePoint(Point.BASE.multiply(bindingNonce0))
			};
			const commitment = commitmentList.find((i) => i.identifier === secret.identifier);
			if (!commitment) throw new Error("missing signer commitment");
			if (bytesToHex(commitment.hiding) !== bytesToHex(expectedCommitment.hiding) || bytesToHex(commitment.binding) !== bytesToHex(expectedCommitment.binding)) throw new Error("incorrect signer commitment");
			if (adjustSecret) secret = adjustSecret(secret, pub);
			if (adjustPublic) pub = adjustPublic(pub);
			const SK = Fn.fromBytes(secret.signingShare);
			const { lambda, challenge, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, secret.identifier);
			const N = adjustNonces ? adjustNonces(groupCommitment, nonces) : nonces;
			const hidingNonce = adjustNonces ? Fn.fromBytes(N.hiding) : hidingNonce0;
			const bindingNonce = adjustNonces ? Fn.fromBytes(N.binding) : bindingNonce0;
			const t = Fn.mul(Fn.mul(lambda, SK), challenge);
			const t2 = Fn.mul(bindingNonce, bindingFactor);
			const r = Fn.toBytes(Fn.add(Fn.add(hidingNonce, t2), t));
			nonces.hiding.fill(0);
			nonces.binding.fill(0);
			return r;
		},
		verifyShare(pub, commitmentList, msg, identifier, sigShare) {
			validateObject(pub, {
				signers: "object",
				commitments: "object",
				verifyingShares: "object"
			}, {}, "pub");
			validateSigners(pub.signers, "pub.signers");
			aarray(pub.commitments, "pub.commitments");
			aarray(commitmentList, "commitmentList");
			abytes(msg, void 0, "msg");
			parseIdentifier(identifier);
			abytes(sigShare, Fn.BYTES, "sigShare");
			if (adjustPublic) pub = adjustPublic(pub);
			const comm = commitmentList.find((i) => i.identifier === identifier);
			if (!comm) throw new Error("cannot find identifier commitment");
			const PK = parsePoint(pub.verifyingShares[identifier]);
			const hidingNonceCommitment = parsePoint(comm.hiding);
			const bindingNonceCommitment = parsePoint(comm.binding);
			const { lambda, challenge, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, identifier);
			let commShare = hidingNonceCommitment.add(bindingNonceCommitment.multiplyUnsafe(bindingFactor));
			if (adjustGroupCommitmentShare) commShare = adjustGroupCommitmentShare(groupCommitment, commShare);
			const l = Point.BASE.multiplyUnsafe(Fn.fromBytes(sigShare));
			const r = commShare.add(PK.multiplyUnsafe(Fn.mul(challenge, lambda)));
			return l.equals(r);
		},
		aggregate(pub, commitmentList, msg, sigShares) {
			validateObject(pub, {
				signers: "object",
				commitments: "object",
				verifyingShares: "object"
			}, {}, "pub");
			validateSigners(pub.signers, "pub.signers");
			aarray(pub.commitments, "pub.commitments");
			aarray(commitmentList, "commitmentList");
			abytes(msg, void 0, "msg");
			validateObject(sigShares, {}, {}, "sigShares");
			const rawPub = pub;
			if (adjustPublic) pub = adjustPublic(pub);
			try {
				validateCommitmentsNum(pub.signers, commitmentList.length);
			} catch {
				throw new AggErr("aggregation failed", []);
			}
			const ids = commitmentList.map((i) => i.identifier);
			const seen = /* @__PURE__ */ new Set();
			for (const id of ids) {
				if (seen.has(id)) throw new AggErr("aggregation failed", []);
				seen.add(id);
			}
			if (ids.length !== Object.keys(sigShares).length) throw new AggErr("aggregation failed", []);
			for (const id of ids) if (!(id in sigShares) || !(id in pub.verifyingShares)) throw new AggErr("aggregation failed", []);
			const GPK = parsePoint(pub.commitments[0]);
			const { groupCommitment } = getGroupCommitment(GPK, commitmentList, msg);
			let z = Fn.ZERO;
			for (const id of ids) z = Fn.add(z, Fn.fromBytes(sigShares[id]));
			if (!Basic.verify(msg, groupCommitment, z, GPK)) {
				const cheaters = [];
				for (const id of ids) if (!this.verifyShare(rawPub, commitmentList, msg, id, sigShares[id])) cheaters.push(id);
				throw new AggErr("aggregation failed", cheaters);
			}
			return Signature.encode(groupCommitment, z);
		},
		sign(msg, secretKey) {
			let sk = Fn.fromBytes(secretKey);
			if (adjustScalar) sk = adjustScalar(sk);
			const [R, z] = Basic.sign(msg, sk);
			return Signature.encode(R, z);
		},
		verify(sig, msg, publicKey) {
			const PK = parsePublicKey ? validatePublicPoint(parsePublicKey(publicKey)) : parsePoint(publicKey);
			const { R, z } = Signature.decode(sig);
			return Basic.verify(msg, R, z, PK);
		},
		combineSecret(shares, signers) {
			aarray(shares, "shares");
			validateSigners(signers);
			if (shares.length < signers.min || shares.length > signers.max) throw new Error("wrong secret shares array");
			const points = [];
			const seen = {};
			for (const s of shares) {
				const idNum = parseIdentifier(s.identifier);
				const id = serializeIdentifier(idNum);
				if (seen[id]) throw new Error("duplicated id=" + id);
				seen[id] = true;
				points.push([idNum, Fn.fromBytes(s.signingShare)]);
			}
			const xCoords = points.map(([x]) => x);
			let res = Fn.ZERO;
			for (const [x, y] of points) res = Fn.add(res, Fn.mul(y, deriveInterpolatingValue(xCoords, x)));
			return Fn.toBytes(res);
		},
		utils: Object.freeze({
			Fn,
			randomScalar: (rng = randomBytes) => Fn.toBytes(genPointScalarPair(rng).scalar),
			generateSecretPolynomial: (signers, secret, coeffs, rng) => {
				const res = generateSecretPolynomial(signers, secret, coeffs, rng);
				return {
					...res,
					commitment: res.commitment.map(serializePoint)
				};
			}
		})
	};
	return Object.freeze(frost);
}
//#endregion
//#region node_modules/@noble/curves/abstract/montgomery.js
/**
* Montgomery curve methods. It's not really whole montgomery curve,
* just bunch of very specific methods for X25519 / X448 from
* [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n$1 = /* @__PURE__ */ BigInt(0);
const _1n$1 = /* @__PURE__ */ BigInt(1);
const _2n$1 = /* @__PURE__ */ BigInt(2);
/**
* Selector for cswap(): `P` to keep, `P + 1` to swap, chosen by the low bit of `swap`.
* Higher bits are ignored, and `swap` is passed in whole rather than as a {0n, 1n} bit on
* purpose: `P + (swap & _1n)` would short-circuit the addition whenever the bit is clear, which
* is the very leak this construction avoids, one round-trip further down. Subtracting `swap`
* with its low bit cleared keeps every operand full-width instead.
* @param P - Field modulus.
* @param swap - Value whose low bit selects; ignored above that bit.
* @returns `P` when the low bit is clear, `P + 1` when it is set.
*/
function cmask(P, swap) {
	return P + swap - (swap >> _1n$1 << _1n$1);
}
/**
* Swap two field elements when `mask` is `P + 1`, keep them when it is `P`:
*
*   d    = 6P + x_3 - x_2
*   x_2' = d * mask + x_2   (mod P)      x_3' = (x_2 + x_3) - x_2'
*
* The extra `6P * mask` vanishes modulo P, so `mask === P` leaves x_2 and `mask === P + 1`
* leaves x_3. Without the offset, the reduction dividend changes sign with input order and crosses
* BigInt limb boundaries; those classes measured differently on the tested Node/V8 build. For
* canonical inputs, the deliberately left-associative `offset + x_3 - x_2` is between 5P and 7P,
* keeping the dividend positive and in one word-count band for both RFC fields and masks. Six is
* the smallest coefficient `c` for which the shared offset `cP` has that property.
*
* This reduced the tested sign/size timing ratios, but JavaScript BigInt has no constant-time
* contract and the contents of the multiply and remainder still vary. Valid ladder states can
* contain genuine zero coordinates; this construction does not mask those value-shape effects.
* Computing `x_3'` independently as `((6P + x_2 - x_3) * mask + x_3) % P` is more symmetric.
* On the tested Node/V8 build, it reduced the timing difference between keeping `(0, v)` and
* swapping `(v, 0)`—both return `(0, v)`—from about 10%/13% for X25519/X448 to about 3%.
* Successful calls cannot reach that zero-in-the-first-output case. For the case they can reach,
* swapping `(0, v)` and keeping `(v, 0)` both return `(v, 0)`; the difference instead grew from
* about 0.7%/1.1% to 2.7%/2.8%. The extra multiply/remainder also made public
* `getSharedSecret()` about 16% slower. The retained one-remainder form measured about 2.5%
* slower than the prior helper for public X25519 `getSharedSecret()` in the same environment.
* x_3' falls out of the sum, which a swap leaves invariant: no second multiply or reduction is
* needed. Bind `6P` once per field so production and the timing regression exercise the same
* configured helper without paying for the multiplication in every ladder round.
*
* The returned function is called twice per ladder round, so it validates nothing. Both elements
* MUST already be reduced mod P; unreduced input silently corrupts the kept-side output.
* @param P - Field modulus.
* @returns A field-bound swap function taking mask, x_2, and x_3.
*/
function cswap(P) {
	const offset = BigInt(6) * P;
	return (mask, x_2, x_3) => {
		const sum = x_2 + x_3;
		const a = ((offset + x_3 - x_2) * mask + x_2) % P;
		return {
			x_2: a,
			x_3: sum - a
		};
	};
}
function validateOpts(curve) {
	validateObject(curve, {
		P: "bigint",
		type: "string",
		adjustScalarBytes: "function",
		powPminus2: "function"
	}, {
		randomBytes: "function",
		scalarMultBase: "function"
	});
	return Object.freeze({ ...curve });
}
/**
* @param curveDef - Montgomery curve definition.
* @returns ECDH helper namespace.
* @throws If the curve definition or derived shared point is invalid. {@link Error}
* @example
* Build an X25519 helper from curve parameters, then derive one public key.
*
* ```ts
* import { montgomery } from '@noble/curves/abstract/montgomery.js';
* const P = 2n ** 255n - 19n;
* const mod = (num: bigint) => {
*   const out = num % P;
*   return out >= 0n ? out : out + P;
* };
* const pow = (num: bigint, power: bigint) => {
*   let res = 1n;
*   for (; power > 0n; power >>= 1n) {
*     if (power & 1n) res = mod(res * num);
*     num = mod(num * num);
*   }
*   return res;
* };
* const x25519 = montgomery({
*   P,
*   type: 'x25519',
*   adjustScalarBytes(bytes: Uint8Array) {
*     bytes[0] &= 248;
*     bytes[31] &= 127;
*     bytes[31] |= 64;
*     return bytes;
*   },
*   powPminus2(x) {
*     return pow(x, P - 2n);
*   },
* });
* const publicKey = x25519.getPublicKey(new Uint8Array(32).fill(1));
* ```
*/
function montgomery(curveDef) {
	const CURVE = validateOpts(curveDef);
	const { P, type, adjustScalarBytes, powPminus2, randomBytes: rand } = CURVE;
	const mulBaseHook = CURVE.scalarMultBase;
	const is25519 = type === "x25519";
	if (!is25519 && type !== "x448") throw new Error("invalid type");
	const randomBytes_ = rand === void 0 ? randomBytes : rand;
	const montgomeryBits = is25519 ? 255 : 448;
	const swap = cswap(P);
	const fieldLen = is25519 ? 32 : 56;
	const Gu = is25519 ? BigInt(9) : BigInt(5);
	const a24 = is25519 ? BigInt(121665) : BigInt(39081);
	const minScalar = is25519 ? _2n$1 ** BigInt(254) : _2n$1 ** BigInt(447);
	const maxScalar = minScalar + (is25519 ? BigInt(8) * (_2n$1 ** BigInt(251) - _1n$1) : BigInt(4) * (_2n$1 ** BigInt(445) - _1n$1)) + _1n$1;
	const modP = (n) => mod(n, P);
	const GuBytes = encodeU(Gu);
	function encodeU(u) {
		return numberToBytesLE(modP(u), fieldLen);
	}
	function decodeU(u) {
		const _u = copyBytes(abytes(u, fieldLen, "uCoordinate"));
		if (is25519) _u[31] &= 127;
		return modP(bytesToNumberLE(_u));
	}
	function decodeScalar(scalar) {
		return bytesToNumberLE(adjustScalarBytes(copyBytes(abytes(scalar, fieldLen, "scalar"))));
	}
	/**
	* u coordinates whose order divides the cofactor, on the curve and on its quadratic twist -
	* the ladder sends every one of them to zero. Same blocklist libsodium and post-CVE-2017-0379
	* Libgcrypt carry. decodeU() reduces mod P first, so the non-canonical encodings P and P + 1
	* collapse onto 0 and 1, and `type` admits no curve beyond these two, so both lists are total.
	*
	* Complete by construction: x-only doubling sends u to (u^2 - 1)^2 / 4u(u^2 + a*u + 1). Order 4
	* therefore needs (u^2 - 1)^2 === 0, i.e. u = +-1; order 2 needs u(u^2 + a*u + 1) === 0, and
	* a^2 - 4 is a non-residue on both curves, leaving u = 0. curve448 stops there (cofactor 4);
	* curve25519 (cofactor 8) adds the two order-8 roots below. Cross-checked by clearing the
	* cofactor with those same doublings over 200k random u: no sixth value exists.
	*/
	const lowOrderU = new Set(is25519 ? [
		_0n$1,
		_1n$1,
		P - _1n$1,
		BigInt("325606250916557431795983626356110631294008115727848805560023387167927233504"),
		BigInt("39382357235489614581723060781553021112529911719440698176882885853963445705823")
	] : [
		_0n$1,
		_1n$1,
		P - _1n$1
	]);
	function scalarMult(scalar, u) {
		const pointU = decodeU(u);
		if (lowOrderU.has(pointU)) throw new Error("invalid private or public key received");
		const pu = montgomeryLadder(pointU, decodeScalar(scalar));
		if (pu === _0n$1) throw new Error("invalid private or public key received");
		return encodeU(pu);
	}
	function scalarMultBase(scalar) {
		if (mulBaseHook === void 0) return scalarMult(scalar, GuBytes);
		const k = decodeScalar(scalar);
		aInRange("scalar", k, minScalar, maxScalar);
		const pu = modP(mulBaseHook(k));
		if (pu === _0n$1) throw new Error("invalid private or public key received");
		return encodeU(pu);
	}
	const getPublicKey = scalarMultBase;
	const getSharedSecret = scalarMult;
	/**
	* Montgomery x-only multiplication ladder for the selected X25519/X448 curve.
	* @param pointU - decoded Montgomery u coordinate for the selected curve
	* @param scalar - decoded clamped scalar by which the point is multiplied
	* @returns resulting Montgomery u coordinate for the selected curve
	*/
	function montgomeryLadder(u, scalar) {
		aInRange("u", u, _0n$1, P);
		aInRange("scalar", scalar, minScalar, maxScalar);
		const k = scalar;
		const x_1 = u;
		let x_2 = _1n$1;
		let z_2 = _0n$1;
		let x_3 = u;
		let z_3 = _1n$1;
		const kx = k ^ k >> _1n$1;
		for (let t = BigInt(montgomeryBits - 1); t >= _0n$1; t--) {
			const mask = cmask(P, kx >> t);
			({x_2, x_3} = swap(mask, x_2, x_3));
			({x_2: z_2, x_3: z_3} = swap(mask, z_2, z_3));
			const A = x_2 + z_2;
			const AA = modP(A * A);
			const B = x_2 - z_2;
			const BB = modP(B * B);
			const E = AA - BB;
			const C = x_3 + z_3;
			const DA = modP((x_3 - z_3) * A);
			const CB = modP(C * B);
			const dacb = DA + CB;
			const da_cb = DA - CB;
			x_3 = modP(dacb * dacb);
			z_3 = modP(x_1 * modP(da_cb * da_cb));
			x_2 = modP(AA * BB);
			z_2 = modP(E * (AA + modP(a24 * E)));
		}
		const mask = cmask(P, k);
		({x_2, x_3} = swap(mask, x_2, x_3));
		({x_2: z_2, x_3: z_3} = swap(mask, z_2, z_3));
		const z2 = powPminus2(z_2);
		return modP(x_2 * z2);
	}
	const lengths = {
		secretKey: fieldLen,
		publicKey: fieldLen,
		seed: fieldLen
	};
	const randomSecretKey = (seed) => {
		seed = seed === void 0 ? randomBytes_(fieldLen) : seed;
		abytes(seed, lengths.seed, "seed");
		return seed;
	};
	const utils = { randomSecretKey };
	Object.freeze(lengths);
	Object.freeze(utils);
	return Object.freeze({
		keygen: createKeygen(randomSecretKey, getPublicKey),
		getSharedSecret,
		getPublicKey,
		scalarMult,
		scalarMultBase,
		utils,
		GuBytes: GuBytes.slice(),
		lengths
	});
}
//#endregion
//#region node_modules/@noble/curves/abstract/oprf.js
/**
* RFC 9497: Oblivious Pseudorandom Functions (OPRFs) Using Prime-Order Groups.
* https://www.rfc-editor.org/rfc/rfc9497
*

OPRF allows to interactively create an `Output = PRF(Input, serverSecretKey)`:

- Server cannot calculate Output by itself: it doesn't know Input
- Client cannot calculate Output by itself: it doesn't know server secretKey
- An attacker interception the communication can't restore Input/Output/serverSecretKey and can't
link Input to some value.

## Issues

- Low-entropy inputs (e.g. password '123') enable brute-forced dictionary attacks by the server
(solveable by domain separation in POPRF)
- High-level protocol needs to be constructed on top, because OPRF is low-level

## Use cases

1. **Password-Authenticated Key Exchange (PAKE):** Enables secure password login (e.g., OPAQUE)
without revealing the password to the server.
2. **Private Set Intersection (PSI):** Allows two parties to compute the intersection of their
private sets without revealing non-intersecting elements.
3. **Anonymous Credential Systems:** Supports issuance of anonymous, unlinkable credentials
(e.g., Privacy Pass) using blind OPRF evaluation.
4. **Private Information Retrieval (PIR):** Helps users query databases without revealing which
item they accessed.
5. **Encrypted Search / Secure Indexing:** Enables keyword search over encrypted data while keeping
queries private.
6. **Spam Prevention and Rate-Limiting:** Issues anonymous tokens to prevent abuse
(e.g., CAPTCHA bypass) without compromising user privacy.

## Modes

- OPRF: simple mode, client doesn't need to know server public key
- VOPRF: verifiable mode. It lets the client verify that the server used the
secret key corresponding to a known public key
- POPRF: partially oblivious mode, VOPRF + domain separation

There is also non-interactive mode (Evaluate), which creates Output
non-interactively with knowledge of the secret key.

Flow:
- (once) Server generates secret and public keys, distributes public keys to clients
- deterministically: `deriveKeyPair` or just random: `generateKeyPair`
- Client blinds input: `blind(secretInput)`
- Server evaluates blinded input: `blindEvaluate` generated by client, sends result to client
- Client creates output using result of evaluation via 'finalize'

* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _DST_scalarBytes = /* @__PURE__ */ asciiToBytes(_DST_scalar);
/**
* @param opts - OPRF ciphersuite options. See {@link OPRFOpts}.
* @returns OPRF helper namespace.
* @example
* Instantiate an OPRF suite from curve-specific hashing hooks.
*
* ```ts
* import { createOPRF } from '@noble/curves/abstract/oprf.js';
* import { p256, p256_hasher } from '@noble/curves/nist.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const oprf = createOPRF({
*   name: 'P256-SHA256',
*   Point: p256.Point,
*   hash: sha256,
*   hashToGroup: p256_hasher.hashToCurve,
*   hashToScalar: p256_hasher.hashToScalar,
* });
* const keys = oprf.oprf.generateKeyPair();
* ```
*/
function createOPRF(opts) {
	validateObject(opts, {
		name: "string",
		hash: "function",
		hashToScalar: "function",
		hashToGroup: "function"
	});
	validatePointCons(opts.Point);
	const { name, Point, hash, hashToGroup: hashToGroupHook, hashToScalar } = opts;
	const { Fn } = Point;
	const invertSecret = (value) => invertCt(value, Fn.ORDER);
	const hashToGroup = (msg, ctx) => hashToGroupHook(msg, { DST: concatBytes(asciiToBytes("HashToGroup-"), ctx) });
	const hashToScalarPrefixed = (msg, ctx) => hashToScalar(msg, { DST: concatBytes(_DST_scalarBytes, ctx) });
	const randomScalar = (rng = randomBytes) => {
		if (typeof rng !== "function") throw new TypeError("\"rng\" expected function, got type=" + typeof rng);
		const t = mapHashToField(rng(getMinHashLength(Fn.ORDER)), Fn.ORDER, Fn.isLE);
		return Fn.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
	};
	const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
	const getCtx = (mode) => concatBytes(asciiToBytes("OPRFV1-"), new Uint8Array([mode]), asciiToBytes("-" + name));
	const ctxOPRF = getCtx(0);
	const ctxVOPRF = getCtx(1);
	const ctxPOPRF = getCtx(2);
	function encode(...args) {
		const res = [];
		for (const a of args) if (typeof a === "number") res.push(numberToBytesBE(a, 2));
		else if (typeof a === "string") res.push(asciiToBytes(a));
		else {
			abytes(a);
			res.push(numberToBytesBE(a.length, 2), a);
		}
		return concatBytes(...res);
	}
	const inputBytes = (title, bytes) => {
		abytes(bytes, void 0, title);
		if (bytes.length > 65535) throw new Error(`"${title}" expected Uint8Array of length <= 65535, got length=${bytes.length}`);
		return bytes;
	};
	const hashInput = (...bytes) => hash(encode(...bytes, "Finalize"));
	function getTranscripts(B, C, D, ctx) {
		const seed = hash(encode(B.toBytes(), concatBytes(asciiToBytes("Seed-"), ctx)));
		const res = [];
		for (let i = 0; i < C.length; i++) {
			const Ci = C[i].toBytes();
			const Di = D[i].toBytes();
			const di = hashToScalarPrefixed(encode(seed, i, Ci, Di, "Composite"), ctx);
			res.push(di);
		}
		return res;
	}
	function computeComposites(B, C, D, ctx) {
		const T = getTranscripts(B, C, D, ctx);
		return {
			M: msm(C, T),
			Z: msm(D, T)
		};
	}
	function computeCompositesFast(k, B, C, D, ctx) {
		const M = msm(C, getTranscripts(B, C, D, ctx));
		return {
			M,
			Z: M.multiply(k)
		};
	}
	function challengeTranscript(B, M, Z, t2, t3, ctx) {
		const [Bm, a0, a1, a2, a3] = [
			B,
			M,
			Z,
			t2,
			t3
		].map((i) => i.toBytes());
		return hashToScalarPrefixed(encode(Bm, a0, a1, a2, a3, "Challenge"), ctx);
	}
	function generateProof(ctx, k, B, C, D, rng) {
		const { M, Z } = computeCompositesFast(k, B, C, D, ctx);
		const r = randomScalar(rng);
		const c = challengeTranscript(B, M, Z, Point.BASE.multiply(r), M.multiply(r), ctx);
		return concatBytes(...[c, Fn.sub(r, Fn.mul(c, k))].map((i) => Fn.toBytes(i)));
	}
	function verifyProof(ctx, B, C, D, proof) {
		abytes(proof, 2 * Fn.BYTES);
		const { M, Z } = computeComposites(B, C, D, ctx);
		const [c, s] = [proof.subarray(0, Fn.BYTES), proof.subarray(Fn.BYTES)].map((f) => Fn.fromBytes(f));
		const expectedC = challengeTranscript(B, M, Z, msm([Point.BASE, B], [s, c]), msm([M, Z], [s, c]), ctx);
		if (!Fn.eql(c, expectedC)) throw new Error("proof verification failed");
	}
	function generateKeyPair() {
		const skS = randomScalar();
		const pkS = Point.BASE.multiply(skS);
		return {
			secretKey: Fn.toBytes(skS),
			publicKey: pkS.toBytes()
		};
	}
	function deriveKeyPair(ctx, seed, info) {
		abytes(seed, 32, "seed");
		info = inputBytes("keyInfo", info);
		const dst = concatBytes(asciiToBytes("DeriveKeyPair"), ctx);
		const msg = concatBytes(seed, encode(info), Uint8Array.of(0));
		for (let counter = 0; counter <= 255; counter++) {
			msg[msg.length - 1] = counter;
			const skS = hashToScalar(msg, { DST: dst });
			if (Fn.is0(skS)) continue;
			return {
				secretKey: Fn.toBytes(skS),
				publicKey: Point.BASE.multiply(skS).toBytes()
			};
		}
		throw new Error("Cannot derive key");
	}
	const wirePoint = (label, bytes) => {
		const point = Point.fromBytes(bytes);
		if (point.equals(Point.ZERO)) throw new Error(label + " point at infinity");
		return point;
	};
	function blind(ctx, input, rng = randomBytes) {
		input = inputBytes("input", input);
		const blind = randomScalar(rng);
		const inputPoint = hashToGroup(input, ctx);
		if (inputPoint.equals(Point.ZERO)) throw new Error("Input point at infinity");
		const blinded = inputPoint.multiply(blind);
		return {
			blind: Fn.toBytes(blind),
			blinded: blinded.toBytes()
		};
	}
	function evaluate(ctx, secretKey, input) {
		input = inputBytes("input", input);
		const skS = Fn.fromBytes(secretKey);
		const inputPoint = hashToGroup(input, ctx);
		if (inputPoint.equals(Point.ZERO)) throw new Error("Input point at infinity");
		const unblinded = inputPoint.multiply(skS).toBytes();
		return hashInput(input, unblinded);
	}
	const oprf = Object.freeze({
		generateKeyPair,
		deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxOPRF, seed, keyInfo),
		blind: (input, rng = randomBytes) => blind(ctxOPRF, input, rng),
		blindEvaluate(secretKey, blindedPoint) {
			const skS = Fn.fromBytes(secretKey);
			return wirePoint("blinded", blindedPoint).multiply(skS).toBytes();
		},
		finalize(input, blindBytes, evaluatedBytes) {
			input = inputBytes("input", input);
			const blind = Fn.fromBytes(blindBytes);
			const unblinded = wirePoint("evaluated", evaluatedBytes).multiply(Fn.inv(blind)).toBytes();
			return hashInput(input, unblinded);
		},
		evaluate: (secretKey, input) => evaluate(ctxOPRF, secretKey, input)
	});
	const voprf = Object.freeze({
		generateKeyPair,
		deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxVOPRF, seed, keyInfo),
		blind: (input, rng = randomBytes) => blind(ctxVOPRF, input, rng),
		blindEvaluateBatch(secretKey, publicKey, blinded, rng = randomBytes) {
			if (!Array.isArray(blinded)) throw new Error("expected array");
			const skS = Fn.fromBytes(secretKey);
			const pkS = wirePoint("public key", publicKey);
			const blindedPoints = blinded.map((i) => wirePoint("blinded", i));
			const evaluated = blindedPoints.map((i) => i.multiply(skS));
			const proof = generateProof(ctxVOPRF, skS, pkS, blindedPoints, evaluated, rng);
			return {
				evaluated: evaluated.map((i) => i.toBytes()),
				proof
			};
		},
		blindEvaluate(secretKey, publicKey, blinded, rng = randomBytes) {
			const res = this.blindEvaluateBatch(secretKey, publicKey, [blinded], rng);
			return {
				evaluated: res.evaluated[0],
				proof: res.proof
			};
		},
		finalizeBatch(items, publicKey, proof) {
			if (!Array.isArray(items)) throw new Error("expected array");
			const pkS = wirePoint("public key", publicKey);
			const blindedPoints = items.map((i) => wirePoint("blinded", i.blinded));
			const evalPoints = items.map((i) => wirePoint("evaluated", i.evaluated));
			verifyProof(ctxVOPRF, pkS, blindedPoints, evalPoints, proof);
			return items.map((i, j) => {
				const input = inputBytes("input", i.input);
				const blind = Fn.fromBytes(i.blind);
				return hashInput(input, evalPoints[j].multiply(Fn.inv(blind)).toBytes());
			});
		},
		finalize(input, blind, evaluated, blinded, publicKey, proof) {
			return this.finalizeBatch([{
				input,
				blind,
				evaluated,
				blinded
			}], publicKey, proof)[0];
		},
		evaluate: (secretKey, input) => evaluate(ctxVOPRF, secretKey, input)
	});
	const poprf = (info) => {
		info = copyBytes(inputBytes("info", info));
		const m = hashToScalarPrefixed(encode("Info", info), ctxPOPRF);
		const T = Point.BASE.multiply(m);
		return Object.freeze({
			generateKeyPair,
			deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxPOPRF, seed, keyInfo),
			blind(input, publicKey, rng = randomBytes) {
				input = inputBytes("input", input);
				const pkS = wirePoint("public key", publicKey);
				const tweakedKey = T.add(pkS);
				if (tweakedKey.equals(Point.ZERO)) throw new Error("tweakedKey point at infinity");
				const blind = randomScalar(rng);
				const inputPoint = hashToGroup(input, ctxPOPRF);
				if (inputPoint.equals(Point.ZERO)) throw new Error("Input point at infinity");
				const blindedPoint = inputPoint.multiply(blind);
				return {
					blind: Fn.toBytes(blind),
					blinded: blindedPoint.toBytes(),
					tweakedKey: tweakedKey.toBytes()
				};
			},
			blindEvaluateBatch(secretKey, blinded, rng = randomBytes) {
				if (!Array.isArray(blinded)) throw new Error("expected array");
				const skS = Fn.fromBytes(secretKey);
				const t = Fn.add(skS, m);
				const invT = invertSecret(t);
				const blindedPoints = blinded.map((i) => wirePoint("blinded", i));
				const evalPoints = blindedPoints.map((i) => i.multiply(invT));
				const proof = generateProof(ctxPOPRF, t, Point.BASE.multiply(t), evalPoints, blindedPoints, rng);
				return {
					evaluated: evalPoints.map((i) => i.toBytes()),
					proof
				};
			},
			blindEvaluate(secretKey, blinded, rng = randomBytes) {
				const res = this.blindEvaluateBatch(secretKey, [blinded], rng);
				return {
					evaluated: res.evaluated[0],
					proof: res.proof
				};
			},
			finalizeBatch(items, proof, tweakedKey) {
				if (!Array.isArray(items)) throw new Error("expected array");
				const inputs = items.map((i) => inputBytes("input", i.input));
				const evalPoints = items.map((i) => wirePoint("evaluated", i.evaluated));
				verifyProof(ctxPOPRF, wirePoint("tweakedKey", tweakedKey), evalPoints, items.map((i) => wirePoint("blinded", i.blinded)), proof);
				return items.map((i, j) => {
					const blind = Fn.fromBytes(i.blind);
					const point = evalPoints[j].multiply(Fn.inv(blind)).toBytes();
					return hashInput(inputs[j], info, point);
				});
			},
			finalize(input, blind, evaluated, blinded, proof, tweakedKey) {
				return this.finalizeBatch([{
					input,
					blind,
					evaluated,
					blinded
				}], proof, tweakedKey)[0];
			},
			evaluate(secretKey, input) {
				input = inputBytes("input", input);
				const skS = Fn.fromBytes(secretKey);
				const inputPoint = hashToGroup(input, ctxPOPRF);
				if (inputPoint.equals(Point.ZERO)) throw new Error("Input point at infinity");
				const invT = invertSecret(Fn.add(skS, m));
				const unblinded = inputPoint.multiply(invT).toBytes();
				return hashInput(input, info, unblinded);
			}
		});
	};
	const res = {
		name,
		oprf,
		voprf,
		poprf,
		__tests: Object.freeze({
			Fn,
			invertSecret
		})
	};
	return Object.freeze(res);
}
//#endregion
//#region node_modules/@noble/curves/ed25519.js
/**
* ed25519 Twisted Edwards curve with following addons:
* - X25519 ECDH
* - Ristretto cofactor elimination
* - Elligator hash-to-group / point indistinguishability
* @module
*/
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n = /* @__PURE__ */ BigInt(0), _1n = /* @__PURE__ */ BigInt(1), _2n = /* @__PURE__ */ BigInt(2), _3n = /* @__PURE__ */ BigInt(3);
const _5n = /* @__PURE__ */ BigInt(5), _8n = /* @__PURE__ */ BigInt(8);
const ed25519_CURVE_p = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
const ed25519_CURVE = /* @__PURE__ */ (() => ({
	p: ed25519_CURVE_p,
	n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
	h: _8n,
	a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
	d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
	Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
	Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3(x) {
	const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
	const P = ed25519_CURVE_p;
	const b2 = x * x % P * x % P;
	const b5 = pow2(pow2(b2, _2n, P) * b2 % P, _1n, P) * x % P;
	const b10 = pow2(b5, _5n, P) * b5 % P;
	const b20 = pow2(b10, _10n, P) * b10 % P;
	const b40 = pow2(b20, _20n, P) * b20 % P;
	const b80 = pow2(b40, _40n, P) * b40 % P;
	return {
		pow_p_5_8: pow2(pow2(pow2(pow2(b80, _80n, P) * b80 % P, _80n, P) * b80 % P, _10n, P) * b10 % P, _2n, P) * x % P,
		b2
	};
}
function adjustScalarBytes(bytes) {
	bytes[0] &= 248;
	bytes[31] &= 127;
	bytes[31] |= 64;
	return bytes;
}
const ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio(u, v) {
	const P = ed25519_CURVE_p;
	const v3 = mod(v * v * v, P);
	const pow = ed25519_pow_2_252_3(u * mod(v3 * v3 * v, P)).pow_p_5_8;
	let x = mod(u * v3 * pow, P);
	const vx2 = mod(v * x * x, P);
	const root1 = x;
	const root2 = mod(x * ED25519_SQRT_M1, P);
	const useRoot1 = vx2 === u;
	const useRoot2 = vx2 === mod(-u, P);
	const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
	if (useRoot1) x = root1;
	if (useRoot2 || noRoot) x = root2;
	if (isNegativeLE(x, P)) x = mod(-x, P);
	return {
		isValid: useRoot1 || useRoot2,
		value: x
	};
}
const ed25519_Point = /* @__PURE__ */ edwards(ed25519_CURVE, { uvRatio });
const Fp = /* @__PURE__ */ (() => ed25519_Point.Fp)();
function toMontgomery(point) {
	const { y } = point;
	return Fp.toBytes(Fp.div(_1n + y, _1n - y));
}
function toMontgomerySecret(secretKey) {
	const size = ed25519_Point.Fp.BYTES;
	abytes$1(secretKey, size);
	return adjustScalarBytes(sha512(secretKey.subarray(0, size))).subarray(0, size);
}
const Fn = /* @__PURE__ */ (() => ed25519_Point.Fn)();
function ed25519_domain(data, ctx, phflag) {
	if (ctx.length > 255) throw new Error("Context is too big");
	return concatBytes$1(asciiToBytes("SigEd25519 no Ed25519 collisions"), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
}
function ed(opts) {
	return eddsa(ed25519_Point, sha512, Object.assign({
		adjustScalarBytes,
		toMontgomery,
		toMontgomerySecret,
		zip215: true
	}, opts));
}
/**
* ed25519 curve with EdDSA signatures.
* Seeded `keygen(seed)` / `utils.randomSecretKey(seed)` reuse the provided
* 32-byte seed buffer instead of copying it.
* @example
* Generate one Ed25519 keypair, sign a message, and verify it.
*
* ```js
* import { ed25519 } from '@noble/curves/ed25519.js';
* const { secretKey, publicKey } = ed25519.keygen();
* // const publicKey = ed25519.getPublicKey(secretKey);
* const msg = new TextEncoder().encode('hello noble');
* const sig = ed25519.sign(msg, secretKey);
* const isValid = ed25519.verify(sig, msg, publicKey); // ZIP215
* // RFC8032 / FIPS 186-5
* const isValid2 = ed25519.verify(sig, msg, publicKey, { zip215: false });
* ```
*/
const ed25519 = /* @__PURE__ */ ed({});
/**
* Context version of ed25519 (ctx for domain separation). See {@link ed25519}
* Seeded `keygen(seed)` / `utils.randomSecretKey(seed)` reuse the provided
* 32-byte seed buffer instead of copying it.
* @example
* Sign and verify with Ed25519ctx under one explicit context.
*
* ```ts
* const context = new TextEncoder().encode('docs');
* const { secretKey, publicKey } = ed25519ctx.keygen();
* const msg = new TextEncoder().encode('hello noble');
* const sig = ed25519ctx.sign(msg, secretKey, { context });
* const isValid = ed25519ctx.verify(sig, msg, publicKey, { context });
* ```
*/
const ed25519ctx = /* @__PURE__ */ ed({ domain: ed25519_domain });
/**
* Prehashed version of ed25519. See {@link ed25519}
* Seeded `keygen(seed)` / `utils.randomSecretKey(seed)` reuse the provided
* 32-byte seed buffer instead of copying it.
* @example
* Use the prehashed Ed25519 variant for one message.
*
* ```ts
* const { secretKey, publicKey } = ed25519ph.keygen();
* const msg = new TextEncoder().encode('hello noble');
* const sig = ed25519ph.sign(msg, secretKey);
* const isValid = ed25519ph.verify(sig, msg, publicKey);
* ```
*/
const ed25519ph = /* @__PURE__ */ ed({
	domain: ed25519_domain,
	prehash: sha512
});
/**
* FROST threshold signatures over ed25519. RFC 9591.
* @example
* Create one trusted-dealer package for 2-of-3 ed25519 signing.
*
* ```ts
* const alice = ed25519_FROST.Identifier.derive('alice@example.com');
* const bob = ed25519_FROST.Identifier.derive('bob@example.com');
* const carol = ed25519_FROST.Identifier.derive('carol@example.com');
* const deal = ed25519_FROST.trustedDealer({ min: 2, max: 3 }, [alice, bob, carol]);
* ```
*/
const ed25519_FROST = /* @__PURE__ */ (() => createFROST({
	name: "FROST-ED25519-SHA512-v1",
	Point: ed25519_Point,
	validatePoint: (p) => {
		p.assertValidity();
		if (!p.isTorsionFree()) throw new Error("bad point: not torsion-free");
	},
	hash: sha512,
	H2: ""
}))();
/**
* ECDH using curve25519 aka x25519.
* `getSharedSecret()` rejects low-order peer inputs by default, and seeded
* `keygen(seed)` reuses the provided 32-byte seed buffer instead of copying it.
* @example
* Derive one shared secret between two X25519 peers.
*
* ```js
* import { x25519 } from '@noble/curves/ed25519.js';
* const alice = x25519.keygen();
* const bob = x25519.keygen();
* const alicePublic = x25519.getPublicKey(alice.secretKey);
* const shared = x25519.getSharedSecret(alice.secretKey, bob.publicKey);
* ```
*/
const x25519 = /* @__PURE__ */ (() => {
	const P = ed25519_CURVE_p;
	const powPminus2 = (x) => {
		const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
		return mod(pow2(pow_p_5_8, _3n, P) * b2, P);
	};
	return montgomery({
		P,
		type: "x25519",
		powPminus2,
		adjustScalarBytes,
		scalarMultBase: (k) => {
			const kn = mod(k, ed25519_Point.Fn.ORDER);
			if (kn === _0n) return _0n;
			const p = ed25519_Point.BASE.multiply(kn);
			return mod((p.Z + p.Y) * powPminus2(mod(p.Z - p.Y, P)), P);
		}
	});
})();
const ELL2_C1 = /* @__PURE__ */ (() => (ed25519_CURVE_p + _3n) / _8n)();
const ELL2_C2 = /* @__PURE__ */ (() => Fp.pow(_2n, ELL2_C1))();
const ELL2_C3 = /* @__PURE__ */ (() => Fp.sqrt(Fp.neg(Fp.ONE)))();
const ELL2_J = /* @__PURE__ */ BigInt(486662);
/**
* RFC 9380 method `map_to_curve_elligator2_curve25519`. Experimental name: may be renamed later.
* @private
*/
function _map_to_curve_elligator2_curve25519(u) {
	let tv1 = Fp.sqr(u);
	tv1 = Fp.mul(tv1, _2n);
	let xd = Fp.add(tv1, Fp.ONE);
	let x1n = Fp.neg(ELL2_J);
	let tv2 = Fp.sqr(xd);
	let gxd = Fp.mul(tv2, xd);
	let gx1 = Fp.mul(tv1, ELL2_J);
	gx1 = Fp.mul(gx1, x1n);
	gx1 = Fp.add(gx1, tv2);
	gx1 = Fp.mul(gx1, x1n);
	let tv3 = Fp.sqr(gxd);
	tv2 = Fp.sqr(tv3);
	tv3 = Fp.mul(tv3, gxd);
	tv3 = Fp.mul(tv3, gx1);
	tv2 = Fp.mul(tv2, tv3);
	let y11 = ed25519_pow_2_252_3(tv2).pow_p_5_8;
	y11 = Fp.mul(y11, tv3);
	let y12 = Fp.mul(y11, ELL2_C3);
	tv2 = Fp.sqr(y11);
	tv2 = Fp.mul(tv2, gxd);
	let e1 = Fp.eql(tv2, gx1);
	let y1 = Fp.cmov(y12, y11, e1);
	let x2n = Fp.mul(x1n, tv1);
	let y21 = Fp.mul(y11, u);
	y21 = Fp.mul(y21, ELL2_C2);
	let y22 = Fp.mul(y21, ELL2_C3);
	let gx2 = Fp.mul(gx1, tv1);
	tv2 = Fp.sqr(y21);
	tv2 = Fp.mul(tv2, gxd);
	let e2 = Fp.eql(tv2, gx2);
	let y2 = Fp.cmov(y22, y21, e2);
	tv2 = Fp.sqr(y1);
	tv2 = Fp.mul(tv2, gxd);
	let e3 = Fp.eql(tv2, gx1);
	let xn = Fp.cmov(x2n, x1n, e3);
	let y = Fp.cmov(y2, y1, e3);
	let e4 = Fp.isOdd(y);
	y = Fp.cmov(y, Fp.neg(y), e3 !== e4);
	return {
		xMn: xn,
		xMd: xd,
		yMn: y,
		yMd: _1n
	};
}
const ELL2_C1_EDWARDS = /* @__PURE__ */ (() => FpSqrtEven(Fp, Fp.neg(BigInt(486664))))();
function map_to_curve_elligator2_edwards25519(u) {
	const { xMn, xMd, yMn, yMd } = _map_to_curve_elligator2_curve25519(u);
	let xn = Fp.mul(xMn, yMd);
	xn = Fp.mul(xn, ELL2_C1_EDWARDS);
	let xd = Fp.mul(xMd, yMn);
	let yn = Fp.sub(xMn, xMd);
	let yd = Fp.add(xMn, xMd);
	let tv1 = Fp.mul(xd, yd);
	let e = Fp.eql(tv1, Fp.ZERO);
	xn = Fp.cmov(xn, Fp.ZERO, e);
	xd = Fp.cmov(xd, Fp.ONE, e);
	yn = Fp.cmov(yn, Fp.ONE, e);
	yd = Fp.cmov(yd, Fp.ONE, e);
	const [xd_inv, yd_inv] = FpInvertBatch(Fp, [xd, yd], true);
	return {
		x: Fp.mul(xn, xd_inv),
		y: Fp.mul(yn, yd_inv)
	};
}
/**
* Hashing to ed25519 points / field. RFC 9380 methods.
* Public `mapToCurve()` returns the cofactor-cleared subgroup point; the
* internal map callback below consumes one field element bigint, not `[bigint]`.
* @example
* Hash one message onto the ed25519 curve.
*
* ```ts
* const point = ed25519_hasher.hashToCurve(new TextEncoder().encode('hello noble'));
* ```
*/
const ed25519_hasher = /* @__PURE__ */ (() => createHasher(ed25519_Point, (scalars) => map_to_curve_elligator2_edwards25519(scalars[0]), {
	DST: "edwards25519_XMD:SHA-512_ELL2_RO_",
	encodeDST: "edwards25519_XMD:SHA-512_ELL2_NU_",
	p: ed25519_CURVE_p,
	m: 1,
	k: 128,
	expand: "xmd",
	hash: sha512
}))();
const SQRT_M1 = ED25519_SQRT_M1;
const SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt("25063068953384623474111414158702152701244531502492656460079210482610430750235");
const INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt("54469307008909316920995813868745141605393597292927456921205312896311721017578");
const ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt("1159843021668779879193775521855586647937357759715417654439879720876111806838");
const D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt("40440834346308536858101042469323190826248399146238708352240133220865137265952");
const invertSqrt = (number) => uvRatio(_1n, number);
const MAX_255B = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const bytes255ToNumberLE = (bytes) => Fp.create(bytesToNumberLE(bytes) & MAX_255B);
/**
* Computes Elligator map for Ristretto255.
* Primary formula source is RFC 9496 §4.3.4 MAP; RFC 9380 Appendix B builds
* `hash_to_ristretto255` on top of this helper.
* Returns an internal Edwards representative, not a public `_RistrettoPoint`.
*/
function calcElligatorRistrettoMap(r0) {
	const { d } = ed25519_CURVE;
	const r = Fp.mul(Fp.mulN(SQRT_M1, r0), r0);
	const Ns = Fp.mul(Fp.addN(r, _1n), ONE_MINUS_D_SQ);
	let c = BigInt(-1);
	const D = Fp.mul(Fp.subN(c, Fp.mulN(d, r)), Fp.add(r, d));
	let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D);
	let s_ = Fp.mul(s, r0);
	if (!Fp.isOdd(s_)) s_ = Fp.neg(s_);
	if (!Ns_D_is_sq) s = s_;
	if (!Ns_D_is_sq) c = r;
	const Nt = Fp.sub(Fp.mulN(Fp.mulN(c, Fp.subN(r, _1n)), D_MINUS_ONE_SQ), D);
	const s2 = Fp.sqrN(s);
	const W0 = Fp.mul(Fp.addN(s, s), D);
	const W1 = Fp.mul(Nt, SQRT_AD_MINUS_ONE);
	const W2 = Fp.sub(_1n, s2);
	const W3 = Fp.add(_1n, s2);
	return new ed25519_Point(Fp.mul(W0, W3), Fp.mul(W2, W1), Fp.mul(W1, W3), Fp.mul(W0, W2));
}
/**
* Wrapper over Edwards Point for ristretto255.
*
* Each ed25519/EdwardsPoint has 8 different equivalent points. This can be
* a source of bugs for protocols like ring signatures. Ristretto was created to solve this.
* Ristretto point operates in X:Y:Z:T extended coordinates like EdwardsPoint,
* but it should work in its own namespace: do not combine those two.
* See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
*/
var _RistrettoPoint = class _RistrettoPoint extends PrimeEdwardsPoint {
	static BASE = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519_Point.BASE))();
	static ZERO = /* @__PURE__ */ (() => new _RistrettoPoint(ed25519_Point.ZERO))();
	static Fp = /* @__PURE__ */ (() => Fp)();
	static Fn = /* @__PURE__ */ (() => Fn)();
	constructor(ep) {
		super(ep);
	}
	/**
	* Create one Ristretto255 point from affine Edwards coordinates.
	* This wraps the internal Edwards representative directly and is not a
	* canonical ristretto255 decoding path.
	* Use `toBytes()` / `fromBytes()` if canonical ristretto255 bytes matter.
	*/
	static fromAffine(ap) {
		return new _RistrettoPoint(ed25519_Point.fromAffine(ap));
	}
	assertSame(other) {
		if (!(other instanceof _RistrettoPoint)) throw new Error("RistrettoPoint expected");
	}
	init(ep) {
		return new _RistrettoPoint(ep);
	}
	static fromBytes(bytes) {
		abytes$1(bytes, 32);
		const { a, d } = ed25519_CURVE;
		const s = bytes255ToNumberLE(bytes);
		if (!equalBytes(Fp.toBytes(s), bytes) || Fp.isOdd(s)) throw new Error("invalid ristretto255 encoding 1");
		const s2 = Fp.sqr(s);
		const u1 = Fp.add(_1n, Fp.mulN(a, s2));
		const u2 = Fp.sub(_1n, Fp.mulN(a, s2));
		const u1_2 = Fp.sqr(u1);
		const u2_2 = Fp.sqr(u2);
		const v = Fp.sub(Fp.mulN(Fp.mulN(a, d), u1_2), u2_2);
		const { isValid, value: I } = invertSqrt(Fp.mul(v, u2_2));
		const Dx = Fp.mul(I, u2);
		const Dy = Fp.mul(Fp.mulN(I, Dx), v);
		let x = Fp.mul(Fp.addN(s, s), Dx);
		if (Fp.isOdd(x)) x = Fp.neg(x);
		const y = Fp.mul(u1, Dy);
		const t = Fp.mul(x, y);
		if (!isValid || Fp.isOdd(t) || Fp.is0(y)) throw new Error("invalid ristretto255 encoding 2");
		return new _RistrettoPoint(new ed25519_Point(x, y, Fp.ONE, t));
	}
	/**
	* Converts ristretto-encoded string to ristretto point.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
	* @param hex - Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
	*/
	static fromHex(hex) {
		return _RistrettoPoint.fromBytes(hexToBytes$1(hex));
	}
	/**
	* Encodes ristretto point to Uint8Array.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
	*/
	toBytes() {
		let { X, Y, Z, T } = this.ep;
		const u1 = Fp.mul(Fp.add(Z, Y), Fp.sub(Z, Y));
		const u2 = Fp.mul(X, Y);
		const u2sq = Fp.sqr(u2);
		const { value: invsqrt } = invertSqrt(Fp.mul(u1, u2sq));
		const D1 = Fp.mul(invsqrt, u1);
		const D2 = Fp.mul(invsqrt, u2);
		const zInv = Fp.mul(Fp.mulN(D1, D2), T);
		let D;
		if (Fp.isOdd(Fp.mul(T, zInv))) {
			let _x = Fp.mul(Y, SQRT_M1);
			let _y = Fp.mul(X, SQRT_M1);
			X = _x;
			Y = _y;
			D = Fp.mul(D1, INVSQRT_A_MINUS_D);
		} else D = D2;
		if (Fp.isOdd(Fp.mul(X, zInv))) Y = Fp.neg(Y);
		let s = Fp.mul(Fp.subN(Z, Y), D);
		if (Fp.isOdd(s)) s = Fp.neg(s);
		return Fp.toBytes(s);
	}
	/**
	* Compares two Ristretto points.
	* Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
	*/
	equals(other) {
		this.assertSame(other);
		const { X: X1, Y: Y1 } = this.ep;
		const { X: X2, Y: Y2 } = other.ep;
		const one = Fp.eql(Fp.mul(X1, Y2), Fp.mul(Y1, X2));
		const two = Fp.eql(Fp.mul(Y1, Y2), Fp.mul(X1, X2));
		return one || two;
	}
	is0() {
		return this.equals(_RistrettoPoint.ZERO);
	}
};
/** Prime-order Ristretto255 group bundle. */
const ristretto255 = /* @__PURE__ */ (() => {
	Object.freeze(_RistrettoPoint.BASE);
	Object.freeze(_RistrettoPoint.ZERO);
	Object.freeze(_RistrettoPoint.prototype);
	Object.freeze(_RistrettoPoint);
	return Object.freeze({ Point: _RistrettoPoint });
})();
/**
* Hashing to ristretto255 points / field. RFC 9380 methods.
* `hashToCurve()` is RFC 9380 Appendix B, `deriveToCurve()` is the RFC 9496
* §4.3.4 element-derivation building block, and `hashToScalar()` is a
* library-specific helper for OPRF-style use.
* @example
* Hash one message onto ristretto255.
*
* ```ts
* const point = ristretto255_hasher.hashToCurve(new TextEncoder().encode('hello noble'));
* ```
*/
const ristretto255_hasher = /* @__PURE__ */ Object.freeze({
	Point: _RistrettoPoint,
	/**
	* Spec: https://www.rfc-editor.org/rfc/rfc9380.html#name-hashing-to-ristretto255. Caveats:
	* * There are no test vectors
	* * encodeToCurve / mapToCurve is undefined
	* * mapToCurve would be `calcElligatorRistrettoMap(scalars[0])`, not ristretto255_map!
	* * hashToScalar is undefined too, so we just use OPRF implementation
	* * We cannot re-use 'createHasher', because ristretto255_map is different algorithm/RFC
	(os2ip -> bytes255ToNumberLE)
	* * mapToCurve == calcElligatorRistrettoMap, hashToCurve == ristretto255_map
	* * hashToScalar is undefined in RFC9380 for ristretto, so we use the OPRF
	version here. Using `bytes255ToNumblerLE` will create a different result
	if we use `bytes255ToNumberLE` as os2ip
	* * current version is closest to spec.
	*/
	hashToCurve(msg, options) {
		const xmd = expand_message_xmd(msg, options?.DST === void 0 ? "ristretto255_XMD:SHA-512_R255MAP_RO_" : options.DST, 64, sha512);
		return ristretto255_hasher.deriveToCurve(xmd);
	},
	hashToScalar(msg, options) {
		const xmd = expand_message_xmd(msg, options?.DST === void 0 ? _DST_scalar : options.DST, 64, sha512);
		return Fn.create(bytesToNumberLE(xmd));
	},
	/**
	* HashToCurve-like construction based on RFC 9496 (Element Derivation).
	* Converts 64 uniform random bytes into a curve point.
	*
	* WARNING: This represents an older hash-to-curve construction from before
	* RFC 9380 was finalized.
	* It was later reused as a component in the newer
	* `hash_to_ristretto255` function defined in RFC 9380.
	*/
	deriveToCurve(bytes) {
		abytes$1(bytes, 64);
		const R1 = calcElligatorRistrettoMap(bytes255ToNumberLE(bytes.subarray(0, 32)));
		const R2 = calcElligatorRistrettoMap(bytes255ToNumberLE(bytes.subarray(32, 64)));
		return new _RistrettoPoint(R1.add(R2));
	}
});
/**
* ristretto255 OPRF/VOPRF/POPRF bundle, defined in RFC 9497.
* @example
* Run one blind/evaluate/finalize OPRF round over ristretto255.
*
* ```ts
* const input = new TextEncoder().encode('hello noble');
* const keys = ristretto255_oprf.oprf.generateKeyPair();
* const blind = ristretto255_oprf.oprf.blind(input);
* const evaluated = ristretto255_oprf.oprf.blindEvaluate(keys.secretKey, blind.blinded);
* const output = ristretto255_oprf.oprf.finalize(input, blind.blind, evaluated);
* ```
*/
const ristretto255_oprf = /* @__PURE__ */ (() => createOPRF({
	name: "ristretto255-SHA512",
	Point: _RistrettoPoint,
	hash: sha512,
	hashToGroup: ristretto255_hasher.hashToCurve,
	hashToScalar: ristretto255_hasher.hashToScalar
}))();
/**
* FROST threshold signatures over ristretto255. RFC 9591.
* @example
* Create one trusted-dealer package for 2-of-3 ristretto255 signing.
*
* ```ts
* const alice = ristretto255_FROST.Identifier.derive('alice@example.com');
* const bob = ristretto255_FROST.Identifier.derive('bob@example.com');
* const carol = ristretto255_FROST.Identifier.derive('carol@example.com');
* const deal = ristretto255_FROST.trustedDealer({ min: 2, max: 3 }, [alice, bob, carol]);
* ```
*/
const ristretto255_FROST = /* @__PURE__ */ (() => createFROST({
	name: "FROST-RISTRETTO255-SHA512-v1",
	Point: _RistrettoPoint,
	validatePoint: (p) => {
		p.assertValidity();
	},
	hash: sha512
}))();
/**
* Weird / bogus points, useful for debugging.
* All 8 ed25519 points of 8-torsion subgroup can be generated from the point
* T = `26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05`.
* The subgroup generated by `T` is `{ O, T, 2T, 3T, 4T, 5T, 6T, 7T }`; the
* array below is that set, not the powers in that exact index order.
* @example
* Decode one known torsion point for debugging.
*
* ```ts
* import { ED25519_TORSION_SUBGROUP, ed25519 } from '@noble/curves/ed25519.js';
* const point = ed25519.Point.fromHex(ED25519_TORSION_SUBGROUP[1]);
* ```
*/
const ED25519_TORSION_SUBGROUP = /* @__PURE__ */ Object.freeze([
	"0100000000000000000000000000000000000000000000000000000000000000",
	"c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a",
	"0000000000000000000000000000000000000000000000000000000000000080",
	"26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05",
	"ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
	"26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85",
	"0000000000000000000000000000000000000000000000000000000000000000",
	"c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa"
]);
//#endregion
export { ED25519_TORSION_SUBGROUP, _map_to_curve_elligator2_curve25519, ed25519, ed25519_FROST, ed25519_hasher, ed25519ctx, ed25519ph, ristretto255, ristretto255_FROST, ristretto255_hasher, ristretto255_oprf, x25519 };
