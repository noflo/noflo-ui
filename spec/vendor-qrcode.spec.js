import assert from "node:assert/strict";
import { describe, it } from "node:test";

import QRCode from "../vendor/qrcode.js";

/**
 * The vendored QR encoder (work document #28 update #3): the invite and
 * connection URIs render as SVG strings injected into Shadow DOM — the
 * browser surface only, no canvas, no node APIs.
 */
describe("vendored qrcode (work document #28)", () => {
  it("encodes an invite URI as an SVG string", async () => {
    const svg = await QRCode.toString(
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff",
      { type: "svg", margin: 1, width: 132 },
    );
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(
      svg,
      /viewBox="\d+ \d+ \d+ \d+"/,
      "the matrix carries the URI",
    );
    assert.ok(svg.includes("path"), "the modules render as one path");
  });

  it("distinguishes invites: different URIs, different matrices", async () => {
    const one = await QRCode.toString("noflo://join/aaaa", {
      type: "svg",
      margin: 1,
    });
    const other = await QRCode.toString("noflo://join/bbbb", {
      type: "svg",
      margin: 1,
    });
    assert.notEqual(one, other);
  });
});
