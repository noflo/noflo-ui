/**
 * @file Route identity beyond hue (work document #35, guidelines §6):
 * the wires carry the age rules (abstract mutes the hue, offline
 * collapses it) plus the contrast casing for the routes whose stroke
 * cannot hold 3:1 on its own. The node-caption terminus roundels are
 * retired: the per-line diagram carries the route's identity now.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-node.js";
import { renderGraphIntoEditor } from "../../src/glass/renderGraph.js";

describe("the route hues' age rules and casing (guidelines §6)", () => {
  it("the editor's CSS carries the muting, the collapse, and the casing set", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (editor.shadowRoot).querySelector("style")
      ).textContent ?? "";
    // Abstract mutes the routed hue toward the canvas, bounded so the
    // 3:1 floor holds where the casing doesn't cover — the muting gates
    // on .routed so the unrouted ink never lightens past its floor
    assert.match(style, /\.state-abstract \.edge-flow\.routed \{/);
    assert.match(style, /color-mix\(/);
    // Offline collapses to grey ink regardless of route
    assert.match(
      style,
      /\.state-offline \.edge-flow \{[^}]*--edge-ink: var\(--edge-color\)/,
    );
    // The casing shows in tube for the routes that cannot hold 3:1 —
    // Overground, Circle, DLR, Victoria — and never in cyberpunk
    for (const route of [2, 3, 5, 6]) {
      assert.match(
        style,
        new RegExp(
          `:host\\(\\[data-theme="tube"\\]\\) \\.edge-casing\\.route-casing-${route}`,
        ),
        `tube routes ${route} carry the casing`,
      );
    }
    assert.ok(
      !/:host\(\[data-theme="cyberpunk"\]\) \.edge-casing/.test(style),
      "cyberpunk's palette holds 3:1 pure and muted: no casing",
    );
    editor.remove();
  });
});
