import assert from "node:assert/strict";
import net from "node:net";
import { describe, it } from "node:test";

import { createMemoryStorage } from "../../src/crdt/MeshConfig.js";
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
 * @param {{ meshStorage?: import("../../src/crdt/MeshConfig.js").AsyncStorage }} [options]
 *   A shared mesh storage emulates device persistence across reloads.
 * @returns {Promise<{ engine: any, posted: any[], send: (message: any) => void, stop: () => Promise<void> }>}
 */
async function bootEngine(options = {}) {
  /** @type {any[]} */
  const posted = [];
  /** @type {Array<(event: { data: any }) => void>} */
  const handlers = [];
  const engine = await startEngine(
    {
      postMessage: (/** @type {any} */ message) => posted.push(message),
      registerMessageHandler: (/** @type {any} */ handler) =>
        handlers.push(handler),
    },
    { meshStorage: options.meshStorage },
  );
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

    // Device persistence: the joiner's mesh config (identity, enabled
    // state, interfaces) survives a reload, exactly like IndexedDB does
    const joinerStorage = createMemoryStorage();
    const joiner = await bootEngine({ meshStorage: joinerStorage });
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

    // ---- Reload emulation: a fresh Engine with the same persisted doc ----
    // On reload the device boots a new Engine, loads the persisted project
    // into its doc, and starts the mesh against that state
    const joinerState = Y.encodeStateAsUpdate(joiner.engine.doc);
    await joiner.stop();

    // The reloaded device boots with the SAME device storage: same
    // identity, same enabled config (so its provider starts immediately
    // on the invited room), same project pointer
    const joiner2 = await bootEngine({ meshStorage: joinerStorage });
    Y.applyUpdate(joiner2.engine.doc, joinerState);
    // The reloaded device boots straight into its saved config: its
    // provider starts on the invited room immediately (no configure step)
    await waitFor(
      sleep,
      () =>
        joiner2.posted.some(
          (m) => m.kind === "mesh-status" && m.connected === true,
        ),
      90_000,
      "the reloaded joiner's mesh to boot and connect",
    );

    const mirror2 = new Y.Doc();
    for (const message of joiner2.posted) {
      if (message.kind === "y-sync") Y.applyUpdate(mirror2, message.update);
      else if (message.kind === "y-update") {
        Y.applyUpdate(mirror2, message.update);
      }
    }
    const watch2 = setInterval(() => {
      const latest = joiner2.posted.splice(0);
      for (const message of latest) {
        if (message.kind === "y-sync") Y.applyUpdate(mirror2, message.update);
        else if (message.kind === "y-update") {
          Y.applyUpdate(mirror2, message.update);
        }
      }
    }, 100);
    try {
      // Further edits flow after the reload
      ownerSend({
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "main",
          nodeId: "AfterReload",
          componentName: "noflo-core/Repeat",
          metadata: { x: 30, y: 40 },
        },
      });
      await waitFor(
        sleep,
        () =>
          mirror2
            .getMap("graphs")
            .get("main")
            ?.get("nodes")
            ?.has("AfterReload"),
        90_000,
        "post-reload edits to reach the reloaded device",
      );

      // And edits made on the reloaded device flow back to the owner
      joiner2.send({
        type: "INTENT",
        command: "addNode",
        payload: {
          graphId: "main",
          nodeId: "FromReloaded",
          componentName: "noflo-core/Repeat",
          metadata: { x: 50, y: 60 },
        },
      });
      const ownerMirror = new Y.Doc();
      for (const message of owner.posted) {
        if (message.kind === "y-sync")
          Y.applyUpdate(ownerMirror, message.update);
        else if (message.kind === "y-update") {
          Y.applyUpdate(ownerMirror, message.update);
        }
      }
      const watchOwner = setInterval(() => {
        const latest = owner.posted.splice(0);
        for (const message of latest) {
          if (message.kind === "y-sync") {
            Y.applyUpdate(ownerMirror, message.update);
          } else if (message.kind === "y-update") {
            Y.applyUpdate(ownerMirror, message.update);
          }
        }
      }, 100);
      try {
        await waitFor(
          sleep,
          () =>
            ownerMirror
              .getMap("graphs")
              .get("main")
              ?.get("nodes")
              ?.has("FromReloaded"),
          90_000,
          "the reloaded device's edits to reach the owner",
        );
      } finally {
        clearInterval(watchOwner);
      }
    } catch (err) {
      console.log(
        "JOINER2 STATUS: %j",
        joiner2.posted.filter((m) => m.kind === "mesh-status"),
      );
      console.log(
        "JOINER2 PEERS: %j",
        joiner2.posted.filter((m) => m.kind === "mesh-peers"),
      );
      console.log(
        "JOINER2 ROOM: %s",
        joiner2.posted.find((m) => m.kind === "mesh-config")?.room ?? "none",
      );
      throw err;
    } finally {
      clearInterval(watch2);
    }

    await owner.stop();
    await joiner2.stop();
  });
});
