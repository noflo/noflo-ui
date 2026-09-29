import assert from "node:assert";
import { describe, it } from "node:test";

import "../elements/utils/register.js";

import { EdgeManager } from "../../src/library/EdgeManager.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @param {{direction: 'in' | 'out', name: string, portType?: string, index?: number}} opts
 */
function makePort({ direction, name, portType = "regular", index }) {
  const p = document.createElement("div");
  p.classList.add("port", direction === "out" ? "port-out" : "port-in");
  p.dataset.portName = name;
  p.dataset.portType = portType;
  if (index !== undefined) p.dataset.portIndex = index.toString();
  return p;
}

/** Build an EdgeManager with mock SVG groups and an injectable position map. */
function makeManager() {
  /** @type {Map<HTMLElement, {x: number, y: number}>} */
  const positions = new Map();
  const edgesGroup = document.createElementNS(SVG_NS, "g");
  const iipWiresGroup = document.createElementNS(SVG_NS, "g");
  const em = new EdgeManager({
    edgesGroup,
    iipWiresGroup,
    getPortPosition: (port) => positions.get(port) || { x: 0, y: 0 },
  });
  return { em, positions, edgesGroup, iipWiresGroup };
}

describe("EdgeManager", () => {
  it("adds a valid out->in edge, appending hit + visual paths", () => {
    const { em, edgesGroup } = makeManager();
    const portA = makePort({ direction: "out", name: "out" });
    const portB = makePort({ direction: "in", name: "in" });

    const edge = em.addEdge(portA, portB);

    assert.ok(edge, "should return the created edge");
    assert.strictEqual(em.edges.length, 1);
    assert.strictEqual(em.edges[0], edge);
    assert.strictEqual(edge.portA, portA);
    assert.strictEqual(edge.portB, portB);
    assert.strictEqual(edgesGroup.childNodes.length, 2);
    assert.ok(edge.visualPath.classList.contains("edge-flow"));
    assert.ok(edge.hitPath.classList.contains("edge-hit-area"));
  });

  it("rejects same-direction ports", () => {
    const { em, edgesGroup } = makeManager();
    const a = makePort({ direction: "in", name: "in" });
    const b = makePort({ direction: "in", name: "in2" });

    const edge = em.addEdge(a, b);

    assert.strictEqual(edge, undefined);
    assert.strictEqual(em.edges.length, 0);
    assert.strictEqual(edgesGroup.childNodes.length, 0);
  });

  it("limits array ports to a single connection", () => {
    const originalAlert = globalThis.alert;
    let alerted = "";
    globalThis.alert = (/** @type {string} */ msg) => {
      alerted = msg;
    };
    try {
      const { em } = makeManager();
      const out = makePort({
        direction: "out",
        name: "out",
        portType: "array",
      });
      const in1 = makePort({ direction: "in", name: "in1" });
      const in2 = makePort({ direction: "in", name: "in2" });

      assert.ok(em.addEdge(out, in1));
      assert.strictEqual(em.addEdge(out, in2), undefined);
      assert.strictEqual(em.edges.length, 1);
      assert.match(alerted, /ArrayPort out already has a connection/);
    } finally {
      globalThis.alert = originalAlert;
    }
  });

  it("computes a stable edge id from host + port metadata", () => {
    const { em } = makeManager();
    const hostA = document.createElement("noflo-node");
    hostA.setAttribute("name", "A");
    const portA = makePort({ direction: "out", name: "out" });
    hostA.appendChild(portA);
    const hostB = document.createElement("noflo-node");
    hostB.setAttribute("name", "B");
    const portB = makePort({ direction: "in", name: "in" });
    hostB.appendChild(portB);

    em.addEdge(portA, portB);
    assert.strictEqual(em.getEdgeId(em.edges[0]), "A:out[0]->B:in[0]");
  });

  it("writes bezier path data from resolved port positions", () => {
    const { em, positions } = makeManager();
    const portA = makePort({ direction: "out", name: "out" });
    const portB = makePort({ direction: "in", name: "in" });
    positions.set(portA, { x: 0, y: 0 });
    positions.set(portB, { x: 100, y: 0 });

    const edge = /** @type {NonNullable<ReturnType<typeof em.addEdge>>} */ (
      em.addEdge(portA, portB)
    );

    assert.strictEqual(
      edge.visualPath.getAttribute("d"),
      "M 0 0 C 50 0, 50 0, 100 0",
    );
  });

  it("connects IIP wires into the IIP group and updates them", () => {
    const { em, iipWiresGroup, positions } = makeManager();
    const iip = document.createElement("noflo-iip");
    const port = makePort({ direction: "in", name: "in" });
    positions.set(iip, { x: 0, y: 0 });
    positions.set(port, { x: 40, y: 0 });

    const wire = em.connectIIP(iip, port);

    assert.strictEqual(em.iipWires.length, 1);
    assert.strictEqual(iipWiresGroup.childNodes.length, 2);
    assert.strictEqual(wire.iip, iip);
    assert.strictEqual(wire.port, port);
    assert.strictEqual(
      wire.visualPath.getAttribute("d"),
      "M 0 0 C 20 0, 20 0, 40 0",
    );
  });

  it("removes a single edge (paths + registry)", () => {
    const { em } = makeManager();
    const edge = em.addEdge(
      makePort({ direction: "out", name: "out" }),
      makePort({ direction: "in", name: "in" }),
    );

    em.removeEdge(/** @type {NonNullable<typeof edge>} */ (edge));

    assert.strictEqual(em.edges.length, 0);
    // removed from the DOM tree
    assert.strictEqual(
      /** @type {NonNullable<typeof edge>} */ (edge).hitPath.parentElement,
      null,
    );
  });

  it("disconnects every edge + IIP wire attached to a port", () => {
    const { em } = makeManager();
    const out = makePort({ direction: "out", name: "out" });
    const in1 = makePort({ direction: "in", name: "in1" });
    const in2 = makePort({ direction: "in", name: "in2" });
    em.addEdge(out, in1);
    em.addEdge(makePort({ direction: "out", name: "out2" }), in2);
    em.connectIIP(document.createElement("noflo-iip"), in1);

    em.disconnectPort(in1);

    assert.strictEqual(em.edges.length, 1);
    assert.strictEqual(em.iipWires.length, 0);
    assert.strictEqual(em.edges[0].portB, in2);
  });

  it("removes all edges touching a graph element host", () => {
    const { em } = makeManager();
    const host = document.createElement("noflo-node");
    host.setAttribute("name", "N");
    const out = makePort({ direction: "out", name: "out" });
    host.appendChild(out);
    const inPort = makePort({ direction: "in", name: "in" });
    em.addEdge(out, inPort);

    em.removeEdgesForNode(host);

    assert.strictEqual(em.edges.length, 0);
  });

  it("removes IIP wires for an exported port on either endpoint", () => {
    const { em } = makeManager();
    const ep = document.createElement("noflo-exported-port");
    const port = makePort({ direction: "in", name: "in" });
    em.connectIIP(ep, port);
    em.connectIIP(document.createElement("noflo-iip"), port);

    em.removeIIPWiresForExportedPort(ep);

    // only the wire whose iip===ep is removed; the other (iip!=ep, port!=ep) stays
    assert.strictEqual(em.iipWires.length, 1);
  });

  describe("arrayport indexes", () => {
    /**
     * @param {string} name
     * @param {HTMLElement[]} ports
     */
    function makeNode(name, ports) {
      const node = document.createElement("div");
      node.setAttribute("name", name);
      const shadow = node.attachShadow({ mode: "open" });
      for (const port of ports) shadow.appendChild(port);
      return node;
    }

    it("connectNodes matches the indexed port element", () => {
      const { em } = makeManager();
      const in0 = makePort({
        direction: "in",
        name: "in",
        portType: "array",
        index: 0,
      });
      const in1 = makePort({
        direction: "in",
        name: "in",
        portType: "array",
        index: 1,
      });
      const nodeB = makeNode("B", [in0, in1]);
      const out = makePort({ direction: "out", name: "out" });
      const nodeA = makeNode("A", [out]);

      const edge = em.connectNodes(
        nodeA,
        "out",
        nodeB,
        "in",
        undefined,
        undefined,
        1,
      );

      assert.ok(edge, "edge should be created");
      assert.strictEqual(edge.portB, in1, "should connect to the index 1 port");
    });

    it("connectNodes still matches regular ports without an index", () => {
      const { em } = makeManager();
      const out = makePort({ direction: "out", name: "out" });
      const inPort = makePort({ direction: "in", name: "in" });
      const nodeA = makeNode("A", [out]);
      const nodeB = makeNode("B", [inPort]);

      const edge = em.connectNodes(nodeA, "out", nodeB, "in");

      assert.ok(edge);
      assert.strictEqual(edge.portB, inPort);
    });

    it("getEdgeDescriptor exposes node names, ports, and indexes", () => {
      const { em } = makeManager();
      const out1 = makePort({
        direction: "out",
        name: "out",
        portType: "array",
        index: 1,
      });
      const inPort = makePort({ direction: "in", name: "in" });
      const nodeA = makeNode("A", [out1]);
      const nodeB = makeNode("B", [inPort]);

      const edge = em.addEdge(out1, inPort);
      const descriptor = em.getEdgeDescriptor(/** @type {any} */ (edge));

      assert.strictEqual(descriptor.fromNode, "A");
      assert.strictEqual(descriptor.fromPort, "out");
      assert.strictEqual(descriptor.fromIndex, 1);
      assert.strictEqual(descriptor.toNode, "B");
      assert.strictEqual(descriptor.toPort, "in");
      assert.strictEqual(descriptor.toIndex, undefined);
    });
  });
});
