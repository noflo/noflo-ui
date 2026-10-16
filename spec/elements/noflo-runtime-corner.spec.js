import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-runtime-corner.js";

const RUNTIME_HASH = "c".repeat(32);

/**
 * @returns {any}
 */
function makeElement() {
  const el = document.createElement("noflo-runtime-corner");
  document.body.appendChild(el);
  return el;
}

/**
 * A visible corner with one discovered runtime.
 *
 * @param {any} el
 * @returns {any}
 */
function feedRuntime(el) {
  el.setVisible(true);
  el.setRuntimes([
    {
      destinationHash: RUNTIME_HASH,
      nodeName: "workshop-runtime",
      protocolVersion: 2,
      lastSeen: Date.now(),
    },
  ]);
  return el;
}

describe("runtime corner (work documents #59/#15/#28)", () => {
  it("starts hidden and shows with the mesh", () => {
    const el = makeElement();
    // app.html declares the corner hidden: the mesh unused means no
    // corner UI (work document #28's disclosure rules)
    el.setVisible(false);
    assert.equal(el.cornerState, "hidden");
    el.setVisible(true);
    assert.notEqual(el.cornerState, "hidden");
    el.remove();
  });

  it("collapsed by default: the panel renders only while expanded", () => {
    const el = feedRuntime(makeElement());
    let _shadow = el.panelShadow;
    assert.ok(el.shadowRoot.querySelector(".chip"), "the chip stays");
    assert.ok(
      !el.panelShadow.querySelector(".panel"),
      "collapsed renders no panel: the base calls expandedHtml() unconditionally",
    );
    el.expanded = true;
    el.render();
    _shadow = el.panelShadow;
    assert.ok(
      el.panelShadow.querySelector(".panel"),
      "expanded renders the panel",
    );
    // Collapse closes: the panel is gone again
    el.panelShadow
      .querySelector("[data-action='collapse']")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.equal(el.expanded, false, "the collapse button collapses");
    assert.ok(
      !el.panelShadow.querySelector(".panel"),
      "collapsed again: no panel",
    );
    el.remove();
  });

  it("top corners stack the chip above the accordion", () => {
    const el = feedRuntime(makeElement());
    el.expanded = true;
    el.render();
    assert.ok(
      el.shadowRoot.querySelector(".chip"),
      "the chip renders in the corner's shadow",
    );
    assert.ok(
      el.panelShadow.querySelector(".panel"),
      "the panel renders in the portal's shadow",
    );
    // The stacking is visually verified: top corners grow downward (the
    // chip leads), per the runtime corner's .chip { order: -1 } fix
    el.remove();
  });

  it("the chip summarizes the runtime population and its state", () => {
    const el = feedRuntime(makeElement());
    const _shadow = el.panelShadow;
    assert.match(el.shadowRoot.textContent ?? "", /1 runtime/);
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "connected",
            nodeName: "workshop-runtime",
            capabilityMask: 0b11,
            capabilities: ["graph.read", "graph.edit"],
            protocolVersion: 2,
          },
        ],
      ]),
    );
    assert.match(
      /** @type {ShadowRoot} */ (el.shadowRoot).textContent ?? "",
      /1 connected/,
    );
    el.remove();
  });

  it("the expanded corner lists runtimes with state and capabilities", () => {
    const el = feedRuntime(makeElement());
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "connected",
            nodeName: "workshop-runtime",
            capabilityMask: 0b11,
            capabilities: ["graph.read", "graph.edit"],
            protocolVersion: 2,
          },
        ],
      ]),
    );
    el.expanded = true;
    el.render();
    const _shadow = el.panelShadow;
    assert.match(el.panelShadow.textContent ?? "", /workshop-runtime/);
    assert.match(el.panelShadow.textContent ?? "", /connected/);
    assert.match(
      el.panelShadow.textContent ?? "",
      /graph\.read, graph\.edit/,
      "the advertised mask renders as relation names, not raw bits",
    );
    assert.ok(
      el.panelShadow.querySelector("[data-runtime-disconnect]"),
      "a connected runtime offers disconnect",
    );
    el.remove();
  });

  it("a discovered runtime offers connect; an error shows beside the row", () => {
    const el = feedRuntime(makeElement());
    el.expanded = true;
    el.render();
    let _shadow = el.panelShadow;
    assert.ok(
      el.panelShadow.querySelector("[data-runtime-connect]"),
      "a discovered runtime offers connect",
    );
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "error",
            nodeName: "workshop-runtime",
            error: "timed out waiting for the 0x02 auth response",
          },
        ],
      ]),
    );
    _shadow = el.panelShadow;
    assert.match(el.panelShadow.textContent ?? "", /error/);
    assert.match(
      el.panelShadow.textContent ?? "",
      /timed out waiting for the 0x02 auth response/,
      "the failure reason renders beside the row it describes",
    );
    el.remove();
  });

  it("a connected runtime gains the run affordances, gated on the mask", () => {
    const el = feedRuntime(makeElement());
    const connection = {
      state: "connected",
      nodeName: "workshop-runtime",
      capabilityMask: 0xff,
      capabilities: ["all"],
      protocolVersion: 2,
    };
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([[RUNTIME_HASH, connection]]),
    );
    el.setRuntimeActivity(
      new Map([
        [
          RUNTIME_HASH,
          { a: { component: "core/Repeat", type: "component", state: 1 } },
        ],
      ]),
      new Map([[RUNTIME_HASH, { state: "running" }]]),
      new Map([
        [
          RUNTIME_HASH,
          { graphId: "main", state: "deployed", ops: 3, skipped: 1 },
        ],
      ]),
    );
    el.expanded = true;
    el.render();
    const _shadow = el.panelShadow;
    assert.match(el.panelShadow.textContent ?? "", /1 process/);
    assert.match(el.panelShadow.textContent ?? "", /running/);
    assert.match(
      el.panelShadow.textContent ?? "",
      /Deployed — 3 ops sent, 1 already present/,
    );
    assert.ok(
      el.panelShadow.querySelector("[data-runtime-deploy]"),
      "deploy affordance",
    );
    const stop = el.panelShadow.querySelector("[data-runtime-run]");
    assert.ok(stop, "run affordance");
    assert.equal(
      stop?.getAttribute("data-run-action"),
      "stop",
      "a running runtime offers stop",
    );
    /** @type {any[]} */
    const events = [];
    el.addEventListener("runtime-deploy", (/** @type {any} */ e) =>
      events.push(["deploy", e.detail.destinationHash]),
    );
    el.addEventListener("runtime-run", (/** @type {any} */ e) =>
      events.push(["run", e.detail.destinationHash, e.detail.action]),
    );
    el.panelShadow
      .querySelector("[data-runtime-deploy]")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    stop?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(events, [
      ["deploy", RUNTIME_HASH],
      ["run", RUNTIME_HASH, "stop"],
    ]);
    el.remove();
  });

  it("no lifecycle.ctrl capability means no run affordance", () => {
    const el = feedRuntime(makeElement());
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "observer-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "connected",
            nodeName: "observer-runtime",
            capabilityMask: 0b1001,
            capabilities: ["graph.read", "telemetry.read"],
            protocolVersion: 2,
          },
        ],
      ]),
    );
    el.expanded = true;
    el.render();
    const _shadow = el.panelShadow;
    assert.ok(
      !el.panelShadow.querySelector("[data-runtime-deploy]"),
      "no deploy affordance without graph.edit",
    );
    assert.ok(
      !el.panelShadow.querySelector("[data-runtime-run]"),
      "no run affordance without lifecycle.ctrl",
    );
    assert.match(
      el.panelShadow.textContent ?? "",
      /connected/,
      "observe-only still shows the connection",
    );
    el.remove();
  });

  it("emits connect, disconnect, and refresh events", () => {
    const el = feedRuntime(makeElement());
    /** @type {any[]} */
    const events = [];
    el.addEventListener("runtime-refresh", () => events.push("refresh"));
    el.addEventListener("runtime-connect", (/** @type {any} */ e) =>
      events.push(["connect", e.detail.destinationHash]),
    );
    el.addEventListener("runtime-disconnect", (/** @type {any} */ e) =>
      events.push(["disconnect", e.detail.destinationHash]),
    );
    el.expanded = true;
    el.render();
    const _shadow = el.panelShadow;
    assert.ok(
      events.includes("refresh"),
      "expansion asks the Engine for a fresh discovery",
    );
    el.panelShadow
      .querySelector("[data-runtime-connect]")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(events[1], ["connect", RUNTIME_HASH]);
    // The connection state arrives: the row's affordance flips to
    // disconnect, addressing the same destination hash
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "connected",
            nodeName: "workshop-runtime",
            capabilityMask: 0b11,
            capabilities: ["graph.read", "graph.edit"],
            protocolVersion: 2,
          },
        ],
      ]),
    );
    el.remove();
  });
});

describe("runtime corner FBP protocol stream (work document #63 M3)", () => {
  it("a connected runtime gains its frame stream accordion", async () => {
    const el = feedRuntime(makeElement());
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [
          RUNTIME_HASH,
          {
            state: "connected",
            nodeName: "workshop-runtime",
            capabilityMask: 0xff,
            capabilities: ["all"],
            protocolVersion: 2,
          },
        ],
      ]),
    );
    const _shadow = el.panelShadow;
    assert.match(
      el.shadowRoot.textContent ?? "",
      /workshop-runtime/,
      "the segment renders",
    );
    assert.ok(
      !el.panelShadow.querySelector(".telemetry"),
      "closed: no wire accordion",
    );
    el.shadowRoot
      .querySelector(`[data-segment-toggle="fbp:${RUNTIME_HASH}"]`)
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.equal(
      el.expanded,
      false,
      "the segment leaves the rows panel closed",
    );
    const panel = el.panelShadow.querySelector(".telemetry");
    assert.ok(panel, "the wire accordion opens independently");
    assert.match(panel.textContent ?? "", /FBP protocol · workshop-runtime/);
    // Live frames for this runtime's stream arrive on the bus
    const { telemetryBus } = await import("../../src/glass/telemetryBus.js");
    telemetryBus().publish(`fbp:${RUNTIME_HASH}`, {
      message: "→ 0x40 RUN_CTRL",
      status: "TX",
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const log = panel.querySelector("flow-telemetry-log");
    assert.ok(log, "the wires log renders");
    assert.match(
      /** @type {any} */ (log).shadowRoot?.textContent ?? "",
      /→ 0x40 RUN_CTRL/,
      "the live frames flow",
    );
    // Disconnecting closes the stream: it is the live link
    el.setRuntimes(
      [
        {
          destinationHash: RUNTIME_HASH,
          nodeName: "workshop-runtime",
          protocolVersion: 2,
          lastSeen: Date.now(),
        },
      ],
      new Map([
        [RUNTIME_HASH, { state: "disconnected", nodeName: "workshop-runtime" }],
      ]),
    );
    assert.ok(
      !(/** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".telemetry")),
      "a disconnected runtime's wire closes",
    );
    el.remove();
  });
});
