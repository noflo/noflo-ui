import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { CAPABILITY } from "@noflo/fbp-protocol";
import {
  addEdge,
  addNode,
  createGraph,
  createProjectDoc,
} from "../../src/crdt/ProjectDoc.js";
import { docToFileTree } from "../../src/materialization/fileTree.js";
import { bootRuntime, shutdownRuntime } from "../../src/node/runtimeBoot.js";
import {
  base64ToBytes,
  generateSalt,
  mintAuthorization,
  projectResource,
} from "../../src/worker/Dacar.js";
import { fromHex, Identity, toHex } from "../../vendor/reticulum-core.js";

/**
 * The runtime boot's integration (work document #47 slice 3): the same
 * boot the spawned child runs, in-process — with the Dacar binding
 * provisioned, the replica ingests pushed grants and the ASSEMBLED
 * runtime's capability policy resolves the peer's mask.
 */

const PROJECT = "boot-project-uuid";

/** Seeds and materializes a real project into a directory. */
function seedProject(dir) {
  const doc = createProjectDoc("boot");
  createGraph(doc, "main", "Main");
  const main = doc.getMap("graphs").get("main");
  addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
  addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
  for (const [file, content] of Object.entries(docToFileTree(doc))) {
    const target = path.join(dir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

describe("the runtime boot's Dacar wiring (work document #47 slice 3)", () => {
  it("the assembled runtime's policy resolves the pushed grants", {
    timeout: 60_000,
  }, async () => {
    const workDir = mkdtempSync(path.join(tmpdir(), "rt-boot-"));
    const projectDir = path.join(workDir, "project");
    const stateDir = path.join(workDir, "runtime-state");
    mkdirSync(projectDir, { recursive: true });
    seedProject(projectDir);

    // The anchor material: the harness stands in for the project owner
    const anchor = await Identity.generate();
    const salt = await generateSalt();
    const binding = {
      anchorHashHex: toHex(anchor.getSalt()),
      anchorPubkeyHex: toHex(await anchor.getPublicKey()),
      salt,
      projectId: PROJECT,
    };

    // The parent provisions the binding: the same file the manager writes
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      path.join(stateDir, "dacar.json"),
      JSON.stringify(binding, null, 2) + "\n",
    );
    const booted = await bootRuntime({
      folder: projectDir,
      stateDir,
      name: "boot-test-runtime",
      log: () => {},
    });
    assert.ok(booted.dacar, "the replica bound from the provisioned binding");

    // A developer peer is granted; the deltas PUSH (ingested through the
    // replica's receiver — the same entry the sync server's pushes land in)
    const peer = await Identity.generate();
    const peerHash = toHex(peer.getSalt());
    const grant = await mintAuthorization({
      anchorIdentity: anchor,
      subjectHex: peerHash,
      projectId: PROJECT,
      role: "developer",
      salt,
    });
    const applied = await booted.dacar.apply(base64ToBytes(grant.deltas));
    assert.ok(applied > 0, "the pushed batch ingests");

    // The ASSEMBLED runtime's policy — the one the server evaluates per
    // link — resolves the pushed grant
    const mask = await booted.runtime.server.capabilityPolicy(peerHash, {});
    assert.equal(
      mask & CAPABILITY.GRAPH_READ,
      CAPABILITY.GRAPH_READ,
      "the pushed grant reaches the server's policy",
    );
    assert.equal(
      mask & CAPABILITY.GRAPH_EDIT,
      CAPABILITY.GRAPH_EDIT,
      "the developer edits",
    );
    assert.equal(
      mask & CAPABILITY.ADMIN,
      0,
      "admin stays out of the role bridge",
    );

    // An ungranted stranger resolves deny-closed through the same policy
    const stranger = await Identity.generate();
    const strangerMask = await booted.runtime.server.capabilityPolicy(
      toHex(stranger.getSalt()),
      {},
    );
    assert.equal(strangerMask, 0);

    shutdownRuntime(booted);
    rmSync(workDir, { recursive: true, force: true });
  });

  it("boots deny-closed without a provisioned binding", {
    timeout: 60_000,
  }, async () => {
    const workDir = mkdtempSync(path.join(tmpdir(), "rt-boot-"));
    const projectDir = path.join(workDir, "project");
    mkdirSync(projectDir, { recursive: true });
    seedProject(projectDir);

    const booted = await bootRuntime({
      folder: projectDir,
      stateDir: path.join(workDir, "runtime-state"),
      name: "unprovisioned-runtime",
      log: () => {},
    });
    assert.equal(booted.dacar, null, "no replica without the binding");

    const peer = await Identity.generate();
    const mask = await booted.runtime.server.capabilityPolicy(
      toHex(peer.getSalt()),
      {},
    );
    assert.equal(mask, 0, "deny-closed until provisioned and restarted");

    shutdownRuntime(booted);
    rmSync(workDir, { recursive: true, force: true });
  });
});
