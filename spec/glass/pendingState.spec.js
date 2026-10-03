import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPendingTracker } from "../../src/glass/pendingState.js";

const GRAPH = "main";

/**
 * A minimal projected view with one node, one edge, and one IIP.
 *
 * @returns {any}
 */
function seededView() {
  return {
    processes: {
      A: { component: "c/A", metadata: { x: 0, y: 0 } },
      B: { component: "c/B", metadata: { x: 100, y: 0 } },
    },
    connections: [
      {
        src: { process: "A", port: "out", index: 0 },
        tgt: { process: "B", port: "in", index: 0 },
      },
      {
        data: "hello",
        tgt: { process: "B", port: "in", index: 0 },
        metadata: { id: "DATA->B:in[0]" },
      },
    ],
    inports: {},
    outports: {},
  };
}

describe("pending state tracker (work document #21)", () => {
  it("marks node adds pending until the replica confirms", () => {
    const tracker = createPendingTracker();
    tracker.markIntent(
      {
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: GRAPH,
          nodeId: "C",
          componentName: "c/C",
          metadata: { x: 1, y: 2 },
        },
      },
      GRAPH,
    );
    let state = tracker.reconcile(seededView(), GRAPH);
    assert.equal(state.nodes.get("C"), "add", "C is pending");
    assert.equal(
      state.nodes.has("A"),
      false,
      "confirmed nodes are not pending",
    );

    // Replica confirms: the node appears, pending clears
    const view = seededView();
    view.processes.C = { component: "c/C", metadata: { x: 1, y: 2 } };
    state = tracker.reconcile(view, GRAPH);
    assert.equal(state.nodes.has("C"), false);
    assert.equal(tracker.size, 0);
  });

  it("tracks removals by absence and moves by metadata match", () => {
    const tracker = createPendingTracker();
    tracker.markIntent(
      {
        type: "INTENT",
        command: "removeNode",
        payload: { graphId: GRAPH, nodeId: "B" },
      },
      GRAPH,
    );
    tracker.markIntent(
      {
        type: "INTENT",
        command: "moveNode",
        payload: { graphId: GRAPH, nodeId: "A", metadata: { x: 42, y: 7 } },
      },
      GRAPH,
    );
    let state = tracker.reconcile(seededView(), GRAPH);
    assert.equal(
      state.nodes.get("B"),
      "remove",
      "removal pending while present",
    );
    assert.equal(
      state.nodes.get("A"),
      "move",
      "move pending until position matches",
    );

    // Replica confirms both
    const view = seededView();
    delete view.processes.B;
    view.processes.A.metadata = { x: 42, y: 7 };
    state = tracker.reconcile(view, GRAPH);
    assert.equal(state.nodes.size, 0);
  });

  it("tracks edges and IIPs through their deterministic ids", () => {
    const tracker = createPendingTracker();
    tracker.markIntent(
      {
        type: "INTENT",
        command: "addEdge",
        payload: {
          graphId: GRAPH,
          src: { node: "B", port: "out" },
          tgt: { node: "A", port: "in" },
        },
      },
      GRAPH,
    );
    tracker.markIntent(
      {
        type: "INTENT",
        command: "addIIP",
        payload: { graphId: GRAPH, data: "x", tgt: { node: "A", port: "in" } },
      },
      GRAPH,
    );
    tracker.markIntent(
      {
        type: "INTENT",
        command: "removeEdge",
        payload: { graphId: GRAPH, id: "A:out[0]->B:in[0]" },
      },
      GRAPH,
    );
    tracker.markIntent(
      {
        type: "INTENT",
        command: "removeIIP",
        payload: { graphId: GRAPH, id: "DATA->B:in[0]" },
      },
      GRAPH,
    );

    let state = tracker.reconcile(seededView(), GRAPH);
    assert.equal(state.edges.get("B:out[0]->A:in[0]"), "add");
    assert.equal(state.edges.get("A:out[0]->B:in[0]"), "remove");
    assert.equal(state.iips.get("DATA->A:in[0]"), "add");
    assert.equal(state.iips.get("DATA->B:in[0]"), "remove");

    // Replica converges: the new edge and IIP exist, the removed ones are gone
    const view = seededView();
    view.connections.push({
      src: { process: "B", port: "out", index: 0 },
      tgt: { process: "A", port: "in", index: 0 },
    });
    view.connections = view.connections.filter(
      (c) =>
        c.metadata?.id !== "DATA->B:in[0]" &&
        !(c.src?.process === "A" && c.tgt?.process === "B"),
    );
    view.connections.push({
      data: "x",
      tgt: { process: "A", port: "in", index: 0 },
      metadata: { id: "DATA->A:in[0]" },
    });
    state = tracker.reconcile(view, GRAPH);
    assert.equal(state.edges.size, 0);
    assert.equal(state.iips.size, 0);
  });

  it("ignores other graphs and non-graph messages", () => {
    const tracker = createPendingTracker();
    tracker.markIntent(
      {
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "other",
          nodeId: "C",
          componentName: "c",
          metadata: { x: 0, y: 0 },
        },
      },
      GRAPH,
    );
    tracker.markIntent(
      { type: "MESH", command: "configure", payload: { enabled: true } },
      GRAPH,
    );
    tracker.markIntent(
      { type: "AWARENESS", command: "dragging", payload: { nodeId: "A" } },
      GRAPH,
    );
    const state = tracker.reconcile(seededView(), GRAPH);
    assert.equal(
      state.nodes.size,
      0,
      "other-graph and non-graph messages pending nothing",
    );
  });

  it("expires entries past the TTL so rejected intents do not linger", async () => {
    const tracker = createPendingTracker({ ttlMs: 30 });
    tracker.markIntent(
      {
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: GRAPH,
          nodeId: "never",
          componentName: "c",
          metadata: { x: 0, y: 0 },
        },
      },
      GRAPH,
    );
    // The engine never confirms this one; time passes beyond the TTL
    await new Promise((resolve) => setTimeout(resolve, 40));
    const state = tracker.reconcile(seededView(), GRAPH);
    assert.equal(state.nodes.has("never"), false, "expired pending dropped");
    assert.equal(tracker.size, 0);
  });
});
