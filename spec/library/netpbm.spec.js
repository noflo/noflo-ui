import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeNetpbm, netpbmToDataUrl } from "../../src/library/netpbm.js";

describe("netpbm decoding (work document #5 update #16)", () => {
  it("decodes an ASCII pixmap (P3)", () => {
    // A 2x1 image: red pixel, green pixel
    const p3 = "P3\n# a comment\n2 1\n255\n255 0 0  0 255 0\n";
    const image = decodeNetpbm(p3);
    assert.ok(image, "decodes");
    assert.equal(image.width, 2);
    assert.equal(image.height, 1);
    assert.deepEqual(
      [...image.pixels.slice(0, 8)],
      [255, 0, 0, 255, 0, 255, 0, 255],
    );
  });

  it("decodes an ASCII bitmap (P1) with inverted bits", () => {
    const p1 = "P1\n2 2\n0 1 1 0\n";
    const image = decodeNetpbm(p1);
    assert.ok(image);
    // 0 = white in PBM, 1 = black; replicated into RGB
    assert.deepEqual(
      [...image.pixels.slice(0, 8)],
      [255, 255, 255, 255, 0, 0, 0, 255],
    );
  });

  it("scales by maxval (P2 graymap)", () => {
    const p2 = "P2\n1 1\n200\n100\n";
    const image = decodeNetpbm(p2);
    assert.ok(image);
    const gray = image.pixels[0];
    assert.ok(Math.abs(gray - 127) <= 1, "100/200 scales to ~127 gray");
  });

  it("refuses non-netpbm data", () => {
    assert.equal(decodeNetpbm("GIF89a...."), null);
    assert.equal(decodeNetpbm(""), null);
  });

  it("renders a data URL when a document is available", () => {
    if (typeof document === "undefined") return;
    const url = netpbmToDataUrl("P3\n1 1\n255\n255 0 0\n");
    assert.ok(url?.startsWith("data:image/png;base64,"), "a PNG data URL");
  });
});
