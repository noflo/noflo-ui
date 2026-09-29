import assert from "node:assert";
import { describe, it } from "node:test";

import "../elements/utils/register.js";

import { Camera } from "../../src/library/Camera.js";
import { SpaceManager } from "../../src/library/SpaceManager.js";

/** @param {number} id @param {number} x @param {number} y */
const pointer = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y });

function setup() {
  const spaceManager = new SpaceManager(1.0, { x: 0, y: 0 });
  const transformLayer = document.createElement("div");
  const host = document.createElement("div");
  /** @type {DOMRect} */
  const rect = {
    left: 0,
    top: 0,
    width: 1000,
    height: 1000,
    right: 1000,
    bottom: 1000,
    x: 0,
    y: 0,
    toJSON() {
      return this;
    },
  };
  const camera = new Camera({
    transformLayer,
    host,
    spaceManager,
    getRect: () => rect,
  });
  return { camera, spaceManager, transformLayer, host };
}

describe("Camera", () => {
  it("apply() writes the transform, --zoom-scale, and syncs SpaceManager", () => {
    const { camera, transformLayer, host, spaceManager } = setup();
    camera.zoom = 2;
    camera.offset = { x: 10, y: 20 };
    camera.apply();

    assert.strictEqual(
      transformLayer.style.transform,
      "translate(10px, 20px) scale(2)",
    );
    assert.match(host.style.getPropertyValue("--zoom-scale"), /2/);
    assert.strictEqual(spaceManager.zoom, 2);
    assert.strictEqual(spaceManager.offset.x, 10);
    assert.strictEqual(spaceManager.offset.y, 20);
  });

  it("accumulates pan offset and distance", () => {
    const { camera } = setup();
    camera.startPan(1);
    camera.panBy(10, 0);
    camera.panBy(0, 5);
    assert.strictEqual(camera.offset.x, 10);
    assert.strictEqual(camera.offset.y, 5);
    assert.strictEqual(camera.panDistance, 15);
  });

  it("endPan reports a tap only for negligible, non-pinch movement", () => {
    const { camera } = setup();

    camera.startPan(1);
    camera.panBy(1, 0); // distance 1 < 5
    assert.strictEqual(camera.endPan(1), true);

    camera.startPan(2);
    camera.panBy(10, 0); // distance 10
    assert.strictEqual(camera.endPan(2), false);

    camera.startPan(3);
    assert.strictEqual(camera.endPan(999), false); // not the panning pointer
    assert.strictEqual(camera.isPanning, true); // untouched by wrong pointer
  });

  it("wheelZoom zooms around the cursor and is clamped", () => {
    const { camera } = setup();

    // delta = -deltaY = 1000 -> zoom *= (1 + 1000*0.001) = 2, around (0,0)
    camera.wheelZoom(
      /** @type {any} */ ({ deltaY: -1000, clientX: 0, clientY: 0 }),
    );
    assert.strictEqual(camera.zoom, 2);
    assert.strictEqual(camera.offset.x, 0);
    assert.strictEqual(camera.offset.y, 0);

    // huge zoom-out clamps to the floor
    camera.wheelZoom(
      /** @type {any} */ ({ deltaY: 100000, clientX: 0, clientY: 0 }),
    );
    assert.strictEqual(camera.zoom, 0.1);
  });

  it("tracks pointers and pinch-zooms from two fingers", () => {
    const { camera } = setup();
    camera.trackPointer(pointer(1, 0, 0));
    assert.strictEqual(camera.isPinching(), false);
    camera.trackPointer(pointer(2, 100, 0));
    assert.strictEqual(camera.isPinching(), true);

    camera.beginPinch(); // distance 100, center (50, 0)

    // spread fingers to 200px apart
    camera.trackPointer(pointer(1, 0, 0));
    camera.trackPointer(pointer(2, 200, 0));
    camera.updatePinch(); // factor 200/100 = 2
    assert.strictEqual(camera.zoom, 2);

    camera.releasePointer(1);
    camera.releasePointer(2);
    assert.strictEqual(camera.allPointersReleased(), true);
    camera.resetPinchGesture();
    assert.strictEqual(camera.didPinch, false);
  });

  it("fit() frames all entities into the viewport (and actually applies)", () => {
    const { camera, spaceManager } = setup();
    spaceManager.addEntity("a", { x: 0, y: 0 }, 100);
    spaceManager.addEntity("b", { x: 300, y: 0 }, 100);

    camera.fit();

    // bbox 400x100 + padding 200 each -> content 600x300 in a 1000x1000 rect
    assert.strictEqual(camera.zoom, 1.0);
    assert.strictEqual(camera.offset.x, 300); // 500 - contentCenterX(200)
    assert.strictEqual(spaceManager.zoom, 1.0); // sync happened via apply()
  });

  it("maintainCenterOnResize keeps the graph center stable", () => {
    const { camera } = setup();
    camera.zoom = 2;
    camera.offset = { x: 100, y: 100 };
    camera.apply();

    camera.maintainCenterOnResize(); // same rect -> offset unchanged

    assert.strictEqual(camera.offset.x, 100);
    assert.strictEqual(camera.offset.y, 100);
  });
});
