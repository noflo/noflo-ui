/** Maximum delegation hops in a single evaluation path (§7.2). */
export const DEFAULT_MAX_DEPTH: 10;
/** Maximum evaluation steps (visited nodes) per request (§7.2). */
export const DEFAULT_MAX_VISITED: 50;
/** The reserved relation that confers the authority to delegate (§3.2). */
export const ADMIN_RELATION: "admin";
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
export class Engine {
    /**
     * @param {import("./config.js").Config} config
     * @param {import("./crdt.js").StateVector} state
     * @param {EngineOptions} [options]
     */
    constructor(config: import("./config.js").Config, state: import("./crdt.js").StateVector, options?: EngineOptions);
    config: import("./config.js").Config;
    state: import("./crdt.js").StateVector;
    maxDepth: number;
    maxVisited: number;
    /**
     * Hash the plaintext request with every configured salt (§7.1, §10.2) and
     * resolve it. Returns true iff (object, relation, grantee) is ALLOWED.
     * @param {string} objectId
     * @param {string} relation
     * @param {Uint8Array} grantee
     * @returns {Promise<boolean>}
     */
    evaluate(objectId: string, relation: string, grantee: Uint8Array): Promise<boolean>;
    /**
     * Evaluate pre-hashed per-salt hypotheses (§7.3, §10.2). Synchronous: all
     * required hashes are already present in each hypothesis. The total-work bound
     * is shared across all hypotheses. Used by the §8 challenge server.
     * @param {Uint8Array} grantee
     * @param {Hypothesis[]} hypotheses
     * @returns {boolean}
     */
    evaluateHashes(grantee: Uint8Array, hypotheses: Hypothesis[]): boolean;
}
export type Hypothesis = {
    hasher: import("./namespace.js").NamespaceHasher;
    /**
     * Exact request object hashes for this salt.
     */
    objectHashes: Uint8Array[];
    /**
     * HMAC of the requested relation.
     */
    allowRelationHash: Uint8Array;
    /**
     * HMAC of "-"+requested relation.
     */
    denyRelationHash: Uint8Array;
    /**
     * HMAC of "admin".
     */
    adminAllowHash: Uint8Array;
    /**
     * HMAC of "-admin".
     */
    adminDenyHash: Uint8Array;
};
export type EngineOptions = {
    maxDepth?: number | undefined;
    maxVisited?: number | undefined;
};
