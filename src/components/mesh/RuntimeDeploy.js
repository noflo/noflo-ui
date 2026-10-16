/**
 * @file Mesh plane: the RuntimeDeploy command as an assembly component
 * (work document #59). A thin adapter over the runtime bridge's deploy —
 * the logic stays in the bridge; the graph carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's runtime-deploy capability as an assembly component.
 */
export class RuntimeDeploy extends Component {
  constructor() {
    super({
      description: "Deploys a project graph onto a connected runtime",
      icon: "upload",
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
      await context.runtime.deploy(
        message.payload?.destinationHash,
        message.payload?.graphId,
      );
    } catch (err) {
      console.error("RuntimeDeploy failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new RuntimeDeploy();
}
