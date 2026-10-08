/**
 * @file Glass rendering: projects the CRDT read replica (the `projectGraph`
 * view, src/glass/projectView.js) into the `noflo-editor` Web Component.
 * The projection is the only render source — the legacy fbp-graph format
 * is an interchange serialization, not a rendering structure (SPEC "The
 * Source of Truth: CRDT vs. Files").
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
      // Addressable exports pin their array slot: the selector must match
      // the indexed instance, not the first port with the name
      targetPort = nodeEl.shadowRoot?.querySelector(
        info.index !== undefined
          ? `.port[data-port-name="${info.port}"][data-port-index="${info.index}"]`
          : `.port[data-port-name="${info.port}"]`,
      );
    }
    if (targetPort) {
      // Stored positions win over the computed column layout
      const px = info.metadata?.x ?? x;
      const py = info.metadata?.y ?? y + i * 60;
      ed.addExportedPort(
        px,
        py,
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
 * @param {any} g The projected replica view (`projectGraph`).
 * @param {any} ed Editor instance to render into.
 * @param {(componentName: string) => any} getComponent Resolves component
 *   definitions from the Glass-side library view.
 * @returns {Map<string, any>} Map of graph id -> editor element.
 */
export function renderGraphIntoEditor(g, ed, getComponent) {
  const elementsMap = new Map();

  // Array instance fans grow with their attachments (work document #5):
  // an edge, an IIP, or an export occupying a slot counts, and at least
  // one end slot stays free. Computed from the projected view and applied
  // BEFORE any wires connect — setPortUsage re-renders the port elements,
  // so applying it late would orphan every wire's port reference
  /** @type {Map<string, { in: Record<string, number[]>, out: Record<string, number[]> }>} */
  const usage = new Map();
  /**
   * @param {string} nodeId
   * @param {"in" | "out"} direction
   * @param {string} portName
   * @param {number | undefined} index
   * @returns {void}
   */
  const recordUse = (nodeId, direction, portName, index) => {
    if (index === undefined || index === null) return;
    let perNode = usage.get(nodeId);
    if (!perNode) {
      perNode = { in: {}, out: {} };
      usage.set(nodeId, perNode);
    }
    const slots =
      perNode[direction][portName] ?? (perNode[direction][portName] = []);
    if (!slots.includes(index)) {
      slots.push(index);
      slots.sort((a, b) => a - b);
    }
  };
  for (const conn of g.edges ?? []) {
    recordUse(conn.from?.node, "out", conn.from?.port, conn.from?.index);
    recordUse(conn.to?.node, "in", conn.to?.port, conn.to?.index);
  }
  for (const iip of g.initializers ?? []) {
    recordUse(iip.to?.node, "in", iip.to?.port, iip.to?.index);
  }
  for (const direction of ["inports", "outports"]) {
    for (const info of Object.values(g[direction] ?? {})) {
      recordUse(
        info.process,
        direction === "inports" ? "in" : "out",
        info.port,
        info.index,
      );
    }
  }

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
    const nodeUsage = usage.get(node.id);
    if (nodeUsage) {
      n.setPortUsage(nodeUsage);
    }
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
          iip.to.index !== undefined
            ? `.port[data-port-name="${iip.to.port}"][data-port-index="${iip.to.index}"]`
            : `.port[data-port-name="${iip.to.port}"]`,
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
