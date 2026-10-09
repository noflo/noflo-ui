/**
 * @file Engine gateway component: validates the Appendix A IPC envelope and
 * routes valid messages onward for application against the CRDT.
 */

import { Component } from "../../../vendor/noflo.js";

import { isUIWorkerMessage, UI_MESSAGES } from "../../crdt/Protocol.js";

/**
 * The contract registry's message keys as a set: the boundary refuses
 * anything outside it, so code and contract cannot drift apart silently
 * (work document #37).
 *
 * @type {Set<string>}
 */
const UI_KEYS = new Set(UI_MESSAGES.map((key) => `${key.type}/${key.command}`));

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const component = new Component({
    description:
      "Validates the Glass message envelope and routes it to the engine",
    icon: "filter",
    inPorts: {
      in: { datatype: "object" },
    },
    outPorts: {
      // The error routing of this component is the `invalid` port: its whole
      // job is envelope validation, so malformed input is data on `invalid`,
      // not a failure (the port is left unconnected — malformed messages are
      // logged and dropped)
      engine: { datatype: "object" },
      invalid: { datatype: "object" },
    },
  });
  component.process((input, output) => {
    if (!input.has("in")) return;
    const message = input.getData("in");
    if (!isUIWorkerMessage(message)) {
      console.warn("Engine gateway dropped a malformed message", message);
      output.send({ invalid: message });
      output.done();
      return;
    }
    if (!UI_KEYS.has(`${message.type}/${message.command}`)) {
      console.warn(
        `Engine gateway dropped a message outside the IPC contract: ${message.type}/${message.command}`,
        message,
      );
      output.send({ invalid: message });
      output.done();
      return;
    }
    output.send({ engine: message });
    output.done();
  });
  return component;
}
