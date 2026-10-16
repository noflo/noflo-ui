/**
 * @file The metadata catalogs (work document #57): the declared catalogs
 * the fbp-protocol package ships — `ui` (positional canvas keys),
 * `runtime` (config-class behavior), `std` (datatype forms) — as the
 * validation surface for the editor's metadata writes. Tier B: the
 * editor validates its own metadata at send time (hard enforcement);
 * validation is by key against the catalog's declared schema, filtered
 * by the entity kinds the entry applies to.
 *
 * The editor's metadata maps carry the bare key (`x`, `route`,
 * `highWaterMark`); the catalogs name keys with their namespace prefix
 * (`ui.x`, `runtime.highWaterMark`) — the seam maps the bare form onto
 * the declared one.
 */

import { CATALOGS } from "../../../vendor/fbp-protocol.js";
import { tierBValidate } from "./tierB.js";

/**
 * The entity kinds the catalogs declare, matching SPEC Appendix A's
 * entity vocabulary.
 *
 * @typedef {"node" | "edge" | "iip" | "export" | "group" | "graph"} EntityKind
 */

/**
 * Looks up a catalog entry by namespace and the editor's bare key.
 *
 * @param {string} namespace
 * @param {string} key The bare key (`x`, `highWaterMark`).
 * @returns {{ schema: any, class: string, kinds: string[] } | null}
 */
export function catalogEntry(namespace, key) {
  const catalog = /** @type {Record<string, any>} */ (CATALOGS)[namespace];
  const entry = catalog?.entries?.[`${namespace}.${key}`];
  return entry ?? null;
}

/**
 * Validates one metadata map against a namespace's catalog: each key
 * with a declared entry checks against its schema (the full Tier B
 * vocabulary through the vendored Ajv); keys without a declared entry
 * pass — unowned namespaces are app-specific by design, not errors.
 *
 * @param {string} namespace
 * @param {Record<string, any>} metadata The metadata map (bare keys).
 * @param {EntityKind} kind The entity kind the metadata rides.
 * @returns {Array<{ key: string, message: string }>}
 */
export function validateMetadata(namespace, metadata, kind) {
  if (!metadata || typeof metadata !== "object") return [];
  /** @type {Array<{ key: string, message: string }>} */
  const errors = [];
  for (const [key, value] of Object.entries(metadata)) {
    const entry = catalogEntry(namespace, key);
    if (!entry || !entry.schema) continue;
    if (!entry.kinds.includes(kind)) continue;
    if (value === undefined || value === null) continue;
    // The full Tier B vocabulary through the vendored Ajv: the catalog's
    // schemas are plain 2020-12 documents
    for (const error of tierBValidate(value, entry.schema) ?? []) {
      errors.push({ key, message: error.message });
    }
  }
  return errors;
}
