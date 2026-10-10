/**
 * @file Mesh plane: the Configure command as an assembly component (work
 * document #53 extraction 1). A thin adapter over the MeshSync method the
 * command table called — the logic stays in the mesh layer; the graph
 * carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's configure capability as an assembly component.
 */
export class Configure extends Component {
  constructor() {
    super({
      description: "Applies a mesh configuration to the MeshSync layer",
      icon: "cogs",
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
      const mesh = context.mesh;
      await mesh
        .handleConfigure(message.payload)
        .then(() => context.postMeshConfig())
        .catch((/** @type {any} */ err) =>
          console.error("Mesh configuration failed:", err),
        );
    } catch (err) {
      console.error("Mesh Configure failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Configure();
}
