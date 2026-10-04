/**
 * Pack a physical timestamp (ms) and logical counter into a 64-bit HLC.
 * @param {number} physicalMs
 * @param {number} logical
 * @returns {bigint}
 */
export function packHlc(physicalMs: number, logical: number): bigint;
/**
 * Unpack an HLC into its physical (ms) and logical parts (both safe Numbers).
 * @param {bigint} hlc
 * @returns {{ physicalMs: number, logical: number }}
 */
export function unpackHlc(hlc: bigint): {
    physicalMs: number;
    logical: number;
};
/**
 * Current wall-clock time in milliseconds since the Unix epoch.
 * @returns {number}
 */
export function physicalNowMs(): number;
/**
 * Hybrid Logical Clocks (Dacar spec §5.1).
 *
 * An HLC packs into a single 64-bit unsigned integer, transmitted big-endian:
 *   high 48 bits: physical time (Unix epoch, milliseconds)
 *   low 16 bits : logical counter
 *
 * Packed HLCs are represented as ECMAScript `bigint`, because
 * `physical_ms << 16` exceeds `Number.MAX_SAFE_INTEGER` for any realistic
 * timestamp.
 */
export const PHYSICAL_BITS: 48n;
export const LOGICAL_BITS: 16n;
/** @type {bigint} 0xFFFF */
export const LOGICAL_MASK: bigint;
/** @type {bigint} 2^48 - 1 */
export const MAX_PHYSICAL: bigint;
/** @type {bigint} 2^16 - 1 */
export const MAX_LOGICAL: bigint;
/** @type {bigint} 2^64 - 1 */
export const MAX_HLC: bigint;
/**
 * A process-local HLC generator producing monotonically non-decreasing
 * timestamps, able to absorb remote HLCs observed during sync.
 */
export class Clock {
    /**
     * Get the last physical timestamp (ms).
     * @returns {number}
     */
    get lastMs(): number;
    /**
     * Get the current logical counter.
     * @returns {number}
     */
    get logical(): number;
    /**
     * Restore the clock from a snapshot (for store persistence).
     * @param {{ lastMs: number, logical: number }} snap
     */
    restore(snap: {
        lastMs: number;
        logical: number;
    }): void;
    /** Obtain a snapshot for persistence. @returns {{ lastMs: number, logical: number }} */
    snapshot(): {
        lastMs: number;
        logical: number;
    };
    /** Advance from a local event and return the new HLC. @returns {bigint} */
    now(): bigint;
    /**
     * Absorb a remote HLC observed during sync and return the new local HLC.
     * @param {bigint} remoteHlc
     * @returns {bigint}
     */
    observe(remoteHlc: bigint): bigint;
    #private;
}
