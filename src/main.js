/**
 * Main entry point for NoFlo UI
 */

import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowExportedPort } from "./elements/noflo-exported-port.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
import { LibraryManager } from "./library/LibraryManager.js";

const backend = new Worker("src/backend.js", { type: "module" });

/** @type {EventListener} */
const onMessage = (event) => {
  const e = /** @type {MessageEvent} */ (event);
  const { type, payload } = e.data;
  console.log(`[Main] Received from backend: ${type}`, payload);
};
backend.onmessage = onMessage;

async function init() {
  console.log("Initializing NoFlo UI...");

  // Initialize backend
  backend.postMessage({ type: "INIT", payload: {} });

  // Register Web Components
  customElements.define("noflo-editor", FlowEditor);
  customElements.define("noflo-node", FlowNode);
  customElements.define("noflo-iip", FlowIIP);
  customElements.define("noflo-exported-port", FlowExportedPort);
  customElements.define("noflo-radial-menu", FlowRadialMenu);
  customElements.define("noflo-selection-pills", SelectionPills);

  // Initial setup
  const app = document.getElementById("app");
  if (app) {
    const editor = /** @type {FlowEditor} */ (
      document.createElement("noflo-editor")
    );
    app.appendChild(editor);

    const libraryManager = new LibraryManager();
    editor.libraryManager = libraryManager;

    // Register sample components
    libraryManager.setComponent("Source", {
      name: "Source",
      icon: "play",
      inports: [],
      outports: [{ name: "out" }],
      type: "elementary",
    });
    libraryManager.setComponent("Filter", {
      name: "Filter",
      icon: "filter",
      inports: [{ name: "in" }],
      outports: [{ name: "out" }, { name: "error" }],
      type: "elementary",
    });
    libraryManager.setComponent("Splitter", {
      name: "Splitter",
      icon: "code-branch",
      inports: [{ name: "in" }],
      outports: [{ name: "out", addressable: true }],
      type: "elementary",
    });
    libraryManager.setComponent("Aggregator", {
      name: "Aggregator",
      icon: "layer-group",
      inports: [{ name: "in", addressable: true }],
      outports: [{ name: "out" }],
      type: "elementary",
    });
    libraryManager.setComponent("Logger", {
      name: "Logger",
      icon: "terminal",
      inports: [{ name: "in" }],
      outports: [],
      type: "elementary",
    });
    libraryManager.setComponent("Sink", {
      name: "Sink",
      icon: "database",
      inports: [{ name: "in" }],
      outports: [],
      type: "elementary",
    });
    libraryManager.setComponent("Router", {
      name: "Router",
      icon: "route",
      inports: [{ name: "in" }],
      outports: [{ name: "out" }],
      type: "elementary",
    });

    editor.addEventListener("wire-connection-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      editor.addEdge(event.detail.portA, event.detail.portB);
    });

    editor.addEventListener("node-creation-attempt", (e) => {
      const event = /** @type {CustomEvent} */ (e);
      const { x, y, startPort } = event.detail;
      const newNode = editor.addNode(
        "new_node_" + Date.now(),
        "project/New Node",
        { x, y },
      );
      const port = /** @type {HTMLElement} */ (startPort);
      const isOut = port.classList.contains("port-out");
      const targetPort = newNode.shadowRoot?.querySelector(
        `.port${isOut ? "-in" : "-out"}`,
      );
      if (targetPort) {
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
      const newIIP = editor.addIIP(
        x,
        y,
        /** @type {HTMLElement} */ (startPort),
        "Value",
      );
      newIIP.id = `iip_${Date.now()}`;
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
    });

    // Add some sample nodes
    const source = /** @type {FlowNode} */ (
      editor.addNode("node_source", "Source", {
        x: 100,
        y: 200,
        name: "Source",
        icon: "play",
      })
    );

    const filter = /** @type {FlowNode} */ (
      editor.addNode("node_filter", "Filter", {
        x: 300,
        y: 100,
        name: "Filter",
        icon: "filter",
      })
    );

    const splitter = /** @type {FlowNode} */ (
      editor.addNode("node_splitter", "Splitter", {
        x: 300,
        y: 300,
        name: "Splitter",
        icon: "code-branch",
      })
    );

    const aggregator = /** @type {FlowNode} */ (
      editor.addNode("node_aggregator", "Aggregator", {
        x: 500,
        y: 300,
        name: "Aggregator",
        icon: "layer-group",
      })
    );

    const logger = /** @type {FlowNode} */ (
      editor.addNode("node_logger", "Logger", {
        x: 700,
        y: 100,
        name: "Logger",
        icon: "terminal",
      })
    );

    const sink = /** @type {FlowNode} */ (
      editor.addNode("node_sink", "Sink", {
        x: 700,
        y: 300,
        name: "Sink",
        icon: "database",
      })
    );

    const router = /** @type {FlowNode} */ (
      editor.addNode("node_router", "Router", {
        x: 500,
        y: 100,
        name: "Router",
        icon: "route",
        size: 40,
      })
    );

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

/**
 * @param {any} selection
 */
function updateSelectionPills(selection) {
  const sel =
    /** @type {{nodes: string[], iips: string[], edges: string[]}} */ (
      selection
    );
  const pills = document.querySelector("noflo-selection-pills");
  if (!pills) return;

  const { nodes, iips, edges } = sel;
  pills.setAttribute("nodes-count", nodes.length.toString());
  pills.setAttribute("iips-count", (iips?.length || 0).toString());
  pills.setAttribute("edges-count", edges.length.toString());
}

init().catch(console.error);
