/**
 * @file Mesh plane: the RuntimeRun command as an assembly component (work
 * document #59). A thin adapter over the runtime bridge's run control —
 * the logic stays in the bridge; the graph carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's runtime run-control capability as an assembly component.
 */
export class RuntimeRun extends Component {
  constructor() {
    super({
      description: "Run control over a connected runtime's main plane",
      icon: "play",
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
      await context.runtime.run(
        message.payload?.destinationHash,
        message.payload?.action === "stop" ? "stop" : "start",
      );
    } catch (err) {
      console.error("RuntimeRun failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new RuntimeRun();
}
