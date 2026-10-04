import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-sync-panel.js";

const OWNER_HASH = "a".repeat(32);
const PEER_HASH = "b".repeat(32);

/**
 * @returns {FlowSyncPanel}
 */
function makeElement() {
  const el = /** @type {FlowSyncPanel} */ (
    document.createElement("noflo-sync-panel")
  );
  document.body.appendChild(el);
  return el;
}

/**
 * A connected, synced panel with an owner anchor — the common baseline.
 *
 * @param {FlowSyncPanel} el
 */
function feedConnected(el) {
  el.setVisible(true);
  el.setSyncStatus({ connected: true, synced: true, peers: 2 });
  el.setPeers([OWNER_HASH, PEER_HASH]);
  el.setIdentityHash(OWNER_HASH);
  el.setDacarState({
    projectId: "p",
    anchor: { hash: OWNER_HASH, owner: true },
    grants: [
      {
        id: "grant-1",
        peerHash: PEER_HASH,
        role: "developer",
        issued: 1,
        revoked: null,
        status: "verified",
      },
    ],
    wallet: [],
  });
}

describe("FlowSyncPanel corner states (work document #28)", () => {
  it("is hidden until mesh is configured, and empties its shadow", () => {
    const el = makeElement();
    el.setVisible(true);
    assert.ok(!el.hasAttribute("hidden"), "visible when mesh is configured");
    el.setVisible(false);
    assert.ok(el.hasAttribute("hidden"), "hidden state hides the element");
    assert.equal(
      /** @type {ShadowRoot} */ (el.shadowRoot).innerHTML,
      "",
      "hidden renders nothing",
    );
    el.remove();
  });

  it("renders the segmented chip in the airline grammar when connected", () => {
    const el = makeElement();
    feedConnected(el);
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const chip = shadow.querySelector(".chip");
    assert.ok(chip, "the chip renders");
    // Segments: up to date (calm), peers, Owner — pending intents drop out
    const segments = shadow.querySelectorAll(".chip .seg");
    assert.equal(segments.length, 3, "empty states drop out");
    assert.match(chip.textContent ?? "", /up to date/);
    assert.match(chip.textContent ?? "", /2 peers/);
    assert.match(chip.textContent ?? "", /Owner/);
    const syncSegment = /** @type {HTMLElement} */ (segments[0]);
    assert.ok(
      syncSegment.classList.contains("calm"),
      "up to date reads as calm in the Ages vocabulary",
    );
    el.remove();
  });

  it("shows syncing as neutral, offline as offline state", () => {
    const el = makeElement();
    el.setVisible(true);
    // Connected but no peers yet: the mesh is waiting, not syncing
    el.setSyncStatus({ connected: true, synced: false, peers: 0 });
    let shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const waiting = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(waiting.textContent ?? "", /working locally/);
    assert.ok(
      !waiting.classList.contains("activity") &&
        !waiting.classList.contains("calm") &&
        !waiting.classList.contains("attention"),
      "working locally is the offline-first normal, not an error",
    );
    assert.equal(shadow.querySelectorAll(".chip .seg").length, 1);
    // A peer joined, bits moving: syncing (neutral)
    el.setPeers([PEER_HASH]);
    el.setSyncStatus({ connected: true, synced: false, peers: 1 });
    shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const syncing = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(syncing.textContent ?? "", /syncing/);
    assert.ok(
      !syncing.classList.contains("activity") &&
        !syncing.classList.contains("calm"),
      "the steady syncing state is neutral: color is reserved for states that need attention",
    );
    el.setSyncStatus({ connected: false, synced: false, peers: 0 });
    shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const offline = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.ok(
      offline.classList.contains("offline"),
      "disconnected is the offline state",
    );
    el.remove();
  });

  it("narrates the running operation in place of the steady state", () => {
    const el = makeElement();
    el.setVisible(true);
    el.setNarration({
      phrase: "Connecting to the relay",
      operation: "mesh.connect",
      stage: "transport",
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const stage = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(stage.textContent ?? "", /Connecting to the relay/);
    el.remove();
  });

  it("expands into accordions: peers with verification badges", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const panel = shadow.querySelector(".panel");
    assert.ok(panel, "expanded renders the panel");
    const peerItems = [...shadow.querySelectorAll(".list-item")].filter(
      (item) => item.textContent?.includes(PEER_HASH),
    );
    assert.equal(peerItems.length, 1, "the peer is listed");
    assert.match(
      /** @type {HTMLElement} */ (peerItems[0]).textContent ?? "",
      /verified/,
      "the Dacar verification badge renders",
    );
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector(".list-item"))
        .textContent ?? "",
      /this device/,
      "the device's own peer entry is marked",
    );
    el.remove();
  });

  it("expands automatically and throbs when a join request arrives", () => {
    const el = makeElement();
    feedConnected(el);
    assert.equal(el.expanded, false, "collapsed before the request");
    el.setJoinRequests([
      { identityHash: PEER_HASH, destinationHash: null, firstSeen: 1 },
    ]);
    assert.equal(
      el.expanded,
      true,
      "a join request is major: the corner expands",
    );
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const requestSegment = /** @type {HTMLElement} */ (
      shadow.querySelector(".seg.attention")
    );
    assert.ok(requestSegment, "the request segment renders");
    assert.ok(
      requestSegment.classList.contains("throb"),
      "attention segments throb",
    );
    const approve = shadow.querySelector("[data-approve]");
    assert.ok(approve, "inline approve button");
    /** @type {any[]} */
    const decisions = [];
    el.addEventListener("sync-approve", (e) =>
      decisions.push(/** @type {any} */ (e).detail),
    );
    /** @type {HTMLElement} */ (approve).click();
    assert.deepEqual(decisions, [{ identityHash: PEER_HASH }]);
    el.remove();
  });

  it("emits decline decisions and collapses on request", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    el.setJoinRequests([
      { identityHash: PEER_HASH, destinationHash: null, firstSeen: 1 },
    ]);
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    /** @type {any[]} */
    const decisions = [];
    el.addEventListener("sync-decline", (e) =>
      decisions.push(/** @type {any} */ (e).detail),
    );
    /** @type {HTMLElement} */ (shadow.querySelector("[data-decline]")).click();
    assert.deepEqual(decisions, [{ identityHash: PEER_HASH }]);
    /** @type {HTMLElement} */ (
      shadow.querySelector("[data-action='collapse']")
    ).click();
    assert.equal(el.expanded, false, "collapse returns to the chip");
    el.remove();
  });

  it("handles invites: generation intent, URI display with copy", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    /** @type {boolean} */
    let inviteRequested = false;
    el.addEventListener("sync-invite", () => {
      inviteRequested = true;
    });
    /** @type {HTMLElement} */ (
      shadow.querySelector("[data-action='create-invite']")
    ).click();
    assert.ok(inviteRequested, "generation emits sync-invite");
    el.setInvite(
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff",
    );
    const uri = shadow.querySelector("#panel-invite");
    assert.match(uri?.textContent ?? "", /noflo:\/\/join\//);
    assert.ok(
      shadow.querySelector("[data-action='copy-invite']"),
      "copy button shown for the generated URI",
    );
    el.remove();
  });

  it("emits the join intent with the pasted invite", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const input = /** @type {HTMLInputElement} */ (
      shadow.querySelector("#join-invite")
    );
    input.value =
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff";
    /** @type {any[]} */
    const joins = [];
    el.addEventListener("sync-join", (e) =>
      joins.push(/** @type {any} */ (e).detail),
    );
    /** @type {HTMLElement} */ (
      shadow.querySelector("[data-action='join']")
    ).click();
    assert.deepEqual(joins, [
      {
        invite:
          "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff",
      },
    ]);
    el.remove();
  });

  it("surfaces join progress and the last error in plain language", () => {
    const el = makeElement();
    feedConnected(el);
    el.setJoinProgress({ stage: "wait_response" });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const chip = shadow.querySelector(".chip");
    assert.match(chip?.textContent ?? "", /joining/);
    el.expanded = true;
    el.render();
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector(".panel")).textContent ??
        "",
      /Last join/,
    );
    el.setJoinProgress({ stage: "declined", reason: "host_lacks_authority" });
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector(".panel")).textContent ??
        "",
      /cannot grant access/,
      "decline reasons render in plain language",
    );
    el.setMeshError("Identity generation failed: not supported");
    const errorDetails = shadow.querySelector("#panel-mesh-error");
    assert.ok(errorDetails, "the mesh error renders in the expanded panel");
    const errorSegment = /** @type {HTMLElement} */ (
      shadow.querySelector(".seg.attention")
    );
    assert.match(errorSegment.textContent ?? "", /mesh error/);
    el.remove();
  });

  it("counts pending canvas intents as a segment", () => {
    const el = makeElement();
    feedConnected(el);
    el.setPendingIntents(3);
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const chip = shadow.querySelector(".chip");
    assert.match(chip?.textContent ?? "", /3 pending/);
    el.setPendingIntents(0);
    assert.ok(
      !(shadow.querySelector(".chip")?.textContent ?? "").includes("pending"),
      "the empty pending segment drops out",
    );
    el.remove();
  });

  it("renders observer tabs read-only: status without actions", () => {
    const el = makeElement();
    feedConnected(el);
    el.setReadOnly(true);
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(
      !shadow.querySelector("[data-action='create-invite']"),
      "no invite generation for observers",
    );
    assert.ok(
      !shadow.querySelector("[data-action='join']"),
      "no join form for observers",
    );
    assert.ok(shadow.querySelector(".panel"), "status still renders");
    el.setJoinRequests([
      { identityHash: PEER_HASH, destinationHash: null, firstSeen: 1 },
    ]);
    assert.ok(
      !shadow.querySelector("[data-approve]"),
      "no decision buttons for observers",
    );
    el.remove();
  });

  it("compacts to icons on phone layouts", () => {
    const el = makeElement();
    feedConnected(el);
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const style =
      /** @type {HTMLElement} */ (shadow.querySelector("style")).textContent ??
      "";
    assert.match(
      style,
      /@media \(max-width: 480px\)/,
      "the phone compact rule exists",
    );
    assert.match(style, /\.seg \.label \{ display: none; \}/);
    el.remove();
  });

  it("minifies on request: icons and counts only", () => {
    const el = makeElement();
    feedConnected(el);
    assert.equal(el.cornerState, "normal");
    el.setMinified(true);
    assert.equal(el.cornerState, "minified");
    assert.ok(el.hasAttribute("data-minified"));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".chip"), "the chip stays");
    assert.ok(
      !shadow.querySelector(".panel"),
      "still collapsed: minified is a chip state, not an expanded one",
    );
    el.setMinified(false);
    assert.equal(el.cornerState, "normal");
    el.remove();
  });
});
