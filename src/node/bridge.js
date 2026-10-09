#!/usr/bin/env node

/**
 * @file The NoFlo UI Companion (work documents #44 and #47): a Node
 * daemon running the engine headless — the same `startEngine` the browser
 * Worker runs, via the `handle` seam — with per-project materialization
 * keeping invited project folders in sync, file-backed persistence, an
 * HTTP(S) server handing the UI to browsers, an LXMF chatbot driving a
 * pi coding agent, and hub-mode mesh on-ramps.
 *
 * Multi-project (work document #47 scope item 2) mirrors the webapp's
 * model: process-level state (mesh identity, Dacar wallet, the
 * active-project pointer) lives in the Companion state dir; project
 * content lives in per-project workdirs. Switching projects restarts the
 * engine with the other scope — the daemon equivalent of the webapp's
 * page reload — while the process-level mesh node, LXMF layer, and chat
 * stay up.
 *
 * Usage:
 *   noflo-ui                       (zero-config: XDG defaults, first run
 *                                   writes a starter config)
 *   noflo-ui --config bridge.json  (power users, multi-instance setups)
 *
 * Config shape (`bridge.json`):
 *   {
 *     "name": "Companion",
 *     "folder": "./project",        // the active project's workdir
 *     "port": 3000,                 // UI serving port (0 = off)
 *     "host": "localhost",          // serving bind host
 *     "tls": { "cert": "...", "key": "..." },  // optional HTTPS
 *     "hub": { "port": 3569 },      // the WebSocket on-ramp; false = off
 *     "mesh": { ...mesh config, same shape the settings dialog manages },
 *     "invite": "noflo://join/...",  // optional seed invite
 *     "ownerIdentity": "<identity hash hex>",  // trust anchor; the LXMF
 *                                  // chat address derives from it
 *     "stateDir": "...",            // Companion state (registry, backups,
 *                                   // LXMF identity) — default XDG
 *     "piBin": "pi"                 // pi executable (discovered on PATH)
 *   }
 */

import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as https from "node:https";
import { createRequire } from "node:module";
import * as path from "node:path";
import { createBackupWriter } from "./backup.js";
import { createChatSurface } from "./chat.js";
import { claimInstructions, createClaimCode } from "./claim.js";

/** The blocking pi dialog methods (the pi-lxmf set); other
 * extension_ui_request methods (e.g. setStatus) are ignored. */
const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);

import { createMaterializer } from "../materialization/watcher.js";
import { startEngine } from "../worker/engine.js";
import { resolveCompanionPaths } from "./companionPaths.js";
import { attachInterfaces } from "./interfaces.js";
import { deriveDeliveryHash, startLxmfLayer } from "./lxmf.js";
import { bindFilePersistence, createFileStorage } from "./persistence.js";
import { createPiManager, discoverPi } from "./piManager.js";
import { assistantText } from "./piRpc.js";
import { PRIMER_FILENAME, primerFor } from "./primer.js";
import {
  loadProjectsRegistry,
  registerProject,
  removeProject,
  setActiveProject,
} from "./projects.js";

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
 * @param {string} host
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
 * Debounced: editors write in bursts. Returns the watcher so a project
 * switch can close it.
 *
 * @param {string} folder
 * @param {(path: string, content: string | null) => Promise<void>} handle
 * @returns {import("node:fs").FSWatcher}
 */
function watchFolder(folder, handle) {
  /** @type {NodeJS.Timeout | null} */
  let timer = null;
  /** @type {Map<string, string | null>} */
  const queued = new Map();
  return fsSync.watch(folder, { recursive: true }, (_event, file) => {
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

  // ---- Process-level state (the webapp's device-level split) ----
  // Mesh identity, Dacar wallet, and the active-project pointer live in
  // the Companion state dir — ONE mesh identity across all projects
  const stateDir = config.stateDir ?? resolved.stateDir;
  const meshStorage = createFileStorage(
    path.join(stateDir, "companion-mesh.json"),
  );

  // The process-owned Reticulum instance: built once, handed to every
  // project engine (work document #47, multi-project) and shared with the
  // LXMF layer — one mesh node. Interfaces attach here, not per engine
  const { Reticulum } = await import("../../vendor/reticulum-core.js");
  const rns = new Reticulum();

  // Interfaces: the stored mesh config (or the defaults), plus the hub
  // on-ramps. Attach directly to the process-owned instance
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
  await attachInterfaces(rns, meshConfig.interfaces);

  const piAvailable = await discoverPi({ piBin: config.piBin ?? "pi" });
  if (!piAvailable.available) {
    console.log("bridge  pi not found — the agent layer stays unavailable");
  }

  // ---- Per-project lifecycle ----
  /** @type {any} */
  let active = null;
  /** Whether a project transition is in progress (chat gate). */
  let switching = false;

  /**
   * Boots the engine for one project scope and wires its per-project
   * surfaces (persistence, backup, materializer, watcher, pi). Mirrors
   * the webapp's project load: engine start adopts the active pointer
   * from mesh storage, the room derives from the project identity, and
   * the process-level mesh node survives the swap.
   *
   * @param {{ folder: string }} project
   * @returns {Promise<any>}
   */
  async function startProject(project) {
    const folder = path.resolve(project.folder);
    await fs.mkdir(folder, { recursive: true });
    const docPath = path.join(folder, ".noflo-doc.bin");

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
      {
        name: config.name ?? "noflo-ui Companion",
        meshStorage,
        reticulum: rns,
      },
    );

    // File-backed persistence: the doc snapshot survives restarts. The
    // project id rides the mesh storage, so the next boot's
    // adoptProjectIdentity restores it onto the fresh doc
    const persistence = bindFilePersistence(engine.doc, docPath);
    await persistence.ready;
    const projectId = /** @type {string} */ (
      engine.doc.getMap("metadata").get("id")
    );
    meshStorage.set("activeProjectId", projectId).catch(() => {});
    console.log(`bridge  project ${projectId} (${folder})`);

    // Server-side CRDT backup (work document #47 scope item 5): snapshots
    // into the Companion state dir, never inside the project folder. Boot
    // and shutdown snapshot immediately; live changes debounce
    const backup = createBackupWriter({
      doc: engine.doc,
      dir: path.join(stateDir, "backups"),
      projectId,
    });
    backup.addEventListener("snapshot", (/** @type {any} */ e) =>
      console.log(`bridge  CRDT snapshot ${path.basename(e.detail.file)}`),
    );
    await backup.snapshotNow().catch(() => {});
    backup.start();

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
    const watcher = watchFolder(folder, async (relative, content) => {
      absorbing = true;
      try {
        await materializer.handleFileEvent(relative, content);
      } finally {
        absorbing = false;
      }
    });

    // pi: one supervised client per project (the workdir is the scope)
    /** @type {import("./piManager.js").PiManagerHandle | null} */
    let manager = null;
    if (piAvailable.available) {
      manager = createPiManager({
        workdir: folder,
        state: {
          get: (key) => meshStorage.get(`pi:${projectId}:${key}`),
          set: (key, value) => meshStorage.set(`pi:${projectId}:${key}`, value),
        },
        piBin: config.piBin ?? "pi",
        log: (msg) => console.log(msg),
      });
      chat?.setPi(manager);
      // Narration: pi lifecycle moments reach the owner as chat
      if (ownerContact) {
        manager.addEventListener("narration", (/** @type {any} */ e) => {
          lxmf
            ?.sendText(ownerContact, e.detail.text, {
              title: "Companion narration",
            })
            .catch(() => {});
        });
        // pi output is Markdown; the LXMF renderer field is already set,
        // so assistant replies render readably in the chat client
        manager.addEventListener("event", (/** @type {any} */ e) => {
          const event = e.detail;
          if (
            event?.type === "message_end" &&
            event.message?.role === "assistant"
          ) {
            const text = assistantText(event.message);
            if (text) {
              chat?.clearReaction();
              chat?.reply(text, "pi").catch(() => {});
            }
          }
          // Blocking dialogs hang the run with nobody at a terminal:
          // decline and note. pi also fires non-blocking requests (e.g.
          // setStatus on every startup) — those are ignored silently
          if (event?.type === "extension_ui_request") {
            const method = /** @type {string} */ (event.method);
            if (!DIALOG_METHODS.has(method)) return;
            manager?.client?.respondUi(event.id, { cancelled: true });
            chat
              ?.reply(
                `⛔ dismissed a dialog (${event.title ?? method}) — nobody is at a terminal.`,
                "pi",
              )
              .catch(() => {});
          }
        });
      }
    }

    // Mesh: the engine rebinds its provider onto the process-owned node.
    // The join boots the mesh with the stored config, so the transport
    // interfaces must be configured first — without them the knock times
    // out with "host path not resolved"
    engine.handle({
      type: "MESH",
      command: "configure",
      payload: { ...meshConfig, enabled: true },
    });
    // The mesh start is async: let the transport come up before the knock
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (config.invite) {
      // Seed invites join the active project (the knock is idempotent:
      // an already-granted project re-answers the handoff)
      engine.handle({
        type: "MESH",
        command: "join",
        payload: { invite: config.invite },
      });
    }

    // Registry: the project is now known by its CRDT identity
    registerProject(stateDir, {
      id: projectId,
      name:
        /** @type {string} */ (engine.doc.getMap("metadata").get("name")) ??
        "Untitled project",
      folder,
    });

    return {
      engine,
      persistence,
      backup,
      materializer,
      watcher,
      manager,
      folder,
      projectId,
    };
  }

  /**
   * Quiesces the active project: backup snapshot, pi stopped, watcher
   * closed, persistence flushed, engine stopped. The process-level mesh
   * node, LXMF layer, and chat stay up.
   *
   * @returns {Promise<void>}
   */
  async function stopProject() {
    if (!active) return;
    const current = active;
    active = null;
    chat?.setPi(null);
    current.backup.stop();
    await current.backup.snapshotNow().catch(() => {});
    current.manager?.stop();
    current.watcher.close();
    await current.persistence.destroy();
    current.engine.stop();
  }

  /**
   * Switches the active project: the daemon equivalent of the webapp's
   * page reload — the engine restarts with the other scope while the
   * process-level surfaces stay up.
   *
   * @param {string} projectId
   * @returns {Promise<string>} A report line for the chat surface.
   */
  async function switchProject(projectId) {
    if (switching) return "a project switch is already in progress";
    switching = true;
    try {
      const registry = loadProjectsRegistry(stateDir);
      const target = registry.projects.find((p) => p.id === projectId);
      if (!target) return `unknown project ${projectId}`;
      await stopProject();
      meshStorage.set("activeProjectId", projectId).catch(() => {});
      active = await startProject(target);
      setActiveProject(stateDir, projectId);
      return `switched to "${target.name}" (${target.folder})`;
    } finally {
      switching = false;
    }
  }

  // ---- Boot the active project ----
  // Resolution order mirrors the webapp: the stored active pointer first,
  // then the config folder (registered on first sight), else a fresh
  // project in the config folder
  const configFolder = path.resolve(
    config.folder ?? resolved.defaults.folder ?? "./project",
  );
  const registry = loadProjectsRegistry(stateDir);
  const activeProject = registry.projects.find(
    (p) => p.id === registry.activeProjectId,
  ) ??
    registry.projects.find((p) => p.folder === configFolder) ?? {
      id: "new",
      name: "Untitled project",
      folder: configFolder,
    };
  active = await startProject(activeProject);

  if ((config.port ?? resolved.defaults.port) > 0) {
    await serveUi(
      config.port ?? resolved.defaults.port,
      config.tls ?? {},
      config.host ?? resolved.defaults.host,
    );
  }

  // ---- The agent layer (work document #44 M2) ----
  // LXMF: the always-on, addressable endpoint. Rides the process-owned
  // Reticulum stack (one mesh node, work document #47); the identity
  // lives in the Companion state dir, outside any project folder
  // The owner Reticulum identity hash IS the global trust anchor; the chat
  // address derives from it — one config value, two uses (SPEC: "the owner
  // identity is the default global trust anchor", work document #44 M2)
  const ownerContact = config.ownerIdentity
    ? await deriveDeliveryHash(config.ownerIdentity)
    : null;
  /** @type {Awaited<ReturnType<typeof startLxmfLayer>> | null} */
  let lxmf = null;
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
  const chat = createChatSurface({
    ownerContact,
    sendText: lxmf.sendText,
    sendReaction: lxmf.sendReaction,
    verifySender: lxmf.verifySender,
    pi: active?.manager ?? null,
    state: {
      get: (key) => meshStorage.get(`pi:${active?.projectId}:${key}`),
      set: (key, value) =>
        meshStorage.set(`pi:${active?.projectId}:${key}`, value),
    },
    // Bridge-level commands (multi-project, work document #47 scope
    // item 2) dispatch before the built-ins
    commands:
      /** @type {Record<string, (argument: string) => Promise<string | void>>} */ ({
        projects: async () => {
          const current = loadProjectsRegistry(stateDir);
          const lines = current.projects.map(
            (
              /** @type {{ id: string, name: string, folder: string }} */ p,
              index,
            ) => {
              const marker = p.id === active?.projectId ? " (active)" : "";
              return `${index + 1}. ${p.name}${marker} — ${p.folder}`;
            },
          );
          return lines.length > 0 ? lines.join("\n") : "no registered projects";
        },
        switch: async (argument) => {
          const index = Number.parseInt(argument, 10) - 1;
          const current = loadProjectsRegistry(stateDir);
          const target = Number.isInteger(index)
            ? current.projects[index]
            : current.projects.find((p) => p.id !== active?.projectId);
          if (!target) return "no project to switch to — /projects lists them";
          if (target.id === active?.projectId) return "already active";
          return switchProject(target.id);
        },
        leave: async () => {
          if (!active) return "no active project";
          const name = active.projectId;
          await stopProject();
          removeProject(stateDir, name);
          return `left ${name} — the workdir on disk was not touched; /projects and /switch pick up another one`;
        },
      }),
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
            chat.setOwnerContact(contact);
            console.log(
              `bridge  claimed by ${identityHash} — ownerIdentity written to ${configPath}`,
            );
            await lxmf.sendText(
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
    chat.handleInbound(event).catch(() => {});
  });

  // Hello world: the boot announce to the owner contact (work document
  // #44 bootstrap)
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
      "bridge  no ownerIdentity configured — the Companion is unclaimed; send the claim code below to become the owner",
    );
  }

  process.on("SIGINT", async () => {
    console.log("bridge  stopping");
    await stopProject();
    lxmf?.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("bridge failed:", error);
  process.exit(1);
});
