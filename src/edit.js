import { Graph, graph } from "noflo";
import { FlowEditor } from "./elements/noflo-editor.js";
import { FileSelector } from "./elements/noflo-file-selector.js";
import { FlowExportedPort } from "./elements/noflo-exported-port.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import { FlowRadialMenu } from "./elements/noflo-radial-menu.js";
import { SelectionPills } from "./elements/noflo-selection-pills.js";
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
 * @typedef {Object} PortConfig
 * @property {string} name
 * @property {boolean} addressable
 * @property {string} [description]
 * @property {string} [type]
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

let componentModal = null;
let componentForm = null;
/** @type {FileSelector} */
let fileSelector = null;

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
  fileSelector = document.querySelector("noflo-file-selector");
  if (!fileSelector) {
    console.error("File selector element not found");
    return;
  }

  // Create component editor modal
  componentModal = document.createElement("noflo-modal");
  componentForm = document.createElement("noflo-json-form");
  componentModal.appendChild(componentForm);
  app.appendChild(componentModal);

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

  fileSelector.addEventListener("new-graph-requested", async (e) => {
    await createNewGraph();
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
        const definition = {
          icon: 'gear',
          ...comp,
        };
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
    comp = {
      name: compName,
      icon: 'gear',
      inports: [],
      outports: [],
    };
    componentLibrary.set(compName, comp);
  }

  const ports = direction === "in" ? comp.inports : comp.outports;
  if (ports.some((p) => p.name === portName)) {
    return;
  }

  ports.push({ name: portName, addressable: false, type: 'all' });
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
        currentGraph.addEdge(
          nodeA.getAttribute("name"),
          portA.dataset.portName,
          nodeB.getAttribute("name"),
          portB.dataset.portName
        );
      }
    }
    debouncedSave();
  });

  editor.addEventListener("node-creation-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;

    const componentName = await askForComponent();
    let componentData = componentLibrary.get(componentName);

    if (!componentData) {
      componentData = await askForNewComponentDetails(componentName);
      if (!componentData) return;
      componentLibrary.set(componentName, componentData);
      await saveLibrary(directoryHandle);
    }

    const nodeId = `node_${Date.now()}`;
    const newNode = editor.addNode(
      nodeId,
      x,
      y,
      componentData.inports || [{ addressable: false }],
      componentData.outports || [{ addressable: false }],
      80,
      componentName,
    );
    newNode.id = nodeId;
    newNode.setMetadata({
      name: newNode.id,
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
          const index = startPort.dataset.portIndex ? parseInt(startPort.dataset.portIndex, 10) : null;
          const metadata = { x, y, id: iipId };
          if (isArrayPort && index !== null) {
            currentGraph.addInitialIndex("Value", nodeName, portName, index, metadata);
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
      nodes.forEach((node) => {
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
        edge.to.port
      );
    }
    // Remove from editor.edges
    if (editor.edges) {
      const index = editor.edges.indexOf(edge);
      if (index > -1) {
        editor.edges.splice(index, 1);
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
          const initializer = currentGraph.initializers[index];
          const { node, port, index: iipIndex } = initializer.to;
          const metadata = { ...initializer.metadata, id: iipElement.id };

          currentGraph.removeInitial(node, port);
          if (iipIndex !== undefined && iipIndex !== null) {
            currentGraph.addInitialIndex(newValue, node, port, iipIndex, metadata);
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
      nodes.forEach((move) => {
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

    let componentData = componentLibrary.get(componentName);
    if (!componentData) {
      componentData = { name: componentName, inports: [], outports: [] };
    }

    componentModal.open(`Edit Component: ${componentName}`);
    componentForm.schema = ComponentSignature;
    componentForm.data = componentData;

    const submitted = await componentModal.submit();
    if (submitted) {
      const newData = componentForm.data;

      const newComponentName = newData.name || componentName;

      if (newComponentName !== componentName) {
        componentLibrary.delete(componentName);
      }

      componentLibrary.set(newComponentName, newData);

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
          const updatedDef = componentLibrary.get(newComponentName);
          if (updatedDef && n.setPorts) {
            n.setPorts(updatedDef.inports, updatedDef.outports);
          }
          if (n.setMetadata) {
            n.setMetadata({ componentName: newComponentName, icon: newData.icon });
          }
        }
      });

      await saveLibrary(directoryHandle);
      debouncedSave();
    }
  });
}

async function askForComponent() {
  const name = window.prompt("Enter component name (or leave empty to use 'New Node'):");
  return name ? name.trim() : "New Node";
}

async function askForNewComponentDetails(componentName) {
  componentModal.open(`Define New Component: ${componentName}`);
  componentForm.schema = ComponentSignature;
  componentForm.data = {
    name: componentName,
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
    return componentForm.data;
  }
  return null;
}

/**
 * @returns {Promise<void>}
 */
async function createNewGraph() {
  const name = window.prompt("Enter new graph name (without .json):");
  if (!name) return;

  const g = new Graph();
  currentGraph = g;
  currentFileName = name + ".graph.json";

  // Recreate editor to clear it
  const app = document.getElementById("app");
  app.querySelectorAll("noflo-editor").forEach((el) => el.remove());
  editor = /** @type {FlowEditor} */ (document.createElement("noflo-editor"));
  app.appendChild(editor);

  // Re-setup event listeners for editor
  setupEditorEventListeners(editor);

  fileSelector.minimize();
}

function debouncedSave() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    saveGraph();
  }, 1000);
}

async function saveLibrary(directoryHandle) {
  if (!directoryHandle) return;
  console.log("Saving library...");
  try {
    const modules = [];
    const components = Array.from(componentLibrary.values());
    if (components.length > 0) {
      modules.push({ components });
    }
    const json = JSON.stringify({ modules }, null, 2);

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
function placeMissingElements(graph, padding = 50) {
  const elements = [];
  for (const nodeId in graph.nodes) {
    elements.push(graph.nodes[nodeId]);
  }
  for (const iip of graph.initializers) {
    elements.push(iip);
  }

  const missing = elements.filter(el => el.metadata?.x === undefined || el.metadata?.y === undefined);
  if (missing.length === 0) return;

  let maxX = 0;
  let maxY = 0;
  for (const el of elements) {
    if (el.metadata?.x !== undefined && el.metadata?.y !== undefined) {
      maxX = Math.max(maxX, el.metadata.x);
      maxY = Math.max(maxY, el.metadata.y);
    }
  }

  let currentX = padding;
  let currentY = padding;
  let maxRowHeight = 0;
  const maxWidth = 1200;

  const defaultWidth = 150;
  const defaultHeight = 100;

  if (maxX > 0 || maxY > 0) {
    currentX = maxX + padding;
  }

  for (const el of missing) {
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
      placeMissingElements(g);
      await saveGraphAsJson(directoryHandle, fileHandle.name, g);
      await fileHandle.remove();
      console.log(
        `Converted ${fileHandle.name} to .graph.json and removed original.`,
      );
    } else {
      const json = JSON.parse(text);
      g = await graph.loadJSON(json);
      placeMissingElements(g);
    }

    console.log("Loaded file:", fileHandle.name, g);

    currentGraph = g;
    currentFileName = fileHandle.name;

    // Recreate editor to clear it
    const app = document.getElementById("app");
    app.querySelectorAll("noflo-editor").forEach(el => el.remove())
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
      console.log(comp);
      const inPorts = comp ? comp.inports : undefined;
      const outPorts = comp ? comp.outports : undefined;

      const n = editor.addNode(node.id, x, y, inPorts, outPorts, 80, node.component);
      n.id = node.id; // Ensure the DOM element has the correct ID
      n.setMetadata({
        name: node.id,
        icon: comp.icon || 'gear',
        componentName: node.component,
      });
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

    // Load exported ports as pseudo-nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasNodes = false;
    for (const nodeId in g.nodes) {
      const node = g.nodes[nodeId];
      const x = node.metadata?.x || 0;
      const y = node.metadata?.y || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      hasNodes = true;
    }

    const inports = g.inports;
    const outports = g.outports;

    if (hasNodes) {
      if (inports && typeof inports === "object") {
        let i = 0;
        for (const portName in inports) {
          const inportInfo = inports[portName];
          const nodeEl = elementsMap.get(inportInfo.process);
          let targetPort = null;
          if (nodeEl) {
            targetPort = nodeEl.shadowRoot?.querySelector(
              `.port[data-port-name="${inportInfo.port}"]`,
            );
          }

          if (targetPort) {
            editor.addExportedPort(minX - 150, minY + i * 60, portName, "in", targetPort);
          }
          i++;
        }
      }
      if (outports && typeof outports === "object") {
        let i = 0;
        for (const portName in outports) {
          const outportInfo = outports[portName];
          const nodeEl = elementsMap.get(outportInfo.process);
          let targetPort = null;
          if (nodeEl) {
            targetPort = nodeEl.shadowRoot?.querySelector(
              `.port[data-port-name="${outportInfo.port}"]`,
            );
          }

          if (targetPort) {
            editor.addExportedPort(maxX + 150, minY + i * 60, portName, "out", targetPort);
          }
          i++;
        }
      }
    } else {
      if (inports && typeof inports === "object") {
        let i = 0;
        for (const portName in inports) {
          // Since there are no nodes, we can't find a port.
          // But if it's a standalone graph with inports, they must be connected to something.
          // Without nodes, we can't satisfy the requirement.
          // For now, we'll just skip it or it will be a bug.
          // Actually, if there are no nodes, these inports/outports might not be valid in this editor.
          i++;
        }
      }
      if (outports && typeof outports === "object") {
        let i = 0;
        for (const portName in outports) {
          i++;
        }
      }
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
