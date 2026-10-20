/**
 * @file The on-demand NoFlo runtime's manager (work document #47 scope
 * item 3): the Companion-side lifecycle for the per-project mesh-replica
 * runtime. One sandboxed Node.js subprocess per project, spawned on user
 * request, discovered by the browser's `@noflo/runtime-client` over the
 * mesh.
 *
 * The permission profile is work document #47 update #11's ratified shape:
 * fs read on the project folder and the app root (the child's own
 * modules), fs write on the runtime state directory (the identity and
 * Dacar state live outside the project), and `--allow-net` for Reticulum
 * — the ratified, purposeful exception. Child processes, worker threads,
 * addons, FFI, inspector, and WASI stay denied by omission. The child's
 * environment is filtered at spawn time (the permission model does not
 * scope environment variables).
 */

import { spawn } from "node:child_process";
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";

import process from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FileStorageAdapter, LocalClientInterface } from "@reticulum/node";
import { getSharedInstanceEndpoint } from "@reticulum/node/src/interfaces/local_client.js";
import { toHex } from "../../vendor/reticulum-core.js";
import { Identity } from "../../vendor/reticulum-core.js";

/** The child entrypoint, resolved from this module's own location. */
const CHILD_PATH = fileURLToPath(
  new URL("./runtimeChild.mjs", import.meta.url),
);
/** The app root: every module the child imports lives under it. */
const APP_ROOT = path.resolve(path.dirname(CHILD_PATH), "..", "..");

/**
 * Realpaths a path that may not exist yet: the deepest existing ancestor
 * is resolved and the remaining segments appended — the permission model
 * evaluates real paths, and the runtime state directory is created on
 * first boot.
 *
 * @param {string} target
 * @returns {string}
 */
function realPathFor(target) {
  try {
    return realpathSync(target);
  } catch (error) {
    if (/** @type {any} */ (error)?.code !== "ENOENT") throw error;
    const parent = path.dirname(target);
    if (parent === target) return target;
    return path.join(realPathFor(parent), path.basename(target));
  }
}

/**
 * @typedef {"stopped" | "starting" | "running" | "exited" | "failed"} RuntimeStatus
 */

/**
 * @param {Object} options
 * @param {string} options.folder The project's working directory.
 * @param {string} options.stateDir The runtime's state directory (identity,
 *   Dacar state) — outside the project per the Companion-state rule.
 * @param {string} [options.name] The runtime's node name in announces.
 * @param {Array<{ type: string, options?: any, enabled?: boolean }>} [options.interfaces]
 *   The mesh interface list; the same shape the mesh config carries.
 * @param {{ anchorHashHex: string, anchorPubkeyHex: string, salt: string, projectId: string, mintGrant?: (subjectHash: string) => Promise<{ deltas: string }> } | null} [options.dacar]
 *   The project's Dacar binding: when provided, the manager provisions
 *   the child's state directory with it (the parent-provisions shape —
 *   the sandbox denies first-touch writes) and the runtime boots as a
 *   Dacar replica; when absent, the runtime boots deny-closed.
 * @param {string} [options.nodeBin] The Node executable; defaults to this
 *   process's own.
 * @param {(message: string) => void} [options.log] The narration channel.
 * @returns {{
 *   status: () => RuntimeStatus,
 *   start: () => Promise<void>,
 *   stop: () => Promise<void>,
 *   events: EventTarget,
 * }}
 */
export function createRuntimeManager({
  folder,
  stateDir,
  name = "noflo-runtime",
  interfaces = [],
  dacar = null,
  nodeBin = process.execPath,
  log = () => {},
}) {
  /** @type {import("node:child_process").ChildProcess | null} */
  let child = null;
  /** @type {RuntimeStatus} */
  let status = "stopped";
  /** The ready-line awaiter, resolved once the child announces itself. */
  /** @type {((value?: void | PromiseLike<void>) => void) | null} */
  let readyResolve = null;
  const events = new EventTarget();
  /** @type {(type: string, detail: any) => void} */
  const emit = (type, detail) => {
    events.dispatchEvent(
      new CustomEvent(type, /** @type {CustomEventInit} */ ({ detail })),
    );
  };
  const setStatus = (/** @type {RuntimeStatus} */ next) => {
    status = next;
    emit("status", { status: next });
  };

  /** The filtered environment (work document #47 update #8). */
  const childEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: process.env.NODE_ENV,
  };

  function wireOutput(/** @type {import("node:stream").Readable | null} */ stream) {
    if (!stream) return;
    stream.setEncoding("utf8");
    let buffer = "";
    stream.on("data", (/** @type {string} */ chunk) => {
      buffer += chunk;
      let index = buffer.indexOf("\n");
      while (index !== -1) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        if (line.length > 0) {
          log(line);
          // The flowtrace export (work document #43's .flowtrace/
          // convention): the child serializes its recorder state; the
          // manager writes the files — the parent-provisions shape
          if (line.includes("flowtrace-export ")) {
            try {
              const payload = JSON.parse(
                line.slice(line.indexOf("flowtrace-export ") + "flowtrace-export ".length),
              );
              const traceDir = path.join(folder, ".flowtrace");
              mkdirSync(traceDir, { recursive: true });
              if (payload.run && payload.json) {
                writeFileSync(
                  path.join(traceDir, `${payload.run}.json`),
                  JSON.stringify(payload.json),
                );
                if (payload.binary) {
                  writeFileSync(
                    path.join(traceDir, `${payload.run}.trace`),
                    Buffer.from(payload.binary, "base64"),
                  );
                }
              }
            } catch (error) {
              const message =
                /** @type {any} */ (error)?.message ?? String(error ?? "unknown");
              log(`trace export write failed: ${message}`);
            }
          }
          if (/ready destinationHash=/.test(line) && readyResolve) {
            readyResolve();
            readyResolve = null;
          }
        }
      }
    });
  }

  return {
    status: () => status,

    /**
     * Spawns the sandboxed child and waits for its ready line.
     *
     * @returns {Promise<void>}
     */
    async start() {
      if (status === "running" || status === "starting") return;
      setStatus("starting");
      // The state directory must EXIST before the grants are computed:
      // the permission model resolves each requested path's real path, and
      // a read under a non-existent granted directory is denied outright.
      // The paths themselves resolve through the /var→/private/var symlink
      mkdirSync(stateDir, { recursive: true });
      const realState = realpathSync(path.resolve(stateDir));
      // Pre-provision the runtime's long-term identity HERE: today's Node
      // permission model denies every first-touch operation (creating a
      // file inside a granted directory is denied — the real-path
      // resolution needs an existing target), so the unconfined parent
      // generates the identity and the child reads the existing file. The
      // parent-provisions/child-consumes shape is the sandbox reality the
      // later exploration (the maintainer's note) may relax.
      await Identity.loadOrGenerate(new FileStorageAdapter(realState));
      // The Dacar binding provisioned alongside the identity: the child's
      // boot reads it and joins as a Dacar replica. The runtime's own
      // identity is pre-generated here (the parent-provisions shape: the
      // sandbox denies the child's first-touch writes) and the anchor
      // mints a grant for it — the child's link policy then allows
      if (dacar) {
        const { writeFile } = await import("node:fs/promises");
        const provisioning = /** @type {any} */ ({ ...dacar });
        // Pre-generate the runtime's identity: the parent generates and
        // saves it, the child reads the existing file
        const runtimeIdentity = await Identity.loadOrGenerate(
          new FileStorageAdapter(realState),
        );
        const runtimeHash = toHex(runtimeIdentity.identityHash ?? new Uint8Array());
        provisioning.runtimeIdentityHash = runtimeHash;
        // The anchor mints a grant for the runtime's identity: the
        // runtime is a project participant (the developer role — it
        // serves the graph and executes)
        if (dacar.mintGrant) {
          try {
            const grant = await dacar.mintGrant(runtimeHash);
            provisioning.initialGrant = grant.deltas;
            log(`runtime identity ${runtimeHash.slice(0, 8)} granted`);
          } catch (error) {
            const message = /** @type {any} */ (error)?.message ?? String(error);
            log(`runtime grant minting failed: ${message}`);
          }
        }
        await writeFile(
          path.join(realState, "dacar.json"),
          JSON.stringify(provisioning, null, 2) + "\n",
        );
      }
      const realFolder = realPathFor(path.resolve(folder));
      const appRoot = realpathSync(APP_ROOT);
      // The shared rnsd instance's discovery reads the user's Reticulum
      // config (share_instance + endpoint) and connects to its socket or
      // port — the child joins the mesh through that relay when it runs
      // (work document #47 scope item 8's zero-config default)
      const reticulumDir = process.env.HOME
        ? path.join(process.env.HOME, ".reticulum")
        : null;
      // The mesh attachment resolves PARENT-SIDE: the child's sandbox
      // denies the shared-instance discovery's existence probes (the
      // permission model throws on ungranted and missing paths alike), so
      // the unconfined parent does the discovery and hands the child an
      // explicit interface list. The shared rnsd is the transport-node
      // relay this JS core lacks itself — used when it runs, never
      // required: the fallback is AutoInterface LAN discovery.
      let interfaceList = interfaces;
      if (!interfaceList?.length) {
        const endpoint = getSharedInstanceEndpoint({});
        interfaceList =
          endpoint.shareInstance && (endpoint.host || endpoint.socketPath)
            ? [
                {
                  type: "shared",
                  options: {
                    host: endpoint.host,
                    port: endpoint.port,
                    socketPath: endpoint.socketPath,
                  },
                  enabled: true,
                },
              ]
            : [
                {
                  type: "autointerface",
                  options: { name: "auto" },
                  enabled: true,
                },
              ];
      }
      const readyPromise = new Promise((resolve, reject) => {
        readyResolve = resolve;
        setTimeout(() => {
          if (readyResolve === resolve) {
            readyResolve = null;
            reject(new Error("the runtime did not become ready in 30s"));
          }
        }, 30_000);
      });
      child = spawn(
        nodeBin,
        [
          "--permission",
          `--allow-fs-read=${realFolder}`,
          `--allow-fs-read=${appRoot}`,
          `--allow-fs-read=${realState}`,
          `--allow-fs-write=${realState}`,
          ...(reticulumDir ? [`--allow-fs-read=${reticulumDir}`] : []),
          "--allow-net",
          CHILD_PATH,
          "--folder",
          realFolder,
          "--state",
          realState,
          "--name",
          name,
          "--interfaces",
          JSON.stringify(interfaceList),
        ],
        {
          env: childEnv,
          cwd: appRoot,
          // The ESM loader's package.json resolution walk is permission-
          // gated: the child's cwd is the app root, so every bare-specifier
          // resolution reads inside the granted tree
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      wireOutput(child.stdout);
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (/** @type {string} */ chunk) => {
        for (const line of chunk.split("\n")) {
          if (line.length > 0) log(line);
        }
      });
      child.on("exit", (code, signal) => {
        child = null;
        setStatus(status === "starting" ? "failed" : "exited");
        emit("narration", {
          text:
            code === 0 || signal === "SIGTERM"
              ? "The runtime stopped."
              : `The runtime exited with ${signal ?? `code ${code}`}.`,
        });
      });
      return readyPromise.then(() => setStatus("running"));
    },

    /**
     * Stops the child gracefully; SIGKILL after a grace period.
     *
     * @returns {Promise<void>}
     */
    stop() {
      if (!child) return Promise.resolve();
      const running = child;
      return new Promise((resolve) => {
        const killTimer = setTimeout(() => {
          running.kill("SIGKILL");
        }, 5000);
        running.on("exit", () => {
          clearTimeout(killTimer);
          resolve();
        });
        running.kill("SIGTERM");
      });
    },

    events,
  };
}
