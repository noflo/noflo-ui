import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { needsLocalHubProbe } from "../../src/worker/MeshSync.js";

/**
 * Sets a fake browser location (the predicate reads `globalThis.location`).
 *
 * @param {string} hostname
 * @param {string} protocol
 */
function withLocation(hostname, protocol, run) {
  const original = /** @type {any} */ (globalThis).location;
  /** @type {any} */ (globalThis).location = { hostname, protocol };
  try {
    run();
  } finally {
    /** @type {any} */ (globalThis).location = original;
  }
}

describe("local Companion hub probe (SPEC auto-detect)", () => {
  const cloud = {
    type: "websocket",
    options: { url: "wss://cloud.lille-oe.de" },
    enabled: true,
  };
  const localHub = {
    type: "websocket",
    options: { url: "ws://localhost:3569" },
    enabled: true,
  };

  it("probes on a localhost http page with no other WebSocket interface", () => {
    withLocation("localhost", "http:", () => {
      assert.equal(needsLocalHubProbe([]), true);
      // The hub yields to a configured cloud interface: reticulum-js
      // cannot relay yet, and a hub attached beside it splits the path
      // table (announces prefer the shorter hub path whose requests die)
      assert.equal(needsLocalHubProbe([cloud]), false, "cloud wins");
    });
    withLocation("127.0.0.1", "http:", () => {
      assert.equal(needsLocalHubProbe([]), true);
    });
  });

  it("skips when any WebSocket interface is configured", () => {
    withLocation("localhost", "http:", () => {
      assert.equal(needsLocalHubProbe([localHub]), false);
      assert.equal(needsLocalHubProbe([cloud, localHub]), false);
    });
  });

  it("skips on https pages (mixed content) and outside browsers", () => {
    withLocation("localhost", "https:", () => {
      assert.equal(needsLocalHubProbe([]), false);
    });
    withLocation("app.noflojs.org", "http:", () => {
      assert.equal(needsLocalHubProbe([]), false);
    });
    assert.equal(needsLocalHubProbe([]), false, "no location: not a browser");
  });
});
