/**
 * @file Shared LXMF protocol helpers (work documents #42, #44 M2): the
 * pure, runtime-agnostic pieces both LXMF endpoints use — the webapp's
 * worker layer (`src/worker/Lxmf.js`) and the Companion's Node layer
 * (`src/node/lxmf.js`). No platform imports: everything here runs in the
 * browser worker and in Node.
 */

import { LXMFConstants } from "../../vendor/lxmf.js";
import {
  fromHex,
  toHex,
  UnknownIdentityError,
} from "../../vendor/reticulum-core.js";

/** How long a send may wait for a peer's announce before giving up. */
export const PEER_DISCOVERY_WAIT_MS = 30_000;

/** How long an inbound verification may wait for the sender's announce. */
export const SENDER_SOLICIT_WAIT_MS = 15_000;

/** Default chunking for outbound text (LXMF bodies are sized for mesh links). */
export const CHUNK_CHARS = 2500;

/** The propagation sync cadence (the pi-lxmf default): pulls messages that
 * arrived at the selected node while this endpoint was away. */
export const PROPAGATION_SYNC_INTERVAL_MS = 300_000;

/**
 * Derives a SINGLE destination hash for `aspect` (e.g. `lxmf.delivery`,
 * `lxmf.propagation`) from a Reticulum identity hash (hex). SINGLE-destination
 * hashes are `SHA256(nameHash || identityHash)[:16]` — a pure function of the
 * identity hash, so a peer's aspect addresses need no second registration and
 * no announce round-trip (work document #44 update #13): a peer whose identity
 * hash is known is addressable for every aspect it may run.
 *
 * @param {string} identityHashHex - 32-hex-char identity hash.
 * @param {string} [aspect] The destination aspect name.
 * @returns {Promise<string>} The 32-hex-char destination hash.
 */
export async function deriveAspectHash(
  identityHashHex,
  aspect = "lxmf.delivery",
) {
  const encoder = new TextEncoder();
  const nameHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(aspect),
  );
  const nameHash = new Uint8Array(nameHashBuffer.slice(0, 10));
  const identityHash = fromHex(identityHashHex);
  const combined = new Uint8Array(nameHash.length + identityHash.length);
  combined.set(nameHash, 0);
  combined.set(identityHash, nameHash.length);
  const destHashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return toHex(new Uint8Array(destHashBuffer.slice(0, 16)));
}

/**
 * Derives an `lxmf.delivery` destination hash from a Reticulum identity
 * hash (hex). See {@link deriveAspectHash}.
 *
 * @param {string} identityHashHex - 32-hex-char identity hash.
 * @returns {Promise<string>} The 32-hex-char `lxmf.delivery` hash.
 */
export async function deriveDeliveryHash(identityHashHex) {
  return deriveAspectHash(identityHashHex, "lxmf.delivery");
}

/**
 * Whether `e` is the typed unknown-identity failure the router throws when
 * a destination's identity is neither recallable nor solicitable.
 *
 * @param {unknown} e
 * @returns {boolean}
 */
export function isUnknownIdentityError(e) {
  return e instanceof UnknownIdentityError;
}

/**
 * Builds the fields map signaling the outbound content format
 * (FIELD_RENDERER): replies are Markdown, and clients such as Sideband
 * only render them as such when the field says so.
 *
 * @returns {Map<number, number>}
 */
export function contentFields() {
  const fields = new Map();
  fields.set(LXMFConstants.FIELD_RENDERER, LXMFConstants.RENDERER_MARKDOWN);
  return fields;
}

/**
 * Rebuilds the canonical LXMF wire form from a parsed `LXMessage`. Both
 * serialization paths retain everything needed on the instance:
 * `signedPart` = `[destHash || sourceHash || packedPayload] || messageId`,
 * and `signature` — so the direct-layout wire form
 * `[destHash][sourceHash][signature][payload]` reconstructs byte-for-byte
 * without re-signing (the message id is derivable; the stamp, when one
 * exists, is not part of the signed payload and is omitted — our sends
 * run unstamped).
 *
 * This is the at-rest form LXMF clients conventionally persist: the
 * message deserializes again with the recipient identity, signature
 * intact. Note the content inside `lxmf_data` is plaintext — LXMF
 * encrypts at the packet layer in transit; at-rest secrecy is the
 * store's envelope (work document #61's local history).
 *
 * @param {any} message A serialized (sent) or deserialized (received)
 *   LXMessage.
 * @returns {Uint8Array | null} The wire form, or null when the message
 *   carries no retained signature material (never serialized).
 */
export function wireForm(message) {
  const signedPart = message?.signedPart;
  const signature = message?.signature;
  if (
    !(signedPart instanceof Uint8Array) ||
    !(signature instanceof Uint8Array)
  ) {
    return null;
  }
  const HEADER_LENGTH = 32; // destHash(16) || sourceHash(16)
  const MESSAGE_ID_LENGTH = 32;
  const SIGNATURE_LENGTH = 64;
  if (signedPart.length <= HEADER_LENGTH + MESSAGE_ID_LENGTH) return null;
  const head = signedPart.subarray(0, HEADER_LENGTH);
  const payload = signedPart.subarray(
    HEADER_LENGTH,
    signedPart.length - MESSAGE_ID_LENGTH,
  );
  const wire = new Uint8Array(
    HEADER_LENGTH + SIGNATURE_LENGTH + payload.length,
  );
  wire.set(head, 0);
  wire.set(signature, HEADER_LENGTH);
  wire.set(payload, HEADER_LENGTH + SIGNATURE_LENGTH);
  return wire;
}

/**
 * Builds the fields Map carrying the avatar appearance (work document
 * #61, the signalk-reticulum pattern): `FIELD_ICON_APPEARANCE` with
 * `[icon(str), fg(bin 3), bg(bin 3)]` — the colors are msgpack `bin`, not
 * int arrays (Sideband reads them by index). The field travels inside
 * messages; the announce app_data cannot carry it.
 *
 * @param {{ icon: string, fg: number[], bg: number[] } | null} [appearance]
 * @returns {Map<number, any>} The fields map (empty when no appearance is
 *   configured — callers merge it into their own fields).
 */
/**
 * Reads one LXMF field from a message's fields — which the msgpack
 * decoder yields as a plain object with stringified integer keys on the
 * receive path, but which senders build as a `Map` with integer keys. A
 * numeric index reads both (JS coerces the number to the string key).
 *
 * @param {any} fields The message's fields (Map or decoded object).
 * @param {number} id The field id.
 * @returns {any} The field value, or undefined.
 */
export function readField(fields, id) {
  if (fields instanceof Map) return fields.get(id);
  return fields?.[id];
}

/**
 * Decodes an LXMF reaction (FIELD_REACTION): `target` is the message id
 * the reaction replies to, `emoji` the reaction body. Null when the
 * message carries no reaction.
 *
 * @param {any} message
 * @returns {{ target: string, emoji: string } | null}
 */
export function decodeReaction(message) {
  const field = readField(message?.fields, LXMFConstants.FIELD_REACTION);
  if (!field) return null;
  const target = field.get
    ? field.get(LXMFConstants.REACTION_TO)
    : field[LXMFConstants.REACTION_TO];
  const emoji = field.get
    ? field.get(LXMFConstants.REACTION_CONTENT)
    : field[LXMFConstants.REACTION_CONTENT];
  if (!(target instanceof Uint8Array) || !(emoji instanceof Uint8Array)) {
    return null;
  }
  return {
    target: toHex(target),
    emoji: new TextDecoder().decode(emoji),
  };
}

/**
 * Builds the fields Map carrying the avatar appearance (work document
 * #61, the signalk-reticulum pattern): `FIELD_ICON_APPEARANCE` with
 * `[icon(str), fg(bin 3), bg(bin 3)]` — the colors are msgpack `bin`, not
 * int arrays (Sideband reads them by index). The field travels inside
 * messages; the announce app_data cannot carry it.
 *
 * @param {{ icon: string, fg: number[], bg: number[] } | null} [appearance]
 * @returns {Map<number, any>} The fields map (empty when no appearance is
 *   configured — callers merge it into their own fields).
 */
export function appearanceFields(appearance) {
  const fields = new Map();
  if (!appearance?.icon) return fields;
  fields.set(LXMFConstants.FIELD_ICON_APPEARANCE, [
    appearance.icon,
    Uint8Array.from(appearance.fg),
    Uint8Array.from(appearance.bg),
  ]);
  return fields;
}

/**
 * Decodes the sender's avatar appearance from an inbound message's
 * `FIELD_ICON_APPEARANCE` field. See {@link appearanceFields}.
 *
 * @param {any} message
 * @returns {{ icon: string, fg: number[], bg: number[] } | null}
 */
export function decodeAppearance(message) {
  const field = readField(message?.fields, LXMFConstants.FIELD_ICON_APPEARANCE);
  if (!field || !Array.isArray(field) || field.length < 3) return null;
  const [icon, fg, bg] = field;
  if (
    typeof icon !== "string" ||
    !(fg instanceof Uint8Array) ||
    !(bg instanceof Uint8Array)
  ) {
    return null;
  }
  return { icon, fg: [...fg], bg: [...bg] };
}

/**
 * Splits `text` into chunks of at most `size` characters, breaking on
 * paragraph boundaries when possible.
 *
 * @param {string} text
 * @param {number} size
 * @returns {string[]}
 */
export function chunkText(text, size = CHUNK_CHARS) {
  if (text.length <= size) return [text];
  /** @type {string[]} */
  const chunks = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf("\n\n", size);
    if (cut < size * 0.5) cut = rest.lastIndexOf("\n", size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n+/, "");
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
}
