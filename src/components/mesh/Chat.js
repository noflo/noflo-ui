/**
 * @file Mesh plane: the Chat command as an assembly component (work
 * document #47 item 3). A thin adapter — the actual routing happens in
 * the engine's message router, which intercepts the chat command before
 * the mesh graph dispatches it (the chat goes to the bridge, where the pi
 * manager lives). This component carries the contract's formality.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's chat capability as an assembly component.
 */
export class Chat extends Component {
  constructor() {
    super({
      description: "Sends a chat message to the Companion's agent",
      icon: "comment-dots",
      inPorts: {
        message: { datatype: "object" },
        context: { datatype: "object", control: true },
      },
      outPorts: {
        forwarded: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.hasData("message")) return;
    output.sendDone({ forwarded: input.getData("message") });
  }
}

export function getComponent() {
  return new Chat();
}
