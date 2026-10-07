import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-editor.js";

/**
 * A stand-in for an expanded node: the same shadow structure
 * `applyPortRouteColors` reads — a `.port` and its matching
 * `.port-label[data-port-name]` pill per port.
 *
 * @param {Array<{ name: string, direction: "in" | "out" }>} ports
 * @returns {HTMLElement}
 */
function makeNodeLike(ports) {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = ports
    .map(
      (port) =>
        `<div class="port port-${port.direction}" data-port-name="${port.name}"></div>` +
        `<div class="port-label" data-port-name="${port.name}"></div>`,
    )
    .join("");
  return host;
}

/**
 * @param {HTMLElement} host
 * @param {string} name
 * @returns {{ port: HTMLElement, label: HTMLElement }}
 */
function portPair(host, name) {
  const shadow = /** @type {ShadowRoot} */ (host.shadowRoot);
  return {
    port: /** @type {HTMLElement} */ (
      shadow.querySelector(`.port[data-port-name="${name}"]`)
    ),
    label: /** @type {HTMLElement} */ (
      shadow.querySelector(`.port-label[data-port-name="${name}"]`)
    ),
  };
}

describe("expanded-node port pill route colors (work document #35)", () => {
  it("colors pills from edge routes, IIP routes, and exported-port routes", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const em = editor.edgeManager;
    assert.ok(em, "the editor builds its EdgeManager on connect");

    const node = makeNodeLike([
      { name: "in", direction: "in" },
      { name: "out", direction: "out" },
      { name: "in2", direction: "in" },
      { name: "in3", direction: "in" },
    ]);
    const { port: inPort, label: inLabel } = portPair(node, "in");
    const { port: outPort, label: outLabel } = portPair(node, "out");
    const { label: in2Label } = portPair(node, "in2");
    const { port: in3Port, label: in3Label } = portPair(node, "in3");

    // Regular edge on the out port (route 3) — its target lives outside
    // this node, so in2 stays unconnected
    const remotePort = document.createElement("div");
    remotePort.classList.add("port", "port-in");
    remotePort.dataset.portName = "remote";
    em.addEdge(outPort, remotePort, 3);
    // IIP wire on the in port (route 5)
    const iip = document.createElement("div");
    em.connectIIP(iip, inPort, 5);
    // Exported-port wire on the remaining in port (route 7) — an exported
    // port connects through the same IIP-wire machinery
    const exported = document.createElement("div");
    em.connectIIP(exported, in3Port, 7);

    editor.applyPortRouteColors(node);

    assert.equal(
      inLabel.style.getPropertyValue("--port-route-color"),
      "var(--route-5)",
      "an IIP connection colors its port pill",
    );
    assert.equal(
      outLabel.style.getPropertyValue("--port-route-color"),
      "var(--route-3)",
      "a regular edge colors its port pill",
    );
    assert.equal(
      in3Label.style.getPropertyValue("--port-route-color"),
      "var(--route-7)",
      "an exported-port connection colors its port pill",
    );
    assert.equal(
      in2Label.style.getPropertyValue("--port-route-color"),
      "",
      "unconnected ports fall back to the accent",
    );
    editor.remove();
  });

  it("a regular edge wins when a port has both an edge and an IIP wire", () => {
    const editor = document.createElement("noflo-editor");
    document.body.appendChild(editor);
    const em = editor.edgeManager;
    assert.ok(em);

    const node = makeNodeLike([
      { name: "in", direction: "in" },
      { name: "out", direction: "out" },
    ]);
    const { port: inPort, label: inLabel } = portPair(node, "in");
    const { port: outPort } = portPair(node, "out");

    em.addEdge(outPort, inPort, 2);
    const iip = document.createElement("div");
    em.connectIIP(iip, inPort, 5);

    editor.applyPortRouteColors(node);
    assert.equal(
      inLabel.style.getPropertyValue("--port-route-color"),
      "var(--route-2)",
      "the first wire touching the port — the edge — wins",
    );
    editor.remove();
  });
});
