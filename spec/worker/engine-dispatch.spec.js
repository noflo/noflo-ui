import assert from "node:assert/strict";
import { describe, it } from "node:test";

import noflo from "noflo";

import { createEngineState } from "../../src/crdt/EngineCore.js";
import {
  createProjectDoc,
  getGraph,
  getNode,
} from "../../src/crdt/ProjectDoc.js";
import {
  createDispatcherGraph,
  registerEngineComponents,
} from "../../src/graphs/engine-dispatch.js";

/**
 * Starts a dispatcher network wired to an in-memory echo sink.
 *
 * @param {import("yjs").Doc} doc
 * @param {ReturnType<typeof createEngineState>} state
 * @returns {Promise<{ network: any, send: (message: any) => void, echoes: any[] }>}
 */
async function startNetwork(doc, state) {
  const loader = new noflo.ComponentLoader(".");
  registerEngineComponents(loader);
  const graph = createDispatcherGraph();
  graph.addInitial(doc, "apply", "doc");
  graph.addInitial(state, "apply", "state");
  /** @type {any[]} */
  const echoes = [];
  graph.addInitial(
    (/** @type {any} */ echo) => echoes.push(echo),
    "send",
    "callback",
  );
  const network = await noflo.createNetwork(graph, { componentLoader: loader });

  const gateway = network.getNode("gateway");
  const socket = noflo.internalSocket.createSocket();
  /** @type {any} */ (gateway.component.inPorts).in.attach(socket);
  return {
    network,
    echoes,
    send(/** @type {any} */ message) {
      socket.send(message);
    },
  };
}

describe("engine dispatcher graph", () => {
  it("routes an addNode intent through the network to an addnode echo", async () => {
    const doc = createProjectDoc("p");
    const session = await startNetwork(doc, createEngineState());

    session.send({
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "fs/ReadFile",
        metadata: { x: 10, y: 20 },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(session.echoes.length, 1);
    assert.equal(session.echoes[0].protocol, "graph");
    assert.equal(session.echoes[0].command, "addnode");
    assert.equal(session.echoes[0].payload.id, "Read");
    assert.ok(
      getNode(getGraph(doc, "main"), "Read"),
      "CRDT mutated through the graph",
    );
    await session.network.stop();
  });

  it("drops malformed messages without echoes", async () => {
    const doc = createProjectDoc("p");
    const session = await startNetwork(doc, createEngineState());

    session.send({ garbage: true });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(session.echoes.length, 0);
    await session.network.stop();
  });

  it("answers signature queries through the network", async () => {
    const doc = createProjectDoc("p");
    const session = await startNetwork(doc, createEngineState());

    session.send({
      type: "QUERY",
      command: "getSignature",
      payload: { componentName: "c/Nope" },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(session.echoes.length, 1);
    assert.equal(session.echoes[0].protocol, "system");
    assert.equal(session.echoes[0].command, "signature");
    assert.equal(session.echoes[0].payload.signature, null);
    await session.network.stop();
  });
});
