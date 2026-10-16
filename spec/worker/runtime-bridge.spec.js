import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodeAnnounceAppData } from "@noflo/fbp-protocol";

import { createRuntimeBridge } from "../../src/worker/RuntimeBridge.js";

/**
 * The runtime bridge's Worker-side hosting (work document #59): the
 * population tracks the transport's announce stream, discovery echoes push
 * as announces arrive, and the connect/disconnect commands report through
 * the `runtime-connection` echo family. The tests inject the Reticulum
 * accessor, identity, and link establishment — the bridge owns no
 * transport of its own.
 */

/**
 * A mock transport: an EventTarget carrying the destination cache shape
 * the real transport exposes (`caches.knownDestinations`).
 *
 * @returns {{ transport: EventTarget & { caches: { knownDestinations: Map<string, any> } } }}
 */
function mockReticulum() {
  const transport = /** @type {any} */ (new EventTarget());
  transport.caches = { knownDestinations: new Map() };
  return { transport };
}

/**
 * The hex form of a 16-byte hash filled with one repeated byte.
 *
 * @param {number} fill
 * @returns {string}
 */
const hexOf = (fill) => fill.toString(16).padStart(2, "0").repeat(16);

/**
 * A mock runtime client: the event surface and execution client the
 * bridge wires, with a controllable mirror for the deploy path.
 *
 * @param {{ entities?: string[] }} [options]
 * @returns {any}
 */
function mockClient(options = {}) {
  const listeners = new Map();
  const sentOps = [];
  const client = {
    listeners,
    sentOps,
    clientId: null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type);
      if (list) list.splice(list.indexOf(listener), 1);
    },
    dispatch(type, detail) {
      for (const listener of listeners.get(type) ?? []) {
        listener({ detail });
      }
    },
    execution: {
      requestProcesses: async () => {},
      runControl: async () => {},
    },
    syncGraph: async () => ({
      upToDate: true,
      epochId: "epoch-1",
      graph: {
        node: (id) =>
          options.entities?.includes(id) ? { entity_id: id } : undefined,
        edge: () => undefined,
        iip: () => undefined,
        export: () => undefined,
        group: () => undefined,
      },
    }),
    sendGraphOp: async (op) => {
      // The real client stamps the op with the client's own id
      sentOps.push({ ...op, clientId: op.clientId ?? client.clientId });
    },
    close: async () => {},
  };
  return client;
}

/**
 * Announces a runtime through the transport, the way a validated announce
 * reaches the bridge.
 *
 * @param {any} transport
 * @param {number} fill The byte the 16-byte destination hash is filled with.
 * @param {string} nodeName
 */
function announce(transport, fill, nodeName) {
  transport.dispatchEvent(
    new CustomEvent("announce", {
      detail: {
        appData: encodeAnnounceAppData({
          destinationHash: new Uint8Array(16).fill(fill),
          nodeName,
        }),
      },
    }),
  );
}

describe("runtime bridge (work document #59)", () => {
  it("tracks the announce stream into the discovered population", () => {
    const { transport } = mockReticulum();
    /** @type {any[]} */
    const echoes = [];
    const bridge = createRuntimeBridge({
      getReticulum: () => ({ transport }),
      getIdentity: async () => null,
      postMessage: (echo) => echoes.push(echo),
    });
    bridge.attach();
    announce(transport, 0xaa, "runtime-one");
    const discovered = echoes.find(
      (echo) => echo.kind === "runtime-discovered",
    );
    assert.ok(discovered, "a new announce echoes");
    assert.deepEqual(discovered.runtimes, [
      {
        destinationHash: hexOf(0xaa),
        nodeName: "runtime-one",
        protocolVersion: 2,
        lastSeen: discovered.runtimes[0].lastSeen,
      },
    ]);
    // A repeated announce with unchanged facts is silent: the echo channel
    // does not carry the announce cadence
    const count = echoes.length;
    announce(transport, 0xaa, "runtime-one");
    assert.equal(echoes.length, count);
    // A non-FBP announce (broken app_data) is somebody else's peer
    transport.dispatchEvent(
      new CustomEvent("announce", { detail: { appData: new Uint8Array([1]) } }),
    );
    assert.equal(echoes.length, count);
  });

  it("re-attaches to a restarted mesh and sweeps the destination cache", () => {
    const first = mockReticulum();
    const second = mockReticulum();
    /** @type {any[]} */
    const echoes = [];
    let current = first;
    const bridge = createRuntimeBridge({
      getReticulum: () => current,
      getIdentity: async () => null,
      postMessage: (echo) => echoes.push(echo),
    });
    bridge.attach();
    // The mesh restarted: a new RNS instance carries the cached announce
    // from before this listener attached — the sweep picks it up
    current = second;
    second.transport.caches.knownDestinations.set(hexOf(0xbb), {
      appData: encodeAnnounceAppData({
        destinationHash: new Uint8Array(16).fill(0xbb),
        nodeName: "cached-runtime",
      }),
    });
    bridge.report();
    const discovered = echoes.find(
      (echo) => echo.kind === "runtime-discovered",
    );
    assert.ok(discovered);
    assert.equal(discovered.runtimes[0]?.nodeName, "cached-runtime");
  });

  it("reports a mesh-less connect as an error, never a crash", async () => {
    /** @type {any[]} */
    const echoes = [];
    const bridge = createRuntimeBridge({
      getReticulum: () => null,
      getIdentity: async () => null,
      postMessage: (echo) => echoes.push(echo),
    });
    await bridge.connect(hexOf(0xcc));
    const connection = echoes.find(
      (echo) => echo.kind === "runtime-connection",
    );
    assert.ok(connection);
    assert.equal(connection.state, "error");
    assert.match(connection.error, /mesh is not running/);
  });

  it("connects through the injected establishment and reports the mask", async () => {
    const { transport } = mockReticulum();
    /** @type {any[]} */
    const echoes = [];
    let connectCalls = 0;
    const bridge = createRuntimeBridge({
      getReticulum: () => ({ transport }),
      getIdentity: async () => ({ identityHash: "feed" }),
      postMessage: (echo) => echoes.push(echo),
      establishLink: async () => {
        connectCalls += 1;
        return {
          link: {},
          auth: { protocolVersion: 2, capabilityMask: 0b11 },
          client: mockClient(),
        };
      },
    });
    bridge.attach();
    announce(transport, 0xcc, "runtime-two");
    await bridge.connect(hexOf(0xcc));
    const connection = echoes.find(
      (echo) =>
        echo.kind === "runtime-connection" && echo.state === "connected",
    );
    assert.ok(connection, "the connected state echoes");
    assert.equal(connection.capabilityMask, 0b11);
    assert.deepEqual(connection.capabilities, ["graph.read", "graph.edit"]);
    assert.equal(connection.nodeName, "runtime-two");
    assert.equal(connectCalls, 1);
    // Reconnect is idempotent: the known state re-reports, no new link
    await bridge.connect(hexOf(0xcc));
    assert.equal(connectCalls, 1);
    await bridge.disconnect(hexOf(0xcc));
    const dropped = echoes.find(
      (echo) =>
        echo.kind === "runtime-connection" && echo.state === "disconnected",
    );
    assert.ok(dropped, "the disconnect echoes");
  });

  it("deploys the projected graph as ops and reports the outcome", async () => {
    const { transport } = mockReticulum();
    /** @type {any[]} */
    const echoes = [];
    const client = mockClient({ entities: ["a"] });
    const bridge = createRuntimeBridge({
      getReticulum: () => ({ transport }),
      getIdentity: async () => ({ identityHash: "feed" }),
      projectGraph: (graphId) =>
        graphId === "main"
          ? {
              nodes: [
                { id: "a", component: "core/Repeat", metadata: {} },
                { id: "b", component: "core/Repeat", metadata: {} },
              ],
              edges: [],
              initializers: [],
              inports: {},
              outports: {},
              groups: [],
            }
          : null,
      postMessage: (echo) => echoes.push(echo),
      establishLink: async () => ({
        link: {},
        auth: { protocolVersion: 2, capabilityMask: 0xff },
        client,
      }),
    });
    bridge.attach();
    announce(transport, 0xcc, "runtime-two");
    await bridge.connect(hexOf(0xcc));
    // The op-stream identity is the device's mesh identity hash
    assert.equal(client.clientId, "feed");
    await bridge.deploy(hexOf(0xcc), "main");
    // Entity "a" is already in the mirror: skipped, not re-sent
    assert.deepEqual(
      client.sentOps.map((op) => op.entityId),
      ["b"],
    );
    assert.equal(client.sentOps[0].clientId, "feed");
    const deployed = echoes.filter((echo) => echo.kind === "runtime-deploy");
    assert.deepEqual(
      deployed.map((echo) => echo.state),
      ["deploying", "deployed"],
    );
    assert.equal(deployed[1].ops, 1);
    assert.equal(deployed[1].skipped, 1);
    // An unknown graph reports the failure, never a crash
    await bridge.deploy(hexOf(0xcc), "nope");
    const failed = echoes.find(
      (echo) => echo.kind === "runtime-deploy" && echo.state === "error",
    );
    assert.match(failed.error, /unknown graph/);
  });

  it("runs the runtime's network and echoes run state", async () => {
    const { transport } = mockReticulum();
    /** @type {any[]} */
    const echoes = [];
    const client = mockClient();
    const bridge = createRuntimeBridge({
      getReticulum: () => ({ transport }),
      getIdentity: async () => ({ identityHash: "feed" }),
      projectGraph: () => null,
      postMessage: (echo) => echoes.push(echo),
      establishLink: async () => ({
        link: {},
        auth: { protocolVersion: 2, capabilityMask: 0xff },
        client,
      }),
    });
    bridge.attach();
    announce(transport, 0xcc, "runtime-two");
    await bridge.connect(hexOf(0xcc));
    await bridge.run(hexOf(0xcc), "start");
    let run = echoes.find((echo) => echo.kind === "runtime-run");
    assert.equal(run.state, "running");
    // The runtime's 0x40 echo supersedes the requested state
    client.dispatch("execution", { cmd: 0x40, action: 0x04 });
    run = echoes.filter((echo) => echo.kind === "runtime-run").pop();
    assert.equal(run.state, "running");
    assert.equal(run.requested, undefined);
    // Process listings ride the processlist event
    client.dispatch("processlist", {
      epochId: "epoch-2",
      entries: { a: { component: "core/Repeat", type: "component", state: 1 } },
    });
    const processes = echoes.find((echo) => echo.kind === "runtime-processes");
    assert.equal(processes.epochId, "epoch-2");
    assert.equal(processes.entries.a.component, "core/Repeat");
    await bridge.run(hexOf(0xcc), "stop");
    run = echoes.filter((echo) => echo.kind === "runtime-run").pop();
    assert.equal(run.state, "stopped");
  });
});
