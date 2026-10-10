/**
 * @file Engine lifecycle component: the LIFECYCLE pipeline's per-type
 * adapter (work document #53 extraction 1). A thin component over the
 * Engine core's lifecycle handler — the logic stays in the testable core
 * module; the graph carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

import { handleLifecycle } from "../../crdt/EngineCore.js";

/**
 * The engine's lifecycle capability as an assembly component (work
 * document #53): the per-command capability surface the runtime
 * connections will target with per-command Dacar relations (work
 * document #15).
 */
export class Lifecycle extends Component {
  constructor() {
    super({
      description: "Runs the Engine core's lifecycle handler",
      icon: "cogs",
      inPorts: {
        message: { datatype: "object" },
        state: { datatype: "object", control: true },
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
    if (!input.hasData("state")) return;
    if (!input.has("message")) return;

    const state = input.getData("state");
    const message = input.getData("message");

    try {
      const result = handleLifecycle(state, message);
      for (const echo of result.echoes) {
        output.send({ echo });
      }
      output.done();
    } catch (err) {
      console.error("Engine lifecycle failed for message", message, err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Lifecycle();
}
