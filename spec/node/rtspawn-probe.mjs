import { mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRuntimeManager } from "../../src/node/runtimeManager.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const workDir = await mkdtemp(path.join(tmpdir(), "rtspawn2-"));
const manager = createRuntimeManager({
  folder: path.join(workDir, "project"),
  stateDir: path.join(workDir, "state"),
  name: "probe-child",
  log: (message) => console.log("M>", message),
});
// Debug: inherit stdio instead of pipes by patching the spawn via env-free
// direct invocation — actually just run with pipes but ALSO mirror the
// child's output as it arrives (the manager logs each line)
const timer = setTimeout(() => {
  console.log("TIMEOUT — dumping status:", manager.status());
  manager.stop().then(() => process.exit(1));
}, 30_000);
try {
  await manager.start();
  console.log("READY — status:", manager.status());
  clearTimeout(timer);
  await manager.stop();
  console.log("STOPPED — status:", manager.status());
  process.exit(0);
} catch (error) {
  clearTimeout(timer);
  console.log("START FAILED:", error.message);
  await manager.stop().catch(() => {});
  process.exit(1);
}
