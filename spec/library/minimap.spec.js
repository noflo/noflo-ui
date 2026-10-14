import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  minimapLayout,
  minimapPointToGraph,
  viewportRectFromCamera,
} from "../../src/library/minimap.js";

/** A two-node graph with one edge, 0..200 wide. */
function view() {
  return {
    processes: {
      A: { metadata: { x: 0, y: 0 } },
      B: { metadata: { x: 200, y: 100 } },
    },
    connections: [
      { src: { process: "A", port: "out" }, tgt: { process: "B", port: "in" } },
      // Dangling and data-only connections never draw
      { src: { process: "A" }, tgt: { process: "missing" } },
      { data: 1, tgt: { process: "B" } },
    ],
  };
}

describe("minimap layout (work document #5)", () => {
  it("projects nodes and node-to-node edges into the box", () => {
    const layout = minimapLayout({
      view: view(),
      viewport: null,
      size: { width: 120, height: 80 },
    });
    assert.equal(layout.nodes.length, 2);
    assert.equal(layout.edges.length, 1, "only complete edges draw");
    // Both axes fit inside the box
    for (const node of layout.nodes) {
      assert.ok(node.x >= 0 && node.x <= 120, `x in box: ${node.x}`);
      assert.ok(node.y >= 0 && node.y <= 80, `y in box: ${node.y}`);
    }
    // The 200-wide content spans a good part of the 120px box (scale cap
    // keeps small graphs from blowing up)
    assert.ok(layout.scale > 0 && layout.scale <= 0.35);
  });

  it("centers smaller content and preserves relative geometry", () => {
    const layout = minimapLayout({
      view: view(),
      viewport: null,
      size: { width: 400, height: 200 },
    });
    const a = layout.nodes.find((n) => n.id === "A");
    const b = layout.nodes.find((n) => n.id === "B");
    assert.ok(a && b);
    // B is right of and below A, at the same ratio as in graph space
    assert.ok(b.x > a.x);
    assert.ok(b.y > a.y);
    // Centered: the content's midpoint sits near the box's midpoint
    const midX = (a.x + b.x) / 2;
    assert.ok(Math.abs(midX - 200) < 40, `midX near center: ${midX}`);
  });

  it("nodes without coordinates are skipped, empty graphs yield empty layouts", () => {
    const partial = minimapLayout({
      view: {
        processes: {
          A: { metadata: { x: 10, y: 10 } },
          B: { metadata: {} },
        },
        connections: [],
      },
      viewport: null,
      size: { width: 100, height: 100 },
    });
    assert.deepEqual(
      partial.nodes.map((n) => n.id),
      ["A"],
    );
    const empty = minimapLayout({
      view: { processes: {}, connections: [] },
      viewport: { x: 0, y: 0, w: 10, h: 10 },
      size: { width: 100, height: 100 },
    });
    assert.deepEqual(empty, { nodes: [], edges: [], viewport: null, scale: 0 });
  });

  it("maps the viewport rect into minimap coordinates", () => {
    const layout = minimapLayout({
      view: view(),
      viewport: { x: -50, y: -50, w: 300, h: 200 },
      size: { width: 120, height: 80 },
    });
    assert.ok(layout.viewport, "viewport mapped");
    assert.ok(layout.viewport.w > 0 && layout.viewport.h > 0);
    // A viewport wider than the content covers the whole content: its
    // rect contains both dots
    const a = layout.nodes.find((n) => n.id === "A");
    const b = layout.nodes.find((n) => n.id === "B");
    const vp = /** @type {any} */ (layout.viewport);
    assert.ok(
      vp.x <= Math.min(a.x, b.x) && vp.x + vp.w >= Math.max(a.x, b.x),
      "the viewport rect encloses the content horizontally",
    );
  });

  it("viewportRectFromCamera inverts the camera transform", () => {
    // offset -120, zoom 2: the visible graph rect starts at 60 and spans
    // half the pixel size
    const rect = viewportRectFromCamera({ x: -120, y: -40 }, 2, {
      width: 800,
      height: 600,
    });
    assert.deepEqual(rect, { x: 60, y: 20, w: 400, h: 300 });
  });

  it("minimapPointToGraph inverts the layout projection", () => {
    const layout = minimapLayout({
      view: view(),
      viewport: null,
      size: { width: 120, height: 80 },
    });
    // Round-trip: each node's minimap position maps back to its graph position
    for (const node of layout.nodes) {
      const graph = minimapPointToGraph(
        { x: node.x, y: node.y },
        layout,
        { width: 120, height: 80 },
        view(),
      );
      const original = view().processes[node.id].metadata;
      assert.ok(
        Math.abs(graph.x - original.x) < 0.01 &&
          Math.abs(graph.y - original.y) < 0.01,
        `round trip for ${node.id}`,
      );
    }
  });
});
