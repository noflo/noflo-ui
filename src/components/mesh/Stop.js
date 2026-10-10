/**
 * @file Mesh plane: the Stop command as an assembly component (work
 * document #53 extraction 1). A thin adapter over the MeshSync method the
 * command table called — the logic stays in the mesh layer; the graph
 * carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's stop capability as an assembly component.
 */
export class Stop extends Component {
  constructor() {
    super({
      description: "Graceful mesh shutdown on page unload",
      icon: "stop",
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
      // Graceful mesh shutdown on page unload (work document #28 finding):
      // the peer cleans its room state immediately instead of waiting out
      // the Reticulum link timeout after this worker dies mid-session
      await context.mesh
        .stop()
        .catch((/** @type {any} */ err) =>
          console.error("Mesh stop failed:", err),
        );
    } catch (err) {
      console.error("Mesh Stop failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Stop();
}
