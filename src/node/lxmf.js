/**
 * @file lxmf.js — the Companion's LXMF plane (work document #67, "Bridge
 * v2: the single-RNS agent layer"): a port of pi-lxmf's `src/lxmf.js`
 * discipline onto the bridge's single process-owned Reticulum instance.
 *
 * What makes this plane reliable is what makes pi-lxmf reliable:
 *
 * - It is started ONCE at bridge boot and never stopped or restarted by
 *   project events — MeshSync's rebinds cannot touch it, because it does
 *   not live inside MeshSync at all.
 * - One send call per message: the router escalates direct link →
 *   opportunistic packet (soliciting the recipient's identity internally)
 *   → propagation store-and-forward. The only retry is for the
 *   propagation node's announce not having landed yet. One message id
 *   across every wire copy, so deduplicating clients render once.
 * - Propagation nodes are DISCOVERED, never run here: announce listeners
 *   match the `lxmf.propagation` destination derivation per peer identity,
 *   the reachable node with the shortest path wins, and a periodic sync
 *   pulls what arrived while we were away.
 * - Inbound diagnostics ride the choke points the chat layer cannot see:
 *   packets that decrypt but park (sender identity unknown) are logged,
 *   because the dispatched-message listener only ever fires for messages
 *   that made it through.
 */

import { LXMessage, LXMFConstants, LXMRouter } from "../../vendor/lxmf.js";
// One copy of the core protocol classes per process: the vendor bundles
// (vendor/lxmf.js re-points @reticulum/core to the sibling
// vendor/reticulum-core.js). Importing the npm packages here would put
// two physical copies of @reticulum/core in the process — the library
// itself warns and cross-copy instanceof checks fail (work document #44
// M2 live-test finding)
import { fromHex, toHex } from "../../vendor/reticulum-core.js";
import {
  chunkText,
  contentFields,
  deriveAspectHash,
  isUnknownIdentityError,
  PEER_DISCOVERY_WAIT_MS,
} from "../lxmf/protocol.js";

/** How long a send may wait for a peer's announce before giving up. */
const SEND_TIMEOUT_MS = 30_000;

/** How long the propagation sync cadence runs (the pi-lxmf default). */
const PROPAGATION_SYNC_INTERVAL_MS = 300_000;

/**
 * Starts the LXMF plane on the process-owned Reticulum instance. Resolves
 * once the delivery destination is registered, announcing has begun, and
 * the propagation discovery is listening.
 *
 * @param {object} options
 * @param {any} options.rns - The bridge's process-owned Reticulum instance.
 * @param {any} options.identity - The Companion's single identity (loaded
 *   once at boot from the RNS storage; the LXMRouter and the mesh plane
 *   share it).
 * @param {string} options.name - Announce display name.
 * @param {string | null} [options.ownerContact] - The owner's
 *   `lxmf.delivery` destination hash (hex); the one-shot hello world goes
 *   here at boot. NULL for unclaimed mode.
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
export async function startLxmfPlane({
  rns,
  identity,
  name,
  ownerContact = null,
  log = () => {},
}) {
  if (!rns) throw new Error("LXMF plane requires a started Reticulum instance");
  if (!identity) throw new Error("LXMF plane requires the Companion identity");

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

  // ---- Inbound diagnostics (pi-lxmf's attachInboundDiagnostics) --------
  // The delivery destination emits "data" the instant a single-packet
  // message decrypts — BEFORE the router resolved the sender. An unknown
  // sender parks the message until its announce arrives: the most common
  // reason a sender sees a delivery proof while the bridge logs nothing.
  const onData = async (/** @type {any} */ event) => {
    const plaintext = event?.detail?.plaintext;
    if (!plaintext) return;
    try {
      const parsed = await LXMessage.deserialize(
        plaintext,
        /** @type {Uint8Array | undefined} */ (deliveryDest.destinationHash),
      );
      const known = await rns.transport.recallIdentity(parsed.sourceHash);
      if (!known) {
        log(
          `companion: inbound packet from ${toHex(parsed.sourceHash)} (${
            plaintext.length
          } bytes) parked — sender identity unknown, waiting for announce`,
        );
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

  await lxmf.startAnnouncing(name);
  log(`companion: announcing as "${name}"`);

  // ---- The dispatched-message listener ---------------------------------
  // The router's `message` event is the verified, deduplicated dispatch —
  // every delivery path (direct link, opportunistic packet, propagation
  // sync) funnels through it.
  /** @type {Array<(event: { message: any, link?: any }) => void>} */
  const handlers = [];
  const onMessageEvent = (/** @type {any} */ event) => {
    const message = event?.detail?.message;
    if (!message) return;
    for (const handler of handlers) {
      handler({ message, link: event.detail.link });
    }
  };
  /** @type {any} */ (lxmf).addEventListener("message", onMessageEvent);

  // ---- The one-shot hello world, delivered when deliverable -------------
  // The greeting fires once, but boot races the transport: the owner's
  // identity may not be reachable and no propagation node may be selected
  // yet. The pending hello retries on exactly the two events that make it
  // deliverable — an announce making the owner known, or a propagation
  // node being selected — and never repeats after delivery. This is a
  // deferred first attempt, not a resend: propagation store-and-forward
  // is what carries messages to absent recipients
  /** @type {string | null} */
  let pendingHello = null;
  const attemptHello = async () => {
    if (!pendingHello || !ownerContact) return;
    const text = pendingHello;
    try {
      await sendText(ownerContact, text, { title: "Companion hello" });
      pendingHello = null;
      log("companion: hello delivered to the owner");
    } catch {
      // Still undeliverable: the retry hooks fire on the next event
    }
  };
  const onPeerLearned = (/** @type {any} */ event) => {
    const identity = event?.detail?.identity;
    if (!identity?.identityHash || !ownerContact) return;
    deriveAspectHash(toHex(identity.identityHash))
      .then((deliveryHash) => {
        if (deliveryHash !== ownerContact.toLowerCase()) return;
        return attemptHello();
      })
      .catch(() => {});
  };
  /** @type {any} */ (lxmf).addEventListener("peer", onPeerLearned);

  // ---- Propagation node discovery (work document #67) ------------------
  // No node runs here. Every announce whose destination hash derives from
  // `lxmf.propagation` on the announcing identity marks a propagation
  // node. The reachable one with the shortest known path is selected;
  // failed syncs put a node on cooldown and the next-best takes over —
  // a stale path to an offline node must not strand store-and-forward
  // forever. The periodic sync pulls what arrived while this endpoint
  // was away — the mechanism that makes asynchronous delivery work
  // without any resend machinery.
  /** @type {Map<string, { hops: number | null, heardAt: number, failedAt: number }>} */
  const propagationNodes = new Map();
  /** @type {string | null} */
  let propagationNodeHex = null;
  const FAIL_COOLDOWN_MS = 5 * 60_000;

  /**
   * Selects the usable discovered node: fewest known hops wins, unknown
   * hops sort last, recently-failed nodes sit out their cooldown.
   *
   * @returns {Promise<boolean>} Whether a node is selected.
   */
  const pickPropagationNode = async () => {
    const now = Date.now();
    const candidates = [...propagationNodes.entries()]
      .filter(([, info]) => now - info.failedAt > FAIL_COOLDOWN_MS)
      .sort(
        (/** @type {any} */ a, /** @type {any} */ b) =>
          (a[1].hops ?? 99) - (b[1].hops ?? 99) || b[1].heardAt - a[1].heardAt,
      );
    const selected = candidates[0]?.[0] ?? null;
    if (!selected || selected === propagationNodeHex) {
      return Boolean(propagationNodeHex);
    }
    propagationNodeHex = selected;
    /** @type {any} */ (lxmf).setOutboundPropagationNode(fromHex(selected));
    log(`companion: propagation node ${selected} selected`);
    // A selected node makes the pending hello deliverable (store-and-
    // forward): the deferred first attempt fires
    attemptHello();
    return true;
  };
  const onAnnounce = (/** @type {any} */ event) => {
    const detail = event?.detail ?? {};
    if (!(detail.destinationHash instanceof Uint8Array)) return;
    if (!detail.identity?.identityHash) return;
    const identityHash = toHex(detail.identity.identityHash);
    const destinationHex = toHex(detail.destinationHash);
    deriveAspectHash(identityHash, "lxmf.propagation")
      .then(async (expected) => {
        if (destinationHex !== expected) return;
        const previous = propagationNodes.get(expected);
        propagationNodes.set(expected, {
          hops: rns.transport.hopsTo?.(detail.destinationHash) ?? null,
          heardAt: Date.now(),
          failedAt: previous?.failedAt ?? 0,
        });
        if (!propagationNodeHex) {
          await pickPropagationNode();
        } else if (propagationNodeHex === expected) {
          // The incumbent's announce: refresh its reachability and clear
          // any failure cooldown — it is demonstrably alive again
          const info = propagationNodes.get(expected);
          if (info) info.failedAt = 0;
        }
      })
      .catch(() => {});
  };
  rns.transport.addEventListener("announce", onAnnounce);

  // The periodic sync: pull what arrived at the selected node while this
  // endpoint was away (the pi-lxmf pattern). A failed sync (a link that
  // died before activating — a stale path to an offline node) puts the
  // node on cooldown and fails over to the next-best discovered node
  const syncTimer = setInterval(() => {
    if (!propagationNodeHex) return;
    const nodeHex = propagationNodeHex;
    /** @type {any} */ (lxmf)
      .syncFromPropagationNode(identity)
      .then((/** @type {any} */ res) => {
        if ((res?.received ?? 0) > 0) {
          log(
            `companion: propagation sync delivered ${res.received} message(s)`,
          );
        }
      })
      .catch((/** @type {any} */ e) => {
        log(
          `companion: propagation sync failed: ${e?.message ?? e}\n${
            e?.stack ?? ""
          }`,
        );
        const info = propagationNodes.get(nodeHex);
        if (info) info.failedAt = Date.now();
        propagationNodeHex = null;
        pickPropagationNode().catch(() => {});
      });
  }, PROPAGATION_SYNC_INTERVAL_MS);
  if (syncTimer.unref) syncTimer.unref();

  // ---- The send escalation ---------------------------------------------
  /**
   * Sends one message through the router's escalation: direct link →
   * opportunistic → propagation (when a node is selected). The only retry
   * covers the fresh-start case where the node's announce has not landed
   * and the handoff declines — solicit the node and resend; the message
   * keeps its messageId across serialize() calls, so wire-level dedup
   * still holds.
   *
   * @param {any} message
   */
  async function sendWithRetry(message) {
    const options =
      /** @type {{ fallback: "propagation" | "opportunistic", timeoutMs: number }} */ ({
        fallback: propagationNodeHex ? "propagation" : "opportunistic",
        timeoutMs: SEND_TIMEOUT_MS,
      });
    try {
      await lxmf.send(message, identity, options);
      return;
    } catch (e) {
      if (
        propagationNodeHex &&
        e instanceof Error &&
        /Propagation node identity unknown/.test(e.message)
      ) {
        log(
          `companion: propagation node unknown — requesting path, waiting ${Math.round(SEND_TIMEOUT_MS / 1000)}s`,
        );
        try {
          await rns.transport.recallOrSolicitIdentity(
            fromHex(propagationNodeHex),
            SEND_TIMEOUT_MS,
          );
        } catch (solicitError) {
          if (isUnknownIdentityError(solicitError)) {
            log(
              "companion: propagation node unreachable — giving up on this send",
            );
            throw e;
          }
          throw solicitError;
        }
        await lxmf.send(message, identity, options);
        log(
          "companion: recipient unreachable directly — submitted via the propagation node",
        );
        return;
      }
      throw e;
    }
  }

  /**
   * Sends `text` to `destinationHex`, chunked, titled on the first chunk.
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
      await sendWithRetry(message);
    }
  }

  /**
   * Sends an LXMF reaction (FIELD_REACTION) — the "processing" signal, no
   * separate chat bubble. Same router-escalated delivery as `sendText`.
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
    await sendWithRetry(message);
  }

  /**
   * Verifies an inbound message's signature against the sender's recalled
   * identity. The router verifies on the direct path; a message pulled via
   * `syncFromPropagationNode` whose sender is not yet recalled arrives
   * unverified (the Python reference's SOURCE_UNKNOWN) — the caller drops
   * those.
   *
   * @param {any} message
   * @returns {Promise<"verified"|"unknown"|"invalid">}
   */
  async function verifySender(message) {
    const sender = await rns.transport.recallIdentity(message.sourceHash);
    if (!sender) return "unknown";
    return (await message.verifySignature(sender)) ? "verified" : "invalid";
  }

  /**
   * Recalls the sender's Reticulum identity hash (hex), or null when the
   * identity is not yet known.
   *
   * @param {any} message
   * @returns {Promise<string | null>}
   */
  async function senderIdentityHash(message) {
    const sender = await rns.transport.recallIdentity(message.sourceHash);
    return sender ? toHex(sender.identityHash) : null;
  }

  return {
    identityHash: toHex(identity.identityHash),
    identity,
    deliveryHash,
    sendText,
    sendReaction,
    verifySender,
    senderIdentityHash,
    /**
     * Subscribes to dispatched inbound messages.
     *
     * @param {(event: { message: any, link?: any }) => void} handler
     */
    onMessage(handler) {
      handlers.push(handler);
    },
    stop() {
      clearInterval(syncTimer);
      try {
        /** @type {any} */ (deliveryDest).removeEventListener("data", onData);
      } catch {
        /* best effort */
      }
      try {
        rns.transport.removeEventListener("announce", onAnnounce);
      } catch {
        /* best effort */
      }
      try {
        /** @type {any} */ (lxmf).removeEventListener(
          "message",
          onMessageEvent,
        );
      } catch {
        /* best effort */
      }
      lxmf.stopAnnouncing();
    },
  };
}
