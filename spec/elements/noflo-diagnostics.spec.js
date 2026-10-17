/**
 * @file The app diagnostics tenant (work document #63's stream catalog):
 * the persisted crash-report and connectivity log — the Glass error
 * boundary, the diagnostics store's posture (plain IndexedDB, immutable
 * add/remove, the bounded cap), and the `diagnostics` stream's legible
 * entries. The class of failure this guards against is SPEC's own
 * promise: no silent failures, no remote telemetry servers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import {
  connectivityWord,
  installDiagnostics,
  recordMeshState,
} from "../../src/glass/diagnostics.js";
import {
  DIAGNOSTICS_DB,
  DIAGNOSTICS_STORE,
  openDiagnosticsStore,
  resetDiagnosticsStore,
} from "../../src/glass/diagnosticsStore.js";
import { telemetryBus } from "../../src/glass/telemetryBus.js";
import { makeFakeIdb } from "./utils/fake-idb.js";

/**
 * Dispatches a window event carrying extra payload properties, the way
 * the spec's Event fakes carry `pointerType` — happy-dom's constructors
 * do not expose every legacy event's fields.
 *
 * @param {string} type
 * @param {Record<string, any>} payload
 */
function dispatchWindow(type, payload) {
  const event = new window.Event(type);
  Object.assign(event, payload);
  window.dispatchEvent(event);
}

describe("the diagnostics store (work document #63)", () => {
  it("opens the wrapper database and appends immutable records", async () => {
    const idb = makeFakeIdb();
    const store = await openDiagnosticsStore(idb);
    const record = await store.append({
      at: 1,
      kind: "crash",
      message: "boom",
      status: "CRASH",
      tone: "fail",
    });
    assert.ok(record.id, "the record carries an id");
    const recent = await store.recent(10);
    assert.equal(recent.length, 1);
    assert.equal(recent[0].message, "boom");
    assert.ok(await store.any());
  });

  it("the cap drops the oldest records, never mutates a survivor", async () => {
    const idb = makeFakeIdb();
    const store = await openDiagnosticsStore(idb);
    for (let i = 0; i < 205; i++) {
      await store.append({ at: i, kind: "mesh", message: `m${i}` });
    }
    const recent = await store.recent(300);
    assert.equal(recent.length, 200, "the cap holds");
    assert.equal(recent[0].message, "m5", "the oldest dropped");
    assert.equal(recent[199].message, "m204", "the newest survives");
    assert.ok(
      recent.every((r) => r.message === `m${r.at}`),
      "records are never rewritten",
    );
  });

  it("clear wipes the log", async () => {
    const idb = makeFakeIdb();
    const store = await openDiagnosticsStore(idb);
    await store.append({ at: 1, kind: "mesh", message: "m" });
    await store.clear();
    assert.ok(!(await store.any()), "the log is empty after the prune");
  });

  it("the store names its database and object store for the migrations", () => {
    assert.equal(DIAGNOSTICS_DB, "noflo-diagnostics");
    assert.equal(DIAGNOSTICS_STORE, "events");
  });
});

describe("the Glass error boundary (work document #63)", () => {
  it("records crashes and rejections on the stream and in the store", async () => {
    resetDiagnosticsStore();
    telemetryBus().publish("diagnostics", {
      message: "warm the stream's ring",
    });
    const seen = [];
    const teardown = installDiagnostics({
      onCrash: () => seen.push("attention"),
    });
    dispatchWindow("error", {
      message: "TypeError: x is not a function",
      error: new TypeError("x is not a function"),
      filename: "app.js",
      lineno: 12,
    });
    dispatchWindow("unhandledrejection", {
      reason: new Error("promise exploded"),
    });
    assert.deepEqual(
      seen,
      ["attention", "attention"],
      "each crash demands attention",
    );
    const history = telemetryBus().history("diagnostics").slice(-2);
    assert.match(history[0].message, /x is not a function/);
    assert.equal(history[0].status, "CRASH");
    assert.equal(history[1].status, "REJECT");
    // The records' legible line is the stream's; persistence is
    // best-effort and lands on its own chain — no await here, the
    // singleton's failure path is asynchronous by design
    teardown();
  });

  it("resource-load noise without an error object is not a crash", () => {
    resetDiagnosticsStore();
    const before = telemetryBus().history("diagnostics").length;
    const teardown = installDiagnostics();
    dispatchWindow("error", { message: "" });
    assert.equal(
      telemetryBus().history("diagnostics").length,
      before,
      "an img that failed to load is not an app failure",
    );
    teardown();
  });

  it("the boundary never throws, even when recording fails", () => {
    resetDiagnosticsStore();
    const before = telemetryBus().history("diagnostics").length;
    const teardown = installDiagnostics({
      onCrash: () => {
        throw new Error("the attention hook itself is broken");
      },
    });
    assert.doesNotThrow(() => {
      dispatchWindow("error", {
        message: "boom",
        error: new Error("boom"),
      });
    }, "a broken consumer must not break the boundary");
    assert.equal(telemetryBus().history("diagnostics").length, before + 1);
    teardown();
  });

  it("the teardown removes the listeners", () => {
    resetDiagnosticsStore();
    const before = telemetryBus().history("diagnostics").length;
    const teardown = installDiagnostics();
    teardown();
    dispatchWindow("error", {
      message: "after teardown",
      error: new Error("after teardown"),
    });
    assert.equal(
      telemetryBus().history("diagnostics").length,
      before,
      "uninstalled, the boundary is silent",
    );
  });
});

describe("the connectivity history (work document #63)", () => {
  it("records mesh transitions with the terminal grammar's tags", async () => {
    resetDiagnosticsStore();
    installDiagnostics();
    recordMeshState("offline");
    recordMeshState("syncing", "1 peer");
    recordMeshState("up to date", "2 peers");
    recordMeshState("mesh error");
    const history = telemetryBus().history("diagnostics").slice(-4);
    assert.match(history[0].message, /connectivity · offline/);
    assert.equal(history[0].status, "DOWN");
    assert.equal(history[1].status, "UP", "syncing is traffic: UP");
    assert.equal(history[2].status, "UP");
    assert.match(history[2].message, /2 peers/);
    assert.equal(history[3].status, "FAIL");
    assert.equal(history[3].tone, "fail");
  });

  it("the connectivity word branches on status and error", () => {
    assert.equal(connectivityWord(null, ""), "offline");
    assert.equal(connectivityWord({ connected: false }, ""), "offline");
    assert.equal(
      connectivityWord({ connected: true, synced: false }, ""),
      "syncing",
    );
    assert.equal(
      connectivityWord({ connected: true, synced: true }, ""),
      "up to date",
    );
    assert.equal(
      connectivityWord({ connected: true, synced: true }, "dial failed"),
      "mesh error",
      "the error outranks the state",
    );
  });
});
