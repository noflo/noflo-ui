#!/usr/bin/env node
/**
 * @file The on-demand NoFlo runtime's child entrypoint (work document #47
 * item 3, the mesh-replica design ratified in #59): one sandboxed Node.js
 * subprocess per project. Thin argument parsing over the boot module —
 * the assembly lives in `runtimeBoot.js` so the integration tests
 * exercise the same boot the spawned process runs.
 */

import process from "node:process";
import { bootRuntime, shutdownRuntime } from "./runtimeBoot.js";

/** Parses `--key value` pairs; unknown keys are ignored loudly. */
function parseArgs(argv) {
  const args = /** @type {Record<string, string>} */ ({});
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      console.error(`runtime  argument --${key} carries no value`);
      process.exit(1);
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

const log = (message) => console.log(`runtime  ${message}`);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const folder = args.folder;
  const stateDir = args.state;
  const name = args.name ?? "noflo-runtime";
  const interfaces = args.interfaces ? JSON.parse(args.interfaces) : [];
  if (!folder || !stateDir) {
    console.error("runtime  --folder and --state are required");
    process.exit(1);
  }

  const booted = await bootRuntime({ folder, stateDir, name, interfaces, log });

  const shutdown = () => {
    log("shutting down");
    shutdownRuntime(booted);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error(`runtime  failed: ${error?.message ?? error}`);
  process.exit(1);
});
