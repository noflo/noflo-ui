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
export function verifyOperation(operation: import("./operation.js").Operation, resolver: KeyResolver | Keyring): Promise<boolean>;
/**
 * Public-key material needed to verify an Operation from one Issuer.
 *
 * A single-identity Issuer has `threshold === 1` and one member key; a
 * Threshold Group Issuer (§4.1) has `threshold === N` and `M >= N` member keys.
 * Each member key is the full 64-byte RNS public key returned by
 * `Identity.getPublicKey()` (X25519 ‖ Ed25519), reconstructable via
 * `Identity.fromPublicKey()`.
 */
export class IssuerKeyset {
    /**
     * Keyset for a single-identity Issuer (threshold 1).
     * @param {Uint8Array} publicKey
     * @returns {IssuerKeyset}
     */
    static single(publicKey: Uint8Array): IssuerKeyset;
    /**
     * Keyset for an N-of-M Threshold Group Issuer (§4.1).
     * @param {Uint8Array[]} memberPublicKeys
     * @param {number} threshold
     * @returns {IssuerKeyset}
     */
    static group(memberPublicKeys: Uint8Array[], threshold: number): IssuerKeyset;
    /**
     * @param {Uint8Array[]} memberPublicKeys One (single identity) or M (group)
     *   64-byte RNS public keys.
     * @param {number} [threshold] Consensus threshold N (defaults to 1).
     */
    constructor(memberPublicKeys: Uint8Array[], threshold?: number);
    /** @type {Uint8Array[]} */
    memberPublicKeys: Uint8Array[];
    /** @type {number} */
    threshold: number;
}
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
export class Keyring {
    /** @type {Map<string, IssuerKeyset>} */
    _map: Map<string, IssuerKeyset>;
    /**
     * Map a 16-byte Issuer hash to its `IssuerKeyset`.
     * @param {Uint8Array} issuerHash
     * @param {IssuerKeyset} keyset
     * @returns {Keyring}
     */
    register(issuerHash: Uint8Array, keyset: IssuerKeyset): Keyring;
    /**
     * @param {Uint8Array} issuerHash
     * @param {Uint8Array} publicKey
     * @returns {Keyring}
     */
    registerSingle(issuerHash: Uint8Array, publicKey: Uint8Array): Keyring;
    /**
     * @param {Uint8Array} groupId
     * @param {Uint8Array[]} memberPublicKeys
     * @param {number} threshold
     * @returns {Keyring}
     */
    registerGroup(groupId: Uint8Array, memberPublicKeys: Uint8Array[], threshold: number): Keyring;
    /**
     * @param {Uint8Array} issuerHash
     * @returns {IssuerKeyset | null}
     */
    resolve(issuerHash: Uint8Array): IssuerKeyset | null;
    /**
     * Remove an Issuer from the keyring.
     * @param {Uint8Array} issuerHash
     * @returns {boolean} `true` if the Issuer was present (and is now removed).
     */
    forget(issuerHash: Uint8Array): boolean;
    /**
     * Return `[issuerHashHex, keyset]` pairs for all registered Issuers.
     * @returns {[string, IssuerKeyset][]}
     */
    entries(): [string, IssuerKeyset][];
    /** Number of registered Issuers. @returns {number} */
    get size(): number;
    /** @param {Uint8Array} issuerHash @returns {boolean} */
    has(issuerHash: Uint8Array): boolean;
}
/**
 * Resolves a 16-byte Issuer hash to its verification keyset, or `null` when the
 * Issuer is unknown (the Operation is then rejected as unverifiable). May be
 * async (e.g. backed by RNS Identity resolution over the network).
 */
export type KeyResolver = (issuerHash: Uint8Array) => (IssuerKeyset | null | Promise<IssuerKeyset | null>);
