/**
 * @file Chat pipeline (work document #53 extraction 3): the parse stage.
 * A thin adapter over the pure `parseChatMessage` — decodes the LXMF
 * payload and shapes the envelope the gate evaluates.
 */

import { Component } from "../../../vendor/assembly.js";

import { parseChatMessage } from "../../node/chat.js";

/**
 * The chat pipeline's parse capability as an assembly component.
 */
export class Parse extends Component {
  constructor() {
    super({
      description: "Decodes and parses an inbound LXMF chat message",
      icon: "inbox",
      inPorts: {
        message: { datatype: "object" },
      },
      outPorts: {
        parsed: { datatype: "object" },
        empty: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.has("message")) return;
    const message = input.getData("message");
    if (!message?.sourceHash) {
      output.send({ empty: {} });
      output.done();
      return;
    }
    const sourceHex = Array.from(message.sourceHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const text =
      typeof message.content === "string"
        ? message.content
        : new TextDecoder().decode(message.content ?? new Uint8Array());
    if (!text.trim()) {
      output.send({ empty: {} });
      output.done();
      return;
    }
    const parsed = parseChatMessage(sourceHex, text);
    output.send({
      parsed: {
        parsed,
        messageId: message.messageId ?? null,
        raw: message,
      },
    });
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Parse();
}
