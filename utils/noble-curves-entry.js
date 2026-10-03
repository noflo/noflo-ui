/**
 * @file Vendor build entry for @noble/curves: re-exports the ed25519 module
 * (which includes X25519) so the vendor bundle and its generated type
 * declarations cover the surface the X25519 polyfill uses.
 */
export * from "@noble/curves/ed25519.js";
