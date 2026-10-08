/**
 * Bridge spike (work document #44, Phase A spike): boots the engine in bare
 * Node and drives it through the headless seam — no browser, no Worker.
 *
 * Usage:
 *   node utils/bridge-spike.mjs [--name <name>] [--add-node <name>=<component>]
 *                               [--announce] [--config <mesh-config.json>]
 *                               [--invite <noflo://join/...>]
 *
 * - Default: boots a solo project, adds one node as an intent, prints the
 *   echoes. Proves the engine + dispatch run headless.
 * - `--announce`: enables mesh sync with the interfaces from `--config`
 *   (same shape the settings dialog manages), so the bridge becomes a
 *   visible peer.
 * - `--invite`: joins a live session instead. Peers, identity, and grants
 *   stream through the same echoes the Glass consumes.
 */

import { startEngine } from "../src/worker/engine.js";
import { projectGraph } from "../src/glass/projectView.js";
import { readFileSync } from "node:fs";

/** @type {Record<string, string>} */
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith("--")) continue;
  const key = argv[i].slice(2);
  const next = argv[i + 1];
  // Valueless flags (--announce, --verbose) get true: the following
  // --flag is not consumed as their value
  if (next === undefined || next.startsWith("--")) {
    args[key] = true;
  } else {
    args[key] = next;
    i += 1;
  }
}

const KIND_PAD = 12;
const verbose = process.argv.includes("--verbose");
const log = (kind, message) =>
  console.log(`${kind.padEnd(KIND_PAD)} ${JSON.stringify(message)}`);

/** The echo surface: the Glass's console channel, pretty-printed. The
 * replica traffic (y-update / y-sync) and heartbeats hide behind
 * --verbose: the interesting echoes are progress, graph, mesh, system. */
const io = {
  postMessage: (message) => {
    const kind = `${message.protocol ?? "system"}/${message.command ?? message.kind ?? "?"}`;
    if (
      !verbose &&
      (message.kind === "y-update" ||
        message.kind === "y-sync" ||
        message.command === "heartbeat")
    ) {
      return;
    }
    log(kind, message.payload ?? message);
  },
  registerMessageHandler: (handler) => {
    inbound = handler;
  },
};

/** @type {(message: any) => void} */
let inbound = () => {};

/** In-memory mesh storage: the spike does not persist (work document #44's
 * persistence gap — a file-backed adapter is an M1 decision). */
const meshStorage = {
  /** @type {Map<string, any>} */
  store: new Map(),
  async get(key) {
    return this.store.get(key) ?? null;
  },
  async set(key, value) {
    this.store.set(key, value);
  },
};

const engine = await startEngine(io, {
  name: args.name ?? "Bridge spike",
  meshStorage,
});

console.log(`bridge-spike  project ${String(engine.doc.getMap("metadata").get("id")).slice(0, 8)}  doc nodes: ${engine.doc.getMap("graphs").size}`);

// Replica observability (work document #44): a debounced projection of the
// bridge's doc — this is where remote CRDT changes become visible. The
// awareness stream is ephemeral drag telemetry (work document #38); node
// metadata rides the CRDT sync as y-updates, which the default log filters
let printTimer = null;
engine.doc.on("update", () => {
  if (printTimer) return;
  printTimer = setTimeout(() => {
    printTimer = null;
    const view = projectGraph(engine.doc, "main");
    const nodes = Object.entries(view?.processes ?? {}).map(
      ([id, p]) => `${id}(${p.component} @ ${p.metadata?.x ?? 0},${p.metadata?.y ?? 0})`,
    );
    log("replica", {
      graph: "main",
      nodes,
      edges: view?.connections?.length ?? 0,
    });
  }, 500);
});



// Prove the intent seam: a graph mutation with no browser involved.
if (args["add-node"]) {
  const [name, component] = args["add-node"].split("=");
  inbound({
    type: "INTENT",
    command: "addNode",
    payload: {
      graphId: "main",
      nodeId: name,
      componentName: component ?? "core/Hello",
      metadata: { x: 120, y: 120 },
    },
  });
}

// Mesh: either announce as a standalone peer, or join a live session.
// The join boots the mesh with the engine's CURRENT config, so the
// interface must be configured first — without one the bridge announces
// into the void and the bootstrap knock times out with "host path not
// resolved". Defaults to the same public entry point the browsers use.
const meshConfig = args.config
  ? JSON.parse(readFileSync(args.config, "utf8"))
  : {
      interfaces: [
        {
          id: "spike-ws",
          type: "websocket",
          options: { url: args.entry ?? "wss://cloud.lille-oe.de" },
          enabled: true,
        },
      ],
      webrtc: { enabled: false, autoConnect: true, rtcConfig: {} },
    };
const wait = (/** @type {number} */ ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

if (args.announce || args.invite) {
  inbound({
    type: "MESH",
    command: "configure",
    payload: { ...meshConfig, enabled: true },
  });
  // The mesh start is async: let the transport come up before the knock,
  // so the join's path request races nothing
  await wait(1500);
}
if (args.invite) {
  inbound({
    type: "MESH",
    command: "join",
    payload: { invite: args.invite },
  });
}

// Stay up: the announce loop and mesh traffic keep the process alive.
process.on("SIGINT", () => {
  console.log("bridge-spike  stopping");
  engine.stop();
  process.exit(0);
});
