import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimInstructions,
  claimUri,
  createClaimCode,
  encodeWords,
  lxmaUri,
  messageClaims,
} from "../../src/node/claim.js";

describe("Companion claim bootstrap (work document #47 scope item 1)", () => {
  it("generates transcribable 8-word one-time codes", () => {
    const code = createClaimCode();
    assert.match(code, /^[a-z]+( [a-z]+){7}$/, "8 space-separated words");
    assert.equal(code.split(" ").length, 8);
    assert.notEqual(code, createClaimCode(), "codes do not repeat");
  });

  it("encodeWords matches the BIP39 vector shape and round-trips", () => {
    assert.equal(
      encodeWords(new Uint8Array(11).fill(1)),
      "absurd amount doctor acoustic avoid letter advice cage",
      "the canonical BIP39 test-vector shape",
    );
  });

  it("messageClaims matches across punctuation and case", () => {
    const code = createClaimCode();
    assert.equal(messageClaims(`please claim: ${code}`, code), true);
    assert.equal(
      messageClaims(code.split(" ").join(", ") + "!", code),
      true,
      "punctuation and case do not break the match",
    );
    assert.equal(messageClaims("hello world", code), false);
    assert.equal(messageClaims(null, code), false);
  });

  it("builds the claim URI with the delivery destination", () => {
    assert.equal(
      claimUri("abc123", "ee".repeat(16)),
      `noflo://claim/abc123?delivery=${"ee".repeat(16)}`,
    );
  });

  it("the lxma:// QR is the machine-actionable artifact", () => {
    const publicKey = new Uint8Array(64).fill(7);
    const uri = lxmaUri("ee".repeat(16), publicKey);
    assert.equal(
      uri,
      `lxma://${"ee".repeat(16)}:${"07".repeat(64)}`,
      "Columba IdentityQrCodeUtils format: hash:key",
    );
  });

  it("instructions carry the code, contact QR, and hashes", async () => {
    const text = await claimInstructions(
      "abc123",
      "ee".repeat(16),
      "ff".repeat(16),
      new Uint8Array(64).fill(7),
    );
    assert.match(text, /UNCLAIMED/);
    assert.match(
      text,
      /legally|absurd|[a-z]+ [a-z]+/,
      "a word code is the message body",
    );
    assert.doesNotMatch(text, /32-hex/, "the code is not hex anymore");
    assert.ok(
      text.includes(`lxma://${"ee".repeat(16)}:${"07".repeat(64)}`),
      "the lxma:// contact string is printed",
    );
    assert.ok(
      text.includes(`?delivery=${"ee".repeat(16)}`),
      "the future-native-handler URI stays as text",
    );
    assert.ok(
      text.includes("ff".repeat(16)),
      "identity hash for trust pinning",
    );
    assert.match(text, /█/, "a terminal QR is rendered");
  });
});
