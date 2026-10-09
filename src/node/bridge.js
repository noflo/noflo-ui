#!/usr/bin/env node

/**
 * @file The noflo-ui bridge (work document #44, M1): a Node daemon running
 * the engine headless — the same `startEngine` the browser Worker runs,
 * via the `handle` seam — with the materializer keeping a project folder
 * in sync, file-backed persistence, and an HTTP(S) server handing the UI
 * to browsers on the network (off-localhost serving must be HTTPS:
 * the Reticulum identity code requires a secure context).
 *
 * The agent layer (pi, LXMF chat — work document #44's M2) rides the same
 * process later; this entry is the whole M1 surface.
 *
 * Usage:
 *   node src/node/bridge.js --config bridge.json
 *
 * Config shape (`bridge.json`):
 *   {
 *     "folder": "./project",       // the materialized project folder
 *     "port": 3000,                 // HTTP serving port (0 = off)
 *     "tls": { "cert": "...", "key": "..." },  // optional HTTPS
 *     "mesh": { ...mesh config, same shape the settings dialog manages },
 *     "invite": "noflo://join/...",  // optional seed invite
 *     "ownerIdentity": "<identity hash hex>",  // the owner's Reticulum
 *                                  // identity — trust anchor; the LXMF
 *                                  // chat address derives from it
 *     "stateDir": "./companion-state",  // Companion state (LXMF identity)
 *     "piBin": "pi"                 // pi executable (discovered on PATH)
 *   }
 */

import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as https from "node:https";
import * as path from "node:path";
import { createMaterializer } from "../materialization/watcher.js";
import { startEngine } from "../worker/engine.js";
import { createChatSurface } from "./chat.js";
import { attachInterfaces } from "./interfaces.js";
import { deriveDeliveryHash, startLxmfLayer } from "./lxmf.js";
import { bindFilePersistence, createFileStorage } from "./persistence.js";
import { createPiManager, discoverPi } from "./piManager.js";
import { PRIMER_FILENAME, primerFor } from "./primer.js";

const ROOT = path.resolve(import.meta.dirname, "../..");

/** @type {Record<string, string>} */
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

/**
 * Minimal static file server: the UI handed to LAN browsers. Path
 * traversal is resolved against ROOT; directories resolve to their index
 * page.
 *
 * @param {number} port
 * @param {{ cert?: string, key?: string }} tls
 * @returns {Promise<void>}
 */
function serveUi(port, tls) {
  const handler = (/** @type {any} */ req, /** @type {any} */ response) => {
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "local"}`,
    );
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const file = path.resolve(ROOT, rel || "index.html");
    if (!file.startsWith(ROOT)) {
      response.writeHead(403).end();
      return;
    }
    fsSync.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
      });
      response.end(data);
    });
  };
  const server =
    tls?.cert && tls?.key
      ? https.createServer(
          {
            cert: fsSync.readFileSync(path.resolve(ROOT, tls.cert)),
            key: fsSync.readFileSync(path.resolve(ROOT, tls.key)),
          },
          handler,
        )
      : http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(
        `bridge  UI served on http${tls?.cert ? "s" : ""}://localhost:${port}`,
      );
      resolve();
    });
  });
}

/**
 * The project folder watcher: file events read the content and feed the
 * materializer. `fs.watch` recursive covers macOS, Windows, and current
 * Linux Node; chokidar is the robustness upgrade if platforms complain.
 * Debounced: editors write in bursts.
 *
 * @param {string} folder
 * @param {(path: string, content: string | null) => Promise<void>} handle
 * @returns {void}
 */
function watchFolder(folder, handle) {
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Map<string, string | null>} */
  const queued = new Map();
  fsSync.watch(folder, { recursive: true }, (_event, file) => {
    if (!file) return;
    const relative = file.replaceAll("\\", "/");
    queued.set(relative, null);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      for (const [relativePath] of queued) {
        queued.delete(relativePath);
        fs.readFile(path.join(folder, relativePath), "utf8")
          .then((content) => handle(relativePath, content))
          .catch(() => handle(relativePath, null));
      }
    }, 200);
  });
}

/** The daemon entry. */
async function main() {
  /** The engine's inbound dispatch lands here; the daemon drives the
   * engine through `engine.handle` instead (work document #44). */
  /** @type {(message: any) => void} */
  let inbound = () => {};
  const argv = process.argv.slice(2);
  const configIndex = argv.indexOf("--config");
  const configPath =
    configIndex > -1 ? path.resolve(argv[configIndex + 1]) : null;
  if (!configPath) {
    console.error("usage: node src/node/bridge.js --config bridge.json");
    process.exit(1);
  }
  const config = JSON.parse(fsSync.readFileSync(configPath, "utf8"));
  const folder = path.resolve(config.folder ?? "./project");
  const docPath = path.join(folder, ".noflo-doc.bin");

  await fs.mkdir(folder, { recursive: true });
  const meshStorage = createFileStorage(path.join(folder, ".noflo-mesh.json"));

  const engine = await startEngine(
    {
      postMessage: (message) => {
        const kind = `${message.protocol ?? "system"}/${message.command ?? message.kind ?? "?"}`;
        if (
          message.kind === "y-update" ||
          message.kind === "y-sync" ||
          message.command === "heartbeat"
        ) {
          return;
        }
        console.log(
          `${kind.padEnd(14)} ${JSON.stringify(message.payload ?? message)}`,
        );
      },
      registerMessageHandler: (handler) => {
        inbound = handler;
      },
    },
    { name: config.name ?? "noflo-ui bridge", meshStorage },
  );

  // File-backed persistence: the doc snapshot survives restarts. The
  // project id rides the mesh storage, so the next boot's
  // adoptProjectIdentity restores it onto the fresh doc
  const persistence = bindFilePersistence(engine.doc, docPath);
  await persistence.ready;
  meshStorage
    .set("activeProjectId", engine.doc.getMap("metadata").get("id"))
    .catch(() => {});

  // The materializer: CRDT → folder, folder → intents through the seam
  const materializer = createMaterializer({
    doc: engine.doc,
    fs: {
      writeFile: async (file, content) => {
        await fs.mkdir(path.dirname(path.join(folder, file)), {
          recursive: true,
        });
        await fs.writeFile(path.join(folder, file), content);
      },
      remove: async (file) => {
        await fs.rm(path.join(folder, file)).catch(() => {});
      },
    },
    emitIntent: (intent) => engine.handle(intent),
    onDiagnostic: (file, diagnostic) => {
      console.error(`materializer  ${file}: ${diagnostic}`);
    },
  });

  // Remote CRDT changes → absorb: rewrite the folder, advance the snapshot
  let absorbing = false;
  engine.doc.on("update", () => {
    if (absorbing) return;
    absorbing = true;
    materializer
      .absorbRemote()
      .catch((error) => console.error("Absorption failed:", error))
      .finally(() => {
        absorbing = false;
      });
  });

  await materializer.materialize();

  // The agent primer: context provisioning for file-based tools (work
  // document #44 M2). A pre-existing AGENTS.md is never overwritten
  // (work document #43 update #4 overlay rule)
  const primer = primerFor({
    exists: (file) => fsSync.existsSync(path.join(folder, file)),
  });
  if (primer !== null) {
    await fs.writeFile(path.join(folder, PRIMER_FILENAME), primer);
    console.log(`bridge  primer written to ${PRIMER_FILENAME}`);
  }

  // The folder watcher: edits stream back as intents (the snapshot
  // advanced at absorption, so the bridge's own writes diff to nothing)
  watchFolder(folder, async (relative, content) => {
    absorbing = true;
    try {
      await materializer.handleFileEvent(relative, content);
    } finally {
      absorbing = false;
    }
  });

  // Mesh: join the seed invite or announce, per the config. The join
  // boots the mesh with the stored config, so the transport interfaces
  // must be configured first — without them the knock times out with
  // "host path not resolved". The defaults: the shared rnsd instance and
  // AutoInterface, per the Node interface wiring (work document #44)
  const meshConfig = config.mesh ?? {};
  if (!meshConfig.interfaces || meshConfig.interfaces.length === 0) {
    meshConfig.interfaces = [
      { id: "bridge-shared", type: "shared", options: {}, enabled: true },
      {
        id: "bridge-auto",
        type: "autointerface",
        options: { name: "auto" },
        enabled: true,
      },
    ];
  }
  engine.handle({
    type: "MESH",
    command: "configure",
    payload: { ...meshConfig, enabled: true },
  });
  // The mesh start is async: let the transport come up before the knock
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (config.invite) {
    engine.handle({
      type: "MESH",
      command: "join",
      payload: { invite: config.invite },
    });
  }

  if ((config.port ?? 3000) > 0) {
    await serveUi(config.port ?? 3000, config.tls ?? {});
  }

  // ---- The agent layer (work document #44 M2) ----
  // LXMF: the always-on, addressable endpoint. Rides the engine's shared
  // Reticulum stack (one mesh node, work document #47); the identity lives
  // in the Companion's state dir, outside any project folder
  const stateDir =
    config.stateDir ?? path.join(path.dirname(configPath), "companion-state");
  // The owner Reticulum identity hash IS the global trust anchor; the chat
  // address derives from it — one config value, two uses (SPEC: "the owner
  // identity is the default global trust anchor", work document #44 M2)
  const ownerContact = config.ownerIdentity
    ? await deriveDeliveryHash(config.ownerIdentity)
    : null;
  /** @type {ReturnType<typeof createChatSurface> | null} */
  let chat = null;
  /** @type {Awaited<ReturnType<typeof startLxmfLayer>> | null} */
  let lxmf = null;
  const piAvailable = await discoverPi({ piBin: config.piBin ?? "pi" });
  if (!piAvailable.available) {
    console.log("bridge  pi not found — the agent layer stays unavailable");
  }
  let manager = null;
  if (piAvailable.available) {
    manager = createPiManager({
      workdir: folder,
      state: {
        get: (key) => meshStorage.get(`pi:${key}`),
        set: (key, value) => meshStorage.set(`pi:${key}`, value),
      },
      piBin: config.piBin ?? "pi",
      log: (msg) => console.log(msg),
    });
  }
  const rns = engine.getReticulum();
  if (rns) {
    lxmf = await startLxmfLayer({
      rns,
      stateDir,
      name: config.name ?? "noflo-ui Companion",
      log: (msg) => console.log(msg),
    });
    console.log(`bridge  LXMF delivery destination ${lxmf.deliveryHash}`);
    if (manager) {
      chat = createChatSurface({
        ownerContact,
        sendText: lxmf.sendText,
        verifySender: lxmf.verifySender,
        pi: manager,
        state: {
          get: (key) => meshStorage.get(`pi:${key}`),
          set: (key, value) => meshStorage.set(`pi:${key}`, value),
        },
        log: (msg) => console.log(msg),
      });
      lxmf.onMessage((event) => {
        chat?.handleInbound(event).catch(() => {});
      });
      // Narration: pi lifecycle moments reach the owner as chat
      if (ownerContact) {
        manager.addEventListener("narration", (/** @type {any} */ e) => {
          lxmf
            ?.sendText(ownerContact, e.detail.text, {
              title: "Companion narration",
            })
            .catch(() => {});
        });
      }
    }
    // Hello world: the boot announce to the owner contact (work document
    // #44 bootstrap). Once #47's unclaimed/claim-code mode lands, this
    // branch becomes the claimed path of it
    if (ownerContact) {
      lxmf
        .sendText(
          ownerContact,
          `Companion "${config.name ?? "noflo-ui Companion"}" is running.\nLXMF delivery: ${lxmf.deliveryHash}\npi: ${piAvailable.version ?? "not found"}`,
          { title: "Companion hello" },
        )
        .then(() => console.log(`bridge  hello world sent to ${ownerContact}`))
        .catch((error) =>
          console.log(`bridge  hello world failed: ${error.message}`),
        );
    } else {
      console.log(
        "bridge  no ownerIdentity configured — no hello world; the chat surface stays dormant (unclaimed mode per work document #47 arrives later)",
      );
    }
  } else {
    console.log("bridge  mesh not started — the LXMF layer stays offline");
  }

  process.on("SIGINT", async () => {
    console.log("bridge  stopping");
    manager?.stop();
    lxmf?.stop();
    await persistence.destroy();
    engine.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("bridge failed:", error);
  process.exit(1);
});
