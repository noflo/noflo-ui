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
import { toHex } from "../../vendor/reticulum-core.js";
import { BIP39_WORDS } from "./bip39-words.js";

/**
 * Generates a one-time claim code as BIP39 words: 11 random bytes ->
 * 88 bits -> 8 dictionary words. Human-transcribable (unique four-letter
 * prefixes per word), and the text form round-trips through the claim
 * match without a machine-readable channel.
 *
 * @returns {string} The 8 words, space-separated.
 */
export function createClaimCode() {
  const bytes = new Uint8Array(11);
  globalThis.crypto.getRandomValues(bytes);
  return encodeWords(bytes);
}

/**
 * Encodes bytes as BIP39 words (11 bits per word, most-significant
 * first; the final partial chunk is zero-padded, mirroring the BIP39
 * convention).
 *
 * @param {Uint8Array} bytes
 * @returns {string} Space-separated words.
 */
export function encodeWords(bytes) {
  const wordCount = Math.ceil((bytes.length * 8) / 11);
  /** @type {number[]} */
  const indices = [];
  for (let i = 0; i < wordCount; i++) {
    let index = 0;
    for (let bit = 0; bit < 11; bit++) {
      const position = i * 11 + bit;
      const byte = Math.floor(position / 8);
      const bitInByte = 7 - (position % 8);
      if (byte < bytes.length && (bytes[byte] & (1 << bitInByte)) !== 0) {
        index |= 1 << (10 - bit);
      }
    }
    indices.push(index);
  }
  return indices.map((index) => BIP39_WORDS[index]).join(" ");
}

/**
 * Normalizes message text for the claim match: lowercase, punctuation
 * and whitespace collapsed to single spaces, so "legally, orbit zoo..."
 * and "legally orbit zoo" match alike.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeClaimText(text) {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z]+/g, " ")
    .trim();
}

/**
 * Builds the claim URI for the unclaimed Companion. Not machine-actionable
 * today (no LXMF client handles the scheme; a native app would register
 * it) — the machine-actionable artifact is the `lxma://` QR.
 *
 * @param {string} code - The one-time claim code.
 * @param {string} deliveryHash - The Companion's `lxmf.delivery` hash (hex).
 * @returns {string}
 */
export function claimUri(code, deliveryHash) {
  return `noflo://claim/${code.replaceAll(" ", "-")}?delivery=${deliveryHash}`;
}

/**
 * Builds the `lxma://` identity string LXMF clients ingest from a QR:
 * `lxma://<destination_hash_hex>:<public_key_hex>` (Columba
 * `IdentityQrCodeUtils` format; Sideband's manual entry accepts the same
 * parts). Scanning it adds the Companion as an addressable contact —
 * then the user sends the claim code to it.
 *
 * @param {string} deliveryHash - The Companion's `lxmf.delivery` hash (hex).
 * @param {Uint8Array} publicKey - The 64-byte Reticulum public key.
 * @returns {string}
 */
export function lxmaUri(deliveryHash, publicKey) {
  return `lxma://${deliveryHash}:${toHex(publicKey)}`;
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
  if (typeof text !== "string" || typeof code !== "string") return false;
  return normalizeClaimText(text).includes(normalizeClaimText(code));
}

/**
 * Renders the claim instructions for the console: the code, the URI, and
 * a scannable terminal QR. Returns the text; the caller prints it.
 *
 * @param {string} code
 * @param {string} deliveryHash
 * @param {string} identityHash - The Companion's LXMF identity hash (hex).
 * @param {Uint8Array} publicKey - The Companion's 64-byte Reticulum public key.
 * @returns {Promise<string>}
 */
export async function claimInstructions(
  code,
  deliveryHash,
  identityHash,
  publicKey,
) {
  const uri = claimUri(code, deliveryHash);
  const contact = lxmaUri(deliveryHash, publicKey);
  const qr = await QRCode.toString(contact, { type: "terminal", small: true });
  return [
    "",
    "This Companion is UNCLAIMED — no owner is configured.",
    "",
    "1. Scan the QR below with your LXMF client (or paste the lxma://",
    "   string / delivery hash as a contact):",
    "",
    `   ${contact}`,
    "",
    "2. Send it the claim code as a message:",
    "",
    `   ${code}`,
    "",
    "The first verified sender of the code becomes the owner.",
    "",
    `Claim URI (future native handler): ${uri}`,
    `Companion LXMF identity: ${identityHash}`,
    "",
    qr,
  ].join("\n");
}
