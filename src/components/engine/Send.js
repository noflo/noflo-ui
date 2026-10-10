/**
 * @file Engine send component: delivers echo messages from the Engine back
 * to the Glass via an injected postMessage-style callback.
 */

import { Component } from "@noflo/assembly";

/**
 * The engine's send capability as an assembly component (work document
 * #53): the multi-port `processMessage` hook over the same behavior.
 */
export class Send extends Component {
  constructor() {
    super({
      description: "Sends echo messages to the Glass",
      icon: "paper-plane",
      inPorts: {
        in: { datatype: "all" },
        callback: { datatype: "all", control: true },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.hasData("callback")) return;
    if (!input.has("in")) return;

    const callback = input.getData("callback");
    const echo = input.getData("in");
    if (typeof callback === "function") {
      callback(echo);
    }
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Send();
}
