/**
 * @file Chat pipeline (work document #53 extraction 3): the gate stage.
 * The trust-critical decision — unclaimed mode admits the first verified
 * sender of the claim code; claimed mode admits only the owner contact.
 * The decision is the pure `evaluateGate` module; this component adapts
 * it and carries the state transitions (the claim closes on win).
 */

import { Component } from "../../../vendor/assembly.js";

import { evaluateGate } from "../../node/chat-gate.js";

/**
 * The chat pipeline's gate capability as an assembly component.
 */
export class Gate extends Component {
  constructor() {
    super({
      description: "Gates inbound chat messages (claim/owner)",
      icon: "shield",
      inPorts: {
        verified: { datatype: "object" },
        gatestate: { datatype: "object", control: true },
      },
      outPorts: {
        admitted: { datatype: "object" },
        dropped: { datatype: "object" },
      },
    });
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  async processMessage(input, output) {
    if (!input.hasData("gatestate")) return;
    if (!input.has("verified")) return;

    const parsed = input.getData("verified");
    const state = input.getData("gatestate");
    const decision = evaluateGate({
      sourceHex: parsed.parsed.sourceHex,
      text: parsed.parsed.text,
      identityHash: parsed.identityHash ?? null,
      ownerContact: state.ownerContact ?? null,
      claim: state.claimOpen ? state.claim : null,
    });
    if (decision.verdict === "dropped") {
      output.send({ dropped: { parsed, reason: decision.reason } });
      output.done();
      return;
    }
    if (decision.admittedAs === "claim") {
      await state.onClaim(parsed.identityHash);
    }
    output.send({ admitted: parsed });
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Gate();
}
