import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTelemetryBus } from "../../src/glass/telemetryBus.js";

/**
 * The telemetry bus (work document #63): fan-out with per-stream bounded
 * drop-oldest ring buffers, and the subscription-on-open contract — an
 * accordion opened late receives recent history, not a blank panel.
 */
describe("telemetry bus (work document #63)", () => {
  it("fans published entries out to live subscribers", () => {
    const bus = createTelemetryBus();
    /** @type {any[]} */
    const received = [];
    bus.subscribe("yjs", (entry) => received.push(entry), { history: false });
    bus.publish("yjs", { message: "update · 1.2 KB", status: "DELTA" });
    assert.equal(received.length, 1);
    assert.equal(received[0].message, "update · 1.2 KB");
    // The bus stamps sequence and time; the producer's payload rides
    assert.equal(received[0].seq, 1);
    assert.equal(received[0].status, "DELTA");
    assert.ok(received[0].time > 0);
  });

  it("replays the ring buffer on subscribe — history, not a blank panel", () => {
    const bus = createTelemetryBus();
    bus.publish("yjs", { message: "one" });
    bus.publish("yjs", { message: "two" });
    // The subscriber arrives after the traffic: the buffer replays
    /** @type {string[]} */
    const seen = [];
    bus.subscribe("yjs", (entry) => seen.push(entry.message));
    assert.deepEqual(seen, ["one", "two"]);
    // Live traffic flows after the replay
    bus.publish("yjs", { message: "three" });
    assert.deepEqual(seen, ["one", "two", "three"]);
  });

  it("subscribe without history sees only live traffic", () => {
    const bus = createTelemetryBus();
    bus.publish("yjs", { message: "before" });
    /** @type {string[]} */
    const seen = [];
    bus.subscribe("yjs", (entry) => seen.push(entry.message), {
      history: false,
    });
    bus.publish("yjs", { message: "after" });
    assert.deepEqual(seen, ["after"]);
  });

  it("the ring buffer drops the oldest past the capacity", () => {
    const bus = createTelemetryBus({ capacity: 3 });
    for (const message of ["one", "two", "three", "four", "five"]) {
      bus.publish("yjs", { message });
    }
    const history = bus.history("yjs");
    assert.deepEqual(
      history.map((entry) => entry.message),
      ["three", "four", "five"],
    );
    // Sequences stay monotonic across drops: the order is unambiguous
    assert.deepEqual(
      history.map((entry) => entry.seq),
      [3, 4, 5],
    );
  });

  it("unsubscribe stops the traffic", () => {
    const bus = createTelemetryBus();
    /** @type {string[]} */
    const seen = [];
    const unsubscribe = bus.subscribe("yjs", (entry) =>
      seen.push(entry.message),
    );
    bus.publish("yjs", { message: "one" });
    unsubscribe();
    bus.publish("yjs", { message: "two" });
    assert.deepEqual(seen, ["one"]);
    // The buffer keeps recording for the next opener
    assert.equal(bus.history("yjs").length, 2);
  });

  it("streams are isolated", () => {
    const bus = createTelemetryBus();
    /** @type {string[]} */
    const yjs = [];
    bus.subscribe("yjs", (entry) => yjs.push(entry.message));
    bus.publish("reticulum", { message: "link established" });
    bus.publish("yjs", { message: "update" });
    assert.deepEqual(yjs, ["update"]);
    assert.deepEqual(bus.streams().sort(), ["reticulum", "yjs"]);
  });
});
