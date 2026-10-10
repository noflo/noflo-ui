/**
 * @file Engine query component: the QUERY pipeline's per-type adapter
 * (work document #53 extraction 1). A thin component over the Engine
 * core's query handler — signature lookups and their responses flow as
 * echoes.
 */

import { Component } from "../../../vendor/assembly.js";

import { handleQuery } from "../../crdt/EngineCore.js";

/**
 * The engine's query capability as an assembly component (work document
 * #53).
 */
export class Query extends Component {
  constructor() {
    super({
      description: "Runs the Engine core's query handler",
      icon: "search",
      inPorts: {
        message: { datatype: "object" },
        doc: { datatype: "object", control: true },
      },
      outPorts: {
        echo: { datatype: "object" },
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
      const result = handleQuery(doc, message);
      for (const echo of result.echoes) {
        output.send({ echo });
      }
      output.done();
    } catch (err) {
      console.error("Engine query failed for message", message, err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Query();
}
