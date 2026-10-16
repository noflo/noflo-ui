/**
 * @file Mesh plane: the RuntimeDiscover command as an assembly component
 * (work document #59). A thin adapter over the runtime bridge's report —
 * the logic stays in the bridge; the graph carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's runtime-discovery capability as an assembly component.
 */
export class RuntimeDiscover extends Component {
  constructor() {
    super({
      description: "Re-reports the discovered FBP runtime population",
      icon: "satellite-dish",
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

    const context = input.getData("context");

    try {
      context.runtime.report();
    } catch (err) {
      console.error("RuntimeDiscover failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new RuntimeDiscover();
}
