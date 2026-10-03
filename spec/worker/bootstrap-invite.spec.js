import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteUri,
  DECLINE_REASON,
  generateInviteToken,
  INVITE_TOKEN_TTL_MS,
  isInviteRecordValid,
  parseInviteUri,
  STATE,
} from "../../src/worker/Bootstrap.js";

describe("bootstrap invite URIs (work document #25 §3.2)", () => {
  it("round-trips a built invite URI", () => {
    const hash = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const token = "11223344556677889900aabbccddeeff";
    const uri = buildInviteUri({ hostDestinationHash: hash, token });
    assert.equal(uri, `noflo://join/${hash}/${token}`);
    assert.deepEqual(parseInviteUri(uri), {
      hostDestinationHash: hash,
      token,
    });
  });

  it("normalizes uppercase input on build", () => {
    const uri = buildInviteUri({
      hostDestinationHash: "A1B2C3D4E5F60718293A4B5C6D7E8F90",
      token: "11223344556677889900AABBCCDDEEFF",
    });
    assert.match(uri, /noflo:\/\/join\/a1b2[0-9a-f]+\/1122[0-9a-f]+/);
    assert.ok(parseInviteUri(uri));
  });

  it("rejects malformed URIs", () => {
    for (const bad of [
      "",
      "noflo://join/",
      "noflo://join/abc",
      "noflo://join/short/11223344556677889900aabbccddeeff",
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/not-a-token",
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/",
      "https://example.org/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff",
      null,
      42,
    ]) {
      assert.equal(
        parseInviteUri(/** @type {any} */ (bad)),
        null,
        `should reject: ${String(bad)}`,
      );
    }
  });

  it("generates 128-bit hex tokens", () => {
    const token = generateInviteToken();
    assert.match(token, /^[0-9a-f]{32}$/);
    assert.notEqual(token, generateInviteToken(), "tokens are random");
  });
});

describe("invite token validation (work document #25 §7)", () => {
  const token = "11223344556677889900aabbccddeeff";
  const record = {
    token,
    createdAt: 1000,
    expiresAt: 1000 + INVITE_TOKEN_TTL_MS,
  };

  it("accepts the matching, unexpired token", () => {
    assert.ok(isInviteRecordValid(record, token, 2000));
  });

  it("is case-insensitive", () => {
    assert.ok(isInviteRecordValid(record, token.toUpperCase(), 2000));
  });

  it("rejects expired tokens", () => {
    assert.equal(
      isInviteRecordValid(record, token, record.expiresAt + 1),
      false,
    );
  });

  it("rejects foreign tokens and missing records", () => {
    assert.equal(
      isInviteRecordValid(record, "ffffffffffffffffffffffffffffffff", 2000),
      false,
    );
    assert.equal(isInviteRecordValid(null, token, 2000), false);
  });
});

describe("bootstrap protocol constants", () => {
  it("expose the documented decline reasons and states", () => {
    assert.deepEqual(Object.values(DECLINE_REASON), [
      "host_lacks_authority",
      "host_rejected",
      "invalid_token",
    ]);
    assert.equal(STATE.REQUESTING_PATH, "requesting_path");
    assert.equal(STATE.LINKING, "linking");
    assert.equal(STATE.KNOCKING, "knocking");
    assert.equal(STATE.WAIT_RESPONSE, "wait_response");
  });
});
