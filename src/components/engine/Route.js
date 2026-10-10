/**
 * @file Engine route component: the type dispatch as a graph node (work
 * document #53 extraction 1). The pipeline's shape becomes visible —
 * envelope validation (Gateway) lands here, and the route fans each
 * message out to the per-type apply components instead of a single
 * `handleMessage` component hiding the routing inside it.
 *
 * The outports mirror `CORE_TYPE_HANDLERS`' non-MESH keys; the contract
 * tripwire (work document #37) keeps the two aligned. The AWARENESS path
 * is accepted-and-dropped (ephemeral: rebroadcast only), so its outport
 * stays unconnected in the dispatcher graph.
 */

import { Component } from "../../../vendor/assembly.js";

import { CORE_TYPE_HANDLERS } from "../../crdt/EngineCore.js";

/** The route's outport per dispatch type. MESH commands are routed in the
 * Engine's message router before the dispatcher graph. */
const TYPE_PORTS = {
  LIFECYCLE: "lifecycle",
  QUERY: "query",
  INTENT: "intent",
};

/**
 * The engine's route capability as an assembly component (work document
 * #53).
 */
export class Route extends Component {
  constructor() {
    super({
      description: "Routes a validated message to its per-type pipeline",
      icon: "random",
      inPorts: {
        in: { datatype: "object" },
      },
      outPorts: {
        lifecycle: { datatype: "object" },
        query: { datatype: "object" },
        intent: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.has("in")) return;
    const message = input.getData("in");
    const port =
      TYPE_PORTS[/** @type {keyof typeof TYPE_PORTS} */ (message.type)];
    if (!port) {
      // The gateway validated the envelope; an unknown type means code
      // and contract have drifted (the #37 tripwire catches it in CI).
      // Drop here rather than guess.
      console.warn(
        `Engine route dropped a message of unknown type: ${message.type}`,
      );
      output.done();
      return;
    }
    output.send({ [port]: message });
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Route();
}
