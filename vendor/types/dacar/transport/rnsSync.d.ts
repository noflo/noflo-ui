/**
 * @typedef {import("../delta.js").DeltaReceiver} DeltaReceiverType
 * @typedef {import("@reticulum/core").Destination} DestinationType
 * @typedef {import("@reticulum/core").Link} LinkType
 * @typedef {import("@reticulum/core").Identity} IdentityType
 * @typedef {import("@reticulum/core").Reticulum} ReticulumType
 */
/**
 * Encodes the push ack: a MessagePack map `{applied: <n>}`.
 * @param {number} applied
 * @returns {Uint8Array}
 */
export function packAck(applied: number): Uint8Array;
/**
 * Decodes a push ack; `null` when missing/undecodable (counts as failure).
 *
 * Returns the applied count (`0` = the node refused the Delta — kept in the
 * sender's outbox; `>= 1` = accepted and merged).
 * @param {Uint8Array | null | undefined} data
 * @returns {number | null}
 */
export function unpackAck(data: Uint8Array | null | undefined): number | null;
/**
 * Transport-free inbound seam: apply one push request to `receiver`.
 *
 * Tries the payload as a single raw §5.3 Delta first, then as a §11.1 batch
 * (a MessagePack array of Delta payloads). The two shapes are unambiguous: an
 * Operation payload is an 8-element mixed array, a batch is an array of
 * binary elements. Resolves with the number of Deltas applied (0 = decoded
 * but nothing accepted, or undecodable garbage — never rejects: a request
 * handler must not crash on arbitrary bytes).
 * @param {DeltaReceiverType} receiver
 * @param {Uint8Array} data
 * @returns {Promise<number>}
 */
export function handlePush(receiver: DeltaReceiverType, data: Uint8Array): Promise<number>;
/**
 * @callback ResponseGenerator
 * @param {string} path
 * @param {Uint8Array} data
 * @param {Uint8Array} requestId
 * @param {LinkType | null} linkId
 * @param {IdentityType | null} remoteIdentity
 * @param {number} requestTime
 * @returns {Promise<Uint8Array | null>}
 */
/**
 * Builds the responseGenerator ingesting pushed Deltas (§11).
 *
 * The returned callable matches the `@reticulum/core` `responseGenerator`
 * contract: it feeds `data` to {@link handlePush} and resolves with the ack
 * bytes. Every outcome yields a response — even `{applied: 0}` — so the
 * pusher can distinguish "node refused (kept in outbox)" from "request lost
 * (retry)".
 * @param {DeltaReceiverType} receiver
 * @returns {ResponseGenerator}
 */
export function syncRequestHandler(receiver: DeltaReceiverType): ResponseGenerator;
/**
 * Build the OUT `dacar.sync.v1` destination for a recalled identity and await
 * a transport path to it.
 *
 * `targetHash` must be recallable (an earlier announce or the durable keyring
 * path — the CLI seeds both before calling). Sends a `path?` request for the
 * derived destination hash and polls until the node's path-response announce
 * populates the path table (a `LINKREQUEST` to a destination with no known
 * route is silently dropped — see `ensureRfedPath` in cli/session for the
 * same rationale).
 *
 * @param {ReticulumType} rns A booted Reticulum.
 * @param {Uint8Array} targetHash The node's 16-byte identity hash.
 * @param {Object} [opts]
 * @param {string} [opts.appName] Override the `dacar` app name.
 * @param {readonly string[]} [opts.aspects] Override the `sync.v1` aspects.
 * @param {number} [opts.timeoutMs] Max path wait in milliseconds.
 * @param {number} [opts.pollIntervalMs] Poll interval in milliseconds.
 * @param {() => void} [opts.onRequest] Invoked once when the path request fires.
 * @returns {Promise<{destination: DestinationType, destinationHash: Uint8Array}>}
 * @throws {Error} When the identity is unknown or no path resolves in time.
 */
export function ensureSyncPath(rns: ReticulumType, targetHash: Uint8Array, { appName, aspects, timeoutMs, pollIntervalMs, onRequest, }?: {
    appName?: string | undefined;
    aspects?: readonly string[] | undefined;
    timeoutMs?: number | undefined;
    pollIntervalMs?: number | undefined;
    onRequest?: (() => void) | undefined;
}): Promise<{
    destination: DestinationType;
    destinationHash: Uint8Array;
}>;
/**
 * Push raw §5.3 Delta payloads to a node over one Link (§11, doc #16 4a).
 *
 * `targetHash` is the *node identity hash* (16 bytes) — the sync destination
 * `dacar.sync.v1` is derived from it. Opens one Link, sends one request per
 * payload, and parses each ack: `applied >= 1` → accepted (`true`); `applied
 * === 0` → the node refused (`false` — e.g. unknown issuer, stale §9,
 * future-skewed §12); no/undecodable response → `false` (lost request —
 * retry is safe, CRDT merge is idempotent).
 *
 * Returns the per-payload acceptance flags. The caller records accepted
 * Deltas in the sent box / drains them from the outbox (work doc #11 — the
 * same durable-issuance lifecycle as rfed/LXMF publishes).
 *
 * @param {Uint8Array[]} payloads Signed §5.3 Operation payloads.
 * @param {Uint8Array} targetHash The node's 16-byte identity hash.
 * @param {Object} opts
 * @param {ReticulumType} opts.rns A booted Reticulum instance.
 * @param {string} [opts.requestPath] Override the `delta` request path.
 * @param {number} [opts.timeoutMs] Per-Delta round-trip timeout in milliseconds.
 * @param {number} [opts.pathTimeoutMs] Path resolution timeout in milliseconds.
 * @param {number} [opts.establishTimeoutMs] Link establishment timeout.
 * @param {() => void} [opts.onRequest] Invoked once when the path request fires.
 * @returns {Promise<boolean[]>}
 */
export function pushDeltas(payloads: Uint8Array[], targetHash: Uint8Array, { rns, requestPath, timeoutMs, pathTimeoutMs, establishTimeoutMs, onRequest, }?: {
    rns: ReticulumType;
    requestPath?: string | undefined;
    timeoutMs?: number | undefined;
    pathTimeoutMs?: number | undefined;
    establishTimeoutMs?: number | undefined;
    onRequest?: (() => void) | undefined;
}): Promise<boolean[]>;
/**
 * Send one Delta as a Link request and resolve with the ack verdict.
 *
 * Exported as the client-side seam (mirrors the Python ``_push_one``): an
 * inactive link, a send failure, a timeout, an undecodable response, and an
 * `{applied: 0}` refusal all resolve `false` — every failure mode is
 * retry-safe because CRDT merge is idempotent.
 *
 * @param {LinkType} link
 * @param {string} requestPath
 * @param {Uint8Array} payload
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export function pushOne(link: LinkType, requestPath: string, payload: Uint8Array, timeoutMs: number): Promise<boolean>;
/** The RNS request path Deltas are pushed on. */
export const SYNC_REQUEST_PATH: "delta";
/** Default per-Delta round-trip timeout in milliseconds. */
export const DEFAULT_PUSH_TIMEOUT_MS: 15000;
/** Default wait for the target's path-response announce, in milliseconds. */
export const DEFAULT_PATH_TIMEOUT_MS: 15000;
/**
 * Direct-link Delta ingestion endpoint over RNS Links (§11, doc #16 4a).
 *
 * Because destination creation is asynchronous, construct via the static
 * {@link RnsSyncServer.create} factory. The server creates the
 * `dacar.sync.v1` destination for `identity`, accepts Links, registers the
 * Delta push request handler, and (by default) announces so pushers can
 * resolve a path. A running `Reticulum` instance is assumed. This is also the
 * seam an MCU firmware's request handler mirrors: verified Link identity →
 * `DeltaReceiver.applyPayload()` → act.
 */
export class RnsSyncServer {
    /** The request path pushed Deltas are served on. */
    static REQUEST_PATH: string;
    /**
     * @param {Object} opts
     * @param {IdentityType} opts.identity The node identity (deltas are ingested
     *   by issuer signatures, not the server's — this signs nothing).
     * @param {DeltaReceiverType} opts.receiver The shared receive boundary.
     * @param {ReticulumType} opts.rns A running Reticulum instance.
     * @param {string} [opts.appName] Override the `dacar` app name.
     * @param {readonly string[]} [opts.aspects] Override the `sync.v1` aspects.
     * @param {boolean} [opts.announce] Whether to announce immediately (default true).
     * @returns {Promise<RnsSyncServer>}
     */
    static create({ identity, receiver, rns, appName, aspects, announce, }: {
        identity: IdentityType;
        receiver: DeltaReceiverType;
        rns: ReticulumType;
        appName?: string | undefined;
        aspects?: readonly string[] | undefined;
        announce?: boolean | undefined;
    }): Promise<RnsSyncServer>;
    /** @param {DeltaReceiverType} receiver */
    constructor(receiver: DeltaReceiverType);
    /** @type {DeltaReceiverType} */
    _receiver: DeltaReceiverType;
    /** @type {DestinationType | null} */
    _destination: DestinationType | null;
    /** @returns {DeltaReceiverType} */
    get receiver(): DeltaReceiverType;
    /** @returns {DestinationType | null} */
    get destination(): DestinationType | null;
    /** @returns {Uint8Array | null} The 16-byte destination hash. */
    get destinationHash(): Uint8Array | null;
    /**
     * (Re)announce the destination so pushers can resolve a path to it.
     * @returns {Promise<void>}
     */
    announce(): Promise<void>;
}
export type DeltaReceiverType = import("../delta.js").DeltaReceiver;
export type DestinationType = import("@reticulum/core").Destination;
export type LinkType = import("@reticulum/core").Link;
export type IdentityType = import("@reticulum/core").Identity;
export type ReticulumType = import("@reticulum/core").Reticulum;
export type ResponseGenerator = (path: string, data: Uint8Array, requestId: Uint8Array, linkId: LinkType | null, remoteIdentity: IdentityType | null, requestTime: number) => Promise<Uint8Array | null>;
