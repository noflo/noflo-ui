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
 *     "invite": "noflo://join/..."  // optional seed invite
 *   }
 */

import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as https from "node:https";
import * as path from "node:path";
import { createMaterializer } from "../materialization/watcher.js";
import { startEngine } from "../worker/engine.js";
import { bindFilePersistence, createFileStorage } from "./persistence.js";

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

  // Mesh: join the seed invite or announce, per the config
  if (config.invite) {
    engine.handle({
      type: "MESH",
      command: "join",
      payload: { invite: config.invite },
    });
  } else if (config.mesh) {
    engine.handle({
      type: "MESH",
      command: "configure",
      payload: { ...config.mesh, enabled: true },
    });
  }

  if ((config.port ?? 3000) > 0) {
    await serveUi(config.port ?? 3000, config.tls ?? {});
  }

  process.on("SIGINT", async () => {
    console.log("bridge  stopping");
    await persistence.destroy();
    engine.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("bridge failed:", error);
  process.exit(1);
});
