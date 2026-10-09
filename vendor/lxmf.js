import { CORE_INSTANCE_TOKEN, ContextType, DestType, Destination, Identity, Link, LinkStatus, LogLevel, MsgPack, Packet, PacketReceipt, PacketType, ReceiptStatus, Resource, UnknownIdentityError, base64UrlToBytes, bytesToBase64Url, log, toHex, warnIfFragmented } from "./reticulum-core.js";
import { STAMP_SIZE, STAMP_SIZE as STAMP_SIZE$1, WORKBLOCK_EXPAND_ROUNDS, WORKBLOCK_EXPAND_ROUNDS_PEERING, WORKBLOCK_EXPAND_ROUNDS_PEERING as WORKBLOCK_EXPAND_ROUNDS_PEERING$1, WORKBLOCK_EXPAND_ROUNDS_PN, WORKBLOCK_EXPAND_ROUNDS_PN as WORKBLOCK_EXPAND_ROUNDS_PN$1, fullHash, generateStamp, stampValid, stampValid as stampValid$1, stampValue, stampValue as stampValue$1, stampWorkblock, stampWorkblock as stampWorkblock$1 } from "./reticulum-core.js";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@reticulum/lxmf/src/constants.js
var constants_exports = /* @__PURE__ */ __exportAll({
	ALL_MESSAGES: () => 0,
	AM_CODEC2_1200: () => 4,
	AM_CODEC2_1300: () => 5,
	AM_CODEC2_1400: () => 6,
	AM_CODEC2_1600: () => 7,
	AM_CODEC2_2400: () => 8,
	AM_CODEC2_3200: () => 9,
	AM_CODEC2_450: () => 2,
	AM_CODEC2_450PWB: () => 1,
	AM_CODEC2_700C: () => 3,
	AM_CUSTOM: () => 255,
	AM_OPUS_BROADCAST: () => 24,
	AM_OPUS_HQ: () => 23,
	AM_OPUS_LBW: () => 17,
	AM_OPUS_LOSSLESS: () => 25,
	AM_OPUS_MBW: () => 18,
	AM_OPUS_OGG: () => 16,
	AM_OPUS_PTT: () => 19,
	AM_OPUS_RT_FDX: () => 21,
	AM_OPUS_RT_HDX: () => 20,
	AM_OPUS_STANDARD: () => 22,
	APP_NAME: () => APP_NAME,
	COMMENT_FOR: () => 0,
	CONTINUATION_OF: () => 0,
	DEFAULT_SYNC_STRATEGY: () => 2,
	DELIVERY_LIMIT: () => DELIVERY_LIMIT,
	DeliveryMethod: () => DeliveryMethod,
	FIELD_AUDIO: () => 7,
	FIELD_COMMANDS: () => 9,
	FIELD_COMMENT: () => 65,
	FIELD_CONTINUATION: () => 66,
	FIELD_CUSTOM_DATA: () => 252,
	FIELD_CUSTOM_META: () => 253,
	FIELD_CUSTOM_TYPE: () => 251,
	FIELD_DEBUG: () => 255,
	FIELD_EMBEDDED_LXMS: () => 1,
	FIELD_EVENT: () => 13,
	FIELD_FILE_ATTACHMENTS: () => 5,
	FIELD_GROUP: () => 11,
	FIELD_ICON_APPEARANCE: () => 4,
	FIELD_IMAGE: () => 6,
	FIELD_NON_SPECIFIC: () => 254,
	FIELD_REACTION: () => 64,
	FIELD_RENDERER: () => 15,
	FIELD_REPLY_QUOTE: () => 49,
	FIELD_REPLY_TO: () => 48,
	FIELD_RESULTS: () => 10,
	FIELD_RNR_REFS: () => 14,
	FIELD_TELEMETRY: () => 2,
	FIELD_TELEMETRY_STREAM: () => 3,
	FIELD_THREAD: () => 8,
	FIELD_TICKET: () => 12,
	LXMF_OVERHEAD: () => 112,
	MAX_PEERING_COST: () => 26,
	MESSAGE_GET_PATH: () => MESSAGE_GET_PATH,
	OFFER_REQUEST_PATH: () => OFFER_REQUEST_PATH,
	PAPER_MDU: () => PAPER_MDU,
	PEERING_COST: () => 18,
	PEER_ERROR_INVALID_DATA: () => 244,
	PEER_ERROR_INVALID_KEY: () => 243,
	PEER_ERROR_INVALID_STAMP: () => 245,
	PEER_ERROR_NO_ACCESS: () => 241,
	PEER_ERROR_NO_IDENTITY: () => 240,
	PEER_ERROR_THROTTLED: () => 246,
	PN_META_AUTH_BAND: () => 4,
	PN_META_CUSTOM: () => 255,
	PN_META_NAME: () => 1,
	PN_META_SYNC_STRATUM: () => 2,
	PN_META_SYNC_THROTTLE: () => 3,
	PN_META_UTIL_PRESSURE: () => 5,
	PN_META_VERSION: () => 0,
	PROPAGATION_COST: () => 16,
	PROPAGATION_COST_FLEX: () => 3,
	PROPAGATION_COST_MIN: () => 13,
	PROPAGATION_LIMIT: () => 256,
	QR_MAX_STORAGE: () => QR_MAX_STORAGE,
	REACTION_CONTENT: () => 1,
	REACTION_TO: () => 0,
	RENDERER_BBCODE: () => 3,
	RENDERER_MARKDOWN: () => 2,
	RENDERER_MICRON: () => 1,
	RENDERER_PLAIN: () => 0,
	SF_COMPRESSION: () => 0,
	STAMP_SIZE: () => 32,
	SYNC_LIMIT: () => SYNC_LIMIT,
	SYNC_STRATEGY_LAZY: () => 1,
	SYNC_STRATEGY_PERSISTENT: () => 2,
	TransferState: () => TransferState,
	URI_SCHEMA: () => "lxm"
});
/**
* @module @reticulum/lxmf/src/constants.js
* @description LXMF field constants, audio modes, renderers, and related
*   specifiers. Mirrors `LXMF/LXMF.py` (verified against LXMF 1.0.1).
*/
/**
* Application name for the LXMF delivery destination.
*/
const APP_NAME = "lxmf";
/** Delivery via a single opportunistic encrypted packet (§5.1). */
const DeliveryMethod = Object.freeze({
	OPPORTUNISTIC: 1,
	DIRECT: 2,
	PROPAGATED: 3,
	PAPER: 5
});
/** Max raw byte capacity of an L-level QR code (qrcode lib, ERROR_CORRECT_L). */
const QR_MAX_STORAGE = 2953;
/**
* Maximum size (bytes) of a paper message's encrypted payload. Derived from the
* 6-bits-per-base64-char QR capacity minus the `lxm://` scheme prefix,
* matching the Python reference.
*/
const PAPER_MDU = Math.floor((QR_MAX_STORAGE - 6) * 6 / 8);
/** Node-to-node sync offer (peer mesh). Client→node submit uses a Resource. */
const OFFER_REQUEST_PATH = "/offer";
/** Client↔node message download: list, fetch, and purge-ack. */
const MESSAGE_GET_PATH = "/get";
/** Per-sync propagation limit (KB). */
const SYNC_LIMIT = 10240;
/** Per-delivery-transfer limit (KB) for direct/link downloads. */
const DELIVERY_LIMIT = 1e3;
/** Lifecycle states of a propagation transfer (`LXMRouter.py` `PR_*`). */
const TransferState = Object.freeze({
	IDLE: 0,
	PATH_REQUESTED: 1,
	LINK_ESTABLISHING: 2,
	LINK_ESTABLISHED: 3,
	REQUEST_SENT: 4,
	RECEIVING: 5,
	COMPLETE: 7,
	LINK_FAILED: 241
});
//#endregion
//#region node_modules/@reticulum/lxmf/src/announce_data.js
/**
* @file announce_data.js
* @description `lxmf.delivery` announce `app_data` msgpack format (SPEC §4.3).
*
* Current upstream announce app_data is a
* 3-element msgpack array:
*
*   [ display_name(bin8), stamp_cost(int|nil), [SF_COMPRESSION] ]
*
* Receivers MUST also tolerate the legacy 2-element, 1-element, and raw
* UTF-8 string shapes (matching the Python reference's display-name
* parsing).
*
* Canonical wire bytes for `display_name = "Reticulum5"`, `stamp_cost = nil`:
*
*   93                                 # fixarray, 3 elements
*   c4 0a 52 65 74 69 63 75 6c 75 6d 35 # bin8 len=10, "Reticulum5"
*   c0                                 # nil (stamp_cost)
*   91 00                              # fixarray(1): [SF_COMPRESSION]
*/
/**
* Builds the msgpack `app_data` blob for an `lxmf.delivery` announce.
*
* The display name is encoded as msgpack `bin` (0xc4), NOT `str`, matching
* upstream (§4.3 / §9.3). A `str`-encoded name breaks peer-name display in
* Sideband/Nomadnet/MeshChat because those clients read element 0 as bytes.
*
* @param {string} displayName - Human-readable node name.
* @param {number|null} [stampCost=null] - Active stamp cost (upstream emits
*   `nil` unless `1 ≤ N ≤ 254`); `null` signals stamping is disabled.
* @param {number[]} [supportedFunctions] - Capability flags; defaults to
*   `[SF_COMPRESSION]`.
* @returns {Uint8Array}
*/
function buildAnnounceAppData(displayName, stampCost = null, supportedFunctions = [0]) {
	const nameBin = new TextEncoder().encode(displayName);
	return MsgPack.encode([
		nameBin,
		stampCost,
		supportedFunctions
	]);
}
/**
* Parsed `lxmf.delivery` announce `app_data`.
*
* @typedef {Object} AnnounceAppData
* @property {string} displayName
* @property {number|null} stampCost
* @property {number[]} supportedFunctions
*/
/**
* Parses an `lxmf.delivery` announce `app_data` blob, tolerating all four
* legacy shapes documented in §4.3:
*   - 3-element array  `[name, stamp_cost, supported_functions]`
*   - 2-element array  `[name, stamp_cost]`
*   - 1-element array  `[name]`
*   - raw UTF-8 string ("original announce format")
*
* A missing capability list means compression support defaults to true for
* backward compatibility (§4.3).
*
* @param {Uint8Array|null|undefined} appData
* @returns {AnnounceAppData|null} `null` when appData is empty/absent or the
*   bytes are neither valid msgpack nor decodable UTF-8.
*/
function parseAnnounceAppData(appData) {
	if (!appData || appData.length === 0) return null;
	let msgpackValue;
	let msgpackOk = true;
	try {
		msgpackValue = MsgPack.decode(appData);
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
			supportedFunctions: [0]
		};
	} catch {
		return null;
	}
}
/**
* Normalises a decoded msgpack value into an {@link AnnounceAppData}.
*
* @param {unknown} decoded
* @returns {AnnounceAppData|null}
* @private
*/
function coerceAnnounceAppData(decoded) {
	if (Array.isArray(decoded)) return {
		displayName: decodeName(decoded[0]),
		stampCost: decodeStampCost(decoded[1]),
		supportedFunctions: Array.isArray(decoded[2]) ? decoded[2] : [0]
	};
	if (typeof decoded === "string") return {
		displayName: decoded,
		stampCost: null,
		supportedFunctions: [0]
	};
	if (decoded instanceof Uint8Array) return {
		displayName: new TextDecoder().decode(decoded),
		stampCost: null,
		supportedFunctions: [0]
	};
	return null;
}
/**
* Decodes the display-name element, which may be msgpack `bin` (Uint8Array)
* or `str` (string) depending on the sender.
*
* @param {unknown} value
* @returns {string}
* @private
*/
function decodeName(value) {
	if (typeof value === "string") return value;
	if (value instanceof Uint8Array) return new TextDecoder().decode(value);
	return "";
}
/**
* Decodes the stamp-cost element. Upstream only emits a non-`nil` value for
* `1 ≤ N ≤ 254`, but the parser is permissive (§4.3): any integer is returned
* as-is, everything else maps to `null` (stamping disabled).
*
* @param {unknown} value
* @returns {number|null}
* @private
*/
function decodeStampCost(value) {
	if (typeof value === "number" && Number.isInteger(value)) return value;
	return null;
}
/**
* Parsed propagation-node announce `app_data`.
*
* @typedef {Object} PropagationNodeAppData
* @property {number} timebase Node timebase (unix seconds).
* @property {boolean} nodeState Whether this instance acts as a propagation node.
* @property {number} perTransferLimitKb Per-transfer propagation limit (KB).
* @property {number} perSyncLimitKb Per-sync propagation limit (KB).
* @property {number} stampCost Required propagation stamp cost.
* @property {number} stampCostFlexibility Stamp cost flexibility.
* @property {number} peeringCost Peering cost.
* @property {string|null} name Optional operator node name.
*/
/**
* Builds the msgpack `app_data` blob for an `lxmf.propagation` announce.
*
* Wire layout (`LXMRouter.get_propagation_node_app_data`):
*
*   [ false,                    // 0: legacy LXMF PN support (always False)
*     timebase(int),            // 1: current node timebase
*     node_state(bool),         // 2: is a propagation node
*     per_transfer_limit(int),  // 3: KB
*     per_sync_limit(int),      // 4: KB
*     [cost, flex, peering],    // 5: stamp-cost triplet
*     metadata ]                // 6: {PN_META_NAME: bin} (integer keys)
*
* The metadata map uses **integer** keys to match upstream umsgpack, so it is
* built from a `Map` rather than a plain object.
*
* @param {Object} options
* @param {number} options.timebase
* @param {boolean} options.nodeState
* @param {number} options.perTransferLimitKb
* @param {number} options.perSyncLimitKb
* @param {number} options.stampCost
* @param {number} options.stampCostFlexibility
* @param {number} options.peeringCost
* @param {string|null} [options.name=null]
* @returns {Uint8Array}
*/
function buildPropagationNodeAppData({ timebase, nodeState, perTransferLimitKb, perSyncLimitKb, stampCost, stampCostFlexibility, peeringCost, name = null }) {
	/** @type {Map<number, Uint8Array>} */
	const metadata = /* @__PURE__ */ new Map();
	if (name) metadata.set(1, new TextEncoder().encode(name));
	return MsgPack.encode([
		false,
		Math.trunc(timebase),
		!!nodeState,
		perTransferLimitKb,
		perSyncLimitKb,
		[
			stampCost,
			stampCostFlexibility,
			peeringCost
		],
		metadata
	]);
}
/**
* Parses an `lxmf.propagation` announce `app_data` blob.
*
* Tolerates a missing/trailing metadata map. Returns `null` when the bytes are
* absent or not the expected 7-element `[bool, int, bool, int, int, [3 ints], map]`.
*
* @param {Uint8Array|null|undefined} bytes
* @returns {PropagationNodeAppData|null}
*/
function parsePropagationNodeAppData(bytes) {
	if (!bytes || bytes.length === 0) return null;
	let value;
	try {
		value = MsgPack.decode(bytes);
	} catch {
		return null;
	}
	if (!Array.isArray(value) || value.length < 7) return null;
	const num = (v, d = 0) => typeof v === "number" ? v : d;
	const costs = Array.isArray(value[5]) ? value[5] : [];
	const nameVal = (value[6] && typeof value[6] === "object" ? value[6] : {})[String(1)];
	let name = null;
	if (typeof nameVal === "string") name = nameVal;
	else if (nameVal instanceof Uint8Array) name = new TextDecoder().decode(nameVal);
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
//#endregion
//#region node_modules/@reticulum/lxmf/src/message.js
/**
* @file message.js
* @description LXMF Message serialization and construction.
*
* Wire format (§5.2 / §5.1):
*   direct:         destination_hash(16) || source_hash(16) || signature(64) || msgpack_payload
*   opportunistic:  source_hash(16) || signature(64) || msgpack_payload
*                   (the outer Reticulum packet's dest_hash conveys the recipient)
*
* msgpack_payload (§5.3) is a 4-element array, with an optional 5th stamp:
*   [timestamp(double), title(bin), content(bin), fields(map)] [, stamp(bin 32)]
*
* Signature (§5.5) is ALWAYS computed over the 4-element payload — the stamp
* is appended afterwards and stripped by the receiver before hashing.
*/
const DESTINATION_LENGTH$1 = Identity.TRUNCATED_HASH_LENGTH;
const SIGNATURE_LENGTH = 64;
/**
* Packs the LXMF msgpack payload with canonical umsgpack encoding:
* timestamp always float64, title/content always bin, stamp optional.
*
* Used both for outbound serialization and for the stamp-stripping re-encode
* on receive (§5.6.1). `title`/`content` may be a string (UTF-8 → bin) or a
* Uint8Array (already bin).
*
* @param {number} timestamp
* @param {string|Uint8Array} title
* @param {string|Uint8Array} content
* @param {Record<string, any>|Map<any, any>} fields
* @param {Uint8Array|null} [stamp]
* @returns {Uint8Array}
*/
function packPayload(timestamp, title, content, fields, stamp) {
	const timestampBytes = MsgPack.encodeFloat64(timestamp);
	const toBin = (v) => v instanceof Uint8Array ? MsgPack.encode(v) : MsgPack.encode(new Uint8Array(new TextEncoder().encode(v ?? "")));
	/** @type {Uint8Array[]} */
	const elements = [
		timestampBytes,
		toBin(title),
		toBin(content),
		MsgPack.encode(fields ?? {})
	];
	if (stamp != null) elements.push(MsgPack.encode(stamp));
	const nelem = elements.length;
	/** @type {number[]} */
	let header;
	if (nelem <= 15) header = [144 | nelem];
	else if (nelem <= 65535) header = [
		220,
		nelem >> 8 & 255,
		nelem & 255
	];
	else header = [
		221,
		nelem >> 24 & 255,
		nelem >> 16 & 255,
		nelem >> 8 & 255,
		nelem & 255
	];
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
/**
* Computes SHA-256 of the input.
* @param {Uint8Array} data
* @returns {Promise<Uint8Array>}
*/
async function fullHash$1(data) {
	const digest = await crypto.subtle.digest("SHA-256", data);
	return new Uint8Array(digest);
}
/**
* Represents an LXMF message.
*/
var Message = class Message {
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
	constructor({ sourceHash, destinationHash, timestamp, title, content, fields, signature, signedPart, stamp, messageId }) {
		this.sourceHash = sourceHash;
		this.destinationHash = destinationHash;
		this.timestamp = timestamp || Date.now() / 1e3;
		this.title = title;
		this.content = content;
		this.fields = fields || {};
		this.signature = signature;
		this.signedPart = signedPart;
		/** @type {Uint8Array|null} */
		this.stamp = stamp ?? null;
		/** @type {Uint8Array|null} LXMF message_id = SHA256(dest||src||payload). */
		this.messageId = messageId ?? null;
		/** @type {any[]|null} */
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
		const packedPayload4 = packPayload(this.timestamp, this.title ?? "", this.content ?? "", this.fields, null);
		const hashedPart = new Uint8Array(DESTINATION_LENGTH$1 + DESTINATION_LENGTH$1 + packedPayload4.length);
		hashedPart.set(this.destinationHash, 0);
		hashedPart.set(sourceHash, DESTINATION_LENGTH$1);
		hashedPart.set(packedPayload4, 2 * DESTINATION_LENGTH$1);
		const messageId = await fullHash$1(hashedPart);
		const signedPart = new Uint8Array(hashedPart.length + messageId.length);
		signedPart.set(hashedPart, 0);
		signedPart.set(messageId, hashedPart.length);
		const signature = await sourceIdentity.sign(signedPart);
		const packedPayload = this.stamp != null ? packPayload(this.timestamp, this.title ?? "", this.content ?? "", this.fields, this.stamp) : packedPayload4;
		const wireData = new Uint8Array(2 * DESTINATION_LENGTH$1 + SIGNATURE_LENGTH + packedPayload.length);
		wireData.set(this.destinationHash, 0);
		wireData.set(sourceHash, DESTINATION_LENGTH$1);
		wireData.set(signature, 2 * DESTINATION_LENGTH$1);
		wireData.set(packedPayload, 2 * DESTINATION_LENGTH$1 + SIGNATURE_LENGTH);
		this.messageId = messageId;
		this.signature = signature;
		this.signedPart = signedPart;
		return {
			messageId,
			wireData
		};
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
		if (wireData.length >= 80 + DESTINATION_LENGTH$1 && (!expectedDestinationHash || wireData.subarray(0, DESTINATION_LENGTH$1).every((v, i) => v === expectedDestinationHash[i]))) {
			destinationHash = wireData.slice(0, DESTINATION_LENGTH$1);
			sourceHash = wireData.slice(DESTINATION_LENGTH$1, 2 * DESTINATION_LENGTH$1);
			signature = wireData.slice(2 * DESTINATION_LENGTH$1, 2 * DESTINATION_LENGTH$1 + SIGNATURE_LENGTH);
			rawPayload = wireData.slice(2 * DESTINATION_LENGTH$1 + SIGNATURE_LENGTH);
		} else if (wireData.length >= DESTINATION_LENGTH$1 + SIGNATURE_LENGTH) {
			sourceHash = wireData.slice(0, DESTINATION_LENGTH$1);
			signature = wireData.slice(DESTINATION_LENGTH$1, DESTINATION_LENGTH$1 + SIGNATURE_LENGTH);
			rawPayload = wireData.slice(DESTINATION_LENGTH$1 + SIGNATURE_LENGTH);
			destinationHash = expectedDestinationHash;
		} else throw new Error("LXMF message too short or format unrecognized");
		if (!destinationHash) throw new Error("Could not determine destination hash for LXMF message");
		const decodedPayload = MsgPack.decode(rawPayload);
		if (!Array.isArray(decodedPayload) || decodedPayload.length < 4) throw new Error("Invalid LXMF payload format: Expected 4-element MessagePack array");
		let stamp = null;
		/** @type {Uint8Array} */
		let packedPayload = rawPayload;
		if (decodedPayload.length > 4) {
			stamp = decodedPayload[4];
			packedPayload = packPayload(decodedPayload[0], decodedPayload[1], decodedPayload[2], decodedPayload[3], null);
		}
		const hashedPart = new Uint8Array(2 * DESTINATION_LENGTH$1 + packedPayload.length);
		hashedPart.set(destinationHash, 0);
		hashedPart.set(sourceHash, DESTINATION_LENGTH$1);
		hashedPart.set(packedPayload, 2 * DESTINATION_LENGTH$1);
		const messageId = await fullHash$1(hashedPart);
		const signedPart = new Uint8Array(hashedPart.length + messageId.length);
		signedPart.set(hashedPart, 0);
		signedPart.set(messageId, hashedPart.length);
		const [timestamp, titleBytes, contentBytes, fields] = decodedPayload;
		const content = contentBytes instanceof Uint8Array ? new TextDecoder().decode(contentBytes) : contentBytes;
		const title = titleBytes instanceof Uint8Array ? new TextDecoder().decode(titleBytes) : titleBytes;
		const message = new Message({
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
		if (await identity.validate(this.signature, this.signedPart)) return true;
		if (this._decodedPayload) {
			const repacked = packPayload(this._decodedPayload[0], this._decodedPayload[1], this._decodedPayload[2], this._decodedPayload[3], null);
			if (!this.destinationHash || !this.sourceHash) return false;
			const hashedPart = new Uint8Array(2 * DESTINATION_LENGTH$1 + repacked.length);
			hashedPart.set(this.destinationHash, 0);
			hashedPart.set(this.sourceHash, DESTINATION_LENGTH$1);
			hashedPart.set(repacked, 2 * DESTINATION_LENGTH$1);
			const messageId = await fullHash$1(hashedPart);
			const signedPart2 = new Uint8Array(hashedPart.length + messageId.length);
			signedPart2.set(hashedPart, 0);
			signedPart2.set(messageId, hashedPart.length);
			if (await identity.validate(this.signature, signedPart2)) return true;
		}
		return false;
	}
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
		const encrypted = await outboundDestination.encrypt(wireData.subarray(DESTINATION_LENGTH$1));
		const lxmfData = new Uint8Array(DESTINATION_LENGTH$1 + encrypted.length);
		lxmfData.set(wireData.subarray(0, DESTINATION_LENGTH$1), 0);
		lxmfData.set(encrypted, DESTINATION_LENGTH$1);
		return {
			lxmfData,
			transientId: await Message.transientIdFromPropagationData(lxmfData),
			wireData
		};
	}
	/**
	* Computes the propagation dedup key `transient_id = SHA-256(lxmf_data)`
	* (LXMRouter.lxmf_propagation). Identical on both client and node.
	*
	* @param {Uint8Array} lxmfData
	* @returns {Promise<Uint8Array>}
	*/
	static async transientIdFromPropagationData(lxmfData) {
		return await fullHash$1(lxmfData);
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
		if (!lxmfData || lxmfData.length < DESTINATION_LENGTH$1) return null;
		const destinationHash = lxmfData.subarray(0, DESTINATION_LENGTH$1);
		const encrypted = lxmfData.subarray(DESTINATION_LENGTH$1);
		const decrypted = await deliveryDestination.decrypt(encrypted);
		if (!decrypted) return null;
		const wireData = new Uint8Array(DESTINATION_LENGTH$1 + decrypted.length);
		wireData.set(destinationHash, 0);
		wireData.set(decrypted, DESTINATION_LENGTH$1);
		return await Message.deserialize(wireData, destinationHash);
	}
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
		const { lxmfData, transientId, wireData } = await this.toPropagationData(sourceIdentity, outboundDestination);
		if (lxmfData.length > PAPER_MDU) throw new TypeError(`LXMF paper delivery requested, but content of ${lxmfData.length} bytes exceeds the paper message maximum of ${PAPER_MDU} bytes.`);
		return {
			paperData: lxmfData,
			transientId,
			wireData
		};
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
		const { paperData } = await this.toPaperData(sourceIdentity, outboundDestination);
		return Message.paperDataToUri(paperData);
	}
	/**
	* Formats raw paper data as an `lxm://` URI.
	*
	* @param {Uint8Array} paperData
	* @returns {string}
	*/
	static paperDataToUri(paperData) {
		return `lxm://${bytesToBase64Url(paperData)}`;
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
		if (typeof uri !== "string") throw new TypeError("paperDataFromUri expects a string URI");
		const prefix = `lxm://`;
		if (!uri.toLowerCase().startsWith(prefix)) throw new Error(`Not an LXMF paper URI: expected the '${prefix}' scheme prefix`);
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
		return await Message.fromPropagationData(paperData, deliveryDestination);
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
		return await Message.fromPaperData(Message.paperDataFromUri(uri), deliveryDestination);
	}
};
//#endregion
//#region node_modules/@reticulum/lxmf/src/message_store.js
/**
* @module @reticulum/lxmf/src/message_store.js
* @description In-memory store for propagated LXMF messages on a propagation
*   node (the Python reference's propagation store).
*
* Entries are keyed by `transient_id = SHA-256(lxmf_data)` and serve the
* client `/get` exchange: list available
* transient_ids for a recipient, fetch their base `lxmf_data`, and purge
* acknowledged ones. All ownership checks (a client may only touch messages
* addressed to it) mirror the Python reference's per-recipient filter.
*/
/**
* A stored propagated message.
*
* @typedef {Object} PropagationEntry
* @property {Uint8Array} transientId SHA-256(lxmfData) — the dedup/store key.
* @property {Uint8Array} destinationHash Recipient `lxmf.delivery` hash (16B).
* @property {Uint8Array} lxmfData Base propagation form (stamp stripped).
* @property {Uint8Array} stampData The trailing 32-byte stamp, preserved.
* @property {number} received Unix seconds when stored.
* @property {number} stampValue Stamp proof-of-work value.
* @property {number} size Stored byte size (lxmfData + stamp).
* @property {Set<string>} handledPeers hex peer hashes that already hold this message.
* @property {Set<string>} unhandledPeers hex peer hashes still needing this message.
*/
/** Seconds per 4-day age-weight unit, matching the Python reference. */
const AGE_WEIGHT_UNIT = 3600 * 24 * 4;
/** Default TTL: none (messages live until the byte cap evicts them), matching
* the Python reference, which has no message-age TTL — only a byte limit. */
const DEFAULT_MESSAGE_TTL_SECS = null;
/**
* Transfer weight used to order a sync offer, matching the Python reference:
* `priority * max(1, age/4days) * size`, ascending. There is no prioritised
* list yet, so priority is always 1.0. Reused for capacity eviction (where the
* *highest*-weight entries are culled first, matching the Python reference).
*
* @param {PropagationEntry} entry
* @returns {number}
*/
function weightOf(entry) {
	return Math.max(1, (Date.now() / 1e3 - entry.received) / AGE_WEIGHT_UNIT) * entry.size;
}
/**
* Options for {@link MessageStore}.
*
* @typedef {Object} MessageStoreOptions
* @property {number|null} [storageLimitBytes] Byte cap; when set, the
*   highest-weight entries are evicted after an add to stay under it.
*   `null` = unlimited.
* @property {number|null} [messageTtlSecs] Age TTL; entries older than this are
*   pruned by {@link MessageStore#prune}. `null` = no age TTL (default; the
*   Python reference relies on the byte cap alone).
*/
/**
* In-memory store for propagated LXMF messages on a propagation node, keyed by
* `transient_id = SHA-256(lxmf_data)`. Serves the client `/get` exchange
* (list/fetch/purge-acknowledged) and enforces a byte cap plus an optional age
* TTL (mirrors `LXMRouter.propagation_entries` / `clean_messages`).
*/
var MessageStore = class {
	/**
	* @param {MessageStoreOptions} [options]
	*/
	constructor({ storageLimitBytes = null, messageTtlSecs = null } = {}) {
		/** @type {Map<string, PropagationEntry>} keyed by hex(transientId). */
		this._entries = /* @__PURE__ */ new Map();
		/** @type {number|null} */
		this.storageLimitBytes = storageLimitBytes;
		/** @type {number|null} */
		this.messageTtlSecs = messageTtlSecs ?? DEFAULT_MESSAGE_TTL_SECS;
		/** Running total of stored bytes (sum of `entry.size`). */
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
		/** @type {{key: string, entry: PropagationEntry, weight: number}[]} */
		const ranked = [];
		for (const [key, entry] of this._entries) ranked.push({
			key,
			entry,
			weight: weightOf(entry)
		});
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
			for (const [key, entry] of this._entries) if (entry.received < cutoff) {
				this._entries.delete(key);
				this._totalBytes -= entry.size;
				aged++;
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
		/** @type {PropagationEntry[]} */
		const matching = [];
		for (const e of this._entries.values()) if (toHex(e.destinationHash) === hex) matching.push(e);
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
		for (const e of this._entries.values()) if (!e.unhandledPeers.has(hex)) {
			e.unhandledPeers.add(hex);
			e.handledPeers.delete(hex);
			count++;
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
		/** @type {{transientId: Uint8Array, weight: number, size: number, entry: PropagationEntry}[]} */
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
		/** @type {any[]} */
		const out = [];
		for (const e of this._entries.values()) out.push({
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
//#endregion
//#region node_modules/@reticulum/lxmf/src/propagation.js
/**
* @file propagation.js
* @description LXMF propagation submit/sync container packing (§5.3).
*
* When a client submits messages to a propagation node — or peers sync — the
* payload sent over the link is the propagation-packed container (matching
* the Python reference):
*
*   msgpack([ send_time_float, [ lxmf_data, ... ] ])
*
* Each `lxmf_data` is the per-message propagation form produced by
* {@link Message.toPropagationData}. The node unpacks this in
* `LXMRouter.propagation_resource_concluded` and ingests each entry via
* `lxmf_propagation`.
*/
/**
* Parsed propagation container.
*
* @typedef {Object} PropagationContainer
* @property {number} sendTime Originator send time (unix seconds, float).
* @property {Uint8Array[]} messages List of `lxmf_data` blobs.
*/
/**
* Packs a propagation submit/sync container: `msgpack([sendTime, [lxmfData...]])`.
*
* @param {Uint8Array[]} lxmfDataList One or more `lxmf_data` blobs.
* @param {number} [sendTime=Date.now()/1000] Originator send time (unix sec).
* @returns {Uint8Array}
*/
function packPropagationContainer(lxmfDataList, sendTime = Date.now() / 1e3) {
	return MsgPack.encode([sendTime, lxmfDataList]);
}
/**
* Unpacks a propagation submit/sync container.
*
* @param {Uint8Array} bytes
* @returns {PropagationContainer|null} `null` if the bytes are not the
*   expected `[float, [bin...]]` shape.
*/
function unpackPropagationContainer(bytes) {
	let value;
	try {
		value = MsgPack.decode(bytes);
	} catch {
		return null;
	}
	if (!Array.isArray(value) || value.length < 2) return null;
	return {
		sendTime: typeof value[0] === "number" ? value[0] : 0,
		messages: Array.isArray(value[1]) ? value[1] : []
	};
}
//#endregion
//#region node_modules/@reticulum/lxmf/src/stamper.js
/**
* @file stamper.js
* @description LXMF-specific proof-of-work stamp validators, mirroring
*   `LXMF/LXStamper.py` (verified against LXMF 1.0.1).
*
*   The generic stamp primitives (workblock expansion, value search,
*   validation, generation) live in `@reticulum/core`'s
*   `utils/stamper.js` — they are shared with rfed and interface discovery —
*   and are re-exported here so the `LXStamper` namespace keeps its
*   historical shape. What stays in this module are the validators that
*   understand LXMF wire formats: propagation-node peering keys and
*   propagation blobs.
*/
var stamper_exports = /* @__PURE__ */ __exportAll({
	STAMP_SIZE: () => STAMP_SIZE$1,
	WORKBLOCK_EXPAND_ROUNDS: () => WORKBLOCK_EXPAND_ROUNDS,
	WORKBLOCK_EXPAND_ROUNDS_PEERING: () => WORKBLOCK_EXPAND_ROUNDS_PEERING$1,
	WORKBLOCK_EXPAND_ROUNDS_PN: () => WORKBLOCK_EXPAND_ROUNDS_PN$1,
	generateStamp: () => generateStamp,
	stampValid: () => stampValid$1,
	stampValue: () => stampValue$1,
	stampWorkblock: () => stampWorkblock$1,
	validatePeeringKey: () => validatePeeringKey,
	validatePnStamp: () => validatePnStamp,
	validatePnStamps: () => validatePnStamps
});
/**
* Validates a peering key between two propagation nodes (§5.8.4).
*
* The peering_id is `receiving_identity.hash || offering_identity.hash`
* (32 bytes), and the workblock uses the cheaper peering expansion rounds.
*
* @param {Uint8Array} peeringId - `receiving_hash || offering_hash` (32 bytes).
* @param {Uint8Array} peeringKey - The 32-byte candidate peering key.
* @param {number} targetCost - Required leading zero bits.
* @returns {Promise<boolean>}
*/
async function validatePeeringKey(peeringId, peeringKey, targetCost) {
	return stampValid(peeringKey, targetCost, await stampWorkblock(peeringId, WORKBLOCK_EXPAND_ROUNDS_PEERING));
}
/**
* A propagation blob split into its base `lxmf_data` and the trailing stamp,
* with the derived `transient_id` and validated stamp value.
*
* @typedef {Object} ValidatedPnStamp
* @property {Uint8Array} transientId SHA-256(lxmfData) — the store/dedup key.
* @property {Uint8Array} lxmfData Base `dest_hash || E(...)` (stamp stripped).
* @property {Uint8Array} stampData The trailing 32-byte stamp.
* @property {number} stampValue Leading-zero-bit value of the stamp.
*/
/**
* Validates a single propagation-node stamp from a received propagation blob
* (`LXStamper.validate_pn_stamp`). The blob is `lxmf_data || stamp`; the
* trailing {@link STAMP_SIZE} bytes are the stamp and `transient_id` is
* SHA-256 over the base `lxmf_data` (so it is stable across stamp changes).
*
* @param {Uint8Array} transientData The propagation blob (lxmf_data + stamp).
* @param {number} targetCost Minimum required stamp value (leading zero bits).
* @returns {Promise<ValidatedPnStamp|null>} `null` when the blob is too short
*   or the stamp does not meet `targetCost`.
*/
async function validatePnStamp(transientData, targetCost) {
	if (transientData.length <= 112 + STAMP_SIZE) return null;
	const lxmfData = transientData.subarray(0, transientData.length - STAMP_SIZE);
	const stampData = transientData.subarray(transientData.length - STAMP_SIZE);
	const transientId = await fullHash(lxmfData);
	const workblock = await stampWorkblock(transientId, WORKBLOCK_EXPAND_ROUNDS_PN);
	if (!await stampValid(stampData, targetCost, workblock)) return null;
	return {
		transientId,
		lxmfData,
		stampData,
		stampValue: await stampValue(workblock, stampData)
	};
}
/**
* Validates a list of propagation blobs (`LXStamper.validate_pn_stamps`),
* dropping any whose stamp is missing or below `targetCost`.
*
* @param {Uint8Array[]} transientList
* @param {number} targetCost
* @returns {Promise<ValidatedPnStamp[]>}
*/
async function validatePnStamps(transientList, targetCost) {
	/** @type {ValidatedPnStamp[]} */
	const out = [];
	for (const td of transientList) {
		const v = await validatePnStamp(td, targetCost);
		if (v) out.push(v);
	}
	return out;
}
//#endregion
//#region node_modules/@reticulum/lxmf/src/peer.js
/**
* @file peer.js
* @description Outbound side of the LXMF propagation peer-mesh sync
*   (§5.8.4 / `LXMF/LXMPeer.py`). An {@link LXMPeer} drives a single
*   one-way sync from this node to a peered propagation node: it presents a
*   peering key, offers the messages the peer does not yet have, and transfers
*   the ones it wants as a Resource (the same `msgpack([time,[lxmf_data‖stamp]])`
*   container format used for client submits).
*
*   Peer state (handled/unhandled message sets) lives on the shared
*   {@link MessageStore}; this class only owns the sync state machine and the
*   per-peer peering key + statistics. There is no background worker thread —
*   {@link LXMRouter.syncPeers} drives `sync()` explicitly.
*/
/**
* Sync state machine (mirrors `LXMPeer.IDLE … RESOURCE_TRANSFERRING`).
* @enum {number}
*/
const PeerState = Object.freeze({
	IDLE: 0,
	LINK_ESTABLISHING: 1,
	LINK_READY: 2,
	REQUEST_SENT: 3,
	RESPONSE_RECEIVED: 4,
	RESOURCE_TRANSFERRING: 5
});
/** Concatenates two byte arrays. @param {Uint8Array} a @param {Uint8Array} b */
function concat(a, b) {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}
/**
* A peering relationship with another propagation node. One-way sync driver.
*/
var LXMPeer = class {
	/**
	* @param {import("./router.js").LXMRouter} router
	* @param {Uint8Array} destinationHash Peer's `lxmf.propagation` dest hash.
	* @param {number} [syncStrategy] {@link DEFAULT_SYNC_STRATEGY}.
	*/
	constructor(router, destinationHash, syncStrategy = 2) {
		this.router = router;
		this.destinationHash = destinationHash;
		this.alive = false;
		this.lastHeard = 0;
		this.syncStrategy = syncStrategy;
		this.peeringKey = null;
		/** @type {number|null} */
		this.peeringCost = null;
		/** @type {number|null} */
		this.propagationStampCost = null;
		/** @type {number|null} */
		this.propagationStampCostFlexibility = null;
		/** Per-message transfer limit (KB). @type {number|null} */
		this.propagationTransferLimit = null;
		/** Per-sync cumulative limit (KB). @type {number|null} */
		this.propagationSyncLimit = null;
		/** @type {Map<number, Uint8Array>|null} */
		this.metadata = null;
		/** @type {import("@reticulum/core").Link|null} */
		this.link = null;
		/** @type {number} */
		this.state = PeerState.IDLE;
		/** @type {Uint8Array[]} transient_ids carried by the last offer. */
		this.lastOffer = [];
		this.offered = 0;
		this.outgoing = 0;
		this.incoming = 0;
	}
	/** Human-readable identifier. */
	get id() {
		return toHex(this.destinationHash);
	}
	/**
	* Whether a peering key of sufficient value has been generated for this peer.
	* @returns {boolean}
	*/
	peeringKeyReady() {
		if (this.peeringCost == null) return false;
		if (Array.isArray(this.peeringKey) && this.peeringKey.length === 2) {
			if (this.peeringKey[1] >= this.peeringCost) return true;
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
		const peerIdentity = await this.router.rns.transport.recallIdentity(this.destinationHash);
		if (!peerIdentity) {
			log("LXMF", `Cannot generate peering key for ${this.id}: peer identity unknown`, LogLevel.ERROR);
			return false;
		}
		const localHash = this.router.identity.identityHash;
		const material = new Uint8Array(peerIdentity.identityHash.length + localHash.length);
		material.set(peerIdentity.identityHash, 0);
		material.set(localHash, peerIdentity.identityHash.length);
		const [peeringKey, value] = await generateStamp(material, this.peeringCost, WORKBLOCK_EXPAND_ROUNDS_PEERING$1);
		if (value >= this.peeringCost) {
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
				log("LXMF", `Postponing sync with peer ${this.id}: peering key not ready`, LogLevel.DEBUG);
				return false;
			}
		}
		const store = this.router.propagationNode?.store;
		if (!store) return false;
		const minAccepted = Math.max(0, (this.propagationStampCost ?? 0) - (this.propagationStampCostFlexibility ?? 0));
		const unhandled = store.unhandledEntriesForPeer(this.destinationHash, minAccepted);
		if (unhandled.length === 0) {
			log("LXMF", `No unhandled messages for peer ${this.id}`, LogLevel.DEBUG);
			return false;
		}
		const peerIdentity = await this.router.rns.transport.recallIdentity(this.destinationHash);
		if (!peerIdentity) return false;
		const peerDest = await Destination.OUT("lxmf.propagation", DestType.SINGLE, peerIdentity, this.router.rns);
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
			if (this.propagationSyncLimit != null && cumulative + transferSize >= this.propagationSyncLimit * 1e3) continue;
			cumulative += transferSize;
			offeredIds.push(u.transientId);
		}
		if (offeredIds.length === 0) {
			this._teardown();
			return false;
		}
		const offer = [this.peeringKey[0], offeredIds];
		this.lastOffer = offeredIds;
		this.state = PeerState.REQUEST_SENT;
		log("LXMF", `Offering ${offeredIds.length} message(s) to peer ${this.id}`, LogLevel.DEBUG);
		const response = await this.link.request(OFFER_REQUEST_PATH, offer);
		const wanted = this._interpretOfferResponse(response, store);
		if (wanted.length === 0) {
			log("LXMF", `Peer ${this.id} did not request any messages; sync complete`, LogLevel.DEBUG);
			this.offered += offeredIds.length;
			this._teardown();
			return false;
		}
		/** @type {Uint8Array[]} */
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
		for (const tid of wanted) store.markHandledForPeer(tid, this.destinationHash);
		this.offered += offeredIds.length;
		this.outgoing += wanted.length;
		this.alive = true;
		this.lastHeard = Date.now() / 1e3;
		log("LXMF", `Transferred ${wanted.length} message(s) to peer ${this.id}`, LogLevel.DEBUG);
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
			for (const tid of this.lastOffer) store.markHandledForPeer(tid, this.destinationHash);
			return [];
		}
		if (response === true) return [...this.lastOffer];
		if (Array.isArray(response)) {
			const set = new Set(response.map((t) => toHex(t)));
			for (const tid of this.lastOffer) if (!set.has(toHex(tid))) store.markHandledForPeer(tid, this.destinationHash);
			return response;
		}
		log("LXMF", `Peer ${this.id} offer error/unexpected response: ${response}`, LogLevel.DEBUG);
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
		if (name instanceof Uint8Array) try {
			return new TextDecoder().decode(name);
		} catch {
			return null;
		}
		return null;
	}
};
//#endregion
//#region node_modules/@reticulum/lxmf/src/propagation_node.js
/**
* @file propagation_node.js
* @description Server side of the LXMF propagation protocol (§5.3): a node that
*   stores propagated messages and serves them to clients over the `/get`
*   request exchange (`LXMRouter.message_get_request` / `lxmf_propagation`).
*
* This module holds the protocol logic (store + stamp validation + ingestion +
* the `/get` request handler) decoupled from the transport, so it is unit-
* testable. The owning {@link LXMRouter} wires it to the `lxmf.propagation`
* destination's request handler and Resource-receive path.
*/
const DESTINATION_LENGTH = 16;
/**
* @typedef {Object} PropagationNodeOptions
* @property {number} [stampCost] Required propagation stamp cost.
* @property {number} [stampCostFlexibility] Stamp cost flexibility.
* @property {number} [perTransferLimitKb] Per-transfer limit (KB) advertised.
* @property {number} [perSyncLimitKb] Per-sync limit (KB) advertised.
* @property {number} [peeringCost] Peering cost advertised.
* @property {string|null} [name] Operator node name (announce metadata).
* @property {boolean} [nodeState] Whether this node is actively serving.
* @property {number|null} [storageLimitBytes] Stored-message byte cap; when
*   set, the highest-weight entries are evicted to stay under it.
*   `null` = unlimited.
* @property {number|null} [messageTtlSecs] Stored-message age TTL; entries
*   older than this are pruned by {@link PropagationNode#tickMaintenance}.
*   `null` = no age TTL (default; the Python reference relies on the byte cap).
* @property {import("./message_store.js").MessageStore} [store] Pre-built store
*   to adopt (e.g. loaded from disk by a runner) instead of a fresh one.
* @property {(identity: import("@reticulum/core").Identity) => boolean} [identityAllowed]
*   Access control; defaults to allow all (open node).
* @property {() => Uint8Array} [getLocalIdentityHash]
*   Returns this node's own 16-byte identity hash, used to build the peering_id
*   for `/offer` peering-key validation.
* @property {(destinationHash: Uint8Array) => (import("@reticulum/core").Destination|null)} [getDeliveryDestination]
*   Resolves a recipient hash to the local inbound `lxmf.delivery` destination,
*   for local delivery of messages addressed to this node's own identities.
*   Returns null when the recipient is not local.
* @property {(message: Message, transientId: Uint8Array) => void|Promise<void>} [onLocalDelivery]
*   Invoked when a propagated message addressed to a local identity decrypts.
* @property {(storedIds: Uint8Array[]) => void} [onStored]
*   Invoked with the transient_ids newly stored by {@link ingestBlobs}. The
*   owning router uses this to queue the messages for distribution to peered
*   propagation nodes (`flush_peer_distribution_queue`), so the peer-mesh sync
*   offers them on its next pass. Wiring it here (rather than at each call
*   site) guarantees that every ingest path — link Resources, in-process
*   embedded-node submits, paper-message ingestion — distributes identically.
*/
/**
* Server-side propagation logic. Owns the {@link MessageStore} and implements
* the `/get` request-response exchange and the ingestion of submitted blobs.
*/
var PropagationNode = class {
	/**
	* @param {PropagationNodeOptions} [options]
	*/
	constructor(options = {}) {
		/** @type {MessageStore} */
		this.store = options.store ?? new MessageStore({
			storageLimitBytes: options.storageLimitBytes ?? null,
			messageTtlSecs: options.messageTtlSecs ?? null
		});
		this.stampCost = options.stampCost ?? 16;
		this.stampCostFlexibility = options.stampCostFlexibility ?? 3;
		this.perTransferLimitKb = options.perTransferLimitKb ?? 256;
		this.perSyncLimitKb = options.perSyncLimitKb ?? 10240;
		this.peeringCost = options.peeringCost ?? 18;
		this.name = options.name ?? null;
		this.nodeState = options.nodeState ?? true;
		this.identityAllowed = options.identityAllowed ?? (() => true);
		this.getDeliveryDestination = options.getDeliveryDestination ?? (() => null);
		this.onLocalDelivery = options.onLocalDelivery ?? (() => {});
		this.onStored = options.onStored ?? (() => {});
		this.getLocalIdentityHash = options.getLocalIdentityHash ?? (() => /* @__PURE__ */ new Uint8Array(0));
		/** @type {Set<string>} hex(transientId) already processed (dedup). */
		this.locallyProcessed = /* @__PURE__ */ new Set();
		/** @type {Set<string>} hex(transientId) delivered to a local identity. */
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
		const validated = await validatePnStamps(transientList, this.minAcceptedCost());
		const rejected = transientList.length - validated.length;
		let stored = 0;
		let delivered = 0;
		/** @type {Uint8Array[]} */
		const storedIds = [];
		for (const v of validated) {
			const key = toHex(v.transientId);
			if (this.store.has(v.transientId) || this.locallyProcessed.has(key)) continue;
			this.locallyProcessed.add(key);
			const destinationHash = v.lxmfData.subarray(0, DESTINATION_LENGTH);
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
		return {
			stored,
			delivered,
			rejected,
			storedIds
		};
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
		if (!remoteIdentity) return 240;
		if (!this.identityAllowed(remoteIdentity)) return 241;
		if (!Array.isArray(data) || data.length < 2) return 244;
		const remoteHash = (await Destination.OUT("lxmf.delivery", DestType.SINGLE, remoteIdentity, null)).destinationHash;
		if (!remoteHash) return 244;
		if (data[0] == null && data[1] == null) return this.store.transientIdsForDestination(remoteHash);
		if (data[1] != null && Array.isArray(data[1]) && data[1].length > 0) for (const tid of data[1]) this.store.removeForDestination(tid, remoteHash);
		if (data[0] != null && Array.isArray(data[0]) && data[0].length > 0) {
			const clientTransferLimitKb = data.length >= 3 && typeof data[2] === "number" ? data[2] : null;
			const out = [];
			let cumulative = 24;
			for (const tid of data[0]) {
				const lxmfData = this.store.serveDataForDestination(tid, remoteHash);
				if (!lxmfData) continue;
				const next = cumulative + lxmfData.length + 16;
				if (clientTransferLimitKb != null && next > clientTransferLimitKb * 1e3) continue;
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
		if (!remoteIdentity) return 240;
		if (!this.identityAllowed(remoteIdentity)) return 241;
		if (!Array.isArray(data) || data.length < 2) return 244;
		const localHash = this.getLocalIdentityHash();
		const remoteHash = remoteIdentity.identityHash;
		const peeringId = new Uint8Array(localHash.length + remoteHash.length);
		peeringId.set(localHash, 0);
		peeringId.set(remoteHash, localHash.length);
		const peeringKey = data[0];
		if (!await validatePeeringKey(peeringId, peeringKey, this.peeringCost)) return 243;
		/** @type {Uint8Array[]} */
		const offered = data[1];
		/** @type {Uint8Array[]} */
		const wanted = [];
		for (const tid of offered) if (!this.store.has(tid)) wanted.push(tid);
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
//#endregion
//#region node_modules/@reticulum/lxmf/src/router.js
/**
* @file router.js
* @description LXMF Router for managing incoming and outgoing messages
*/
/**
* Upper bound (ms) for awaiting an outgoing Resource transfer to reach
* COMPLETE. `Resource.advertise()` only sends the advertisement — the actual
* data is pulled by the receiver via RESOURCE_REQ — so callers MUST await the
* transfer before reporting success, otherwise the message is lost if the
* link comes down (or the process exits) first. The JS Resource has no
* sender-side watchdog yet, so this bounds the wait on a dead link.
*/
/**
* Upper bound (ms) for establishing an outbound DIRECT delivery link before
* falling back to opportunistic delivery. A reachable peer completes the
* handshake in a couple of RTTs; this bounds the wait on an unreachable one so
* `send()` does not stall indefinitely.
*/
const DIRECT_LINK_TIMEOUT_MS = 1e4;
/**
* How long (ms) to wait for a path-response announce after requesting a path
* before attempting a DIRECT link anyway (7 s, matching the Python
* reference). A LINKREQUEST with no known path is broadcast and won't reach a
* multi-hop peer, so when no path is known we request one and wait for the
* announce before initiating — recovering a stale/expired path after a
* restart.
*/
const PATH_REQUEST_WAIT_MS = 7e3;
const RESOURCE_TRANSFER_TIMEOUT_MS = 6e4;
/**
* Upper bound on remembered message ids for inbound deduplication. Entries
* are only ever inserted once (a repeat delivery is dropped, not re-inserted),
* so insertion order is chronological order and the oldest entry is evicted
* first. The Python reference persists its delivered-id set to disk and prunes
* it in its jobs loop; we keep the cache in memory, and 4096 entries spans
* days of mesh traffic in one process while staying trivially small.
*/
const DELIVERED_MESSAGE_CACHE_MAX = 4096;
/**
* Handles LXMF routing and message processing.
* @description LXMF Router for managing incoming and outgoing messages
*/
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
		/** @type {import("./propagation_node.js").PropagationNode|null} */
		this.propagationNode = null;
		/** @type {import("@reticulum/core").Destination|null} */
		this.propagationDest = null;
		/** @type {Uint8Array|null} destination hash of the configured propagation node. */
		this.outboundPropagationNode = null;
		/** @type {import("@reticulum/core").Link|null} cached link to the node. */
		this.outboundPropagationLink = null;
		/** Client per-transfer download limit (KB) advertised in `/get` requests. */
		this.deliveryPerTransferLimit = DELIVERY_LIMIT;
		this.pendingMessages = /* @__PURE__ */ new Map();
		this.pendingLinks = /* @__PURE__ */ new Map();
		this.identifiedLinks = /* @__PURE__ */ new Set();
		this.attachedLinks = /* @__PURE__ */ new Set();
		/** @type {Map<string, import("@reticulum/core").Link>} */
		this.directLinks = /* @__PURE__ */ new Map();
		this.displayName = null;
		this.stampCost = null;
		/** @type {Map<string, number>} */
		this.processedTransientIds = /* @__PURE__ */ new Map();
		/** @type {Map<string, number>} */
		this.locallyDeliveredMessageIds = /* @__PURE__ */ new Map();
		/** @type {Map<string, LXMPeer>} */
		this.peers = /* @__PURE__ */ new Map();
		/** @type {boolean} */
		this.autopeerEnabled = false;
		/** @type {number} max advertised peering cost to auto-peer at. */
		this.autopeerMaxPeeringCost = 26;
	}
	/**
	* Initializes the router and registers the LXMF delivery destination.
	*/
	async init() {
		log("ROUTER", "Initializing...");
		const deliveryDest = await Destination.IN("lxmf.delivery", DestType.SINGLE, this.identity, this.rns);
		log("ROUTER", `deliveryDest set: ${deliveryDest.name}`);
		this.deliveryDest = deliveryDest;
		this.rns.transport.bindLocalDestination(deliveryDest);
		this.rns.registerDestination(deliveryDest);
		await deliveryDest.enableRatchets();
		this._setupListeners();
		this.dispatchEvent(new CustomEvent("ready", { detail: { destination: deliveryDest } }));
		log("ROUTER", "init complete.");
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
		if (!this.deliveryDest) throw new Error("Router not initialized; call init() first.");
		this.displayName = displayName;
		this.stampCost = stampCost;
		this.identity.appData = buildAnnounceAppData(displayName, stampCost).slice();
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
		if (!this.deliveryDest) throw new Error("Router not initialized; call init() first.");
		const { stampCost = null, intervalMs } = options;
		this.displayName = displayName;
		this.stampCost = stampCost;
		this.identity.appData = buildAnnounceAppData(displayName, stampCost).slice();
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
	enableAutopeer(maxPeeringCost = 26) {
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
		const propDest = await Destination.IN("lxmf.propagation", DestType.SINGLE, this.identity, this.rns);
		this.propagationDest = propDest;
		this.rns.transport.bindLocalDestination(propDest);
		this.rns.registerDestination(propDest);
		const deliveryHash = this.deliveryDest?.destinationHash ?? null;
		const node = new PropagationNode({
			...options,
			getLocalIdentityHash: () => this.identity.identityHash,
			getDeliveryDestination: (hash) => {
				if (!deliveryHash) return null;
				return toHex(hash) === toHex(deliveryHash) ? this.deliveryDest : null;
			},
			onLocalDelivery: (msg) => {
				this._dispatchMessage(msg, null);
			},
			onStored: (storedIds) => this._distributeStored(storedIds)
		});
		this.propagationNode = node;
		propDest.appData = node.buildAnnounceAppData().slice();
		await propDest.registerRequestHandler(MESSAGE_GET_PATH, { responseGenerator: node.getRequestHandler() });
		await propDest.registerRequestHandler(OFFER_REQUEST_PATH, { responseGenerator: node.getOfferRequestHandler() });
		/** @type {any} */ propDest.addEventListener("link_request", async (event) => {
			try {
				const link = await propDest.acceptLink(event.detail.packet);
				link.bz2 = this.rns.compressionProvider || void 0;
				link.maxResourceSize = node.perSyncLimitKb * 1e3;
				link.addEventListener("resource", (resEvent) => {
					const resource = resEvent.detail.resource;
					resource.whenComplete().then(async () => {
						const container = unpackPropagationContainer(resource.data);
						if (container) {
							const res = await node.ingestBlobs(container.messages);
							log("LXMF", `Propagation submit ingested: ${res.stored} stored, ${res.delivered} delivered, ${res.rejected} rejected`, LogLevel.DEBUG);
						}
					}).catch((err) => {
						log("LXMF", `Propagation resource transfer failed: ${err}`, LogLevel.ERROR);
					});
				});
			} catch (e) {
				log("LXMF", `Failed to accept propagation link: ${e}`, LogLevel.ERROR);
			}
		});
		return node;
	}
	/**
	* Announces the `lxmf.propagation` destination, advertising this node to the
	* network. Requires {@link enablePropagation} first.
	* @returns {Promise<void>}
	*/
	async announcePropagationNode() {
		if (!this.propagationDest) throw new Error("Propagation not enabled; call enablePropagation() first.");
		await this.propagationDest.announce();
	}
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
		if (config.peeringCost > 26) {
			log("LXMF", `Not peering with ${toHex(destinationHash)}: peering cost ${config.peeringCost} > max 26`, LogLevel.NOTICE);
			this.unpeer(destinationHash);
			return null;
		}
		const key = toHex(destinationHash);
		/** @type {LXMPeer} */
		let peer;
		let isNewPeer = false;
		if (this.peers.has(key)) peer = this.peers.get(key);
		else {
			peer = new LXMPeer(this, destinationHash.slice(), 2);
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
				if (count > 0) log("LXMF", `Queued ${count} stored message(s) for distribution to new peer ${toHex(destinationHash)}`, LogLevel.DEBUG);
			}
		}
		log("LXMF", `Peered with ${toHex(destinationHash)}`, LogLevel.NOTICE);
		return peer;
	}
	/**
	* Breaks a peering relationship (`LXMRouter.unpeer`).
	* @param {Uint8Array} destinationHash
	*/
	unpeer(destinationHash) {
		if (this.peers.delete(toHex(destinationHash))) log("LXMF", `Broke peering with ${toHex(destinationHash)}`, LogLevel.NOTICE);
	}
	/**
	* Runs one outbound sync pass against every peered node. Resolves when all
	* peers have completed (or postponed) their sync.
	* @returns {Promise<void>}
	*/
	async syncPeers() {
		for (const peer of this.peers.values()) try {
			await peer.sync();
		} catch (err) {
			log("LXMF", `Sync with peer ${peer.id} failed: ${err}`, LogLevel.ERROR);
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
		for (const tid of storedIds) for (const peer of this.peers.values()) store.markUnhandledForPeer(tid, peer.destinationHash);
	}
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
		if (!this.outboundPropagationNode) throw new Error("No outbound propagation node configured.");
		const cached = this.outboundPropagationLink;
		if (cached && cached.status === 2) return cached;
		const nodeIdentity = await this.rns.transport.recallIdentity(this.outboundPropagationNode);
		if (!nodeIdentity) throw new Error(`Propagation node identity unknown for ${toHex(this.outboundPropagationNode)}; wait for its announce.`);
		const link = await (await Destination.OUT("lxmf.propagation", DestType.SINGLE, nodeIdentity, this.rns)).createLink();
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
		if (!this.outboundPropagationNode) throw new Error("No outbound propagation node configured.");
		let stampCost = options.stampCost;
		if (stampCost == null) {
			const nodeIdentity = await this.rns.transport.recallIdentity(this.outboundPropagationNode);
			stampCost = (nodeIdentity ? parsePropagationNodeAppData(nodeIdentity.appData) : null)?.stampCost ?? 16;
		}
		const { container, transientId } = await this._packForPropagationSubmit(message, senderIdentity, stampCost);
		const link = await this._ensurePropagationLink();
		if (!link.bz2) link.bz2 = this.rns.compressionProvider || void 0;
		const resource = new Resource({
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
		return {
			transientId,
			stampCost
		};
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
		let cleanup = () => {};
		const completion = resource.whenComplete();
		const guard = new Promise((_, reject) => {
			const onStatus = (ev) => {
				if (ev.detail.status === LinkStatus.CLOSED && resource.status !== 6) reject(/* @__PURE__ */ new Error("Link closed before the LXMF transfer completed"));
			};
			const timer = setTimeout(() => {
				reject(/* @__PURE__ */ new Error("LXMF transfer timed out waiting for completion"));
			}, RESOURCE_TRANSFER_TIMEOUT_MS);
			cleanup = () => {
				clearTimeout(timer);
				link.removeEventListener("statuschange", onStatus);
			};
			link.addEventListener("statuschange", onStatus);
		});
		try {
			await Promise.race([completion.then(() => {}), guard]);
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
		let recipientIdentity = await this.rns.transport.recallIdentity(message.destinationHash);
		if (!recipientIdentity && typeof this.rns.transport.recallOrSolicitIdentity === "function") try {
			recipientIdentity = await this.rns.transport.recallOrSolicitIdentity(message.destinationHash, 3e4);
		} catch {}
		if (!recipientIdentity) throw new UnknownIdentityError(message.destinationHash);
		const recipientOut = await Destination.OUT("lxmf.delivery", DestType.SINGLE, recipientIdentity, this.rns);
		const { lxmfData, transientId } = await message.toPropagationData(senderIdentity, recipientOut);
		let stamp;
		if (stampCost > 0) {
			const [generated] = await generateStamp(transientId, stampCost, WORKBLOCK_EXPAND_ROUNDS_PN$1);
			stamp = generated;
		} else stamp = /* @__PURE__ */ new Uint8Array(32);
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
		return this.locallyDeliveredMessageIds.has(toHex(messageId));
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
	async syncFromPropagationNode(identity, maxMessages = 0) {
		if (!this.outboundPropagationNode) throw new Error("No outbound propagation node configured.");
		const link = await this._ensurePropagationLink();
		await link.identify(identity);
		const list = await link.request(MESSAGE_GET_PATH, [null, null]);
		this._throwOnPeerError(list);
		if (!Array.isArray(list)) throw new Error("Invalid message list from propagation node");
		const wants = [];
		const haves = [];
		for (const tid of list) if (this.processedTransientIds.has(toHex(tid))) haves.push(tid);
		else if (maxMessages === 0 || wants.length < maxMessages) wants.push(tid);
		if (wants.length === 0 && haves.length === 0) return {
			received: 0,
			duplicates: 0
		};
		const messages = await link.request(MESSAGE_GET_PATH, [
			wants,
			haves,
			this.deliveryPerTransferLimit
		]);
		this._throwOnPeerError(messages);
		if (!Array.isArray(messages)) throw new Error("Invalid message data from propagation node");
		const receivedIds = [];
		let received = 0;
		for (const lxmfData of messages) {
			const tid = await Message.transientIdFromPropagationData(lxmfData);
			const tidHex = toHex(tid);
			if (this.processedTransientIds.has(tidHex)) continue;
			const dispatched = await this._ingestPropagationData(lxmfData);
			this.processedTransientIds.set(tidHex, Date.now() / 1e3);
			receivedIds.push(tid);
			if (dispatched) received++;
		}
		if (receivedIds.length > 0) await link.request(MESSAGE_GET_PATH, [null, receivedIds]);
		return {
			received,
			duplicates: messages.length - received
		};
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
		if (toHex(lxmfData.subarray(0, 16)) !== toHex(this.deliveryDest.destinationHash)) return false;
		const message = await Message.fromPropagationData(lxmfData, this.deliveryDest);
		if (!message) return false;
		const senderIdentity = await this.rns.transport.recallIdentity(message.sourceHash);
		return this._dispatchMessage(message, null, senderIdentity ?? void 0);
	}
	/**
	* Throws when a `/get` response is a peer error code.
	* @param {any} response
	* @private
	*/
	_throwOnPeerError(response) {
		if (typeof response === "number" && response >= 240) throw new Error(`Propagation node returned error code 0x${response.toString(16)}`);
	}
	/**
	* Sets up event listeners for both direct packets and incoming link requests.
	* @private
	*/
	_setupListeners() {
		const expectedDestHash = this.deliveryDest?.destinationHash;
		if (!expectedDestHash) throw new Error("Cannot set up listeners: delivery destination not initialized");
		/** @type {any} */ this.deliveryDest.addEventListener("data", async (event) => {
			const { plaintext } = event.detail;
			try {
				await this._processIncomingMessage(plaintext, null, expectedDestHash);
			} catch (e) {
				log("LXMF", `[!] Failed to process single-packet LXMF message: ${e}`, LogLevel.ERROR);
			}
		});
		/** @type {any} */ this.deliveryDest.addEventListener("link_request", async (event) => {
			log("LXMF", "[*] Incoming LXMF Link Request");
			try {
				const link = await this.deliveryDest.acceptLink(event.detail.packet);
				link.bz2 = this.rns.compressionProvider || void 0;
				this._attachLinkMessageListeners(link);
				const linkHex = toHex(link.linkId);
				this.pendingLinks.set(linkHex, true);
				const timer = setTimeout(() => {
					log("LXMF", `Timeout waiting for link ${linkHex} to identify`);
					this.pendingLinks.delete(linkHex);
					this.processPendingMessages(link.linkId);
				}, 1e4);
				link.addEventListener("identify", async (event) => {
					try {
						if (timer) clearTimeout(timer);
						const peerIdentity = event.detail.identity;
						const identityHash = await Identity.truncatedHash(peerIdentity.publicKey);
						log("LXMF", `Received LINKIDENTIFY for ${toHex(identityHash)} (${linkHex})`);
						const peerDeliveryDest = await Destination.OUT("lxmf.delivery", DestType.SINGLE, peerIdentity, this.rns);
						if (!peerDeliveryDest.destinationHash) throw new Error("Failed to derive peer delivery destination hash");
						await this.rns.transport.rememberIdentity(identityHash, peerDeliveryDest.destinationHash, peerIdentity.publicKey);
						this.rns.persistor?.markContacted(peerDeliveryDest.destinationHash);
						this.pendingLinks.delete(linkHex);
						this.processPendingMessages(link.linkId);
					} catch (e) {
						log("ROUTER", `Failed to derive LXMF destination for peer from link: ${e}`, LogLevel.ERROR);
					}
				});
			} catch (e) {
				log("LXMF", `[!] Failed to respond to LXMF link request: ${e}`, LogLevel.ERROR);
			}
		});
		this.rns.transport.addEventListener("announce", (event) => {
			const { destinationHash, identity, appData } = event.detail;
			this.dispatchEvent(new CustomEvent("peer", { detail: {
				destinationHash,
				identity,
				appData: parseAnnounceAppData(appData)
			} }));
			if (this.autopeerEnabled && this.propagationNode) {
				const pn = parsePropagationNodeAppData(appData);
				if (pn && pn.nodeState && pn.peeringCost <= this.autopeerMaxPeeringCost && !this.peers.has(toHex(destinationHash))) {
					this.peer(destinationHash, {
						stampCost: pn.stampCost,
						stampCostFlexibility: pn.stampCostFlexibility,
						peeringCost: pn.peeringCost,
						perTransferLimitKb: pn.perTransferLimitKb,
						perSyncLimitKb: pn.perSyncLimitKb
					});
					log("LXMF", `Auto-peered with propagation node ${toHex(destinationHash)} (peering cost ${pn.peeringCost})`, LogLevel.NOTICE);
				}
			}
			this.processAllPendingMessages().catch((e) => {
				log("LXMF", `Re-processing parked messages failed: ${e}`, LogLevel.DEBUG);
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
		if (wireData.length < 80) throw new Error("LXMF message too short to contain required headers");
		linkId && toHex(linkId);
		const message = await Message.deserialize(wireData, expectedDestHash);
		log("LXMF", `Incoming message from source ${toHex(message.sourceHash)}`);
		const senderIdentity = await this.rns.transport.recallIdentity(message.sourceHash);
		if (!senderIdentity) {
			const alreadyParked = this.pendingMessages.has(linkId);
			this.pendingMessages.set(linkId, wireData);
			log("LXMF", `Identity unknown for ${toHex(message.sourceHash)}; requesting path`);
			if (!alreadyParked) try {
				await this.rns?.transport?.requestPath(message.sourceHash);
			} catch (e) {
				log("LXMF", `Failed to request path: ${e}`, LogLevel.WARNING);
			}
			return;
		}
		this.pendingMessages.delete(linkId);
		if (!await message.verifySignature(senderIdentity)) throw new Error("Invalid LXMF message signature: Cryptographic proof failed.");
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
		if (senderIdentity && !await message.verifySignature(senderIdentity)) throw new Error("Invalid LXMF message signature: Cryptographic proof failed.");
		if (message.messageId && message.messageId.length > 0) {
			const messageIdHex = toHex(message.messageId);
			if (this.locallyDeliveredMessageIds.has(messageIdHex)) {
				log("LXMF", `Ignored already received message ${messageIdHex} from ${toHex(message.sourceHash)}`, LogLevel.DEBUG);
				return false;
			}
			this._rememberDelivered(messageIdHex);
		}
		this.dispatchEvent(new CustomEvent("message", { detail: {
			message,
			link: linkId
		} }));
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
		const hashHex = linkId ? toHex(linkId) : "opportunistic";
		const expectedDestHash = this.deliveryDest?.destinationHash;
		if (!expectedDestHash) return;
		if (this.pendingMessages.has(linkId)) {
			log("LXMF", `Identity acquired. Re-processing parked message for ${hashHex}`);
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
		if (!expectedDestHash || this.pendingMessages.size === 0) return;
		for (const linkId of [...this.pendingMessages.keys()]) {
			const wireData = this.pendingMessages.get(linkId);
			if (!wireData) continue;
			try {
				await this._processIncomingMessage(wireData, linkId, expectedDestHash);
			} catch (e) {
				log("LXMF", `Re-processing parked message failed: ${e}`, LogLevel.DEBUG);
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
		if (!this.deliveryDest) throw new Error("Router not initialized; call init() first.");
		const paperData = Message.paperDataFromUri(uri);
		const transientHex = toHex(await Message.transientIdFromPropagationData(paperData));
		if (this.processedTransientIds.has(transientHex)) {
			log("LXMF", `Paper message ${transientHex} already ingested; ignoring.`);
			return null;
		}
		this.processedTransientIds.set(transientHex, Date.now() / 1e3);
		const message = await Message.fromPaperData(paperData, this.deliveryDest);
		if (!message) {
			log("LXMF", "Paper URI not addressed to this node (decryption failed).");
			return null;
		}
		log("LXMF", `Ingested paper message from ${toHex(message.sourceHash)}`);
		const senderIdentity = await this.rns.transport.recallIdentity(message.sourceHash);
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
		const { linkId: explicitLinkId = null, fallback = "opportunistic", solicit = true, timeoutMs = 3e4 } = optionsOrLinkId instanceof Uint8Array ? { linkId: optionsOrLinkId } : optionsOrLinkId ?? {};
		const { messageId, wireData } = await message.serialize(senderIdentity);
		log("LXMF", `DEBUG: Sending LXMF Message ID: ${toHex(messageId)}`);
		log("LXMF", `DEBUG: Sending to ${toHex(message.destinationHash)}`);
		let linkDeliveryError = null;
		let targetLinkId = explicitLinkId;
		if (!targetLinkId) try {
			const directLink = await this._establishDirectLink(message.destinationHash, {
				solicit,
				timeoutMs
			});
			if (directLink) {
				const linkKey = toHex(directLink.linkId);
				if (!this.attachedLinks.has(linkKey)) {
					this._attachLinkMessageListeners(directLink);
					this.attachedLinks.add(linkKey);
				}
				targetLinkId = directLink.linkId;
			}
		} catch (err) {
			linkDeliveryError = err;
		}
		if (targetLinkId) try {
			await this._sendOverLink(targetLinkId, senderIdentity, message.destinationHash, wireData, timeoutMs);
			return;
		} catch (err) {
			log("LXMF", `Direct link send failed: ${err}; evaluating fallback`, LogLevel.DEBUG);
			linkDeliveryError = err;
		}
		if (fallback === "none") throw linkDeliveryError || /* @__PURE__ */ new Error(`Cannot deliver to ${toHex(message.destinationHash)}: direct link delivery failed and fallback is "none"`);
		let opportunisticError = null;
		if (fallback === "opportunistic" || fallback === "propagation") try {
			await this._sendOpportunistic(message, wireData, {
				solicit,
				timeoutMs
			});
			return;
		} catch (err) {
			log("LXMF", `Opportunistic delivery failed: ${err}; evaluating fallback`, LogLevel.DEBUG);
			opportunisticError = err;
		}
		if (fallback === "propagation") {
			if (this.outboundPropagationNode) {
				await this.submitToPropagationNode(message, senderIdentity);
				return;
			}
			throw new Error(`Cannot deliver to ${toHex(message.destinationHash)}: direct and opportunistic failed, and no outbound propagation node is configured`);
		}
		throw opportunisticError || linkDeliveryError || /* @__PURE__ */ new Error(`Cannot deliver message to ${toHex(message.destinationHash)}`);
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
		const linkKey = toHex(linkId);
		const link = this.rns.transport.activeLinks.get(linkKey);
		if (!link) throw new Error(`Link ${linkKey} is not active in transport`);
		await link.whenActive(timeoutMs);
		if (link.initiator && !this.identifiedLinks.has(linkKey)) {
			await link.identify(senderIdentity);
			this.identifiedLinks.add(linkKey);
		}
		if (wireData.length > link.mdu) {
			if (!link.bz2) link.bz2 = this.rns.compressionProvider || void 0;
			const resource = new Resource({
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
			destinationType: DestType.SINGLE,
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
		const DESTINATION_LENGTH = Identity.TRUNCATED_HASH_LENGTH;
		let peerIdentity = await this.rns.transport.recallIdentity(message.destinationHash);
		if (!peerIdentity && solicit && typeof this.rns.transport.recallOrSolicitIdentity === "function") try {
			peerIdentity = await this.rns.transport.recallOrSolicitIdentity(message.destinationHash, timeoutMs);
		} catch {}
		if (!peerIdentity) throw new UnknownIdentityError(message.destinationHash);
		const peerDestination = await Destination.OUT("lxmf.delivery", DestType.SINGLE, peerIdentity, this.rns);
		const opportunisticPacket = new Packet({
			packetType: PacketType.DATA,
			contextFlag: true,
			contextByte: ContextType.NONE,
			destinationHash: message.destinationHash,
			destinationType: DestType.SINGLE,
			transportType: 0,
			payload: wireData.subarray(DESTINATION_LENGTH)
		});
		const receipt = await peerDestination.send(opportunisticPacket);
		if (receipt instanceof PacketReceipt) {
			if (await receipt.whenSettled() !== ReceiptStatus.DELIVERED) throw new Error(`Opportunistic delivery to ${toHex(message.destinationHash)} failed: no delivery proof was received from the recipient`);
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
		const transport = this.rns?.transport;
		if (!transport) return false;
		const usablePath = () => typeof transport.hasPath === "function" && transport.hasPath(destinationHash) && !(typeof transport.pathIsUnresponsive === "function" && transport.pathIsUnresponsive(destinationHash));
		if (usablePath()) return true;
		if (typeof transport.requestPath !== "function") return false;
		const destHex = toHex(destinationHash);
		log("LXMF", `No usable path to ${destHex}; requesting before DIRECT link`, LogLevel.DEBUG);
		try {
			await transport.requestPath(destinationHash);
		} catch {}
		if (usablePath()) return true;
		return new Promise((resolve) => {
			let settled = false;
			/** @type {(result: boolean) => void} */
			const finish = (result) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				transport.removeEventListener("announce", onAnnounce);
				resolve(result);
			};
			/** @param {any} ev */
			const onAnnounce = (ev) => {
				const dh = ev?.detail?.destinationHash;
				if (dh && toHex(dh) === destHex && typeof transport.hasPath === "function" && transport.hasPath(destinationHash)) finish(true);
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
		const destHex = toHex(destinationHash);
		const cached = this.directLinks.get(destHex);
		if (cached && cached.status === LinkStatus.ACTIVE) return cached;
		this.directLinks.delete(destHex);
		let peerIdentity = await this.rns.transport.recallIdentity(destinationHash);
		if (!peerIdentity && solicit && typeof this.rns.transport.recallOrSolicitIdentity === "function") try {
			peerIdentity = await this.rns.transport.recallOrSolicitIdentity(destinationHash, timeoutMs);
		} catch {}
		if (!peerIdentity) {
			log("LXMF", `Cannot establish DIRECT link: identity unknown for ${destHex}`, LogLevel.DEBUG);
			return null;
		}
		await this._requestAndAwaitPath(destinationHash, PATH_REQUEST_WAIT_MS);
		try {
			const peerDestination = await Destination.OUT("lxmf.delivery", DestType.SINGLE, peerIdentity, this.rns);
			const link = await Link.initiate(peerDestination, this.rns.transport);
			await link.whenActive(timeoutMs);
			link.bz2 = this.rns.compressionProvider || void 0;
			const newLinkKey = toHex(link.linkId);
			link.addEventListener("statuschange", (ev) => {
				if (ev.detail.status === LinkStatus.CLOSED) {
					if (this.directLinks.get(destHex) === link) this.directLinks.delete(destHex);
					this.attachedLinks.delete(newLinkKey);
					this.identifiedLinks.delete(newLinkKey);
				}
			});
			this.directLinks.set(destHex, link);
			log("LXMF", `Established DIRECT delivery link to ${destHex}`, LogLevel.DEBUG);
			return link;
		} catch (e) {
			log("LXMF", `DIRECT link to ${destHex} failed, falling back to opportunistic: ${e}`, LogLevel.WARNING);
			const transport = this.rns?.transport;
			try {
				transport?.routingTable?.expireRoute?.(destinationHash);
				await transport?.requestPathAuto?.(destinationHash);
			} catch {}
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
			const resource = resEvent.detail.resource;
			resource.whenComplete().then(() => {
				this._processIncomingMessage(resource.data, link.linkId, expectedDestHash);
			}).catch((err) => {
				log("LXMF", `Incoming LXMF resource transfer failed: ${err}`, LogLevel.ERROR);
			});
		});
	}
};
//#endregion
export { constants_exports as LXMFConstants, LXMPeer, LXMRouter, Message as LXMessage, stamper_exports as LXStamper, MessageStore, PeerState, PropagationNode, buildAnnounceAppData, buildPropagationNodeAppData, packPropagationContainer, parseAnnounceAppData, parsePropagationNodeAppData, unpackPropagationContainer };
