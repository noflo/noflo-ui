import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { roomDestinationHash } from "../../vendor/y-reticulum.js";

describe("room destination derivation (work document #34)", () => {
  it("derives the peer's room destination hash from its identity hash", async () => {
    // Golden values captured from a live session: the sibling browser
    // announced destination 3d2af125fb3cce4d… while its grants-map identity
    // hash was 9700b7faef4362bc46a672c8bc26facd, in room
    // noflo-ui:2a2a0e0c-db9e-45a6-bbc4-0d2396e6617d. Locking the derivation
    // down — the direct dial depends on it matching exactly.
    const room = "noflo-ui:2a2a0e0c-db9e-45a6-bbc4-0d2396e6617d";
    const peerHash = "9700b7faef4362bc46a672c8bc26facd";
    const destHash = await roomDestinationHash(room, peerHash);
    assert.match(destHash, /^[0-9a-f]{32}$/);
    assert.equal(
      destHash.slice(0, 16),
      "3d2af125fb3cce4d",
      "the derived hash matches the peer's announced room destination",
    );
  });

  it("derives a different hash per peer", async () => {
    const room = "noflo-ui:2a2a0e0c-db9e-45a6-bbc4-0d2396e6617d";
    const a = await roomDestinationHash(
      room,
      "9700b7faef4362bc46a672c8bc26facd",
    );
    const b = await roomDestinationHash(
      room,
      "00000000000000000000000000000000",
    );
    assert.notEqual(a, b);
  });
});
