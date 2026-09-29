/**
 * @file Glass rendering: projects a loaded fbp-graph (the read replica view)
 * into the `noflo-editor` Web Component. Shared rendering logic for the
 * CRDT-driven application shell.
 */

/**
 * Renders exported in/out ports just outside the node bounding box.
 *
 * @param {any} ports `g.inports` or `g.outports`.
 * @param {Map<string, any>} elementsMap Graph id -> editor element.
 * @param {any} ed Editor instance to render into.
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
 * @param {any} ed Editor instance to render into.
 * @param {(componentName: string) => any} getComponent Resolves component
 *   definitions from the Glass-side library view.
 * @returns {Map<string, any>} Map of graph id -> editor element.
 */
export function renderGraphIntoEditor(g, ed, getComponent) {
  const elementsMap = new Map();

  for (const node of g.nodes) {
    const x = node.metadata?.x || 0;
    const y = node.metadata?.y || 0;
    const comp = getComponent(node.component);
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
        conn.from.index,
        conn.to.index,
      );
    }
  }

  return elementsMap;
}
