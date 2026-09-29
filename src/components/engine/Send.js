/**
 * @file Engine send component: delivers echo messages from the Engine back
 * to the Glass via an injected postMessage-style callback.
 */

import noflo from "../../../vendor/noflo.js";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

/** * @returns {any} */
export function getComponent() {
  const component = new NoFlo.Component();
  component.description = "Sends echo messages to the Glass";
  component.icon = "paper-plane";
  component.inPorts.add("in", { datatype: "all" });
  component.inPorts.add("callback", { datatype: "all", control: true });
  component.process((/** @type {any} */ input, /** @type {any} */ output) => {
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
