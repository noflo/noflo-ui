/**
 * Main entry point for NoFlo UI
 */

import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowIIP } from "./elements/noflo-iip.js";
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
      const editor = document.querySelector("noflo-editor");
      if (!editor) return;
      if (e.detail.type === "nodes") {
        editor.clearNodeSelection();
      } else if (e.detail.type === "edges") {
        editor.clearEdgeSelection();
      } else {
        editor.clearSelection();
      }
    });

    const editor = document.createElement("noflo-editor");
    app.appendChild(editor);

    editor.addEventListener("wire-connection-attempt", (e) => {
      editor.addEdge(e.detail.portA, e.detail.portB);
    });

    editor.addEventListener("node-creation-attempt", (e) => {
      const { x, y, startPort } = e.detail;
      const newNode = editor.addNode("New Node", x, y);
      const isOut = startPort.classList.contains("port-out");
      const targetPort = newNode.shadowRoot.querySelector(
        `.port${isOut ? "-in" : "-out"}`,
      );
      if (targetPort) {
        // Wait for the next frame to ensure the node is laid out
        requestAnimationFrame(() => {
          if (isOut) {
            editor.addEdge(startPort, targetPort);
          } else {
            editor.addEdge(targetPort, startPort);
          }
          requestAnimationFrame(() => {
            editor.updateEdges();
          });
        });
      }
    });

    editor.addEventListener("iip-creation-attempt", (e) => {
      const { x, y, startPort } = e.detail;
      const newIIP = editor.addIIP(x, y, "Value");
      requestAnimationFrame(() => {
        editor.addIIPWire(newIIP, startPort);
      });
    });

    editor.addEventListener("selection-changed", (e) => {
      console.log("selection", e.detail);
      updateSelectionPills(e.detail);
    });

    editor.addEventListener("node-removal-attempt", (e) => {
      console.log("remove node", e.detail);
    });
    editor.addEventListener("edge-removal-attempt", (e) => {
      console.log("remove edge", e.detail);
    });

    // Add some sample nodes
    const source = editor.addNode(
      "Source",
      100,
      200,
      [],
      [{ type: "regular", name: "out" }],
    );
    source.setMetadata({ name: "Source", icon: "fa-play" });

    const filter = editor.addNode(
      "Filter",
      300,
      100,
      [{ type: "regular", name: "in" }],
      [
        { type: "regular", name: "out" },
        { type: "regular", name: "error" },
      ],
    );
    filter.setMetadata({ name: "Filter", icon: "fa-filter" });

    const splitter = editor.addNode(
      "Splitter",
      300,
      300,
      [{ type: "regular", name: "in" }],
      [{ type: "array", name: "out", size: 3 }],
    );
    splitter.setMetadata({ name: "Splitter", icon: "fa-code-branch" });

    const aggregator = editor.addNode(
      "Aggregator",
      500,
      300,
      [{ type: "array", name: "in", size: 3 }],
      [{ type: "regular", name: "out" }],
    );
    aggregator.setMetadata({
      name: "Aggregator",
      icon: "fa-layer-group",
    });

    const logger = editor.addNode(
      "Logger",
      700,
      100,
      [{ type: "regular", name: "in" }],
      [],
    );
    logger.setMetadata({ name: "Logger", icon: "fa-terminal" });

    const sink = editor.addNode(
      "Sink",
      700,
      300,
      [{ type: "regular", name: "in" }],
      [],
    );
    sink.setMetadata({ name: "Sink", icon: "fa-database" });

    const router = editor.addNode(
      "Router",
      500,
      100,
      [{ type: "regular", name: "in" }],
      [{ type: "regular", name: "out" }],
      40,
    );
    router.setMetadata({ name: "Router", icon: "fa-route" });

    // Initial connections
    editor.connectNodes(source, "out", filter, "in", 0);
    editor.connectNodes(source, "out", splitter, "in", 1);

    editor.connectNodes(filter, "out", logger, "in", 2);

    // Connect only some ArrayPorts to allow testing
    editor.connectNodes(splitter, `out[0]`, aggregator, `in[0]`, 3);
    editor.connectNodes(splitter, `out[2]`, aggregator, `in[2]`, 3);

    editor.connectNodes(aggregator, "out", sink, "in", 4);

    editor.fitNodesToViewport();

    // Ensure edges are rendered after initial layout
    requestAnimationFrame(() => {
      editor.updateEdges();
    });

    // Demo: Occasionally record activity for random nodes and edges
    setInterval(() => {
      const nodes = Array.from(
        editor.shadowRoot.querySelectorAll("noflo-node"),
      );
      const edges = editor.edges || [];

      if (nodes.length === 0) return;

      if (Math.random() > 0.5 || edges.length === 0) {
        // Random node activity
        const node = nodes[Math.floor(Math.random() * nodes.length)];
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
  const pills = document.querySelector("noflo-selection-pills");
  if (!pills) return;

  const { nodes, iips, edges } = selection;
  pills.setAttribute("nodes-count", nodes.length);
  pills.setAttribute("iips-count", iips?.length || 0);
  pills.setAttribute("edges-count", edges.length);
}

init().catch(console.error);
