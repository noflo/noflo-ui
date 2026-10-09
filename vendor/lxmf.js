var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@reticulum/lxmf/src/announce_data.js
import { MsgPack as MicroMsgPack } from "./reticulum-core.js";

// node_modules/@reticulum/lxmf/src/constants.js
var constants_exports = {};
__export(constants_exports, {
  ALL_MESSAGES: () => ALL_MESSAGES,
  AM_CODEC2_1200: () => AM_CODEC2_1200,
  AM_CODEC2_1300: () => AM_CODEC2_1300,
  AM_CODEC2_1400: () => AM_CODEC2_1400,
  AM_CODEC2_1600: () => AM_CODEC2_1600,
  AM_CODEC2_2400: () => AM_CODEC2_2400,
  AM_CODEC2_3200: () => AM_CODEC2_3200,
  AM_CODEC2_450: () => AM_CODEC2_450,
  AM_CODEC2_450PWB: () => AM_CODEC2_450PWB,
  AM_CODEC2_700C: () => AM_CODEC2_700C,
  AM_CUSTOM: () => AM_CUSTOM,
  AM_OPUS_BROADCAST: () => AM_OPUS_BROADCAST,
  AM_OPUS_HQ: () => AM_OPUS_HQ,
  AM_OPUS_LBW: () => AM_OPUS_LBW,
  AM_OPUS_LOSSLESS: () => AM_OPUS_LOSSLESS,
  AM_OPUS_MBW: () => AM_OPUS_MBW,
  AM_OPUS_OGG: () => AM_OPUS_OGG,
  AM_OPUS_PTT: () => AM_OPUS_PTT,
  AM_OPUS_RT_FDX: () => AM_OPUS_RT_FDX,
  AM_OPUS_RT_HDX: () => AM_OPUS_RT_HDX,
  AM_OPUS_STANDARD: () => AM_OPUS_STANDARD,
  APP_NAME: () => APP_NAME,
  COMMENT_FOR: () => COMMENT_FOR,
  CONTINUATION_OF: () => CONTINUATION_OF,
  DEFAULT_SYNC_STRATEGY: () => DEFAULT_SYNC_STRATEGY,
  DELIVERY_LIMIT: () => DELIVERY_LIMIT,
  DeliveryMethod: () => DeliveryMethod,
  FIELD_AUDIO: () => FIELD_AUDIO,
  FIELD_COMMANDS: () => FIELD_COMMANDS,
  FIELD_COMMENT: () => FIELD_COMMENT,
  FIELD_CONTINUATION: () => FIELD_CONTINUATION,
  FIELD_CUSTOM_DATA: () => FIELD_CUSTOM_DATA,
  FIELD_CUSTOM_META: () => FIELD_CUSTOM_META,
  FIELD_CUSTOM_TYPE: () => FIELD_CUSTOM_TYPE,
  FIELD_DEBUG: () => FIELD_DEBUG,
  FIELD_EMBEDDED_LXMS: () => FIELD_EMBEDDED_LXMS,
  FIELD_EVENT: () => FIELD_EVENT,
  FIELD_FILE_ATTACHMENTS: () => FIELD_FILE_ATTACHMENTS,
  FIELD_GROUP: () => FIELD_GROUP,
  FIELD_ICON_APPEARANCE: () => FIELD_ICON_APPEARANCE,
  FIELD_IMAGE: () => FIELD_IMAGE,
  FIELD_NON_SPECIFIC: () => FIELD_NON_SPECIFIC,
  FIELD_REACTION: () => FIELD_REACTION,
  FIELD_RENDERER: () => FIELD_RENDERER,
  FIELD_REPLY_QUOTE: () => FIELD_REPLY_QUOTE,
  FIELD_REPLY_TO: () => FIELD_REPLY_TO,
  FIELD_RESULTS: () => FIELD_RESULTS,
  FIELD_RNR_REFS: () => FIELD_RNR_REFS,
  FIELD_TELEMETRY: () => FIELD_TELEMETRY,
  FIELD_TELEMETRY_STREAM: () => FIELD_TELEMETRY_STREAM,
  FIELD_THREAD: () => FIELD_THREAD,
  FIELD_TICKET: () => FIELD_TICKET,
  LXMF_OVERHEAD: () => LXMF_OVERHEAD,
  MAX_PEERING_COST: () => MAX_PEERING_COST,
  MESSAGE_GET_PATH: () => MESSAGE_GET_PATH,
  OFFER_REQUEST_PATH: () => OFFER_REQUEST_PATH,
  PAPER_MDU: () => PAPER_MDU,
  PEERING_COST: () => PEERING_COST,
  PEER_ERROR_INVALID_DATA: () => PEER_ERROR_INVALID_DATA,
  PEER_ERROR_INVALID_KEY: () => PEER_ERROR_INVALID_KEY,
  PEER_ERROR_INVALID_STAMP: () => PEER_ERROR_INVALID_STAMP,
  PEER_ERROR_NO_ACCESS: () => PEER_ERROR_NO_ACCESS,
  PEER_ERROR_NO_IDENTITY: () => PEER_ERROR_NO_IDENTITY,
  PEER_ERROR_THROTTLED: () => PEER_ERROR_THROTTLED,
  PN_META_AUTH_BAND: () => PN_META_AUTH_BAND,
  PN_META_CUSTOM: () => PN_META_CUSTOM,
  PN_META_NAME: () => PN_META_NAME,
  PN_META_SYNC_STRATUM: () => PN_META_SYNC_STRATUM,
  PN_META_SYNC_THROTTLE: () => PN_META_SYNC_THROTTLE,
  PN_META_UTIL_PRESSURE: () => PN_META_UTIL_PRESSURE,
  PN_META_VERSION: () => PN_META_VERSION,
  PROPAGATION_COST: () => PROPAGATION_COST,
  PROPAGATION_COST_FLEX: () => PROPAGATION_COST_FLEX,
  PROPAGATION_COST_MIN: () => PROPAGATION_COST_MIN,
  PROPAGATION_LIMIT: () => PROPAGATION_LIMIT,
  QR_MAX_STORAGE: () => QR_MAX_STORAGE,
  REACTION_CONTENT: () => REACTION_CONTENT,
  REACTION_TO: () => REACTION_TO,
  RENDERER_BBCODE: () => RENDERER_BBCODE,
  RENDERER_MARKDOWN: () => RENDERER_MARKDOWN,
  RENDERER_MICRON: () => RENDERER_MICRON,
  RENDERER_PLAIN: () => RENDERER_PLAIN,
  SF_COMPRESSION: () => SF_COMPRESSION,
  STAMP_SIZE: () => STAMP_SIZE,
  SYNC_LIMIT: () => SYNC_LIMIT,
  SYNC_STRATEGY_LAZY: () => SYNC_STRATEGY_LAZY,
  SYNC_STRATEGY_PERSISTENT: () => SYNC_STRATEGY_PERSISTENT,
  TransferState: () => TransferState,
  URI_SCHEMA: () => URI_SCHEMA
});
var APP_NAME = "lxmf";
var DeliveryMethod = Object.freeze({
  OPPORTUNISTIC: 1,
  DIRECT: 2,
  PROPAGATED: 3,
  PAPER: 5
});
var URI_SCHEMA = "lxm";
var QR_MAX_STORAGE = 2953;
var URI_PREFIX_LEN = URI_SCHEMA.length + "://".length;
var PAPER_MDU = Math.floor(
  (QR_MAX_STORAGE - URI_PREFIX_LEN) * 6 / 8
);
var OFFER_REQUEST_PATH = "/offer";
var MESSAGE_GET_PATH = "/get";
var PROPAGATION_LIMIT = 256;
var SYNC_LIMIT = 10240;
var DELIVERY_LIMIT = 1e3;
var PROPAGATION_COST_MIN = 13;
var PROPAGATION_COST = 16;
var PROPAGATION_COST_FLEX = 3;
var PEERING_COST = 18;
var MAX_PEERING_COST = 26;
var SYNC_STRATEGY_LAZY = 1;
var SYNC_STRATEGY_PERSISTENT = 2;
var DEFAULT_SYNC_STRATEGY = SYNC_STRATEGY_PERSISTENT;
var PEER_ERROR_NO_IDENTITY = 240;
var PEER_ERROR_NO_ACCESS = 241;
var PEER_ERROR_INVALID_KEY = 243;
var PEER_ERROR_INVALID_DATA = 244;
var PEER_ERROR_INVALID_STAMP = 245;
var PEER_ERROR_THROTTLED = 246;
var TransferState = Object.freeze({
  IDLE: 0,
  PATH_REQUESTED: 1,
  LINK_ESTABLISHING: 2,
  LINK_ESTABLISHED: 3,
  REQUEST_SENT: 4,
  RECEIVING: 5,
  COMPLETE: 7,
  LINK_FAILED: 241
});
var ALL_MESSAGES = 0;
var LXMF_OVERHEAD = 112;
var STAMP_SIZE = 32;
var FIELD_EMBEDDED_LXMS = 1;
var FIELD_TELEMETRY = 2;
var FIELD_TELEMETRY_STREAM = 3;
var FIELD_ICON_APPEARANCE = 4;
var FIELD_FILE_ATTACHMENTS = 5;
var FIELD_IMAGE = 6;
var FIELD_AUDIO = 7;
var FIELD_THREAD = 8;
var FIELD_COMMANDS = 9;
var FIELD_RESULTS = 10;
var FIELD_GROUP = 11;
var FIELD_TICKET = 12;
var FIELD_EVENT = 13;
var FIELD_RNR_REFS = 14;
var FIELD_RENDERER = 15;
var FIELD_REPLY_TO = 48;
var FIELD_REPLY_QUOTE = 49;
var FIELD_REACTION = 64;
var FIELD_COMMENT = 65;
var FIELD_CONTINUATION = 66;
var FIELD_CUSTOM_TYPE = 251;
var FIELD_CUSTOM_DATA = 252;
var FIELD_CUSTOM_META = 253;
var FIELD_NON_SPECIFIC = 254;
var FIELD_DEBUG = 255;
var AM_CODEC2_450PWB = 1;
var AM_CODEC2_450 = 2;
var AM_CODEC2_700C = 3;
var AM_CODEC2_1200 = 4;
var AM_CODEC2_1300 = 5;
var AM_CODEC2_1400 = 6;
var AM_CODEC2_1600 = 7;
var AM_CODEC2_2400 = 8;
var AM_CODEC2_3200 = 9;
var AM_OPUS_OGG = 16;
var AM_OPUS_LBW = 17;
var AM_OPUS_MBW = 18;
var AM_OPUS_PTT = 19;
var AM_OPUS_RT_HDX = 20;
var AM_OPUS_RT_FDX = 21;
var AM_OPUS_STANDARD = 22;
var AM_OPUS_HQ = 23;
var AM_OPUS_BROADCAST = 24;
var AM_OPUS_LOSSLESS = 25;
var AM_CUSTOM = 255;
var RENDERER_PLAIN = 0;
var RENDERER_MICRON = 1;
var RENDERER_MARKDOWN = 2;
var RENDERER_BBCODE = 3;
var REACTION_TO = 0;
var REACTION_CONTENT = 1;
var COMMENT_FOR = 0;
var CONTINUATION_OF = 0;
var PN_META_VERSION = 0;
var PN_META_NAME = 1;
var PN_META_SYNC_STRATUM = 2;
var PN_META_SYNC_THROTTLE = 3;
var PN_META_AUTH_BAND = 4;
var PN_META_UTIL_PRESSURE = 5;
var PN_META_CUSTOM = 255;
var SF_COMPRESSION = 0;

// node_modules/@reticulum/lxmf/src/announce_data.js
function buildAnnounceAppData(displayName, stampCost = null, supportedFunctions = [SF_COMPRESSION]) {
  const nameBin = new TextEncoder().encode(displayName);
  return MicroMsgPack.encode([nameBin, stampCost, supportedFunctions]);
}
function parseAnnounceAppData(appData) {
  if (!appData || appData.length === 0) return null;
  let msgpackValue;
  let msgpackOk = true;
  try {
    msgpackValue = MicroMsgPack.decode(appData);
  } catch {
    msgpackOk = false;
  }
  if (msgpackOk) {
    const coerced = coerceAnnounceAppData(msgpackValue);
    if (coerced) return coerced;
  }
  try {
    return {
      displayName: new TextDecoder().decode(appData),
      stampCost: null,
      supportedFunctions: [SF_COMPRESSION]
    };
  } catch {
    return null;
  }
}
function coerceAnnounceAppData(decoded) {
  if (Array.isArray(decoded)) {
    const displayName = decodeName(decoded[0]);
    const stampCost = decodeStampCost(decoded[1]);
    const supportedFunctions = Array.isArray(decoded[2]) ? (
      /** @type {number[]} */
      decoded[2]
    ) : [SF_COMPRESSION];
    return { displayName, stampCost, supportedFunctions };
  }
  if (typeof decoded === "string") {
    return {
      displayName: decoded,
      stampCost: null,
      supportedFunctions: [SF_COMPRESSION]
    };
  }
  if (decoded instanceof Uint8Array) {
    return {
      displayName: new TextDecoder().decode(decoded),
      stampCost: null,
      supportedFunctions: [SF_COMPRESSION]
    };
  }
  return null;
}
function decodeName(value) {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return "";
}
function decodeStampCost(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return (
      /** @type {number} */
      value
    );
  }
  return null;
}
function buildPropagationNodeAppData({
  timebase,
  nodeState,
  perTransferLimitKb,
  perSyncLimitKb,
  stampCost,
  stampCostFlexibility,
  peeringCost,
  name = null
}) {
  const metadata = /* @__PURE__ */ new Map();
  if (name) {
    metadata.set(PN_META_NAME, new TextEncoder().encode(name));
  }
  return MicroMsgPack.encode([
    false,
    Math.trunc(timebase),
    !!nodeState,
    perTransferLimitKb,
    perSyncLimitKb,
    [stampCost, stampCostFlexibility, peeringCost],
    metadata
  ]);
}
function parsePropagationNodeAppData(bytes) {
  if (!bytes || bytes.length === 0) return null;
  let value;
  try {
    value = MicroMsgPack.decode(bytes);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length < 7) return null;
  const num = (v, d = 0) => typeof v === "number" ? v : d;
  const costs = Array.isArray(value[5]) ? value[5] : [];
  const metadata = value[6] && typeof value[6] === "object" ? value[6] : {};
  const nameVal = metadata[String(PN_META_NAME)];
  let name = null;
  if (typeof nameVal === "string") name = nameVal;
  else if (nameVal instanceof Uint8Array)
    name = new TextDecoder().decode(nameVal);
  return {
    timebase: num(value[1]),
    nodeState: !!value[2],
    perTransferLimitKb: num(value[3]),
    perSyncLimitKb: num(value[4]),
    stampCost: num(costs[0]),
    stampCostFlexibility: num(costs[1]),
    peeringCost: num(costs[2]),
    name
  };
}

// node_modules/@reticulum/lxmf/src/message.js
import {
  base64UrlToBytes,
  bytesToBase64Url,
  Identity,
  MsgPack as MicroMsgPack2
} from "./reticulum-core.js";
var DESTINATION_LENGTH = Identity.TRUNCATED_HASH_LENGTH;
var SIGNATURE_LENGTH = 64;
function packPayload(timestamp, title, content, fields, stamp) {
  const timestampBytes = MicroMsgPack2.encodeFloat64(timestamp);
  const toBin = (
    /** @param {string|Uint8Array} v */
    (v) => v instanceof Uint8Array ? MicroMsgPack2.encode(v) : MicroMsgPack2.encode(new Uint8Array(new TextEncoder().encode(v ?? "")))
  );
  const titleBytes = toBin(title);
  const contentBytes = toBin(content);
  const fieldsBytes = MicroMsgPack2.encode(fields ?? {});
  const elements = [timestampBytes, titleBytes, contentBytes, fieldsBytes];
  if (stamp != null) {
    elements.push(MicroMsgPack2.encode(stamp));
  }
  const nelem = elements.length;
  let header;
  if (nelem <= 15) {
    header = [144 | nelem];
  } else if (nelem <= 65535) {
    header = [220, nelem >> 8 & 255, nelem & 255];
  } else {
    header = [
      221,
      nelem >> 24 & 255,
      nelem >> 16 & 255,
      nelem >> 8 & 255,
      nelem & 255
    ];
  }
  let total = header.length;
  for (const e of elements) total += e.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const h of header) out[offset++] = h;
  for (const e of elements) {
    out.set(e, offset);
    offset += e.length;
  }
  return out;
}
async function fullHash(data) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    /** @type {any} */
    data
  );
  return new Uint8Array(digest);
}
var Message = class _Message {
  /**
   * Constructs an LXMF message.
   * @param {Object} options
   * @param {Uint8Array} options.sourceHash
   * @param {Uint8Array} options.destinationHash
   * @param {number} [options.timestamp]
   * @param {string} [options.title]
   * @param {string} [options.content]
   * @param {Record<string, any>|Map<string, any>} [options.fields]
   * @param {Uint8Array} [options.signature]
   * @param {Uint8Array} [options.signedPart]
   * @param {Uint8Array} [options.stamp] - Optional proof-of-work stamp (§5.7).
   * @param {Uint8Array} [options.messageId] - SHA-256 of the hashed part (§5.5).
   */
  constructor({
    sourceHash,
    destinationHash,
    timestamp,
    title,
    content,
    fields,
    signature,
    signedPart,
    stamp,
    messageId
  }) {
    this.sourceHash = sourceHash;
    this.destinationHash = destinationHash;
    this.timestamp = timestamp || Date.now() / 1e3;
    this.title = title;
    this.content = content;
    this.fields = fields || {};
    this.signature = signature;
    this.signedPart = signedPart;
    this.stamp = stamp ?? null;
    this.messageId = messageId ?? null;
    this._decodedPayload = null;
  }
  /**
   * Serializes the Message into the LXMF wire format.
   *
   * A `Message` instance guarantees a stable `timestamp` (fixed at instantiation)
   * and a deterministic `messageId` (computed as SHA-256 over destination, source,
   * and 4-element payload) across repeated `serialize()` calls and send retries.
   * Consumers re-sending the same message instance across delivery fallbacks
   * (DIRECT link -> opportunistic -> propagation) will always produce the identical
   * wire message ID, preserving recipient-side deduplication.
   *
   * If `this.stamp` is set (e.g. a proof-of-work stamp from the Stamper, or a
   * ticket-derived stamp), it is appended as the 5th payload element. The
   * signature and message_id are always computed over the 4-element payload
   * (§5.5), so adding or removing a stamp never invalidates the signature.
   *
   * @param {import("@reticulum/core").Identity} sourceIdentity
   * @returns {Promise<{messageId: Uint8Array, wireData: Uint8Array}>}
   */
  async serialize(sourceIdentity) {
    const sourceHash = this.sourceHash || sourceIdentity.identityHash;
    const packedPayload4 = packPayload(
      this.timestamp,
      this.title ?? "",
      this.content ?? "",
      this.fields,
      null
    );
    const hashedPart = new Uint8Array(
      DESTINATION_LENGTH + DESTINATION_LENGTH + packedPayload4.length
    );
    hashedPart.set(this.destinationHash, 0);
    hashedPart.set(sourceHash, DESTINATION_LENGTH);
    hashedPart.set(packedPayload4, 2 * DESTINATION_LENGTH);
    const messageId = await fullHash(hashedPart);
    const signedPart = new Uint8Array(hashedPart.length + messageId.length);
    signedPart.set(hashedPart, 0);
    signedPart.set(messageId, hashedPart.length);
    const signature = await sourceIdentity.sign(signedPart);
    const packedPayload = this.stamp != null ? packPayload(
      this.timestamp,
      this.title ?? "",
      this.content ?? "",
      this.fields,
      this.stamp
    ) : packedPayload4;
    const wireData = new Uint8Array(
      2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + packedPayload.length
    );
    wireData.set(this.destinationHash, 0);
    wireData.set(sourceHash, DESTINATION_LENGTH);
    wireData.set(signature, 2 * DESTINATION_LENGTH);
    wireData.set(packedPayload, 2 * DESTINATION_LENGTH + SIGNATURE_LENGTH);
    this.messageId = messageId;
    this.signature = signature;
    this.signedPart = signedPart;
    return { messageId, wireData };
  }
  /**
   * Creates a Message from wire data.
   *
   * Accepts both the direct layout (dest+source+signature+payload) and the
   * opportunistic layout (source+signature+payload, with the destination hash
   * supplied separately via `expectedDestinationHash`).
   *
   * If the payload carries an optional 5th stamp element (§5.7.1), it is
   * stripped and the first four elements are re-packed before the message_id
   * and signed_part are computed — exactly matching the Python reference's
   * unpack behaviour, so a stamp never invalidates the signature.
   *
   * @param {Uint8Array} wireData
   * @param {Uint8Array} [expectedDestinationHash] - Required for opportunistic delivery.
   * @returns {Promise<Message>}
   */
  static async deserialize(wireData, expectedDestinationHash) {
    let destinationHash;
    let sourceHash;
    let signature;
    let rawPayload;
    const isDirect = wireData.length >= 80 + DESTINATION_LENGTH && (!expectedDestinationHash || wireData.subarray(0, DESTINATION_LENGTH).every((v, i) => v === expectedDestinationHash[i]));
    if (isDirect) {
      destinationHash = wireData.slice(0, DESTINATION_LENGTH);
      sourceHash = wireData.slice(DESTINATION_LENGTH, 2 * DESTINATION_LENGTH);
      signature = wireData.slice(
        2 * DESTINATION_LENGTH,
        2 * DESTINATION_LENGTH + SIGNATURE_LENGTH
      );
      rawPayload = wireData.slice(2 * DESTINATION_LENGTH + SIGNATURE_LENGTH);
    } else if (wireData.length >= DESTINATION_LENGTH + SIGNATURE_LENGTH) {
      sourceHash = wireData.slice(0, DESTINATION_LENGTH);
      signature = wireData.slice(
        DESTINATION_LENGTH,
        DESTINATION_LENGTH + SIGNATURE_LENGTH
      );
      rawPayload = wireData.slice(DESTINATION_LENGTH + SIGNATURE_LENGTH);
      destinationHash = expectedDestinationHash;
    } else {
      throw new Error("LXMF message too short or format unrecognized");
    }
    if (!destinationHash) {
      throw new Error("Could not determine destination hash for LXMF message");
    }
    const decodedPayload = MicroMsgPack2.decode(rawPayload);
    if (!Array.isArray(decodedPayload) || decodedPayload.length < 4) {
      throw new Error(
        "Invalid LXMF payload format: Expected 4-element MessagePack array"
      );
    }
    let stamp = null;
    let packedPayload = rawPayload;
    if (decodedPayload.length > 4) {
      stamp = decodedPayload[4];
      packedPayload = packPayload(
        decodedPayload[0],
        decodedPayload[1],
        decodedPayload[2],
        decodedPayload[3],
        null
      );
    }
    const hashedPart = new Uint8Array(
      2 * DESTINATION_LENGTH + packedPayload.length
    );
    hashedPart.set(destinationHash, 0);
    hashedPart.set(sourceHash, DESTINATION_LENGTH);
    hashedPart.set(packedPayload, 2 * DESTINATION_LENGTH);
    const messageId = await fullHash(hashedPart);
    const signedPart = new Uint8Array(hashedPart.length + messageId.length);
    signedPart.set(hashedPart, 0);
    signedPart.set(messageId, hashedPart.length);
    const [timestamp, titleBytes, contentBytes, fields] = decodedPayload;
    const content = contentBytes instanceof Uint8Array ? new TextDecoder().decode(contentBytes) : contentBytes;
    const title = titleBytes instanceof Uint8Array ? new TextDecoder().decode(titleBytes) : titleBytes;
    const message = new _Message({
      sourceHash,
      destinationHash,
      timestamp,
      title,
      content,
      fields,
      signature,
      signedPart,
      stamp,
      messageId
    });
    message._decodedPayload = decodedPayload;
    return message;
  }
  /**
   * Verifies the message signature against a sender identity, tolerating
   * msgpack encoder variance per §5.6.
   *
   * Two candidate signed buffers are tried:
   *   1. `this.signedPart` — computed from the raw wire payload (unstamped) or
   *      the stamp-stripped re-pack (stamped).
   *   2. A freshly re-encoded 4-element payload, for messages that passed
   *      through a re-encoding relay whose bytes diverge from the signer's.
   *
   * @param {Identity} identity - The sender's identity.
   * @returns {Promise<boolean>}
   */
  async verifySignature(identity) {
    if (!this.signature || !this.signedPart) return false;
    if (await identity.validate(this.signature, this.signedPart)) {
      return true;
    }
    if (this._decodedPayload) {
      const repacked = packPayload(
        this._decodedPayload[0],
        this._decodedPayload[1],
        this._decodedPayload[2],
        this._decodedPayload[3],
        null
      );
      if (!this.destinationHash || !this.sourceHash) return false;
      const hashedPart = new Uint8Array(
        2 * DESTINATION_LENGTH + repacked.length
      );
      hashedPart.set(this.destinationHash, 0);
      hashedPart.set(this.sourceHash, DESTINATION_LENGTH);
      hashedPart.set(repacked, 2 * DESTINATION_LENGTH);
      const messageId = await fullHash(hashedPart);
      const signedPart2 = new Uint8Array(hashedPart.length + messageId.length);
      signedPart2.set(hashedPart, 0);
      signedPart2.set(messageId, hashedPart.length);
      if (await identity.validate(this.signature, signedPart2)) {
        return true;
      }
    }
    return false;
  }
  // ------------------------------------------------------------------
  // Propagation form (§5.3)
  // ------------------------------------------------------------------
  /**
   * Packs this message into the propagation ("lxmf_data") form used when
   * submitting to a propagation node or syncing between nodes (§5.3):
   *
   *   lxmf_data = destination_hash(16)
   *             || E_outbound(source_hash(16) || signature(64) || payload)
   *
   * Only the leading destination hash is in cleartext (so the node can route
   * by recipient and compute the dedup key); the body is encrypted to the
   * recipient (using their recalled ratchet when one is known, §7.4). The
   * `transientId` is SHA-256 over the whole `lxmf_data` and is the store/
   * dedup key (LXMRouter.lxmf_propagation).
   *
   * Serializes first if needed.
   *
   * @param {import("@reticulum/core").Identity} sourceIdentity
   * @param {import("@reticulum/core").Destination} outboundDestination
   *   recipient `lxmf.delivery` destination (Direction.OUT; holds the
   *   recipient public key + recalled ratchet). Must share this message's
   *   `destinationHash`.
   * @returns {Promise<{lxmfData: Uint8Array, transientId: Uint8Array, wireData: Uint8Array}>}
   */
  async toPropagationData(sourceIdentity, outboundDestination) {
    const { wireData } = await this.serialize(sourceIdentity);
    const encrypted = await outboundDestination.encrypt(
      wireData.subarray(DESTINATION_LENGTH)
    );
    const lxmfData = new Uint8Array(DESTINATION_LENGTH + encrypted.length);
    lxmfData.set(wireData.subarray(0, DESTINATION_LENGTH), 0);
    lxmfData.set(encrypted, DESTINATION_LENGTH);
    const transientId = await _Message.transientIdFromPropagationData(lxmfData);
    return { lxmfData, transientId, wireData };
  }
  /**
   * Computes the propagation dedup key `transient_id = SHA-256(lxmf_data)`
   * (LXMRouter.lxmf_propagation). Identical on both client and node.
   *
   * @param {Uint8Array} lxmfData
   * @returns {Promise<Uint8Array>}
   */
  static async transientIdFromPropagationData(lxmfData) {
    return await fullHash(lxmfData);
  }
  /**
   * Decrypts and reconstructs an LXMF message from its propagation
   * ("lxmf_data") form (§5.3). The destination hash is taken from the leading
   * 16 bytes; the remainder is decrypted with the recipient's inbound
   * `lxmf.delivery` destination (long-term key + owned ratchet ring, §7.4).
   *
   * @param {Uint8Array} lxmfData
   * @param {import("@reticulum/core").Destination} deliveryDestination
   *   recipient's inbound `lxmf.delivery` destination.
   * @returns {Promise<Message|null>} `null` when decryption fails (wrong
   *   recipient / unknown ratchet) or the input is too short.
   */
  static async fromPropagationData(lxmfData, deliveryDestination) {
    if (!lxmfData || lxmfData.length < DESTINATION_LENGTH) return null;
    const destinationHash = lxmfData.subarray(0, DESTINATION_LENGTH);
    const encrypted = lxmfData.subarray(DESTINATION_LENGTH);
    const decrypted = await deliveryDestination.decrypt(encrypted);
    if (!decrypted) return null;
    const wireData = new Uint8Array(DESTINATION_LENGTH + decrypted.length);
    wireData.set(destinationHash, 0);
    wireData.set(decrypted, DESTINATION_LENGTH);
    return await _Message.deserialize(wireData, destinationHash);
  }
  // ------------------------------------------------------------------
  // Paper message form (§5.4 / LXMessage.py PAPER branch)
  //
  // A paper message is byte-identical to the propagation `lxmf_data` form
  // (`destination_hash(16) || E_outbound(source_hash(16) || signature(64) ||
  // payload)`), but it is carried out-of-band — printed, photographed as a QR
  // code, or shared as an `lxm://` URI — instead of over the network. The
  // receiver ingests it through the same decrypt-and-unpack path as a
  // propagated message, with stamp enforcement disabled.
  // ------------------------------------------------------------------
  /**
   * Serializes and encrypts the message into the paper delivery form, ready to
   * be encoded as an `lxm://` URI or QR code (`LXMessage.pack()` PAPER branch).
   *
   * The encrypted paper payload must fit within {@link PAPER_MDU} bytes (the
   * QR-code capacity); a `TypeError` is thrown otherwise, mirroring the
   * Python reference.
   *
   * @param {import("@reticulum/core").Identity} sourceIdentity
   * @param {import("@reticulum/core").Destination} outboundDestination
   *   recipient `lxmf.delivery` destination (Direction.OUT; holds the
   *   recipient public key + recalled ratchet).
   * @returns {Promise<{paperData: Uint8Array, transientId: Uint8Array, wireData: Uint8Array}>}
   * @throws {TypeError} when the encrypted paper payload exceeds `PAPER_MDU`.
   */
  async toPaperData(sourceIdentity, outboundDestination) {
    const { lxmfData, transientId, wireData } = await this.toPropagationData(
      sourceIdentity,
      outboundDestination
    );
    if (lxmfData.length > PAPER_MDU) {
      throw new TypeError(
        `LXMF paper delivery requested, but content of ${lxmfData.length} bytes exceeds the paper message maximum of ${PAPER_MDU} bytes.`
      );
    }
    return { paperData: lxmfData, transientId, wireData };
  }
  /**
   * Serializes, encrypts, and encodes the message as an `lxm://` URI
   * (`LXMessage.as_uri`): the URL-safe base64 of the paper payload, padding
   * stripped, prefixed with the `lxm` scheme.
   *
   * @param {import("@reticulum/core").Identity} sourceIdentity
   * @param {import("@reticulum/core").Destination} outboundDestination
   * @returns {Promise<string>}
   */
  async toPaperUri(sourceIdentity, outboundDestination) {
    const { paperData } = await this.toPaperData(
      sourceIdentity,
      outboundDestination
    );
    return _Message.paperDataToUri(paperData);
  }
  /**
   * Formats raw paper data as an `lxm://` URI.
   *
   * @param {Uint8Array} paperData
   * @returns {string}
   */
  static paperDataToUri(paperData) {
    return `${URI_SCHEMA}://${bytesToBase64Url(paperData)}`;
  }
  /**
   * Parses an `lxm://` URI back into the raw encrypted paper data.
   * The scheme match is case-insensitive and
   * any stray `/` characters in the body are tolerated, matching the Python
   * reference's lenient decoding.
   *
   * @param {string} uri
   * @returns {Uint8Array}
   * @throws {Error} when the URI does not use the `lxm` scheme.
   */
  static paperDataFromUri(uri) {
    if (typeof uri !== "string") {
      throw new TypeError("paperDataFromUri expects a string URI");
    }
    const prefix = `${URI_SCHEMA}://`;
    if (!uri.toLowerCase().startsWith(prefix)) {
      throw new Error(
        `Not an LXMF paper URI: expected the '${prefix}' scheme prefix`
      );
    }
    return base64UrlToBytes(uri.slice(prefix.length).replace(/\//g, ""));
  }
  /**
   * Decrypts and reconstructs an LXMF message from raw paper data. The paper
   * form is byte-identical to the propagation `lxmf_data` form, so this
   * delegates to {@link Message.fromPropagationData}
   * (`LXMRouter.lxmf_propagation` with `is_paper_message=True`).
   *
   * @param {Uint8Array} paperData
   * @param {import("@reticulum/core").Destination} deliveryDestination
   *   recipient's inbound `lxmf.delivery` destination.
   * @returns {Promise<Message|null>} `null` when decryption fails (wrong
   *   recipient / unknown ratchet) or the input is too short.
   */
  static async fromPaperData(paperData, deliveryDestination) {
    return await _Message.fromPropagationData(paperData, deliveryDestination);
  }
  /**
   * Decrypts and reconstructs an LXMF message from an `lxm://` URI — the
   * inverse of {@link Message.toPaperUri}
   * (`LXMRouter.ingest_lxm_uri` + `lxmf_propagation`).
   *
   * @param {string} uri
   * @param {import("@reticulum/core").Destination} deliveryDestination
   * @returns {Promise<Message|null>}
   */
  static async fromPaperUri(uri, deliveryDestination) {
    return await _Message.fromPaperData(
      _Message.paperDataFromUri(uri),
      deliveryDestination
    );
  }
};

// node_modules/@reticulum/lxmf/src/message_store.js
import { toHex } from "./reticulum-core.js";
var AGE_WEIGHT_UNIT = 60 * 60 * 24 * 4;
var DEFAULT_MESSAGE_TTL_SECS = null;
function weightOf(entry) {
  const ageWeight = Math.max(
    1,
    (Date.now() / 1e3 - entry.received) / AGE_WEIGHT_UNIT
  );
  return ageWeight * entry.size;
}
var MessageStore = class {
  /**
   * @param {MessageStoreOptions} [options]
   */
  constructor({ storageLimitBytes = null, messageTtlSecs = null } = {}) {
    this._entries = /* @__PURE__ */ new Map();
    this.storageLimitBytes = storageLimitBytes;
    this.messageTtlSecs = messageTtlSecs ?? DEFAULT_MESSAGE_TTL_SECS;
    this._totalBytes = 0;
  }
  /** @returns {number} number of stored messages. */
  get size() {
    return this._entries.size;
  }
  /** @returns {number} total stored bytes. */
  get totalBytes() {
    return this._totalBytes;
  }
  /**
   * @param {Uint8Array} transientId
   * @returns {boolean}
   */
  has(transientId) {
    return this._entries.has(toHex(transientId));
  }
  /**
   * @param {Uint8Array} transientId
   * @returns {PropagationEntry|null}
   */
  get(transientId) {
    return this._entries.get(toHex(transientId)) ?? null;
  }
  /**
   * Adds an entry; no-op (returns false) if the transient_id is already known.
   *
   * @param {PropagationEntry} entry
   * @returns {boolean} true if inserted, false on duplicate.
   */
  add(entry) {
    const key = toHex(entry.transientId);
    if (this._entries.has(key)) return false;
    entry.handledPeers ??= /* @__PURE__ */ new Set();
    entry.unhandledPeers ??= /* @__PURE__ */ new Set();
    this._entries.set(key, entry);
    this._totalBytes += entry.size;
    this._enforceCapacity();
    return true;
  }
  /**
   * Removes an entry unconditionally.
   *
   * @param {Uint8Array} transientId
   * @returns {boolean} true if an entry was removed.
   */
  remove(transientId) {
    const key = toHex(transientId);
    const entry = this._entries.get(key);
    if (!entry) return false;
    this._entries.delete(key);
    this._totalBytes -= entry.size;
    return true;
  }
  /**
   * Removes an entry only if it is owned by `ownerHash` (a client may only
   * purge messages addressed to itself).
   *
   * @param {Uint8Array} transientId
   * @param {Uint8Array} ownerHash
   * @returns {boolean}
   */
  removeForDestination(transientId, ownerHash) {
    const entry = this.get(transientId);
    if (!entry) return false;
    if (toHex(entry.destinationHash) !== toHex(ownerHash)) return false;
    return this.remove(transientId);
  }
  /**
   * Evicts the highest-weight entries until `totalBytes ≤ storageLimitBytes`
   * (weight descending, matching the Python reference). No-op when no cap.
   * @private
   */
  _enforceCapacity() {
    if (this.storageLimitBytes == null) return;
    if (this._totalBytes <= this.storageLimitBytes) return;
    const ranked = [];
    for (const [key, entry] of this._entries) {
      ranked.push({ key, entry, weight: weightOf(entry) });
    }
    ranked.sort((a, b) => b.weight - a.weight);
    for (const { key, entry } of ranked) {
      if (this._totalBytes <= this.storageLimitBytes) break;
      this._entries.delete(key);
      this._totalBytes -= entry.size;
    }
  }
  /**
   * Periodic maintenance — prunes entries older than `messageTtlSecs` (when set)
   * and re-runs capacity enforcement. A runner calls this hourly (the Python
   * reference runs the same cull from its job loop).
   *
   * @returns {{ aged: number }} counts of pruned entries.
   */
  prune() {
    let aged = 0;
    if (this.messageTtlSecs != null) {
      const cutoff = Date.now() / 1e3 - this.messageTtlSecs;
      for (const [key, entry] of this._entries) {
        if (entry.received < cutoff) {
          this._entries.delete(key);
          this._totalBytes -= entry.size;
          aged++;
        }
      }
    }
    this._enforceCapacity();
    return { aged };
  }
  /**
   * Lists transient_ids addressed to `destinationHash`, sorted by stored size
   * ascending (matches `message_get_request`'s size-ascending list order).
   *
   * @param {Uint8Array} destinationHash
   * @returns {Uint8Array[]}
   */
  transientIdsForDestination(destinationHash) {
    const hex = toHex(destinationHash);
    const matching = [];
    for (const e of this._entries.values()) {
      if (toHex(e.destinationHash) === hex) matching.push(e);
    }
    matching.sort((a, b) => a.size - b.size);
    return matching.map((e) => e.transientId);
  }
  /**
   * Returns the base `lxmf_data` (stamp stripped) for serving, but only if the
   * entry exists and is owned by `ownerHash`.
   *
   * @param {Uint8Array} transientId
   * @param {Uint8Array} ownerHash
   * @returns {Uint8Array|null}
   */
  serveDataForDestination(transientId, ownerHash) {
    const entry = this.get(transientId);
    if (!entry) return null;
    if (toHex(entry.destinationHash) !== toHex(ownerHash)) return null;
    return entry.lxmfData;
  }
  /**
   * Marks a message as still needed by `peerHash` (unhandled for that peer).
   * Used when a new message is ingested and must be distributed to peers.
   *
   * @param {Uint8Array} transientId
   * @param {Uint8Array} peerHash
   * @returns {boolean}
   */
  markUnhandledForPeer(transientId, peerHash) {
    const entry = this.get(transientId);
    if (!entry) return false;
    const hex = toHex(peerHash);
    entry.unhandledPeers.add(hex);
    entry.handledPeers.delete(hex);
    return true;
  }
  /**
   * Marks a message as already held by `peerHash` (handled), removing it from
   * the peer's unhandled set (`LXMPeer.add_handled_message`).
   *
   * @param {Uint8Array} transientId
   * @param {Uint8Array} peerHash
   * @returns {boolean}
   */
  markHandledForPeer(transientId, peerHash) {
    const entry = this.get(transientId);
    if (!entry) return false;
    const hex = toHex(peerHash);
    entry.handledPeers.add(hex);
    entry.unhandledPeers.delete(hex);
    return true;
  }
  /**
   * Marks every stored message as still needed by `peerHash` (unhandled for
   * that peer). Used as a retroactive catch-up when a peering relationship is
   * established with a node that may not hold our existing backlog: over-
   * offering is safe because the peer only requests the subset it lacks via
   * `/offer` (`LXMRouter.peer` has no backlog enqueue, but restarted Python
   * nodes likewise re-converge from their persisted per-peer sync state).
   *
   * @param {Uint8Array} peerHash
   * @returns {number} number of entries marked unhandled.
   */
  markAllUnhandledForPeer(peerHash) {
    const hex = toHex(peerHash);
    let count = 0;
    for (const e of this._entries.values()) {
      if (!e.unhandledPeers.has(hex)) {
        e.unhandledPeers.add(hex);
        e.handledPeers.delete(hex);
        count++;
      }
    }
    return count;
  }
  /**
   * Lists the unhandled messages for a peer, as
   * `{ transientId, weight, size, entry }` sorted by weight ascending
   * (`LXMPeer.sync` offer ordering). Entries whose stamp value is below
   * `minAcceptedCost` are excluded.
   *
   * @param {Uint8Array} peerHash
   * @param {number} [minAcceptedCost]
   * @returns {{transientId: Uint8Array, weight: number, size: number, entry: PropagationEntry}[]}
   */
  unhandledEntriesForPeer(peerHash, minAcceptedCost = 0) {
    const hex = toHex(peerHash);
    const out = [];
    for (const e of this._entries.values()) {
      if (!e.unhandledPeers.has(hex)) continue;
      if (e.stampValue < minAcceptedCost) continue;
      out.push({
        transientId: e.transientId,
        weight: weightOf(e),
        size: e.size,
        entry: e
      });
    }
    out.sort((a, b) => a.weight - b.weight);
    return out;
  }
  /**
   * Exports all entries as serializable records (Sets → arrays) for the
   * `@reticulum/node` FS adapter. The hex-keyed Sets are kept as arrays so the
   * payload round-trips through msgpack cleanly.
   *
   * @returns {Array<{ transientId: Uint8Array, destinationHash: Uint8Array, lxmfData: Uint8Array, stampData: Uint8Array, received: number, stampValue: number, size: number, handledPeers: string[], unhandledPeers: string[] }>}
   */
  exportRecords() {
    const out = [];
    for (const e of this._entries.values()) {
      out.push({
        transientId: new Uint8Array(e.transientId),
        destinationHash: new Uint8Array(e.destinationHash),
        lxmfData: new Uint8Array(e.lxmfData),
        stampData: new Uint8Array(e.stampData),
        received: e.received,
        stampValue: e.stampValue,
        size: e.size,
        handledPeers: Array.from(e.handledPeers),
        unhandledPeers: Array.from(e.unhandledPeers)
      });
    }
    return out;
  }
  /**
   * Replaces the store with the given records (arrays → Sets). Used on load.
   * Re-computes `totalBytes`. Does NOT re-run capacity eviction (the caller
   * should call {@link prune} afterwards if limits may have changed).
   *
   * @param {Array<{ transientId: Uint8Array, destinationHash: Uint8Array, lxmfData: Uint8Array, stampData: Uint8Array, received: number, stampValue: number, size: number, handledPeers: string[], unhandledPeers: string[] }>} records
   */
  importRecords(records) {
    this._entries.clear();
    this._totalBytes = 0;
    for (const r of records) {
      const entry = {
        transientId: new Uint8Array(r.transientId),
        destinationHash: new Uint8Array(r.destinationHash),
        lxmfData: new Uint8Array(r.lxmfData),
        stampData: new Uint8Array(r.stampData),
        received: r.received,
        stampValue: r.stampValue,
        size: r.size,
        handledPeers: new Set(r.handledPeers ?? []),
        unhandledPeers: new Set(r.unhandledPeers ?? [])
      };
      this._entries.set(toHex(entry.transientId), entry);
      this._totalBytes += entry.size;
    }
  }
};

// node_modules/@reticulum/lxmf/src/peer.js
import {
  Destination,
  DestType,
  LogLevel,
  log,
  Resource,
  toHex as toHex2
} from "./reticulum-core.js";

// node_modules/@reticulum/lxmf/src/propagation.js
import { MsgPack as MicroMsgPack3 } from "./reticulum-core.js";
function packPropagationContainer(lxmfDataList, sendTime = Date.now() / 1e3) {
  return MicroMsgPack3.encode([sendTime, lxmfDataList]);
}
function unpackPropagationContainer(bytes) {
  let value;
  try {
    value = MicroMsgPack3.decode(bytes);
  } catch {
    return null;
  }
  if (!Array.isArray(value) || value.length < 2) return null;
  const sendTime = typeof value[0] === "number" ? value[0] : 0;
  const messages = Array.isArray(value[1]) ? value[1] : [];
  return { sendTime, messages };
}

// node_modules/@reticulum/lxmf/src/stamper.js
var stamper_exports = {};
__export(stamper_exports, {
  STAMP_SIZE: () => STAMP_SIZE3,
  WORKBLOCK_EXPAND_ROUNDS: () => WORKBLOCK_EXPAND_ROUNDS,
  WORKBLOCK_EXPAND_ROUNDS_PEERING: () => WORKBLOCK_EXPAND_ROUNDS_PEERING2,
  WORKBLOCK_EXPAND_ROUNDS_PN: () => WORKBLOCK_EXPAND_ROUNDS_PN2,
  generateStamp: () => generateStamp,
  stampValid: () => stampValid2,
  stampValue: () => stampValue2,
  stampWorkblock: () => stampWorkblock2,
  validatePeeringKey: () => validatePeeringKey,
  validatePnStamp: () => validatePnStamp,
  validatePnStamps: () => validatePnStamps
});
import {
  fullHash as fullHash2,
  STAMP_SIZE as STAMP_SIZE2,
  stampValid,
  stampValue,
  stampWorkblock,
  WORKBLOCK_EXPAND_ROUNDS_PEERING,
  WORKBLOCK_EXPAND_ROUNDS_PN
} from "./reticulum-core.js";
import {
  generateStamp,
  STAMP_SIZE as STAMP_SIZE3,
  stampValid as stampValid2,
  stampValue as stampValue2,
  stampWorkblock as stampWorkblock2,
  WORKBLOCK_EXPAND_ROUNDS,
  WORKBLOCK_EXPAND_ROUNDS_PEERING as WORKBLOCK_EXPAND_ROUNDS_PEERING2,
  WORKBLOCK_EXPAND_ROUNDS_PN as WORKBLOCK_EXPAND_ROUNDS_PN2
} from "./reticulum-core.js";
async function validatePeeringKey(peeringId, peeringKey, targetCost) {
  const workblock = await stampWorkblock(
    peeringId,
    WORKBLOCK_EXPAND_ROUNDS_PEERING
  );
  return stampValid(peeringKey, targetCost, workblock);
}
async function validatePnStamp(transientData, targetCost) {
  if (transientData.length <= LXMF_OVERHEAD + STAMP_SIZE2) return null;
  const lxmfData = transientData.subarray(0, transientData.length - STAMP_SIZE2);
  const stampData = transientData.subarray(transientData.length - STAMP_SIZE2);
  const transientId = await fullHash2(lxmfData);
  const workblock = await stampWorkblock(
    transientId,
    WORKBLOCK_EXPAND_ROUNDS_PN
  );
  if (!await stampValid(stampData, targetCost, workblock)) return null;
  const value = await stampValue(workblock, stampData);
  return { transientId, lxmfData, stampData, stampValue: value };
}
async function validatePnStamps(transientList, targetCost) {
  const out = [];
  for (const td of transientList) {
    const v = await validatePnStamp(td, targetCost);
    if (v) out.push(v);
  }
  return out;
}

// node_modules/@reticulum/lxmf/src/peer.js
var PeerState = Object.freeze({
  IDLE: 0,
  LINK_ESTABLISHING: 1,
  LINK_READY: 2,
  REQUEST_SENT: 3,
  RESPONSE_RECEIVED: 4,
  RESOURCE_TRANSFERRING: 5
});
function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
var LXMPeer = class {
  /**
   * @param {import("./router.js").LXMRouter} router
   * @param {Uint8Array} destinationHash Peer's `lxmf.propagation` dest hash.
   * @param {number} [syncStrategy] {@link DEFAULT_SYNC_STRATEGY}.
   */
  constructor(router, destinationHash, syncStrategy = DEFAULT_SYNC_STRATEGY) {
    this.router = router;
    this.destinationHash = destinationHash;
    this.alive = false;
    this.lastHeard = 0;
    this.syncStrategy = syncStrategy;
    this.peeringKey = null;
    this.peeringCost = null;
    this.propagationStampCost = null;
    this.propagationStampCostFlexibility = null;
    this.propagationTransferLimit = null;
    this.propagationSyncLimit = null;
    this.metadata = null;
    this.link = null;
    this.state = PeerState.IDLE;
    this.lastOffer = [];
    this.offered = 0;
    this.outgoing = 0;
    this.incoming = 0;
  }
  /** Human-readable identifier. */
  get id() {
    return toHex2(this.destinationHash);
  }
  /**
   * Whether a peering key of sufficient value has been generated for this peer.
   * @returns {boolean}
   */
  peeringKeyReady() {
    if (this.peeringCost == null) return false;
    if (Array.isArray(this.peeringKey) && this.peeringKey.length === 2) {
      const value = (
        /** @type {number} */
        this.peeringKey[1]
      );
      if (value >= /** @type {number} */
      this.peeringCost) return true;
      this.peeringKey = null;
    }
    return false;
  }
  /**
   * Generates the peering key stamp over
   * `receivingIdentityHash ‖ offeringIdentityHash`
   * (`peerIdentity.hash ‖ this.router.identity.hash`), at the peer's advertised
   * peering cost. Returns true on success.
   * @returns {Promise<boolean>}
   */
  async generatePeeringKey() {
    if (this.peeringCost == null) return false;
    if (this.peeringKey) return true;
    const peerIdentity = await this.router.rns.transport.recallIdentity(
      this.destinationHash
    );
    if (!peerIdentity) {
      log(
        "LXMF",
        `Cannot generate peering key for ${this.id}: peer identity unknown`,
        LogLevel.ERROR
      );
      return false;
    }
    const localHash = this.router.identity.identityHash;
    const material = new Uint8Array(
      peerIdentity.identityHash.length + localHash.length
    );
    material.set(peerIdentity.identityHash, 0);
    material.set(localHash, peerIdentity.identityHash.length);
    const [peeringKey, value] = await generateStamp(
      material,
      /** @type {number} */
      this.peeringCost,
      WORKBLOCK_EXPAND_ROUNDS_PEERING2
    );
    if (value >= /** @type {number} */
    this.peeringCost) {
      this.peeringKey = [peeringKey, value];
      return true;
    }
    return false;
  }
  /**
   * Runs one outbound sync pass: present peering key, offer unhandled messages,
   * transfer those the peer wants, then mark them handled.
   *
   * Resolves true if a transfer was attempted, false if the sync was postponed
   * (no peering key / nothing to offer / no link).
   * @returns {Promise<boolean>}
   */
  async sync() {
    if (!this.peeringKeyReady()) {
      if (!await this.generatePeeringKey() || !this.peeringKeyReady()) {
        log(
          "LXMF",
          `Postponing sync with peer ${this.id}: peering key not ready`,
          LogLevel.DEBUG
        );
        return false;
      }
    }
    const store = this.router.propagationNode?.store;
    if (!store) return false;
    const minAccepted = Math.max(
      0,
      (this.propagationStampCost ?? 0) - (this.propagationStampCostFlexibility ?? 0)
    );
    const unhandled = store.unhandledEntriesForPeer(
      this.destinationHash,
      minAccepted
    );
    if (unhandled.length === 0) {
      log("LXMF", `No unhandled messages for peer ${this.id}`, LogLevel.DEBUG);
      return false;
    }
    const peerIdentity = await this.router.rns.transport.recallIdentity(
      this.destinationHash
    );
    if (!peerIdentity) return false;
    const peerDest = await Destination.OUT(
      APP_NAME + ".propagation",
      DestType.SINGLE,
      peerIdentity,
      this.router.rns
    );
    this.state = PeerState.LINK_ESTABLISHING;
    this.link = await peerDest.createLink();
    this.link.bz2 = this.router.rns.compressionProvider || void 0;
    await this.link.identify(this.router.identity);
    this.state = PeerState.LINK_READY;
    const offeredIds = [];
    let cumulative = 24;
    const perMessageOverhead = 16;
    for (const u of unhandled) {
      const transferSize = u.size + perMessageOverhead;
      if (this.propagationTransferLimit != null && transferSize > this.propagationTransferLimit * 1e3) {
        store.markHandledForPeer(u.transientId, this.destinationHash);
        continue;
      }
      if (this.propagationSyncLimit != null && cumulative + transferSize >= this.propagationSyncLimit * 1e3) {
        continue;
      }
      cumulative += transferSize;
      offeredIds.push(u.transientId);
    }
    if (offeredIds.length === 0) {
      this._teardown();
      return false;
    }
    const peeringKey = (
      /** @type {[Uint8Array, number]} */
      this.peeringKey
    );
    const offer = [peeringKey[0], offeredIds];
    this.lastOffer = offeredIds;
    this.state = PeerState.REQUEST_SENT;
    log(
      "LXMF",
      `Offering ${offeredIds.length} message(s) to peer ${this.id}`,
      LogLevel.DEBUG
    );
    const response = await this.link.request(OFFER_REQUEST_PATH, offer);
    const wanted = this._interpretOfferResponse(response, store);
    if (wanted.length === 0) {
      log(
        "LXMF",
        `Peer ${this.id} did not request any messages; sync complete`,
        LogLevel.DEBUG
      );
      this.offered += offeredIds.length;
      this._teardown();
      return false;
    }
    const lxmfList = [];
    for (const tid of wanted) {
      const entry = store.get(tid);
      if (entry) lxmfList.push(concat(entry.lxmfData, entry.stampData));
    }
    const container = packPropagationContainer(lxmfList);
    this.state = PeerState.RESOURCE_TRANSFERRING;
    const resource = new Resource({
      data: container,
      link: this.link,
      bz2: this.link.bz2
    });
    await resource.advertise();
    await resource.whenComplete();
    for (const tid of wanted) {
      store.markHandledForPeer(tid, this.destinationHash);
    }
    this.offered += offeredIds.length;
    this.outgoing += wanted.length;
    this.alive = true;
    this.lastHeard = Date.now() / 1e3;
    log(
      "LXMF",
      `Transferred ${wanted.length} message(s) to peer ${this.id}`,
      LogLevel.DEBUG
    );
    this._teardown();
    return true;
  }
  /**
   * Interprets an `/offer` response (`LXMPeer.offer_response`):
   *   - `false` → peer has everything offered (mark all handled, want nothing).
   *   - `true`  → peer wants everything offered.
   *   - `[ids]` → peer wants that subset; ids absent from the response are
   *     marked handled (the peer already received them elsewhere).
   *   - error code / other → want nothing.
   *
   * @param {any} response
   * @param {import("./message_store.js").MessageStore} store
   * @returns {Uint8Array[]} wanted transient_ids.
   * @private
   */
  _interpretOfferResponse(response, store) {
    if (response === false) {
      for (const tid of this.lastOffer) {
        store.markHandledForPeer(tid, this.destinationHash);
      }
      return [];
    }
    if (response === true) return [...this.lastOffer];
    if (Array.isArray(response)) {
      const set = new Set(response.map((t) => toHex2(t)));
      for (const tid of this.lastOffer) {
        if (!set.has(toHex2(tid))) {
          store.markHandledForPeer(tid, this.destinationHash);
        }
      }
      return (
        /** @type {Uint8Array[]} */
        response
      );
    }
    log(
      "LXMF",
      `Peer ${this.id} offer error/unexpected response: ${response}`,
      LogLevel.DEBUG
    );
    return [];
  }
  /** Tears down the sync link and returns to IDLE. @private */
  _teardown() {
    this.link?.teardown?.();
    this.link = null;
    this.state = PeerState.IDLE;
  }
  /** Operator name from advertised metadata, if present. @type {string|null} */
  get name() {
    const md = this.metadata;
    if (!md || typeof md !== "object") return null;
    const name = md.get(1);
    if (name instanceof Uint8Array) {
      try {
        return new TextDecoder().decode(name);
      } catch {
        return null;
      }
    }
    return null;
  }
};

// node_modules/@reticulum/lxmf/src/propagation_node.js
import { Destination as Destination2, DestType as DestType2, toHex as toHex3 } from "./reticulum-core.js";
var DESTINATION_LENGTH2 = 16;
var PropagationNode = class {
  /**
   * @param {PropagationNodeOptions} [options]
   */
  constructor(options = {}) {
    this.store = options.store ?? new MessageStore({
      storageLimitBytes: options.storageLimitBytes ?? null,
      messageTtlSecs: options.messageTtlSecs ?? null
    });
    this.stampCost = options.stampCost ?? PROPAGATION_COST;
    this.stampCostFlexibility = options.stampCostFlexibility ?? PROPAGATION_COST_FLEX;
    this.perTransferLimitKb = options.perTransferLimitKb ?? PROPAGATION_LIMIT;
    this.perSyncLimitKb = options.perSyncLimitKb ?? SYNC_LIMIT;
    this.peeringCost = options.peeringCost ?? PEERING_COST;
    this.name = options.name ?? null;
    this.nodeState = options.nodeState ?? true;
    this.identityAllowed = options.identityAllowed ?? (() => true);
    this.getDeliveryDestination = options.getDeliveryDestination ?? (() => null);
    this.onLocalDelivery = options.onLocalDelivery ?? (() => {
    });
    this.onStored = options.onStored ?? (() => {
    });
    this.getLocalIdentityHash = options.getLocalIdentityHash ?? (() => new Uint8Array(0));
    this.locallyProcessed = /* @__PURE__ */ new Set();
    this.locallyDelivered = /* @__PURE__ */ new Set();
  }
  /** Minimum accepted stamp value = max(0, cost − flexibility). */
  minAcceptedCost() {
    return Math.max(0, this.stampCost - this.stampCostFlexibility);
  }
  /**
   * Builds the `lxmf.propagation` announce app_data advertising this node's
   * limits and costs (LXMRouter.get_propagation_node_app_data).
   *
   * @param {number} [timebase] Unix seconds; defaults to now.
   * @returns {Uint8Array}
   */
  buildAnnounceAppData(timebase = Math.floor(Date.now() / 1e3)) {
    return buildPropagationNodeAppData({
      timebase,
      nodeState: this.nodeState,
      perTransferLimitKb: this.perTransferLimitKb,
      perSyncLimitKb: this.perSyncLimitKb,
      stampCost: this.stampCost,
      stampCostFlexibility: this.stampCostFlexibility,
      peeringCost: this.peeringCost,
      name: this.name
    });
  }
  /**
   * Periodic maintenance — prunes aged entries (when `messageTtlSecs` is set)
   * and re-runs capacity eviction. A runner calls this hourly (the Python
   * reference runs the same cull from its job loop).
   *
   * @returns {{ aged: number }}
   */
  tickMaintenance() {
    return this.store.prune();
  }
  /**
   * Ingests a list of propagation blobs received in a submit/sync Resource
   * container (LXMRouter.propagation_resource_concluded → lxmf_propagation).
   *
   * Each blob is `lxmf_data || stamp`. Stamps are validated against the node's
   * minimum cost; survivors are deduplicated, then either locally delivered
   * (if addressed to one of this node's identities) or stored. Returns the
   * count of newly stored entries and the count of locally delivered entries.
   *
   * @param {Uint8Array[]} transientList
   * @returns {Promise<{stored: number, delivered: number, rejected: number, storedIds: Uint8Array[]}>}
   */
  async ingestBlobs(transientList) {
    const minCost = this.minAcceptedCost();
    const validated = await validatePnStamps(transientList, minCost);
    const rejected = transientList.length - validated.length;
    let stored = 0;
    let delivered = 0;
    const storedIds = [];
    for (const v of validated) {
      const key = toHex3(v.transientId);
      if (this.store.has(v.transientId) || this.locallyProcessed.has(key)) {
        continue;
      }
      this.locallyProcessed.add(key);
      const destinationHash = v.lxmfData.subarray(0, DESTINATION_LENGTH2);
      const deliveryDest = this.getDeliveryDestination(destinationHash);
      if (deliveryDest) {
        const msg = await Message.fromPropagationData(v.lxmfData, deliveryDest);
        if (msg) {
          this.locallyDelivered.add(key);
          delivered++;
          await this.onLocalDelivery(msg, v.transientId);
          continue;
        }
        continue;
      }
      this.store.add({
        transientId: v.transientId,
        destinationHash: destinationHash.slice(),
        lxmfData: v.lxmfData.slice(),
        stampData: v.stampData.slice(),
        received: Date.now() / 1e3,
        stampValue: v.stampValue,
        size: v.lxmfData.length + v.stampData.length,
        handledPeers: /* @__PURE__ */ new Set(),
        unhandledPeers: /* @__PURE__ */ new Set()
      });
      storedIds.push(v.transientId.slice());
      stored++;
    }
    if (storedIds.length > 0) this.onStored(storedIds);
    return { stored, delivered, rejected, storedIds };
  }
  /**
   * Handles a `/get` REQUEST (LXMRouter.message_get_request).
   *
   * `data` is the decoded `[want, have]` or `[want, have, transferLimitKb]`:
   *   - `[null, null]` → list of available transient_ids for the requester.
   *   - `[wants[], haves[]]` → purge haves, return base lxmf_data for wants.
   *   - `[null, haves[]]` → purge-ack only (returns []).
   *
   * Returns a value to be msgpack-encoded as the response: an array of
   * transient_ids, an array of lxmf_data blobs, or a peer error code.
   *
   * @param {import("@reticulum/core").Identity|null} remoteIdentity
   * @param {any} data
   * @returns {Promise<Uint8Array[]|number>}
   */
  async handleGetRequest(remoteIdentity, data) {
    if (!remoteIdentity) return PEER_ERROR_NO_IDENTITY;
    if (!this.identityAllowed(remoteIdentity)) return PEER_ERROR_NO_ACCESS;
    if (!Array.isArray(data) || data.length < 2) return PEER_ERROR_INVALID_DATA;
    const remoteDest = await Destination2.OUT(
      APP_NAME + ".delivery",
      DestType2.SINGLE,
      remoteIdentity,
      null
    );
    const remoteHash = remoteDest.destinationHash;
    if (!remoteHash) return PEER_ERROR_INVALID_DATA;
    if (data[0] == null && data[1] == null) {
      return this.store.transientIdsForDestination(remoteHash);
    }
    if (data[1] != null && Array.isArray(data[1]) && data[1].length > 0) {
      for (const tid of data[1]) {
        this.store.removeForDestination(tid, remoteHash);
      }
    }
    if (data[0] != null && Array.isArray(data[0]) && data[0].length > 0) {
      const clientTransferLimitKb = data.length >= 3 && typeof data[2] === "number" ? data[2] : null;
      const out = [];
      let cumulative = 24;
      for (const tid of data[0]) {
        const lxmfData = this.store.serveDataForDestination(tid, remoteHash);
        if (!lxmfData) continue;
        const next = cumulative + lxmfData.length + 16;
        if (clientTransferLimitKb != null && next > clientTransferLimitKb * 1e3) {
          continue;
        }
        out.push(lxmfData);
        cumulative = next;
      }
      return out;
    }
    return [];
  }
  /**
   * Builds the `responseGenerator` for `registerRequestHandler("/get", …)`.
   * Adapts the Link handler signature to {@link handleGetRequest}.
   *
   * @returns {(path: string, data: any, requestId: Uint8Array, remoteIdentity: import("@reticulum/core").Identity|null, requestedAt: number) => Promise<Uint8Array[]|number>}
   */
  getRequestHandler() {
    return async (_path, data, _requestId, remoteIdentity) => this.handleGetRequest(remoteIdentity, data);
  }
  /**
   * Handles a `/offer` REQUEST from a peering propagation node
   * (`LXMRouter.offer_request`).
   *
   * `data` is `[peering_key, [transient_id, …]]`. The peering key is validated
   * against `peering_id = receivingIdentityHash ‖ offeringIdentityHash` at this
   * node's own peering cost. The node then reports which offered messages it
   * does not yet have:
   *   - `false`  → it already has every offered message.
   *   - `true`   → it wants every offered message.
   *   - `[ids]`  → it wants exactly that subset.
   *
   * @param {import("@reticulum/core").Identity|null} remoteIdentity
   * @param {any} data
   * @returns {Promise<boolean|Uint8Array[]|number>} the offer response, or a
   *   peer-error code.
   */
  async handleOfferRequest(remoteIdentity, data) {
    if (!remoteIdentity) return PEER_ERROR_NO_IDENTITY;
    if (!this.identityAllowed(remoteIdentity)) return PEER_ERROR_NO_ACCESS;
    if (!Array.isArray(data) || data.length < 2) return PEER_ERROR_INVALID_DATA;
    const localHash = this.getLocalIdentityHash();
    const remoteHash = remoteIdentity.identityHash;
    const peeringId = new Uint8Array(localHash.length + remoteHash.length);
    peeringId.set(localHash, 0);
    peeringId.set(remoteHash, localHash.length);
    const peeringKey = (
      /** @type {Uint8Array} */
      data[0]
    );
    if (!await validatePeeringKey(peeringId, peeringKey, this.peeringCost))
      return PEER_ERROR_INVALID_KEY;
    const offered = data[1];
    const wanted = [];
    for (const tid of offered) {
      if (!this.store.has(tid)) wanted.push(tid);
    }
    if (wanted.length === 0) return false;
    if (wanted.length === offered.length) return true;
    return wanted;
  }
  /**
   * Builds the `responseGenerator` for `registerRequestHandler("/offer", …)`.
   * @returns {(path: string, data: any, requestId: Uint8Array, remoteIdentity: import("@reticulum/core").Identity|null, requestedAt: number) => Promise<boolean|Uint8Array[]|number>}
   */
  getOfferRequestHandler() {
    return async (_path, data, _requestId, remoteIdentity) => this.handleOfferRequest(remoteIdentity, data);
  }
};

// node_modules/@reticulum/lxmf/src/router.js
import {
  CORE_INSTANCE_TOKEN,
  ContextType,
  Destination as Destination3,
  DestType as DestType3,
  Identity as Identity2,
  Link,
  LinkStatus,
  LogLevel as LogLevel2,
  log as log2,
  Packet,
  PacketReceipt,
  PacketType,
  ReceiptStatus,
  Resource as Resource2,
  toHex as toHex4,
  UnknownIdentityError,
  warnIfFragmented
} from "./reticulum-core.js";
var DIRECT_LINK_TIMEOUT_MS = 1e4;
var PATH_REQUEST_WAIT_MS = 7e3;
var RESOURCE_TRANSFER_TIMEOUT_MS = 6e4;
var DELIVERED_MESSAGE_CACHE_MAX = 4096;
var LXMRouter = class extends EventTarget {
  /**
   * Creates an LXMF router bound to the given identity and Reticulum instance.
   * @param {import("@reticulum/core").Identity} identity
   * @param {import("@reticulum/core").Reticulum} rnsCore - The Reticulum instance
   */
  constructor(identity, rnsCore) {
    super();
    this.identity = identity;
    this.rns = rnsCore;
    warnIfFragmented("LXMF", CORE_INSTANCE_TOKEN, rnsCore.coreInstanceToken);
    this.deliveryDest = null;
    this.propagationNode = null;
    this.propagationDest = null;
    this.outboundPropagationNode = null;
    this.outboundPropagationLink = null;
    this.deliveryPerTransferLimit = DELIVERY_LIMIT;
    this.pendingMessages = /* @__PURE__ */ new Map();
    this.pendingLinks = /* @__PURE__ */ new Map();
    this.identifiedLinks = /* @__PURE__ */ new Set();
    this.attachedLinks = /* @__PURE__ */ new Set();
    this.directLinks = /* @__PURE__ */ new Map();
    this.displayName = null;
    this.stampCost = null;
    this.processedTransientIds = /* @__PURE__ */ new Map();
    this.locallyDeliveredMessageIds = /* @__PURE__ */ new Map();
    this.peers = /* @__PURE__ */ new Map();
    this.autopeerEnabled = false;
    this.autopeerMaxPeeringCost = MAX_PEERING_COST;
  }
  /**
   * Initializes the router and registers the LXMF delivery destination.
   */
  async init() {
    log2("ROUTER", "Initializing...");
    const deliveryDest = await Destination3.IN(
      "lxmf.delivery",
      DestType3.SINGLE,
      this.identity,
      this.rns
    );
    log2("ROUTER", `deliveryDest set: ${deliveryDest.name}`);
    this.deliveryDest = deliveryDest;
    this.rns.transport.bindLocalDestination(deliveryDest);
    this.rns.registerDestination(deliveryDest);
    await deliveryDest.enableRatchets();
    this._setupListeners();
    this.dispatchEvent(
      new CustomEvent("ready", { detail: { destination: deliveryDest } })
    );
    log2("ROUTER", "init complete.");
  }
  /**
   * Announces the `lxmf.delivery` destination with the given display name.
   *
   * Builds the §4.3 msgpack `app_data` (`[name(bin8), stamp_cost, [SF_COMPRESSION]]`)
   * and attaches it to the identity so `Destination.announce` signs it as part
   * of the announce body.
   *
   * @param {string} displayName - Human-readable node name shown to peers.
   * @param {number|null} [stampCost=null] - Active stamp cost (1-254), or null
   *   to advertise stamping as disabled.
   * @returns {Promise<void>}
   */
  async announce(displayName, stampCost = null) {
    if (!this.deliveryDest) {
      throw new Error("Router not initialized; call init() first.");
    }
    this.displayName = displayName;
    this.stampCost = stampCost;
    this.identity.appData = buildAnnounceAppData(
      displayName,
      stampCost
    ).slice();
    await this.deliveryDest.announce();
  }
  /**
   * Starts periodic re-announcement of the `lxmf.delivery` destination
   * (PROTOCOL-SPEC.md §9.7) so cached mesh paths stay fresh and peers can
   * reach you after transit-relay TTLs lapse.
   *
   * Sets the announce `app_data` from `displayName`/`stampCost` (so every
   * periodic announce advertises the same name), then delegates to
   * {@link Destination.startAnnouncing} on the delivery destination — which
   * fires the first announce immediately and repeats every `intervalMs`.
   *
   * This replaces the one-shot {@link announce} for the common "announce and
   * keep announcing" case. Call {@link stopAnnouncing} to halt the loop.
   *
   * @param {string} displayName - Human-readable node name shown to peers.
   * @param {Object} [options]
   * @param {number|null} [options.stampCost=null] - Active stamp cost (1-254),
   *   or null to advertise stamping as disabled.
   * @param {number} [options.intervalMs] - Override the default cadence
   *   (clamped to the §9.7 60 s floor).
   * @returns {Promise<void>}
   */
  async startAnnouncing(displayName, options = {}) {
    if (!this.deliveryDest) {
      throw new Error("Router not initialized; call init() first.");
    }
    const { stampCost = null, intervalMs } = options;
    this.displayName = displayName;
    this.stampCost = stampCost;
    this.identity.appData = buildAnnounceAppData(
      displayName,
      stampCost
    ).slice();
    this.deliveryDest.startAnnouncing({ intervalMs });
  }
  /**
   * Stops the periodic delivery-destination re-announce loop started by
   * {@link startAnnouncing}. Safe to call when not running (no-op).
   */
  stopAnnouncing() {
    this.deliveryDest?.stopAnnouncing();
  }
  /**
   * Enables autopeering (matching the Python reference's lxmd autopeer): when
   * a `lxmf.propagation`
   * announce is heard whose advertised peering cost is ≤ `maxPeeringCost`, a
   * peering relationship is established automatically. Requires
   * {@link enablePropagation} (this node must itself be a propagation node to
   * peer).
   *
   * @param {number} [maxPeeringCost] Max advertised peering cost to auto-peer
   *   at (default {@link MAX_PEERING_COST}).
   */
  enableAutopeer(maxPeeringCost = MAX_PEERING_COST) {
    this.autopeerEnabled = true;
    this.autopeerMaxPeeringCost = maxPeeringCost;
  }
  /**
   * Enables the propagation-node role (§5.3): creates the `lxmf.propagation`
   * destination, registers the `/get` message-download handler, and ingests
   * submitted messages received via link Resources.
   *
   * The node stores propagated messages addressed to *other* identities and
   * serves them to clients over `/get`; messages addressed to this router's
   * own delivery identity are locally delivered (decrypted + dispatched as a
   * `message` event). Returns the {@link PropagationNode} for direct access
   * (e.g. inspecting {@link PropagationNode.store}).
   *
   * Call {@link announcePropagationNode} afterwards to broadcast the node.
   *
   * @param {import("./propagation_node.js").PropagationNodeOptions} [options]
   * @returns {Promise<PropagationNode>}
   */
  async enablePropagation(options = {}) {
    if (this.propagationNode) return this.propagationNode;
    const propDest = await Destination3.IN(
      "lxmf.propagation",
      DestType3.SINGLE,
      this.identity,
      this.rns
    );
    this.propagationDest = propDest;
    this.rns.transport.bindLocalDestination(propDest);
    this.rns.registerDestination(propDest);
    const deliveryHash = this.deliveryDest?.destinationHash ?? null;
    const node = new PropagationNode({
      ...options,
      getLocalIdentityHash: () => this.identity.identityHash,
      getDeliveryDestination: (hash) => {
        if (!deliveryHash) return null;
        return toHex4(hash) === toHex4(deliveryHash) ? (
          /** @type {any} */
          this.deliveryDest
        ) : null;
      },
      onLocalDelivery: (msg) => {
        this._dispatchMessage(
          /** @type {any} */
          msg,
          null
        );
      },
      // Peer-mesh distribution for every ingest path (link Resources,
      // in-process embedded-node submits, paper ingestion).
      onStored: (storedIds) => this._distributeStored(storedIds)
    });
    this.propagationNode = node;
    propDest.appData = node.buildAnnounceAppData().slice();
    await propDest.registerRequestHandler(MESSAGE_GET_PATH, {
      responseGenerator: node.getRequestHandler()
    });
    await propDest.registerRequestHandler(OFFER_REQUEST_PATH, {
      responseGenerator: node.getOfferRequestHandler()
    });
    propDest.addEventListener(
      "link_request",
      async (event) => {
        try {
          const link = await /** @type {any} */
          propDest.acceptLink(
            event.detail.packet
          );
          link.bz2 = this.rns.compressionProvider || void 0;
          link.maxResourceSize = node.perSyncLimitKb * 1e3;
          link.addEventListener("resource", (resEvent) => {
            const resource = (
              /** @type {any} */
              resEvent.detail.resource
            );
            resource.whenComplete().then(async () => {
              const container = unpackPropagationContainer(
                /** @type {Uint8Array} */
                resource.data
              );
              if (container) {
                const res = await node.ingestBlobs(container.messages);
                log2(
                  "LXMF",
                  `Propagation submit ingested: ${res.stored} stored, ${res.delivered} delivered, ${res.rejected} rejected`,
                  LogLevel2.DEBUG
                );
              }
            }).catch((err) => {
              log2(
                "LXMF",
                `Propagation resource transfer failed: ${err}`,
                LogLevel2.ERROR
              );
            });
          });
        } catch (e) {
          log2(
            "LXMF",
            `Failed to accept propagation link: ${e}`,
            LogLevel2.ERROR
          );
        }
      }
    );
    return node;
  }
  /**
   * Announces the `lxmf.propagation` destination, advertising this node to the
   * network. Requires {@link enablePropagation} first.
   * @returns {Promise<void>}
   */
  async announcePropagationNode() {
    if (!this.propagationDest) {
      throw new Error(
        "Propagation not enabled; call enablePropagation() first."
      );
    }
    await this.propagationDest.announce();
  }
  // ----------------------------------------------------------------
  // Peer mesh (§5.8.4): peered propagation nodes
  // ----------------------------------------------------------------
  /**
   * Establishes (or updates) a peering relationship with another propagation
   * node (`LXMRouter.peer`). The peer's advertised limits and costs are read
   * from its app_data; messages this node stores are then offered to it on the
   * next {@link syncPeers}.
   *
   * @param {Uint8Array} destinationHash Peer's `lxmf.propagation` hash.
   * @param {Object} config
   * @param {number} config.stampCost Peer's propagation stamp cost.
   * @param {number} config.stampCostFlexibility Peer's stamp cost flexibility.
   * @param {number} config.peeringCost Peer's peering cost (≤ MAX_PEERING_COST).
   * @param {number|null} [config.perTransferLimitKb] Per-message transfer limit.
   * @param {number|null} [config.perSyncLimitKb] Per-sync cumulative limit.
   * @param {Map<number, Uint8Array>|null} [config.metadata] Node metadata map.
   * @returns {LXMPeer|null} the peer, or null if peering was rejected.
   */
  peer(destinationHash, config) {
    if (config.peeringCost > MAX_PEERING_COST) {
      log2(
        "LXMF",
        `Not peering with ${toHex4(destinationHash)}: peering cost ${config.peeringCost} > max ${MAX_PEERING_COST}`,
        LogLevel2.NOTICE
      );
      this.unpeer(destinationHash);
      return null;
    }
    const key = toHex4(destinationHash);
    let peer;
    let isNewPeer = false;
    if (this.peers.has(key)) {
      peer = /** @type {LXMPeer} */
      this.peers.get(key);
    } else {
      peer = new LXMPeer(this, destinationHash.slice(), DEFAULT_SYNC_STRATEGY);
      this.peers.set(key, peer);
      isNewPeer = true;
    }
    peer.alive = true;
    peer.lastHeard = Date.now() / 1e3;
    peer.propagationStampCost = config.stampCost;
    peer.propagationStampCostFlexibility = config.stampCostFlexibility;
    peer.peeringCost = config.peeringCost;
    peer.propagationTransferLimit = config.perTransferLimitKb ?? null;
    peer.propagationSyncLimit = config.perSyncLimitKb ?? config.perTransferLimitKb ?? null;
    peer.metadata = config.metadata ?? null;
    if (!peer.peeringKeyReady()) peer.peeringKey = null;
    if (isNewPeer) {
      const store = this.propagationNode?.store;
      if (store) {
        const count = store.markAllUnhandledForPeer(destinationHash);
        if (count > 0) {
          log2(
            "LXMF",
            `Queued ${count} stored message(s) for distribution to new peer ${toHex4(destinationHash)}`,
            LogLevel2.DEBUG
          );
        }
      }
    }
    log2("LXMF", `Peered with ${toHex4(destinationHash)}`, LogLevel2.NOTICE);
    return peer;
  }
  /**
   * Breaks a peering relationship (`LXMRouter.unpeer`).
   * @param {Uint8Array} destinationHash
   */
  unpeer(destinationHash) {
    const removed = this.peers.delete(toHex4(destinationHash));
    if (removed)
      log2(
        "LXMF",
        `Broke peering with ${toHex4(destinationHash)}`,
        LogLevel2.NOTICE
      );
  }
  /**
   * Runs one outbound sync pass against every peered node. Resolves when all
   * peers have completed (or postponed) their sync.
   * @returns {Promise<void>}
   */
  async syncPeers() {
    for (const peer of this.peers.values()) {
      try {
        await peer.sync();
      } catch (err) {
        log2("LXMF", `Sync with peer ${peer.id} failed: ${err}`, LogLevel2.ERROR);
      }
    }
  }
  /**
   * Marks newly-stored messages as unhandled for every peered node so they will
   * be offered on the next {@link syncPeers} (`flush_peer_distribution_queue`).
   * @param {Uint8Array[]} storedIds
   * @private
   */
  _distributeStored(storedIds) {
    const store = this.propagationNode?.store;
    if (!store || storedIds.length === 0 || this.peers.size === 0) return;
    for (const tid of storedIds) {
      for (const peer of this.peers.values()) {
        store.markUnhandledForPeer(tid, peer.destinationHash);
      }
    }
  }
  // ----------------------------------------------------------------
  // Client-side propagation: submit (PROPAGATED) + sync (download)
  // ----------------------------------------------------------------
  /**
   * Sets the propagation node to submit messages to and sync from, by its
   * `lxmf.propagation` destination hash. The node's identity/app_data must be
   * learned from an announce before submit/sync can run.
   *
   * @param {Uint8Array} destinationHash
   */
  setOutboundPropagationNode(destinationHash) {
    this.outboundPropagationNode = destinationHash;
    this.outboundPropagationLink = null;
  }
  /**
   * Establishes (and caches) a Link to the configured propagation node's
   * `lxmf.propagation` destination, waiting until it is ACTIVE.
   * @returns {Promise<import("@reticulum/core").Link>}
   * @private
   */
  async _ensurePropagationLink() {
    if (!this.outboundPropagationNode) {
      throw new Error("No outbound propagation node configured.");
    }
    const cached = this.outboundPropagationLink;
    if (cached && cached.status === 2) {
      return cached;
    }
    const nodeIdentity = await this.rns.transport.recallIdentity(
      this.outboundPropagationNode
    );
    if (!nodeIdentity) {
      throw new Error(
        `Propagation node identity unknown for ${toHex4(
          this.outboundPropagationNode
        )}; wait for its announce.`
      );
    }
    const nodeDest = await Destination3.OUT(
      "lxmf.propagation",
      DestType3.SINGLE,
      nodeIdentity,
      this.rns
    );
    const link = await nodeDest.createLink();
    await link.whenActive();
    link.bz2 = this.rns.compressionProvider || void 0;
    this.outboundPropagationLink = link;
    return link;
  }
  /**
   * Submits a message to the configured propagation node for store-and-forward
   * delivery (LXMF.md §5.8 / LXMessage PROPAGATED).
   *
   * Packs the message into propagation form (`dest_hash ‖ E(src‖sig‖payload)`,
   * §5.3), appends a propagation stamp meeting the node's advertised cost, and
   * sends the `msgpack([time, [lxmf_data]])` container to the node as a Link
   * Resource. The node stores it until the recipient syncs.
   *
   * @param {Message} message
   * @param {import("@reticulum/core").Identity} senderIdentity
   * @param {{stampCost?: number}} [options] Override the stamp cost (defaults
   *   to the node's advertised cost, then {@link PROPAGATION_COST}).
   * @returns {Promise<{transientId: Uint8Array, stampCost: number}>}
   */
  async submitToPropagationNode(message, senderIdentity, options = {}) {
    if (!this.outboundPropagationNode) {
      throw new Error("No outbound propagation node configured.");
    }
    let stampCost = options.stampCost;
    if (stampCost == null) {
      const nodeIdentity = await this.rns.transport.recallIdentity(
        this.outboundPropagationNode
      );
      const pn = nodeIdentity ? parsePropagationNodeAppData(nodeIdentity.appData) : null;
      stampCost = pn?.stampCost ?? PROPAGATION_COST;
    }
    const { container, transientId } = await this._packForPropagationSubmit(
      message,
      senderIdentity,
      stampCost
    );
    const link = await this._ensurePropagationLink();
    if (!link.bz2)
      link.bz2 = /** @type {any} */
      this.rns.compressionProvider || void 0;
    const resource = new Resource2({
      data: container,
      link,
      bz2: link.bz2
    });
    await resource.advertise();
    try {
      await this._awaitOutgoingResource(resource, link);
    } catch (err) {
      this.outboundPropagationLink = null;
      link.teardown();
      throw err;
    }
    return { transientId, stampCost };
  }
  /**
   * Awaits an outgoing Resource transfer reaching COMPLETE.
   *
   * `Resource.advertise()` only emits the RESOURCE_ADV; the receiver then
   * drives the transfer by sending RESOURCE_REQ, and the sender validates a
   * final RESOURCE_PRF. A caller that returns straight after `advertise()`
   * (as propagation submit and large DIRECT delivery previously did) reports
   * success before any message bytes have crossed the wire, so the message is
   * silently lost when the link is torn down or the process exits before the
   * receiver pulls the parts.
   *
   * Resolves once the transfer is COMPLETE. Rejects if the Resource fails, if
   * the carrier Link closes first, or if the wait exceeds
   * {@link RESOURCE_TRANSFER_TIMEOUT_MS} (the JS Resource has no sender-side
   * watchdog yet, so this bounds the wait on a dead link).
   *
   * @param {Resource} resource
   * @param {import("@reticulum/core").Link} link
   * @returns {Promise<void>}
   * @private
   */
  async _awaitOutgoingResource(resource, link) {
    let cleanup = () => {
    };
    const completion = resource.whenComplete();
    const guard = new Promise((_, reject) => {
      const onStatus = (ev) => {
        if (ev.detail.status === LinkStatus.CLOSED && resource.status !== /* ResourceStatus.COMPLETE */
        6) {
          reject(new Error("Link closed before the LXMF transfer completed"));
        }
      };
      const timer = setTimeout(() => {
        reject(new Error("LXMF transfer timed out waiting for completion"));
      }, RESOURCE_TRANSFER_TIMEOUT_MS);
      cleanup = () => {
        clearTimeout(timer);
        link.removeEventListener("statuschange", onStatus);
      };
      link.addEventListener("statuschange", onStatus);
    });
    try {
      await Promise.race([completion.then(() => {
      }), guard]);
    } finally {
      cleanup();
    }
  }
  /**
   * Packs a message into the propagation submit container
   * (`msgpack([time, [lxmf_data || stamp]])`) for a given stamp cost, without
   * touching the transport. Factored out of {@link submitToPropagationNode}
   * so the wire format is unit-testable.
   *
   * @param {Message} message
   * @param {import("@reticulum/core").Identity} senderIdentity
   * @param {number} stampCost
   * @returns {Promise<{container: Uint8Array, transientId: Uint8Array, stampCost: number}>}
   * @private
   */
  async _packForPropagationSubmit(message, senderIdentity, stampCost) {
    let recipientIdentity = await this.rns.transport.recallIdentity(
      message.destinationHash
    );
    if (!recipientIdentity && typeof this.rns.transport.recallOrSolicitIdentity === "function") {
      try {
        recipientIdentity = await this.rns.transport.recallOrSolicitIdentity(
          message.destinationHash,
          3e4
        );
      } catch {
      }
    }
    if (!recipientIdentity) {
      throw new UnknownIdentityError(message.destinationHash);
    }
    const recipientOut = await Destination3.OUT(
      "lxmf.delivery",
      DestType3.SINGLE,
      recipientIdentity,
      this.rns
    );
    const { lxmfData, transientId } = await message.toPropagationData(
      senderIdentity,
      recipientOut
    );
    let stamp;
    if (stampCost > 0) {
      const [generated] = await generateStamp(
        transientId,
        stampCost,
        WORKBLOCK_EXPAND_ROUNDS_PN2
      );
      stamp = generated;
    } else {
      stamp = new Uint8Array(STAMP_SIZE);
    }
    const stamped = new Uint8Array(lxmfData.length + stamp.length);
    stamped.set(lxmfData, 0);
    stamped.set(stamp, lxmfData.length);
    return {
      container: packPropagationContainer([stamped]),
      transientId,
      stampCost
    };
  }
  /**
   * Whether a message with this message id has already been delivered to
   * local handlers, no matter which path it arrived on (matching the Python
   * reference, keyed by message hash).
   * @param {Uint8Array} messageId - SHA-256 of the signed part (§5.5).
   * @returns {boolean}
   */
  hasMessage(messageId) {
    return this.locallyDeliveredMessageIds.has(toHex4(messageId));
  }
  /**
   * Records a message id as locally delivered (matching the Python
   * reference), evicting
   * the oldest entries past {@link DELIVERED_MESSAGE_CACHE_MAX}.
   * @param {string} messageIdHex
   * @private
   */
  _rememberDelivered(messageIdHex) {
    this.locallyDeliveredMessageIds.set(messageIdHex, Date.now() / 1e3);
    while (this.locallyDeliveredMessageIds.size > DELIVERED_MESSAGE_CACHE_MAX) {
      const oldest = this.locallyDeliveredMessageIds.keys().next().value;
      if (oldest === void 0) break;
      this.locallyDeliveredMessageIds.delete(oldest);
    }
  }
  /**
   * Downloads messages addressed to `identity` from the configured propagation
   * node (LXMRouter.request_messages_from_propagation_node).
   *
   * Drives the `/get` exchange: list available `transient_id`s, request those
   * not already held, decrypt + dispatch each, then ack so the node purges
   * them. Resolves with counts of received / duplicate messages.
   *
   * @param {import("@reticulum/core").Identity} identity The recipient
   *   identity to identify as (so the node serves our messages).
   * @param {number} [maxMessages=ALL_MESSAGES] Cap on messages fetched.
   * @returns {Promise<{received: number, duplicates: number}>}
   */
  async syncFromPropagationNode(identity, maxMessages = ALL_MESSAGES) {
    if (!this.outboundPropagationNode) {
      throw new Error("No outbound propagation node configured.");
    }
    const link = await this._ensurePropagationLink();
    await link.identify(identity);
    const list = await link.request(MESSAGE_GET_PATH, [null, null]);
    this._throwOnPeerError(list);
    if (!Array.isArray(list)) {
      throw new Error("Invalid message list from propagation node");
    }
    const wants = [];
    const haves = [];
    for (const tid of list) {
      if (this.processedTransientIds.has(toHex4(tid))) {
        haves.push(tid);
      } else if (maxMessages === ALL_MESSAGES || wants.length < maxMessages) {
        wants.push(tid);
      }
    }
    if (wants.length === 0 && haves.length === 0) {
      return { received: 0, duplicates: 0 };
    }
    const messages = await link.request(MESSAGE_GET_PATH, [
      wants,
      haves,
      this.deliveryPerTransferLimit
    ]);
    this._throwOnPeerError(messages);
    if (!Array.isArray(messages)) {
      throw new Error("Invalid message data from propagation node");
    }
    const receivedIds = [];
    let received = 0;
    for (const lxmfData of messages) {
      const tid = await Message.transientIdFromPropagationData(lxmfData);
      const tidHex = toHex4(tid);
      if (this.processedTransientIds.has(tidHex)) continue;
      const dispatched = await this._ingestPropagationData(lxmfData);
      this.processedTransientIds.set(tidHex, Date.now() / 1e3);
      receivedIds.push(tid);
      if (dispatched) {
        received++;
      }
    }
    if (receivedIds.length > 0) {
      await link.request(MESSAGE_GET_PATH, [null, receivedIds]);
    }
    return { received, duplicates: messages.length - received };
  }
  /**
   * Decrypts a synced `lxmf_data` (base form, stamp already stripped by the
   * node) addressed to this router's delivery destination and dispatches it as
   * a `message` event. Returns false if it is not for us, undecryptable, or a
   * duplicate of a message already delivered over another path.
   *
   * @param {Uint8Array} lxmfData
   * @returns {Promise<boolean>} whether the message was dispatched
   * @private
   */
  async _ingestPropagationData(lxmfData) {
    if (!this.deliveryDest || !this.deliveryDest.destinationHash) return false;
    const destinationHash = lxmfData.subarray(0, 16);
    if (toHex4(destinationHash) !== toHex4(this.deliveryDest.destinationHash)) {
      return false;
    }
    const message = await Message.fromPropagationData(
      lxmfData,
      this.deliveryDest
    );
    if (!message) return false;
    const senderIdentity = await this.rns.transport.recallIdentity(
      message.sourceHash
    );
    return this._dispatchMessage(message, null, senderIdentity ?? void 0);
  }
  /**
   * Throws when a `/get` response is a peer error code.
   * @param {any} response
   * @private
   */
  _throwOnPeerError(response) {
    if (typeof response === "number" && response >= 240) {
      throw new Error(
        `Propagation node returned error code 0x${response.toString(16)}`
      );
    }
  }
  /**
   * Sets up event listeners for both direct packets and incoming link requests.
   * @private
   */
  _setupListeners() {
    const deliveryDest = this.deliveryDest;
    const expectedDestHash = deliveryDest?.destinationHash;
    if (!expectedDestHash) {
      throw new Error(
        "Cannot set up listeners: delivery destination not initialized"
      );
    }
    this.deliveryDest.addEventListener(
      "data",
      async (event) => {
        const { plaintext } = (
          /** @type {any} */
          event.detail
        );
        try {
          await this._processIncomingMessage(plaintext, null, expectedDestHash);
        } catch (e) {
          log2(
            "LXMF",
            `[!] Failed to process single-packet LXMF message: ${e}`,
            LogLevel2.ERROR
          );
        }
      }
    );
    this.deliveryDest.addEventListener(
      "link_request",
      async (event) => {
        log2("LXMF", "[*] Incoming LXMF Link Request");
        try {
          const link = await /** @type {any} */
          this.deliveryDest.acceptLink(
            event.detail.packet
          );
          link.bz2 = this.rns.compressionProvider || void 0;
          this._attachLinkMessageListeners(link);
          const linkHex = toHex4(link.linkId);
          this.pendingLinks.set(linkHex, true);
          const timer = setTimeout(() => {
            log2("LXMF", `Timeout waiting for link ${linkHex} to identify`);
            this.pendingLinks.delete(linkHex);
            this.processPendingMessages(link.linkId);
          }, 1e4);
          link.addEventListener(
            "identify",
            async (event2) => {
              try {
                if (timer) {
                  clearTimeout(timer);
                }
                const peerIdentity = event2.detail.identity;
                const identityHash = await Identity2.truncatedHash(
                  peerIdentity.publicKey
                );
                log2(
                  "LXMF",
                  `Received LINKIDENTIFY for ${toHex4(identityHash)} (${linkHex})`
                );
                const peerDeliveryDest = await Destination3.OUT(
                  "lxmf.delivery",
                  DestType3.SINGLE,
                  peerIdentity,
                  this.rns
                );
                if (!peerDeliveryDest.destinationHash) {
                  throw new Error(
                    "Failed to derive peer delivery destination hash"
                  );
                }
                await this.rns.transport.rememberIdentity(
                  identityHash,
                  peerDeliveryDest.destinationHash,
                  peerIdentity.publicKey
                );
                this.rns.persistor?.markContacted(
                  peerDeliveryDest.destinationHash
                );
                this.pendingLinks.delete(linkHex);
                this.processPendingMessages(link.linkId);
              } catch (e) {
                log2(
                  "ROUTER",
                  `Failed to derive LXMF destination for peer from link: ${e}`,
                  LogLevel2.ERROR
                );
              }
            }
          );
        } catch (e) {
          log2(
            "LXMF",
            `[!] Failed to respond to LXMF link request: ${e}`,
            LogLevel2.ERROR
          );
        }
      }
    );
    this.rns.transport.addEventListener("announce", (event) => {
      const { destinationHash, identity, appData } = (
        /** @type {CustomEvent} */
        event.detail
      );
      this.dispatchEvent(
        new CustomEvent("peer", {
          detail: {
            destinationHash,
            identity,
            appData: parseAnnounceAppData(appData)
          }
        })
      );
      if (this.autopeerEnabled && this.propagationNode) {
        const pn = parsePropagationNodeAppData(appData);
        if (pn && pn.nodeState && pn.peeringCost <= this.autopeerMaxPeeringCost && !this.peers.has(toHex4(destinationHash))) {
          this.peer(destinationHash, {
            stampCost: pn.stampCost,
            stampCostFlexibility: pn.stampCostFlexibility,
            peeringCost: pn.peeringCost,
            perTransferLimitKb: pn.perTransferLimitKb,
            perSyncLimitKb: pn.perSyncLimitKb
          });
          log2(
            "LXMF",
            `Auto-peered with propagation node ${toHex4(destinationHash)} (peering cost ${pn.peeringCost})`,
            LogLevel2.NOTICE
          );
        }
      }
      this.processAllPendingMessages().catch((e) => {
        log2(
          "LXMF",
          `Re-processing parked messages failed: ${e}`,
          LogLevel2.DEBUG
        );
      });
    });
  }
  /**
   * Processes a raw LXMF message wire buffer.
   * @param {Uint8Array} wireData
   * @param {Uint8Array|null} linkId
   * @param {Uint8Array} [expectedDestHash]
   * @private
   */
  async _processIncomingMessage(wireData, linkId, expectedDestHash) {
    if (wireData.length < 80) {
      throw new Error("LXMF message too short to contain required headers");
    }
    const linkHex = linkId ? toHex4(linkId) : null;
    const message = await Message.deserialize(wireData, expectedDestHash);
    log2("LXMF", `Incoming message from source ${toHex4(message.sourceHash)}`);
    const senderIdentity = await this.rns.transport.recallIdentity(
      message.sourceHash
    );
    if (!senderIdentity) {
      const alreadyParked = this.pendingMessages.has(linkId);
      this.pendingMessages.set(linkId, wireData);
      log2(
        "LXMF",
        `Identity unknown for ${toHex4(message.sourceHash)}; requesting path`
      );
      if (!alreadyParked) {
        try {
          await this.rns?.transport?.requestPath(message.sourceHash);
        } catch (e) {
          log2("LXMF", `Failed to request path: ${e}`, LogLevel2.WARNING);
        }
      }
      return;
    }
    this.pendingMessages.delete(linkId);
    if (!await message.verifySignature(senderIdentity)) {
      throw new Error(
        "Invalid LXMF message signature: Cryptographic proof failed."
      );
    }
    this.rns.persistor?.markContacted(message.sourceHash);
    this._dispatchMessage(message, linkId);
  }
  /**
   * Dispatches a fully-received, signature-verified message to listeners as a
   * `message` event. When `senderIdentity` is provided the signature is
   * re-checked and a failure raises (cryptographic proof failed); when it is
   * `null` (e.g. a paper message whose sender we have not announced with yet)
   * the message is still delivered, mirroring Python's
   * `lxmf_delivery` SOURCE_UNKNOWN behaviour.
   *
   * Deduplicates by message id before dispatching (the Python reference's
   * has-message check): every delivery of the same wire message — over a
   * link, as an opportunistic packet, via a propagation-node sync, through the
   * embedded node's local delivery, or re-ingested from a paper URI — carries
   * the same id, so the second and later copies are dropped instead of
   * re-dispatched (which would re-run message handlers and duplicate replies).
   * Returns whether the message was dispatched; `false` means it was a
   * duplicate.
   *
   * @param {Message} message
   * @param {Uint8Array|null} linkId
   * @param {Identity} [senderIdentity] - optional pre-recalled sender identity.
   * @returns {Promise<boolean>}
   * @private
   */
  async _dispatchMessage(message, linkId, senderIdentity) {
    if (senderIdentity && !await message.verifySignature(senderIdentity)) {
      throw new Error(
        "Invalid LXMF message signature: Cryptographic proof failed."
      );
    }
    if (message.messageId && message.messageId.length > 0) {
      const messageIdHex = toHex4(message.messageId);
      if (this.locallyDeliveredMessageIds.has(messageIdHex)) {
        log2(
          "LXMF",
          `Ignored already received message ${messageIdHex} from ${toHex4(
            message.sourceHash
          )}`,
          LogLevel2.DEBUG
        );
        return false;
      }
      this._rememberDelivered(messageIdHex);
    }
    this.dispatchEvent(
      new CustomEvent("message", {
        detail: {
          message,
          link: linkId
        }
      })
    );
    return true;
  }
  /**
   * Call this when a new Identity is cached (e.g., in your IDENTIFY handler).
   * It checks if any parked messages are now ready for processing.
   *
   * Pass `null` to re-process an opportunistic (linkless) parked message.
   * @param {Uint8Array|null} linkId
   */
  async processPendingMessages(linkId) {
    const hashHex = linkId ? toHex4(linkId) : "opportunistic";
    const expectedDestHash = this.deliveryDest?.destinationHash;
    if (!expectedDestHash) {
      return;
    }
    if (this.pendingMessages.has(linkId)) {
      log2(
        "LXMF",
        `Identity acquired. Re-processing parked message for ${hashHex}`
      );
      const wireData = this.pendingMessages.get(linkId);
      await this._processIncomingMessage(wireData, linkId, expectedDestHash);
    }
  }
  /**
   * Re-processes every parked message whose sender identity may now be known
   * (typically called after a just-validated announce made a previously-
   * unknown identity available — first-contact opportunistic delivery).
   *
   * Each entry is fed back through {@link _processIncomingMessage}: if the
   * identity is still unknown it is re-parked (without re-requesting the
   * path, guarded by `alreadyParked`), otherwise it is verified and
   * dispatched. Safe and cheap to call when nothing is parked.
   *
   * @returns {Promise<void>}
   */
  async processAllPendingMessages() {
    const expectedDestHash = this.deliveryDest?.destinationHash;
    if (!expectedDestHash || this.pendingMessages.size === 0) {
      return;
    }
    for (const linkId of [...this.pendingMessages.keys()]) {
      const wireData = this.pendingMessages.get(linkId);
      if (!wireData) continue;
      try {
        await this._processIncomingMessage(wireData, linkId, expectedDestHash);
      } catch (e) {
        log2(
          "LXMF",
          `Re-processing parked message failed: ${e}`,
          LogLevel2.DEBUG
        );
      }
    }
  }
  /**
   * Ingests a paper message delivered as an `lxm://` URI (`LXMRouter.ingest_lxm_uri`).
   *
   * The URI body is base64-decoded into the paper payload, de-duplicated by its
   * `transient_id` (so re-ingesting the same QR/URI is a no-op), decrypted with
   * the local `lxmf.delivery` destination, and dispatched through the same
   * `message` event path as a network-delivered message. Paper messages always
   * disable stamp enforcement (`LXMRouter.lxmf_propagation` is_paper_message).
   *
   * The sender's signature is verified when their identity is already known
   * (recalled from a prior announce); otherwise the message is still delivered
   * with an unverified signature, exactly like the Python reference.
   *
   * @param {string} uri - The `lxm://` paper message URI.
   * @returns {Promise<Message|null>} The reconstructed message, or `null` when
   *   the URI is not addressed to this node (decryption fails) or was already
   *   ingested.
   */
  async ingestUri(uri) {
    if (!this.deliveryDest) {
      throw new Error("Router not initialized; call init() first.");
    }
    const paperData = Message.paperDataFromUri(uri);
    const transientId = await Message.transientIdFromPropagationData(paperData);
    const transientHex = toHex4(transientId);
    if (this.processedTransientIds.has(transientHex)) {
      log2("LXMF", `Paper message ${transientHex} already ingested; ignoring.`);
      return null;
    }
    this.processedTransientIds.set(transientHex, Date.now() / 1e3);
    const message = await Message.fromPaperData(paperData, this.deliveryDest);
    if (!message) {
      log2("LXMF", "Paper URI not addressed to this node (decryption failed).");
      return null;
    }
    log2("LXMF", `Ingested paper message from ${toHex4(message.sourceHash)}`);
    const senderIdentity = await this.rns.transport.recallIdentity(
      message.sourceHash
    );
    await this._dispatchMessage(message, null, senderIdentity ?? void 0);
    return message;
  }
  /**
   * Serializes and sends an LXMF message.
   *
   * Delivery method mirrors the Python reference:
   *   - a provided `linkId` is reused (DIRECT over an existing link);
   *   - otherwise a DIRECT link to the recipient is established (and cached);
   *   - if no DIRECT link can be established, falls back to a single
   *     opportunistic packet.
   *
   * On a link this initiates, LINKIDENTIFY is sent once before the message DATA
   * (Python LXMF otherwise drops packets that arrive before identify), and the
   * link is wired to receive replies (backchannel).
   *
   * @param {Message} message
   * @param {Identity} senderIdentity
   * @param {Uint8Array|null} linkId
   * @returns {Promise<void>}
   */
  /**
   * Serializes and sends an LXMF message.
   *
   * Delivery method mirrors the Python reference with automated fallback:
   *   - a provided `linkId` is reused (DIRECT over an existing link);
   *   - otherwise a DIRECT link to the recipient is established (and cached);
   *   - if DIRECT link fails or cannot be established, escalates according to `fallback`
   *     ("opportunistic" -> "propagation" -> "none").
   *
   * On a link this initiates, LINKIDENTIFY is sent once before the message DATA
   * (Python LXMF otherwise drops packets that arrive before identify), and the
   * link is wired to receive replies (backchannel).
   *
   * @param {Message} message
   * @param {Identity} senderIdentity
   * @param {Uint8Array | {
   *   linkId?: Uint8Array | null,
   *   fallback?: "opportunistic" | "propagation" | "none",
   *   solicit?: boolean,
   *   timeoutMs?: number,
   * } | null} [optionsOrLinkId]
   * @returns {Promise<void>}
   */
  async send(message, senderIdentity, optionsOrLinkId = {}) {
    const options = optionsOrLinkId instanceof Uint8Array ? { linkId: optionsOrLinkId } : optionsOrLinkId ?? {};
    const {
      linkId: explicitLinkId = null,
      fallback = "opportunistic",
      solicit = true,
      timeoutMs = 3e4
    } = options;
    const { messageId, wireData } = await message.serialize(senderIdentity);
    log2("LXMF", `DEBUG: Sending LXMF Message ID: ${toHex4(messageId)}`);
    log2("LXMF", `DEBUG: Sending to ${toHex4(message.destinationHash)}`);
    let linkDeliveryError = null;
    let targetLinkId = explicitLinkId;
    if (!targetLinkId) {
      try {
        const directLink = await this._establishDirectLink(
          message.destinationHash,
          { solicit, timeoutMs }
        );
        if (directLink) {
          const linkKey = toHex4(directLink.linkId);
          if (!this.attachedLinks.has(linkKey)) {
            this._attachLinkMessageListeners(directLink);
            this.attachedLinks.add(linkKey);
          }
          targetLinkId = directLink.linkId;
        }
      } catch (err) {
        linkDeliveryError = err;
      }
    }
    if (targetLinkId) {
      try {
        await this._sendOverLink(
          targetLinkId,
          senderIdentity,
          message.destinationHash,
          wireData,
          timeoutMs
        );
        return;
      } catch (err) {
        log2(
          "LXMF",
          `Direct link send failed: ${err}; evaluating fallback`,
          LogLevel2.DEBUG
        );
        linkDeliveryError = err;
      }
    }
    if (fallback === "none") {
      throw linkDeliveryError || new Error(
        `Cannot deliver to ${toHex4(
          message.destinationHash
        )}: direct link delivery failed and fallback is "none"`
      );
    }
    let opportunisticError = null;
    if (fallback === "opportunistic" || fallback === "propagation") {
      try {
        await this._sendOpportunistic(message, wireData, {
          solicit,
          timeoutMs
        });
        return;
      } catch (err) {
        log2(
          "LXMF",
          `Opportunistic delivery failed: ${err}; evaluating fallback`,
          LogLevel2.DEBUG
        );
        opportunisticError = err;
      }
    }
    if (fallback === "propagation") {
      if (this.outboundPropagationNode) {
        await this.submitToPropagationNode(message, senderIdentity);
        return;
      }
      throw new Error(
        `Cannot deliver to ${toHex4(
          message.destinationHash
        )}: direct and opportunistic failed, and no outbound propagation node is configured`
      );
    }
    throw opportunisticError || linkDeliveryError || new Error(`Cannot deliver message to ${toHex4(message.destinationHash)}`);
  }
  /**
   * Transmits pre-serialized wireData over an existing active link, handling
   * identify, Resource switching for large bodies, and DATA packet sending.
   *
   * @param {Uint8Array} linkId
   * @param {Identity} senderIdentity
   * @param {Uint8Array} destinationHash
   * @param {Uint8Array} wireData
   * @param {number} [timeoutMs]
   * @returns {Promise<void>}
   * @private
   */
  async _sendOverLink(linkId, senderIdentity, destinationHash, wireData, timeoutMs) {
    const linkKey = toHex4(linkId);
    const link = this.rns.transport.activeLinks.get(linkKey);
    if (!link) {
      throw new Error(`Link ${linkKey} is not active in transport`);
    }
    await link.whenActive(timeoutMs);
    if (link.initiator && !this.identifiedLinks.has(linkKey)) {
      await link.identify(senderIdentity);
      this.identifiedLinks.add(linkKey);
    }
    if (wireData.length > link.mdu) {
      if (!link.bz2)
        link.bz2 = /** @type {any} */
        this.rns.compressionProvider || void 0;
      const resource = new Resource2({
        data: wireData,
        link,
        bz2: link.bz2
      });
      await resource.advertise();
      await this._awaitOutgoingResource(resource, link);
      return;
    }
    const linkPacket = new Packet({
      packetType: PacketType.DATA,
      contextFlag: true,
      contextByte: ContextType.NONE,
      destinationHash,
      destinationType: DestType3.SINGLE,
      transportType: 0,
      payload: wireData
    });
    await this.rns.transport.sendPacket(linkPacket, linkId);
  }
  /**
   * Opportunistic fallback delivery: a single encrypted DATA packet addressed
   * directly to the recipient's lxmf.delivery destination (LXMF.md §5.1).
   *
   * The leading destination hash is stripped from the LXMF body — it is
   * conveyed by the outer Reticulum packet envelope and re-prepended by the
   * receiver (matching the Python reference). The remainder is encrypted
   * with the recipient's public key via Destination.send, exactly mirroring
   * the Python reference's opportunistic packet form.
   *
   * The send is **settled**, not fire-and-forget: the tracked packet receipt
   * is awaited, so the returned promise resolves only once the receiver's
   * PROOF arrives (Python's per-message delivery state) and **rejects** when
   * the proof wait times out — the mesh silently dropped the packet (stale
   * path, offline recipient, …). Without this, callers reported success at
   * framer-write time and never learned delivery was failing.
   *
   * Factored out of {@link send} so the opportunistic path stays reachable as a
   * fallback once DIRECT delivery became the default, and is unit-testable in
   * isolation.
   *
   * @param {Message} message
   * @param {Uint8Array} wireData - pre-serialized LXMF body (from
   *   `message.serialize`).
   * @param {{ solicit?: boolean, timeoutMs?: number }} [options]
   * @returns {Promise<void>}
   * @private
   */
  async _sendOpportunistic(message, wireData, options = {}) {
    const { solicit = true, timeoutMs = 3e4 } = options;
    const DESTINATION_LENGTH3 = Identity2.TRUNCATED_HASH_LENGTH;
    let peerIdentity = await this.rns.transport.recallIdentity(
      message.destinationHash
    );
    if (!peerIdentity && solicit && typeof this.rns.transport.recallOrSolicitIdentity === "function") {
      try {
        peerIdentity = await this.rns.transport.recallOrSolicitIdentity(
          message.destinationHash,
          timeoutMs
        );
      } catch {
      }
    }
    if (!peerIdentity) {
      throw new UnknownIdentityError(message.destinationHash);
    }
    const peerDestination = await Destination3.OUT(
      "lxmf.delivery",
      DestType3.SINGLE,
      peerIdentity,
      this.rns
    );
    const opportunisticPacket = new Packet({
      packetType: PacketType.DATA,
      contextFlag: true,
      contextByte: ContextType.NONE,
      destinationHash: message.destinationHash,
      destinationType: DestType3.SINGLE,
      transportType: 0,
      payload: wireData.subarray(DESTINATION_LENGTH3)
    });
    const receipt = await peerDestination.send(opportunisticPacket);
    if (receipt instanceof PacketReceipt) {
      const status = await receipt.whenSettled();
      if (status !== ReceiptStatus.DELIVERED) {
        throw new Error(
          `Opportunistic delivery to ${toHex4(
            message.destinationHash
          )} failed: no delivery proof was received from the recipient`
        );
      }
    }
  }
  /**
   * Requests a path to `destinationHash` and resolves once one is known (a
   * path-response announce was ingested), or after `timeoutMs` if no path
   * appears. Mirrors the Python reference's DIRECT delivery (path request +
   * wait): a link initiated with no known path
   * broadcasts its LINKREQUEST, which a multi-hop peer never receives.
   *
   * No-op (resolves `true` immediately) when a path is already known, or when
   * the transport lacks the path-discovery API (mock/test transports).
   *
   * @param {Uint8Array} destinationHash
   * @param {number} timeoutMs
   * @returns {Promise<boolean>} `true` if a path is known on return.
   * @private
   */
  async _requestAndAwaitPath(destinationHash, timeoutMs) {
    const transport = (
      /** @type {any} */
      this.rns?.transport
    );
    if (!transport) return false;
    const usablePath = () => typeof transport.hasPath === "function" && transport.hasPath(destinationHash) && !(typeof transport.pathIsUnresponsive === "function" && transport.pathIsUnresponsive(destinationHash));
    if (usablePath()) {
      return true;
    }
    if (typeof transport.requestPath !== "function") return false;
    const destHex = toHex4(destinationHash);
    log2(
      "LXMF",
      `No usable path to ${destHex}; requesting before DIRECT link`,
      LogLevel2.DEBUG
    );
    try {
      await transport.requestPath(destinationHash);
    } catch {
    }
    if (usablePath()) {
      return true;
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        transport.removeEventListener("announce", onAnnounce);
        resolve(result);
      };
      const onAnnounce = (ev) => {
        const dh = ev?.detail?.destinationHash;
        if (dh && toHex4(dh) === destHex && typeof transport.hasPath === "function" && transport.hasPath(destinationHash)) {
          finish(true);
        }
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      transport.addEventListener("announce", onAnnounce);
    });
  }
  /**
   * Establishes (or reuses a cached) DIRECT delivery link to an `lxmf.delivery`
   * destination (the Python reference's direct links).
   *
   * DIRECT delivery is the default outbound method in the Python reference and
   * the channel mobile LXMF clients listen on for replies. Returns the link, or
   * `null` when the recipient's identity is unknown or the handshake fails /
   * times out — the caller should then fall back to opportunistic delivery.
   *
   * @param {Uint8Array} destinationHash
   * @param {{ solicit?: boolean, timeoutMs?: number }} [options]
   * @returns {Promise<import("@reticulum/core").Link|null>}
   * @private
   */
  async _establishDirectLink(destinationHash, options = {}) {
    const { solicit = true, timeoutMs = DIRECT_LINK_TIMEOUT_MS } = options;
    const destHex = toHex4(destinationHash);
    const cached = this.directLinks.get(destHex);
    if (cached && cached.status === LinkStatus.ACTIVE) {
      return cached;
    }
    this.directLinks.delete(destHex);
    let peerIdentity = await this.rns.transport.recallIdentity(destinationHash);
    if (!peerIdentity && solicit && typeof this.rns.transport.recallOrSolicitIdentity === "function") {
      try {
        peerIdentity = await this.rns.transport.recallOrSolicitIdentity(
          destinationHash,
          timeoutMs
        );
      } catch {
      }
    }
    if (!peerIdentity) {
      log2(
        "LXMF",
        `Cannot establish DIRECT link: identity unknown for ${destHex}`,
        LogLevel2.DEBUG
      );
      return null;
    }
    await this._requestAndAwaitPath(destinationHash, PATH_REQUEST_WAIT_MS);
    try {
      const peerDestination = await Destination3.OUT(
        "lxmf.delivery",
        DestType3.SINGLE,
        peerIdentity,
        this.rns
      );
      const link = await Link.initiate(peerDestination, this.rns.transport);
      await link.whenActive(timeoutMs);
      link.bz2 = this.rns.compressionProvider || void 0;
      const newLinkKey = toHex4(link.linkId);
      link.addEventListener("statuschange", (ev) => {
        if (ev.detail.status === LinkStatus.CLOSED) {
          if (this.directLinks.get(destHex) === link) {
            this.directLinks.delete(destHex);
          }
          this.attachedLinks.delete(newLinkKey);
          this.identifiedLinks.delete(newLinkKey);
        }
      });
      this.directLinks.set(destHex, link);
      log2(
        "LXMF",
        `Established DIRECT delivery link to ${destHex}`,
        LogLevel2.DEBUG
      );
      return link;
    } catch (e) {
      log2(
        "LXMF",
        `DIRECT link to ${destHex} failed, falling back to opportunistic: ${e}`,
        LogLevel2.WARNING
      );
      const transport = (
        /** @type {any} */
        this.rns?.transport
      );
      try {
        transport?.routingTable?.expireRoute?.(destinationHash);
        await transport?.requestPathAuto?.(destinationHash);
      } catch {
      }
      return null;
    }
  }
  /**
   * Attaches the inbound `data` and `resource` listeners that feed
   * link-delivered LXMF messages through {@link _processIncomingMessage}.
   *
   * Called for both inbound (accepted) links and outbound delivery links we
   * initiate: an outbound link becomes a backchannel once we have sent over it
   * (Python calls `delivery_link_established` on outbound direct links), so
   * replies arriving on it are dispatched rather than silently dropped.
   *
   * @param {import("@reticulum/core").Link} link
   * @private
   */
  _attachLinkMessageListeners(link) {
    const expectedDestHash = this.deliveryDest?.destinationHash;
    if (!expectedDestHash) return;
    link.addEventListener("data", async (pktEvent) => {
      await this._processIncomingMessage(
        /** @type {any} */
        pktEvent.detail.packet.payload,
        pktEvent.detail.link,
        expectedDestHash
      );
    });
    link.addEventListener("resource", (resEvent) => {
      const resource = (
        /** @type {any} */
        resEvent.detail.resource
      );
      resource.whenComplete().then(() => {
        this._processIncomingMessage(
          /** @type {Uint8Array} */
          resource.data,
          link.linkId,
          expectedDestHash
        );
      }).catch((err) => {
        log2(
          "LXMF",
          `Incoming LXMF resource transfer failed: ${err}`,
          LogLevel2.ERROR
        );
      });
    });
  }
};
export {
  constants_exports as LXMFConstants,
  LXMPeer,
  LXMRouter,
  Message as LXMessage,
  stamper_exports as LXStamper,
  MessageStore,
  PeerState,
  PropagationNode,
  buildAnnounceAppData,
  buildPropagationNodeAppData,
  packPropagationContainer,
  parseAnnounceAppData,
  parsePropagationNodeAppData,
  unpackPropagationContainer
};
