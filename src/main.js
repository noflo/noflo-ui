/**
 * Main entry point for NoFlo UI
 */

import { FlowEditor } from "./elements/flow-editor.js";
import { FlowNode } from "./elements/flow-node.js";

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
  customElements.define("flow-editor", FlowEditor);
  customElements.define("flow-node", FlowNode);

  // Initial setup
  const app = document.getElementById("app");
  if (app) {
    const editor = document.createElement("flow-editor");
    app.appendChild(editor);

    // Add some sample nodes
    const source = editor.addNode(
      "Source",
      100,
      200,
      [],
      [{ type: "regular", name: "out" }],
    );
    source.setMetadata({ name: "Source", icon: "fa-solid fa-play" });

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
    filter.setMetadata({ name: "Filter", icon: "fa-solid fa-filter" });

    const splitter = editor.addNode(
      "Splitter",
      300,
      300,
      [{ type: "regular", name: "in" }],
      [{ type: "array", name: "out", size: 3 }],
    );
    splitter.setMetadata({ name: "Splitter", icon: "fa-solid fa-code-branch" });

    const aggregator = editor.addNode(
      "Aggregator",
      500,
      300,
      [{ type: "array", name: "in", size: 3 }],
      [{ type: "regular", name: "out" }],
    );
    aggregator.setMetadata({
      name: "Aggregator",
      icon: "fa-solid fa-layer-group",
    });

    const logger = editor.addNode(
      "Logger",
      700,
      100,
      [{ type: "regular", name: "in" }],
      [],
    );
    logger.setMetadata({ name: "Logger", icon: "fa-solid fa-terminal" });

    const sink = editor.addNode(
      "Sink",
      700,
      300,
      [{ type: "regular", name: "in" }],
      [],
    );
    sink.setMetadata({ name: "Sink", icon: "fa-solid fa-database" });

    // Initial connections
    editor.connectNodes(source, "out", filter, "in");
    editor.connectNodes(source, "out", splitter, "in");

    editor.connectNodes(filter, "out", logger, "in");

    // Connect only some ArrayPorts to allow testing
    editor.connectNodes(splitter, `out[0]`, aggregator, `in[0]`);
    editor.connectNodes(splitter, `out[2]`, aggregator, `in[2]`);

    editor.connectNodes(aggregator, "out", sink, "in");

    editor.fitNodesToViewport();

    // Ensure edges are rendered after initial layout
    requestAnimationFrame(() => {
      editor.updateEdges();
    });

    // Demo: Occasionally record activity for random nodes and edges
    setInterval(() => {
      const nodes = Array.from(editor.shadowRoot.querySelectorAll("flow-node"));
      const edges = editor.edges || [];

      if (nodes.length === 0) return;

      if (Math.random() > 0.5 || edges.length === 0) {
        // Random node activity
        const node = nodes[Math.floor(Math.random() * nodes.length)];
        editor.recordActivity(node.position.x + 40, node.position.y + 40);
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

init().catch(console.error);
