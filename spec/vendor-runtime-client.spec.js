import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { encodeCrdtStaleEpoch } from "@noflo/fbp-protocol";

import { GraphModel } from "../vendor/graph.js";
import {
  ExecutionClient,
  PROTOCOL_VERSION,
  RegistryCache,
  RuntimeClient,
  SchemaCache,
  UiEventSurface,
} from "../vendor/runtime-client.js";

/**
 * The vendored @noflo/runtime-client (work document #59): the FBP Protocol
 * 2.0 client runs against the shared vendor siblings — one @reticulum/core
 * instance and one @noflo/graph model per process — so the graph mirror the
 * client builds is the same GraphModel class the rest of the application
 * sees. These smoketests prove the bundle loads, the sibling graph model is
 * the one the client's mirror uses, and the canonical-baseline seam works
 * end to end without a live runtime.
 */
describe("vendored @noflo/runtime-client (work document #59)", () => {
  it("exposes the documented FBP Protocol 2.0 surface", () => {
    assert.equal(PROTOCOL_VERSION, 2);
    assert.equal(typeof RuntimeClient, "function");
    assert.equal(typeof ExecutionClient, "function");
    assert.equal(typeof RegistryCache, "function");
    assert.equal(typeof SchemaCache, "function");
    assert.equal(typeof UiEventSurface, "function");
  });

  it("constructs against a stub link with the siblings resolved", () => {
    const client = new RuntimeClient({
      link: new EventTarget(),
      auth: { protocolVersion: PROTOCOL_VERSION, capabilityMask: 0xff },
    });
    assert.ok(client instanceof EventTarget);
    assert.ok(client.registry instanceof RegistryCache);
    assert.ok(client.schemas instanceof SchemaCache);
    assert.equal(client.clientId, null);
    assert.equal(client.logicalClock, 0);
    assert.equal(client.graph, undefined);
  });

  it("baselines the graph mirror through the shared graph model", async () => {
    const canonical = {
      name: "smoketest",
      nodes: [{ entity_id: "a", component: "core/Repeat" }],
      edges: [],
      iips: [],
      exports: [],
      groups: [],
    };
    const staleFrame = encodeCrdtStaleEpoch(null, "epoch-1", "res-hash");
    const link = new EventTarget();
    link.request = async () =>
      new TextEncoder().encode(JSON.stringify(canonical));
    const client = new RuntimeClient({
      link,
      auth: { protocolVersion: PROTOCOL_VERSION, capabilityMask: 0xff },
    });
    client.nextFrame = () => Promise.resolve(staleFrame);
    client.send = async () => {};

    const result = await client.syncGraph({ timeoutMs: 1000 });

    assert.equal(result.upToDate, false);
    assert.equal(result.epochId, "epoch-1");
    // The sibling identity contract: the mirror the client built is the
    // same GraphModel class the vendored @noflo/graph bundle exports —
    // one graph model per process
    assert.ok(client.graph instanceof GraphModel);
    assert.ok(client.graph.node("a"));
  });
});
