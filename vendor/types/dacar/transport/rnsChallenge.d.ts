/**
 * @typedef {import("../challenge.js").AuthoritativeServer} AuthoritativeServer
 * @typedef {import("@reticulum/core").Destination} DestinationType
 * @typedef {import("@reticulum/core").Link} LinkType
 * @typedef {import("@reticulum/core").Identity} IdentityType
 * @typedef {import("../challenge.js").Transport} Transport
 */
/**
 * @callback ResponseGenerator
 * @param {string} path
 * @param {any} data The §8.3 challenge payload (a `Uint8Array`).
 * @param {Uint8Array} requestId
 * @param {IdentityType | null} remoteIdentity
 * @param {number} requestTime
 * @returns {Promise<Uint8Array | null>}
 */
/**
 * Builds the response_generator answering Challenge requests (§8.4).
 *
 * The returned callable matches the `@reticulum/core` `responseGenerator`
 * contract (PROTOCOL-SPEC.md §11.2): it feeds `data` (the §8.3 challenge
 * payload) to `AuthoritativeServer.handle()` and returns the signed Receipt
 * payload. Malformed or unprocessable challenges yield `null` (no response),
 * which the client treats as a partition → DENY (§8).
 * @param {AuthoritativeServer} server
 * @returns {ResponseGenerator}
 */
export function challengeRequestHandler(server: AuthoritativeServer): ResponseGenerator;
/**
 * Opens an RNS Link to `destination` and awaits ACTIVE (§8.2).
 *
 * @param {DestinationType} destination An OUT destination whose identity is the
 *   authoritative responder.
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs] Establishment timeout in milliseconds.
 * @returns {Promise<LinkType | null>} The active Link, or `null` if it could
 *   not be established within `timeoutMs` (partition → §8 DENY).
 */
export function establishLink(destination: DestinationType, { timeoutMs }?: {
    timeoutMs?: number | undefined;
}): Promise<LinkType | null>;
/** The RNS request path used for the Challenge exchange (§8). */
export const CHALLENGE_REQUEST_PATH: "challenge";
/** Default Challenge round-trip timeout in milliseconds. Partition → §8 DENY. */
export const DEFAULT_CHALLENGE_TIMEOUT_MS: 15000;
/** Default Link establishment timeout in milliseconds (§8.2). */
export const DEFAULT_ESTABLISH_TIMEOUT_MS: 15000;
/**
 * Authoritative endpoint: answers Challenge requests over RNS Links (§8).
 *
 * Because destination creation is asynchronous, construct via the static
 * {@link RnsChallengeServer.create} factory. The server creates the
 * `dacar.auth.v1` destination for `identity`, accepts Links, registers the
 * Challenge request handler, and (by default) announces so clients can find
 * it. A running `Reticulum` instance is assumed.
 */
export class RnsChallengeServer {
    /** The request path Challenge requests are served on (§8). */
    static REQUEST_PATH: string;
    /**
     * @param {Object} opts
     * @param {IdentityType} opts.identity The Authoritative Identity (signs receipts).
     * @param {AuthoritativeServer} opts.server The pure §8 authoritative evaluator.
     * @param {import("@reticulum/core").Reticulum} opts.rns A running Reticulum instance.
     * @param {string} [opts.appName] Override the `dacar` app name.
     * @param {readonly string[]} [opts.aspects] Override the `auth.v1` aspects.
     * @param {boolean} [opts.announce] Whether to announce immediately (default true).
     * @returns {Promise<RnsChallengeServer>}
     */
    static create({ identity, server, rns, appName, aspects, announce, }: {
        identity: IdentityType;
        server: AuthoritativeServer;
        rns: import("@reticulum/core").Reticulum;
        appName?: string | undefined;
        aspects?: readonly string[] | undefined;
        announce?: boolean | undefined;
    }): Promise<RnsChallengeServer>;
    /** @param {AuthoritativeServer} server */
    constructor(server: AuthoritativeServer);
    /** @type {AuthoritativeServer} */
    _server: AuthoritativeServer;
    /** @type {DestinationType | null} */
    _destination: DestinationType | null;
    /** @returns {AuthoritativeServer} */
    get server(): AuthoritativeServer;
    /** @returns {DestinationType | null} */
    get destination(): DestinationType | null;
    /** @returns {Uint8Array | null} The 16-byte destination hash. */
    get destinationHash(): Uint8Array | null;
    /**
     * (Re)announce the destination so clients can resolve a path to it.
     * @returns {Promise<void>}
     */
    announce(): Promise<void>;
}
/**
 * Client-side {@link Transport} over an established Link.
 *
 * Call it with the §8.3 challenge payload: it issues an RNS request on the
 * link and resolves with the signed Receipt bytes, or `null` on any failure —
 * a non-ACTIVE link, a send failure, a timeout, or a partition — which
 * {@link import("../challenge.js").ChallengeClient ChallengeClient} treats as
 * a partition → DENY (§8).
 *
 * `@reticulum/core`'s `Link.request()` throws when the link is not ACTIVE and
 * rejects on timeout/failure, so a single try/catch maps every failure mode to
 * the §8 partition penalty without issuing a request on a link that cannot
 * carry one.
 */
export class RnsLinkTransport {
    /** The request path Challenge requests are sent on (§8). */
    static REQUEST_PATH: string;
    /**
     * @param {LinkType} link An established (or establishable) RNS Link.
     * @param {Object} [opts]
     * @param {string} [opts.requestPath] Override the request path.
     * @param {number} [opts.timeoutMs] Round-trip timeout in milliseconds.
     */
    constructor(link: LinkType, { requestPath, timeoutMs }?: {
        requestPath?: string | undefined;
        timeoutMs?: number | undefined;
    });
    _link: Link;
    _path: string;
    _timeoutMs: number;
    /**
     * @param {Uint8Array} challengePayload
     * @returns {Promise<Uint8Array | null>}
     */
    call(challengePayload: Uint8Array): Promise<Uint8Array | null>;
}
export type AuthoritativeServer = import("../challenge.js").AuthoritativeServer;
export type DestinationType = import("@reticulum/core").Destination;
export type LinkType = import("@reticulum/core").Link;
export type IdentityType = import("@reticulum/core").Identity;
export type Transport = import("../challenge.js").Transport;
export type ResponseGenerator = (path: string, data: any, requestId: Uint8Array, remoteIdentity: IdentityType | null, requestTime: number) => Promise<Uint8Array | null>;
import { Link } from "@reticulum/core";
