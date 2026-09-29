/**
 * @file Bounded queue with drop-oldest backpressure, per SPEC "Backpressure &
 * Queuing": telemetry pushed from the Engine to the Glass uses a bounded
 * queue so telemetry bursts cannot lag the UI.
 */

/**
 * @template T
 */
export class BoundedQueue {
  /**
   * @param {number} capacity Maximum number of items held; oldest are dropped.
   */
  constructor(capacity) {
    if (!Number.isFinite(capacity) || capacity < 1) {
      throw new Error(`BoundedQueue capacity must be >= 1, got ${capacity}`);
    }
    /** @type {number} */
    this.capacity = capacity;
    /** @type {T[]} */
    this.items = [];
    /** @type {number} */
    this.dropped = 0;
  }

  /**
   * Appends an item. When the queue is full, the oldest item is dropped.
   *
   * @param {T} item
   */
  push(item) {
    if (this.items.length >= this.capacity) {
      this.items.shift();
      this.dropped++;
    }
    this.items.push(item);
  }

  /**
   * Removes and returns all queued items in order.
   *
   * @returns {T[]}
   */
  drain() {
    const items = this.items;
    this.items = [];
    return items;
  }

  /**
   * @returns {number}
   */
  get size() {
    return this.items.length;
  }
}
