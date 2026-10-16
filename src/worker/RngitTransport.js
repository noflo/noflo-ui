/**
 * @file The rngit transport (work document #9, step C): the link-level
 * client the materializer pushes through. Mirrors the Python
 * `ReticulumGitClient` protocol and the proven mesh flows (Bootstrap's
 * path-then-recall, the component editor's identify):
 *
 *  - request a path to the rngit node, poll the identity recall until the
 *    announce populates the known-destination store;
 *  - `Destination.OUT` on the repository aspect, a link, `identify()` with
 *    this device's mesh identity — the identity the server resolves
 *    permissions against and validates materialized signatures against;
 *  - requests are msgpack maps over `/mgmt/work` with the integer
 *    repository-index key; responses are `status byte || msgpack payload`;
 *  - responses arrive bz2-compressed: the link carries the compression
 *    provider (vendor/bz2.js).
 *
 * Signing happens here, at materialization time, by the pushing identity
 * (work document #9 update #14): the server validates every payload's
 * signature against the link's presented identity, so the pushing
 * identity is the document's author on the board.
 */

import {
  Destination,
  DestType,
  fromHex,
  MsgPack,
} from "../../vendor/reticulum-core.js";
import { createBz2 } from "./bz2.js";

/** Destination aspect for an rngit repository node (the Python client's
 * constant). */
export const RNGIT_ASPECT = "git.repositories";

/** Request path for work-document operations. */
export const RNGIT_PATH_WORK = "/mgmt/work";

/** The request map's repository-path key (an integer, mirrored from the
 * Python client — msgpack preserves the integer/string distinction). */
export const RNGIT_IDX_REPOSITORY = 0;

/** The OK status byte (the Python client's response statuses). */
const STATUS_OK = 0;

/** The pause after `identify()` so the responder records the identity
 * before the first request (the Python client's LINKIDENTIFY cadence). */
const IDENTIFY_DELAY_MS = 150;

/** Interval between identity-recall polls while awaiting a path response
 * (the Bootstrap flow's cadence). */
const RECALL_POLL_MS = 500;

/**
 * @typedef {Object} RngitTransportOptions
 * @property {any} rns The shared Reticulum instance (the engine worker's
 *   mesh node).
 * @property {any} identity This device's mesh identity — the link presents
 *   it, the server resolves its repository grants, and it signs the
 *   materialized payloads.
 * @property {string} targetHash The rngit node's destination hash (32 hex).
 * @property {string} group The repository group (first URL segment).
 * @property {string} repo The repository name (second URL segment).
 * @property {number} [recallTimeoutMs=30000] Max time to learn the remote
 *   identity.
 * @property {number} [requestTimeoutMs=120000] Per-request timeout.
 * @param {number} [options.recallTimeoutMs=30000] Max time to learn the
 *   remote identity.
 * @param {number} [options.requestTimeoutMs=120000] Per-request timeout.
 */
export class RngitTransport {
  /**
   * @param {RngitTransportOptions} options
   */
  constructor({
    rns,
    identity,
    targetHash,
    group,
    repo,
    recallTimeoutMs,
    requestTimeoutMs,
  }) {
    this.rns = rns;
    this.identity = identity;
    this.targetHash = targetHash;
    this.repoPath = `${group}/${repo}`;
    this.recallTimeoutMs = recallTimeoutMs ?? 30_000;
    this.requestTimeoutMs = requestTimeoutMs ?? 120_000;
    /** @type {any} */
    this.link = null;
  }

  /**
   * Establishes the link: path request, identity recall, destination,
   * link, identify — with the bz2 provider for the compressed responses.
   *
   * @returns {Promise<void>}
   */
  async connect() {
    const hashBytes = fromHex(this.targetHash);
    try {
      await this.rns.transport.requestPath(hashBytes);
    } catch {
      // Best effort: a periodic announce may still populate the store
    }
    const deadline = Date.now() + this.recallTimeoutMs;
    let remoteIdentity = null;
    while (Date.now() < deadline) {
      remoteIdentity = await this.rns.transport.recallIdentity(hashBytes);
      if (remoteIdentity) break;
      await new Promise((resolve) => setTimeout(resolve, RECALL_POLL_MS));
    }
    if (!remoteIdentity) {
      throw new Error("rngit remote identity not resolved");
    }
    const destination = await Destination.OUT(
      RNGIT_ASPECT,
      DestType.SINGLE,
      remoteIdentity,
      this.rns,
    );
    this.link = await destination.createLink();
    // rngit compresses its responses: the link needs the provider
    this.link.bz2 = await createBz2();
    await this.link.identify(this.identity);
    // Give the responder a tick to process LINKIDENTIFY before the first
    // request (the Python client's cadence)
    await new Promise((resolve) => setTimeout(resolve, IDENTIFY_DELAY_MS));
  }

  /**
   * Signs bytes with this device's mesh identity: the materialization
   * signature the server validates against the link's presented identity.
   *
   * @param {Uint8Array} bytes
   * @returns {Promise<Uint8Array>}
   */
  async sign(bytes) {
    return this.identity.sign(bytes);
  }

  /**
   * Sends one `/mgmt/work` request and decodes the response.
   *
   * @param {Record<string, any>} fields The operation fields (operation,
   *   title, content, signature, doc_id, …).
   * @returns {Promise<any>} The decoded payload, or null for an OK
   *   response with no body.
   */
  async send(fields) {
    if (!this.link) throw new Error("Not connected; call connect() first.");
    // The Map keeps the integer repository-index key an integer on the
    // wire (the Python client's contract)
    const data = new Map();
    data.set(RNGIT_IDX_REPOSITORY, this.repoPath);
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data.set(key, value);
    }
    const response = await this.link.request(RNGIT_PATH_WORK, data, {
      timeout: this.requestTimeoutMs,
    });
    return parseRngitResponse(response);
  }

  /** Tears the link down. Safe to call repeatedly. */
  async close() {
    try {
      await this.link?.teardown();
    } catch {
      /* best-effort graceful close */
    }
    this.link = null;
  }
}

/**
 * Decodes a `/mgmt/work` response blob (`status byte || msgpack payload`).
 *
 * @param {Uint8Array} response
 * @returns {any}
 */
export function parseRngitResponse(response) {
  if (!response) {
    throw new Error("Empty response from the rngit remote");
  }
  const status = response[0];
  if (status !== STATUS_OK) {
    const text =
      response.length > 1 ? new TextDecoder().decode(response.subarray(1)) : "";
    throw new Error(text || `rngit request failed (status ${status})`);
  }
  if (response.length <= 1) return null;
  return MsgPack.decode(response.subarray(1));
}
