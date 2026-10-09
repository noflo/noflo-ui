// node_modules/@reticulum/dacar/src/hlc.js
var PHYSICAL_BITS = 48n;
var LOGICAL_BITS = 16n;
var LOGICAL_MASK = (1n << LOGICAL_BITS) - 1n;
var MAX_PHYSICAL = (1n << PHYSICAL_BITS) - 1n;
var MAX_LOGICAL = LOGICAL_MASK;
var MAX_HLC = (1n << 64n) - 1n;
function packHlc(physicalMs, logical) {
  if (!Number.isInteger(physicalMs) || physicalMs < 0 || BigInt(physicalMs) > MAX_PHYSICAL) {
    throw new RangeError(`physicalMs must fit in 48 bits, got ${physicalMs}`);
  }
  if (!Number.isInteger(logical) || logical < 0 || BigInt(logical) > MAX_LOGICAL) {
    throw new RangeError(`logical must fit in 16 bits, got ${logical}`);
  }
  return BigInt(physicalMs) << LOGICAL_BITS | BigInt(logical);
}
function unpackHlc(hlc) {
  if (typeof hlc !== "bigint" || hlc < 0n || hlc > MAX_HLC) {
    throw new RangeError(`hlc must fit in 64 bits, got ${hlc}`);
  }
  return {
    physicalMs: Number(hlc >> LOGICAL_BITS),
    logical: Number(hlc & LOGICAL_MASK)
  };
}
function physicalNowMs() {
  return Date.now();
}
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
    if (!snap || typeof snap.lastMs !== "number" || typeof snap.logical !== "number") {
      throw new Error("restore requires an object with lastMs and logical");
    }
    this.#lastMs = snap.lastMs;
    this.#logical = snap.logical;
  }
  /** Obtain a snapshot for persistence. @returns {{ lastMs: number, logical: number }} */
  snapshot() {
    return { lastMs: this.#lastMs, logical: this.#logical };
  }
  /** Advance from a local event and return the new HLC. @returns {bigint} */
  now() {
    const phys = physicalNowMs();
    if (phys > this.#lastMs) {
      this.#lastMs = phys;
      this.#logical = 0;
    } else {
      this.#logical += 1;
    }
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
    } else if (this.#lastMs > rphys) {
      this.#logical += 1;
    } else {
      this.#logical = Math.max(this.#logical, rlog) + 1;
    }
    return packHlc(this.#lastMs, this.#logical);
  }
};

// node_modules/@reticulum/dacar/src/namespace.js
var DELIMITER = ":";
var WILDCARD = "*";
var SALT_SIZE = 32;
var HASH_SIZE = 16;
var DEFAULT_SALT = new Uint8Array(SALT_SIZE);
var MAX_LEGACY_SALTS = 2;
var SALT_ID_TAG = new TextEncoder().encode("dacar.salt.id");
var encoder = new TextEncoder();
function split(objectId) {
  return objectId.split(DELIMITER);
}
function parseObject(objectId) {
  if (objectId === WILDCARD) return { segments: [], wildcard: true };
  const segments = split(objectId);
  let wildcard = false;
  if (segments.length > 0 && segments[segments.length - 1] === WILDCARD) {
    wildcard = true;
    segments.pop();
  }
  return { segments, wildcard };
}
function truncate16(digest) {
  return digest.slice(0, HASH_SIZE);
}
var NamespaceHasher = class {
  /**
   * @param {Uint8Array} [salt] 32-byte Privacy Salt (defaults to fail-open nulls).
   */
  constructor(salt = DEFAULT_SALT) {
    if (!(salt instanceof Uint8Array) || salt.length !== SALT_SIZE) {
      throw new RangeError(`salt must be ${SALT_SIZE} bytes`);
    }
    this.salt = salt;
    this._keyPromise = null;
  }
  /** @returns {Promise<CryptoKey>} */
  _key() {
    if (!this._keyPromise) {
      this._keyPromise = crypto.subtle.importKey(
        "raw",
        this.salt,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
    }
    return this._keyPromise;
  }
  /**
   * HMAC-SHA256(salt, relation) truncated to 16 bytes (§3.3).
   * @param {string} relation
   * @returns {Promise<Uint8Array>}
   */
  async hashRelation(relation) {
    const key = await this._key();
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(relation)));
    return truncate16(mac);
  }
  /**
   * Return `{ hashes, wildcard }` for an object string (§3.3).
   * @param {string} objectId
   * @returns {Promise<{ hashes: Uint8Array[], wildcard: boolean }>}
   */
  async hashObject(objectId) {
    const { segments, wildcard } = parseObject(objectId);
    const key = await this._key();
    const hashes = await Promise.all(
      segments.map(async (seg) => {
        const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(seg)));
        return truncate16(mac);
      })
    );
    return { hashes, wildcard };
  }
  /**
   * A 16-byte tag identifying this salt (§8.3 `salt_id_tag`):
   * `HMAC-SHA256(salt, b"dacar.salt.id")` truncated to 16 bytes.
   * @returns {Promise<Uint8Array>}
   */
  async idTag() {
    const key = await this._key();
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, SALT_ID_TAG));
    return truncate16(mac);
  }
};
function covers(tupleHashes, wildcard, requestHashes) {
  if (wildcard) {
    if (tupleHashes.length > requestHashes.length) return false;
    for (let i = 0; i < tupleHashes.length; i++) {
      if (!bytesEqual(tupleHashes[i], requestHashes[i])) return false;
    }
    return true;
  }
  if (tupleHashes.length !== requestHashes.length) return false;
  for (let i = 0; i < tupleHashes.length; i++) {
    if (!bytesEqual(tupleHashes[i], requestHashes[i])) return false;
  }
  return true;
}
function bytesEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// node_modules/@reticulum/dacar/src/tuple.js
import { toHex } from "./reticulum-core.js";
var MAX_SEGMENTS = 255;
var Tuple = class _Tuple {
  /** @param {HashedTupleInit} init */
  constructor({ relationHash, objectHashes, wildcard, grantee, issuer }) {
    if (!(relationHash instanceof Uint8Array) || relationHash.length !== HASH_SIZE) {
      throw new RangeError(`relationHash must be ${HASH_SIZE} bytes`);
    }
    if (!(grantee instanceof Uint8Array) || grantee.length !== HASH_SIZE) {
      throw new RangeError(`grantee must be ${HASH_SIZE} bytes`);
    }
    if (!(issuer instanceof Uint8Array) || issuer.length !== HASH_SIZE) {
      throw new RangeError(`issuer must be ${HASH_SIZE} bytes`);
    }
    if (objectHashes.length > MAX_SEGMENTS) {
      throw new RangeError(`too many object segments (${objectHashes.length} > ${MAX_SEGMENTS})`);
    }
    for (const h of objectHashes) {
      if (!(h instanceof Uint8Array) || h.length !== HASH_SIZE) {
        throw new RangeError(`object segment hash must be ${HASH_SIZE} bytes`);
      }
    }
    this.relationHash = relationHash;
    this.objectHashes = Object.freeze([...objectHashes]);
    this.wildcard = wildcard;
    this.grantee = grantee;
    this.issuer = issuer;
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
    const [relationHash, { hashes, wildcard }] = await Promise.all([
      hasher.hashRelation(relation),
      hasher.hashObject(objectId)
    ]);
    return new _Tuple({ relationHash, objectHashes: hashes, wildcard, grantee, issuer });
  }
  /** §6.1 hash pre-image (excludes Action + HLC). @returns {Uint8Array} */
  get preimage() {
    let len = HASH_SIZE * 3 + 2;
    for (const h of this.objectHashes) len += h.length;
    const out = new Uint8Array(len);
    let o = 0;
    out.set(this.issuer, o);
    o += HASH_SIZE;
    out.set(this.grantee, o);
    o += HASH_SIZE;
    out.set(this.relationHash, o);
    o += HASH_SIZE;
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
    if (!(other instanceof _Tuple)) return false;
    return bytesEqual(this.relationHash, other.relationHash) && this.objectHashes.length === other.objectHashes.length && this.objectHashes.every((h, i) => bytesEqual(h, other.objectHashes[i])) && this.wildcard === other.wildcard && bytesEqual(this.grantee, other.grantee) && bytesEqual(this.issuer, other.issuer);
  }
};

// node_modules/@reticulum/dacar/src/threshold.js
var encoder2 = new TextEncoder();
var THRESHOLD_BYTES = 8;
function compareHashes(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
function validateMembers(members, threshold) {
  if (!(Number.isInteger(threshold) && threshold >= 1 && threshold <= members.length)) {
    throw new Error(
      `threshold must satisfy 1 <= N <= M (got N=${threshold}, M=${members.length})`
    );
  }
  for (const m of members) {
    if (!(m instanceof Uint8Array) || m.length !== HASH_SIZE) {
      throw new RangeError(`member hash must be ${HASH_SIZE} bytes`);
    }
  }
  if (members.length < 2) {
    throw new Error("a threshold group needs at least 2 members (M)");
  }
}
async function groupId(members, threshold) {
  const normalized = [...members].sort(compareHashes);
  validateMembers(normalized, threshold);
  const nBytes = new Uint8Array(THRESHOLD_BYTES);
  new DataView(nBytes.buffer).setBigUint64(0, BigInt(threshold), false);
  const total = normalized.length * HASH_SIZE + THRESHOLD_BYTES;
  const blob = new Uint8Array(total);
  let o = 0;
  for (const m of normalized) {
    blob.set(m, o);
    o += HASH_SIZE;
  }
  blob.set(nBytes, o);
  const digest = await crypto.subtle.digest("SHA-256", blob);
  return new Uint8Array(digest).slice(0, HASH_SIZE);
}
var ThresholdGroup = class {
  /**
   * @param {Uint8Array[]} members M member identity hashes (16 bytes each).
   * @param {number} threshold The consensus threshold N.
   */
  constructor(members, threshold) {
    validateMembers([...members], threshold);
    this.members = [...members].sort(compareHashes);
    this.threshold = threshold;
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
    if (!this._idPromise) {
      this._idPromise = groupId(this.members, this.threshold).then((id) => {
        this._id = id;
        return id;
      });
    }
    return this._idPromise;
  }
};

// node_modules/@reticulum/dacar/src/operation.js
import { Identity, MsgPack, toHex as toHex2 } from "./reticulum-core.js";
var SIGNATURE_SIZE = 64;
var HLC_BYTES = 8;
var Action = {
  REVOKE: 0,
  GRANT: 1
};
var Operation = class _Operation {
  /** @param {OperationInit} init */
  constructor({ tuple, action, hlc, signatures = [] }) {
    if (action !== Action.GRANT && action !== Action.REVOKE) {
      throw new TypeError("action must be Action.GRANT or Action.REVOKE");
    }
    if (typeof hlc !== "bigint" || hlc < 0n || hlc > MAX_HLC) {
      throw new RangeError("hlc must be a bigint in [0, 2^64)");
    }
    if (!Array.isArray(signatures)) {
      throw new TypeError("signatures must be an array");
    }
    for (const sig of signatures) {
      if (!(sig instanceof Uint8Array) || sig.length !== SIGNATURE_SIZE) {
        throw new RangeError(`each signature must be ${SIGNATURE_SIZE} bytes`);
      }
    }
    this.tuple = tuple;
    this.action = action;
    this.hlc = hlc;
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
    let len = 16 + 16 + 1 + HLC_BYTES + 16 + 1 + 1;
    for (const h of this.tuple.objectHashes) len += h.length;
    const out = new Uint8Array(len);
    let o = 0;
    out.set(this.tuple.issuer, o);
    o += 16;
    out.set(this.tuple.grantee, o);
    o += 16;
    out[o++] = this.action;
    new DataView(out.buffer).setBigUint64(o, this.hlc, false);
    o += HLC_BYTES;
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
    return new _Operation({ tuple: this.tuple, action: this.action, hlc: this.hlc, signatures });
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
    if (!(Number.isInteger(threshold) && threshold >= 1) || this.signatures.length !== threshold) {
      return false;
    }
    if (memberPublicKeys.length < threshold) return false;
    const preimage = this.preimage;
    const members = [];
    for (const v of memberPublicKeys) {
      const id = await _Operation._asIdentity(v);
      members.push({ id, key: await id.getPublicKey() });
    }
    const used = /* @__PURE__ */ new Set();
    for (const sig of this.signatures) {
      if (sig.length !== SIGNATURE_SIZE) return false;
      let matched = null;
      for (const m of members) {
        const hex = toHex2(m.key);
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
    if (this.signatures.length === 0) {
      throw new Error("Operation must be signed before payload serialization");
    }
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
    if (!Array.isArray(decoded) || decoded.length !== 8) {
      throw new Error("payload must be an 8-element MessagePack array");
    }
    const [issuer, grantee, action, hlc, relationHash, objectHashes, wildcard, signatures] = decoded;
    if (action !== Action.GRANT && action !== Action.REVOKE) {
      throw new Error(`unknown action byte ${action}`);
    }
    if (!Array.isArray(signatures) || signatures.length === 0) {
      throw new Error("signatures must be a non-empty array of 64-byte blobs");
    }
    return new _Operation({
      tuple: new Tuple({
        relationHash: expectBytes(relationHash, 16, "relation_hash"),
        objectHashes: objectHashes.map((h) => expectBytes(h, 16, "object_hash")),
        wildcard: expectBool(wildcard, "wildcard"),
        grantee: expectBytes(grantee, 16, "grantee"),
        issuer: expectBytes(issuer, 16, "issuer")
      }),
      action,
      hlc: BigInt(hlc),
      signatures: signatures.map((s) => expectBytes(s, SIGNATURE_SIZE, "signature"))
    });
  }
};
function expectBytes(value, len, name) {
  if (!(value instanceof Uint8Array) || value.length !== len) {
    throw new Error(`${name} must be a ${len}-byte Uint8Array`);
  }
  return value;
}
function expectBool(value, name) {
  if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
  return value;
}

// node_modules/@reticulum/dacar/src/verifier.js
import { toHex as toHex3 } from "./reticulum-core.js";
var RNS_PUBLIC_KEY_SIZE = 64;
var IssuerKeyset = class _IssuerKeyset {
  /**
   * @param {Uint8Array[]} memberPublicKeys One (single identity) or M (group)
   *   64-byte RNS public keys.
   * @param {number} [threshold] Consensus threshold N (defaults to 1).
   */
  constructor(memberPublicKeys, threshold = 1) {
    if (!(Number.isInteger(threshold) && threshold >= 1)) {
      throw new Error("threshold must be a positive integer");
    }
    if (!Array.isArray(memberPublicKeys) || memberPublicKeys.length < threshold) {
      throw new Error("need at least `threshold` member public keys");
    }
    const keys = [];
    for (const k of memberPublicKeys) {
      if (!(k instanceof Uint8Array) || k.length !== RNS_PUBLIC_KEY_SIZE) {
        throw new RangeError(`RNS public keys are ${RNS_PUBLIC_KEY_SIZE} raw bytes`);
      }
      keys.push(new Uint8Array(k));
    }
    this.memberPublicKeys = Object.freeze(keys);
    this.threshold = threshold;
    Object.freeze(this);
  }
  /**
   * Keyset for a single-identity Issuer (threshold 1).
   * @param {Uint8Array} publicKey
   * @returns {IssuerKeyset}
   */
  static single(publicKey) {
    return new _IssuerKeyset([publicKey], 1);
  }
  /**
   * Keyset for an N-of-M Threshold Group Issuer (§4.1).
   * @param {Uint8Array[]} memberPublicKeys
   * @param {number} threshold
   * @returns {IssuerKeyset}
   */
  static group(memberPublicKeys, threshold) {
    return new _IssuerKeyset(memberPublicKeys, threshold);
  }
};
var Keyring = class {
  constructor() {
    this._map = /* @__PURE__ */ new Map();
  }
  /**
   * Map a 16-byte Issuer hash to its `IssuerKeyset`.
   * @param {Uint8Array} issuerHash
   * @param {IssuerKeyset} keyset
   * @returns {Keyring}
   */
  register(issuerHash, keyset) {
    this._map.set(toHex3(_asHash(issuerHash)), keyset);
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
  registerGroup(groupId2, memberPublicKeys, threshold) {
    return this.register(groupId2, IssuerKeyset.group(memberPublicKeys, threshold));
  }
  /**
   * @param {Uint8Array} issuerHash
   * @returns {IssuerKeyset | null}
   */
  resolve(issuerHash) {
    return this._map.get(toHex3(_asHash(issuerHash))) ?? null;
  }
  /**
   * Remove an Issuer from the keyring.
   * @param {Uint8Array} issuerHash
   * @returns {boolean} `true` if the Issuer was present (and is now removed).
   */
  forget(issuerHash) {
    return this._map.delete(toHex3(_asHash(issuerHash)));
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
    return this._map.has(toHex3(_asHash(issuerHash)));
  }
};
async function verifyOperation(operation, resolver) {
  const keyset = await resolveKeyset(resolver, operation.issuer);
  if (!keyset) return false;
  return operation.verifyKeyset(keyset);
}
async function resolveKeyset(resolver, hash) {
  if (typeof resolver === "function") return await resolver(hash);
  if (resolver && typeof resolver.resolve === "function") return resolver.resolve(hash);
  throw new TypeError("resolver must be a function or a Keyring");
}
function _asHash(value) {
  if (!(value instanceof Uint8Array) || value.length !== HASH_SIZE) {
    throw new RangeError(`issuer hash must be ${HASH_SIZE} bytes`);
  }
  return value;
}

// node_modules/@reticulum/dacar/src/delta.js
import { MsgPack as MsgPack2 } from "./reticulum-core.js";
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
      items = MsgPack2.decode(payload);
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
    return MsgPack2.encode(operationPayloads.map((p) => new Uint8Array(p)));
  }
};

// node_modules/@reticulum/dacar/src/naming.js
var APP_NAME = "dacar";
var CHALLENGE_ASPECTS = Object.freeze(["auth", "v1"]);
var CHALLENGE_DESTINATION = "dacar.auth.v1";
var SYNC_ASPECTS = Object.freeze(["sync", "v1"]);
var RFED_TOPIC = "dacar.policy.v1";
var LXMF_DELIVERY_TITLE = "dacar/sync/delta";

// node_modules/@reticulum/dacar/src/config.js
import { toHex as toHex4 } from "./reticulum-core.js";
var DEFAULT_DELETION_HORIZON_DAYS = 180;
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var __nullSaltWarned = false;
var Config = class {
  /** @param {ConfigInit} init */
  constructor({
    rootTrustAnchors,
    primarySalt = DEFAULT_SALT,
    legacySalts = [],
    thresholdGroups = [],
    authoritativeIdentity,
    deletionHorizonDays = DEFAULT_DELETION_HORIZON_DAYS
  }) {
    const anchors = /* @__PURE__ */ new Set();
    for (const anchor of rootTrustAnchors) {
      if (!(anchor instanceof Uint8Array) || anchor.length !== HASH_SIZE) {
        throw new TypeError(`trust anchor must be ${HASH_SIZE} bytes`);
      }
      anchors.add(toHex4(anchor));
    }
    if (anchors.size === 0) {
      throw new Error("at least one Root Trust Anchor is required (\xA74.1)");
    }
    this.rootTrustAnchors = anchors;
    if (!(primarySalt instanceof Uint8Array) || primarySalt.length !== SALT_SIZE) {
      throw new TypeError(`primarySalt must be ${SALT_SIZE} bytes`);
    }
    this.primarySalt = primarySalt;
    if (legacySalts.length > MAX_LEGACY_SALTS) {
      throw new Error(
        `at most ${MAX_LEGACY_SALTS} Legacy Salts are allowed (\xA710.2), got ${legacySalts.length}`
      );
    }
    this.legacySalts = legacySalts.map((s) => {
      if (!(s instanceof Uint8Array) || s.length !== SALT_SIZE) {
        throw new TypeError(`each legacy salt must be ${SALT_SIZE} bytes`);
      }
      return s;
    });
    this.thresholdGroups = [...thresholdGroups];
    if (authoritativeIdentity !== void 0) {
      if (!(authoritativeIdentity instanceof Uint8Array) || authoritativeIdentity.length !== HASH_SIZE) {
        throw new TypeError(`authoritativeIdentity must be ${HASH_SIZE} bytes`);
      }
      this.authoritativeIdentity = authoritativeIdentity;
    } else {
      this.authoritativeIdentity = void 0;
    }
    if (!(Number.isInteger(deletionHorizonDays) && deletionHorizonDays >= 1)) {
      throw new Error("deletionHorizonDays must be >= 1");
    }
    this.deletionHorizonDays = deletionHorizonDays;
    if (_isDefaultSalt(primarySalt) && !__nullSaltWarned) {
      __nullSaltWarned = true;
      console.warn(
        "Config started with the default null Privacy Salt: label hashes are fail-open (trivially dictionary-attackable, \xA73.3). Set a strong random primarySalt for any real deployment."
      );
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
    return this.rootTrustAnchors.has(toHex4(identityHash));
  }
  /**
   * The Threshold Group with the given Group ID, or undefined (§4.1). Async
   * because Group IDs are SHA-256 hashes (Web Crypto).
   * @param {Uint8Array} groupIdBytes
   * @returns {Promise<import("./threshold.js").ThresholdGroup | undefined>}
   */
  async groupFor(groupIdBytes) {
    const target = toHex4(groupIdBytes);
    for (const group of this.thresholdGroups) {
      if (toHex4(await group.groupId()) === target) return group;
    }
    return void 0;
  }
  /** Deletion horizon in milliseconds. @returns {number} */
  get deletionHorizonMs() {
    return this.deletionHorizonDays * MS_PER_DAY;
  }
};
function _isDefaultSalt(salt) {
  return bytesEqual(salt, DEFAULT_SALT);
}

// node_modules/@reticulum/dacar/src/crdt.js
import { MsgPack as MsgPack3 } from "./reticulum-core.js";
var MS_PER_DAY2 = 24 * 60 * 60 * 1e3;
var DEFAULT_MAX_FUTURE_MS = MS_PER_DAY2;
var DEFAULT_DELETION_HORIZON_DAYS2 = 180;
function maxTs(existing, incoming) {
  return existing === null ? incoming : existing > incoming ? existing : incoming;
}
function maxBoth(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return a > b ? a : b;
}
var __trustedLocalWarned = false;
function normalizeTs(value) {
  return value === null ? null : BigInt(value);
}
var StateVector = class _StateVector {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.deletionHorizonDays] Deletion horizon H (§9).
   */
  constructor({ deletionHorizonDays = DEFAULT_DELETION_HORIZON_DAYS2 } = {}) {
    if (!(Number.isInteger(deletionHorizonDays) && deletionHorizonDays >= 1)) {
      throw new Error("deletionHorizonDays must be >= 1");
    }
    this._entries = /* @__PURE__ */ new Map();
    this.deletionHorizonDays = deletionHorizonDays;
  }
  /** Deletion horizon in milliseconds. @returns {number} */
  get deletionHorizonMs() {
    return this.deletionHorizonDays * MS_PER_DAY2;
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
      entry = { tuple: operation.tuple, addTs: null, removeTs: null };
      this._entries.set(key, entry);
    }
    if (operation.action === Action.GRANT) {
      entry.addTs = maxTs(entry.addTs, operation.hlc);
    } else {
      entry.removeTs = maxTs(entry.removeTs, operation.hlc);
    }
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
        entry = { tuple: otherEntry.tuple, addTs: null, removeTs: null };
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
    const now = nowMs ?? physicalNowMs();
    const cutoff = now - this.deletionHorizonMs;
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
    for (const entry of this._entries.values()) {
      if (this._isActiveEntry(entry)) yield entry.tuple;
    }
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
    for (const entry of this._entries.values()) {
      rows.push([
        entry.tuple.relationHash,
        [...entry.tuple.objectHashes],
        entry.tuple.wildcard,
        entry.tuple.grantee,
        entry.tuple.issuer,
        entry.addTs,
        entry.removeTs
      ]);
    }
    return MsgPack3.encode(rows);
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
  static fromPayload(data, { deletionHorizonDays = DEFAULT_DELETION_HORIZON_DAYS2, trusted = false } = {}) {
    if (!trusted && !__trustedLocalWarned) {
      __trustedLocalWarned = true;
      console.warn(
        "StateVector.fromPayload() is trusted-local-only: it performs no signature verification and must not be fed network bytes. For network convergence use DeltaReceiver.applyPayloads() instead."
      );
    }
    const rows = MsgPack3.decode(data);
    if (!Array.isArray(rows)) {
      throw new Error("state vector payload must be a MessagePack array");
    }
    const state = new _StateVector({ deletionHorizonDays });
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 7) {
        throw new Error("each state entry must be a 7-element array");
      }
      const [relationHash, objectHashes, wildcard, grantee, issuer, addTs, removeTs] = row;
      const tuple = new Tuple({
        relationHash: expectBytes2(relationHash, 16, "relation_hash"),
        objectHashes: objectHashes.map((h) => expectBytes2(h, 16, "object_hash")),
        wildcard: expectBool2(wildcard, "wildcard"),
        grantee: expectBytes2(grantee, 16, "grantee"),
        issuer: expectBytes2(issuer, 16, "issuer")
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
function expectBytes2(value, len, name) {
  if (!(value instanceof Uint8Array) || value.length !== len) {
    throw new Error(`${name} must be a ${len}-byte Uint8Array`);
  }
  return value;
}
function expectBool2(value, name) {
  if (typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
  return value;
}

// node_modules/@reticulum/dacar/src/engine.js
import { toHex as toHex5 } from "./reticulum-core.js";
var DEFAULT_MAX_DEPTH = 10;
var DEFAULT_MAX_VISITED = 50;
var ADMIN_RELATION = "admin";
var Engine = class {
  /**
   * @param {import("./config.js").Config} config
   * @param {import("./crdt.js").StateVector} state
   * @param {EngineOptions} [options]
   */
  constructor(config, state, options = {}) {
    this.config = config;
    this.state = state;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    this.maxVisited = options.maxVisited ?? DEFAULT_MAX_VISITED;
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
    const hypotheses = await Promise.all(
      this.config.hashers.map(async (hasher) => {
        const [objectHashes, allowRelationHash, denyRelationHash, adminAllowHash, adminDenyHash] = await Promise.all([
          hasher.hashObject(objectId),
          hasher.hashRelation(relation),
          hasher.hashRelation(denyRelation),
          hasher.hashRelation(ADMIN_RELATION),
          hasher.hashRelation("-" + ADMIN_RELATION)
        ]);
        return {
          hasher,
          objectHashes: objectHashes.hashes,
          allowRelationHash,
          denyRelationHash,
          adminAllowHash,
          adminDenyHash
        };
      })
    );
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
    const index = /* @__PURE__ */ new Map();
    const granteeHex = toHex5(grantee);
    for (const t of this.state.activeTuples()) {
      const g = toHex5(t.grantee);
      const arr = index.get(g);
      if (arr) arr.push(t);
      else index.set(g, [t]);
    }
    const memo = /* @__PURE__ */ new Map();
    let counter = 0;
    const { config, maxDepth, maxVisited } = this;
    const hyps = [...hypotheses];
    const objectKey = (hs) => hs.map((h) => toHex5(h.hasher.salt) + "|" + h.objectHashes.map(toHex5).join(".")).join(";");
    function authority(issuer, hs, depth, visited) {
      if (config.isRootAnchor(issuer)) return true;
      const key = toHex5(issuer) + "|" + objectKey(hs);
      if (memo.has(key)) return (
        /** @type {boolean} */
        memo.get(key)
      );
      if (depth >= maxDepth) return false;
      const issuerHex = toHex5(issuer);
      if (visited.has(issuerHex)) return false;
      const nextVisited = new Set(visited);
      nextVisited.add(issuerHex);
      const adminHyps = hs.map((h) => ({
        hasher: h.hasher,
        objectHashes: h.objectHashes,
        allowRelationHash: h.adminAllowHash,
        denyRelationHash: h.adminDenyHash,
        adminAllowHash: h.adminAllowHash,
        adminDenyHash: h.adminDenyHash
      }));
      const result = _resolve(adminHyps, issuer, depth + 1, nextVisited) === "allow";
      if (result) memo.set(key, true);
      return result;
    }
    function _resolve(hs, granteeId, depth, visited) {
      counter += 1;
      if (counter > maxVisited) return "none";
      const gid = toHex5(granteeId);
      const candidates = index.get(gid) ?? [];
      let denyValid = false;
      let allowValid = false;
      for (const candidate of candidates) {
        for (const h of hs) {
          if (bytesEqualHash(candidate.relationHash, h.denyRelationHash)) {
            if (covers(candidate.objectHashes, candidate.wildcard, h.objectHashes)) {
              if (authority(candidate.issuer, hs, depth, visited)) denyValid = true;
            }
          } else if (bytesEqualHash(candidate.relationHash, h.allowRelationHash)) {
            if (covers(candidate.objectHashes, candidate.wildcard, h.objectHashes)) {
              if (authority(candidate.issuer, hs, depth, visited)) allowValid = true;
            }
          }
        }
      }
      if (denyValid) return "deny";
      if (allowValid) return "allow";
      return "none";
    }
    return _resolve(hyps, grantee, 0, /* @__PURE__ */ new Set()) === "allow";
  }
};
function bytesEqualHash(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// node_modules/@reticulum/dacar/src/challenge.js
import { Identity as Identity2, MsgPack as MsgPack4, toHex as toHex6 } from "./reticulum-core.js";
var NONCE_SIZE = 32;
var SIGNATURE_SIZE2 = 64;
var Verdict = {
  DENY: 0,
  ALLOW: 1
};
async function asIdentity(value) {
  return value instanceof Identity2 ? value : await Identity2.fromPublicKey(value);
}
function expectBytes3(value, len, name) {
  if (!(value instanceof Uint8Array) || value.length !== len) {
    throw new Error(`${name} must be a ${len}-byte Uint8Array`);
  }
  return value;
}
var Challenge = class _Challenge {
  /**
   * @param {Object} init
   * @param {string} init.object Plaintext (held only on the client).
   * @param {string} init.relation Plaintext (held only on the client).
   * @param {Uint8Array} init.grantee 16-byte holder identity hash.
   * @param {Uint8Array} init.nonce 32-byte nonce.
   * @param {import("./namespace.js").NamespaceHasher[]} init.hashers Salts to hypothesize over.
   */
  constructor({ object, relation, grantee, nonce, hashers }) {
    if (!(grantee instanceof Uint8Array) || grantee.length !== HASH_SIZE) {
      throw new TypeError(`grantee must be ${HASH_SIZE} bytes`);
    }
    if (!(nonce instanceof Uint8Array) || nonce.length !== NONCE_SIZE) {
      throw new TypeError(`nonce must be ${NONCE_SIZE} bytes`);
    }
    if (!Array.isArray(hashers) || hashers.length === 0) {
      throw new TypeError("at least one salt hasher is required");
    }
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
    return new _Challenge({
      object,
      relation,
      grantee,
      nonce: nonce ?? crypto.getRandomValues(new Uint8Array(NONCE_SIZE)),
      hashers
    });
  }
  /** Serialize the hashed multi-salt challenge (§8.3). @returns {Promise<Uint8Array>} */
  async toPayload() {
    const denyRelation = "-" + this.relation;
    const entries = await Promise.all(
      this.hashers.map(async (hasher) => {
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
      })
    );
    return MsgPack4.encode([this.nonce, entries]);
  }
  /**
   * Decode a challenge payload (§8.4). Plaintext is intentionally unrecoverable.
   * @param {Uint8Array} data
   * @returns {DecodedChallenge}
   */
  static fromPayload(data) {
    const decoded = MsgPack4.decode(data);
    if (!Array.isArray(decoded) || decoded.length !== 2) {
      throw new Error("challenge payload must be a 2-element MessagePack array");
    }
    const [nonce, entries] = decoded;
    const nonceBytes = expectBytes3(nonce, NONCE_SIZE, "nonce");
    if (!Array.isArray(entries)) {
      throw new Error("challenge entries must be an array");
    }
    const result = [];
    let grantee = null;
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length !== 5) {
        throw new Error("each challenge entry must be a 5-element array");
      }
      const [saltIdTag, granteeHash, allowRh, denyRh, objectHashes] = entry;
      if (!Array.isArray(objectHashes)) throw new Error("object_segment_hashes must be an array");
      const gh = expectBytes3(granteeHash, HASH_SIZE, "grantee_hash");
      if (grantee === null) grantee = gh;
      else if (!bytesEqual(grantee, gh)) throw new Error("all challenge entries must share one grantee");
      result.push({
        saltIdTag: expectBytes3(saltIdTag, HASH_SIZE, "salt_id_tag"),
        granteeHash: gh,
        allowRelationHash: expectBytes3(allowRh, HASH_SIZE, "allow_relation_hash"),
        denyRelationHash: expectBytes3(denyRh, HASH_SIZE, "deny_relation_hash"),
        objectHashes: objectHashes.map((h) => expectBytes3(h, HASH_SIZE, "object_hash"))
      });
    }
    if (grantee === null) throw new Error("challenge must carry at least one entry");
    return { nonce: nonceBytes, grantee, entries: result };
  }
};
var Receipt = class _Receipt {
  /** @param {ReceiptInit} init */
  constructor({ verdict, serverHlc, nonce, signature = new Uint8Array(0) }) {
    if (verdict !== Verdict.ALLOW && verdict !== Verdict.DENY) {
      throw new TypeError("verdict must be Verdict.ALLOW or Verdict.DENY");
    }
    if (typeof serverHlc !== "bigint" || serverHlc < 0n || serverHlc > MAX_HLC) {
      throw new RangeError("serverHlc must be a bigint in [0, 2^64)");
    }
    if (!(nonce instanceof Uint8Array) || nonce.length !== NONCE_SIZE) {
      throw new TypeError(`nonce must be ${NONCE_SIZE} bytes`);
    }
    if (!(signature instanceof Uint8Array) || signature.length !== 0 && signature.length !== SIGNATURE_SIZE2) {
      throw new RangeError(`signature must be 0 or ${SIGNATURE_SIZE2} bytes`);
    }
    this.verdict = verdict;
    this.serverHlc = serverHlc;
    this.nonce = nonce;
    this.signature = signature;
  }
  /** Unpadded concatenation of the fields preceding the signature (41 bytes). @returns {Uint8Array} */
  get preimage() {
    const hlcBytes = new Uint8Array(8);
    new DataView(hlcBytes.buffer).setBigUint64(0, this.serverHlc, false);
    const out = new Uint8Array(1 + 8 + NONCE_SIZE);
    out[0] = this.verdict;
    out.set(hlcBytes, 1);
    out.set(this.nonce, 9);
    return out;
  }
  /** @param {Identity} identity @returns {Promise<Receipt>} */
  async sign(identity) {
    const signature = await identity.sign(this.preimage);
    return new _Receipt({ verdict: this.verdict, serverHlc: this.serverHlc, nonce: this.nonce, signature });
  }
  /** @param {PublicKeyLike} identityOrPublicKey @returns {Promise<boolean>} */
  async verify(identityOrPublicKey) {
    if (this.signature.length !== SIGNATURE_SIZE2) return false;
    const identity = await asIdentity(identityOrPublicKey);
    return identity.validate(this.signature, this.preimage);
  }
  /** @returns {Uint8Array} */
  toPayload() {
    if (this.signature.length !== SIGNATURE_SIZE2) {
      throw new Error("Receipt must be signed before payload serialization");
    }
    return MsgPack4.encode([this.verdict, this.serverHlc, this.nonce, this.signature]);
  }
  /** @param {Uint8Array} data @returns {Receipt} */
  static fromPayload(data) {
    const decoded = MsgPack4.decode(data);
    if (!Array.isArray(decoded) || decoded.length !== 4) {
      throw new Error("receipt payload must be a 4-element MessagePack array");
    }
    const [verdict, serverHlc, nonce, signature] = decoded;
    if (verdict !== Verdict.ALLOW && verdict !== Verdict.DENY) {
      throw new Error(`unknown verdict byte ${verdict}`);
    }
    return new _Receipt({
      verdict,
      serverHlc: BigInt(serverHlc),
      nonce: expectBytes3(nonce, NONCE_SIZE, "nonce"),
      signature: expectBytes3(signature, SIGNATURE_SIZE2, "signature")
    });
  }
};
async function buildHypotheses(config, decoded) {
  const byTag = /* @__PURE__ */ new Map();
  for (const hasher of config.hashers) {
    byTag.set(toHex6(await hasher.idTag()), hasher);
  }
  const hyps = [];
  for (const entry of decoded.entries) {
    const hasher = byTag.get(toHex6(entry.saltIdTag));
    if (!hasher) continue;
    const [adminAllowHash, adminDenyHash] = await Promise.all([
      hasher.hashRelation("admin"),
      hasher.hashRelation("-admin")
    ]);
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
    const allowed = hypotheses.length > 0 && this._engine.evaluateHashes(decoded.grantee, hypotheses);
    const verdict = allowed ? Verdict.ALLOW : Verdict.DENY;
    const receipt = await new Receipt({
      verdict,
      serverHlc: this._clock.now(),
      nonce: decoded.nonce
    }).sign(this._privateKey);
    return receipt.toPayload();
  }
};
var ChallengeClient = class {
  /**
   * @param {Config} config
   * @param {import("./crdt.js").StateVector} state
   * @param {PublicKeyLike} authoritativePublicKey
   * @param {Transport} transport
   */
  constructor(config, state, authoritativePublicKey, transport) {
    if (config.authoritativeIdentity === void 0) {
      throw new Error("Strict Consistency requires an Authoritative Identity (\xA78)");
    }
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

// node_modules/@reticulum/dacar/src/index.js
var __version__ = "1.5.0";
var __specVersion__ = "1.0-RC7";

// node_modules/@reticulum/dacar/src/transport/rnsSync.js
import { Destination as Destination2, DestType as DestType2, Link as Link2, MsgPack as MsgPack5 } from "./reticulum-core.js";

// node_modules/@reticulum/dacar/src/transport/rnsChallenge.js
import { Destination, DestType, Link } from "./reticulum-core.js";
var DEFAULT_ESTABLISH_TIMEOUT_MS = 15e3;
async function establishLink(destination, { timeoutMs = DEFAULT_ESTABLISH_TIMEOUT_MS } = {}) {
  let link;
  try {
    link = await Link.initiate(destination, destination.interfaceLayer.transport);
    return await link.whenActive(timeoutMs);
  } catch {
    if (link) {
      try {
        await link.teardown();
      } catch {
      }
    }
    return null;
  }
}

// node_modules/@reticulum/dacar/src/transport/rnsSync.js
var SYNC_REQUEST_PATH = "delta";
var DEFAULT_PUSH_TIMEOUT_MS = 15e3;
var DEFAULT_PATH_TIMEOUT_MS = 15e3;
function packAck(applied) {
  return MsgPack5.encode({ applied: Math.max(0, Math.trunc(applied)) });
}
function unpackAck(data) {
  if (!data || !data.length) return null;
  let decoded;
  try {
    decoded = MsgPack5.decode(data);
  } catch {
    return null;
  }
  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    return null;
  }
  const applied = decoded.applied;
  if (typeof applied !== "number" || !Number.isInteger(applied) || applied < 0) {
    return null;
  }
  return applied;
}
async function handlePush(receiver, data) {
  if (!data || !data.length) return 0;
  if (await receiver.applyPayload(data)) return 1;
  try {
    return await receiver.applyPayloads(data);
  } catch {
    return 0;
  }
}
function syncRequestHandler(receiver) {
  return async (_path, data) => {
    try {
      return packAck(await handlePush(receiver, data));
    } catch {
      return null;
    }
  };
}
var RnsSyncServer = class _RnsSyncServer {
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
  static async create({
    identity,
    receiver,
    rns,
    appName = APP_NAME,
    aspects = SYNC_ASPECTS,
    announce = true
  }) {
    const self = new _RnsSyncServer(receiver);
    const name = [appName, ...aspects].join(".");
    const dest = await Destination2.IN(name, DestType2.SINGLE, identity, rns);
    rns.transport.bindLocalDestination(dest);
    rns.registerDestination(dest);
    dest.addEventListener("link_request", async (event) => {
      try {
        await dest.acceptLink(event.detail.packet);
      } catch {
      }
    });
    await dest.registerRequestHandler(_RnsSyncServer.REQUEST_PATH, {
      responseGenerator: syncRequestHandler(receiver)
    });
    if (announce) await dest.announce();
    self._destination = dest;
    return self;
  }
  /** @param {DeltaReceiverType} receiver */
  constructor(receiver) {
    this._receiver = receiver;
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
async function ensureSyncPath(rns, targetHash, {
  appName = APP_NAME,
  aspects = SYNC_ASPECTS,
  timeoutMs = DEFAULT_PATH_TIMEOUT_MS,
  pollIntervalMs = 100,
  onRequest
} = {}) {
  const identity = await rns.transport.recallIdentity(targetHash);
  if (!identity) {
    throw new Error(
      `node identity unknown for ${toHex7(targetHash)}; wait for its announce (or \`dacar identity remember\` it)`
    );
  }
  const destination = await Destination2.OUT(
    [appName, ...aspects].join("."),
    DestType2.SINGLE,
    identity,
    rns
  );
  const destinationHash = destination.destinationHash;
  const transport = rns?.transport;
  if (transport?.hasPath?.(destinationHash)) {
    return { destination, destinationHash };
  }
  if (!transport?.requestPath) {
    return { destination, destinationHash };
  }
  if (onRequest) onRequest();
  await transport.requestPath(destinationHash).catch(() => {
  });
  if (transport.hasPath?.(destinationHash)) {
    return { destination, destinationHash };
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (transport.hasPath?.(destinationHash)) {
      return { destination, destinationHash };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `no path to ${toHex7(destinationHash)} (${appName}.${aspects.join(".")}) resolved within ${timeoutMs}ms (is the node announcing and reachable?)`
  );
}
async function pushDeltas(payloads, targetHash, {
  rns,
  requestPath = SYNC_REQUEST_PATH,
  timeoutMs = DEFAULT_PUSH_TIMEOUT_MS,
  pathTimeoutMs = DEFAULT_PATH_TIMEOUT_MS,
  establishTimeoutMs = DEFAULT_ESTABLISH_TIMEOUT_MS,
  onRequest
} = {}) {
  const { destination } = await ensureSyncPath(rns, targetHash, {
    timeoutMs: pathTimeoutMs,
    onRequest
  });
  const link = await establishLink(destination, { timeoutMs: establishTimeoutMs });
  if (!link) return payloads.map(() => false);
  const accepted = [];
  try {
    for (const payload of payloads) {
      accepted.push(await pushOne(link, requestPath, payload, timeoutMs));
    }
  } finally {
    try {
      await link.teardown();
    } catch {
    }
  }
  return accepted;
}
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
function toHex7(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
export {
  ADMIN_RELATION,
  APP_NAME,
  Action,
  AuthoritativeServer,
  CHALLENGE_ASPECTS,
  CHALLENGE_DESTINATION,
  Challenge,
  ChallengeClient,
  Clock,
  Config,
  DEFAULT_DELETION_HORIZON_DAYS,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_VISITED,
  DEFAULT_PATH_TIMEOUT_MS,
  DEFAULT_PUSH_TIMEOUT_MS,
  DEFAULT_SALT,
  DELIMITER,
  DeltaReceiver,
  Engine,
  HASH_SIZE,
  HLC_BYTES,
  IssuerKeyset,
  Keyring,
  LOGICAL_BITS,
  LOGICAL_MASK,
  LXMF_DELIVERY_TITLE,
  MAX_HLC,
  MAX_LEGACY_SALTS,
  MAX_LOGICAL,
  MAX_PHYSICAL,
  MAX_SEGMENTS,
  NONCE_SIZE,
  NamespaceHasher,
  Operation,
  PHYSICAL_BITS,
  RFED_TOPIC,
  Receipt,
  RnsSyncServer,
  SALT_SIZE,
  SIGNATURE_SIZE,
  SYNC_REQUEST_PATH,
  StateVector,
  ThresholdGroup,
  Tuple,
  Verdict,
  WILDCARD,
  __specVersion__,
  __version__,
  bytesEqual,
  covers,
  ensureSyncPath,
  groupId,
  handlePush,
  packAck,
  packHlc,
  parseObject,
  physicalNowMs,
  pushDeltas,
  pushOne,
  split,
  syncRequestHandler,
  unpackAck,
  unpackHlc,
  verifyOperation
};
