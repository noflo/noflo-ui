/**
 * Split an object string into its colon-delimited segments.
 * @param {string} objectId
 * @returns {string[]}
 */
export function split(objectId: string): string[];
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
export function parseObject(objectId: string): {
    segments: string[];
    wildcard: boolean;
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
export function covers(tupleHashes: Uint8Array[], wildcard: boolean, requestHashes: Uint8Array[]): boolean;
/**
 * Constant-time-ish byte comparison.
 * @param {Uint8Array} a
 * @param {Uint8Array} b
 * @returns {boolean}
 */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean;
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
export const DELIMITER: ":";
export const WILDCARD: "*";
/** Privacy Salts are 32 bytes of cryptographically secure random data. */
export const SALT_SIZE: 32;
/** All label hashes (and RNS.Identity hashes) are 16 bytes. */
export const HASH_SIZE: 16;
/** The fail-open default salt when none is configured (§3.3 WARNING). */
export const DEFAULT_SALT: Uint8Array<ArrayBuffer>;
/** Maximum number of concurrently-configured Legacy Salts (§10.2). */
export const MAX_LEGACY_SALTS: 2;
export class NamespaceHasher {
    /**
     * @param {Uint8Array} [salt] 32-byte Privacy Salt (defaults to fail-open nulls).
     */
    constructor(salt?: Uint8Array);
    /** @readonly @type {Uint8Array} */
    readonly salt: Uint8Array;
    /** Lazily-imported HMAC CryptoKey, shared across all sign calls. */
    _keyPromise: Promise<CryptoKey> | null;
    /** @returns {Promise<CryptoKey>} */
    _key(): Promise<CryptoKey>;
    /**
     * HMAC-SHA256(salt, relation) truncated to 16 bytes (§3.3).
     * @param {string} relation
     * @returns {Promise<Uint8Array>}
     */
    hashRelation(relation: string): Promise<Uint8Array>;
    /**
     * Return `{ hashes, wildcard }` for an object string (§3.3).
     * @param {string} objectId
     * @returns {Promise<{ hashes: Uint8Array[], wildcard: boolean }>}
     */
    hashObject(objectId: string): Promise<{
        hashes: Uint8Array[];
        wildcard: boolean;
    }>;
    /**
     * A 16-byte tag identifying this salt (§8.3 `salt_id_tag`):
     * `HMAC-SHA256(salt, b"dacar.salt.id")` truncated to 16 bytes.
     * @returns {Promise<Uint8Array>}
     */
    idTag(): Promise<Uint8Array>;
}
