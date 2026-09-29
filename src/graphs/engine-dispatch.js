/**
 * @file The Engine's message dispatcher as a NoFlo graph, per SPEC "Worker
 * Internals & Resilience": an Intent arriving via postMessage enters this
 * network, is validated and applied to the Y.Doc, and the resulting
 * authoritative echoes are routed back to the Glass.
 *
 * The graph is intentionally thin wiring around the pure engine core; the
 * business logic lives in testable ES modules.
 */

import noflo from "noflo";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

import * as ApplyMessage from "../components/engine/ApplyMessage.js";
import * as Gateway from "../components/engine/Gateway.js";
import * as Send from "../components/engine/Send.js";

/**
 * Builds the dispatcher graph:
 *
 *     Gateway in -> message ApplyMessage -> in Send
 *
 * The `invalid` outport of the gateway is left unconnected: malformed
 * messages are logged and dropped.
 *
 * @returns {any}
 */
export function createDispatcherGraph() {
  const graph = new noflo.Graph("engine-dispatch");
  graph.addNode("gateway", "engine/Gateway");
  graph.addNode("apply", "engine/ApplyMessage");
  graph.addNode("send", "engine/Send");
  graph.addEdge("gateway", "engine", "apply", "message");
  graph.addEdge("apply", "echo", "send", "in");
  return graph;
}

/**
 * Registers the engine components with a NoFlo component loader. The loader's
 * component registry is initialized eagerly, bypassing the default
 * filesystem-based package scan: the engine's components are the only ones it
 * needs.
 *
 * @param {any} loader
 */
export function registerEngineComponents(loader) {
  if (!loader.components) {
    loader.components = {};
    loader.ready = true;
  }
  loader.registerComponent("engine", "Gateway", Gateway);
  loader.registerComponent("engine", "ApplyMessage", ApplyMessage);
  loader.registerComponent("engine", "Send", Send);
}
