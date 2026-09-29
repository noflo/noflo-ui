import { Graph, graph } from "noflo";
import { FlowEditor } from "./elements/noflo-editor.js";
import { FlowExportedPort } from "./elements/noflo-exported-port.js";
import { FileSelector } from "./elements/noflo-file-selector.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
import {
  createDebouncedSaver,
  graphFileNameFor,
  placeMissingElements,
  saveGraphAsJson,
} from "./library/FileGraphStore.js";
import { LibraryManager } from "./library/LibraryManager.js";
import { ComponentSignature } from "./library/schema.js";
import "./elements/noflo-json-form.js";
import "./elements/noflo-modal.js";

// Register Web Components
customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-exported-port", FlowExportedPort);
customElements.define("noflo-iip", FlowIIP);
customElements.define("noflo-node", FlowNode);
customElements.define("noflo-radial-menu", FlowRadialMenu);
customElements.define("noflo-selection-pills", SelectionPills);
customElements.define("noflo-file-selector", FileSelector);

/**
 * @typedef {import("./library/LibraryManager.js").ComponentDefinition} ComponentDefinition
 */

/** @type {LibraryManager} */
let libraryManager = null;

/** @type {FileSystemDirectoryHandle | null} */
let directoryHandle = null;
/** @type {FlowEditor | null} */
let editor = null;
/** @type {any} */
let currentGraph = null;
/** @type {string} */
let currentFileName = "";
/**
 * Debounced writer: serializes the current graph to disk after a quiet period.
 * Closes over the module-level state so it always writes the live graph.
 */
const graphSaver = createDebouncedSaver(async () => {
  if (!directoryHandle || !currentGraph) return;
  await saveGraphAsJson(directoryHandle, currentFileName, currentGraph);
});

/**
 * Request a debounced save of the current graph to disk. Coalesces rapid edits.
 */
function debouncedSave() {
  graphSaver.schedule();
}

/** @type {any} */
let componentModal = null;
/** @type {any} */
let componentForm = null;
/** @type {FileSelector | null} */
let fileSelector = null;

async function init() {
  console.log("Initializing Flowbased Graph Editor...");

  const app = document.getElementById("app");
  if (!app) {
    console.error("App element not found");
    return;
  }

  libraryManager = new LibraryManager();

  // Create editor
  editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(editor);

  // Pass library manager to editor
  editor.libraryManager = libraryManager;

  // Setup event listeners for editor
  setupEditorEventListeners(editor);

  // Setup File Selector
  fileSelector = /** @type {FileSelector} */ (
    document.querySelector("noflo-file-selector")
  );
  if (!fileSelector) {
    console.error("File selector element not found");
    return;
  }

  // Create component editor modal
  componentModal = document.createElement("noflo-modal");
  componentForm = /** @type {HTMLElement} */ (
    document.createElement("noflo-json-form")
  );
  componentModal.appendChild(componentForm);
  app.appendChild(componentModal);

  fileSelector.addEventListener("directory-selected", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const handle = /** @type {FileSystemDirectoryHandle} */ (
      event.detail.directoryHandle
    );
    if (handle) {
      directoryHandle = handle;
      console.log("Directory selected:", handle.name);

      await loadLibrary(handle);
    }
  });

  fileSelector.addEventListener("file-selected", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const fileHandle = /** @type {FileSystemFileHandle} */ (
      event.detail.fileHandle
    );
    if (fileHandle && fileSelector) {
      await loadFile(fileHandle);
      fileSelector.minimize();
    }
  });

  fileSelector.addEventListener("new-graph-requested", async () => {
    await createNewGraph();
  });
}

/**
 * @param {string} compName
 */
function getComponentFromLibrary(compName) {
  return libraryManager.getComponent(compName);
}

/**
 * @param {FlowEditor} editor
 */
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
        currentGraph.addEdge(
          nodeA.getAttribute("name"),
          portA.dataset.portName,
          nodeB.getAttribute("name"),
          portB.dataset.portName,
        );
      }
    }
    debouncedSave();
  });

  editor.addEventListener("node-creation-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;

    const componentName = await askForComponent();
    let componentData = getComponentFromLibrary(componentName);

    if (!componentData) {
      componentData = await askForNewComponentDetails(componentName);
      if (!componentData) return;
      libraryManager.setComponent(componentName, componentData);
      await saveLibrary(directoryHandle);
    }

    const nodeId = `node_${Date.now()}`;
    const newNode = editor.addNode(nodeId, componentName, {
      x,
      y,
      name: nodeId,
      icon: componentData.icon || "gear",
      componentName: componentName,
    });

    if (currentGraph) {
      currentGraph.addNode(nodeId, componentName, { x, y });
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
          const isArrayPort = startPort.dataset.portType === "array";
          const index = startPort.dataset.portIndex
            ? parseInt(startPort.dataset.portIndex, 10)
            : null;
          const metadata = { x, y, id: iipId };
          if (isArrayPort && index !== null) {
            currentGraph.addInitialIndex(
              "Value",
              nodeName,
              portName,
              index,
              metadata,
            );
          } else {
            currentGraph.addInitial("Value", nodeName, portName, metadata);
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
      nodes.forEach((/** @type {any} */ node) => {
        const nodeId = node.id;
        currentGraph.removeNode(nodeId);
        editor.removeNode(node);
      });
    }
    debouncedSave();
  });

  editor.addEventListener("edge-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const edge = event.detail.edge;
    if (currentGraph) {
      currentGraph.removeEdge(
        edge.from.node,
        edge.from.port,
        edge.to.node,
        edge.to.port,
      );
    }
    // Remove from editor
    editor.removeEdge(edge);
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
        const index = currentGraph.initializers.findIndex(
          (/** @type {any} */ init) => init.metadata?.id === iipElement.id,
        );
        if (index !== -1) {
          const initializer = currentGraph.initializers[index];
          const { node, port, index: iipIndex } = initializer.to;
          const metadata = { ...initializer.metadata, id: iipElement.id };

          currentGraph.removeInitial(node, port);
          if (iipIndex !== undefined && iipIndex !== null) {
            currentGraph.addInitialIndex(
              newValue,
              node,
              port,
              iipIndex,
              metadata,
            );
          } else {
            currentGraph.addInitial(newValue, node, port, metadata);
          }
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
      const index = currentGraph.initializers.findIndex(
        (/** @type {any} */ init) => init.metadata?.id === iip.id,
      );
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

  editor.addEventListener("port-exported", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { name, direction, position, process, port } = event.detail;
    if (currentGraph) {
      if (direction === "in") {
        currentGraph.addInport(name, process, port, position);
      } else {
        currentGraph.addOutport(name, process, port, position);
      }
    }
    debouncedSave();
  });

  editor.addEventListener("port-removed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { name, direction } = event.detail;
    if (currentGraph) {
      if (direction === "in") {
        currentGraph.removeInport(name);
      } else {
        currentGraph.removeOutport(name);
      }
    }
    debouncedSave();
  });

  editor.addEventListener("port-renamed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { oldName, newName, direction, position } = event.detail;
    if (currentGraph) {
      if (direction === "in") {
        currentGraph.renameInport(oldName, newName);
      } else {
        currentGraph.renameOutport(oldName, newName);
      }
    }
    debouncedSave();
  });

  editor.addEventListener("nodes-moved", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { nodes } = event.detail;
    if (currentGraph) {
      nodes.forEach((/** @type {any} */ move) => {
        if (move.type === "noflo-exported-port") {
          if (move.direction === "in") {
            currentGraph.setInportMetadata(move.portName, move.position);
          } else {
            currentGraph.setOutportMetadata(move.portName, move.position);
          }
        } else {
          if (currentGraph.nodes[move.name]) {
            currentGraph.setNodeMetadata(move.name, move.position);
          }
        }
      });
    }
    debouncedSave();
  });

  editor.addEventListener("edit-component-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { node } = event.detail;
    const componentName = node.getAttribute("component");
    if (!componentName) return;

    let componentData = getComponentFromLibrary(componentName);
    if (!componentData) {
      componentData = {
        name: componentName,
        type: "stub",
        inports: [],
        outports: [],
      };
    }

    const modal = /** @type {any} */ (componentModal);
    const form = /** @type {any} */ (componentForm);

    modal.open(`Edit Component: ${componentName}`);
    form.schema = ComponentSignature;
    form.data = componentData;

    const submitted = await modal.submit();
    if (submitted) {
      const newData = form.data;

      const newComponentName = newData.name || componentName;

      if (newComponentName !== componentName) {
        libraryManager.removeComponent(componentName);
      }

      libraryManager.setComponent(newComponentName, newData);

      // Update all nodes that use this component
      const allNodes = /** @type {NodeListOf<HTMLElement>} */ (
        editor.nodeLayer?.querySelectorAll("noflo-node") || []
      );

      allNodes.forEach((n) => {
        const currentCompName = n.getAttribute("component");
        if (currentCompName === componentName) {
          if (newComponentName !== componentName) {
            n.setAttribute("component", newComponentName);
          }
          const updatedDef = getComponentFromLibrary(newComponentName);
          if (updatedDef && /** @type {any} */ (n).setPorts) {
            /** @type {any} */ (n).setPorts(
              updatedDef.inports,
              updatedDef.outports,
            );
          }
          if (/** @type {any} */ (n).setMetadata) {
            /** @type {any} */ (n).setMetadata({
              componentName: newComponentName,
              icon: newData.icon,
            });
          }
        }
      });

      await saveLibrary(directoryHandle);
      debouncedSave();
    }
  });
}

async function askForComponent() {
  const name = window.prompt(
    "Enter component name (or leave empty to use 'New Node'):",
  );
  return name ? name.trim() : "New Node";
}

async function askForNewComponentDetails(componentName) {
  componentModal.open(`Define New Component: ${componentName}`);
  componentForm.schema = ComponentSignature;
  componentForm.data = {
    name: componentName,
    type: "stub",
    icon: "gear",
    inports: [
      {
        name: "in",
        type: "all",
        addressable: false,
      },
    ],
    outports: [
      {
        name: "out",
        type: "all",
        addressable: false,
      },
    ],
  };

  const submitted = await componentModal.submit();
  if (submitted) {
    return /** @type {ComponentDefinition} */ (componentForm.data);
  }
  return null;
}

/**
 * @returns {Promise<void>}
 */
/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
async function loadLibrary(directoryHandle) {
  libraryManager.modules.clear();
  libraryManager.modules.set(LibraryManager.PROJECT_MODULE, new Map());

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
    const newManager = LibraryManager.fromJSON(json);
    // Copy modules from newManager to libraryManager
    for (const [moduleName, moduleMap] of newManager.modules) {
      libraryManager.modules.set(moduleName, moduleMap);
    }
  } else {
    console.log(
      "No fbp.library.json found. Inferring library from graph files.",
    );
    await inferLibraryFromFolder(directoryHandle);
  }
}

/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
async function inferLibraryFromFolder(directoryHandle) {
  for await (const entry of directoryHandle.values()) {
    if (entry.kind !== "file") {
      continue;
    }
    const file = await entry.getFile();
    const text = await file.text();
    let g = null;

    if (entry.name.endsWith(".json")) {
      try {
        const json = JSON.parse(text);
        g = await graph.loadJSON(json);
        if (!g.name) {
          g.name = entry.name.split(".")[0];
        }
      } catch (e) {
        console.warn("Failed to parse graph file:", entry.name, e);
      }
    } else if (entry.name.endsWith(".fbp")) {
      try {
        g = await graph.loadFBP(text);
        if (!g.name) {
          g.name = entry.name.split(".")[0];
        }
      } catch (e) {
        // console.warn("Failed to parse FBP language graph file:", entry.name, e);
      }
    }

    if (g) {
      libraryManager.inferLibraryFromGraph(g);
    }
  }
}

/**
 * @param {FileSystemDirectoryHandle} directoryHandle
 */
async function saveLibrary(directoryHandle) {
  if (!directoryHandle) return;
  console.log("Saving library...");
  try {
    const json = JSON.stringify(libraryManager.toJSON(), null, 2);

    const fileHandle = await directoryHandle.getFileHandle("fbp.library.json", {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    console.log("Library saved successfully.");
  } catch (err) {
    console.error("Error saving library:", err);
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
 * Tears down any existing editor and creates a fresh one bound to the library
 * manager and the global event listeners.
 *
 * @returns {FlowEditor | null}
 */
function recreateEditor() {
  const app = document.getElementById("app");
  if (!app) return null;
  app.querySelectorAll("noflo-editor").forEach((el) => {
    el.remove();
  });
  const ed = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(ed);
  setupEditorEventListeners(ed);
  ed.libraryManager = libraryManager;
  editor = ed;
  return ed;
}

/**
 * Renders exported in/out ports just outside the node bounding box.
 *
 * @param {any} ports `g.inports` or `g.outports`.
 * @param {Map<string, any>} elementsMap Graph id -> editor element.
 * @param {FlowEditor} ed Editor instance to render into.
 * @param {number} x Column X for this side.
 * @param {number} y Top Y of the bounding box.
 * @param {"in" | "out"} direction Which side to render.
 */
function renderExportedPorts(ports, elementsMap, ed, x, y, direction) {
  if (!ports || typeof ports !== "object") return;
  let i = 0;
  for (const portName in ports) {
    const info = ports[portName];
    const nodeEl = elementsMap.get(info.process);
    let targetPort = null;
    if (nodeEl) {
      targetPort = nodeEl.shadowRoot?.querySelector(
        `.port[data-port-name="${info.port}"]`,
      );
    }
    if (targetPort) {
      ed.addExportedPort(x, y + i * 60, portName, direction, targetPort);
    }
    i++;
  }
}

/**
 * Renders a graph's nodes, IIPs, exported ports, and edges into an editor.
 *
 * @param {any} g Loaded noflo graph.
 * @param {FlowEditor} ed Editor instance to render into.
 * @returns {Map<string, any>} Map of graph id -> editor element.
 */
function renderGraphIntoEditor(g, ed) {
  const elementsMap = new Map();

  for (const node of g.nodes) {
    const x = node.metadata?.x || 0;
    const y = node.metadata?.y || 0;
    const comp = getComponentFromLibrary(node.component);
    const n = ed.addNode(node.id, node.component, {
      x,
      y,
      name: node.id,
      icon: comp?.icon || "gear",
      componentName: node.component,
    });
    elementsMap.set(node.id, n);
  }

  for (const iip of g.initializers) {
    const x = iip.metadata?.x || 0;
    const y = iip.metadata?.y || 0;
    let port = null;
    if (iip.to?.node && iip.to?.port) {
      const toNode = elementsMap.get(iip.to.node);
      if (toNode) {
        port = toNode.shadowRoot?.querySelector(
          `.port[data-port-name="${iip.to.port}"]`,
        );
      }
    }
    const iipId = iip.metadata?.id || iip.from?.data || `iip_${Math.random()}`;
    const newIIP = ed.addIIP(
      x,
      y,
      /** @type {any} */ (port),
      iip.from?.data || "Value",
    );
    newIIP.id = iipId;
    elementsMap.set(iipId, newIIP);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasNodes = false;
  for (const node of g.nodes) {
    const x = node.metadata?.x || 0;
    const y = node.metadata?.y || 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    hasNodes = true;
  }

  if (hasNodes) {
    renderExportedPorts(g.inports, elementsMap, ed, minX - 150, minY, "in");
    renderExportedPorts(g.outports, elementsMap, ed, maxX + 150, minY, "out");
  }

  for (const conn of g.edges) {
    const fromEl = elementsMap.get(conn.from.node);
    const toEl = elementsMap.get(conn.to.node);
    if (fromEl && toEl) {
      ed.connectNodes(
        fromEl,
        conn.from.port,
        toEl,
        conn.to.port,
        conn.metadata?.route,
      );
    }
  }

  return elementsMap;
}

/**
 * Opens a graph in a freshly recreated editor and records it as current.
 *
 * @param {any} g Graph to display.
 * @param {string} fileName On-disk file name for the graph.
 */
function openGraph(g, fileName) {
  currentGraph = g;
  currentFileName = fileName;
  const ed = recreateEditor();
  if (!ed) return;
  renderGraphIntoEditor(g, ed);
  ed.fitEntitiesToViewport();
}

/**
 * Loads a graph file (`.json` or `.fbp`) from the chosen directory.
 *
 * `.fbp` files are placed, saved as `.graph.json`, and the original removed
 * (in that order) before being opened.
 *
 * @param {any} fileHandle File to load.
 */
async function loadFile(fileHandle) {
  const isFbp = fileHandle.name.endsWith(".fbp");
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    let g;
    let fileName = fileHandle.name;

    if (isFbp) {
      g = await graph.loadFBP(text);
      placeMissingElements(g);
      fileName = await saveGraphAsJson(
        /** @type {any} */ (directoryHandle),
        fileHandle.name,
        g,
      );
      await fileHandle.remove();
      console.log(
        `Converted ${fileHandle.name} to ${fileName} and removed original.`,
      );
    } else {
      const json = JSON.parse(text);
      g = await graph.loadJSON(json);
      placeMissingElements(g);
    }

    console.log("Loaded file:", fileHandle.name, g);
    openGraph(g, fileName);
  } catch (err) {
    console.error("Error loading file:", err);
  }
}

/**
 * Prompts for a name and creates a new empty graph, persisted to disk.
 */
async function createNewGraph() {
  if (!directoryHandle) {
    console.error("Cannot create a graph: no directory selected");
    return;
  }
  const raw = window.prompt("Name for the new graph:");
  if (!raw || !raw.trim()) return;
  const name = raw.trim();
  const g = new Graph(name);
  const fileName = graphFileNameFor(name);
  try {
    await saveGraphAsJson(/** @type {any} */ (directoryHandle), fileName, g);
    console.log(`Created new graph: ${fileName}`);
  } catch (err) {
    console.error("Error creating new graph:", err);
    return;
  }
  openGraph(g, fileName);
  if (fileSelector) {
    fileSelector.minimize();
    if (typeof fileSelector.listFiles === "function") {
      fileSelector.listFiles();
    }
  }
}

init().catch(console.error);
