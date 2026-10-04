/**
 * RNS naming conventions for the Dacar policy plane (spec §8, §11).
 *
 * Pure, dependency-free constants. Two scopes:
 *
 *   - `RFED_TOPIC` is a *deployment-overridable default*. RFed is a broadcast
 *     (many-to-many) medium, so deployments sharing an RNS network SHOULD set a
 *     deployment-specific topic to isolate their policy feeds (verify-on-ingest
 *     limits cross-feed damage, but not the bandwidth cost or the risk of
 *     shared root anchors).
 *   - `CHALLENGE_DESTINATION`, `SYNC_DESTINATION`, and `LXMF_DELIVERY_TITLE`
 *     are *fixed discriminators*. The §8 Challenge, the §11 direct-link Delta
 *     push, and §11.2 LXMF delivery are addressed point-to-point to a specific
 *     Identity, so RNS derives isolation from the destination *hash* (which
 *     embeds the target Identity), not from this name.
 *
 * Both the pure core and the (optional) transport adapters reference these, so
 * the on-wire naming is defined in one place and stays consistent across
 * language implementations. Transport adapters accept overrides (e.g.
 * `topic = RFED_TOPIC`) for deployment-specific values.
 */
/** The RNS App Name under which all Dacar services live (§8, §11). */
export const APP_NAME: "dacar";
/** Aspects of the §8 Authoritative Challenge destination (App `dacar`). */
export const CHALLENGE_ASPECTS: readonly string[];
/** The full dotted name of the §8 Authoritative Challenge destination. */
export const CHALLENGE_DESTINATION: "dacar.auth.v1";
/**
 * Aspects of the direct-link Delta ingestion destination (§11, work doc #16
 * Phase 4a). A constrained node (e.g. an MCU running microReticulum) exposes
 * this destination so a peer can push raw §5.3 Delta payloads to it over a
 * Link request; the node ingests them through verify-on-ingest (§11.2.4),
 * which makes any transport valid — the same precedent as optical Paper
 * Messages (§11.3).
 */
export const SYNC_ASPECTS: readonly string[];
/** The full dotted name of the direct-link Delta ingestion destination. */
export const SYNC_DESTINATION: "dacar.sync.v1";
/**
 * RFed topic for many-to-many CRDT convergence (§11.1). Deployment-overridable
 * default — RFed is broadcast, so shared-network deployments SHOULD set a
 * distinct topic to isolate their feeds.
 */
export const RFED_TOPIC: "dacar.policy.v1";
/** LXMF message title for targeted Delta delivery (§11.2). */
export const LXMF_DELIVERY_TITLE: "dacar/sync/delta";
/**
 * LXMF message title for the multi-Delta **batch** envelope (§11.2, work doc
 * #14). The message content is a msgpack array of §5.3 Delta payloads; every
 * element is still individually signature-checked at ingest (verify-on-
 * ingest, §11.2.4) — the envelope is pure packing and adds no trust. A
 * receiver MUST accept both titles (single for wire compat, batch for chunked
 * bootstrap/paper transfer).
 */
export const LXMF_BATCH_TITLE: "dacar/sync/batch";
