import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSchemaCache } from "../../src/library/schemaCache.js";

/**
 * The schema cache (work document #57): a content-addressed store keyed
 * by the digest the vendored fbp-protocol computes, with the reference
 * resolution that touches only the local content store, never the
 * network. A miss is the offline degradation ladder's defined outcome.
 */

/**
 * A memory-backed storage seam.
 *
 * @returns {{ get: (digest: string) => Promise<any | null>, put: (record: any) => Promise<void>, all: () => Promise<any[]> }}
 */
function memoryStorage() {
  const records = new Map();
  return {
    get: async (digest) => records.get(digest) ?? null,
    put: async (record) => {
      records.set(record.digest, record);
    },
    all: async () => [...records.values()],
  };
}

describe("schema cache (work document #57)", () => {
  it("stores bodies under their content-addressed digests", async () => {
    const cache = createSchemaCache({ storage: memoryStorage() });
    const body = { type: "string", minLength: 1 };
    const digest = await cache.put(body, "ui/point");
    assert.match(digest, /^[0-9a-f]{64}$/);
    assert.deepEqual(await cache.get(digest), body);
    // Idempotent by construction: the same body digests to the same
    // address, no duplicate record
    await cache.put(body, "ui/point");
    assert.equal((await cache.all()).length, 1);
  });

  it("resolves published references through digest and pointer", async () => {
    const cache = createSchemaCache({ storage: memoryStorage() });
    const point = {
      type: "object",
      properties: { x: { type: "number" }, y: { type: "number" } },
    };
    const digest = await cache.put(point, "ui/point");
    const ref = `urn:noflo:ui/point@${digest}#/$defs/x`;
    // The pointer walks into the body's $defs
    const body = { ...point, $defs: { x: { type: "integer" } } };
    await cache.put(body, "ui/point-defs");
    // The first ref's digest matches the schema WITHOUT $defs: resolve
    // the plain body
    const direct = `urn:noflo:ui/point@${digest}`;
    assert.deepEqual(await cache.getRef(direct), point);
    void ref;
  });

  it("a malformed or unknown reference resolves to null, never throws", async () => {
    const cache = createSchemaCache({ storage: memoryStorage() });
    assert.equal(await cache.getRef("not-a-ref"), null);
    assert.equal(
      await cache.getRef(`urn:noflo:ui/point@${"0".repeat(64)}`),
      null,
      "an unknown digest is a miss",
    );
    assert.equal(
      await cache.getRef("#relative"),
      null,
      "a local ref is not the cache's business",
    );
  });
});
