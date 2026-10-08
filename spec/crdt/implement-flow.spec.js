import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  getComponent,
  getComponentCode,
  getComponentSignature,
  getGraph,
} from "../../src/crdt/ProjectDoc.js";
import * as Y from "../../vendor/yjs.js";

/**
 * Boots a project doc with one root graph and a stub component signature.
 *
 * @returns {{ doc: Y.Doc, state: ReturnType<createEngineState>, send: (message: any) => any }}
 */
function boot() {
  const doc = new Y.Doc();
  const state = createEngineState();
  handleMessage(doc, state, {
    type: "INTENT",
    command: "createGraph",
    payload: { graphId: "main", name: "main" },
  });
  handleMessage(doc, state, {
    type: "INTENT",
    command: "addNode",
    payload: {
      graphId: "main",
      nodeId: "n1",
      componentName: "sketchy",
      metadata: { x: 10, y: 20 },
    },
  });
  return {
    doc,
    state,
    send: (message) => handleMessage(doc, state, message),
  };
}

describe("component implementation flow (work document #29)", () => {
  it("implementAsGraph creates the component's subgraph under the parent", () => {
    const { doc, send } = boot();
    const result = send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    assert.ok(result.accepted, "the implementation is accepted");
    assert.ok(getGraph(doc, "sketchy"), "the subgraph exists");
    assert.equal(
      result.echoes[0]?.command,
      "creategraph",
      "echoes creategraph",
    );
    assert.deepEqual(result.echoes[0]?.payload, {
      id: "sketchy",
      name: "sketchy",
      parent: "main",
    });
  });

  it("a graph implementation is navigable from referencing nodes", () => {
    const { doc, send } = boot();
    send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    const graph = getGraph(doc, "sketchy");
    assert.ok(graph, "the subgraph exists under the component's name");
    assert.equal(
      graph?.get("metadata")?.get("parent"),
      "main",
      "nested for navigation",
    );
    // The node's component now resolves as a subgraph
    const node = getGraph(doc, "main")?.get("nodes")?.get("n1");
    assert.equal(node?.get("component"), "sketchy");
  });

  it("implementAsGraph is idempotent: re-implementing echoes without mutating", () => {
    const { doc, send } = boot();
    send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    const result = send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    assert.ok(result.accepted, "re-implementation succeeds");
    assert.equal(
      result.echoes[0]?.command,
      "creategraph",
      "echoes the existing graph",
    );
    assert.equal(
      getGraph(doc, "sketchy")?.get("nodes")?.size,
      0,
      "no second graph",
    );
  });

  it("implementAsGraph refuses unknown components and unknown parents", () => {
    const { send } = boot();
    const unknown = send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "ghost", parentGraph: "main" },
    });
    assert.ok(!unknown.accepted, "unknown component refused");
    const unknownParent = send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "elsewhere" },
    });
    assert.ok(!unknownParent.accepted, "unknown parent refused");
  });

  it("implementInCode records the implementation and writes the scaffold", () => {
    const { doc, send } = boot();
    const result = send({
      type: "INTENT",
      command: "implementInCode",
      payload: {
        component: "sketchy",
        language: "javascript",
        scaffold: "export default function sketchy() {}",
      },
    });
    assert.ok(result.accepted);
    const entry = getComponent(doc, "sketchy");
    assert.ok(entry, "the component entry exists");
    assert.deepEqual(entry?.get("metadata")?.get("implementation"), {
      kind: "code",
      language: "javascript",
    });
    assert.equal(
      getComponentCode(entry).toString(),
      "export default function sketchy() {}",
    );
  });

  it("implementInCode refuses graph-implemented components", () => {
    const { send } = boot();
    send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    const result = send({
      type: "INTENT",
      command: "implementInCode",
      payload: { component: "sketchy", language: "javascript", scaffold: "" },
    });
    assert.ok(!result.accepted, "a graph implementation excludes code");
  });

  it("forkComponent copies the signature and renames all references", () => {
    const { doc, send } = boot();
    // A second node using the same component, in another graph
    send({
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "n2",
        componentName: "sketchy",
        metadata: { x: 30, y: 40 },
      },
    });
    const result = send({
      type: "INTENT",
      command: "forkComponent",
      payload: { component: "sketchy", to: "sketchy-fork" },
    });
    assert.ok(result.accepted);
    const forked = getComponentSignature(doc, "sketchy-fork");
    assert.ok(forked, "the forked signature is registered");
    assert.equal(
      forked?.toJSON().inports?.length,
      getComponentSignature(doc, "sketchy")?.toJSON().inports?.length,
      "ports copied",
    );
    const components = /** @type {Y.Map<any>} */ (
      getGraph(doc, "main")?.get("nodes")
    );
    assert.equal(components.get("n1")?.get("component"), "sketchy-fork");
    assert.equal(components.get("n2")?.get("component"), "sketchy-fork");
    assert.ok(
      result.echoes.every(
        (/** @type {any} */ echo) => echo.command === "setcomponent",
      ),
      "every rename echoes setcomponent",
    );
    assert.equal(result.echoes.length, 2, "one echo per renamed reference");
    // The original stays intact for the library
    assert.ok(getComponentSignature(doc, "sketchy"), "original kept");
  });

  it("forkComponent refuses taken names and unknown components", () => {
    const { doc, send } = boot();
    const taken = send({
      type: "INTENT",
      command: "forkComponent",
      payload: { component: "sketchy", to: "sketchy" },
    });
    assert.ok(!taken.accepted, "same name refused");
    const ghost = send({
      type: "INTENT",
      command: "forkComponent",
      payload: { component: "ghost", to: "anything" },
    });
    assert.ok(!ghost.accepted, "unknown component refused");
    assert.equal(
      getGraph(doc, "main")?.get("nodes")?.get("n1")?.get("component"),
      "sketchy",
    );
  });
});

describe("signature specification (work document #29)", () => {
  it("setSignature writes the declared interface and echoes it", () => {
    const { doc, send } = boot();
    const result = send({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "sketchy",
        signature: {
          inports: [{ name: "in", type: "number" }],
          outports: [{ name: "out" }],
          description: "A sketched component",
        },
      },
    });
    assert.ok(result.accepted);
    const signature = getComponentSignature(doc, "sketchy")?.toJSON();
    assert.equal(signature?.inports?.[0]?.name, "in");
    assert.equal(signature?.inports?.[0]?.type, "number");
    assert.equal(signature?.description, "A sketched component");
    assert.equal(result.echoes[0]?.protocol, "system");
    assert.equal(result.echoes[0]?.command, "signature");
  });

  it("setSignature refuses invalid ports and graph-implemented components", () => {
    const { send } = boot();
    const bad = send({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "sketchy",
        signature: { inports: [{ type: "number" }] },
      },
    });
    assert.ok(!bad.accepted, "a port without a name is refused");
    send({
      type: "INTENT",
      command: "implementAsGraph",
      payload: { component: "sketchy", parentGraph: "main" },
    });
    const graphed = send({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "sketchy",
        signature: { inports: [{ name: "in" }] },
      },
    });
    assert.ok(!graphed.accepted, "graph signatures are engine-derived");
  });

  it("setSignature refuses duplicate names within a direction (work document #5)", () => {
    const { doc, send } = boot();
    const duplicated = send({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "sketchy",
        signature: {
          inports: [{ name: "in" }, { name: "in" }],
          outports: [{ name: "out" }],
        },
      },
    });
    assert.ok(!duplicated.accepted, 'two "in" inports are refused');
    assert.deepEqual(
      getComponentSignature(doc, "sketchy")?.toJSON(),
      {
        inports: [{ name: "in", type: "all" }],
        outports: [{ name: "out", type: "all" }],
      },
      "the refusal leaves the registered signature untouched",
    );

    // The same name across directions is fine
    const crossed = send({
      type: "INTENT",
      command: "setSignature",
      payload: {
        component: "sketchy",
        signature: {
          inports: [{ name: "in" }],
          outports: [{ name: "in" }],
        },
      },
    });
    assert.ok(crossed.accepted, '"in" inport and "in" outport coexist');
  });
});

describe("graph groups (work document #5 update #16)", () => {
  /**
   * A project with two nodes on main.
   */
  function groupBoot() {
    const doc = new Y.Doc();
    const state = createEngineState();
    const send = (message) => handleMessage(doc, state, message);
    send({
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "main" },
    });
    for (const id of ["n1", "n2"]) {
      send({
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "main",
          nodeId: id,
          componentName: "sketchy",
          metadata: { x: 10, y: 10 },
        },
      });
    }
    return { doc, send };
  }

  it("createGroup persists the selection as graph structure", () => {
    const { doc, send } = groupBoot();
    const result = send({
      type: "INTENT",
      command: "createGroup",
      payload: { graphId: "main", nodeIds: ["n1", "n2"], name: "Pipelining" },
    });
    assert.ok(result.accepted);
    const groups = getGraph(doc, "main")?.get("groups");
    assert.equal(groups?.size, 1, "one group");
    const group = [...groups.values()][0];
    assert.equal(group.get("name"), "Pipelining");
    assert.deepEqual(group.get("nodes").toArray(), ["n1", "n2"]);
  });

  it("createGroup refuses unknown nodes", () => {
    const { doc, send } = groupBoot();
    const result = send({
      type: "INTENT",
      command: "createGroup",
      payload: { graphId: "main", nodeIds: ["n1", "ghost"] },
    });
    assert.ok(!result.accepted);
    assert.equal(getGraph(doc, "main")?.get("groups")?.size, 0);
  });

  it("updateGroup moves members in and out", () => {
    const { doc, send } = groupBoot();
    send({
      type: "INTENT",
      command: "createGroup",
      payload: { graphId: "main", nodeIds: ["n1"] },
    });
    const groupId = [...getGraph(doc, "main").get("groups").keys()][0];
    const joined = send({
      type: "INTENT",
      command: "updateGroup",
      payload: { graphId: "main", groupId, add: ["n2"] },
    });
    assert.ok(joined.accepted);
    let group = [...getGraph(doc, "main").get("groups").values()][0];
    assert.deepEqual(group.get("nodes").toArray(), ["n1", "n2"]);
    const left = send({
      type: "INTENT",
      command: "updateGroup",
      payload: { graphId: "main", groupId, remove: ["n1"] },
    });
    assert.ok(left.accepted);
    group = [...getGraph(doc, "main").get("groups").values()][0];
    assert.deepEqual(group.get("nodes").toArray(), ["n2"]);
  });

  it("removeGroup keeps the members in the graph", () => {
    const { doc, send } = groupBoot();
    send({
      type: "INTENT",
      command: "createGroup",
      payload: { graphId: "main", nodeIds: ["n1", "n2"] },
    });
    const groupId = [...getGraph(doc, "main").get("groups").keys()][0];
    const result = send({
      type: "INTENT",
      command: "removeGroup",
      payload: { graphId: "main", groupId },
    });
    assert.ok(result.accepted);
    assert.equal(getGraph(doc, "main")?.get("groups")?.size, 0);
    const nodes = getGraph(doc, "main")?.get("nodes");
    assert.ok(nodes.has("n1") && nodes.has("n2"), "members stay");
  });

  it("removing a node cleans its group memberships", () => {
    const { doc, send } = groupBoot();
    send({
      type: "INTENT",
      command: "createGroup",
      payload: { graphId: "main", nodeIds: ["n1", "n2"] },
    });
    send({
      type: "INTENT",
      command: "removeNode",
      payload: { graphId: "main", nodeId: "n1" },
    });
    const group = [...getGraph(doc, "main").get("groups").values()][0];
    assert.deepEqual(group.get("nodes").toArray(), ["n2"]);
  });
});

describe("edge routes (work document #35)", () => {
  /**
   * A project with two wired nodes.
   */
  function routeBoot() {
    const doc = new Y.Doc();
    const state = createEngineState();
    const send = (message) => handleMessage(doc, state, message);
    send({
      type: "INTENT",
      command: "createGraph",
      payload: { graphId: "main", name: "main" },
    });
    send({
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "a",
        componentName: "c",
        metadata: { x: 0, y: 0 },
      },
    });
    send({
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "b",
        componentName: "c",
        metadata: { x: 100, y: 0 },
      },
    });
    send({
      type: "INTENT",
      command: "addEdge",
      payload: {
        graphId: "main",
        src: { node: "a", port: "out" },
        tgt: { node: "b", port: "in" },
      },
    });
    return { doc, send };
  }

  it("setEdgeRoute stores the route on the edge metadata", () => {
    const { doc, send } = routeBoot();
    const result = send({
      type: "INTENT",
      command: "setEdgeRoute",
      payload: { graphId: "main", edgeId: "a:out[0]->b:in[0]", route: 4 },
    });
    assert.ok(result.accepted);
    const edge = getGraph(doc, "main")?.get("edges")?.get("a:out[0]->b:in[0]");
    assert.equal(edge?.get("metadata")?.get("route"), 4);
  });

  it("setEdgeRoute null clears the route", () => {
    const { doc, send } = routeBoot();
    send({
      type: "INTENT",
      command: "setEdgeRoute",
      payload: { graphId: "main", edgeId: "a:out[0]->b:in[0]", route: 2 },
    });
    const result = send({
      type: "INTENT",
      command: "setEdgeRoute",
      payload: { graphId: "main", edgeId: "a:out[0]->b:in[0]", route: null },
    });
    assert.ok(result.accepted);
    const edge = getGraph(doc, "main")?.get("edges")?.get("a:out[0]->b:in[0]");
    assert.equal(edge?.get("metadata")?.has("route"), false);
  });

  it("setEdgeRoute refuses out-of-range routes and unknown edges", () => {
    const { send } = routeBoot();
    const bad = send({
      type: "INTENT",
      command: "setEdgeRoute",
      payload: { graphId: "main", edgeId: "a:out[0]->b:in[0]", route: 12 },
    });
    assert.ok(!bad.accepted, "route 12 refused");
    const ghost = send({
      type: "INTENT",
      command: "setEdgeRoute",
      payload: { graphId: "main", edgeId: "a:out[0]->x:in[0]", route: 1 },
    });
    assert.ok(!ghost.accepted, "unknown edge refused");
  });
});
