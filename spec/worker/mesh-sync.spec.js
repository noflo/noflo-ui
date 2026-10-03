import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  createDefaultMeshConfig,
  createMemoryStorage,
  loadMeshConfig,
  normalizeMeshConfig,
  saveMeshConfig,
} from "../../src/crdt/MeshConfig.js";
import { createMeshSync } from "../../src/worker/MeshSync.js";

describe("mesh config (work document #21)", () => {
  it("normalizes partial and malformed blobs into defaults", () => {
    const config = normalizeMeshConfig({
      enabled: true,
      interfaces: [
        { id: "a", type: "websocket", url: "wss://rns.example", enabled: true },
        { id: "bad", type: "tcp" },
        {
          id: "legacy",
          type: "websocket",
          url: "wss://legacy",
          enabled: false,
        },
        { type: "websocket", url: "wss://x", enabled: true },
        null,
      ],
    });
    assert.equal(config.enabled, true);
    // Options-based normalization keeps any typed interface with an options
    // object; runtime validation happens when the interface attaches
    assert.equal(config.interfaces.length, 3, "typed interfaces kept");
    assert.deepEqual(config.interfaces[0].options, {
      url: "wss://rns.example",
    });
    assert.deepEqual(config.interfaces[1].options, {});
    assert.deepEqual(config.interfaces[2].options, { url: "wss://legacy" });
    assert.deepEqual(config.interfaces[0], {
      id: "a",
      type: "websocket",
      options: { url: "wss://rns.example" },
      enabled: true,
    });

    assert.equal(normalizeMeshConfig(null).enabled, false);

    // WebRTC transport upgrade section defaults to off, auto-connect on
    const withWebRTC = normalizeMeshConfig({ webrtc: { enabled: true } });
    assert.equal(withWebRTC.webrtc.enabled, true);
    assert.equal(withWebRTC.webrtc.autoConnect, true);
    assert.deepEqual(withWebRTC.webrtc.rtcConfig, {});
    assert.equal(normalizeMeshConfig({}).webrtc.enabled, false);
    assert.equal(normalizeMeshConfig({}).webrtc.autoConnect, true);
  });

  it("round-trips through storage", async () => {
    const storage = createMemoryStorage();
    const config = {
      ...createDefaultMeshConfig(),
      enabled: true,
      identity: "abc",
    };
    await saveMeshConfig(storage, config);
    const loaded = await loadMeshConfig(storage);
    assert.equal(loaded.enabled, true);
    assert.equal(loaded.identity, "abc");
  });

  it("falls back to defaults when storage fails", async () => {
    const storage = {
      get: async () => {
        throw new Error("db closed");
      },
      set: async () => {},
    };
    const config = await loadMeshConfig(storage);
    assert.equal(config.enabled, false);
  });
});

describe("mesh sync (work document #21)", () => {
  /** @type {Array<() => Promise<void>>} */
  const cleaners = [];
  afterEach(async () => {
    for (const clean of cleaners.reverse()) await clean();
    cleaners.length = 0;
  });

  it("stays idle until enabled", async () => {
    /** @type {any[]} */
    const messages = [];
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      createProvider: async () => {
        throw new Error("should not be called");
      },
    });
    assert.equal(mesh.config.enabled, false);
    assert.equal(messages.length, 0, "no status events while disabled");
  });

  it("generates and persists an identity on first enable", async () => {
    const storage = createMemoryStorage();
    /** @type {any[]} */
    const messages = [];
    const providerCalls = [];
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage,
      roomFor: () => "noflo-ui:test-project",
      createProvider: async (config, identity, doc, room) => {
        providerCalls.push({ room, identity, doc });
        return {
          on: () => {},
          destroy: async () => {},
        };
      },
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });
    assert.equal(providerCalls.length, 1, "provider created after enabling");
    assert.ok(providerCalls[0].identity, "identity passed to provider");
    const persisted = await loadMeshConfig(storage);
    assert.ok(persisted.identity.length > 0, "identity persisted");
    // The full config echo (identity, room, schemas) is the Engine's job
    // after reconfiguration; MeshSync itself stays silent
    assert.equal(messages.filter((m) => m.kind === "mesh-config").length, 0);
    assert.equal(
      providerCalls[0].room,
      "noflo-ui:test-project",
      "room derived per project",
    );
  });

  it("reports status and peer events from the provider", async () => {
    /** @type {any[]} */
    const messages = [];
    /** @type {Map<string, (event: any) => void>} */
    const listeners = new Map();
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      createProvider: async () => ({
        on: (name, handler) => listeners.set(name, handler),
        destroy: async () => {},
      }),
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });
    listeners.get("status")?.({ connected: true });
    listeners.get("peers")?.({ added: ["peer-a", "peer-b"], removed: [] });
    listeners.get("peers")?.({ added: [], removed: ["peer-b"] });
    listeners.get("synced")?.({ synced: true });

    const statuses = messages.filter((m) => m.kind === "mesh-status");
    assert.deepEqual(
      statuses.map((m) => `${m.connected}/${m.synced}/${m.peers}`),
      ["true/false/0", "true/true/1"],
    );
    const peerEvents = messages.filter((m) => m.kind === "mesh-peers");
    assert.deepEqual(
      peerEvents.map((m) => m.peers),
      [2, 1],
    );
    assert.deepEqual(peerEvents[0].added, ["peer-a", "peer-b"]);
  });

  it("restarts the provider when configuration changes", async () => {
    const storage = createMemoryStorage();
    /** @type {any[]} */
    const messages = [];
    let built = 0;
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage,
      createProvider: async () => {
        built++;
        return { on: () => {}, destroy: async () => {} };
      },
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });
    await mesh.handleConfigure({
      ...createDefaultMeshConfig(),
      enabled: true,
    });
    assert.equal(built, 2, "provider rebuilt on reconfiguration");
    const persisted = await loadMeshConfig(storage);
    assert.equal(persisted.enabled, true, "configuration persisted");
  });

  it("survives a failing provider factory", async () => {
    /** @type {any[]} */
    const messages = [];
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      createProvider: async () => {
        throw new Error("no interfaces");
      },
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });
    const failure = messages.find(
      (m) => m.kind === "mesh-status" && m.error !== undefined,
    );
    assert.ok(failure, "failure surfaced as status with error");
    assert.match(failure.error, /no interfaces/);
  });
});

describe("mesh sync convergence over a TCP loopback (work document #21)", () => {
  /** @type {Array<() => Promise<void>>} */
  const cleaners = [];
  afterEach(async () => {
    for (const clean of cleaners.reverse()) await clean();
    cleaners.length = 0;
  });

  it("converges two provider-bound docs through the mesh transport", async () => {
    const loopback = await import("./loopback-peer.js");
    const { rnsA, rnsB, close } = await loopback.makeLoopback();
    cleaners.push(close);

    const core = await import("../../vendor/reticulum-core.js");
    const { Identity } = core;
    const { ReticulumProvider } = await import("../../vendor/y-reticulum.js");
    const Y = await import("../../vendor/yjs.js");

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    /** @type {any[]} */
    const statusB = [];
    const identityA = await Identity.generate();
    const identityB = await Identity.generate();

    const providerA = new ReticulumProvider("noflo-test-room", docA, {
      reticulum: rnsA,
      identity: identityA,
    });
    const providerB = new ReticulumProvider("noflo-test-room", docB, {
      reticulum: rnsB,
      identity: identityB,
    });
    providerB.on("synced", (/** @type {any} */ event) => {
      statusB.push(event.synced);
    });
    await providerA.connect();
    await providerB.connect();
    cleaners.push(async () => {
      await providerA.destroy().catch(() => {});
      await providerB.destroy().catch(() => {});
    });

    // Write on A, wait for convergence on B
    const graphA = docA.getMap("graphs");
    const graph = new (docA.getMap("graphs").constructor)();
    // @ts-expect-error Yjs internals
    graph.set("metadata", "main");
    graphA.set("main", graph);

    const deadline = Date.now() + 10_000;
    while (
      Date.now() < deadline &&
      docB.getMap("graphs").get("main") === undefined
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(
      docB.getMap("graphs").get("main") !== undefined,
      "document state converged across the mesh",
    );

    // Incremental updates keep converging
    docA.getMap("graphs").get("main").set("extra", "value");
    const deadline2 = Date.now() + 10_000;
    while (
      Date.now() < deadline2 &&
      docB.getMap("graphs").get("main")?.get("extra") !== "value"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(
      docB.getMap("graphs").get("main")?.get("extra"),
      "value",
      "incremental updates propagate",
    );
  }, 30000);
});

describe("awareness (work document #21)", () => {
  /**
   * Builds a y-protocols-like awareness stub with a controllable clientID.
   *
   * @returns {any}
   */
  function makeAwareness() {
    return {
      clientID: 1,
      /** @type {Map<number, any>} */
      states: new Map(),
      /** @type {Array<(changes: any) => void>} */
      observers: [],
      observe(handler) {
        this.observers.push(handler);
      },
      unobserve(handler) {
        this.observers = this.observers.filter((h) => h !== handler);
      },
      setLocalStateField(field, value) {
        this.states.set(this.clientID, {
          ...(this.states.get(this.clientID) ?? {}),
          [field]: value,
        });
        for (const handler of this.observers) {
          handler({ added: [], updated: [this.clientID], removed: [] });
        }
      },
      getStates() {
        return this.states;
      },
    };
  }

  it("throttles local drag states with a trailing flush", async () => {
    /** @type {any[]} */
    const messages = [];
    const awareness = makeAwareness();
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      awarenessThrottleMs: 50,
      createProvider: async () => ({
        awareness,
        on: () => {},
        destroy: async () => {},
      }),
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });

    // Burst of updates within the throttle window
    mesh.handleAwareness({ graphId: "main", nodeId: "A", x: 1, y: 1 });
    mesh.handleAwareness({ graphId: "main", nodeId: "A", x: 2, y: 2 });
    mesh.handleAwareness({ graphId: "main", nodeId: "A", x: 3, y: 3 });
    // First passes immediately, trailing one scheduled; none dropped entirely
    assert.equal(awareness.states.get(1).dragging.x, 1);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(awareness.states.get(1).dragging.x, 3, "trailing flush");

    // Stops pass through immediately and cancel the pending flush
    mesh.handleAwareness({ graphId: "main", nodeId: "A", x: 4, y: 4 });
    mesh.handleAwareness({ graphId: "main", nodeId: null });
    assert.equal(awareness.states.get(1).dragging, null);
  });

  it("forwards remote awareness states, not the local one", async () => {
    /** @type {any[]} */
    const messages = [];
    const awareness = makeAwareness();
    let updateHandler = null;
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      createProvider: async () => ({
        awareness,
        on: () => {},
        destroy: async () => {},
      }),
    });
    await mesh.handleConfigure({ ...createDefaultMeshConfig(), enabled: true });
    updateHandler = awareness.observers[0];
    assert.ok(updateHandler, "observing provider awareness");

    // A remote peer drags a node
    awareness.states.set(42, {
      dragging: { graphId: "main", nodeId: "A", x: 5, y: 6 },
    });
    updateHandler({ added: [42], updated: [], removed: [] });
    const forwarded = messages.find((m) => m.kind === "awareness");
    assert.deepEqual(forwarded.states, [
      { peerId: "42", graphId: "main", nodeId: "A", x: 5, y: 6 },
    ]);

    // The local client's own state is not echoed back
    awareness.states.set(1, {
      dragging: { graphId: "main", nodeId: "B", x: 0, y: 0 },
    });
    updateHandler({ added: [], updated: [1], removed: [] });
    assert.equal(
      messages.filter((m) => m.kind === "awareness").length,
      1,
      "own state not forwarded",
    );

    // A peer dropping off clears its ghost
    updateHandler({ added: [], updated: [], removed: [42] });
    const clear = messages.filter((m) => m.kind === "awareness").pop();
    assert.deepEqual(clear.states, [{ peerId: "42", dragging: null }]);
  });

  it("drops awareness silently when no provider is bound", async () => {
    const awareness = makeAwareness();
    const mesh = await createMeshSync({
      doc: /** @type {any} */ ({}),
      postMessage: () => {},
      storage: createMemoryStorage(),
      createProvider: async () => ({
        awareness,
        on: () => {},
        destroy: async () => {},
      }),
    });
    // Not enabled: no provider, no awareness — must not throw
    mesh.handleAwareness({ graphId: "main", nodeId: "A", x: 1, y: 1 });
    mesh.handleAwareness({ graphId: "main", nodeId: null });
  });
});
