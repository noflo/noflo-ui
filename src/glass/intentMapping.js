/**
 * @file Glass intent mapping: wires the editor's interaction events to
 * Appendix A intent messages. Shared between the application shell and the
 * integration tests so the mapping is always exercised exactly as shipped.
 */
import { on } from "../events.js";

/**
 * @typedef {Object} IntentMapperOptions
 * @property {(message: any) => void} sendIntent Delivers an intent to the Engine.
 * @property {() => string} graphId The graph the Glass is editing.
 * @property {{ down: (node: string) => void, up: () => void, createSubgraph: (nodes: any[]) => void, moveUp: (nodes: any[]) => void, unpack: (node: string) => void }} [navigation]
 *   Handlers for graph navigation and subgraph lifecycle, backed by the
 *   CRDT and the URL router.
 * @property {(nodes: Array<{ node: string, x: number, y: number }>) => void} [onDragging]
 *   Emitted during node drags for peer awareness (throttled by the engine).
 * @property {(nodes: string[]) => void} [onDragEnd]
 *   Emitted when a node drag ends, clearing peer ghost states.
 * @property {() => { getComponent: (name: string) => any, listComponents: () => string[] } | null} getLibrary
 *   The Glass-side library view, for default port names and the candidate
 *   lists of the typed-port guiding.
 * @property {((options: { x: number, y: number, startPort: HTMLElement | null }) => Promise<string | null>)} [pickComponent]
 *   Resolves the component for a new node (work document #29's typed-port
 *   guiding): the shell shows the compatible-component picker. Null
 *   cancels; absent, the mapper falls back to a window prompt.
 */

/**
 * @typedef {Object} IntentMapper
 * @property {(ed: any) => void} wire Attach event listeners to an editor.
 * @property {(exists: (nodeId: string) => boolean) => void} flushPending
 *   Send queued intents whose target node now exists in the replica.
 */

/**
 * Resolves the graph node hosting a port element.
 *
 * @param {HTMLElement} port
 * @returns {HTMLElement | null}
 */
function hostOf(port) {
  const root = port.getRootNode();
  if (root instanceof ShadowRoot) {
    return /** @type {HTMLElement | null} */ (root.host);
  }
  return port.closest("noflo-node") || port.closest("noflo-iip");
}

/**
 * Narrows the library to the components compatible with a dragged port
 * (work document #29 update #1): dragging from an outport lists components
 * with a matching inport, and vice versa. Port types match when either side
 * is `all` or the types are equal.
 *
 * @param {{ getComponent: (name: string) => any, listComponents: () => string[] } | null} library
 * @param {HTMLElement} startPort The dragged port element.
 * @returns {string[]}
 */
export function compatibleComponents(library, startPort) {
  if (!library) return [];
  const draggingOut = startPort.classList.contains("port-out");
  const portType = startPort.dataset.portType || "all";
  const wanted = draggingOut ? "inports" : "outports";
  const compatible = (/** @type {any} */ port) => {
    const type = port.type || "all";
    return type === "all" || portType === "all" || type === portType;
  };
  return library.listComponents().filter((/** @type {string} */ name) => {
    const component = library.getComponent(name);
    return (component?.[wanted] ?? []).some(compatible);
  });
}

/**
 * Builds the Appendix A edge endpoint for a port element.
 *
 * @param {HTMLElement} port
 * @returns {{ node: string, port: string, index?: number }}
 */
function endpointFor(port) {
  const host = hostOf(port);
  const index = port.dataset.portIndex;
  return {
    node: host?.getAttribute("name") ?? "unknown",
    port: port.dataset.portName ?? "",
    ...(index !== undefined ? { index: Number.parseInt(index, 10) } : {}),
  };
}

/**
 * Deterministic edge id, matching the Engine's ProjectDoc rule.
 *
 * @param {{ node: string, port: string, index?: number }} src
 * @param {{ node: string, port: string, index?: number }} tgt
 * @returns {string}
 */
function edgeIdFor(src, tgt) {
  return `${src.node}:${src.port}[${src.index ?? 0}]->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]`;
}

/**
 * First outport/inport name of a component, used when wiring a brand-new node
 * whose signature comes from the library.
 *
 * @param {{ getComponent: (name: string) => any, listComponents: () => string[] } | null} library
 * @param {string} componentName
 * @param {"inports" | "outports"} direction
 * @returns {string}
 */
function defaultPortFor(library, componentName, direction) {
  const component = library?.getComponent(componentName);
  const ports = component?.[direction];
  return ports?.[0]?.name ?? (direction === "inports" ? "in" : "out");
}

/**
 * Creates the intent mapper.
 *
 * @param {IntentMapperOptions} options
 * @returns {IntentMapper}
 */
export function createIntentMapper({
  sendIntent,
  graphId,
  getLibrary,
  navigation,
  onDragging,
  onDragEnd,
  pickComponent,
}) {
  /** Intents held back until their target node appears in the replica. */
  const pendingAfterNode = new Map();

  /**
   * Queues an intent to be sent once the given node exists in the replica, so
   * dependent intents (like connecting a freshly created node) don't bounce
   * off the engine's dangling-endpoint validation.
   *
   * @param {string} nodeId
   * @param {any} intent
   */
  function afterNode(nodeId, intent) {
    const queue = pendingAfterNode.get(nodeId) ?? [];
    queue.push(intent);
    pendingAfterNode.set(nodeId, queue);
  }

  return {
    /**
     * Sends queued intents whose target node now exists in the replica.
     *
     * @param {(nodeId: string) => boolean} exists
     */
    flushPending(exists) {
      for (const [nodeId, queue] of pendingAfterNode) {
        if (!exists(nodeId)) continue;
        pendingAfterNode.delete(nodeId);
        for (const intent of queue) {
          sendIntent(intent);
        }
      }
    },

    /**
     * Wires the editor's interaction events to engine intents.
     *
     * @param {any} ed
     */
    wire(ed) {
      on(ed, "node-creation-attempt", async (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const { x, y, startPort } = event.detail;
        const componentName = pickComponent
          ? await pickComponent({ x, y, startPort })
          : window.prompt(
              "Enter component name (or leave empty to use 'New Node'):",
            );
        if (componentName === null) return;
        const name = componentName.trim() || "New Node";
        const nodeId = `node_${Date.now()}`;
        sendIntent({
          type: "INTENT",
          command: "addNode",
          payload: {
            graphId: graphId(),
            nodeId,
            componentName: name,
            metadata: { x, y },
          },
        });

        if (startPort) {
          const port = /** @type {HTMLElement} */ (startPort);
          const isOut = port.classList.contains("port-out");
          const hostName = hostOf(port)?.getAttribute("name") ?? "unknown";
          const portName = port.dataset.portName ?? "";
          const index = port.dataset.portIndex;
          const hostEndpoint = {
            node: hostName,
            port: portName,
            ...(index !== undefined
              ? { index: Number.parseInt(index, 10) }
              : {}),
          };
          if (isOut) {
            afterNode(nodeId, {
              type: "INTENT",
              command: "addEdge",
              payload: {
                graphId: graphId(),
                src: hostEndpoint,
                tgt: {
                  node: nodeId,
                  port: defaultPortFor(getLibrary(), name, "inports"),
                },
              },
            });
          } else {
            afterNode(nodeId, {
              type: "INTENT",
              command: "addEdge",
              payload: {
                graphId: graphId(),
                src: {
                  node: nodeId,
                  port: defaultPortFor(getLibrary(), name, "outports"),
                },
                tgt: hostEndpoint,
              },
            });
          }
        }
      });

      on(ed, "node-removal-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        for (const node of event.detail.nodes) {
          const name = node.getAttribute?.("name") ?? node.name;
          sendIntent({
            type: "INTENT",
            command: "removeNode",
            payload: { graphId: graphId(), nodeId: name },
          });
        }
      });

      on(ed, "nodes-moved", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        for (const node of event.detail.nodes) {
          if (node.type !== "noflo-node") continue;
          sendIntent({
            type: "INTENT",
            command: "moveNode",
            payload: {
              graphId: graphId(),
              nodeId: node.name,
              metadata: { x: node.position.x, y: node.position.y },
            },
          });
        }
      });

      on(ed, "wire-connection-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        sendIntent({
          type: "INTENT",
          command: "addEdge",
          payload: {
            graphId: graphId(),
            src: endpointFor(event.detail.portA),
            tgt: endpointFor(event.detail.portB),
          },
        });
      });

      on(ed, "edge-removal-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const descriptor = ed.getEdgeDescriptor(event.detail.edge);
        if (!descriptor) return;
        sendIntent({
          type: "INTENT",
          command: "removeEdge",
          payload: {
            graphId: graphId(),
            id: edgeIdFor(
              {
                node: descriptor.fromNode,
                port: descriptor.fromPort,
                ...(descriptor.fromIndex !== undefined
                  ? { index: descriptor.fromIndex }
                  : {}),
              },
              {
                node: descriptor.toNode,
                port: descriptor.toPort,
                ...(descriptor.toIndex !== undefined
                  ? { index: descriptor.toIndex }
                  : {}),
              },
            ),
          },
        });
      });

      on(ed, "iip-creation-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const value = window.prompt(
          "Value for the initial information packet:",
        );
        if (value === null) return;
        const startPort = /** @type {HTMLElement | undefined} */ (
          event.detail.startPort
        );
        if (!startPort) return;
        sendIntent({
          type: "INTENT",
          command: "addIIP",
          payload: {
            graphId: graphId(),
            data: value,
            tgt: endpointFor(startPort),
            metadata: { x: event.detail.x, y: event.detail.y },
          },
        });
      });

      on(ed, "iip-edit-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const iip = /** @type {any} */ (event.detail.iip);
        const newValue = window.prompt("New value for the packet:", iip.value);
        if (newValue === null || typeof iip.id !== "string") return;
        sendIntent({
          type: "INTENT",
          command: "updateIIP",
          payload: { graphId: graphId(), id: iip.id, data: newValue },
        });
      });

      on(ed, "iip-removal-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const iip = /** @type {any} */ (event.detail.iip);
        if (typeof iip.id !== "string") return;
        sendIntent({
          type: "INTENT",
          command: "removeIIP",
          payload: { graphId: graphId(), id: iip.id },
        });
      });

      on(ed, "port-exported", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const { name, direction, process, port, position } = event.detail;
        sendIntent({
          type: "INTENT",
          command: direction === "in" ? "addInport" : "addOutport",
          payload: {
            graphId: graphId(),
            name,
            nodeId: process,
            port,
            metadata: position ? { x: position.x, y: position.y } : undefined,
          },
        });
      });

      on(ed, "port-removed", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const { name, direction } = event.detail;
        sendIntent({
          type: "INTENT",
          command: direction === "in" ? "removeInport" : "removeOutport",
          payload: { graphId: graphId(), name },
        });
      });

      on(ed, "port-renamed", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const { oldName, newName, direction } = event.detail;
        sendIntent({
          type: "INTENT",
          command: direction === "in" ? "renameInport" : "renameOutport",
          payload: { graphId: graphId(), from: oldName, to: newName },
        });
      });

      for (const kind of ["iip-send-attempt"]) {
        ed.addEventListener(kind, () => {
          console.info(
            `${kind} has no Engine IPC yet; not applied (see work document #18 SPEC gaps)`,
          );
        });
      }

      on(ed, "nodes-dragging", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        if (!onDragging) return;
        onDragging(event.detail?.nodes ?? []);
      });

      on(ed, "nodes-drag-end", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        if (!onDragEnd) return;
        onDragEnd(event.detail?.nodes ?? []);
      });

      on(ed, "move-nodes-up-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        navigation?.moveUp(event.detail?.nodes ?? []);
      });

      on(ed, "unpack-subgraph-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const node = /** @type {string | undefined} */ (event.detail?.node);
        if (node) navigation?.unpack(node);
      });

      on(ed, "navigate-down-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        const node = /** @type {string | undefined} */ (event.detail?.node);
        if (node) navigation?.down(node);
      });

      on(ed, "navigate-up-attempt", () => {
        navigation?.up();
      });

      on(ed, "create-subgraph-attempt", (e) => {
        const event = /** @type {CustomEvent} */ (e);
        navigation?.createSubgraph(event.detail?.nodes ?? []);
      });
    },
  };
}
