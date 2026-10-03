// @ts-nocheck
import { DestType, Destination, Identity, Link, MsgPack, toHex } from "./reticulum-core.js";
//#region node_modules/@reticulum/dacar/src/hlc.js
/**
* Hybrid Logical Clocks (Dacar spec §5.1).
*
* An HLC packs into a single 64-bit unsigned integer, transmitted big-endian:
*   high 48 bits: physical time (Unix epoch, milliseconds)
*   low 16 bits : logical counter
*
* Packed HLCs are represented as ECMAScript `bigint`, because
* `physical_ms << 16` exceeds `Number.MAX_SAFE_INTEGER` for any realistic
* timestamp.
*/
const PHYSICAL_BITS = 48n;
const LOGICAL_BITS = 16n;
/** @type {bigint} 0xFFFF */
const LOGICAL_MASK = (1n << LOGICAL_BITS) - 1n;
/** @type {bigint} 2^48 - 1 */
const MAX_PHYSICAL = (1n << PHYSICAL_BITS) - 1n;
/** @type {bigint} 2^16 - 1 */
const MAX_LOGICAL = LOGICAL_MASK;
/** @type {bigint} 2^64 - 1 */
const MAX_HLC = (1n << 64n) - 1n;
/**
* Pack a physical timestamp (ms) and logical counter into a 64-bit HLC.
* @param {number} physicalMs
* @param {number} logical
* @returns {bigint}
*/
function packHlc(physicalMs, logical) {
	if (!Number.isInteger(physicalMs) || physicalMs < 0 || BigInt(physicalMs) > MAX_PHYSICAL) throw new RangeError(`physicalMs must fit in 48 bits, got ${physicalMs}`);
	if (!Number.isInteger(logical) || logical < 0 || BigInt(logical) > MAX_LOGICAL) throw new RangeError(`logical must fit in 16 bits, got ${logical}`);
	return BigInt(physicalMs) << LOGICAL_BITS | BigInt(logical);
}
/**
* Unpack an HLC into its physical (ms) and logical parts (both safe Numbers).
* @param {bigint} hlc
* @returns {{ physicalMs: number, logical: number }}
*/
function unpackHlc(hlc) {
	if (typeof hlc !== "bigint" || hlc < 0n || hlc > MAX_HLC) throw new RangeError(`hlc must fit in 64 bits, got ${hlc}`);
	return {
		physicalMs: Number(hlc >> LOGICAL_BITS),
		logical: Number(hlc & LOGICAL_MASK)
	};
}
/**
* Current wall-clock time in milliseconds since the Unix epoch.
* @returns {number}
*/
function physicalNowMs() {
	return Date.now();
}
/**
* A process-local HLC generator producing monotonically non-decreasing
* timestamps, able to absorb remote HLCs observed during sync.
*/
var Clock = class {
	#lastMs = 0;
	#logical = 0;
	/**
	* Get the last physical timestamp (ms).
	* @returns {number}
	*/
	get lastMs() {
		return this.#lastMs;
	}
	/**
	* Get the current logical counter.
	* @returns {number}
	*/
	get logical() {
		return this.#logical;
	}
	/**
	* Restore the clock from a snapshot (for store persistence).
	* @param {{ lastMs: number, logical: number }} snap
	*/
	restore(snap) {
		if (!snap || typeof snap.lastMs !== "number" || typeof snap.logical !== "number") throw new Error("restore requires an object with lastMs and logical");
		this.#lastMs = snap.lastMs;
		this.#logical = snap.logical;
	}
	/** Obtain a snapshot for persistence. @returns {{ lastMs: number, logical: number }} */
	snapshot() {
		return {
			lastMs: this.#lastMs,
			logical: this.#logical
		};
	}
	/** Advance from a local event and return the new HLC. @returns {bigint} */
	now() {
		const phys = physicalNowMs();
		if (phys > this.#lastMs) {
			this.#lastMs = phys;
			this.#logical = 0;
		} else this.#logical += 1;
		return packHlc(this.#lastMs, this.#logical);
	}
	/**
	* Absorb a remote HLC observed during sync and return the new local HLC.
	* @param {bigint} remoteHlc
	* @returns {bigint}
	*/
	observe(remoteHlc) {
		const { physicalMs: rphys, logical: rlog } = unpackHlc(remoteHlc);
		const phys = physicalNowMs();
		if (phys > this.#lastMs && phys > rphys) {
			this.#lastMs = phys;
			this.#logical = 0;
		} else if (rphys > this.#lastMs) {
			this.#lastMs = rphys;
			this.#logical = rlog + 1;
		} else if (this.#lastMs > rphys) this.#logical += 1;
		else this.#logical = Math.max(this.#logical, rlog) + 1;
		return packHlc(this.#lastMs, this.#logical);
	}
};
//#endregion
//#region node_modules/@reticulum/dacar/src/namespace.js
/**
* Namespace Label Privacy (Dacar spec §3.3).
*
* To prevent label disclosure over public transports, Dacar never transmits or
* stores Object or Relation strings in plaintext. Every string label is hashed
* with **HMAC-SHA256**, keyed with the node's Privacy Salt, and strictly
* truncated to the first 16 bytes.
*
* Objects are split by `:` into segments, each hashed individually. The
* terminal suffix wildcard `*` is stripped *before* hashing and carried as a
* boolean flag on the Tuple (§3.3).
*
* > WARNING (§3.3): an unset Privacy Salt defaults to 32 null bytes, which is
* > *fail-open on privacy* — the hashes become trivially dictionary-attackable.
*
* Hashing uses the Web Crypto `HMAC`/`SHA-256` primitives, so all methods are
* asynchronous and runtime-portable (browsers, Node, Deno, Bun).
*/
const DELIMITER = ":";
const WILDCARD = "*";
/** Privacy Salts are 32 bytes of cryptographically secure random data. */
const SALT_SIZE = 32;
/** All label hashes (and RNS.Identity hashes) are 16 bytes. */
const HASH_SIZE = 16;
/** The fail-open default salt when none is configured (§3.3 WARNING). */
const DEFAULT_SALT = /* @__PURE__ */ new Uint8Array(32);
/** Maximum number of concurrently-configured Legacy Salts (§10.2). */
const MAX_LEGACY_SALTS = 2;
/** Domain-separation tag used to derive a salt's identifying `id_tag` (§8.3). */
const SALT_ID_TAG = new TextEncoder().encode("dacar.salt.id");
const encoder = new TextEncoder();
/**
* Split an object string into its colon-delimited segments.
* @param {string} objectId
* @returns {string[]}
*/
function split(objectId) {
	return objectId.split(":");
}
/**
* Return `{ segments, wildcard }` for an object string.
*
* The terminal `*` is stripped and reported via the wildcard flag:
*   - `"*"`          -> `{ segments: [], wildcard: true }`   (root wildcard)
*   - `"sensor:*"`   -> `{ segments: ["sensor"], wildcard: true }`
*   - `"sensor:wind"`-> `{ segments: ["sensor","wind"], wildcard: false }`
*
* A non-terminal `*` is treated as a literal segment.
* @param {string} objectId
* @returns {{ segments: string[], wildcard: boolean }}
*/
function parseObject(objectId) {
	if (objectId === "*") return {
		segments: [],
		wildcard: true
	};
	const segments = split(objectId);
	let wildcard = false;
	if (segments.length > 0 && segments[segments.length - 1] === "*") {
		wildcard = true;
		segments.pop();
	}
	return {
		segments,
		wildcard
	};
}
/**
* Truncate a 32-byte HMAC-SHA256 digest to the first 16 bytes (§3.3).
* @param {Uint8Array} digest
* @returns {Uint8Array}
*/
function truncate16(digest) {
	return digest.slice(0, 16);
}
var NamespaceHasher = class {
	/**
	* @param {Uint8Array} [salt] 32-byte Privacy Salt (defaults to fail-open nulls).
	*/
	constructor(salt = DEFAULT_SALT) {
		if (!(salt instanceof Uint8Array) || salt.length !== 32) throw new RangeError(`salt must be 32 bytes`);
		/** @readonly @type {Uint8Array} */
		this.salt = salt;
		/** Lazily-imported HMAC CryptoKey, shared across all sign calls. */
		this._keyPromise = null;
	}
	/** @returns {Promise<CryptoKey>} */
	_key() {
		if (!this._keyPromise) this._keyPromise = crypto.subtle.importKey("raw", this.salt, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["sign"]);
		return this._keyPromise;
	}
	/**
	* HMAC-SHA256(salt, relation) truncated to 16 bytes (§3.3).
	* @param {string} relation
	* @returns {Promise<Uint8Array>}
	*/
	async hashRelation(relation) {
		const key = await this._key();
		return truncate16(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(relation))));
	}
	/**
	* Return `{ hashes, wildcard }` for an object string (§3.3).
	* @param {string} objectId
	* @returns {Promise<{ hashes: Uint8Array[], wildcard: boolean }>}
	*/
	async hashObject(objectId) {
		const { segments, wildcard } = parseObject(objectId);
		const key = await this._key();
		return {
			hashes: await Promise.all(segments.map(async (seg) => {
				return truncate16(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(seg))));
			})),
			wildcard
		};
	}
	/**
	* A 16-byte tag identifying this salt (§8.3 `salt_id_tag`):
	* `HMAC-SHA256(salt, b"dacar.salt.id")` truncated to 16 bytes.
	* @returns {Promise<Uint8Array>}
	*/
	async idTag() {
		const key = await this._key();
		return truncate16(new Uint8Array(await crypto.subtle.sign("HMAC", key, SALT_ID_TAG)));
	}
};
/**
* Does a Tuple's hashed Object cover a request's exact hashed Object? (§3.3)
*
* A match succeeds if the Tuple is wildcarded and its hashes are a *prefix* of
* the request hashes, or if the two hash arrays are identical.
* @param {Uint8Array[]} tupleHashes
* @param {boolean} wildcard
* @param {Uint8Array[]} requestHashes
* @returns {boolean}
*/
function covers(tupleHashes, wildcard, requestHashes) {
	if (wildcard) {
		if (tupleHashes.length > requestHashes.length) return false;
		for (let i = 0; i < tupleHashes.length; i++) if (!bytesEqual(tupleHashes[i], requestHashes[i])) return false;
		return true;
	}
	if (tupleHashes.length !== requestHashes.length) return false;
	for (let i = 0; i < tupleHashes.length; i++) if (!bytesEqual(tupleHashes[i], requestHashes[i])) return false;
	return true;
}
/**
* Constant-time-ish byte comparison.
* @param {Uint8Array} a
* @param {Uint8Array} b
* @returns {boolean}
*/
function bytesEqual(a, b) {
	if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
//#endregion
//#region node_modules/@reticulum/dacar/src/tuple.js
/**
* The authorization Tuple and its canonical hash (Dacar spec §3.1, §6.1).
*
* A Tuple asserts that a Grantee holds a Relation over an Object, authorized by
* an Issuer: `(Object, Relation, Grantee, Issuer)`.
*
* For Namespace Label Privacy (§3.3), the Relation and Object are stored *only*
* as their 16-byte salted hashes. The **Tuple Hash** (§6.1) is SHA-256 over:
*
*   [16-byte Issuer] + [16-byte Grantee] + [16-byte Relation Hash]
*   + [1-byte Wildcard Flag] + [1-byte Segment Count] + [Object Hashes]
*
* Action and HLC are deliberately excluded, so a Grant and its Revoke for the
* same permission resolve to the *same* Tuple Hash. The pre-image is built
* synchronously and uniquely identifies a Tuple, so `toHex(preimage)` doubles as
* the CRDT's internal map key; the full async SHA-256 is available via `hash()`.
*/
/** Maximum number of Object segments (the Segment Count field is one byte). */
const MAX_SEGMENTS = 255;
/**
* @typedef {Object} HashedTupleInit
* @property {Uint8Array} relationHash 16-byte HMAC of the relation string.
* @property {Uint8Array[]} objectHashes 16-byte HMAC per non-wildcard segment.
* @property {boolean} wildcard True iff the Object ended in the suffix `*`.
* @property {Uint8Array} grantee 16-byte holder identity hash.
* @property {Uint8Array} issuer 16-byte issuer identity hash or Group ID.
*/
var Tuple = class Tuple {
	/** @param {HashedTupleInit} init */
	constructor({ relationHash, objectHashes, wildcard, grantee, issuer }) {
		if (!(relationHash instanceof Uint8Array) || relationHash.length !== 16) throw new RangeError(`relationHash must be 16 bytes`);
		if (!(grantee instanceof Uint8Array) || grantee.length !== 16) throw new RangeError(`grantee must be 16 bytes`);
		if (!(issuer instanceof Uint8Array) || issuer.length !== 16) throw new RangeError(`issuer must be 16 bytes`);
		if (objectHashes.length > 255) throw new RangeError(`too many object segments (${objectHashes.length} > 255)`);
		for (const h of objectHashes) if (!(h instanceof Uint8Array) || h.length !== 16) throw new RangeError(`object segment hash must be 16 bytes`);
		/** @readonly */ this.relationHash = relationHash;
		/** @readonly */ this.objectHashes = Object.freeze([...objectHashes]);
		/** @readonly */ this.wildcard = wildcard;
		/** @readonly */ this.grantee = grantee;
		/** @readonly */ this.issuer = issuer;
	}
	/**
	* Build a Tuple by hashing plaintext labels with `hasher` (§3.3).
	* @param {Object} opts
	* @param {string} opts.objectId
	* @param {string} opts.relation
	* @param {Uint8Array} opts.grantee
	* @param {Uint8Array} opts.issuer
	* @param {import("./namespace.js").NamespaceHasher} opts.hasher
	* @returns {Promise<Tuple>}
	*/
	static async fromPlaintext({ objectId, relation, grantee, issuer, hasher }) {
		const [relationHash, { hashes, wildcard }] = await Promise.all([hasher.hashRelation(relation), hasher.hashObject(objectId)]);
		return new Tuple({
			relationHash,
			objectHashes: hashes,
			wildcard,
			grantee,
			issuer
		});
	}
	/** §6.1 hash pre-image (excludes Action + HLC). @returns {Uint8Array} */
	get preimage() {
		let len = 50;
		for (const h of this.objectHashes) len += h.length;
		const out = new Uint8Array(len);
		let o = 0;
		out.set(this.issuer, o);
		o += 16;
		out.set(this.grantee, o);
		o += 16;
		out.set(this.relationHash, o);
		o += 16;
		out[o++] = this.wildcard ? 1 : 0;
		out[o++] = this.objectHashes.length;
		for (const h of this.objectHashes) {
			out.set(h, o);
			o += h.length;
		}
		return out;
	}
	/** Canonical 32-byte SHA-256 Tuple Hash (§6.1). @returns {Promise<Uint8Array>} */
	async hash() {
		const digest = await crypto.subtle.digest("SHA-256", this.preimage);
		return new Uint8Array(digest);
	}
	/** Stable unique key derived from the §6.1 pre-image (sync). @returns {string} */
	get key() {
		return toHex(this.preimage);
	}
	/** Structural equality with another Tuple. @param {Tuple} other @returns {boolean} */
	equals(other) {
		if (!(other instanceof Tuple)) return false;
		return bytesEqual(this.relationHash, other.relationHash) && this.objectHashes.length === other.objectHashes.length && this.objectHashes.every((h, i) => bytesEqual(h, other.objectHashes[i])) && this.wildcard === other.wildcard && bytesEqual(this.grantee, other.grantee) && bytesEqual(this.issuer, other.issuer);
	}
};
//#endregion
//#region node_modules/@reticulum/dacar/src/threshold.js
/**
* Threshold Trust Anchors: N-of-M identity groups (Dacar spec §4.1).
*
* A Threshold Group is a composite authority requiring consensus: an Operation
* issued *by* the group MUST carry exactly `N` valid signatures from `N`
* distinct members of the `M`-member set (§5.2).
*
* The **Group ID** is the SHA-256 hash of the alphabetically sorted member
* hashes concatenated with the threshold `N`, truncated to the first 16 bytes
* (§4.1). The Group ID is itself a 16-byte value usable wherever an Issuer hash
* is expected.
*
* > Scope (§4.1): in v1.0, Threshold Groups MAY ONLY act as Issuers.
*
* SHA-256 uses Web Crypto, so `groupId()` is asynchronous. Compute it once and
* cache the result (`group.id` after the first `await group.groupId()`).
*/
new TextEncoder();
/** The threshold `N` is folded into the Group ID as an 8-byte big-endian int. */
const THRESHOLD_BYTES = 8;
/** Compare two 16-byte member hashes for ascending sort (byte-wise === hex). */
function compareHashes(a, b) {
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return 0;
}
/** Synchronously validate member hashes and threshold (shared by all paths). */
function validateMembers(members, threshold) {
	if (!(Number.isInteger(threshold) && threshold >= 1 && threshold <= members.length)) throw new Error(`threshold must satisfy 1 <= N <= M (got N=${threshold}, M=${members.length})`);
	for (const m of members) if (!(m instanceof Uint8Array) || m.length !== 16) throw new RangeError(`member hash must be 16 bytes`);
	if (members.length < 2) throw new Error("a threshold group needs at least 2 members (M)");
}
/**
* Compute the 16-byte Group ID for a member set and threshold (§4.1).
*
* Members are 16-byte identity hashes, sorted ascending by raw byte value
* (equivalent to hex-alphabetical order). The threshold `N` is appended as an
* 8-byte big-endian unsigned integer, then SHA-256 of the whole blob is
* truncated to 16 bytes.
* @param {Uint8Array[]} members
* @param {number} threshold
* @returns {Promise<Uint8Array>}
*/
async function groupId(members, threshold) {
	const normalized = [...members].sort(compareHashes);
	validateMembers(normalized, threshold);
	const nBytes = new Uint8Array(THRESHOLD_BYTES);
	new DataView(nBytes.buffer).setBigUint64(0, BigInt(threshold), false);
	const total = normalized.length * 16 + THRESHOLD_BYTES;
	const blob = new Uint8Array(total);
	let o = 0;
	for (const m of normalized) {
		blob.set(m, o);
		o += 16;
	}
	blob.set(nBytes, o);
	const digest = await crypto.subtle.digest("SHA-256", blob);
	return new Uint8Array(digest).slice(0, 16);
}
var ThresholdGroup = class {
	/**
	* @param {Uint8Array[]} members M member identity hashes (16 bytes each).
	* @param {number} threshold The consensus threshold N.
	*/
	constructor(members, threshold) {
		validateMembers([...members], threshold);
		/** @readonly @type {Uint8Array[]} sorted ascending. */
		this.members = [...members].sort(compareHashes);
		/** @readonly */ this.threshold = threshold;
		/** Cached Group ID once computed. @type {Uint8Array | null} */
		this._id = null;
		this._idPromise = null;
	}
	/** The number of members `M`. @returns {number} */
	get size() {
		return this.members.length;
	}
	/** The 16-byte Group ID (cached after the first call). @returns {Promise<Uint8Array>} */
	groupId() {
		if (this._id) return Promise.resolve(this._id);
		if (!this._idPromise) this._idPromise = groupId(this.members, this.threshold).then((id) => {
			this._id = id;
			return id;
		});
		return this._idPromise;
	}
};
//#endregion
//#region node_modules/@reticulum/dacar/src/operation.js
/**
* Signed authorization Operations / Deltas (Dacar spec §5.2, §5.3).
*
* An Operation is a cryptographically signed instruction to Grant (Add) or
* Revoke (Remove) a Tuple. Ed25519 signing/verification is delegated to the
* `Identity` from `@reticulum/core` (Web Crypto), and transport serialization
* uses its MessagePack implementation.
*
* Single-identity issuers carry exactly one signature; Threshold Group issuers
* carry exactly `N` signatures from distinct members (§5.2).
*/
/** Ed25519 signatures are always 64 bytes. */
const SIGNATURE_SIZE = 64;
/** HLC timestamps travel as 64-bit big-endian unsigned integers. */
const HLC_BYTES = 8;
/**
* The effect of an Operation on the CRDT.
* @readonly
* @enum {number}
*/
const Action = {
	REVOKE: 0,
	GRANT: 1
};
/**
* @typedef {Object} OperationInit
* @property {Tuple} tuple
* @property {number} action One of {@link Action}.
* @property {bigint} hlc
* @property {Uint8Array[]} [signatures] 64-byte signatures (empty if unsigned).
*/
var Operation = class Operation {
	/** @param {OperationInit} init */
	constructor({ tuple, action, hlc, signatures = [] }) {
		if (action !== Action.GRANT && action !== Action.REVOKE) throw new TypeError("action must be Action.GRANT or Action.REVOKE");
		if (typeof hlc !== "bigint" || hlc < 0n || hlc > MAX_HLC) throw new RangeError("hlc must be a bigint in [0, 2^64)");
		if (!Array.isArray(signatures)) throw new TypeError("signatures must be an array");
		for (const sig of signatures) if (!(sig instanceof Uint8Array) || sig.length !== 64) throw new RangeError(`each signature must be 64 bytes`);
		this.tuple = tuple;
		this.action = action;
		this.hlc = hlc;
		/** @type {Uint8Array[]} */
		this.signatures = Object.freeze([...signatures]);
	}
	get issuer() {
		return this.tuple.issuer;
	}
	get grantee() {
		return this.tuple.grantee;
	}
	get relationHash() {
		return this.tuple.relationHash;
	}
	get objectHashes() {
		return this.tuple.objectHashes;
	}
	get wildcard() {
		return this.tuple.wildcard;
	}
	/** §5.2 signature pre-image. @returns {Uint8Array} */
	get preimage() {
		let len = 59;
		for (const h of this.tuple.objectHashes) len += h.length;
		const out = new Uint8Array(len);
		let o = 0;
		out.set(this.tuple.issuer, o);
		o += 16;
		out.set(this.tuple.grantee, o);
		o += 16;
		out[o++] = this.action;
		new DataView(out.buffer).setBigUint64(o, this.hlc, false);
		o += 8;
		out.set(this.tuple.relationHash, o);
		o += 16;
		out[o++] = this.tuple.wildcard ? 1 : 0;
		out[o++] = this.tuple.objectHashes.length;
		for (const h of this.tuple.objectHashes) {
			out.set(h, o);
			o += h.length;
		}
		return out;
	}
	/**
	* Return a copy signed with one or more `@reticulum/core` Identities holding
	* private keys. Each identity produces one signature, in argument order.
	* Pass one identity for a single-identity issuer, or `N` member identities for
	* a Threshold Group issuer (§5.2).
	* @param {...Identity} identities
	* @returns {Promise<Operation>}
	*/
	async sign(...identities) {
		if (identities.length === 0) throw new Error("at least one signing identity is required");
		const preimage = this.preimage;
		const signatures = await Promise.all(identities.map((id) => id.sign(preimage)));
		return new Operation({
			tuple: this.tuple,
			action: this.action,
			hlc: this.hlc,
			signatures
		});
	}
	/**
	* Coerce a public-key-like value into an `@reticulum/core` Identity.
	* @param {Identity | Uint8Array} value
	* @returns {Promise<Identity>}
	*/
	static async _asIdentity(value) {
		return value instanceof Identity ? value : await Identity.fromPublicKey(value);
	}
	/**
	* Verify a single-identity Operation against one public key (§5.2).
	* @param {Identity | Uint8Array} identityOrPublicKey
	* @returns {Promise<boolean>}
	*/
	async verify(identityOrPublicKey) {
		if (this.signatures.length !== 1) return false;
		return this.verifyThreshold([identityOrPublicKey], 1);
	}
	/**
	* Verify a Threshold Group Operation (§5.2, §4.1). Requires exactly
	* `threshold` signatures, each valid against a *distinct* member public key.
	* Duplicate signatures, or signatures verifying against the same public key
	* more than once, are rejected.
	* @param {(Identity | Uint8Array)[]} memberPublicKeys
	* @param {number} threshold
	* @returns {Promise<boolean>}
	*/
	async verifyThreshold(memberPublicKeys, threshold) {
		if (!(Number.isInteger(threshold) && threshold >= 1) || this.signatures.length !== threshold) return false;
		if (memberPublicKeys.length < threshold) return false;
		const preimage = this.preimage;
		/** @type {{ id: Identity, key: Uint8Array }[]} */
		const members = [];
		for (const v of memberPublicKeys) {
			const id = await Operation._asIdentity(v);
			members.push({
				id,
				key: await id.getPublicKey()
			});
		}
		const used = /* @__PURE__ */ new Set();
		for (const sig of this.signatures) {
			if (sig.length !== 64) return false;
			let matched = null;
			for (const m of members) {
				const hex = toHex(m.key);
				if (used.has(hex)) continue;
				if (await m.id.validate(sig, preimage)) {
					matched = hex;
					break;
				}
			}
			if (matched === null) return false;
			used.add(matched);
		}
		return used.size === threshold;
	}
	/**
	* Verify against a resolved `IssuerKeyset` (§11.2.4 bridge). A resolver maps
	* the Operation's 16-byte Issuer hash to a keyset; this confirms the
	* threshold signature against it.
	* @param {import("./verifier.js").IssuerKeyset} keyset
	* @returns {Promise<boolean>}
	*/
	async verifyKeyset(keyset) {
		return this.verifyThreshold(keyset.memberPublicKeys, keyset.threshold);
	}
	/** §5.3 transport payload (the Operation must be signed first). @returns {Uint8Array} */
	toPayload() {
		if (this.signatures.length === 0) throw new Error("Operation must be signed before payload serialization");
		return MsgPack.encode([
			this.tuple.issuer,
			this.tuple.grantee,
			this.action,
			this.hlc,
			this.tuple.relationHash,
			[...this.tuple.objectHashes],
			this.tuple.wildcard,
			[...this.signatures]
		]);
	}
	/**
	* Deserialize a §5.3 transport payload.
	* @param {Uint8Array} data
	* @returns {Operation}
	*/
	static fromPayload(data) {
		const decoded = MsgPack.decode(data);
		if (!Array.isArray(decoded) || decoded.length !== 8) throw new Error("payload must be an 8-element MessagePack array");
		const [issuer, grantee, action, hlc, relationHash, objectHashes, wildcard, signatures] = decoded;
		if (action !== Action.GRANT && action !== Action.REVOKE) throw new Error(`unknown action byte ${action}`);
		if (!Array.isArray(signatures) || signatures.length === 0) throw new Error("signatures must be a non-empty array of 64-byte blobs");
		return new Operation({
			tuple: new Tuple({
				relationHash: expectBytes$2(relationHash, 16, "relation_hash"),
				objectHashes: objectHashes.map((h) => expectBytes$2(h, 16, "object_hash")),
				wildcard: expectBool$1(wildcard, "wildcard"),
				grantee: expectBytes$2(grantee, 16, "grantee"),
				issuer: expectBytes$2(issuer, 16, "issuer")
			}),
			action,
			hlc: BigInt(hlc),
			signatures: signatures.map((s) => expectBytes$2(s, 64, "signature"))
		});
	}
};
/**
* @param {Uint8Array} value
* @param {number} len
* @param {string} name
* @returns {Uint8Array}
*/
function expectBytes$2(value, len, name) {
	if (!(value instanceof Uint8Array) || value.length !== len) throw new Error(`${name} must be a ${len}-byte Uint8Array`);
	return value;
}
/**
* @param {boolean} value
* @param {string} name
* @returns {boolean}
*/
function expectBool$1(value, name) {
	if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
	return value;
}
//#endregion
//#region node_modules/@reticulum/dacar/src/verifier.js
/**
* Verify-on-ingest: authenticating network Deltas by Ed25519 signature.
*
* The CRDT update itself (`StateVector.apply()`) is a *pure* mutation that
* trusts its caller; it deliberately performs no cryptography so the layering
* stays simple and the hot path stays fast. Network-received Deltas instead
* enter the state through `StateVector.ingest()`, which **must** authenticate
* each Operation against the claimed Issuer's public key(s) before it is
* allowed to mutate state (spec §11.2.4: *"The signature remains the sole
* source of authorization authenticity"*).
*
* This module bridges an Issuer hash to the public-key material needed to
* verify it:
*
*   - `IssuerKeyset`   — M public keys + a threshold (1 for a single identity,
*     N for a Threshold Group, §4.1).
*   - `KeyResolver`    — `issuerHash(16) -> IssuerKeyset | null | Promise`.
*   - `Keyring`        — a Map-backed resolver for offline / test use.
*   - `verifyOperation()` — resolve + verify, returning a plain boolean.
*
* Authentication is *not* authorization. Verifying a signature proves the
* Operation was genuinely issued by the claimed Issuer; whether that Issuer is
* itself authorized (its authority traces to a Root Trust Anchor) is resolved
* later by the Evaluation Engine (§7) against the converged CRDT state.
*/
/** The full RNS public key (X25519 ‖ Ed25519) is 64 raw bytes. */
const RNS_PUBLIC_KEY_SIZE = 64;
/**
* Public-key material needed to verify an Operation from one Issuer.
*
* A single-identity Issuer has `threshold === 1` and one member key; a
* Threshold Group Issuer (§4.1) has `threshold === N` and `M >= N` member keys.
* Each member key is the full 64-byte RNS public key returned by
* `Identity.getPublicKey()` (X25519 ‖ Ed25519), reconstructable via
* `Identity.fromPublicKey()`.
*/
var IssuerKeyset = class IssuerKeyset {
	/**
	* @param {Uint8Array[]} memberPublicKeys One (single identity) or M (group)
	*   64-byte RNS public keys.
	* @param {number} [threshold] Consensus threshold N (defaults to 1).
	*/
	constructor(memberPublicKeys, threshold = 1) {
		if (!(Number.isInteger(threshold) && threshold >= 1)) throw new Error("threshold must be a positive integer");
		if (!Array.isArray(memberPublicKeys) || memberPublicKeys.length < threshold) throw new Error("need at least `threshold` member public keys");
		const keys = [];
		for (const k of memberPublicKeys) {
			if (!(k instanceof Uint8Array) || k.length !== RNS_PUBLIC_KEY_SIZE) throw new RangeError(`RNS public keys are ${RNS_PUBLIC_KEY_SIZE} raw bytes`);
			keys.push(new Uint8Array(k));
		}
		/** @type {Uint8Array[]} */
		this.memberPublicKeys = Object.freeze(keys);
		/** @type {number} */
		this.threshold = threshold;
		Object.freeze(this);
	}
	/**
	* Keyset for a single-identity Issuer (threshold 1).
	* @param {Uint8Array} publicKey
	* @returns {IssuerKeyset}
	*/
	static single(publicKey) {
		return new IssuerKeyset([publicKey], 1);
	}
	/**
	* Keyset for an N-of-M Threshold Group Issuer (§4.1).
	* @param {Uint8Array[]} memberPublicKeys
	* @param {number} threshold
	* @returns {IssuerKeyset}
	*/
	static group(memberPublicKeys, threshold) {
		return new IssuerKeyset(memberPublicKeys, threshold);
	}
};
/**
* Resolves a 16-byte Issuer hash to its verification keyset, or `null` when the
* Issuer is unknown (the Operation is then rejected as unverifiable). May be
* async (e.g. backed by RNS Identity resolution over the network).
* @typedef {(issuerHash: Uint8Array) => (IssuerKeyset | null | Promise<IssuerKeyset | null>)} KeyResolver
*/
/**
* A Map-backed {@link KeyResolver} for offline and test use.
*
* Production nodes will typically back this with RNS Identity resolution
* (querying the network for the public key behind a 16-byte Identity hash);
* this in-memory implementation is sufficient for single-node reference
* deployments, air-gapped sneakernet, and the test suite.
*/
var Keyring = class {
	constructor() {
		/** @type {Map<string, IssuerKeyset>} */
		this._map = /* @__PURE__ */ new Map();
	}
	/**
	* Map a 16-byte Issuer hash to its `IssuerKeyset`.
	* @param {Uint8Array} issuerHash
	* @param {IssuerKeyset} keyset
	* @returns {Keyring}
	*/
	register(issuerHash, keyset) {
		this._map.set(toHex(_asHash(issuerHash)), keyset);
		return this;
	}
	/**
	* @param {Uint8Array} issuerHash
	* @param {Uint8Array} publicKey
	* @returns {Keyring}
	*/
	registerSingle(issuerHash, publicKey) {
		return this.register(issuerHash, IssuerKeyset.single(publicKey));
	}
	/**
	* @param {Uint8Array} groupId
	* @param {Uint8Array[]} memberPublicKeys
	* @param {number} threshold
	* @returns {Keyring}
	*/
	registerGroup(groupId, memberPublicKeys, threshold) {
		return this.register(groupId, IssuerKeyset.group(memberPublicKeys, threshold));
	}
	/**
	* @param {Uint8Array} issuerHash
	* @returns {IssuerKeyset | null}
	*/
	resolve(issuerHash) {
		return this._map.get(toHex(_asHash(issuerHash))) ?? null;
	}
	/**
	* Remove an Issuer from the keyring.
	* @param {Uint8Array} issuerHash
	* @returns {boolean} `true` if the Issuer was present (and is now removed).
	*/
	forget(issuerHash) {
		return this._map.delete(toHex(_asHash(issuerHash)));
	}
	/**
	* Return `[issuerHashHex, keyset]` pairs for all registered Issuers.
	* @returns {[string, IssuerKeyset][]}
	*/
	entries() {
		return [...this._map.entries()];
	}
	/** Number of registered Issuers. @returns {number} */
	get size() {
		return this._map.size;
	}
	/** @param {Uint8Array} issuerHash @returns {boolean} */
	has(issuerHash) {
		return this._map.has(toHex(_asHash(issuerHash)));
	}
};
/**
* Authenticate one Operation against its claimed Issuer (§5.2, §11.2.4).
*
* Returns `true` iff the Issuer hash is known to `resolver` *and* the Operation
* carries a valid threshold signature from the resolved keyset. An unknown
* Issuer or any cryptographic failure yields `false` — the Operation MUST be
* dropped rather than merged.
* @param {import("./operation.js").Operation} operation
* @param {KeyResolver | Keyring} resolver A function or a Keyring.
* @returns {Promise<boolean>}
*/
async function verifyOperation(operation, resolver) {
	const keyset = await resolveKeyset(resolver, operation.issuer);
	if (!keyset) return false;
	return operation.verifyKeyset(keyset);
}
/**
* @param {KeyResolver | Keyring} resolver
* @param {Uint8Array} hash
* @returns {Promise<IssuerKeyset | null>}
*/
async function resolveKeyset(resolver, hash) {
	if (typeof resolver === "function") return await resolver(hash);
	if (resolver && typeof resolver.resolve === "function") return resolver.resolve(hash);
	throw new TypeError("resolver must be a function or a Keyring");
}
/** @param {Uint8Array} value @returns {Uint8Array} */
function _asHash(value) {
	if (!(value instanceof Uint8Array) || value.length !== 16) throw new RangeError(`issuer hash must be 16 bytes`);
	return value;
}
//#endregion
//#region node_modules/@reticulum/dacar/src/delta.js
/**
* Transport-agnostic Delta receive boundary (spec §11.2.4).
*
* Every transport — RFed (§11.1), LXMF store-and-forward (§11.2), and optical
* Paper Messages (§11.3) — funnels incoming bytes through one identical path:
* decode the §5.3 Operation payload, authenticate it via verify-on-ingest
* (§5.2 / §11.2.4), and merge it into the CRDT. `DeltaReceiver` is that shared
* boundary. Malformed or unauthenticated Deltas are dropped silently rather
* than propagated into state or crashing a transport callback.
*
* This keeps the (optional) transport adapters thin: an adapter only has to
* hand received bytes to `DeltaReceiver.applyPayload()`, regardless of whether
* they arrived over RFed, LXMF, or a scanned QR code.
*/
var DeltaReceiver = class {
	/**
	* Decode -> verify -> apply incoming Delta payloads (§11.2.4).
	* @param {import("./crdt.js").StateVector} state
	* @param {import("./verifier.js").KeyResolver | import("./verifier.js").Keyring} keyResolver
	*/
	constructor(state, keyResolver) {
		this._state = state;
		this._resolver = keyResolver;
	}
	/**
	* Apply one wire-format Delta.
	*
	* Returns `true` iff the payload decoded, authenticated, and was applied to
	* the CRDT. Malformed payloads are swallowed (return `false`) — a transport
	* callback must never crash on arbitrary bytes. Signature and CRDT-level
	* rejection (unknown Issuer, bad sig, stale/future) is delegated to
	* `StateVector.ingest()`.
	* @param {Uint8Array} payload
	* @param {Object} [options]
	* @param {number} [options.nowMs]
	* @param {number | null} [options.maxFutureMs]
	* @returns {Promise<boolean>}
	*/
	async applyPayload(payload, options = {}) {
		let operation;
		try {
			operation = Operation.fromPayload(payload);
		} catch {
			return false;
		}
		return this._state.ingest(operation, this._resolver, options);
	}
	/**
	* Authenticate and apply a *batch* of Deltas (§11.1, §11.2.4).
	*
	* The secure alternative to `StateVector.merge()` for network sync.
	* `payload` is a MessagePack array of §5.3 Operation payloads
	* (`MsgPack.encode([opA.toPayload(), opB.toPayload(), ...])`); each element
	* is decoded and run through `applyPayload()`, i.e. it is independently
	* Ed25519/threshold-authenticated before it may touch state. A single
	* forged, stale (§9), or future-skewed (§12) element is dropped without
	* affecting the rest of the batch.
	*
	* Returns the number of Deltas authenticated *and* applied. A malformed
	* outer payload (not a MessagePack array, undecodable) yields `0` and is
	* swallowed, so a transport callback can never crash on arbitrary bytes —
	* exactly like `applyPayload()`.
	*
	* > **Warning:** This is the *only* safe entry point for full-state / bulk
	* > convergence received over the network. `StateVector.merge()` /
	* > `StateVector.fromPayload()` are trusted-local snapshot primitives that
	* > perform **no** signature verification and **must not** be fed network
	* > bytes.
	*
	* @param {Uint8Array} payload A MessagePack array of Operation payloads.
	* @param {Object} [options]
	* @param {number} [options.nowMs]
	* @param {number | null} [options.maxFutureMs]
	* @returns {Promise<number>}
	*/
	async applyPayloads(payload, options = {}) {
		let items;
		try {
			items = MsgPack.decode(payload);
		} catch {
			return 0;
		}
		if (!Array.isArray(items)) return 0;
		let applied = 0;
		for (const item of items) {
			if (!(item instanceof Uint8Array)) continue;
			if (await this.applyPayload(item, options)) applied += 1;
		}
		return applied;
	}
	/**
	* Encode a list of §5.3 Operation payloads as a batch (§11.1). Inverse of
	* `applyPayloads()`: `MsgPack.encode([...])` of already-signed Operation
	* payload byte-strings, suitable for publishing as one bulk sync message.
	* @param {Uint8Array[]} operationPayloads
	* @returns {Uint8Array}
	*/
	static packPayloads(operationPayloads) {
		return MsgPack.encode(operationPayloads.map((p) => new Uint8Array(p)));
	}
};
//#endregion
//#region node_modules/@reticulum/dacar/src/naming.js
/**
* RNS naming conventions for the Dacar policy plane (spec §8, §11).
*
* Pure, dependency-free constants. Two scopes:
*
*   - `RFED_TOPIC` is a *deployment-overridable default*. RFed is a broadcast
*     (many-to-many) medium, so deployments sharing an RNS network SHOULD set a
*     deployment-specific topic to isolate their policy feeds (verify-on-ingest
*     limits cross-feed damage, but not the bandwidth cost or the risk of
*     shared root anchors).
*   - `CHALLENGE_DESTINATION`, `SYNC_DESTINATION`, and `LXMF_DELIVERY_TITLE`
*     are *fixed discriminators*. The §8 Challenge, the §11 direct-link Delta
*     push, and §11.2 LXMF delivery are addressed point-to-point to a specific
*     Identity, so RNS derives isolation from the destination *hash* (which
*     embeds the target Identity), not from this name.
*
* Both the pure core and the (optional) transport adapters reference these, so
* the on-wire naming is defined in one place and stays consistent across
* language implementations. Transport adapters accept overrides (e.g.
* `topic = RFED_TOPIC`) for deployment-specific values.
*/
/** The RNS App Name under which all Dacar services live (§8, §11). */
const APP_NAME = "dacar";
/** Aspects of the §8 Authoritative Challenge destination (App `dacar`). */
const CHALLENGE_ASPECTS = Object.freeze(["auth", "v1"]);
/** The full dotted name of the §8 Authoritative Challenge destination. */
const CHALLENGE_DESTINATION = "dacar.auth.v1";
/**
* Aspects of the direct-link Delta ingestion destination (§11, work doc #16
* Phase 4a). A constrained node (e.g. an MCU running microReticulum) exposes
* this destination so a peer can push raw §5.3 Delta payloads to it over a
* Link request; the node ingests them through verify-on-ingest (§11.2.4),
* which makes any transport valid — the same precedent as optical Paper
* Messages (§11.3).
*/
const SYNC_ASPECTS = Object.freeze(["sync", "v1"]);
/**
* RFed topic for many-to-many CRDT convergence (§11.1). Deployment-overridable
* default — RFed is broadcast, so shared-network deployments SHOULD set a
* distinct topic to isolate their feeds.
*/
const RFED_TOPIC = "dacar.policy.v1";
/** LXMF message title for targeted Delta delivery (§11.2). */
const LXMF_DELIVERY_TITLE = "dacar/sync/delta";
//#endregion
//#region node_modules/@reticulum/dacar/src/config.js
/**
* Node configuration: trust anchors, salts, and thresholds (§4, §10).
*
* Every Dacar node is bootstrapped out-of-band with one or more Root Trust
* Anchors (single identities or Threshold Groups), a Privacy Salt (plus up to
* two Legacy Salts for rotation, §10), and optionally an Authoritative Identity
* for Strict Consistency (§8).
*/
/** Default deletion horizon H (days), see §9. */
const DEFAULT_DELETION_HORIZON_DAYS = 180;
const MS_PER_DAY$1 = 1440 * 60 * 1e3;
/**
* Guard ensuring the fail-open null-salt notice is logged at most once per
* process, so test suites and tooling that build many Configs are not flooded
* while still flagging the footgun at first startup.
*/
let __nullSaltWarned = false;
/**
* @typedef {Object} ConfigInit
* @property {Iterable<Uint8Array>} rootTrustAnchors One or more 16-byte hashes.
* @property {Uint8Array} [primarySalt] 32-byte Primary Privacy Salt.
* @property {Uint8Array[]} [legacySalts] Ordered Legacy Salts (≤ MAX_LEGACY_SALTS).
* @property {import("./threshold.js").ThresholdGroup[]} [thresholdGroups]
* @property {Uint8Array} [authoritativeIdentity] One identity for §8, or omit.
* @property {number} [deletionHorizonDays] Deletion horizon H (§9).
*/
var Config = class {
	/** @param {ConfigInit} init */
	constructor({ rootTrustAnchors, primarySalt = DEFAULT_SALT, legacySalts = [], thresholdGroups = [], authoritativeIdentity, deletionHorizonDays = 180 }) {
		const anchors = /* @__PURE__ */ new Set();
		for (const anchor of rootTrustAnchors) {
			if (!(anchor instanceof Uint8Array) || anchor.length !== 16) throw new TypeError(`trust anchor must be 16 bytes`);
			anchors.add(toHex(anchor));
		}
		if (anchors.size === 0) throw new Error("at least one Root Trust Anchor is required (§4.1)");
		/** @type {Set<string>} hex of each Root Trust Anchor. */
		this.rootTrustAnchors = anchors;
		if (!(primarySalt instanceof Uint8Array) || primarySalt.length !== 32) throw new TypeError(`primarySalt must be 32 bytes`);
		/** @type {Uint8Array} */
		this.primarySalt = primarySalt;
		if (legacySalts.length > 2) throw new Error(`at most 2 Legacy Salts are allowed (§10.2), got ${legacySalts.length}`);
		/** @type {Uint8Array[]} */
		this.legacySalts = legacySalts.map((s) => {
			if (!(s instanceof Uint8Array) || s.length !== 32) throw new TypeError(`each legacy salt must be 32 bytes`);
			return s;
		});
		/** @type {import("./threshold.js").ThresholdGroup[]} */
		this.thresholdGroups = [...thresholdGroups];
		if (authoritativeIdentity !== void 0) {
			if (!(authoritativeIdentity instanceof Uint8Array) || authoritativeIdentity.length !== 16) throw new TypeError(`authoritativeIdentity must be 16 bytes`);
			this.authoritativeIdentity = authoritativeIdentity;
		} else this.authoritativeIdentity = void 0;
		if (!(Number.isInteger(deletionHorizonDays) && deletionHorizonDays >= 1)) throw new Error("deletionHorizonDays must be >= 1");
		/** @type {number} */
		this.deletionHorizonDays = deletionHorizonDays;
		if (_isDefaultSalt(primarySalt) && !__nullSaltWarned) {
			__nullSaltWarned = true;
			console.warn("Config started with the default null Privacy Salt: label hashes are fail-open (trivially dictionary-attackable, §3.3). Set a strong random primarySalt for any real deployment.");
		}
	}
	/** Primary hasher, then Legacy hashers in order (§10.2). @returns {NamespaceHasher[]} */
	get hashers() {
		return [new NamespaceHasher(this.primarySalt), ...this.legacySalts.map((s) => new NamespaceHasher(s))];
	}
	/** @returns {NamespaceHasher} */
	get primaryHasher() {
		return new NamespaceHasher(this.primarySalt);
	}
	/** @param {Uint8Array} identityHash @returns {boolean} */
	isRootAnchor(identityHash) {
		return this.rootTrustAnchors.has(toHex(identityHash));
	}
	/**
	* The Threshold Group with the given Group ID, or undefined (§4.1). Async
	* because Group IDs are SHA-256 hashes (Web Crypto).
	* @param {Uint8Array} groupIdBytes
	* @returns {Promise<import("./threshold.js").ThresholdGroup | undefined>}
	*/
	async groupFor(groupIdBytes) {
		const target = toHex(groupIdBytes);
		for (const group of this.thresholdGroups) if (toHex(await group.groupId()) === target) return group;
	}
	/** Deletion horizon in milliseconds. @returns {number} */
	get deletionHorizonMs() {
		return this.deletionHorizonDays * MS_PER_DAY$1;
	}
};
/**
* @param {Uint8Array} salt
* @returns {boolean} `true` iff `salt` is the all-zero fail-open default.
*/
function _isDefaultSalt(salt) {
	return bytesEqual(salt, DEFAULT_SALT);
}
//#endregion
//#region node_modules/@reticulum/dacar/src/crdt.js
/**
* The authorization state: an LWW-Element-Set CRDT (§6).
*
* The global state maps a Tuple identity to an HLC timestamp, split into an Add
* set and a Remove set. A Tuple is active iff its Add timestamp is strictly
* greater than its Remove timestamp; ties resolve to removed (Remove wins).
*
* Storage is bounded by **Time-Horizon Tombstone Pruning** (§9): once a tuple
* resolves inactive *and* both its Add and Remove timestamps are older than the
* deletion horizon, both entries are silently deleted. Incoming Operations
* older than the horizon are rejected outright (intake rejection, §9).
*/
const MS_PER_DAY = 1440 * 60 * 1e3;
/** Operations more than this far in the future are rejected (§12). */
const DEFAULT_MAX_FUTURE_MS = MS_PER_DAY;
/**
* @typedef {Object} Entry
* @property {Tuple} tuple
* @property {bigint | null} addTs
* @property {bigint | null} removeTs
*/
/** @param {bigint | null} existing @param {bigint} incoming @returns {bigint} */
function maxTs(existing, incoming) {
	return existing === null ? incoming : existing > incoming ? existing : incoming;
}
/** @param {bigint | null} a @param {bigint | null} b @returns {bigint | null} */
function maxBoth(a, b) {
	if (a === null) return b;
	if (b === null) return a;
	return a > b ? a : b;
}
/**
* Guard ensuring the trusted-local-only notice for `StateVector.fromPayload()`
* is logged at most once per process, so legitimate snapshot/restore does not
* flood logs while still flagging the footgun the first time.
*/
let __trustedLocalWarned = false;
/** @param {number | bigint | null} value @returns {bigint | null} */
function normalizeTs(value) {
	return value === null ? null : BigInt(value);
}
var StateVector = class StateVector {
	/**
	* @param {Object} [opts]
	* @param {number} [opts.deletionHorizonDays] Deletion horizon H (§9).
	*/
	constructor({ deletionHorizonDays = 180 } = {}) {
		if (!(Number.isInteger(deletionHorizonDays) && deletionHorizonDays >= 1)) throw new Error("deletionHorizonDays must be >= 1");
		/** @type {Map<string, Entry>} */
		this._entries = /* @__PURE__ */ new Map();
		this.deletionHorizonDays = deletionHorizonDays;
	}
	/** Deletion horizon in milliseconds. @returns {number} */
	get deletionHorizonMs() {
		return this.deletionHorizonDays * MS_PER_DAY;
	}
	/** Number of distinct tuples known (active or revoked). @returns {number} */
	get size() {
		return this._entries.size;
	}
	/** @param {string} key @returns {boolean} */
	has(key) {
		return this._entries.has(key);
	}
	/** @param {string} key @returns {Entry | undefined} */
	get(key) {
		return this._entries.get(key);
	}
	/**
	* Authenticate then apply a network-received Delta (§11.2.4, §5.2).
	*
	* This is the secure entry point for Operations received over any transport
	* (RFed, LXMF, optical sneakernet). The Operation's Ed25519 signature(s)
	* MUST verify against the public key(s) resolved for its claimed Issuer
	* before the pure CRDT update (`apply()`) is allowed to mutate state. Any
	* authentication failure — unknown Issuer, bad signature, wrong threshold —
	* drops the Operation (returns `false`).
	*
	* Returns `true` iff authenticated *and* applied. Distinct from `apply()`,
	* which trusts its caller and performs no cryptography.
	* @param {import("./operation.js").Operation} operation
	* @param {import("./verifier.js").KeyResolver | import("./verifier.js").Keyring} keyResolver
	* @param {Object} [options]
	* @param {number} [options.nowMs]
	* @param {number | null} [options.maxFutureMs]
	* @returns {Promise<boolean>}
	*/
	async ingest(operation, keyResolver, options = {}) {
		if (!await verifyOperation(operation, keyResolver)) return false;
		return this.apply(operation, options);
	}
	/**
	* Apply one Operation (Delta) to the appropriate set (§6.1, §9, §12).
	* @param {import("./operation.js").Operation} operation
	* @param {Object} [options]
	* @param {number} [options.nowMs] Override the wall clock for testing.
	* @param {number | null} [options.maxFutureMs] Max clock skew; null disables.
	* @returns {boolean} true if applied, false if rejected.
	*/
	apply(operation, { nowMs, maxFutureMs = DEFAULT_MAX_FUTURE_MS } = {}) {
		const { physicalMs } = unpackHlc(operation.hlc);
		const now = nowMs ?? physicalNowMs();
		if (maxFutureMs !== null && physicalMs > now + maxFutureMs) return false;
		if (physicalMs < now - this.deletionHorizonMs) return false;
		const key = operation.tuple.key;
		let entry = this._entries.get(key);
		if (!entry) {
			entry = {
				tuple: operation.tuple,
				addTs: null,
				removeTs: null
			};
			this._entries.set(key, entry);
		}
		if (operation.action === Action.GRANT) entry.addTs = maxTs(entry.addTs, operation.hlc);
		else entry.removeTs = maxTs(entry.removeTs, operation.hlc);
		return true;
	}
	/**
	* Merge another StateVector by taking the max HLC per set per tuple (§6.1).
	*
	* > **Warning: Trusted-local-only — never feed network bytes.**
	* > `merge()` trusts its argument completely and performs **no** signature
	* > verification, so it can inject or alter authorization state (including
	* > Root Trust Anchor grants) for any tuple. It also skips the §9
	* > stale-horizon and §12 future-skew intake checks that `apply()`/`ingest()`
	* > enforce per-delta, so even a trusted source can silently reintroduce
	* > operations per-delta ingestion would have rejected.
	* >
	* > Legitimate uses are confined to a node's own trusted state: CRDT unit
	* > testing and restoring a snapshot previously produced by `toPayload()` on
	* > the *same* node. For network convergence use `DeltaReceiver.applyPayloads()`
	* > (a batch of signed Deltas) instead.
	* @param {StateVector} other
	*/
	merge(other) {
		for (const [key, otherEntry] of other._entries) {
			let entry = this._entries.get(key);
			if (!entry) {
				entry = {
					tuple: otherEntry.tuple,
					addTs: null,
					removeTs: null
				};
				this._entries.set(key, entry);
			}
			entry.addTs = maxBoth(entry.addTs, otherEntry.addTs);
			entry.removeTs = maxBoth(entry.removeTs, otherEntry.removeTs);
		}
	}
	/**
	* Run Time-Horizon Tombstone Pruning (§9). Deletes both the Add and Remove
	* entries for any tuple that resolves inactive *and* whose Add and Remove
	* timestamps are both older than the horizon. Returns the count pruned.
	* @param {Object} [opts]
	* @param {number} [opts.nowMs]
	* @returns {number}
	*/
	prune({ nowMs } = {}) {
		const cutoff = (nowMs ?? physicalNowMs()) - this.deletionHorizonMs;
		let pruned = 0;
		for (const [key, entry] of this._entries) {
			if (this._isActiveEntry(entry)) continue;
			const { addTs, removeTs } = entry;
			if (addTs === null || removeTs === null) continue;
			if (unpackHlc(addTs).physicalMs < cutoff && unpackHlc(removeTs).physicalMs < cutoff) {
				this._entries.delete(key);
				pruned += 1;
			}
		}
		return pruned;
	}
	/** @param {string} key @returns {boolean} */
	isActive(key) {
		const entry = this._entries.get(key);
		return entry !== void 0 && this._isActiveEntry(entry);
	}
	/** @param {Entry} entry @returns {boolean} */
	_isActiveEntry(entry) {
		return entry.addTs !== null && (entry.removeTs === null || entry.addTs > entry.removeTs);
	}
	/** Generator yielding every currently active Tuple. @returns {Generator<Tuple>} */
	*activeTuples() {
		for (const entry of this._entries.values()) if (this._isActiveEntry(entry)) yield entry.tuple;
	}
	/**
	* Serialize the full state vector as a MessagePack array of entries. Each
	* entry is `[relationHash(16), [objectHashes], wildcard_bool, grantee(16),
	* issuer(16), addTs | null, removeTs | null]`.
	*
	* > **Warning: Trusted-local-only.** The payload is an unauthenticated dump
	* > of this node's CRDT and carries **no** Ed25519 signature material; it
	* > exists for a node to snapshot *its own* state (e.g. a local backup or
	* > CRDT unit test). It MUST NOT be accepted from the network — deserialize
	* > such bytes only via your own trusted store, and if it ever crosses a
	* > trust boundary use `DeltaReceiver.applyPayloads()` (a batch of signed
	* > §5.3 Operations) instead.
	* @returns {Uint8Array}
	*/
	toPayload() {
		const rows = [];
		for (const entry of this._entries.values()) rows.push([
			entry.tuple.relationHash,
			[...entry.tuple.objectHashes],
			entry.tuple.wildcard,
			entry.tuple.grantee,
			entry.tuple.issuer,
			entry.addTs,
			entry.removeTs
		]);
		return MsgPack.encode(rows);
	}
	/**
	* Deserialize a state vector produced by `toPayload()`.
	*
	* > **Warning: Trusted-local-only — never feed network bytes.** The payload
	* > carries **no** signature material, so deserializing attacker bytes and
	* > then `merge()`-ing it lets a peer forge arbitrary authorization state
	* > (including Root Trust Anchor grants) and silently bypass the §9
	* > stale-horizon and §12 future-skew intake checks. Only deserialize bytes
	* > from your own trusted store (a snapshot you previously produced with
	* > `toPayload()` on this node). For network convergence use
	* > `DeltaReceiver.applyPayloads()` (a batch of signed §5.3 Operations)
	* > instead.
	* >
	* > A one-time `console.warn` is emitted to make this contract audible —
	* > unless `opts.trusted` is set, which a caller that has already asserted
	* > it is loading its own persisted snapshot (e.g. `DacarStore.loadState`)
	* > passes to keep normal CLI output free of developer-footgun noise.
	* @param {Uint8Array} data
	* @param {Object} [opts]
	* @param {number} [opts.deletionHorizonDays]
	* @param {boolean} [opts.trusted=false] Suppress the audible warning when the
	*   caller has asserted the bytes are a trusted-local snapshot (its own
	*   store). The JSDoc contract above still applies regardless.
	* @returns {StateVector}
	*/
	static fromPayload(data, { deletionHorizonDays = 180, trusted = false } = {}) {
		if (!trusted && !__trustedLocalWarned) {
			__trustedLocalWarned = true;
			console.warn("StateVector.fromPayload() is trusted-local-only: it performs no signature verification and must not be fed network bytes. For network convergence use DeltaReceiver.applyPayloads() instead.");
		}
		const rows = MsgPack.decode(data);
		if (!Array.isArray(rows)) throw new Error("state vector payload must be a MessagePack array");
		const state = new StateVector({ deletionHorizonDays });
		for (const row of rows) {
			if (!Array.isArray(row) || row.length !== 7) throw new Error("each state entry must be a 7-element array");
			const [relationHash, objectHashes, wildcard, grantee, issuer, addTs, removeTs] = row;
			const tuple = new Tuple({
				relationHash: expectBytes$1(relationHash, 16, "relation_hash"),
				objectHashes: objectHashes.map((h) => expectBytes$1(h, 16, "object_hash")),
				wildcard: expectBool(wildcard, "wildcard"),
				grantee: expectBytes$1(grantee, 16, "grantee"),
				issuer: expectBytes$1(issuer, 16, "issuer")
			});
			state._entries.set(tuple.key, {
				tuple,
				addTs: normalizeTs(addTs),
				removeTs: normalizeTs(removeTs)
			});
		}
		return state;
	}
};
/**
* @param {Uint8Array} value
* @param {number} len
* @param {string} name
* @returns {Uint8Array}
*/
function expectBytes$1(value, len, name) {
	if (!(value instanceof Uint8Array) || value.length !== len) throw new Error(`${name} must be a ${len}-byte Uint8Array`);
	return value;
}
/** @param {boolean} value @param {string} name @returns {boolean} */
function expectBool(value, name) {
	if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
	return value;
}
//#endregion
//#region node_modules/@reticulum/dacar/src/engine.js
/**
* The evaluation engine (§7).
*
* Resolves a plaintext request `(Object, Relation, Grantee)` against the local
* CRDT state and the recursive delegation graph, terminating at a Root Trust
* Anchor.
*
* Resolution (§7.3): DENY if any valid active Deny Tuple exists; else ALLOW if
* any valid active Allow Tuple exists; else DENY. "Valid" means the granting
* Issuer's authority traces back to a Root Trust Anchor (directly, or recursively
* via the reserved `admin` relation).
*
* Namespace Label Privacy (§3.3) means the engine never compares plaintext
* labels: it hashes the request with every configured salt (§10.2) and matches
* the byte arrays against hashed Tuples. The total-work bound (§7.2) is enforced
* *per request across all salt tracks simultaneously* (§10.2).
*
* Hashing (Web Crypto) is asynchronous, so `evaluate()` is async. To keep the
* recursive core fast and synchronous, every per-salt hash needed during
* evaluation — including the `admin`/`-admin` relation hashes used by authority
* recursion — is precomputed up front into a hypothesis object. The challenge
* server (§8) builds the same hypothesis objects straight from the wire and
* calls the synchronous `evaluateHashes()`.
*/
/** Maximum delegation hops in a single evaluation path (§7.2). */
const DEFAULT_MAX_DEPTH = 10;
/** Maximum evaluation steps (visited nodes) per request (§7.2). */
const DEFAULT_MAX_VISITED = 50;
/** The reserved relation that confers the authority to delegate (§3.2). */
const ADMIN_RELATION = "admin";
/**
* @typedef {Object} Hypothesis
* @property {import("./namespace.js").NamespaceHasher} hasher
* @property {Uint8Array[]} objectHashes Exact request object hashes for this salt.
* @property {Uint8Array} allowRelationHash HMAC of the requested relation.
* @property {Uint8Array} denyRelationHash HMAC of "-"+requested relation.
* @property {Uint8Array} adminAllowHash HMAC of "admin".
* @property {Uint8Array} adminDenyHash HMAC of "-admin".
*/
/**
* @typedef {Object} EngineOptions
* @property {number} [maxDepth]
* @property {number} [maxVisited]
*/
var Engine = class {
	/**
	* @param {import("./config.js").Config} config
	* @param {import("./crdt.js").StateVector} state
	* @param {EngineOptions} [options]
	*/
	constructor(config, state, options = {}) {
		this.config = config;
		this.state = state;
		this.maxDepth = options.maxDepth ?? 10;
		this.maxVisited = options.maxVisited ?? 50;
	}
	/**
	* Hash the plaintext request with every configured salt (§7.1, §10.2) and
	* resolve it. Returns true iff (object, relation, grantee) is ALLOWED.
	* @param {string} objectId
	* @param {string} relation
	* @param {Uint8Array} grantee
	* @returns {Promise<boolean>}
	*/
	async evaluate(objectId, relation, grantee) {
		const denyRelation = "-" + relation;
		const hypotheses = await Promise.all(this.config.hashers.map(async (hasher) => {
			const [objectHashes, allowRelationHash, denyRelationHash, adminAllowHash, adminDenyHash] = await Promise.all([
				hasher.hashObject(objectId),
				hasher.hashRelation(relation),
				hasher.hashRelation(denyRelation),
				hasher.hashRelation(ADMIN_RELATION),
				hasher.hashRelation("-admin")
			]);
			return {
				hasher,
				objectHashes: objectHashes.hashes,
				allowRelationHash,
				denyRelationHash,
				adminAllowHash,
				adminDenyHash
			};
		}));
		return this.evaluateHashes(grantee, hypotheses);
	}
	/**
	* Evaluate pre-hashed per-salt hypotheses (§7.3, §10.2). Synchronous: all
	* required hashes are already present in each hypothesis. The total-work bound
	* is shared across all hypotheses. Used by the §8 challenge server.
	* @param {Uint8Array} grantee
	* @param {Hypothesis[]} hypotheses
	* @returns {boolean}
	*/
	evaluateHashes(grantee, hypotheses) {
		/** @type {Map<string, import("./tuple.js").Tuple[]>} */
		const index = /* @__PURE__ */ new Map();
		toHex(grantee);
		for (const t of this.state.activeTuples()) {
			const g = toHex(t.grantee);
			const arr = index.get(g);
			if (arr) arr.push(t);
			else index.set(g, [t]);
		}
		/** @type {Map<string, boolean>} memo of positive authority results */
		const memo = /* @__PURE__ */ new Map();
		let counter = 0;
		const { config, maxDepth, maxVisited } = this;
		const hyps = [...hypotheses];
		/** @param {Hypothesis[]} hs @returns {string} */
		const objectKey = (hs) => hs.map((h) => toHex(h.hasher.salt) + "|" + h.objectHashes.map(toHex).join(".")).join(";");
		/**
		* @param {Uint8Array} issuer
		* @param {Hypothesis[]} hs
		* @param {number} depth
		* @param {Set<string>} visited
		* @returns {boolean}
		*/
		function authority(issuer, hs, depth, visited) {
			if (config.isRootAnchor(issuer)) return true;
			const key = toHex(issuer) + "|" + objectKey(hs);
			if (memo.has(key)) return memo.get(key);
			if (depth >= maxDepth) return false;
			const issuerHex = toHex(issuer);
			if (visited.has(issuerHex)) return false;
			const nextVisited = new Set(visited);
			nextVisited.add(issuerHex);
			const result = _resolve(hs.map((h) => ({
				hasher: h.hasher,
				objectHashes: h.objectHashes,
				allowRelationHash: h.adminAllowHash,
				denyRelationHash: h.adminDenyHash,
				adminAllowHash: h.adminAllowHash,
				adminDenyHash: h.adminDenyHash
			})), issuer, depth + 1, nextVisited) === "allow";
			if (result) memo.set(key, true);
			return result;
		}
		/**
		* @param {Hypothesis[]} hs
		* @param {Uint8Array} granteeId
		* @param {number} depth
		* @param {Set<string>} visited
		* @returns {"deny" | "allow" | "none"}
		*/
		function _resolve(hs, granteeId, depth, visited) {
			counter += 1;
			if (counter > maxVisited) return "none";
			const gid = toHex(granteeId);
			const candidates = index.get(gid) ?? [];
			let denyValid = false;
			let allowValid = false;
			for (const candidate of candidates) for (const h of hs) if (bytesEqualHash(candidate.relationHash, h.denyRelationHash)) {
				if (covers(candidate.objectHashes, candidate.wildcard, h.objectHashes)) {
					if (authority(candidate.issuer, hs, depth, visited)) denyValid = true;
				}
			} else if (bytesEqualHash(candidate.relationHash, h.allowRelationHash)) {
				if (covers(candidate.objectHashes, candidate.wildcard, h.objectHashes)) {
					if (authority(candidate.issuer, hs, depth, visited)) allowValid = true;
				}
			}
			if (denyValid) return "deny";
			if (allowValid) return "allow";
			return "none";
		}
		return _resolve(hyps, grantee, 0, /* @__PURE__ */ new Set()) === "allow";
	}
};
/** Fast hex-free 16-byte equality for relation hashes. @param {Uint8Array} a @param {Uint8Array} b @returns {boolean} */
function bytesEqualHash(a, b) {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
//#endregion
//#region node_modules/@reticulum/dacar/src/challenge.js
/**
* Strict Consistency Challenge / Freshness Receipts (§8).
*
* For destructive operations eventual consistency is dangerous. The node
* performs a local pre-check, then challenges a configured Authoritative
* Identity over an RNS link (App Name `dacar`, Aspects `auth`, `v1`) for a
* signed verdict evaluated against the server's absolute-latest CRDT state.
*
* To preserve Namespace Label Privacy (§3.3), the Challenge payload carries
* only *hashed* hypotheses — never plaintext. The client hashes the request
* across its Primary Salt and all Legacy Salts (§10); the server matches each by
* its `salt_id_tag` and evaluates directly in hash space.
*
* Canonical challenge wire format (§8.3):
*
*   [ nonce(32),
*     [ [ salt_id_tag(16), grantee_hash(16), allow_relation_hash(16),
*         deny_relation_hash(16), [object_segment_hashes] ],
*       ... ] ]
*
* Each entry is fully self-contained for one salt and carries *both* the allow
* and deny relation hashes so the Authority can apply the deny-beats-allow rule
* (§7.3) without recovering plaintext.
*
* The RNS transport is abstracted behind an async `transport` callable
* (`challengePayload -> receiptPayload | null`), so the cryptographic and
* verdict logic is testable without a live network. A transport that returns
* null or throws is a partition -> immediately DENIED (§8).
*/
/** Cryptographically secure challenge nonces are 32 bytes. */
const NONCE_SIZE = 32;
/** Ed25519 signatures are 64 bytes. */
const SIGNATURE_SIZE$1 = 64;
/**
* The binary verdict carried by a Freshness Receipt.
* @readonly
* @enum {number}
*/
const Verdict = {
	DENY: 0,
	ALLOW: 1
};
/**
* @typedef {Uint8Array | Identity} PublicKeyLike
*/
/**
* @param {PublicKeyLike} value
* @returns {Promise<Identity>}
*/
async function asIdentity(value) {
	return value instanceof Identity ? value : await Identity.fromPublicKey(value);
}
/** @param {Uint8Array} value @param {number} len @param {string} name @returns {Uint8Array} */
function expectBytes(value, len, name) {
	if (!(value instanceof Uint8Array) || value.length !== len) throw new Error(`${name} must be a ${len}-byte Uint8Array`);
	return value;
}
/**
* @typedef {Object} DecodedEntry
* @property {Uint8Array} saltIdTag
* @property {Uint8Array} granteeHash
* @property {Uint8Array} allowRelationHash
* @property {Uint8Array} denyRelationHash
* @property {Uint8Array[]} objectHashes
*/
/**
* @typedef {Object} DecodedChallenge
* @property {Uint8Array} nonce
* @property {Uint8Array} grantee
* @property {DecodedEntry[]} entries
*/
var Challenge = class Challenge {
	/**
	* @param {Object} init
	* @param {string} init.object Plaintext (held only on the client).
	* @param {string} init.relation Plaintext (held only on the client).
	* @param {Uint8Array} init.grantee 16-byte holder identity hash.
	* @param {Uint8Array} init.nonce 32-byte nonce.
	* @param {import("./namespace.js").NamespaceHasher[]} init.hashers Salts to hypothesize over.
	*/
	constructor({ object, relation, grantee, nonce, hashers }) {
		if (!(grantee instanceof Uint8Array) || grantee.length !== 16) throw new TypeError(`grantee must be 16 bytes`);
		if (!(nonce instanceof Uint8Array) || nonce.length !== 32) throw new TypeError(`nonce must be 32 bytes`);
		if (!Array.isArray(hashers) || hashers.length === 0) throw new TypeError("at least one salt hasher is required");
		this.object = object;
		this.relation = relation;
		this.grantee = grantee;
		this.nonce = nonce;
		this.hashers = [...hashers];
	}
	/**
	* Build a Challenge with a fresh (or supplied) cryptographically secure nonce.
	* @param {string} object
	* @param {string} relation
	* @param {Uint8Array} grantee
	* @param {import("./namespace.js").NamespaceHasher[]} hashers
	* @param {Object} [opts]
	* @param {Uint8Array} [opts.nonce]
	* @returns {Challenge}
	*/
	static generate(object, relation, grantee, hashers, { nonce } = {}) {
		return new Challenge({
			object,
			relation,
			grantee,
			nonce: nonce ?? crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)),
			hashers
		});
	}
	/** Serialize the hashed multi-salt challenge (§8.3). @returns {Promise<Uint8Array>} */
	async toPayload() {
		const denyRelation = "-" + this.relation;
		const entries = await Promise.all(this.hashers.map(async (hasher) => {
			const [saltIdTag, allowRelationHash, denyRelationHash, { hashes }] = await Promise.all([
				hasher.idTag(),
				hasher.hashRelation(this.relation),
				hasher.hashRelation(denyRelation),
				hasher.hashObject(this.object)
			]);
			return [
				saltIdTag,
				this.grantee,
				allowRelationHash,
				denyRelationHash,
				[...hashes]
			];
		}));
		return MsgPack.encode([this.nonce, entries]);
	}
	/**
	* Decode a challenge payload (§8.4). Plaintext is intentionally unrecoverable.
	* @param {Uint8Array} data
	* @returns {DecodedChallenge}
	*/
	static fromPayload(data) {
		const decoded = MsgPack.decode(data);
		if (!Array.isArray(decoded) || decoded.length !== 2) throw new Error("challenge payload must be a 2-element MessagePack array");
		const [nonce, entries] = decoded;
		const nonceBytes = expectBytes(nonce, 32, "nonce");
		if (!Array.isArray(entries)) throw new Error("challenge entries must be an array");
		/** @type {DecodedEntry[]} */
		const result = [];
		/** @type {Uint8Array | null} */
		let grantee = null;
		for (const entry of entries) {
			if (!Array.isArray(entry) || entry.length !== 5) throw new Error("each challenge entry must be a 5-element array");
			const [saltIdTag, granteeHash, allowRh, denyRh, objectHashes] = entry;
			if (!Array.isArray(objectHashes)) throw new Error("object_segment_hashes must be an array");
			const gh = expectBytes(granteeHash, 16, "grantee_hash");
			if (grantee === null) grantee = gh;
			else if (!bytesEqual(grantee, gh)) throw new Error("all challenge entries must share one grantee");
			result.push({
				saltIdTag: expectBytes(saltIdTag, 16, "salt_id_tag"),
				granteeHash: gh,
				allowRelationHash: expectBytes(allowRh, 16, "allow_relation_hash"),
				denyRelationHash: expectBytes(denyRh, 16, "deny_relation_hash"),
				objectHashes: objectHashes.map((h) => expectBytes(h, 16, "object_hash"))
			});
		}
		if (grantee === null) throw new Error("challenge must carry at least one entry");
		return {
			nonce: nonceBytes,
			grantee,
			entries: result
		};
	}
};
/**
* @typedef {Object} ReceiptInit
* @property {number} verdict One of {@link Verdict}.
* @property {bigint} serverHlc
* @property {Uint8Array} nonce
* @property {Uint8Array} [signature]
*/
var Receipt = class Receipt {
	/** @param {ReceiptInit} init */
	constructor({ verdict, serverHlc, nonce, signature = /* @__PURE__ */ new Uint8Array(0) }) {
		if (verdict !== Verdict.ALLOW && verdict !== Verdict.DENY) throw new TypeError("verdict must be Verdict.ALLOW or Verdict.DENY");
		if (typeof serverHlc !== "bigint" || serverHlc < 0n || serverHlc > MAX_HLC) throw new RangeError("serverHlc must be a bigint in [0, 2^64)");
		if (!(nonce instanceof Uint8Array) || nonce.length !== 32) throw new TypeError(`nonce must be 32 bytes`);
		if (!(signature instanceof Uint8Array) || signature.length !== 0 && signature.length !== SIGNATURE_SIZE$1) throw new RangeError(`signature must be 0 or ${SIGNATURE_SIZE$1} bytes`);
		this.verdict = verdict;
		this.serverHlc = serverHlc;
		this.nonce = nonce;
		this.signature = signature;
	}
	/** Unpadded concatenation of the fields preceding the signature (41 bytes). @returns {Uint8Array} */
	get preimage() {
		const hlcBytes = /* @__PURE__ */ new Uint8Array(8);
		new DataView(hlcBytes.buffer).setBigUint64(0, this.serverHlc, false);
		const out = /* @__PURE__ */ new Uint8Array(41);
		out[0] = this.verdict;
		out.set(hlcBytes, 1);
		out.set(this.nonce, 9);
		return out;
	}
	/** @param {Identity} identity @returns {Promise<Receipt>} */
	async sign(identity) {
		const signature = await identity.sign(this.preimage);
		return new Receipt({
			verdict: this.verdict,
			serverHlc: this.serverHlc,
			nonce: this.nonce,
			signature
		});
	}
	/** @param {PublicKeyLike} identityOrPublicKey @returns {Promise<boolean>} */
	async verify(identityOrPublicKey) {
		if (this.signature.length !== SIGNATURE_SIZE$1) return false;
		return (await asIdentity(identityOrPublicKey)).validate(this.signature, this.preimage);
	}
	/** @returns {Uint8Array} */
	toPayload() {
		if (this.signature.length !== SIGNATURE_SIZE$1) throw new Error("Receipt must be signed before payload serialization");
		return MsgPack.encode([
			this.verdict,
			this.serverHlc,
			this.nonce,
			this.signature
		]);
	}
	/** @param {Uint8Array} data @returns {Receipt} */
	static fromPayload(data) {
		const decoded = MsgPack.decode(data);
		if (!Array.isArray(decoded) || decoded.length !== 4) throw new Error("receipt payload must be a 4-element MessagePack array");
		const [verdict, serverHlc, nonce, signature] = decoded;
		if (verdict !== Verdict.ALLOW && verdict !== Verdict.DENY) throw new Error(`unknown verdict byte ${verdict}`);
		return new Receipt({
			verdict,
			serverHlc: BigInt(serverHlc),
			nonce: expectBytes(nonce, 32, "nonce"),
			signature: expectBytes(signature, SIGNATURE_SIZE$1, "signature")
		});
	}
};
/**
* Bind each decoded entry to a configured salt via its salt_id_tag (§8.4) and
* build the synchronous hypothesis objects the engine consumes.
* @param {import("./config.js").Config} config
* @param {DecodedChallenge} decoded
* @returns {Promise<import("./engine.js").Hypothesis[]>}
*/
async function buildHypotheses(config, decoded) {
	/** @type {Map<string, import("./namespace.js").NamespaceHasher>} */
	const byTag = /* @__PURE__ */ new Map();
	for (const hasher of config.hashers) byTag.set(toHex(await hasher.idTag()), hasher);
	/** @type {import("./engine.js").Hypothesis[]} */
	const hyps = [];
	for (const entry of decoded.entries) {
		const hasher = byTag.get(toHex(entry.saltIdTag));
		if (!hasher) continue;
		const [adminAllowHash, adminDenyHash] = await Promise.all([hasher.hashRelation("admin"), hasher.hashRelation("-admin")]);
		hyps.push({
			hasher,
			objectHashes: entry.objectHashes,
			allowRelationHash: entry.allowRelationHash,
			denyRelationHash: entry.denyRelationHash,
			adminAllowHash,
			adminDenyHash
		});
	}
	return hyps;
}
/** The Authoritative Identity: evaluates requests and signs Freshness Receipts. */
var AuthoritativeServer = class {
	/**
	* @param {Config} config
	* @param {import("./crdt.js").StateVector} state
	* @param {Identity} privateKey Identity holding the signing key.
	* @param {Object} [opts]
	* @param {Clock} [opts.clock]
	*/
	constructor(config, state, privateKey, { clock } = {}) {
		this._engine = new Engine(config, state);
		this._state = state;
		this._config = config;
		this._privateKey = privateKey;
		this._clock = clock ?? new Clock();
	}
	/** @param {Uint8Array} challengePayload @returns {Promise<Uint8Array>} */
	async handle(challengePayload) {
		const decoded = Challenge.fromPayload(challengePayload);
		const hypotheses = await buildHypotheses(this._config, decoded);
		return (await new Receipt({
			verdict: hypotheses.length > 0 && this._engine.evaluateHashes(decoded.grantee, hypotheses) ? Verdict.ALLOW : Verdict.DENY,
			serverHlc: this._clock.now(),
			nonce: decoded.nonce
		}).sign(this._privateKey)).toPayload();
	}
};
/**
* @callback Transport
* @param {Uint8Array} challengePayload
* @returns {Promise<Uint8Array | null> | Uint8Array | null}
*/
/** The requesting node: performs the local pre-check and the challenge exchange. */
var ChallengeClient = class {
	/**
	* @param {Config} config
	* @param {import("./crdt.js").StateVector} state
	* @param {PublicKeyLike} authoritativePublicKey
	* @param {Transport} transport
	*/
	constructor(config, state, authoritativePublicKey, transport) {
		if (config.authoritativeIdentity === void 0) throw new Error("Strict Consistency requires an Authoritative Identity (§8)");
		this._engine = new Engine(config, state);
		this._state = state;
		this._config = config;
		this._publicKey = authoritativePublicKey;
		this._transport = transport;
	}
	/**
	* Run the full §8 flow. Resolves true only on a verified server ALLOW.
	* @param {string} objectId
	* @param {string} relation
	* @param {Uint8Array} grantee
	* @returns {Promise<boolean>}
	*/
	async authorize(objectId, relation, grantee) {
		if (!await this._engine.evaluate(objectId, relation, grantee)) return false;
		const challenge = Challenge.generate(objectId, relation, grantee, this._config.hashers);
		let receiptPayload;
		try {
			receiptPayload = await Promise.resolve(this._transport(await challenge.toPayload()));
		} catch {
			return false;
		}
		if (receiptPayload === null || receiptPayload === void 0) return false;
		const receipt = Receipt.fromPayload(receiptPayload);
		if (!bytesEqual(receipt.nonce, challenge.nonce)) return false;
		if (!await receipt.verify(this._publicKey)) return false;
		return receipt.verdict === Verdict.ALLOW;
	}
};
//#endregion
//#region node_modules/@reticulum/dacar/src/index.js
/**
* Dacar: Decentralized Access Control for Reticulum (JavaScript reference impl).
*
* A tuple-based, offline-first authorization policy plane built on an
* LWW-Element-Set CRDT, designed for delay-tolerant mesh networks.
*
* Object and relation labels are stored only as salted HMAC-SHA256 hashes
* (§3.3 Namespace Label Privacy), Threshold Groups may act as N-of-M Issuers
* (§4.1), and the state is bounded by Time-Horizon Tombstone Pruning (§9).
*/
const __version__ = "1.5.0";
const __specVersion__ = "1.0-RC7";
//#endregion
//#region node_modules/@reticulum/dacar/src/transport/rnsChallenge.js
/**
* §8 Strict Consistency Challenge over a real RNS Link.
*
* Optional transport wiring around the already pure-and-tested §8 logic
* (`Challenge`, `AuthoritativeServer`, `Receipt`, `ChallengeClient` from
* `../challenge.js`). Three pieces:
*
*   - `challengeRequestHandler(server)` builds the response_generator a server
*     registers on the `dacar.auth.v1` destination: it feeds each incoming
*     challenge payload to `AuthoritativeServer.handle()` and returns the
*     signed Freshness Receipt bytes (or nothing on a malformed challenge).
*   - `RnsChallengeServer` exposes an Authoritative Identity on
*     `dacar.auth.v1`, accepts Links, and registers that handler.
*   - `RnsLinkTransport` is the client-side
*     {@link import("../challenge.js").Transport Transport} callable: it sends
*     a challenge payload over an established Link and awaits the signed
*     receipt, returning `null` on timeout/partition (which §8 treats as DENY).
*   - `establishLink()` opens a Link and awaits ACTIVE.
*
* The Dacar-specific glue (handler wrapping, partition → DENY) is covered by
* injected-fake unit tests; the pure §8 protocol is covered by
* `test/challenge.test.js`.
*
* This module is part of the optional transport layer: importing the pure core
* never pulls it in. It depends only on `@reticulum/core` (Destination, Link),
* which the core already depends on.
*/
/** Default Link establishment timeout in milliseconds (§8.2). */
const DEFAULT_ESTABLISH_TIMEOUT_MS = 15e3;
/**
* Opens an RNS Link to `destination` and awaits ACTIVE (§8.2).
*
* @param {DestinationType} destination An OUT destination whose identity is the
*   authoritative responder.
* @param {Object} [opts]
* @param {number} [opts.timeoutMs] Establishment timeout in milliseconds.
* @returns {Promise<LinkType | null>} The active Link, or `null` if it could
*   not be established within `timeoutMs` (partition → §8 DENY).
*/
async function establishLink(destination, { timeoutMs = DEFAULT_ESTABLISH_TIMEOUT_MS } = {}) {
	let link;
	try {
		link = await Link.initiate(destination, destination.interfaceLayer.transport);
		return await link.whenActive(timeoutMs);
	} catch {
		if (link) try {
			await link.teardown();
		} catch {}
		return null;
	}
}
//#endregion
//#region node_modules/@reticulum/dacar/src/transport/rnsSync.js
/**
* Direct-link Delta push over a real RNS Link (§11, work doc #16 Phase 4a).
*
* Optional transport wiring around the already pure-and-tested receive
* boundary (`DeltaReceiver` from `../delta.js`). The use case is a constrained
* node — e.g. an MCU running microReticulum — that cannot subscribe to rfed or
* run an LXMF router: it exposes the `dacar.sync.v1` destination, and a peer
* pushes raw §5.3 Delta payloads to it over Link requests. Verify-on-ingest
* (§11.2.4) authenticates each Delta by the *issuer's* signature, so the
* transport adds no trust — the same precedent as optical Paper Messages
* (§11.3). The pusher therefore needs no Dacar state at all; its identity hash
* is just a grantee.
*
* Three pieces:
*
*   - `handlePush()` is the transport-free inbound seam: it applies one
*     request payload (a raw §5.3 Delta, or a §11.1 batch of them) to a
*     `DeltaReceiver` and resolves with the applied count.
*   - `syncRequestHandler()` wraps that into the `responseGenerator` a server
*     registers on the `delta` request path; the response is the ack — a
*     MessagePack map `{applied: <n>}` (byte-identical to the Python/C++
*     acks).
*   - `RnsSyncServer` exposes a node identity on `dacar.sync.v1`, accepts
*     Links, registers the handler, and announces.
*   - `pushDeltas()` is the client side: derive the target's `dacar.sync.v1`
*     destination from its recalled identity, await a transport path, open a
*     Link, and send one request per Delta, collecting per-Delta acceptance
*     flags from the acks.
*
* An `applied === 0` ack means the node decoded the request but accepted
* nothing (unknown issuer, bad signature, stale §9 / future-skewed §12); a
* missing/undecodable response counts as failure. CRDT merge is idempotent,
* so re-pushing after either outcome is always safe — the outbox drains only
* on `applied >= 1`.
*
* This module is part of the optional transport layer: importing the pure core
* never pulls it in. It depends only on `@reticulum/core` (Destination, Link,
* MsgPack), which the core already depends on.
*/
/** The RNS request path Deltas are pushed on. */
const SYNC_REQUEST_PATH = "delta";
/** Default per-Delta round-trip timeout in milliseconds. */
const DEFAULT_PUSH_TIMEOUT_MS = 15e3;
/** Default wait for the target's path-response announce, in milliseconds. */
const DEFAULT_PATH_TIMEOUT_MS = 15e3;
/**
* @typedef {import("../delta.js").DeltaReceiver} DeltaReceiverType
* @typedef {import("@reticulum/core").Destination} DestinationType
* @typedef {import("@reticulum/core").Link} LinkType
* @typedef {import("@reticulum/core").Identity} IdentityType
* @typedef {import("@reticulum/core").Reticulum} ReticulumType
*/
/**
* Encodes the push ack: a MessagePack map `{applied: <n>}`.
* @param {number} applied
* @returns {Uint8Array}
*/
function packAck(applied) {
	return MsgPack.encode({ applied: Math.max(0, Math.trunc(applied)) });
}
/**
* Decodes a push ack; `null` when missing/undecodable (counts as failure).
*
* Returns the applied count (`0` = the node refused the Delta — kept in the
* sender's outbox; `>= 1` = accepted and merged).
* @param {Uint8Array | null | undefined} data
* @returns {number | null}
*/
function unpackAck(data) {
	if (!data || !data.length) return null;
	let decoded;
	try {
		decoded = MsgPack.decode(data);
	} catch {
		return null;
	}
	if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) return null;
	const applied = decoded.applied;
	if (typeof applied !== "number" || !Number.isInteger(applied) || applied < 0) return null;
	return applied;
}
/**
* Transport-free inbound seam: apply one push request to `receiver`.
*
* Tries the payload as a single raw §5.3 Delta first, then as a §11.1 batch
* (a MessagePack array of Delta payloads). The two shapes are unambiguous: an
* Operation payload is an 8-element mixed array, a batch is an array of
* binary elements. Resolves with the number of Deltas applied (0 = decoded
* but nothing accepted, or undecodable garbage — never rejects: a request
* handler must not crash on arbitrary bytes).
* @param {DeltaReceiverType} receiver
* @param {Uint8Array} data
* @returns {Promise<number>}
*/
async function handlePush(receiver, data) {
	if (!data || !data.length) return 0;
	if (await receiver.applyPayload(data)) return 1;
	try {
		return await receiver.applyPayloads(data);
	} catch {
		return 0;
	}
}
/**
* @callback ResponseGenerator
* @param {string} path
* @param {Uint8Array} data
* @param {Uint8Array} requestId
* @param {LinkType | null} linkId
* @param {IdentityType | null} remoteIdentity
* @param {number} requestTime
* @returns {Promise<Uint8Array | null>}
*/
/**
* Builds the responseGenerator ingesting pushed Deltas (§11).
*
* The returned callable matches the `@reticulum/core` `responseGenerator`
* contract: it feeds `data` to {@link handlePush} and resolves with the ack
* bytes. Every outcome yields a response — even `{applied: 0}` — so the
* pusher can distinguish "node refused (kept in outbox)" from "request lost
* (retry)".
* @param {DeltaReceiverType} receiver
* @returns {ResponseGenerator}
*/
function syncRequestHandler(receiver) {
	return async (_path, data) => {
		try {
			return packAck(await handlePush(receiver, data));
		} catch {
			return null;
		}
	};
}
/**
* Direct-link Delta ingestion endpoint over RNS Links (§11, doc #16 4a).
*
* Because destination creation is asynchronous, construct via the static
* {@link RnsSyncServer.create} factory. The server creates the
* `dacar.sync.v1` destination for `identity`, accepts Links, registers the
* Delta push request handler, and (by default) announces so pushers can
* resolve a path. A running `Reticulum` instance is assumed. This is also the
* seam an MCU firmware's request handler mirrors: verified Link identity →
* `DeltaReceiver.applyPayload()` → act.
*/
var RnsSyncServer = class RnsSyncServer {
	/** The request path pushed Deltas are served on. */
	static REQUEST_PATH = SYNC_REQUEST_PATH;
	/**
	* @param {Object} opts
	* @param {IdentityType} opts.identity The node identity (deltas are ingested
	*   by issuer signatures, not the server's — this signs nothing).
	* @param {DeltaReceiverType} opts.receiver The shared receive boundary.
	* @param {ReticulumType} opts.rns A running Reticulum instance.
	* @param {string} [opts.appName] Override the `dacar` app name.
	* @param {readonly string[]} [opts.aspects] Override the `sync.v1` aspects.
	* @param {boolean} [opts.announce] Whether to announce immediately (default true).
	* @returns {Promise<RnsSyncServer>}
	*/
	static async create({ identity, receiver, rns, appName = APP_NAME, aspects = SYNC_ASPECTS, announce = true }) {
		const self = new RnsSyncServer(receiver);
		const name = [appName, ...aspects].join(".");
		const dest = await Destination.IN(name, DestType.SINGLE, identity, rns);
		rns.transport.bindLocalDestination(dest);
		rns.registerDestination(dest);
		dest.addEventListener("link_request", async (event) => {
			try {
				await dest.acceptLink(event.detail.packet);
			} catch {}
		});
		await dest.registerRequestHandler(RnsSyncServer.REQUEST_PATH, { responseGenerator: syncRequestHandler(receiver) });
		if (announce) await dest.announce();
		self._destination = dest;
		return self;
	}
	/** @param {DeltaReceiverType} receiver */
	constructor(receiver) {
		/** @type {DeltaReceiverType} */
		this._receiver = receiver;
		/** @type {DestinationType | null} */
		this._destination = null;
	}
	/** @returns {DeltaReceiverType} */
	get receiver() {
		return this._receiver;
	}
	/** @returns {DestinationType | null} */
	get destination() {
		return this._destination;
	}
	/** @returns {Uint8Array | null} The 16-byte destination hash. */
	get destinationHash() {
		return this._destination ? this._destination.destinationHash : null;
	}
	/**
	* (Re)announce the destination so pushers can resolve a path to it.
	* @returns {Promise<void>}
	*/
	async announce() {
		if (!this._destination) throw new Error("Server not created");
		await this._destination.announce();
	}
};
/**
* Build the OUT `dacar.sync.v1` destination for a recalled identity and await
* a transport path to it.
*
* `targetHash` must be recallable (an earlier announce or the durable keyring
* path — the CLI seeds both before calling). Sends a `path?` request for the
* derived destination hash and polls until the node's path-response announce
* populates the path table (a `LINKREQUEST` to a destination with no known
* route is silently dropped — see `ensureRfedPath` in cli/session for the
* same rationale).
*
* @param {ReticulumType} rns A booted Reticulum.
* @param {Uint8Array} targetHash The node's 16-byte identity hash.
* @param {Object} [opts]
* @param {string} [opts.appName] Override the `dacar` app name.
* @param {readonly string[]} [opts.aspects] Override the `sync.v1` aspects.
* @param {number} [opts.timeoutMs] Max path wait in milliseconds.
* @param {number} [opts.pollIntervalMs] Poll interval in milliseconds.
* @param {() => void} [opts.onRequest] Invoked once when the path request fires.
* @returns {Promise<{destination: DestinationType, destinationHash: Uint8Array}>}
* @throws {Error} When the identity is unknown or no path resolves in time.
*/
async function ensureSyncPath(rns, targetHash, { appName = APP_NAME, aspects = SYNC_ASPECTS, timeoutMs = DEFAULT_PATH_TIMEOUT_MS, pollIntervalMs = 100, onRequest } = {}) {
	const identity = await rns.transport.recallIdentity(targetHash);
	if (!identity) throw new Error(`node identity unknown for ${toHex$1(targetHash)}; wait for its announce (or \`dacar identity remember\` it)`);
	const destination = await Destination.OUT([appName, ...aspects].join("."), DestType.SINGLE, identity, rns);
	const destinationHash = destination.destinationHash;
	const transport = rns?.transport;
	if (transport?.hasPath?.(destinationHash)) return {
		destination,
		destinationHash
	};
	if (!transport?.requestPath) return {
		destination,
		destinationHash
	};
	if (onRequest) onRequest();
	await transport.requestPath(destinationHash).catch(() => {});
	if (transport.hasPath?.(destinationHash)) return {
		destination,
		destinationHash
	};
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (transport.hasPath?.(destinationHash)) return {
			destination,
			destinationHash
		};
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}
	throw new Error(`no path to ${toHex$1(destinationHash)} (${appName}.${aspects.join(".")}) resolved within ${timeoutMs}ms (is the node announcing and reachable?)`);
}
/**
* Push raw §5.3 Delta payloads to a node over one Link (§11, doc #16 4a).
*
* `targetHash` is the *node identity hash* (16 bytes) — the sync destination
* `dacar.sync.v1` is derived from it. Opens one Link, sends one request per
* payload, and parses each ack: `applied >= 1` → accepted (`true`); `applied
* === 0` → the node refused (`false` — e.g. unknown issuer, stale §9,
* future-skewed §12); no/undecodable response → `false` (lost request —
* retry is safe, CRDT merge is idempotent).
*
* Returns the per-payload acceptance flags. The caller records accepted
* Deltas in the sent box / drains them from the outbox (work doc #11 — the
* same durable-issuance lifecycle as rfed/LXMF publishes).
*
* @param {Uint8Array[]} payloads Signed §5.3 Operation payloads.
* @param {Uint8Array} targetHash The node's 16-byte identity hash.
* @param {Object} opts
* @param {ReticulumType} opts.rns A booted Reticulum instance.
* @param {string} [opts.requestPath] Override the `delta` request path.
* @param {number} [opts.timeoutMs] Per-Delta round-trip timeout in milliseconds.
* @param {number} [opts.pathTimeoutMs] Path resolution timeout in milliseconds.
* @param {number} [opts.establishTimeoutMs] Link establishment timeout.
* @param {() => void} [opts.onRequest] Invoked once when the path request fires.
* @returns {Promise<boolean[]>}
*/
async function pushDeltas(payloads, targetHash, { rns, requestPath = SYNC_REQUEST_PATH, timeoutMs = DEFAULT_PUSH_TIMEOUT_MS, pathTimeoutMs = DEFAULT_PATH_TIMEOUT_MS, establishTimeoutMs = DEFAULT_ESTABLISH_TIMEOUT_MS, onRequest } = {}) {
	const { destination } = await ensureSyncPath(rns, targetHash, {
		timeoutMs: pathTimeoutMs,
		onRequest
	});
	const link = await establishLink(destination, { timeoutMs: establishTimeoutMs });
	if (!link) return payloads.map(() => false);
	/** @type {boolean[]} */
	const accepted = [];
	try {
		for (const payload of payloads) accepted.push(await pushOne(link, requestPath, payload, timeoutMs));
	} finally {
		try {
			await link.teardown();
		} catch {}
	}
	return accepted;
}
/**
* Send one Delta as a Link request and resolve with the ack verdict.
*
* Exported as the client-side seam (mirrors the Python ``_push_one``): an
* inactive link, a send failure, a timeout, an undecodable response, and an
* `{applied: 0}` refusal all resolve `false` — every failure mode is
* retry-safe because CRDT merge is idempotent.
*
* @param {LinkType} link
* @param {string} requestPath
* @param {Uint8Array} payload
* @param {number} timeoutMs
* @returns {Promise<boolean>}
*/
async function pushOne(link, requestPath, payload, timeoutMs) {
	try {
		const response = await link.request(requestPath, payload, { timeout: timeoutMs });
		if (!(response instanceof Uint8Array)) return false;
		const applied = unpackAck(response);
		return applied !== null && applied >= 1;
	} catch {
		return false;
	}
}
/**
* @param {Uint8Array} bytes
* @returns {string}
*/
function toHex$1(bytes) {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
//#endregion
export { ADMIN_RELATION, APP_NAME, Action, AuthoritativeServer, CHALLENGE_ASPECTS, CHALLENGE_DESTINATION, Challenge, ChallengeClient, Clock, Config, DEFAULT_DELETION_HORIZON_DAYS, DEFAULT_MAX_DEPTH, DEFAULT_MAX_VISITED, DEFAULT_PATH_TIMEOUT_MS, DEFAULT_PUSH_TIMEOUT_MS, DEFAULT_SALT, DELIMITER, DeltaReceiver, Engine, HASH_SIZE, HLC_BYTES, IssuerKeyset, Keyring, LOGICAL_BITS, LOGICAL_MASK, LXMF_DELIVERY_TITLE, MAX_HLC, MAX_LEGACY_SALTS, MAX_LOGICAL, MAX_PHYSICAL, MAX_SEGMENTS, NONCE_SIZE, NamespaceHasher, Operation, PHYSICAL_BITS, RFED_TOPIC, Receipt, RnsSyncServer, SALT_SIZE, SIGNATURE_SIZE, SYNC_REQUEST_PATH, StateVector, ThresholdGroup, Tuple, Verdict, WILDCARD, __specVersion__, __version__, bytesEqual, covers, ensureSyncPath, groupId, handlePush, packAck, packHlc, parseObject, physicalNowMs, pushDeltas, pushOne, split, syncRequestHandler, unpackAck, unpackHlc, verifyOperation };
