import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { makeFakeIdb } from "./utils/fake-idb.js";
import "../../src/elements/noflo-sync-panel.js";

/**
 * A query surface that spans the corner's own shadow (chip content) and
 * the panel portal's shadow (panel content) — the space manager moved
 * the panels into the side containers, and the tests need to see both.
 *
 * @param {any} el
 */
function _dualShadow(el) {
  const chip = el.shadowRoot;
  const panel = el._panelPortal?.shadowRoot ?? null;
  return {
    querySelector: (/** @type {string} */ s) =>
      chip?.querySelector(s) ?? panel?.querySelector(s) ?? null,
    querySelectorAll: (/** @type {string} */ s) => {
      const a = [...(chip?.querySelectorAll(s) ?? [])];
      const b = [...(panel?.querySelectorAll(s) ?? [])];
      return a.length > 0 ? a : b;
    },
    get textContent() {
      return (chip?.textContent ?? "") + (panel?.textContent ?? "");
    },
  };
}

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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const chip = shadow.querySelector(".chip");
    assert.ok(chip, "the chip renders");
    // Segments: up to date (calm), peers, Owner, the segment toggles —
    // yjs, mesh, diagnostics, history — pending intents drop out
    const segments = shadow.querySelectorAll(".chip .seg");
    assert.equal(segments.length, 7, "empty states drop out");
    assert.match(chip.textContent ?? "", /up to date/);
    assert.match(chip.textContent ?? "", /2 peers/);
    assert.match(chip.textContent ?? "", /Owner/);
    const syncSegment = /** @type {HTMLElement} */ (segments[0]);
    assert.ok(
      syncSegment.classList.contains("calm"),
      "up to date reads as calm in the Ages vocabulary",
    );
    // The degradation ladder's count (the chip goes icon+number when
    // minified): the peers segment carries the bare number
    const peerCount =
      /** @type {HTMLElement} */ (chip.querySelector(".seg .count"))
        .textContent ?? "";
    assert.match(peerCount, /^2$/, "the count is the bare peer number");
    el.remove();
  });

  it("shows syncing as neutral, offline as offline state", () => {
    const el = makeElement();
    el.setVisible(true);
    // Connected but no peers yet: the mesh is waiting, not syncing
    el.setSyncStatus({ connected: true, synced: false, peers: 0 });
    let shadow = el.shadowRoot;
    const waiting = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(waiting.textContent ?? "", /working locally/);
    assert.ok(
      !waiting.classList.contains("activity") &&
        !waiting.classList.contains("calm") &&
        !waiting.classList.contains("attention"),
      "working locally is the offline-first normal, not an error",
    );
    // The status segment plus the segment toggles (work document #63)
    assert.equal(shadow.querySelectorAll(".chip .seg").length, 5);
    // A peer joined, bits moving: syncing (neutral)
    el.setPeers([PEER_HASH]);
    el.setSyncStatus({ connected: true, synced: false, peers: 1 });
    shadow = el.shadowRoot;
    const syncing = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(syncing.textContent ?? "", /syncing/);
    assert.ok(
      !syncing.classList.contains("activity") &&
        !syncing.classList.contains("calm"),
      "the steady syncing state is neutral: color is reserved for states that need attention",
    );
    el.setSyncStatus({ connected: false, synced: false, peers: 0 });
    shadow = el.shadowRoot;
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const stage = /** @type {HTMLElement} */ (shadow.querySelector(".seg"));
    assert.match(stage.textContent ?? "", /Connecting to the relay/);
    el.remove();
  });

  it("expands into accordions: peers with verification badges", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const panel = el.panelShadow.querySelector(".panel");
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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

  it("handles invites: generation intent, URI display with copy", async () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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
    // The invite renders as a scannable QR tile (work document #28 update
    // #3): the SVG generation is async, so it lands after a tick
    await new Promise((resolve) => setTimeout(resolve, 200));
    const qr = shadow.querySelector("#panel-invite-qr svg");
    assert.ok(qr, "the invite renders an SVG QR code");
    assert.match(
      qr.getAttribute("viewBox") ?? "",
      /\d+ \d+ \d+ \d+/,
      "the QR encodes the invite",
    );
    el.remove();
  });

  it("participants have no invite UI, but keep joining and peers (work document #28)", () => {
    const el = makeElement();
    feedConnected(el);
    // A participant: connected mesh, holds only the public anchor
    el.setDacarState({
      projectId: "p",
      anchor: { hash: OWNER_HASH, owner: false },
      grants: [],
      wallet: [],
    });
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.ok(
      !shadow.querySelector("[data-action='create-invite']"),
      "no invite generation for participants",
    );
    assert.ok(
      !shadow.querySelector("#panel-invite"),
      "no invite accordion at all",
    );
    assert.ok(
      shadow.querySelector("[data-action='join']"),
      "participants still join projects",
    );
    assert.ok(
      shadow.querySelector("#panel-invite-qr") === null ||
        !shadow.querySelector("#panel-invite-qr").nextElementSibling,
      "no invite QR for participants",
    );
    el.remove();
  });

  it("renders peers as identities when the mapping reports them", () => {
    const el = makeElement();
    feedConnected(el);
    // The transport keys peers by link id; the Engine maps them to
    // identity hashes (work document #28)
    el.setPeers(["link-1"], { "link-1": PEER_HASH });
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const items = [...shadow.querySelectorAll(".list-item")].map(
      (item) => item.textContent ?? "",
    );
    assert.ok(
      items.some((text) => text.includes(PEER_HASH)),
      "the peer renders as its identity hash",
    );
    assert.ok(
      items.some((text) => text.includes("verified")),
      "the Dacar badge keys on the identity and matches",
    );
    el.remove();
  });

  it("de-duplicates multiple links to one peer by identity (work document #28)", () => {
    const el = makeElement();
    feedConnected(el);
    // Reconnects: two links, one identity
    el.setPeers(["link-1", "link-2"], {
      "link-1": PEER_HASH,
      "link-2": PEER_HASH,
    });
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const items = [...shadow.querySelectorAll(".list-item")];
    assert.equal(
      items.length,
      1,
      "one identity, one entry — reconnect links collapse",
    );
    assert.match(items[0].textContent ?? "", new RegExp(PEER_HASH));
    assert.ok(items[0].querySelector(".badge"), "the badge still matches");
    el.remove();
  });

  it("renders raw peer ids when no mapping is known yet", () => {
    const el = makeElement();
    feedConnected(el);
    el.setPeers(["link-1"]);
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.match(
      shadow.querySelector(".list-item")?.textContent ?? "",
      /link-1/,
      "the unmapped peer id renders as-is",
    );
    el.remove();
  });

  it("emits the join intent with the pasted invite", () => {
    const el = makeElement();
    feedConnected(el);
    el.expanded = true;
    el.render();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    const chip = shadow.querySelector(".chip");
    assert.match(chip?.textContent ?? "", /joining/);
    el.expanded = true;
    el.render();
    assert.match(
      /** @type {HTMLElement} */ (el.panelShadow.querySelector(".panel"))
        .textContent ?? "",
      /Last join/,
    );
    el.setJoinProgress({ stage: "declined", reason: "host_lacks_authority" });
    assert.match(
      /** @type {HTMLElement} */ (el.panelShadow.querySelector(".panel"))
        .textContent ?? "",
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.ok(
      !shadow.querySelector("[data-action='create-invite']"),
      "no invite generation for observers",
    );
    assert.ok(
      !shadow.querySelector("[data-action='join']"),
      "no join form for observers",
    );
    assert.ok(el.panelShadow.querySelector(".panel"), "status still renders");
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
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
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.ok(shadow.querySelector(".chip"), "the chip stays");
    assert.ok(
      !el.panelShadow.querySelector(".panel"),
      "still collapsed: minified is a chip state, not an expanded one",
    );
    el.setMinified(false);
    assert.equal(el.cornerState, "normal");
    el.remove();
  });
});

describe("sync panel segment accordions (work document #63)", () => {
  /**
   * A visible panel with wire traffic already on the bus: the bus is the
   * app-level singleton, so the fixture publishes before the panel opens.
   *
   * @returns {Promise<FlowSyncPanel>}
   */
  async function feedWires() {
    const el = makeElement();
    feedConnected(el);
    const { telemetryBus } = await import("../../src/glass/telemetryBus.js");
    const bus = telemetryBus();
    bus.publish("yjs", { message: "update · 1.0 KB", status: "DELTA" });
    bus.publish("yjs", {
      message: "full state · 2.5 KB",
      status: "SYNC",
      tone: "ok",
    });
    return el;
  }

  it("the persisted diagnostics stream hydrates from the store (work document #63)", async () => {
    // The panel's no-arg store open reads the global factory: seed it
    const previous = globalThis.indexedDB;
    globalThis.indexedDB = makeFakeIdb();
    const { openDiagnosticsStore, resetDiagnosticsStore } = await import(
      "../../src/glass/diagnosticsStore.js"
    );
    const { telemetryBus } = await import("../../src/glass/telemetryBus.js");
    try {
      resetDiagnosticsStore();
      const store = await openDiagnosticsStore();
      await store.append({
        at: 1,
        kind: "crash",
        message: "a crash from the previous session",
        status: "CRASH",
        tone: "fail",
      });
      // A boot-era line rides the bus ring: its stamped time is later
      // than the persisted record's, so the seam puts the store first
      telemetryBus().publish("diagnostics", {
        message: "session line",
        status: "UP",
        tone: "ok",
      });
      const el = makeElement();
      feedConnected(el);
      el.toggleSegment("diagnostics");
      await new Promise((resolve) => setTimeout(resolve, 30));
      const log = el.telemetryLog("diagnostics");
      const text = log.shadowRoot?.textContent ?? "";
      assert.match(
        text,
        /a crash from the previous session/,
        "the persisted record renders — the log survives reloads",
      );
      assert.match(text, /CRASH/);
      assert.match(
        text,
        /session line/,
        "the ring's boot-era entry renders after the persisted history",
      );
      // Opening acknowledged the stream: closed again, the subscription
      // drops
      el.toggleSegment("diagnostics");
      assert.equal(
        /** @type {any} */ (el._telemetry).diagnostics.unsubscribe,
        null,
      );
      el.remove();
    } finally {
      globalThis.indexedDB = previous;
      resetDiagnosticsStore();
    }
  });

  it("the yjs segment opens its own accordion, not the panel", async () => {
    const el = await feedWires();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    assert.match(shadow.textContent ?? "", /yjs/, "the segment renders");
    assert.ok(
      !shadow.querySelector(".telemetry"),
      "closed: no telemetry accordion",
    );
    shadow
      .querySelector('[data-segment-toggle="yjs"]')
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.equal(
      el.expanded,
      false,
      "the segment toggle leaves the functional panel closed",
    );
    const telemetryPanel = shadow.querySelector(".telemetry");
    assert.ok(telemetryPanel, "the telemetry accordion opens independently");
    assert.match(telemetryPanel.textContent ?? "", /Yjs telemetry/);
    // The ring buffer replays: history, not a blank panel — the log's
    // content lives in the log element's own shadow root
    const log = telemetryPanel.querySelector("flow-telemetry-log");
    assert.ok(log, "the telemetry log renders in the accordion");
    assert.match(
      /** @type {any} */ (log).shadowRoot?.textContent ?? "",
      /update · 1\.0 KB/,
    );
    assert.match(
      /** @type {any} */ (log).shadowRoot?.textContent ?? "",
      /\[ SYNC \]/,
    );
    // Closing through its own affordance
    shadow
      .querySelector("[data-action='close-telemetry'][data-stream='yjs']")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.ok(
      !(/** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".telemetry")),
      "the telemetry accordion closes",
    );
    el.remove();
  });

  it("live traffic paints while open and stops when closed", async () => {
    const el = await feedWires();
    const shadow = {
      querySelector: (s) =>
        el.shadowRoot?.querySelector(s) ??
        el.panelShadow?.querySelector(s) ??
        null,
      querySelectorAll: (s) =>
        (() => {
          const fromChip = el.shadowRoot?.querySelectorAll(s);
          if (fromChip && fromChip.length > 0) return fromChip;
          return el.panelShadow?.querySelectorAll(s) ?? [];
        })(),
      get textContent() {
        return (
          (el.shadowRoot?.textContent ?? "") +
          (el.panelShadow?.textContent ?? "")
        );
      },
    };
    shadow
      .querySelector('[data-segment-toggle="yjs"]')
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    const { telemetryBus } = await import("../../src/glass/telemetryBus.js");
    telemetryBus().publish("yjs", {
      message: "live · 3.0 KB",
      status: "DELTA",
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const liveLog = shadow.querySelector(".telemetry flow-telemetry-log");
    assert.match(
      /** @type {any} */ (liveLog).shadowRoot?.textContent ?? "",
      /live · 3\.0 KB/,
      "open accordion receives live traffic",
    );
    shadow
      .querySelector("[data-action='close-telemetry'][data-stream='yjs']")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    telemetryBus().publish("yjs", {
      message: "while closed · 4.0 KB",
      status: "DELTA",
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.ok(
      !(/** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".telemetry")),
      "closed: no accordion",
    );
    // Reopening replays the closed-window traffic: the bus buffered it
    shadow
      .querySelector('[data-segment-toggle="yjs"]')
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    const reopenedLog = shadow.querySelector(".telemetry flow-telemetry-log");
    assert.match(
      /** @type {any} */ (reopenedLog).shadowRoot?.textContent ?? "",
      /while closed · 4\.0 KB/,
      "the ring buffer holds the closed-window history",
    );
    el.remove();
  });
});
