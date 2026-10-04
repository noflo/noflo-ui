export class DeltaReceiver {
    /**
     * Encode a list of §5.3 Operation payloads as a batch (§11.1). Inverse of
     * `applyPayloads()`: `MsgPack.encode([...])` of already-signed Operation
     * payload byte-strings, suitable for publishing as one bulk sync message.
     * @param {Uint8Array[]} operationPayloads
     * @returns {Uint8Array}
     */
    static packPayloads(operationPayloads: Uint8Array[]): Uint8Array;
    /**
     * Decode -> verify -> apply incoming Delta payloads (§11.2.4).
     * @param {import("./crdt.js").StateVector} state
     * @param {import("./verifier.js").KeyResolver | import("./verifier.js").Keyring} keyResolver
     */
    constructor(state: import("./crdt.js").StateVector, keyResolver: import("./verifier.js").KeyResolver | import("./verifier.js").Keyring);
    _state: import("./crdt.js").StateVector;
    _resolver: import("./verifier.js").Keyring | import("./verifier.js").KeyResolver;
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
    applyPayload(payload: Uint8Array, options?: {
        nowMs?: number | undefined;
        maxFutureMs?: number | null | undefined;
    }): Promise<boolean>;
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
    applyPayloads(payload: Uint8Array, options?: {
        nowMs?: number | undefined;
        maxFutureMs?: number | null | undefined;
    }): Promise<number>;
}
