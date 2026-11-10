import assert from "node:assert";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-heatmap.js";

describe("FlowHeatmap Web Component", () => {
  it("renders a canvas and starts its decay loop on connect", () => {
    const el = /** @type {FlowHeatmap} */ (
      document.createElement("noflo-heatmap")
    );
    document.body.appendChild(el);

    const canvas = el.shadowRoot?.querySelector("canvas");
    assert.ok(canvas, "canvas should be rendered in the shadow root");
    assert.strictEqual(
      el.intervalId !== null,
      true,
      "decay loop should be scheduled on connect",
    );

    document.body.removeChild(el);
    assert.strictEqual(
      el.intervalId,
      null,
      "decay loop should be cleared on disconnect",
    );
  });

  it("the ambient tick pauses while the page hides and resumes on visibility (guidelines §13)", () => {
    const el = /** @type {FlowHeatmap} */ (
      document.createElement("noflo-heatmap")
    );
    document.body.appendChild(el);
    assert.ok(el.intervalId !== null, "the tick runs");

    // The listener reads document.hidden at event time: shadow the state
    // with an own property and drive the transitions the listener
    // responds to (deleting it restores the inherited getter)
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    assert.strictEqual(el.intervalId, null, "a hidden page pauses the tick");

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    assert.ok(el.intervalId !== null, "visibility resumes the tick");

    // @ts-expect-error the own property's deletion restores the getter
    delete document.hidden;
    document.body.removeChild(el);
    assert.strictEqual(el.intervalId, null, "disconnect still clears");
  });

  it("records activity into the grid map and clamps to max heat", () => {
    const el = /** @type {FlowHeatmap} */ (
      document.createElement("noflo-heatmap")
    );
    document.body.appendChild(el);

    // Graph coord (100, 100) lands in grid cell col=2, row=2 (gridSize=40).
    el.recordActivity(100, 100);
    assert.strictEqual(el.activityMap.get("2,2"), 0.25);

    // Repeated reports accumulate.
    el.recordActivity(100, 100);
    assert.strictEqual(el.activityMap.get("2,2"), 0.5);

    // Heat is clamped at MAX_HEAT (1.0).
    for (let i = 0; i < 20; i++) {
      el.recordActivity(100, 100);
    }
    assert.strictEqual(el.activityMap.get("2,2"), 1.0);

    // Different coordinates land in a different cell.
    el.recordActivity(500, -40);
    assert.ok(el.activityMap.has("12,-1"));

    document.body.removeChild(el);
  });
});
