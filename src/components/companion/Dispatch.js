/**
 * @file Chat pipeline (work document #53 extraction 3): the dispatch
 * stage. Commands route to their handlers; free text goes to the active
 * project's agent as a prompt.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The chat pipeline's dispatch capability as an assembly component. The
 * process is strictly sequential: prompts and commands keep order (the
 * chat surface's serialization guarantee).
 */
export class Dispatch extends Component {
  constructor() {
    super({
      description: "Dispatches admitted chat messages",
      icon: "share",
      inPorts: {
        admitted: { datatype: "object" },
        dispatchstate: { datatype: "object", control: true },
      },
      outPorts: {
        done: { datatype: "object" },
        dropped: { datatype: "object" },
      },
    });
    /** @type {Promise<void>} */
    this.chain = Promise.resolve();
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.hasData("dispatchstate")) return;
    if (!input.has("admitted")) return;

    const parsed = input.getData("admitted");
    const state = input.getData("dispatchstate");
    this.chain = this.chain
      .then(() => state.dispatch(parsed.parsed))
      .catch((/** @type {any} */ e) => {
        console.error(
          "companion: inbound handling failed:",
          e instanceof Error ? e.message : e,
        );
      });
    output.send({ done: { parsed } });
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Dispatch();
}
