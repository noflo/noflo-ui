/**
 * @file claim.js — the Companion's unclaimed-mode bootstrap (work
 * document #47 scope item 1, SPEC "Companion security model"): without a
 * configured owner the Companion outputs a claim code as a QR code and
 * URL, and the first Reticulum user to send the code becomes the owner.
 * While unclaimed, the Companion only serves noflo-ui files and expects
 * the LXMF claim message; otherwise it is inert.
 *
 * Design note: an LXMF paper message is encrypted to a *known* recipient
 * (`toPaperData` needs the destination's public key), which is
 * unknowable before anyone claims. The claim artifact therefore carries
 * the Companion's delivery destination hash and the one-time code as an
 * `noflo://claim` URI — the claimer addresses the Companion directly and
 * sends the code. Admission requires a *verified* sender signature, so
 * the claim binds to a real Reticulum identity, not a spoofer.
 */

import QRCode from "qrcode";

/**
 * Generates a one-time claim code: 16 random bytes as hex.
 *
 * @returns {string}
 */
export function createClaimCode() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Builds the claim URI for the unclaimed Companion.
 *
 * @param {string} code - The one-time claim code.
 * @param {string} deliveryHash - The Companion's `lxmf.delivery` hash (hex).
 * @returns {string}
 */
export function claimUri(code, deliveryHash) {
  return `noflo://claim/${code}?delivery=${deliveryHash}`;
}

/**
 * Whether an inbound message claims the Companion: the code appears in
 * the message text (the claimer may add words around it).
 *
 * @param {string} text
 * @param {string} code
 * @returns {boolean}
 */
export function messageClaims(text, code) {
  return typeof text === "string" && text.includes(code);
}

/**
 * Renders the claim instructions for the console: the code, the URI, and
 * a scannable terminal QR. Returns the text; the caller prints it.
 *
 * @param {string} code
 * @param {string} deliveryHash
 * @param {string} identityHash - The Companion's LXMF identity hash (hex).
 * @returns {Promise<string>}
 */
export async function claimInstructions(code, deliveryHash, identityHash) {
  const uri = claimUri(code, deliveryHash);
  const qr = await QRCode.toString(uri, { type: "terminal", small: true });
  return [
    "",
    "This Companion is UNCLAIMED — no owner is configured.",
    "",
    `Claim code: ${code}`,
    `Claim URI:  ${uri}`,
    "",
    "Send this code as an LXMF message to the delivery destination below;",
    "the first verified sender becomes the owner (global trust anchor).",
    "",
    `Companion LXMF delivery: ${deliveryHash}`,
    `Companion LXMF identity: ${identityHash}`,
    "",
    qr,
  ].join("\n");
}
