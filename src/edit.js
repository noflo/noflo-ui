import { Graph, graph } from "../vendor/noflo.js";
import { FlowEditor } from "./elements/noflo-editor.js";
import "./elements/noflo-exported-port.js";
import { FileSelector } from "./elements/noflo-file-selector.js";
import { FlowIIP } from "./elements/noflo-iip.js";
import { FlowNode } from "./elements/noflo-node.js";
import "./elements/noflo-radial-menu.js";
import "./elements/noflo-selection-pills.js";
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

// Element modules self-register their custom elements on import (the
// tag name and its class are defined in the same module).

/**
 * @typedef {import("./library/LibraryManager.js").ComponentDefinition} ComponentDefinition
 */
import { on } from "./events.js";

/** @type {LibraryManager} */
const libraryManager = new LibraryManager();

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

/**
 * Stack of ancestor graphs for subgraph navigation. The current graph is not
 * on the stack; each entry holds the graph and its file name so navigating up
 * can restore the parent without re-reading from disk.
 *
 * @type {Array<{graph: any, fileName: string}>}
 */
let graphStack = [];

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

  on(fileSelector, "directory-selected", async (e) => {
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

  on(fileSelector, "file-selected", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const fileHandle = /** @type {FileSystemFileHandle} */ (
      event.detail.fileHandle
    );
    if (fileHandle && fileSelector) {
      graphStack = [];
      await loadFile(fileHandle);
      fileSelector.minimize();
    }
  });

  on(fileSelector, "new-graph-requested", async () => {
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
 * Generates an exported port name based on `base`, appending numeric suffixes
 * (`in`, `in1`, `in2`...) to avoid conflicts with names already claimed.
 *
 * @param {string} base
 * @param {Map<string, string>} existing
 * @returns {string}
 */
function uniquePortName(base, existing) {
  const taken = new Set(existing.values());
  if (!taken.has(base)) return base;
  let counter = 1;
  while (taken.has(`${base}${counter}`)) counter++;
  return `${base}${counter}`;
}

/**
 * Splits a `nodeId:port` composite key. Assumes neither part contains a colon.
 *
 * @param {string} key
 * @returns {[string, string]}
 */
function splitNodePort(key) {
  const separator = key.indexOf(":");
  return [key.slice(0, separator), key.slice(separator + 1)];
}

/**
 * @param {FlowEditor} editor
 */
function setupEditorEventListeners(editor) {
  on(editor, "wire-connection-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const edge = editor.addEdge(event.detail.portA, event.detail.portB);
    if (currentGraph) {
      const portA = event.detail.portA;
      const portB = event.detail.portB;
      const nodeA = portA.closest("noflo-node") || portA.closest("noflo-iip");
      const nodeB = portB.closest("noflo-node") || portB.closest("noflo-iip");
      if (nodeA && nodeB) {
        const descriptor = editor.getEdgeDescriptor(
          /** @type {import("./library/EdgeManager.js").Edge} */ (edge),
        );
        if (
          descriptor &&
          (descriptor.fromIndex !== undefined ||
            descriptor.toIndex !== undefined)
        ) {
          currentGraph.addEdgeIndex(
            nodeA.getAttribute("name"),
            portA.dataset.portName,
            descriptor.fromIndex ?? null,
            nodeB.getAttribute("name"),
            portB.dataset.portName,
            descriptor.toIndex ?? null,
          );
        } else {
          currentGraph.addEdge(
            nodeA.getAttribute("name"),
            portA.dataset.portName,
            nodeB.getAttribute("name"),
            portB.dataset.portName,
          );
        }
      }
    }
    debouncedSave();
  });

  on(editor, "navigate-down-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const nodeName = event.detail.node;
    if (!currentGraph || !directoryHandle) return;
    const node = currentGraph.nodes.find(
      (/** @type {any} */ n) => n.id === nodeName,
    );
    if (!node) return;
    const fileName = graphFileNameFor(node.component);
    try {
      const handle = await directoryHandle.getFileHandle(fileName);
      // Persist any pending edits before switching graphs, so the debounced
      // writer cannot leak this graph's state into the next file.
      await graphSaver.flush();
      graphStack.push({ graph: currentGraph, fileName: currentFileName });
      await loadFile(handle);
      console.log(`Navigated down into ${fileName}`);
    } catch {
      console.warn(`No graph file for component ${node.component}`);
    }
  });

  on(editor, "navigate-up-attempt", async () => {
    if (graphStack.length === 0) return;
    await graphSaver.flush();
    const parent = graphStack.pop();
    if (parent) {
      openGraph(parent.graph, parent.fileName);
      console.log(`Navigated up to ${parent.fileName}`);
    }
  });

  on(editor, "create-subgraph-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    if (!currentGraph || !directoryHandle) return;

    // Operate on the active selection when the clicked node is part of it
    const clickedNames = event.detail.nodes.map((/** @type {any} */ n) =>
      editor.getNodeName(n),
    );
    let names = clickedNames;
    if (
      clickedNames.some((/** @type {string} */ n) =>
        editor.selectionManager.nodes.has(n),
      )
    ) {
      names = [...editor.selectionManager.nodes];
    }
    if (names.length === 0) return;

    const raw = prompt("Name for the subgraph:");
    if (!raw || !raw.trim()) return;
    const subName = raw.trim();
    const fileName = graphFileNameFor(subName);
    try {
      await directoryHandle.getFileHandle(fileName);
      alert(`A graph named ${fileName} already exists`);
      return;
    } catch {
      // Not found — good, we can create it
    }

    const nameSet = new Set(names);
    const parent = currentGraph;
    const nodesToMove = parent.nodes.filter((/** @type {any} */ n) =>
      nameSet.has(n.id),
    );
    if (nodesToMove.length === 0) return;

    // Capture edge data before mutating the parent graph
    const internalEdges = parent.edges.filter(
      (/** @type {any} */ edge) =>
        nameSet.has(edge.from.node) && nameSet.has(edge.to.node),
    );
    const externalEdges = parent.edges.filter(
      (/** @type {any} */ edge) =>
        nameSet.has(edge.from.node) !== nameSet.has(edge.to.node),
    );
    const movedInitializers = parent.initializers.filter(
      (/** @type {any} */ init) => nameSet.has(init.to.node),
    );

    // Externally-wired ports of the moved nodes become exported ports of the
    // subgraph, named after the port with numeric suffixes on conflicts
    const inportNames = new Map();
    const outportNames = new Map();
    for (const edge of externalEdges) {
      if (nameSet.has(edge.to.node)) {
        const key = `${edge.to.node}:${edge.to.port}`;
        if (!inportNames.has(key)) {
          inportNames.set(key, uniquePortName(edge.to.port, inportNames));
        }
      }
      if (nameSet.has(edge.from.node)) {
        const key = `${edge.from.node}:${edge.from.port}`;
        if (!outportNames.has(key)) {
          outportNames.set(key, uniquePortName(edge.from.port, outportNames));
        }
      }
    }

    const sub = new Graph(subName);
    for (const node of nodesToMove) {
      sub.addNode(node.id, node.component, node.metadata);
    }
    for (const edge of internalEdges) {
      sub.addEdgeIndex(
        edge.from.node,
        edge.from.port,
        edge.from.index ?? null,
        edge.to.node,
        edge.to.port,
        edge.to.index ?? null,
        edge.metadata,
      );
    }
    for (const [key, publicName] of inportNames) {
      const [nodeId, port] = splitNodePort(key);
      sub.addInport(publicName, nodeId, port);
    }
    for (const [key, publicName] of outportNames) {
      const [nodeId, port] = splitNodePort(key);
      sub.addOutport(publicName, nodeId, port);
    }
    for (const init of movedInitializers) {
      if (init.to.index !== undefined && init.to.index !== null) {
        sub.addInitialIndex(
          init.from.data,
          init.to.node,
          init.to.port,
          init.to.index,
          init.metadata,
        );
      } else {
        sub.addInitial(
          init.from.data,
          init.to.node,
          init.to.port,
          init.metadata,
        );
      }
    }

    // Replace the moved nodes in the parent with a single subgraph node,
    // placed at the centroid of the moved nodes
    const centroid = {
      x: Math.round(
        nodesToMove.reduce(
          (/** @type {number} */ sum, /** @type {any} */ n) =>
            sum + (n.metadata?.x || 0),
          0,
        ) / nodesToMove.length,
      ),
      y: Math.round(
        nodesToMove.reduce(
          (/** @type {number} */ sum, /** @type {any} */ n) =>
            sum + (n.metadata?.y || 0),
          0,
        ) / nodesToMove.length,
      ),
    };
    parent.addNode(subName, subName, centroid);
    for (const edge of externalEdges) {
      if (nameSet.has(edge.to.node)) {
        const publicName = inportNames.get(`${edge.to.node}:${edge.to.port}`);
        parent.addEdge(
          edge.from.node,
          edge.from.port,
          subName,
          publicName,
          edge.metadata,
        );
      } else {
        const publicName = outportNames.get(
          `${edge.from.node}:${edge.from.port}`,
        );
        parent.addEdge(
          subName,
          publicName,
          edge.to.node,
          edge.to.port,
          edge.metadata,
        );
      }
    }
    for (const node of nodesToMove) {
      parent.removeNode(node.id);
    }

    // Register the subgraph as a component, persist everything, and re-render
    libraryManager.setComponent(subName, {
      name: subName,
      type: "subgraph",
      icon: "folder-open",
      inports: [...inportNames.values()].map((n) => ({
        name: n,
        type: "all",
        addressable: false,
      })),
      outports: [...outportNames.values()].map((n) => ({
        name: n,
        type: "all",
        addressable: false,
      })),
    });
    try {
      await saveGraphAsJson(directoryHandle, fileName, sub);
      if (directoryHandle) {
        await saveLibrary(directoryHandle);
      }
    } catch (err) {
      console.error("Error saving subgraph:", err);
      return;
    }
    openGraph(parent, currentFileName);
    debouncedSave();
    console.log(
      `Created subgraph ${fileName} with ${nodesToMove.length} nodes`,
    );
  });

  on(editor, "move-nodes-up-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    if (!currentGraph || !directoryHandle) return;
    if (graphStack.length === 0) {
      console.warn("Already at the top-level graph; cannot move nodes up");
      return;
    }

    // Operate on the active selection when the clicked node is part of it
    const clickedNames = event.detail.nodes.map((/** @type {any} */ n) =>
      editor.getNodeName(n),
    );
    let names = clickedNames;
    if (
      clickedNames.some((/** @type {string} */ n) =>
        editor.selectionManager.nodes.has(n),
      )
    ) {
      names = [...editor.selectionManager.nodes];
    }
    if (names.length === 0) return;

    const nameSet = new Set(names);
    const sub = currentGraph;
    const parentEntry = graphStack[graphStack.length - 1];
    const parent = parentEntry.graph;
    const subComponentName = currentFileName.replace(/\.graph\.json$/, "");

    const nodesToMove = sub.nodes.filter((/** @type {any} */ n) =>
      nameSet.has(n.id),
    );
    if (nodesToMove.length === 0) return;

    // Capture before mutating
    const internalEdges = sub.edges.filter(
      (/** @type {any} */ edge) =>
        nameSet.has(edge.from.node) && nameSet.has(edge.to.node),
    );
    const externalEdges = sub.edges.filter(
      (/** @type {any} */ edge) =>
        nameSet.has(edge.from.node) !== nameSet.has(edge.to.node),
    );
    const movedInitializers = sub.initializers.filter(
      (/** @type {any} */ init) => nameSet.has(init.to.node),
    );

    // Parent-graph edges routed through the subgraph node's exported ports
    // whose sub-side endpoint is a moved node can connect directly again
    const subGraphNodeIds = parent.nodes
      .filter((/** @type {any} */ n) => n.component === subComponentName)
      .map((/** @type {any} */ n) => n.id);
    const routedParentEdges = parent.edges.filter(
      (/** @type {any} */ edge) =>
        (subGraphNodeIds.includes(edge.from.node) &&
          nameSet.has(sub.inports[edge.from.port]?.process)) ||
        (subGraphNodeIds.includes(edge.to.node) &&
          nameSet.has(sub.outports[edge.to.port]?.process)),
    );

    // New exports for connections between staying and moving nodes
    const newInports = new Map();
    const newOutports = new Map();
    for (const edge of externalEdges) {
      if (nameSet.has(edge.to.node)) {
        // Staying node feeds a moving node: subgraph exports an outport from
        // the staying node, the parent wires it into the moved node
        const key = `${edge.from.node}:${edge.from.port}`;
        if (!newOutports.has(key)) {
          newOutports.set(key, uniquePortName(edge.from.port, newOutports));
        }
      }
      if (nameSet.has(edge.from.node)) {
        // Moving node feeds a staying node: subgraph exports an inport into
        // the staying node, the parent wires the moved node into it
        const key = `${edge.to.node}:${edge.to.port}`;
        if (!newInports.has(key)) {
          newInports.set(key, uniquePortName(edge.to.port, newInports));
        }
      }
    }

    // Move nodes and their internal connections and IIPs into the parent
    for (const node of nodesToMove) {
      parent.addNode(node.id, node.component, node.metadata);
    }
    for (const edge of internalEdges) {
      parent.addEdgeIndex(
        edge.from.node,
        edge.from.port,
        edge.from.index ?? null,
        edge.to.node,
        edge.to.port,
        edge.to.index ?? null,
        edge.metadata,
      );
    }
    for (const init of movedInitializers) {
      if (init.to.index !== undefined && init.to.index !== null) {
        parent.addInitialIndex(
          init.from.data,
          init.to.node,
          init.to.port,
          init.to.index,
          init.metadata,
        );
      } else {
        parent.addInitial(
          init.from.data,
          init.to.node,
          init.to.port,
          init.metadata,
        );
      }
    }

    // Replace parent edges routed through the subgraph node with direct ones
    for (const edge of routedParentEdges) {
      if (subGraphNodeIds.includes(edge.from.node)) {
        const info = sub.inports[edge.from.port];
        parent.removeEdge(
          edge.from.node,
          edge.from.port,
          edge.to.node,
          edge.to.port,
        );
        parent.addEdge(
          info.process,
          info.port,
          edge.to.node,
          edge.to.port,
          edge.metadata,
        );
      } else {
        const info = sub.outports[edge.to.port];
        parent.removeEdge(
          edge.from.node,
          edge.from.port,
          edge.to.node,
          edge.to.port,
        );
        parent.addEdge(
          edge.from.node,
          edge.from.port,
          info.process,
          info.port,
          edge.metadata,
        );
      }
    }

    // Wire the staying side of external edges through new subgraph exports
    for (const [key, publicName] of newOutports) {
      const [nodeId, port] = splitNodePort(key);
      sub.addOutport(publicName, nodeId, port);
      const edge = externalEdges.find(
        (/** @type {any} */ e) =>
          nameSet.has(e.to.node) && `${e.from.node}:${e.from.port}` === key,
      );
      if (edge) {
        parent.addEdge(
          subComponentName,
          publicName,
          edge.to.node,
          edge.to.port,
          edge.metadata,
        );
      }
    }
    for (const [key, publicName] of newInports) {
      const [nodeId, port] = splitNodePort(key);
      sub.addInport(publicName, nodeId, port);
      const edge = externalEdges.find(
        (/** @type {any} */ e) =>
          nameSet.has(e.from.node) && `${e.to.node}:${e.to.port}` === key,
      );
      if (edge) {
        parent.addEdge(
          edge.from.node,
          edge.from.port,
          subComponentName,
          publicName,
          edge.metadata,
        );
      }
    }

    // Remove the moved nodes (and their now-gone edges/exports) from the sub
    for (const node of nodesToMove) {
      sub.removeNode(node.id);
    }

    // Keep the subgraph component signature in sync with the new exports
    libraryManager.setComponent(subComponentName, {
      name: subComponentName,
      type: "subgraph",
      icon: "folder-open",
      inports: Object.entries(sub.inports).map(([n, info]) => ({
        name: n,
        type: "all",
        addressable: false,
        process: /** @type {any} */ (info).process,
      })),
      outports: Object.entries(sub.outports).map(([n, info]) => ({
        name: n,
        type: "all",
        addressable: false,
        process: /** @type {any} */ (info).process,
      })),
    });

    try {
      // The parent is not the current graph, so the debounced writer will not
      // pick it up; save it explicitly
      await saveGraphAsJson(directoryHandle, parentEntry.fileName, parent);
      if (directoryHandle) {
        await saveLibrary(directoryHandle);
      }
    } catch (err) {
      console.error("Error saving parent graph:", err);
      return;
    }

    if (sub.nodes.length === 0) {
      // The subgraph is empty now: delete its file and component, navigate up
      try {
        const handle = await directoryHandle.getFileHandle(currentFileName);
        await /** @type {any} */ (handle).remove();
      } catch (err) {
        console.error("Error deleting empty subgraph file:", err);
      }
      libraryManager.removeComponent(subComponentName);
      await saveLibrary(directoryHandle);
      graphStack.pop();
      openGraph(parent, parentEntry.fileName);
      console.log(
        `Moved all nodes up; deleted empty subgraph ${currentFileName}`,
      );
    } else {
      openGraph(sub, currentFileName);
      debouncedSave();
      console.log(
        `Moved ${nodesToMove.length} nodes up to ${parentEntry.fileName}`,
      );
    }
  });

  on(editor, "node-creation-attempt", async (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;

    const componentName = await askForComponent();
    let componentData = getComponentFromLibrary(componentName);

    if (!componentData) {
      componentData = await askForNewComponentDetails(componentName);
      if (!componentData) return;
      libraryManager.setComponent(componentName, componentData);
      if (directoryHandle) {
        await saveLibrary(directoryHandle);
      }
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

    if (startPort) {
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
    }
    debouncedSave();
  });

  on(editor, "iip-creation-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { x, y, startPort } = event.detail;
    const iipId = `iip_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newIIP = editor.addIIP(
      x,
      y,
      /** @type {HTMLElement} */ (startPort),
      "Value",
      undefined,
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

  on(editor, "selection-changed", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    updateSelectionPills(event.detail);
  });

  on(editor, "node-removal-attempt", (e) => {
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

  on(editor, "edge-removal-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const edge = event.detail.edge;
    if (currentGraph) {
      const descriptor = editor.getEdgeDescriptor(edge);
      if (descriptor) {
        // Note: fbp-graph's removeEdge matches node+port pairs without arrayport
        // indexes, so with multiple indexed edges between the same port pair it
        // removes the first match. Upstream API limitation.
        currentGraph.removeEdge(
          descriptor.fromNode,
          descriptor.fromPort,
          descriptor.toNode,
          descriptor.toPort,
        );
      }
    }
    // Remove from editor
    editor.removeEdge(edge);
    debouncedSave();
  });

  on(editor, "iip-edit-attempt", (e) => {
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

  on(editor, "iip-removal-attempt", (e) => {
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

  on(editor, "iip-send-attempt", (e) => {
    const event = /** @type {CustomEvent} */ (e);
    const { iip } = event.detail;
    const iipElement = /** @type {FlowIIP} */ (iip);
    console.log(
      `[Main] Sending IIP: ${iipElement.getAttribute("name")} with value: ${iipElement.value}`,
    );
  });

  on(editor, "port-exported", (e) => {
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

  on(editor, "port-removed", (e) => {
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

  on(editor, "port-renamed", (e) => {
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

  on(editor, "nodes-moved", (e) => {
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

  on(editor, "edit-component-attempt", async (e) => {
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
    if (submitted === "save") {
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

      if (directoryHandle) {
        await saveLibrary(directoryHandle);
      }
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

/**
 * @param {string} componentName
 * @returns {Promise<ComponentDefinition | undefined>}
 */
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
  if (submitted === "save") {
    return /** @type {ComponentDefinition} */ (componentForm.data);
  }
  return undefined;
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
      ed.addExportedPort(
        x,
        y + i * 60,
        portName,
        direction,
        targetPort,
        info.metadata?.route,
      );
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
      iip.metadata?.route,
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
        conn.from.index,
        conn.to.index,
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
  graphStack = [];
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
