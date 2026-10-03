/**
 * @file Local Dacar wallet (work document #25 §5.2): the IndexedDB-backed
 * `dacar_grants` store where a device catalogs the grants handed to it,
 * keyed by `sha256(subject + resource)`. Records keep the full wire
 * authorization plus its unblinded scope, so the node can inspect what it
 * holds without touching the mesh.
 *
 * The wallet is device state (like the mesh config), deliberately separate
 * from the project CRDT: other peers verify each other's grants from the
 * grants map, not from this wallet.
 */

import { computeGrantId } from "./Dacar.js";

/**
 * A wallet record (work document #25 §5.2, adapted): the doc's single
 * `signature` field lives inside each signed Dacar payload, and the doc's
 * `grant_assertion` carries one entry per permission.
 *
 * @typedef {Object} WalletGrant
 * @property {string} grantId `sha256(subject + resource)`, hex.
 * @property {string} projectId Project the grant was issued for.
 * @property {{ hash: string, pubkey: string }} trustAnchor The project Trust
 *   Anchor the grant was signed by.
 * @property {{
 *   issuer: string,
 *   subject: string,
 *   resource: string,
 *   permissions: string[],
 *   salt: string,
 *   issued_at: number,
 *   expires: number | null,
 * }} assertion Cleartext (unblinded) assertion fields.
 * @property {string} deltas Signed Dacar Operation payloads as a §11.1 batch
 *   (base64); each embeds its Trust Anchor signature.
 * @property {string} unblindedScope Cleartext scope the grant covers.
 */

/** Wallet index key: the list of stored grant ids. */
const WALLET_INDEX_KEY = "wallet-index";

/**
 * Reads the wallet index, tolerating a missing or corrupt entry.
 *
 * @param {import("../crdt/MeshConfig.js").AsyncStorage} storage
 * @returns {Promise<string[]>}
 */
async function loadWalletIndex(storage) {
  try {
    const list = await storage.get(WALLET_INDEX_KEY);
    if (!Array.isArray(list)) return [];
    return list.filter(
      /** @returns {entry is string} */ (entry) => typeof entry === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Validates and catalogs an authorization into the wallet. Saving the same
 * grant again (idempotent bootstrap re-dials) overwrites the same record.
 *
 * @param {import("../crdt/MeshConfig.js").AsyncStorage} storage
 * @param {{ projectId: string, authorization: import("./Dacar.js").Authorization }} grant
 * @returns {Promise<WalletGrant | null>} The stored record, or null when the
 *   authorization is not catalogable.
 */
export async function saveWalletGrant(storage, { projectId, authorization }) {
  const subject = authorization?.subject;
  const resource = authorization?.resource;
  if (typeof subject !== "string" || !subject) return null;
  if (typeof resource !== "string" || !resource) return null;
  if (typeof authorization.deltas !== "string" || !authorization.deltas) {
    return null;
  }
  const grantId = await computeGrantId(subject, resource);
  /** @type {WalletGrant} */
  const record = {
    grantId,
    projectId: String(projectId ?? ""),
    trustAnchor: {
      hash: authorization.anchor.hash,
      pubkey: authorization.anchor.pubkey,
    },
    assertion: {
      issuer: authorization.anchor.hash,
      subject,
      resource,
      permissions: [...authorization.permissions],
      salt: authorization.salt,
      issued_at: authorization.issued_at,
      expires: authorization.expires,
    },
    deltas: authorization.deltas,
    unblindedScope: resource,
  };
  await storage.set(grantId, record);
  const index = await loadWalletIndex(storage);
  if (!index.includes(grantId)) {
    index.push(grantId);
    await storage.set(WALLET_INDEX_KEY, index);
  }
  return record;
}

/**
 * Loads one wallet record.
 *
 * @param {import("../crdt/MeshConfig.js").AsyncStorage} storage
 * @param {string} grantId
 * @returns {Promise<WalletGrant | null>}
 */
export async function loadWalletGrant(storage, grantId) {
  const record = await storage.get(grantId).catch(() => null);
  return /** @type {WalletGrant | null} */ (record) ?? null;
}

/**
 * Lists all wallet records held by this device.
 *
 * @param {import("../crdt/MeshConfig.js").AsyncStorage} storage
 * @returns {Promise<WalletGrant[]>}
 */
export async function listWalletGrants(storage) {
  const index = await loadWalletIndex(storage);
  /** @type {WalletGrant[]} */
  const records = [];
  for (const grantId of index) {
    const record = await loadWalletGrant(storage, grantId);
    if (record) records.push(record);
  }
  return records;
}
