/**
 * Compute the 16-byte Group ID for a member set and threshold (§4.1).
 *
 * Members are 16-byte identity hashes, sorted ascending by raw byte value
 * (equivalent to hex-alphabetical order). The threshold `N` is appended as an
 * 8-byte big-endian unsigned integer, then SHA-256 of the whole blob is
 * truncated to 16 bytes.
 * @param {Uint8Array[]} members
 * @param {number} threshold
 * @returns {Promise<Uint8Array>}
 */
export function groupId(members: Uint8Array[], threshold: number): Promise<Uint8Array>;
export class ThresholdGroup {
    /**
     * @param {Uint8Array[]} members M member identity hashes (16 bytes each).
     * @param {number} threshold The consensus threshold N.
     */
    constructor(members: Uint8Array[], threshold: number);
    /** @readonly @type {Uint8Array[]} sorted ascending. */
    readonly members: Uint8Array[];
    /** @readonly */ readonly threshold: number;
    /** Cached Group ID once computed. @type {Uint8Array | null} */
    _id: Uint8Array | null;
    _idPromise: Promise<Uint8Array<ArrayBufferLike>> | null;
    /** The number of members `M`. @returns {number} */
    get size(): number;
    /** The 16-byte Group ID (cached after the first call). @returns {Promise<Uint8Array>} */
    groupId(): Promise<Uint8Array>;
}
