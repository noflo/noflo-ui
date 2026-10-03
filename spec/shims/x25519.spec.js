import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { installX25519SubtlePolyfill } from "../../src/shims/x25519-subtle.js";

const hexToBytes = (/** @type {string} */ hex) =>
  Uint8Array.from(hex.match(/../g) ?? [], (/** @type {string} */ h) =>
    parseInt(h, 16),
  );
const bytesToHex = (/** @type {Uint8Array} */ bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

describe("X25519 polyfill (@noble/curves-backed subtle shim)", () => {
  it("validates the @noble/curves version against the RFC 7748 §6.1 vectors", async () => {
    const curves = await import("../../vendor/noble-curves.js");
    const alicePriv = hexToBytes(
      "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
    );
    // Alice's public key, as published in RFC 7748 §6.1
    const alicePub = curves.x25519.getPublicKey(alicePriv);
    assert.equal(
      bytesToHex(alicePub),
      "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
    );
    // The §6.1 shared secret, as published in RFC 7748 §6.1 (computed from
    // Bob's private key against Alice's public key)
    const bobPriv = hexToBytes(
      "5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb",
    );
    const shared = curves.x25519.getSharedSecret(bobPriv, alicePub);
    assert.equal(
      bytesToHex(shared),
      "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742",
    );
  });

  it("does not install when the runtime supports X25519 natively", async () => {
    // Node's WebCrypto has native X25519: the polyfill must stay inactive
    // and leave crypto.subtle untouched
    const installed = await installX25519SubtlePolyfill();
    assert.equal(installed, false);
  });
});
