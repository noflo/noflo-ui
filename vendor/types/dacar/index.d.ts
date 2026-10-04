/**
 * Dacar: Decentralized Access Control for Reticulum (JavaScript reference impl).
 *
 * A tuple-based, offline-first authorization policy plane built on an
 * LWW-Element-Set CRDT, designed for delay-tolerant mesh networks.
 *
 * Object and relation labels are stored only as salted HMAC-SHA256 hashes
 * (§3.3 Namespace Label Privacy), Threshold Groups may act as N-of-M Issuers
 * (§4.1), and the state is bounded by Time-Horizon Tombstone Pruning (§9).
 */
export const __version__: "1.5.0";
export const __specVersion__: "1.0-RC7";
export { DeltaReceiver } from "./delta.js";
export { StateVector } from "./crdt.js";
export { PHYSICAL_BITS, LOGICAL_BITS, LOGICAL_MASK, MAX_PHYSICAL, MAX_LOGICAL, MAX_HLC, packHlc, unpackHlc, physicalNowMs, Clock } from "./hlc.js";
export { DELIMITER, WILDCARD, SALT_SIZE, HASH_SIZE, DEFAULT_SALT, MAX_LEGACY_SALTS, NamespaceHasher, covers, split, parseObject, bytesEqual } from "./namespace.js";
export { MAX_SEGMENTS, Tuple } from "./tuple.js";
export { ThresholdGroup, groupId } from "./threshold.js";
export { SIGNATURE_SIZE, HLC_BYTES, Action, Operation } from "./operation.js";
export { IssuerKeyset, Keyring, verifyOperation } from "./verifier.js";
export { APP_NAME, CHALLENGE_ASPECTS, CHALLENGE_DESTINATION, RFED_TOPIC, LXMF_DELIVERY_TITLE } from "./naming.js";
export { Config, DEFAULT_DELETION_HORIZON_DAYS } from "./config.js";
export { Engine, ADMIN_RELATION, DEFAULT_MAX_DEPTH, DEFAULT_MAX_VISITED } from "./engine.js";
export { NONCE_SIZE, Verdict, Challenge, Receipt, AuthoritativeServer, ChallengeClient } from "./challenge.js";
