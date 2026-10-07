import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";

/**
 * The exported-port geometry bug (work document #35): an exported port's
 * host element is taller than its dot — the name label sits below — so a
 * wire anchored at the host rect's center lands below the dot's center.
 * getPortPosition must resolve to the inner .port dot, the same way the
 * drag and hit-test paths already do.
 */
describe("getPortPosition anchors to the exported port's dot", () => {
  it("uses the inner .port dot's center, not the host rect's center", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    editor.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 500,
      height: 500,
      right: 500,
      bottom: 500,
    });

    // A host shaped like noflo-exported-port: a 20px-wide, 40px-tall
    // column whose dot sits in the upper half, label below
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<div class="port-box port"></div><div class="port-name-label">out</div>`;
    const dot = /** @type {HTMLElement} */ (shadow.querySelector(".port"));
    host.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      width: 20,
      height: 40,
      right: 120,
      bottom: 140,
    });
    // Dot centered horizontally, dot center 13px from the host top
    dot.getBoundingClientRect = () => ({
      left: 102.5,
      top: 105.5,
      width: 15,
      height: 15,
      right: 117.5,
      bottom: 120.5,
    });

    const expected = editor.viewportToGraph(110, 113);
    const anchored = editor.getPortPosition(host);
    assert.deepEqual(anchored, expected, "the wire anchor is the dot's center");
    assert.notDeepEqual(
      editor.viewportToGraph(110, 120),
      anchored,
      "the host rect's center — where the label pulls it — is not the anchor",
    );
    editor.remove();
  });

  it("regular ports (no inner .port) anchor at their own rect's center", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    editor.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 500,
      height: 500,
      right: 500,
      bottom: 500,
    });

    const port = document.createElement("div");
    port.classList.add("port", "port-out");
    port.dataset.portName = "out";
    port.getBoundingClientRect = () => ({
      left: 200,
      top: 200,
      width: 12,
      height: 12,
      right: 212,
      bottom: 212,
    });

    const expected = editor.viewportToGraph(206, 206);
    assert.deepEqual(
      editor.getPortPosition(port),
      expected,
      "node ports keep anchoring at their rect center",
    );
    editor.remove();
  });
});
