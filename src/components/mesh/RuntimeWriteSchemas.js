/**
 * @file Mesh plane: the RuntimeWriteSchemas command as an assembly
 * component (work document #57's write direction). A thin adapter over the
 * runtime bridge's `0x2a` schema write — the logic stays in the bridge;
 * the graph carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's schema-write capability as an assembly component.
 */
export class RuntimeWriteSchemas extends Component {
  constructor() {
    super({
      description: "Pushes schema bodies to a connected runtime",
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
      await context.runtime.writeSchemas(
        message.payload?.destinationHash,
        message.payload?.schemas ?? [],
      );
    } catch (err) {
      console.error("RuntimeWriteSchemas failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new RuntimeWriteSchemas();
}
