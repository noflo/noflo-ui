/**
 * @file The Engine's message dispatcher as a NoFlo graph, per SPEC "Worker
 * Internals & Resilience": an Intent arriving via postMessage enters this
 * network, is validated and applied to the Y.Doc, and the resulting
 * authoritative echoes are routed back to the Glass.
 *
 * The graph is intentionally thin wiring around the pure engine core; the
 * business logic lives in testable ES modules.
 *
 * NoFlo 2.x loading (work document #52): the application owns component
 * discovery. The registry literal below is the whole loader — a synchronous
 * catalog of imported module namespaces, read once at network construction.
 * Names follow the 2.x ecosystem convention `libraryId/Name`, where the
 * library id is the package name minus any `@scope/` prefix minus a leading
 * `noflo-` (so @noflo/core ships `core/Repeat`), matching what publish-time
 * manifests emit.
 */

import * as Repeat from "../../vendor/core/Repeat.js";
import { GraphModel, internalSocket } from "../../vendor/noflo.js";
import * as Gateway from "../components/engine/Gateway.js";
import * as Intent from "../components/engine/Intent.js";
import * as Lifecycle from "../components/engine/Lifecycle.js";
import * as Query from "../components/engine/Query.js";
import * as Route from "../components/engine/Route.js";
import * as Send from "../components/engine/Send.js";

/**
 * A component module as the registry stores it: an ESM namespace whose
 * `getComponent` is the 2.x canonical named export.
 *
 * @typedef {{ getComponent: (...args: any[]) => any }} EngineComponentModule
 */

/**
 * The Engine's component registry (NoFlo 2.x registry contract): `list()`
 * returns the component catalog; the engine does no filesystem discovery.
 * Components added here must be vendored in utils/build-vendors.js.
 *
 * @returns {{
 *   list: () => Record<string, EngineComponentModule>,
 * }}
 */
export function createEngineRegistry() {
  return {
    list: () => ({
      "engine/Gateway": Gateway,
      "engine/Route": Route,
      "engine/Lifecycle": Lifecycle,
      "engine/Query": Query,
      "engine/Intent": Intent,
      "engine/Send": Send,
      "core/Repeat": Repeat,
    }),
  };
}

/**
 * Builds the dispatcher graph:
 *
 *     Gateway in -> Route
 *       Route lifecycle -> Lifecycle message -> Lifecycle echo -> Send in
 *       Route query    -> Query message    -> Query echo    -> Send in
 *       Route intent   -> Intent message   -> Intent echo   -> Send in
 *
 * The `invalid` outport of the gateway is left unconnected: malformed
 * messages are logged and dropped. The route's awareness path is
 * accepted-and-dropped (ephemeral: rebroadcast only) and stays
 * unconnected too.
 *
 * @returns {GraphModel}
 */
export function createDispatcherGraph() {
  const graph = new GraphModel({ name: "engine-dispatch" });
  graph.addNode({ entity_id: "gateway", component: "engine/Gateway" });
  graph.addNode({ entity_id: "route", component: "engine/Route" });
  graph.addNode({ entity_id: "lifecycle", component: "engine/Lifecycle" });
  graph.addNode({ entity_id: "query", component: "engine/Query" });
  graph.addNode({ entity_id: "intent", component: "engine/Intent" });
  graph.addNode({ entity_id: "send", component: "engine/Send" });
  graph.addEdge({
    from: { node: "gateway", port: "engine" },
    to: { node: "route", port: "in" },
  });
  graph.addEdge({
    from: { node: "route", port: "lifecycle" },
    to: { node: "lifecycle", port: "message" },
  });
  graph.addEdge({
    from: { node: "route", port: "query" },
    to: { node: "query", port: "message" },
  });
  graph.addEdge({
    from: { node: "route", port: "intent" },
    to: { node: "intent", port: "message" },
  });
  graph.addEdge({
    from: { node: "lifecycle", port: "echo" },
    to: { node: "send", port: "in" },
  });
  graph.addEdge({
    from: { node: "query", port: "echo" },
    to: { node: "send", port: "in" },
  });
  graph.addEdge({
    from: { node: "intent", port: "echo" },
    to: { node: "send", port: "in" },
  });
  return graph;
}

/**
 * Injects the engine's live context into a started network through sockets.
 * NoFlo 2.x deep-freezes IIP data — graph data must be inert values — so the
 * live handles (the Y.Doc, the engine state, the Glass callback) travel as
 * runtime IPs on their control ports instead of graph IIPs. Control ports
 * buffer the latest value and never trigger processing, so the context sits
 * ready before the first message enters through the gateway.
 *
 * @param {Awaited<ReturnType<typeof import("../../vendor/noflo.js").createNetwork>>} network
 *   A started dispatcher network
 * @param {{ doc: any, state: any, callback: (message: any) => void }} context
 */
export function wireEngineContext(network, { doc, state, callback }) {
  const wiring = [
    ["query", "doc", doc],
    ["intent", "doc", doc],
    ["lifecycle", "state", state],
    ["send", "callback", callback],
  ];
  for (const [nodeId, port, value] of wiring) {
    const process = network.getNode(nodeId);
    if (!process?.component) {
      throw new Error(`Engine dispatcher lost its ${nodeId} node`);
    }
    const socket = internalSocket.createSocket();
    process.component.inPorts[port].attach(socket);
    socket.send(value);
  }
}
