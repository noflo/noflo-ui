/**
 * @file Engine route component for the mesh plane (work document #53
 * extraction 1): the MESH command dispatch as a graph node. The outports
 * mirror the contract registry's MESH commands; the contract tripwire
 * (work document #37) keeps them aligned. Unknown commands are refused
 * loudly instead of silently ignored.
 */

import { Component } from "../../../vendor/assembly.js";

import { MESH_COMMANDS } from "../../crdt/Protocol.js";

/** The route's outport per MESH command, keyed by the contract registry's
 * MESH command names: the outport IS the command name, so the graph and
 * the contract cannot drift apart silently (the tripwire, work document
 * #37). */
// NoFlo port names must be lowercase alphanumeric + underscores: the
// camelCase command maps to its lowercase port (work document #53)
const COMMAND_PORTS = Object.fromEntries(
  MESH_COMMANDS.map((command) => [command, command.toLowerCase()]),
);

/**
 * The mesh plane's route capability as an assembly component.
 */
export class MeshRoute extends Component {
  constructor() {
    super({
      description: "Routes a MESH command to its mesh-plane capability",
      icon: "random",
      inPorts: {
        in: { datatype: "object" },
      },
      outPorts: Object.fromEntries(
        Object.values(COMMAND_PORTS).map((port) => [
          port,
          { datatype: "object" },
        ]),
      ),
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.has("in")) return;
    const message = input.getData("in");
    const port = COMMAND_PORTS[message.command];
    if (!port) {
      console.warn(
        `Engine refused an unknown MESH command: ${message.command}`,
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
  return new MeshRoute();
}
