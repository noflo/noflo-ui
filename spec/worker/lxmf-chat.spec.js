/**
 * @file The LXMF chat chain over a real transport (work documents #42
 * Phase A', #61): two in-process Reticulum instances on a TCP loopback —
 * one playing the webapp (the worker's LXMF layer), one playing the
 * Companion (the Node LXMF layer under the chat surface's gate). The test
 * proves the whole path the browser conversation rides: the webapp sends
 * a real LXMF message, the Companion's gate admits a verified project
 * participant, the prompt reaches pi, and the reply goes back to the
 * sender — signed, encrypted, no CRDT anywhere in the chain.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveDeliveryHash } from "../../src/lxmf/protocol.js";
import { createChatSurface } from "../../src/node/chat.js";
import { startLxmfPlane } from "../../src/node/lxmf.js";
import { createLxmfLayer } from "../../src/worker/Lxmf.js";
import { Identity } from "../../vendor/reticulum-core.js";
import { makeLoopback } from "./loopback-peer.js";

const WAIT_MS = 10_000;

/** Resolves after `ms`, so announce flooding and path learning settle. */
const settle = (/** @type {number} */ ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("LXMF chat chain (work documents #42 Phase A', #61)", () => {
  it("delivers a browser prompt to the Companion and the reply back — signed, no CRDT", {
    timeout: 60_000,
  }, async () => {
    const loopback = await makeLoopback();
    try {
      const webappIdentity = await Identity.generate();
      const companionIdentity = await Identity.generate();
      const webappHash = Array.from(webappIdentity.identityHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const companionHash = Array.from(companionIdentity.identityHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // The webapp side: the worker's LXMF layer
      const webapp = await createLxmfLayer({
        rns: loopback.rnsA,
        identity: webappIdentity,
        name: "webapp",
        log: () => {},
      });
      // The Companion side: the Node LXMF layer (the mesh identity)
      const companion = await startLxmfPlane({
        rns: loopback.rnsB,
        identity: companionIdentity,
        name: "companion",
        log: () => {},
      });

      // The destination is a pure function of the identity hash: the
      // webapp derives the Companion's address from the peer hash alone
      assert.equal(
        await deriveDeliveryHash(companionHash),
        companion.deliveryHash,
        "the derived delivery hash matches the Companion's",
      );

      // Announce-based contact discovery: the webapp hears the
      // Companion's lxmf.delivery announce
      /** @type {Array<{ identityHash: string, destinationHash: string }>} */
      const contacts = [];
      webapp.onContact((contact) => contacts.push(contact));
      await settle(1500);
      assert.ok(
        contacts.some((contact) => contact.identityHash === companionHash),
        "the Companion's announce registers as an LXMF contact",
      );

      // The Companion's chat surface: the webapp user is a project
      // participant (isParticipant answers the grants verdict), the owner
      // contact is a different identity entirely
      /** @type {string[]} */
      const prompts = [];
      /** @type {Array<{ to: string, text: string, title: string }>} */
      const sent = [];
      const surface = createChatSurface({
        ownerContact: "aa".repeat(32),
        sendText: async (to, text, opts = {}) => {
          sent.push({ to, text, title: opts.title ?? "" });
          // The layer's real send: the reply rides LXMF to the sender
          await companion.sendText(to, text, opts);
        },
        verifySender: companion.verifySender,
        pi: {
          prompt: async (/** @type {string} */ text) => {
            prompts.push(text);
          },
          isRunning: () => true,
          status: async () => null,
          suspend: () => {},
          compact: async () => {},
          newSession: async () => {},
          setModel: async () => null,
          client: null,
        },
        isParticipant: (identityHash) => identityHash === webappHash,
        senderIdentityHash: companion.senderIdentityHash,
        state: {
          get: async () => null,
          set: async () => {},
        },
        log: () => {},
      });
      companion.onMessage((event) => {
        surface.handleInbound(event).catch(() => {});
      });

      // The webapp sends the prompt
      /** @type {Array<{ content: string }>} */
      const inbound = [];
      webapp.onMessage(({ message }) => inbound.push(message));
      await webapp.sendText(companion.deliveryHash, "implement FooBar");
      await settle(2000);

      assert.deepEqual(prompts, ["implement FooBar"], "pi got the prompt");

      // The reply goes back to the sender — the participant, not the
      // owner contact
      await surface.reply("implemented; tests green", "pi");
      await settle(2000);
      assert.equal(sent.length >= 1, true, "the reply left the Companion");
      assert.equal(
        sent[0].to,
        webapp.deliveryHash,
        "the reply addresses the webapp's destination, not the owner",
      );
      assert.equal(sent[0].title, "pi");
      assert.equal(inbound.length >= 1, true, "the webapp received the reply");
      assert.equal(
        inbound[0].content,
        "implemented; tests green",
        "the reply content arrived intact (encrypted to the destination)",
      );
      // Sender verification on the webapp side: the reply's signature
      // verifies against the recalled Companion identity
      assert.equal(
        await webapp.verifySender(inbound[0]),
        true,
        "the reply's sender signature verifies",
      );

      webapp.stop();
      companion.stop();
    } finally {
      await loopback.close();
    }
  });

  it("discovers a late-booting peer through solicited announce", {
    timeout: 60_000,
  }, async () => {
    const loopback = await makeLoopback();
    try {
      const companionIdentity = await Identity.generate();
      const companionHash = Array.from(companionIdentity.identityHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const companion = await startLxmfPlane({
        rns: loopback.rnsB,
        identity: companionIdentity,
        name: "companion",
        log: () => {},
      });
      // The webapp boots long after the Companion's announce: its own
      // announce is not in flight, and the re-announce cadence is 30
      // minutes — passive listening would wait. The layer's discovery
      // must catch the solicited announce instead
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const webappIdentity = await Identity.generate();
      const webapp = await createLxmfLayer({
        rns: loopback.rnsA,
        identity: webappIdentity,
        name: "webapp",
        log: () => {},
      });
      /** @type {Array<{ identityHash: string, destinationHash: string }>} */
      const contacts = [];
      webapp.onContact((contact) => contacts.push(contact));
      // The solicitation the mesh layer runs: a path request to the
      // derived destination makes the Companion answer with a fresh
      // announce, which fires the contact discovery
      const destination = await deriveDeliveryHash(companionHash);
      await webapp.recallOrSolicit(destination);
      assert.ok(
        contacts.some((contact) => contact.identityHash === companionHash),
        "the solicited announce registered the Companion as a contact",
      );
      webapp.stop();
      companion.stop();
    } finally {
      await loopback.close();
    }
  });

  it("drops an unverified or ungranted sender at the gate", {
    timeout: 60_000,
  }, async () => {
    const loopback = await makeLoopback();
    try {
      const strangerIdentity = await Identity.generate();
      const companionIdentity = await Identity.generate();
      const strangerHash = Array.from(strangerIdentity.identityHash)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const stranger = await createLxmfLayer({
        rns: loopback.rnsA,
        identity: strangerIdentity,
        name: "stranger",
        log: () => {},
      });
      const companion = await startLxmfPlane({
        rns: loopback.rnsB,
        identity: companionIdentity,
        name: "companion",
        log: () => {},
      });
      await settle(1500);

      /** @type {string[]} */
      const prompts = [];
      const surface = createChatSurface({
        ownerContact: "aa".repeat(32),
        sendText: async () => {},
        verifySender: companion.verifySender,
        pi: {
          prompt: async (/** @type {string} */ text) => {
            prompts.push(text);
          },
          isRunning: () => true,
          status: async () => null,
          suspend: () => {},
          compact: async () => {},
          newSession: async () => {},
          setModel: async () => null,
          client: null,
        },
        // Nobody is a participant: the stranger holds no grant
        isParticipant: () => false,
        senderIdentityHash: companion.senderIdentityHash,
        state: { get: async () => null, set: async () => {} },
        log: () => {},
      });
      companion.onMessage((event) => {
        surface.handleInbound(event).catch(() => {});
      });

      await stranger.sendText(companion.deliveryHash, "let me in");
      await settle(2000);
      assert.deepEqual(prompts, [], "the ungranted sender never reached pi");

      stranger.stop();
      companion.stop();
    } finally {
      await loopback.close();
    }
  });
});
