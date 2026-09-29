import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectGraph } from "../../src/glass/projectView.js";

import { startEngine } from "../../src/worker/engine.js";
import * as Y from "../../vendor/yjs.js";

describe("engine mirror (the Glass's live update path)", () => {
  it("streams y-updates so the Glass replica converges after intents", async () => {
    /** @type {any[]} */
    const posted = [];
    /** @type {Array<(event: { data: any }) => void>} */
    const handlers = [];
    const engine = await startEngine({
      postMessage: (/** @type {any} */ message) => posted.push(message),
      registerMessageHandler: (/** @type {any} */ handler) =>
        handlers.push(handler),
    });

    // Wire the Glass side exactly like app.js does: full state first (y-sync
    // establishes clock contiguity), then incrementals
    const mirror = new Y.Doc();
    const applyPostedUpdates = () => {
      for (const message of posted) {
        if (message.kind === "y-sync") {
          Y.applyUpdate(mirror, message.update);
        } else if (message.kind === "y-update") {
          Y.applyUpdate(mirror, message.update);
        }
      }
    };
    applyPostedUpdates(); // catch the pre-connect persisted state
    assert.ok(
      posted.some((message) => message.kind === "y-sync"),
      "engine sends full state for the replica",
    );

    // Send an addNode intent like the Glass would: supervisor.send posts the
    // raw message; the worker unwraps event.data before it reaches the engine
    assert.ok(handlers.length > 0, "message handler registered");
    handlers[0]({
      type: "INTENT",
      command: "addNode",
      payload: {
        graphId: "main",
        nodeId: "Read",
        componentName: "fs/ReadFile",
        metadata: { x: 10, y: 20 },
      },
    });

    // The dispatcher network is asynchronous; pump the event loop
    await new Promise((resolve) => setTimeout(resolve, 100));
    applyPostedUpdates();

    const view = projectGraph(mirror, "main");
    assert.ok(view, "mirror has the graph");
    assert.ok(view.processes.Read, "the node appears in the Glass replica");
    assert.equal(view.processes.Read.component, "fs/ReadFile");

    engine.stop();
  }, 5000);
});
