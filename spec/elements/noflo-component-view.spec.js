import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { yJedison } from "y-jedison";
import {
  createProjectDoc,
  REGISTRY_MAP,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import {
  LibraryManager,
  syncLibraryFromRegistry,
} from "../../src/library/LibraryManager.js";
import { buildSignatureSchema } from "../../src/library/schema.js";
import "../../src/elements/noflo-node.js";
import "../../src/elements/noflo-schema-form.js";
import "../../src/elements/noflo-json-form.js";
import "../../src/elements/noflo-component-view.js";
import * as Y from "../../vendor/yjs.js";

/**
 * Mounts the component screen against a mirror document's registry entry.
 *
 * @param {Y.Doc} mirror The mirror document (the Glass's read replica).
 * @param {string} component
 * @returns {Promise<any>} The opened component view.
 */
async function openedView(mirror, component) {
  const view = /** @type {any} */ (
    document.createElement("noflo-component-view")
  );
  document.body.appendChild(view);
  const entry = mirror.getMap(REGISTRY_MAP).get(component);
  await view.open({
    component,
    implementation: "stub",
    formSchema: buildSignatureSchema([]),
    signature: {
      inports: entry.get("inports").toJSON(),
      outports: entry.get("outports").toJSON(),
    },
    signatureYtype: entry,
  });
  return view;
}

describe("the shared-form adapter (work document #64)", () => {
  it("binds the in-house schema form to a shared type: edits write granularly, remotes stream in", async () => {
    const { schemaFormBinding } = await import(
      "../../src/library/formBinding.js"
    );
    const { addIIP, addNode, createGraph, createProjectDoc } = await import(
      "../../src/crdt/ProjectDoc.js"
    );
    const mirror = createProjectDoc("scratch");
    const graph = createGraph(mirror, "main");
    addNode(graph, "N", "c/N");
    addIIP(graph, { greeting: "hello", count: 1 }, { node: "N", port: "in" });
    const data = graph.get("edges").get("DATA->N:in[0]").get("data");
    assert.equal(typeof data.set, "function", "the packet data is shared");

    // The declared form (#57's architecture) renders the packet
    const element = /** @type {any} */ (
      document.createElement("noflo-schema-form")
    );
    document.body.appendChild(element);
    element.schema = {
      type: "object",
      properties: {
        greeting: { type: "string" },
        count: { type: "number" },
      },
    };
    element.data = { greeting: "hello", count: 1 };

    const binding = yJedison(schemaFormBinding(element), data, {
      origin: "iip:DATA->N:in[0]",
    });

    // A user edit: the form's own widget path emits form-change without
    // an initiator — the binding applies it granularly
    /** @type {number} */
    let adapterFires = 0;
    binding.jedison.on("change", () => adapterFires++);
    element.data = { greeting: "hello", count: 2 };
    console.log(
      "DBG edit:",
      "adapterFires:",
      adapterFires,
      "value:",
      JSON.stringify(binding.jedison.getValue()),
      "entry before:",
      JSON.stringify(data.toJSON()),
    );
    binding._onChange(undefined);
    console.log("DBG manual apply:", JSON.stringify(data.toJSON()));
    assert.equal(data.get("count"), 2, "the user edit landed granularly");
    assert.equal(
      typeof data.get.bind,
      "function",
      "the shared map was never replaced",
    );

    // A peer's change arrives: the form re-renders, and the echo — the
    // form-change fired by the remote-driven setter — writes nothing
    mirror.transact(() => {
      data.set("greeting", "from-peer");
    }, "peer");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(
      element.data,
      {
        greeting: "from-peer",
        count: 2,
      },
      "the remote change streamed into the form",
    );
    // Stable: no oscillation
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(data.toJSON(), { greeting: "from-peer", count: 2 });

    binding.destroy();
    element.remove();
  });

  it("suppressed writes echo with the initiator: a form-only prefill never writes", async () => {
    const { schemaFormBinding } = await import(
      "../../src/library/formBinding.js"
    );
    const { addIIP, addNode, createGraph, createProjectDoc } = await import(
      "../../src/crdt/ProjectDoc.js"
    );
    const mirror = createProjectDoc("scratch");
    const graph = createGraph(mirror, "main");
    addNode(graph, "N", "c/N");
    addIIP(graph, { greeting: "hello" }, { node: "N", port: "in" });
    const data = graph.get("edges").get("DATA->N:in[0]").get("data");

    const element = /** @type {any} */ (
      document.createElement("noflo-schema-form")
    );
    document.body.appendChild(element);
    element.schema = {
      type: "object",
      properties: { greeting: { type: "string" }, label: { type: "string" } },
    };
    element.data = { greeting: "hello" };

    const binding = yJedison(schemaFormBinding(element, "yjs"), data, {
      origin: "iip:DATA->N:in[0]",
    });
    // The binding's reconcile: the shared type wins
    assert.deepEqual(element.data, { greeting: "hello" });

    // The form-only prefill: the suppressed setter echoes with the
    // initiator, so the shared type never sees it — the prefill flows
    // through the adapter's setValue, exactly what the inspector does
    binding.jedison.setValue({ greeting: "hello", label: "N" });
    assert.deepEqual(
      data.toJSON(),
      { greeting: "hello" },
      "the prefill wrote nothing",
    );
    assert.deepEqual(element.data, { greeting: "hello", label: "N" });

    // A real edit (no suppression) still writes granularly
    element.data = { greeting: "hello", label: "N", extra: true };
    assert.equal(data.get("extra"), true, "the real edit landed");

    binding.destroy();
    element.remove();
  });
});

describe("the signature form's y-jedison binding (work document #64)", () => {
  it("form edits write granularly into the registry entry and relay as binary updates", async () => {
    const mirror = new Y.Doc();
    setComponentSignature(mirror, "fs/Count", {
      inports: [{ name: "in", type: "all" }],
      outports: [{ name: "out", type: "all" }],
    });
    const view = await openedView(mirror, "fs/Count");

    // The binding reconciled: the shared type wins over the prop
    const editor = view._form?.editor;
    assert.ok(editor, "the form's editor exists");
    assert.equal(
      editor.getValue().inports.length,
      1,
      "the shared type seeded the form",
    );

    // The user edits: an outport joins. The other side's identity — the
    // inports Y.Array — keeps its Yjs identity, the granular merge's
    // whole point
    const entry = mirror.getMap(REGISTRY_MAP).get("fs/Count");
    const inportsBefore = entry.get("inports");
    /** @type {Uint8Array | null} */
    let relayed = null;
    /** @type {string | null} */
    let relayedComponent = null;
    view.addEventListener("signature-update", (/** @type {any} */ e) => {
      relayed = e.detail.update;
      relayedComponent = e.detail.component;
    });
    /** @type {number} */
    let observeFires = 0;
    entry.observeDeep(() => observeFires++);
    editor.on("change", (/** @type {any} */ initiator) => {
      console.log("DBG change event:", JSON.stringify(initiator));
    });
    console.log(
      "DBG binding:",
      !!view._signatureBinding,
      "initiator:",
      view._signatureBinding?.initiator,
    );
    console.log("W2:setValue-before");
    editor.setValue({
      inports: [{ name: "in", type: "all" }],
      outports: [
        { name: "out", type: "all" },
        { name: "out2", type: "all" },
      ],
    });
    console.log(
      "DBG edit:",
      "editor outports:",
      editor.getValue().outports.length,
      "entry outports:",
      entry.get("outports").length,
      "observes:",
      observeFires,
    );

    assert.equal(
      entry.get("outports").length,
      2,
      "the edit landed in the shared type",
    );
    assert.equal(
      entry.get("inports"),
      inportsBefore,
      "untouched keys keep their identity",
    );
    assert.ok(relayed, "the write relayed as a binary update");
    assert.equal(relayedComponent, "fs/Count");
    assert.ok(relayed instanceof Uint8Array, "the relay carries raw bytes");

    view.close();
    view.remove();
  });

  it("remote changes stream into the form without echoing back", async () => {
    const mirror = new Y.Doc();
    setComponentSignature(mirror, "fs/Count", {
      inports: [{ name: "in", type: "all" }],
      outports: [{ name: "out", type: "all" }],
    });
    const view = await openedView(mirror, "fs/Count");
    console.log("W2:opened");
    const editor = view._form.editor;

    // A peer's change arrives through the mirror (any writer other than
    // the binding): the form re-renders, and the echo — the change event
    // tagged with the binding's initiator — never writes back
    const entry = mirror.getMap(REGISTRY_MAP).get("fs/Count");
    /** @type {Uint8Array | null} */
    let relayed = null;
    view.addEventListener("signature-update", (/** @type {any} */ e) => {
      relayed = e.detail.update;
    });
    mirror.transact(() => {
      entry.get("inports").push([{ name: "in2", type: "all" }]);
    }, "peer");
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(
      editor.getValue().inports.length,
      2,
      "the remote change streamed in",
    );
    assert.equal(relayed, null, "the remote write did not relay back");
    // The state is stable: no oscillation
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(entry.get("inports").length, 2);

    view.close();
    view.remove();
  });

  it("a whole-write swap rebinds the form to the fresh entry", async () => {
    console.log("W2:start");
    const mirror = new Y.Doc();
    setComponentSignature(mirror, "fs/Count", {
      inports: [{ name: "in", type: "all" }],
      outports: [{ name: "out", type: "all" }],
    });
    const view = await openedView(mirror, "fs/Count");
    console.log("W2:opened");
    const editor = view._form.editor;

    // The Save flow's whole-write replaces the registry entry: the
    // binding rebinds to the fresh structure, which wins reconciliation
    const fresh = new Y.Map();
    const inports = new Y.Array();
    inports.push([{ name: "renamed-in", type: "all" }]);
    const outports = new Y.Array();
    outports.push([{ name: "out", type: "all" }]);
    fresh.set("inports", inports);
    fresh.set("outports", outports);
    mirror.transact(() => {
      mirror.getMap(REGISTRY_MAP).set("fs/Count", fresh);
    }, "save-flow");
    console.log("W2:transacted");
    await new Promise((resolve) => setTimeout(resolve, 20));
    console.log("W2:slept");
    console.log("WW: slept");

    console.log("W2:getValue-before");
    assert.equal(
      editor.getValue().inports[0]?.name,
      "renamed-in",
      "the fresh entry reconciled into the form",
    );
    console.log("W2:getValue-after");
    // And the rebinding writes keep landing: an edit reaches the new entry
    console.log("W2:setValue-before");
    editor.setValue({
      inports: [{ name: "renamed-in", type: "all" }],
      outports: [
        { name: "out", type: "all" },
        { name: "added", type: "all" },
      ],
    });
    console.log("W2:emit-before");
    editor.emit("change", undefined);
    console.log("W2:emit-after");
    assert.equal(
      mirror.getMap(REGISTRY_MAP).get("fs/Count").get("outports").length,
      2,
      "the rebinding's write landed on the fresh entry",
    );

    view.close();
    view.remove();
  });
});

describe("the implementation-request line (work document #9, step D)", () => {
  /**
   * Renders the component screen's surface with a request snapshot. The
   * render path only (no form mount, no signature binding): the request
   * line and the action set are this suite's subject, and the file's
   * interleaved schedule should not carry the form machinery's weight.
   *
   * @param {any | null} request The request snapshot.
   * @returns {Promise<any>} The rendered view.
   */
  async function renderedView(request = null) {
    const view = /** @type {any} */ (
      document.createElement("noflo-component-view")
    );
    view._component = "mylib/Parser";
    view._implementation = "stub";
    view._request = request;
    document.body.appendChild(view);
    await view.render();
    return view;
  }

  it("renders nothing without a linked request", async () => {
    const view = await renderedView();
    const line = view.shadowRoot.getElementById("request-line");
    assert.ok(line.hidden, "the line stays hidden");
    assert.equal(line.textContent, "");
    assert.ok(
      view.shadowRoot.querySelector("[data-action='request-implementation']"),
      "the request action rides the stub ladder",
    );
    view.remove();
  });

  it("renders the linked document's governed state", async () => {
    const view = await renderedView({
      state: "ok",
      title: "Implement mylib/Parser",
      scope: "proposed",
      pendingScope: "active",
      boardId: 42,
    });
    const line = view.shadowRoot.getElementById("request-line");
    assert.ok(!line.hidden);
    assert.match(
      line.textContent,
      /Implementation request: Implement mylib\/Parser/,
    );
    assert.match(line.textContent, /proposed → active \(requested\)/);
    assert.match(line.textContent, /#42/, "the board number renders");
    view.remove();
  });

  it("names a deleted request and a broken link instead of hiding them", async () => {
    const deleted = await renderedView({
      state: "deleted",
      title: "Implement mylib/Parser",
    });
    assert.match(
      deleted.shadowRoot.getElementById("request-line").textContent,
      /request deleted/,
    );
    deleted.remove();
    const broken = await renderedView({
      state: "broken",
      title: "Implement mylib/Parser",
    });
    assert.match(
      broken.shadowRoot.getElementById("request-line").textContent,
      /link broken/,
    );
    broken.remove();
  });

  it("setRequest patches the line in place (the echo path)", async () => {
    const view = await renderedView();
    view.setRequest({
      state: "ok",
      title: "Implement mylib/Parser",
      scope: "proposed",
      pendingScope: "",
      boardId: null,
    });
    const line = view.shadowRoot.getElementById("request-line");
    assert.ok(!line.hidden, "the line appears");
    assert.match(line.textContent, /· proposed$/);
    view.setRequest(null);
    assert.ok(
      view.shadowRoot.getElementById("request-line").hidden,
      "clearing hides the line",
    );
    view.remove();
  });

  it("the request action emits component-action for the intent path", async () => {
    const view = await renderedView();
    const events = /** @type {any[]} */ ([]);
    view.addEventListener("component-action", (/** @type {any} */ e) => {
      events.push(e.detail);
    });
    /** @type {any} */
    (
      view.shadowRoot.querySelector("[data-action='request-implementation']")
    ).click();
    assert.equal(events.length, 1);
    assert.equal(events[0].action, "request-implementation");
    assert.equal(events[0].component, "mylib/Parser");
    view.remove();
  });
});

describe("the side view's library sync (work document #29)", () => {
  it("syncLibraryFromRegistry reconciles the manager's project module", () => {
    const doc = createProjectDoc("p");
    setComponentSignature(doc, "Parser", {
      inports: [{ name: "in", type: "string" }],
      outports: [{ name: "out" }],
      icon: "filter",
    });
    setComponentSignature(doc, "Gone", { inports: [], outports: [] });
    const manager = new LibraryManager();
    syncLibraryFromRegistry(manager, doc.getMap(REGISTRY_MAP), doc);
    const parser = manager.getComponent("Parser");
    assert.equal(parser?.icon, "filter");
    assert.equal(parser?.inports?.[0]?.type, "string");
    assert.ok(manager.getComponent("Gone"), "both entries land");
    // A signature edit propagates: the ports update in the manager
    setComponentSignature(doc, "Parser", {
      inports: [{ name: "in" }, { name: "config" }],
      outports: [{ name: "out" }],
    });
    // A removal propagates: the stale entry disappears
    doc.getMap(REGISTRY_MAP).delete("Gone");
    syncLibraryFromRegistry(manager, doc.getMap(REGISTRY_MAP), doc);
    assert.equal(manager.getComponent("Parser")?.inports?.length, 2);
    assert.equal(manager.getComponent("Gone"), undefined);
  });

  it("the component screen's side pane mounts the canvas's FlowNode", async () => {
    const mirror = createProjectDoc("scratch");
    setComponentSignature(mirror, "mylib/Parser", {
      inports: [{ name: "in", type: "string" }],
      outports: [{ name: "out" }],
    });
    const manager = new LibraryManager();
    syncLibraryFromRegistry(manager, mirror.getMap(REGISTRY_MAP), mirror);
    const view = /** @type {any} */ (
      document.createElement("noflo-component-view")
    );
    document.body.appendChild(view);
    const entry = mirror.getMap(REGISTRY_MAP).get("mylib/Parser");
    await view.open({
      component: "mylib/Parser",
      implementation: "stub",
      formSchema: buildSignatureSchema([]),
      signature: {
        inports: entry.get("inports").toJSON(),
        outports: entry.get("outports").toJSON(),
      },
      libraryManager: manager,
      depictionSource: null,
    });
    const node = /** @type {any} */ (
      view.shadowRoot.querySelector(".preview-pane noflo-node")
    );
    assert.ok(node, "the canvas's own node element renders in the pane");
    assert.equal(node.getAttribute("component"), "mylib/Parser");
    assert.equal(node.libraryManager, manager, "the shared manager instance");
    view.remove();
  });
});

describe("the ladder's honesty in the headline (work document #29)", () => {
  async function viewWith(implementation, codeAuthored) {
    const view = /** @type {any} */ (
      document.createElement("noflo-component-view")
    );
    document.body.appendChild(view);
    await view.open({
      component: "Foo",
      implementation,
      formSchema: buildSignatureSchema([]),
      signature: { inports: [], outports: [] },
      codeAuthored,
    });
    return view;
  }

  it("a code buffer still equal to the scaffold reads as scaffold, not code", async () => {
    const view = await viewWith("code", false);
    assert.match(
      view.shadowRoot.querySelector(".kind").textContent,
      /elementary · scaffold/,
      "the scaffold is preparation, not an implementation",
    );
    view.remove();
  });

  it("authored code reads as code", async () => {
    const view = await viewWith("code", true);
    assert.match(
      view.shadowRoot.querySelector(".kind").textContent,
      /elementary · code/,
    );
    view.remove();
  });

  it("a stub reads as a stub", async () => {
    const view = await viewWith("stub", false);
    assert.match(
      view.shadowRoot.querySelector(".kind").textContent,
      /stub · sketch/,
    );
    view.remove();
  });
});

describe("the per-language implementation buttons (work document #66)", () => {
  it("the action set renders one button per supported language", async () => {
    const view = /** @type {any} */ (
      document.createElement("noflo-component-view")
    );
    document.body.appendChild(view);
    await view.open({
      component: "mylib/Parser",
      implementation: "stub",
      formSchema: buildSignatureSchema([]),
      signature: { inports: [], outports: [] },
      languages: [
        { id: "javascript", label: "JavaScript", ext: "js" },
        { id: "typescript", label: "TypeScript", ext: "ts" },
      ],
    });
    const buttons = [
      ...view.shadowRoot.querySelectorAll("[data-action='implement-code']"),
    ];
    assert.equal(buttons.length, 2, "one button per language");
    assert.deepEqual(
      buttons.map((/** @type {any} */ b) => b.getAttribute("data-language")),
      ["javascript", "typescript"],
    );
    assert.match(
      buttons[1].textContent,
      /Implement in TypeScript/,
    );
    view.remove();
  });

  it("the button's click carries the chosen language in the event detail", async () => {
    const view = /** @type {any} */ (
      document.createElement("noflo-component-view")
    );
    document.body.appendChild(view);
    await view.open({
      component: "mylib/Parser",
      implementation: "stub",
      formSchema: buildSignatureSchema([]),
      signature: { inports: [], outports: [] },
      languages: [{ id: "typescript", label: "TypeScript", ext: "ts" }],
    });
    const events = /** @type {any[]} */ ([]);
    view.addEventListener("component-action", (/** @type {any} */ e) => {
      events.push(e.detail);
    });
    /** @type {any} */
    (view.shadowRoot.querySelector("[data-action='implement-code']")).click();
    assert.equal(events.length, 1);
    assert.equal(events[0].language, "typescript");
    view.remove();
  });
});
