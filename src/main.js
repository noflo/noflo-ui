/**
 * Main entry point for NoFlo UI
 */

import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";

const backend = new Worker("src/backend.js", { type: "module" });

backend.onmessage = (event) => {
  const { type, payload } = event.data;
  console.log(`[Main] Received from backend: ${type}`, payload);
};

async function init() {
  console.log("Initializing NoFlo UI...");

  // Initialize backend
  backend.postMessage({ type: "INIT", payload: {} });

  // Register Web Components
  customElements.define("noflo-editor", FlowEditor);
  customElements.define("noflo-node", FlowNode);
  customElements.define("noflo-iip", FlowIIP);
  customElements.define("noflo-radial-menu", FlowRadialMenu);
  customElements.define("noflo-selection-pills", SelectionPills);

  // Initial setup
  const app = document.getElementById("app");
  if (app) {
    const pills = document.createElement("noflo-selection-pills");
    document.body.appendChild(pills);
    pills.addEventListener("clear-selection", (e) => {
      const editor = /** @type {FlowEditor} */ (document.querySelector("noflo-editor"));
      if (!editor) return;
      const event = /** @type {CustomEvent} */ (e);
      if (event.detail.type === "nodes") {
        editor.clearNodeSelection();
      } else if (event.detail.type === "edges") {
        editor.clearEdgeSelection();
      } else {
        editor.clearSelection();
      }
    });

    const editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
    app.appendChild(editor);

    editor.addEventListener("wire-connection-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      editor.addEdge(event.detail.portA, event.detail.portB);
    });

    editor.addEventListener("node-creation-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { x, y, startPort } = event.detail;
      const newNode = editor.addNode("New Node", x, y);
      const port = /** @type {HTMLElement} */ (startPort);
      const isOut = port.classList.contains("port-out");
      const targetPort = newNode.shadowRoot.querySelector(
        `.port${isOut ? "-in" : "-out"}`,
      );
      if (targetPort) {
        // Wait for the next frame to ensure the node is laid out
        requestAnimationFrame(() => {
          if (isOut) {
            editor.addEdge(port, /** @type {HTMLElement} */ (targetPort));
          } else {
            editor.addEdge(/** @type {HTMLElement} */ (targetPort), port);
          }
          requestAnimationFrame(() => {
            editor.updateEdges();
          });
        });
      }
    });

    editor.addEventListener("iip-creation-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { x, y, startPort } = event.detail;
      const newIIP = editor.addIIP(x, y, "Value");
      requestAnimationFrame(() => {
        editor.addIIPWire(newIIP, /** @type {HTMLElement} */ (startPort));
      });
    });

    editor.addEventListener("selection-changed", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      console.log("selection", event.detail);
      updateSelectionPills(event.detail);
    });

    editor.addEventListener("node-removal-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      console.log("remove node", event.detail);
    });
    editor.addEventListener("edge-removal-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      console.log("remove edge", event.detail);
    });

    editor.addEventListener("iip-edit-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { iip } = event.detail;
      const iipElement = /** @type {FlowIIP} */ (iip);
      const newValue = prompt("Enter new IIP value:", iipElement.value);
      if (newValue !== null) {
        iipElement.value = newValue;
      }
    });

    editor.addEventListener("iip-removal-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { iip } = event.detail;
      editor.removeIIP(/** @type {FlowIIP} */ (iip));
    });

    editor.addEventListener("iip-send-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { iip } = event.detail;
      const iipElement = /** @type {FlowIIP} */ (iip);
      console.log(
        `[Main] Sending IIP: ${iipElement.getAttribute("name")} with value: ${iipElement.value}`,
      );
      // In a real app, this would send a message to the backend
    });

    // Add some sample nodes
    const source = /** @type {FlowNode} */ (editor.addNode(
      "Source",
      100,
      200,
      [],
      [{ type: "regular", name: "out" }],
    ));
    source.setMetadata({ name: "Source", icon: "fa-play" });

    const filter = /** @type {FlowNode} */ (editor.addNode(
      "Filter",
      300,
      100,
      [{ type: "regular", name: "in" }],
      [
        { type: "regular", name: "out" },
        { type: "regular", name: "error" },
      ],
    ));
    filter.setMetadata({ name: "Filter", icon: "fa-filter" });

    const splitter = /** @type {FlowNode} */ (editor.addNode(
      "Splitter",
      300,
      300,
      [{ type: "regular", name: "in" }],
      [{ type: "array", name: "out", size: 3 }],
    ));
    splitter.setMetadata({ name: "Splitter", icon: "fa-code-branch" });

    const aggregator = /** @type {FlowNode} */ (editor.addNode(
      "Aggregator",
      500,
      300,
      [{ type: "array", name: "in", size: 3 }],
      [{ type: "regular", name: "out" }],
    ));
    aggregator.setMetadata({
      name: "Aggregator",
      icon: "fa-layer-group",
    });

    const logger = /** @type {FlowNode} */ (editor.addNode(
      "Logger",
      700,
      100,
      [{ type: "regular", name: "in" }],
      [],
    ));
    logger.setMetadata({ name: "Logger", icon: "fa-terminal" });

    const sink = /** @type {FlowNode} */ (editor.addNode(
      "Sink",
      700,
      300,
      [{ type: "regular", name: "in" }],
      [],
    ));
    sink.setMetadata({ name: "Sink", icon: "fa-database" });

    const router = /** @type {FlowNode} */ (editor.addNode(
      "Router",
      500,
      100,
      [{ type: "regular", name: "in" }],
      [{ type: "regular", name: "out" }],
      40,
    ));
    router.setMetadata({ name: "Router", icon: "fa-route" });

    // Initial connections
    editor.connectNodes(source, "out", filter, "in", "0");
    editor.connectNodes(source, "out", splitter, "in", "1");

    editor.connectNodes(filter, "out", logger, "in", "2");

    // Connect only some ArrayPorts to allow testing
    editor.connectNodes(splitter, `out[0]`, aggregator, `in[0]`, "3");
    editor.connectNodes(splitter, `out[2]`, aggregator, `in[2]`, "3");

    editor.connectNodes(aggregator, "out", sink, "in", "4");

    editor.fitNodesToViewport();

    // Ensure edges are rendered after initial layout
    requestAnimationFrame(() => {
      editor.updateEdges();
    });

    setInterval(() => {
      if (!editor.shadowRoot) return;
      const nodes = Array.from(
        editor.shadowRoot.querySelectorAll("noflo-node, noflo-iip"),
      );
      const edges = editor.edges || [];

      if (nodes.length === 0) return;

      if (Math.random() > 0.5 || edges.length === 0) {
        // Random node activity
        const nodeElement = nodes[Math.floor(Math.random() * nodes.length)];
        const node = /** @type {FlowNode | FlowIIP} */ (nodeElement);
        editor.recordActivity(
          node.position.x + node.size / 2,
          node.position.y + node.size / 2,
        );
      } else {
        // Random edge activity (sampled point along the wire)
        const edge = edges[Math.floor(Math.random() * edges.length)];
        const posA = editor.getPortPosition(edge.portA);
        const posB = editor.getPortPosition(edge.portB);
        const t = Math.random();
        const x = posA.x + (posB.x - posA.x) * t;
        const y = posA.y + (posB.y - posA.y) * t;
        editor.recordActivity(x, y);
      }
    }, 100);
  }
}

function updateSelectionPills(selection) {
  /** @type {any} */
  const sel = selection;
  const pills = document.querySelector("noflo-selection-pills");
  if (!pills) return;

  const { nodes, iips, edges } = sel;
  pills.setAttribute("nodes-count", nodes.length);
  pills.setAttribute("iips-count", iips?.length || 0);
  pills.setAttribute("edges-count", edges.length);
}

init().catch(console.error);
