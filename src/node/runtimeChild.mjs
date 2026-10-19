#!/usr/bin/env node
/**
 * @file The on-demand NoFlo runtime's child entrypoint (work document #47
 * scope item 3, ratified as a mesh replica — work document #47 update #11):
 * one sandboxed Node.js subprocess per project, speaking FBP Protocol 2.0
 * over Reticulum as a peer of the project's Dacar delta-sync mesh.
 *
 * The parent (the Companion's runtime manager) spawns this file with the
 * permission profile from work document #47 update #11: fs read on the
 * project folder (the materialized graphs and component signatures are the
 * runtime's inputs) and on the app root (the runtime's own modules), fs
 * write on the runtime state directory (the identity and the Dacar state
 * live outside the project — the Companion-state rule), and `--allow-net`
 * for Reticulum (the ratified, purposeful exception). Child processes,
 * worker threads, addons, FFI, inspector, and WASI stay denied.
 *
 * Slice 1 (this file): the vertical — identity, mesh join, the assembled
 * runtime stack announcing under the `fbp.runtime` aspect, discoverable by
 * `@noflo/runtime-client`. The authorization plane is deny-closed by
 * construction: the Dacar engine and its delta sync arrive with the next
 * slice, and the runtime serves nothing until a replica pushes grants.
 * The graph load (the canonical-forms conversion, work document #59's
 * found gap) is slice 2 — the runtime boots over an empty model.
 */

import process from "node:process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FileStorageAdapter } from "@reticulum/node";
import { GraphModel } from "@noflo/graph";
import {
  assembleRuntime,
  bindReticulum,
} from "@noflo/runtime";
import { Identity, Reticulum } from "../../vendor/reticulum-core.js";
import { toEntityCanonical } from "../materialization/entityCanonical.js";
import { attachInterfaces } from "./interfaces.js";

/**
 * Loads the project's graphs from the materialized folder and builds their
 * live models: each `graphs/<id>.graph.json` converts from the interchange
 * canonical into the entity-model form `GraphModel.fromCanonical` consumes
 * (the canonical-forms bridge, work document #59's found gap).
 *
 * @param {string} folder The project's working directory.
 * @returns {Promise<Map<string, import("@noflo/graph").GraphModel>>} The
 *   graph id to its live model.
 */
async function loadGraphs(folder) {
  const graphsDir = path.join(folder, "graphs");
  const models = new Map();
  const entries = await readdir(graphsDir).catch(() => []);
  for (const file of entries.filter((f) => f.endsWith(".graph.json"))) {
    const graphId = file.slice(0, -".graph.json".length);
    const text = await readFile(path.join(graphsDir, file), "utf8");
    const interchange = JSON.parse(text);
    models.set(
      graphId,
      GraphModel.fromCanonical(toEntityCanonical(interchange)),
    );
  }
  return models;
}

/**
 * The component catalog over the materialized signatures: the
 * `components/<module>/<name>.json` stubs are the declared surface the
 * runtime serves from the Two-Step Cache. The component SOURCE loading
 * (the actual implementations) arrives with the loader wiring — the
 * catalog alone makes the registry protocol truthful about what exists.
 *
 * @param {string} folder
 * @returns {Promise<{ signatures: () => Record<string, any> }>}
 */
async function loadCatalog(folder) {
  const componentsDir = path.join(folder, "components");
  const graphsDir = path.join(folder, "graphs");
  /** @type {Record<string, any>} */
  const signatures = {};
  // The project's graphs are subgraph components on the wire
  /** @type {Set<string>} */
  const graphNames = new Set(
    (await readdir(graphsDir).catch(() => []))
      .filter((f) => f.endsWith(".graph.json"))
      .map((f) => f.slice(0, -".graph.json".length)),
  );
  const modules = await readdir(componentsDir).catch(() => []);
  for (const moduleName of modules) {
    const moduleDir = path.join(componentsDir, moduleName);
    const files = await readdir(moduleDir).catch(() => []);
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const name = `${moduleName}/${file.slice(0, -".json".length)}`;
      try {
        const stub = JSON.parse(
          await readFile(path.join(moduleDir, file), "utf8"),
        );
        // The declared kind (work document #25's shared vocabulary):
        // subgraph when a project graph carries the name, elementary when
        // a code buffer materialized, stub otherwise
        let code = null;
        try {
          code = await readFile(
            path.join(componentsDir, `${file.slice(0, -".json".length)}.js`),
            "utf8",
          );
        } catch {
          // No code buffer: the stub state
        }
        const kind = graphNames.has(name)
          ? "subgraph"
          : code !== null
            ? "elementary"
            : "stub";
        signatures[name] = {
          type: kind,
          in: (stub.inports ?? []).map((/** @type {any} */ p) => ({
            id: p.name,
            type: p.type ?? "all",
          })),
          out: (stub.outports ?? []).map((/** @type {any} */ p) => ({
            id: p.name,
            type: p.type ?? "all",
          })),
        };
      } catch {
        // A malformed stub is skipped — the editor owns component authoring
      }
    }
  }
  return { signatures: () => signatures };
}

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

  // The runtime's own long-term identity — persisted under the runtime
  // state directory, never inside the project (work document #47's
  // Companion-state rule)
  const identity = await Identity.loadOrGenerate(
    new FileStorageAdapter(stateDir),
  );
  const identityHash = Array.from(identity.identityHash ?? new Uint8Array())
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  log(`identity ${identityHash}`);

  log("booting rns");
  const rns = new Reticulum();
  log("rns up");
  await attachInterfaces(rns, interfaces);
  log("interfaces attached");

  // The authorization plane is deny-closed in slice 1: every peer resolves
  // to an empty capability mask. Slice 2 wires the Dacar engine over the
  // delta-synced state (work document #59's Dacar management section) —
  // the runtime then serves exactly what its grants say, nothing more.
  const denyClosedPolicy = async () => 0;

  // The graphs load from the materialized folder; the FIRST graph (the
  // sorted main) is the runtime's served graph — the multi-graph serving
  // and the 0x10 CRDT sync arrive with the Dacar slice
  const models = await loadGraphs(folder);
  const graph =
    models.values().next().value ?? /** @type {any} */ (new GraphModel());
  const catalog = await loadCatalog(folder);

  const runtime = await assembleRuntime({
    graph,
    catalog,
    capabilityPolicy: denyClosedPolicy,
  });
  const binding = await bindReticulum({
    runtime,
    reticulum: rns,
    identity,
    nodeName: name,
  });
  await binding.start();

  const destinationHash =
    binding.destination?.destinationHash != null
      ? Array.from(binding.destination.destinationHash)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : "pending";
  // The machine-ready line the manager awaits
  log(`ready destinationHash=${destinationHash}`);

  const shutdown = () => {
    log("shutting down");
    try {
      binding.stop();
    } catch {
      // The binding's stop is best-effort on the shutdown path
    }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => {
  console.error(`runtime  failed: ${error?.message ?? error}`);
  process.exit(1);
});
