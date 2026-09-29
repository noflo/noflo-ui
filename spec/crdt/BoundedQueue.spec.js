import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BoundedQueue } from "../../src/crdt/BoundedQueue.js";

describe("BoundedQueue", () => {
  it("holds items up to capacity", () => {
    const queue = new BoundedQueue(3);
    queue.push("a");
    queue.push("b");
    assert.equal(queue.size, 2);
    assert.deepEqual(queue.drain(), ["a", "b"]);
    assert.equal(queue.size, 0);
  });

  it("drops the oldest item when overflowing", () => {
    const queue = new BoundedQueue(2);
    queue.push(1);
    queue.push(2);
    queue.push(3);
    assert.equal(queue.dropped, 1);
    assert.deepEqual(queue.drain(), [2, 3]);
  });

  it("tracks dropped count across overflows", () => {
    const queue = new BoundedQueue(1);
    for (let i = 0; i < 5; i++) {
      queue.push(i);
    }
    assert.equal(queue.dropped, 4);
    assert.deepEqual(queue.drain(), [4]);
  });

  it("rejects invalid capacity", () => {
    assert.throws(() => new BoundedQueue(0));
    assert.throws(() => new BoundedQueue(-1));
    assert.throws(() => new BoundedQueue(Infinity));
  });
});
