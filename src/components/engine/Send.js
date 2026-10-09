/**
 * @file Engine send component: delivers echo messages from the Engine back
 * to the Glass via an injected postMessage-style callback.
 */

import { Component } from "../../../vendor/noflo.js";

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const component = new Component({
    description: "Sends echo messages to the Glass",
    icon: "paper-plane",
    inPorts: {
      in: { datatype: "all" },
      callback: { datatype: "all", control: true },
    },
  });
  component.process((input, output) => {
    if (!input.hasData("callback")) return;
    if (!input.has("in")) return;

    const callback = input.getData("callback");
    const echo = input.getData("in");
    if (typeof callback === "function") {
      callback(echo);
    }
    output.done();
  });
  return component;
}
