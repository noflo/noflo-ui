import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createX25519SubtleProxy,
  probeX25519Support,
  setNativeX25519SupportedForTesting,
} from "../../src/shims/x25519-subtle.js";

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

  it("delegates to native X25519 once the probe confirms support", async () => {
    // Node's WebCrypto has native X25519: after the probe, the proxy must
    // delegate X25519 operations to the native implementation
    await probeX25519Support();
    const native = /** @type {any} */ (globalThis.crypto).subtle;
    const proxied = createX25519SubtleProxy(native);
    const pair = await proxied.generateKey({ name: "X25519" }, true, [
      "deriveKey",
      "deriveBits",
    ]);
    assert.equal(pair.privateKey.type, "private");
    assert.ok(pair.privateKey instanceof CryptoKey, "native keys pass through");
  });
});

describe("the polyfill's identity round-trip (work document #47's runtime child)", () => {
  it("the generated identity reloads through the persisted private key", async () => {
    // The reload path broke twice in the field: exportKey("jwk") returned
    // raw bytes where the caller reads jwk.x (undefined.length), and the
    // polyfilled keys carried no algorithm for the caller's re-import
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const { FileStorageAdapter } = await import("@reticulum/node");
    const { Identity } = await import("../../vendor/reticulum-core.js");

    const dir = mkdtempSync(path.join(tmpdir(), "x25519-reload-"));
    try {
      const first = await Identity.loadOrGenerate(new FileStorageAdapter(dir));
      const second = await Identity.loadOrGenerate(new FileStorageAdapter(dir));
      assert.ok(second, "the reload succeeds");
      assert.deepEqual(
        Array.from(second.identityHash ?? []),
        Array.from(first.identityHash ?? []),
        "the reloaded identity is the same one",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("the shim's routing table (work document #67's shim finding)", () => {
  const SCALAR = hexToBytes(
    "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a",
  );
  /** Imports a polyfill-managed X25519 private key through the proxy. */
  const importPolyfillKey = async (proxied, supported) => {
    setNativeX25519SupportedForTesting(supported);
    return proxied.importKey("pkcs8", SCALAR, { name: "X25519" }, true, [
      "deriveKey",
      "deriveBits",
    ]);
  };

  it("serves X25519 through the polyfill on runtimes without native support (WebKit)", async () => {
    const proxied = createX25519SubtleProxy(
      /** @type {any} */ (globalThis.crypto).subtle,
    );
    try {
      const key = await importPolyfillKey(proxied, false);
      assert.equal(key.type, "private", "the polyfill imported the key");
      assert.equal(
        key instanceof CryptoKey,
        false,
        "the key is a polyfill object, not a native CryptoKey",
      );
      // The identity restore path: the polyfill key derives and exports
      const peerPub = hexToBytes(
        "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
      );
      const bits = await proxied.deriveBits(
        { name: "X25519", public: peerPub },
        key,
        256,
      );
      assert.equal(bits.byteLength, 32, "the polyfill derived the secret");
      const raw = await proxied.exportKey("raw", key);
      assert.equal(
        bytesToHex(raw),
        "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
        "the raw export is the public key",
      );
      const pkcs8 = await proxied.exportKey("pkcs8", key);
      assert.equal(
        bytesToHex(pkcs8.slice(-32)),
        bytesToHex(SCALAR),
        "the pkcs8 export carries the private scalar (the identity restore path)",
      );
    } finally {
      setNativeX25519SupportedForTesting(null);
    }
  });

  it("a polyfill key exports through the polyfill even after native support is confirmed", async () => {
    const proxied = createX25519SubtleProxy(
      /** @type {any} */ (globalThis.crypto).subtle,
    );
    try {
      // The key is created while the probe is unresolved (the boot race):
      // a polyfill object on a runtime that later confirms native support
      const key = await importPolyfillKey(proxied, null);
      setNativeX25519SupportedForTesting(true);
      // Pre-fix, this routed to the native exportKey, which rejected the
      // polyfill key object with "not of type CryptoKey" — the bridge's
      // link responder crash
      const raw = await proxied.exportKey("raw", key);
      assert.equal(
        bytesToHex(raw),
        "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a",
        "the polyfill key exports its public key",
      );
    } finally {
      setNativeX25519SupportedForTesting(null);
    }
  });
});
