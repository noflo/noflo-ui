import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";
import "../../src/elements/noflo-line-diagram.js";

describe("the wires render the ages (guidelines §6)", () => {
  it("the canvas carries the golden age's heavier wires", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const style = /** @type {HTMLElement} */ (
      editor.shadowRoot?.querySelector("style")
    )?.textContent;
    assert.ok(style, "the editor renders");
    // Abstract mutes routed ink, offline collapses it, golden reads
    // heavier: the three age rules the wires table names
    assert.match(style, /\.state-abstract \.edge-flow\.routed/);
    assert.match(style, /\.state-offline \.edge-flow/);
    assert.match(
      style,
      /\.state-golden \.edge-flow \{[^}]*stroke-width: calc\(var\(--edge-width, 4px\)\)/,
      "golden's wires carry +2px over the two-under-full base",
    );
    editor.remove();
  });

  it("the per-line strips carry the same golden weight", () => {
    document.body.setAttribute("data-age", "golden");
    const el = /** @type {any} */ (
      document.createElement("noflo-line-diagram")
    );
    document.body.appendChild(el);
    el.setLine?.({ route: 6, stations: [] });
    const style = /** @type {HTMLElement} */ (
      el.shadowRoot?.querySelector("style")
    )?.textContent;
    assert.ok(style, "the strip renders");
    assert.match(
      style,
      /:host\(\.state-golden\) \.rail \{[^}]*7px/,
      "the rail's +2px matches the canvas",
    );
    assert.match(style, /:host\(\.state-golden\) \.spur \{[^}]*5px/);
    document.body.setAttribute("data-age", "abstract");
    el.remove();
  });
});
