/**
 * @file Engine gateway component: validates the Appendix A IPC envelope and
 * routes valid messages onward for application against the CRDT.
 */

import noflo from "../../../vendor/noflo.js";

/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = /** @type {any} */ (noflo);

import { isUIWorkerMessage, UI_MESSAGES } from "../../crdt/Protocol.js";

/**
 * The contract registry's message keys as a set: the boundary refuses
 * anything outside it, so code and contract cannot drift apart silently
 * (work document #37).
 *
 * @type {Set<string>}
 */
const UI_KEYS = new Set(
  UI_MESSAGES.map((key) => `${key.type}/${key.command}`),
);

/** * @returns {any} */
export function getComponent() {
  const component = new NoFlo.Component();
  component.description =
    "Validates the Glass message envelope and routes it to the engine";
  component.icon = "filter";
  component.inPorts.add("in", { datatype: "object" });
  component.outPorts.add("engine", { datatype: "object" });
  component.outPorts.add("invalid", { datatype: "object" });
  component.process((/** @type {any} */ input, /** @type {any} */ output) => {
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
