import crypto from "../src/shims/crypto-subtle.js";

// node_modules/@reticulum/core/src/crypto/keys.js
async function generateEd25519KeyPair() {
  return (
    /** @type {Promise<KeyPair>} */
    crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  );
}
async function generateX25519KeyPair() {
  return (
    /** @type {Promise<KeyPair>} */
    crypto.subtle.generateKey({ name: "X25519" }, true, [
      "deriveKey",
      "deriveBits"
    ])
  );
}
async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey("raw", publicKey);
  return new Uint8Array(
    /** @type {any} */
    exported
  );
}
async function importEd25519PublicKey(rawKey) {
  return await crypto.subtle.importKey(
    "raw",
    /** @type {any} */
    rawKey,
    { name: "Ed25519" },
    true,
    ["verify"]
  );
}
async function importX25519PublicKey(rawKey) {
  return await crypto.subtle.importKey(
    "raw",
    /** @type {any} */
    rawKey,
    { name: "X25519" },
    true,
    []
  );
}
async function exportRawPrivateKey(privateKey) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return new Uint8Array(pkcs8).slice(-32);
}
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
  return await crypto.subtle.importKey(
    "pkcs8",
    /** @type {any} */
    wrapped,
    { name: "Ed25519" },
    true,
    ["sign"]
  );
}
function base64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - s.length % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function derivePublicKeyFromPrivate(privateKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const raw = base64urlToBytes(
    /** @type {string} */
    jwk.x
  );
  const algorithm = (
    /** @type {{ name: string }} */
    privateKey.algorithm
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    /** @type {any} */
    raw,
    { name: algorithm.name },
    true,
    algorithm.name === "Ed25519" ? ["verify"] : []
  );
  return { publicKey, raw };
}
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
  return await crypto.subtle.importKey(
    "pkcs8",
    /** @type {any} */
    wrapped,
    { name: "X25519" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

// node_modules/@reticulum/core/src/crypto/hmac.js
async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    /** @type {any} */
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const cleanData = new Uint8Array(data);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, cleanData);
  return new Uint8Array(signature);
}

// node_modules/@reticulum/core/src/crypto/ciphers.js
async function hkdf(masterKey, salt, info, lengthInBytes) {
  const prk = await hmac(
    /** @type {any} */
    salt.length === 0 ? new Uint8Array(32) : salt,
    masterKey
  );
  const okm = new Uint8Array(lengthInBytes);
  let lastT = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < lengthInBytes) {
    const input = new Uint8Array(lastT.length + info.length + 1);
    input.set(lastT, 0);
    input.set(info, lastT.length);
    input[input.length - 1] = counter;
    const t = (
      /** @type {any} */
      await hmac(prk, input)
    );
    const toCopy = Math.min(t.length, lengthInBytes - offset);
    okm.set(
      /** @type {any} */
      t.slice(0, toCopy),
      offset
    );
    offset += toCopy;
    lastT = t;
    counter++;
  }
  return okm;
}
async function encryptAES(key, iv, data) {
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: (
      /** @type {any} */
      iv
    ) },
    key,
    /** @type {any} */
    data
  );
  return new Uint8Array(
    /** @type {any} */
    encrypted
  );
}
async function decryptAES(key, iv, data) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: (
      /** @type {any} */
      iv
    ) },
    key,
    /** @type {any} */
    data
  );
  return new Uint8Array(
    /** @type {any} */
    decrypted
  );
}

// node_modules/@reticulum/core/src/crypto/token.js
var MODE = {
  AES_128_CBC: "AES_128_CBC",
  AES_256_CBC: "AES_256_CBC"
};
var Token = class {
  /**
   * @param {Uint8Array} key
   * @param {string} [mode=MODE.AES_256_CBC]
   */
  constructor(key, mode = MODE.AES_256_CBC) {
    if (!key) throw new Error("Token key cannot be null");
    if (mode === MODE.AES_128_CBC) {
      if (key.length !== 32)
        throw new Error("Token key must be 32 bytes for AES_128_CBC");
      this.mode = MODE.AES_128_CBC;
      this.signingKey = key.slice(0, 16);
      this.encryptionKey = key.slice(16);
      this.algorithm = "AES-CBC";
    } else if (mode === MODE.AES_256_CBC) {
      if (key.length !== 64)
        throw new Error("Token key must be 64 bytes for AES_256_CBC");
      this.mode = MODE.AES_256_CBC;
      this.signingKey = key.slice(0, 32);
      this.encryptionKey = key.slice(32);
      this.algorithm = "AES-CBC";
    } else {
      throw new Error("Invalid token mode");
    }
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
    if (token.length <= 32)
      throw new Error(
        "Cannot verify HMAC on token of only " + token.length + " bytes"
      );
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
    if (!(data instanceof Uint8Array))
      throw new TypeError("Token plaintext input must be Uint8Array");
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      this.encryptionKey,
      { name: this.algorithm },
      false,
      ["encrypt"]
    );
    const ciphertext = await encryptAES(cryptoKey, iv, data);
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
    if (!(token instanceof Uint8Array))
      throw new TypeError("Token must be Uint8Array");
    if (!await this.verifyHmac(token))
      throw new Error("Token HMAC was invalid");
    const iv = token.slice(0, 16);
    const ciphertext = token.slice(16, -32);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      this.encryptionKey,
      { name: this.algorithm },
      // Assuming this evaluates to "AES-CBC"
      false,
      ["decrypt"]
    );
    const decryptedPlaintext = await decryptAES(cryptoKey, iv, ciphertext);
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
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }
};

// node_modules/@reticulum/core/src/utils/encoding.js
function toHex(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("toHex expects a Uint8Array");
  }
  const hex = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    hex[i] = bytes[i].toString(16).padStart(2, "0");
  }
  return hex.join("");
}
function bytesEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
    throw new TypeError("bytesEqual expects Uint8Array arguments");
  }
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function concatBytes(...arrays) {
  const parts = arrays.map(
    (a) => a instanceof Uint8Array ? a : new Uint8Array(
      /** @type {any} */
      a
    )
  );
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
function bytesToBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytesToBase64 expects a Uint8Array");
  }
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
var B64_DEC = (() => {
  const t = new Int8Array(128).fill(-1);
  const std = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < std.length; i++) t[std.charCodeAt(i)] = i;
  t["-".charCodeAt(0)] = 62;
  t["_".charCodeAt(0)] = 63;
  return t;
})();
function base64ToBytes(str) {
  if (typeof str !== "string") {
    throw new TypeError("base64ToBytes expects a string");
  }
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
function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlToBytes(str) {
  return base64ToBytes(str);
}
function fromHex(hexString) {
  if (typeof hexString !== "string") {
    throw new TypeError("fromHex expects a string");
  }
  const cleanHex = hexString.replace(/[\s-]/g, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Hex string must have an even number of characters");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const start = i * 2;
    bytes[i] = parseInt(cleanHex.substring(start, start + 2), 16);
  }
  return bytes;
}

// node_modules/@reticulum/core/src/utils/log.js
var LogLevel = {
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
var LOG_LEVEL_ENV = "RETICULUM_LOG_LEVEL";
var DEFAULT_LOG_LEVEL = LogLevel.NOTICE;
var LEVEL_BY_NAME = new Map(
  Object.entries(LogLevel).map(([name, value]) => [name.toLowerCase(), value])
);
function readEnv(name) {
  try {
    const g = globalThis;
    const fromProcess = g?.process?.env?.[name];
    if (fromProcess !== void 0) return fromProcess;
    const fromDeno = g?.Deno?.env?.get?.(name);
    if (fromDeno !== void 0) return fromDeno;
  } catch {
  }
  return void 0;
}
function parseLogLevel(value, fallback = DEFAULT_LOG_LEVEL) {
  if (value === void 0 || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "number") {
    return clamp(Number.isFinite(value) ? Math.trunc(value) : fallback);
  }
  const trimmed = String(value).trim();
  if (/^-?\d+$/.test(trimmed)) {
    return clamp(Number.parseInt(trimmed, 10));
  }
  const byName = LEVEL_BY_NAME.get(trimmed.toLowerCase());
  return byName ?? fallback;
}
var clamp = (n) => Math.min(LogLevel.EXTREME, Math.max(LogLevel.CRITICAL, n));
var logLevel = parseLogLevel(readEnv(LOG_LEVEL_ENV), DEFAULT_LOG_LEVEL);
function setLogLevel(level) {
  logLevel = parseLogLevel(level, logLevel);
}
function getLogLevel() {
  return logLevel;
}
function log(module, message, level = LogLevel.DEBUG) {
  if (level > logLevel) {
    return;
  }
  console.log((/* @__PURE__ */ new Date()).toISOString(), `[${module}]`, message);
}

// node_modules/@reticulum/core/src/core/identity.js
var Identity = class _Identity extends EventTarget {
  /**
   * Truncated-hash length in bytes. Destination, identity, and address
   * hashes are the first 16 bytes of a SHA-256 digest (the Python reference
   * expresses this as `RNS.Reticulum.TRUNCATED_HASHLENGTH//8`, in bits).
   */
  static TRUNCATED_HASH_LENGTH = 16;
  appData = new Uint8Array();
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
      log(
        "Identity",
        "No storage adapter provided. Generating ephemeral identity.",
        LogLevel.WARNING
      );
      return await _Identity.generate();
    }
    let savedBytes = null;
    try {
      savedBytes = await storageAdapter.loadKey();
    } catch (e) {
      log(
        "Identity",
        `Failed to read identity from storage: ${e}`,
        LogLevel.ERROR
      );
      throw new Error(`Failed to read identity from storage: ${e}`);
    }
    if (savedBytes) {
      if (savedBytes.length === 128) {
        const identity = await _Identity.fromBytes(savedBytes);
        if (identity) return identity;
      }
      log(
        "Identity",
        "Stored identity key is present but could not be loaded (corrupt or wrong length). Refusing to overwrite; remove the file manually to regenerate.",
        LogLevel.ERROR
      );
      throw new Error(
        "Stored identity key is present but could not be loaded; refusing to overwrite it"
      );
    }
    const newIdentity = await _Identity.generate();
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
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      /** @type {any} */
      data
    );
    return new Uint8Array(hashBuffer);
  }
  /**
   * Get a truncated SHA-256 hash of passed data.
   * @param {Uint8Array} data
   * @returns {Promise<Uint8Array>}
   */
  static async truncatedHash(data) {
    const fullHash2 = await _Identity.fullHash(data);
    return fullHash2.slice(0, _Identity.TRUNCATED_HASH_LENGTH);
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
    return crypto.getRandomValues(
      new Uint8Array(_Identity.TRUNCATED_HASH_LENGTH)
    );
  }
  /**
   * Load an identity from a public key.
   * @param {Uint8Array} publicKey
   * @returns {Promise<Identity>}
   */
  static async fromPublicKey(publicKey) {
    const ed25519PubBytes = new Uint8Array(32);
    const x25519PubBytes = new Uint8Array(32);
    x25519PubBytes.set(publicKey.subarray(0, 32), 0);
    ed25519PubBytes.set(publicKey.subarray(32, 64), 0);
    const x25519Pub = await crypto.subtle.importKey(
      "raw",
      x25519PubBytes,
      { name: "X25519" },
      true,
      []
    );
    const ed25519Pub = await crypto.subtle.importKey(
      "raw",
      ed25519PubBytes,
      { name: "Ed25519" },
      true,
      ["verify"]
    );
    const cleanPublicKey = new Uint8Array(64);
    cleanPublicKey.set(publicKey.subarray(0, 64), 0);
    const identityHash = await _Identity.truncatedHash(cleanPublicKey);
    return new _Identity(
      null,
      null,
      x25519Pub,
      ed25519Pub,
      cleanPublicKey,
      identityHash
    );
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
    const publicKey = new Uint8Array(64);
    publicKey.set(x25519PubBytes, 0);
    publicKey.set(ed25519PubBytes, 32);
    const identityHash = await _Identity.truncatedHash(publicKey);
    return new _Identity(
      x25519.privateKey,
      ed25519.privateKey,
      x25519.publicKey,
      ed25519.publicKey,
      publicKey,
      identityHash
    );
  }
  /**
   * Get the raw private key bytes (64 bytes).
   * @returns {Promise<Uint8Array>}
   */
  async getPrivateKey() {
    if (!this.x25519Priv || !this.ed25519Priv)
      throw new Error(
        "Cannot get private key because identity does not hold a private key"
      );
    const x25519PrivBytes = await exportRawPrivateKey(this.x25519Priv);
    const ed25519PrivBytes = await exportRawPrivateKey(this.ed25519Priv);
    const x25519PubBytes = await exportPublicKey(this.x25519Pub);
    const ed25519PubBytes = await exportPublicKey(this.ed25519Pub);
    const privKey = new Uint8Array(128);
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
    const publicKey = new Uint8Array(64);
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
      if (bytes.length !== 64) {
        throw new Error(
          `Expected 64 bytes of private key material, got ${bytes.length}`
        );
      }
      const x25519Priv = await importRawX25519PrivateKey(bytes.slice(0, 32));
      const ed25519Priv = await importRawEd25519PrivateKey(bytes.slice(32, 64));
      const x25519 = await derivePublicKeyFromPrivate(x25519Priv);
      const ed25519 = await derivePublicKeyFromPrivate(ed25519Priv);
      const publicKey = new Uint8Array(64);
      publicKey.set(x25519.raw, 0);
      publicKey.set(ed25519.raw, 32);
      const identityHash = await _Identity.truncatedHash(publicKey);
      return new _Identity(
        x25519Priv,
        ed25519Priv,
        x25519.publicKey,
        ed25519.publicKey,
        publicKey,
        identityHash
      );
    } catch (e) {
      log(
        "Identity",
        `Failed to load identity from private key: ${e}`,
        LogLevel.ERROR
      );
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
      const publicKey = new Uint8Array(64);
      publicKey.set(bytes.slice(32, 64), 0);
      publicKey.set(bytes.slice(96, 128), 32);
      const identityHash = await _Identity.truncatedHash(publicKey);
      return new _Identity(
        x25519Priv,
        ed25519Priv,
        x25519Pub,
        ed25519Pub,
        publicKey,
        identityHash
      );
    } catch (e) {
      log(
        "Identity",
        `Failed to load identity from bytes: ${e}`,
        LogLevel.ERROR
      );
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
    if (!this.ed25519Pub)
      throw new Error(
        "Encryption failed because identity does not hold a public key"
      );
    const ephemeralKey = await generateX25519KeyPair();
    const ephemeralPubBytes = await exportPublicKey(ephemeralKey.publicKey);
    let targetPublicKey;
    if (ratchet) {
      targetPublicKey = await crypto.subtle.importKey(
        "raw",
        /** @type {any} */
        ratchet,
        { name: "X25519" },
        true,
        []
      );
    } else {
      targetPublicKey = this.x25519Pub;
    }
    const sharedKeyBuffer = await crypto.subtle.deriveBits(
      {
        name: "X25519",
        public: targetPublicKey
      },
      /** @type {any} */
      ephemeralKey.privateKey,
      256
    );
    const sharedKey = new Uint8Array(sharedKeyBuffer);
    const derivedKey = await hkdf(
      sharedKey,
      this.getSalt(),
      this.getContext() || new Uint8Array(0),
      64
    );
    const token = new Token(derivedKey);
    const ciphertext = await token.encrypt(
      /** @type {any} */
      plaintext
    );
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
    if (!this.ed25519Priv)
      throw new Error(
        "Decryption failed because identity does not hold a private key"
      );
    if (ciphertextToken.length > 32) {
      const peerPubBytes = ciphertextToken.slice(0, 32);
      const ciphertext = ciphertextToken.slice(32);
      const peerPub = await crypto.subtle.importKey(
        "raw",
        /** @type {any} */
        peerPubBytes,
        { name: "X25519" },
        true,
        []
      );
      let plaintext = null;
      if (ratchets) {
        for (const ratchet of ratchets) {
          try {
            const ratchetPrv = await importRawX25519PrivateKey(ratchet);
            const sharedKeyBuffer = await crypto.subtle.deriveBits(
              {
                name: "X25519",
                public: peerPub
              },
              /** @type {any} */
              ratchetPrv,
              256
            );
            const sharedKey = new Uint8Array(sharedKeyBuffer);
            const derivedKey = await hkdf(
              sharedKey,
              this.getSalt(),
              this.getContext() || new Uint8Array(0),
              64
            );
            const token = new Token(derivedKey);
            plaintext = await token.decrypt(ciphertext);
            if (plaintext) break;
          } catch (e) {
          }
        }
      }
      if (!plaintext) {
        try {
          const sharedKeyBuffer = await crypto.subtle.deriveBits(
            {
              name: "X25519",
              public: peerPub
            },
            /** @type {any} */
            this.x25519Priv,
            256
          );
          const sharedKey = new Uint8Array(sharedKeyBuffer);
          const derivedKey = await hkdf(
            sharedKey,
            this.getSalt(),
            this.getContext() || new Uint8Array(0),
            64
          );
          const token = new Token(derivedKey);
          plaintext = await token.decrypt(ciphertext);
        } catch (e) {
          plaintext = null;
        }
      }
      return plaintext;
    } else {
      return null;
    }
  }
  /**
   * Signs information by the identity.
   * @param {Uint8Array} message
   * @returns {Promise<Uint8Array>}
   */
  async sign(message) {
    if (!this.ed25519Priv)
      throw new Error(
        "Signing failed because identity does not hold a private key"
      );
    const signature = await crypto.subtle.sign(
      "Ed25519",
      this.ed25519Priv,
      /** @type {any} */
      message
    );
    const sigArray = new Uint8Array(signature);
    if (sigArray.length !== 64) {
      throw new Error(
        `CRITICAL: Signature length is ${sigArray.length}, expected 64!`
      );
    }
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
    const signatureView = new Uint8Array(
      signature.buffer,
      signature.byteOffset,
      64
    );
    const dataView = new Uint8Array(
      messageId.buffer,
      messageId.byteOffset,
      messageId.byteLength
    );
    return await crypto.subtle.verify(
      "Ed25519",
      this.ed25519Pub,
      /** @type {any} */
      signatureView,
      /** @type {any} */
      dataView
    );
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
      log(
        "Identity",
        `Announce body too short (${data.length} bytes; need ${sigEnd} for context_flag=${contextFlag ? 1 : 0})`,
        LogLevel.WARNING
      );
      return null;
    }
    const publicKey = data.subarray(0, 64);
    const nameHash = data.subarray(64, 74);
    const randomHash = data.subarray(74, 84);
    let ratchet = null;
    if (contextFlag) {
      ratchet = data.subarray(84, 116);
    }
    const signature = data.subarray(sigOffset, sigEnd);
    const appData = data.length > sigEnd ? data.slice(sigEnd) : null;
    const identity = await _Identity.fromPublicKey(publicKey);
    const ratchetForSig = ratchet ?? new Uint8Array(0);
    const appDataForSig = appData ?? new Uint8Array(0);
    const signedData = new Uint8Array(
      destinationHash.length + publicKey.length + nameHash.length + randomHash.length + ratchetForSig.length + appDataForSig.length
    );
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
    const signatureOk = await identity.validate(signature, signedData);
    if (!signatureOk) {
      log(
        "Identity",
        "Announce signature verification failed \u2014 rejecting",
        LogLevel.WARNING
      );
      return null;
    }
    const combined = new Uint8Array(
      nameHash.length + identity.identityHash.length
    );
    combined.set(nameHash, 0);
    combined.set(identity.identityHash, nameHash.length);
    const expectedHash = await _Identity.truncatedHash(combined);
    if (!bytesEqual(expectedHash, destinationHash)) {
      log(
        "Identity",
        "Announce destination_hash mismatch \u2014 rejecting",
        LogLevel.WARNING
      );
      return null;
    }
    identity.appData = appData ?? new Uint8Array();
    return { identity, nameHash, randomHash, ratchet, signature, appData };
  }
};

// node_modules/@reticulum/core/src/core/packet.js
function getEnumName(enumObj, value) {
  return Object.keys(enumObj).find((key) => enumObj[key] === value) || value.toString();
}
var PacketType = {
  DATA: 0,
  ANNOUNCE: 1,
  LINKREQUEST: 2,
  PROOF: 3
};
var TransportType = {
  BROADCAST: 0,
  TRANSPORT: 1,
  RELAY: 2
};
var HeaderType = {
  HEADER_1: 0,
  HEADER_2: 1
};
var ContextType = {
  NONE: 0,
  RESOURCE: 1,
  RESOURCE_ADV: 2,
  RESOURCE_REQ: 3,
  RESOURCE_HMU: 4,
  RESOURCE_PRF: 5,
  RESOURCE_ICL: 6,
  RESOURCE_RCL: 7,
  CACHE_REQUEST: 8,
  REQUEST: 9,
  RESPONSE: 10,
  PATH_RESPONSE: 11,
  COMMAND: 12,
  COMMAND_STATUS: 13,
  CHANNEL: 14,
  KEEPALIVE: 250,
  LINKIDENTIFY: 251,
  LINKCLOSE: 252,
  LINKPROOF: 253,
  LRRTT: 254,
  LRPROOF: 255
};
var DestType = {
  SINGLE: 0,
  GROUP: 1,
  PLAIN: 2,
  LINK: 3
};
var PATHFINDER_M = 128;
var Packet = class _Packet {
  /**
   * Constructs a Reticulum packet from header, destination and payload fields.
   * @param {Object} options
   * @param {HeaderType} [options.headerType]
   * @param {number} [options.hops]
   * @param {number} [options.transportType]
   * @param {DestType} [options.destinationType]
   * @param {PacketType} options.packetType
   * @param {boolean} [options.contextFlag]
   * @param {Uint8Array} options.destinationHash
   * @param {number} [options.contextByte]
   * @param {Uint8Array} [options.payload]
   * @param {Uint8Array} [options.transportId]
   * @param {Uint8Array} [options.raw]
   */
  constructor(options) {
    this.headerType = options.headerType || HeaderType.HEADER_1;
    this.hops = options.hops || 0;
    this.transportType = options.transportType || 0;
    this.destinationType = options.destinationType || 0;
    this.packetType = options.packetType || PacketType.DATA;
    this.contextFlag = options.contextFlag || false;
    this.destinationHash = options.destinationHash;
    this.contextByte = options.contextByte || ContextType.NONE;
    this.payload = options.payload || new Uint8Array(0);
    this.transportId = options.transportId;
    this.raw = options.raw || new Uint8Array(0);
  }
  /**
   * Returns the canonical bytes used to compute the packet hash
   * (flags byte followed by the destination/context/payload portion),
   * matching `RNS.Packet.get_hashable_part` and microReticulum's
   * `Packet::get_hashable_part`.
   *
   * The masked flags byte (low nibble) is prefixed to the raw packet with the
   * flags and hops bytes skipped — and, for HEADER_2, the 16-byte transport_id
   * as well (it is rewritten per hop, so it must not participate in the hash):
   *   HEADER_1: (flags & 0x0F) ‖ raw[2:]
   *   HEADER_2: (flags & 0x0F) ‖ raw[18:]
   *
   * @returns {Uint8Array<ArrayBuffer>}
   */
  getHashablePart() {
    if (!this.raw || this.raw.length === 0) {
      this.raw = this.serialize();
    }
    const flags = this.raw[0] & 15;
    const sliceOffset = this.headerType === HeaderType.HEADER_2 ? 18 : 2;
    const payloadPart = this.raw.slice(sliceOffset);
    const hashablePart = new Uint8Array(1 + payloadPart.length);
    hashablePart[0] = flags;
    hashablePart.set(payloadPart, 1);
    return hashablePart;
  }
  /**
   * Computes the SHA-256 packet hash over {@link getHashablePart}.
   * @returns {Promise<Uint8Array>}
   */
  async getHash() {
    const hashablePart = this.getHashablePart();
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashablePart);
    return new Uint8Array(hashBuffer);
  }
  /**
   * Encodes header type, context flag, transport/destination type, packet type
   * and context byte into the single Reticulum flags byte.
   * @returns {number}
   * @private
   */
  _buildFlagsByte() {
    let flags = 0;
    if (this.headerType === HeaderType.HEADER_2) flags |= 64;
    if (this.contextFlag) flags |= 32;
    if (this.transportType === 1) flags |= 16;
    if (this.contextByte === ContextType.LRPROOF) {
      flags |= DestType.LINK << 2;
    } else {
      flags |= (this.destinationType & 3) << 2;
    }
    flags |= this.packetType & 3;
    return flags;
  }
  /**
   * Serializes the Packet into the exact Reticulum wire format.
   * @returns {Uint8Array}
   */
  serialize() {
    const DST_LEN = 16;
    const flags = this._buildFlagsByte();
    let length = 2;
    if (this.headerType === HeaderType.HEADER_2) {
      length += DST_LEN;
    }
    length += DST_LEN;
    length += 1;
    length += this.payload.length;
    const uint8 = new Uint8Array(length);
    uint8[0] = flags;
    uint8[1] = this.hops & 255;
    let offset = 2;
    if (this.headerType === HeaderType.HEADER_2) {
      if (!this.transportId)
        throw new Error("Header type 2 requires a transportId");
      uint8.set(this.transportId.subarray(0, 16), offset);
      offset += DST_LEN;
    }
    uint8.set(this.destinationHash.subarray(0, 16), offset);
    offset += DST_LEN;
    uint8[offset] = this.contextByte || 0;
    offset += 1;
    uint8.set(this.payload, offset);
    return uint8;
  }
  /**
   * Parses a raw Reticulum wire-format packet into a {@link Packet}.
   * @param {Uint8Array} data
   * @returns {Packet}
   */
  static deserialize(data) {
    const DST_LEN = 16;
    if (data.length < 2) throw new Error("Packet too short");
    const flags = data[0];
    const hops = data[1];
    const isHeader2 = (flags & 64) !== 0;
    const headerType = isHeader2 ? HeaderType.HEADER_2 : HeaderType.HEADER_1;
    const contextFlag = (flags & 32) !== 0;
    const transportType = (flags & 16) !== 0 ? 1 : 0;
    const destinationType = (flags & 12) >> 2;
    const packetType = flags & 3;
    const minLen = isHeader2 ? 2 + 2 * DST_LEN + 1 : 2 + DST_LEN + 1;
    if (data.length < minLen) throw new Error("Packet too short");
    if (hops >= PATHFINDER_M) {
      throw new Error(`Invalid hop count ${hops}`);
    }
    let offset = 2;
    let transportId = null;
    if (isHeader2) {
      transportId = data.slice(offset, offset + DST_LEN);
      offset += DST_LEN;
    }
    const destinationHash = data.slice(offset, offset + DST_LEN);
    offset += DST_LEN;
    const contextByte = data[offset];
    offset += 1;
    if (offset >= data.length) throw new Error("Zero-length data field");
    const payload = data.slice(offset);
    return new _Packet({
      headerType,
      hops,
      transportType,
      destinationType,
      packetType,
      contextFlag,
      destinationHash,
      contextByte,
      payload,
      transportId: transportId ?? void 0,
      raw: data
    });
  }
};

// node_modules/@reticulum/core/src/utils/msgpack.js
var MAX_DEPTH = 128;
var MicroMsgPack = class _MicroMsgPack {
  /**
   * Encodes a JavaScript value into a MessagePack Uint8Array.
   * @param {any} value
   * @returns {Uint8Array}
   */
  static encode(value) {
    const bytes = [];
    _MicroMsgPack._encodeValue(value, bytes);
    return new Uint8Array(bytes);
  }
  /**
   * Encodes a number as a MessagePack float64.
   * @param {number} value
   * @returns {Uint8Array}
   */
  static encodeFloat64(value) {
    const bytes = [];
    _MicroMsgPack._encodeFloat64(value, bytes);
    return new Uint8Array(bytes);
  }
  /**
   * Decodes a MessagePack Uint8Array into a JavaScript value.
   * @param {Uint8Array} uint8array
   * @returns {any}
   */
  static decode(uint8array) {
    const state = {
      view: new DataView(
        uint8array.buffer,
        uint8array.byteOffset,
        uint8array.byteLength
      ),
      offset: 0
    };
    return _MicroMsgPack._decodeValue(state);
  }
  // --- ENCODER ---
  /**
   * @param {any} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeValue(value, bytes) {
    if (value === null || value === void 0) {
      bytes.push(192);
    } else if (typeof value === "boolean") {
      bytes.push(value ? 195 : 194);
    } else if (typeof value === "number") {
      _MicroMsgPack._encodeNumber(value, bytes);
    } else if (typeof value === "bigint") {
      _MicroMsgPack._encodeBigInt(value, bytes);
    } else if (typeof value === "string") {
      _MicroMsgPack._encodeString(value, bytes);
    } else if (value instanceof Uint8Array) {
      _MicroMsgPack._encodeBinary(value, bytes);
    } else if (Array.isArray(value)) {
      _MicroMsgPack._encodeArray(value, bytes);
    } else if (value instanceof Map) {
      _MicroMsgPack._encodeMap(value, bytes);
    } else if (typeof value === "object") {
      _MicroMsgPack._encodeMap(value, bytes);
    } else {
      throw new Error(`Unsupported data type: ${typeof value}`);
    }
  }
  /**
   * @param {number} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeNumber(value, bytes) {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        if (value <= 127) {
          bytes.push(value);
        } else if (value <= 255) {
          bytes.push(204, value);
        } else if (value <= 65535) {
          bytes.push(205, value >> 8 & 255, value & 255);
        } else if (value <= 4294967295) {
          bytes.push(
            206,
            value >> 24 & 255,
            value >> 16 & 255,
            value >> 8 & 255,
            value & 255
          );
        } else if (value <= Number.MAX_SAFE_INTEGER) {
          _MicroMsgPack._encodeUint64(value, bytes);
        } else {
          _MicroMsgPack._encodeFloat64(value, bytes);
        }
      } else {
        if (value >= -32) {
          bytes.push(224 | value + 32);
        } else if (value >= -128) {
          bytes.push(208, value & 255);
        } else if (value >= -32768) {
          bytes.push(209, value >> 8 & 255, value & 255);
        } else if (value >= -2147483648) {
          bytes.push(
            210,
            value >> 24 & 255,
            value >> 16 & 255,
            value >> 8 & 255,
            value & 255
          );
        } else if (value >= -Number.MAX_SAFE_INTEGER) {
          _MicroMsgPack._encodeInt64(value, bytes);
        } else {
          _MicroMsgPack._encodeFloat64(value, bytes);
        }
      }
    } else {
      _MicroMsgPack._encodeFloat64(value, bytes);
    }
  }
  /**
   * @param {number} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeFloat64(value, bytes) {
    bytes.push(203);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setFloat64(0, value, false);
    bytes.push(...new Uint8Array(buffer));
  }
  /**
   * Encodes a BigInt as a big-endian 64-bit integer. Non-negative values use
   * uint64 (0xcf); negative values use int64 (0xd3). Throws a RangeError when
   * the magnitude does not fit in 64 bits, since MessagePack has no wider
   * integer type.
   * @param {bigint} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeBigInt(value, bytes) {
    if (value >= 0n) {
      if (value > 0xffffffffffffffffn) {
        throw new RangeError(`BigInt ${value} exceeds uint64 range`);
      }
      bytes.push(207);
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setBigUint64(0, value, false);
      bytes.push(...new Uint8Array(buffer));
    } else {
      if (value < -0x8000000000000000n) {
        throw new RangeError(`BigInt ${value} is below int64 range`);
      }
      bytes.push(211);
      const buffer = new ArrayBuffer(8);
      new DataView(buffer).setBigInt64(0, value, false);
      bytes.push(...new Uint8Array(buffer));
    }
  }
  /**
   * @param {number} value - positive integer ≤ Number.MAX_SAFE_INTEGER
   * @param {number[]} bytes
   * @private
   */
  static _encodeUint64(value, bytes) {
    bytes.push(207);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigUint64(0, BigInt(value), false);
    bytes.push(...new Uint8Array(buffer));
  }
  /**
   * @param {number} value - negative integer ≥ -Number.MAX_SAFE_INTEGER
   * @param {number[]} bytes
   * @private
   */
  static _encodeInt64(value, bytes) {
    bytes.push(211);
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setBigInt64(0, BigInt(value), false);
    bytes.push(...new Uint8Array(buffer));
  }
  /**
   * @param {string} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeString(value, bytes) {
    const utf8 = new TextEncoder().encode(value);
    const len = utf8.length;
    if (len <= 31) {
      bytes.push(160 | len);
    } else if (len <= 255) {
      bytes.push(217, len);
    } else if (len <= 65535) {
      bytes.push(218, len >> 8 & 255, len & 255);
    } else {
      bytes.push(
        219,
        len >> 24 & 255,
        len >> 16 & 255,
        len >> 8 & 255,
        len & 255
      );
    }
    pushChunked(bytes, utf8);
  }
  /**
   * @param {Uint8Array} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeBinary(value, bytes) {
    const len = value.length;
    if (len <= 255) {
      bytes.push(196, len);
    } else if (len <= 65535) {
      bytes.push(197, len >> 8 & 255, len & 255);
    } else {
      bytes.push(
        198,
        len >> 24 & 255,
        len >> 16 & 255,
        len >> 8 & 255,
        len & 255
      );
    }
    pushChunked(bytes, value);
  }
  /**
   * @param {any[]} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeArray(value, bytes) {
    const len = value.length;
    if (len <= 15) {
      bytes.push(144 | len);
    } else if (len <= 65535) {
      bytes.push(220, len >> 8 & 255, len & 255);
    } else {
      bytes.push(
        221,
        len >> 24 & 255,
        len >> 16 & 255,
        len >> 8 & 255,
        len & 255
      );
    }
    for (const item of value) {
      _MicroMsgPack._encodeValue(item, bytes);
    }
  }
  /**
   * @param {Object<string, any>} value
   * @param {number[]} bytes
   * @private
   */
  static _encodeMap(value, bytes) {
    let entries;
    if (value instanceof Map) {
      entries = Array.from(value.entries());
    } else {
      entries = Object.entries(value);
    }
    const len = entries.length;
    if (len <= 15) {
      bytes.push(128 | len);
    } else if (len <= 65535) {
      bytes.push(222, len >> 8 & 255, len & 255);
    } else {
      bytes.push(
        223,
        len >> 24 & 255,
        len >> 16 & 255,
        len >> 8 & 255,
        len & 255
      );
    }
    for (const [key, val] of entries) {
      _MicroMsgPack._encodeValue(key, bytes);
      _MicroMsgPack._encodeValue(val, bytes);
    }
  }
  // --- DECODER ---
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {any}
   * @private
   */
  static _decodeValue(state, depth = 0) {
    if (state.offset >= state.view.byteLength)
      throw new Error("Unexpected end of data");
    const byte = state.view.getUint8(state.offset++);
    if (byte <= 127) return byte;
    if (byte >= 128 && byte <= 143)
      return _MicroMsgPack._decodeMap(state, byte & 15, depth + 1);
    if (byte >= 144 && byte <= 159)
      return _MicroMsgPack._decodeArray(state, byte & 15, depth + 1);
    if (byte >= 160 && byte <= 191)
      return _MicroMsgPack._decodeString(state, byte & 31);
    if (byte >= 224) return byte - 256;
    switch (byte) {
      case 192:
        return null;
      // nil
      case 194:
        return false;
      // false
      case 195:
        return true;
      // true
      case 196:
        return _MicroMsgPack._decodeBinary(
          state,
          _MicroMsgPack._readUint8(state)
        );
      // bin 8
      case 197:
        return _MicroMsgPack._decodeBinary(
          state,
          _MicroMsgPack._readUint16(state)
        );
      // bin 16
      case 198:
        return _MicroMsgPack._decodeBinary(
          state,
          _MicroMsgPack._readUint32(state)
        );
      // bin 32
      case 204:
        return _MicroMsgPack._readUint8(state);
      // uint 8
      case 205:
        return _MicroMsgPack._readUint16(state);
      // uint 16
      case 206:
        return _MicroMsgPack._readUint32(state);
      // uint 32
      case 207:
        return _MicroMsgPack._readUint64(state);
      // uint 64
      case 203:
        return _MicroMsgPack._readFloat64(state);
      // float 64
      case 208:
        return _MicroMsgPack._readInt8(state);
      // int 8
      case 209:
        return _MicroMsgPack._readInt16(state);
      // int 16
      case 210:
        return _MicroMsgPack._readInt32(state);
      // int 32
      case 211:
        return _MicroMsgPack._readInt64(state);
      // int 64
      case 217:
        return _MicroMsgPack._decodeString(
          state,
          _MicroMsgPack._readUint8(state)
        );
      // str 8
      case 218:
        return _MicroMsgPack._decodeString(
          state,
          _MicroMsgPack._readUint16(state)
        );
      // str 16
      case 219:
        return _MicroMsgPack._decodeString(
          state,
          _MicroMsgPack._readUint32(state)
        );
      // str 32
      case 220:
        return _MicroMsgPack._decodeArray(
          state,
          _MicroMsgPack._readUint16(state),
          depth + 1
        );
      // array 16
      case 221:
        return _MicroMsgPack._decodeArray(
          state,
          _MicroMsgPack._readUint32(state),
          depth + 1
        );
      // array 32
      case 222:
        return _MicroMsgPack._decodeMap(
          state,
          _MicroMsgPack._readUint16(state),
          depth + 1
        );
      // map 16
      case 223:
        return _MicroMsgPack._decodeMap(
          state,
          _MicroMsgPack._readUint32(state),
          depth + 1
        );
      // map 32
      default:
        throw new Error(
          `Unimplemented MessagePack byte: 0x${byte.toString(16)}`
        );
    }
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readUint8(state) {
    return state.view.getUint8(state.offset++);
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readUint16(state) {
    const val = state.view.getUint16(state.offset, false);
    state.offset += 2;
    return val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readUint32(state) {
    const val = state.view.getUint32(state.offset, false);
    state.offset += 4;
    return val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readInt8(state) {
    const val = state.view.getInt8(state.offset);
    state.offset += 1;
    return val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readInt16(state) {
    const val = state.view.getInt16(state.offset, false);
    state.offset += 2;
    return val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readInt32(state) {
    const val = state.view.getInt32(state.offset, false);
    state.offset += 4;
    return val;
  }
  /**
   * Reads a big-endian unsigned 64-bit integer. Returns a JS Number when the
   * value is exactly representable (≤ Number.MAX_SAFE_INTEGER); otherwise
   * returns a BigInt so genuinely 64-bit values (e.g. packed HLC timestamps)
   * survive a round-trip without precision loss.
   * @param {{view: DataView, offset: number}} state
   * @returns {number|bigint}
   * @private
   */
  static _readUint64(state) {
    const val = state.view.getBigUint64(state.offset, false);
    state.offset += 8;
    return val <= Number.MAX_SAFE_INTEGER ? Number(val) : val;
  }
  /**
   * Reads a big-endian signed 64-bit integer. Same Number / BigInt selection
   * rule as {@link _readUint64}: a Number when within the safe-integer range,
   * otherwise a BigInt.
   * @param {{view: DataView, offset: number}} state
   * @returns {number|bigint}
   * @private
   */
  static _readInt64(state) {
    const val = state.view.getBigInt64(state.offset, false);
    state.offset += 8;
    return val >= Number.MIN_SAFE_INTEGER && val <= Number.MAX_SAFE_INTEGER ? Number(val) : val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @returns {number}
   * @private
   */
  static _readFloat64(state) {
    const val = state.view.getFloat64(state.offset, false);
    state.offset += 8;
    return val;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @param {number} length
   * @returns {string}
   * @private
   */
  static _decodeString(state, length) {
    const bytes = new Uint8Array(
      state.view.buffer,
      state.view.byteOffset + state.offset,
      length
    );
    state.offset += length;
    return new TextDecoder().decode(bytes);
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @param {number} length
   * @returns {Uint8Array}
   * @private
   */
  static _decodeBinary(state, length) {
    const remaining = state.view.byteLength - state.offset;
    if (length < 0 || length > remaining) {
      throw new Error("MessagePack binary length exceeds available data");
    }
    const bytes = new Uint8Array(
      state.view.buffer.slice(
        state.view.byteOffset + state.offset,
        state.view.byteOffset + state.offset + length
      )
    );
    state.offset += length;
    return bytes;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @param {number} length
   * @returns {any[]}
   * @private
   */
  static _decodeArray(state, length, depth = 0) {
    if (depth > MAX_DEPTH) {
      throw new Error("MessagePack nesting depth exceeded");
    }
    const arr = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = _MicroMsgPack._decodeValue(state, depth);
    }
    return arr;
  }
  /**
   * @param {{view: DataView, offset: number}} state
   * @param {number} length
   * @param {number} [depth=0]
   * @returns {Record<string, any>}
   * @private
   */
  static _decodeMap(state, length, depth = 0) {
    if (depth > MAX_DEPTH) {
      throw new Error("MessagePack nesting depth exceeded");
    }
    const map = {};
    for (let i = 0; i < length; i++) {
      const key = _MicroMsgPack._decodeValue(state, depth);
      const value = _MicroMsgPack._decodeValue(state, depth);
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        Object.defineProperty(map, key, {
          value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        map[key] = value;
      }
    }
    return map;
  }
};
function pushChunked(bytes, value) {
  const CHUNK = 8192;
  for (let i = 0; i < value.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, value.length);
    const slice = value.subarray(i, end);
    bytes.push(...slice);
  }
}

// node_modules/@reticulum/core/src/core/resource_advertisement.js
var ResourceFlag = {
  ENCRYPTED: 1 << 0,
  COMPRESSED: 1 << 1,
  SPLIT: 1 << 2,
  IS_REQUEST: 1 << 3,
  IS_RESPONSE: 1 << 4,
  HAS_METADATA: 1 << 5
};
var ResourceAdvertisement = class _ResourceAdvertisement {
  /**
   * @param {Object} options
   * @param {number} [options.t] - Transfer size (encrypted byte length on wire).
   * @param {number} [options.d] - Total logical size (original uncompressed).
   * @param {number} [options.n] - Number of parts in this segment.
   * @param {Uint8Array} [options.h] - Resource hash `SHA-256(plaintext ‖ r)` (32B).
   * @param {Uint8Array} [options.r] - Random hash salt (4B).
   * @param {Uint8Array} [options.o] - Original hash of first segment (32B).
   * @param {number} [options.i] - Segment index (1-based).
   * @param {number} [options.l] - Total segments.
   * @param {Uint8Array} [options.q] - Associated REQUEST id, or undefined/None.
   * @param {number} [options.f] - Flags byte.
   * @param {Uint8Array} [options.m] - Hashmap fragment (concatenated 4B map_hashes).
   */
  constructor(options = {}) {
    this.t = options.t || 0;
    this.d = options.d || 0;
    this.n = options.n || 0;
    this.h = options.h || new Uint8Array(0);
    this.r = options.r || new Uint8Array(0);
    this.o = options.o || new Uint8Array(0);
    this.i = options.i || 0;
    this.l = options.l || 0;
    this.q = options.q || void 0;
    this.f = options.f || 0;
    this.m = options.m || new Uint8Array(0);
  }
  // --- Flag accessors (decoded from `f`) ---
  /** @returns {boolean} */
  get encrypted() {
    return !!(this.f >> 0 & 1);
  }
  /** @returns {boolean} */
  get compressed() {
    return !!(this.f >> 1 & 1);
  }
  /** @returns {boolean} */
  get split() {
    return !!(this.f >> 2 & 1);
  }
  /** @returns {boolean} */
  get isRequest() {
    return !!(this.f >> 3 & 1);
  }
  /** @returns {boolean} */
  get isResponse() {
    return !!(this.f >> 4 & 1);
  }
  /** @returns {boolean} */
  get hasMetadata() {
    return !!(this.f >> 5 & 1);
  }
  /**
   * Packs the advertisement into a msgpack `bin`-correct Uint8Array.
   * @returns {Uint8Array}
   */
  pack() {
    const dict = {
      t: this.t,
      d: this.d,
      n: this.n,
      h: this.h,
      r: this.r,
      o: this.o,
      i: this.i,
      l: this.l,
      q: this.q ?? null,
      f: this.f,
      m: this.m
    };
    return MicroMsgPack.encode(dict);
  }
  /**
   * Unpacks an advertisement from its msgpack wire form.
   * @param {Uint8Array} data
   * @returns {ResourceAdvertisement}
   */
  static unpack(data) {
    const dict = MicroMsgPack.decode(data);
    return new _ResourceAdvertisement({
      t: dict.t,
      d: dict.d,
      n: dict.n,
      // MicroMsgPack decodes `bin` to Uint8Array; copy to detach the buffer.
      h: new Uint8Array(dict.h),
      r: new Uint8Array(dict.r),
      o: new Uint8Array(dict.o),
      i: dict.i,
      l: dict.l,
      q: dict.q ? new Uint8Array(dict.q) : void 0,
      f: dict.f,
      m: new Uint8Array(dict.m)
    });
  }
};

// node_modules/@reticulum/core/src/core/resource.js
var ResourceStatus = {
  NONE: 0,
  QUEUED: 1,
  ADVERTISED: 2,
  TRANSFERRING: 3,
  ASSEMBLING: 4,
  AWAITING_PROOF: 5,
  COMPLETE: 6,
  FAILED: 7,
  CORRUPT: 8,
  REJECTED: 9
};
var HASHMAP_IS_NOT_EXHAUSTED = 0;
var HASHMAP_IS_EXHAUSTED = 255;
var Resource = class _Resource extends EventTarget {
  /**
   * Size of the throwaway random prefix prepended to the wire body (§10.2
   * step 3). Distinct from the advertisement `r` field.
   */
  static RANDOM_HASH_SIZE = 4;
  /** `RNS.Reticulum.IFAC_MIN_SIZE` — reserved IFAC bytes when computing SDU. */
  static IFAC_MIN_SIZE = 1;
  /**
   * `RNS.Packet.HEADER_MAXSIZE` — worst-case header after relay HEADER_1→HEADER_2
   * conversion: flags(1) + hops(1) + transport_id(16) + dest_hash(16) + context(1).
   */
  static HEADER_MAX_SIZE = 35;
  /** Initial receiver request window (§10.10). */
  static WINDOW = 4;
  /** Default window cap used for the collision-guard span (§10.10 WINDOW_MAX_SLOW). */
  static WINDOW_MAX_SLOW = 10;
  /** Constants in the advertisement-size formula `HASHMAP_MAX_LEN = (MDU-134)/4`. */
  static HASHMAP_FIXED_OVERHEAD = 134;
  /** Cap on advertised transfer/logical size at accept time (§10.4 bomb defense). */
  static DEFAULT_MAX_SIZE = 32 * 1024 * 1024;
  /**
   * Absolute cap on the advertised part count `n` at accept time. Defends
   * against a single RESOURCE_ADV that advertises a tiny `t` but a huge `n`:
   * the receiver allocates `new Array(n).fill(null)` for the parts, so an
   * unbounded `n` is a one-packet OOM. Set generously enough that any
   * legitimate transfer up to {@link DEFAULT_MAX_SIZE} at the minimum MTU
   * (219 → sdu 183 → ~183k parts for 32 MiB) still fits, with headroom.
   */
  static DEFAULT_MAX_PARTS = 262144;
  /** Receiver request window during a transfer. */
  window = _Resource.WINDOW;
  /** Max encodable metadata size: 3-byte length prefix limits it to 16 MiB-1. */
  static METADATA_MAX_SIZE = 16777215;
  /**
   * Logical bytes per Resource segment (§10.3). Larger payloads are split
   * into `l` sequentially-advertised segments tied together by the first
   * segment's hash (`o`). Segment 1 counts the metadata prefix toward its
   * budget, so its payload share is smaller by the prefix length.
   */
  static MAX_EFFICIENT_SIZE = 1 * 1024 * 1024 - 1;
  /** Sanity ceiling on an advertised total segment count `l`. */
  static DEFAULT_MAX_SEGMENTS = 4096;
  /**
   * Ceiling on the reassembled logical size of a split Resource — the
   * per-segment `t`/`d` caps bound each transfer, this bounds their sum.
   */
  static DEFAULT_MAX_TOTAL_SIZE = 256 * 1024 * 1024;
  /**
   * @param {Object} options
   * @param {Uint8Array|undefined} [options.data] - Sender-side payload.
   * @param {any} [options.metadata] - Sender-side response metadata (§10.4
   *   `x` flag). Encoded as msgpack and prepended to the payload as
   *   `3-byte BE size ‖ packed metadata` before hashing/compression, matching
   *   the reference implementation's file-with-metadata transfers. Receivers
   *   expose the decoded value as {@link Resource.metadata} and strip it from
   *   {@link Resource.data}.
   * @param {import("../transport/link.js").Link|undefined} [options.link]
   * @param {boolean} [options.autoCompress=true]
   * @param {Uint8Array} [options.originalHash]
   * @param {Uint8Array} [options.requestId] - Associated REQUEST id (§11).
   * @param {boolean} [options.isRequest=false] - This Resource is a REQUEST body.
   * @param {boolean} [options.isResponse=false] - This Resource is a RESPONSE body.
   * @param {Bzip2} [options.bz2] - Injected bz2 module; never imported by the library.
   */
  constructor(options = {}) {
    super();
    this.data = options.data;
    this.metadata = void 0;
    this.hasMetadata = false;
    this.metadataPrefix = void 0;
    if (options.metadata !== void 0 && options.metadata !== null) {
      const packed = MicroMsgPack.encode(options.metadata);
      if (packed.length > _Resource.METADATA_MAX_SIZE) {
        throw new Error("Resource metadata size exceeded");
      }
      const prefix = new Uint8Array(3);
      prefix[0] = packed.length >> 16;
      prefix[1] = packed.length >> 8 & 255;
      prefix[2] = packed.length & 255;
      this.metadataPrefix = concatBytes(prefix, packed);
      this.hasMetadata = true;
      this.metadata = options.metadata;
    }
    this.link = /** @type {import("../transport/link.js").Link} */
    options.link;
    this.autoCompress = options.autoCompress ?? true;
    this.originalHash = options.originalHash;
    this.requestId = options.requestId;
    this.isRequest = options.isRequest ?? false;
    this.isResponse = options.isResponse ?? false;
    this.bz2 = options.bz2;
    this.status = ResourceStatus.NONE;
    this.parts = [];
    this.hashmap = [];
    this.receivedCount = 0;
    this.totalParts = 0;
    this.totalSize = 0;
    this.size = 0;
    this.hash = void 0;
    this.randomHash = void 0;
    this.expectedProof = void 0;
    this.compressed = false;
    this.encrypted = false;
    this.split = false;
    this.segmentIndex = 1;
    this.totalSegments = 1;
    this.uncompressedSize = 0;
    this.outstanding = 0;
    this._prepared = false;
  }
  /**
   * Maximum part body size. Parts are raw slices of the already-encrypted
   * whole, sent as `context=RESOURCE` packets which are NOT token-encrypted
   * (§10.6 gotcha), so the full SDU is available for part data.
   * @returns {number}
   */
  get sdu() {
    if (!this.link) return 0;
    return this.link.mtu - _Resource.HEADER_MAX_SIZE - _Resource.IFAC_MIN_SIZE;
  }
  /**
   * Number of 4-byte map_hashes that fit in one advertisement's `m` field
   * (§10.4): `floor((link.mdu - 134) / 4)`. At the default MDU 431 this is 74.
   * @returns {number}
   */
  get hashmapMaxLen() {
    if (!this.link) return 0;
    return Math.floor((this.link.mdu - _Resource.HASHMAP_FIXED_OVERHEAD) / 4);
  }
  /**
   * Collision-guard span (§10.2 step 7): map_hashes must be unique within this
   * many parts of any position.
   * @returns {number}
   */
  get collisionGuardSize() {
    return 2 * _Resource.WINDOW_MAX_SLOW + this.hashmapMaxLen;
  }
  // -----------------------------------------------------------------------
  // Sender side
  // -----------------------------------------------------------------------
  /**
   * Prepares the resource for sending (§10.2): optional compression, integrity
   * material over the uncompressed plaintext, link-encrypt the whole
   * `prefix ‖ body` blob, slice into SDU parts, and build the collision-guarded
   * hashmap. Idempotent.
   * @returns {Promise<void>}
   * @private
   */
  async _prepareSender() {
    if (this._prepared) return;
    if (!(this.data instanceof Uint8Array)) {
      throw new TypeError("Resource sender data must be a Uint8Array");
    }
    const plaintext = this.metadataPrefix ? concatBytes(this.metadataPrefix, this.data) : this.data;
    if (plaintext.length > _Resource.MAX_EFFICIENT_SIZE) {
      this.split = true;
      this.segmentIndex = 1;
      this.totalSegments = Math.floor((plaintext.length - 1) / _Resource.MAX_EFFICIENT_SIZE) + 1;
      this._fullPlaintext = plaintext;
      await this._prepareSegment();
      this._prepared = true;
      return;
    }
    this.uncompressedSize = plaintext.length;
    let body = plaintext;
    if (this.autoCompress && this.bz2) {
      try {
        const compressed = this.bz2.compress(plaintext);
        if (compressed.length < plaintext.length) {
          body = compressed;
          this.compressed = true;
        }
      } catch (err) {
        log(
          "Resource",
          `Could not auto-compress resource data, falling back to uncompressed transfer: ${/** @type {any} */
          err.message ?? err}`,
          LogLevel.DEBUG
        );
      }
    }
    await this._buildIntegrityAndParts(plaintext, body);
    this._prepared = true;
  }
  /**
   * Prepares the segment at {@link Resource.segmentIndex} of a split
   * resource: slices the full plaintext, re-evaluates per-segment compression,
   * and rebuilds integrity material, parts and hashmap.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _prepareSegment() {
    const full = (
      /** @type {Uint8Array} */
      this._fullPlaintext
    );
    const start = (this.segmentIndex - 1) * _Resource.MAX_EFFICIENT_SIZE;
    const plaintext = full.subarray(
      start,
      Math.min(start + _Resource.MAX_EFFICIENT_SIZE, full.length)
    );
    this.uncompressedSize = plaintext.length;
    this._sentPartIndices = /* @__PURE__ */ new Set();
    let body = plaintext;
    this.compressed = false;
    if (this.autoCompress && this.bz2) {
      try {
        const compressed = this.bz2.compress(plaintext);
        if (compressed.length < plaintext.length) {
          body = compressed;
          this.compressed = true;
        }
      } catch (err) {
        log(
          "Resource",
          `Could not auto-compress segment ${this.segmentIndex}, falling back to uncompressed transfer: ${/** @type {any} */
          err.message ?? err}`,
          LogLevel.DEBUG
        );
      }
    }
    await this._buildIntegrityAndParts(plaintext, body);
    if (this.segmentIndex === 1) this.originalHash = this.hash;
  }
  /**
   * Computes the integrity material (hash, expected_proof, random_hash salt),
   * link-encrypts `prefix ‖ body`, slices into parts, and builds the hashmap.
   *
   * Integrity is always over the uncompressed `plaintext` (§10.2 step 5), even
   * when `body` is the compressed form — the receiver decompresses before the
   * hash check.
   *
   * @param {Uint8Array} plaintext
   * @param {Uint8Array} body
   * @returns {Promise<void>}
   * @private
   */
  async _buildIntegrityAndParts(plaintext, body) {
    for (let attempt = 0; attempt < 8; attempt++) {
      this.randomHash = Identity.getRandomHash().slice(
        0,
        _Resource.RANDOM_HASH_SIZE
      );
      this.hash = await Identity.fullHash(
        concatBytes(plaintext, this.randomHash)
      );
      this.expectedProof = await Identity.fullHash(
        concatBytes(plaintext, this.hash)
      );
      const prefix = Identity.getRandomHash().slice(
        0,
        _Resource.RANDOM_HASH_SIZE
      );
      if (!this.link.token) {
        throw new Error("Link token unavailable; handshake not complete.");
      }
      const encrypted = await this.link.token.encrypt(
        concatBytes(prefix, body)
      );
      this.encrypted = true;
      this.totalSize = encrypted.length;
      this.totalParts = Math.max(1, Math.ceil(encrypted.length / this.sdu));
      this.parts = [];
      for (let i = 0; i < this.totalParts; i++) {
        const start = i * this.sdu;
        this.parts.push(
          encrypted.subarray(
            start,
            Math.min(start + this.sdu, encrypted.length)
          )
        );
      }
      this.hashmap = await Promise.all(
        this.parts.map((p) => this._mapHash(
          /** @type {Uint8Array} */
          p
        ))
      );
      if (!this._hasCollision()) {
        return;
      }
      log(
        "Resource",
        `Hashmap collision on attempt ${attempt + 1}; regenerating salt`,
        LogLevel.DEBUG
      );
    }
    throw new Error("Failed to construct a collision-free resource hashmap");
  }
  /**
   * 4-byte map_hash for a part: `SHA-256(part ‖ r)[:4]` (§10.6).
   * @param {Uint8Array} part
   * @returns {Promise<Uint8Array>}
   * @private
   */
  async _mapHash(part) {
    const full = await Identity.fullHash(
      concatBytes(
        part,
        /** @type {Uint8Array} */
        this.randomHash
      )
    );
    return full.slice(0, 4);
  }
  /**
   * Returns true if any two map_hashes collide within COLLISION_GUARD_SIZE of
   * each other (§10.2 step 7).
   * @returns {boolean}
   * @private
   */
  _hasCollision() {
    const span = this.collisionGuardSize;
    for (let i = 0; i < this.hashmap.length; i++) {
      const lo = Math.max(0, i - span);
      for (let j = lo; j < i; j++) {
        if (bytesEqual(this.hashmap[i], this.hashmap[j])) return true;
      }
    }
    return false;
  }
  /**
   * The hashmap fragment carried in this advertisement's `m` field: the first
   * `hashmapMaxLen` 4-byte map_hashes concatenated (§10.4).
   * @returns {Uint8Array}
   * @private
   */
  _advHashmapFragment() {
    const count = Math.min(this.hashmap.length, this.hashmapMaxLen);
    return concatBytes(...this.hashmap.slice(0, count));
  }
  /**
   * Builds and sends the RESOURCE_ADV (§10.4). The link registers this
   * resource as an outgoing transfer keyed by `hash`.
   * @returns {Promise<void>}
   */
  async advertise() {
    if (!this.link) throw new Error("Resource.advertise requires a link");
    await this._prepareSender();
    if (this.status !== ResourceStatus.NONE) {
      throw new Error("Resource already advertised or in progress");
    }
    this.status = ResourceStatus.QUEUED;
    await this._advertiseSegment();
    this.status = ResourceStatus.ADVERTISED;
  }
  /**
   * Advertises the segment currently prepared on this resource. Split
   * resources call this once per segment as their predecessors' proofs
   * arrive; single-segment resources call it once from
   * {@link Resource.advertise}.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _advertiseSegment() {
    let f = 0;
    if (this.encrypted) f |= ResourceFlag.ENCRYPTED;
    if (this.compressed) f |= ResourceFlag.COMPRESSED;
    if (this.split) f |= ResourceFlag.SPLIT;
    if (this.isRequest) f |= ResourceFlag.IS_REQUEST;
    if (this.isResponse) f |= ResourceFlag.IS_RESPONSE;
    if (this.hasMetadata) f |= ResourceFlag.HAS_METADATA;
    const adv = new ResourceAdvertisement({
      t: this.totalSize,
      d: this.uncompressedSize,
      n: this.totalParts,
      h: (
        /** @type {Uint8Array} */
        this.hash
      ),
      r: (
        /** @type {Uint8Array} */
        this.randomHash
      ),
      o: this.originalHash || this.hash,
      i: this.segmentIndex,
      l: this.totalSegments,
      q: this.requestId,
      f,
      m: this._advHashmapFragment()
    });
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.RESOURCE_ADV,
      payload: adv.pack()
    });
    this.link._registerOutgoingResource(this);
    await this.link.send(packet);
    log(
      "Resource",
      `Advertised ${this.totalParts} parts (${this.totalSize}B)` + (this.split ? ` segment ${this.segmentIndex}/${this.totalSegments}` : "") + ` h=${toHex(
        /** @type {Uint8Array} */
        this.hash.subarray(0, 8)
      )}\u2026`,
      LogLevel.DEBUG
    );
  }
  /**
   * Sender: fulfils an inbound RESOURCE_REQ (§10.5/§10.7) — emits the
   * requested RESOURCE part packets, and a RESOURCE_HMU continuation when the
   * receiver signalled hashmap exhaustion.
   * @param {Uint8Array} body
   * @returns {Promise<void>}
   */
  async handleRequest(body) {
    const { requested, exhausted, lastMapHash } = this._parseRequest(body);
    for (const mh of requested) {
      const idx = this._findPartByMapHash(mh);
      if (idx < 0) {
        log(
          "Resource",
          "Requested map_hash not found; skipping",
          LogLevel.DEBUG
        );
        continue;
      }
      await this._sendPart(
        /** @type {Uint8Array} */
        this.parts[idx]
      );
      this._sentPartIndices ??= /* @__PURE__ */ new Set();
      this._sentPartIndices.add(idx);
      this.dispatchEvent(
        new CustomEvent("progress", {
          detail: {
            sent: this._sentPartIndices.size,
            total: this.totalParts,
            progress: this.totalParts ? this._sentPartIndices.size / this.totalParts : 0
          }
        })
      );
    }
    if (exhausted) {
      await this._sendHashmapUpdate(
        /** @type {Uint8Array} */
        lastMapHash
      );
    }
  }
  /**
   * Sends one RESOURCE part packet. Parts are NOT token-encrypted — they are
   * raw slices of the already-encrypted whole (§10.6 gotcha); `Link.send`
   * honours that because `isLinkPacketUnencrypted(DATA, RESOURCE)` is true.
   * @param {Uint8Array} part
   * @returns {Promise<void>}
   * @private
   */
  async _sendPart(part) {
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.RESOURCE,
      payload: part
    });
    await this.link.send(packet);
  }
  /**
   * Sender: validates a RESOURCE_PRF (§10.8). Body is `resource_hash(32) ||
   * full_proof(32)`; `full_proof` must equal the pre-computed `expected_proof`.
   * @param {Uint8Array} body
   * @returns {Promise<void>}
   */
  async validateProof(body) {
    if (body.length !== 64) {
      log(
        "Resource",
        `Bad RESOURCE_PRF length ${body.length}`,
        LogLevel.WARNING
      );
      return;
    }
    if (this.status === ResourceStatus.FAILED || this.status === ResourceStatus.REJECTED || this.status === ResourceStatus.CORRUPT) {
      return;
    }
    const fullProof = body.subarray(32, 64);
    if (!bytesEqual(
      fullProof,
      /** @type {Uint8Array} */
      this.expectedProof
    )) {
      log("Resource", "RESOURCE_PRF full_proof mismatch", LogLevel.WARNING);
      this.status = ResourceStatus.FAILED;
      this._setFailed("Resource proof mismatch");
      return;
    }
    if (this.split && this.segmentIndex < this.totalSegments) {
      log(
        "Resource",
        `Segment ${this.segmentIndex}/${this.totalSegments} proven; advertising next`,
        LogLevel.DEBUG
      );
      this.link._unregisterOutgoingResource(
        /** @type {Uint8Array} */
        this.hash
      );
      this.segmentIndex++;
      await this._prepareSegment();
      this.status = ResourceStatus.QUEUED;
      await this._advertiseSegment();
      this.status = ResourceStatus.ADVERTISED;
      return;
    }
    this.status = ResourceStatus.COMPLETE;
    log(
      "Resource",
      "Outgoing resource COMPLETE (proof validated)",
      LogLevel.DEBUG
    );
    this.dispatchEvent(
      new CustomEvent("complete", { detail: { resource: this } })
    );
  }
  /**
   * Sender: sends a RESOURCE_HMU carrying the hashmap window after
   * `lastMapHash` (§10.7). Body = `resource_hash(32) ‖ msgpack([segment_index,
   * hashmap_bytes])`.
   * @param {Uint8Array} lastMapHash
   * @returns {Promise<void>}
   * @private
   */
  async _sendHashmapUpdate(lastMapHash) {
    const fromIdx = this.hashmap.findIndex((mh) => bytesEqual(mh, lastMapHash));
    if (fromIdx < 0 || (fromIdx + 1) % this.hashmapMaxLen !== 0) {
      log("Resource", "HMU sequencing error; cancelling", LogLevel.WARNING);
      await this.cancel();
      return;
    }
    const segIndex = Math.floor((fromIdx + 1) / this.hashmapMaxLen);
    const start = (fromIdx + 1) % this.hashmap.length;
    const end = Math.min(start + this.hashmapMaxLen, this.hashmap.length);
    const segment = concatBytes(...this.hashmap.slice(start, end));
    const inner = MicroMsgPack.encode([segIndex, segment]);
    const payload = concatBytes(
      /** @type {Uint8Array} */
      this.hash,
      inner
    );
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.RESOURCE_HMU,
      payload
    });
    await this.link.send(packet);
  }
  /**
   * Finds the part index whose map_hash equals `mh`. The collision guard
   * guarantees uniqueness within the resource.
   * @param {Uint8Array} mh
   * @returns {number}
   * @private
   */
  _findPartByMapHash(mh) {
    for (let i = 0; i < this.hashmap.length; i++) {
      if (bytesEqual(this.hashmap[i], mh)) return i;
    }
    return -1;
  }
  /**
   * Parses a RESOURCE_REQ body (§10.5).
   * @param {Uint8Array} body
   * @returns {{requested: Uint8Array[], exhausted: boolean, lastMapHash: Uint8Array|null, resourceHash: Uint8Array}}
   * @private
   */
  _parseRequest(body) {
    const exhausted = body[0] === HASHMAP_IS_EXHAUSTED;
    let offset = 1;
    let lastMapHash = null;
    if (exhausted) {
      lastMapHash = body.slice(1, 5);
      offset = 5;
    }
    const resourceHash = body.slice(offset, offset + 32);
    offset += 32;
    const requested = [];
    for (let i = offset; i + 4 <= body.length; i += 4) {
      requested.push(body.slice(i, i + 4));
    }
    return { requested, exhausted, lastMapHash, resourceHash };
  }
  // -----------------------------------------------------------------------
  // Receiver side
  // -----------------------------------------------------------------------
  /**
   * Accepts an inbound RESOURCE_ADV and prepares to receive parts (§10.4/§10.5).
   *
   * @param {import("../transport/link.js").Link} link
   * @param {import("./packet.js").Packet} advertisementPacket
   * @param {object} [options]
   * @param {Bzip2} [options.bz2]
   * @param {number} [options.maxSize] - Reject advertisements whose `t` or `d`
   *   exceeds this (§10.4 bomb defense). Defaults to 32 MiB.
   * @param {number} [options.maxParts] - Reject advertisements whose part count
   *   `n` exceeds this. Defaults to {@link Resource.DEFAULT_MAX_PARTS}.
   * @param {number} [options.maxSegments] - Reject split advertisements whose
   *   total segment count `l` exceeds this. Defaults to
   *   {@link Resource.DEFAULT_MAX_SEGMENTS}.
   * @returns {Promise<Resource|null>} null if the advertisement was rejected.
   */
  static async accept(link, advertisementPacket, options = {}) {
    const adv = ResourceAdvertisement.unpack(advertisementPacket.payload);
    const maxSize = options.maxSize ?? _Resource.DEFAULT_MAX_SIZE;
    const maxParts = options.maxParts ?? _Resource.DEFAULT_MAX_PARTS;
    const maxSegments = options.maxSegments ?? _Resource.DEFAULT_MAX_SEGMENTS;
    if (adv.l > 1 && (adv.i < 1 || adv.i > adv.l || adv.l > maxSegments)) {
      log(
        "Resource",
        `Rejecting advertisement: bad segment bookkeeping i=${adv.i} l=${adv.l}`,
        LogLevel.WARNING
      );
      await _Resource._sendReject(link, adv.h);
      return null;
    }
    const sdu = link.mtu - _Resource.HEADER_MAX_SIZE - _Resource.IFAC_MIN_SIZE;
    const expectedParts = sdu > 0 ? Math.ceil(adv.t / sdu) : 0;
    const partCountInsane = adv.n <= 0 || adv.n > maxParts || adv.n > adv.t || expectedParts > 0 && adv.n > expectedParts + 1;
    if (adv.t > maxSize || adv.d > maxSize || partCountInsane) {
      log(
        "Resource",
        `Rejecting advertisement: size t=${adv.t} d=${adv.d} n=${adv.n} (cap size=${maxSize} parts=${maxParts}, expected\u2248${expectedParts})`,
        LogLevel.WARNING
      );
      await _Resource._sendReject(link, adv.h);
      return null;
    }
    const resource = new _Resource({ link, bz2: options.bz2 });
    resource.status = ResourceStatus.TRANSFERRING;
    resource.totalSize = adv.t;
    resource.uncompressedSize = adv.d;
    resource.totalParts = adv.n;
    resource.hash = adv.h;
    resource.randomHash = adv.r;
    resource.originalHash = adv.o;
    resource.segmentIndex = adv.i;
    resource.totalSegments = adv.l;
    resource.requestId = adv.q;
    resource.compressed = adv.compressed;
    resource.encrypted = adv.encrypted;
    resource.isRequest = adv.isRequest;
    resource.isResponse = adv.isResponse;
    resource.hasMetadata = adv.hasMetadata;
    resource.parts = new Array(resource.totalParts).fill(null);
    resource.hashmap = _Resource._splitHashmap(adv.m);
    resource.receivedCount = 0;
    resource.outstanding = 0;
    link._registerIncomingResource(resource);
    log(
      "Resource",
      `Accepted advertisement: ${resource.totalParts} parts, compressed=${resource.compressed}` + (resource.totalSegments > 1 ? ` segment ${resource.segmentIndex}/${resource.totalSegments}` : ""),
      LogLevel.DEBUG
    );
    return resource;
  }
  /**
   * Splits a concatenated hashmap fragment into its 4-byte map_hashes.
   * @param {Uint8Array} fragment
   * @returns {Uint8Array[]}
   * @private
   */
  static _splitHashmap(fragment) {
    const out = [];
    for (let i = 0; i + 4 <= fragment.length; i += 4) {
      out.push(fragment.slice(i, i + 4));
    }
    return out;
  }
  /**
   * Receiver: builds and sends the next RESOURCE_REQ for missing parts
   * (§10.5). Windowed stop-and-wait for Phase 2 — requests up to `window`
   * outstanding missing parts, then waits for them before requesting more.
   * @returns {Promise<void>}
   */
  async requestNext() {
    if (this.status !== ResourceStatus.TRANSFERRING) return;
    if (this.receivedCount >= this.totalParts) return;
    const requested = [];
    let lastKnown = null;
    let exhausted = false;
    for (let i = 0; i < this.hashmap.length && requested.length < this.window; i++) {
      if (this.parts[i] === null) {
        requested.push(this.hashmap[i]);
      }
      lastKnown = this.hashmap[i];
    }
    if (this.parts.some((p) => p === null) && requested.length === 0) {
      exhausted = true;
    }
    if (!exhausted && requested.length === 0) return;
    this.outstanding = requested.length;
    await this._sendRequest(requested, exhausted, exhausted ? lastKnown : null);
  }
  /**
   * Sends a RESOURCE_REQ (§10.5).
   * @param {Uint8Array[]} mapHashes
   * @param {boolean} exhausted
   * @param {Uint8Array|null} lastMapHash
   * @returns {Promise<void>}
   * @private
   */
  async _sendRequest(mapHashes, exhausted, lastMapHash) {
    const parts = [
      new Uint8Array([
        exhausted ? HASHMAP_IS_EXHAUSTED : HASHMAP_IS_NOT_EXHAUSTED
      ])
    ];
    if (exhausted && lastMapHash) parts.push(lastMapHash);
    parts.push(
      /** @type {Uint8Array} */
      this.hash
    );
    for (const mh of mapHashes) parts.push(mh);
    const payload = concatBytes(...parts);
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.RESOURCE_REQ,
      payload
    });
    await this.link.send(packet);
  }
  /**
   * Receiver: places an incoming RESOURCE part by matching its 4-byte
   * map_hash against the hashmap (§10.6). Returns true if the part was placed.
   * @param {Uint8Array} chunk
   * @returns {Promise<boolean>}
   */
  async receivePart(chunk) {
    if (this.status !== ResourceStatus.TRANSFERRING && this.status !== ResourceStatus.ASSEMBLING) {
      return false;
    }
    const mh = await this._mapHash(chunk);
    for (let i = 0; i < this.hashmap.length; i++) {
      if (this.parts[i] === null && bytesEqual(this.hashmap[i], mh)) {
        this.parts[i] = chunk;
        this.receivedCount++;
        if (this.outstanding > 0) this.outstanding--;
        this.dispatchEvent(
          new CustomEvent("progress", {
            detail: {
              received: this.receivedCount,
              total: this.totalParts,
              progress: this.getProgress()
            }
          })
        );
        if (this.receivedCount >= this.totalParts) {
          await this.assemble();
        } else if (this.outstanding <= 0) {
          await this.requestNext();
        }
        return true;
      }
    }
    return false;
  }
  /**
   * Receiver: applies a RESOURCE_HMU hashmap continuation (§10.7).
   * @param {Uint8Array} body
   * @returns {Promise<void>}
   */
  async hashmapUpdate(body) {
    const resourceHash = body.slice(0, 32);
    const decoded = MicroMsgPack.decode(body.subarray(32));
    if (!Array.isArray(decoded) || decoded.length < 2) return;
    const segment = decoded[1];
    if (!(segment instanceof Uint8Array)) return;
    for (const mh of _Resource._splitHashmap(segment)) this.hashmap.push(mh);
    log(
      "Resource",
      `Applied HMU (${this.hashmap.length} map_hashes known) for ${toHex(resourceHash.subarray(0, 8))}\u2026`,
      LogLevel.DEBUG
    );
    if (this.outstanding <= 0) await this.requestNext();
  }
  /**
   * Receiver: assembles all parts, link-decrypts, strips the prefix, optional
   * decompress, recomputes the integrity hash, and emits the RESOURCE_PRF
   * (§10.8).
   * @returns {Promise<void>}
   */
  async assemble() {
    this.status = ResourceStatus.ASSEMBLING;
    try {
      const encrypted = concatBytes(
        .../** @type {Uint8Array[]} */
        this.parts
      );
      if (!this.link.token) {
        throw new Error("Link token unavailable; handshake not complete.");
      }
      const decrypted = await this.link.token.decrypt(encrypted);
      const body = decrypted.subarray(_Resource.RANDOM_HASH_SIZE);
      let plaintext = body;
      if (this.compressed) {
        if (!this.bz2) {
          throw new Error(
            "Resource is compressed but no bz2 module was provided"
          );
        }
        plaintext = this.bz2.decompress(body, this.uncompressedSize);
      }
      const recomputed = await Identity.fullHash(
        concatBytes(
          plaintext,
          /** @type {Uint8Array} */
          this.randomHash
        )
      );
      if (!bytesEqual(
        recomputed,
        /** @type {Uint8Array} */
        this.hash
      )) {
        this.status = ResourceStatus.CORRUPT;
        await this.cancel();
        this._setFailed("Resource integrity check failed");
        return;
      }
      this.data = plaintext;
      await this._sendProof();
      if (this.hasMetadata && this.segmentIndex === 1) {
        try {
          const metadataSize = plaintext[0] << 16 | plaintext[1] << 8 | plaintext[2];
          if (3 + metadataSize > plaintext.length) {
            throw new Error(`metadata size ${metadataSize} exceeds plaintext`);
          }
          this.data = plaintext.subarray(3 + metadataSize);
          this.metadata = MicroMsgPack.decode(
            plaintext.subarray(3, 3 + metadataSize)
          );
        } catch (err) {
          log(
            "Resource",
            `Could not parse resource metadata: ${err}`,
            LogLevel.WARNING
          );
          this.metadata = void 0;
        }
      }
      this.status = ResourceStatus.COMPLETE;
      this.parts = [];
      this.link._unregisterIncomingResource(
        /** @type {Uint8Array} */
        this.hash
      );
      log("Resource", "Incoming resource COMPLETE", LogLevel.DEBUG);
      this.dispatchEvent(
        new CustomEvent("complete", {
          detail: { resource: this, data: this.data }
        })
      );
    } catch (err) {
      log("Resource", `Assembly failed: ${err}`, LogLevel.ERROR);
      this.status = ResourceStatus.CORRUPT;
      this._setFailed(`Resource assembly failed: ${err}`);
    }
  }
  /**
   * Receiver: emits the RESOURCE_PRF (§10.8).
   * `proof_data = resource_hash(32) ‖ SHA-256(plaintext ‖ resource_hash)(32)`.
   * @returns {Promise<void>}
   * @private
   */
  async _sendProof() {
    const fullProof = await Identity.fullHash(
      concatBytes(
        /** @type {Uint8Array} */
        this.data,
        /** @type {Uint8Array} */
        this.hash
      )
    );
    const payload = concatBytes(
      /** @type {Uint8Array} */
      this.hash,
      fullProof
    );
    const packet = new Packet({
      packetType: PacketType.PROOF,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.RESOURCE_PRF,
      payload
    });
    await this.link.send(packet);
  }
  // -----------------------------------------------------------------------
  // Cancellation (§10.9)
  // -----------------------------------------------------------------------
  /**
   * Cancels the resource. Sender emits RESOURCE_ICL; receiver cancels locally
   * (an ordinary receiver cancel does NOT emit RESOURCE_RCL per §10.9).
   * @returns {Promise<void>}
   */
  async cancel() {
    if (this.status === ResourceStatus.COMPLETE) return;
    const wasSending = this.parts.length > 0 && this._prepared && this.hashmap.length > 0;
    if (wasSending && this.status !== ResourceStatus.NONE) {
      const payload = concatBytes(
        /** @type {Uint8Array} */
        this.hash
      );
      const packet = new Packet({
        packetType: PacketType.DATA,
        destinationType: DestType.LINK,
        destinationHash: this.link.linkId,
        contextByte: ContextType.RESOURCE_ICL,
        payload
      });
      try {
        await this.link.send(packet);
      } catch (err) {
        log(
          "Resource",
          `Failed to send RESOURCE_ICL: ${err}`,
          LogLevel.WARNING
        );
      }
    }
    this.status = ResourceStatus.FAILED;
    this._setFailed("Resource cancelled");
  }
  /**
   * Receiver: peer (initiator) cancelled via RESOURCE_ICL.
   * @returns {Promise<void>}
   */
  async handleIncomingCancel() {
    this.status = ResourceStatus.FAILED;
    this._setFailed("Remote cancelled the resource (RESOURCE_ICL)");
  }
  /**
   * Sender: peer (receiver) rejected via RESOURCE_RCL.
   * @returns {Promise<void>}
   */
  async handleRejection() {
    this.status = ResourceStatus.REJECTED;
    this._setFailed("Resource rejected by receiver (RESOURCE_RCL)");
  }
  /**
   * Emits a RESOURCE_RCL rejection for a resource hash.
   * @param {import("../transport/link.js").Link} link
   * @param {Uint8Array} resourceHash
   * @returns {Promise<void>}
   * @internal
   */
  static async _sendReject(link, resourceHash) {
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: link.linkId,
      contextByte: ContextType.RESOURCE_RCL,
      payload: resourceHash
    });
    await link.send(packet);
  }
  /**
   * Resolves when the transfer reaches a terminal state (COMPLETE/FAILED/etc).
   * Rejects if the resource fails rather than completing.
   * @returns {Promise<Resource>}
   */
  whenComplete() {
    return new Promise((resolve, reject) => {
      const onComplete = (e) => {
        this.removeEventListener("complete", onComplete);
        this.removeEventListener("failed", onFailed);
        resolve(this);
      };
      const onFailed = (e) => {
        this.removeEventListener("complete", onComplete);
        this.removeEventListener("failed", onFailed);
        reject(new Error(e?.detail?.reason ?? "resource failed"));
      };
      if (this.status === ResourceStatus.COMPLETE) return resolve(this);
      if (this.status === ResourceStatus.FAILED || this.status === ResourceStatus.CORRUPT || this.status === ResourceStatus.REJECTED) {
        return reject(new Error(`resource already ${this.status}`));
      }
      this.addEventListener("complete", onComplete);
      this.addEventListener("failed", onFailed);
    });
  }
  /** @param {string} reason @private */
  _setFailed(reason) {
    this.dispatchEvent(
      new CustomEvent("failed", { detail: { resource: this, reason } })
    );
  }
  /**
   * Current transfer progress as a float in [0.0, 1.0].
   * @returns {number}
   */
  getProgress() {
    if (this.totalParts === 0) return 0;
    return this.receivedCount / this.totalParts;
  }
};
var SplitResourceAssembler = class {
  /**
   * @param {Resource} firstSegment - The first accepted segment.
   * @param {object} [options]
   * @param {number} [options.maxTotalSize] - Cap on the reassembled
   *   logical size; the per-segment accept checks bound each transfer, this
   *   bounds their sum.
   */
  constructor(firstSegment, options = {}) {
    this.link = firstSegment.link;
    this.totalSegments = firstSegment.totalSegments;
    this.originalHash = firstSegment.originalHash;
    this.requestId = firstSegment.requestId;
    this.isRequest = firstSegment.isRequest;
    this.isResponse = firstSegment.isResponse;
    this.maxTotalSize = options.maxTotalSize ?? Resource.DEFAULT_MAX_TOTAL_SIZE;
    this.segments = [];
    this.metadata = void 0;
    this.received = 0;
    this.bytes = 0;
  }
  /**
   * Records a completed segment and returns a synthetic COMPLETE Resource
   * for the whole transfer when `segment` is the final one, otherwise `null`.
   *
   * @param {Resource} segment - A segment whose `whenComplete()` resolved.
   * @returns {Resource|null}
   */
  add(segment) {
    if (segment.segmentIndex === 1) this.metadata = segment.metadata;
    const data = (
      /** @type {Uint8Array} */
      segment.data
    );
    this.segments.push(data);
    this.bytes += data.length;
    this.received++;
    if (this.bytes > this.maxTotalSize) {
      throw new Error("Split resource exceeded maximum total size");
    }
    if (segment.segmentIndex !== this.totalSegments) return null;
    const assembled = new Resource({ link: this.link });
    assembled.data = concatBytes(...this.segments);
    assembled.metadata = this.metadata;
    assembled.hasMetadata = this.metadata !== void 0;
    assembled.originalHash = this.originalHash;
    assembled.requestId = this.requestId;
    assembled.isRequest = this.isRequest;
    assembled.isResponse = this.isResponse;
    assembled.segmentIndex = this.totalSegments;
    assembled.totalSegments = this.totalSegments;
    assembled.uncompressedSize = this.bytes;
    assembled.status = ResourceStatus.COMPLETE;
    return assembled;
  }
};

// node_modules/@reticulum/core/src/transport/channel.js
var SystemMessageTypes = {
  /** `StreamDataMessage` — byte-stream frames. */
  SMT_STREAM_DATA: 65280
};
var CEType = {
  ME_NO_MSG_TYPE: 0,
  ME_INVALID_MSG_TYPE: 1,
  ME_NOT_REGISTERED: 2,
  ME_LINK_NOT_READY: 3,
  ME_ALREADY_SENT: 4,
  ME_TOO_BIG: 5
};
var ChannelException = class extends Error {
  /**
   * @param {CEType} ceType
   * @param {string} [message]
   */
  constructor(ceType, message) {
    super(message ?? `Channel error (type ${ceType})`);
    this.name = "ChannelException";
    this.type = ceType;
  }
};
var MessageState = {
  MSGSTATE_NEW: 0,
  MSGSTATE_SENT: 1,
  MSGSTATE_DELIVERED: 2,
  MSGSTATE_FAILED: 3
};
var MessageBase = class {
  /**
   * Unique identifier for this message class within a Channel. Must be `< 0xf000`.
   * @type {number|null}
   */
  static MSGTYPE = null;
  /**
   * @returns {Uint8Array} binary representation of the message body.
   */
  pack() {
    throw new Error("MessageBase subclass must implement pack()");
  }
  /**
   * Populate this message from its binary body.
   * @param {Uint8Array} _raw
   */
  unpack(_raw) {
    throw new Error("MessageBase subclass must implement unpack()");
  }
};
var ENVELOPE_HEADER_SIZE = 6;
var StreamDataMessage = class _StreamDataMessage extends MessageBase {
  /** System-reserved message type for stream data. */
  static MSGTYPE = SystemMessageTypes.SMT_STREAM_DATA;
  /** Stream-header size in bytes. */
  static HEADER_SIZE = 2;
  /** Total per-frame overhead: stream header (2) + channel envelope (6). */
  static OVERHEAD = _StreamDataMessage.HEADER_SIZE + ENVELOPE_HEADER_SIZE;
  constructor() {
    super();
    this.streamId = 0;
    this.data = new Uint8Array(0);
    this.eof = false;
    this.compressed = false;
  }
  pack() {
    const header = this.streamId & 16383 | (this.eof ? 32768 : 0) | (this.compressed ? 16384 : 0);
    const buf = new Uint8Array(
      _StreamDataMessage.HEADER_SIZE + this.data.length
    );
    const dv = new DataView(buf.buffer);
    dv.setUint16(0, header, false);
    buf.set(this.data, _StreamDataMessage.HEADER_SIZE);
    return buf;
  }
  /**
   * @param {Uint8Array} raw
   */
  unpack(raw) {
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const header = dv.getUint16(0, false);
    this.compressed = (header & 16384) !== 0;
    this.eof = (header & 32768) !== 0;
    this.streamId = header & 16383;
    this.data = raw.subarray(_StreamDataMessage.HEADER_SIZE);
  }
};
var _streamAdapters = null;
function _setStreamAdapters(adapters) {
  _streamAdapters = adapters;
}
var Envelope = class _Envelope {
  /** @type {MessageBase|null} */
  message = null;
  /** @type {Uint8Array|null} */
  raw = null;
  /** Outlet packet handle returned by {@link ChannelOutletBase#send}. Always `null` until assigned. */
  packet = null;
  /** @type {number} */
  sequence = 0;
  /** @type {ChannelOutletBase|null} */
  outlet = null;
  tries = 0;
  unpacked = false;
  packed = false;
  tracked = false;
  /**
   * @param {object} opts
   * @param {ChannelOutletBase} opts.outlet
   * @param {MessageBase|null} [opts.message]
   * @param {Uint8Array|null} [opts.raw] - received wire bytes (decode path)
   * @param {number} [opts.sequence]
   */
  constructor({ outlet, message = null, raw = null, sequence = 0 }) {
    this.ts = Date.now();
    this.id = _Envelope._nextId++;
    this.message = message;
    this.raw = raw;
    this.sequence = sequence;
    this.outlet = outlet;
  }
  static _nextId = 1;
  /**
   * Decode the header + message body from {@link raw}.
   * @param {Map<number, typeof MessageBase>} messageFactories
   * @returns {MessageBase}
   */
  unpack(messageFactories) {
    const raw = (
      /** @type {Uint8Array} */
      this.raw
    );
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    const msgtype = dv.getUint16(0, false);
    this.sequence = dv.getUint16(2, false);
    const body = raw.subarray(ENVELOPE_HEADER_SIZE);
    const ctor = messageFactories.get(msgtype);
    if (!ctor) {
      throw new ChannelException(
        CEType.ME_NOT_REGISTERED,
        `Unable to find constructor for Channel MSGTYPE 0x${msgtype.toString(16)}`
      );
    }
    const message = new ctor();
    message.unpack(body);
    this.unpacked = true;
    this.message = message;
    return message;
  }
  /**
   * Encode {@link message} into {@link raw} and return the wire bytes.
   * @returns {Uint8Array}
   */
  pack() {
    const message = (
      /** @type {MessageBase} */
      this.message
    );
    const clazz = (
      /** @type {typeof MessageBase} */
      message.constructor
    );
    if (clazz.MSGTYPE === null || clazz.MSGTYPE === void 0) {
      throw new ChannelException(
        CEType.ME_NO_MSG_TYPE,
        `${clazz.name} lacks MSGTYPE`
      );
    }
    const data = message.pack();
    const buf = new Uint8Array(ENVELOPE_HEADER_SIZE + data.length);
    const dv = new DataView(buf.buffer);
    dv.setUint16(
      0,
      /** @type {number} */
      clazz.MSGTYPE,
      false
    );
    dv.setUint16(2, this.sequence, false);
    dv.setUint16(4, data.length, false);
    buf.set(data, ENVELOPE_HEADER_SIZE);
    this.raw = buf;
    this.packed = true;
    return buf;
  }
};
var ChannelOutletBase = class {
  /** @param {Uint8Array} _raw @returns {Promise<any>} */
  async send(_raw) {
    throw new Error("not implemented");
  }
  /** @param {any} _packet @returns {Promise<any>} */
  async resend(_packet) {
    throw new Error("not implemented");
  }
  /** @returns {number} */
  get mdu() {
    throw new Error("not implemented");
  }
  /** @returns {number} */
  get rtt() {
    throw new Error("not implemented");
  }
  /** @returns {boolean} */
  get isUsable() {
    throw new Error("not implemented");
  }
  /** @param {any} _packet @returns {MessageState} */
  getPacketState(_packet) {
    throw new Error("not implemented");
  }
  timedOut() {
    throw new Error("not implemented");
  }
  /**
   * @param {any} _packet
   * @param {((packet: any) => void)|null} _callback
   * @param {number} [_timeoutSeconds]
   */
  setPacketTimeoutCallback(_packet, _callback, _timeoutSeconds) {
    throw new Error("not implemented");
  }
  /** @param {any} _packet @param {((packet: any) => void)|null} _callback */
  setPacketDeliveredCallback(_packet, _callback) {
    throw new Error("not implemented");
  }
  /** @param {any} _packet @returns {any} */
  getPacketId(_packet) {
    throw new Error("not implemented");
  }
  /**
   * Only-if-larger timeout bump (used by `Channel._updatePacketTimeouts`).
   * Base no-op; outlets with timer state override it.
   * @param {any} _packet
   * @param {number} _timeoutSeconds
   */
  extendTimeout(_packet, _timeoutSeconds) {
  }
  /** Release listeners / timers. Base no-op; outlets override it. */
  _cleanup() {
  }
};
var WINDOW = 2;
var WINDOW_MIN = 2;
var WINDOW_MIN_LIMIT_MEDIUM = 5;
var WINDOW_MIN_LIMIT_FAST = 16;
var WINDOW_MAX_SLOW = 5;
var WINDOW_MAX_MEDIUM = 12;
var WINDOW_MAX_FAST = 48;
var WINDOW_MAX = WINDOW_MAX_FAST;
var FAST_RATE_THRESHOLD = 10;
var RTT_FAST = 0.18;
var RTT_MEDIUM = 0.75;
var RTT_SLOW = 1.45;
var WINDOW_FLEXIBILITY = 4;
var SEQ_MAX = 65535;
var SEQ_MODULUS = 65536;
var Channel = class {
  /** @param {ChannelOutletBase} outlet */
  constructor(outlet) {
    this._outlet = outlet;
    this._txRing = [];
    this._rxRing = [];
    this._messageCallbacks = [];
    this._nextSequence = 0;
    this._nextRxSequence = 0;
    this._messageFactories = /* @__PURE__ */ new Map();
    this._maxTries = 5;
    this.fastRateRounds = 0;
    this.mediumRateRounds = 0;
    this._shutDown = false;
    this._sendChain = Promise.resolve();
    if (this._outlet.rtt > RTT_SLOW) {
      this.window = 1;
      this.windowMax = 1;
      this.windowMin = 1;
      this.windowFlexibility = 1;
    } else {
      this.window = WINDOW;
      this.windowMax = WINDOW_MAX_SLOW;
      this.windowMin = WINDOW_MIN;
      this.windowFlexibility = WINDOW_FLEXIBILITY;
    }
    this._packetDelivered = this._packetDelivered.bind(this);
    this._packetTimeout = this._packetTimeout.bind(this);
  }
  /** Largest sequence number (16-bit). */
  static get SEQ_MAX() {
    return SEQ_MAX;
  }
  /** Sequence-number modulus (0x10000). */
  static get SEQ_MODULUS() {
    return SEQ_MODULUS;
  }
  /**
   * Register a message class for reception. It must extend {@link MessageBase},
   * declare a valid `MSGTYPE` (< `0xf000`), and be constructable with no args.
   * @param {typeof MessageBase} messageClass
   */
  registerMessageType(messageClass) {
    this._registerMessageType(messageClass, false);
  }
  /**
   * @param {typeof MessageBase} messageClass
   * @param {boolean} isSystemType
   * @private
   */
  _registerMessageType(messageClass, isSystemType) {
    if (!(messageClass.prototype instanceof MessageBase)) {
      throw new ChannelException(
        CEType.ME_INVALID_MSG_TYPE,
        `${messageClass.name} is not a subclass of MessageBase.`
      );
    }
    const msgtype = messageClass.MSGTYPE;
    if (msgtype === null || msgtype === void 0) {
      throw new ChannelException(
        CEType.ME_INVALID_MSG_TYPE,
        `${messageClass.name} has invalid MSGTYPE class attribute.`
      );
    }
    if (msgtype >= 61440 && !isSystemType) {
      throw new ChannelException(
        CEType.ME_INVALID_MSG_TYPE,
        `${messageClass.name} has system-reserved message type.`
      );
    }
    try {
      new messageClass();
    } catch (err) {
      throw new ChannelException(
        CEType.ME_INVALID_MSG_TYPE,
        `${messageClass.name} raised when constructed with no arguments: ${err}`
      );
    }
    this._messageFactories.set(msgtype, messageClass);
  }
  /**
   * Register a system message type (MSGTYPE `>= 0xf000`). Library use only
   * (e.g. the Buffer stream layer's `StreamDataMessage`).
   * @param {typeof MessageBase} messageClass
   */
  _registerSystemMessageType(messageClass) {
    this._registerMessageType(messageClass, true);
  }
  /**
   * Add a handler for incoming messages. Handlers are invoked in insertion
   * order; if one returns `true`, processing stops (later handlers are skipped).
   * @param {(message: MessageBase) => boolean} callback
   */
  addMessageHandler(callback) {
    if (!this._messageCallbacks.includes(callback)) {
      this._messageCallbacks.push(callback);
    }
  }
  /**
   * Remove a handler added with {@link addMessageHandler}.
   * @param {(message: MessageBase) => boolean} callback
   */
  removeMessageHandler(callback) {
    const idx = this._messageCallbacks.indexOf(callback);
    if (idx !== -1) this._messageCallbacks.splice(idx, 1);
  }
  /**
   * Tear the channel down: clear handlers, rings, and outlet timers/callbacks.
   * Called on link teardown and on retry-count exhaustion.
   */
  _shutdown() {
    if (this._shutDown) return;
    this._shutDown = true;
    this._messageCallbacks.length = 0;
    this._clearRings();
    this._outlet._cleanup();
  }
  /** @private */
  _clearRings() {
    for (const envelope of this._txRing) {
      if (envelope.packet != null) {
        this._outlet.setPacketTimeoutCallback(envelope.packet, null);
        this._outlet.setPacketDeliveredCallback(envelope.packet, null);
      }
      envelope.tracked = false;
    }
    for (const envelope of this._rxRing) envelope.tracked = false;
    this._txRing.length = 0;
    this._rxRing.length = 0;
  }
  /**
   * Insert `envelope` into `ring` in sequence order (wraparound-aware), deduping
   * by sequence. Returns false on duplicate. The wraparound guard is keyed off
   * `_nextRxSequence`, which is a no-op for the naturally-ordered tx ring.
   * @param {Envelope} envelope
   * @param {Envelope[]} ring
   * @returns {boolean}
   * @private
   */
  _emplaceEnvelope(envelope, ring) {
    for (let i = 0; i < ring.length; i++) {
      const existing = ring[i];
      if (envelope.sequence === existing.sequence) {
        log(
          "Channel",
          `Emplacement of duplicate envelope with sequence ${envelope.sequence}`,
          LogLevel.EXTREME
        );
        return false;
      }
      if (envelope.sequence < existing.sequence && !(this._nextRxSequence - envelope.sequence > SEQ_MAX / 2)) {
        ring.splice(i, 0, envelope);
        envelope.tracked = true;
        return true;
      }
    }
    envelope.tracked = true;
    ring.push(envelope);
    return true;
  }
  /**
   * @param {MessageBase} message
   * @private
   */
  _runCallbacks(message) {
    const cbs = this._messageCallbacks.slice();
    for (const cb of cbs) {
      try {
        if (cb(message)) return;
      } catch (err) {
        log(
          "Channel",
          `Error while running a message callback: ${err}`,
          LogLevel.ERROR
        );
      }
    }
  }
  /**
   * Decode an inbound envelope, validate its sequence, accept it into the rx
   * ring, and deliver any newly-contiguous messages to handlers in order.
   * @param {Uint8Array} raw
   */
  _receive(raw) {
    try {
      const envelope = new Envelope({ outlet: this._outlet, raw });
      envelope.unpack(this._messageFactories);
      if (envelope.sequence < this._nextRxSequence) {
        const windowOverflow = (this._nextRxSequence + WINDOW_MAX) % SEQ_MODULUS;
        if (windowOverflow < this._nextRxSequence) {
          if (envelope.sequence > windowOverflow) {
            log(
              "Channel",
              `Invalid packet sequence (${envelope.sequence}) received`,
              LogLevel.EXTREME
            );
            return;
          }
        } else {
          log(
            "Channel",
            `Invalid packet sequence (${envelope.sequence}) received`,
            LogLevel.EXTREME
          );
          return;
        }
      }
      const isNew = this._emplaceEnvelope(envelope, this._rxRing);
      if (!isNew) {
        log("Channel", "Duplicate message received", LogLevel.EXTREME);
        return;
      }
      const contiguous = [];
      for (; ; ) {
        const idx = this._rxRing.findIndex(
          (e2) => e2.sequence === this._nextRxSequence
        );
        if (idx === -1) break;
        const e = this._rxRing[idx];
        contiguous.push(e);
        this._rxRing.splice(idx, 1);
        this._nextRxSequence = (this._nextRxSequence + 1) % SEQ_MODULUS;
      }
      for (const e of contiguous) {
        const m = (
          /** @type {MessageBase} */
          e.unpacked ? e.message : e.unpack(this._messageFactories)
        );
        this._runCallbacks(m);
      }
    } catch (err) {
      log(
        "Channel",
        `An error occurred while receiving data: ${err}`,
        LogLevel.ERROR
      );
    }
  }
  /**
   * Whether the channel can accept another `send`.
   * @returns {boolean}
   */
  isReadyToSend() {
    if (!this._outlet.isUsable) return false;
    let outstanding = 0;
    for (const envelope of this._txRing) {
      if (envelope.outlet !== this._outlet) continue;
      if (!envelope.packet || this._outlet.getPacketState(envelope.packet) !== MessageState.MSGSTATE_DELIVERED) {
        outstanding += 1;
      }
    }
    return outstanding < this.window;
  }
  /**
   * Delivery confirmed for a packet: remove its envelope from the tx ring and
   * grow / promote the window.
   * @param {any} packet
   * @param {(envelope: Envelope) => boolean} op
   * @private
   */
  _packetTxOp(packet, op) {
    const targetId = this._outlet.getPacketId(packet);
    const envelope = this._txRing.find(
      (e) => e.packet != null && this._outlet.getPacketId(e.packet) === targetId
    );
    if (envelope && op(envelope)) {
      envelope.tracked = false;
      const idx = this._txRing.indexOf(envelope);
      if (idx !== -1) {
        this._txRing.splice(idx, 1);
        if (this.window < this.windowMax) this.window += 1;
        const rtt = this._outlet.rtt;
        if (rtt !== 0) {
          if (rtt > RTT_FAST) {
            this.fastRateRounds = 0;
            if (rtt > RTT_MEDIUM) {
              this.mediumRateRounds = 0;
            } else {
              this.mediumRateRounds += 1;
              if (this.windowMax < WINDOW_MAX_MEDIUM && this.mediumRateRounds === FAST_RATE_THRESHOLD) {
                this.windowMax = WINDOW_MAX_MEDIUM;
                this.windowMin = WINDOW_MIN_LIMIT_MEDIUM;
              }
            }
          } else {
            this.fastRateRounds += 1;
            if (this.windowMax < WINDOW_MAX_FAST && this.fastRateRounds === FAST_RATE_THRESHOLD) {
              this.windowMax = WINDOW_MAX_FAST;
              this.windowMin = WINDOW_MIN_LIMIT_FAST;
            }
          }
        }
      } else {
        log("Channel", "Envelope not found in TX ring", LogLevel.EXTREME);
      }
    }
    if (!envelope) {
      log("Channel", "Spurious message received", LogLevel.EXTREME);
    }
  }
  /** @param {any} packet @private */
  _packetDelivered(packet) {
    this._packetTxOp(packet, () => true);
  }
  /**
   * Per-packet timeout based on retry count, RTT, and tx-ring depth.
   * @param {number} tries
   * @returns {number} seconds
   * @private
   */
  _getPacketTimeoutTime(tries) {
    return 1.5 ** (tries - 1) * Math.max(this._outlet.rtt * 2.5, 0.025) * (this._txRing.length + 1.5);
  }
  /**
   * Only-ever-increase the scheduled timeout of in-flight envelopes (a new send
   * grows the tx ring, which raises every envelope's fair timeout).
   * @private
   */
  _updatePacketTimeouts() {
    for (const envelope of this._txRing) {
      if (!envelope.packet) continue;
      const updated = this._getPacketTimeoutTime(envelope.tries);
      this._outlet.extendTimeout(envelope.packet, updated);
    }
  }
  /**
   * A sent packet's delivery proof did not arrive in time: retransmit (up to
   * {@link _maxTries}) or tear the link down.
   * @param {any} packet
   * @private
   */
  _packetTimeout(packet) {
    if (this._outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED) {
      return;
    }
    const targetId = this._outlet.getPacketId(packet);
    const envelope = this._txRing.find(
      (e) => e.packet != null && this._outlet.getPacketId(e.packet) === targetId
    );
    if (!envelope) return;
    let envelopeToResend = null;
    let shouldTeardown = false;
    if (envelope.tries >= this._maxTries) {
      shouldTeardown = true;
    } else {
      envelope.tries += 1;
      envelopeToResend = envelope;
      if (this.window > this.windowMin) {
        this.window -= 1;
        if (this.windowMax > this.windowMin + this.windowFlexibility) {
          this.windowMax -= 1;
        }
      }
    }
    if (shouldTeardown) {
      log(
        "Channel",
        "Retry count exceeded, tearing down Link.",
        LogLevel.ERROR
      );
      this._shutdown();
      this._outlet.timedOut();
      return;
    }
    if (envelopeToResend) {
      Promise.resolve(this._outlet.resend(envelopeToResend.packet)).catch(
        (err) => log("Channel", `Resend failed: ${err}`, LogLevel.ERROR)
      );
      this._outlet.setPacketDeliveredCallback(
        envelopeToResend.packet,
        this._packetDelivered
      );
      this._outlet.setPacketTimeoutCallback(
        envelopeToResend.packet,
        this._packetTimeout,
        this._getPacketTimeoutTime(envelopeToResend.tries)
      );
      this._updatePacketTimeouts();
      const alreadyDelivered = this._outlet.getPacketState(envelopeToResend.packet) === MessageState.MSGSTATE_DELIVERED;
      if (alreadyDelivered) this._packetDelivered(envelopeToResend.packet);
    }
  }
  /**
   * Send a message reliably. Rejects if the channel is not ready
   * ({@link CEType.ME_LINK_NOT_READY}) or the packed message exceeds the MDU
   * ({@link CEType.ME_TOO_BIG}). Resolves with the outbound {@link Envelope}.
   *
   * @param {MessageBase} message
   * @returns {Promise<Envelope>}
   */
  send(message) {
    const p = this._sendChain.then(() => this._sendImpl(message));
    this._sendChain = p.then(
      () => {
      },
      () => {
      }
    );
    return p;
  }
  /**
   * @param {MessageBase} message
   * @returns {Promise<Envelope>}
   * @private
   */
  async _sendImpl(message) {
    if (this._shutDown || !this.isReadyToSend()) {
      throw new ChannelException(CEType.ME_LINK_NOT_READY, "Link is not ready");
    }
    const reservedSequence = this._nextSequence;
    const envelope = new Envelope({
      outlet: this._outlet,
      message,
      sequence: reservedSequence
    });
    const packed = envelope.pack();
    if (packed.length > this._outlet.mdu) {
      throw new ChannelException(
        CEType.ME_TOO_BIG,
        `Packed message too big for packet: ${packed.length} > ${this._outlet.mdu}`
      );
    }
    this._nextSequence = (reservedSequence + 1) % SEQ_MODULUS;
    let packet;
    try {
      packet = await this._outlet.send(packed);
    } catch (err) {
      this._nextSequence = reservedSequence;
      throw err;
    }
    envelope.packet = packet;
    this._emplaceEnvelope(envelope, this._txRing);
    envelope.tries += 1;
    this._outlet.setPacketDeliveredCallback(packet, this._packetDelivered);
    this._outlet.setPacketTimeoutCallback(
      packet,
      this._packetTimeout,
      this._getPacketTimeoutTime(envelope.tries)
    );
    this._updatePacketTimeouts();
    const alreadyDelivered = this._outlet.getPacketState(packet) === MessageState.MSGSTATE_DELIVERED;
    if (alreadyDelivered) this._packetDelivered(packet);
    return envelope;
  }
  /**
   * Maximum body bytes available to a single message: the outlet MDU minus the
   * 6-byte envelope header, capped at 16 bits.
   * @returns {number}
   */
  get mdu() {
    const mdu = this._outlet.mdu - ENVELOPE_HEADER_SIZE;
    return mdu > 65535 ? 65535 : mdu;
  }
  /**
   * The link this channel runs over, if any (the bz2 module injected for
   * Resources lives here). `null` for non-link outlets.
   * @private
   */
  get _link() {
    return (
      /** @type {any} */
      this._outlet.link ?? null
    );
  }
  /**
   * Open a `ReadableStream<Uint8Array>` that receives byte-stream frames
   * addressed to `streamId`. Registers `StreamDataMessage` as a system type
   * and a per-stream handler; the stream closes once an `eof` frame has been
   * delivered.
   *
   * Compression: a bz2 module injected on the link (`link.bz2`, the same field
   * Resources use) decompresses inbound frames; without it a compressed frame
   * errors the stream.
   *
   * @param {number} streamId - local stream id to receive at (0–0x3fff).
   * @param {{ bz2?: any }} [options] - override the link's injected bz2.
   * @returns {ReadableStream<Uint8Array>}
   */
  openReadable(streamId, options) {
    if (!_streamAdapters) {
      throw new Error("Stream adapters not loaded; import the buffer module.");
    }
    return _streamAdapters.openReadable(this, streamId, options);
  }
  /**
   * Open a `WritableStream<Uint8Array>` that sends byte-stream frames to the
   * peer's `streamId`. Each written chunk is split into `StreamDataMessage`-
   * sized frames; backpressure follows the channel send window. `close()`
   * sends a final `eof` frame.
   *
   * Compression: when a bz2 module is available (via `options.bz2` or
   * `link.bz2`), each frame is compressed only when compression actually
   * shrinks it.
   *
   * @param {number} streamId - remote stream id to send to (0–0x3fff).
   * @param {{ bz2?: any }} [options] - override the link's injected bz2.
   * @returns {WritableStream<Uint8Array>}
   */
  openWritable(streamId, options) {
    if (!_streamAdapters) {
      throw new Error("Stream adapters not loaded; import the buffer module.");
    }
    return _streamAdapters.openWritable(this, streamId, options);
  }
  /**
   * Open a duplex `{ readable, writable }` pair over this channel:
   * `readable` receives `receiveStreamId`, `writable` sends `sendStreamId`.
   * See {@link openReadable} / {@link openWritable} for compression /
   * backpressure.
   *
   * @param {number} receiveStreamId - local stream id to receive at.
   * @param {number} sendStreamId - remote stream id to send to.
   * @param {{ bz2?: any }} [options] - override the link's injected bz2.
   * @returns {{ readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> }}
   */
  openDuplex(receiveStreamId, sendStreamId, options) {
    if (!_streamAdapters) {
      throw new Error("Stream adapters not loaded; import the buffer module.");
    }
    return _streamAdapters.openDuplex(
      this,
      receiveStreamId,
      sendStreamId,
      options
    );
  }
};
var LinkOutletPacket = class {
  /** @type {Packet} */
  packet;
  /** @type {string} */
  hashHex;
  delivered = false;
  /** Last armed timeout value (seconds). @type {number|null} */
  timeout = null;
  /** @type {((packet: LinkOutletPacket) => void)|null} */
  timeoutCallback = null;
  /** @type {((packet: LinkOutletPacket) => void)|null} */
  deliveredCallback = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  timeoutTimer = null;
  /**
   * @param {Packet} packet
   * @param {string} hashHex
   */
  constructor(packet, hashHex) {
    this.packet = packet;
    this.hashHex = hashHex;
  }
};
var LinkChannelOutlet = class extends ChannelOutletBase {
  /** @type {Map<string, LinkOutletPacket>} keyed by hex packet hash */
  _sent = /* @__PURE__ */ new Map();
  /**
   * Hashes whose proof arrived before `send()` registered the handle. With a
   * zero-latency (mock) transport the proof round-trip completes inside
   * `outlet.send`'s await — before the handle is stored — so we stash those
   * hashes and reconcile when `send()` lands.
   * @type {Set<string>}
   */
  _earlyDelivered = /* @__PURE__ */ new Set();
  /**
   * @param {import("./link.js").Link} link
   */
  constructor(link) {
    super();
    this.link = link;
    this._proofListener = (event) => {
      const detail = (
        /** @type {{packetHash: Uint8Array}} */
        event.detail
      );
      this._markDelivered(toHex(detail.packetHash));
    };
    this.link.addEventListener(
      "proof",
      /** @type {any} */
      this._proofListener
    );
  }
  /**
   * Token-encrypt and send a CHANNEL DATA packet. Returns a handle whose hash is
   * the proof-correlation id.
   * @param {Uint8Array} raw
   * @returns {Promise<LinkOutletPacket>}
   */
  async send(raw) {
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.link.linkId,
      contextByte: ContextType.CHANNEL,
      payload: raw
    });
    const outbound = await this.link.send(packet);
    const hash = await outbound.getHash();
    const hashHex = toHex(hash);
    const op = new LinkOutletPacket(outbound, hashHex);
    if (this._earlyDelivered.has(hashHex)) {
      op.delivered = true;
      this._earlyDelivered.delete(hashHex);
    }
    this._sent.set(hashHex, op);
    return op;
  }
  /**
   * Re-send the exact wire bytes of a previously-sent packet (identical hash →
   * identical proof). Returns the same handle.
   * @param {LinkOutletPacket} op
   * @returns {Promise<LinkOutletPacket>}
   */
  async resend(op) {
    if (this.link.transport) {
      await this.link.transport.sendPacket(op.packet);
    }
    return op;
  }
  get mdu() {
    return this.link.mdu;
  }
  get rtt() {
    return this.link.rtt;
  }
  // Always usable: the link's own CLOSED transition and the channel's
  // `_shutDown` flag stop new sends.
  get isUsable() {
    return true;
  }
  /**
   * @param {LinkOutletPacket} op
   * @returns {MessageState}
   */
  getPacketState(op) {
    if (!op) return MessageState.MSGSTATE_FAILED;
    if (op.delivered) return MessageState.MSGSTATE_DELIVERED;
    return MessageState.MSGSTATE_SENT;
  }
  /** @param {LinkOutletPacket} op @returns {string|null} */
  getPacketId(op) {
    return op ? op.hashHex : null;
  }
  /** Tear the underlying link down (retry-count exhaustion). */
  timedOut() {
    this.link.teardown().catch(
      (err) => log(
        "Channel",
        `teardown after channel timeout failed: ${err}`,
        LogLevel.ERROR
      )
    );
  }
  /**
   * (Re)arm the timeout for a packet. Each call replaces the prior callback and
   * restarts the countdown at `timeoutSeconds`.
   * @param {LinkOutletPacket} op
   * @param {((packet: LinkOutletPacket) => void)|null} callback
   * @param {number} [timeoutSeconds]
   */
  setPacketTimeoutCallback(op, callback, timeoutSeconds) {
    if (!op) return;
    if (op.timeoutTimer !== null) {
      clearTimeout(op.timeoutTimer);
      op.timeoutTimer = null;
    }
    if (callback === null) {
      op.timeoutCallback = null;
      return;
    }
    if (op.delivered) {
      op.timeoutCallback = callback;
      return;
    }
    op.timeoutCallback = callback;
    if (timeoutSeconds !== void 0 && timeoutSeconds !== null) {
      op.timeout = timeoutSeconds;
      op.timeoutTimer = setTimeout(() => {
        op.timeoutTimer = null;
        if (op.delivered) return;
        const cb = op.timeoutCallback;
        if (cb) {
          try {
            cb(op);
          } catch (err) {
            log("Channel", `Timeout callback threw: ${err}`, LogLevel.ERROR);
          }
        }
      }, timeoutSeconds * 1e3);
    }
  }
  /**
   * @param {LinkOutletPacket} op
   * @param {((packet: LinkOutletPacket) => void)|null} callback
   */
  setPacketDeliveredCallback(op, callback) {
    if (!op) return;
    op.deliveredCallback = callback;
  }
  /**
   * Only-if-larger timeout bump used by `Channel._updatePacketTimeouts`.
   * @param {LinkOutletPacket} op
   * @param {number} timeoutSeconds
   */
  extendTimeout(op, timeoutSeconds) {
    if (!op || op.delivered || op.timeout === null) return;
    if (timeoutSeconds > op.timeout) {
      this.setPacketTimeoutCallback(op, op.timeoutCallback, timeoutSeconds);
    }
  }
  /**
   * Mark the packet for `hashHex` delivered (idempotent) and fire its callback.
   * @param {string} hashHex
   * @private
   */
  _markDelivered(hashHex) {
    const op = this._sent.get(hashHex);
    if (!op) {
      this._earlyDelivered.add(hashHex);
      return;
    }
    if (op.delivered) return;
    op.delivered = true;
    if (op.timeoutTimer !== null) {
      clearTimeout(op.timeoutTimer);
      op.timeoutTimer = null;
    }
    this._sent.delete(hashHex);
    const cb = op.deliveredCallback;
    if (cb) {
      try {
        cb(op);
      } catch (err) {
        log("Channel", `Delivered callback threw: ${err}`, LogLevel.ERROR);
      }
    }
  }
  /** Detach the proof listener and clear armed timers (on channel shutdown). */
  _cleanup() {
    this.link.removeEventListener(
      "proof",
      /** @type {any} */
      this._proofListener
    );
    for (const op of this._sent.values()) {
      if (op.timeoutTimer !== null) {
        clearTimeout(op.timeoutTimer);
        op.timeoutTimer = null;
      }
    }
    this._sent.clear();
    this._earlyDelivered.clear();
  }
};

// node_modules/@reticulum/core/src/transport/link.js
var LinkStatus = {
  PENDING: 0,
  HANDSHAKE: 1,
  ACTIVE: 2,
  STALE: 3,
  CLOSED: 4
};
var LinkTeardownReason = {
  TIMEOUT: 1,
  INITIATOR_CLOSED: 2,
  DESTINATION_CLOSED: 3
};
function isLinkPacketUnencrypted(packetType, contextByte) {
  if (packetType === PacketType.PROOF) {
    return contextByte === ContextType.NONE || contextByte === ContextType.RESOURCE_PRF;
  }
  return contextByte === ContextType.RESOURCE || contextByte === ContextType.KEEPALIVE || contextByte === ContextType.CACHE_REQUEST;
}
async function linkIdFromLrPacket(packet) {
  const lowFlags = packet.raw[0] & 15;
  const offset = packet.headerType === HeaderType.HEADER_2 ? 18 : 2;
  let body = packet.raw.subarray(offset);
  if (packet.payload.length > Link.EC_PUBLIC_KEY_SIZE) {
    const diff = packet.payload.length - Link.EC_PUBLIC_KEY_SIZE;
    body = body.subarray(0, body.length - diff);
  }
  const hashable = new Uint8Array(1 + body.length);
  hashable[0] = lowFlags;
  hashable.set(body, 1);
  return Identity.truncatedHash(hashable);
}
var ResourceResponse = class {
  /**
   * @param {Uint8Array} data - Raw response payload bytes.
   * @param {any} [metadata] - msgpack-encodable response metadata (max
   *   16 MiB-1 packed).
   */
  constructor(data, metadata) {
    this.data = data;
    this.metadata = metadata;
  }
};
var Link = class _Link extends EventTarget {
  /** Combined size of the two initiator ephemeral public keys (X25519 + Ed25519). */
  static EC_PUBLIC_KEY_SIZE = 64;
  /** Size of the optional MTU/mode signalling trailer on LINKREQUEST/LRPROOF. */
  static SIGNALLING_SIZE = 3;
  /** Default link mode (the only enabled mode in upstream RNS). */
  static MODE_AES256_CBC = 1;
  /** Default Reticulum MTU when MTU discovery is disabled or unavailable. */
  static DEFAULT_MTU = 500;
  // Keepalive cadence constants (matching the Python reference's Link)
  static KEEPALIVE_MAX_SECS = 360;
  static KEEPALIVE_MIN_SECS = 5;
  static KEEPALIVE_MAX_RTT_SECS = 1.75;
  static STALE_FACTOR = 2;
  /**
   * Multiplier on measured RTT used when computing the default REQUEST
   * response timeout (PROTOCOL-SPEC.md §11.5). Mirrors
   * `RNS.Link.TRAFFIC_TIMEOUT_FACTOR` — verify against upstream if precise
   * timeout parity matters.
   */
  static TRAFFIC_TIMEOUT_FACTOR = 6;
  /**
   * Whether the link terminus corrects its path-table hop estimate when a
   * link handshake's packets traverse a different hop count than expected
   * (`RNS.Transport.ALLOW_LINK_PATH_REBALANCE`). Default on, matching upstream.
   */
  static ALLOW_LINK_PATH_REBALANCE = true;
  /**
   * Response-side grace term for the default REQUEST timeout
   * (PROTOCOL-SPEC.md §11.5). Mirrors
   * `RNS.Resource.RESPONSE_MAX_GRACE_TIME` — the same caveat applies.
   */
  static RESPONSE_MAX_GRACE_TIME_SECS = 4;
  /** Fixed multiplier on the response grace term (PROTOCOL-SPEC.md §11.5). */
  static RESPONSE_GRACE_FACTOR = 1.125;
  /** @type {number} */
  mode = _Link.MODE_AES256_CBC;
  /** @type {number} */
  rtt = 0;
  /** @type {number} */
  keepaliveInterval = _Link.KEEPALIVE_MAX_SECS;
  /**
   * Wall-clock ms of the last keepalive *sent* on this link. Purely an
   * egress-cadence guard: unlike {@link Link#lastInboundTime} it
   * never counts toward liveness — a keepalive we *sent* proves nothing about
   * the peer still being there. Gating pings on it also prevents a ping storm
   * while a pong is in flight or lost.
   * @type {number}
   */
  lastKeepaliveTime = 0;
  /** @type {number} */
  staleTime = _Link.STALE_FACTOR * _Link.KEEPALIVE_MAX_SECS;
  /** @type {Token|null} */
  token = null;
  /** @type {Uint8Array|null} */
  derivedKey = null;
  /** @type {number} */
  mtu = _Link.DEFAULT_MTU;
  /** @type {number} */
  teardownReason = 0;
  /**
   * Wall-clock time (ms) at which the LINKREQUEST was sent (initiator) or
   * received (responder). Used to measure RTT.
   * @type {number}
   */
  requestTimeMs = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  _watchdogTimer = null;
  /** @type {Promise<void>} */
  _rxQueue = Promise.resolve();
  /** Pending outgoing resource payloads keyed by hex hash (RESOURCE_ADV/REQ). */
  pendingResources = /* @__PURE__ */ new Map();
  /**
   * Initiator-side pending REQUESTs keyed by hex(request_id)
   * (PROTOCOL-SPEC.md §11.5). Each entry resolves/rejects its returned Promise
   * when the matching RESPONSE arrives or the timeout fires.
   * @type {Map<string, {resolve: Function, reject: Function, onMetadata: ((metadata: any) => void)|undefined, onProgress: ((info: any) => void)|undefined, timer: ReturnType<typeof setTimeout>}>}
   */
  pendingRequests = /* @__PURE__ */ new Map();
  /**
   * Outgoing Resources (this side is the sender) keyed by hex(resource.hash)
   * — PROTOCOL-SPEC.md §10. Driven by `Resource.advertise` and fulfilled by
   * inbound RESOURCE_REQ / RESOURCE_PRF / RESOURCE_RCL.
   * @type {Map<string, import("../core/resource.js").Resource>}
   */
  outgoingResources = /* @__PURE__ */ new Map();
  /**
   * Incoming Resources (this side is the receiver) keyed by hex(resource.hash).
   * Populated from RESOURCE_ADV; parts are routed by map_hash matching.
   * @type {Map<string, import("../core/resource.js").Resource>}
   */
  incomingResources = /* @__PURE__ */ new Map();
  /**
   * Split-resource assemblers (§10.3) keyed by hex(originalHash) — the first
   * segment's hash that ties all segments of one logical transfer together.
   * @type {Map<string, import("../core/resource.js").SplitResourceAssembler>}
   */
  splitResources = /* @__PURE__ */ new Map();
  /**
   * Original hashes of split resources that failed mid-transfer; late
   * segments for these are rejected instead of restarting an assembler.
   * @type {Set<string>}
   */
  failedSplitResources = /* @__PURE__ */ new Set();
  /**
   * Injected bz2 module (PROTOCOL-SPEC.md §10.2 step 2). The library never
   * imports a compression dependency; the application assigns this if it wants
   * Resource compression. When unset, compressed advertisements cannot be
   * decompressed locally and sender-side compression is skipped.
   * @type {import("../core/resource.js").Bzip2 | undefined}
   */
  bz2 = void 0;
  /**
   * Cap on advertised Resource size accepted inbound (§10.4 bomb defense).
   * Applications may lower this; `null` keeps the {@link Resource} default.
   * @type {number | undefined}
   */
  maxResourceSize = void 0;
  /**
   * Lazy `Channel` for reliable typed message exchange over this link
   * (matching the Python reference's Link). Created on first {@link getChannel} call or
   * on the first inbound CHANNEL packet; shut down when the link closes.
   * @type {Channel | null}
   * @private
   */
  _channel = null;
  /**
   * Low-level constructor. Prefer the `Link.initiate` / `Link.accept` factories.
   *
   * @param {object} opts
   * @param {import("../core/destination.js").Destination} opts.destination
   * @param {Uint8Array} opts.linkId
   * @param {import("../transport/transport.js").TransportCore} opts.transport
   * @param {boolean} opts.initiator
   * @param {CryptoKey} opts.ephemeralX25519Priv - This side's ephemeral X25519 private key.
   * @param {Uint8Array} [opts.ephemeralX25519Pub] - This side's ephemeral X25519 public key (raw 32 bytes).
   * @param {CryptoKey} [opts.ephemeralEd25519Priv] - Initiator's fresh ephemeral Ed25519 private key (link-proof signing).
   * @param {Uint8Array} [opts.peerX25519Pub] - Peer's ephemeral X25519 public key (raw 32 bytes).
   * @param {Uint8Array} [opts.peerEd25519Pub] - Peer's ephemeral Ed25519 public key (raw 32 bytes).
   *   Responder-only: the initiator's link-proof signing pub, captured from the
   *   LINKREQUEST body so the responder can verify initiator-signed link proofs (§6.5).
   * @param {number} [opts.mtu]
   * @param {number} [opts.mode]
   */
  constructor(opts) {
    super();
    this.destination = opts.destination;
    this.linkId = opts.linkId;
    this.transport = opts.transport;
    this.initiator = opts.initiator;
    this.ephemeralX25519Priv = opts.ephemeralX25519Priv;
    this.ephemeralX25519Pub = opts.ephemeralX25519Pub;
    this.ephemeralEd25519Priv = opts.ephemeralEd25519Priv ?? null;
    this.peerX25519Pub = opts.peerX25519Pub ?? null;
    this.peerEd25519Pub = opts.peerEd25519Pub ?? null;
    if (opts.mtu !== void 0) this.mtu = opts.mtu;
    if (opts.mode !== void 0) this.mode = opts.mode;
    this.lastInboundTime = Date.now();
    this._status = LinkStatus.PENDING;
    this._peerEd25519Key = null;
    this._pendingLinkProofs = /* @__PURE__ */ new Map();
    this.expectedHops = null;
    this.rebalanced = null;
  }
  /**
   * The current link status.
   * @returns {LinkStatus}
   */
  get status() {
    return this._status;
  }
  /**
   * Maximum plaintext bytes that fit in a single link DATA packet after
   * Token encryption and the HEADER_1 framing are applied
   * (PROTOCOL-SPEC.md §11.1, §5.2).
   *
   * The on-wire form of a link DATA packet is:
   *
   * ```
   * flags(1) hops(1) dest_hash(16) context(1)   iv(16) aes_ct hmac(32)
   * \---------------------- 19 ----------------/  \------ 48 ------/
   * ```
   *
   * PKCS#7 padding always adds 1–16 bytes (a full block when the plaintext is
   * itself a block multiple), so the largest plaintext `P` whose ciphertext
   * fits the remaining budget is the largest block-multiple ciphertext ≤
   * `(mtu − 67)` minus one byte. At the default `mtu = 500` this yields the
   * spec-pinned `MDU = 431` (wire packet 499 B, verified against RNS).
   *
   * @returns {number}
   */
  get mdu() {
    const HEADER1_SIZE = 19;
    const TOKEN_OVERHEAD = 48;
    const AES_BLOCK = 16;
    const ciphertextBudget = this.mtu - HEADER1_SIZE - TOKEN_OVERHEAD;
    return Math.max(
      0,
      Math.floor(ciphertextBudget / AES_BLOCK) * AES_BLOCK - 1
    );
  }
  /**
   * Transitions the link to a new status, emitting `statuschange`.
   * @param {LinkStatus} newStatus
   */
  set status(newStatus) {
    const reason = newStatus === LinkStatus.CLOSED ? ` (${getEnumName(LinkTeardownReason, this.teardownReason)})` : "";
    log(
      "Link",
      `Link ${toHex(this.linkId)} status is now ${getEnumName(LinkStatus, newStatus)}${reason}`,
      LogLevel.DEBUG
    );
    const oldStatus = this._status;
    this._status = newStatus;
    if (oldStatus !== newStatus) {
      this.dispatchEvent(
        new CustomEvent("statuschange", {
          detail: { status: newStatus, oldStatus }
        })
      );
      if (newStatus === LinkStatus.ACTIVE) {
        this._startWatchdog();
      } else if (newStatus === LinkStatus.CLOSED) {
        this._stopWatchdog();
        this._channel?._shutdown();
        if (this.transport) this.transport.removeLink(this.linkId);
        this._rejectPendingRequests("Link closed before RESPONSE arrived");
        const dh = this.destination?.destinationHash;
        if (oldStatus !== LinkStatus.ACTIVE && dh && typeof this.transport?.expirePath === "function") {
          this.transport.expirePath(dh);
          if (typeof this.transport.requestPathAuto === "function") {
            this.transport.requestPathAuto(dh).catch(() => {
            });
          } else if (typeof this.transport.requestPath === "function") {
            this.transport.requestPath(dh).catch(() => {
            });
          }
        }
      }
    }
  }
  /**
   * The reliable typed-message `Channel` for this link (the Python
   * reference's Link carries one lazily). Lazily created on first access (or on the first inbound
   * CHANNEL packet). Returns the same instance for the lifetime of the link.
   *
   * Register message classes with `channel.registerMessageType(...)` and
   * receive with `channel.addMessageHandler(cb)`; send with
   * `channel.send(message)`.
   *
   * @returns {Channel}
   */
  getChannel() {
    if (this._channel === null) {
      this._channel = new Channel(new LinkChannelOutlet(this));
    }
    return this._channel;
  }
  /**
   * The default `whenActive` wait: the bitrate-adaptive establishment timeout
   * ({@link import("./transport.js").TransportCore.establishmentTimeout}) when
   * a transport and destination are available, else 15 s (establishment wait =
   * first-hop timeout + per-hop grace × hops).
   * @returns {number} milliseconds
   * @private
   */
  _defaultEstablishmentTimeoutMs() {
    const dh = this.destination?.destinationHash;
    if (this.transport && dh && typeof this.transport.establishmentTimeout === "function") {
      return this.transport.establishmentTimeout(dh) * 1e3;
    }
    return 15e3;
  }
  /**
   * Resolves once the Link reaches ACTIVE status (immediately if it already
   * is). Callers that obtain a Link reference before the handshake finishes —
   * e.g. right after `Destination.createLink()` resolves — should `await`
   * this before sending application data, since the session token is only
   * derived once the handshake completes.
   *
   * Mirrors the gating the LXMF router applies in its outbound processing
   * before sending DIRECT messages.
   *
   * @param {number} [timeoutMs] - How long to wait for the handshake.
   *   Defaults to the bitrate-adaptive establishment timeout
   *   ({@link import("./transport.js").TransportCore.establishmentTimeout});
   *   falls back to 15 s when no transport/destination is available.
   * @returns {Promise<Link>}
   */
  async whenActive(timeoutMs) {
    if (timeoutMs === void 0) {
      timeoutMs = this._defaultEstablishmentTimeoutMs();
    }
    if (this._status === LinkStatus.ACTIVE) {
      return this;
    }
    return new Promise((resolve, reject) => {
      let timer;
      const onStatusChange = (event) => {
        if (event.detail.status === LinkStatus.ACTIVE) {
          clearTimeout(timer);
          this.removeEventListener("statuschange", onStatusChange);
          resolve(this);
        } else if (event.detail.status === LinkStatus.CLOSED) {
          clearTimeout(timer);
          this.removeEventListener("statuschange", onStatusChange);
          reject(new Error("Link closed before it became active"));
        }
      };
      timer = setTimeout(() => {
        this.removeEventListener("statuschange", onStatusChange);
        reject(new Error("Link did not become active before timeout"));
      }, timeoutMs);
      this.addEventListener("statuschange", onStatusChange);
    });
  }
  // -----------------------------------------------------------------------
  // Factories
  // -----------------------------------------------------------------------
  /**
   * Initiator side: establish a new link to `destination`.
   *
   * Generates fresh ephemeral X25519 + Ed25519 keypairs, builds and sends the
   * LINKREQUEST (dest_type=SINGLE, addressed to the responder's destination
   * hash), derives the link_id from the serialized packet, registers the link
   * with the transport, and transitions to HANDSHAKE. The link becomes ACTIVE
   * once the responder's LRPROOF is validated.
   *
   * @param {import("../core/destination.js").Destination} destination - OUT destination whose identity is the responder's.
   * @param {import("../transport/transport.js").TransportCore} transport
   * @returns {Promise<Link>}
   */
  static async initiate(destination, transport) {
    const ephemeralX25519 = await generateX25519KeyPair();
    const ephemeralEd25519 = await generateEd25519KeyPair();
    const x25519Pub = await exportPublicKey(ephemeralX25519.publicKey);
    const ed25519Pub = await exportPublicKey(ephemeralEd25519.publicKey);
    const signalling = _Link.signallingBytes(
      _Link.DEFAULT_MTU,
      _Link.MODE_AES256_CBC
    );
    const body = new Uint8Array(_Link.EC_PUBLIC_KEY_SIZE + _Link.SIGNALLING_SIZE);
    body.set(x25519Pub, 0);
    body.set(ed25519Pub, 32);
    body.set(signalling, _Link.EC_PUBLIC_KEY_SIZE);
    const packet = new Packet({
      headerType: HeaderType.HEADER_1,
      hops: 0,
      transportType: 0,
      destinationType: DestType.SINGLE,
      packetType: PacketType.LINKREQUEST,
      destinationHash: (
        /** @type {Uint8Array} */
        destination.destinationHash
      ),
      contextByte: ContextType.NONE,
      payload: body
    });
    packet.raw = packet.serialize();
    const linkId = await linkIdFromLrPacket(packet);
    const link = new _Link({
      destination,
      linkId,
      transport,
      initiator: true,
      ephemeralX25519Priv: ephemeralX25519.privateKey,
      ephemeralX25519Pub: x25519Pub,
      ephemeralEd25519Priv: ephemeralEd25519.privateKey,
      mtu: _Link.DEFAULT_MTU,
      mode: _Link.MODE_AES256_CBC
    });
    transport.addLink(linkId, link);
    link.requestTimeMs = Date.now();
    link.expectedHops = destination.destinationHash && typeof transport.hopsTo === "function" ? transport.hopsTo(destination.destinationHash) : null;
    link.status = LinkStatus.HANDSHAKE;
    await link._sendRaw(packet);
    return link;
  }
  /**
   * Responder side: accept an incoming LINKREQUEST and complete the handshake
   * up to LRPROOF.
   *
   * Derives the link_id, extracts the initiator's ephemeral keys, derives the
   * session keys, builds and sends the LRPROOF signed with the destination's
   * long-term identity key, registers the link with the transport, and
   * transitions to HANDSHAKE. The link becomes ACTIVE once the initiator's
   * LRRTT arrives.
   *
   * @param {import("../core/destination.js").Destination} destination - IN destination whose identity is this node's.
   * @param {import("../transport/transport.js").TransportCore} transport
   * @param {Packet} requestPacket - The incoming LINKREQUEST (with `raw` populated).
   * @returns {Promise<Link>}
   */
  static async accept(destination, transport, requestPacket) {
    const linkId = await linkIdFromLrPacket(requestPacket);
    const data = requestPacket.payload;
    const initiatorX25519Pub = data.subarray(0, 32);
    const initiatorEd25519Pub = data.slice(32, 64);
    let mtu = _Link.DEFAULT_MTU;
    let mode = _Link.MODE_AES256_CBC;
    if (data.length === _Link.EC_PUBLIC_KEY_SIZE + _Link.SIGNALLING_SIZE) {
      const signalling = data.subarray(_Link.EC_PUBLIC_KEY_SIZE);
      mode = (signalling[0] & 224) >> 5;
      mtu = ((signalling[0] << 16) + (signalling[1] << 8) + signalling[2] & 2097151) >>> 0;
    }
    const ephemeral = await generateX25519KeyPair();
    const responderX25519Pub = await exportPublicKey(ephemeral.publicKey);
    const link = new _Link({
      destination,
      linkId,
      transport,
      initiator: false,
      ephemeralX25519Priv: ephemeral.privateKey,
      ephemeralX25519Pub: responderX25519Pub,
      peerX25519Pub: initiatorX25519Pub,
      peerEd25519Pub: initiatorEd25519Pub,
      mtu,
      mode
    });
    await link._deriveKeys(initiatorX25519Pub);
    link.requestTimeMs = Date.now();
    link.expectedHops = requestPacket.hops;
    link.status = LinkStatus.HANDSHAKE;
    transport.addLink(linkId, link);
    await link._sendLRProof();
    return link;
  }
  // -----------------------------------------------------------------------
  // Signalling helpers (matching the Python reference's Link)
  // -----------------------------------------------------------------------
  /**
   * Packs the 3-byte MTU/mode signalling trailer.
   * @param {number} mtu
   * @param {number} mode
   * @returns {Uint8Array}
   */
  static signallingBytes(mtu, mode) {
    const MTU_BYTEMASK = 2097151;
    const MODE_BYTEMASK = 224;
    const signallingValue = (mtu & MTU_BYTEMASK) + ((mode << 5 & MODE_BYTEMASK) << 16);
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, signallingValue, false);
    return new Uint8Array(buffer).subarray(1);
  }
  // -----------------------------------------------------------------------
  // Session key derivation (LINKS.md §6.4.1)
  // -----------------------------------------------------------------------
  /**
   * Derives the link session keys from the peer's ephemeral X25519 public key.
   *
   *   shared       = X25519(my_ephemeral_priv, peer_ephemeral_pub)
   *   session_key  = HKDF(shared, salt=link_id, info="", L=64)
   *
   * @param {Uint8Array} peerX25519PubBytes
   * @returns {Promise<void>}
   * @private
   */
  async _deriveKeys(peerX25519PubBytes) {
    log("Link", "Deriving session keys");
    const peerPub = await crypto.subtle.importKey(
      "raw",
      /** @type {any} */
      peerX25519PubBytes,
      { name: "X25519" },
      true,
      []
    );
    const sharedBits = await crypto.subtle.deriveBits(
      { name: "X25519", public: peerPub },
      this.ephemeralX25519Priv,
      256
    );
    this.derivedKey = await hkdf(
      new Uint8Array(sharedBits),
      this.linkId,
      new Uint8Array(0),
      64
    );
    this.token = new Token(this.derivedKey);
  }
  // -----------------------------------------------------------------------
  // Sending
  // -----------------------------------------------------------------------
  /**
   * Builds the wire-ready outbound packet for a logical link packet: re-addresses
   * it to `link_id`, Token-encrypts the payload unless it's in the
   * not-encrypted set (§6.7.1), and populates `raw` so the packet hash is
   * computable before transmission.
   *
   * Factored out of {@link send} so the REQUEST path can derive `request_id`
   * from the encrypted packet bytes and register its pending entry BEFORE the
   * packet goes on the wire (avoiding a lost-response race).
   *
   * @param {Packet} packet
   * @returns {Promise<Packet>}
   * @private
   */
  async _prepareOutboundPacket(packet) {
    if (!this.transport) throw new Error("Link transport not available.");
    const unencryptedOnLink = isLinkPacketUnencrypted(
      packet.packetType,
      packet.contextByte
    );
    const isHandshake = packet.packetType === PacketType.LINKREQUEST || packet.packetType === PacketType.PROOF && packet.contextByte === ContextType.LRPROOF;
    let payload = packet.payload;
    if (!isHandshake && !unencryptedOnLink) {
      if (!this.token)
        throw new Error("Link token not available. Did handshake complete?");
      log(
        "Link",
        `Encrypting ${getEnumName(PacketType, packet.packetType)} (ctx ${getEnumName(ContextType, packet.contextByte)})`
      );
      payload = await this.token.encrypt(
        /** @type {Uint8Array} */
        packet.payload
      );
    }
    const outbound = new Packet({
      headerType: packet.headerType ?? HeaderType.HEADER_1,
      hops: packet.hops ?? 0,
      transportType: packet.transportType ?? 0,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      packetType: packet.packetType,
      contextFlag: packet.contextFlag ?? false,
      contextByte: packet.contextByte ?? ContextType.NONE,
      payload,
      transportId: packet.transportId
    });
    outbound.raw = outbound.serialize();
    return outbound;
  }
  /**
   * Sends a packet on the link. The packet is re-addressed to `link_id` and
   * Token-encrypted unless it is in the not-encrypted set (§6.7.1). Returns the
   * wire-ready outbound packet.
   *
   * @param {Packet} packet
   * @returns {Promise<Packet>}
   */
  async send(packet) {
    const outbound = await this._prepareOutboundPacket(packet);
    if (outbound.packetType === PacketType.DATA && outbound.contextByte === ContextType.NONE) {
      const hash = await outbound.getHash();
      this._pendingLinkProofs.set(toHex(hash), hash);
    }
    await this.transport.sendPacket(outbound);
    return outbound;
  }
  /**
   * Sends an already-built packet without re-addressing/encrypting. Used for
   * the LINKREQUEST (addressed to the responder's destination hash, not link_id).
   * @param {Packet} packet
   * @private
   */
  async _sendRaw(packet) {
    await this.transport.sendPacket(packet);
  }
  // -----------------------------------------------------------------------
  // LRPROOF (responder → initiator), LINKS.md §6.2
  // -----------------------------------------------------------------------
  /**
   * Responder: builds and sends the LRPROOF.
   *
   *   signed_data = link_id || responder_X25519 || responder_Ed25519 || signalling
   *   proof_data  = signature(64) || responder_X25519(32) || signalling(3)
   *
   * Signed with the destination's long-term identity key.
   * @private
   */
  async _sendLRProof() {
    if (!this.destination?.identity) {
      throw new Error("Responder LRPROOF requires a destination identity.");
    }
    if (!this.ephemeralX25519Pub) {
      throw new Error(
        "Responder LRPROOF requires an ephemeral X25519 public key."
      );
    }
    const signalling = _Link.signallingBytes(this.mtu, this.mode);
    const responderX25519Pub = this.ephemeralX25519Pub;
    const responderEd25519Pub = (await this.destination.identity.getPublicKey()).subarray(32, 64);
    const signedData = new Uint8Array(
      this.linkId.length + responderX25519Pub.length + responderEd25519Pub.length + signalling.length
    );
    signedData.set(this.linkId, 0);
    signedData.set(responderX25519Pub, this.linkId.length);
    signedData.set(
      responderEd25519Pub,
      this.linkId.length + responderX25519Pub.length
    );
    signedData.set(
      signalling,
      this.linkId.length + responderX25519Pub.length + responderEd25519Pub.length
    );
    const signature = await this.destination.identity.sign(signedData);
    const proofPayload = new Uint8Array(
      signature.length + responderX25519Pub.length + signalling.length
    );
    proofPayload.set(signature, 0);
    proofPayload.set(responderX25519Pub, signature.length);
    proofPayload.set(signalling, signature.length + responderX25519Pub.length);
    const proofPacket = new Packet({
      packetType: PacketType.PROOF,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.LRPROOF,
      payload: proofPayload
    });
    await this.transport.sendPacket(proofPacket);
  }
  // -----------------------------------------------------------------------
  // LRPROOF validation (initiator side), LINKS.md §6.2
  // -----------------------------------------------------------------------
  /**
   * Initiator: validate the responder's LRPROOF, derive session keys, send
   * LRRTT, and transition to ACTIVE.
   * @param {Packet} packet
   * @private
   */
  async _handleLRPROOF(packet) {
    if (!this.destination?.identity) {
      throw new Error(
        "Initiator LRPROOF validation requires the responder identity."
      );
    }
    const data = packet.payload;
    let signalling = new Uint8Array(0);
    let confirmedMtu = this.mtu;
    if (data.length === 64 + 32 + _Link.SIGNALLING_SIZE) {
      signalling = data.subarray(64 + 32);
      confirmedMtu = ((signalling[0] << 16) + (signalling[1] << 8) + signalling[2] & 2097151) >>> 0;
      const mode = (signalling[0] & 224) >> 5;
      if (mode !== this.mode) {
        throw new TypeError(
          `Invalid link mode ${mode} in LRPROOF (expected ${this.mode})`
        );
      }
    } else if (data.length !== 64 + 32) {
      throw new Error(`Invalid LRPROOF body length ${data.length}`);
    }
    const signature = data.subarray(0, 64);
    const responderX25519Pub = data.subarray(64, 96);
    const responderEd25519Pub = (await this.destination.identity.getPublicKey()).subarray(32, 64);
    const signedData = new Uint8Array(
      this.linkId.length + responderX25519Pub.length + responderEd25519Pub.length + signalling.length
    );
    signedData.set(this.linkId, 0);
    signedData.set(responderX25519Pub, this.linkId.length);
    signedData.set(
      responderEd25519Pub,
      this.linkId.length + responderX25519Pub.length
    );
    signedData.set(
      signalling,
      this.linkId.length + responderX25519Pub.length + responderEd25519Pub.length
    );
    const valid = await this.destination.identity.validate(
      signature,
      signedData
    );
    if (!valid) {
      throw new Error("LRPROOF signature verification failed.");
    }
    if (_Link.ALLOW_LINK_PATH_REBALANCE && this._status !== LinkStatus.ACTIVE && packet.hops !== this.expectedHops) {
      this.rebalanced = Date.now();
      this.expectedHops = packet.hops;
      const destHash = (
        /** @type {Uint8Array | undefined} */
        this.destination?.destinationHash
      );
      if (destHash) this.transport?.setPathHops?.(destHash, packet.hops);
    }
    this.peerX25519Pub = responderX25519Pub;
    await this._deriveKeys(responderX25519Pub);
    this.mtu = confirmedMtu;
    this.rtt = (Date.now() - this.requestTimeMs) / 1e3;
    this._updateKeepalive();
    await this._sendLRRTT();
    this.status = LinkStatus.ACTIVE;
    this.dispatchEvent(
      new CustomEvent("established", { detail: { link: this.linkId } })
    );
  }
  // -----------------------------------------------------------------------
  // LRRTT (initiator → responder), LINKS.md §6.4.2
  // -----------------------------------------------------------------------
  /**
   * Initiator: send the RTT packet. Body is `umsgpack.packb(rtt_seconds)` (a
   * 9-byte msgpack float64), Token-encrypted with the link session key.
   * @private
   */
  async _sendLRRTT() {
    const body = MicroMsgPack.encode(this.rtt);
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.LRRTT,
      payload: body
    });
    await this.send(packet);
  }
  /**
   * Responder: process the initiator's LRRTT, settle RTT, transition to ACTIVE
   * (matching the Python reference's Link). This is the only path that fires `established` on
   * the responder side.
   * @param {Packet} packet
   * @private
   */
  async _handleLRRTT(packet) {
    const reportedRtt = MicroMsgPack.decode(
      /** @type {Uint8Array} */
      packet.payload
    );
    const measuredRtt = (Date.now() - this.requestTimeMs) / 1e3;
    this.rtt = Math.max(measuredRtt, reportedRtt);
    this._updateKeepalive();
    this.status = LinkStatus.ACTIVE;
    this.dispatchEvent(
      new CustomEvent("established", { detail: { link: this.linkId } })
    );
  }
  // -----------------------------------------------------------------------
  // Regular link DATA proofs (LINKS.md §6.5)
  // -----------------------------------------------------------------------
  /**
   * Returns the Ed25519 private key used to sign link DATA proofs.
   * Responder signs with its long-term identity key; initiator signs with its
   * fresh ephemeral Ed25519 key (LINKS.md §6.5.1).
   * @returns {Promise<CryptoKey>}
   * @private
   */
  async _linkSigningKey() {
    if (this.initiator) {
      if (!this.ephemeralEd25519Priv) {
        throw new Error("Initiator link has no ephemeral Ed25519 signing key.");
      }
      return this.ephemeralEd25519Priv;
    }
    if (!this.destination?.identity?.ed25519Priv) {
      throw new Error("Responder link has no identity signing key.");
    }
    return this.destination.identity.ed25519Priv;
  }
  /**
   * Emits the 96-byte explicit-form PROOF for a DATA packet we just received.
   *   proof_data = packet_hash(32) || signature(64)
   * Addressed to link_id, unencrypted. Always explicit on links (§6.5.2).
   * @param {Packet} packet
   * @private
   */
  async _provePacket(packet) {
    const packetHash = await packet.getHash();
    const signingKey = await this._linkSigningKey();
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        "Ed25519",
        signingKey,
        /** @type {any} */
        packetHash
      )
    );
    const proofPayload = new Uint8Array(96);
    proofPayload.set(packetHash, 0);
    proofPayload.set(signature, 32);
    const proofPacket = new Packet({
      packetType: PacketType.PROOF,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.NONE,
      payload: proofPayload
    });
    await this.transport.sendPacket(proofPacket);
  }
  /**
   * Validates an inbound link DATA proof (§6.5) and resolves the matching
   * outbound packet.
   *
   * Link proofs are **always explicit** (96 B: `packet_hash(32) ||
   * signature(64)`), addressed to `link_id`, `context = NONE`. The signature is
   * verified with the peer's link-proof signing public key — the responder's
   * long-term identity key (initiator side) or the initiator's ephemeral
   * Ed25519 pub (responder side). On success the tracked packet is cleared and
   * a `proof` event dispatched; bad signatures / lengths are dropped.
   *
   * @param {import("../core/packet.js").Packet} packet
   * @private
   */
  async _handleLinkProof(packet) {
    if (packet.payload.length !== 96) {
      log(
        "Link",
        `Dropping link proof with bad length ${packet.payload.length} (expected 96)`,
        LogLevel.DEBUG
      );
      return;
    }
    const packetHash = packet.payload.slice(0, 32);
    const signature = packet.payload.slice(32, 96);
    const hashHex = toHex(packetHash);
    const verified = await this._verifyLinkProof(signature, packetHash);
    if (!verified) {
      log(
        "Link",
        `Link proof signature invalid for ${hashHex}`,
        LogLevel.WARNING
      );
      return;
    }
    const wasPending = this._pendingLinkProofs.delete(hashHex);
    log(
      "Link",
      `Link proof validated for ${hashHex}${wasPending ? " \u2014 receipt resolved" : " (no tracked packet)"}`,
      LogLevel.DEBUG
    );
    this.dispatchEvent(
      new CustomEvent("proof", {
        detail: { packetHash, verified: true, packet }
      })
    );
  }
  /**
   * Verifies a link-proof Ed25519 signature over `packetHash` using the peer's
   * signing public key.
   *
   * - Initiator verifies with the responder's long-term identity key
   *   (`destination.identity`), which signed the proof.
   * - Responder verifies with the initiator's ephemeral Ed25519 pub, captured
   *   from the LINKREQUEST body (§6.5: "the link's ephemeral Ed25519 keypair
   *   on the initiator side").
   *
   * @param {Uint8Array} signature
   * @param {Uint8Array} packetHash
   * @returns {Promise<boolean>}
   * @private
   */
  async _verifyLinkProof(signature, packetHash) {
    if (this.initiator) {
      const identity = this.destination?.identity;
      if (!identity) return false;
      return identity.validate(signature, packetHash);
    }
    if (!this.peerEd25519Pub) return false;
    if (!this._peerEd25519Key) {
      this._peerEd25519Key = await crypto.subtle.importKey(
        "raw",
        /** @type {any} */
        this.peerEd25519Pub,
        { name: "Ed25519" },
        false,
        ["verify"]
      );
    }
    return await crypto.subtle.verify(
      "Ed25519",
      this._peerEd25519Key,
      /** @type {any} */
      signature,
      /** @type {any} */
      packetHash
    );
  }
  // -----------------------------------------------------------------------
  // KEEPALIVE (LINKS.md §6.7.1)
  // -----------------------------------------------------------------------
  /**
   * Sends a KEEPALIVE packet. Ping body is 0xFF, pong is 0xFE. KEEPALIVE bodies
   * are NOT Token-encrypted (§6.7.1).
   * @param {boolean} isPing
   * @private
   */
  async _sendKeepalive(isPing) {
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.KEEPALIVE,
      payload: new Uint8Array([isPing ? 255 : 254])
    });
    await this.transport.sendPacket(packet);
  }
  // -----------------------------------------------------------------------
  // Teardown (LINKS.md §6.7.3)
  // -----------------------------------------------------------------------
  /**
   * Builds and sends the LINKCLOSE packet (encrypted body = link_id), without
   * touching the status. Shared by the graceful {@link Link#teardown} and
   * the watchdog's stale teardown.
   * @returns {Promise<void>}
   * @private
   */
  async _sendLinkClose() {
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.LINKCLOSE,
      payload: this.linkId
    });
    await this.send(packet);
  }
  /**
   * Cleanly tears down the link by sending a LINKCLOSE whose encrypted body is
   * the link_id, then transitioning to CLOSED locally.
   */
  async teardown() {
    if (this.status === LinkStatus.CLOSED) return;
    await this._sendLinkClose();
    this.teardownReason = this.initiator ? LinkTeardownReason.INITIATOR_CLOSED : LinkTeardownReason.DESTINATION_CLOSED;
    this.status = LinkStatus.CLOSED;
    this.dispatchEvent(
      new CustomEvent("close", { detail: { link: this.linkId } })
    );
  }
  /**
   * Receiver side of LINKCLOSE: decrypt, verify body equals link_id, close.
   * @param {Packet} packet
   * @private
   */
  async _handleLinkClose(packet) {
    const plaintext = (
      /** @type {Uint8Array} */
      packet.payload
    );
    if (plaintext.length !== this.linkId.length) return;
    let diff = 0;
    for (let i = 0; i < plaintext.length; i++)
      diff |= plaintext[i] ^ this.linkId[i];
    if (diff !== 0) return;
    this.teardownReason = this.initiator ? LinkTeardownReason.DESTINATION_CLOSED : LinkTeardownReason.INITIATOR_CLOSED;
    this.status = LinkStatus.CLOSED;
    this.dispatchEvent(
      new CustomEvent("close", { detail: { link: this.linkId } })
    );
  }
  // -----------------------------------------------------------------------
  // LINKIDENTIFY (LINKS.md §6.7.6)
  // -----------------------------------------------------------------------
  /**
   * Initiator: prove which long-term identity owns this link to the responder.
   *
   * Must be called AFTER the link is ACTIVE and BEFORE sending any application
   * DATA. This is load-bearing for Python-LXMF interop: the Python LXMRouter
   * does not install its link-data listener until it has processed
   * LINKIDENTIFY, so a DATA/RESOURCE sent before LINKIDENTIFY is silently
   * dropped on the Python side. Wire body (link-encrypted):
   *
   *   public_key(64) || signature(64)
   *
   * where `signature = identity.sign(link_id || public_key)`, matching the
   * Python reference.
   *
   * @param {import("../core/identity.js").Identity} identity - The initiator's long-term identity.
   */
  async identify(identity) {
    if (!this.initiator || this.status !== LinkStatus.ACTIVE) {
      throw new Error(
        "identify() can only be called by an ACTIVE initiator link."
      );
    }
    const publicKey = await identity.getPublicKey();
    const signedData = new Uint8Array(this.linkId.length + publicKey.length);
    signedData.set(this.linkId, 0);
    signedData.set(publicKey, this.linkId.length);
    const signature = await identity.sign(signedData);
    const payload = new Uint8Array(publicKey.length + signature.length);
    payload.set(publicKey, 0);
    payload.set(signature, publicKey.length);
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.LINKIDENTIFY,
      payload
    });
    await this.send(packet);
  }
  /**
   * Responder: verify an initiator's LINKIDENTIFY and record the remote identity.
   *
   * Body = public_key(64) || signature(64), where signature is over
   * `link_id || public_key`. The whole packet is link-encrypted.
   * @param {Packet} packet
   * @private
   */
  async _handleIdentify(packet) {
    const plaintext = (
      /** @type {Uint8Array} */
      packet.payload
    );
    if (plaintext.length !== 128) return;
    const publicKey = plaintext.subarray(0, 64);
    const signature = plaintext.subarray(64, 128);
    const signedData = new Uint8Array(this.linkId.length + publicKey.length);
    signedData.set(this.linkId, 0);
    signedData.set(publicKey, this.linkId.length);
    const peerIdentity = await Identity.fromPublicKey(publicKey);
    const valid = await peerIdentity.validate(signature, signedData);
    if (!valid) return;
    this.remoteIdentity = peerIdentity;
    this.dispatchEvent(
      new CustomEvent("identify", {
        detail: { identity: peerIdentity, link: this.linkId }
      })
    );
  }
  // -----------------------------------------------------------------------
  // REQUEST / RESPONSE (PROTOCOL-SPEC.md §11)
  // -----------------------------------------------------------------------
  /**
   * Initiator: send a REQUEST over the link and await the RESPONSE
   * (PROTOCOL-SPEC.md §11.1, §11.5).
   *
   * Packs the msgpack envelope `[timestamp, path_hash, data]` (single pack —
   * `data` is encoded directly, NOT pre-msgpacked), dispatches by size, and
   * returns a Promise that resolves with the response value when the server's
   * matching RESPONSE arrives.
   *
   * For a single-packet REQUEST the `request_id` the server echoes back is
   * `SHA-256(packet.get_hashable_part())[:16]` — the truncated hash of the
   * *encrypted wire packet*, computed identically on both sides. It is NOT
   * random and NOT a hash of the plaintext envelope.
   *
   * @param {string} path - Opaque path token (e.g. `"/page/index.mu"`).
   * @param {any} [data=null] - Application value for envelope element [2]
   *   (`null` for plain GETs, an object for NomadNet form posts, an array for
   *   LXMF `/get` rounds, a `Uint8Array` for opaque blobs …). Passed to msgpack
   *   directly — do NOT pre-pack it.
   * @param {object} [options]
   * @param {number} [options.timeout] - Response timeout in ms (defaults to
   *   `rtt * TRAFFIC_TIMEOUT_FACTOR + RESPONSE_MAX_GRACE_TIME_SECS * 1.125`).
   * @param {(metadata: any) => void} [options.onMetadata] - Called with the
   *   decoded response metadata when the responder answers with a
   *   metadata-carrying Resource (§10.4 `x` flag). Invoked before the
   *   returned Promise resolves, so callers observe it as soon as the
   *   response is available.
   * @param {(info: { direction: "request"|"response", loaded: number, total: number, segmentIndex: number, segmentTotal: number }) => void} [options.onProgress]
   *   - Transfer progress for Resource-backed request/response bodies
   *   - `direction` tells whether the bytes flow away from (request
   *     upload) or towards (response download) the caller. `loaded` /
   *     `total` are approximate logical byte counts for the current
   *     segment; `segmentIndex` / `segmentTotal` let callers aggregate
   *     split transfers.
   * @returns {Promise<any>} The decoded RESPONSE value.
   */
  async request(path, data = null, options = {}) {
    if (this.status !== LinkStatus.ACTIVE) {
      throw new Error("Link must be ACTIVE to issue a REQUEST.");
    }
    const pathHash = await Identity.truncatedHash(
      new TextEncoder().encode(path)
    );
    const envelope = [Date.now() / 1e3, pathHash, data];
    const packedRequest = MicroMsgPack.encode(envelope);
    const timeout = options.timeout ?? this._defaultRequestTimeoutMs();
    if (packedRequest.length > this.mdu) {
      const requestId2 = await Identity.truncatedHash(packedRequest);
      const requestIdHex2 = toHex(requestId2);
      const responsePromise2 = this._registerPendingRequest(
        requestIdHex2,
        path,
        timeout,
        options.onMetadata,
        options.onProgress
      );
      const resource = new Resource({
        data: packedRequest,
        link: this,
        isRequest: true,
        requestId: requestId2,
        bz2: this.bz2
      });
      if (options.onProgress) {
        resource.addEventListener("progress", (e) => {
          const { sent, total } = e.detail;
          const size = resource.uncompressedSize;
          options.onProgress?.({
            direction: "request",
            loaded: total ? Math.round(sent / total * size) : 0,
            total: size,
            segmentIndex: resource.segmentIndex,
            segmentTotal: resource.totalSegments
          });
        });
      }
      await resource.advertise();
      return responsePromise2;
    }
    const reqPacket = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.REQUEST,
      payload: packedRequest
    });
    const outbound = await this._prepareOutboundPacket(reqPacket);
    const requestId = await Identity.truncatedHash(outbound.getHashablePart());
    const requestIdHex = toHex(requestId);
    const responsePromise = this._registerPendingRequest(
      requestIdHex,
      path,
      timeout,
      options.onMetadata,
      options.onProgress
    );
    await this.transport.sendPacket(outbound);
    return responsePromise;
  }
  /**
   * Registers a pending REQUEST entry keyed by hex request_id and returns the
   * Promise the caller awaits. Registered BEFORE transmit so a same-tick
   * (loopback) response still finds its entry.
   * @param {string} requestIdHex
   * @param {string} path
   * @param {number} timeoutMs
   * @param {(metadata: any) => void} [onMetadata]
   * @param {(info: any) => void} [onProgress]
   * @returns {Promise<any>}
   * @private
   */
  _registerPendingRequest(requestIdHex, path, timeoutMs, onMetadata, onProgress) {
    return new Promise((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        onMetadata,
        onProgress,
        timer: setTimeout(() => {
          this.pendingRequests.delete(requestIdHex);
          reject(
            new Error(`REQUEST to ${path} timed out after ${timeoutMs}ms`)
          );
        }, timeoutMs)
      };
      this.pendingRequests.set(requestIdHex, entry);
    });
  }
  /**
   * Default REQUEST response timeout (PROTOCOL-SPEC.md §11.5):
   * `rtt * traffic_timeout_factor + RESPONSE_MAX_GRACE_TIME_SECS * 1.125`.
   * @returns {number} milliseconds.
   * @private
   */
  _defaultRequestTimeoutMs() {
    return (this.rtt * _Link.TRAFFIC_TIMEOUT_FACTOR + _Link.RESPONSE_MAX_GRACE_TIME_SECS * _Link.RESPONSE_GRACE_FACTOR) * 1e3;
  }
  /**
   * Responder: dispatch an inbound REQUEST to the registered handler and send
   * the RESPONSE (PROTOCOL-SPEC.md §11.2).
   *
   * `originalPacket` is the as-received (still-encrypted-raw) packet used to
   * compute the request_id; `decrypted` carries the decoded plaintext payload.
   *
   * @param {Packet} originalPacket
   * @param {Packet} decrypted
   * @private
   */
  async _handleRequest(originalPacket, decrypted) {
    const requestId = await Identity.truncatedHash(
      originalPacket.getHashablePart()
    );
    let decoded;
    try {
      decoded = MicroMsgPack.decode(
        /** @type {Uint8Array} */
        decrypted.payload
      );
    } catch (err) {
      log("Link", `Dropping malformed REQUEST: ${err}`, LogLevel.WARNING);
      return;
    }
    if (!Array.isArray(decoded) || decoded.length < 3) {
      log("Link", `Dropping REQUEST with bad envelope shape`, LogLevel.WARNING);
      return;
    }
    const [requestTime, pathHash, data] = decoded;
    if (!(pathHash instanceof Uint8Array) || pathHash.length !== 16) {
      log("Link", `Dropping REQUEST with bad path_hash`, LogLevel.WARNING);
      return;
    }
    await this._dispatchRequest(pathHash, data, requestId, requestTime);
  }
  /**
   * Responder: dispatch a §11.1 REQUEST whose body arrived via a §10 Resource
   * transfer. The assembled `resource.data` is the same `[time, path_hash,
   * data]` msgpack envelope; the `request_id` is carried in the Resource
   * advertisement's `q` field (the plaintext-hash form, §11.1).
   * @param {import("../core/resource.js").Resource} resource
   * @returns {Promise<void>}
   * @private
   */
  async _handleResourceRequest(resource) {
    let decoded;
    try {
      decoded = MicroMsgPack.decode(
        /** @type {Uint8Array} */
        resource.data
      );
    } catch (err) {
      log(
        "Link",
        `Dropping malformed Resource REQUEST: ${err}`,
        LogLevel.WARNING
      );
      return;
    }
    if (!Array.isArray(decoded) || decoded.length < 3) {
      log(
        "Link",
        `Dropping Resource REQUEST with bad envelope shape`,
        LogLevel.WARNING
      );
      return;
    }
    const [requestTime, pathHash, data] = decoded;
    if (!(pathHash instanceof Uint8Array) || pathHash.length !== 16) {
      log(
        "Link",
        `Dropping Resource REQUEST with bad path_hash`,
        LogLevel.WARNING
      );
      return;
    }
    await this._dispatchRequest(
      pathHash,
      data,
      /** @type {Uint8Array} */
      resource.requestId,
      requestTime
    );
  }
  /**
   * Shared REQUEST dispatch: handler lookup, authorization, generator
   * invocation, and RESPONSE send. Used by both the single-packet and
   * Resource-backed REQUEST paths.
   * @param {Uint8Array} pathHash
   * @param {any} data
   * @param {Uint8Array} requestId
   * @param {number} requestTime
   * @returns {Promise<void>}
   * @private
   */
  async _dispatchRequest(pathHash, data, requestId, requestTime) {
    const handler = this.destination?.requestHandlers?.get(toHex(pathHash));
    if (!handler) {
      log(
        "Link",
        `No handler for REQUEST path hash ${toHex(pathHash)}`,
        LogLevel.DEBUG
      );
      return;
    }
    if (!this._authorizeRequest(handler)) {
      log(
        "Link",
        `Rejecting REQUEST to ${handler.path} (allow mode ${handler.allow})`,
        LogLevel.DEBUG
      );
      return;
    }
    let response;
    try {
      response = await handler.responseGenerator(
        handler.path,
        data,
        requestId,
        this.remoteIdentity ?? null,
        requestTime
      );
    } catch (err) {
      log(
        "Link",
        `REQUEST handler for ${handler.path} threw: ${err}`,
        LogLevel.ERROR
      );
      return;
    }
    if (response === null || response === void 0) return;
    if (response instanceof ResourceResponse && response.metadata !== void 0) {
      const resource = new Resource({
        data: response.data,
        metadata: response.metadata,
        link: this,
        isResponse: true,
        requestId,
        bz2: this.bz2,
        autoCompress: handler.autoCompress
      });
      await resource.advertise();
      return;
    }
    const value = response instanceof ResourceResponse ? response.data : response;
    await this._sendResponse(value, requestId, handler.autoCompress);
  }
  /**
   * Sends a RESPONSE packet (§11.2). Single-packet form only for now; oversized
   * responses require the §10 Resource path (advertisement flag `p`,
   * `is_response = True`).
   * @param {any} response
   * @param {Uint8Array} requestId
   * @param {boolean} autoCompress
   * @private
   */
  async _sendResponse(response, requestId, autoCompress) {
    const packed = MicroMsgPack.encode([requestId, response]);
    if (packed.length > this.mdu) {
      const resource = new Resource({
        data: packed,
        link: this,
        isResponse: true,
        requestId,
        bz2: this.bz2,
        autoCompress
      });
      await resource.advertise();
      return;
    }
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.LINK,
      destinationHash: this.linkId,
      contextByte: ContextType.RESPONSE,
      payload: packed
    });
    await this.send(packet);
  }
  /**
   * Initiator: correlate an inbound RESPONSE with a pending REQUEST (§11.2).
   *
   * Decodes the msgpack `[request_id, response]` envelope, verifies element [0]
   * matches a tracked outbound REQUEST, and resolves that request's Promise.
   * Mismatched / spurious responses are dropped — the security note in §11.2
   * makes the id check mandatory.
   * @param {Packet} decrypted
   * @private
   */
  async _handleResponse(decrypted) {
    let decoded;
    try {
      decoded = MicroMsgPack.decode(
        /** @type {Uint8Array} */
        decrypted.payload
      );
    } catch (err) {
      log("Link", `Dropping malformed RESPONSE: ${err}`, LogLevel.WARNING);
      return;
    }
    if (!Array.isArray(decoded) || decoded.length < 2) {
      log(
        "Link",
        `Dropping RESPONSE with bad envelope shape`,
        LogLevel.WARNING
      );
      return;
    }
    const [requestId, response] = decoded;
    if (!(requestId instanceof Uint8Array) || requestId.length !== 16) {
      log("Link", `Dropping RESPONSE with bad request_id`, LogLevel.WARNING);
      return;
    }
    await this._resolveResponse(requestId, response);
  }
  /**
   * Initiator: a §11.2 RESPONSE whose body arrived via a §10 Resource
   * transfer.
   *
   * Two response shapes exist on the wire:
   *
   * 1. Envelope form: the assembled `resource.data` is the msgpack envelope
   *    `[request_id, response]`. Used by oversized non-file responses on
   *    both sides.
   * 2. File-with-metadata form (§10.4 `x` flag): the raw payload bytes ride
   *    `resource.data` with no envelope, the request id travels in the
   *    advertisement `q` field, and the decoded metadata is attached to the
   *    Resource. rngit's `/git/fetch` bundle responses use this shape.
   *
   * @param {import("../core/resource.js").Resource} resource
   * @returns {Promise<void>}
   * @private
   */
  async _handleResourceResponse(resource) {
    if (resource.hasMetadata) {
      const requestId2 = (
        /** @type {Uint8Array} */
        resource.requestId
      );
      if (!requestId2 || requestId2.length !== 16) {
        log(
          "Link",
          "Dropping metadata RESPONSE without request_id",
          LogLevel.WARNING
        );
        return;
      }
      const entry = this.pendingRequests.get(toHex(requestId2));
      if (!entry) {
        log(
          "Link",
          `RESPONSE for unknown REQUEST ${toHex(requestId2)}; dropping`,
          LogLevel.DEBUG
        );
        return;
      }
      clearTimeout(entry.timer);
      this.pendingRequests.delete(toHex(requestId2));
      if (entry.onMetadata) entry.onMetadata(resource.metadata);
      entry.resolve(resource.data);
      return;
    }
    let decoded;
    try {
      decoded = MicroMsgPack.decode(
        /** @type {Uint8Array} */
        resource.data
      );
    } catch (err) {
      log(
        "Link",
        `Dropping malformed Resource RESPONSE: ${err}`,
        LogLevel.WARNING
      );
      return;
    }
    if (!Array.isArray(decoded) || decoded.length < 2) {
      log(
        "Link",
        `Dropping Resource RESPONSE with bad envelope shape`,
        LogLevel.WARNING
      );
      return;
    }
    const [requestId, response] = decoded;
    if (!(requestId instanceof Uint8Array) || requestId.length !== 16) {
      log(
        "Link",
        `Dropping Resource RESPONSE with bad request_id`,
        LogLevel.WARNING
      );
      return;
    }
    await this._resolveResponse(requestId, response);
  }
  /**
   * Resolves a pending REQUEST with a decoded RESPONSE value, enforcing the
   * §11.2 request_id match. Unknown / spurious responses are dropped.
   * @param {Uint8Array} requestId
   * @param {any} response
   * @returns {Promise<void>}
   * @private
   */
  async _resolveResponse(requestId, response) {
    const entry = this.pendingRequests.get(toHex(requestId));
    if (!entry) {
      log(
        "Link",
        `RESPONSE for unknown REQUEST ${toHex(requestId)}; dropping`,
        LogLevel.DEBUG
      );
      return;
    }
    clearTimeout(entry.timer);
    this.pendingRequests.delete(toHex(requestId));
    entry.resolve(response);
  }
  /**
   * Enforces a handler's `allow` mode against the link's remote identity (§11.4).
   *
   * Uses the raw `Allow` enum values from `Destination` (0x00/0x01/0x02) rather
   * than importing the enum, to avoid a link.js ↔ destination.js import cycle.
   *
   * @param {{allow: number, allowedList: Uint8Array[]}} handler
   * @returns {boolean}
   * @private
   */
  _authorizeRequest(handler) {
    const ALLOW_ALL = 1;
    const ALLOW_LIST = 2;
    if (handler.allow === ALLOW_ALL) return true;
    if (handler.allow === ALLOW_LIST) {
      const remoteHash = this.remoteIdentity?.identityHash;
      if (!remoteHash) return false;
      return handler.allowedList.some(
        (h) => h.length === remoteHash.length && bytesEqual(h, remoteHash)
      );
    }
    return false;
  }
  /**
   * Rejects every pending REQUEST with `reason`. Called from the CLOSED status
   * transition so callers awaiting `link.request()` don't hang.
   * @param {string} reason
   * @private
   */
  _rejectPendingRequests(reason) {
    for (const [id, entry] of this.pendingRequests) {
      clearTimeout(entry.timer);
      this.pendingRequests.delete(id);
      entry.reject(new Error(reason));
    }
  }
  // -----------------------------------------------------------------------
  // Resources ( PROTOCOL-SPEC.md §10 )
  // -----------------------------------------------------------------------
  /**
   * Registers an outgoing Resource (sender side) keyed by hex(resource.hash).
   * @param {import("../core/resource.js").Resource} resource
   * @internal
   */
  _registerOutgoingResource(resource) {
    if (resource.hash) {
      this.outgoingResources.set(toHex(resource.hash), resource);
    }
  }
  /**
   * Removes an outgoing Resource registration (e.g. a split resource
   * advancing to its next segment, keyed by the previous segment's hash).
   * @param {Uint8Array} hash
   * @internal
   */
  _unregisterOutgoingResource(hash) {
    this.outgoingResources.delete(toHex(hash));
  }
  /**
   * Removes an incoming Resource registration.
   * @param {Uint8Array} hash
   * @internal
   */
  _unregisterIncomingResource(hash) {
    this.incomingResources.delete(toHex(hash));
  }
  /**
   * Registers an incoming Resource (receiver side) keyed by hex(resource.hash).
   * @param {import("../core/resource.js").Resource} resource
   * @internal
   */
  _registerIncomingResource(resource) {
    if (resource.hash) {
      this.incomingResources.set(toHex(resource.hash), resource);
    }
  }
  /**
   * Routes a completed (or split-assembled) Resource to the §11 machinery or
   * the generic `resource` event, depending on its flags.
   *
   * @param {import("../core/resource.js").Resource} resource
   * @param {import("../core/packet.js").Packet} packet - The advertisement
   *   packet (or final-segment advertisement) that initiated the transfer.
   * @private
   */
  _routeAssembledResource(resource, packet) {
    if (resource.isRequest) {
      resource.whenComplete().then(() => this._handleResourceRequest(resource)).catch(
        (err) => log(
          "Link",
          `Incoming REQUEST resource failed: ${err}`,
          LogLevel.ERROR
        )
      );
    } else if (resource.isResponse) {
      resource.whenComplete().then(() => this._handleResourceResponse(resource)).catch(
        (err) => log(
          "Link",
          `Incoming RESPONSE resource failed: ${err}`,
          LogLevel.ERROR
        )
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("resource", {
          detail: { packet, resource }
        })
      );
    }
  }
  /**
   * Feeds a completed segment of a split Resource into its assembler. When
   * the final segment completes, the reassembled synthetic Resource is
   * routed like a single-segment one; a failed segment fails the whole
   * transfer and rejects any pending REQUEST awaiting it.
   *
   * @param {import("../core/resource.js").Resource} segment
   * @param {import("../core/packet.js").Packet} packet
   * @returns {Promise<void>}
   * @private
   */
  async _trackSplitSegment(segment, packet) {
    const key = toHex(
      /** @type {Uint8Array} */
      segment.originalHash
    );
    if (this.failedSplitResources.has(key)) {
      await Resource._sendReject(
        this,
        /** @type {Uint8Array} */
        segment.hash
      );
      return;
    }
    let assembler = this.splitResources.get(key);
    if (!assembler) {
      assembler = new SplitResourceAssembler(segment);
      this.splitResources.set(key, assembler);
    }
    segment.whenComplete().then((seg) => {
      const assembled = assembler.add(seg);
      if (!assembled) return;
      this.splitResources.delete(key);
      this._routeAssembledResource(assembled, packet);
    }).catch((err) => {
      this.splitResources.delete(key);
      this.failedSplitResources.add(key);
      log("Link", `Split resource ${key} failed: ${err}`, LogLevel.ERROR);
      if (segment.requestId) {
        const entry = this.pendingRequests.get(toHex(segment.requestId));
        if (entry) {
          clearTimeout(entry.timer);
          this.pendingRequests.delete(toHex(segment.requestId));
          entry.reject(err);
        }
      }
    });
  }
  /**
   * Routes an inbound RESOURCE part to the incoming resource whose hashmap
   * claims it (§10.6). Parts carry no resource id, so matching is by map_hash.
   * @param {Uint8Array} chunk
   * @returns {Promise<void>}
   * @private
   */
  async _routeResourcePart(chunk) {
    for (const resource of this.incomingResources.values()) {
      const placed = await resource.receivePart(chunk);
      if (placed) return;
    }
    log(
      "Link",
      "RESOURCE part matched no incoming resource; dropping",
      LogLevel.DEBUG
    );
  }
  /**
   * Extracts the 32-byte resource_hash from a RESOURCE_REQ body for routing.
   * Body shape (§10.5): `exhausted(1) ‖ [last_map_hash(4) if exhausted] ‖ resource_hash(32) ‖ …`.
   * @param {Uint8Array} body
   * @returns {Uint8Array}
   * @private
   */
  static _resourceHashFromRequest(body) {
    const offset = body[0] === 255 ? 5 : 1;
    return body.subarray(offset, offset + 32);
  }
  // -----------------------------------------------------------------------
  // Inbound dispatch
  // -----------------------------------------------------------------------
  /**
   * Queues and processes an inbound packet addressed to this link.
   * @param {Packet} packet
   */
  async receive(packet) {
    this._rxQueue = this._rxQueue.then(() => this._processPacket(packet)).catch((err) => {
      log("Link", `Error processing packet: ${err}`, LogLevel.ERROR);
    });
    await this._rxQueue;
  }
  /**
   * Handles a single inbound packet after handshake completion: verifies
   * proofs, decrypts Token-encrypted packets, and dispatches by context.
   * @param {Packet} packet
   * @private
   */
  async _processPacket(packet) {
    log(
      "Link",
      `Processing ${getEnumName(PacketType, packet.packetType)} packet (ctx ${getEnumName(ContextType, packet.contextByte)}) for link ${toHex(this.linkId)}`,
      LogLevel.DEBUG
    );
    this.lastInboundTime = Date.now();
    if (packet.packetType === PacketType.PROOF && packet.contextByte === ContextType.LRPROOF) {
      if (this.initiator) await this._handleLRPROOF(packet);
      return;
    }
    const unencrypted = isLinkPacketUnencrypted(
      packet.packetType,
      packet.contextByte
    );
    let payload = packet.payload;
    if (!unencrypted) {
      if (!this.token) {
        throw new Error("Encrypted link packet received before handshake.");
      }
      payload = await this.token.decrypt(
        /** @type {Uint8Array} */
        packet.payload
      );
    }
    const decrypted = new Packet({
      headerType: packet.headerType,
      hops: packet.hops,
      transportType: packet.transportType,
      destinationType: packet.destinationType,
      packetType: packet.packetType,
      contextFlag: packet.contextFlag,
      destinationHash: packet.destinationHash,
      contextByte: packet.contextByte,
      payload,
      transportId: packet.transportId,
      raw: packet.raw
    });
    switch (decrypted.contextByte) {
      case ContextType.NONE:
        if (decrypted.packetType === PacketType.DATA) {
          if (this.transport) await this._provePacket(packet);
          this.dispatchEvent(
            new CustomEvent("data", {
              detail: { packet: decrypted, link: this.linkId }
            })
          );
        } else if (decrypted.packetType === PacketType.PROOF) {
          await this._handleLinkProof(decrypted);
        }
        break;
      case ContextType.RESOURCE_REQ: {
        const reqHash = _Link._resourceHashFromRequest(decrypted.payload);
        const outgoing = this.outgoingResources.get(toHex(reqHash));
        if (outgoing) {
          await outgoing.handleRequest(decrypted.payload);
        } else {
          log(
            "Link",
            "RESOURCE_REQ for unknown resource; dropping",
            LogLevel.DEBUG
          );
        }
        break;
      }
      case ContextType.RESOURCE:
        await this._routeResourcePart(decrypted.payload);
        break;
      case ContextType.RESOURCE_ADV: {
        const incoming = await Resource.accept(this, decrypted, {
          bz2: this.bz2,
          maxSize: this.maxResourceSize
        });
        if (!incoming) break;
        if (incoming.isResponse && incoming.requestId) {
          const entry = this.pendingRequests.get(toHex(incoming.requestId));
          if (entry?.onProgress) {
            incoming.addEventListener("progress", (e) => {
              const { received, total } = e.detail;
              const size = incoming.uncompressedSize;
              entry.onProgress?.({
                direction: "response",
                loaded: total ? Math.round(received / total * size) : 0,
                total: size,
                segmentIndex: incoming.segmentIndex,
                segmentTotal: incoming.totalSegments
              });
            });
          }
        }
        if (incoming.totalSegments > 1) {
          await this._trackSplitSegment(incoming, decrypted);
        } else {
          this._routeAssembledResource(incoming, decrypted);
        }
        await incoming.requestNext();
        break;
      }
      case ContextType.RESOURCE_HMU: {
        const hmuHash = decrypted.payload.subarray(0, 32);
        const incomingHmu = this.incomingResources.get(toHex(hmuHash));
        if (incomingHmu) await incomingHmu.hashmapUpdate(decrypted.payload);
        break;
      }
      case ContextType.RESOURCE_PRF: {
        const prfHash = decrypted.payload.subarray(0, 32);
        const outgoingPrf = this.outgoingResources.get(toHex(prfHash));
        if (outgoingPrf) {
          await outgoingPrf.validateProof(decrypted.payload);
        }
        break;
      }
      case ContextType.RESOURCE_ICL: {
        const iclHash = decrypted.payload.subarray(0, 32);
        const incomingIcl = this.incomingResources.get(toHex(iclHash));
        if (incomingIcl) await incomingIcl.handleIncomingCancel();
        break;
      }
      case ContextType.RESOURCE_RCL: {
        const rclHash = decrypted.payload.subarray(0, 32);
        const outgoingRcl = this.outgoingResources.get(toHex(rclHash));
        if (outgoingRcl) await outgoingRcl.handleRejection();
        break;
      }
      case ContextType.KEEPALIVE:
        if (!this.initiator && decrypted.payload.length === 1 && decrypted.payload[0] === 255) {
          await this._sendKeepalive(false);
        }
        this.dispatchEvent(
          new CustomEvent("keepalive", { detail: { packet: decrypted } })
        );
        break;
      case ContextType.LRRTT:
        if (!this.initiator) await this._handleLRRTT(decrypted);
        break;
      case ContextType.REQUEST:
        await this._handleRequest(packet, decrypted);
        break;
      case ContextType.RESPONSE:
        await this._handleResponse(decrypted);
        break;
      case ContextType.LINKCLOSE:
        await this._handleLinkClose(decrypted);
        break;
      case ContextType.LINKIDENTIFY:
        await this._handleIdentify(decrypted);
        break;
      case ContextType.CHANNEL: {
        if (this.transport) await this._provePacket(packet);
        this.getChannel()._receive(decrypted.payload);
        break;
      }
      default:
        log(
          "Link",
          `Ignored packet with unknown context: 0x${decrypted.contextByte.toString(16)}`,
          LogLevel.WARNING
        );
    }
  }
  // -----------------------------------------------------------------------
  // Watchdog (LINKS.md §6.7)
  // -----------------------------------------------------------------------
  /**
   * Starts the 1-second watchdog timer that monitors link liveness.
   * @private
   */
  _startWatchdog() {
    if (this._watchdogTimer) return;
    this._watchdogTimer = setInterval(() => this._watchdogJob(), 1e3);
  }
  /**
   * Stops the watchdog timer.
   * @private
   */
  _stopWatchdog() {
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }
  }
  /**
   * Periodic watchdog tick: tears down stale links and sends initiator keepalives.
   * @private
   */
  _watchdogJob() {
    log("Link", `Watchdog tick for ${toHex(this.linkId)}`, LogLevel.EXTREME);
    const now = Date.now();
    if (now >= this.lastInboundTime + this.staleTime * 1e3) {
      this._sendLinkClose().catch(
        (e) => log("Link", `Stale teardown send failed: ${e}`, LogLevel.ERROR)
      );
      this.teardownReason = LinkTeardownReason.TIMEOUT;
      this.status = LinkStatus.CLOSED;
      this.dispatchEvent(
        new CustomEvent("close", { detail: { link: this.linkId } })
      );
      return;
    }
    if (this.initiator && now >= this.lastInboundTime + this.keepaliveInterval * 1e3 && now >= this.lastKeepaliveTime + this.keepaliveInterval * 1e3) {
      this.lastKeepaliveTime = now;
      this._sendKeepalive(true).catch(
        (e) => log("Link", `Keepalive failed: ${e}`, LogLevel.ERROR)
      );
    }
  }
  /**
   * Recomputes the keepalive and stale intervals from the measured RTT.
   * @private
   */
  _updateKeepalive() {
    const interval = this.rtt * (_Link.KEEPALIVE_MAX_SECS / _Link.KEEPALIVE_MAX_RTT_SECS);
    this.keepaliveInterval = Math.max(
      Math.min(interval, _Link.KEEPALIVE_MAX_SECS),
      _Link.KEEPALIVE_MIN_SECS
    );
    this.staleTime = this.keepaliveInterval * _Link.STALE_FACTOR;
  }
};

// node_modules/@reticulum/core/src/core/destination.js
var Direction = {
  IN: 0,
  OUT: 1
};
var Allow = {
  /** Reject every request (handler is a stub for testing). */
  NONE: 0,
  /** Accept any request that arrives on this Link, regardless of caller. */
  ALL: 1,
  /** Accept iff the requester has identified AND their identity_hash is in `allowedList`. */
  LIST: 2
};
function createAnnounceRandomHash(randomBytes, timestampSec) {
  if (!Number.isInteger(timestampSec) || timestampSec < 0) {
    throw new RangeError(
      `announce timestamp must be a non-negative integer, got ${timestampSec}`
    );
  }
  if (timestampSec > 1099511627775) {
    throw new RangeError(
      `announce timestamp ${timestampSec} does not fit in a uint40`
    );
  }
  const out = new Uint8Array(10);
  out.set(randomBytes.subarray(0, 5), 0);
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, BigInt(timestampSec), false);
  out.set(new Uint8Array(buffer).subarray(3), 5);
  return out;
}
function appDataEquals(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return bytesEqual(a, b);
}
var Destination = class _Destination extends EventTarget {
  /**
   * Default ratchet rotation interval (Destination.RATCHET_INTERVAL = 30 min).
   * A destination with ratchets enabled rotates its key at most this often.
   */
  static RATCHET_INTERVAL_MS = 30 * 60 * 1e3;
  /** Maximum number of retained ratchet keys for decryption tolerance. */
  static MAX_RATCHETS = 512;
  /**
   * How long a learned peer ratchet stays valid, in milliseconds (default 30
   * days). Mirrors `RNS.Identity.RATCHET_EXPIRY`. Past this a peer ratchet is
   * dropped and the long-term key is used until a fresh announce arrives.
   */
  static RATCHET_EXPIRY_MS = 30 * 24 * 60 * 60 * 1e3;
  /**
   * Default periodic re-announce interval. There is no protocol-mandated
   * default for application destinations — the reference implementations'
   * transport-internal management announce cadences (2 h) and
   * interface-discovery cadences (6 h) are not what end-user destinations
   * announce at.
   * PROTOCOL-SPEC.md §9.7 recommends 30–60 min for a desktop client and notes
   * Sideband emits roughly every 30 min; 30 min keeps cached mesh paths fresh
   * against transit-relay TTLs without dominating airtime.
   */
  static DEFAULT_ANNOUNCE_INTERVAL_MS = 30 * 60 * 1e3;
  /**
   * Floor below which a requested interval is clamped. PROTOCOL-SPEC.md §9.7:
   * "AVOID < 60 s — short intervals trigger ingress rate limiting (§4.5 step
   * 8) and burn ratchet-ring slots without benefit". Sub-minute intervals are
   * clamped to this value with a warning rather than rejected outright.
   */
  static MIN_ANNOUNCE_INTERVAL_MS = 60 * 1e3;
  /**
   * Low-level constructor. Prefer the static factories (`Destination.IN`,
   * `Destination.OUT`, etc.) which also compute the destination hashes.
   * @param {string} name - The application name.
   * @param {Direction} direction - The direction of this destination.
   * @param {DestType} type - The type of this destination.
   * @param {Identity|null} identity - The identity associated with this destination.
   * @param {import("../core/reticulum.js").Reticulum|null} interfaceLayer - An object that manages destinations and dispatches link requests.
   */
  constructor(name, direction, type, identity = null, interfaceLayer = null) {
    super();
    this.name = name;
    this.direction = direction;
    this.type = type;
    this.identity = identity;
    this.interfaceLayer = interfaceLayer;
    this.destinationHash = null;
    this.nameHash = null;
    this.requestHandlers = /* @__PURE__ */ new Map();
    this.appData = null;
    this.ratchetsEnabled = false;
    this.ratchets = null;
    this.latestRatchetTime = 0;
    this.ratchetInterval = _Destination.RATCHET_INTERVAL_MS;
    this._announceTimer = null;
    this._announceIntervalMs = _Destination.DEFAULT_ANNOUNCE_INTERVAL_MS;
    this._announceGeneration = 0;
    this.pathResponses = /* @__PURE__ */ new Map();
  }
  /**
   * @type {Uint8Array|null}
   */
  destinationHash;
  /**
   * @type {Uint8Array|null}
   */
  nameHash;
  /**
   * Seconds a path-response announce payload stays reusable for retransmitted
   * `path?` requests with the same tag.
   * @type {number}
   */
  static PR_TAG_WINDOW_SECS = 30;
  /**
   * Broadcasts an Announce packet advertising this destination's public key,
   * name hash and signed metadata so peers can learn and remember it.
   *
   * Emits with `context = NONE` (a regular periodic announce). Use
   * {@link announcePathResponse} to answer a `path?` request.
   *
   * @fires Destination#announced
   */
  async announce() {
    await this._emitAnnounce(ContextType.NONE);
  }
  /**
   * Broadcasts a **path-response** announce — identical body to a regular
   * announce (§4.1) but with the outer packet's context byte set to
   * `PATH_RESPONSE = 0x0B` (§7.2.4). Emitted in answer to an inbound `path?`
   * request so the requester can learn a route back to us. The announce body
   * validates identically under §4.5; only the context byte distinguishes it.
   *
   * When called with the requesting PR's `tag`, the signed announce payload
   * is cached for {@link PR_TAG_WINDOW_SECS} seconds and retransmissions with the
   * same tag reuse it — a path-response cache keeps PR floods from forcing a
   * fresh signature (and ratchet rotation) per retransmitted request.
   *
   * @param {Uint8Array|null} [tag] The `path?` request tag that triggered
   *   this response, when known.
   * @fires Destination#announced
   */
  async announcePathResponse(tag = null) {
    await this._emitAnnounce(ContextType.PATH_RESPONSE, void 0, tag);
  }
  /**
   * Whether the periodic re-announce loop is currently running.
   * @returns {boolean}
   */
  isAnnouncing() {
    return this._announceTimer !== null;
  }
  /**
   * The active re-announce interval in milliseconds. This is the default
   * ({@link DEFAULT_ANNOUNCE_INTERVAL_MS}) until {@link startAnnouncing} is
   * called with an explicit `intervalMs`, after which it reflects the
   * (clamped) requested value.
   * @returns {number}
   */
  get announceIntervalMs() {
    return this._announceIntervalMs;
  }
  /**
   * Starts periodically re-announcing this destination so cached mesh paths
   * stay fresh (PROTOCOL-SPEC.md §7.5 / §9.7 — "non-optional": without it,
   * transit relays evict the path within minutes and peers can no longer
   * reach you).
   *
   * The first announce fires immediately (so the destination becomes
   * reachable as soon as the loop starts), then repeats every `intervalMs`.
   * Each tick emits an announce (context NONE); a failed tick is logged and
   * does not stop the loop. An announce whose cadence is superseded while it
   * is mid-flight (restart/stop) is dropped before broadcasting, so updating
   * the cadence never emits a straggler.
   *
   * Calling this while the loop is already running updates the cadence: the
   * existing timer is cleared and a new one armed at the (possibly new)
   * interval, without emitting an extra immediate announce.
   *
   * `intervalMs` defaults to {@link DEFAULT_ANNOUNCE_INTERVAL_MS} and is
   * clamped to {@link MIN_ANNOUNCE_INTERVAL_MS} (sub-minute intervals trigger
   * ingress rate limiting and waste airtime — §9.7).
   *
   * @param {Object} [options]
   * @param {number} [options.intervalMs] Cadence in ms (clamped to the floor).
   * @returns {void}
   * @fires Destination#announced
   */
  startAnnouncing(options = {}) {
    if (!this.identity) {
      throw new Error("Destination requires an identity to announce.");
    }
    if (!this.interfaceLayer) {
      throw new Error("Destination not bound to an RNS instance.");
    }
    const requested = options.intervalMs ?? this._announceIntervalMs;
    if (requested < _Destination.MIN_ANNOUNCE_INTERVAL_MS) {
      log(
        "Destination",
        `Requested announce interval ${requested}ms is below the ${_Destination.MIN_ANNOUNCE_INTERVAL_MS}ms floor (\xA79.7); clamping`,
        LogLevel.WARNING
      );
    }
    this._announceIntervalMs = Math.max(
      requested,
      _Destination.MIN_ANNOUNCE_INTERVAL_MS
    );
    const wasRunning = this._announceTimer !== null;
    if (this._announceTimer) {
      clearInterval(this._announceTimer);
      this._announceTimer = null;
    }
    this._announceGeneration++;
    if (!wasRunning) {
      this._scheduledAnnounce();
    }
    this._announceTimer = setInterval(
      () => this._scheduledAnnounce(),
      this._announceIntervalMs
    );
    log(
      "Destination",
      `Periodic re-announce every ${this._announceIntervalMs}ms`,
      LogLevel.NOTICE
    );
  }
  /**
   * Stops the periodic re-announce loop started by {@link startAnnouncing}.
   * Safe to call when not running (no-op).
   */
  stopAnnouncing() {
    if (this._announceTimer) {
      clearInterval(this._announceTimer);
      this._announceTimer = null;
      this._announceGeneration++;
      log("Destination", "Periodic re-announce stopped", LogLevel.NOTICE);
    }
  }
  /**
   * One periodic-announce tick. Errors are caught and logged so a transient
   * failure (e.g. no interface attached yet) doesn't tear down the loop.
   * @private
   */
  async _scheduledAnnounce() {
    const generation = this._announceGeneration;
    try {
      await this._emitAnnounce(ContextType.NONE, generation);
    } catch (e) {
      log("Destination", `Scheduled announce failed: ${e}`, LogLevel.ERROR);
    }
  }
  /**
   * Builds and broadcasts an announce packet with the given context byte.
   * Shared by {@link announce} (NONE) and {@link announcePathResponse}
   * (PATH_RESPONSE).
   *
   * The periodic loop passes the generation token active when its tick fired;
   * if the cadence has since been restarted or stopped, the in-flight announce
   * aborts right before broadcasting so restart/stop never emit a straggler.
   * Direct ({@link announce} / {@link announcePathResponse}) callers omit it
   * and always emit.
   *
   * A tagged PATH_RESPONSE consults the {@link pathResponses} cache first and
   * reuses the cached payload when the tag was answered within
   * {@link Destination.PR_TAG_WINDOW_SECS} seconds — the defence against PR floods
   * forcing a fresh signature (and ratchet rotation) per retransmission.
   * Generation from scratch otherwise, and a
   * fresh tagged response is cached.
   *
   * @param {number} contextByte
   * @param {number} [generation] Generation token (periodic path only).
   * @param {Uint8Array|null} [tag] The `path?` request tag for PATH_RESPONSE.
   * @private
   */
  async _emitAnnounce(contextByte, generation, tag = null) {
    if (!this.interfaceLayer)
      throw new Error("Destination not bound to an RNS instance.");
    if (!this.identity) {
      throw new Error("Destination requires an identity to announce.");
    }
    if (!this.destinationHash || !this.nameHash) {
      throw new Error("Destination hashes not computed.");
    }
    const tagKey = contextByte === ContextType.PATH_RESPONSE && tag ? toHex(tag) : null;
    let payload = null;
    let hasRatchet = false;
    if (tagKey) {
      this._prunePathResponses();
      const cached = this.pathResponses.get(tagKey);
      if (cached) {
        payload = cached.announceData;
        hasRatchet = cached.hasRatchet;
        log(
          "Destination",
          "Using cached announce data for answering path request",
          LogLevel.DEBUG
        );
      }
    }
    if (!payload) {
      if (this.nameHash.length !== 10) {
        throw new Error("nameHash must be 10 bytes");
      }
      const randomHash = createAnnounceRandomHash(
        Identity.getRandomHash(),
        Math.floor(Date.now() / 1e3)
      );
      const pubKey = await this.identity.getPublicKey();
      const appData = this.appData ?? this.identity.appData;
      const ratchetBytes = await this._currentRatchetForAnnounce();
      hasRatchet = ratchetBytes.length > 0;
      const signedData = new Uint8Array(
        16 + 64 + 10 + 10 + ratchetBytes.length + appData.length
      );
      signedData.set(this.destinationHash, 0);
      signedData.set(pubKey, 16);
      signedData.set(this.nameHash, 16 + 64);
      signedData.set(randomHash, 16 + 64 + 10);
      signedData.set(ratchetBytes, 16 + 64 + 10 + 10);
      signedData.set(appData, 16 + 64 + 10 + 10 + ratchetBytes.length);
      const signature = await this.identity.sign(signedData);
      payload = new Uint8Array(
        64 + 10 + 10 + ratchetBytes.length + 64 + appData.length
      );
      payload.set(pubKey, 0);
      payload.set(this.nameHash, 64);
      payload.set(randomHash, 64 + 10);
      payload.set(ratchetBytes, 64 + 10 + 10);
      payload.set(signature, 64 + 10 + 10 + ratchetBytes.length);
      payload.set(appData, 64 + 10 + 10 + ratchetBytes.length + 64);
      if (tagKey) {
        this.pathResponses.set(tagKey, {
          time: Date.now() / 1e3,
          announceData: payload,
          hasRatchet
        });
      }
    }
    if (payload.length < 148) {
      throw new Error(
        `Announce payload too small (${payload.length} bytes); check the body construction`
      );
    }
    const announcePacket = new Packet({
      packetType: PacketType.ANNOUNCE,
      destinationType: this.type,
      destinationHash: this.destinationHash,
      transportType: TransportType.BROADCAST,
      contextFlag: hasRatchet,
      contextByte,
      payload: (
        /** @type {Uint8Array} */
        payload
      )
    });
    if (generation !== void 0 && generation !== this._announceGeneration) {
      log(
        "Destination",
        "Dropping stale in-flight announce (cadence restarted/stopped)",
        LogLevel.DEBUG
      );
      return;
    }
    this.interfaceLayer.broadcast(announcePacket);
    this.dispatchEvent(
      new CustomEvent("announced", {
        detail: { destinationHash: this.destinationHash, contextByte }
      })
    );
  }
  /**
   * Drops {@link pathResponses} entries older than
   * {@link Destination.PR_TAG_WINDOW_SECS} seconds (a stale-entry sweep).
   * @private
   */
  _prunePathResponses() {
    const now = Date.now() / 1e3;
    for (const [key, entry] of this.pathResponses) {
      if (now > entry.time + _Destination.PR_TAG_WINDOW_SECS) {
        this.pathResponses.delete(key);
      }
    }
  }
  /**
   * Enables forward-secrecy ratchets on this destination (§7.4).
   *
   * The owned ratchet private-key ring is persisted (signed by this
   * destination's identity) so a restart can still decrypt messages encrypted
   * to prior ratchets. On the first run (no persisted ring) an initial key is
   * generated immediately; otherwise the persisted ring is loaded and a fresh
   * key is rotated on the next announce. Inbound packets are decrypted
   * against the private ring before the long-term key.
   *
   * @returns {Promise<void>}
   */
  async enableRatchets() {
    if (this.ratchetsEnabled) return;
    if (!this.identity) {
      throw new Error("Ratchets require an identity.");
    }
    this.ratchets = [];
    this.ratchetsEnabled = true;
    const restored = await this._loadOwnedRatchets();
    if (!restored || this.ratchets.length === 0) {
      await this.rotateRatchets(true);
    }
  }
  /**
   * Rotates the ratchet ring when the interval has elapsed
   * (Destination.RATCHET_INTERVAL), inserting the newest key at index 0 and
   * capping the ring to {@link Destination.MAX_RATCHETS}. Pass `force` to
   * generate a key unconditionally (used for the initial key). The rotated
   * ring is persisted (signed by the identity) so a restart retains the
   * private keys.
   *
   * No-op when ratchets are not enabled.
   *
   * @param {boolean} [force=false]
   * @returns {Promise<void>}
   */
  async rotateRatchets(force = false) {
    if (!this.ratchetsEnabled || !this.ratchets) return;
    const now = Date.now();
    if (!force && now <= this.latestRatchetTime + this.ratchetInterval) {
      return;
    }
    const kp = await generateX25519KeyPair();
    this.ratchets.unshift({
      privateKey: await exportRawPrivateKey(kp.privateKey),
      publicKey: await exportPublicKey(kp.publicKey)
    });
    while (this.ratchets.length > _Destination.MAX_RATCHETS) {
      this.ratchets.pop();
    }
    this.latestRatchetTime = now;
    await this._persistOwnedRatchets();
  }
  /**
   * The current (newest) ratchet public key for inclusion in announces, or an
   * empty array when ratchets are disabled. Rotates first if due.
   *
   * @returns {Promise<Uint8Array>}
   * @private
   */
  async _currentRatchetForAnnounce() {
    if (!this.ratchetsEnabled || !this.ratchets || this.ratchets.length === 0) {
      return new Uint8Array(0);
    }
    await this.rotateRatchets();
    return this.ratchets[0].publicKey.slice();
  }
  /**
   * The backing storage adapter when one is bound (via the Reticulum interface
   * layer), else null — ratchets then run memory-only (no restart tolerance).
   *
   * @returns {import("../storage/storage.js").StorageAdapter|null}
   * @private
   */
  _ratchetStorage() {
    return this.interfaceLayer?.storage ?? null;
  }
  /**
   * Encodes the owned ratchet ring into the persisted (signed) blob, mirroring
   * `RNS.Destination._persist_ratchets`: the signature is computed over the
   * msgpack-packed ring, then both are wrapped in a second msgpack map.
   *
   * Layout: `msgpack({ signature: Ed25519_sign(packedRing), ratchets: packedRing })`
   * where `packedRing = msgpack([[priv32, pub32], ...])`.
   *
   * @returns {Promise<Uint8Array>}
   * @private
   */
  async _encodeOwnedRatchets() {
    const identity = this.identity;
    const ratchets = this.ratchets;
    if (!identity) {
      throw new Error("Cannot encode ratchets without an identity.");
    }
    if (!ratchets) {
      throw new Error("Cannot encode ratchets: no ring initialized.");
    }
    const packedRing = MicroMsgPack.encode(
      ratchets.map((r) => [r.privateKey, r.publicKey])
    );
    const signature = await identity.sign(packedRing);
    return MicroMsgPack.encode({ signature, ratchets: packedRing });
  }
  /**
   * Loads and validates the persisted owned ratchet ring for this destination.
   * On success hydrates `this.ratchets` (newest first) and returns true; on any
   * failure (absent / corrupt / bad signature) leaves `this.ratchets` untouched
   * and returns false.
   *
   * @returns {Promise<boolean>}
   * @private
   */
  async _loadOwnedRatchets() {
    const adapter = this._ratchetStorage();
    const identity = this.identity;
    if (!adapter || !this.destinationHash || !identity) return false;
    let bytes;
    try {
      bytes = await adapter.loadOwnedRatchets(toHex(this.destinationHash));
    } catch (e) {
      log("Destination", `Failed to load ratchets: ${e}`, LogLevel.WARNING);
      return false;
    }
    if (!bytes) return false;
    try {
      const data = MicroMsgPack.decode(bytes);
      if (!data || !(data.signature instanceof Uint8Array) || !(data.ratchets instanceof Uint8Array)) {
        return false;
      }
      if (!await identity.validate(data.signature, data.ratchets)) {
        log(
          "Destination",
          "Persisted ratchet ring signature invalid; ignoring.",
          LogLevel.WARNING
        );
        return false;
      }
      const ring = MicroMsgPack.decode(data.ratchets);
      if (!Array.isArray(ring)) return false;
      const parsed = [];
      for (const entry of ring) {
        if (!Array.isArray(entry) || entry.length !== 2) return false;
        const [priv, pub] = entry;
        if (!(priv instanceof Uint8Array) || priv.length !== 32) return false;
        if (!(pub instanceof Uint8Array) || pub.length !== 32) return false;
        parsed.push({
          privateKey: new Uint8Array(priv),
          publicKey: new Uint8Array(pub)
        });
      }
      this.ratchets = parsed;
      return true;
    } catch (e) {
      log(
        "Destination",
        `Persisted ratchet ring corrupt: ${e}`,
        LogLevel.WARNING
      );
      return false;
    }
  }
  /**
   * Persists the current owned ratchet ring (signed). Failures are logged and
   * swallowed: the in-memory ring still works, only restart-tolerance is lost.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _persistOwnedRatchets() {
    const adapter = this._ratchetStorage();
    if (!adapter || !this.destinationHash || !this.ratchets) return;
    try {
      const blob = await this._encodeOwnedRatchets();
      await adapter.saveOwnedRatchets(toHex(this.destinationHash), blob);
    } catch (e) {
      log("Destination", `Failed to persist ratchets: ${e}`, LogLevel.WARNING);
    }
  }
  /**
   * Static factory for creating a destination.
   * @param {string} name
   * @param {Direction} direction
   * @param {DestType} type
   * @param {Identity|null} identity
   * @param {import("../core/reticulum.js").Reticulum|null} interfaceLayer - An object that manages destinations and dispatches link requests.
   * @returns {Promise<Destination>}
   */
  static async create(name, direction, type, identity = null, interfaceLayer = null) {
    const dest = new _Destination(
      name,
      direction,
      type,
      identity,
      interfaceLayer
    );
    await dest._computeHashes();
    return dest;
  }
  /**
   * Computes the nameHash and destinationHash.
   * @private
   */
  async _computeHashes() {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(this.name);
    const nameHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      /** @type {any} */
      nameBytes
    );
    this.nameHash = new Uint8Array(nameHashBuffer.slice(0, 10));
    if (this.type === DestType.SINGLE && this.identity) {
      const combined = new Uint8Array(
        this.nameHash.length + this.identity.identityHash.length
      );
      combined.set(this.nameHash, 0);
      combined.set(this.identity.identityHash, this.nameHash.length);
      const destHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        /** @type {any} */
        combined
      );
      this.destinationHash = new Uint8Array(destHashBuffer.slice(0, 16));
    } else if (this.type === DestType.GROUP && this.identity) {
      const combined = new Uint8Array(
        this.nameHash.length + this.identity.identityHash.length
      );
      combined.set(this.nameHash, 0);
      combined.set(this.identity.identityHash, this.nameHash.length);
      const destHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        /** @type {any} */
        combined
      );
      this.destinationHash = new Uint8Array(destHashBuffer.slice(0, 16));
    } else if (this.type === DestType.PLAIN) {
      const destHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        /** @type {any} */
        this.nameHash
      );
      this.destinationHash = new Uint8Array(destHashBuffer.slice(0, 16));
    } else {
      this.destinationHash = null;
    }
  }
  /**
   * Creates an IN destination.
   * @param {string} name
   * @param {DestType} type
   * @param {Identity|null} identity
   * @param {import("../core/reticulum.js").Reticulum|null} interfaceLayer - An object that manages destinations and dispatches link requests.
   * @returns {Promise<Destination>}
   */
  static async IN(name, type, identity = null, interfaceLayer = null) {
    return await _Destination.create(
      name,
      Direction.IN,
      type,
      identity,
      interfaceLayer
    );
  }
  /**
   * Creates an OUT destination.
   * @param {string} name
   * @param {DestType} type
   * @param {Identity|null} identity
   * @param {import("../core/reticulum.js").Reticulum|null} interfaceLayer - An object that manages destinations and dispatches link requests.
   * @returns {Promise<Destination>}
   */
  static async OUT(name, type, identity = null, interfaceLayer = null) {
    return await _Destination.create(
      name,
      Direction.OUT,
      type,
      identity,
      interfaceLayer
    );
  }
  /**
   * Creates an OUT destination from a known destination hash (work document
   * #34) — dialing a peer whose destination hash the application learned
   * through its own channels (e.g. an `rns://` URL) instead of from a stored
   * {@link Identity}.
   *
   * The peer's public key is required to verify the LRPROOF during link
   * establishment (it is not carried on the wire, so a link request alone
   * cannot authenticate the responder), so the identity is hydrated from the
   * transport's known-destinations cache; when unknown, a path request is
   * sent and the peer's announce awaited — its announce carries the public
   * key that proves the peer's identity during the link proof phase.
   *
   * @param {string} name
   * @param {Uint8Array} destinationHash 16-byte destination hash.
   * @param {import("../core/reticulum.js").Reticulum|null} interfaceLayer - An object that manages destinations and dispatches link requests.
   * @param {number} [timeoutMs=30000] How long to await the peer's announce
   *   when the identity is not cached.
   * @returns {Promise<Destination>}
   * @throws {TypeError} when `destinationHash` is not a 16-byte Uint8Array.
   * @throws {Error} when no `interfaceLayer` is bound.
   * @throws {import("../transport/transport.js").UnknownIdentityError} when
   *   the peer's identity is unknown and cannot be solicited in time.
   * @throws {Error} when the recalled identity does not hash to
   *   `destinationHash` under `name` (wrong app name for that hash?).
   */
  static async recalled(name, destinationHash, interfaceLayer = null, timeoutMs = 3e4) {
    if (!(destinationHash instanceof Uint8Array) || destinationHash.length !== Identity.TRUNCATED_HASH_LENGTH) {
      throw new TypeError(
        `destinationHash must be a ${Identity.TRUNCATED_HASH_LENGTH}-byte Uint8Array`
      );
    }
    if (!interfaceLayer) {
      throw new Error("Destination not bound to an RNS instance.");
    }
    const identity = await interfaceLayer.transport.recallOrSolicitIdentity(
      destinationHash,
      timeoutMs
    );
    const dest = await _Destination.OUT(
      name,
      DestType.SINGLE,
      identity,
      interfaceLayer
    );
    if (!bytesEqual(
      /** @type {Uint8Array} */
      dest.destinationHash,
      destinationHash
    )) {
      throw new Error(
        `recalled identity for ${toHex(destinationHash)} does not hash to it under name "${name}" \u2014 wrong name for that destination?`
      );
    }
    return dest;
  }
  /**
   * Creates a SINGLE destination.
   * @param {string} name
   * @param {Direction} direction
   * @param {Identity|null} identity
   * @returns {Promise<Destination>}
   */
  static async SINGLE(name, direction, identity = null) {
    return await _Destination.create(name, direction, DestType.SINGLE, identity);
  }
  /**
   * Creates a GROUP destination.
   * @param {string} name
   * @param {Direction} direction
   * @param {Identity|null} identity
   * @returns {Promise<Destination>}
   */
  static async GROUP(name, direction, identity = null) {
    return await _Destination.create(name, direction, DestType.GROUP, identity);
  }
  /**
   * Creates a PLAIN destination.
   * @param {string} name
   * @param {Direction} direction
   * @returns {Promise<Destination>}
   */
  static async PLAIN(name, direction) {
    return await _Destination.create(name, direction, DestType.PLAIN, null);
  }
  /**
   * Gets the salt for key derivation: the destination hash itself.
   * @returns {Uint8Array}
   */
  getSalt() {
    return this.destinationHash ?? new Uint8Array(16);
  }
  /**
   * Initiates an encrypted link to this remote (OUT) destination.
   *
   * Delegates to `Link.initiate`, which generates the ephemeral keypair, builds
   * and sends the LINKREQUEST, registers the link with the transport, and
   * transitions to HANDSHAKE. This method then awaits `Link.whenActive()` so
   * that the returned link is fully established (LRPROOF validated, session
   * keys derived) and ready to carry application DATA — e.g. it is safe to call
   * `link.identify(...)` immediately on the resolved value.
   *
   * @returns {Promise<import('../transport/link.js').Link>}
   */
  async createLink() {
    if (this.direction !== Direction.OUT) {
      throw new Error("Can only initiate links to OUT destinations.");
    }
    if (!this.interfaceLayer) {
      throw new Error("Destination not bound to an RNS instance.");
    }
    const link = await Link.initiate(this, this.interfaceLayer.transport);
    return await link.whenActive();
  }
  /**
   * Handles incoming packets routed to this destination.
   * @param {import('./packet.js').Packet} packet
   * @param {import("../interfaces/base.js").Interface} receivingInterface
   */
  async receive(packet, receivingInterface) {
    log(
      "Destination",
      `Destination ${this.name} received packet type ${packet.packetType}`,
      LogLevel.DEBUG
    );
    switch (packet.packetType) {
      case PacketType.DATA:
        await this._handleData(packet);
        break;
      case PacketType.LINKREQUEST:
        this.dispatchEvent(
          new CustomEvent("link_request", {
            detail: { packet, transport: receivingInterface }
          })
        );
        break;
    }
  }
  /**
   * Accepts an incoming LINKREQUEST and returns the established {@link Link}.
   * @param {import('./packet.js').Packet} packet
   * @returns {Promise<import("../transport/link.js").Link>}
   */
  async acceptLink(packet) {
    return await this.respondToLinkRequest(packet);
  }
  /**
   * Registers a server-side REQUEST handler for a path string
   * (PROTOCOL-SPEC.md §11.3, §11.4).
   *
   * The path is hashed to `SHA-256(path)[:16]` and stored keyed by that hash;
   * the path string itself never appears on the wire. When a REQUEST arrives
   * on a Link whose responder destination is this one, `Link._handleRequest`
   * looks the handler up by the path hash, enforces the `allow` mode, and
   * invokes `responseGenerator` to produce the response value.
   *
   * @param {string} path - Opaque path token (e.g. `"/page/index.mu"`).
   * @param {object} options
   * @param {RequestGenerator} options.responseGenerator - Produces the response value.
   * @param {Allow} [options.allow=Allow.ALL] - Authorization mode.
   * @param {Uint8Array[]} [options.allowedList=[]] - Identity hashes permitted under `Allow.LIST`.
   * @param {boolean} [options.autoCompress=false] - Hint for the (future) Resource response path.
   * @returns {Promise<Uint8Array>} the 16-byte path hash the handler is keyed under.
   */
  async registerRequestHandler(path, options) {
    if (typeof options?.responseGenerator !== "function") {
      throw new TypeError("responseGenerator must be a function");
    }
    const encoder = new TextEncoder();
    const pathHash = await Identity.truncatedHash(encoder.encode(path));
    this.requestHandlers.set(toHex(pathHash), {
      path,
      responseGenerator: options.responseGenerator,
      allow: options.allow ?? Allow.ALL,
      allowedList: options.allowedList ?? [],
      autoCompress: options.autoCompress ?? false
    });
    return pathHash;
  }
  /**
   * Removes a previously registered REQUEST handler.
   * @param {string} path
   * @returns {Promise<boolean>} true if a handler was removed.
   */
  async removeRequestHandler(path) {
    const encoder = new TextEncoder();
    const pathHash = await Identity.truncatedHash(encoder.encode(path));
    return this.requestHandlers.delete(toHex(pathHash));
  }
  /**
   * Decrypts (where applicable) and dispatches an inbound DATA packet
   * as a `data` event.
   *
   * For a CTX_NONE DATA packet addressed to a SINGLE destination we hold the
   * private key for, this also emits the regular PROOF receipt (§6.5) so the
   * sender's `PacketReceipt` resolves — without it the sender retransmits
   * indefinitely (and, on a link, the KEEPALIVE budget is exhausted).
   * @param {import('./packet.js').Packet} packet
   * @private
   */
  async _handleData(packet) {
    let plaintext = null;
    if (this.type === DestType.SINGLE && this.identity) {
      const identity = this.identity;
      const privRing = this.ratchetsEnabled && this.ratchets ? this.ratchets.map((r) => r.privateKey) : null;
      plaintext = await identity.decrypt(packet.payload, privRing);
      if (!plaintext && privRing && await this._loadOwnedRatchets()) {
        const reloaded = this.ratchets;
        if (reloaded) {
          plaintext = await identity.decrypt(
            packet.payload,
            reloaded.map((r) => r.privateKey)
          );
        }
      }
    } else {
      plaintext = packet.payload;
    }
    if (plaintext) {
      this.dispatchEvent(new CustomEvent("data", { detail: { plaintext } }));
      if (packet.packetType === PacketType.DATA && packet.contextByte === ContextType.NONE && this.type === DestType.SINGLE && this.identity && this.identity.ed25519Priv && this.interfaceLayer) {
        try {
          await this._provePacket(packet);
        } catch (err) {
          log("Destination", `Failed to emit PROOF: ${err}`, LogLevel.WARNING);
        }
      }
    }
  }
  /**
   * Builds and sends the regular PROOF for a received DATA packet (§6.5).
   *
   *   packet_hash = SHA-256(get_hashable_part(packet))   (32 bytes)
   *   signature   = Ed25519_sign(packet_hash)            (64 bytes)
   *   proof_data  = implicit (signature) | explicit (packet_hash || signature)
   *
   * The PROOF is a `packet_type = PROOF (3)`, `context = NONE (0x00)` packet
   * addressed to `dest_hash = packet_hash[:16]` (the synthetic ProofDestination).
   * Upstream defaults to the 64-byte implicit form (`use_implicit_proof = True`).
   *
   * @param {import('./packet.js').Packet} packet
   * @private
   */
  async _provePacket(packet) {
    if (!this.identity || !this.interfaceLayer) return;
    const packetHash = await packet.getHash();
    const signature = await this.identity.sign(packetHash);
    const useImplicit = (
      /** @type {{ useImplicitProof?: boolean } | null} */
      this.interfaceLayer?.useImplicitProof ?? true
    );
    let proofData;
    if (useImplicit) {
      proofData = signature;
    } else {
      proofData = new Uint8Array(96);
      proofData.set(packetHash, 0);
      proofData.set(signature, 32);
    }
    const proofPacket = new Packet({
      packetType: PacketType.PROOF,
      destinationType: DestType.SINGLE,
      destinationHash: packetHash.slice(0, 16),
      contextByte: ContextType.NONE,
      payload: proofData
    });
    this.interfaceLayer.broadcast(proofPacket);
  }
  /**
   * Responds to an incoming LINKREQUEST by accepting the link.
   *
   * Delegates to `Link.accept`, which derives the link_id, generates the
   * responder ephemeral key, derives the session keys, builds and sends the
   * LRPROOF, and registers the link with the transport.
   *
   * @param {import('../core/packet.js').Packet} requestPacket
   * @returns {Promise<import('../transport/link.js').Link>}
   */
  async respondToLinkRequest(requestPacket) {
    if (!this.interfaceLayer || !this.interfaceLayer.transport) {
      throw new Error(
        "Destination not bound to an RNS instance with a transport."
      );
    }
    const link = await Link.accept(
      this,
      this.interfaceLayer.transport,
      requestPacket
    );
    log(
      "Destination",
      `[LINK] Handshake response sent to link_id: ${toHex(link.linkId)}`,
      LogLevel.DEBUG
    );
    return link;
  }
  /**
   * Caches a learned identity into an explicit map (work doc #37). Called by
   * `TransportCore.rememberIdentity` with its instance-scoped cache.
   *
   * @param {Map<string, KnownDestination>} knownDestinations
   * @param {Uint8Array} packetHash
   * @param {Uint8Array} destinationHash
   * @param {Uint8Array} publicKey
   * @param {Uint8Array|null} appData
   */
  static async rememberInto(knownDestinations, packetHash, destinationHash, publicKey, appData = null) {
    const key = toHex(destinationHash);
    const existing = knownDestinations.get(key);
    if (existing) {
      log("Destination", `Updating destination ${key}`, LogLevel.DEBUG);
      if (!bytesEqual(existing.packetHash, packetHash)) {
        log(
          "Destination",
          `  - packetHash changed to ${toHex(packetHash)}`,
          LogLevel.DEBUG
        );
      }
      if (!bytesEqual(existing.publicKey, publicKey)) {
        log(
          "Destination",
          `  - publicKey changed to ${toHex(publicKey)}`,
          LogLevel.DEBUG
        );
      }
      if (!appDataEquals(existing.appData, appData)) {
        log("Destination", `  - appData changed`, LogLevel.DEBUG);
      }
      knownDestinations.set(key, {
        timestamp: Date.now() / 1e3,
        packetHash,
        publicKey,
        appData
      });
    } else {
      log("Destination", `Saving new destination ${key}`, LogLevel.DEBUG);
      knownDestinations.set(key, {
        timestamp: Date.now() / 1e3,
        packetHash,
        publicKey,
        appData
      });
    }
  }
  /**
   * Recalls a learned identity from an explicit map (work doc #37). Called by
   * `TransportCore.recallIdentity` with its instance-scoped cache.
   *
   * @param {Map<string, KnownDestination>} knownDestinations
   * @param {Uint8Array} targetHash
   * @param {boolean} fromIdentityHash
   * @returns {Promise<Identity|null>}
   */
  static async recallFrom(knownDestinations, targetHash, fromIdentityHash = false) {
    if (fromIdentityHash) {
      for (const entry of knownDestinations.values()) {
        const identity = await Identity.fromPublicKey(entry.publicKey);
        if (bytesEqual(targetHash, identity.identityHash)) {
          identity.appData = entry.appData ? new Uint8Array(entry.appData) : new Uint8Array();
          return identity;
        }
      }
      return null;
    } else {
      const entry = knownDestinations.get(toHex(targetHash));
      if (entry) {
        const identity = await Identity.fromPublicKey(entry.publicKey);
        identity.appData = entry.appData ? new Uint8Array(entry.appData) : new Uint8Array();
        return identity;
      }
      return null;
    }
  }
  /**
   * Caches an announced ratchet public key into an explicit map (work doc
   * #37). Called by `TransportCore.rememberRatchet` with its instance-scoped
   * cache.
   *
   * @param {Map<string, {ratchet: Uint8Array, received: number}>} knownRatchets
   * @param {Uint8Array} destinationHash
   * @param {Uint8Array} ratchet - 32-byte ratchet X25519 public key.
   */
  static rememberRatchetInto(knownRatchets, destinationHash, ratchet) {
    if (!ratchet || ratchet.length === 0) return;
    const key = toHex(destinationHash);
    const copy = new Uint8Array(ratchet);
    const existing = knownRatchets.get(key);
    if (existing && bytesEqual(existing.ratchet, copy)) return;
    knownRatchets.set(key, {
      ratchet: copy,
      received: Date.now()
    });
  }
  /**
   * Recalls the newest non-expired ratchet public key from an explicit map
   * (work doc #37). Called by `TransportCore.recallRatchet` with its
   * instance-scoped cache.
   *
   * @param {Map<string, {ratchet: Uint8Array, received: number}>} knownRatchets
   * @param {Uint8Array} destinationHash
   * @returns {Uint8Array|null}
   */
  static recallRatchetFrom(knownRatchets, destinationHash) {
    if (!knownRatchets) return null;
    const key = toHex(destinationHash);
    const entry = knownRatchets.get(key);
    if (!entry) return null;
    if (Date.now() > entry.received + _Destination.RATCHET_EXPIRY_MS) {
      knownRatchets.delete(key);
      return null;
    }
    return entry.ratchet;
  }
  /**
   * Drops expired and obsolete peer ratchets from a known-ratchets map. Called
   * once at startup after persistence hydration (mirrors
   * `RNS.Identity._clean_ratchets`): an entry is removed when it is past
   * {@link Destination.RATCHET_EXPIRY_MS} or its destination is no longer in
   * `knownDestinations` (the peer was forgotten).
   *
   * @param {Map<string, {ratchet: Uint8Array, received: number}>} knownRatchets
   *   The ratchet map to clean (a transport's instance cache).
   * @param {Map<string, KnownDestination>} knownDestinations The
   *   corresponding identity map.
   * @returns {number} the number of entries removed.
   */
  static cleanKnownRatchets(knownRatchets, knownDestinations) {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of knownRatchets) {
      const expired = now > entry.received + _Destination.RATCHET_EXPIRY_MS;
      const unknown = !knownDestinations.has(key);
      if (expired || unknown) {
        knownRatchets.delete(key);
        removed++;
      }
    }
    return removed;
  }
  /**
   * Encrypts data for this destination's identity.
   * @param {Uint8Array} data
   * @return {Promise<Uint8Array>}
   */
  async encrypt(data) {
    if (!this.identity) {
      throw new Error("Destination requires an identity to encrypt.");
    }
    const caches = this._cacheMaps();
    const ratchet = caches && this.destinationHash ? _Destination.recallRatchetFrom(
      caches.knownRatchets,
      this.destinationHash
    ) : null;
    return await this.identity.encrypt(data, ratchet);
  }
  /**
   * The cache maps this destination reads (ratchets) from: the transport's
   * instance-scoped caches of the attached interface layer (work doc #37).
   * Standalone destinations (no layer) have no learned ratchets — `encrypt`
   * falls back to the long-term key, matching a destination that never heard
   * an announce.
   * @returns {{knownRatchets: Map<string, {ratchet: Uint8Array, received: number}>}|null}
   * @private
   */
  _cacheMaps() {
    const iface = (
      /** @type {any} */
      this.interfaceLayer
    );
    return iface?.transport?.caches ?? null;
  }
  /**
   * Decrypts data that was encrypted for this destination's identity.
   *
   * Tries each owned ratchet private key (newest first) before the long-term
   * key (§7.4), so messages encrypted to a just-rotated ratchet still decrypt.
   * Returns `null` when decryption fails (wrong recipient / unknown key).
   *
   * @param {Uint8Array} data
   * @returns {Promise<Uint8Array|null>}
   */
  async decrypt(data) {
    if (!this.identity) {
      throw new Error("Destination requires an identity to decrypt.");
    }
    const privRing = this.ratchetsEnabled && this.ratchets ? this.ratchets.map((r) => r.privateKey) : null;
    return await this.identity.decrypt(data, privRing);
  }
  /**
   * Encrypts the packet payload for this destination and sends it via the
   * bound transport.
   * @param {Packet} packet
   * @returns {Promise<import("./packet_receipt.js").PacketReceipt|null>}
   *   The proof receipt tracked by the transport for an opportunistic
   *   CTX_NONE DATA packet (observable via `whenSettled()`), or `null` for
   *   any other packet shape.
   */
  async send(packet) {
    if (!this.interfaceLayer) {
      throw new Error("Destination not bound to an RNS instance.");
    }
    const encryptedPayload = await this.encrypt(packet.payload);
    const encryptedPacket = new Packet({
      headerType: packet.headerType,
      hops: packet.hops,
      transportType: packet.transportType,
      destinationType: packet.destinationType,
      destinationHash: packet.destinationHash,
      packetType: packet.packetType,
      contextFlag: packet.contextFlag,
      contextByte: packet.contextByte,
      payload: encryptedPayload,
      transportId: packet.transportId
    });
    return await this.interfaceLayer.transport.sendPacket(encryptedPacket);
  }
};

// node_modules/@reticulum/core/src/core/packet_receipt.js
var ReceiptStatus = {
  /** Sent, awaiting the receiver's PROOF. */
  SENDING: 0,
  /** PROOF received and validated — delivery confirmed. */
  DELIVERED: 1,
  /** Timed out or PROOF failed validation. */
  FAILED: 2,
  /** Evicted from the registry (e.g. after resolution or culling). */
  CULLED: 3
};
var PROOF_EXPLICIT_LENGTH = 96;
var PROOF_IMPLICIT_LENGTH = 64;
var PacketReceipt = class {
  /**
   * @param {Uint8Array} packetHash - 32-byte `SHA-256(get_hashable_part(packet))`.
   * @param {Uint8Array} destinationHash - 16-byte destination the proved packet was sent to;
   *   used to recall the verifying identity.
   * @param {Object} [callbacks]
   * @param {function(PacketReceipt): void|Promise<void>} [callbacks.delivered]
   *   Fired once when the PROOF validates.
   * @param {function(PacketReceipt): void|Promise<void>} [callbacks.failed]
   *   Fired once if the PROOF fails validation.
   */
  constructor(packetHash, destinationHash, callbacks = {}) {
    this.packetHash = packetHash;
    this.truncatedHash = packetHash.slice(0, 16);
    this.destinationHash = destinationHash;
    this.callbacks = callbacks;
    this.owner = null;
    this.status = ReceiptStatus.SENDING;
    this.sentAt = Date.now();
    this._timeoutTimer = null;
    this._settledPromise = null;
    this._settledResolve = null;
  }
  /**
   * Removes this receipt from its owner transport's instance-scoped registry
   * (a no-op for untracked receipts — work doc #37).
   * @private
   */
  _unregister() {
    if (this.owner) {
      this.owner.caches.receipts.delete(toHex(this.truncatedHash));
    }
  }
  /**
   * Validates an inbound proof body (§6.5.1 / §6.5.5), dispatching purely on
   * length. The verifying identity is recalled by {@link destinationHash} —
   * the destination the original packet was addressed to — so receipt
   * creation never needs to thread the recipient identity through.
   *
   * @param {Uint8Array} proofData
   * @returns {Promise<boolean>} `true` if the signature verifies over the
   *   packet hash (and, for explicit proofs, the embedded hash matches).
   */
  async validateProof(proofData) {
    if (proofData.length === PROOF_EXPLICIT_LENGTH) {
      const packetHash = proofData.slice(0, 32);
      const signature = proofData.slice(32, 96);
      if (!bytesEqual(packetHash, this.packetHash)) {
        log(
          "PacketReceipt",
          "explicit proof packet_hash does not match the tracked receipt",
          LogLevel.DEBUG
        );
        return false;
      }
      return this._verify(signature, this.packetHash);
    }
    if (proofData.length === PROOF_IMPLICIT_LENGTH) {
      return this._verify(proofData, this.packetHash);
    }
    log(
      "PacketReceipt",
      `proof length ${proofData.length} matches neither 64 (implicit) nor 96 (explicit)`,
      LogLevel.DEBUG
    );
    return false;
  }
  /**
   * Recalls the recipient identity and verifies an Ed25519 signature over `data`.
   *
   * @param {Uint8Array} signature
   * @param {Uint8Array} data
   * @returns {Promise<boolean>}
   * @private
   */
  async _verify(signature, data) {
    if (!this.owner) {
      log(
        "PacketReceipt",
        "cannot verify a proof without the owning transport",
        LogLevel.DEBUG
      );
      return false;
    }
    const identity = await this.owner.recallIdentity(this.destinationHash);
    if (!identity) {
      log(
        "PacketReceipt",
        `no identity recalled for destination ${toHex(this.destinationHash)}; cannot verify proof`,
        LogLevel.DEBUG
      );
      return false;
    }
    return identity.validate(signature, data);
  }
  /**
   * Starts the proof-wait timeout: on expiry the receipt is removed from the
   * registry and marked failed (firing the `failed` callback, which a
   * transport wires to `markPathUnresponsive`). No-op if already resolved.
   * @param {number} timeoutMs
   */
  startTimeout(timeoutMs) {
    if (this.status !== ReceiptStatus.SENDING) return;
    this.clearTimeout();
    this._timeoutTimer = setTimeout(() => {
      this._timeoutTimer = null;
      this._unregister();
      this.setFailed();
    }, timeoutMs);
  }
  /**
   * Cancels any pending proof-wait timeout. Idempotent.
   */
  clearTimeout() {
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
  }
  /**
   * Resolves once the receipt reaches a terminal state, yielding the final
   * {@link ReceiptStatus} (`DELIVERED` or `FAILED`). Awaiting this is how a
   * caller learns whether the receiver actually proved the packet — the
   * transport's `startTimeout` guarantees settlement even when no PROOF ever
   * arrives. Resolves immediately for an already-settled receipt.
   *
   * @returns {Promise<ReceiptStatus>}
   */
  whenSettled() {
    if (this.status !== ReceiptStatus.SENDING) {
      return Promise.resolve(this.status);
    }
    if (!this._settledPromise) {
      this._settledPromise = new Promise((resolve) => {
        this._settledResolve = resolve;
      });
    }
    return this._settledPromise;
  }
  /**
   * Marks the receipt delivered, removes it from the registry, and fires the
   * `delivered` callback once. Idempotent.
   */
  setDelivered() {
    if (this.status === ReceiptStatus.DELIVERED) return;
    this.clearTimeout();
    this.status = ReceiptStatus.DELIVERED;
    this._settledResolve?.(this.status);
    this._settledResolve = null;
    this._unregister();
    if (this.callbacks.delivered) {
      try {
        this.callbacks.delivered(this);
      } catch (err) {
        log(
          "PacketReceipt",
          `delivered callback threw: ${err}`,
          LogLevel.ERROR
        );
      }
    }
  }
  /**
   * Marks the receipt failed and fires the `failed` callback once. Does not
   * remove from the registry (the caller decides whether to retry or cull).
   */
  setFailed() {
    if (this.status === ReceiptStatus.FAILED) return;
    this.clearTimeout();
    this.status = ReceiptStatus.FAILED;
    this._settledResolve?.(this.status);
    this._settledResolve = null;
    if (this.callbacks.failed) {
      try {
        this.callbacks.failed(this);
      } catch (err) {
        log("PacketReceipt", `failed callback threw: ${err}`, LogLevel.ERROR);
      }
    }
  }
};

// node_modules/@reticulum/core/src/storage/storage.js
var StorageNamespace = {
  IDENTITIES: "identities",
  RATCHETS: "ratchets",
  PATHS: "paths"
};
var MemoryStorageAdapter = class {
  constructor() {
    this._stores = /* @__PURE__ */ new Map();
    this._key = null;
    this._ownedRatchets = /* @__PURE__ */ new Map();
  }
  /**
   * @param {string} namespace
   * @returns {Map<string, Uint8Array>}
   * @private
   */
  _ns(namespace) {
    let m = this._stores.get(namespace);
    if (!m) {
      m = /* @__PURE__ */ new Map();
      this._stores.set(namespace, m);
    }
    return m;
  }
  async loadKey() {
    return this._key ? this._key.slice() : null;
  }
  /**
   * @param {Uint8Array} bytes
   * @returns {Promise<void>}
   */
  async saveKey(bytes) {
    this._key = bytes.slice();
  }
  /**
   * @param {string} destHashHex
   * @returns {Promise<Uint8Array|null>}
   */
  async loadOwnedRatchets(destHashHex) {
    const v = this._ownedRatchets.get(destHashHex);
    return v ? v.slice() : null;
  }
  /**
   * @param {string} destHashHex
   * @param {Uint8Array} bytes
   * @returns {Promise<void>}
   */
  async saveOwnedRatchets(destHashHex, bytes) {
    this._ownedRatchets.set(destHashHex, bytes.slice());
  }
  /**
   * @param {string} namespace
   * @param {string} key
   * @returns {Promise<Uint8Array|null>}
   */
  async get(namespace, key) {
    const v = this._stores.get(namespace)?.get(key);
    return v ? v.slice() : null;
  }
  /**
   * @param {string} namespace
   * @param {string} key
   * @param {Uint8Array} value
   * @returns {Promise<void>}
   */
  async set(namespace, key, value) {
    this._ns(namespace).set(key, value.slice());
  }
  /**
   * @param {string} namespace
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(namespace, key) {
    this._ns(namespace).delete(key);
  }
  /**
   * @param {string} namespace
   * @returns {Promise<string[]>}
   */
  async keys(namespace) {
    return Array.from(this._ns(namespace).keys());
  }
};

// node_modules/@reticulum/core/src/storage/persistor.js
function toU8(v) {
  return v instanceof Uint8Array ? v : new Uint8Array(v ?? []);
}
function encodeIdentityEntry(entry) {
  return MicroMsgPack.encode([
    entry.timestamp,
    toU8(entry.packetHash),
    toU8(entry.publicKey),
    entry.appData ? toU8(entry.appData) : null
  ]);
}
function decodeIdentityEntry(bytes) {
  const e = MicroMsgPack.decode(bytes);
  if (!Array.isArray(e) || e.length < 4)
    throw new Error("identity entry is not a record array");
  return {
    timestamp: typeof e[0] === "number" ? e[0] : 0,
    packetHash: toU8(e[1]),
    publicKey: toU8(e[2]),
    appData: e[3] ? toU8(e[3]) : null
  };
}
function encodeRatchet(entry) {
  return MicroMsgPack.encode({
    ratchet: toU8(entry.ratchet),
    received: entry.received
  });
}
function decodeRatchet(bytes) {
  const e = MicroMsgPack.decode(bytes);
  if (!e || !(e.ratchet instanceof Uint8Array)) {
    throw new Error("ratchet entry is not {ratchet, received}");
  }
  return {
    ratchet: toU8(e.ratchet),
    received: typeof e.received === "number" ? e.received : 0
  };
}
function encodeRoute(route) {
  return MicroMsgPack.encode([
    toU8(route.nextHop),
    route.hops,
    route.timestamp,
    route.expires,
    (route.randomBlobs ?? []).map(toU8),
    route.interfaceName ?? route.interface?.name ?? null
  ]);
}
function decodeRoute(bytes) {
  const e = MicroMsgPack.decode(bytes);
  if (!Array.isArray(e) || e.length < 4)
    throw new Error("path entry is not a tuple");
  return {
    interface: null,
    interfaceName: typeof e[5] === "string" ? e[5] : null,
    nextHop: toU8(e[0]),
    hops: e[1],
    timestamp: e[2],
    expires: e[3],
    randomBlobs: Array.isArray(e[4]) ? e[4].map(toU8) : []
  };
}
var Persistor = class {
  /**
   * @param {PersistorOptions} [options]
   */
  constructor({
    adapter,
    knownDestinations,
    knownRatchets,
    routingTable,
    debounceMs = 3e3
  } = {}) {
    this.adapter = adapter ?? null;
    if (!knownDestinations || !knownRatchets) {
      throw new Error(
        "Persistor requires the owning transport's cache maps (knownDestinations/knownRatchets, e.g. rns.transport.caches) \u2014 there is no default shared state (work doc #37)"
      );
    }
    this.knownDestinations = knownDestinations;
    this.knownRatchets = knownRatchets;
    this.routingTable = routingTable ?? null;
    this.debounceMs = debounceMs;
    this.persistedDestinations = /* @__PURE__ */ new Set();
    this._flushTimer = null;
    this.loadPromise = null;
    this.loaded = false;
  }
  /**
   * Returns the adapter only when it implements the full KV interface (#16),
   * else null. Used to narrow `this.adapter` (which may be null or a
   * legacy identity-only adapter) for the type checker.
   * @returns {import("./storage.js").StorageAdapter|null}
   * @private
   */
  _kvAdapter() {
    const a = this.adapter;
    if (a && typeof a.get === "function" && typeof a.set === "function" && typeof a.delete === "function" && typeof a.keys === "function") {
      return a;
    }
    return null;
  }
  /** True when a backend exposing the KV interface is configured. */
  get enabled() {
    return this._kvAdapter() !== null;
  }
  /**
   * Coerces a destination hash (bytes or hex) to its hex string key.
   * @param {Uint8Array|string} destinationHash
   * @returns {string}
   * @private
   */
  _hex(destinationHash) {
    return typeof destinationHash === "string" ? destinationHash : toHex(destinationHash);
  }
  /**
   * Marks a destination as communicated-with and schedules a debounced flush.
   * Called by the transport layer at real send/receive points.
   * @param {Uint8Array|string} destinationHash
   * @returns {void}
   */
  markContacted(destinationHash) {
    if (!this.enabled) return;
    const hex = this._hex(destinationHash);
    if (!this.persistedDestinations.has(hex)) {
      this.persistedDestinations.add(hex);
      log(
        "Persistor",
        `Scheduling persistence for contacted destination ${hex}`,
        LogLevel.DEBUG
      );
    }
    this._scheduleFlush();
  }
  /**
   * Explicitly persists a destination (e.g. a favorited contact), regardless of
   * whether we have communicated with it.
   *
   * If the destination has already been learned from a heard announce, its
   * current identity/ratchet/path state is written immediately. To persist a
   * peer that has not been learned yet — or to refresh from a specific announce
   * — pass `announce`; it accepts a transport `announce` event's `detail`
   * object directly (see {@link StorableAnnounce}).
   *
   * Flushes immediately so the favorite survives an ungraceful crash.
   * @param {Uint8Array|string} destinationHash
   * @param {{ announce?: StorableAnnounce }} [options]
   * @returns {Promise<void>}
   */
  async store(destinationHash, { announce } = {}) {
    if (!this.enabled) return;
    const hex = this._hex(destinationHash);
    if (announce) {
      await this._ingestAnnounce(hex, announce);
    }
    this.persistedDestinations.add(hex);
    await this.flush();
  }
  /**
   * Writes an announce's identity/app_data/ratchet into the in-memory maps (the
   * injected ones, so tests stay isolated) so the next flush persists them.
   * Mirrors `TransportCore._handleAnnounce` step 6 for the client-driven path.
   * @param {string} hex
   * @param {StorableAnnounce} announce
   * @returns {Promise<void>}
   * @private
   */
  async _ingestAnnounce(hex, announce) {
    const publicKey = announce.identity?.publicKey;
    if (!publicKey) return;
    let packetHash = announce.packetHash;
    if (!packetHash && announce.packet && typeof announce.packet.getHash === "function") {
      packetHash = await announce.packet.getHash();
    }
    if (!packetHash) {
      packetHash = await Identity.fullHash(publicKey);
    }
    const appData = announce.appData ?? announce.identity?.appData ?? null;
    this.knownDestinations.set(hex, {
      timestamp: Date.now() / 1e3,
      packetHash: toU8(packetHash),
      publicKey: toU8(publicKey),
      appData: appData ? toU8(appData) : null
    });
    if (announce.ratchet && announce.ratchet.length > 0) {
      const copy = toU8(announce.ratchet);
      const existing = this.knownRatchets.get(hex);
      if (!existing || !bytesEqual(existing.ratchet, copy)) {
        this.knownRatchets.set(hex, { ratchet: copy, received: Date.now() });
      }
    }
  }
  /**
   * Schedules a debounced flush. No-op when auto-flush is disabled.
   * @returns {void}
   * @private
   */
  _scheduleFlush() {
    if (this.debounceMs <= 0) return;
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this.flush().catch(
        (e) => log("Persistor", `Debounced flush failed: ${e}`, LogLevel.WARNING)
      );
    }, this.debounceMs);
  }
  /**
   * Writes every persisted destination's identity, ratchet ring and path entry
   * to the adapter now, cancelling any pending debounced flush. No-op when
   * disabled.
   * @returns {Promise<void>}
   */
  async flush() {
    const adapter = this._kvAdapter();
    if (!adapter) return;
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    let written = 0;
    for (const hex of this.persistedDestinations) {
      const entry = this.knownDestinations.get(hex);
      if (entry) {
        await adapter.set(
          StorageNamespace.IDENTITIES,
          hex,
          encodeIdentityEntry(entry)
        );
        written++;
      }
      const ratchet = this.knownRatchets.get(hex);
      if (ratchet) {
        await adapter.set(
          StorageNamespace.RATCHETS,
          hex,
          encodeRatchet(ratchet)
        );
      }
      if (this.routingTable) {
        const route = this.routingTable.routes.get(hex);
        if (route) {
          await adapter.set(StorageNamespace.PATHS, hex, encodeRoute(route));
        }
      }
    }
    if (written > 0) {
      log(
        "Persistor",
        `Flushed ${written} contacted/favorited destination(s) to storage.`,
        LogLevel.DEBUG
      );
    }
  }
  /**
   * Hydrates the in-memory maps from the adapter and rebuilds the persisted
   * set. Call once at startup. Corrupt records are skipped with a warning.
   * @returns {Promise<void>}
   */
  async load() {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const adapter = this._kvAdapter();
      if (!adapter) {
        this.loaded = true;
        return;
      }
      await this._loadNamespace(
        adapter,
        StorageNamespace.IDENTITIES,
        this.knownDestinations,
        decodeIdentityEntry
      );
      await this._loadNamespace(
        adapter,
        StorageNamespace.RATCHETS,
        this.knownRatchets,
        decodeRatchet
      );
      if (this.routingTable) {
        await this._loadNamespace(
          adapter,
          StorageNamespace.PATHS,
          this.routingTable.routes,
          decodeRoute
        );
      }
      Destination.cleanKnownRatchets(
        this.knownRatchets,
        this.knownDestinations
      );
      this.loaded = true;
      log(
        "Persistor",
        `Loaded ${this.persistedDestinations.size} persisted destination(s).`,
        LogLevel.DEBUG
      );
    })();
    return this.loadPromise;
  }
  /**
   * Loads one namespace into a map, registering each key as persisted.
   * @param {import("./storage.js").StorageAdapter} adapter
   * @param {string} namespace
   * @param {Map<string, any>} into
   * @param {(bytes: Uint8Array) => any} decode
   * @returns {Promise<void>}
   * @private
   */
  async _loadNamespace(adapter, namespace, into, decode) {
    const keys = await adapter.keys(namespace);
    for (const key of keys) {
      const bytes = await adapter.get(namespace, key);
      if (!bytes) continue;
      try {
        into.set(key, decode(bytes));
        this.persistedDestinations.add(key);
      } catch (e) {
        log(
          "Persistor",
          `Skipping corrupt ${namespace} record ${key}: ${e}`,
          LogLevel.WARNING
        );
      }
    }
  }
};

// node_modules/@reticulum/core/src/utils/stamper.js
function msgpackUint(n) {
  if (n < 128) return new Uint8Array([n]);
  if (n <= 255) return new Uint8Array([204, n]);
  if (n <= 65535) return new Uint8Array([205, n >> 8 & 255, n & 255]);
  if (n <= 4294967295)
    return new Uint8Array([
      206,
      n >>> 24 & 255,
      n >>> 16 & 255,
      n >>> 8 & 255,
      n & 255
    ]);
  const out = new Uint8Array(9);
  out[0] = 207;
  let v = BigInt(n);
  for (let i = 8; i >= 1; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}
var WORKBLOCK_EXPAND_ROUNDS = 3e3;
var WORKBLOCK_EXPAND_ROUNDS_PN = 1e3;
var WORKBLOCK_EXPAND_ROUNDS_PEERING = 25;
var STAMP_SIZE = 32;
async function fullHash(data) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    /** @type {any} */
    data
  );
  return new Uint8Array(digest);
}
async function stampWorkblock(material, expandRounds = WORKBLOCK_EXPAND_ROUNDS) {
  const chunks = [];
  for (let n = 0; n < expandRounds; n++) {
    const counter = msgpackUint(n);
    const saltInput = new Uint8Array(material.length + counter.length);
    saltInput.set(material, 0);
    saltInput.set(counter, material.length);
    const salt = await fullHash(saltInput);
    const derived = await hkdf(material, salt, new Uint8Array(0), 256);
    chunks.push(derived);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const workblock = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    workblock.set(c, offset);
    offset += c.length;
  }
  return workblock;
}
function bigIntFromBytesBE(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex.length === 0 ? 0n : BigInt(`0x${hex}`);
}
async function stampValue(workblock, stamp) {
  const material = new Uint8Array(workblock.length + stamp.length);
  material.set(workblock, 0);
  material.set(stamp, workblock.length);
  const hash = await fullHash(material);
  let value = 0;
  const bits = 256;
  let i = bigIntFromBytesBE(hash);
  const highBit = 1n << BigInt(bits - 1);
  while ((i & highBit) === 0n) {
    i = i << 1n;
    value += 1;
  }
  return value;
}
async function stampValid(stamp, targetCost, workblock) {
  const material = new Uint8Array(workblock.length + stamp.length);
  material.set(workblock, 0);
  material.set(stamp, workblock.length);
  const result = await fullHash(material);
  const target = 1n << BigInt(256 - targetCost);
  return bigIntFromBytesBE(result) <= target;
}
async function generateStamp(messageId, stampCost, expandRounds = WORKBLOCK_EXPAND_ROUNDS) {
  const workblock = await stampWorkblock(messageId, expandRounds);
  const stamp = new Uint8Array(STAMP_SIZE);
  while (true) {
    crypto.getRandomValues(stamp);
    if (await stampValid(stamp, stampCost, workblock)) {
      const value = await stampValue(workblock, stamp);
      return [stamp, value];
    }
  }
}

// node_modules/@reticulum/core/src/transport/discovery.js
var APP_NAME = "rnstransport";
var ASPECT = `${APP_NAME}.discovery.interface`;
var DEFAULT_STAMP_VALUE = 16;
var WORKBLOCK_EXPAND_ROUNDS2 = 20;
var FLAG_SIGNED = 1;
var FLAG_ENCRYPTED = 2;
var NAME = 255;
var TRANSPORT_ID = 254;
var INTERFACE_TYPE = 0;
var TRANSPORT = 1;
var REACHABLE_ON = 2;
var LATITUDE = 3;
var LONGITUDE = 4;
var HEIGHT = 5;
var PORT = 6;
var IFAC_NETNAME = 7;
var IFAC_NETKEY = 8;
var FREQUENCY = 9;
var BANDWIDTH = 10;
var SPREADINGFACTOR = 11;
var CODINGRATE = 12;
var MODULATION = 13;
var CHANNEL = 14;
var OP_ADDR = 240;
var ACCEPTED_INTERFACE_TYPES = Object.freeze([
  "BackboneInterface",
  "TCPServerInterface",
  "TCPClientInterface",
  "RNodeInterface",
  "WeaveInterface",
  "I2PInterface",
  "KISSInterface"
]);
var DISCOVERABLE_TYPES = Object.freeze([
  "BackboneInterface",
  "TCPServerInterface",
  "I2PInterface",
  "RNodeInterface",
  "WeaveInterface",
  "KISSInterface"
]);
var THRESHOLD_UNKNOWN = 24 * 60 * 60;
var THRESHOLD_STALE = 3 * 24 * 60 * 60;
var THRESHOLD_REMOVE = 7 * 24 * 60 * 60;
var STATUS_STALE = 0;
var STATUS_UNKNOWN = 100;
var STATUS_AVAILABLE = 1e3;
var SAN_MAP = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function nowSeconds() {
  return Date.now() / 1e3;
}
async function aspectNameHash(aspect) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    /** @type {any} */
    new TextEncoder().encode(aspect)
  );
  return new Uint8Array(digest.slice(0, 10));
}
function sanitizeName(name) {
  if (typeof name !== "string" || name.length === 0) return null;
  let s = name.replace(/[^\x00-\x7f]/g, "").trim();
  for (const len of [5, 3, 2]) {
    s = s.split(" ".repeat(len)).join(" ");
  }
  while (s.length > 0 && !SAN_MAP.includes(s[0])) s = s.slice(1);
  while (s.length > 0 && !(SAN_MAP.includes(s[s.length - 1]) || s[s.length - 1] === ")")) {
    s = s.slice(0, -1);
  }
  return s;
}
function isIpAddress(str) {
  if (typeof str !== "string" || str.length === 0) return false;
  if (str.includes(":")) return isValidIPv6(str);
  const parts = str.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(p));
}
function isValidIPv6(str) {
  const doubleColons = str.match(/::/g);
  if (doubleColons && doubleColons.length > 1) return false;
  const parts = str.split(":");
  const groups = parts.filter((p) => p !== "");
  if (!doubleColons && parts.length !== 8) return false;
  if (doubleColons && groups.length > 7) return false;
  return groups.every((g, i) => {
    if (g.includes(".")) return isIpAddress(g);
    return /^[0-9a-f]{1,4}$/i.test(g) && i >= 0;
  });
}
function isHostname(hostname) {
  if (typeof hostname !== "string" || hostname.length === 0) return false;
  if (hostname[hostname.length - 1] === ".") hostname = hostname.slice(0, -1);
  if (hostname.length === 0 || hostname.length > 253) return false;
  const components = hostname.split(".");
  if (/^\d+$/.test(components[components.length - 1])) return false;
  const label = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;
  return components.every((c) => label.test(c));
}
function configSuffix(ctx) {
  const netname = ctx.ifacNetname ? `
  network_name = ${ctx.ifacNetname}` : "";
  const netkey = ctx.ifacNetkey ? `
  passphrase = ${ctx.ifacNetkey}` : "";
  const identity = `
  transport_identity = ${ctx.transportIdHex}`;
  return { identity, netname, netkey };
}
function buildConfigEntry(fields, backboneSupport = true) {
  const sanitized = (
    /** @type {DiscoveredFields} */
    {
      ...fields,
      ifacNetname: fields.ifacNetname && fields.ifacNetname !== "None" ? fields.ifacNetname : null,
      ifacNetkey: fields.ifacNetkey && fields.ifacNetkey !== "None" ? fields.ifacNetkey : null
    }
  );
  const ctx = (
    /** @type {ConfigEntryContext} */
    {
      name: sanitized.name,
      transportIdHex: sanitized.transportIdHex,
      ifacNetname: sanitized.ifacNetname,
      ifacNetkey: sanitized.ifacNetkey
    }
  );
  const sfx = configSuffix(ctx);
  switch (fields.type) {
    case "BackboneInterface":
    case "TCPServerInterface": {
      const connectionInterface = backboneSupport ? "BackboneInterface" : "TCPClientInterface";
      const remoteKey = backboneSupport ? "remote" : "target_host";
      return `[[${ctx.name}]]
  type = ${connectionInterface}
  enabled = yes
  ${remoteKey} = ${fields.reachableOn}
  target_port = ${fields.port}${sfx.identity}${sfx.netname}${sfx.netkey}`;
    }
    case "I2PInterface":
      return `[[${ctx.name}]]
  type = I2PInterface
  enabled = yes
  peers = ${fields.reachableOn}${sfx.identity}${sfx.netname}${sfx.netkey}`;
    case "RNodeInterface":
      return `[[${ctx.name}]]
  type = RNodeInterface
  enabled = yes
  port = 
  frequency = ${fields.frequency}
  bandwidth = ${fields.bandwidth}
  spreadingfactor = ${fields.sf}
  codingrate = ${fields.cr}
  txpower = ${sfx.netname}${sfx.netkey}${sfx.identity}`;
    case "WeaveInterface":
      return `[[${ctx.name}]]
  type = WeaveInterface
  enabled = yes
  port = ${sfx.netname}${sfx.netkey}${sfx.identity}`;
    case "KISSInterface":
      return `[[${ctx.name}]]
  type = KISSInterface
  enabled = yes
  port = 
  # Frequency: ${fields.frequency}
  # Bandwidth: ${fields.bandwidth}
  # Modulation: ${fields.modulation}${sfx.identity}${sfx.netname}${sfx.netkey}`;
    default:
      return "";
  }
}
async function parseDiscoveryAnnounce(appData, announcedIdentity, options = {}) {
  const requiredValue = options.requiredValue ?? DEFAULT_STAMP_VALUE;
  const networkIdentity = options.networkIdentity ?? null;
  const discoverySources = options.discoverySources ?? null;
  const hops = options.hops ?? 0;
  const backboneSupport = options.backboneSupport ?? true;
  if (discoverySources) {
    const ok = discoverySources.some(
      (h) => bytesEqual(h, announcedIdentity.identityHash)
    );
    if (!ok) {
      log(
        "Discovery",
        `Interface discovered from non-authorized network identity ${toHex(
          announcedIdentity.identityHash
        )}, ignoring`,
        LogLevel.DEBUG
      );
      return null;
    }
  }
  if (!appData || appData.length <= STAMP_SIZE + 1) return null;
  const flags = appData[0];
  let data = appData.subarray(1);
  const encrypted = (flags & FLAG_ENCRYPTED) !== 0;
  if (encrypted) {
    if (!networkIdentity) return null;
    try {
      const decrypted = await networkIdentity.decrypt(data);
      if (!decrypted) return null;
      data = /** @type {Uint8Array} */
      decrypted;
    } catch (e) {
      log(
        "Discovery",
        `Failed to decrypt discovery payload: ${e}`,
        LogLevel.DEBUG
      );
      return null;
    }
  }
  const stamp = data.subarray(data.length - STAMP_SIZE);
  const packed = data.subarray(0, data.length - STAMP_SIZE);
  const infohash = await Identity.fullHash(packed);
  const workblock = await stampWorkblock(infohash, WORKBLOCK_EXPAND_ROUNDS2);
  const value = await stampValue(workblock, stamp);
  const valid = await stampValid(stamp, requiredValue, workblock);
  if (!valid) {
    log(
      "Discovery",
      `Ignored discovered interface with insufficient stamp value ${value}`,
      LogLevel.DEBUG
    );
    return null;
  }
  try {
    const unpacked = MicroMsgPack.decode(packed);
    return await buildDiscoveredInfo(unpacked, announcedIdentity, {
      stamp,
      value,
      hops,
      received: nowSeconds(),
      backboneSupport
    });
  } catch (e) {
    log(
      "Discovery",
      `An error occurred while decoding discovered interface: ${e}`,
      LogLevel.DEBUG
    );
    return null;
  }
}
async function buildDiscoveredInfo(unpacked, announcedIdentity, meta) {
  const interfaceType = unpacked[String(INTERFACE_TYPE)];
  if (typeof interfaceType !== "string") {
    throw new Error("Missing INTERFACE_TYPE in discovery announce");
  }
  if (!ACCEPTED_INTERFACE_TYPES.includes(interfaceType)) {
    throw new Error(
      `Invalid interface type in announce data: ${interfaceType}`
    );
  }
  const name = sanitizeName(unpacked[String(NAME)]);
  if (typeof unpacked[String(TRANSPORT)] !== "boolean") {
    throw new Error("Invalid data in transport field of announce");
  }
  if (!isNullOrFloat(unpacked[String(LATITUDE)])) {
    throw new Error("Invalid data in latitude field of announce");
  }
  if (!isNullOrFloat(unpacked[String(LONGITUDE)])) {
    throw new Error("Invalid data in longitude field of announce");
  }
  if (!isNullOrFloat(unpacked[String(HEIGHT)])) {
    throw new Error("Invalid data in height field of announce");
  }
  const transportId = unpacked[String(TRANSPORT_ID)];
  if (!(transportId instanceof Uint8Array) || transportId.length !== 16) {
    throw new Error("Invalid data in transport_id field of announce");
  }
  if (unpacked[String(REACHABLE_ON)] !== void 0) {
    const reachable = unpacked[String(REACHABLE_ON)];
    if (typeof reachable !== "string" || !(isIpAddress(reachable) || isHostname(reachable))) {
      throw new Error("Invalid data in reachable_on field of announce");
    }
  }
  let operatorLxmfAddress = null;
  if (unpacked[String(OP_ADDR)] !== void 0) {
    const opAddr = unpacked[String(OP_ADDR)];
    if (opAddr !== null && !(opAddr instanceof Uint8Array)) {
      throw new Error(
        "Invalid data in operator LXMF address field of announce"
      );
    }
    if (opAddr instanceof Uint8Array) {
      if (opAddr.length !== Identity.TRUNCATED_HASH_LENGTH) {
        throw new Error(
          "Invalid data in operator LXMF address field of announce"
        );
      }
      operatorLxmfAddress = opAddr;
    }
  }
  const transportIdHex = toHex(transportId);
  const networkIdHex = toHex(announcedIdentity.identityHash);
  const displayName = name || `Discovered ${interfaceType}`;
  const info = {
    type: interfaceType,
    transport: unpacked[String(TRANSPORT)],
    name: displayName,
    received: meta.received,
    stamp: meta.stamp,
    value: meta.value,
    transportIdHex,
    networkIdHex,
    hops: meta.hops,
    latitude: unpacked[String(LATITUDE)] ?? null,
    longitude: unpacked[String(LONGITUDE)] ?? null,
    height: unpacked[String(HEIGHT)] ?? null
  };
  if (operatorLxmfAddress) {
    info.operator_lxmf_address = toHex(operatorLxmfAddress);
  }
  const rawNetname = unpacked[String(IFAC_NETNAME)];
  if (typeof rawNetname === "string" && rawNetname.length > 0) {
    info.ifac_netname = rawNetname;
  }
  const rawNetkey = unpacked[String(IFAC_NETKEY)];
  if (typeof rawNetkey === "string" && rawNetkey.length > 0) {
    info.ifac_netkey = rawNetkey;
  }
  const fields = {
    type: interfaceType,
    name: displayName,
    transportIdHex,
    ifacNetname: info.ifac_netname ?? null,
    ifacNetkey: info.ifac_netkey ?? null
  };
  switch (interfaceType) {
    case "BackboneInterface":
    case "TCPServerInterface": {
      info.reachable_on = unpacked[String(REACHABLE_ON)];
      info.port = unpacked[String(PORT)];
      fields.reachableOn = info.reachable_on;
      fields.port = info.port;
      info.config_entry = buildConfigEntry(fields, meta.backboneSupport);
      break;
    }
    case "I2PInterface": {
      info.reachable_on = unpacked[String(REACHABLE_ON)];
      fields.reachableOn = info.reachable_on;
      info.config_entry = buildConfigEntry(fields, meta.backboneSupport);
      break;
    }
    case "RNodeInterface": {
      info.frequency = unpacked[String(FREQUENCY)];
      info.bandwidth = unpacked[String(BANDWIDTH)];
      info.sf = unpacked[String(SPREADINGFACTOR)];
      info.cr = unpacked[String(CODINGRATE)];
      fields.frequency = info.frequency;
      fields.bandwidth = info.bandwidth;
      fields.sf = info.sf;
      fields.cr = info.cr;
      info.config_entry = buildConfigEntry(fields, meta.backboneSupport);
      break;
    }
    case "WeaveInterface": {
      info.frequency = unpacked[String(FREQUENCY)];
      info.bandwidth = unpacked[String(BANDWIDTH)];
      info.channel = unpacked[String(CHANNEL)];
      info.modulation = unpacked[String(MODULATION)];
      fields.frequency = info.frequency;
      fields.bandwidth = info.bandwidth;
      fields.channel = info.channel;
      fields.modulation = info.modulation;
      info.config_entry = buildConfigEntry(fields, meta.backboneSupport);
      break;
    }
    case "KISSInterface": {
      info.frequency = unpacked[String(FREQUENCY)];
      info.bandwidth = unpacked[String(BANDWIDTH)];
      info.modulation = unpacked[String(MODULATION)];
      fields.frequency = info.frequency;
      fields.bandwidth = info.bandwidth;
      fields.modulation = info.modulation;
      info.config_entry = buildConfigEntry(fields, meta.backboneSupport);
      break;
    }
    // TCPClientInterface: parsed but no config_entry / per-type fields.
    default:
      break;
  }
  const material = new TextEncoder().encode(transportIdHex + displayName);
  info.discoveryHashHex = toHex(await Identity.fullHash(material));
  return (
    /** @type {DiscoveredInterface} */
    info
  );
}
function isNullOrFloat(v) {
  return v === null || typeof v === "number";
}
async function discoveryInfoHash(infoMap) {
  const packed = MicroMsgPack.encode(infoMap);
  return Identity.fullHash(packed);
}
async function generateDiscoveryStamp(infoMap, stampCost = DEFAULT_STAMP_VALUE, expandRounds = WORKBLOCK_EXPAND_ROUNDS2) {
  const infohash = await discoveryInfoHash(infoMap);
  return generateStamp(infohash, stampCost, expandRounds);
}
async function buildDiscoveryAppData(infoMap, options = {}) {
  const {
    stampCost = DEFAULT_STAMP_VALUE,
    expandRounds = WORKBLOCK_EXPAND_ROUNDS2,
    encrypt = false,
    networkIdentity = null
  } = options;
  const packed = MicroMsgPack.encode(infoMap);
  const result = await generateDiscoveryStamp(infoMap, stampCost, expandRounds);
  if (!result) {
    throw new Error("Could not generate discovery stamp");
  }
  const [stamp] = result;
  let payload = concatBytes(packed, stamp);
  let flags = 0;
  if (encrypt) {
    if (!networkIdentity) {
      throw new Error("encrypt=true requires a networkIdentity");
    }
    flags |= FLAG_ENCRYPTED;
    payload = await networkIdentity.encrypt(payload);
  }
  const out = new Uint8Array(payload.length + 1);
  out[0] = flags;
  out.set(payload, 1);
  return out;
}
var InterfaceDiscovery = class extends EventTarget {
  /** @type {Promise<void>} Serializes announce processing. */
  _chain = Promise.resolve();
  /** @type {Map<string, DiscoveredInterface>} */
  _store = /* @__PURE__ */ new Map();
  /** @type {Uint8Array|null} */
  _aspectNameHash = null;
  /** @type {((event: Event) => void) | null} */
  _announceListener = null;
  /** @type {boolean} */
  _started = false;
  /**
   * The in-flight `start()` promise, set by the `Reticulum` constructor when
   * discovery is auto-started. Await this to ensure the listener is attached.
   * @type {Promise<void>|null}
   */
  startPromise = null;
  /**
   * @param {InterfaceDiscoveryOptions} options
   */
  constructor(options) {
    super();
    if (!options?.transport) {
      throw new Error("InterfaceDiscovery requires a transport instance");
    }
    this.transport = options.transport;
    this.requiredValue = options.requiredValue ?? DEFAULT_STAMP_VALUE;
    this.storageAdapter = options.storageAdapter ?? null;
    this.storageNamespace = options.storageNamespace ?? "discovery";
    this.discoverySources = options.discoverySources ?? null;
    this.networkIdentity = options.networkIdentity ?? null;
    this.backboneSupport = options.backboneSupport ?? true;
  }
  /**
   * Precomputes the aspect name-hash, hydrates the store from the storage
   * adapter, and attaches the transport `"announce"` listener. Idempotent.
   * @returns {Promise<void>}
   */
  async start() {
    if (this._started) return;
    this._started = true;
    this._aspectNameHash = await aspectNameHash(ASPECT);
    await this._hydrate();
    this._announceListener = (event) => {
      this._onAnnounce(
        /** @type {CustomEvent} */
        event
      );
    };
    this.transport.addEventListener("announce", this._announceListener);
    log("Discovery", "Interface discovery listener started", LogLevel.NOTICE);
  }
  /**
   * Detaches the announce listener (no-op if not started). Persisted records
   * already written through are retained.
   */
  stop() {
    if (!this._started) return;
    this._started = false;
    if (this._announceListener) {
      this.transport.removeEventListener("announce", this._announceListener);
      this._announceListener = null;
    }
    log("Discovery", "Interface discovery listener stopped", LogLevel.NOTICE);
  }
  /**
   * Handles a transport `"announce"` event: aspect-filters, parses, persists,
   * and dispatches `"discovered"`. Processing is serialized through
   * {@link InterfaceDiscovery#_chain} so concurrent announces for the same
   * interface can't lose `heard_count` increments.
   * @param {CustomEvent} event
   */
  _onAnnounce(event) {
    this._chain = this._chain.then(() => this._processAnnounce(event)).catch(
      (e) => log("Discovery", `Error processing announce: ${e}`, LogLevel.ERROR)
    );
  }
  /**
   * The actual (async) announce processing, run one at a time per instance.
   * @param {CustomEvent} event
   * @returns {Promise<void>}
   */
  async _processAnnounce(event) {
    const detail = event.detail ?? {};
    if (!detail.nameHash || !this._aspectNameHash) return;
    if (!bytesEqual(detail.nameHash, this._aspectNameHash)) return;
    const hops = this.transport.hopsTo(detail.destinationHash) ?? 0;
    const info = await parseDiscoveryAnnounce(detail.appData, detail.identity, {
      requiredValue: this.requiredValue,
      networkIdentity: this.networkIdentity,
      discoverySources: this.discoverySources,
      hops,
      backboneSupport: this.backboneSupport
    });
    if (!info) return;
    if (!DISCOVERABLE_TYPES.includes(info.type)) return;
    await this._remember(info);
    this.dispatchEvent(
      new CustomEvent("discovered", { detail: { info: this._clone(info) } })
    );
  }
  /**
   * Upserts a discovery into the store (and storage adapter), bumping
   * `heard_count` on repeats and refreshing `last_heard`.
   * @param {DiscoveredInterface} info
   * @returns {Promise<void>}
   */
  async _remember(info) {
    const key = info.discoveryHashHex;
    const existing = this._store.get(key);
    if (!existing) {
      info.discovered = info.received;
      info.last_heard = info.received;
      info.heard_count = 0;
    } else {
      info.discovered = existing.discovered ?? info.received;
      info.last_heard = info.received;
      info.heard_count = (existing.heard_count ?? 0) + 1;
    }
    this._store.set(key, info);
    await this._persist(key, info);
  }
  /**
   * Returns the persisted discovered-interface list.
   *
   * Records past {@link THRESHOLD_REMOVE}, or whose type/`reachable_on` is no
   * longer valid, are pruned (from memory and the storage adapter). Remaining
   * records get a computed `status`/`status_code` and are sorted by freshness,
   * stamp value, then last-heard.
   *
   * @param {Object} [filter]
   * @param {boolean} [filter.onlyAvailable] Only `available` records.
   * @param {boolean} [filter.onlyTransport] Only records where `transport` is true.
   * @returns {Promise<DiscoveredInterface[]>}
   */
  async listDiscoveredInterfaces(filter = {}) {
    const { onlyAvailable = false, onlyTransport = false } = filter;
    const now = nowSeconds();
    const out = [];
    const stale = [];
    for (const [key, info] of this._store) {
      const lastHeard = info.last_heard ?? info.received ?? now;
      const heardDelta = now - lastHeard;
      if (info.ifac_netname === "None") delete info.ifac_netname;
      if (info.ifac_netkey === "None") delete info.ifac_netkey;
      let shouldRemove = false;
      if (heardDelta > THRESHOLD_REMOVE) shouldRemove = true;
      else if (this.discoverySources && (!info.networkIdHex || !this.discoverySources.some(
        (h) => bytesEqual(h, fromHex2(info.networkIdHex))
      ))) {
        shouldRemove = true;
      } else if (!DISCOVERABLE_TYPES.includes(info.type)) {
        shouldRemove = true;
      } else if (info.reachable_on !== void 0 && !(isIpAddress(info.reachable_on) || isHostname(info.reachable_on))) {
        shouldRemove = true;
      }
      if (shouldRemove) {
        stale.push(key);
        continue;
      }
      let status;
      if (heardDelta > THRESHOLD_STALE) status = "stale";
      else if (heardDelta > THRESHOLD_UNKNOWN) status = "unknown";
      else status = "available";
      if (onlyAvailable && status !== "available") continue;
      if (onlyTransport && !info.transport) continue;
      const record = this._clone(info);
      record.status = status;
      record.status_code = statusCode(status);
      out.push(record);
    }
    for (const key of stale) {
      this._store.delete(key);
      await this._delete(key);
    }
    out.sort(
      (a, b) => (b.status_code ?? 0) - (a.status_code ?? 0) || (b.value ?? 0) - (a.value ?? 0) || (b.last_heard ?? 0) - (a.last_heard ?? 0)
    );
    return out;
  }
  /**
   * Hydrates the in-memory store from the storage adapter (if any).
   * @returns {Promise<void>}
   */
  async _hydrate() {
    const adapter = this._kvAdapter();
    if (!adapter) return;
    try {
      const keys = await adapter.keys(this.storageNamespace);
      for (const key of keys) {
        const bytes = await adapter.get(this.storageNamespace, key);
        if (!bytes) continue;
        try {
          const info = this._deserialize(bytes);
          if (info) this._store.set(key, info);
        } catch (e) {
          log(
            "Discovery",
            `Error loading discovered interface ${key}: ${e}`,
            LogLevel.WARNING
          );
        }
      }
    } catch (e) {
      log(
        "Discovery",
        `Error hydrating discovered interfaces: ${e}`,
        LogLevel.WARNING
      );
    }
  }
  /**
   * Persists a record via the storage adapter.
   * @param {string} key
   * @param {DiscoveredInterface} info
   * @returns {Promise<void>}
   */
  async _persist(key, info) {
    const adapter = this._kvAdapter();
    if (!adapter) return;
    try {
      await adapter.set(this.storageNamespace, key, this._serialize(info));
    } catch (e) {
      log(
        "Discovery",
        `Error persisting discovered interface ${key}: ${e}`,
        LogLevel.ERROR
      );
    }
  }
  /**
   * Deletes a record via the storage adapter.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async _delete(key) {
    const adapter = this._kvAdapter();
    if (!adapter) return;
    try {
      await adapter.delete(this.storageNamespace, key);
    } catch (e) {
      log(
        "Discovery",
        `Error deleting discovered interface ${key}: ${e}`,
        LogLevel.WARNING
      );
    }
  }
  /**
   * Returns the adapter only if it implements the KV interface (#16).
   * @returns {{get: Function, set: Function, delete: Function, keys: Function}|null}
   */
  _kvAdapter() {
    const a = this.storageAdapter;
    if (a && typeof a.get === "function" && typeof a.set === "function" && typeof a.delete === "function" && typeof a.keys === "function") {
      return (
        /** @type {any} */
        a
      );
    }
    return null;
  }
  /**
   * @param {DiscoveredInterface} info
   * @returns {DiscoveredInterface}
   */
  _clone(info) {
    return (
      /** @type {DiscoveredInterface} */
      structuredCloneSafe(info)
    );
  }
  /**
   * @param {DiscoveredInterface} info
   * @returns {Uint8Array}
   */
  _serialize(info) {
    return MicroMsgPack.encode(stripForStorage(info));
  }
  /**
   * @param {Uint8Array} bytes
   * @returns {DiscoveredInterface|null}
   */
  _deserialize(bytes) {
    const obj = MicroMsgPack.decode(bytes);
    if (!obj || typeof obj !== "object") return null;
    return (
      /** @type {DiscoveredInterface} */
      obj
    );
  }
};
function statusCode(status) {
  switch (status) {
    case "available":
      return STATUS_AVAILABLE;
    case "unknown":
      return STATUS_UNKNOWN;
    case "stale":
      return STATUS_STALE;
    default:
      return 0;
  }
}
function stripForStorage(info) {
  const out = {};
  for (const [k, v] of Object.entries(info)) {
    if (k === "stamp") continue;
    out[k] = v instanceof Uint8Array ? new Uint8Array(v) : v;
  }
  return out;
}
function structuredCloneSafe(value) {
  return structuredClone(value);
}
function fromHex2(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// node_modules/@reticulum/core/src/transport/identity-cache.js
var CORE_INSTANCE_TOKEN = {};
var IdentityCache = class {
  /**
   * @param {Object} [options]
   * @param {Map<string, import("../core/destination.js").KnownDestination>} [options.knownDestinations]
   *   Defaults to a fresh map.
   * @param {Map<string, {ratchet: Uint8Array, received: number}>} [options.knownRatchets]
   *   Defaults to a fresh map.
   * @param {Map<string, import("../core/packet_receipt.js").PacketReceipt>} [options.receipts]
   *   Defaults to a fresh map.
   * @param {object} [options.instanceToken] Identity token of the module
   *   copy that created this cache; defaults to {@link CORE_INSTANCE_TOKEN}
   *   of this copy.
   */
  constructor({
    knownDestinations,
    knownRatchets,
    receipts,
    instanceToken
  } = {}) {
    this.knownDestinations = knownDestinations ?? /* @__PURE__ */ new Map();
    this.knownRatchets = knownRatchets ?? /* @__PURE__ */ new Map();
    this.receipts = receipts ?? /* @__PURE__ */ new Map();
    this.instanceToken = instanceToken ?? CORE_INSTANCE_TOKEN;
  }
};
var _warnedPairs = null;
function warnIfFragmented(packageName, dependentToken, coreToken) {
  if (!coreToken || dependentToken === coreToken) return false;
  _warnedPairs ??= /* @__PURE__ */ new Set();
  const key = coreToken;
  if (_warnedPairs.has(key)) return true;
  _warnedPairs.add(key);
  log(
    packageName,
    `This package and the provided Reticulum instance come from two physical copies of @reticulum/core (split-brain install layout \u2014 e.g. a stale hoisted copy blocking npm dedupe). Shared state is safe (it travels through the Reticulum instance), but the process runs duplicate protocol code and cross-copy instanceof checks will fail. Reinstall with a clean tree to resolve.`,
    LogLevel.WARNING
  );
  return true;
}

// node_modules/@reticulum/core/src/transport/router.js
var PATH_EXPIRY_MS = 60 * 60 * 24 * 7 * 1e3;
var MAX_RANDOM_BLOBS = 64;
var PathState = {
  UNKNOWN: 0,
  UNRESPONSIVE: 1,
  RESPONSIVE: 2
};
function emissionTime(randomBlob) {
  if (!randomBlob || randomBlob.length < 10) return 0;
  let t = 0;
  for (let i = 5; i < 10; i++) t = t * 256 + randomBlob[i];
  return t;
}
function timebaseFromBlobs(blobs) {
  let t = 0;
  for (const b of blobs) {
    const e = emissionTime(b);
    if (e > t) t = e;
  }
  return t;
}
var RoutingTable = class {
  constructor() {
    this.routes = /* @__PURE__ */ new Map();
    this.interfaceResolver = null;
  }
  /**
   * Ingests a validated announce into the path table.
   *
   * Acceptance rules (Transport.py ~1759–1830):
   *   - a `random_blob` already recorded for this destination is always rejected;
   *   - unknown destination → add;
   *   - `hops <= existing.hops` → add only if emitted more recently than the
   *     stored timebase (shorter-or-equal path that is also newer wins);
   *   - `hops > existing.hops` → add only if the stored path has expired, or the
   *     new announce was emitted more recently than the stored one.
   *
   * @param {Uint8Array} destinationHash
   * @param {Object} entry
   * @param {Uint8Array} entry.nextHop
   * @param {number} entry.hops
   * @param {import("../interfaces/base.js").Interface|null} entry.viaInterface
   * @param {Uint8Array} entry.randomBlob 10-byte announce `random_hash`.
   * @param {number} [entry.expires] ms epoch; defaults to now + PATH_EXPIRY_MS.
   *   Stored as the ingestion `expires`; used only for the longer-hop
   *   replacement decision, never for culling.
   * @param {number} [entry.timestamp] ms epoch of last use; defaults to now.
   *   The cull basis. Overridden by the persistor on hydration to restore the
   *   real last-used time.
   * @returns {boolean} `true` if the route was added or replaced.
   */
  addOrUpdateRoute(destinationHash, entry) {
    const destKey = toHex(destinationHash);
    const existing = this.routes.get(destKey);
    const { randomBlob } = entry;
    const emitted = emissionTime(randomBlob);
    const expires = entry.expires ?? Date.now() + PATH_EXPIRY_MS;
    const isReplay = Boolean(
      existing && randomBlob && existing.randomBlobs.some((b) => bytesEqual(b, randomBlob))
    );
    let shouldAdd = false;
    let preserveState = false;
    if (!existing) {
      shouldAdd = true;
    } else {
      const timebase = timebaseFromBlobs(existing.randomBlobs);
      if (entry.hops <= existing.hops) {
        if (emitted > timebase) {
          shouldAdd = true;
        } else if (emitted === timebase) {
          const currentGravity = existing.interface?.gravity ?? null;
          const announceGravity = entry.viaInterface?.gravity ?? null;
          if (currentGravity !== null && announceGravity !== null && announceGravity > currentGravity) {
            shouldAdd = true;
            preserveState = true;
          }
        }
      } else {
        const now = Date.now();
        if (now >= existing.expires) {
          shouldAdd = !isReplay;
        } else if (emitted > timebase) {
          shouldAdd = true;
        } else if (emitted === timebase && existing.state === PathState.UNRESPONSIVE) {
          shouldAdd = true;
          preserveState = true;
        }
      }
    }
    if (!shouldAdd) return false;
    const randomBlobs = existing ? existing.randomBlobs.slice() : [];
    if (randomBlob && !isReplay) {
      randomBlobs.push(randomBlob.slice());
      while (randomBlobs.length > MAX_RANDOM_BLOBS) randomBlobs.shift();
    }
    const state = existing && preserveState ? existing.state : PathState.UNKNOWN;
    this.routes.set(destKey, {
      interface: entry.viaInterface,
      interfaceName: entry.viaInterface?.name ?? null,
      nextHop: entry.nextHop,
      hops: entry.hops,
      timestamp: entry.timestamp ?? Date.now(),
      expires,
      randomBlobs,
      state
    });
    return true;
  }
  /**
   * Sets the liveness state of a known path (`Transport.mark_path_*`).
   * @param {Uint8Array} destinationHash
   * @param {number} state A {@link PathState}.
   * @returns {boolean} `true` if a route was updated.
   */
  markState(destinationHash, state) {
    const route = this.routes.get(toHex(destinationHash));
    if (!route) return false;
    route.state = state;
    return true;
  }
  /**
   * The liveness state of a path, defaulting to {@link PathState.UNKNOWN}.
   * @param {Uint8Array} destinationHash
   * @returns {number}
   */
  getState(destinationHash) {
    return this.routes.get(toHex(destinationHash))?.state ?? PathState.UNKNOWN;
  }
  /**
   * Whether the path was marked unresponsive by a failed proof/link attempt
   * (`Transport.path_is_unresponsive`).
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  pathIsUnresponsive(destinationHash) {
    return this.getState(destinationHash) === PathState.UNRESPONSIVE;
  }
  /**
   * Forgets a path immediately. The reference implementations mark the entry
   * for lazy culling; with no transport-node cull job we delete outright so
   * `hasPath` reflects the expiry at once.
   * @param {Uint8Array} destinationHash
   * @returns {boolean} `true` if a route was removed.
   */
  expireRoute(destinationHash) {
    return this.routes.delete(toHex(destinationHash));
  }
  /**
   * Rewrites the hop count of a known path (link path-rebalance at the
   * terminus). Leaves the next hop / interface / state untouched — only
   * corrects the distance estimate after a link handshake reveals the real
   * path length.
   * @param {Uint8Array} destinationHash
   * @param {number} hops
   * @returns {boolean} `true` if a route was updated.
   */
  setHops(destinationHash, hops) {
    const route = this.routes.get(toHex(destinationHash));
    if (!route) return false;
    route.hops = hops;
    return true;
  }
  /**
   * Looks up the best-known route for a destination hash.
   *
   * Two lazy behaviours, both evaluated on access (a leaf has no periodic
   * tables-cull job, unlike the reference implementations' transport jobs):
   *   - **Cull on last-used**: drops the route once it has been *unused* for
   *     {@link PATH_EXPIRY_MS} (`route.timestamp + PATH_EXPIRY_MS`). The frozen ingestion
   *     `expires` is intentionally **not** used here — it is for the
   *     longer-hop replacement decision only, and a path in active use must not
   *     be culled just because its announce is old.
   *   - **Interface re-association**: a route hydrated from storage has
   *     `interface: null`; resolve the live reference by name (via
   *     {@link RoutingTable#interfaceResolver}) so egress and bitrate-adaptive
   *     timeouts use the correct medium.
   *
   * @param {Uint8Array} destinationHash
   * @returns {Route|undefined}
   */
  getRoute(destinationHash) {
    const destKey = toHex(destinationHash);
    const route = this.routes.get(destKey);
    if (!route) return void 0;
    if (Date.now() >= route.timestamp + PATH_EXPIRY_MS) {
      this.routes.delete(destKey);
      log("Router", `Expired route to ${destKey}`, LogLevel.DEBUG);
      return void 0;
    }
    if (!route.interface && route.interfaceName && this.interfaceResolver) {
      const iface = this.interfaceResolver(route.interfaceName);
      if (iface) {
        route.interface = iface;
        log(
          "Router",
          `Re-associated path to ${destKey} via interface ${route.interfaceName}`,
          LogLevel.DEBUG
        );
      }
    }
    return route;
  }
  /**
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  hasRoute(destinationHash) {
    return this.getRoute(destinationHash) !== void 0;
  }
  /**
   * Called when a physical interface disconnects: drops every route learned
   * through it so subsequent sends seek an alternative path (failover).
   *
   * @param {import("../interfaces/base.js").Interface} failedInterface
   */
  dropInterface(failedInterface) {
    let droppedCount = 0;
    for (const [destKey, route] of this.routes.entries()) {
      if (route.interface === failedInterface) {
        this.routes.delete(destKey);
        droppedCount++;
      }
    }
    log("Router", `Dropped ${droppedCount} routes due to interface failure.`);
  }
};

// node_modules/@reticulum/core/src/transport/transport.js
var MTU = 500;
var DEFAULT_PER_HOP_TIMEOUT_SECS = 6;
var MINIMUM_BITRATE = 5;
var UnknownIdentityError = class extends Error {
  /**
   * @param {Uint8Array} destinationHash
   * @param {string} [message]
   */
  constructor(destinationHash, message) {
    const hex = toHex(destinationHash);
    super(message || `Cannot deliver: identity for ${hex} is unknown`);
    this.name = "UnknownIdentityError";
    this.destinationHash = destinationHash;
  }
};
var TransportCore = class _TransportCore extends EventTarget {
  /**
   * The well-known `path?` request destination app name (§7.1). Every node
   * resolves its dest_hash identically: `6b9f66014d9853faab220fba47d02761`.
   */
  static PATH_REQUEST_APP_NAME = "rnstransport.path.request";
  /**
   * Creates an empty transport core with no interfaces, links or routes.
   * @param {Object} [options]
   * @param {import("./identity-cache.js").IdentityCache} [options.caches] -
   *   Instance-scoped identity/ratchet/receipt caches (work doc #37). Defaults
   *   to a cache aliasing the deprecated class-level static maps, so behavior
   *   is unchanged for existing callers and the static APIs keep observing
   *   the same state during migration. Pass a fresh `IdentityCache` for hard
   *   isolation between `Reticulum` instances in one process.
   */
  constructor({ caches } = {}) {
    super();
    this.caches = caches ?? new IdentityCache();
    this.interfaces = /* @__PURE__ */ new Set();
    this.localDestinations = /* @__PURE__ */ new Map();
    this.activeLinks = /* @__PURE__ */ new Map();
    this.routingTable = new RoutingTable();
    this.routingTable.interfaceResolver = (name) => {
      for (const iface of this.interfaces) {
        if (iface.name === name) return iface;
      }
      return null;
    };
    this.defaultInterface = null;
    this.persistor = null;
    this.discoveryPrTags = /* @__PURE__ */ new Set();
    this.maxPrTags = 32e3;
    this.packetHashlist = /* @__PURE__ */ new Set();
    this.packetHashlistPrev = /* @__PURE__ */ new Set();
    this.hashlistMaxsize = 1e6;
    this.pathRequests = /* @__PURE__ */ new Map();
    this.inflightPathRequests = /* @__PURE__ */ new Map();
    this._inflightIdentitySolicitations = /* @__PURE__ */ new Map();
    this._sweepTimer = null;
  }
  /**
   * Attaches an interface that emits "packet" events.
   * @param {import("../interfaces/base.js").Interface} iface
   * @param {boolean} isDefault
   */
  addInterface(iface, isDefault = false) {
    this.interfaces.add(iface);
    if (isDefault) this.defaultInterface = iface;
    const refreshPacketWriter = () => {
      let writable = null;
      try {
        writable = iface.writable;
      } catch (_e) {
      }
      if (writable && !iface._packetWriter) {
        iface._packetWriter = writable.getWriter();
      }
    };
    refreshPacketWriter();
    iface.addEventListener("connected", refreshPacketWriter);
    iface.addEventListener("packet", (event) => {
      return this._routeIncomingPacket(event.detail.packet, iface);
    });
    iface.addEventListener("closed", () => this.removeInterface(iface));
    iface.addEventListener(
      "error",
      (e) => log(
        "Transport",
        `[!] Interface ${iface.name} error: ${e.detail.message}`,
        LogLevel.ERROR
      )
    );
    if (typeof iface.attachTransport === "function") {
      iface.attachTransport(this);
    }
    this.prioritizeInterfaces();
    log("Transport", `[+] Transport bound to interface: ${iface.name}`);
  }
  /**
   * Detaches an interface, releases its writer and purges its routes.
   * @param {import("../interfaces/base.js").Interface} iface
   */
  removeInterface(iface) {
    if (iface._packetWriter) {
      iface._packetWriter.releaseLock();
    }
    this.interfaces.delete(iface);
    this.routingTable.dropInterface(iface);
    if (this.defaultInterface === iface) this.defaultInterface = null;
    this.prioritizeInterfaces();
    log("Transport", `[-] Interface removed: ${iface.name}`, LogLevel.WARNING);
  }
  /**
   * Re-sorts the interface set by nominal bitrate, highest first (matching
   * `Transport::prioritize_interfaces` in microReticulum).
   *
   * Because outbound routing is path-table driven (a packet goes out the
   * interface its path was learned through), this sort does **not** change
   * *which* interface carries a given routed packet. It governs **iteration
   * order**: PLAIN/GROUP broadcasts and any "first available" walk now visit
   * higher-bitrate interfaces first. The genuine per-bitrate behaviours
   * (link timeouts, announce rate limiting) build on this and are tracked as
   * Phase 2 of work doc #20.
   *
   * Interfaces with a missing/non-numeric/zero bitrate sort last instead of
   * aborting the sort, so a single misbehaving interface cannot leave the
   * whole set unsorted.
   */
  prioritizeInterfaces() {
    try {
      const ranked = [...this.interfaces].sort((a, b) => {
        const ba = typeof a?.bitrate === "number" && a.bitrate > 0 ? a.bitrate : -Infinity;
        const bb = typeof b?.bitrate === "number" && b.bitrate > 0 ? b.bitrate : -Infinity;
        return bb - ba;
      });
      this.interfaces = new Set(ranked);
    } catch (e) {
      log(
        "Transport",
        `Could not prioritize interfaces according to bitrate. The contained exception was: ${e}`,
        LogLevel.ERROR
      );
    }
  }
  /**
   * Registers an active link keyed by its destination hash.
   * @param {Uint8Array} destinationHash
   * @param {import("./link.js").Link} link
   */
  addLink(destinationHash, link) {
    const hex = toHex(destinationHash);
    log("Transport", `Registering link ${hex}`);
    this.activeLinks.set(hex, link);
  }
  /**
   * Removes a previously registered link.
   * @param {Uint8Array} destinationHash
   */
  removeLink(destinationHash) {
    const hex = toHex(destinationHash);
    this.activeLinks.delete(hex);
    log("Transport", `[-] Link closed for ${hex}`);
  }
  /**
   * Binds a local destination so inbound packets for it are delivered locally.
   * @param {import("../core/destination.js").Destination} destination
   */
  bindLocalDestination(destination) {
    const hash = destination.destinationHash;
    if (!hash) return;
    const destHex = toHex(hash);
    log("ROUTER", `Binding local destination: ${destHex}`);
    this.localDestinations.set(destHex, destination);
  }
  /**
   * Removes a previously bound local destination.
   * @param {import("../core/destination.js").Destination} destination
   */
  unbindLocalDestination(destination) {
    const hash = destination.destinationHash;
    if (!hash) return;
    const destHex = toHex(hash);
    this.localDestinations.delete(destHex);
    log("Transport", `[-] Unbinding local destination: ${destHex}`);
  }
  // ---------------------------------------------------------------------
  // Instance-scoped caches (work doc #37)
  // ---------------------------------------------------------------------
  /**
   * Caches or refreshes a learned peer identity (the former
   * `Destination.remember`, now instance-scoped). Dependent packages should call this through the
   * `Reticulum` instance (`rns.transport.rememberIdentity(…)`) instead of the
   * deprecated static so a fragmented install (two physical core copies)
   * still shares one state.
   * @param {Uint8Array} packetHash
   * @param {Uint8Array} destinationHash
   * @param {Uint8Array} publicKey
   * @param {Uint8Array|null} [appData]
   * @returns {Promise<void>}
   */
  async rememberIdentity(packetHash, destinationHash, publicKey, appData) {
    await Destination.rememberInto(
      this.caches.knownDestinations,
      packetHash,
      destinationHash,
      publicKey,
      appData
    );
  }
  /**
   * Recalls a learned identity by destination or identity hash
   * (the former `Destination.recall`, now instance-scoped).
   * @param {Uint8Array} targetHash
   * @param {boolean} [fromIdentityHash] Match on identity hash instead of
   *   destination hash.
   * @returns {Promise<import("../core/identity.js").Identity|null>}
   */
  async recallIdentity(targetHash, fromIdentityHash = false) {
    if (this.persistor?.loadPromise && !this.persistor.loaded) {
      await this.persistor.loadPromise;
    }
    return Destination.recallFrom(
      this.caches.knownDestinations,
      targetHash,
      fromIdentityHash
    );
  }
  /**
   * Recalls a learned identity by destination hash. If the identity is not yet
   * known, it sends a path request and awaits the destination's announce event
   * up to timeoutMs before attempting to recall again.
   *
   * @param {Uint8Array} destinationHash
   * @param {number} [timeoutMs=30000]
   * @returns {Promise<import("../core/identity.js").Identity>}
   * @throws {UnknownIdentityError} when the identity is not known and cannot be solicited within timeout.
   */
  async recallOrSolicitIdentity(destinationHash, timeoutMs = 3e4) {
    if (this.persistor?.loadPromise && !this.persistor.loaded) {
      await this.persistor.loadPromise;
    }
    const identity = await this.recallIdentity(destinationHash);
    if (identity) return identity;
    const destHex = toHex(destinationHash);
    const existing = this._inflightIdentitySolicitations.get(destHex);
    if (existing) {
      return await existing;
    }
    const solicitationPromise = (async () => {
      let foundIdentity = null;
      let cleanup = () => {
      };
      const announcePromise = new Promise((resolve) => {
        let settled = false;
        let timer = null;
        cleanup = () => {
          if (timer) clearTimeout(timer);
          this.removeEventListener("announce", onAnnounce);
        };
        const onAnnounce = (ev) => {
          const dh = ev?.detail?.destinationHash;
          if (dh && bytesEqual(dh, destinationHash)) {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(ev.detail.identity ?? null);
          }
        };
        this.addEventListener("announce", onAnnounce);
        if (timeoutMs > 0) {
          timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(null);
          }, timeoutMs);
        }
      });
      try {
        await this.requestPath(destinationHash);
      } catch {
      }
      foundIdentity = await announcePromise;
      if (!foundIdentity) {
        foundIdentity = await this.recallIdentity(destinationHash);
      }
      if (!foundIdentity) {
        throw new UnknownIdentityError(destinationHash);
      }
      return foundIdentity;
    })();
    this._inflightIdentitySolicitations.set(destHex, solicitationPromise);
    try {
      return await solicitationPromise;
    } finally {
      this._inflightIdentitySolicitations.delete(destHex);
    }
  }
  /**
   * Caches an announced ratchet public key for a destination
   * (the former `Destination.rememberRatchet`, now instance-scoped).
   * @param {Uint8Array} destinationHash
   * @param {Uint8Array} ratchet
   * @returns {void}
   */
  rememberRatchet(destinationHash, ratchet) {
    Destination.rememberRatchetInto(
      this.caches.knownRatchets,
      destinationHash,
      ratchet
    );
  }
  /**
   * Recalls the newest non-expired ratchet public key for a destination
   * (the former `Destination.recallRatchet`, now instance-scoped), or
   * `null`.
   * @param {Uint8Array} destinationHash
   * @returns {Uint8Array|null}
   */
  recallRatchet(destinationHash) {
    return Destination.recallRatchetFrom(
      this.caches.knownRatchets,
      destinationHash
    );
  }
  /**
   * Registers an outstanding proof receipt so an inbound PROOF can find it
   * (the former `PacketReceipt.track`, now instance-scoped).
   * @param {import("../core/packet_receipt.js").PacketReceipt} receipt
   * @returns {void}
   */
  trackReceipt(receipt) {
    receipt.owner = this;
    this.caches.receipts.set(toHex(receipt.truncatedHash), receipt);
  }
  /**
   * Looks up an outstanding receipt by the 16-byte `dest_hash` of an inbound
   * PROOF (the former `PacketReceipt.find`, now instance-scoped).
   * @param {Uint8Array} proofDestHash
   * @returns {import("../core/packet_receipt.js").PacketReceipt|null}
   */
  findReceipt(proofDestHash) {
    return this.caches.receipts.get(toHex(proofDestHash)) ?? null;
  }
  /**
   * Dispatches an inbound packet to the matching local destination or link,
   * or drops it if no route exists.
   * @param {import("../core/packet.js").Packet} packet
   * @param {import("../interfaces/base.js").Interface} receivingInterface
   * @private
   */
  async _routeIncomingPacket(packet, receivingInterface) {
    packet.hops = (packet.hops ?? 0) + 1;
    log(
      "ROUTER",
      `Processing packet type ${getEnumName(PacketType, packet.packetType)} (ctx ${getEnumName(ContextType, packet.contextByte)}) for ${toHex(packet.destinationHash)}`
    );
    const destHex = toHex(packet.destinationHash);
    if (packet.packetType === PacketType.ANNOUNCE) {
      await this._handleAnnounce(packet, receivingInterface);
      return;
    }
    if (await this._isDuplicate(packet)) {
      log(
        "Transport",
        `Dropped duplicate packet for ${destHex}`,
        LogLevel.DEBUG
      );
      return receivingInterface?.packetFilterHit?.();
    }
    if (packet.packetType === PacketType.PROOF && packet.contextByte === ContextType.NONE && !this.activeLinks.has(destHex)) {
      await this._handleProof(packet);
      return;
    }
    if (packet.packetType === PacketType.DATA && bytesEqual(packet.destinationHash, await this._pathRequestDestHash())) {
      await this._handlePathRequest(packet, receivingInterface);
      return;
    }
    if (this.localDestinations.has(destHex)) {
      log("Transport", `Packet to local destination ${destHex}`);
      const destination = this.localDestinations.get(destHex);
      await destination.receive(packet, receivingInterface);
      return;
    }
    if (this.activeLinks.has(destHex)) {
      log("Transport", `Packet to LINK ${destHex}`);
      const link = this.activeLinks.get(destHex);
      await link.receive(packet);
      return;
    }
    log(
      "ROUTER",
      `Packet for ${destHex} is not for us. Dropping.`,
      LogLevel.DEBUG
    );
    log(
      "ROUTER",
      `Registered local destinations: ${Array.from(this.localDestinations.keys()).join(", ")}`,
      LogLevel.DEBUG
    );
  }
  /**
   * Validates and ingests an ANNOUNCE packet (SPEC.md §4.5).
   *
   * Delegates the body parse, Ed25519 signature verification and destination
   * hash recomputation to {@link Identity.validateAnnounce} (steps 1-3), then
   * performs the public-key collision rejection (step 4) and caches the
   * identity / app_data / ratchet (step 6). Forged or malformed announces are
   * dropped silently; a validated announce is also dispatched as an `announce`
   * event for application-layer handlers (§4.4 name_hash filtering, contact
   * list population, etc.).
   *
   * @param {import("../core/packet.js").Packet} packet
   * @param {import("../interfaces/base.js").Interface|null} receivingInterface
   *   Interface the announce arrived on; recorded as the outbound interface
   *   for the learned path.
   * @private
   */
  async _handleAnnounce(packet, receivingInterface) {
    const destHex = toHex(packet.destinationHash);
    if ((packet.raw?.length ?? 0) > MTU) {
      return receivingInterface?.protocolViolation?.(
        `Excessive announce packet frame size of ${packet.raw?.length} bytes`
      );
    }
    if (this.localDestinations.has(destHex)) {
      log(
        "Transport",
        `Ignoring ANNOUNCE for local destination ${destHex}`,
        LogLevel.DEBUG
      );
      return;
    }
    const result = await Identity.validateAnnounce(
      packet.destinationHash,
      packet.contextFlag,
      packet.payload
    );
    if (!result) {
      return receivingInterface?.protocolViolation?.(
        `Invalid announce signature for ${destHex}`
      );
    }
    receivingInterface?.receivedAnnounce?.();
    if (!this.routingTable.hasRoute(packet.destinationHash)) {
      if (!this.inflightPathRequests.has(destHex) && receivingInterface?.shouldIngressLimit?.()) {
        receivingInterface.holdAnnounce(packet);
        this._ensureSweep();
        return;
      }
    }
    const { identity, nameHash, randomHash, ratchet, appData } = result;
    const existing = this.caches.knownDestinations.get(destHex);
    if (existing && !bytesEqual(existing.publicKey, identity.publicKey)) {
      log(
        "Transport",
        `CRITICAL: public-key collision for ${destHex} \u2014 rejecting announce`,
        LogLevel.ERROR
      );
      return;
    }
    const packetHash = await packet.getHash();
    await this.rememberIdentity(
      packetHash,
      packet.destinationHash,
      identity.publicKey,
      appData
    );
    if (ratchet) {
      this.rememberRatchet(packet.destinationHash, ratchet);
    }
    const nextHop = packet.transportId ?? packet.destinationHash;
    const added = this.routingTable.addOrUpdateRoute(packet.destinationHash, {
      nextHop,
      hops: packet.hops,
      viaInterface: receivingInterface,
      randomBlob: randomHash
    });
    if (added) {
      log(
        "Transport",
        `Path to ${destHex} is now ${packet.hops} hop(s) away via ${toHex(nextHop)}`,
        LogLevel.DEBUG
      );
    }
    this.inflightPathRequests.delete(destHex);
    log(
      "Transport",
      `Validated announce from ${destHex} (name_hash=${toHex(nameHash)}, ratchet=${ratchet ? "yes" : "no"})`,
      LogLevel.DEBUG
    );
    this.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: packet.destinationHash,
          identity,
          nameHash,
          randomHash,
          ratchet,
          appData,
          packet
        }
      })
    );
  }
  /**
   * Resolves an inbound regular PROOF packet (§6.5) against the outstanding
   * {@link PacketReceipt} tracked for the proved outbound DATA packet.
   *
   * The PROOF's `dest_hash` is the 16-byte truncation of the proved packet's
   * hash; the receipt is looked up by that key, then the proof body is
   * length-dispatched (96 B explicit / 64 B implicit) and the Ed25519
   * signature verified. On success the receipt is marked delivered and its
   * callback fired; otherwise the proof is dropped silently (no NACK, §6.5.5).
   *
   * @param {import("../core/packet.js").Packet} packet
   * @private
   */
  async _handleProof(packet) {
    const receipt = this.findReceipt(packet.destinationHash);
    if (!receipt || receipt.status !== ReceiptStatus.SENDING) {
      log(
        "Transport",
        `No outstanding receipt for PROOF ${toHex(packet.destinationHash)}`,
        LogLevel.DEBUG
      );
      return;
    }
    if (await receipt.validateProof(packet.payload)) {
      receipt.setDelivered();
      this.markPathResponsive(receipt.destinationHash);
      log(
        "Transport",
        `PROOF validated for ${toHex(packet.destinationHash)} \u2014 receipt delivered`
      );
    } else {
      log(
        "Transport",
        `PROOF validation failed for ${toHex(packet.destinationHash)}`,
        LogLevel.WARNING
      );
    }
  }
  // -----------------------------------------------------------------------
  // Path requests (SPEC.md §7.1 / §7.2 — leaf minimum)
  // -----------------------------------------------------------------------
  /**
   * Lazily computes and caches the well-known `rnstransport.path.request`
   * destination hash. Every node resolves this identically via the PLAIN
   * recipe (§1.4.3, identity == None) — verified constant
   * `6b9f66014d9853faab220fba47d02761`.
   *
   * @returns {Promise<Uint8Array>}
   * @private
   */
  static _pathRequestDestHashCached = (
    /** @type {Uint8Array|null} */
    null
  );
  async _pathRequestDestHash() {
    let hash = _TransportCore._pathRequestDestHashCached;
    if (!hash) {
      const dest = await Destination.PLAIN(
        _TransportCore.PATH_REQUEST_APP_NAME,
        Direction.IN
      );
      hash = /** @type {Uint8Array} */
      dest.destinationHash;
      _TransportCore._pathRequestDestHashCached = hash;
    }
    return hash;
  }
  /**
   * Minimum interval in seconds between *automated* path re-requests for the
   * same destination. User-initiated {@link requestPath} calls are not gated
   * — the reference implementations apply the same discipline only in their
   * automated rediscovery paths.
   */
  static PATH_REQUEST_MIN_INTERVAL_SECS = 20;
  /**
   * Seconds after which a `path?`-request timestamp is forgotten. Bounds the
   * waiting-request exemption window for held announces.
   */
  static PATH_REQUEST_GATE_TIMEOUT_SECS = 120;
  /**
   * Sends a `path?` request for a destination we have no route to (§7.1).
   *
   * Leaf form: `target_dest_hash(16) || random_tag(16)` (32 bytes). The tag
   * makes the request unique enough for relay dedup (§7.2.2); a fresh random
   * tag is drawn per request so re-requests for the same destination aren't
   * suppressed as duplicates.
   *
   * Not rate-limited per se; automated callers should use
   * {@link requestPathAuto}, which enforces the `PATH_REQUEST_MIN_INTERVAL_SECS` minimum
   * interval per destination.
   *
   * @param {Uint8Array} destinationHash - 16-byte destination to discover.
   */
  async requestPath(destinationHash) {
    if (!destinationHash || destinationHash.length !== 16) {
      throw new Error("requestPath requires a 16-byte destination hash");
    }
    const tag = Identity.getRandomHash().slice(0, 16);
    const payload = new Uint8Array(32);
    payload.set(destinationHash, 0);
    payload.set(tag, 16);
    const packet = new Packet({
      packetType: PacketType.DATA,
      destinationType: DestType.PLAIN,
      destinationHash: await this._pathRequestDestHash(),
      transportType: TransportType.BROADCAST,
      contextByte: ContextType.NONE,
      payload
    });
    log(
      "Transport",
      `Requesting path to ${toHex(destinationHash)}`,
      LogLevel.DEBUG
    );
    for (const iface of this.interfaces) {
      iface.sentPathRequest?.();
    }
    this.broadcast(packet);
    this.pathRequests.set(toHex(destinationHash), Date.now() / 1e3);
    this.inflightPathRequests.set(toHex(destinationHash), Date.now() / 1e3);
    this._ensureSweep();
  }
  /**
   * Automated path (re-)request with the reference implementations' rediscovery
   * discipline: skipped entirely while a usable path is already known, and
   * rate-limited to one request per {@link TransportCore.PATH_REQUEST_MIN_INTERVAL_SECS}
   * seconds per destination. Use for machine-triggered re-discovery (link
   * failures, delivery retries); user-initiated discovery uses
   * {@link requestPath} directly.
   *
   * @param {Uint8Array} destinationHash - 16-byte destination to discover.
   * @returns {Promise<boolean>} Whether a request was actually sent.
   */
  async requestPathAuto(destinationHash) {
    if (!destinationHash || destinationHash.length !== 16) return false;
    if (this.hasPath(destinationHash) && !this.pathIsUnresponsive(destinationHash)) {
      return false;
    }
    const destHex = toHex(destinationHash);
    const last = this.pathRequests.get(destHex) ?? 0;
    if (Date.now() / 1e3 - last < _TransportCore.PATH_REQUEST_MIN_INTERVAL_SECS) {
      return false;
    }
    await this.requestPath(destinationHash);
    return true;
  }
  /**
   * Handles an inbound `path?` request (§7.2) for the leaf minimum (branch 1):
   *
   *   - parse `target_dest_hash` and `tag_bytes` (length-detected per §7.2.1);
   *   - drop tagless requests;
   *   - dedup on `(target, tag)` so retransmits don't storm (§7.2.2);
   *   - if the target is one of our own local destinations, answer with a
   *     path-response announce (§7.2.4).
   *
   * Transport-mode branches (answer on behalf of a remote destination via the
   * path table, recursive discovery) are out of scope for a leaf.
   *
   * @param {import("../core/packet.js").Packet} packet
   * @param {import("../interfaces/base.js").Interface|null} receivingInterface
   * @private
   */
  async _handlePathRequest(packet, receivingInterface) {
    const data = packet.payload;
    if (data.length < 16) return;
    const targetHash = data.slice(0, 16);
    let tagBytes = null;
    let oversizedTag = false;
    if (data.length > 32) {
      if (data.length - 32 > 16) oversizedTag = true;
      tagBytes = data.slice(32, 48);
    } else if (data.length > 16) {
      if (data.length - 16 > 16) oversizedTag = true;
      tagBytes = data.slice(16, 32);
    }
    if (oversizedTag) {
      receivingInterface?.protocolViolation?.(
        "Excessive path request tag size"
      );
    }
    if (!tagBytes || tagBytes.length === 0) {
      log("Transport", "Dropping tagless path request", LogLevel.DEBUG);
      return receivingInterface?.protocolViolation?.("Tagless path request");
    }
    receivingInterface?.receivedPathRequest?.();
    const uniqueTag = toHex(targetHash) + toHex(tagBytes);
    if (this.discoveryPrTags.has(uniqueTag)) {
      log("Transport", "Ignoring duplicate path request", LogLevel.DEBUG);
      return;
    }
    this.discoveryPrTags.add(uniqueTag);
    while (this.discoveryPrTags.size > this.maxPrTags) {
      const oldest = this.discoveryPrTags.values().next().value;
      if (oldest === void 0) break;
      this.discoveryPrTags.delete(oldest);
    }
    if (receivingInterface?.shouldIngressLimitPr?.()) {
      receivingInterface.prBurstDrops += 1;
      log(
        "Transport",
        `Dropping path request during PR ingress burst on ${receivingInterface.name}`,
        LogLevel.DEBUG
      );
      return;
    }
    const targetHex = toHex(targetHash);
    log("Transport", `Path request for ${targetHex}`, LogLevel.DEBUG);
    if (this.localDestinations.has(targetHex)) {
      const dest = this.localDestinations.get(targetHex);
      if (dest.identity) {
        await dest.announcePathResponse(tagBytes);
        log("Transport", `Answered path request for ${targetHex}`);
      }
    }
  }
  /**
   * @param {import("../core/packet.js").Packet} packet
   * @param {import("../interfaces/base.js").Interface|null} sourceInterface
   */
  broadcast(packet, sourceInterface = null) {
    if (packet.packetType === PacketType.ANNOUNCE) {
      for (const iface of this.interfaces) {
        if (iface !== sourceInterface) iface.sentAnnounce?.();
      }
    }
    for (const iface of this.interfaces) {
      if (iface === sourceInterface || !iface._packetWriter) continue;
      iface._packetWriter.write(packet).catch((err) => {
        log(
          "Transport",
          `[!] Broadcast failed on ${iface.name}: ${err}`,
          LogLevel.ERROR
        );
      });
    }
  }
  /**
   * Sends a packet toward its destination (§Transport.outbound).
   *
   * For routable destination types (SINGLE / LINK) with a known path, the
   * packet is sent on the interface the path was learned through. When the
   * destination is more than one hop away it is inserted into transport:
   * rewritten to HEADER_2 with `transport_type = TRANSPORT` and the next hop's
   * address as the transportId, so transit nodes can carry it hop-by-hop. A
   * one-hop destination is transmitted as-is. PLAIN/GROUP destinations and
   * anything with no known path fall back to the default interface (the leaf
   * broadcast fallback).
   *
   * The packet hash / receipt are computed from the logical (HEADER_1) packet
   * before any transport rewriting, so the PROOF returning over the reverse
   * path resolves against the right hash.
   *
   * @param {import("../core/packet.js").Packet} packet
   * @param {Uint8Array|null} [linkId] When set, hand the packet to the named
   *   active link instead of routing by destination.
   * @returns {Promise<import("../core/packet_receipt.js").PacketReceipt|null>}
   *   The tracked proof receipt for an opportunistic CTX_NONE DATA packet
   *   (awaitable via {@link import("../core/packet_receipt.js").PacketReceipt#whenSettled}),
   *   or `null` for any other packet (link DATA, announces, …).
   */
  async sendPacket(packet, linkId = null) {
    if ((packet.hops ?? 0) >= PATHFINDER_M) {
      log(
        "Transport",
        `Refusing to send packet with excessive hop count ${packet.hops ?? 0}`,
        LogLevel.DEBUG
      );
      return null;
    }
    const destHex = toHex(packet.destinationHash);
    const packetHash = await packet.getHash();
    log("Transport", `Send ${toHex(packetHash)} to ${destHex}`);
    if (linkId) {
      const linkHex = toHex(linkId);
      const link = this.activeLinks.get(linkHex);
      if (!link) {
        throw new Error(`Link ${linkHex} is not available`);
      }
      await link.send(packet);
      return null;
    }
    const routable = packet.packetType !== PacketType.ANNOUNCE && packet.destinationType !== DestType.PLAIN && packet.destinationType !== DestType.GROUP;
    let route = routable ? this.routingTable.getRoute(packet.destinationHash) : void 0;
    if (route && route.state === PathState.UNRESPONSIVE) {
      log(
        "Transport",
        `Expiring unresponsive path to ${destHex} before send`,
        LogLevel.DEBUG
      );
      this.routingTable.expireRoute(packet.destinationHash);
      route = void 0;
    }
    if (route) {
      const iface = route.interface ?? this.defaultInterface;
      if (route.hops > 1 && packet.headerType === HeaderType.HEADER_1) {
        const injected = new Packet({
          headerType: HeaderType.HEADER_2,
          hops: packet.hops,
          transportType: TransportType.TRANSPORT,
          destinationType: packet.destinationType,
          packetType: packet.packetType,
          contextFlag: packet.contextFlag,
          destinationHash: packet.destinationHash,
          contextByte: packet.contextByte,
          payload: packet.payload,
          transportId: route.nextHop
        });
        await this._transmit(iface, injected);
      } else {
        await this._transmit(iface, packet);
      }
      route.timestamp = Date.now();
    } else if (this.defaultInterface && this.defaultInterface._packetWriter) {
      await this.defaultInterface._packetWriter.write(packet);
    } else {
      throw new Error(`No route to host: ${destHex}`);
    }
    if (routable && !this.activeLinks.has(destHex)) {
      this.persistor?.markContacted(packet.destinationHash);
    }
    if (packet.packetType === PacketType.DATA && packet.contextByte === ContextType.NONE) {
      const receipt = new PacketReceipt(packetHash, packet.destinationHash, {
        // §7 path-health: a proof that never arrives means the path is dead —
        // mark it unresponsive so announce ingestion will try an alternative
        // (Transport.mark_path_unresponsive on receipt timeout).
        failed: (r) => {
          this.markPathUnresponsive(r.destinationHash);
        }
      });
      receipt.startTimeout(this.firstHopTimeout(packet.destinationHash) * 1e3);
      this.trackReceipt(receipt);
      return receipt;
    }
    return null;
  }
  /**
   * Writes a packet to an interface's outbound framer.
   * @param {import("../interfaces/base.js").Interface|null} iface
   * @param {import("../core/packet.js").Packet} packet
   * @private
   */
  async _transmit(iface, packet) {
    if (!iface || !iface._packetWriter) {
      throw new Error(
        `Interface ${iface?.name ?? "unknown"} has no packet writer`
      );
    }
    await iface._packetWriter.write(packet);
  }
  /**
   * Whether a path is currently known for the destination.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  hasPath(destinationHash) {
    return this.routingTable.hasRoute(destinationHash);
  }
  /**
   * The hop count to the destination, or `null` if no path is known.
   * @param {Uint8Array} destinationHash
   * @returns {number|null}
   */
  hopsTo(destinationHash) {
    return this.routingTable.getRoute(destinationHash)?.hops ?? null;
  }
  /**
   * The 16-byte address of the next transport hop toward the destination, or
   * `null` if no path is known. This is the value placed into HEADER_2 when
   * sending.
   * @param {Uint8Array} destinationHash
   * @returns {Uint8Array|null}
   */
  nextHop(destinationHash) {
    return this.routingTable.getRoute(destinationHash)?.nextHop ?? null;
  }
  // -----------------------------------------------------------------------
  // Bitrate-adaptive timeouts + path-health state.
  // -----------------------------------------------------------------------
  /**
   * The bitrate-adaptive proof timeout for a single hop toward the
   * destination, in seconds.
   * `MTU * (8 / next_hop_bitrate) + DEFAULT_PER_HOP_TIMEOUT_SECS`, falling back to
   * `DEFAULT_PER_HOP_TIMEOUT_SECS` when the route or its interface bitrate is
   * unknown. Used as the proof-wait timeout for an outbound DATA packet.
   * @param {Uint8Array} destinationHash
   * @returns {number} seconds
   */
  firstHopTimeout(destinationHash) {
    const bitrate = this.routingTable.getRoute(destinationHash)?.interface?.bitrate;
    if (!bitrate) return DEFAULT_PER_HOP_TIMEOUT_SECS;
    return MTU * (8 / bitrate) + DEFAULT_PER_HOP_TIMEOUT_SECS;
  }
  /**
   * The link-establishment timeout for a destination, in seconds. Combines
   * {@link firstHopTimeout} with a per-hop term: `first_hop_timeout +
   * DEFAULT_PER_HOP_TIMEOUT_SECS * max(1, hops)`, so a slow or multi-hop path gets
   * a proportionally longer handshake wait.
   * @param {Uint8Array} destinationHash
   * @returns {number} seconds
   */
  establishmentTimeout(destinationHash) {
    const hops = this.routingTable.getRoute(destinationHash)?.hops ?? 1;
    return this.firstHopTimeout(destinationHash) + DEFAULT_PER_HOP_TIMEOUT_SECS * Math.max(1, hops);
  }
  /**
   * Extra slack (seconds) to allow for a link proof transiting a given
   * interface: `(8 / bitrate) * MTU`. Returns 0 when the interface bitrate is
   * unknown.
   * @param {import("../interfaces/base.js").Interface|null} iface
   * @returns {number}
   */
  extraLinkProofTimeout(iface) {
    if (!iface?.bitrate) return 0;
    return 8 / iface.bitrate * MTU;
  }
  /**
   * The bitrate of the slowest currently-online interface, in bits/s, or
   * `null` when no online interface reports a usable bitrate.
   *
   * The reference implementations cache this from their transport jobs loop;
   * JS has no jobs loop on the leaf path, so this is computed on read by
   * iterating the live interface set — cheap (the set is walked by
   * {@link prioritizeInterfaces} already) and never stale. Add/remove and
   * online transitions are already reflected through `addInterface` /
   * `removeInterface` / the `closed` event wiring, so no extra listeners are
   * needed.
   * @returns {number|null}
   */
  get lowestInterfaceBitrate() {
    let min = Infinity;
    for (const iface of this.interfaces) {
      if (iface.online && typeof iface.bitrate === "number" && iface.bitrate > 0 && iface.bitrate < min) {
        min = iface.bitrate;
      }
    }
    return min === Infinity ? null : min;
  }
  /**
   * A full round trip for an MTU on the slowest currently-online interface,
   * plus per-hop grace:
   * `2 * (MTU * 8 / max(lowest_bitrate, MINIMUM_BITRATE)) +
   * DEFAULT_PER_HOP_TIMEOUT_SECS`, or `0` when no online interface bitrate is known.
   *
   * Used where the relevant medium isn't a single known next hop but "whatever
   * the network can reach us over" — most notably path-request / discovery
   * deadlines. Complements the next-hop-based {@link firstHopTimeout}.
   * @returns {number} seconds
   */
  mediumPathTimeout() {
    const lowest = this.lowestInterfaceBitrate;
    if (!lowest) return 0;
    const rate = Math.max(lowest, MINIMUM_BITRATE);
    return 2 * (MTU * 8 / rate) + DEFAULT_PER_HOP_TIMEOUT_SECS;
  }
  /**
   * Marks the path to a destination responsive — a proof/link just succeeded.
   * No-op if no route is known.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  markPathResponsive(destinationHash) {
    return this.routingTable.markState(destinationHash, PathState.RESPONSIVE);
  }
  /**
   * Marks the path to a destination unresponsive — a proof/link timed out.
   * Subsequent announce ingestion will try an alternative path via the
   * `pathIsUnresponsive` gate.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  markPathUnresponsive(destinationHash) {
    return this.routingTable.markState(destinationHash, PathState.UNRESPONSIVE);
  }
  /**
   * Resets the path state to unknown.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  markPathUnknown(destinationHash) {
    return this.routingTable.markState(destinationHash, PathState.UNKNOWN);
  }
  /**
   * Whether the path was marked unresponsive by a failed attempt.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  pathIsUnresponsive(destinationHash) {
    return this.routingTable.pathIsUnresponsive(destinationHash);
  }
  /**
   * Forgets the path to a destination, e.g. on link teardown.
   * @param {Uint8Array} destinationHash
   * @returns {boolean}
   */
  expirePath(destinationHash) {
    return this.routingTable.expireRoute(destinationHash);
  }
  /**
   * Rewrites the hop count of a known path, used by link path-rebalancing at
   * the terminus. Leaves the next hop, interface and liveness state untouched.
   * @param {Uint8Array} destinationHash
   * @param {number} hops
   * @returns {boolean}
   */
  setPathHops(destinationHash, hops) {
    return this.routingTable.setHops(destinationHash, hops);
  }
  /**
   * Register an aspect-filtered announce handler.
   *
   * Convenience wrapper around the standard EventTarget API that filters
   * announces by destination aspect. Only emits callbacks for announces
   * matching the given `app.aspect`.
   *
   * @param {string} app - App name (e.g., "rfed")
   * @param {string} aspect - Aspect string (e.g., "node")
   * @param {Function} callback - Called with announce event detail
   * @returns {Function} Unsubscribe function
   *
   * @example
   * ```js
   * const unsubscribe = rns.transport.onAnnounce("rfed", "node", (detail) => {
   *   console.log("RFed peer announce:", toHex(detail.destinationHash));
   * });
   * // Later: unsubscribe();
   * ```
   */
  onAnnounce(app, aspect, callback) {
    const nameHashPromise = aspectNameHash(`${app}.${aspect}`);
    const handler = async (event) => {
      const expected = await nameHashPromise;
      const detail = (
        /** @type {{nameHash?: Uint8Array, destinationHash: Uint8Array, appData?: Uint8Array}} */
        "detail" in event ? event.detail : void 0
      );
      if (detail?.nameHash && bytesEqual(detail.nameHash, expected)) {
        callback(detail);
      }
    };
    this.addEventListener("announce", handler);
    return () => this.removeEventListener("announce", handler);
  }
  /**
   * Returns true when an inbound non-announce packet is a duplicate we've
   * already seen (§Transport.packet_filter, two-set dedup ring). Bypasses contexts that legitimately recur or are dedup'd elsewhere
   * (KEEPALIVE, the RESOURCE / RESOURCE_REQ / RESOURCE_PRF / CACHE_REQUEST /
   * CHANNEL flows). A fresh hash is remembered, and the ring rotates (prev ←
   * current) once {@link packetHashlist} exceeds {@link hashlistMaxsize}/2.
   * @param {Packet} packet
   * @returns {Promise<boolean>} `true` = drop as duplicate.
   * @private
   */
  /**
   * One round of the maintenance sweep: releases **one** held announce per
   * interface (the interface itself enforces the release interval and
   * quiet-frequency gate) and re-injects it into the normal inbound pipeline
   * — the hop count increments again on re-entry, and a re-latched burst
   * simply re-holds it. Also culls `path?`-request timestamps older than
   * {@link TransportCore.PATH_REQUEST_GATE_TIMEOUT_SECS}.
   *
   * Exposed as a method so embedders and tests can drive it deterministically;
   * {@link _ensureSweep} schedules it on a 5 s interval (the reference
   * implementations' interface-jobs cadence).
   * @private
   */
  async _sweepTick() {
    for (const iface of this.interfaces) {
      if (typeof iface.processHeldAnnounces !== "function") continue;
      const packet = iface.processHeldAnnounces();
      if (packet) {
        log(
          "Transport",
          `Releasing held announce for ${toHex(packet.destinationHash)} on ${iface.name}`,
          LogLevel.DEBUG
        );
        try {
          await this._routeIncomingPacket(packet, iface);
        } catch (e) {
          log(
            "Transport",
            `Held announce re-injection failed: ${e}`,
            LogLevel.ERROR
          );
        }
      }
    }
    const now = Date.now() / 1e3;
    for (const [destHex, t] of this.pathRequests) {
      if (now > t + _TransportCore.PATH_REQUEST_GATE_TIMEOUT_SECS) {
        this.pathRequests.delete(destHex);
      }
    }
    for (const [destHex, t] of this.inflightPathRequests) {
      if (now > t + _TransportCore.PATH_REQUEST_GATE_TIMEOUT_SECS) {
        this.inflightPathRequests.delete(destHex);
      }
    }
    if (this._sweepTimer && !this._hasHeldAnnounces() && this.pathRequests.size === 0 && this.inflightPathRequests.size === 0) {
      clearInterval(this._sweepTimer);
      this._sweepTimer = null;
    }
  }
  /** Whether any attached interface currently holds announces. @private */
  _hasHeldAnnounces() {
    for (const iface of this.interfaces) {
      if ((iface.heldAnnounces?.size ?? 0) > 0) return true;
    }
    return false;
  }
  /**
   * Lazily starts the 5 s maintenance sweep ({@link _sweepTick}) while there
   * is held-announce draining or path-request bookkeeping to do; the tick
   * stops the timer again once idle. The timer is detached (`unref`) where
   * the platform supports it — the reference implementations run these jobs
   * as daemons that never keep the process alive on their own.
   * @private
   */
  _ensureSweep() {
    if (this._sweepTimer) return;
    const timer = setInterval(() => {
      this._sweepTick();
    }, 5e3);
    timer?.unref?.();
    this._sweepTimer = timer;
  }
  /**
   * §Transport.packet_filter: drop a non-announce packet whose hash we've
   * already seen (two-set dedup ring, swapping current for previous once
   * {@link packetHashlist} exceeds {@link hashlistMaxsize}/2). Announces are
   * exempt — their replay protection is the RoutingTable random_blob check —
   * as are contexts that legitimately recur or carry their own sequencing
   * (resource / channel / keepalive flows).
   *
   * @param {import("../core/packet.js").Packet} packet
   * @returns {Promise<boolean>}
   * @private
   */
  async _isDuplicate(packet) {
    switch (packet.contextByte) {
      case ContextType.KEEPALIVE:
      case ContextType.RESOURCE:
      case ContextType.RESOURCE_REQ:
      case ContextType.RESOURCE_PRF:
      case ContextType.CACHE_REQUEST:
      case ContextType.CHANNEL:
        return false;
    }
    const hashHex = toHex(await packet.getHash());
    if (this.packetHashlist.has(hashHex) || this.packetHashlistPrev.has(hashHex)) {
      return true;
    }
    this.packetHashlist.add(hashHex);
    if (this.packetHashlist.size > this.hashlistMaxsize / 2) {
      this.packetHashlistPrev = this.packetHashlist;
      this.packetHashlist = /* @__PURE__ */ new Set();
    }
    return false;
  }
};

// node_modules/@reticulum/core/src/core/ifac.js
var IFAC_MIN_SIZE = 1;
var IFAC_SALT = new Uint8Array([
  173,
  245,
  77,
  136,
  44,
  154,
  155,
  128,
  119,
  30,
  180,
  153,
  93,
  112,
  45,
  74,
  62,
  115,
  51,
  145,
  178,
  160,
  245,
  63,
  65,
  109,
  159,
  144,
  126,
  85,
  207,
  248
]);
async function deriveIfac(netname, netkey) {
  const encoder = new TextEncoder();
  const parts = [];
  if (netname) parts.push(await Identity.fullHash(encoder.encode(netname)));
  if (netkey) parts.push(await Identity.fullHash(encoder.encode(netkey)));
  if (parts.length === 0) return null;
  const origin = concatBytes(...parts);
  const originHash = await Identity.fullHash(origin);
  const ifacKey = await hkdf(originHash, IFAC_SALT, new Uint8Array(), 64);
  const ifacIdentity = (
    /** @type {Identity} */
    await Identity.fromPrivateKey(ifacKey)
  );
  const ifacSignature = await ifacIdentity.sign(
    await Identity.fullHash(ifacKey)
  );
  return { ifacKey, ifacIdentity, ifacSignature };
}
async function seal(raw, cfg) {
  const { ifacIdentity, ifacKey, ifacSize } = cfg;
  const fullSig = await ifacIdentity.sign(raw);
  const ifac = fullSig.subarray(fullSig.length - ifacSize);
  const mask = await hkdf(
    ifac,
    ifacKey,
    new Uint8Array(),
    raw.length + ifacSize
  );
  const newRaw = new Uint8Array(raw.length + ifacSize);
  newRaw[0] = raw[0] | 128;
  newRaw[1] = raw[1];
  newRaw.set(ifac, 2);
  newRaw.set(raw.subarray(2), 2 + ifacSize);
  const masked = new Uint8Array(newRaw.length);
  for (let i = 0; i < newRaw.length; i++) {
    if (i === 0) {
      masked[i] = newRaw[i] ^ mask[i] | 128;
    } else if (i === 1 || i > ifacSize + 1) {
      masked[i] = newRaw[i] ^ mask[i];
    } else {
      masked[i] = newRaw[i];
    }
  }
  return masked;
}
async function open(raw, cfg) {
  const { ifacIdentity, ifacKey, ifacSize } = cfg;
  if (raw.length <= 2 + ifacSize) return null;
  const ifac = raw.subarray(2, 2 + ifacSize);
  const mask = await hkdf(ifac, ifacKey, new Uint8Array(), raw.length);
  const unmasked = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    if (i <= 1 || i > ifacSize + 1) {
      unmasked[i] = raw[i] ^ mask[i];
    } else {
      unmasked[i] = raw[i];
    }
  }
  const newRaw = new Uint8Array(raw.length - ifacSize);
  newRaw[0] = unmasked[0] & 127;
  newRaw[1] = unmasked[1];
  newRaw.set(unmasked.subarray(2 + ifacSize), 2);
  const expectedFull = await ifacIdentity.sign(newRaw);
  const expected = expectedFull.subarray(expectedFull.length - ifacSize);
  return bytesEqual(ifac, expected) ? newRaw : null;
}
function hasIfacFlag(raw) {
  return raw.length > 0 && (raw[0] & 128) !== 0;
}

// node_modules/@reticulum/core/src/core/reticulum.js
var Reticulum = class _Reticulum {
  /**
   * Minimum acceptable interface bitrate in bits/s. A configured
   * bitrate below this is ignored so the interface keeps its default — used
   * for config-time validation only. It does **not** cause interfaces to be
   * skipped in routing; the reference implementations behave the same.
   */
  static MINIMUM_BITRATE = 5;
  /**
   * The network MTU in bytes (`RNS.Reticulum.MTU`). The largest packet the
   * network will carry; feeds the bitrate-adaptive timeout math
   * ({@link TransportCore.firstHopTimeout}).
   */
  static MTU = 500;
  /**
   * The base per-hop timeout in seconds (`RNS.Reticulum.DEFAULT_PER_HOP_TIMEOUT`),
   * added on top of the bitrate-derived term in
   * {@link TransportCore.firstHopTimeout} / {@link TransportCore.establishmentTimeout}.
   */
  static DEFAULT_PER_HOP_TIMEOUT_SECS = 6;
  /**
   * The default interface gravity applied when an interface doesn't specify one
   * (`RNS.Interfaces.Interface.Interface.DEFAULT_GRAVITY`). Higher gravity =
   * preferred for paths when the same announce is heard on multiple interfaces.
   */
  static DEFAULT_GRAVITY = 0;
  /**
   * Minimum IFAC size in bytes (`RNS.Reticulum.IFAC_MIN_SIZE`). Re-exported
   * from {@link import("./ifac.js").IFAC_MIN_SIZE} for upstream API parity.
   */
  static IFAC_MIN_SIZE = IFAC_MIN_SIZE;
  /**
   * Fixed IFAC salt (`RNS.Reticulum.IFAC_SALT`). Re-exported from
   * {@link import("./ifac.js").IFAC_SALT} for upstream API parity.
   */
  static IFAC_SALT = IFAC_SALT;
  /**
   * Initializes the Reticulum engine.
   * @param {Object} config - Configuration options for the node.
   * @param {import("../storage/storage.js").StorageAdapter} [config.storageAdapter] - Interface for persisting identities and caches.
   * @param {import("./resource.js").Bzip2} [config.compressionProvider] - Engine for handling bz2 Resources (e.g., for rngit).
   * @param {boolean} [config.useImplicitProof] - §6.5.2 PROOF form for opportunistic DATA: `true` (default, upstream) emits the 64-byte implicit body; `false` emits the 96-byte explicit body.
   * @param {number} [config.defaultGravity] - Default interface gravity applied
   *   to any interface that doesn't specify one. Higher gravity = preferred
   *   for paths. Defaults to
   *   {@link Reticulum.DEFAULT_GRAVITY} (0).
   * @param {import("../interfaces/base.js").IngressControlConfig} [config.ingressControl] -
   *   Node-global ingress burst-control overrides applied to every interface
   *   at `addInterface` time (node-level `ic_*` options —
   *   there is no per-interface form). Absent keys keep the defaults.
   *   Per-interface programmatic control (including `iface.ingressControl =
   *   false` to opt out) always remains available.
   * @param {boolean} [config.enableDiscovery] - When true, start an
   *   {@link InterfaceDiscovery} listener on the transport `"announce"` event
   *   so a leaf can discover connectable transport-node interfaces on the
   *   `rnstransport.discovery.interface` aspect.
   *   v1 is surface-only — no auto-connect.
   * @param {Object} [config.discovery] - Extra options forwarded to the
   *   {@link InterfaceDiscovery} constructor when `enableDiscovery` is true
   *   (`requiredValue`, `discoverySources`, `networkIdentity`, `backboneSupport`).
   * @param {number | string} [config.logLevel] - Initial log threshold. Accepts
   *   a {@link LogLevel} value or a level name (`"DEBUG"`, `"NOTICE"`, …).
   *   Takes precedence over the `RETICULUM_LOG_LEVEL` environment variable.
   *   See `src/utils/log.js`.
   */
  constructor(config = {}) {
    if (config.logLevel !== void 0 && config.logLevel !== null) {
      setLogLevel(config.logLevel);
    }
    this.storage = config.storageAdapter || null;
    this.compressionProvider = config.compressionProvider || null;
    this.useImplicitProof = config.useImplicitProof ?? true;
    this.defaultGravity = config.defaultGravity ?? _Reticulum.DEFAULT_GRAVITY;
    this.ingressControl = config.ingressControl ?? {};
    this.transport = new TransportCore();
    this.coreInstanceToken = this.transport.caches.instanceToken;
    this.localDestinations = /* @__PURE__ */ new Map();
    this.persistor = new Persistor({
      adapter: this.storage,
      routingTable: this.transport.routingTable,
      // Instance-scoped caches (work doc #37): the Persistor reads/writes the
      // transport's cache maps, not the deprecated class-level statics —
      // identical objects when the default aliasing is in effect, but correct
      // for embedders injecting a fresh IdentityCache for hard isolation.
      knownDestinations: this.transport.caches.knownDestinations,
      knownRatchets: this.transport.caches.knownRatchets
    });
    this.transport.persistor = this.persistor;
    this.persistorLoadPromise = this.persistor.load();
    this._stopped = false;
    this.discovery = null;
    if (config.enableDiscovery) {
      this.discovery = new InterfaceDiscovery({
        transport: this.transport,
        storageAdapter: this.storage,
        ...config.discovery
      });
      this.discovery.startPromise = this.discovery.start();
    }
    log("Reticulum", "Reticulum Engine initialized.");
  }
  /**
   * Attaches a physical or virtual network interface to the router.
   *
   * Connecting to a local shared instance is now the caller's job — use the
   * `LocalClientInterface.connectToSharedInstance()` static factory (from
   * `@reticulum/node/src/interfaces/local_client.js`) and pass the resulting
   * interface here. Keeping shared-instance discovery out of the core keeps
   * `Reticulum` free of Node.js builtins and browser-safe.
   * @param {import("../interfaces/base.js").Interface} rnsInterface - An instantiated interface (TCP, WebSocket, RNode, shared-instance client, ...)
   * @param {boolean} isDefault - If true, unroutable packets fallback to this interface
   */
  addInterface(rnsInterface, isDefault = false) {
    if (rnsInterface.gravity == null) {
      rnsInterface.gravity = this.defaultGravity;
    }
    rnsInterface.applyIngressConfig?.(this.ingressControl);
    this.transport.addInterface(rnsInterface, isDefault);
    log("Reticulum", `[+] Interface attached: ${rnsInterface.name}`);
  }
  /**
   * Removes an interface and purges its routes from the TransportCore.
   * @param {import("../interfaces/base.js").Interface} rnsInterface - An instantiated interface (TCP, WebSocket, RNode)
   */
  removeInterface(rnsInterface) {
    this.transport.removeInterface(rnsInterface);
    log("Reticulum", `[-] Interface removed: ${rnsInterface.name}`);
  }
  /**
   * Binds an application-level Destination to the network.
   * When your web components spin up and instantiate a Yjs provider,
   * this is where they register their collaborative endpoints to receive traffic.
   * @param {import("../core/destination.js").Destination} destination
   */
  registerDestination(destination) {
    if (!destination.destinationHash) {
      throw new Error("Destination hash must be computed before registration.");
    }
    const hashHex = toHex(destination.destinationHash);
    if (this.localDestinations.has(hashHex)) {
      throw new Error(`Destination ${destination.name} is already registered.`);
    }
    this.transport.bindLocalDestination(destination);
    this.localDestinations.set(hashHex, destination);
    if (destination.identity) {
      const appData = new TextDecoder().decode(destination.identity.appData);
      log(
        "Reticulum",
        `[+] Destination registered: ${destination.name} (${appData})`
      );
    } else {
      log("Reticulum", `[+] Destination registered: ${destination.name}`);
    }
  }
  /**
   * Removes a local destination, ceasing all incoming traffic to that application endpoint.
   * @param {import("../core/destination.js").Destination} destination
   */
  deregisterDestination(destination) {
    if (!destination.destinationHash) {
      throw new Error(
        "Destination hash must be computed before deregistration."
      );
    }
    const hashHex = toHex(destination.destinationHash);
    this.localDestinations.delete(hashHex);
    this.transport.unbindLocalDestination(destination);
  }
  /**
   * Broadcasts a packet from a specific destination to the mesh.
   * @param {Packet} packet
   */
  broadcast(packet) {
    this.transport.broadcast(packet);
  }
  /**
   * The bitrate-adaptive proof timeout for a single hop toward the destination,
   * in seconds (`RNS.Reticulum.get_first_hop_timeout`). Delegates to
   * {@link TransportCore.firstHopTimeout}; falls back to
   * {@link Reticulum.DEFAULT_PER_HOP_TIMEOUT_SECS} when no route / bitrate is known.
   * @param {Uint8Array} destinationHash
   * @returns {number} seconds
   */
  getFirstHopTimeout(destinationHash) {
    return this.transport.firstHopTimeout(destinationHash);
  }
  /**
   * The bitrate of the slowest currently-online interface, in bits/s, or
   * `null` when no online interface reports a usable bitrate.
   * Delegates to
   * {@link TransportCore.lowestInterfaceBitrate}. (The Python reference also
   * has a shared-instance RPC branch; reticulum-js has no shared-instance
   * model yet, so only the local delegation is exposed.)
   * @returns {number|null}
   */
  getLowestInterfaceBitrate() {
    return this.transport.lowestInterfaceBitrate;
  }
  /**
   * A full round trip for an MTU on the slowest currently-online interface,
   * plus per-hop grace, in seconds (`RNS.Reticulum.get_medium_path_timeout`).
   * Delegates to {@link TransportCore.mediumPathTimeout}; returns `0` when no
   * online interface bitrate is known. (No shared-instance RPC branch — see
   * {@link getLowestInterfaceBitrate}.)
   * @returns {number} seconds
   */
  getMediumPathTimeout() {
    return this.transport.mediumPathTimeout();
  }
  /**
   * Waits for the Reticulum node to be ready.
   * Resolves when the initial persistence hydration has finished and any
   * background initialization (such as interface discovery) has completed.
   * @returns {Promise<void>}
   */
  async ready() {
    await this.persistorLoadPromise;
    if (this.discovery?.startPromise) {
      await this.discovery.startPromise;
    }
  }
  /**
   * Graceful shutdown: stops interface discovery, disconnects every attached
   * interface, and flushes the persistence layer so the final debounced batch
   * isn't lost. A per-interface disconnect failure is logged and the rest
   * still proceed. Idempotent.
   *
   * Links and their channels are not torn down here (they are owned by the
   * application's destinations); they terminate when their interfaces close.
   * @returns {Promise<void>}
   */
  async stop() {
    if (this._stopped) return;
    this._stopped = true;
    this.discovery?.stop();
    for (const iface of [...this.transport.interfaces]) {
      try {
        await iface.disconnect();
      } catch (e) {
        log(
          "Reticulum",
          `Interface ${iface.name} disconnect failed during stop: ${e}`,
          LogLevel.WARNING
        );
      }
    }
    await this.persistor.flush();
  }
};

// node_modules/@reticulum/core/src/transport/buffer.js
var MAX_CHUNK_LEN = 16384;
var COMPRESSION_TRIES = 4;
function resolveBz2(channel, override) {
  return override ?? /** @type {any} */
  channel._link?.bz2 ?? null;
}
var ChannelStreamReader = class {
  /**
   * @param {Channel} channel
   * @param {number} streamId
   * @param {any} bz2
   */
  constructor(channel, streamId, bz2) {
    this._channel = channel;
    this._streamId = streamId;
    this._bz2 = bz2;
    this._controller = null;
    this._done = false;
    this._handler = (msg) => this._onMessage(msg);
    channel._registerSystemMessageType(StreamDataMessage);
    channel.addMessageHandler(this._handler);
  }
  /** @param {ReadableStreamDefaultController<Uint8Array>} controller */
  attach(controller) {
    this._controller = controller;
  }
  /** Stop receiving (consumer cancelled the stream). */
  detach() {
    this._done = true;
    this._channel.removeMessageHandler(this._handler);
  }
  /**
   * @param {MessageBase} msg
   * @returns {boolean}
   * @private
   */
  _onMessage(msg) {
    if (!(msg instanceof StreamDataMessage) || msg.streamId !== this._streamId) {
      return false;
    }
    if (this._done) return true;
    const c = this._controller;
    if (!c) return true;
    let data = msg.data;
    if (msg.compressed) {
      if (!this._bz2) {
        this._fail(
          c,
          new Error(
            "Received a compressed StreamDataMessage but no bz2 module is available"
          )
        );
        return true;
      }
      try {
        data = this._bz2.decompress(data, MAX_CHUNK_LEN);
      } catch (err) {
        this._fail(
          c,
          new Error(`StreamDataMessage decompression failed: ${err}`)
        );
        return true;
      }
    }
    if (data.length > 0) {
      try {
        c.enqueue(data);
      } catch (err) {
        log("Buffer", `reader enqueue failed: ${err}`, LogLevel.DEBUG);
        this._done = true;
        return true;
      }
    }
    if (msg.eof) {
      this._done = true;
      try {
        c.close();
      } catch (err) {
        log("Buffer", `reader close failed: ${err}`, LogLevel.DEBUG);
      }
    }
    return true;
  }
  /**
   * @param {ReadableStreamDefaultController<Uint8Array>} c
   * @param {Error} err
   * @private
   */
  _fail(c, err) {
    this._done = true;
    try {
      c.error(err);
    } catch (e) {
      log("Buffer", `reader error failed: ${e}`, LogLevel.DEBUG);
    }
  }
};
var ChannelStreamWriter = class {
  /**
   * @param {Channel} channel
   * @param {number} streamId
   * @param {any} bz2
   */
  constructor(channel, streamId, bz2) {
    this._channel = channel;
    this._streamId = streamId;
    this._bz2 = bz2;
    this._maxDataLen = channel.mdu - StreamDataMessage.HEADER_SIZE;
    this._closed = false;
  }
  /**
   * Wait until the channel send window has room (poll). Bails if the channel
   * shuts down.
   * @returns {Promise<void>}
   * @private
   */
  async _awaitReady() {
    while (!this._channel.isReadyToSend()) {
      if (this._channel._shutDown) {
        throw new ChannelException(
          CEType.ME_LINK_NOT_READY,
          "channel shut down"
        );
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  /**
   * Send one message, retrying while the window is momentarily full.
   * @param {StreamDataMessage} msg
   * @private
   */
  async _send(msg) {
    for (; ; ) {
      await this._awaitReady();
      try {
        await this._channel.send(msg);
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
   * Send one frame's worth of `remaining` (compressed if beneficial) and return
   * how many source bytes were consumed. Ports `RawChannelWriter.write`.
   * @param {Uint8Array} remaining
   * @returns {Promise<number>}
   * @private
   */
  async _writeOne(remaining) {
    const cap = Math.min(remaining.length, MAX_CHUNK_LEN);
    let processedLen = 0;
    let chunk = new Uint8Array(0);
    let compressed = false;
    if (this._bz2 && cap > 32) {
      for (let compTry = 1; compTry < COMPRESSION_TRIES; compTry++) {
        const segmentLength = Math.floor(cap / compTry);
        if (segmentLength <= 32) break;
        let compressedChunk;
        try {
          compressedChunk = this._bz2.compress(
            remaining.subarray(0, segmentLength)
          );
        } catch (err) {
          log("Buffer", `compress failed: ${err}`, LogLevel.DEBUG);
          break;
        }
        if (compressedChunk.length < this._maxDataLen && compressedChunk.length < segmentLength) {
          compressed = true;
          chunk = compressedChunk;
          processedLen = segmentLength;
          break;
        }
      }
    }
    if (!compressed) {
      processedLen = Math.min(cap, this._maxDataLen);
      chunk = remaining.subarray(0, processedLen);
    }
    const msg = new StreamDataMessage();
    msg.streamId = this._streamId;
    msg.data = chunk;
    msg.eof = false;
    msg.compressed = compressed;
    await this._send(msg);
    return processedLen;
  }
  /**
   * Write a whole chunk (possibly across several frames).
   * @param {Uint8Array} chunk
   * @returns {Promise<void>}
   */
  async write(chunk) {
    if (this._closed) throw new Error("stream is closed");
    let offset = 0;
    while (offset < chunk.length) {
      const consumed = await this._writeOne(chunk.subarray(offset));
      offset += consumed;
      if (consumed === 0) break;
    }
  }
  /** Send the terminal `eof` frame (empty data, eof=true). */
  async close() {
    if (this._closed) return;
    this._closed = true;
    const msg = new StreamDataMessage();
    msg.streamId = this._streamId;
    msg.data = new Uint8Array(0);
    msg.eof = true;
    msg.compressed = false;
    await this._send(msg);
  }
};
function openReadable(channel, streamId, options = {}) {
  const bz2 = resolveBz2(channel, options.bz2);
  const reader = new ChannelStreamReader(channel, streamId, bz2);
  return new ReadableStream({
    start(controller) {
      reader.attach(controller);
    },
    cancel() {
      reader.detach();
    }
  });
}
function openWritable(channel, streamId, options = {}) {
  const bz2 = resolveBz2(channel, options.bz2);
  const writer = new ChannelStreamWriter(channel, streamId, bz2);
  return new WritableStream({
    async write(chunk) {
      if (!(chunk instanceof Uint8Array)) {
        throw new TypeError("WritableStream chunk must be a Uint8Array");
      }
      await writer.write(chunk);
    },
    async close() {
      await writer.close();
    },
    abort() {
      writer._closed = true;
    }
  });
}
function openDuplex(channel, receiveStreamId, sendStreamId, options = {}) {
  return {
    readable: openReadable(channel, receiveStreamId, options),
    writable: openWritable(channel, sendStreamId, options)
  };
}
_setStreamAdapters({ openReadable, openWritable, openDuplex });

// node_modules/@reticulum/core/src/interfaces/base.js
var RECONNECT_DEFAULTS = {
  autoReconnect: true,
  reconnectWait: 5,
  maxReconnectTries: Number.POSITIVE_INFINITY,
  connectTimeout: 5
};
function reconnectSchemaProperties() {
  return {
    autoReconnect: {
      type: "boolean",
      default: true,
      description: "Whether the initiator (outbound dialer) automatically reconnects after the connection drops, with a fixed backoff. When false, behaviour is one-shot: a drop is terminal (only the initiator reconnects)."
    },
    reconnectWait: {
      type: "number",
      minimum: 0,
      default: 5,
      examples: [5],
      description: "Seconds to wait between reconnection attempts."
    },
    maxReconnectTries: {
      anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }],
      description: "Maximum reconnection attempts per drop before giving up and firing a terminal `closed` event. Omit (or null) to retry forever."
    },
    connectTimeout: {
      type: "number",
      minimum: 0,
      default: 5,
      examples: [5],
      description: "Per-dial connect timeout in seconds."
    }
  };
}
function nowSec() {
  return (performance.timeOrigin + performance.now()) / 1e3;
}
function frequencyOverWindow(deque, minSample, decaySeconds) {
  const n = deque.length;
  if (!(n > minSample)) return 0;
  const oldest = deque[0];
  const span = nowSec() - oldest;
  if (span > decaySeconds) deque.shift();
  if (span <= 0) return 0;
  return n / span;
}
var Interface = class _Interface extends EventTarget {
  /**
   * Returns a JSON Schema (draft-07) describing the options accepted by this
   * interface's constructor, for dynamically-generated setup UIs.
   *
   * The base schema declares the options common to every interface (`name`,
   * `ifacSize`). Subclasses extend it with their own options via
   * `super.getConfigurationSchema()` + spread, and intentionally omit
   * internal-only options (e.g. an adopted socket).
   * @returns {Record<string, any>} A JSON Schema object.
   */
  static getConfigurationSchema() {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Human-readable interface name. Every interface in a node should have a unique name so multiple interfaces of the same type (e.g. two TCP clients) can be told apart. A descriptive name is generated if omitted.",
          examples: ["tcp-client-1", "lora-node"]
        },
        ifacSize: {
          type: "integer",
          minimum: 0,
          default: 0,
          examples: [16],
          description: "Optional interface authentication code (IFAC) size in bytes. Auto-defaults to the interface DEFAULT_IFAC_SIZE when a network_name / passphrase is set; 0 alone disables IFAC. (Reference-node config files express this in bits.)"
        },
        networkName: {
          type: "string",
          description: "Shared interface network name enabling IFAC authentication and obfuscation on the link. Both endpoints must set the same value."
        },
        passphrase: {
          type: "string",
          description: "Shared interface passphrase enabling IFAC authentication and obfuscation on the link. Both endpoints must set the same value."
        },
        gravity: {
          type: "integer",
          default: 0,
          description: "Per-interface path preference weight. When the same announce is heard on multiple interfaces, the path table prefers the higher-gravity one. Higher = preferred."
        }
      },
      required: []
    };
  }
  /**
   * The underlying socket, when this interface is backed by a Node.js stream.
   * @type {import('node:net').Socket | null}
   */
  socket = null;
  /**
   * @type {import('node:stream/web').WritableStreamDefaultWriter | null}
   */
  _packetWriter = null;
  /**
   * The name of the interface.
   * @type {string}
   */
  name = "unknown";
  /**
   * Whether this interface is the initiator (the outbound dialer). Only
   * initiators reconnect; adopted/server-spawned sockets never do.
   * @type {boolean}
   */
  initiator = false;
  /**
   * Whether the interface is currently open/online.
   * @type {boolean}
   */
  online = false;
  /**
   * Nominal physical bitrate of this interface in bits per second
   * (default 62500). Each interface overrides this with its medium's rate.
   *
   * Used by `TransportCore.prioritizeInterfaces()` to order the interface set
   * highest-bitrate-first; the per-bitrate link-timeout and
   * announce-rate-limit behaviours that also build on it are tracked as
   * Phase 2 of work doc #20. Configured bitrates below
   * {@link Reticulum.MINIMUM_BITRATE} are ignored.
   * @type {number}
   */
  bitrate = 62500;
  /**
   * Total bytes received on this interface. Counted as the deserialized RNS
   * packet length, so it reflects the on-the-wire RNS payload, not framing
   * overhead. Apps derive a transfer rate by sampling this counter over time.
   * @type {number}
   */
  rxb = 0;
  /**
   * Total bytes transmitted on this interface.
   * @type {number}
   */
  txb = 0;
  /**
   * Epoch milliseconds when the interface was constructed.
   * @type {number}
   */
  created = Date.now();
  /**
   * Per-interface path preference weight (default 0 via
   * `Reticulum.defaultGravity`). When the same announce reaches this node
   * over multiple interfaces, the path table prefers the entry learned via
   * the higher-gravity interface (e.g. a wired backbone over a slow radio
   * link). `null` means "no preference" — {@link import("../core/reticulum.js").Reticulum}
   * substitutes its `defaultGravity` at `addInterface` time.
   * @type {number|null}
   */
  gravity = null;
  // ------------------------------------------------------------------
  // Ingress control (work doc #31)
  // ------------------------------------------------------------------
  /**
   * Rolling-sample cap for the announce/PR frequency deques (48 samples,
   * shared across announce and PR tracking).
   * @type {number}
   */
  static FREQ_SAMPLES = 48;
  /**
   * Seconds after which an unanswered announce sample decays out of the
   * deque (`AR_FREQ_DECAY = 1/AR_MINFREQ_HZ` = 10 s).
   * @type {number}
   */
  static ANNOUNCE_FREQ_DECAY = 10;
  /**
   * Seconds after which a PR sample decays (`PR_FREQ_DECAY` = 10 s).
   * @type {number}
   */
  static PR_FREQ_DECAY = 10;
  /**
   * Interface age in seconds below which the stricter "new interface"
   * burst thresholds apply (`IC_NEW_TIME_SECS` = 2 h).
   * @type {number}
   */
  static IC_NEW_TIME_SECS = 2 * 60 * 60;
  /** Announce burst threshold for new interfaces, Hz (`IC_BURST_FREQ_NEW`). */
  static IC_BURST_FREQ_NEW = 3;
  /** Announce burst threshold for established interfaces, Hz (`IC_BURST_FREQ`). */
  static IC_BURST_FREQ = 10;
  /** Path-request burst threshold for new interfaces, Hz (`IC_PR_BURST_FREQ_NEW`). */
  static IC_PR_BURST_FREQ_NEW = 3;
  /** Path-request burst threshold for established interfaces, Hz (`IC_PR_BURST_FREQ`). */
  static IC_PR_BURST_FREQ = 8;
  /**
   * Quiet evaluations required to unlatch a PR burst after the hold
   * (`ic_pr_burst_cooldown` = 3; any above-threshold evaluation resets it).
   * Anti-flapping hysteresis added upstream in "Improved PR ingress
   * limiter" — the announce limiter has no cooldown.
   * @type {number}
   */
  static IC_PR_BURST_COOLDOWN_SECS = 3;
  /** Seconds a burst stays latched after activation (`IC_BURST_HOLD_SECS`). */
  static IC_BURST_HOLD_SECS = 15;
  /** Seconds before held announces may release after a burst (`IC_BURST_PENALTY_SECS`). */
  static IC_BURST_PENALTY_SECS = 15;
  /**
   * Seconds between held-announce releases once draining
   * (`IC_HELD_RELEASE_INTERVAL_SECS`).
   * @type {number}
   */
  static IC_HELD_RELEASE_INTERVAL_SECS = 5;
  /**
   * Maximum held announces buffered per interface while an announce burst
   * is latched (`MAX_HELD_ANNOUNCES`). A held table at this size silently
   * drops further announces for destinations not already held.
   * @type {number}
   */
  static MAX_HELD_ANNOUNCES = 256;
  /**
   * Minimum deque samples before a frequency is reported
   * (`IC_DEQUE_MIN_SAMPLE` = 2 — i.e. > 2 samples).
   * @type {number}
   */
  static IC_DEQUE_MIN_SAMPLE = 2;
  /**
   * Whether the hardware MTU is autoconfigured from the nominal bitrate by
   * {@link optimiseMtu} (matching the Python reference's `AUTOCONFIGURE_MTU`).
   * Off on the base class; transport-grade interfaces (Local, TCP, Backbone)
   * opt in.
   * @type {boolean}
   */
  autoconfigureMtu = false;
  /**
   * The hardware MTU of this interface in bytes — the largest frame the
   * medium can carry in one piece (`HW_MTU` in the reference
   * implementations; `None`/`null` means unbounded/unknown).
   *
   * Unlike the Python reference (a class-level constant re-`optimise`d per
   * instance), this is an instance field set by {@link optimiseMtu} or the
   * subclass constructor; interfaces with a fixed medium MTU initialize it
   * directly (e.g. RNode's 508).
   * @type {number|null}
   */
  hwMtu = null;
  /**
   * Autoconfigures {@link hwMtu} from the nominal {@link bitrate} when
   * {@link autoconfigureMtu} is set, using the reference implementations'
   * bitrate→MTU table (faster media amortize framing overhead over larger
   * frames). With autoconfiguration off this is a no-op — a subclass that
   * set a fixed `hwMtu` keeps it.
   *
   * Called by interface constructors and by the node setup once the
   * configured bitrate is known (the Python reference calls `optimise_mtu()`
   * from `Reticulum._add_interface` and per-connection spawn sites).
   * @returns {void}
   */
  optimiseMtu() {
    if (!this.autoconfigureMtu) return;
    const bitrate = this.bitrate;
    if (bitrate >= 1e9) this.hwMtu = 524288;
    else if (bitrate > 75e7) this.hwMtu = 262144;
    else if (bitrate > 4e8) this.hwMtu = 131072;
    else if (bitrate > 2e8) this.hwMtu = 65536;
    else if (bitrate > 1e8) this.hwMtu = 32768;
    else if (bitrate > 1e7) this.hwMtu = 16384;
    else if (bitrate > 5e6) this.hwMtu = 8192;
    else if (bitrate > 2e6) this.hwMtu = 4096;
    else if (bitrate > 1e6) this.hwMtu = 2048;
    else if (bitrate > 62500) this.hwMtu = 1024;
    else this.hwMtu = null;
    log(this.name, `Hardware MTU set to ${this.hwMtu}`, LogLevel.PATHING);
  }
  /**
   * Whether ingress burst control is enabled on this interface. Disabling
   * makes {@link shouldIngressLimit} and {@link shouldIngressLimitPr} always
   * return `false`.
   * @type {boolean}
   */
  ingressControl = true;
  /** @type {number} */
  icNewTime = _Interface.IC_NEW_TIME_SECS;
  /** @type {number} */
  icBurstFreqNew = _Interface.IC_BURST_FREQ_NEW;
  /** @type {number} */
  icBurstFreq = _Interface.IC_BURST_FREQ;
  /** @type {number} */
  icPrBurstFreqNew = _Interface.IC_PR_BURST_FREQ_NEW;
  /** @type {number} */
  icPrBurstFreq = _Interface.IC_PR_BURST_FREQ;
  /** @type {number} */
  icBurstHold = _Interface.IC_BURST_HOLD_SECS;
  /** @type {number} */
  icBurstPenalty = _Interface.IC_BURST_PENALTY_SECS;
  /** @type {number} */
  icHeldReleaseInterval = _Interface.IC_HELD_RELEASE_INTERVAL_SECS;
  /** @type {number} */
  icMaxHeldAnnounces = _Interface.MAX_HELD_ANNOUNCES;
  /** @type {number} */
  arFreqDecay = _Interface.ANNOUNCE_FREQ_DECAY;
  /** @type {number} */
  prFreqDecay = _Interface.PR_FREQ_DECAY;
  /** Incoming-announce timestamp ring (seconds). @type {number[]} */
  iaFreqDeque = [];
  /** Outgoing-announce timestamp ring (seconds). @type {number[]} */
  oaFreqDeque = [];
  /** Incoming path-request timestamp ring (seconds). @type {number[]} */
  ipFreqDeque = [];
  /** Outgoing path-request timestamp ring (seconds). @type {number[]} */
  opFreqDeque = [];
  /** @type {boolean} */
  icBurstActive = false;
  /** @type {number} */
  icBurstActivated = 0;
  /** @type {boolean} */
  icPrBurstActive = false;
  /** @type {number} */
  icPrBurstActivated = 0;
  /** Remaining quiet evaluations before a latched PR burst unlatches. */
  icPrBurstCooldown = 0;
  /** Earliest held-announce release time (seconds); set on burst activation. */
  icHeldRelease = 0;
  // ------------------------------------------------------------------
  // Ingress-control observability counters (work doc #31; surfaced via
  // getStats() — the inline-processing equivalents of queue-drop counters)
  // ------------------------------------------------------------------
  /** Times an announce burst has latched on this interface. */
  announceBurstCount = 0;
  /** Times a `path?` burst has latched on this interface. */
  prBurstCount = 0;
  /** Unique-tag path requests dropped while a PR burst was latched. */
  prBurstDrops = 0;
  /** Held announces released back into the inbound pipeline. */
  heldAnnounceReleases = 0;
  /** Announces dropped (not held) because the held table was at its cap. */
  heldAnnounceDrops = 0;
  // -----------------------------------------------------------------
  // Per-interface protocol violation tracking (RNS 1.5.0). Counters for
  // malformed / invalid inbound traffic, surfaced via getStats(). Each
  // helper increments, logs at DEBUG, and returns `null` so it chains as the
  // `return` value at every drop site.
  // -----------------------------------------------------------------
  /** Generic protocol violations: malformed packets, bad signatures, etc. */
  protocolViolations = 0;
  /** IFAC-specific violations: missing/invalid/short IFAC fields. */
  ifacViolations = 0;
  /** Inbound packet-filter (dedup) hits. */
  packetFilterHits = 0;
  /**
   * Announces held while an ingress burst is latched, keyed by destination
   * hash hex. Drained by {@link processHeldAnnounces} on the transport
   * sweep.
   * @type {Map<string, import("../core/packet.js").Packet>}
   */
  heldAnnounces = /* @__PURE__ */ new Map();
  /**
   * Applies node-global ingress-control overrides to this interface (the
   * reference implementations apply node-level `ic_*` defaults to every
   * interface — there is no per-interface config for these). Only keys
   * present in `overrides` are assigned; absent keys keep the class
   * constants. Called by
   * {@link import("../core/reticulum.js").Reticulum#addInterface} when the
   * node was constructed with an `ingressControl` config block. These are
   * deliberately **not** constructor options / interface schema properties:
   * they scope to the whole node.
   *
   * @param {Partial<IngressControlConfig>} overrides
   */
  applyIngressConfig(overrides) {
    if (!overrides) return;
    if (overrides.icBurstHold !== void 0)
      this.icBurstHold = overrides.icBurstHold;
    if (overrides.icBurstFreqNew !== void 0)
      this.icBurstFreqNew = overrides.icBurstFreqNew;
    if (overrides.icBurstFreq !== void 0)
      this.icBurstFreq = overrides.icBurstFreq;
    if (overrides.icPrBurstFreqNew !== void 0)
      this.icPrBurstFreqNew = overrides.icPrBurstFreqNew;
    if (overrides.icPrBurstFreq !== void 0)
      this.icPrBurstFreq = overrides.icPrBurstFreq;
    if (overrides.icNewTime !== void 0) this.icNewTime = overrides.icNewTime;
    if (overrides.icBurstPenalty !== void 0)
      this.icBurstPenalty = overrides.icBurstPenalty;
    if (overrides.icHeldReleaseInterval !== void 0)
      this.icHeldReleaseInterval = overrides.icHeldReleaseInterval;
    if (overrides.icMaxHeldAnnounces !== void 0)
      this.icMaxHeldAnnounces = overrides.icMaxHeldAnnounces;
  }
  /**
   * Buffers an announce for delayed processing while an ingress burst is
   * latched. Announces at or beyond `PATHFINDER_M - 1` (127) hops are
   * dropped rather than held; a destination already in the table always
   * replaces its entry (newest emission wins); beyond
   * {@link icMaxHeldAnnounces} distinct destinations, new ones are silently
   * dropped.
   *
   * @param {import("../core/packet.js").Packet} packet Validated announce.
   */
  holdAnnounce(packet) {
    const destHex = toHex(packet.destinationHash);
    if (packet.hops >= 127) {
      return;
    }
    if (this.heldAnnounces.has(destHex)) {
      this.heldAnnounces.set(destHex, packet);
    } else if (this.heldAnnounces.size < this.icMaxHeldAnnounces) {
      this.heldAnnounces.set(destHex, packet);
    } else {
      this.heldAnnounceDrops += 1;
    }
  }
  /**
   * Releases one held announce if conditions allow: at most one announce per
   * {@link icHeldReleaseInterval}, never before {@link icHeldRelease}, and
   * only while the incoming announce frequency is back below the burst
   * threshold. Selection prefers the lowest hop count (nearest destinations
   * converge first). The caller re-injects the returned packet into the
   * normal inbound pipeline.
   *
   * @returns {import("../core/packet.js").Packet|null} The announce to
   *   re-inject, or `null` when nothing is releasable.
   */
  processHeldAnnounces() {
    if (this.heldAnnounces.size === 0) return null;
    const now = Date.now() / 1e3;
    if (now <= this.icHeldRelease) return null;
    const freqThreshold = this.age() < this.icNewTime ? this.icBurstFreqNew : this.icBurstFreq;
    if (!(this.incomingAnnounceFrequency() < freqThreshold)) return null;
    let selected = null;
    let minHops = 128;
    for (const packet of this.heldAnnounces.values()) {
      if (packet.hops < minHops) {
        minHops = packet.hops;
        selected = packet;
      }
    }
    if (!selected) return null;
    this.icHeldRelease = now + this.icHeldReleaseInterval;
    this.heldAnnounces.delete(toHex(selected.destinationHash));
    this.heldAnnounceReleases += 1;
    return selected;
  }
  /**
   * Age of this interface in seconds.
   * @returns {number}
   */
  age() {
    return (Date.now() - this.created) / 1e3;
  }
  /**
   * Records an inbound announce into {@link iaFreqDeque}. Spawned interfaces
   * propagate the sample to their parent so bursts are detected at the medium
   * level.
   * @param {boolean} [fromSpawned] Internal: true when called on a parent.
   */
  receivedAnnounce(fromSpawned = false) {
    this.iaFreqDeque.push(nowSec());
    if (this.iaFreqDeque.length > _Interface.FREQ_SAMPLES) {
      this.iaFreqDeque.shift();
    }
    if (!fromSpawned && /** @type {any} */
    this.parentInterface) {
      this.parentInterface.receivedAnnounce(true);
    }
  }
  /**
   * Records an outbound announce into {@link oaFreqDeque}; counted by
   * `TransportCore.broadcast` at the transmit chokepoint, and surfaced as
   * {@link outgoingAnnounceFrequency} for the future announce-rate-table
   * work (#31 step 6).
   * @param {boolean} [fromSpawned] Internal: true when called on a parent.
   */
  sentAnnounce(fromSpawned = false) {
    this.oaFreqDeque.push(nowSec());
    if (this.oaFreqDeque.length > _Interface.FREQ_SAMPLES) {
      this.oaFreqDeque.shift();
    }
    if (!fromSpawned && /** @type {any} */
    this.parentInterface) {
      this.parentInterface.sentAnnounce(true);
    }
  }
  /**
   * Records an inbound `path?` request into {@link ipFreqDeque}. Spawned
   * interfaces propagate to their parent.
   * @param {boolean} [fromSpawned] Internal: true when called on a parent.
   */
  receivedPathRequest(fromSpawned = false) {
    this.ipFreqDeque.push(nowSec());
    if (this.ipFreqDeque.length > _Interface.FREQ_SAMPLES) {
      this.ipFreqDeque.shift();
    }
    if (!fromSpawned && /** @type {any} */
    this.parentInterface) {
      this.parentInterface.receivedPathRequest(true);
    }
  }
  /**
   * Records an outbound `path?` request into {@link opFreqDeque}; consumed by
   * egress PR limiting (work doc #31 step 4).
   * @param {boolean} [fromSpawned] Internal: true when called on a parent.
   */
  sentPathRequest(fromSpawned = false) {
    this.opFreqDeque.push(nowSec());
    if (this.opFreqDeque.length > _Interface.FREQ_SAMPLES) {
      this.opFreqDeque.shift();
    }
    if (!fromSpawned && /** @type {any} */
    this.parentInterface) {
      this.parentInterface.sentPathRequest(true);
    }
  }
  /**
   * Incoming announce rate in Hz over the current sample window. Returns 0
   * with fewer than {@link Interface.IC_DEQUE_MIN_SAMPLE}+1 samples; a sample
   * older than {@link arFreqDecay} decays out of the window.
   * @returns {number}
   */
  incomingAnnounceFrequency() {
    return frequencyOverWindow(
      this.iaFreqDeque,
      _Interface.IC_DEQUE_MIN_SAMPLE,
      this.arFreqDecay
    );
  }
  /**
   * Incoming `path?` request rate in Hz. Same sampling rules as
   * {@link incomingAnnounceFrequency}, with the PR decay window.
   * @returns {number}
   */
  incomingPrFrequency() {
    return frequencyOverWindow(
      this.ipFreqDeque,
      _Interface.IC_DEQUE_MIN_SAMPLE,
      this.prFreqDecay
    );
  }
  /**
   * Outgoing announce rate in Hz. Needs more than one sample.
   * @returns {number}
   */
  outgoingAnnounceFrequency() {
    return frequencyOverWindow(this.oaFreqDeque, 1, this.arFreqDecay);
  }
  /**
   * Outgoing `path?` request rate in Hz. Needs more than one sample.
   * @returns {number}
   */
  outgoingPrFrequency() {
    return frequencyOverWindow(this.opFreqDeque, 1, this.prFreqDecay);
  }
  /**
   * Records a generic protocol violation on this interface: malformed
   * packets, invalid announce signatures, tagless / oversized path requests,
   * undecodable MTU signalling, inbound processing exceptions. Increments
   * {@link protocolViolations}, logs at DEBUG, and returns `null` so it
   * chains as the `return` value at every drop site.
   *
   * @param {string|null} [description] Optional human-readable detail.
   * @returns {null}
   */
  protocolViolation(description = null) {
    this.protocolViolations += 1;
    log(
      this.name,
      `Protocol violation on ${this.name}: ${description ?? ""}`,
      LogLevel.DEBUG
    );
    return null;
  }
  /**
   * Records an IFAC (interface authentication code) violation on this
   * interface: missing IFAC flag, insufficient packet size for the IFAC
   * field, or an IFAC that fails re-verification. Increments
   * {@link ifacViolations}, logs at DEBUG, returns `null`.
   *
   * @param {string|null} [description]
   * @returns {null}
   */
  ifacViolation(description = null) {
    this.ifacViolations += 1;
    log(
      this.name,
      `IFAC violation on ${this.name}: ${description ?? ""}`,
      LogLevel.DEBUG
    );
    return null;
  }
  /**
   * Records a packet-filter (dedup) hit on this interface: an inbound
   * non-announce packet whose hash is already in the dedup ring. Increments
   * {@link packetFilterHits}, returns `null`.
   *
   * @returns {null}
   */
  packetFilterHit() {
    this.packetFilterHits += 1;
    return null;
  }
  /**
   * Whether announce ingress should be limited right now. Latches a burst
   * when the incoming announce frequency exceeds the threshold for the
   * interface's age — stricter ({@link icBurstFreqNew}) during the first
   * {@link icNewTime} seconds. Once latched, stays limiting for at least
   * {@link icBurstHold} seconds and until the frequency drops back below the
   * threshold; the call that
   * unlatches still reports `true` (mirroring the Python reference: the
   * next packet after it flows normally).
   *
   * Consumers: held-announce buffering for unknown destinations (work doc
   * #31 step 3). The announce frequency side effects (latching plus arming
   * {@link icHeldRelease} with the {@link icBurstPenalty}) keep the state
   * correct when the announce-rate-table work lands.
   *
   * @returns {boolean}
   */
  shouldIngressLimit() {
    if (!this.ingressControl) return false;
    const freqThreshold = this.age() < this.icNewTime ? this.icBurstFreqNew : this.icBurstFreq;
    const iaFreq = this.incomingAnnounceFrequency();
    if (this.icBurstActive) {
      if (iaFreq < freqThreshold && Date.now() / 1e3 > this.icBurstActivated + this.icBurstHold) {
        if (this.iaFreqDeque.length >= _Interface.IC_DEQUE_MIN_SAMPLE) {
          this.icBurstActive = false;
        }
      }
      return true;
    }
    if (iaFreq > freqThreshold) {
      this.icBurstActive = true;
      this.icBurstActivated = Date.now() / 1e3;
      this.icHeldRelease = this.icBurstActivated + this.icBurstPenalty;
      this.announceBurstCount += 1;
      return true;
    }
    return false;
  }
  /**
   * Whether `path?` request ingress should be limited right now (including
   * cooldown hysteresis). Latches when the incoming PR frequency exceeds the
   * age-dependent threshold ({@link icPrBurstFreqNew} during the first
   * {@link icNewTime} seconds, {@link icPrBurstFreq} after). Once latched,
   * stays limiting for at least {@link icBurstHold} seconds; after the hold,
   * unlatching takes {@link Interface.IC_PR_BURST_COOLDOWN_SECS}+1 consecutive
   * below-threshold evaluations — any above-threshold evaluation resets the
   * cooldown (anti-flapping at the boundary). Consumers: `TransportCore`
   * drops unique-tag path requests while a burst is latched (work doc #31
   * step 2 — the inline-processing equivalent of an ingress-limited
   * traffic-class demotion).
   *
   * @returns {boolean}
   */
  shouldIngressLimitPr() {
    if (!this.ingressControl) return false;
    const freqThreshold = this.age() < this.icNewTime ? this.icPrBurstFreqNew : this.icPrBurstFreq;
    const ipFreq = this.incomingPrFrequency();
    if (this.icPrBurstActive) {
      if (ipFreq < freqThreshold && Date.now() / 1e3 > this.icPrBurstActivated + this.icBurstHold) {
        if (this.icPrBurstCooldown <= 0) {
          this.icPrBurstActive = false;
        } else {
          this.icPrBurstCooldown -= 1;
        }
      } else {
        this.icPrBurstCooldown = _Interface.IC_PR_BURST_COOLDOWN_SECS;
      }
      return true;
    }
    if (ipFreq > freqThreshold) {
      this.icPrBurstActive = true;
      this.icPrBurstActivated = Date.now() / 1e3;
      this.icPrBurstCooldown = _Interface.IC_PR_BURST_COOLDOWN_SECS;
      this.prBurstCount += 1;
      return true;
    }
    return false;
  }
  // ------------------------------------------------------------------
  // IFAC (Interface Authentication Code) — § Transport.transmit/inbound
  // ------------------------------------------------------------------
  /**
   * Shared network name enabling IFAC (`ifac_netname`). When set together
   * with {@link ifacNetkey} (or alone), packets on this interface are
   * authenticated and obfuscated. Both endpoints must share the same value.
   * @type {string|null}
   */
  ifacNetname = null;
  /**
   * Shared passphrase enabling IFAC (`ifac_netkey`). See {@link ifacNetname}.
   * @type {string|null}
   */
  ifacNetkey = null;
  /**
   * IFAC field size in bytes. When a network name / passphrase is set this
   * auto-defaults to {@link DEFAULT_IFAC_SIZE}; 0 with no shared secret
   * disables IFAC entirely.
   * @type {number}
   */
  ifacSize = 0;
  /**
   * Per-interface default IFAC size (bytes) when IFAC is enabled but no
   * explicit `ifacSize` was given. Subclasses override (16 for
   * Auto/Backbone, 8 for AX.25 in the reference implementations); the base
   * default of 16 matches the common case.
   * @type {number}
   */
  DEFAULT_IFAC_SIZE = 16;
  /**
   * Derived IFAC Ed25519 identity (only its signing ability is used).
   * Populated lazily by {@link _ensureIfacMaterial}; `null` while IFAC is
   * disabled or before first use.
   * @type {import("../core/identity.js").Identity|null}
   */
  ifacIdentity = null;
  /**
   * Derived 64-byte IFAC key (HKDF over {@link import("../core/ifac.js").IFAC_SALT}).
   * @type {Uint8Array|null}
   */
  ifacKey = null;
  /**
   * IFAC signature of `fullHash(ifacKey)`, published in the discovery
   * announce. @type {Uint8Array|null}
   */
  ifacSignature = null;
  /**
   * Memoised {@link _ensureIfacMaterial} promise so the HKDF derivation runs
   * at most once per interface.
   * @type {Promise<boolean>|null}
   * @private
   */
  _ifacMaterialPromise = null;
  /**
   * Whether IFAC is enabled on this interface (a shared secret is configured).
   * @returns {boolean}
   */
  get ifacEnabled() {
    return Boolean(this.ifacNetname || this.ifacNetkey);
  }
  /**
   * Whether this interface is currently open/online.
   * @type {boolean}
   */
  get isOpen() {
    return this.online;
  }
  /**
   * The readable stream of incoming data.
   * @type {import('node:stream/web').ReadableStream | null}
   */
  get readable() {
    throw new Error("Interface.readable is not implemented");
  }
  /**
   * The writable stream of outgoing data.
   * @type {import('node:stream/web').WritableStream | null}
   */
  get writable() {
    throw new Error("Interface.writable is not implemented");
  }
  /**
   * Establishes the connection.
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error("Interface.connect is not implemented");
  }
  /**
   * Dials the peer and sets up the RNS streams, resolving once connected and
   * dispatching `connected`. Implemented by reconnect-capable client
   * subclasses; used both for the initial connection and each reconnect
   * attempt by the shared {@link Interface._runReconnectLoop}.
   * @returns {Promise<void>}
   * @protected
   */
  async _establishConnection() {
    throw new Error("Interface._establishConnection is not implemented");
  }
  /**
   * Closes the connection.
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error("Interface.disconnect is not implemented");
  }
  /**
   * Optional hook invoked by {@link import("../transport/transport.js").TransportCore#addInterface}
   * with the transport that owns this interface, right after the interface is
   * attached.
   *
   * The base implementation is a no-op. Interfaces that spawn sub-interfaces
   * dynamically — notably {@link AutoInterface}, which discovers peers and
   * spawns one per peer — override it to remember the transport so the spawned
   * peers can be auto-registered without a separate `Reticulum` global (the
   * reference implementations use their global Transport registry for this).
   *
   * Overriders should also register any peers spawned before the transport was
   * attached, so the `addInterface`/`connect` call order doesn't matter.
   * @param {import("../transport/transport.js").TransportCore} _transport
   */
  attachTransport(_transport) {
  }
  /**
   * Derives and caches the IFAC key/identity/signature from the configured
   * {@link ifacNetname} / {@link ifacNetkey}. No-op (resolves `false`) when
   * IFAC is disabled. Memoised so the HKDF + Ed25519 key load runs at most
   * once.
   * @returns {Promise<boolean>} `true` if IFAC material is available.
   * @protected
   */
  _ensureIfacMaterial() {
    if (this._ifacMaterialPromise) return this._ifacMaterialPromise;
    this._ifacMaterialPromise = (async () => {
      if (!this.ifacEnabled) return false;
      const material = await deriveIfac(this.ifacNetname, this.ifacNetkey);
      if (!material) return false;
      this.ifacIdentity = material.ifacIdentity;
      this.ifacKey = material.ifacKey;
      this.ifacSignature = material.ifacSignature;
      if (!this.ifacSize || this.ifacSize < IFAC_MIN_SIZE) {
        this.ifacSize = this.DEFAULT_IFAC_SIZE;
      }
      return true;
    })();
    return this._ifacMaterialPromise;
  }
  /**
   * Seals raw (un-IFACed) wire bytes for transmit. No-op passthrough when
   * IFAC is disabled; otherwise derives the IFAC material on first use, then
   * signs, sets the `ifac_flag`, inserts the IFAC field and XOR-masks the
   * packet. Subclasses/interfaces call this at the chokepoint where a packet
   * is serialised to bytes, just before framing.
   * @param {Uint8Array} raw Serialised, unsealed wire bytes.
   * @returns {Promise<Uint8Array>} The bytes to put on the medium.
   * @protected
   */
  async _sealRaw(raw) {
    if (!this.ifacEnabled) return raw;
    await this._ensureIfacMaterial();
    return seal(raw, {
      ifacIdentity: (
        /** @type {import("../core/identity.js").Identity} */
        this.ifacIdentity
      ),
      ifacKey: (
        /** @type {Uint8Array} */
        this.ifacKey
      ),
      ifacSize: this.ifacSize
    });
  }
  /**
   * Verifies and unseals inbound raw wire bytes.
   *
   * Enforces the flag-presence rules: an IFAC-enabled interface drops a
   * flag-clear packet, and a plain interface drops a flag-set packet — both
   * return `null` (silent drop). For an IFAC interface it then unmasks,
   * strips the IFAC and verifies it by re-signing; a mismatch also yields
   * `null`. Subclasses/interfaces call this at the chokepoint where a frame
   * has been unframed to bytes, just before `Packet.deserialize`.
   * @param {Uint8Array} raw Sealed or plain wire bytes straight off the medium.
   * @returns {Promise<Uint8Array|null>} The unsealed bytes, or `null` to drop.
   * @protected
   */
  async _openRaw(raw) {
    if (raw.length <= 2) {
      return this.protocolViolation(
        "Insufficient packet size for IFAC processing"
      );
    }
    if (!this.ifacEnabled) {
      return hasIfacFlag(raw) ? this.protocolViolation(
        "IFAC flag set on packet for interface without IFAC enabled"
      ) : raw;
    }
    await this._ensureIfacMaterial();
    if (!hasIfacFlag(raw)) {
      return this.ifacViolation(
        "Missing IFAC flag on packet for IFAC-enabled interface"
      );
    }
    if (raw.length <= 2 + this.ifacSize) {
      return this.ifacViolation("Insufficient packet size for IFAC packet");
    }
    const opened = await open(raw, {
      ifacIdentity: (
        /** @type {import("../core/identity.js").Identity} */
        this.ifacIdentity
      ),
      ifacKey: (
        /** @type {Uint8Array} */
        this.ifacKey
      ),
      ifacSize: this.ifacSize
    });
    if (!opened) {
      return this.ifacViolation("Invalid IFAC on packet");
    }
    return opened;
  }
  /**
   * Sends bytes wrapped in KISS framing
   * @param {import("../core/packet.js").Packet} packet
   */
  async send(packet) {
    if (!this.writable) {
      throw new Error("Interface not ready: No packet writer found.");
    }
    if (!this._packetWriter) {
      this._packetWriter = this.writable.getWriter();
    }
    await this._packetWriter.write(packet);
    const socket = this.socket;
    if (socket && socket.writable) {
      await new Promise((resolve) => socket.write("", resolve));
    }
  }
  // ------------------------------------------------------------------
  // Statistics
  // ------------------------------------------------------------------
  /**
   * Records an outbound packet against {@link txb}. Subclasses (or the
   * interface's outbound stream `write` callback) call this at the point a
   * packet is handed to the medium — the single chokepoint where every
   * transmitted packet passes, whether sent via {@link send}, the transport
   * router, or a broadcast.
   *
   * RNodeInterface overrides its own counting (it measures the IFAC-inclusive
   * wire payload) and does not call this.
   * @param {import("../core/packet.js").Packet} packet
   * @protected
   */
  _recordOutbound(packet) {
    this.txb += packet.serialize().length;
  }
  /**
   * Counts an inbound packet against {@link rxb} and dispatches the `"packet"`
   * event, the single inbound chokepoint each interface's read loop funnels
   * through.
   *
   * Uses the deserialized packet's cached raw bytes when available (set by
   * `Packet.deserialize`), avoiding a re-serialize. RNodeInterface dispatches
   * its own packets (it counts the IFAC-inclusive payload) and does not call
   * this.
   * @param {import("../core/packet.js").Packet} packet
   * @protected
   */
  _dispatchPacket(packet) {
    const raw = (
      /** @type {Uint8Array | undefined} */
      packet.raw
    );
    this.rxb += raw && raw.length > 0 ? raw.length : packet.serialize().length;
    this.dispatchEvent(new CustomEvent("packet", { detail: { packet } }));
  }
  /**
   * Returns a snapshot of traffic and link statistics for this interface, for
   * observability and UIs.
   *
   * Subclasses that carry medium-specific telemetry (notably
   * {@link import("./rnode.js").RNodeInterface}, which exposes RNode airtime,
   * channel load and signal quality) override this to extend the snapshot.
   * @returns {InterfaceStats}
   */
  getStats() {
    return {
      name: this.name,
      online: this.online,
      bitrate: this.bitrate,
      gravity: this.gravity,
      rxb: this.rxb,
      txb: this.txb,
      created: this.created,
      // Ingress-control observability.
      incomingAnnounceFrequency: this.incomingAnnounceFrequency(),
      outgoingAnnounceFrequency: this.outgoingAnnounceFrequency(),
      incomingPrFrequency: this.incomingPrFrequency(),
      outgoingPrFrequency: this.outgoingPrFrequency(),
      announceBurstActive: this.icBurstActive,
      announceBurstActivated: this.icBurstActivated,
      announceBurstCount: this.announceBurstCount,
      prBurstActive: this.icPrBurstActive,
      prBurstActivated: this.icPrBurstActivated,
      prBurstCount: this.prBurstCount,
      prBurstDrops: this.prBurstDrops,
      heldAnnounces: this.heldAnnounces.size,
      heldAnnounceReleases: this.heldAnnounceReleases,
      heldAnnounceDrops: this.heldAnnounceDrops,
      protocolViolations: this.protocolViolations,
      ifacViolations: this.ifacViolations,
      packetFilterHits: this.packetFilterHits
    };
  }
  // ------------------------------------------------------------------
  // Shared reconnection machinery (used by client interfaces)
  // ------------------------------------------------------------------
  /**
   * Whether automatic reconnection is enabled for this initiator interface.
   * @type {boolean}
   */
  autoReconnect = RECONNECT_DEFAULTS.autoReconnect;
  /**
   * Seconds to wait between reconnection attempts.
   * @type {number}
   */
  reconnectWait = RECONNECT_DEFAULTS.reconnectWait;
  /**
   * Maximum reconnection attempts per drop. `Infinity` retries forever.
   * @type {number}
   */
  maxReconnectTries = RECONNECT_DEFAULTS.maxReconnectTries;
  /**
   * Per-dial connect timeout in seconds.
   * @type {number}
   */
  connectTimeout = RECONNECT_DEFAULTS.connectTimeout;
  /**
   * Permanent stop signal read by the reconnect loop. Set by `disconnect()`.
   * @type {boolean}
   */
  detached = false;
  /**
   * Single-flight guard: only one reconnect loop runs at a time.
   * @type {boolean}
   * @protected
   */
  _reconnecting = false;
  /**
   * Reconnect attempt counter for the current drop episode. Reset to 0 at the
   * start of each {@link Interface._runReconnectLoop} run.
   * @type {number}
   * @protected
   */
  _reconnectAttempts = 0;
  /**
   * AbortController for the current reconnect wait, so `disconnect()` can
   * cancel an in-flight backoff immediately.
   * @type {AbortController | null}
   * @protected
   */
  _reconnectAbort = null;
  /**
   * Whether a terminal `closed` event has already been dispatched for the
   * current connection episode (dedupe guard).
   * @type {boolean}
   * @protected
   */
  _closed = false;
  /**
   * Initializes shared reconnect state from constructor options. Called by
   * client interface subclasses (TCP, WebSocket) that support reconnection.
   *
   * Subclasses must also set {@link Interface.initiator}: `true` for an
   * outbound dialer, `false` for an adopted/server-spawned socket.
   * @param {ReconnectOptions} options
   * @protected
   */
  _initReconnectState(options) {
    this.autoReconnect = options.autoReconnect !== void 0 ? options.autoReconnect : RECONNECT_DEFAULTS.autoReconnect;
    this.reconnectWait = options.reconnectWait !== void 0 ? options.reconnectWait : RECONNECT_DEFAULTS.reconnectWait;
    this.maxReconnectTries = options.maxReconnectTries === void 0 || options.maxReconnectTries === null ? Number.POSITIVE_INFINITY : options.maxReconnectTries;
    this.connectTimeout = options.connectTimeout !== void 0 ? options.connectTimeout : RECONNECT_DEFAULTS.connectTimeout;
    this._reconnecting = false;
    this._reconnectAttempts = 0;
    this._reconnectAbort = null;
    this.detached = false;
  }
  /**
   * Signals the reconnect loop to stop and cancels any in-flight backoff.
   * Client subclasses call this at the top of their `disconnect()`.
   * @protected
   */
  _cancelReconnect() {
    this.detached = true;
    if (this._reconnectAbort) {
      this._reconnectAbort.abort();
      this._reconnectAbort = null;
    }
  }
  /**
   * Dispatches a terminal `closed` event exactly once per connection episode.
   * @protected
   */
  _dispatchClosed() {
    if (this._closed) return;
    this._closed = true;
    this.online = false;
    this.dispatchEvent(new CustomEvent("closed"));
  }
  /**
   * Called when the underlying connection drops (the inbound stream ends or
   * errors). For an initiator with auto-reconnect enabled and not deliberately
   * detached, dispatches `disconnected` and kicks off the reconnect loop;
   * otherwise dispatches a terminal `closed` event — matching the Python
   * reference, which reconnects the initiator on any termination and tears
   * down (non-reconnecting) everyone else.
   * @protected
   */
  _handleConnectionLost() {
    this.online = false;
    if (this.detached) {
      this._dispatchClosed();
      return;
    }
    if (this.initiator && this.autoReconnect) {
      this.dispatchEvent(new CustomEvent("disconnected"));
      this._runReconnectLoop();
    } else {
      this._dispatchClosed();
    }
  }
  /**
   * Runs the single-flight reconnect loop. Repeatedly waits `reconnectWait`
   * seconds then attempts to re-establish the connection via the subclass
   * `_establishConnection()` hook, until it succeeds, the interface is
   * detached, or `maxReconnectTries` is exceeded (terminal `closed`).
   *
   * Each attempt fires a `reconnecting` event with the upcoming attempt
   * number, the wait, and the cap, for observability. A successful reconnect
   * fires `connected` (via `_establishConnection`).
   * @protected
   */
  async _runReconnectLoop() {
    if (this._reconnecting) return;
    this._reconnecting = true;
    this._reconnectAttempts = 0;
    this._closed = false;
    this._reconnectAbort = new AbortController();
    const abortSignal = this._reconnectAbort.signal;
    try {
      while (!this.detached) {
        this._reconnectAttempts += 1;
        if (this.maxReconnectTries !== Number.POSITIVE_INFINITY && this._reconnectAttempts > this.maxReconnectTries) {
          log(
            this.name,
            `Max reconnection attempts (${this.maxReconnectTries}) reached; giving up`,
            LogLevel.ERROR
          );
          this._dispatchClosed();
          return;
        }
        this.dispatchEvent(
          new CustomEvent("reconnecting", {
            detail: {
              attempt: this._reconnectAttempts,
              waitSeconds: this.reconnectWait,
              maxTries: this.maxReconnectTries
            }
          })
        );
        await this._sleepInterruptible(this.reconnectWait * 1e3, abortSignal);
        if (this.detached) break;
        try {
          await this._establishConnection();
          return;
        } catch (e) {
          log(
            this.name,
            `Reconnection attempt ${this._reconnectAttempts} failed: ${/** @type {any} */
            e.message}`,
            LogLevel.DEBUG
          );
        }
      }
    } finally {
      this._reconnecting = false;
    }
  }
  /**
   * Resolves after `ms`, or immediately if `signal` aborts. Used so
   * `disconnect()` can cancel an in-flight reconnect backoff at once.
   * @param {number} ms
   * @param {AbortSignal} signal
   * @returns {Promise<void>}
   * @protected
   */
  _sleepInterruptible(ms, signal) {
    return new Promise((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
};

// node_modules/@reticulum/core/src/interfaces/webrtc.js
var HEADER_MINSIZE = 19;
var STATE_OPEN = "open";
var WebRTCInterface = class extends Interface {
  /**
   * Returns the JSON Schema describing the options accepted by the
   * {@link WebRTCInterface} constructor.
   *
   * WebRTC interfaces are created **programmatically** by the signaling
   * orchestrator once a data channel is open — they are not instantiated from
   * static node config — so the schema is informational only.
   * @returns {Record<string, any>} A JSON Schema object.
   */
  static getConfigurationSchema() {
    const base = Interface.getConfigurationSchema();
    return {
      ...base,
      title: "WebRTC Interface",
      description: "Bridges an open WebRTC RTCDataChannel into RNS streams. Created programmatically by the WebRTC signaling orchestrator (work doc #19) once SDP has been exchanged over a Reticulum Link+Resource; not instantiated from static node config. JS/browser-specific; there is no direct Python reference equivalent.",
      properties: {
        ...base.properties,
        bitrate: {
          type: "integer",
          default: 5e7,
          description: "Nominal bitrate in bits/s. Defaults to ~50 Mbit/s; the channel is a direct high-bandwidth peer link."
        }
      },
      required: [],
      additionalProperties: false
    };
  }
  /**
   * Creates a WebRTC interface over an already-created data channel.
   * @param {WebRTCInterfaceOptions} options
   */
  constructor(options) {
    super();
    if (!options?.channel) {
      throw new Error("WebRTCInterface requires an RTCDataChannel");
    }
    this.channel = options.channel;
    this.peerConnection = options.peerConnection || null;
    this.name = options.name || `webrtc-${options.channel.label || "channel"}-${options.channel.id ?? ""}`;
    this.ifacSize = options.ifacSize || 0;
    this.ifacNetname = options.networkName || null;
    this.ifacNetkey = options.passphrase || null;
    this.bitrate = options.bitrate ?? 5e7;
    this._readable = null;
    this._writable = null;
    this.online = false;
    this._loopPromise = null;
    this.initiator = false;
  }
  /** @returns {boolean} */
  get isOpen() {
    return this.online;
  }
  /** @returns {any} */
  get readable() {
    return this._readable;
  }
  /** @returns {any} */
  get writable() {
    return this._writable;
  }
  /**
   * Waits for the data channel to reach `"open"` (or resolves immediately if
   * already open), bridges it into RNS streams, and dispatches `"connected"`.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.channel.readyState === STATE_OPEN) {
      this._setupStreams();
      this._markOnline();
      return;
    }
    const opened = new Promise((resolve, reject) => {
      const cleanup = () => {
        this.channel.removeEventListener("open", onOpen);
        this.channel.removeEventListener("error", onError);
        this.channel.removeEventListener("close", onClose);
      };
      const onOpen = () => {
        cleanup();
        this._setupStreams();
        this._markOnline();
        resolve();
      };
      const onError = (event) => {
        cleanup();
        this.online = false;
        reject(
          new Error(
            `RTCDataChannel failed to open: ${event?.message ?? "unknown error"}`
          )
        );
      };
      const onClose = () => {
        cleanup();
        this.online = false;
        reject(new Error("RTCDataChannel closed before opening"));
      };
      this.channel.addEventListener("open", onOpen);
      this.channel.addEventListener("error", onError);
      this.channel.addEventListener("close", onClose);
    });
    await opened;
  }
  /**
   * Marks the interface online and dispatches `"connected"` exactly once per
   * connection episode.
   * @private
   */
  _markOnline() {
    this.online = true;
    this._closed = false;
    this.dispatchEvent(new CustomEvent("connected"));
  }
  /**
   * Bridges the `RTCDataChannel` into RNS streams. Each inbound binary message
   * is one RNS packet (raw framing); each outbound packet is serialized and
   * sent as one binary message.
   * @private
   */
  _setupStreams() {
    const channel = this.channel;
    channel.binaryType = "arraybuffer";
    this._packetWriter = null;
    const incoming = new ReadableStream({
      start: (controller) => {
        channel.addEventListener(
          "message",
          async (event) => {
            if (!(event.data instanceof ArrayBuffer)) {
              log(
                "WebRTC",
                "Ignoring non-binary RTCDataChannel message",
                LogLevel.DEBUG
              );
              return;
            }
            const bytes = new Uint8Array(event.data);
            try {
              if (bytes.length <= HEADER_MINSIZE) {
                log(
                  "WebRTC",
                  `Dropping RTCDataChannel message at or below header minimum (${HEADER_MINSIZE} bytes)`,
                  LogLevel.DEBUG
                );
                return;
              }
              const opened = await this._openRaw(bytes);
              if (!opened) return;
              controller.enqueue(Packet.deserialize(opened));
            } catch (e) {
              log(
                "WebRTC",
                `Failed to parse incoming message: ${e}`,
                LogLevel.ERROR
              );
            }
          }
        );
        channel.addEventListener("close", () => {
          try {
            controller.close();
          } catch (_e) {
          }
        });
        channel.addEventListener("error", (event) => {
          try {
            controller.error(
              new Error(`RTCDataChannel error: ${event?.message ?? ""}`)
            );
          } catch (_e) {
          }
        });
      },
      cancel: () => {
        try {
          channel.close();
        } catch (_e) {
        }
      }
    });
    this._readable = incoming;
    this._writable = new WritableStream({
      write: async (packet) => {
        if (channel.readyState !== STATE_OPEN) {
          throw new Error("RTCDataChannel is not open");
        }
        this._recordOutbound(packet);
        let raw = packet.serialize();
        raw = await this._sealRaw(raw);
        channel.send(raw);
      },
      close: () => {
        try {
          channel.close();
        } catch (_e) {
        }
      },
      abort: () => {
        try {
          channel.close();
        } catch (_e) {
        }
      }
    });
    this._loopPromise = this._startInboundLoop();
  }
  /**
   * Reads packets from the inbound stream and dispatches them; on stream end
   * treats it as a connection loss (terminal, since WebRTC doesn't reconnect).
   * @private
   */
  async _startInboundLoop() {
    const reader = this._readable.getReader();
    let lost = false;
    try {
      while (true) {
        const { value: packet, done } = await reader.read();
        if (done) {
          lost = true;
          break;
        }
        this._dispatchPacket(packet);
      }
    } catch (e) {
      lost = true;
      if (
        /** @type {any} */
        e.name !== "AbortError" && /** @type {any} */
        e.code !== "ABORT_ERR"
      ) {
        this.dispatchEvent(
          new CustomEvent("error", { detail: (
            /** @type {any} */
            e
          ) })
        );
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (_e) {
      }
      if (lost) {
        this.online = false;
        this._dispatchClosed();
      }
    }
  }
  /**
   * Closes the data channel (and owning peer connection, if any) and dispatches
   * a terminal `disconnected` followed by `closed`.
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      this.channel.close();
    } catch (_e) {
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (_e) {
      }
    }
    this.online = false;
    this.dispatchEvent(new CustomEvent("disconnected"));
    this._dispatchClosed();
    if (this._loopPromise) {
      await this._loopPromise;
    }
  }
};

// node_modules/@reticulum/core/src/webrtc/signaling.js
var DEFAULT_DESTINATION_NAME = "rns.webrtc";
var CAPABILITY_FLAG = 1;
var SDP_TYPE_OFFER = 1;
var SDP_TYPE_ANSWER = 2;
var SDP_TYPE_CANDIDATE = 3;
var MAX_SDP_SIZE = 64 * 1024;
var CHANNEL_LABEL = "reticulum";
async function waitForIceGathering(pc, timeoutMs) {
  const state = pc.iceGatheringState ?? pc.icegatheringState;
  if (state === "complete") return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onChange = () => {
      const s = pc.iceGatheringState ?? pc.icegatheringState;
      if (s === "complete") finish();
    };
    const cleanup = () => {
      pc.removeEventListener?.("icegatheringstatechange", onChange);
      pc.removeEventListener?.("icecandidate", onChange);
    };
    pc.addEventListener?.("icegatheringstatechange", onChange);
    pc.addEventListener?.("icecandidate", onChange);
    setTimeout(finish, timeoutMs);
  });
}
function waitForChannelOpen(channel, timeoutMs) {
  if (channel.readyState === "open") return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve();
    };
    const onOpen = () => finish(null);
    const onError = (e) => finish(new Error(`RTCDataChannel error: ${e?.message ?? e}`));
    const onClose = () => finish(new Error("RTCDataChannel closed before opening"));
    const cleanup = () => {
      channel.removeEventListener?.("open", onOpen);
      channel.removeEventListener?.("error", onError);
      channel.removeEventListener?.("close", onClose);
    };
    channel.addEventListener?.("open", onOpen);
    channel.addEventListener?.("error", onError);
    channel.addEventListener?.("close", onClose);
    setTimeout(
      () => finish(new Error("RTCDataChannel did not open before timeout")),
      timeoutMs
    );
  });
}
var WebRTCSignaling = class extends EventTarget {
  /** @type {boolean} */
  _started = false;
  /** @type {((event: Event) => void) | null} */
  _announceListener = null;
  /** @type {((event: Event) => void) | null} */
  _linkRequestListener = null;
  /** @type {Set<string>} hex peer destination hashes with an active connection attempt. */
  _pending = /* @__PURE__ */ new Set();
  /**
   * @param {WebRTCSignalingOptions} options
   */
  constructor(options) {
    super();
    if (!options?.rns) {
      throw new Error("WebRTCSignaling requires a Reticulum instance (rns)");
    }
    this.rns = options.rns;
    this.identity = options.identity ?? null;
    this.destinationName = options.destinationName ?? DEFAULT_DESTINATION_NAME;
    this.createPeerConnection = options.createPeerConnection ?? null;
    this.rtcConfig = options.rtcConfig ?? {};
    this.extraAppData = options.extraAppData ?? null;
    this.announceOnInit = options.announceOnInit ?? true;
    this.iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? 5e3;
    this.channelOpenTimeoutMs = options.channelOpenTimeoutMs ?? 15e3;
    this.answerTimeoutMs = options.answerTimeoutMs ?? 2e4;
    this.destination = null;
  }
  /**
   * Creates the signaling destination, registers it, subscribes to transport
   * announce events and incoming link requests, and (unless
   * {@link WebRTCSignalingOptions.announceOnInit} is false) announces. Must be
   * called (and awaited, or via {@link WebRTCSignaling#startPromise}) before
   * {@link WebRTCSignaling#connect} or the responder role will work.
   *
   * Idempotent.
   * @returns {Promise<void>}
   */
  async start() {
    if (this._started) return;
    this._started = true;
    if (!this.identity) this.identity = await Identity.generate();
    this.destination = await Destination.IN(
      this.destinationName,
      DestType.SINGLE,
      this.identity,
      this.rns
    );
    this.destination.appData = this._buildAppData();
    this.rns.transport.bindLocalDestination(this.destination);
    this._linkRequestListener = (event) => {
      this._onLinkRequest(
        /** @type {CustomEvent} */
        event
      ).catch(
        (e) => log("WebRTC", `Incoming link handling failed: ${e}`, LogLevel.ERROR)
      );
    };
    this.destination.addEventListener(
      "link_request",
      this._linkRequestListener
    );
    this._announceListener = (event) => {
      this._onAnnounce(
        /** @type {CustomEvent} */
        event
      );
    };
    this.rns.transport.addEventListener("announce", this._announceListener);
    if (this.announceOnInit) await this.announce();
    log(
      "WebRTC",
      `Signaling started as ${toHex(
        /** @type {Uint8Array} */
        this.destination.destinationHash
      )}`,
      LogLevel.NOTICE
    );
  }
  /**
   * (Re)broadcasts the capability announce. Also called from {@link start} when
   * {@link WebRTCSignalingOptions.announceOnInit} is true.
   * @returns {Promise<void>}
   */
  async announce() {
    if (!this.destination) {
      throw new Error("WebRTCSignaling.start() must be called first");
    }
    await this.destination.announce();
  }
  /**
   * Tears down the signaling destination and detaches listeners. Already-open
   * WebRTC interfaces are unaffected (they live independently in the transport
   * once registered).
   */
  stop() {
    if (!this._started) return;
    this._started = false;
    if (this._announceListener) {
      this.rns.transport.removeEventListener(
        "announce",
        this._announceListener
      );
      this._announceListener = null;
    }
    if (this.destination && this._linkRequestListener) {
      this.destination.removeEventListener(
        "link_request",
        this._linkRequestListener
      );
      this._linkRequestListener = null;
    }
    if (this.destination) {
      this.rns.transport.unbindLocalDestination(this.destination);
    }
    log("WebRTC", "Signaling stopped", LogLevel.NOTICE);
  }
  /**
   * Initiates a WebRTC connection to a peer whose destination hash was learned
   * from a `"peer"` event (or otherwise known). Runs the initiator half of the
   * lifecycle: recall the peer identity, open a link, create the data channel,
   * gather ICE, send the offer as a Resource, await the answer Resource, set
   * the remote description, and adopt the opened channel as an interface.
   *
   * Rejects if the peer identity is unknown (wait for its announce), the
   * `RTCPeerConnection` factory is missing, or any negotiation step fails.
   *
   * @param {Uint8Array} peerDestinationHash - The peer's signaling destination hash.
   * @returns {Promise<WebRTCInterface>} The registered interface wrapping the
   *   opened data channel.
   */
  async connect(peerDestinationHash) {
    this._requireStarted();
    this._requirePeerConnectionFactory();
    const peerHex = toHex(peerDestinationHash);
    if (this._pending.has(peerHex)) {
      throw new Error(`Connection to ${peerHex} already in progress`);
    }
    this._pending.add(peerHex);
    try {
      return await this._connectOnce(peerDestinationHash, peerHex);
    } finally {
      this._pending.delete(peerHex);
    }
  }
  /**
   * The actual initiator flow, isolated so {@link connect} can always clear the
   * pending-connection guard via `finally`.
   * @param {Uint8Array} peerDestinationHash
   * @param {string} peerHex
   * @returns {Promise<WebRTCInterface>}
   * @private
   */
  async _connectOnce(peerDestinationHash, peerHex) {
    const peerIdentity = await this.rns.transport.recallIdentity(peerDestinationHash);
    if (!peerIdentity) {
      throw new Error(
        `Unknown identity for ${peerHex}; wait for its announce before connecting.`
      );
    }
    const outDest = await Destination.OUT(
      this.destinationName,
      DestType.SINGLE,
      peerIdentity,
      this.rns
    );
    const link = await outDest.createLink();
    link.maxResourceSize = MAX_SDP_SIZE;
    link.bz2 = void 0;
    const pc = this._newPeerConnection();
    const channel = pc.createDataChannel(CHANNEL_LABEL);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc, this.iceGatheringTimeoutMs);
    const answerPromise = this._receiveSDP(link, SDP_TYPE_ANSWER);
    await this._sendSDP(link, SDP_TYPE_OFFER, pc.localDescription.sdp);
    const answerSdp = await answerPromise;
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await waitForChannelOpen(channel, this.channelOpenTimeoutMs);
    return this._adoptChannel(channel, pc, peerDestinationHash, link);
  }
  // ---------------------------------------------------------------------
  // Responder role (incoming link + offer)
  // ---------------------------------------------------------------------
  /**
   * Accepts an incoming LINKREQUEST on the signaling destination and prepares
   * to receive the offer Resource. The actual SDP processing happens in
   * {@link WebRTCSignaling#_handleOffer}.
   * @param {CustomEvent} event
   * @returns {Promise<void>}
   * @private
   */
  async _onLinkRequest(event) {
    this._requirePeerConnectionFactory();
    const packet = event.detail?.packet;
    if (!packet || !this.destination) return;
    const link = await this.destination.acceptLink(packet);
    link.maxResourceSize = MAX_SDP_SIZE;
    link.bz2 = void 0;
    const onResource = (resEvent) => {
      const resource = resEvent.detail?.resource;
      if (!resource) return;
      resource.whenComplete().then(
        async (res) => {
          await this._handleOffer(link, res);
        }
      ).catch(
        (e) => log("WebRTC", `Offer resource transfer failed: ${e}`, LogLevel.ERROR)
      );
    };
    link.addEventListener("resource", onResource);
  }
  /**
   * Responder: parse the offer, create a peer connection, answer, and adopt the
   * negotiated data channel once it opens.
   * @param {import("../transport/link.js").Link} link
   * @param {import("../core/resource.js").Resource} offerResource
   * @returns {Promise<void>}
   * @private
   */
  async _handleOffer(link, offerResource) {
    const parsed = this._parseSDP(
      /** @type {Uint8Array} */
      offerResource.data
    );
    if (!parsed || parsed.type !== SDP_TYPE_OFFER) {
      log("WebRTC", "Ignoring non-offer SDP resource on signaling link");
      return;
    }
    const pc = this._newPeerConnection();
    pc.addEventListener("datachannel", (dcEvent) => {
      const channel = dcEvent?.channel;
      if (!channel) return;
      waitForChannelOpen(channel, this.channelOpenTimeoutMs).then(() => {
        const peerHash = (
          /** @type {{remoteIdentity?: Identity}} */
          link.remoteIdentity?.identityHash ?? null
        );
        this._adoptChannel(channel, pc, peerHash, link).catch(
          (e) => log(
            "WebRTC",
            `Responder channel adoption failed: ${e}`,
            LogLevel.ERROR
          )
        );
      }).catch(
        (e) => log(
          "WebRTC",
          `Responder data channel did not open: ${e}`,
          LogLevel.ERROR
        )
      );
    });
    await pc.setRemoteDescription({ type: "offer", sdp: parsed.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc, this.iceGatheringTimeoutMs);
    await this._sendSDP(link, SDP_TYPE_ANSWER, pc.localDescription.sdp);
  }
  // ---------------------------------------------------------------------
  // SDP Resource framing + transfer
  // ---------------------------------------------------------------------
  /**
   * Frames and sends an SDP as an uncompressed Resource over the link, awaiting
   * the receiver's completion proof so the caller knows it was delivered.
   * @param {import("../transport/link.js").Link} link
   * @param {number} type One of the {@link SDP_TYPE_OFFER}/{@link SDP_TYPE_ANSWER} constants.
   * @param {string} sdp
   * @returns {Promise<void>}
   * @private
   */
  async _sendSDP(link, type, sdp) {
    const sdpBytes = new TextEncoder().encode(sdp);
    const framed = new Uint8Array(1 + sdpBytes.length);
    framed[0] = type;
    framed.set(sdpBytes, 1);
    const resource = new Resource({
      data: framed,
      link,
      autoCompress: false
      // SDP is small; keep it uncompressed + dependency-free.
    });
    await resource.advertise();
    await resource.whenComplete();
  }
  /**
   * Awaits a single SDP Resource of the expected type on the link. Registered
   * before the matching SDP is sent so a loopback/same-tick responder can't
   * drop its resource before the listener attaches.
   * @param {import("../transport/link.js").Link} link
   * @param {number} expectedType
   * @returns {Promise<string>} The SDP string.
   * @private
   */
  _receiveSDP(link, expectedType) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const onResource = (resEvent) => {
        const resource = resEvent.detail?.resource;
        if (!resource || settled) return;
        resource.whenComplete().then((res) => {
          if (settled) return;
          const parsed = this._parseSDP(
            /** @type {Uint8Array} */
            res.data
          );
          if (!parsed) {
            settled = true;
            cleanup();
            reject(new Error("Received malformed SDP resource"));
            return;
          }
          if (parsed.type !== expectedType) {
            settled = true;
            cleanup();
            reject(
              new Error(
                `Expected SDP type ${expectedType}, got ${parsed.type}`
              )
            );
            return;
          }
          settled = true;
          cleanup();
          resolve(parsed.sdp);
        }).catch((e) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(e);
        });
      };
      const cleanup = () => {
        link.removeEventListener("resource", onResource);
        clearTimeout(timer);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Timed out waiting for SDP answer"));
      }, this.answerTimeoutMs);
      link.addEventListener("resource", onResource);
    });
  }
  /**
   * Parses a framed SDP Resource payload.
   * @param {Uint8Array} bytes
   * @returns {{type: number, sdp: string} | null} `null` for empty/invalid input.
   * @private
   */
  _parseSDP(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 1) return null;
    return { type: bytes[0], sdp: new TextDecoder().decode(bytes.subarray(1)) };
  }
  // ---------------------------------------------------------------------
  // Announce handling (discovery)
  // ---------------------------------------------------------------------
  /**
   * Filters transport announce events to our destination name and dispatches a
   * `"peer"` event for each fresh WebRTC-capable peer. Does not auto-connect —
   * the application decides whether to call {@link connect} for a given peer.
   * @param {CustomEvent} event
   * @private
   */
  _onAnnounce(event) {
    const detail = event.detail ?? {};
    if (!detail.nameHash || !this.destination?.nameHash) return;
    let same = true;
    const a = detail.nameHash;
    const b = this.destination.nameHash;
    if (a.length !== b.length) same = false;
    else for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) same = false;
    if (!same) return;
    if (this.destination.destinationHash && detail.destinationHash && this._bytesEqual(detail.destinationHash, this.destination.destinationHash)) {
      return;
    }
    const appData = (
      /** @type {Uint8Array | null | undefined} */
      detail.appData
    );
    if (!(appData instanceof Uint8Array) || appData.length < 1) return;
    if ((appData[0] & CAPABILITY_FLAG) !== CAPABILITY_FLAG) return;
    this.dispatchEvent(
      new CustomEvent("peer", {
        detail: {
          destinationHash: detail.destinationHash,
          identity: detail.identity,
          hops: detail.packet?.hops ?? 0
        }
      })
    );
  }
  // ---------------------------------------------------------------------
  // Channel adoption + helpers
  // ---------------------------------------------------------------------
  /**
   * Wraps an opened `RTCDataChannel` in a {@link WebRTCInterface}, registers it
   * with the transport, dispatches `"channel"`, and tears down the signaling
   * link (it existed only to carry the SDP).
   * @param {any} channel
   * @param {any} pc
   * @param {Uint8Array | null} peerDestinationHash
   * @param {import("../transport/link.js").Link} link
   * @returns {Promise<WebRTCInterface>}
   * @private
   */
  async _adoptChannel(channel, pc, peerDestinationHash, link) {
    const iface = new WebRTCInterface({
      channel,
      peerConnection: pc,
      name: `webrtc-${peerDestinationHash ? toHex(peerDestinationHash).slice(0, 8) : "peer"}`
    });
    await iface.connect();
    this.rns.addInterface(iface);
    this.dispatchEvent(
      new CustomEvent("channel", {
        detail: { interface: iface, peerDestinationHash }
      })
    );
    link.teardown().catch(() => {
    });
    return iface;
  }
  /**
   * Builds the `app_data` payload for the capability announce.
   * @returns {Uint8Array}
   * @private
   */
  _buildAppData() {
    if (this.extraAppData && this.extraAppData.length > 0) {
      const out = new Uint8Array(1 + this.extraAppData.length);
      out[0] = CAPABILITY_FLAG;
      out.set(this.extraAppData, 1);
      return out;
    }
    return new Uint8Array([CAPABILITY_FLAG]);
  }
  /**
   * Returns a new peer connection from the injected (or browser-global) factory.
   * @returns {any}
   * @private
   */
  _newPeerConnection() {
    if (typeof this.createPeerConnection !== "function") {
      this._requirePeerConnectionFactory();
    }
    return (
      /** @type {(config?: RTCConfiguration) => any} */
      this.createPeerConnection(this.rtcConfig)
    );
  }
  /**
   * @private
   */
  _requireStarted() {
    if (!this._started || !this.destination) {
      throw new Error(
        "WebRTCSignaling.start() must be called and awaited first"
      );
    }
  }
  /**
   * @private
   */
  _requirePeerConnectionFactory() {
    if (typeof this.createPeerConnection === "function") return;
    const g = (
      /** @type {any} */
      globalThis
    );
    if (typeof g.RTCPeerConnection === "function") {
      this.createPeerConnection = (config) => new g.RTCPeerConnection(config);
      return;
    }
    throw new Error(
      "No RTCPeerConnection available: pass createPeerConnection (browser uses the global automatically; Node.js needs the WebRTC companion package \u2014 see work doc #19)."
    );
  }
  /**
   * Constant-time-ish byte compare. Small hashes only.
   * @param {Uint8Array} a
   * @param {Uint8Array} b
   * @returns {boolean}
   * @private
   */
  _bytesEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
};

// node_modules/@reticulum/core/src/transport/kiss-framer.js
var FEND = 192;
var FESC = 219;
var TFEND = 220;
var TFESC = 221;
var CMD_DATA = 0;
var CMD_UNKNOWN = 254;
function kissEscape(data) {
  const escaped = [];
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    if (b === FESC) {
      escaped.push(FESC, TFESC);
    } else if (b === FEND) {
      escaped.push(FESC, TFEND);
    } else {
      escaped.push(b);
    }
  }
  return new Uint8Array(escaped);
}
function kissFrame(rawPacket) {
  const escaped = kissEscape(rawPacket);
  const frame = new Uint8Array(escaped.length + 3);
  frame[0] = FEND;
  frame[1] = CMD_DATA;
  frame.set(escaped, 2);
  frame[frame.length - 1] = FEND;
  return frame;
}
function createKissUnframerStream(packetClass, openRaw = null, maxMtu = 2048) {
  let inFrame = false;
  let inEscape = false;
  let command = CMD_UNKNOWN;
  let dataBuffer = [];
  return new TransformStream({
    /**
     * @param {Uint8Array} chunk
     * @param {TransformStreamDefaultController} controller
     */
    async transform(chunk, controller) {
      log("KISS", `Received ${chunk.length} bytes`, LogLevel.DEBUG);
      for (let idx = 0; idx < chunk.length; idx++) {
        const byte = chunk[idx];
        if (byte === FEND) {
          if (inFrame && command === CMD_DATA) {
            const unescaped = new Uint8Array(dataBuffer);
            try {
              let dataToDeserialize = unescaped;
              if (openRaw) {
                const opened = await openRaw(unescaped);
                if (!opened) continue;
                dataToDeserialize = opened;
              }
              controller.enqueue(packetClass.deserialize(dataToDeserialize));
            } catch (e) {
              log("KISS", `Failed to process frame: ${e}`, LogLevel.ERROR);
            }
          }
          inFrame = true;
          inEscape = false;
          command = CMD_UNKNOWN;
          dataBuffer = [];
          continue;
        }
        if (!inFrame) {
          continue;
        }
        if (dataBuffer.length === 0 && command === CMD_UNKNOWN) {
          command = byte & 15;
          continue;
        }
        if (command !== CMD_DATA) {
          continue;
        }
        if (dataBuffer.length >= maxMtu) {
          log(
            "KISS",
            `Frame exceeded maxMtu (${maxMtu}); discarding`,
            LogLevel.WARNING
          );
          inFrame = false;
          inEscape = false;
          command = CMD_UNKNOWN;
          dataBuffer = [];
          continue;
        }
        if (byte === FESC) {
          inEscape = true;
          continue;
        }
        let out = byte;
        if (inEscape) {
          if (byte === TFEND) {
            out = FEND;
          } else if (byte === TFESC) {
            out = FESC;
          } else {
            log(
              "KISS",
              `Invalid escape sequence: 0xDB 0x${byte.toString(16)}`,
              LogLevel.WARNING
            );
            inFrame = false;
            inEscape = false;
            command = CMD_UNKNOWN;
            dataBuffer = [];
            continue;
          }
          inEscape = false;
        }
        dataBuffer.push(out);
      }
    }
  });
}

// node_modules/@reticulum/core/src/interfaces/websocket.js
var HEADER_MINSIZE2 = 19;
var WebSocketClientInterface = class extends Interface {
  /**
   * Returns the JSON Schema describing the options accepted by the
   * {@link WebSocketClientInterface} constructor (excluding the internal
   * `websocket` adoption option).
   *
   * No field is required: either `url` or (`host` + `port`) must be provided
   * at runtime, but both are surfaced as optional so a UI can render them.
   * @returns {Record<string, any>} A JSON Schema object.
   */
  static getConfigurationSchema() {
    const base = Interface.getConfigurationSchema();
    return {
      ...base,
      title: "WebSocket Client Interface",
      description: "Connects to a remote Reticulum node over a WebSocket and automatically reconnects (as the initiator) after a drop. JS-specific; there is no direct Python reference equivalent.",
      properties: {
        ...base.properties,
        url: {
          type: "string",
          format: "uri",
          description: "Full WebSocket URL, e.g. ws://host:port or wss://host/path. Takes precedence over host/port.",
          examples: ["ws://127.0.0.1:4242", "wss://node.example.org/path"]
        },
        host: {
          type: "string",
          default: "localhost",
          examples: ["localhost", "127.0.0.1"],
          description: "Target host. Used to build ws://host:port (or wss:// when ssl is set) when url is omitted."
        },
        port: {
          type: "integer",
          minimum: 0,
          maximum: 65535,
          examples: [4242],
          description: "Target port. Used to build ws://host:port (or wss:// when ssl is set) when url is omitted."
        },
        ssl: {
          type: "boolean",
          default: false,
          description: "Enable TLS so the dial URL uses the wss:// scheme. Only consulted when url is omitted; an explicit url scheme always wins. Browsers in a secure context (HTTPS) cannot open ws://, so a browser app needs this to reach a TLS-terminating peer."
        },
        ...reconnectSchemaProperties(),
        framing: {
          type: "string",
          enum: ["raw", "kiss"],
          default: "raw",
          description: "Wire framing. Defaults to raw (one RNS packet per binary message). Set to kiss for peers that speak KISS over WebSocket (e.g. some RNode firmware versions)."
        }
      },
      required: [],
      additionalProperties: false
    };
  }
  /**
   * The underlying WebSocket connection, when one has been opened or adopted.
   * Typed loosely because the base `Interface.socket` is declared as a Node
   * socket; we reuse the same field so the base `send()` helper can see it.
   * @type {any}
   */
  socket = null;
  /**
   * Creates a WebSocket client interface.
   * @param {WebSocketClientInterfaceOptions} options
   */
  constructor(options) {
    super();
    this._initReconnectState(options);
    this.ssl = options.ssl === true;
    if (options.url) {
      this.url = options.url;
    } else {
      const host = options.host || "localhost";
      const port = options.port || 0;
      const scheme = this.ssl ? "wss" : "ws";
      this.url = `${scheme}://${host}:${port}`;
    }
    this.name = options.name || `ws-client-${this.url.replace(/^wss?:\/\//, "")}`;
    this.ifacSize = options.ifacSize || 0;
    this.ifacNetname = options.networkName || null;
    this.ifacNetkey = options.passphrase || null;
    this.bitrate = 1e7;
    this.framing = options.framing === "kiss" ? "kiss" : "raw";
    this._readable = null;
    this._writable = null;
    this.online = false;
    this._loopPromise = null;
    this._adoptedWebSocket = options.websocket || null;
    this.initiator = !this._adoptedWebSocket;
  }
  /** @returns {boolean} */
  get isOpen() {
    return this.online;
  }
  /** @returns {any} */
  get readable() {
    return this._readable;
  }
  /** @returns {any} */
  get writable() {
    return this._writable;
  }
  /**
   * Opens the WebSocket connection (or adopts the provided one) and starts the
   * inbound loop.
   *
   * For an initiator whose first dial fails with auto-reconnect enabled, the
   * promise rejects (so the caller knows the first attempt failed) but the
   * reconnect loop keeps retrying in the background.
   * @returns {Promise<void>}
   */
  async connect() {
    if (this._adoptedWebSocket) {
      this.socket = this._adoptedWebSocket;
      this.initiator = false;
      this._setupStreams(this.socket);
      this.online = true;
      this._closed = false;
      this.dispatchEvent(
        new CustomEvent("connected", { detail: { url: this.url } })
      );
      return;
    }
    this.initiator = true;
    try {
      await this._establishConnection();
    } catch (e) {
      if (this.autoReconnect && !this.detached) {
        this._runReconnectLoop();
      }
      throw e;
    }
  }
  /**
   * Dials the WebSocket URL (with the configured connect timeout), sets up the
   * RNS streams, and dispatches `connected`.
   *
   * Used both for the initial connection and for each reconnect attempt.
   * @returns {Promise<void>} Resolves once connected; rejects on failure.
   * @protected
   */
  _establishConnection() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.binaryType = "arraybuffer";
      this.socket = ws;
      let settled = false;
      const timeoutMs = Math.max(0, this.connectTimeout) * 1e3;
      const timeoutHandle = timeoutMs > 0 ? setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch (_e) {
        }
        reject(
          new Error(
            `WebSocket connect to ${this.url} timed out after ${this.connectTimeout}s`
          )
        );
      }, timeoutMs) : null;
      const fail = () => {
        if (settled) return;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        settled = true;
        this.online = false;
        reject(new Error(`WebSocket connection to ${this.url} failed`));
      };
      ws.addEventListener("open", () => {
        if (settled) return;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        settled = true;
        this._setupStreams(ws);
        this.online = true;
        this._closed = false;
        this.dispatchEvent(
          new CustomEvent("connected", { detail: { url: this.url } })
        );
        resolve();
      });
      ws.addEventListener("error", () => fail());
      ws.addEventListener("close", () => fail());
    });
  }
  /**
   * Tears down the WebSocket, cancels any pending reconnect, and marks the
   * interface offline. Dispatches a terminal `disconnected` followed by
   * `closed`.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this._cancelReconnect();
    if (this.socket) {
      try {
        this.socket.close();
      } catch (_e) {
      }
      this.socket = null;
    }
    this.online = false;
    this.dispatchEvent(
      new CustomEvent("disconnected", { detail: { url: this.url } })
    );
    this._dispatchClosed();
    if (this._loopPromise) {
      await this._loopPromise;
    }
  }
  /**
   * Bridges a `WebSocket` into RNS streams. In `raw` framing each binary
   * message is one RNS packet; in `kiss` framing messages carry KISS-framed
   * bytes that are parsed by the streaming unframer (so split/coalesced
   * frames still parse). Outbound packets are serialized (and optionally
   * KISS-framed) and sent as individual binary messages.
   * @param {any} ws
   * @private
   */
  _setupStreams(ws) {
    ws.binaryType = "arraybuffer";
    this._packetWriter = null;
    const framing = this.framing;
    const openRaw = (raw) => this._openRaw(raw);
    const sealRaw = (raw) => this._sealRaw(raw);
    const incoming = new ReadableStream({
      start: (controller) => {
        ws.addEventListener("message", async (event) => {
          if (!(event.data instanceof ArrayBuffer)) {
            log(
              "WebSocket",
              "Ignoring non-binary WebSocket message",
              LogLevel.DEBUG
            );
            return;
          }
          const bytes = new Uint8Array(event.data);
          if (framing === "kiss") {
            controller.enqueue(bytes);
            return;
          }
          try {
            if (bytes.length <= HEADER_MINSIZE2) {
              log(
                "WebSocket",
                `Dropping WebSocket message at or below header minimum (${HEADER_MINSIZE2} bytes)`,
                LogLevel.DEBUG
              );
              return;
            }
            const opened = await openRaw(bytes);
            if (!opened) return;
            const packet = Packet.deserialize(opened);
            if (packet) controller.enqueue(packet);
          } catch (e) {
            log(
              "WebSocket",
              `Failed to parse incoming message: ${e}`,
              LogLevel.ERROR
            );
          }
        });
        ws.addEventListener("close", () => {
          try {
            controller.close();
          } catch (_e) {
          }
        });
        ws.addEventListener("error", () => {
          try {
            controller.error(new Error("WebSocket error"));
          } catch (_e) {
          }
        });
      },
      cancel: () => {
        try {
          ws.close();
        } catch (_e) {
        }
      }
    });
    this._readable = framing === "kiss" ? incoming.pipeThrough(
      /** @type {any} */
      createKissUnframerStream(Packet, openRaw)
    ) : incoming;
    const sink = new WritableStream({
      write: async (packet) => {
        if (ws.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket is not open");
        }
        this._recordOutbound(packet);
        let raw = packet.serialize();
        raw = await sealRaw(raw);
        ws.send(framing === "kiss" ? kissFrame(raw) : raw);
      },
      close: () => {
        try {
          ws.close();
        } catch (_e) {
        }
      },
      abort: () => {
        try {
          ws.close();
        } catch (_e) {
        }
      }
    });
    this._writable = sink;
    this._loopPromise = this._startInboundLoop();
  }
  /**
   * Reads packets from the inbound stream and dispatches them.
   * @private
   */
  async _startInboundLoop() {
    const reader = this._readable.getReader();
    let lost = false;
    try {
      while (true) {
        const { value: packet, done } = await reader.read();
        if (done) {
          lost = true;
          break;
        }
        this._dispatchPacket(packet);
      }
    } catch (e) {
      lost = true;
      if (
        /** @type {any} */
        e.name !== "AbortError" && /** @type {any} */
        e.code !== "ABORT_ERR"
      ) {
        this.dispatchEvent(
          new CustomEvent("error", { detail: (
            /** @type {any} */
            e
          ) })
        );
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (_e) {
      }
      if (lost) {
        this._handleConnectionLost();
      }
    }
  }
};
export {
  ACCEPTED_INTERFACE_TYPES,
  Allow,
  CEType,
  CORE_INSTANCE_TOKEN,
  Channel,
  ChannelException,
  ContextType,
  DISCOVERABLE_TYPES,
  APP_NAME as DISCOVERY_APP_NAME,
  ASPECT as DISCOVERY_ASPECT,
  DEFAULT_STAMP_VALUE as DISCOVERY_DEFAULT_STAMP_VALUE,
  FLAG_ENCRYPTED as DISCOVERY_FLAG_ENCRYPTED,
  FLAG_SIGNED as DISCOVERY_FLAG_SIGNED,
  STATUS_AVAILABLE as DISCOVERY_STATUS_AVAILABLE,
  STATUS_STALE as DISCOVERY_STATUS_STALE,
  STATUS_UNKNOWN as DISCOVERY_STATUS_UNKNOWN,
  THRESHOLD_REMOVE as DISCOVERY_THRESHOLD_REMOVE,
  THRESHOLD_STALE as DISCOVERY_THRESHOLD_STALE,
  THRESHOLD_UNKNOWN as DISCOVERY_THRESHOLD_UNKNOWN,
  WORKBLOCK_EXPAND_ROUNDS2 as DISCOVERY_WORKBLOCK_EXPAND_ROUNDS,
  DestType,
  Destination,
  Direction,
  Envelope,
  HeaderType,
  Identity,
  IdentityCache,
  InterfaceDiscovery,
  LOG_LEVEL_ENV,
  Link,
  LinkChannelOutlet,
  LinkStatus,
  LogLevel,
  MemoryStorageAdapter,
  MessageBase,
  MessageState,
  MicroMsgPack as MsgPack,
  Packet,
  PacketReceipt,
  PacketType,
  Persistor,
  ReceiptStatus,
  Resource,
  ResourceAdvertisement,
  ResourceFlag,
  ResourceResponse,
  ResourceStatus,
  Reticulum,
  STAMP_SIZE,
  SplitResourceAssembler,
  StorageNamespace,
  StreamDataMessage,
  SystemMessageTypes,
  TransportType,
  UnknownIdentityError,
  CAPABILITY_FLAG as WEBRTC_CAPABILITY_FLAG,
  CHANNEL_LABEL as WEBRTC_CHANNEL_LABEL,
  DEFAULT_DESTINATION_NAME as WEBRTC_DEFAULT_DESTINATION_NAME,
  MAX_SDP_SIZE as WEBRTC_MAX_SDP_SIZE,
  SDP_TYPE_ANSWER as WEBRTC_SDP_TYPE_ANSWER,
  SDP_TYPE_CANDIDATE as WEBRTC_SDP_TYPE_CANDIDATE,
  SDP_TYPE_OFFER as WEBRTC_SDP_TYPE_OFFER,
  WORKBLOCK_EXPAND_ROUNDS,
  WORKBLOCK_EXPAND_ROUNDS_PEERING,
  WORKBLOCK_EXPAND_ROUNDS_PN,
  WebRTCSignaling,
  WebSocketClientInterface,
  aspectNameHash,
  base64ToBytes,
  base64UrlToBytes,
  buildDiscoveryAppData,
  buildConfigEntry as buildDiscoveryConfigEntry,
  bytesEqual,
  bytesToBase64,
  bytesToBase64Url,
  concatBytes,
  fromHex,
  fullHash,
  generateDiscoveryStamp,
  generateStamp,
  getLogLevel,
  isHostname,
  isIpAddress,
  log,
  openDuplex,
  openReadable,
  openWritable,
  parseDiscoveryAnnounce,
  parseLogLevel,
  sanitizeName as sanitizeDiscoveryName,
  setLogLevel,
  stampValid,
  stampValue,
  stampWorkblock,
  toHex,
  warnIfFragmented
};
