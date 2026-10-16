/**
 * @file The schema cache (work document #57): a content-addressed store
 * keyed by the digest the vendored fbp-protocol computes (SHA-256 over
 * RFC 8785 canonicalization), persisted in IndexedDB so schema bodies
 * survive isolated sessions. Populated from installed packages'
 * `schemas/` directories, registry fetches, and `0x28`/`0x29` remote
 * retrieval; shared with the CRDT project model so project-scoped
 * schemas live beside project components.
 *
 * The reference resolution: `getRef` parses a reference (`urn:noflo:
 * ns/name@<digest>#/pointer`, the published form) into its digest and
 * JSON Pointer, fetches the body, and walks the pointer — `$ref`
 * resolution touches only the local content store, never the network
 * (the noflo-side normative rule). A miss is the offline degradation
 * ladder's defined outcome: the subtree falls back, not the session.
 *
 * The storage seam is injectable: IndexedDB by default, a memory map in
 * tests.
 */

import { digestSchema, parseSchemaRef } from "../../vendor/fbp-protocol.js";

/**
 * The IndexedDB-backed storage: one object store, keyed by digest.
 *
 * @returns {Promise<{ get: (digest: string) => Promise<any | null>, put: (record: { digest: string, id?: string, body: any }) => Promise<void>, all: () => Promise<Array<{ digest: string, id?: string, body: any }>> }>}
 */
async function idbStorage() {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("noflo-schemas", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("schemas", { keyPath: "digest" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("open failed"));
  });
  const transaction = (/** @type {"readonly" | "readwrite"} */ mode) =>
    database.transaction("schemas", mode).objectStore("schemas");
  return {
    get: (digest) =>
      new Promise((resolve, reject) => {
        const request = transaction("readonly").get(digest);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () =>
          reject(request.error ?? new Error("get failed"));
      }),
    put: (record) =>
      new Promise((resolve, reject) => {
        const request = transaction("readwrite").put(record);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error("put failed"));
      }),
    all: () =>
      new Promise((resolve, reject) => {
        const request = transaction("readonly").getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () =>
          reject(request.error ?? new Error("all failed"));
      }),
  };
}

/**
 * Creates a schema cache.
 *
 * @param {Object} [options]
 * @param {{ get: (digest: string) => Promise<any | null>, put: (record: { digest: string, id?: string, body: any }) => Promise<void>, all: () => Promise<Array<{ digest: string, id?: string, body: any }>> }} [options.storage] The
 *   backing store; IndexedDB by default, injectable for tests.
 * @returns {{
 *   put: (body: any, id?: string) => Promise<string>,
 *   get: (digest: string) => Promise<any | null>,
 *   getRef: (ref: string) => Promise<any | null>,
 *   all: () => Promise<Array<{ digest: string, id?: string, body: any }>>,
 * }}
 */
export function createSchemaCache({ storage } = {}) {
  /** @type {Promise<any> | null} */
  let backingPromise = null;
  async function store() {
    if (!backingPromise) {
      backingPromise = Promise.resolve(storage ?? idbStorage());
    }
    return await backingPromise;
  }

  return {
    /**
     * Stores a body under its content-addressed digest (idempotent by
     * construction: the same body digests to the same address).
     *
     * @param {any} body
     * @param {string} [id] The `ns/name` identifier, when the schema is
     *   published rather than anonymous.
     * @returns {Promise<string>} The hex digest.
     */
    async put(body, id) {
      const digest = await digestSchema(body);
      const backing = await store();
      await backing.put({ digest, ...(id ? { id } : {}), body });
      return digest;
    },

    /**
     * Fetches a body by digest.
     *
     * @param {string} digest
     * @returns {Promise<any | null>}
     */
    async get(digest) {
      const backing = await store();
      return (await backing.get(digest))?.body ?? null;
    },

    /**
     * Resolves a schema reference to its body: the published form
     * (`urn:noflo:ns/name@<digest>#/pointer`) parses into digest and
     * pointer, the body fetches from the store, and the pointer walks.
     * Returns null on a miss — the degradation ladder's defined outcome,
     * never an error thrown at the renderer.
     *
     * @param {string} ref
     * @returns {Promise<any | null>}
     */
    async getRef(ref) {
      try {
        const parsed = parseSchemaRef(ref);
        if (!parsed.digest) return null;
        const backing = await store();
        const record = await backing.get(parsed.digest);
        if (!record) return null;
        let body = record.body;
        if (parsed.fragment) {
          for (const segment of parsed.fragment.split("/").filter(Boolean)) {
            body = body?.[segment];
          }
        }
        return body ?? null;
      } catch {
        // A malformed reference resolves to nothing — the fallback is
        // declared, not an exception thrown at the renderer
        return null;
      }
    },

    /**
     * Every stored record, for the session-wide inspection surfaces.
     */
    all: async () => {
      const backing = await store();
      return await backing.all();
    },
  };
}

/** The app-level cache singleton (the Glass's content store). */
let singleton = /** @type {ReturnType<typeof createSchemaCache> | null} */ (
  null
);

/**
 * The Glass's schema cache, created on first use (tests create their own
 * through {@link createSchemaCache} to stay isolated).
 *
 * @returns {ReturnType<typeof createSchemaCache>}
 */
export function schemaCache() {
  if (!singleton) {
    singleton = createSchemaCache();
  }
  return singleton;
}
