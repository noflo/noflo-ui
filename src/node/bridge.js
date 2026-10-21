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
 *     "seedInvite": "noflo://join/...",  // optional seed invite
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

import { LocalClientInterface } from "@reticulum/node";
import { toHex } from "../../vendor/reticulum-core.js";
import { deriveDeliveryHash } from "../lxmf/protocol.js";
import { startEngine } from "../worker/engine.js";
import { resolveCompanionPaths } from "./companionPaths.js";
import { attachInterfaces } from "./interfaces.js";
import { startLxmfPlane } from "./lxmf.js";
import { bindFilePersistence, createFileStorage } from "./persistence.js";
import { createPiManager, discoverPi } from "./piManager.js";
import { assistantText } from "./piRpc.js";
import { PRIMER_FILENAME, primerFor } from "./primer.js";
import { wireProjectFolder } from "./projectFolder.js";
import {
  loadProjectsRegistry,
  registerProject,
  removeProject,
  setActiveProject,
} from "./projects.js";
import { createRuntimeManager } from "./runtimeManager.js";

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
    fsSync.stat(file, (statError, stat) => {
      if (statError) {
        response.writeHead(404).end("not found");
        return;
      }
      // A dev server serving live files: heuristic caching twice
      // stranded the browser on a stale vendor bundle. ETag =
      // mtime+size, always revalidated — efficient AND always fresh.
      const etag = `"${stat.size}-${stat.mtimeMs}"`;
      if (req.headers["if-none-match"] === etag) {
        response.writeHead(304);
        response.end();
        return;
      }
      fsSync.readFile(file, (readError, data) => {
        if (readError) {
          response.writeHead(404).end("not found");
          return;
        }
        response.writeHead(200, {
          "content-type":
            MIME[path.extname(file)] ?? "application/octet-stream",
          "cache-control": "no-cache",
          etag,
        });
        response.end(data);
      });
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

/** The daemon entry. */
async function main() {
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
  // project engine (work document #47, multi-project) and carrying the
  // LXMF plane — one mesh node, one identity (work document #67). The
  // boot discipline is pi-lxmf's: persistent transport state in the
  // companion state dir, a bz2 compression provider for Resources, and
  // `ready()` settled before the identity loads and anything announces
  const { Reticulum, Identity } = await import(
    "../../vendor/reticulum-core.js"
  );
  const { FileStorageAdapter } = await import("@reticulum/node");
  const { createBz2 } = await import("../worker/bz2.js");
  const rns = new Reticulum({
    storageAdapter: new FileStorageAdapter(path.join(stateDir, "storage")),
    compressionProvider: await createBz2(),
  });
  await rns.ready();
  // The Companion's single identity: loaded or generated in the RNS
  // storage — the ONE source of truth, shared by the LXMRouter and every
  // project engine. The mesh config payload below carries the same key
  // material so MeshSync restores exactly this identity
  const identity = await Identity.loadOrGenerate(
    /** @type {any} */ (rns.storage),
  );
  const identityBase64 = Buffer.from(await identity.getPrivateKey()).toString(
    "base64",
  );
  console.log(`bridge  companion identity ${toHex(identity.identityHash)}`);

  // Interfaces: the stored mesh config (or the defaults), plus the hub
  // on-ramps. Attach directly to the process-owned instance
  const meshConfig = config.mesh ?? {};
  /** Whether the zero-config default's shared client is already on the
   * instance (the attach pass must not dial a second socket for it). */
  let sharedPreattached = false;
  if (!meshConfig.interfaces || meshConfig.interfaces.length === 0) {
    // Zero-config defaults (SPEC): the shared rnsd instance when one runs —
    // AutoInterface only when it does not. With a daemon, the multicast
    // discovery is redundant (the shared instance already reaches the
    // daemon's whole mesh) and noisy on machines full of VPN tunnels. The
    // probe's connection is kept and attached directly; the stored config
    // records the resolved choice so restarts stay faithful
    const shared = await LocalClientInterface.connectToSharedInstance({}).catch(
      () => null,
    );
    if (shared) {
      rns.addInterface(shared, true);
      sharedPreattached = true;
      meshConfig.interfaces = [
        { id: "bridge-shared", type: "shared", options: {}, enabled: true },
      ];
    } else {
      console.warn("Mesh interface type shared: no shared instance running");
      meshConfig.interfaces = [
        {
          id: "bridge-auto",
          type: "autointerface",
          options: { name: "auto" },
          enabled: true,
        },
      ];
    }
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
  // The preattached shared client is already on the instance; attaching
  // the stored entry again would dial a second socket for the same daemon
  const toAttach = sharedPreattached
    ? meshConfig.interfaces.filter(
        (/** @type {any} */ iface) => iface.type !== "shared",
      )
    : meshConfig.interfaces;
  if (toAttach.length > 0) {
    await attachInterfaces(rns, toAttach);
  }

  const piAvailable = await discoverPi({ piBin: config.piBin ?? "pi" });
  if (!piAvailable.available) {
    console.log("bridge  pi not found — the agent layer stays unavailable");
  }

  // The owner Reticulum identity hash IS the global trust anchor; the chat
  // address derives from it — one config value, two uses (SPEC: "the owner
  // identity is the default global trust anchor", work document #44 M2)
  const ownerContact = config.ownerIdentity
    ? await deriveDeliveryHash(config.ownerIdentity)
    : null;
  // The LXMF plane (work document #67): a pi-lxmf port on the process
  // RNS — started once here, before any project, and never touched by
  // project lifecycle events. The one-shot hello world greets the
  // configured owner (now effective via propagation store-and-forward);
  // propagation nodes are discovered from the mesh, never run here
  /** @type {Awaited<ReturnType<typeof startLxmfPlane>> | null} */
  let lxmf = null;
  lxmf = await startLxmfPlane({
    rns,
    identity,
    name: config.name ?? "noflo-ui Companion",
    ownerContact,
    log: (/** @type {string} */ msg) => console.log(msg),
  });
  console.log(`bridge  LXMF delivery destination ${lxmf.deliveryHash}`);

  // ---- Per-project lifecycle ----
  /** @type {any} */
  let active = null;
  /** Whether a project transition is in progress (chat gate). */
  let switching = false;
  /** The chat surface (created after the first project boots; the
   * per-project lifecycle references it defensively). */
  /** @type {ReturnType<typeof createChatSurface> | null} */
  let chat = null;

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
        // The daemon drives the engine through `engine.handle` instead
        // (work document #44): the Glass→engine route stays inert here
        registerMessageHandler: () => {},
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
    // — one wiring module shared with the loop's integration tests (work
    // document #43)
    const projectFolder = wireProjectFolder({
      doc: engine.doc,
      folder,
      engine,
      log: (message) => console.error(message),
    });

    await projectFolder.materialize();

    // The agent primer: context provisioning for file-based tools (work
    // document #44 M2). A pre-existing AGENTS.md is never overwritten
    // (work document #43 update #4 overlay rule). The project's name
    // from the CRDT metadata pins the agent's scope (work document #67:
    // pi walks up the tree reading AGENTS files and must not adopt the
    // surrounding checkout's context)
    const primer = primerFor({
      exists: (file) => fsSync.existsSync(path.join(folder, file)),
      projectName:
        /** @type {string} */ (engine.doc.getMap("metadata").get("name")) ?? "",
    });
    if (primer !== null) {
      await fs.writeFile(path.join(folder, PRIMER_FILENAME), primer);
      console.log(`bridge  primer written to ${PRIMER_FILENAME}`);
    }

    // The folder watcher: edits stream back as intents (the snapshot
    // advanced at absorption, so the bridge's own writes diff to nothing)
    const watcher = projectFolder.watch();

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
      // Narration: pi lifecycle moments reach the owner and every
      // admitted project participant over LXMF (work document #42: all
      // chat is LXMF)
      manager.addEventListener("narration", (/** @type {any} */ e) => {
        chat
          ?.narrate(e.detail.text)
          .catch((error) =>
            console.error(
              `bridge  narration failed: ${error?.message ?? error}`,
            ),
          );
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
            chat
              ?.reply(text, "pi")
              .then(() => console.log("bridge  reply delivered"))
              .catch((error) =>
                console.error(
                  `bridge  reply delivery failed: ${error?.message ?? error}`,
                ),
              );
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

    // Mesh: the engine rebinds its provider onto the process-owned node.
    // The join boots the mesh with the stored config, so the transport
    // interfaces must be configured first — without them the knock times
    // out with "host path not resolved". The Companion is ALWAYS an
    // invited participant, never a project creator (SPEC): declaring
    // joinedViaInvite here forbids the boot's anchor self-assignment —
    // the live incident where a re-keyed bridge with a not-yet-restored
    // document hijacked the project's trust root and refused its own
    // peers. The real binding arrives with the welcome handoff
    // The mesh start is async: let the transport come up before the knock.
    // The payload carries the process identity's key material: the mesh
    // plane restores exactly the identity the LXMF plane announces with —
    // one identity, one source of truth (the RNS storage)
    engine.handle({
      type: "MESH",
      command: "configure",
      payload: {
        ...meshConfig,
        enabled: true,
        joinedViaInvite: true,
        identity: identityBase64,
      },
    });
    // The mesh start is async: let the transport come up before the knock
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (config.seedInvite) {
      // Seed invites join the active project (the knock is idempotent:
      // an already-granted project re-answers the handoff)
      engine.handle({
        type: "MESH",
        command: "join",
        payload: { invite: config.seedInvite },
      });
      // The seed join retries until the welcome handoff lands: an
      // always-on daemon must recover from "the host was offline at boot"
      // without an operator, and a missed host announce starves the first
      // knock's path request. Re-knocking is safe — the host remembers
      // its decision — and the binding's arrival is the success signal
      const joinRetry = setInterval(() => {
        meshStorage
          .get(`dacar-node:${projectId}`)
          .then((binding) => {
            if (binding) {
              clearInterval(joinRetry);
              return;
            }
            console.log("bridge  seed join: no binding yet — re-knocking");
            engine.handle({
              type: "MESH",
              command: "join",
              payload: { invite: config.seedInvite },
            });
          })
          .catch(() => {});
      }, 120_000);
      if (joinRetry.unref) joinRetry.unref();
    }

    // Registry: the project is now known by its CRDT identity
    registerProject(stateDir, {
      id: projectId,
      name:
        /** @type {string} */ (engine.doc.getMap("metadata").get("name")) ??
        "Untitled project",
      folder,
    });

    // The on-demand runtime manager (work document #47 item 3): reads the
    // project's Dacar binding from the mesh storage — the same state the
    // engine's MeshSync wrote — and passes it to the sandboxed child
    // through the parent-provisions shape
    const runtimeManager = createRuntimeManager({
      folder,
      stateDir: path.join(stateDir, "runtime", projectId),
      name: `noflo-runtime ${projectId.slice(0, 8)}`,
      dacar: await meshStorage
        .get(`dacar-node:${projectId}`)
        .then((stored) =>
          stored &&
          typeof stored.anchorHash === "string" &&
          typeof stored.anchorPubkey === "string" &&
          typeof stored.salt === "string"
            ? {
                anchorHashHex: stored.anchorHash,
                anchorPubkeyHex: stored.anchorPubkey,
                salt: stored.salt,
                projectId,
                // TODO: the mintGrant callback needs the trust anchor's
                // Identity object (the project creator's Reticulum
                // identity with the private key) — the identity
                // resolution rides the live session's identity wiring
                // mintGrant: async (subjectHash) => { ... mintAuthorization ... },
              }
            : null,
        )
        .catch(() => null),
      log: (message) => console.log(`runtime  ${message}`),
    });

    return {
      engine,
      persistence,
      backup,
      materializer: projectFolder.materializer,
      watcher,
      manager,
      runtimeManager,
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

  // ---- The agent layer (work documents #44 M2, #67) ----
  // The LXMF plane started at boot; the chat surface binds to it now that
  // the first project is up

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
    pi: active?.manager ?? null,
    // The participant admission path (work document #42's inbound
    // policy): a verified sender the mesh layer grants is admitted — the
    // webapp's user chats with pi exactly like any other LXMF participant
    isParticipant: (/** @type {string} */ identityHash) =>
      Boolean(active?.engine?.isGranted?.(identityHash)),
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
            chat?.setOwnerContact(contact);
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
  lxmf.onMessage((/** @type {any} */ event) => {
    const source = event?.message?.sourceHash
      ? toHex(event.message.sourceHash)
      : "unknown";
    console.log(
      `bridge  lxmf inbound from ${source.slice(0, 16)} (${
        event.message?.content?.length ?? 0
      } bytes)`,
    );
    chat.handleInbound(event).catch((error) => {
      console.error(`bridge  chat dispatch failed: ${error?.message ?? error}`);
    });
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
    const helloText = `Companion "${
      config.name ?? "noflo-ui Companion"
    }" is running.\nnoflo-ui ${pkg.version}, noflo ${nofloVersion}\nLXMF delivery: ${lxmf.deliveryHash}\npi: ${
      piAvailable.version ?? "not found"
    }`;
    const sendHello = () =>
      lxmf
        .sendText(ownerContact, helloText, { title: "Companion hello" })
        .then(() => console.log(`bridge  hello world sent to ${ownerContact}`))
        .catch((error) =>
          console.log(`bridge  hello world failed: ${error.message}`),
        );
    await sendHello();
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
  process.title = "noflo-ui";
  console.error("bridge failed:", error);
  process.exit(1);
});
