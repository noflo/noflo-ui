/**
 * @file Storage eviction guard for the Glass, per SPEC "IndexedDB Persistence
 * & Multi-Tab Safety": warn the user to export critical data when storage
 * eviction is imminent.
 */

/**
 * The storage pressure level reported by {@link checkEviction}.
 *
 * @typedef {'ok' | 'warning'} EvictionLevel
 */

/**
 * @typedef {Object} EvictionStatus
 * @property {EvictionLevel} level
 * @property {number} usage
 * @property {number} quota
 * @property {number} fraction
 */

/** Fraction of the quota above which the UI should warn about eviction. */
export const EVICTION_WARN_FRACTION = 0.8;

/**
 * Queries the storage estimate and reports whether eviction is imminent.
 *
 * @param {{ estimate?: () => Promise<{ usage: number, quota: number }> } | undefined} storage
 *   Injected `navigator.storage` (undefined on unsupported platforms).
 * @param {{ warnFraction?: number }} [options]
 * @returns {Promise<EvictionStatus | null>} Null when storage estimates are unsupported.
 */
export async function checkEviction(storage, options = {}) {
  if (!storage || typeof storage.estimate !== "function") {
    return null;
  }
  const { usage = 0, quota = 0 } = await storage.estimate();
  const fraction = quota > 0 ? usage / quota : 0;
  const warnFraction = options.warnFraction ?? EVICTION_WARN_FRACTION;
  return {
    level: fraction >= warnFraction ? "warning" : "ok",
    usage,
    quota,
    fraction,
  };
}
