/**
 * @file Engine apply component: runs one Glass message through the engine
 * core (validate + apply to the Y.Doc) and forwards the authoritative echo
 * messages.
 */

import { Component } from "../../../vendor/noflo.js";

import { handleMessage } from "../../crdt/EngineCore.js";

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const component = new Component({
    description:
      "Applies a Glass message to the project Y.Doc and emits echo messages",
    icon: "cogs",
    inPorts: {
      message: { datatype: "object" },
      doc: { datatype: "object", control: true },
      state: { datatype: "object", control: true },
    },
    outPorts: {
      echo: { datatype: "object" },
      // The engine core is total over valid envelopes (the gateway
      // guarantees them), but a bug in the core must not kill the worker:
      // failures route to the error port (unconnected — logged and dropped)
      error: { datatype: "object" },
    },
  });
  component.process((input, output) => {
    if (!input.hasData("doc", "state")) return;
    if (!input.has("message")) return;

    const doc = input.getData("doc");
    const state = input.getData("state");
    const message = input.getData("message");

    try {
      const result = handleMessage(doc, state, message);
      for (const echo of result.echoes) {
        output.send({ echo });
      }
      output.done();
    } catch (err) {
      console.error("Engine apply failed for message", message, err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  });
  return component;
}
