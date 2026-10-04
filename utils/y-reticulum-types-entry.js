/**
 * @file Vendor build entry for type generation: re-exports y-reticulum so
 * its shipped declarations flow into the vendor type surface. y-reticulum
 * 0.4.0 ships complete declarations for its chunked build (work document
 * #24); the yjs and @reticulum/core references in those declarations resolve
 * to the same package type trees the sibling vendor shims re-export.
 */
export * from "y-reticulum";
