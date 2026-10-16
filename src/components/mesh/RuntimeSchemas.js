/**
 * @file Mesh plane: the RuntimeSchemas command as an assembly component
 * (work document #57). A thin adapter over the runtime bridge's schema
 * fetch — the logic stays in the bridge; the graph carries the
 * composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's schema-fetch capability as an assembly component.
 */
export class RuntimeSchemas extends Component {
  constructor() {
    super({
      description: "Fetches schema bodies from a connected runtime",
      icon: "download",
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
      await context.runtime.fetchSchemas(
        message.payload?.destinationHash,
        message.payload?.digests ?? [],
      );
    } catch (err) {
      console.error("RuntimeSchemas failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new RuntimeSchemas();
}
