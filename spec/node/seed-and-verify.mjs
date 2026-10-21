/**
 * @file The on-demand runtime's end-to-end verification (work document #47
 * item 3): seed and materialize a real project, spawn the sandboxed
 * runtime child through the manager's provisioning shape, and discover it
 * with the production `@noflo/runtime-client` — through the shared rnsd
 * instance when one runs (the transport-node relay on this machine).
 *
 * Plain node — not node:test: this is the live-session harness, run by
 * hand (`node spec/node/seed-and-verify.mjs`).
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileStorageAdapter } from "@reticulum/node";
import {
  addEdge,
  addIIP,
  addNode,
  createGraph,
  createProjectDoc,
  ensureComponent,
  setComponentSignature,
} from "../../src/crdt/ProjectDoc.js";
import { docToFileTree } from "../../src/materialization/fileTree.js";
import { attachInterfaces } from "../../src/node/interfaces.js";
import { Identity, Reticulum } from "../../vendor/reticulum-core.js";
import { discoverRuntime } from "../../vendor/runtime-client.js";

const workDir = mkdtempSync(path.join(tmpdir(), "rt-e2e-"));
const projectDir = path.join(workDir, "project");
mkdirSync(projectDir, { recursive: true });

// Seed + materialize a real project
const doc = createProjectDoc("demo");
createGraph(doc, "main", "Main");
const main = doc.getMap("graphs").get("main");
addNode(main, "Read", "fs/ReadFile", { x: 10, y: 20 });
addNode(main, "Log", "core/Output", { x: 200, y: 80 });
addEdge(main, { node: "Read", port: "out" }, { node: "Log", port: "in" });
addIIP(main, "file.txt", { node: "Read", port: "source" });
setComponentSignature(doc, "fs/ReadFile", {
  inports: [{ name: "source" }],
  outports: [{ name: "out" }],
});
ensureComponent(doc, "mylib/Parse", { name: "mylib/Parse" });
setComponentSignature(doc, "mylib/Parse", {
  inports: [{ name: "in", type: "string" }],
  outports: [{ name: "out" }],
});
const tree = docToFileTree(doc);
for (const [file, content] of Object.entries(tree)) {
  const target = path.join(projectDir, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}
console.log("materialized:", Object.keys(tree).length, "files");

// The runtime child through the manager: the parent resolves the mesh
// attachment (the shared rnsd on this machine) and spawns with the
// ratified permission profile
const { createRuntimeManager } = await import(
  "../../src/node/runtimeManager.js"
);
const stateDir = path.join(workDir, "runtime-state");
const manager = createRuntimeManager({
  folder: projectDir,
  stateDir,
  name: "e2e-runtime",
  log: (message) => console.log("CHILD>", message),
});
const childHandle = manager.start();

try {
  await childHandle;
  console.log("VERTICAL: runtime ready");
  // The discovery client joins AFTER the child is up: its own RNS through
  // the shared rnsd instance (the transport-node relay on this machine)
  const peerIdentity = await Identity.loadOrGenerate(
    new FileStorageAdapter(path.join(workDir, "peer-state")),
  );
  const clientRns = new Reticulum();
  // Shared-only: the failed AutoInterface attempt (the rnsd holds the
  // LAN port) wedges the loop — the join rides the shared relay alone
  const { getSharedInstanceEndpoint } = await import(
    "@reticulum/node/src/interfaces/local_client.js"
  );
  const endpoint = getSharedInstanceEndpoint({});
  await attachInterfaces(clientRns, [
    {
      type: "shared",
      options: {
        host: endpoint.host,
        port: endpoint.port,
        socketPath: endpoint.socketPath,
      },
      enabled: true,
    },
  ]);
  const found = await discoverRuntime({
    reticulum: clientRns,
    timeoutMs: 30_000,
    nodeName: "e2e-runtime",
    solicit: true,
  });
  console.log("DISCOVERED:", found.nodeName);
  console.log("E2E OK");
} catch (error) {
  console.log("E2E FAILED:", error.message);
} finally {
  await manager.stop();
  setTimeout(() => {
    rmSync(workDir, { recursive: true, force: true });
    process.exit(0);
  }, 1000);
}
