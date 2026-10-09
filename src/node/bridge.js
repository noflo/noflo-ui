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
 *   noflo-ui                       (zero-config: XDG defaults, first run
 *                                   writes a starter config)
 *   noflo-ui --config bridge.json  (power users, multi-instance setups)
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
import { createRequire } from "node:module";
import * as path from "node:path";
import { createMaterializer } from "../materialization/watcher.js";
import { startEngine } from "../worker/engine.js";
import { createChatSurface } from "./chat.js";

/** The blocking pi dialog methods (the pi-lxmf set); other
 * extension_ui_request methods (e.g. setStatus) are ignored. */
const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);

import { claimInstructions, createClaimCode } from "./claim.js";
import { resolveCompanionPaths } from "./companionPaths.js";
import { attachInterfaces } from "./interfaces.js";
import { deriveDeliveryHash, startLxmfLayer } from "./lxmf.js";
import { bindFilePersistence, createFileStorage } from "./persistence.js";
import { createPiManager, discoverPi } from "./piManager.js";
import { assistantText } from "./piRpc.js";
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
function serveUi(port, tls, host = "localhost") {
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
    server.listen(port, host, () => {
      console.log(
        `bridge  UI served on http${tls?.cert ? "s" : ""}://${host}:${port}`,
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
  // Zero-configuration defaults (work document #47 scope item 8): the
  // XDG config path is auto-created on first run; --config stays for
  // power users and multiple-Companion setups
  const resolved = resolveCompanionPaths({
    configPath: configIndex > -1 ? path.resolve(argv[configIndex + 1]) : null,
  });
  const configPath = resolved.configPath;
  const config = resolved.exists
    ? JSON.parse(fsSync.readFileSync(configPath, "utf8"))
    : {};
  if (!resolved.exists) {
    console.log(`bridge  started with a fresh config at ${configPath}`);
  }
  const folder = path.resolve(
    config.folder ?? resolved.defaults.folder ?? "./project",
  );
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
  // Hub mode (work document #44 M3, SPEC auto-detect defaults): a
  // WebSocketServer on ws://localhost:3569 ("flow" in T9, like
  // noflo-nodejs) — the zero-config mesh on-ramp for webapps on this
  // machine. Deliberate binding: explicit `hub` config controls it
  // (host, port, TLS); `hub: false` turns it off. LAN needs TLS, so
  // non-localhost stays deliberate config
  if (config.hub !== false) {
    const hub = typeof config.hub === "object" ? config.hub : {};
    const already = (/** @type {string} */ type) =>
      meshConfig.interfaces.some(
        (/** @type {any} */ iface) => iface.type === type,
      );
    if (!already("websocketserver")) {
      meshConfig.interfaces.push({
        id: "bridge-hub",
        type: "websocketserver",
        options: {
          listenIp: hub.listen ?? config.host ?? resolved.defaults.host,
          listenPort: hub.port ?? 3569,
          ...(hub.tls ? { ssl: true, ...hub.tls } : {}),
        },
        enabled: true,
      });
    }
    // The TCP sibling: Node-side tools (pi's rngit skills, other
    // reticulum-js processes) attach to the same stack as clients.
    // Deliberate config (`hub.tcp`), never a default: the shared rnsd
    // instance is the Node-side on-ramp when one runs
    if (hub.tcp && !already("tcp")) {
      meshConfig.interfaces.push({
        id: "bridge-hub-tcp",
        type: "tcp",
        options: {
          listen: true,
          listen_ip: hub.tcp.listen ?? "localhost",
          port: hub.tcp.port ?? 4242,
        },
        enabled: true,
      });
    }
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

  if ((config.port ?? resolved.defaults.port) > 0) {
    await serveUi(
      config.port ?? resolved.defaults.port,
      config.tls ?? {},
      config.host ?? resolved.defaults.host,
    );
  }

  // ---- The agent layer (work document #44 M2) ----
  // LXMF: the always-on, addressable endpoint. Rides the engine's shared
  // Reticulum stack (one mesh node, work document #47); the identity lives
  // in the Companion's state dir, outside any project folder
  const stateDir = config.stateDir ?? resolved.stateDir;
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
    // Unclaimed mode (work document #47 scope item 1): without a
    // configured owner the claim code is the only way in; the first
    // verified sender of the code becomes the owner, persisted to the
    // config file
    /** @type {string | null} */
    let claimCode = null;
    if (!ownerContact) {
      claimCode = createClaimCode();
      const instructions = await claimInstructions(
        claimCode,
        lxmf.deliveryHash,
        lxmf.identityHash,
        lxmf.identity.publicKey,
      );
      console.log(instructions);
    }
    chat = createChatSurface({
      ownerContact,
      sendText: lxmf.sendText,
      sendReaction: lxmf.sendReaction,
      verifySender: lxmf.verifySender,
      pi: manager,
      state: {
        get: (key) => meshStorage.get(`pi:${key}`),
        set: (key, value) => meshStorage.set(`pi:${key}`, value),
      },
      claim: claimCode
        ? {
            code: claimCode,
            onClaim: async (/** @type {string} */ identityHash) => {
              // The claimed owner: persist to the config file (the same
              // shape a power user would write), derive the contact, and
              // confirm over chat
              const configRaw = fsSync.readFileSync(configPath, "utf8");
              const parsed = JSON.parse(configRaw);
              parsed.ownerIdentity = identityHash;
              const tempPath = `${configPath}.claim-tmp`;
              fsSync.writeFileSync(
                tempPath,
                `${JSON.stringify(parsed, null, 2)}\n`,
              );
              fsSync.renameSync(tempPath, configPath);
              const contact = await deriveDeliveryHash(identityHash);
              chat?.setOwnerContact(contact);
              console.log(
                `bridge  claimed by ${identityHash} — ownerIdentity written to ${configPath}`,
              );
              await /** @type {any} */ (lxmf).sendText(
                contact,
                `You are now the owner of this Companion ("${config.name ?? "noflo-ui Companion"}").\npi: ${piAvailable.version ?? "not found"}\nSend /help for the command surface.`,
                { title: "Companion claimed" },
              );
            },
          }
        : undefined,
      senderIdentityHash: lxmf.senderIdentityHash,
      log: (msg) => console.log(msg),
    });
    lxmf.onMessage((event) => {
      chat?.handleInbound(event).catch(() => {});
    });
    // Narration: pi lifecycle moments reach the owner as chat
    if (ownerContact && manager) {
      manager.addEventListener("narration", (/** @type {any} */ e) => {
        lxmf
          ?.sendText(ownerContact, e.detail.text, {
            title: "Companion narration",
          })
          .catch(() => {});
      });
      // pi output is Markdown; the LXMF renderer field is already set, so
      // assistant replies render readably in the chat client
      manager.addEventListener("event", (/** @type {any} */ e) => {
        const event = e.detail;
        if (
          event?.type === "message_end" &&
          event.message?.role === "assistant"
        ) {
          const text = assistantText(event.message);
          if (text) {
            chat?.reply(text, "pi").catch(() => {});
          }
        }
        // Dialogs hang the run with nobody at a terminal: decline and note
        if (event?.type === "extension_ui_request") {
          manager.client?.respondUi(event.id, { cancelled: true });
          chat
            ?.reply(
              `⛔ dismissed a dialog (${event.title ?? event.method}) — nobody is at a terminal.`,
              "pi",
            )
            .catch(() => {});
        }
      });
    }
    // Hello world: the boot announce to the owner contact (work document
    // #44 bootstrap). Once #47's unclaimed/claim-code mode lands, this
    // branch becomes the claimed path of it
    if (ownerContact) {
      const pkg = JSON.parse(
        fsSync.readFileSync(path.join(ROOT, "package.json"), "utf8"),
      );
      // The installed noflo version (the exports map blocks the package.json
      // self-reference, and the main entry sits in a subdir, so ascend from
      // the resolved main until the owning package.json is found)
      let nofloVersion = pkg.dependencies?.noflo ?? "unknown";
      try {
        let dir = path.dirname(createRequire(import.meta.url).resolve("noflo"));
        for (let i = 0; i < 5; i++) {
          const manifest = path.join(dir, "package.json");
          if (fsSync.existsSync(manifest)) {
            const parsed = JSON.parse(fsSync.readFileSync(manifest, "utf8"));
            if (parsed.name === "noflo") {
              nofloVersion = parsed.version;
              break;
            }
          }
          const parent = path.dirname(dir);
          if (parent === dir) break;
          dir = parent;
        }
      } catch {
        /* keep the declared range */
      }
      lxmf
        .sendText(
          ownerContact,
          `Companion "${config.name ?? "noflo-ui Companion"}" is running.\nnoflo-ui ${pkg.version}, noflo ${nofloVersion}\nLXMF delivery: ${lxmf.deliveryHash}\npi: ${piAvailable.version ?? "not found"}`,
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
