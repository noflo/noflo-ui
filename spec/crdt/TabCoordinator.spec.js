import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTabCoordinator,
  newTabId,
} from "../../src/crdt/TabCoordinator.js";

/** Deterministic clock. */
function makeClock() {
  let now = 0;
  return {
    now: () => now,
    advance(ms) {
      now += ms;
    },
    /** @type {Array<{ fn: () => void }>} */
    intervals: [],
    /** @param {() => void} fn */
    setInterval(fn) {
      this.intervals.push({ fn });
      return this.intervals.length;
    },
    clearInterval() {},
    /** Fires every interval registered on this clock once. */
    beat() {
      for (const { fn } of [...this.intervals]) fn();
    },
  };
}

/**
 * In-memory BroadcastChannel bus: postMessage is delivered synchronously to
 * all other open coordinators on the bus, like a real BroadcastChannel.
 */
function makeBus() {
  /** @type {any[]} */
  const coordinators = [];
  return {
    /**
     * @param {string} id
     * @returns {any} Channel-like object to hand to createTabCoordinator.
     */
    create(id) {
      const channel = {
        id,
        closed: false,
        /** @type {((event: { data: any }) => void) | null} */
        onmessage: null,
        /** @type {any[]} */
        posted: [],
        /** @param {any} data */
        postMessage(data) {
          this.posted.push(data);
          for (const other of coordinators) {
            if (other === channel || other.closed) continue;
            other.onmessage?.({ data });
          }
        },
        close() {
          this.closed = true;
        },
      };
      coordinators.push(channel);
      return channel;
    },
  };
}

describe("TabCoordinator", () => {
  it("a lone tab is the leader immediately", () => {
    const bus = makeBus();
    const coordinator = createTabCoordinator({
      channel: bus.create("tab-a"),
      id: "tab-a",
      timers: makeClock(),
    });
    assert.equal(coordinator.isLeader(), true);
    assert.equal(coordinator.leaderId(), "tab-a");
    coordinator.stop();
  });

  it("a later tab joins as follower without stealing leadership", () => {
    const clock = makeClock();
    const bus = makeBus();
    const coordinatorA = createTabCoordinator({
      channel: bus.create("tab-a"),
      id: "tab-a",
      timers: clock,
    });
    const coordinatorB = createTabCoordinator({
      channel: bus.create("tab-b"),
      id: "tab-b",
      timers: clock,
    });

    // One heartbeat exchange so both tabs know each other
    clock.beat();

    assert.equal(coordinatorA.isLeader(), true, "earlier tab stays leader");
    assert.equal(coordinatorB.isLeader(), false, "later tab is follower");
    assert.equal(coordinatorB.leaderId(), "tab-a");
    assert.deepEqual(coordinatorA.members(), ["tab-a", "tab-b"]);
    coordinatorA.stop();
    coordinatorB.stop();
  });

  it("leadership transfers to the survivor when the leader leaves politely", () => {
    const clock = makeClock();
    const bus = makeBus();
    const coordinatorA = createTabCoordinator({
      channel: bus.create("tab-a"),
      id: "tab-a",
      timers: clock,
    });
    const coordinatorB = createTabCoordinator({
      channel: bus.create("tab-b"),
      id: "tab-b",
      timers: clock,
    });
    clock.beat();
    assert.equal(coordinatorA.isLeader(), true);

    coordinatorA.stop();

    assert.equal(coordinatorB.isLeader(), true, "follower takes over");
    assert.deepEqual(coordinatorB.members(), ["tab-b"]);
    coordinatorB.stop();
  });

  it("leadership transfers when the leader dies silently", () => {
    const bus = makeBus();
    const clockA = makeClock();
    const clockB = makeClock();
    const coordinatorA = createTabCoordinator({
      channel: bus.create("tab-a"),
      id: "tab-a",
      timers: clockA,
      heartbeatMs: 1000,
      leaderTimeoutMs: 3000,
    });
    const coordinatorB = createTabCoordinator({
      channel: bus.create("tab-b"),
      id: "tab-b",
      timers: clockB,
      heartbeatMs: 1000,
      leaderTimeoutMs: 3000,
    });

    // Exchange one heartbeat, then the leader's timers stop ticking (crash)
    clockA.beat();
    clockB.beat();
    assert.equal(coordinatorA.isLeader(), true);

    clockB.advance(4000);
    clockB.beat();

    assert.equal(
      coordinatorB.isLeader(),
      true,
      "follower takes over after timeout",
    );
    assert.deepEqual(coordinatorB.members(), ["tab-b"], "silent peer expired");
    coordinatorB.stop();
  });

  it("keeps membership alive through periodic announcements", () => {
    const clock = makeClock();
    const bus = makeBus();
    const channelA = bus.create("tab-a");
    const channelB = bus.create("tab-b");
    const coordinatorA = createTabCoordinator({
      channel: channelA,
      id: "tab-a",
      timers: clock,
      heartbeatMs: 1000,
      leaderTimeoutMs: 3000,
    });
    createTabCoordinator({
      channel: channelB,
      id: "tab-b",
      timers: clock,
      heartbeatMs: 1000,
      leaderTimeoutMs: 3000,
    });

    clock.beat();
    clock.beat();
    clock.beat();
    assert.ok(channelA.posted.length >= 3, "announced repeatedly");
    assert.deepEqual(
      coordinatorA.members(),
      ["tab-a", "tab-b"],
      "no expiry while alive",
    );
    coordinatorA.stop();
    channelA.close();
    channelB.close();
  });

  it("newTabId sorts after earlier ids in the same session", () => {
    const first = newTabId({ randomUUID: () => "aaaaaaaa" });
    const second = newTabId({ randomUUID: () => "bbbbbbbb" });
    assert.ok(first < second, "later tabs sort later");
  });
});
