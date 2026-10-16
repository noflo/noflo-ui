import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMeshTelemetry } from "../../src/worker/MeshTelemetry.js";

/**
 * The Reticulum telemetry tap (work document #63 M2): announces and
 * interface lifecycle over the shared transport, echoed as one legible
 * event per `mesh-telemetry` frame. The tap mutates nothing and re-wires
 * idempotently per Reticulum instance.
 */

/**
 * A mock transport with a mock interface, the shapes the tap reads.
 *
 * @returns {{ rns: any, iface: any }}
 */
function mockRns() {
  const transport = new EventTarget();
  transport.interfaces = [];
  const iface = new EventTarget();
  iface.name = "tcp-client-127.0.0.1:4242";
  return { rns: { transport }, iface };
}

describe("mesh telemetry tap (work document #63 M2)", () => {
  it("echoes announces with the compact hash form", () => {
    const { rns } = mockRns();
    /** @type {any[]} */
    const echoes = [];
    const tap = createMeshTelemetry({
      postMessage: (echo) => echoes.push(echo),
    });
    tap.attach(rns);
    rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: new Uint8Array([
            0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x01, 0x02, 0x03, 0x04, 0x05,
            0x06, 0x07, 0x08, 0x09, 0x0a,
          ]),
          ratchet: true,
        },
      }),
    );
    const echo = echoes.find((e) => e.kind === "mesh-telemetry");
    assert.ok(echo, "the announce echoes");
    assert.equal(echo.category, "announce");
    assert.match(echo.message, /announce heard · …0708090a/);
    assert.match(echo.message, /ratcheted/);
    assert.ok(echo.time > 0);
  });

  it("echoes the interface lifecycle with semantic tones", () => {
    const { rns, iface } = mockRns();
    rns.transport.interfaces = [iface];
    /** @type {any[]} */
    const echoes = [];
    const tap = createMeshTelemetry({
      postMessage: (echo) => echoes.push(echo),
    });
    tap.attach(rns);
    iface.dispatchEvent(new Event("connected"));
    iface.dispatchEvent(new Event("disconnected"));
    iface.dispatchEvent(new Event("reconnecting"));
    const messages = echoes
      .filter((e) => e.kind === "mesh-telemetry")
      .map((e) => `${e.message}|${e.tone ?? ""}`);
    assert.deepEqual(messages, [
      "tcp-client-127.0.0.1:4242 connected|ok",
      "tcp-client-127.0.0.1:4242 disconnected|",
      "tcp-client-127.0.0.1:4242 reconnecting|fail",
    ]);
  });

  it("re-attaches to a restarted mesh without double-wiring", () => {
    const first = mockRns();
    const second = mockRns();
    /** @type {any[]} */
    const echoes = [];
    const tap = createMeshTelemetry({
      postMessage: (echo) => echoes.push(echo),
    });
    tap.attach(first.rns);
    first.rns.transport.interfaces = [first.iface];
    // The mesh restart swaps the instance: the tap re-wires the new one
    tap.attach(second.rns);
    second.rns.transport.interfaces = [second.iface];
    tap.attach(second.rns); // idempotent: no double listeners
    second.rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: { destinationHash: new Uint8Array(16).fill(1) },
      }),
    );
    const announceEchoes = echoes.filter(
      (e) => e.kind === "mesh-telemetry" && e.category === "announce",
    );
    assert.equal(announceEchoes.length, 1, "exactly one announce echo");
    // The old instance's events no longer reach the tap
    first.rns.transport.dispatchEvent(
      new CustomEvent("announce", { detail: { destinationHash: null } }),
    );
    assert.equal(
      echoes.filter(
        (e) => e.kind === "mesh-telemetry" && e.category === "announce",
      ).length,
      1,
      "the detached instance is silent",
    );
  });
});
