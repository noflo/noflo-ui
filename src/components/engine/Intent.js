/**
 * @file Engine intent component: the INTENT pipeline's per-type adapter
 * (work document #53 extraction 1). A thin component over the Engine
 * core's intent dispatch — validate + apply to the Y.Doc + authoritative
 * echoes.
 */

import { Component } from "../../../vendor/assembly.js";

import { handleIntent } from "../../crdt/EngineCore.js";

/**
 * The engine's intent capability as an assembly component (work document
 * #53): the per-command surface the runtime connections will target with
 * per-command Dacar relations (work document #15).
 */
export class Intent extends Component {
  constructor() {
    super({
      description: "Applies a Glass intent to the project Y.Doc",
      icon: "cogs",
      inPorts: {
        message: { datatype: "object" },
        doc: { datatype: "object", control: true },
      },
      outPorts: {
        echo: { datatype: "object" },
        // The engine core is total over valid envelopes (the gateway
        // guarantees them), but a bug in the core must not kill the worker:
        // failures route to the error port (unconnected — logged and dropped)
        error: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.hasData("doc")) return;
    if (!input.has("message")) return;

    const doc = input.getData("doc");
    const message = input.getData("message");

    try {
      const result = handleIntent(doc, message);
      for (const echo of result.echoes) {
        output.send({ echo });
      }
      output.done();
    } catch (err) {
      console.error("Engine intent failed for message", message, err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Intent();
}
