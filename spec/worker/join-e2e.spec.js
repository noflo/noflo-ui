import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";
import { createMemoryStorage } from "../../src/crdt/MeshConfig.js";
import {
  adoptProjectIdentity,
  createProjectDoc,
} from "../../src/crdt/ProjectDoc.js";
import { createMeshSync } from "../../src/worker/MeshSync.js";

const HOST = "127.0.0.1";

/**
 * Resolves with a free localhost TCP port (ephemeral, immediately released).
 *
 * @returns {Promise<number>}
 */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen({ host: HOST, port: 0 }, () => {
      const { port } = /** @type {net.AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });
}

/**
 * @param {(ms: number) => Promise<void>} sleep
 * @param {() => boolean} condition
 * @param {number} timeoutMs
 * @param {string} label
 */
async function waitFor(sleep, condition, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (condition()) return;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await sleep(200);
  }
}

describe("full join E2E over a TCP loopback (work document #25)", () => {
  it("joins by invite, hands off the Dacar grant, and converges", {
    timeout: 240_000,
  }, async () => {
    const sleep = (/** @type {number} */ ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const port = await getFreePort();

    /** @type {any[]} */
    const ownerMessages = [];
    /** @type {any[]} */
    const joinerMessages = [];
    const ownerDoc = createProjectDoc("Owner project");
    const joinerDoc = createProjectDoc("Joiner scratch");

    const owner = await createMeshSync({
      doc: ownerDoc,
      postMessage: (m) => ownerMessages.push(m),
      storage: createMemoryStorage(),
      roomFor: () => `noflo-ui:${ownerDoc.getMap("metadata").get("id")}`,
      autostart: false,
    });
    await owner.handleConfigure({
      ...owner.config,
      enabled: true,
      interfaces: [
        {
          id: "loopback",
          type: "tcp",
          options: { listen: true, port },
          enabled: true,
        },
      ],
    });
    assert.ok(owner.identityHash, "owner identity generated");

    const projectId = String(ownerDoc.getMap("metadata").get("id"));
    const invite = await owner.createInvite();
    assert.ok(invite, "owner issued an invite");

    const joiner = await createMeshSync({
      doc: joinerDoc,
      postMessage: (m) => joinerMessages.push(m),
      storage: createMemoryStorage(),
      roomFor: () => {
        const id = joinerDoc.getMap("metadata").get("id");
        console.info(
          `[room-debug-joiner] roomFor -> ${String(id).slice(0, 8)}`,
        );
        return `noflo-ui:${id}`;
      },
      autostart: false,
    });
    await joiner.handleConfigure({
      ...joiner.config,
      enabled: true,
      interfaces: [
        {
          id: "loopback",
          type: "tcp",
          options: { host: HOST, port },
          enabled: true,
        },
      ],
    });

    joiner
      .startBootstrapJoin(invite.uri, {
        // Mirrors the Engine's adoptInvitedProject: the project identity is
        // adopted only once the grant verified (work document #25)
        onApproved: async (/** @type {any} */ project) => {
          console.info(
            `[room-debug-joiner] onApproved adopting ${String(project?.id ?? "none").slice(0, 8)}`,
          );
          adoptProjectIdentity(joinerDoc, String(project?.id ?? ""));
          await joiner.handleJoinedViaInvite();
        },
      })
      .catch((/** @type {any} */ err) =>
        console.warn("join threw:", err?.message ?? err),
      );

    // The owner approves the bootstrap knock when it surfaces
    try {
      await waitFor(
        sleep,
        () =>
          owner.joinRequests.some(
            (/** @type {any} */ r) => r.source === "bootstrap",
          ),
        30_000,
        "the bootstrap knock to surface on the owner",
      );
    } catch (err) {
      console.log("OWNER REQUESTS:", JSON.stringify(owner.joinRequests));
      console.log(
        "JOINER STAGES:",
        JSON.stringify(
          joinerMessages.filter((m) => m.kind === "mesh-bootstrap"),
        ),
      );
      console.log(
        "JOINER STATUS ERRORS:",
        JSON.stringify(
          joinerMessages.filter((m) => m.kind === "mesh-status" && m.error),
        ),
      );
      throw err;
    }
    const knocker = owner.joinRequests.find(
      (/** @type {any} */ r) => r.source === "bootstrap",
    );
    owner.resolveRequest({
      identityHash: knocker.identityHash,
      decision: "approved",
    });

    // The join completes through the bootstrap stage messages: "approved"
    // is the wire response, "granted" means the grant verified and the
    // project was adopted — rebind only after that
    await waitFor(
      sleep,
      () =>
        joinerMessages.some(
          (m) => m.kind === "mesh-bootstrap" && m.stage === "granted",
        ),
      60_000,
      "the joiner's grant to verify and the project to be adopted",
    );
    await joiner.rebind();

    // The grant landed on the joiner: grants map entry + wallet + anchor
    await waitFor(
      sleep,
      () => joinerDoc.getMap("grants").size > 0,
      90_000,
      "the handed-off grant to reach the joiner's grants map",
    );
    try {
      await waitFor(
        sleep,
        () =>
          joinerMessages.some(
            (m) =>
              m.kind === "mesh-dacar" &&
              m.projectId === projectId &&
              (m.wallet ?? []).length > 0,
          ),
        30_000,
        "the joiner's Dacar report for the invited project",
      );
    } catch (err) {
      console.log(
        "IDS: invited=%s joinerIdentity=%s",
        projectId,
        joiner.identityHash,
      );
      console.log(
        "DACAR REPORTS:",
        JSON.stringify(joinerMessages.filter((m) => m.kind === "mesh-dacar")),
      );
      console.log(
        "PEER EVENTS:",
        JSON.stringify(joinerMessages.filter((m) => m.kind === "mesh-peers")),
      );
      throw err;
    }
    const joinerReports = joinerMessages.filter(
      (m) => m.kind === "mesh-dacar" && m.projectId === projectId,
    );
    const joinerReport = joinerReports[joinerReports.length - 1];
    console.log(
      "BOOTSTRAP STAGES: %j",
      joinerMessages.filter(
        (m) =>
          m.kind === "mesh-bootstrap" || (m.kind === "mesh-status" && m.error),
      ),
    );
    console.log(
      "REPORT CHECK: invited=%s joinerIdentity=%s reports=%j",
      projectId,
      joiner.identityHash,
      joinerReports.map((r) => ({
        owner: r.anchor.owner,
        anchor: r.anchor.hash?.slice(0, 8),
        grants: r.grants.length,
        wallet: r.wallet.length,
      })),
    );
    assert.equal(joinerReport.anchor.owner, false, "joiner is a participant");
    assert.ok(
      joinerReport.wallet.length > 0,
      "joiner wallet catalogs the grant",
    );

    // Sync converges: content the owner writes reaches the joiner
    ownerDoc.getMap("doc").set("hello", "world");
    try {
      await waitFor(
        sleep,
        () => joinerDoc.getMap("doc").get("hello") === "world",
        90_000,
        "the joined doc to converge over mesh sync",
      );
    } catch (err) {
      console.log(
        "PEER EVENTS:",
        JSON.stringify(joinerMessages.filter((m) => m.kind === "mesh-peers")),
      );
      console.log(
        "SYNC EVENTS:",
        JSON.stringify(joinerMessages.filter((m) => m.kind === "mesh-status")),
      );
      console.log(
        "GRANTS: owner=%j joiner=%j",
        [...ownerDoc.getMap("grants").keys()],
        [...joinerDoc.getMap("grants").keys()],
      );
      throw err;
    }

    await owner.stop().catch(() => {});
    await joiner.stop().catch(() => {});
  });
});
