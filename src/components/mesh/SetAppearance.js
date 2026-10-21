/**
 * @file Mesh plane: the SetAppearance command as an assembly component
 * (work document #61): the device's avatar appearance — emoji + colors —
 * persisted device-locally and attached to every outbound LXMF message so
 * peers render the custom avatar. The editor UI lives in the Glass's
 * avatar editor; this is the thin adapter over the mesh layer's setter.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's appearance capability as an assembly component.
 */
export class SetAppearance extends Component {
  constructor() {
    super({
      description: "Sets the device's LXMF avatar appearance",
      icon: "user-pen",
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
    if (!input.hasData("message")) return;
    const message = input.getData("message");
    const context = input.getData("context");
    if (typeof context.setAppearance !== "function") {
      output.error(new Error("Mesh dispatch lost its appearance capability"));
      output.done();
      return;
    }
    try {
      await context.setAppearance(message.payload);
    } catch (err) {
      console.error("Mesh SetAppearance failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
    }
    output.done();
  }
}

export function getComponent() {
  return new SetAppearance();
}
