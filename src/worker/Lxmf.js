/**
 * @file The webapp's LXMF layer (work documents #42 Phase A', #61): the
 * browser is an LXMF participant exactly like any other — an LXMRouter on
 * the shared Reticulum instance the mesh sync already runs (one device
 * identity, several destinations), announcing its own `lxmf.delivery`
 * destination, sending to and receiving from peers directly.
 *
 * The LXMF destination reuses the device's mesh identity (work document
 * #42 update #1's preference): the delivery hash derives from the mesh
 * identity hash, so a peer whose mesh address is known is addressable
 * without an extra discovery round-trip (work document #44 update #13).
 *
 * No propagation node yet (work document #48 M3): sends go direct — a
 * peer without a reachable path fails the send visibly, the same
 * constraint every direct-only LXMF client lives with.
 */

import { LXMessage, LXMFConstants, LXMRouter } from "../../vendor/lxmf.js";
import { fromHex, Identity, toHex } from "../../vendor/reticulum-core.js";
import {
  chunkText,
  contentFields,
  deriveAspectHash,
  deriveDeliveryHash,
  isUnknownIdentityError,
  PEER_DISCOVERY_WAIT_MS,
  PROPAGATION_SYNC_INTERVAL_MS,
} from "../lxmf/protocol.js";

/**
 * Starts the webapp's LXMF layer on the shared Reticulum instance.
 * Resolves once the delivery destination is registered and announcing.
 *
 * @param {object} options
 * @param {any} options.rns - The shared Reticulum instance (the mesh
 *   sync's process — the layer rides it, one mesh node).
 * @param {any} options.identity - The device's mesh identity; the LXMF
 *   destination derives from it.
 * @param {string} [options.name] - Announce display name.
 * @param {number} [options.peerWaitMs] - Per-send announce wait (tests).
 * @param {(msg: string) => void} [options.log]
 * @returns {Promise<{
 *   deliveryHash: string,
 *   sendText: (destinationHex: string, text: string, options?: {title?: string}) => Promise<any[]>,
 *   recallSenderIdentityHash: (message: any) => Promise<string | null>,
 *   verifySender: (message: any) => Promise<boolean>,
 *   recallOrSolicit: (destinationHex: string) => Promise<any>,
 *   discoverContacts: () => Promise<number>,
 *   decodeReaction: (message: any) => { target: string, emoji: string } | null,
 *   syncFromPropagationNode: () => Promise<{ received?: number }>,
 *   onMessage: (handler: (event: { message: any }) => void) => void,
 *   onContact: (handler: (contact: { identityHash: string, destinationHash: string }) => void) => void,
 *   stop: () => void
 * }>}
 */
export async function createLxmfLayer({
  rns,
  identity,
  name = "noflo-ui",
  peerWaitMs = PEER_DISCOVERY_WAIT_MS,
  log = () => {},
}) {
  if (!rns) throw new Error("LXMF layer requires a started Reticulum instance");
  if (!identity) throw new Error("LXMF layer requires the mesh identity");

  const router = new LXMRouter(identity, rns);
  await router.init();
  const deliveryDest = /** @type {any} */ (router.deliveryDest);
  if (!deliveryDest) {
    throw new Error("LXMRouter.init() did not register lxmf.delivery");
  }
  const deliveryHash = toHex(
    /** @type {Uint8Array} */ (deliveryDest.destinationHash),
  );
  log(`lxmf: delivery destination ${deliveryHash}`);
  await router.startAnnouncing(name);

  /**
   * Sends `text` to `destinationHex`, chunked, titled on the first chunk.
   * Delivery is direct: the router escalates direct link → opportunistic
   * packet; a peer with no reachable path fails the send. Returns the sent
   * message instances (post-serialize — the wire form is reconstructible
   * for the history store).
   *
   * @param {string} destinationHex
   * @param {string} text
   * @param {{title?: string}} [sendOptions]
   * @returns {Promise<any[]>}
   */
  async function sendText(destinationHex, text, sendOptions = {}) {
    const chunks = chunkText(text);
    /** @type {any[]} */
    const sent = [];
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
        await router.send(message, identity, {
          // Direct link → opportunistic → the discovered propagation node:
          // the recipient is reachable whenever they next sync
          fallback: propagationNodeHex ? "propagation" : "opportunistic",
          timeoutMs: peerWaitMs,
        });
      } catch (e) {
        if (isUnknownIdentityError(e)) {
          throw new Error(
            `peer ${destinationHex} announce not reachable within ${Math.round(peerWaitMs / 1000)}s`,
            { cause: e },
          );
        }
        throw e;
      }
      sent.push(message);
    }
    return sent;
  }

  /**
   * Recalls a destination's Reticulum identity and returns its identity
   * hash (hex), or null when unknown. Inbound LXMF messages carry the
   * sender's *delivery* destination hash; the thread key is the sender's
   * *identity* hash — the same hash the roster and grants use.
   *
   * @param {any} message
   * @returns {Promise<string | null>}
   */
  async function recallSenderIdentityHash(message) {
    const recall = await rns.transport.recallIdentity(message.sourceHash);
    return recall ? toHex(recall.identityHash) : null;
  }

  /**
   * Verifies an inbound message's signature against the sender's recalled
   * identity. Direct-path deliveries arrive signed by a recalled identity;
   * anything else is unverified and treated as such.
   *
   * @param {any} message
   * @returns {Promise<boolean>}
   */
  async function verifySender(message) {
    const sender = await rns.transport.recallIdentity(message.sourceHash);
    if (!sender) return false;
    return message.verifySignature(sender);
  }

  /**
   * Recalls a destination's identity, soliciting it (a path request that
   * makes the destination answer with a fresh announce) when unknown. When
   * the recalled identity's hash derives exactly the solicited destination,
   * the destination IS that identity's `lxmf.delivery` — the contact fires
   * (a solicited path response does not dispatch a transport announce
   * event, so passive announce listening alone misses this case).
   *
   * @param {string} destinationHex
   * @returns {Promise<any | null>} The recalled identity, null on timeout.
   */
  async function recallOrSolicit(destinationHex) {
    const recalled = await rns.transport
      .recallOrSolicitIdentity(fromHex(destinationHex), peerWaitMs)
      .catch(() => null);
    if (!recalled) return null;
    const identityHash = toHex(recalled.identityHash);
    const expected = await deriveDeliveryHash(identityHash);
    if (expected === destinationHex.toLowerCase()) {
      const contact = { identityHash, destinationHash: expected };
      for (const handler of contactHandlers) handler(contact);
      // A just-learned identity may release messages the router parked
      // (first-contact deliveries from a never-before-heard sender)
      await router.processAllPendingMessages().catch(() => {});
    }
    return recalled;
  }

  /**
   * Scans the transport's known-destinations cache for LXMF delivery
   * destinations: every entry whose hash derives exactly from its own
   * identity is an `lxmf.delivery` destination that peer registered. This
   * catches announces heard at any earlier time — announce events are
   * transient, the cache is not — and runs locally, no network traffic.
   *
   * @returns {Promise<number>} How many contacts were discovered.
   */
  async function discoverContacts() {
    const table = rns.caches?.knownDestinations;
    if (!(table instanceof Map)) return 0;
    const seenIdentities = new Set();
    let found = 0;
    for (const [hashHex, entry] of table.entries()) {
      if (!entry?.publicKey) continue;
      try {
        const identity = await Identity.fromPublicKey(entry.publicKey);
        const identityHash = toHex(identity.identityHash);
        if (seenIdentities.has(identityHash)) continue;
        seenIdentities.add(identityHash);
        const expected = await deriveDeliveryHash(identityHash);
        if (expected !== hashHex.toLowerCase()) continue;
        const contact = { identityHash, destinationHash: expected };
        for (const handler of contactHandlers) handler(contact);
        found += 1;
      } catch {
        // A malformed cache entry is not a discovery failure
      }
    }
    return found;
  }

  /**
   * Decodes an LXMF reaction (FIELD_REACTION) — the peer-to-peer
   * processing signal (Sideband's "thinking" reaction): `target` is the
   * message id the reaction replies to, `emoji` the reaction body. Null
   * when the message carries no reaction.
   *
   * @param {any} message
   * @returns {{ target: string, emoji: string } | null}
   */
  function decodeReaction(message) {
    const field = message?.fields?.get?.(LXMFConstants.FIELD_REACTION);
    if (!field) return null;
    const target = field.get(LXMFConstants.REACTION_TO);
    const emoji = field.get(LXMFConstants.REACTION_CONTENT);
    if (!(target instanceof Uint8Array) || !(emoji instanceof Uint8Array)) {
      return null;
    }
    return {
      target: toHex(target),
      emoji: new TextDecoder().decode(emoji),
    };
  }

  /**
   * Pulls what arrived at the selected propagation node while this
   * endpoint was away. The periodic timer runs the same call; exposed for
   * tests and for an explicit sync-on-demand.
   *
   * @returns {Promise<{ received?: number }>}
   */
  function syncFromPropagationNode() {
    return /** @type {any} */ (router).syncFromPropagationNode(identity);
  }

  /** @type {Array<(event: { message: any }) => void>} */
  const handlers = [];
  // The router's `message` event is the verified, deduplicated dispatch —
  // every delivery path (direct link, opportunistic packet) funnels
  // through it. The raw `deliveryDest` `data` wire event only fires for
  // opportunistic single-packet deliveries, so link-delivered messages
  // never reach handlers attached there (the live finding behind "no
  // communication": direct-link chats were silently dropped)
  const onMessageEvent = (/** @type {any} */ event) => {
    const message = event?.detail?.message;
    if (!message) return;
    for (const handler of handlers) {
      handler({ message });
    }
  };
  /** @type {any} */ (router).addEventListener("message", onMessageEvent);

  // Announce-based contact discovery (work document #42): every announce
  // whose destination hash equals the `lxmf.delivery` derivation of the
  // announcing identity is an LXMF participant. The mesh layer decides
  // which contacts matter (granted peers become the agent's address).
  /** @type {Array<(contact: { identityHash: string, destinationHash: string }) => void>} */
  const contactHandlers = [];
  // Propagation nodes are discovered the same way — the `lxmf.propagation`
  // derivation per identity. The reachable node with the shortest known
  // path is selected; failed syncs put a node on cooldown and the
  // next-best discovered node takes over — a stale path to an offline
  // node must not strand store-and-forward forever. No node runs in the
  // browser (work document #67)
  /** @type {Map<string, { hops: number | null, heardAt: number, failedAt: number }>} */
  const propagationNodes = new Map();
  /** @type {string | null} */
  let propagationNodeHex = null;
  const FAIL_COOLDOWN_MS = 5 * 60_000;

  /**
   * Selects the usable discovered node: fewest known hops wins, unknown
   * hops sort last, recently-failed nodes sit out their cooldown.
   *
   * @returns {boolean} Whether a node is selected.
   */
  function pickPropagationNode() {
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
    /** @type {any} */ (router).setOutboundPropagationNode(fromHex(selected));
    log(`lxmf: propagation node ${selected} selected`);
    return true;
  }
  const onAnnounce = (/** @type {any} */ event) => {
    const detail = event?.detail ?? {};
    const identity = detail.identity;
    if (
      !identity?.identityHash ||
      !(detail.destinationHash instanceof Uint8Array)
    ) {
      return;
    }
    const identityHash = toHex(identity.identityHash);
    const destinationHex = toHex(detail.destinationHash);
    deriveAspectHash(identityHash, "lxmf.delivery")
      .then(async (expected) => {
        if (destinationHex === expected) {
          const contact = { identityHash, destinationHash: expected };
          for (const handler of contactHandlers) handler(contact);
        }
        return deriveAspectHash(identityHash, "lxmf.propagation");
      })
      .then(async (propagationHash) => {
        if (destinationHex !== propagationHash) return;
        const previous = propagationNodes.get(propagationHash);
        propagationNodes.set(propagationHash, {
          hops: rns.transport.hopsTo?.(detail.destinationHash) ?? null,
          heardAt: Date.now(),
          failedAt: previous?.failedAt ?? 0,
        });
        if (!propagationNodeHex) {
          pickPropagationNode();
        } else if (propagationNodeHex === propagationHash) {
          // The incumbent's announce: it is demonstrably alive again —
          // clear any failure cooldown
          const info = propagationNodes.get(propagationHash);
          if (info) info.failedAt = 0;
        }
      })
      .catch(() => {});
  };
  rns.transport.addEventListener("announce", onAnnounce);

  // The periodic sync pulls what arrived at the selected node while this
  // endpoint was away (the pi-lxmf pattern). A failed sync (a link that
  // died before activating — a stale path to an offline node) puts the
  // node on cooldown and fails over to the next-best discovered node
  const syncTimer = setInterval(() => {
    if (!propagationNodeHex) return;
    const nodeHex = propagationNodeHex;
    syncFromPropagationNode()
      .then((/** @type {any} */ res) => {
        if ((res?.received ?? 0) > 0) {
          log(`lxmf: propagation sync delivered ${res.received} message(s)`);
        }
      })
      .catch((/** @type {any} */ e) => {
        log(`lxmf: propagation sync failed: ${e?.message ?? e}`);
        const info = propagationNodes.get(nodeHex);
        if (info) info.failedAt = Date.now();
        propagationNodeHex = null;
        pickPropagationNode();
      });
  }, PROPAGATION_SYNC_INTERVAL_MS);
  if (syncTimer.unref) syncTimer.unref();

  return {
    deliveryHash,
    sendText,
    recallSenderIdentityHash,
    verifySender,
    recallOrSolicit,
    discoverContacts,
    decodeReaction,
    syncFromPropagationNode,
    /**
     * Subscribes to inbound messages.
     *
     * @param {(event: { message: any }) => void} handler
     */
    onMessage(handler) {
      handlers.push(handler);
    },
    /**
     * Subscribes to discovered LXMF contacts.
     *
     * @param {(contact: { identityHash: string, destinationHash: string }) => void} handler
     */
    onContact(handler) {
      contactHandlers.push(handler);
    },
    stop() {
      clearInterval(syncTimer);
      try {
        /** @type {any} */ (router).removeEventListener(
          "message",
          onMessageEvent,
        );
      } catch {
        /* best effort */
      }
      try {
        rns.transport.removeEventListener("announce", onAnnounce);
      } catch {
        /* best effort */
      }
      router.stopAnnouncing();
    },
  };
}
