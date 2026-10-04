import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";

import { startEngine } from "../../src/worker/engine.js";
import * as Y from "../../vendor/yjs.js";

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
 * Boots an Engine with captured messages and a sendable handler, mirroring
 * how app.js wires the worker.
 *
 * @returns {Promise<{ engine: any, posted: any[], send: (message: any) => void, stop: () => Promise<void> }>}
 */
async function bootEngine() {
  /** @type {any[]} */
  const posted = [];
  /** @type {Array<(event: { data: any }) => void>} */
  const handlers = [];
  const engine = await startEngine({
    postMessage: (/** @type {any} */ message) => posted.push(message),
    registerMessageHandler: (/** @type {any} */ handler) =>
      handlers.push(handler),
  });
  return {
    engine,
    posted,
    send: (/** @type {any} */ message) => handlers[0]?.(message),
    stop: engine.stop,
  };
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
    await sleep(250);
  }
}

describe("engine-level join E2E over a TCP loopback (work document #25)", () => {
  it("joins by invite through the Engine and converges", {
    timeout: 180_000,
  }, async () => {
    const sleep = (/** @type {number} */ ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const port = await getFreePort();

    const owner = await bootEngine();
    const ownerSend = owner.send;
    ownerSend({
      type: "MESH",
      command: "configure",
      payload: {
        enabled: true,
        interfaces: [
          {
            id: "loopback",
            type: "tcp",
            options: { listen: true, port },
            enabled: true,
          },
        ],
      },
    });
    await waitFor(
      sleep,
      () =>
        owner.posted.some((m) => m.kind === "mesh-config" && m.config?.enabled),
      30_000,
      "the owner's mesh to boot",
    );

    ownerSend({ type: "MESH", command: "createInvite" });
    await waitFor(
      sleep,
      () => owner.posted.some((m) => m.kind === "mesh-invite" && m.uri),
      30_000,
      "the owner's invite",
    );
    const invite = owner.posted.find((m) => m.kind === "mesh-invite").uri;

    const joiner = await bootEngine();
    joiner.send({
      type: "MESH",
      command: "configure",
      payload: {
        enabled: true,
        interfaces: [
          {
            id: "loopback",
            type: "tcp",
            options: { host: HOST, port },
            enabled: true,
          },
        ],
      },
    });
    await waitFor(
      sleep,
      () =>
        joiner.posted.some(
          (m) => m.kind === "mesh-config" && m.config?.enabled,
        ),
      30_000,
      "the joiner's mesh to boot",
    );

    // The Engine's joinProject: runs the bootstrap flow and, once the grant
    // verifies, adopts the project, materializes it, and rebinds the mesh
    joinerSendAndWaitForGrant(joiner);
    async function joinerSendAndWaitForGrant(/** @type {any} */ joinerEngine) {
      joinerEngine.send({ type: "MESH", command: "join", payload: { invite } });
    }

    // The owner approves the bootstrap knock when it surfaces
    await waitFor(
      sleep,
      () =>
        owner.posted.some(
          (m) =>
            m.kind === "mesh-requests" &&
            (m.requests ?? []).some(
              (/** @type {any} */ r) => r.source === "bootstrap",
            ),
        ),
      60_000,
      "the bootstrap knock to surface on the owner",
    );
    const requests = owner.posted.find((m) => m.kind === "mesh-requests");
    const knocker = [...(requests?.requests ?? [])].pop();
    ownerSend({
      type: "MESH",
      command: "resolveRequest",
      payload: { identityHash: knocker.identityHash, decision: "approved" },
    });

    // The joiner's grant verifies and the project is adopted (the granted
    // stage) — the Engine materializes the project and rebinds the mesh
    await waitFor(
      sleep,
      () =>
        joiner.posted.some(
          (m) => m.kind === "mesh-bootstrap" && m.stage === "granted",
        ),
      60_000,
      "the joiner's grant to verify and the project to be adopted",
    );

    // The mesh rebinding after materialization is asynchronous (the
    // Engine's rebind chains through the persistence sync); wait for the
    // joiner's provider to actually connect before asserting convergence
    try {
      await waitFor(
        sleep,
        () =>
          joiner.posted.some(
            (m) => m.kind === "mesh-status" && m.connected === true,
          ),
        60_000,
        "the joiner's mesh to connect",
      );
    } catch (err) {
      console.log(
        "JOINER STATUS: %j",
        joiner.posted.filter((m) => m.kind === "mesh-status"),
      );
      console.log(
        "JOINER CONFIG ROOM: %j",
        joiner.posted
          .filter((m) => m.kind === "mesh-config")
          .map((m) => m.room),
      );
      console.log(
        "JOINER DACAR: %j",
        joiner.posted.filter((m) => m.kind === "mesh-dacar"),
      );
      console.log(
        "JOINER BOOTSTRAP: %j",
        joiner.posted.filter((m) => m.kind === "mesh-bootstrap"),
      );
      throw err;
    }

    // Convergence: content the owner edits reaches the joiner's replica.
    // The joiner's mirror is built exactly like the Glass's: full state
    // first, then incrementals
    const mirror = new Y.Doc();
    for (const message of joiner.posted) {
      if (message.kind === "y-sync") Y.applyUpdate(mirror, message.update);
      else if (message.kind === "y-update")
        Y.applyUpdate(mirror, message.update);
    }
    const watch = setInterval(() => {
      const latest = joiner.posted.splice(0);
      for (const message of latest) {
        if (message.kind === "y-sync") Y.applyUpdate(mirror, message.update);
        else if (message.kind === "y-update") {
          Y.applyUpdate(mirror, message.update);
        }
      }
    }, 100);
    try {
      ownerSend({
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "main",
          nodeId: "Joined",
          componentName: "noflo-core/Repeat",
          metadata: { x: 10, y: 20 },
        },
      });
      await waitFor(
        sleep,
        () => mirror.getMap("graphs").get("main")?.get("nodes")?.has("Joined"),
        90_000,
        "the owner's edit to reach the joiner's replica over mesh sync",
      );
    } catch (err) {
      clearInterval(watch);
      console.log(
        "JOINER PEERS: %j",
        joiner.posted.filter((m) => m.kind === "mesh-peers"),
      );
      console.log("GRANTS: owner=%j joiner=%j", [
        ...mirror.getMap("grants").keys(),
      ]);
      throw err;
    }
    clearInterval(watch);

    await owner.stop();
    await joiner.stop();
  });
});
