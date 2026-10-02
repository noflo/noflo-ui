import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import "../elements/utils/register.js";

import { FlowEditor } from "../../src/elements/noflo-editor.js";
import { FlowExportedPort } from "../../src/elements/noflo-exported-port.js";
import { FlowIIP } from "../../src/elements/noflo-iip.js";
import { FlowNode } from "../../src/elements/noflo-node.js";
import { FlowRadialMenu } from "../../src/elements/noflo-radial-menu.js";
import { SelectionPills } from "../../src/elements/noflo-selection-pills.js";
import { createIntentMapper } from "../../src/glass/intentMapping.js";
import { projectGraph } from "../../src/glass/projectView.js";
import { renderGraphIntoEditor } from "../../src/glass/renderGraph.js";
import { LibraryManager } from "../../src/library/LibraryManager.js";
import { startEngine } from "../../src/worker/engine.js";
import * as Y from "../../vendor/yjs.js";

customElements.define("noflo-editor", FlowEditor);
customElements.define("noflo-node", FlowNode);
customElements.define("noflo-iip", FlowIIP);
customElements.define("noflo-exported-port", FlowExportedPort);
customElements.define("noflo-radial-menu", FlowRadialMenu);
customElements.define("noflo-selection-pills", SelectionPills);

/**
 * Runs the Glass loop against a real engine: a mirror doc fed by engine
 * messages, the editor re-rendered from the projection, and editor events
 * mapped back to intents by the production intent mapper.
 */
class GlassHarness {
  constructor() {
    this.mirror = new Y.Doc();
    /** @type {any} */
    this.editor = null;
    this.libraryManager = new LibraryManager();
    /** @type {any[]} */
    this.posted = [];
    /** @type {((message: any) => void) | null} */
    this.messageHandler = null;
    /** @type {any[]} */
    this.sentIntents = [];
    this.mapper = createIntentMapper({
      sendIntent: (/** @type {any} */ message) => {
        this.sentIntents.push(message);
        this.messageHandler?.(message);
      },
      graphId: () => "main",
      getLibrary: () => this.libraryManager,
    });
  }

  /** Applies every engine message to the mirror, like app.js. */
  applyEngineMessages() {
    for (const message of this.posted) {
      if (message.kind === "y-sync" || message.kind === "y-update") {
        try {
          Y.applyUpdate(this.mirror, message.update);
        } catch (err) {
          console.log("APPLY FAILED:", err.message);
        }
        console.log(
          "applied",
          message.kind,
          "len",
          message.update?.length,
          "clock-probe graphs:",
          [...this.mirror.getMap("graphs").keys()],
        );
      }
    }
  }

  /**
   * Pumps async engine/network rounds, applying mirror updates.
   * @param {number} [rounds]
   */
  async pump(rounds = 4) {
    for (let i = 0; i < rounds; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      this.applyEngineMessages();
      this.mapper.flushPending((/** @type {string} */ nodeId) =>
        Boolean(projectGraph(this.mirror, "main")?.processes[nodeId]),
      );
    }
  }

  /** Re-renders the editor from the replica, like app.js's render(). */
  async render() {
    const view = projectGraph(this.mirror, "main") ?? {
      processes: {},
      connections: [],
      inports: {},
      outports: {},
      properties: { name: "main" },
    };
    // @ts-expect-error test shim: view matches fbp-graph JSON
    const noflo = await import("noflo");
    const replica = await noflo.graph.loadJSON(view);
    this.editor?.remove();
    this.editor = /** @type {any} */ (document.createElement("noflo-editor"));
    document.body.appendChild(this.editor);
    this.editor.libraryManager = this.libraryManager;
    this.mapper.wire(this.editor);
    renderGraphIntoEditor(replica, this.editor, (/** @type {string} */ name) =>
      this.libraryManager.getComponent(name),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /** @returns {any} The projected replica graph. */
  get view() {
    return projectGraph(this.mirror, "main");
  }

  /** @param {string} name */
  nodes(name) {
    return /** @type {any} */ (
      this.editor.nodeLayer.querySelectorAll(`noflo-node[name="${name}"]`)
    )[0];
  }
}

describe("Glass loop: all graph editing operations", () => {
  /** @type {GlassHarness} */
  let harness;
  /** @type {any} */
  let engine;
  const prompts = [];

  beforeEach(() => {
    prompts.length = 0;
    // Stub prompts: node creation returns a component name, IIPs a value
    /** @type {any} */ (globalThis).window.prompt = (
      /** @type {string} */ _message,
      /** @type {string | undefined} */ defaultValue,
    ) => {
      prompts.push(_message);
      return defaultValue !== undefined ? defaultValue : "c/A";
    };
  });

  it("covers add, move, connect, disconnect, IIPs, exports, and removal", async () => {
    const posted = [];
    harness = new GlassHarness();
    engine = await startEngine({
      postMessage: (/** @type {any} */ message) => posted.push(message),
      registerMessageHandler: (/** @type {any} */ handler) => {
        harness.messageHandler = handler;
      },
    });
    harness.posted = posted;
    harness.applyEngineMessages();
    await harness.render();

    // --- add node (via editor event, like the radial menu does) ---
    harness.editor.dispatchEvent(
      new CustomEvent("node-creation-attempt", {
        detail: { x: 100, y: 100, startPort: null },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    await harness.render();
    console.debug(
      "DEBUG posted kinds:",
      posted.map((p) => p.kind ?? p.protocol + ":" + p.command),
      "mirror graphs:",
      [...[...harness.mirror.getMap("graphs").keys()]],
    );
    assert.ok(harness.view.processes["node_"] === undefined);
    const created = Object.keys(harness.view.processes);
    assert.equal(created.length, 1, "node added through the loop");
    const nodeA = created[0];
    assert.equal(harness.view.processes[nodeA].component, "c/A");

    // --- add a second node ---
    harness.editor.dispatchEvent(
      new CustomEvent("node-creation-attempt", {
        detail: { x: 400, y: 100, startPort: null },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    await harness.render();
    const created2 = Object.keys(harness.view.processes).filter(
      (id) => id !== nodeA,
    );
    const nodeB = created2[0];
    await harness.render();

    // --- move node B (like the drag-end flow emits) ---
    harness.editor.dispatchEvent(
      new CustomEvent("nodes-moved", {
        detail: {
          nodes: [
            { name: nodeB, position: { x: 500, y: 300 }, type: "noflo-node" },
          ],
        },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.equal(harness.view.processes[nodeB].metadata.x, 500, "node moved");

    // --- connect A -> B via the default ports (wire drop) ---
    const outPort = /** @type {any} */ (
      harness
        .nodes(nodeA)
        .shadowRoot.querySelector('.port[data-port-name="out0"]')
    );
    const inPort = /** @type {any} */ (
      harness
        .nodes(nodeB)
        .shadowRoot.querySelector('.port[data-port-name="in0"]')
    );
    assert.ok(outPort && inPort, "default ports carry names");

    harness.editor.dispatchEvent(
      new CustomEvent("wire-connection-attempt", {
        detail: { portA: outPort, portB: inPort },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    await harness.render();

    const edge = harness.view.connections.find(
      (/** @type {any} */ c) => c.src?.process === nodeA,
    );
    assert.ok(edge, "edge persisted in the replica");
    assert.equal(edge.src.port, "out0");
    assert.equal(edge.src.process, nodeA);
    assert.equal(edge.tgt.port, "in0");
    const edgeId = `${nodeA}:out0[0]->${nodeB}:in0[0]`;
    assert.equal(
      edge.id ??
        `${edge.src.process}:${edge.src.port}[0]->${edge.tgt.process}:${edge.tgt.port}[0]`,
      edgeId,
    );
    const elA = harness.nodes(nodeA);
    const elB = harness.nodes(nodeB);
    const portsA = elA?.shadowRoot
      ? [...elA.shadowRoot.querySelectorAll(".port")]
      : [];
    const portsB = elB?.shadowRoot
      ? [...elB.shadowRoot.querySelectorAll(".port")]
      : [];
    console.log(
      "PROBE nodeA present:",
      Boolean(elA),
      "portsA:",
      portsA.map((p) => p.dataset.portName),
      "portsB:",
      portsB.map((p) => p.dataset.portName),
      "edges:",
      harness.editor.edgeManager.edges.length,
    );
    assert.equal(
      /** @type {any} */ (harness.editor.edgeManager).edges.length,
      1,
      "edge renders in the editor",
    );

    // --- add an IIP targeting node B's in port (wire-drop ghost flow) ---
    harness.editor.dispatchEvent(
      new CustomEvent("iip-creation-attempt", {
        detail: { x: 0, y: 0, startPort: inPort },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    const iipConnection = harness.view.connections.find(
      (/** @type {any} */ c) => c.data !== undefined,
    );
    assert.ok(iipConnection, "IIP persisted");
    assert.equal(iipConnection.data, "c/A", "stubbed prompt value");
    const iipId = iipConnection.id ?? `DATA->${nodeB}:in0[0]`;
    assert.equal(iipConnection.tgt.process, nodeB);

    // --- edit the IIP ---
    harness.editor.dispatchEvent(
      new CustomEvent("iip-edit-attempt", {
        detail: { iip: { id: iipId, value: "c/A" } },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.equal(
      harness.view.connections.find(
        (/** @type {any} */ c) => c.data !== undefined,
      ).data,
      "c/A",
      "IIP updated in place (stub returns the current value)",
    );

    // --- export node A's outport ---
    harness.editor.dispatchEvent(
      new CustomEvent("port-exported", {
        detail: {
          name: "output",
          direction: "out",
          position: { x: 0, y: 0 },
          process: nodeA,
          port: "out0",
        },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.equal(
      harness.view.outports.output?.process,
      nodeA,
      "outport exported",
    );

    // --- rename the exported port ---
    harness.editor.dispatchEvent(
      new CustomEvent("port-renamed", {
        detail: { oldName: "output", newName: "result", direction: "out" },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.ok(harness.view.outports.result, "export renamed");
    assert.equal(harness.view.outports.output, undefined);

    // --- remove the exported port ---
    harness.editor.dispatchEvent(
      new CustomEvent("port-removed", {
        detail: { name: "result", direction: "out" },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.equal(harness.view.outports.result, undefined, "export removed");

    // --- remove the IIP ---
    harness.editor.dispatchEvent(
      new CustomEvent("iip-removal-attempt", {
        detail: { iip: { id: iipId } },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    assert.equal(
      harness.view.connections.find(
        (/** @type {any} */ c) => c.data !== undefined,
      ),
      undefined,
      "IIP removed",
    );

    // --- remove the edge ---
    const domEdge = /** @type {any} */ (harness.editor.edgeManager).edges[0];
    harness.editor.dispatchEvent(
      new CustomEvent("edge-removal-attempt", {
        detail: { edge: domEdge },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    await harness.render();
    assert.equal(
      harness.view.connections.filter((/** @type {any} */ c) => c.src).length,
      0,
      "edge removed from the replica",
    );
    assert.equal(
      /** @type {any} */ (harness.editor.edgeManager).edges.length,
      0,
      "edge removed from the editor",
    );

    // --- remove node A (cascades) ---
    const elementA = harness.nodes(nodeA);
    harness.editor.dispatchEvent(
      new CustomEvent("node-removal-attempt", {
        detail: { nodes: [elementA] },
        bubbles: true,
        composed: true,
      }),
    );
    await harness.pump();
    await harness.render();
    assert.equal(
      Object.keys(harness.view.processes).length,
      1,
      "node A removed; B remains",
    );

    engine.stop();
  }, 20000);
});
