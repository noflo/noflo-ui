import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEngineState, handleMessage } from "../../src/crdt/EngineCore.js";
import {
  createGraph,
  createProjectDoc,
  getGraph,
  getNode,
} from "../../src/crdt/ProjectDoc.js";
import * as Y from "../../vendor/yjs.js";

/**
 * One engine session: a project document with a persistent engine state,
 * as the worker holds across a project's lifetime.
 * @returns {{ doc: Y.Doc, state: any, handle: (message: any) => any }}
 */
function session() {
  const doc = createProjectDoc("p");
  createGraph(doc, "main", "main", null);
  const state = createEngineState();
  return {
    doc,
    state,
    handle: (/** @type {any} */ message) => handleMessage(doc, state, message),
  };
}

/**
 * @param {any} s
 * @param {string} nodeId
 */
function mainNode(s, nodeId) {
  return getNode(getGraph(s.doc, "main"), nodeId);
}

/**
 * @param {any} s
 * @param {string} command
 * @param {any} payload
 */
function intent(s, command, payload) {
  return s.handle({ type: "INTENT", command, payload });
}

describe("undo journal (work document #39)", () => {
  it("undoes a tracked intent: add then undo removes the node", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    assert.ok(mainNode(s, "a"), "node exists");
    const result = intent(s, "undo", {});
    assert.equal(result.accepted, true);
    assert.equal(mainNode(s, "a"), undefined, "node undone");
    assert.equal(
      result.echoes.some((/** @type {any} */ e) => e.kind === "undo"),
      true,
      "availability echo present",
    );
  });

  it("undo restores a removed node with its attributes", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    intent(s, "moveNode", {
      graphId: "main",
      nodeId: "a",
      metadata: { x: 120, y: 80 },
    });
    intent(s, "removeNode", { graphId: "main", nodeId: "a" });
    assert.equal(mainNode(s, "a"), undefined);
    // Command changes split the steps: undo pops the removal, then the
    // move, then the add
    intent(s, "undo", {});
    const restored = mainNode(s, "a");
    assert.ok(restored, "node restored");
    assert.equal(
      restored.get("metadata").get("x"),
      120,
      "the move still stands",
    );
    intent(s, "undo", {});
    assert.equal(mainNode(s, "a").get("metadata").get("x"), 0, "move undone");
    intent(s, "undo", {});
    assert.equal(mainNode(s, "a"), undefined, "add undone");
  });

  it("a remote-origin update is never tracked — undo skips it", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    // A peer's edit arrives as a remote CRDT update (y-reticulum applies
    // updates with its own origin, never ours)
    const remote = new Y.Doc();
    remote.getMap("graphs").set("peer-marker", "x");
    Y.applyUpdate(s.doc, Y.encodeStateAsUpdate(remote), "remote-peer");
    intent(s, "undo", {});
    assert.equal(mainNode(s, "a"), undefined, "own add undone");
    assert.equal(
      s.doc.getMap("graphs").get("peer-marker"),
      "x",
      "the peer's edit survives",
    );
  });

  it("undoing an add leaves a peer's later edit to that node alone", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    // The peer's edit rides in a remote-origin transaction that modifies
    // the node the local user added
    s.doc.transact(() => {
      const node = mainNode(s, "a");
      node.set("component", "peer/Edited");
    }, "remote-peer");
    intent(s, "undo", {});
    const node = mainNode(s, "a");
    assert.ok(node, "the node itself survives the undo");
    assert.equal(
      node.get("component"),
      "peer/Edited",
      "the peer's edit is preserved",
    );
  });

  it("consecutive same-command bursts merge into one undo step", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "b",
      componentName: "core/Repeat",
      metadata: { x: 50, y: 50 },
    });
    // One drag: both moves in the same burst
    intent(s, "moveNode", {
      graphId: "main",
      nodeId: "a",
      metadata: { x: 10, y: 10 },
    });
    intent(s, "moveNode", {
      graphId: "main",
      nodeId: "b",
      metadata: { x: 20, y: 20 },
    });
    const result = intent(s, "undo", {});
    // One undo reverts the whole drag: both nodes back at their add-time
    // positions — the two adds are a separate earlier step
    assert.equal(mainNode(s, "a").get("metadata").get("x"), 0);
    assert.equal(mainNode(s, "b").get("metadata").get("x"), 50);
    const echo = result.echoes.find(
      (/** @type {any} */ e) => e.kind === "undo",
    );
    assert.ok(echo.canUndo, "the adds remain undoable");
  });

  it("redo restores what undo popped; a new tracked op clears redo", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    intent(s, "undo", {});
    assert.equal(mainNode(s, "a"), undefined);
    const redo = intent(s, "redo", {});
    assert.ok(mainNode(s, "a"), "redo restores the node");
    assert.equal(
      redo.echoes.find((/** @type {any} */ e) => e.kind === "undo").canRedo,
      false,
      "redo stack exhausted",
    );
    intent(s, "undo", {});
    assert.equal(mainNode(s, "a"), undefined);
    // A fresh tracked operation clears the redo stack
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "b",
      componentName: "core/Repeat",
      metadata: { x: 50, y: 50 },
    });
    const after = intent(s, "redo", {});
    assert.equal(
      after.echoes.find((/** @type {any} */ e) => e.kind === "undo").canRedo,
      false,
      "redo was cleared by the new operation",
    );
    assert.equal(mainNode(s, "a"), undefined);
  });

  it("an empty stack is a valid no-op with an inert-chip echo", () => {
    const s = session();
    const result = intent(s, "undo", {});
    assert.equal(result.accepted, true);
    const echo = result.echoes.find(
      (/** @type {any} */ e) => e.kind === "undo",
    );
    assert.deepEqual(
      {
        u: echo.canUndo,
        r: echo.canRedo,
        ud: echo.undoDepth,
        rd: echo.redoDepth,
      },
      { u: false, r: false, ud: 0, rd: 0 },
    );
  });

  it("intents outside the milestone-1 scope never enter the stack", () => {
    const s = session();
    intent(s, "setComponentCode", {
      component: "core/Repeat",
      code: "// x",
    });
    intent(s, "setSignature", {
      component: "core/Repeat",
      signature: { description: "changed" },
    });
    const result = intent(s, "undo", {});
    const echo = result.echoes.find(
      (/** @type {any} */ e) => e.kind === "undo",
    );
    assert.equal(echo.canUndo, false, "nothing tracked");
  });

  it("the availability report tracks depth across steps", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    const afterOne = intent(s, "addNode", {
      graphId: "main",
      nodeId: "b",
      componentName: "core/Repeat",
      metadata: { x: 50, y: 50 },
    });
    assert.equal(
      afterOne.echoes.find((/** @type {any} */ e) => e.kind === "undo")
        .undoDepth,
      1,
      "the two adds merged into one step",
    );
    intent(s, "undo", {});
    intent(s, "undo", {});
    const afterUndo = intent(s, "moveNode", {
      graphId: "main",
      nodeId: "b",
      metadata: { x: 5, y: 5 },
    });
    // moveNode on a missing node is refused — nothing tracked, redo
    // cleared by... nothing: the refusal leaves the stacks alone
    assert.equal(afterUndo.accepted, false, "moving a missing node is refused");
    assert.equal(
      afterUndo.echoes.find((/** @type {any} */ e) => e.kind === "undo"),
      undefined,
    );
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "c",
      componentName: "core/Repeat",
      metadata: { x: 1, y: 1 },
    });
    const afterNew = intent(s, "redo", {});
    assert.equal(
      afterNew.echoes.find((/** @type {any} */ e) => e.kind === "undo").canRedo,
      false,
      "the new op cleared redo",
    );
  });

  it("makeSubgraph undoes as one step back to flat nodes", () => {
    const s = session();
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "a",
      componentName: "core/Repeat",
      metadata: { x: 0, y: 0 },
    });
    intent(s, "addNode", {
      graphId: "main",
      nodeId: "b",
      componentName: "core/Repeat",
      metadata: { x: 50, y: 50 },
    });
    intent(s, "makeSubgraph", { graphId: "main", nodeIds: ["a", "b"] });
    assert.ok(getGraph(s.doc, "main/a"), "subgraph created");
    intent(s, "undo", {});
    assert.equal(getGraph(s.doc, "main/a"), undefined, "subgraph undone");
    assert.ok(mainNode(s, "a"), "flat node back");
    assert.ok(mainNode(s, "b"), "flat node back");
  });

  it("persistence-style loads (null origin) never enter the stack", () => {
    const s = session();
    // A full-state load applies updates without an origin — the same path
    // persistence and full-state sync use
    const snapshot = new Y.Doc();
    createGraph(snapshot, "loaded", "loaded", null);
    Y.applyUpdate(s.doc, Y.encodeStateAsUpdate(snapshot));
    const result = intent(s, "undo", {});
    const echo = result.echoes.find(
      (/** @type {any} */ e) => e.kind === "undo",
    );
    assert.equal(echo.canUndo, false, "the load was not tracked");
    assert.ok(getGraph(s.doc, "loaded"), "the loaded graph stays");
  });
});
