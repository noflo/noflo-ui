/**
 * @file The on-demand runtime's boot (work document #47 item 3, the
 * mesh-replica design ratified in #59): the assembly the child entrypoint
 * runs, extracted so the integration tests exercise the same boot the
 * spawned process does — identity, mesh join, the Dacar replica, the
 * graph and catalog loads, the assembled runtime bound and announcing.
 *
 * The boot's authorization plane: when the parent provisions a Dacar
 * binding (`<stateDir>/dacar.json` — the anchor material and the Privacy
 * Salt, the local-and-automatic bootstrap work document #59 describes),
 * the runtime is a Dacar replica — the RnsSyncServer binds on its RNS,
 * pushes arrive as grants change, and the capability policy resolves
 * per-link masks from the project's grants. Without a binding the runtime
 * boots deny-closed: it serves nothing until a binding is provisioned and
 * the process restarts.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FileStorageAdapter } from "@reticulum/node";
import { RnsSyncServer } from "@reticulum/dacar/transport";
import { GraphModel } from "@noflo/graph";
import { Flowtrace } from "@noflo/noflo";
import { assembleTraceFileFromRecorder } from "@noflo/fbp-protocol";
import {
  assembleRuntime,
  bindReticulum,
} from "@noflo/runtime";
import { Identity, Reticulum } from "../../vendor/reticulum-core.js";
import { toEntityCanonical } from "../materialization/entityCanonical.js";
import {
  buildRuntimeDacar,
  runtimeCapabilityPolicy,
} from "./runtimeDacar.js";
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
 * runtime serves from the Two-Step Cache, with the declared kind
 * vocabulary (work document #25: subgraph by graph presence, elementary
 * by code buffer, stub otherwise).
 *
 * @param {string} folder
 * @returns {Promise<{ signatures: () => Record<string, any> }>}
 */
async function loadCatalog(folder) {
  const componentsDir = path.join(folder, "components");
  const graphsDir = path.join(folder, "graphs");
  /** @type {Record<string, any>} */
  const signatures = {};
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

/**
 * Loads the provisioned Dacar binding, or null: the binding file the
 * parent writes into the state directory carries the anchor material and
 * the Privacy Salt (the local-and-automatic bootstrap, work document #59).
 *
 * @param {string} stateDir
 * @returns {Promise<{ anchorHashHex: string, anchorPubkeyHex: string, salt: string, projectId: string } | null>}
 */
async function loadDacarBinding(stateDir) {
  try {
    const binding = JSON.parse(
      await readFile(path.join(stateDir, "dacar.json"), "utf8"),
    );
    if (
      typeof binding.anchorHashHex === "string" &&
      typeof binding.anchorPubkeyHex === "string" &&
      typeof binding.salt === "string" &&
      typeof binding.projectId === "string"
    ) {
      return binding;
    }
    return null;
  } catch {
    // No binding provisioned: the runtime boots deny-closed
    return null;
  }
}

/**
 * Boots the runtime stack: identity, mesh join, the Dacar replica when a
 * binding is provisioned, the graphs and catalog loads, the assembled
 * runtime bound and announcing.
 *
 * @param {Object} options
 * @param {string} options.folder The project's working directory.
 * @param {string} options.stateDir The runtime's state directory.
 * @param {string} [options.name] The announce node name.
 * @param {Array<{ type: string, options?: any, enabled?: boolean }>} [options.interfaces]
 *   The mesh interface list; empty selects the shared-instance +
 *   AutoInterface defaults.
 * @param {(message: string) => void} [options.log] The boot's log channel.
 * @returns {Promise<any>} The booted runtime stack.
 */
export async function bootRuntime({ folder, stateDir, name = "noflo-runtime", interfaces = [], log = () => {} }) {
  // The runtime's own long-term identity — persisted under the runtime
  // state directory, never inside the project (the Companion-state rule)
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

  // The Dacar replica: when the parent provisioned a binding, the runtime
  // ingests pushed grants and its capability policy resolves per-link
  // masks; without one, deny-closed — it serves nothing until provisioned
  const dacarBinding = await loadDacarBinding(stateDir);
  /** @type {ReturnType<typeof buildRuntimeDacar> | null} */
  let dacar = null;
  /** @type {any} */
  let capabilityPolicy = async () => 0;
  /** @type {RnsSyncServer | null} */
  let syncServer = null;
  if (dacarBinding) {
    dacar = buildRuntimeDacar(dacarBinding);
    syncServer = await RnsSyncServer.create({
      identity,
      receiver: dacar.receiver,
      rns,
    });
    capabilityPolicy = runtimeCapabilityPolicy({
      engine: dacar.engine,
      projectResource: `noflo-ui:project:${dacarBinding.projectId}`,
    });
    log(
      `dacar replica bound (project ${dacarBinding.projectId}, sync endpoint announcing)`,
    );
  } else {
    log("no Dacar binding provisioned — deny-closed until provisioned and restarted");
  }

  const models = await loadGraphs(folder);
  const graph =
    models.values().next().value ?? /** @type {any} */ (new GraphModel());
  const catalog = await loadCatalog(folder);

  // The trace recorder (work document #43's .flowtrace/ convention): every
  // network the host builds records into it — the export goes through the
  // parent (the sandbox denies the child's file writes)
  const flowtrace = new Flowtrace({
    runtimeMetadata: { name, type: "noflo-runtime" },
  });

  const runtime = await assembleRuntime({
    graph,
    catalog,
    capabilityPolicy,
    flowtrace,
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

  return { rns, identity, runtime, binding, dacar, syncServer, destinationHash, flowtrace, name };
}

/**
 * Exports the recorded trace to the parent: one structured stdout line
 * carrying the JSON state (always serializes) and the binary stream
 * base64-encoded (best-effort, per work document #43 update #19's
 * dual-dump convention modeled on the noflo-jekyll CI). The parent's
 * manager parses the line and writes the files — the sandbox denies the
 * child's own file writes.
 *
 * @param {{ flowtrace: any, name: string }} booted
 * @param {string} runName The run identifier (e.g. the network's name or
 *   a timestamp).
 */
export function exportTrace(
  booted,
  runName,
  /** @type {(message: string) => void} */ log = (/** @type {string} */ _m) => {},
) {
  const state = booted?.flowtrace?.toJSON?.();
  if (!state) return;
  /** @type {{ kind: string, run: string, json: any, binary?: string }} */
  const payload = {
    kind: "flowtrace-export",
    run: runName || booted.name || "runtime",
    json: state,
  };
  // The binary is best-effort: a payload the msgpack encoder cannot
  // carry must not take the artifact down with it (the noflo-jekyll
  // dual-dump convention)
  try {
    const binary = assembleTraceFileFromRecorder(state);
    payload.binary = Buffer.from(binary).toString("base64");
  } catch (error) {
    const message =
      /** @type {any} */ (error)?.message ?? String(error ?? "unknown");
    log(`trace binary export failed: ${message}`);
  }
  // The single-line export: the manager's pipe reader collects it
  console.log(`runtime  flowtrace-export ${JSON.stringify(payload)}`);
}

/**
 * The graceful shutdown: the binding stops announcing, the sync server
 * detaches.
 *
 * @param {{ binding: import("@noflo/runtime").ReticulumBinding, syncServer: RnsSyncServer | null }} booted
 */
export function shutdownRuntime(booted) {
  try {
    booted.binding?.stop();
  } catch {
    // Best-effort on the shutdown path
  }
}
