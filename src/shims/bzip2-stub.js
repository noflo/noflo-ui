/**
 * @file Vendor build shim: `@digitaldefiance/bzip2-wasm` is a hard dependency
 * of y-reticulum used only for compressing large sync payloads. It ships a
 * WASM binary that does not belong in the vendor bundle, so the build aliases
 * this stub in its place. y-reticulum's compression module catches init
 * failures and falls back to uncompressed Resources, so this stub only means
 * large updates travel uncompressed.
 */
export default class BZip2Stub {
  async init() {
    throw new Error(
      "bzip2 compression is not bundled; large CRDT updates travel uncompressed",
    );
  }
}
