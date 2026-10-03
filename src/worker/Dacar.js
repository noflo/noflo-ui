/**
 * @file Dacar authorization glue for noflo-ui (work document #25 §2, §4.2):
 * mints Dacar-signed capability grants and runs a per-project Dacar node
 * state — `Config` + `StateVector` + `DeltaReceiver` + `Engine` — for
 * verify-on-ingest (§11.2.4) and authorization evaluation (§7).
 *
 * A Dacar grant is a signed {@link Operation} over a hashed Tuple
 * `(Object, Relation, Grantee, Issuer)`. For noflo-ui:
 *
 * - **Object** is a resource in the `noflo-ui` namespace — either a specific
 *   project (`noflo-ui:project:<uuid>`) or the wildcard (`noflo-ui:*`).
 * - **Relation** is one permission string: `sync` (may replicate the project
 *   CRDT) or `write` (may mutate it).
 * - **Grantee** is the 16-byte identity hash of the granted peer.
 * - **Issuer** is the project's Trust Anchor identity hash.
 *
 * Grants travel in Dacar's own wire formats: one authorization carries a
 * §11.1 batch (`DeltaReceiver.packPayloads`) of signed §5.3 Operation
 * payloads — one per permission — and is delivered peer-to-peer either via
 * the direct-link Delta push (`dacar.sync.v1`, §11) or replicated through
 * the project CRDT's grants map. Work document #25 §4.2's single
 * `grant_assertion` with a `permissions` array maps to this batch; each
 * payload embeds its Ed25519 signature.
 *
 * The Relation and Object travel only as salted HMAC hashes (Namespace Label
 * Privacy, §3.3); a node holding the project salt unblinds assertions for
 * local inspection by evaluating plaintext against the Dacar Engine (§2.3).
 *
 * Expiry defaults to `null` (§7): grants do not expire, and future-skew
 * intake rejection (§12) is disabled on ingest, so verification stays
 * reliable on clock-drifted off-grid nodes.
 */

import {
  Action,
  Config,
  DeltaReceiver,
  Engine,
  Keyring,
  NamespaceHasher,
  Operation,
  packHlc,
  StateVector,
  Tuple,
} from "../../vendor/dacar.js";
import { fromHex, Identity, toHex } from "../../vendor/reticulum-core.js";

/** Root of the noflo-ui resource namespace (Dacar Object strings). */
export const RESOURCE_ROOT = "noflo-ui";

/** Wildcard resource: an assertion covering every noflo-ui project. */
export const WILDCARD_RESOURCE = `${RESOURCE_ROOT}:*`;

/** Resource string prefix for project-scoped assertions. */
export const PROJECT_RESOURCE_PREFIX = `${RESOURCE_ROOT}:project:`;

/**
 * Permissions each UI role is granted (work document #25 §4.2): `sync` allows
 * CRDT replication, `write` allows CRDT mutation.
 *
 * @type {Record<string, string[]>}
 */
export const ROLE_PERMISSIONS = {
  observer: ["sync"],
  operator: ["sync", "write"],
  developer: ["sync", "write"],
};

/**
 * A complete grant as it travels on the wire and is stored in grants-map
 * entries and the local wallet (work document #25 §4.2, §5.2).
 *
 * @typedef {Object} Authorization
 * @property {{ hash: string, pubkey: string }} anchor The project Trust
 *   Anchor: 16-byte identity hash and the full 64-byte RNS public key, both
 *   hex. Verifiers require `Identity.truncatedHash(pubkey) === hash`, so a
 *   forged pubkey cannot impersonate the designated anchor.
 * @property {string} subject Grantee identity hash (hex).
 * @property {string} resource Cleartext resource string the grant covers;
 *   also the wallet's unblinded scope (§5.2).
 * @property {string[]} permissions Cleartext permissions the grant carries.
 * @property {string} salt Hex Privacy Salt: holders unblind the salted
 *   assertion hashes for local inspection (§2.3).
 * @property {number} issued_at Unix milliseconds of the mint.
 * @property {number | null} expires Always null (§7 clock-drift safety).
 * @property {string} deltas The signed §5.3 Operation payloads as a §11.1
 *   batch (base64), one per permission.
 */

/**
 * Builds the resource string for a project-scoped grant.
 *
 * @param {string} projectId Project CRDT identity.
 * @returns {string}
 */
export function projectResource(projectId) {
  return `${PROJECT_RESOURCE_PREFIX}${projectId}`;
}

/**
 * Generates a fresh Dacar Privacy Salt (32 bytes, hex-encoded). §3.3
 * WARNING: an unset salt defaults to 32 null bytes, which is fail-open on
 * privacy — every project gets a random salt at first mint.
 *
 * @returns {Promise<string>} Hex-encoded 32-byte salt.
 */
export async function generateSalt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Computes the local wallet record key (work document #25 §5.2):
 * `sha256(subject + resource)`, hex-encoded. Deterministic across devices,
 * so the same grant catalogs to the same wallet slot everywhere.
 *
 * @param {string} subjectHex Grantee identity hash (hex).
 * @param {string} resource Cleartext resource string.
 * @returns {Promise<string>}
 */
export async function computeGrantId(subjectHex, resource) {
  const data = new TextEncoder().encode(`${subjectHex}:${resource}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/**
 * A stable fingerprint of a grant's cryptographic content, used to
 * deduplicate grants-map entries carrying the same grant (a bootstrap
 * re-handoff and a CRDT sync of the same grant must not duplicate).
 *
 * @param {Authorization} authorization
 * @returns {string}
 */
export function authorizationFingerprint(authorization) {
  return `${authorization?.subject ?? ""}:${authorization?.salt ?? ""}:${authorization?.resource ?? ""}:${authorization?.deltas ?? ""}`;
}

/**
 * Mints a Dacar-signed grant: the Trust Anchor identity signs one Operation
 * per permission over the project resource, serialized as a §11.1 batch.
 *
 * @param {{
 *   anchorIdentity: InstanceType<typeof Identity>,
 *   subjectHex: string,
 *   projectId: string,
 *   role: string,
 *   salt: string,
 *   issuedAt?: number,
 * }} options
 * @returns {Promise<Authorization>}
 */
export async function mintAuthorization({
  anchorIdentity,
  subjectHex,
  projectId,
  role,
  salt,
  issuedAt = Date.now(),
}) {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    throw new Error(`Unknown role for Dacar grant: ${role}`);
  }
  if (!/^[0-9a-f]{64}$/.test(salt)) {
    throw new Error("Dacar salt must be 32 hex-encoded bytes");
  }
  const anchorHash = toHex(anchorIdentity.getSalt());
  const anchorPubkey = toHex(await anchorIdentity.getPublicKey());
  const resource = projectResource(projectId);
  const hasher = new NamespaceHasher(fromHex(salt));
  const hlcStamp = packHlc(issuedAt, 0);
  const payloads = [];
  for (const permission of permissions) {
    const tuple = await Tuple.fromPlaintext({
      objectId: resource,
      relation: permission,
      grantee: fromHex(subjectHex),
      issuer: fromHex(anchorHash),
      hasher,
    });
    const operation = await new Operation({
      tuple,
      action: Action.GRANT,
      hlc: hlcStamp,
    }).sign(anchorIdentity);
    payloads.push(operation.toPayload());
  }
  return {
    anchor: { hash: anchorHash, pubkey: anchorPubkey },
    subject: subjectHex,
    resource,
    permissions,
    salt,
    issued_at: issuedAt,
    expires: null,
    deltas: bytesToBase64(DeltaReceiver.packPayloads(payloads)),
  };
}

/** @returns {string} Base64 of the bytes. */
function bytesToBase64(/** @type {Uint8Array} */ bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** @returns {Uint8Array} Decoded bytes. */
function base64ToBytes(/** @type {string} */ base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * A per-project Dacar node state: the local authorization authority. Once
 * configured with the project's Trust Anchor (§2.2) and Privacy Salt (§2.3)
 * it authenticates every incoming Delta by verify-on-ingest against the
 * designated anchor — an unknown Trust Anchor's deltas are refused (§7) —
 * and answers authorization questions through the Dacar Engine.
 *
 * @typedef {Object} DacarNode
 * @property {(config: { anchorHashHex: string, anchorPubkeyHex: string, salt: string }) => void} configure
 *   Installs (or replaces) the Trust Anchor and salt; rebuilds the state.
 * @property {() => boolean} isConfigured
 * @property {(batchBytes: Uint8Array) => Promise<number>} ingestDeltas
 *   Authenticates and applies received bytes — one §5.3 payload or a §11.1
 *   batch — returning the applied count.
 * @property {(authorization: Authorization) => Promise<number>} ingestAuthorization
 *   Structurally binds a grant to the designated anchor (unknown anchors and
 *   forged pubkeys are rejected) and ingests its deltas.
 * @property {(projectId: string, relation: string, subjectHex: string) => Promise<boolean | null>} evaluate
 *   Dacar Engine evaluation (§7) of `(resource, relation, grantee)`; null
 *   while unconfigured.
 * @property {() => void} reset Discards all ingested state (used when the
 *   grants map's tombstones require a rebuild).
 */

/**
 * Creates an unconfigured Dacar node state.
 *
 * @returns {DacarNode}
 */
export function createDacarNode() {
  /** @type {Config | null} */
  let config = null;
  /** @type {StateVector | null} */
  let state = null;
  /** @type {DeltaReceiver | null} */
  let receiver = null;
  /** @type {Engine | null} */
  let engine = null;
  /** Pubkey of the configured anchor, kept for `reset()`. */
  let configuredPubkey = "";

  /**
   * Builds the inner state for the current anchor + salt.
   *
   * @param {{ anchorHashHex: string, anchorPubkeyHex: string, salt: string }} nodeConfig
   */
  function build(nodeConfig) {
    config = new Config({
      rootTrustAnchors: [fromHex(nodeConfig.anchorHashHex)],
      primarySalt: fromHex(nodeConfig.salt),
    });
    configuredPubkey = nodeConfig.anchorPubkeyHex;
    state = new StateVector();
    const keyring = new Keyring().registerSingle(
      fromHex(nodeConfig.anchorHashHex),
      fromHex(nodeConfig.anchorPubkeyHex),
    );
    receiver = new DeltaReceiver(state, keyring);
    engine = new Engine(config, state);
  }

  /**
   * Authenticates and applies raw received bytes: one §5.3 payload, or a
   * §11.1 batch of them (the same disambiguation the transport seam uses).
   * Clock-drift tolerant: future-skew rejection is disabled (§7).
   *
   * @param {Uint8Array} data
   * @returns {Promise<number>} Applied delta count.
   */
  async function ingestRaw(data) {
    if (!receiver) return 0;
    if (await receiver.applyPayload(data, { maxFutureMs: null })) return 1;
    try {
      return await receiver.applyPayloads(data, { maxFutureMs: null });
    } catch {
      return 0;
    }
  }

  return {
    configure(nodeConfig) {
      build(nodeConfig);
    },
    isConfigured() {
      return config !== null;
    },
    async ingestDeltas(batchBytes) {
      return await ingestRaw(batchBytes);
    },
    async ingestAuthorization(authorization) {
      if (!config) return 0;
      // Bind the grant to the designated anchor before any crypto runs: a
      // forged pubkey or a foreign anchor never reaches the state (§7)
      const designatedAnchor = /** @type {Set<string>} */ (
        config.rootTrustAnchors
      )
        .values()
        .next().value;
      if (authorization?.anchor?.hash !== designatedAnchor) {
        return 0;
      }
      if (
        toHex(
          await Identity.truncatedHash(fromHex(authorization.anchor.pubkey)),
        ) !== authorization.anchor.hash
      ) {
        return 0;
      }
      return await ingestRaw(base64ToBytes(authorization.deltas));
    },
    async evaluate(projectId, relation, subjectHex) {
      if (!engine) return null;
      return await engine.evaluate(
        projectResource(projectId),
        relation,
        fromHex(subjectHex),
      );
    },
    reset() {
      if (!config) return;
      // Rebuild against the same anchor + salt, dropping all ingested
      // tuples (grants-map tombstone rebuilds)
      const anchorHash =
        /** @type {Set<string>} */ (config.rootTrustAnchors).values().next()
          .value ?? "";
      build({
        anchorHashHex: anchorHash,
        anchorPubkeyHex: configuredPubkey,
        salt: toHex(config.primarySalt),
      });
    },
  };
}
