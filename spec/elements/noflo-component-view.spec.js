import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { yJedison } from "y-jedison";
import {
  REGISTRY_MAP,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import { buildSignatureSchema } from "../../src/library/schema.js";
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
    const mirror = new Y.Doc();
    setComponentSignature(mirror, "fs/Count", {
      inports: [{ name: "in", type: "all" }],
      outports: [{ name: "out", type: "all" }],
    });
    const view = await openedView(mirror, "fs/Count");
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
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(
      editor.getValue().inports[0]?.name,
      "renamed-in",
      "the fresh entry reconciled into the form",
    );
    // And the rebinding writes keep landing: an edit reaches the new entry
    editor.setValue({
      inports: [{ name: "renamed-in", type: "all" }],
      outports: [
        { name: "out", type: "all" },
        { name: "added", type: "all" },
      ],
    });
    editor.emit("change", undefined);
    assert.equal(
      mirror.getMap(REGISTRY_MAP).get("fs/Count").get("outports").length,
      2,
      "the rebinding's write landed on the fresh entry",
    );

    view.close();
    view.remove();
  });
});
