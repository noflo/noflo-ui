/**
 * Main entry point for Flowbased Graph Editor
 */

import { Graph, graph } from "noflo";
import { FlowEditor } from "./elements/noflo-editor.js";
import { FileSelector } from "./elements/noflo-file-selector.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";

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
const componentLibrary = new Map();

let directoryHandle = null;
let editor = null;
/** @type {any} */
let currentGraph = null;
/** @type {string} */
let currentFileName = "";
/** @type {number | null} */
let saveTimeout = null;

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
    fileSelector.minimize();
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
    console.log(
      "No fbp.library.json found. Inferring library from graph files.",
    );
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

    for (const iip of g.initializers) {
      const toType = nodeToType.get(iip.to.node);
      if (toType) {
        addPortToLibrary(toType, iip.to.port, "in");
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
    const edge = editor.addEdge(event.detail.portA, event.detail.portB);
    if (currentGraph) {
      const portA = event.detail.portA;
      const portB = event.detail.portB;
      const nodeA = portA.closest("noflo-node") || portA.closest("noflo-iip");
      const nodeB = portB.closest("noflo-node") || portB.closest("noflo-iip");
      if (nodeA && nodeB) {
        currentGraph.edges.push({
          from: {
            node: nodeA.getAttribute("name"),
            port: portA.dataset.portName,
          },
          to: {
            node: nodeB.getAttribute("name"),
            port: portB.dataset.portName,
          },
        });
      }
    }
    debouncedSave();
  });

  editor.addEventListener("node-creation-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;
    const nodeId = `node_${Date.now()}`;
    const newNode = editor.addNode(nodeId, x, y);
    newNode.id = nodeId;

    if (currentGraph) {
      currentGraph.nodes[nodeId] = {
        id: nodeId,
        component: "New Node",
        metadata: { x, y },
      };
    }

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
    debouncedSave();
  });

  editor.addEventListener("iip-creation-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;
    const iipId = `iip_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newIIP = editor.addIIP(
      x,
      y,
      /** @type {HTMLElement} */ (startPort),
      "Value",
    );
    newIIP.id = iipId;

    if (currentGraph) {
      if (startPort && startPort.classList.contains("port-in")) {
        const nodeElement = startPort.closest("noflo-node");
        if (nodeElement) {
          const nodeName = nodeElement.getAttribute("name");
          const portName = startPort.dataset.portName;
          const node = currentGraph.getNode(nodeName);
          if (node) {
            const isArrayPort = startPort.dataset.portType === "array";
            const index = startPort.dataset.portIndex ? parseInt(startPort.dataset.portIndex, 10) : null;
            const metadata = { x, y, id: iipId };
            if (isArrayPort && index !== null) {
              currentGraph.addInitialIndex("Value", node, portName, index, metadata);
            } else {
              currentGraph.addInitial("Value", node, portName, metadata);
            }
          }
        }
      } else {
        newIIP.remove();
        return;
      }
    } else {
      newIIP.remove();
      return;
    }

    debouncedSave();
  });

  editor.addEventListener("selection-changed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    updateSelectionPills(event.detail);
  });

  editor.addEventListener("node-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const nodes = event.detail.nodes;
    if (currentGraph) {
      nodes.forEach((node) => {
        delete currentGraph.nodes[node.id];
        node.remove();
      });
    }
    debouncedSave();
  });

  editor.addEventListener("edge-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const edge = event.detail.edge;
    if (currentGraph) {
      const portA = edge.portA;
      const portB = edge.portB;
      const nodeA = portA.closest("noflo-node") || portA.closest("noflo-iip");
      const nodeB = portB.closest("noflo-node") || portB.closest("noflo-iip");
      if (nodeA && nodeB) {
        const idA = nodeA.getAttribute("name");
        const idB = nodeB.getAttribute("name");
        const pAName = portA.dataset.portName;
        const pBName = portB.dataset.portName;
        currentGraph.edges = currentGraph.edges.filter(
          (e) =>
            !(
              (e.from.node === idA &&
                e.from.port === pAName &&
                e.to.node === idB &&
                e.to.port === pBName) ||
              (e.from.node === idB &&
                e.from.port === pBName &&
                e.to.node === idA &&
                e.to.port === pAName)
            ),
        );
      }
    }
    edge.visualPath?.remove();
    edge.hitPath?.remove();
    debouncedSave();
  });

  editor.addEventListener("iip-edit-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { iip } = event.detail;
    const iipElement = /** @type {FlowIIP} */ (iip);
    const newValue = prompt("Enter new IIP value:", iipElement.value);
    if (newValue !== null) {
      iipElement.value = newValue;
      if (currentGraph) {
        const index = currentGraph.initializers.findIndex((init) => init.metadata?.id === iipElement.id);
        if (index !== -1) {
          currentGraph.initializers[index].from.data = newValue;
        }
      }
      debouncedSave();
    }
  });

  editor.addEventListener("iip-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { iip } = event.detail;
    editor.removeIIP(/** @type {FlowIIP} */ (iip));
    if (currentGraph) {
      const index = currentGraph.initializers.findIndex((init) => init.metadata?.id === iip.id);
      if (index !== -1) {
        const initializer = currentGraph.initializers[index];
        currentGraph.removeInitial(initializer.to.node, initializer.to.port);
      }
    }
    debouncedSave();
  });

  editor.addEventListener("iip-send-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { iip } = event.detail;
    const iipElement = /** @type {FlowIIP} */ (iip);
    console.log(
      `[Main] Sending IIP: ${iipElement.getAttribute("name")} with value: ${iipElement.value}`,
    );
  });

  editor.addEventListener("nodes-moved", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { nodes } = event.detail;
    if (currentGraph) {
      nodes.forEach((move) => {
        const node = currentGraph.nodes[move.name];
        if (node) {
          node.metadata = node.metadata || {};
          node.metadata.x = move.position.x;
          node.metadata.y = move.position.y;
        }
      });
    }
    debouncedSave();
  });
}

function debouncedSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveGraph();
  }, 1000);
}

async function saveGraph() {
  if (!currentGraph || !directoryHandle || !currentFileName) return;
  console.log("Saving graph...");
  try {
    await saveGraphAsJson(directoryHandle, currentFileName, currentGraph);
    console.log("Graph saved successfully.");
  } catch (err) {
    console.error("Error saving graph:", err);
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

/**
 * @param {any} graph
 * @param {number} padding
 */
function placeNodesInGraph(graph, padding = 50) {
  const elements = [];
  for (const nodeId in graph.nodes) {
    elements.push(graph.nodes[nodeId]);
  }
  for (const iip of graph.initializers) {
    elements.push(iip);
  }

  let currentX = padding;
  let currentY = padding;
  let maxRowHeight = 0;
  const maxWidth = 1200;

  const defaultWidth = 150;
  const defaultHeight = 100;

  for (const el of elements) {
    el.metadata = el.metadata || {};
    el.metadata.x = currentX;
    el.metadata.y = currentY;

    if (currentX + defaultWidth > maxWidth) {
      currentX = padding;
      currentY += maxRowHeight + padding;
      maxRowHeight = 0;
    }

    currentX += defaultWidth + padding;
    maxRowHeight = Math.max(maxRowHeight, defaultHeight);
  }
}

/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 * @param {string} originalFileName
 * @param {any} graph
 * @returns {Promise<string>} The new file name
 */
async function saveGraphAsJson(directoryHandle, originalFileName, graph) {
  let newFileName;
  if (originalFileName.endsWith(".fbp")) {
    newFileName = originalFileName.replace(/\.fbp$/, "") + ".graph.json";
  } else {
    newFileName = originalFileName;
  }
  const json = JSON.stringify(graph.toJSON(), null, 2);

  const fileHandle = await directoryHandle.getFileHandle(newFileName, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();

  return newFileName;
}

async function loadFile(fileHandle) {
  const isFbp = fileHandle.name.endsWith(".fbp");
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    let g;

    if (isFbp) {
      g = await graph.loadFBP(text);
      placeNodesInGraph(g);
      await saveGraphAsJson(directoryHandle, fileHandle.name, g);
      await fileHandle.remove();
      console.log(
        `Converted ${fileHandle.name} to .graph.json and removed original.`,
      );
    } else {
      const json = JSON.parse(text);
      g = await graph.loadJSON(json);
    }

    console.log("Loaded file:", fileHandle.name, g);

    currentGraph = g;
    currentFileName = fileHandle.name;

    // Recreate editor to clear it
    const app = document.getElementById("app");
    app.innerHTML = "";
    editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
    app.appendChild(editor);

    // Re-setup event listeners for editor
    setupEditorEventListeners(editor);

    const elementsMap = new Map();
    for (const nodeId in g.nodes) {
      const node = g.nodes[nodeId];
      const x = node.metadata?.x || 0;
      const y = node.metadata?.y || 0;

      const comp = componentLibrary.get(node.component);
      const inPorts = comp ? comp.inports : undefined;
      const outPorts = comp ? comp.outports : undefined;

      const n = editor.addNode(node.id, x, y, inPorts, outPorts);
      n.id = node.id; // Ensure the DOM element has the correct ID
      elementsMap.set(node.id, n);
    }

    for (const iip of g.initializers) {
      const x = iip.metadata?.x || 0;
      const y = iip.metadata?.y || 0;

      let port = null;
      if (iip.to && iip.to.node && iip.to.port) {
        const toNode = elementsMap.get(iip.to.node);
        if (toNode) {
          port = toNode.shadowRoot?.querySelector(
            `.port[data-port-name="${iip.to.port}"]`,
          );
        }
      }

      const iipId = iip.metadata?.id || iip.from?.data || "iip_" + Math.random();
      const newIIP = editor.addIIP(
        x,
        y,
        port ? /** @type {HTMLElement} */ (port) : null,
        iip.from?.data || "Value",
      );
      newIIP.id = iipId;
      elementsMap.set(iipId, newIIP);
    }

    for (const conn of g.edges) {
      const fromEl = elementsMap.get(conn.from.node);
      const toEl = elementsMap.get(conn.to.node);

      if (fromEl && toEl) {
        editor.connectNodes(
          fromEl,
          conn.from.port,
          toEl,
          conn.to.port,
          conn.metadata?.route,
        );
      }
    }

    editor.fitNodesToViewport();
  } catch (err) {
    console.error("Error loading file:", err);
  }
}

init().catch(console.error);
