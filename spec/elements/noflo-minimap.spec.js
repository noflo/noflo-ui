import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-minimap.js";

const view = () => ({
  processes: {
    A: { metadata: { x: 0, y: 0 } },
    B: { metadata: { x: 200, y: 100 } },
  },
  connections: [
    { src: { process: "A", port: "out" }, tgt: { process: "B", port: "in" } },
  ],
});

/**
 * @returns {any}
 */
function makeElement() {
  const el = /** @type {any} */ (document.createElement("noflo-minimap"));
  document.body.appendChild(el);
  // The happy-dom box is 0×0; pin it to the element's design size
  el.getBoundingClientRect = () => ({
    width: 160,
    height: 110,
    top: 0,
    left: 0,
    right: 160,
    bottom: 110,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  return el;
}

describe("FlowMinimap (work document #5)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders dots, wires, and the viewport rect", () => {
    const el = makeElement();
    el.update(view(), { x: -50, y: -50, w: 300, h: 200 });
    const shadow = el.shadowRoot;
    assert.equal(shadow.querySelectorAll(".dot").length, 2);
    assert.equal(shadow.querySelectorAll(".wire").length, 1);
    const rect = shadow.querySelector(".viewport");
    assert.ok(rect, "viewport rect rendered");
    assert.ok(
      parseFloat(rect.getAttribute("width")) > 0,
      "viewport has extent",
    );
    el.remove();
  });

  it("omits the viewport when the camera reports none", () => {
    const el = makeElement();
    el.update(view(), null);
    assert.equal(el.shadowRoot.querySelectorAll(".viewport").length, 0);
    el.remove();
  });

  it("an empty graph renders nothing but stays a valid panel", () => {
    const el = makeElement();
    el.update({ processes: {}, connections: [] }, null);
    assert.equal(el.shadowRoot.querySelectorAll(".dot").length, 0);
    assert.ok(el.shadowRoot.querySelector("svg"), "svg present");
    el.remove();
  });

  it("grabbing the viewport rect drags relatively, not by teleport", () => {
    const el = makeElement();
    // A small viewport leaves outside room to tap-jump
    el.update(view(), { x: -40, y: -40, w: 120, h: 80 });
    const shadow = el.shadowRoot;
    const layout = el.layout();
    const vp = layout.viewport;
    // Pointerdown INSIDE the rect: no navigation yet (a grab, not a jump)
    const grabPoint = {
      x: vp.x + vp.w * 0.25,
      y: vp.y + vp.h * 0.5,
    };
    const svg = shadow.querySelector("svg");
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointerdown", {
        clientX: grabPoint.x,
        clientY: grabPoint.y,
        bubbles: true,
        composed: true,
      }),
    );
    /** @type {any[]} */
    const navigations = [];
    el.addEventListener("minimap-navigate", (/** @type {any} */ e) =>
      navigations.push(e.detail),
    );
    assert.equal(navigations.length, 0, "grabbing does not jump");
    // Dragging right by 20 minimap pixels shifts the requested center by
    // the same graph-space delta
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointermove", {
        clientX: grabPoint.x + 20,
        clientY: grabPoint.y,
        buttons: 1,
        bubbles: true,
        composed: true,
      }),
    );
    assert.equal(navigations.length, 1);
    const expected = 20 / layout.scale;
    // The center is in graph space: the raw viewport's center (the layout's
    // viewport is the projected pixel rect, a different basis)
    const before = { x: -40 + 120 / 2, y: -40 + 80 / 2 };
    assert.ok(
      Math.abs(navigations[0].x - (before.x + expected)) < 0.01,
      `center shifted by the drag delta: ${JSON.stringify(navigations[0])}`,
    );
    el.remove();
  });

  it("pointer events do not reach the canvas pan gesture", () => {
    const el = makeElement();
    el.update(view(), { x: -40, y: -40, w: 120, h: 80 });
    // The editor's pan gesture listens above the minimap: a bubbled
    // pointerdown there starts a canvas pan alongside the minimap grab
    /** @type {Event[]} */
    const leaked = [];
    document.body.addEventListener("pointerdown", (e) => leaked.push(e));
    const svg = el.shadowRoot.querySelector("svg");
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointerdown", {
        clientX: 40,
        clientY: 30,
        bubbles: true,
        composed: true,
      }),
    );
    assert.equal(leaked.length, 0, "the minimap isolates its gestures");
    el.remove();
  });

  it("a released button ends a grab even if pointerup was lost", () => {
    const el = makeElement();
    el.update(view(), { x: -40, y: -40, w: 120, h: 80 });
    const svg = el.shadowRoot.querySelector("svg");
    const layout = el.layout();
    const vp = layout.viewport;
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointerdown", {
        clientX: vp.x + vp.w / 2,
        clientY: vp.y + vp.h / 2,
        bubbles: true,
        composed: true,
      }),
    );
    // The button releases without a pointerup reaching us
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointermove", {
        clientX: vp.x + vp.w / 2 + 5,
        clientY: vp.y + vp.h / 2,
        buttons: 0,
        bubbles: true,
        composed: true,
      }),
    );
    // A later move must not navigate: the drag ended
    /** @type {any[]} */
    const navigations = [];
    el.addEventListener("minimap-navigate", (/** @type {any} */ e) =>
      navigations.push(e.detail),
    );
    svg.dispatchEvent(
      new el.ownerDocument.defaultView.PointerEvent("pointermove", {
        clientX: vp.x + vp.w / 2 + 10,
        clientY: vp.y + vp.h / 2,
        bubbles: true,
        composed: true,
      }),
    );
    assert.equal(navigations.length, 0, "the stale grab was cleared");
    el.remove();
  });

  it("tapping emits minimap-navigate with graph coordinates", () => {
    const el = makeElement();
    el.update(view(), null);
    // Simulate a tap at node B's minimap position: the layout is pure, so
    // compute where B landed and dispatch a pointer event there
    const layout = el.layout();
    const b = layout.nodes.find((/** @type {any} */ n) => n.id === "B");
    const event = new el.ownerDocument.defaultView.PointerEvent("pointerdown", {
      clientX: b.x,
      clientY: b.y,
      bubbles: true,
      composed: true,
    });
    /** @type {any[]} */
    const navigations = [];
    el.addEventListener("minimap-navigate", (/** @type {any} */ e) =>
      navigations.push(e.detail),
    );
    /** @type {any} */ (el.shadowRoot.querySelector("svg")).dispatchEvent(
      event,
    );
    assert.equal(navigations.length, 1);
    assert.ok(
      Math.abs(navigations[0].x - 200) < 1 &&
        Math.abs(navigations[0].y - 100) < 1,
      `navigation lands on B's graph position: ${JSON.stringify(navigations[0])}`,
    );
    el.remove();
  });
});
