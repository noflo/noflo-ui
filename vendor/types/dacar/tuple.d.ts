/** Maximum number of Object segments (the Segment Count field is one byte). */
export const MAX_SEGMENTS: 255;
/**
 * @typedef {Object} HashedTupleInit
 * @property {Uint8Array} relationHash 16-byte HMAC of the relation string.
 * @property {Uint8Array[]} objectHashes 16-byte HMAC per non-wildcard segment.
 * @property {boolean} wildcard True iff the Object ended in the suffix `*`.
 * @property {Uint8Array} grantee 16-byte holder identity hash.
 * @property {Uint8Array} issuer 16-byte issuer identity hash or Group ID.
 */
export class Tuple {
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
    static fromPlaintext({ objectId, relation, grantee, issuer, hasher }: {
        objectId: string;
        relation: string;
        grantee: Uint8Array;
        issuer: Uint8Array;
        hasher: import("./namespace.js").NamespaceHasher;
    }): Promise<Tuple>;
    /** @param {HashedTupleInit} init */
    constructor({ relationHash, objectHashes, wildcard, grantee, issuer }: HashedTupleInit);
    /** @readonly */ readonly relationHash: Uint8Array<ArrayBufferLike>;
    /** @readonly */ readonly objectHashes: readonly Uint8Array<ArrayBufferLike>[];
    /** @readonly */ readonly wildcard: boolean;
    /** @readonly */ readonly grantee: Uint8Array<ArrayBufferLike>;
    /** @readonly */ readonly issuer: Uint8Array<ArrayBufferLike>;
    /** §6.1 hash pre-image (excludes Action + HLC). @returns {Uint8Array} */
    get preimage(): Uint8Array;
    /** Canonical 32-byte SHA-256 Tuple Hash (§6.1). @returns {Promise<Uint8Array>} */
    hash(): Promise<Uint8Array>;
    /** Stable unique key derived from the §6.1 pre-image (sync). @returns {string} */
    get key(): string;
    /** Structural equality with another Tuple. @param {Tuple} other @returns {boolean} */
    equals(other: Tuple): boolean;
}
export type HashedTupleInit = {
    /**
     * 16-byte HMAC of the relation string.
     */
    relationHash: Uint8Array;
    /**
     * 16-byte HMAC per non-wildcard segment.
     */
    objectHashes: Uint8Array[];
    /**
     * True iff the Object ended in the suffix `*`.
     */
    wildcard: boolean;
    /**
     * 16-byte holder identity hash.
     */
    grantee: Uint8Array;
    /**
     * 16-byte issuer identity hash or Group ID.
     */
    issuer: Uint8Array;
};
