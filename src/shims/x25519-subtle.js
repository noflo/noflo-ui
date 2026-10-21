/**
 * @file X25519 polyfill for `crypto.subtle` (work document #21): wraps the
 * WebCrypto SubtleCrypto object and intercepts the X25519 operations that
 * WebKit (including Safari 18.x) does not implement, executing them with
 * @noble/curves' audited RFC 7748 implementation (MIT; loaded dynamically,
 * only when the polyfill is actually needed). Every other operation
 * (including Ed25519, HKDF, AES, HMAC) is delegated to the native subtle
 * untouched.
 *
 * Use via the crypto-subtle shim (aliased into the reticulum-core vendor
 * bundle at build time). X25519 operations route through @noble/curves
 * unless a boot-time probe confirms native support.
 */

/** Marker for polyfilled X25519 key objects. */
const X25519_KEY = Symbol("x25519-polyfill-key");

/**
 * @typedef {Object} PolyfilledX25519Key
 * @property {typeof X25519_KEY} marker
 * @property {"private" | "public"} type
 * @property {Uint8Array} publicBytes 32-byte raw public key
 * @property {Uint8Array | null} privateBytes 32-byte scalar, private keys only
 * @property {boolean} extractable
 * @property {string[]} usages
 */

/**
 * @param {any} key
 * @returns {PolyfilledX25519Key | null}
 */
function asX25519Key(key) {
  return key?.[X25519_KEY] ? key : null;
}

/** Cached @noble/curves module (loaded only when the polyfill is needed). */
/** @type {any} */
let curvesCache = null;

/**
 * @returns {Promise<any>}
 */
async function curves() {
  if (!curvesCache) {
    curvesCache = await import("../../vendor/noble-curves.js");
  }
  return curvesCache;
}

/**
 * Whether the runtime's WebCrypto implements X25519 generateKey.
 *
 * @returns {Promise<boolean>}
 */
/**
 * Whether the runtime's WebCrypto natively implements X25519. Probed at
 * boot; until the probe completes, X25519 operations route through the
 * polyfill (the safe fallback).
 *
 * @type {boolean | null}
 */
let nativeX25519Supported = null;

/**
 * Probes native X25519 support once and records it, so browsers with full
 * support stop routing X25519 through the polyfill after boot.
 *
 * @returns {Promise<void>}
 */
export async function probeX25519Support() {
  nativeX25519Supported = await hasNativeX25519();
}

export async function hasNativeX25519() {
  try {
    await crypto.subtle.generateKey({ name: "X25519" }, true, [
      "deriveKey",
      "deriveBits",
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exports a polyfill-managed X25519 key (the switch's exportKey case,
 * factored out so the intercept's key-kind routing can reach it directly).
 *
 * @param {any[]} args The exportKey arguments: (format, key).
 * @returns {Promise<any>}
 */
async function exportPolyfillKey(args) {
  const key = asX25519Key(args[1]);
  if (!key) throw new Error("X25519 polyfill: no key to export");
  if (!key.extractable) {
    throw new DOMException("key is not extractable", "InvalidAccessError");
  }
  // "jwk" returns a proper JWK object: the identity's persistence path
  // (work document #21's reload round-trip) reads `jwk.x` — raw bytes here
  // made the reload read undefined.length
  if (args[0] === "jwk") {
    return Promise.resolve({
      kty: "OKP",
      crv: "X25519",
      x: bytesToBase64Url(key.publicBytes),
      key_ops: [...key.usages],
      ext: key.extractable,
    });
  }
  const bytes = args[0] === "pkcs8" ? key.privateBytes : key.publicBytes;
  if (!bytes) {
    throw new Error("X25519 polyfill: no key material to export");
  }
  return Promise.resolve(bytes.slice());
}

/**
 * Installs the X25519 polyfill by shadowing `crypto.subtle` with a proxy.
 * Only X25519 operations are intercepted; all other algorithms delegate to
 * the native implementation. Does nothing when the runtime already supports
 * X25519.
 *
 * @returns {Promise<boolean>} Whether the polyfill was installed.
 */
export function createX25519SubtleProxy(/** @type {any} */ nativeSubtle) {
  /**
   * @param {any} target
   * @param {string} operation
   * @param {any[]} args
   */
  const intercept = async (target, operation, args) => {
    const [formatOrAlgorithm, algorithmOrKey] = args;
    // Operation entry points differ: for generateKey/deriveKey/deriveBits
    // the first argument is the algorithm; for importKey it is the format
    // with the algorithm second; for exportKey the format is first and the
    // key second.
    //
    // Key-taking operations route by the KEY's kind, not the global
    // support flag: a polyfill key object must take the polyfill path even
    // after native support is confirmed — the native implementation cannot
    // operate on polyfill key objects, and keys created before the boot
    // probe completes are polyfill objects on fully-native runtimes too
    // (the bridge loaded its identity before the probe resolved; the
    // flag then flipped and native exportKey crashed on the polyfill
    // object — the link responder's "not of type CryptoKey", work
    // document #67).
    let isX25519 = false;
    let polyfillKey = false;
    if (
      operation === "generateKey" ||
      operation === "deriveBits" ||
      operation === "deriveKey"
    ) {
      isX25519 = formatOrAlgorithm?.name === "X25519";
    } else if (operation === "importKey") {
      // importKey args are (format, keyData, algorithm, ...): the algorithm
      // sits at index 2, not 1
      isX25519 = args[2]?.name === "X25519";
    } else if (operation === "exportKey") {
      // Pure key-kind routing: a polyfill key takes the polyfill export
      // (the native implementation cannot read it); anything else is a
      // native CryptoKey by construction — native export works regardless
      // of the probe state
      if (asX25519Key(algorithmOrKey)) {
        return exportPolyfillKey(args);
      }
      return /** @type {any} */ (target)[operation](...args);
    }
    if (operation === "deriveBits" || operation === "deriveKey") {
      polyfillKey = Boolean(asX25519Key(algorithmOrKey));
      isX25519 = isX25519 || polyfillKey;
    }
    if (!isX25519) {
      return /** @type {any} */ (target)[operation](...args);
    }
    if (!polyfillKey && nativeX25519Supported !== null) {
      // The probe resolved and the key is a native CryptoKey (or the
      // runtime lacks X25519 and no native key can exist): use the real
      // thing
      return /** @type {any} */ (target)[operation](...args);
    }
    if (!polyfillKey) {
      // Probe still in flight, but the key is a native CryptoKey — native
      // support demonstrably exists
      return /** @type {any} */ (target)[operation](...args);
    }

    switch (operation) {
      case "generateKey": {
        const { x25519 } = await curves();
        const privateScalar = x25519.utils.randomSecretKey();
        const publicKey = x25519.getPublicKey(privateScalar);
        const extractable = args[1] === true;
        const usages = /** @type {string[]} */ (args[2] ?? []);
        // CryptoKeyPair shape: callers destructure privateKey/publicKey
        const algorithm = { name: "X25519" };
        return Promise.resolve({
          privateKey: {
            [X25519_KEY]: true,
            type: "private",
            algorithm,
            publicBytes: publicKey,
            privateBytes: privateScalar,
            extractable,
            usages,
          },
          publicKey: {
            [X25519_KEY]: true,
            type: "public",
            algorithm,
            publicBytes: publicKey,
            privateBytes: null,
            extractable,
            usages: [],
          },
        });
      }
      case "importKey": {
        const format = formatOrAlgorithm;
        const data = new Uint8Array(algorithmOrKey);
        let publicBytes;
        let privateBytes = null;
        let type = /** @type {"public" | "private"} */ ("public");
        if (format === "raw") {
          publicBytes = data;
        } else if (format === "pkcs8") {
          // exportRawPrivateKey slices the last 32 bytes of a pkcs8 blob,
          // so import accepts both the 32-byte scalar and a padded blob
          const { x25519 } = await curves();
          privateBytes = data.slice(-32);
          publicBytes = x25519.getPublicKey(privateBytes);
          type = "private";
        } else {
          throw new Error(
            `X25519 polyfill: unsupported importKey format ${format}`,
          );
        }
        const extractable = args[3] === true;
        const usages = /** @type {string[]} */ (args[4] ?? []);
        return Promise.resolve({
          [X25519_KEY]: true,
          type,
          algorithm: { name: "X25519" },
          publicBytes,
          privateBytes,
          extractable,
          usages,
        });
      }
      case "exportKey":
        return exportPolyfillKey(args);
      case "deriveBits": {
        const peerPublic = formatOrAlgorithm?.public;
        const peerKey = asX25519Key(peerPublic);
        const peerBytes = peerKey
          ? peerKey.publicBytes
          : new Uint8Array(peerPublic);
        const ownKey = asX25519Key(args[1]);
        if (!ownKey?.privateBytes) {
          throw new Error("X25519 polyfill: private key required");
        }
        const length = args[2];
        const { x25519 } = await curves();
        const shared = x25519.getSharedSecret(ownKey.privateBytes, peerBytes);
        const bits = new Uint8Array(Math.ceil(length / 8));
        bits.set(shared.slice(0, bits.length));
        return Promise.resolve(bits.buffer);
      }
      case "deriveKey": {
        // Derive the shared secret, then hand it to the native subtle as
        // HKDF input for the requested derived algorithm
        const peerPublic = formatOrAlgorithm?.public;
        const peerKey = asX25519Key(peerPublic);
        const peerBytes = peerKey
          ? peerKey.publicBytes
          : new Uint8Array(peerPublic);
        const ownKey = asX25519Key(args[1]);
        if (!ownKey?.privateBytes) {
          throw new Error("X25519 polyfill: private key required");
        }
        const { x25519 } = await curves();
        const shared = x25519.getSharedSecret(ownKey.privateBytes, peerBytes);
        const derivedAlgorithm = args[2];
        const extractable = args[3] === true;
        const usages = args[4] ?? [];
        const input =
          derivedAlgorithm?.name === "HKDF"
            ? await nativeSubtle.importKey("raw", shared, "HKDF", false, [
                "deriveKey",
                "deriveBits",
              ])
            : await nativeSubtle.importKey("raw", shared, "HKDF", false, [
                "deriveKey",
                "deriveBits",
              ]);
        return nativeSubtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: derivedAlgorithm?.salt ?? new Uint8Array(0),
            info: derivedAlgorithm?.info ?? new Uint8Array(0),
          },
          input,
          { name: derivedAlgorithm?.name, length: derivedAlgorithm?.length },
          extractable,
          usages,
        );
      }
      default:
        throw new Error(`X25519 polyfill: unsupported operation ${operation}`);
    }
  };

  return /** @type {any} */ (
    new Proxy(nativeSubtle, {
      get(target, property) {
        if (
          property === "generateKey" ||
          property === "importKey" ||
          property === "exportKey" ||
          property === "deriveBits" ||
          property === "deriveKey"
        ) {
          return (/** @type {any[]} */ ...args) =>
            intercept(target, /** @type {string} */ (property), args);
        }
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    })
  );
}

/**
 * Encodes bytes as base64url (RFC 4648 §5, no padding) — the JWK form of
 * the polyfill's exported keys.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
