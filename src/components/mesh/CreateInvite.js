/**
 * @file Mesh plane: the CreateInvite command as an assembly component (work
 * document #53 extraction 1). A thin adapter over the MeshSync method the
 * command table called — the logic stays in the mesh layer; the graph
 * carries the composition.
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The mesh plane's createinvite capability as an assembly component.
 */
export class CreateInvite extends Component {
  constructor() {
    super({
      description: "Mints a bootstrap invite URI for the hosted project",
      icon: "qrcode",
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
    if (!input.has("message")) return;

    const message = input.getData("message");
    const context = input.getData("context");

    try {
      const { mesh, postMessage } = context;
      await mesh
        .createInvite()
        .then((/** @type {any} */ invite) => {
          if (!invite) {
            postMessage({
              kind: "mesh-status",
              error:
                "Invite unavailable: mesh must be connected and this device must own the project",
            });
            return;
          }
          postMessage({ kind: "mesh-invite", ...invite });
        })
        .catch((/** @type {any} */ err) =>
          console.error("Invite creation failed:", err),
        );
    } catch (err) {
      console.error("Mesh CreateInvite failed:", err);
      output.error(err instanceof Error ? err : new Error(String(err)));
      output.done();
    }
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new CreateInvite();
}
