/**
 * @file lxmf.js — the Companion's LXMF layer (work document #44 M2, SPEC
 * "The NoFlo UI Companion"): the always-on, addressable, cross-project
 * LXMF endpoint. Announces, receives commands/prompts/invites, sends
 * replies and narration.
 *
 * Wiring lifted from pi-lxmf `src/lxmf.js` (work document #44: "copy,
 * don't extract"), with one architectural difference: the Companion does
 * NOT build its own Reticulum instance — it rides the engine's shared
 * stack (one mesh node, work document #47), handed in by the entry
 * through the engine's `getReticulum` seam.
 *
 * Companion state (the LXMF identity) lives outside the project folder
 * (SPEC: multiple Companions on one machine each use a different identity
 * and work dir; Companion state never inside project directories).
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { FileStorageAdapter } from "@reticulum/node";
import { LXMessage, LXMFConstants, LXMRouter } from "../../vendor/lxmf.js";
// One copy of the core protocol classes per process: the vendor bundles
// (vendor/lxmf.js re-points @reticulum/core to the sibling
// vendor/reticulum-core.js). Importing the npm packages here would put
// two physical copies of @reticulum/core in the process — the library
// itself warns and cross-copy instanceof checks fail (work document #44
// M2 live-test finding)
import {
  fromHex,
  Identity,
  toHex,
  UnknownIdentityError,
} from "../../vendor/reticulum-core.js";

/** How long a send may wait for a peer's announce before giving up. */
const PEER_DISCOVERY_WAIT_MS = 30_000;

/** How long an inbound verification may wait for the sender's announce. */
const SENDER_SOLICIT_WAIT_MS = 15_000;

/** Default chunking for outbound text (LXMF bodies are sized for mesh links). */
const CHUNK_CHARS = 2500;

/**
 * Derives an `lxmf.delivery` destination hash from a Reticulum identity
 * hash (hex). SINGLE-destination hashes are `SHA256(nameHash ||
 * identityHash)[:16]` — a pure function of the identity hash, so the
 * owner's chat address needs no second config value and no announce
 * (SPEC: the owner Reticulum identity IS the default global trust anchor;
 * the contact is derived, not configured).
 *
 * @param {string} identityHashHex - 32-hex-char identity hash.
 * @returns {Promise<string>} The 32-hex-char `lxmf.delivery` hash.
 */
export async function deriveDeliveryHash(identityHashHex) {
  const encoder = new TextEncoder();
  const nameHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode("lxmf.delivery"),
  );
  const nameHash = new Uint8Array(nameHashBuffer.slice(0, 10));
  const identityHash = fromHex(identityHashHex);
  const combined = new Uint8Array(nameHash.length + identityHash.length);
  combined.set(nameHash, 0);
  combined.set(identityHash, nameHash.length);
  const destHashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return toHex(new Uint8Array(destHashBuffer.slice(0, 16)));
}

/**
 * Whether `e` is the typed unknown-identity failure the router throws when
 * a destination's identity is neither recallable nor solicitable.
 *
 * @param {unknown} e
 * @returns {boolean}
 */
export function isUnknownIdentityError(e) {
  return e instanceof UnknownIdentityError;
}

/**
 * Builds the fields map signaling the outbound content format
 * (FIELD_RENDERER): replies are Markdown, and clients such as Sideband
 * only render them as such when the field says so.
 *
 * @returns {Map<number, number>}
 */
export function contentFields() {
  const fields = new Map();
  fields.set(LXMFConstants.FIELD_RENDERER, LXMFConstants.RENDERER_MARKDOWN);
  return fields;
}

/**
 * Splits `text` into chunks of at most `size` characters, breaking on
 * paragraph boundaries when possible.
 *
 * @param {string} text
 * @param {number} size
 * @returns {string[]}
 */
export function chunkText(text, size = CHUNK_CHARS) {
  if (text.length <= size) return [text];
  /** @type {string[]} */
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
}

/**
 * Starts the LXMF layer on the shared Reticulum instance. Resolves once
 * the delivery destination is registered and announcing has begun.
 *
 * @param {object} options
 * @param {any} options.rns - The engine's shared Reticulum instance.
 * @param {string} options.stateDir - Companion state directory (holds the
 *   LXMF identity storage; must be outside any project folder).
 * @param {string} options.name - Announce display name.
 * @param {string|null} [options.ownerContact] - The owner's `lxmf.delivery`
 *   destination hash (hex). When set, a hello-world is sent at startup and
 *   inbound messages from other identities are dropped by the caller's
 *   gate (the layer itself is transport-agnostic).
 * @param {number} [options.peerWaitMs] - Per-send announce wait (tests).
 * @param {(msg: string) => void} [options.log]
 * @returns {Promise<{
 *   identityHash: string,
 *   identity: any,
 *   deliveryHash: string,
 *   sendText: (destinationHex: string, text: string, options?: {title?: string}) => Promise<void>,
 *   sendReaction: (destinationHex: string, targetMessageId: Uint8Array, emoji: string) => Promise<void>,
 *   verifySender: (message: any) => Promise<"verified"|"unknown"|"invalid">,
 *   senderIdentityHash: (message: any) => Promise<string | null>,
 *   onMessage: (handler: (event: { message: any, link?: any }) => void) => void,
 *   stop: () => void
 * }>}
 */
export async function startLxmfLayer({
  rns,
  stateDir,
  name,
  ownerContact = null,
  peerWaitMs = PEER_DISCOVERY_WAIT_MS,
  log = () => {},
}) {
  if (!rns) throw new Error("LXMF layer requires a started Reticulum instance");
  mkdirSync(stateDir, { recursive: true });
  const storageDir = join(stateDir, "storage");
  if (!existsSync(storageDir)) {
    // The shared instance already persists its own transport state; the
    // LXMF identity gets its own storage subtree
    mkdirSync(storageDir, { recursive: true });
  }

  // The node's stable LXMF identity: loaded from (or created in) the
  // persistent state directory. This hash IS the node's address.
  const adapter = new FileStorageAdapter(storageDir);
  const identity = await Identity.loadOrGenerate(adapter);
  const identityHash = toHex(identity.identityHash);
  log(`companion: LXMF identity ${identityHash}`);

  const lxmf = new LXMRouter(identity, rns);
  await lxmf.init();
  const deliveryDest = /** @type {any} */ (lxmf.deliveryDest);
  if (!deliveryDest) {
    throw new Error("LXMRouter.init() did not register lxmf.delivery");
  }
  const deliveryHash = toHex(
    /** @type {Uint8Array} */ (deliveryDest.destinationHash),
  );
  log(`companion: lxmf.delivery destination ${deliveryHash}`);

  await lxmf.startAnnouncing(name);
  log(`companion: announcing as "${name}"`);

  /**
   * Sends `text` to `destinationHex`, chunked, titled on the first chunk.
   * Delivery escalates inside the router's `send`: DIRECT link →
   * opportunistic packet → propagation store-and-forward.
   *
   * @param {string} destinationHex
   * @param {string} text
   * @param {{title?: string}} [sendOptions]
   */
  async function sendText(destinationHex, text, sendOptions = {}) {
    const chunks = chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const content =
        chunks.length > 1 && !isLast
          ? `${chunks[i]}\n\n[… ${i + 1}/${chunks.length}]`
          : chunks[i];
      const message = new LXMessage({
        sourceHash: /** @type {Uint8Array} */ (deliveryDest.destinationHash),
        destinationHash: fromHex(destinationHex),
        content,
        fields: contentFields(),
        ...(i === 0 && sendOptions.title ? { title: sendOptions.title } : {}),
      });
      try {
        await lxmf.send(message, identity, {
          fallback: "opportunistic",
          timeoutMs: peerWaitMs,
        });
      } catch (e) {
        if (!isUnknownIdentityError(e)) throw e;
        throw new Error(
          `peer ${destinationHex} announce not reachable within ${Math.round(peerWaitMs / 1000)}s`,
          { cause: e },
        );
      }
    }
  }

  /**
   * Sends an LXMF reaction (FIELD_REACTION) to `destinationHex`, targeting
   * the message whose `messageId` is `targetMessageId`. Rendered natively
   * by Sideband/Columba; no `content` is set so no separate chat bubble
   * appears. Same router-escalated delivery as `sendText`.
   *
   * @param {string} destinationHex
   * @param {Uint8Array} targetMessageId
   * @param {string} emoji
   * @returns {Promise<void>}
   */
  async function sendReaction(destinationHex, targetMessageId, emoji) {
    const reaction = new Map();
    reaction.set(LXMFConstants.REACTION_TO, targetMessageId);
    reaction.set(
      LXMFConstants.REACTION_CONTENT,
      new TextEncoder().encode(emoji),
    );
    const fields = new Map();
    fields.set(LXMFConstants.FIELD_REACTION, reaction);
    const message = new LXMessage({
      sourceHash: /** @type {Uint8Array} */ (deliveryDest.destinationHash),
      destinationHash: fromHex(destinationHex),
      fields,
    });
    await lxmf.send(message, identity, {
      fallback: "opportunistic",
      timeoutMs: peerWaitMs,
    });
  }

  /**
   * Verifies an inbound message's signature against the sender's recalled
   * identity. The router verifies on the direct path; propagation-synced
   * messages whose sender is not yet recalled arrive unverified — the
   * caller must drop those ("unknown").
   *
   * @param {any} message
   * @returns {Promise<"verified"|"unknown"|"invalid">}
   */
  async function verifySender(message) {
    const sender = await recallOrSolicit(message.sourceHash);
    if (!sender) return "unknown";
    return (await message.verifySignature(sender)) ? "verified" : "invalid";
  }

  /**
   * Recalls an identity for a destination hash, soliciting it (path
   * request → awaited announce) when not yet known. Inbound messages on
   * first contact arrive without the sender's announce — opportunistic
   * delivery needs only the recipient's path — so without solicitation
   * the sender's signature is unverifiable and the message lost. The
   * claimant's client is online at claim time, so a short wait suffices.
   *
   * @param {Uint8Array} destinationHash
   * @returns {Promise<any | null>}
   */
  async function recallOrSolicit(destinationHash) {
    const recall = await rns.transport.recallIdentity(destinationHash);
    if (recall) return recall;
    if (typeof rns.transport.recallOrSolicitIdentity !== "function") {
      return null;
    }
    try {
      return await rns.transport.recallOrSolicitIdentity(
        destinationHash,
        SENDER_SOLICIT_WAIT_MS,
      );
    } catch {
      return null;
    }
  }

  /**
   * Recalls the sender's Reticulum identity hash (hex), or null when the
   * identity is not yet known. The claim bootstrap persists this hash as
   * the owner identity (work document #47 scope item 1).
   *
   * @param {any} message
   * @returns {Promise<string | null>}
   */
  async function senderIdentityHash(message) {
    const sender = await recallOrSolicit(message.sourceHash);
    return sender ? toHex(sender.identityHash) : null;
  }

  /** @type {Array<(event: { message: any, link?: any }) => void>} */
  const handlers = [];
  const onData = async (/** @type {any} */ event) => {
    const plaintext = event?.detail?.plaintext;
    if (!plaintext) return;
    try {
      const message = await LXMessage.deserialize(
        plaintext,
        /** @type {Uint8Array | undefined} */ (deliveryDest.destinationHash),
      );
      for (const handler of handlers) {
        handler({ message });
      }
    } catch (e) {
      log(
        `companion: inbound packet (${plaintext.length} bytes) could not be parsed: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  };
  /** @type {any} */ (deliveryDest).addEventListener("data", onData);

  return {
    identityHash,
    identity,
    deliveryHash,
    sendText,
    sendReaction,
    verifySender,
    senderIdentityHash,
    /**
     * Subscribes to inbound messages. Multiple handlers allowed; the
     * caller owns gating (owner check, signature verification, ordering).
     *
     * @param {(event: { message: any, link?: any }) => void} handler
     */
    onMessage(handler) {
      handlers.push(handler);
    },
    stop() {
      try {
        /** @type {any} */ (deliveryDest).removeEventListener("data", onData);
      } catch {
        /* best effort */
      }
      lxmf.stopAnnouncing();
    },
  };
}
