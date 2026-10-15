/**
 * @file The bz2 adapter for the rngit link (work document #9): rngit sends
 * its `/mgmt/work` responses as bz2-compressed Resources, and the Link
 * needs a `{ compress, decompress }` provider on its `bz2` field to decode
 * them.
 *
 * The emscripten module + its wasm live in `vendor/bz2/` (copied by the
 * vendor build; the module resolves the wasm beside itself via
 * scriptDirectory — bundling would break that resolution). This adapter
 * binds the factory to that location and exposes the @reticulum/core
 * `Bzip2` interface contract.
 */

import BZip2 from "../../vendor/bz2.js";

/** @type {{ compress: (data: Uint8Array) => Uint8Array, decompress: (data: Uint8Array, outputLen: number) => Uint8Array } | null} */
let instance = null;

/**
 * Creates and initialises the bz2 provider (work document #9): the rngit
 * link's compression provider, required to decode the board's
 * bz2-compressed responses. The instance is shared — the link holds one
 * provider.
 *
 * @returns {Promise<{ compress: (data: Uint8Array) => Uint8Array, decompress: (data: Uint8Array, outputLen: number) => Uint8Array }>}
 */
export async function createBz2() {
  if (instance) return instance;
  const bz = new BZip2();
  await bz.init();
  instance = {
    compress: (/** @type {Uint8Array} */ data) => bz.compress(data),
    decompress: (
      /** @type {Uint8Array} */ data,
      /** @type {number} */ outputLen,
    ) => bz.decompress(data, outputLen),
  };
  return instance;
}
