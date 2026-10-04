/** Ed25519 signatures are always 64 bytes. */
export const SIGNATURE_SIZE: 64;
/** HLC timestamps travel as 64-bit big-endian unsigned integers. */
export const HLC_BYTES: 8;
/**
 * The effect of an Operation on the CRDT.
 */
export type Action = number;
export namespace Action {
    let REVOKE: number;
    let GRANT: number;
}
/**
 * @typedef {Object} OperationInit
 * @property {Tuple} tuple
 * @property {number} action One of {@link Action}.
 * @property {bigint} hlc
 * @property {Uint8Array[]} [signatures] 64-byte signatures (empty if unsigned).
 */
export class Operation {
    /**
     * Coerce a public-key-like value into an `@reticulum/core` Identity.
     * @param {Identity | Uint8Array} value
     * @returns {Promise<Identity>}
     */
    static _asIdentity(value: Identity | Uint8Array): Promise<Identity>;
    /**
     * Deserialize a §5.3 transport payload.
     * @param {Uint8Array} data
     * @returns {Operation}
     */
    static fromPayload(data: Uint8Array): Operation;
    /** @param {OperationInit} init */
    constructor({ tuple, action, hlc, signatures }: OperationInit);
    tuple: Tuple;
    action: number;
    hlc: bigint;
    /** @type {Uint8Array[]} */
    signatures: Uint8Array[];
    get issuer(): Uint8Array<ArrayBufferLike>;
    get grantee(): Uint8Array<ArrayBufferLike>;
    get relationHash(): Uint8Array<ArrayBufferLike>;
    get objectHashes(): readonly Uint8Array<ArrayBufferLike>[];
    get wildcard(): boolean;
    /** §5.2 signature pre-image. @returns {Uint8Array} */
    get preimage(): Uint8Array;
    /**
     * Return a copy signed with one or more `@reticulum/core` Identities holding
     * private keys. Each identity produces one signature, in argument order.
     * Pass one identity for a single-identity issuer, or `N` member identities for
     * a Threshold Group issuer (§5.2).
     * @param {...Identity} identities
     * @returns {Promise<Operation>}
     */
    sign(...identities: Identity[]): Promise<Operation>;
    /**
     * Verify a single-identity Operation against one public key (§5.2).
     * @param {Identity | Uint8Array} identityOrPublicKey
     * @returns {Promise<boolean>}
     */
    verify(identityOrPublicKey: Identity | Uint8Array): Promise<boolean>;
    /**
     * Verify a Threshold Group Operation (§5.2, §4.1). Requires exactly
     * `threshold` signatures, each valid against a *distinct* member public key.
     * Duplicate signatures, or signatures verifying against the same public key
     * more than once, are rejected.
     * @param {(Identity | Uint8Array)[]} memberPublicKeys
     * @param {number} threshold
     * @returns {Promise<boolean>}
     */
    verifyThreshold(memberPublicKeys: (Identity | Uint8Array)[], threshold: number): Promise<boolean>;
    /**
     * Verify against a resolved `IssuerKeyset` (§11.2.4 bridge). A resolver maps
     * the Operation's 16-byte Issuer hash to a keyset; this confirms the
     * threshold signature against it.
     * @param {import("./verifier.js").IssuerKeyset} keyset
     * @returns {Promise<boolean>}
     */
    verifyKeyset(keyset: import("./verifier.js").IssuerKeyset): Promise<boolean>;
    /** §5.3 transport payload (the Operation must be signed first). @returns {Uint8Array} */
    toPayload(): Uint8Array;
}
export type OperationInit = {
    tuple: Tuple;
    /**
     * One of {@link Action}.
     */
    action: number;
    hlc: bigint;
    /**
     * 64-byte signatures (empty if unsigned).
     */
    signatures?: Uint8Array<ArrayBufferLike>[] | undefined;
};
import { Tuple } from "./tuple.js";
import { Identity } from "@reticulum/core";
