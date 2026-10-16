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
    let shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".chip"), "the chip stays");
    assert.ok(
      !shadow.querySelector(".panel"),
      "collapsed renders no panel: the base calls expandedHtml() unconditionally",
    );
    el.expanded = true;
    el.render();
    shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".panel"), "expanded renders the panel");
    // Collapse closes: the panel is gone again
    shadow
      .querySelector("[data-action='collapse']")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.equal(el.expanded, false, "the collapse button collapses");
    assert.ok(
      !(/** @type {ShadowRoot} */ (el.shadowRoot).querySelector(".panel")),
      "collapsed again: no panel",
    );
    el.remove();
  });

  it("top corners stack the chip above the accordion", () => {
    const el = feedRuntime(makeElement());
    el.expanded = true;
    el.render();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".chip") && shadow.querySelector(".panel"));
    // The corner grows downward: the chip re-orders ahead of the panel
    // (the base's DOM order is panel-first for the bottom corners)
    const style =
      /** @type {HTMLElement} */ (shadow.querySelector("style")).textContent ??
      "";
    assert.match(
      style,
      /\.chip \{ order: -1; \}/,
      "top corners grow downward: the chip leads visually",
    );
    el.remove();
  });

  it("the chip summarizes the runtime population and its state", () => {
    const el = feedRuntime(makeElement());
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /1 runtime/);
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
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /workshop-runtime/);
    assert.match(shadow.textContent ?? "", /connected/);
    assert.match(
      shadow.textContent ?? "",
      /graph\.read, graph\.edit/,
      "the advertised mask renders as relation names, not raw bits",
    );
    assert.ok(
      shadow.querySelector("[data-runtime-disconnect]"),
      "a connected runtime offers disconnect",
    );
    el.remove();
  });

  it("a discovered runtime offers connect; an error shows beside the row", () => {
    const el = feedRuntime(makeElement());
    el.expanded = true;
    el.render();
    let shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(
      shadow.querySelector("[data-runtime-connect]"),
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
    shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /error/);
    assert.match(
      shadow.textContent ?? "",
      /timed out waiting for the 0x02 auth response/,
      "the failure reason renders beside the row it describes",
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
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(
      events.includes("refresh"),
      "expansion asks the Engine for a fresh discovery",
    );
    shadow
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
    /** @type {ShadowRoot} */ (el.shadowRoot)
      .querySelector("[data-runtime-disconnect]")
      ?.dispatchEvent(new Event("click", { bubbles: true }));
    assert.deepEqual(events[2], ["disconnect", RUNTIME_HASH]);
    el.remove();
  });
});
