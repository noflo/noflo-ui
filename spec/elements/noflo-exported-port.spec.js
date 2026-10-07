import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-exported-port.js";
import "../../src/elements/noflo-editor.js";

describe("FlowExportedPort — the system boundary (guidelines §9)", () => {
  it("renders the data-socket / terminus shape with route-colored ring", () => {
    const el = document.createElement("noflo-exported-port");
    document.body.appendChild(el);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
      ).textContent ?? "";
    // Hollow/recessed center: the canvas color, not the node fill
    assert.match(
      style,
      /background-color: var\(--ui-bg\)/,
      "the center is the canvas — hollow in cyberpunk, white terminus in tube",
    );
    // The ring takes the route color, accent fallback
    assert.match(
      style,
      /border: 2px solid var\(--port-route-color, var\(--ui-accent\)\)/,
    );
    el.remove();
  });

  it("carries the four entity-age states and cleans up on null", () => {
    const el = document.createElement("noflo-exported-port");
    document.body.appendChild(el);
    for (const age of ["abstract", "golden", "offline", "crashed"]) {
      el.age = /** @type {any} */ (age);
      assert.equal(el.age, age);
      assert.ok(el.classList.contains(`state-${age}`));
      for (const other of ["abstract", "golden", "offline", "crashed"]) {
        if (other !== age) {
          assert.ok(!el.classList.contains(`state-${other}`));
        }
      }
    }
    el.age = null;
    assert.equal(el.age, null, "null follows the environment age");
    assert.ok(
      !["abstract", "golden", "offline", "crashed"].some((age) =>
        el.classList.contains(`state-${age}`),
      ),
    );
    el.age = /** @type {any} */ ("bogus");
    assert.equal(
      el.age,
      null,
      "an unknown value is not an age — the environment keeps governing",
    );
    el.remove();
  });

  it("the age × theme matrix and its motion gates are in the grammar", () => {
    const el = document.createElement("noflo-exported-port");
    document.body.appendChild(el);
    const style =
      /** @type {HTMLElement} */ (
        /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("style")
      ).textContent ?? "";
    // Per-age rules, theme variants keyed on the mirrored attribute
    assert.match(style, /:host\(\.state-abstract\) \.port-box/);
    assert.match(
      style,
      /:host\(\[data-theme="tube"\]\.state-golden\) \.port-box/,
      "tube's terminus bolds the ring instead of glowing",
    );
    assert.match(
      style,
      /:host\(\[data-theme="tube"\]\.state-offline\) \.port-box[\s\S]*?border-style: dashed/,
      "tube offline dashes the border — suspended service",
    );
    assert.match(style, /:host\(\.state-crashed\) \.port-box/);
    // Animations gated both ways
    assert.match(style, /@keyframes port-pulse/);
    assert.match(style, /@keyframes port-glitch/);
    assert.match(
      style,
      /@media \(prefers-reduced-motion: reduce\)/,
      "reduced motion stops the pulse and the glitch",
    );
    assert.match(
      style,
      /:host\(\[data-animations="off"\]\.state-crashed\) \.port-box/,
      "the data-animations hook stops the glitch",
    );
    el.remove();
  });

  it("mirrors the body's theme and animation state onto the host", () => {
    document.body.setAttribute("data-theme", "tube");
    document.body.setAttribute("data-animations", "off");
    const el = document.createElement("noflo-exported-port");
    document.body.appendChild(el);
    assert.equal(el.getAttribute("data-theme"), "tube");
    assert.equal(el.getAttribute("data-animations"), "off");
    el.remove();
    document.body.removeAttribute("data-theme");
    document.body.removeAttribute("data-animations");
  });
});

describe("exported port route coloring (guidelines §9)", () => {
  it("the editor publishes the wire's route color onto the port", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const port = document.createElement("div");
    port.classList.add("port", "port-in");
    port.dataset.portName = "in";

    const exported = /** @type {any} */ (
      editor.addExportedPort(100, 100, "out", "out", port, 3)
    );
    assert.equal(
      exported.style.getPropertyValue("--port-route-color"),
      "var(--route-3)",
      "the ring wears the sub-flow's route color at creation",
    );

    // Route cycling updates the ring through the optimistic preview path
    editor.previewEdgeRoute("out", 6);
    assert.equal(
      exported.style.getPropertyValue("--port-route-color"),
      "var(--route-6)",
      "cycling to a new route re-colors the ring",
    );
    editor.previewEdgeRoute("out", null);
    assert.equal(
      exported.style.getPropertyValue("--port-route-color"),
      "",
      "dropping the route falls back to the accent",
    );
    editor.remove();
  });
});
