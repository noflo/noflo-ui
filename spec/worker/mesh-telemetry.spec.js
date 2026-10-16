import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodeAnnounceAppData } from "@noflo/fbp-protocol";
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
  it("announces: FBP passes with declared facts, others need the grant", () => {
    const { rns } = mockRns();
    /** @type {any[]} */
    const echoes = [];
    const tap = createMeshTelemetry({
      postMessage: (echo) => echoes.push(echo),
      isPeer: (identityHash) => identityHash.startsWith("4242"),
    });
    tap.attach(rns);
    const unknownIdentity = { identityHash: new Uint8Array(16).fill(0x99) };
    const grantedIdentity = { identityHash: new Uint8Array(16).fill(0x42) };
    const dest = new Uint8Array([
      0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
      0x07, 0x08, 0x09, 0x0a,
    ]);
    // A non-FBP announce from an unknown peer: filtered — the wider
    // mesh's LXMF-class destinations are not this device's business
    rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: dest,
          identity: unknownIdentity,
          ratchet: true,
          appData: new TextEncoder().encode("hello from lxmf"),
        },
      }),
    );
    assert.equal(echoes.filter((e) => e.kind === "mesh-telemetry").length, 0);
    // FBP runtime announces always pass, with their declared facts
    rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: dest,
          appData: encodeAnnounceAppData({
            destinationHash: dest,
            nodeName: "workshop",
          }),
        },
      }),
    );
    const echo = echoes.find((e) => e.kind === "mesh-telemetry");
    assert.ok(echo, "the FBP announce passes without any grant");
    assert.equal(echo.status, "FBP");
    assert.match(
      echo.message,
      /runtime "workshop" · v2 · aabbccddeeff0102030405060708090a/,
    );
    assert.equal(echo.detail.nodeName, "workshop");
    assert.equal(echo.detail.aspect, "fbp.runtime");
    assert.equal(echo.time > 0, true);
    // A granted peer's announce shows with its app-data summary
    rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: dest,
          identity: grantedIdentity,
          ratchet: true,
          appData: new TextEncoder().encode("hello from lxmf"),
        },
      }),
    );
    const granted = echoes.filter((e) => e.kind === "mesh-telemetry")[1];
    assert.ok(granted, "the granted peer's announce echoes");
    assert.equal(granted.status, "ANNOUNCE");
    assert.match(
      granted.message,
      /announce · aabbccddeeff0102030405060708090a/,
    );
    assert.match(granted.message, /app-data "hello from lxmf"/);
    assert.match(granted.message, /ratcheted/);
    assert.match(granted.detail.identityHash, /^4242/);
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
      .map((e) => `${e.status}/${e.message}|${e.tone ?? ""}`);
    assert.deepEqual(messages, [
      "UP/tcp-client-127.0.0.1:4242 connected|ok",
      "DOWN/tcp-client-127.0.0.1:4242 disconnected|",
      "RETRY/tcp-client-127.0.0.1:4242 reconnecting|fail",
    ]);
  });

  it("re-attaches to a restarted mesh without double-wiring", () => {
    const first = mockRns();
    const second = mockRns();
    /** @type {any[]} */
    const echoes = [];
    const tap = createMeshTelemetry({
      postMessage: (echo) => echoes.push(echo),
      isPeer: () => true,
    });
    tap.attach(first.rns);
    first.rns.transport.interfaces = [first.iface];
    // The mesh restart swaps the instance: the tap re-wires the new one
    tap.attach(second.rns);
    second.rns.transport.interfaces = [second.iface];
    tap.attach(second.rns); // idempotent: no double listeners
    second.rns.transport.dispatchEvent(
      new CustomEvent("announce", {
        detail: {
          destinationHash: new Uint8Array(16).fill(1),
          identity: { identityHash: new Uint8Array(16).fill(1) },
        },
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
