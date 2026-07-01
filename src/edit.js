/**
 * Main entry point for Flowbased Graph Editor
 */

import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
import { FileSelector } from "./elements/noflo-file-selector.js";
import { Graph, graph } from "noflo";

// Register Web Components
customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-iip", FlowIIP);
customElements.define("noflo-node", FlowNode);
customElements.define("noflo-radial-menu", FlowRadialMenu);
customElements.define("noflo-selection-pills", SelectionPills);
customElements.define("noflo-file-selector", FileSelector);

/**
 * @typedef {Object} PortConfig
 * @property {string} name
 * @property {'regular' | 'array'} type
 * @property {number} [size]
 */

/**
 * @typedef {Object} ComponentDefinition
 * @property {string} name
 * @property {string} [description]
 * @property {string} [icon]
 * @property {PortConfig[]} inports
 * @property {PortConfig[]} outports
 */

/** @type {Map<string, ComponentDefinition>} */
let componentLibrary = new Map();

let directoryHandle = null;
let editor = null;

async function init() {
  console.log("Initializing Flowbased Graph Editor...");

  const app = document.getElementById("app");
  if (!app) {
    console.error("App element not found");
    return;
  }

  // Create editor
  editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(editor);

  // Setup event listeners for editor
  setupEditorEventListeners(editor);

  // Setup File Selector
  const fileSelector = document.querySelector("noflo-file-selector");
  if (!fileSelector) {
    console.error("File selector element not found");
    return;
  }

  fileSelector.addEventListener("directory-selected", async (e) => {
    directoryHandle = e.detail.directoryHandle;
    console.log("Directory selected:", directoryHandle.name);

    await loadLibrary(directoryHandle);
  });

  fileSelector.addEventListener("file-selected", async (e) => {
    const fileHandle = e.detail.fileHandle;
    await loadFile(fileHandle);
  });
}

/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
async function loadLibrary(directoryHandle) {
  componentLibrary.clear();

  let libraryFileHandle = null;
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "file" && entry.name === "fbp.library.json") {
      libraryFileHandle = entry;
      break;
    }
  }

  if (libraryFileHandle) {
    console.log("Loading library from fbp.library.json");
    const file = await libraryFileHandle.getFile();
    const text = await file.text();
    const json = JSON.parse(text);
    // json format: { modules: [ { components: [...] } ] }
    for (const module of json.modules) {
      for (const comp of module.components) {
        componentLibrary.set(comp.name, comp);
      }
    }
  } else {
    console.log("No fbp.library.json found. Inferring library from graph files.");
    await inferLibraryFromFiles(directoryHandle);
  }
}

/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
async function inferLibraryFromFiles(directoryHandle) {
  const graphs = [];
  for await (const entry of directoryHandle.values()) {
    if (entry.kind !== "file") {
      continue;
    }
    const file = await entry.getFile();
    const text = await file.text();
    if (entry.name.endsWith(".json")) {
      try {
        const json = JSON.parse(text);
        const g = await graph.loadJSON(json);
        graphs.push(g);
      } catch (e) {
        console.warn("Failed to parse graph file:", entry.name, e);
      }
    }
    if (entry.name.endsWith(".fbp")) {
      try {
        const g = await graph.loadFBP(text);
        graphs.push(g);
      } catch (e) {
        // console.warn("Failed to parse FBP language graph file:", entry.name, e);
      }
    }
  }

  for (const g of graphs) {
    const nodeToType = new Map();
    for (const nodeId in g.nodes) {
      const node = g.nodes[nodeId];
      nodeToType.set(node.id, node.component);
    }

    for (const conn of g.edges) {
      const fromType = nodeToType.get(conn.from.node);
      if (fromType) {
        addPortToLibrary(fromType, conn.from.port, "out");
      }
      const toType = nodeToType.get(conn.to.node);
      if (toType) {
        addPortToLibrary(toType, conn.to.port, "in");
      }
    }
  }
}

/**
 * @param {string} compName
 * @param {string} portName
 * @param {'in' | 'out'} direction
 */
function addPortToLibrary(compName, portName, direction) {
  let comp = componentLibrary.get(compName);
  if (!comp) {
    comp = { name: compName, inports: [], outports: [] };
    componentLibrary.set(compName, comp);
  }

  const ports = direction === "in" ? comp.inports : comp.outports;
  if (ports.some((p) => p.name === portName)) {
    return;
  }

  ports.push({ name: portName, type: "regular" });
}

function setupEditorEventListeners(editor) {
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
    const newIIP = editor.addIIP(x, y, "Value");
    requestAnimationFrame(() => {
      editor.addIIPWire(newIIP, /** @type {HTMLElement} */ (startPort));
    });
  });

  editor.addEventListener("selection-changed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
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

async function loadFile(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const json = JSON.parse(text);

    console.log("Loaded file:", fileHandle.name, json);

    // Recreate editor to clear it
    const app = document.getElementById("app");
    app.innerHTML = "";
    editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
    app.appendChild(editor);

    // Re-setup event listeners for editor
    setupEditorEventListeners(editor);

    const g = await graph.loadJSON(json);

    const nodesMap = new Map();
    for (const nodeId in g.nodes) {
      const node = g.nodes[nodeId];
      const x = node.metadata?.x || node.position?.x || 0;
      const y = node.metadata?.y || node.position?.y || 0;

      const comp = componentLibrary.get(node.component);
      const inPorts = comp ? comp.inports : undefined;
      const outPorts = comp ? comp.outports : undefined;

      const n = editor.addNode(node.id, x, y, inPorts, outPorts);
      nodesMap.set(node.id, n);
    }

    for (const conn of g.edges) {
      const fromNode = nodesMap.get(conn.from.node);
      const toNode = nodesMap.get(conn.to.node);
      console.log(fromNode, toNode, conn);

      if (fromNode && toNode) {
        editor.connectNodes(fromNode, conn.from.port, toNode, conn.to.port, conn.metadata?.route);
      }
    }

    editor.fitNodesToViewport();
  } catch (err) {
    console.error("Error loading file:", err);
  }
}

init().catch(console.error);
