import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSupervisor } from "../../src/worker/EngineSupervisor.js";

/** A scripted fake worker whose heartbeats and lifecycle are controllable. */
function makeFakeWorker() {
  /** @type {Array<(event: { data: any }) => void>} */
  const handlers = [];
  return {
    terminated: false,
    /** @type {any[]} */
    sent: [],
    /** @type {((error: any) => void) | null} The registered error
     * handler (work document #56): real workers fire their error event
     * when the module graph fails to load. */
    onError: null,
    onMessage(handler) {
      handlers.push(handler);
    },
    postMessage(message) {
      this.sent.push(message);
    },
    terminate() {
      this.terminated = true;
    },
    /** @param {any} data */
    emit(data) {
      for (const handler of handlers) handler({ data });
    },
    /** @param {any} error */
    emitError(error) {
      this.onError?.(error);
    },
  };
}

/** Deterministic clock for the supervisor's watchdog. */
function makeClock() {
  let now = 0;
  return {
    now: () => now,
    advance(ms) {
      now += ms;
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    /** @type {Map<number, () => void>} */
    intervals: new Map(),
    setInterval(fn, ms) {
      this.intervals.set(ms, fn);
      return ms;
    },
    clearInterval(id) {
      this.intervals.delete(id);
    },
    /** Fires the watchdog check once. */
    tick() {
      for (const fn of this.intervals.values()) fn();
    },
  };
}

describe("EngineSupervisor", () => {
  it("passes non-heartbeat messages through to onMessage", () => {
    const clock = makeClock();
    const worker = makeFakeWorker();
    /** @type {any[]} */
    const received = [];
    const supervisor = createSupervisor({
      createWorker: () => worker,
      onMessage: (message) => received.push(message),
      timers: clock,
    });

    worker.emit({
      protocol: "graph",
      command: "addnode",
      payload: { id: "A", component: "c", metadata: { x: 0, y: 0 } },
    });

    assert.equal(received.length, 1);
    assert.equal(received[0].command, "addnode");
    supervisor.stop();
  });

  it("updates the heartbeat clock on heartbeat messages", () => {
    const clock = makeClock();
    const workers = [makeFakeWorker(), makeFakeWorker()];
    let index = 0;
    const supervisor = createSupervisor({
      createWorker: () => workers[index++],
      onMessage: () => {},
      heartbeatTimeoutMs: 30000,
      timers: clock,
    });

    // Heartbeat keeps the worker alive across watchdog checks
    for (let i = 0; i < 10; i++) {
      clock.advance(5000);
      workers[0].emit({
        protocol: "system",
        command: "heartbeat",
        payload: { status: "ok", uptime: 1 },
      });
      clock.tick();
    }

    assert.equal(supervisor.respins, 0);
    assert.equal(workers[0].terminated, false);
    supervisor.stop();
  });

  it("respins the worker when heartbeats stop arriving", () => {
    const clock = makeClock();
    const workers = [makeFakeWorker(), makeFakeWorker()];
    let index = 0;
    /** @type {number} */
    let respins = 0;
    const supervisor = createSupervisor({
      createWorker: () => workers[index++],
      onMessage: () => {},
      onRespin: () => respins++,
      heartbeatTimeoutMs: 30000,
      timers: clock,
    });

    clock.advance(31000);
    clock.tick();

    assert.equal(supervisor.respins, 1);
    assert.equal(respins, 1);
    assert.equal(workers[0].terminated, true);
    assert.equal(workers[1].terminated, false);

    // The new worker receives sends
    supervisor.send({ type: "LIFECYCLE", command: "subscribe", payload: {} });
    assert.equal(workers[1].sent.length, 1);
    supervisor.stop();
    assert.equal(workers[1].terminated, true);
  });
});

describe("EngineSupervisor error narration (work document #56)", () => {
  it("narrates a worker whose module graph fails to load", () => {
    const clock = makeClock();
    const worker = makeFakeWorker();
    /** @type {any[]} */
    const errors = [];
    const supervisor = createSupervisor({
      createWorker: (onError) => {
        worker.onError = onError;
        return worker;
      },
      onMessage: () => {},
      onError: (error) => errors.push(error),
      timers: clock,
    });

    // The worker's module graph fails to load: the error event fires and
    // the narrator receives it (the silent-respawn gap this closes)
    worker.emitError({
      message: "Failed to fetch dynamically imported module",
      filename: "/src/worker/engine.js",
      lineno: 1,
    });

    console.log(
      "debug errors:",
      JSON.stringify(
        errors.map((e) => (typeof e === "object" ? e : String(e))),
      ),
    );
    console.log("debug worker.onError type:", typeof worker.onError);

    assert.deepEqual(errors, [
      {
        message: "Failed to fetch dynamically imported module",
        filename: "/src/worker/engine.js",
        lineno: 1,
      },
    ]);
    supervisor.stop();
  });

  it("the respawned worker narrates its own errors too", () => {
    const clock = makeClock();
    const workers = [makeFakeWorker(), makeFakeWorker()];
    let index = 0;
    /** @type {any[]} */
    const errors = [];
    const supervisor = createSupervisor({
      createWorker: (onError) => {
        workers[index].onError = onError;
        return workers[index++];
      },
      onMessage: () => {},
      onError: (error) => errors.push(error),
      heartbeatTimeoutMs: 30000,
      timers: clock,
    });

    // The first worker never heartbeats: the watchdog respawns it. The
    // respawned worker's error surfaces through the same narrator.
    clock.advance(40000);
    clock.tick();
    assert.equal(supervisor.respins, 1);
    workers[1].emitError({ message: "load failed again" });
    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, "load failed again");
    supervisor.stop();
  });
});
