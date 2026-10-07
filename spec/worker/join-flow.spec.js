import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Identity, Reticulum } from "../../vendor/reticulum-core.js";
import { ReticulumProvider } from "../../vendor/y-reticulum.js";
import * as Y from "../../vendor/yjs.js";

const ROOM = "noflo-ui:join-flow-test-project-id";

const _hexToBytes = (/** @type {string} */ hex) =>
  Uint8Array.from(hex.match(/../g) ?? [], (/** @type {string} */ h) =>
    parseInt(h, 16),
  );
const bytesToHex = (/** @type {Uint8Array} */ bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

describe("join flow (work document #21)", () => {
  it("surfaces an ungranted joiner's announce as a join request on the owner, then syncs after approval", {
    timeout: 45000,
  }, async () => {
    // 2-node TCP loopback: owner listens, joiner dials
    const net = await import("node:net");
    const { TCPClientInterface, TCPServerInterface } = await import(
      "@reticulum/node"
    );
    const HOST = "127.0.0.1";
    const port = await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.unref();
      probe.on("error", reject);
      probe.listen({ host: HOST, port: 0 }, () => {
        const { port: p } = /** @type {net.AddressInfo} */ (probe.address());
        probe.close(() => resolve(p));
      });
    });
    const rnsOwner = new Reticulum();
    const rnsJoiner = new Reticulum();
    const server = new TCPServerInterface({ port });
    await server.connect();
    const spawned = new Promise((resolve) => {
      server.addEventListener(
        "connection",
        (/** @type {any} */ event) => {
          rnsOwner.addInterface(event.detail, true);
          resolve();
        },
        { once: true },
      );
    });
    const client = new TCPClientInterface({ host: HOST, port });
    await client.connect();
    rnsJoiner.addInterface(client, true);
    await spawned;

    const close = async () => {
      await client.disconnect().catch(() => {});
      await server.disconnect().catch(() => {});
    };

    const docOwner = new Y.Doc();
    const docJoiner = new Y.Doc();
    const idOwner = await Identity.generate();
    const idJoiner = await Identity.generate();
    const ownerHash = bytesToHex(
      await Identity.truncatedHash(await idOwner.getPublicKey()),
    );
    const joinerHash = bytesToHex(
      await Identity.truncatedHash(await idJoiner.getPublicKey()),
    );

    // The owner's grants: self-grant only (developer), like MeshSync's
    // ensureSelfGrant
    /** @type {Set<string>} */
    const ownerGrants = new Set([ownerHash]);
    // The joiner's grants: empty — requester mode
    /** @type {Set<string>} */
    const joinerGrants = new Set();

    /** @type {any[]} */
    const ownerJoinRequests = [];

    /**
     * @param {Set<string>} grants
     * @returns {(context: any) => Promise<boolean>}
     */
    const policy = (grants) => async (/** @type {any} */ context) => {
      // Requester mode: an empty grants map dials so the other side's
      // policy decides
      if (grants.size === 0) return true;
      return grants.has(context.remoteIdentityHash);
    };

    const providerOwner = new ReticulumProvider(ROOM, docOwner, {
      reticulum: rnsOwner,
      identity: idOwner,
      linkPolicy: policy(ownerGrants),
    });
    providerOwner.on("refused", (/** @type {any} */ e) => {
      for (const refusal of e.refusals) {
        ownerJoinRequests.push(refusal.identityHash);
      }
    });

    const providerJoiner = new ReticulumProvider(ROOM, docJoiner, {
      reticulum: rnsJoiner,
      identity: idJoiner,
      linkPolicy: policy(joinerGrants),
    });

    await providerOwner.connect();
    await providerJoiner.connect();

    // Announce both peers
    await providerOwner.room?.dest?.announce();
    await providerJoiner.room?.dest?.announce();

    // The owner's policy refuses the ungranted joiner: a join request
    // surfaces (initiator pre-check or responder identify, either side)
    await waitFor(() => ownerJoinRequests.includes(joinerHash), 15000);
    assert.ok(
      ownerJoinRequests.includes(joinerHash),
      "join request surfaced on the owner",
    );

    // The owner approves: grant the joiner → strict policy now allows
    ownerGrants.add(joinerHash);

    // Announce again (the periodic cadence would do this)
    await providerOwner.room?.dest?.announce();
    await providerJoiner.room?.dest?.announce();

    // Sync flows: the joiner receives the owner's document updates
    docOwner.getMap("doc").set("hello", "world");
    await waitFor(
      () => docJoiner.getMap("doc").get("hello") === "world",
      15000,
    );
    assert.equal(docJoiner.getMap("doc").get("hello"), "world");

    await providerOwner.destroy().catch(() => {});
    await providerJoiner.destroy().catch(() => {});
    await close();
  });
});

// waitFor helper (placed after the describe to avoid hoisting issues with
// the import references above)
function waitFor(cond, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (cond()) return resolve(undefined);
      if (Date.now() >= deadline) return reject(new Error("waitFor timed out"));
      setTimeout(tick, 100);
    };
    tick();
  });
}
