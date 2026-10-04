/** Cryptographically secure challenge nonces are 32 bytes. */
export const NONCE_SIZE: 32;
/**
 * The binary verdict carried by a Freshness Receipt.
 */
export type Verdict = number;
export namespace Verdict {
    let DENY: number;
    let ALLOW: number;
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
export class Challenge {
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
    static generate(object: string, relation: string, grantee: Uint8Array, hashers: import("./namespace.js").NamespaceHasher[], { nonce }?: {
        nonce?: Uint8Array<ArrayBufferLike> | undefined;
    }): Challenge;
    /**
     * Decode a challenge payload (§8.4). Plaintext is intentionally unrecoverable.
     * @param {Uint8Array} data
     * @returns {DecodedChallenge}
     */
    static fromPayload(data: Uint8Array): DecodedChallenge;
    /**
     * @param {Object} init
     * @param {string} init.object Plaintext (held only on the client).
     * @param {string} init.relation Plaintext (held only on the client).
     * @param {Uint8Array} init.grantee 16-byte holder identity hash.
     * @param {Uint8Array} init.nonce 32-byte nonce.
     * @param {import("./namespace.js").NamespaceHasher[]} init.hashers Salts to hypothesize over.
     */
    constructor({ object, relation, grantee, nonce, hashers }: {
        object: string;
        relation: string;
        grantee: Uint8Array;
        nonce: Uint8Array;
        hashers: import("./namespace.js").NamespaceHasher[];
    });
    object: string;
    relation: string;
    grantee: Uint8Array<ArrayBufferLike>;
    nonce: Uint8Array<ArrayBufferLike>;
    hashers: import("./namespace.js").NamespaceHasher[];
    /** Serialize the hashed multi-salt challenge (§8.3). @returns {Promise<Uint8Array>} */
    toPayload(): Promise<Uint8Array>;
}
/**
 * @typedef {Object} ReceiptInit
 * @property {number} verdict One of {@link Verdict}.
 * @property {bigint} serverHlc
 * @property {Uint8Array} nonce
 * @property {Uint8Array} [signature]
 */
export class Receipt {
    /** @param {Uint8Array} data @returns {Receipt} */
    static fromPayload(data: Uint8Array): Receipt;
    /** @param {ReceiptInit} init */
    constructor({ verdict, serverHlc, nonce, signature }: ReceiptInit);
    verdict: number;
    serverHlc: bigint;
    nonce: Uint8Array<ArrayBufferLike>;
    signature: Uint8Array<ArrayBufferLike>;
    /** Unpadded concatenation of the fields preceding the signature (41 bytes). @returns {Uint8Array} */
    get preimage(): Uint8Array;
    /** @param {Identity} identity @returns {Promise<Receipt>} */
    sign(identity: Identity): Promise<Receipt>;
    /** @param {PublicKeyLike} identityOrPublicKey @returns {Promise<boolean>} */
    verify(identityOrPublicKey: PublicKeyLike): Promise<boolean>;
    /** @returns {Uint8Array} */
    toPayload(): Uint8Array;
}
/** The Authoritative Identity: evaluates requests and signs Freshness Receipts. */
export class AuthoritativeServer {
    /**
     * @param {Config} config
     * @param {import("./crdt.js").StateVector} state
     * @param {Identity} privateKey Identity holding the signing key.
     * @param {Object} [opts]
     * @param {Clock} [opts.clock]
     */
    constructor(config: Config, state: import("./crdt.js").StateVector, privateKey: Identity, { clock }?: {
        clock?: Clock | undefined;
    });
    _engine: Engine;
    _state: import("./crdt.js").StateVector;
    _config: Config;
    _privateKey: Identity;
    _clock: Clock;
    /** @param {Uint8Array} challengePayload @returns {Promise<Uint8Array>} */
    handle(challengePayload: Uint8Array): Promise<Uint8Array>;
}
/**
 * @callback Transport
 * @param {Uint8Array} challengePayload
 * @returns {Promise<Uint8Array | null> | Uint8Array | null}
 */
/** The requesting node: performs the local pre-check and the challenge exchange. */
export class ChallengeClient {
    /**
     * @param {Config} config
     * @param {import("./crdt.js").StateVector} state
     * @param {PublicKeyLike} authoritativePublicKey
     * @param {Transport} transport
     */
    constructor(config: Config, state: import("./crdt.js").StateVector, authoritativePublicKey: PublicKeyLike, transport: Transport);
    _engine: Engine;
    _state: import("./crdt.js").StateVector;
    _config: Config;
    _publicKey: PublicKeyLike;
    _transport: Transport;
    /**
     * Run the full §8 flow. Resolves true only on a verified server ALLOW.
     * @param {string} objectId
     * @param {string} relation
     * @param {Uint8Array} grantee
     * @returns {Promise<boolean>}
     */
    authorize(objectId: string, relation: string, grantee: Uint8Array): Promise<boolean>;
}
export type PublicKeyLike = Uint8Array | Identity;
export type DecodedEntry = {
    saltIdTag: Uint8Array;
    granteeHash: Uint8Array;
    allowRelationHash: Uint8Array;
    denyRelationHash: Uint8Array;
    objectHashes: Uint8Array[];
};
export type DecodedChallenge = {
    nonce: Uint8Array;
    grantee: Uint8Array;
    entries: DecodedEntry[];
};
export type ReceiptInit = {
    /**
     * One of {@link Verdict}.
     */
    verdict: number;
    serverHlc: bigint;
    nonce: Uint8Array;
    signature?: Uint8Array<ArrayBufferLike> | undefined;
};
export type Transport = (challengePayload: Uint8Array) => Promise<Uint8Array | null> | Uint8Array | null;
import { Identity } from "@reticulum/core";
import { Engine } from "./engine.js";
import { Config } from "./config.js";
import { Clock } from "./hlc.js";
