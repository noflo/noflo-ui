/**
 * @file The chat pipeline's dispatch graph (work document #53 extraction
 * 3): the Companion's chatbot as NoFlo structure — parse → verify → gate
 * → dispatch. The components are thin assembly adapters; the state they
 * need (the owner contact, the open claim, the pi manager, the command
 * handlers, the sender-verification callback) rides control ports as
 * runtime IPs (NoFlo 2.x deep-freezes graph IIP data — live handles
 * travel as runtime IPs, the wireEngineContext lesson from work document
 * #52).
 *
 * Registry names follow the 2.x `libraryId/Name` convention with the
 * app-private `companion` library id (work document #52 update #1).
 */

import { GraphModel, internalSocket } from "../../vendor/noflo.js";

import * as Dispatch from "../components/companion/Dispatch.js";
import * as Gate from "../components/companion/Gate.js";
import * as Parse from "../components/companion/Parse.js";
import * as Verify from "../components/companion/Verify.js";

/**
 * A component module as the registry stores it: an ESM namespace whose
 * `getComponent` is the 2.x canonical named export.
 *
 * @typedef {{ getComponent: (...args: any[]) => any }} CompanionComponentModule
 */

/**
 * The chat pipeline's component registry (NoFlo 2.x registry contract).
 *
 * @returns {{
 *   list: () => Record<string, CompanionComponentModule>,
 * }}
 */
export function createChatRegistry() {
  return {
    list: () => ({
      "companion/parse": Parse,
      "companion/verify": Verify,
      "companion/gate": Gate,
      "companion/dispatch": Dispatch,
    }),
  };
}

/**
 * Builds the chat pipeline's dispatch graph.
 *
 *     Parse parsed -> Verify parsed
 *       Verify verified -> Gate verified
 *         Gate admitted -> Dispatch admitted
 *     Gate dropped -> (unconnected: dropped with narration)
 *
 * @returns {GraphModel}
 */
export function createChatGraph() {
  const graph = new GraphModel({ name: "chat-dispatch" });
  graph.addNode({ entity_id: "parse", component: "companion/parse" });
  graph.addNode({ entity_id: "verify", component: "companion/verify" });
  graph.addNode({ entity_id: "gate", component: "companion/gate" });
  graph.addNode({ entity_id: "dispatch", component: "companion/dispatch" });
  graph.addEdge({
    from: { node: "parse", port: "parsed" },
    to: { node: "verify", port: "parsed" },
  });
  graph.addEdge({
    from: { node: "verify", port: "verified" },
    to: { node: "gate", port: "verified" },
  });
  graph.addEdge({
    from: { node: "gate", port: "admitted" },
    to: { node: "dispatch", port: "admitted" },
  });
  return graph;
}

/**
 * Injects the chat pipeline's live context into a started network through
 * sockets: each stage's control port receives the handles its process
 * function consumes.
 *
 * @param {Awaited<ReturnType<typeof import("../../vendor/noflo.js").createNetwork>>} network
 *   A started chat network
 * @param {{
 *   verifySender: (message: any) => Promise<"verified"|"unknown"|"invalid">,
 *   senderIdentityHash: (message: any) => Promise<string | null>,
 *   ownerContact: () => string | null,
 *   claim: () => { code: string, onClaim: (ownerIdentityHash: string) => Promise<void> } | null,
 *   dispatch: (parsed: any) => Promise<void>,
 * }} context
 */
export function wireChatContext(network, context) {
  /** @type {Array<[string, string, any]>} */
  const wiring = [
    ["verify", "verifysender", context.verifySender],
    ["verify", "senderidentityhash", context.senderIdentityHash],
    [
      "gate",
      "gatestate",
      {
        get ownerContact() {
          return context.ownerContact();
        },
        get claim() {
          return context.claim();
        },
      },
    ],
    ["dispatch", "dispatchstate", context.dispatch],
  ];
  for (const [nodeId, port, value] of wiring) {
    const process = network.getNode(nodeId);
    if (!process?.component) {
      throw new Error(`Chat dispatch lost its ${nodeId} node`);
    }
    if (!process.component.inPorts.ports[port]) {
      throw new Error(`Chat dispatch ${nodeId} lost its ${port} port`);
    }
    const socket = internalSocket.createSocket();
    process.component.inPorts.ports[port].attach(socket);
    socket.send(value);
  }
}
