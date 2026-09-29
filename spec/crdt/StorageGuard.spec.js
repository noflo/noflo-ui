import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkEviction,
  EVICTION_WARN_FRACTION,
} from "../../src/crdt/StorageGuard.js";

describe("checkEviction", () => {
  it("returns null when storage estimates are unsupported", async () => {
    assert.equal(await checkEviction(undefined), null);
    assert.equal(await checkEviction({}), null);
  });

  it("reports ok under the warn threshold", async () => {
    const status = await checkEviction({
      estimate: async () => ({ usage: 100, quota: 1000 }),
    });
    assert.ok(status);
    assert.equal(status.level, "ok");
    assert.equal(status.fraction, 0.1);
  });

  it("warns when usage crosses the threshold", async () => {
    const status = await checkEviction(
      { estimate: async () => ({ usage: 850, quota: 1000 }) },
      { warnFraction: EVICTION_WARN_FRACTION },
    );
    assert.ok(status);
    assert.equal(status.level, "warning");
  });

  it("honors a custom warn fraction", async () => {
    const status = await checkEviction(
      { estimate: async () => ({ usage: 500, quota: 1000 }) },
      { warnFraction: 0.4 },
    );
    assert.ok(status);
    assert.equal(status.level, "warning");
  });
});
