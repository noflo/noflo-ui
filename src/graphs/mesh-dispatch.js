/**
 * @file The mesh-plane dispatch graph (work document #53 extraction 1):
 * the MESH command pipeline as NoFlo structure. The Engine's message
 * router sends MESH commands into this network's gateway; the route fans
 * each command out to its per-command component, and the components call
 * into the MeshSync layer through their injected context.
 *
 * The components are thin adapters over the mesh layer's methods — the
 * logic stays in MeshSync (work document #53's principle: components are
 * capabilities, graphs are composition). Per-command components are the
 * named capabilities the Companion's graphs reuse (work document #53
 * extraction 3).
 *
 *     Route in -> Configure context/message
 *              -> Status    context
 *              -> Join      context/message
 *              -> ...
 *
 * Registry names follow the 2.x `libraryId/Name` convention with the
 * app-private `mesh` library id (work document #52 update #1).
 */

import { GraphModel, internalSocket } from "../../vendor/noflo.js";

import * as Configure from "../components/mesh/Configure.js";
import * as CreateInvite from "../components/mesh/CreateInvite.js";
import * as FactoryReset from "../components/mesh/FactoryReset.js";
import * as Grant from "../components/mesh/Grant.js";
import * as ImportIdentity from "../components/mesh/ImportIdentity.js";
import * as Join from "../components/mesh/Join.js";
import * as ResolveRequest from "../components/mesh/ResolveRequest.js";
import * as Route from "../components/mesh/Route.js";
import * as Status from "../components/mesh/Status.js";
import * as Stop from "../components/mesh/Stop.js";

/**
 * A component module as the registry stores it: an ESM namespace whose
 * `getComponent` is the 2.x canonical named export.
 *
 * @typedef {{ getComponent: (...args: any[]) => any }} MeshComponentModule
 */

/**
 * The mesh plane's component registry (NoFlo 2.x registry contract). The
 * component names map 1:1 to the contract registry's MESH commands
 * (`mesh/<Command>` for the command `<command>`) — the contract tripwire
 * (work document #37) keeps the two aligned.
 *
 * @returns {{
 *   list: () => Record<string, MeshComponentModule>,
 * }}
 */
export function createMeshRegistry() {
  return {
    list: () => ({
      "mesh/configure": Configure,
      "mesh/createInvite": CreateInvite,
      "mesh/factoryReset": FactoryReset,
      "mesh/grant": Grant,
      "mesh/importIdentity": ImportIdentity,
      "mesh/join": Join,
      "mesh/resolveRequest": ResolveRequest,
      "mesh/route": Route,
      "mesh/stop": Stop,
      "mesh/status": Status,
    }),
  };
}

/**
 * Builds the mesh-plane dispatch graph: the route fans each MESH command
 * out to its per-command component. Every command component carries a
 * `context` control port — the live MeshSync layer and the Glass-facing
 * callbacks arrive as runtime IPs (NoFlo 2.x deep-freezes graph IIP data;
 * live handles travel as runtime IPs, the wireEngineContext lesson from
 * work document #52).
 *
 * @returns {GraphModel}
 */
export function createMeshGraph() {
  const graph = new GraphModel({ name: "mesh-dispatch" });
  graph.addNode({ entity_id: "route", component: "mesh/route" });
  const commands = [
    "configure",
    "createInvite",
    "factoryReset",
    "grant",
    "importIdentity",
    "join",
    "resolveRequest",
    "status",
    "stop",
  ];
  for (const command of commands) {
    // NoFlo port names are lowercase: the route's outport for a command
    // is the command lowercased
    const nodeId = command.toLowerCase();
    graph.addNode({
      entity_id: nodeId,
      component: `mesh/${command}`,
    });
    graph.addEdge({
      from: { node: "route", port: nodeId },
      to: { node: nodeId, port: "message" },
    });
  }
  return graph;
}

/**
 * Injects the mesh plane's live context into a started network through
 * sockets: every command component's `context` control port receives the
 * same handle bundle (the MeshSync layer and the Glass-facing callbacks).
 *
 * @param {Awaited<ReturnType<typeof import("../../vendor/noflo.js").createNetwork>>} network
 *   A started mesh network
 * @param {{
 *   mesh: any,
 *   postMessage: (message: any) => void,
 *   postMeshConfig: () => void,
 *   joinProject: (payload: any) => void,
 *   factoryReset: () => Promise<void>,
 * }} context
 */
export function wireMeshContext(network, context) {
  const commands = [
    "configure",
    "createinvite",
    "factoryreset",
    "grant",
    "importidentity",
    "join",
    "resolverequest",
    "status",
    "stop",
  ];
  for (const nodeId of commands) {
    const process = network.getNode(nodeId);
    if (!process?.component) {
      throw new Error(`Mesh dispatch lost its ${nodeId} node`);
    }
    if (!process.component.inPorts.ports.context) {
      throw new Error(`Mesh dispatch ${nodeId} lost its context port`);
    }
    const socket = internalSocket.createSocket();
    process.component.inPorts.ports.context.attach(socket);
    socket.send(context);
  }
}
