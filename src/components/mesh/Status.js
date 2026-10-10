/**
 * @file Mesh plane: the Status command as an assembly component (work
 * document #53 extraction 1). A thin adapter over the MeshSync method the
 * command table called — the logic stays in the mesh layer; the graph
 * carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's status capability as an assembly component.
 */
export class Status extends Component {
  constructor() {
    super({
      description: "Re-reports the full mesh state to the Glass",
      icon: "info",
      inPorts: {
        message: { datatype: "object" },
        context: { datatype: "object", control: true },
      },
      outPorts: {
        error: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  async processMessage(input, output) {
    if (!input.hasData("context")) return;
    if (!input.has("message")) return;

    const message = input.getData("message");
    const context = input.getData("context");

    try {
      context.postMeshConfig();
    } catch (err) {
      console.error("Mesh Status failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Status();
}
