/**
 * @file Mesh plane: the Chat command as an assembly component (work
 * documents #42 Phase A', #61). A thin adapter over the mesh layer's LXMF
 * send — the browser is an LXMF participant, so the message goes out as a
 * real LXMF message to the target's derived `lxmf.delivery` destination.
 * The outcome surfaces to the Glass through the layer's `chat-ack`.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's chat capability as an assembly component.
 */
export class Chat extends Component {
  constructor() {
    super({
      description: "Sends a chat message over LXMF",
      icon: "comment-dots",
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
    if (typeof context.chat !== "function") {
      output.error(new Error("Mesh dispatch lost its chat capability"));
      output.done();
      return;
    }
    try {
      await context.chat(message.payload);
    } catch (err) {
      console.error("Mesh Chat failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
    }
    output.done();
  }
}

export function getComponent() {
  return new Chat();
}
