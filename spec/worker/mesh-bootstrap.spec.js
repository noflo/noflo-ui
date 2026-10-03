import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryStorage } from "../../src/crdt/MeshConfig.js";
import { createProjectDoc } from "../../src/crdt/ProjectDoc.js";
import { parseInviteUri } from "../../src/worker/Bootstrap.js";
import { createMeshSync } from "../../src/worker/MeshSync.js";

/**
 * Minimal fake transport: enough surface for the bootstrap host's
 * destination binding (real Destination crypto, no real network).
 *
 * @returns {any}
 */
function fakeRns() {
  return {
    transport: {
      bindLocalDestination: async () => {},
      unbindLocalDestination: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  };
}

describe("mesh bootstrap invites (work document #25)", () => {
  it("issues no invite while the device cannot host", async () => {
    const mesh = await createMeshSync({
      doc: createProjectDoc("Owner project"),
      postMessage: () => {},
      storage: createMemoryStorage(),
      roomFor: () => "noflo-ui:test",
      autostart: false,
    });
    assert.equal(await mesh.createInvite(), null, "no provider, no invite");
  });

  it("issues parseable invite URIs and registers their tokens", async () => {
    const storage = createMemoryStorage();
    const mesh = await createMeshSync({
      doc: createProjectDoc("Owner project"),
      postMessage: () => {},
      storage,
      roomFor: () => "noflo-ui:test",
      autostart: false,
      createProvider: async () => ({
        room: { rns: fakeRns() },
        on: () => {},
        destroy: async () => {},
      }),
    });
    await mesh.handleConfigure({ ...mesh.config, enabled: true });
    const invite = await mesh.createInvite();
    assert.ok(invite, "invite issued");
    assert.ok(invite.uri.startsWith("noflo://join/"));
    const parsed = parseInviteUri(invite.uri);
    assert.ok(parsed, "URI parses");
    assert.equal(parsed.token, invite.token);
    assert.ok(invite.expiresAt > Date.now(), "token carries a future expiry");
    // The token is registered for validation on knock
    const registered = await storage.get("bootstrap-invites");
    assert.ok(Array.isArray(registered), "registry persisted");
    assert.equal(registered.length, 1);
    assert.equal(registered[0].token, invite.token);
    await mesh.stop();
  });

  it("rejects malformed join URIs with a status error", async () => {
    /** @type {any[]} */
    const messages = [];
    const mesh = await createMeshSync({
      doc: createProjectDoc("Joiner project"),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      roomFor: () => "noflo-ui:test",
      autostart: false,
    });
    await mesh.startBootstrapJoin("not-an-invite");
    const errors = messages.filter(
      (m) =>
        m.kind === "mesh-status" && m.error?.includes("not a valid invite"),
    );
    assert.equal(errors.length, 1, "one error posted");
    assert.equal(
      messages.filter((m) => m.kind === "mesh-bootstrap").length,
      0,
      "no state machine run for a malformed URI",
    );
  });

  it("resolveRequest clears request entries and re-reports", async () => {
    /** @type {any[]} */
    const messages = [];
    const mesh = await createMeshSync({
      doc: createProjectDoc("Owner project"),
      postMessage: (m) => messages.push(m),
      storage: createMemoryStorage(),
      roomFor: () => "noflo-ui:test",
      autostart: false,
    });
    mesh.resolveRequest({ identityHash: "unknown-peer", decision: "declined" });
    const reports = messages.filter((m) => m.kind === "mesh-requests");
    assert.equal(reports.length, 1, "list re-reported");
    assert.deepEqual(reports[0].requests, []);
  });
});
