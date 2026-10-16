import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEchoHandlers, echoKey } from "../../src/glass/echo-handlers.js";
import { progressPhrase } from "../../src/glass/progressPhrases.js";

/**
 * A deps recorder: every echo handler's side effect lands here, so the
 * harness asserts what each Engine → Glass message family actually does
 * (work document #56 proposal 6: the echo table was the map's cheapest
 * blind spot — 5.6% function coverage).
 *
 * @returns {any}
 */
function makeDeps() {
  /** @type {Record<string, any[]>} */
  const calls = {};
  const record =
    (/** @type {string} */ name) =>
    (...args) => {
      if (!calls[name]) calls[name] = [];
      calls[name].push(args);
    };
  return {
    calls,
    /** The current narration, mutated by setNarration — the progress
     * handler's done-branch reads it back. */
    narration: null,
    getNarration() {
      return this.narration;
    },
    setNarration(/** @type {any} */ narration) {
      if (!calls.setNarration) calls.setNarration = [];
      calls.setNarration.push([narration]);
      this.narration = narration;
    },
    refreshSyncPanel: record("refreshSyncPanel"),
    refreshMeshSettings: record("refreshMeshSettings"),
    applyMirrorUpdate: record("applyMirrorUpdate"),
    showPeerGhosts: record("showPeerGhosts"),
    ingestMeshConfig: record("ingestMeshConfig"),
    setMeshInvite: record("setMeshInvite"),
    updatePeerReachability: record("updatePeerReachability"),
    updateMeshPeers: record("updateMeshPeers"),
    setJoinRequests: record("setJoinRequests"),
    reloadIntoFreshBoot: record("reloadIntoFreshBoot"),
    setDacarState: record("setDacarState"),
    ingestMeshStatus: record("ingestMeshStatus"),
  };
}
/**
 * @param {any} deps
 * @param {string} name
 * @returns {number}
 */
function callCount(deps, name) {
  return deps.calls[name]?.length ?? 0;
}

describe("echo handlers (work document #37 contract, #56 harness)", () => {
  it("keys kind-style and protocol echoes distinctly", () => {
    assert.equal(echoKey({ kind: "y-update" }), "kind:y-update");
    assert.equal(
      echoKey({ protocol: "graph", command: "addnode" }),
      "graph/addnode",
    );
    assert.equal(echoKey({}), "");
    assert.equal(echoKey({ kind: 5 }), "");
  });

  it("narrates running and failed operations, clears on done", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    const running = {
      kind: "progress",
      state: "running",
      operation: "op-1",
      stage: "connect",
    };
    handlers["kind:progress"](running);
    assert.deepEqual(deps.calls.setNarration.at(-1), [
      {
        phrase: progressPhrase(running),
        operation: "op-1",
        stage: "connect",
      },
    ]);
    const failed = { ...running, state: "failed" };
    handlers["kind:progress"](failed);
    assert.deepEqual(deps.calls.setNarration.at(-1), [
      {
        phrase: progressPhrase(failed),
        operation: "op-1",
        stage: "connect",
        failed: true,
      },
    ]);
    // A done for the running operation clears the narration: getNarration
    // returns the operation the handler should compare against
    deps.calls.getNarration = [[{ operation: "op-1" }]];
    handlers["kind:progress"]({ ...running, state: "done" });
    assert.deepEqual(deps.calls.setNarration.at(-1), [null]);
    assert.ok(callCount(deps, "refreshSyncPanel") >= 3);
  });

  it("a done for a superseded operation keeps the failed narration", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    // The chip currently shows a newer operation; the stale done must not
    // clear it (work document #34: narrate running operations only)
    deps.calls.getNarration = [[{ operation: "op-2" }]];
    handlers["kind:progress"]({
      kind: "progress",
      state: "done",
      operation: "op-1",
      stage: "connect",
    });
    assert.equal(callCount(deps, "setNarration"), 0);
  });

  it("routes mirror updates, awareness, and mesh reports to their deps", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    handlers["kind:y-sync"]({ kind: "y-sync", update: new Uint8Array([1]) });
    handlers["kind:y-update"]({
      kind: "y-update",
      update: new Uint8Array([2]),
    });
    assert.deepEqual(deps.calls.applyMirrorUpdate, [
      [new Uint8Array([1])],
      [new Uint8Array([2])],
    ]);
    handlers["kind:awareness"]({ kind: "awareness", states: [{ a: 1 }] });
    assert.deepEqual(deps.calls.showPeerGhosts?.[0]?.[0], [{ a: 1 }]);
    handlers["kind:mesh-config"]({ kind: "mesh-config", enabled: true });
    assert.deepEqual(deps.calls.ingestMeshConfig, [
      [{ kind: "mesh-config", enabled: true }],
    ]);
    handlers["kind:mesh-invite"]({ kind: "mesh-invite", uri: "rns://x" });
    assert.deepEqual(deps.calls.setMeshInvite, [["rns://x"]]);
    handlers["kind:mesh-status"]({ kind: "mesh-status", synced: true });
    assert.deepEqual(deps.calls.ingestMeshStatus, [
      [{ kind: "mesh-status", synced: true }],
    ]);
  });

  it("applies mesh peer changes and reachability states", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    handlers["kind:mesh-peers"]({
      kind: "mesh-peers",
      added: ["p1"],
      removed: ["p2"],
      peers: 3,
      identities: { p1: "a".repeat(32) },
    });
    assert.deepEqual(deps.calls.updateMeshPeers, [
      [["p1"], ["p2"], 3, { p1: "a".repeat(32) }],
    ]);
    const offlinePeer = "a".repeat(32);
    handlers["kind:mesh-peer-reachability"]({
      kind: "mesh-peer-reachability",
      states: { [offlinePeer]: "offline" },
    });
    assert.deepEqual(deps.calls.updatePeerReachability, [
      [{ [offlinePeer]: "offline" }],
    ]);
    handlers["kind:mesh-requests"]({
      kind: "mesh-requests",
      requests: [{ id: 1 }],
    });
    assert.deepEqual(deps.calls.setJoinRequests?.[0]?.[0], [{ id: 1 }]);
  });

  it("the Dacar report refreshes both surfaces; factory reset reloads", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    handlers["kind:mesh-dacar"]({
      kind: "mesh-dacar",
      configured: true,
      grants: [],
      wallet: [],
    });
    assert.equal(callCount(deps, "setDacarState"), 1);
    assert.equal(callCount(deps, "refreshMeshSettings"), 1);
    assert.equal(callCount(deps, "refreshSyncPanel"), 1);
    handlers["kind:factory-reset"]({ kind: "factory-reset" });
    assert.equal(callCount(deps, "reloadIntoFreshBoot"), 1);
  });

  it("graph echoes and protocol traces take no Glass action", () => {
    const deps = makeDeps();
    const handlers = createEchoHandlers(deps);
    const before = JSON.stringify(deps.calls);
    // Every authoritative graph echo is replica-driven: the y-update
    // stream mirrors the CRDT, so these only trace
    for (const command of [
      "addnode",
      "removenode",
      "movenode",
      "setcomponent",
      "addedge",
      "removeedge",
      "addiip",
      "updateiip",
      "removeiip",
      "addinport",
      "addoutport",
      "removeinport",
      "removeoutport",
      "renameinport",
      "renameoutport",
      "creategraph",
      "removegraph",
    ]) {
      handlers[`graph/${command}`]({
        protocol: "graph",
        command,
        payload: { id: "n1" },
      });
    }
    for (const key of [
      "system/heartbeat",
      "system/signature",
      "network/flowtrace",
      "acl/revoke",
    ]) {
      handlers[key]({ protocol: "system", command: "x", payload: {} });
    }
    assert.equal(JSON.stringify(deps.calls), before, "no deps touched");
  });
});
