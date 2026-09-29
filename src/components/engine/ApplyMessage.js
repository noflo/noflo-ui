/**
 * @file Engine apply component: runs one Glass message through the engine
 * core (validate + apply to the Y.Doc) and forwards the authoritative echo
 * messages.
 */

import noflo from "noflo";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

import { handleMessage } from "../../crdt/EngineCore.js";

/** * @returns {any} */
export function getComponent() {
  const component = new NoFlo.Component();
  component.description =
    "Applies a Glass message to the project Y.Doc and emits echo messages";
  component.icon = "cogs";
  component.inPorts.add("message", { datatype: "object" });
  component.inPorts.add("doc", { datatype: "object", control: true });
  component.inPorts.add("state", { datatype: "object", control: true });
  component.outPorts.add("echo", { datatype: "object" });
  component.process((/** @type {any} */ input, /** @type {any} */ output) => {
    if (!input.hasData("doc", "state")) return;
    if (!input.has("message")) return;

    const doc = input.getData("doc");
    const state = input.getData("state");
    const message = input.getData("message");

    const result = handleMessage(doc, state, message);
    for (const echo of result.echoes) {
      output.send({ echo });
    }
    output.done();
  });
  return component;
}
