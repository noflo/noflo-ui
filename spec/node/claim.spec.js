import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimInstructions,
  claimUri,
  createClaimCode,
  messageClaims,
} from "../../src/node/claim.js";

describe("Companion claim bootstrap (work document #47 scope item 1)", () => {
  it("generates 32-hex-char one-time codes", () => {
    const code = createClaimCode();
    assert.match(code, /^[0-9a-f]{32}$/);
    assert.notEqual(code, createClaimCode(), "codes do not repeat");
  });

  it("builds the claim URI with the delivery destination", () => {
    assert.equal(
      claimUri("abc123", "ee".repeat(16)),
      `noflo://claim/abc123?delivery=${"ee".repeat(16)}`,
    );
  });

  it("matches the code inside a larger message", () => {
    assert.equal(messageClaims("please claim: abc123", "abc123"), true);
    assert.equal(messageClaims("hello", "abc123"), false);
    assert.equal(messageClaims(null, "abc123"), false);
  });

  it("instructions carry the code, URI, hashes, and a QR", async () => {
    const text = await claimInstructions(
      "abc123",
      "ee".repeat(16),
      "ff".repeat(16),
    );
    assert.match(text, /UNCLAIMED/);
    assert.match(text, /abc123/);
    assert.ok(
      text.includes(`noflo://claim/abc123?delivery=${"ee".repeat(16)}`),
    );
    assert.ok(text.includes("ee".repeat(16)), "delivery hash for addressing");
    assert.ok(
      text.includes("ff".repeat(16)),
      "identity hash for trust pinning",
    );
    assert.match(text, /█/, "a terminal QR is rendered");
  });
});
