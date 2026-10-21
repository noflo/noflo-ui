/**
 * @file The chat pipeline's pure gate decision (work document #53
 * extraction 3): extracted from the chat surface's closure so the graph
 * components and the spec share one testable module. The gate is the
 * trust-critical stage — every inbound LXMF message passes through it
 * before dispatch.
 */

import { messageClaims } from "./claim.js";

/**
 * The gate's verdict on one inbound message.
 *
 * @typedef {Object} GateDecision
 * @property {"admitted" | "dropped"} verdict
 * @property {string} [reason] The drop reason, narrated when dropped.
 * @property {"claim" | "owner" | "participant"} [admittedAs] Which gate
 *   path admitted the message (the claim path wins the Companion; the
 *   owner path is the steady state; the participant path admits granted
 *   project members — the webapp's chat among them).
 */

/**
 * Evaluates the gate for one inbound message.
 *
 * Order matters (work document #47's unclaimed-mode semantics): the
 * claim check runs on every verified sender while the claim is open —
 * the first verified sender of the code wins, and non-code messages are
 * dropped ("otherwise it is inert"). Once claimed, the steady state
 * admits the owner contact and — per work document #42's inbound policy
 * ("messages from granted project members trigger actions") — verified
 * senders holding a project grant. Every admitted sender is treated as
 * just another LXMF participant: the reply goes back to whoever wrote.
 *
 * @param {object} params
 * @param {string} params.sourceHex - Sender's `lxmf.delivery` hash (hex).
 * @param {string} params.text - The decoded message body.
 * @param {string | null} params.identityHash - The sender's Reticulum
 *   identity hash, when the transport recalled it.
 * @param {string | null} params.ownerContact - The claimed owner's
 *   `lxmf.delivery` hash (hex); null while unclaimed.
 * @param {{ code: string } | null} params.claim - The open claim (code);
 *   null once claimed.
 * @param {((identityHash: string) => boolean) | null} [params.isParticipant] -
 *   Whether the sender's identity hash holds a grant on a shared project
 *   (the bridge's grants map). Signature verification happened before the
 *   gate; this only decides admission.
 * @returns {GateDecision}
 */
export function evaluateGate({
  sourceHex,
  text,
  identityHash,
  ownerContact,
  claim,
  isParticipant = null,
}) {
  if (claim) {
    if (!messageClaims(text, claim.code)) {
      return {
        verdict: "dropped",
        reason: "unclaimed, not the claim code",
      };
    }
    if (!identityHash) {
      return {
        verdict: "dropped",
        reason: "claimant identity not recalled; claim not processed",
      };
    }
    return { verdict: "admitted", admittedAs: "claim" };
  }
  if (ownerContact && sourceHex === ownerContact.toLowerCase()) {
    return { verdict: "admitted", admittedAs: "owner" };
  }
  if (isParticipant && identityHash && isParticipant(identityHash)) {
    return { verdict: "admitted", admittedAs: "participant" };
  }
  return {
    verdict: "dropped",
    reason: ownerContact
      ? "not the owner or a project participant"
      : "no owner configured",
  };
}
