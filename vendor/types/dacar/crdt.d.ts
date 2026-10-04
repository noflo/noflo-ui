/** Default deletion horizon H for Time-Horizon Tombstone Pruning (§9). */
export const DEFAULT_DELETION_HORIZON_DAYS: 180;
export class StateVector {
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
    static fromPayload(data: Uint8Array, { deletionHorizonDays, trusted }?: {
        deletionHorizonDays?: number | undefined;
        trusted?: boolean | undefined;
    }): StateVector;
    /**
     * @param {Object} [opts]
     * @param {number} [opts.deletionHorizonDays] Deletion horizon H (§9).
     */
    constructor({ deletionHorizonDays }?: {
        deletionHorizonDays?: number | undefined;
    });
    /** @type {Map<string, Entry>} */
    _entries: Map<string, Entry>;
    deletionHorizonDays: number;
    /** Deletion horizon in milliseconds. @returns {number} */
    get deletionHorizonMs(): number;
    /** Number of distinct tuples known (active or revoked). @returns {number} */
    get size(): number;
    /** @param {string} key @returns {boolean} */
    has(key: string): boolean;
    /** @param {string} key @returns {Entry | undefined} */
    get(key: string): Entry | undefined;
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
    ingest(operation: import("./operation.js").Operation, keyResolver: import("./verifier.js").KeyResolver | import("./verifier.js").Keyring, options?: {
        nowMs?: number | undefined;
        maxFutureMs?: number | null | undefined;
    }): Promise<boolean>;
    /**
     * Apply one Operation (Delta) to the appropriate set (§6.1, §9, §12).
     * @param {import("./operation.js").Operation} operation
     * @param {Object} [options]
     * @param {number} [options.nowMs] Override the wall clock for testing.
     * @param {number | null} [options.maxFutureMs] Max clock skew; null disables.
     * @returns {boolean} true if applied, false if rejected.
     */
    apply(operation: import("./operation.js").Operation, { nowMs, maxFutureMs }?: {
        nowMs?: number | undefined;
        maxFutureMs?: number | null | undefined;
    }): boolean;
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
    merge(other: StateVector): void;
    /**
     * Run Time-Horizon Tombstone Pruning (§9). Deletes both the Add and Remove
     * entries for any tuple that resolves inactive *and* whose Add and Remove
     * timestamps are both older than the horizon. Returns the count pruned.
     * @param {Object} [opts]
     * @param {number} [opts.nowMs]
     * @returns {number}
     */
    prune({ nowMs }?: {
        nowMs?: number | undefined;
    }): number;
    /** @param {string} key @returns {boolean} */
    isActive(key: string): boolean;
    /** @param {Entry} entry @returns {boolean} */
    _isActiveEntry(entry: Entry): boolean;
    /** Generator yielding every currently active Tuple. @returns {Generator<Tuple>} */
    activeTuples(): Generator<Tuple>;
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
    toPayload(): Uint8Array;
}
export type Entry = {
    tuple: Tuple;
    addTs: bigint | null;
    removeTs: bigint | null;
};
import { Tuple } from "./tuple.js";
