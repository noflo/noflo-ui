import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { graphViewToOps } from "../../src/worker/runtimeDeploy.js";
import { OP_TYPE } from "../../vendor/fbp-protocol.js";

/**
 * The deploy converter (work document #59): a projected graph view turns
 * into the `0x14` op stream in dependency order — nodes, edges, IIPs,
 * exports, groups — with the CRDT's deterministic entity ids so a
 * redeploy converges onto the same entities.
 */

const VIEW = {
  nodes: [
    { id: "a", component: "core/Repeat", metadata: { x: 1, y: 2 } },
    { id: "b", component: "core/Repeat", metadata: {} },
  ],
  edges: [
    {
      from: { node: "a", port: "out", index: 0 },
      to: { node: "b", port: "in", index: 0 },
      metadata: { route: 2 },
    },
  ],
  initializers: [
    {
      from: { data: "hello" },
      to: { node: "b", port: "in", index: 0 },
      metadata: { id: "DATA->b:in[0]" },
    },
  ],
  inports: {
    data: { process: "a", port: "in", index: 0, metadata: {} },
  },
  outports: {
    out: { process: "b", port: "out", metadata: {} },
  },
  groups: [{ id: "g1", name: "pair", nodes: ["a", "b"] }],
};

describe("graphViewToOps (work document #59)", () => {
  it("streams entities in dependency order with deterministic ids", () => {
    const ops = graphViewToOps(VIEW);
    assert.deepEqual(
      ops.map((op) => op.opType),
      [
        OP_TYPE.INSERT_NODE,
        OP_TYPE.INSERT_NODE,
        OP_TYPE.INSERT_EDGE,
        OP_TYPE.INSERT_IIP,
        OP_TYPE.INSERT_EXPORT,
        OP_TYPE.INSERT_EXPORT,
        OP_TYPE.INSERT_GROUP,
      ],
    );
    const [nodeA, nodeB, edge, iip, inExport, outExport, group] = ops;
    assert.equal(nodeA.entityId, "a");
    assert.deepEqual(nodeA.payload, {
      component: "core/Repeat",
      metadata: { x: 1, y: 2 },
    });
    // The edge id is the CRDT's deterministic edge key
    assert.equal(edge.entityId, "a:out[0]->b:in[0]");
    assert.deepEqual(edge.payload, {
      from: { node: "a", port: "out", index: 0 },
      to: { node: "b", port: "in", index: 0 },
      metadata: { route: 2 },
    });
    assert.equal(iip.entityId, "DATA->b:in[0]");
    assert.deepEqual(iip.payload, {
      from: { data: "hello" },
      to: { node: "b", port: "in", index: 0 },
      metadata: { id: "DATA->b:in[0]" },
    });
    // Exports: entity ids derive from direction and public name
    assert.equal(inExport.entityId, "export:inport:data");
    assert.deepEqual(inExport.payload, {
      direction: "inport",
      public: "data",
      internal: { node: "a", port: "in", index: 0 },
      metadata: {},
    });
    assert.equal(outExport.entityId, "export:outport:out");
    assert.deepEqual(outExport.payload, {
      direction: "outport",
      public: "out",
      internal: { node: "b", port: "out" },
      metadata: {},
    });
    assert.equal(group.entityId, "g1");
    assert.deepEqual(group.payload, {
      name: "pair",
      nodes: ["a", "b"],
      metadata: {},
    });
  });

  it("an empty view deploys nothing", () => {
    assert.deepEqual(graphViewToOps({}), []);
  });
});
