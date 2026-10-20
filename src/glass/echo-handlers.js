/**
 * @file The Glass's echo dispatch table (work document #37): one handler per
 * Engine → Glass message in the contract registry, keyed by the same
 * discriminators. The table's keys must match `ECHO_MESSAGES` exactly — the
 * contract test (`spec/crdt/contract.spec.js`) enforces it, so a new echo
 * kind cannot ship without a handler and a handler cannot exist without a
 * registry entry.
 *
 * The handlers that need Glass state receive it through `deps`; the table
 * stays enumerable and the state stays in the app module. Echoes the Glass
 * currently only traces (system, network, acl) have explicit handlers too —
 * nothing arrives unhandled.
 */

import { progressPhrase } from "./progressPhrases.js";

/**
 * Formats a byte count for the telemetry streams' main column.
 *
 * @param {Uint8Array | undefined} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  const size = bytes?.byteLength ?? 0;
  return size >= 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`;
}

/**
 * Everything the echo handlers need from the running Glass.
 *
 * @typedef {Object} EchoHandlerDeps
 * @property {() => any} getNarration Current operation narration.
 * @property {(narration: any) => void} setNarration Replace the narration.
 * @property {() => void} refreshSyncPanel Re-render the sync panel.
 * @property {() => void} refreshMeshSettings Re-render the settings dialog.
 * @property {(update: Uint8Array) => void} applyMirrorUpdate Apply a Yjs
 *   update to the read replica (and refresh what depends on it).
 * @property {(states: any[]) => void} showPeerGhosts Render
 *   remote peer drag ghosts for the active graph.
 * @property {(data: any) => void} ingestMeshConfig Take a full mesh-state
 *   report into the Glass's mesh state.
 * @property {(uri: string) => void} setMeshInvite Store a minted invite URI.
 * @property {((states: Record<string, "online" | "offline">) => void) | undefined} [updatePeerReachability]
 *   Peer reachability states (work document #47): granted peers are
 *   online or offline — offline is the mesh's normal state.
 * @property {(added: string[], removed: string[], peers: number, identities?: Record<string, string>) => void} updateMeshPeers
 *   Apply a peer-set change, with the peer-id → identity-hash mapping when
 *   the provider reports it (work document #28).
 * @property {(requests: any[]) => void} setJoinRequests
 * @property {(runtimes: any[]) => void} setRuntimeDiscovery Take the
 *   discovered FBP runtime population (work document #59) into the
 *   Glass's runtime state.
 * @property {(connection: any) => void} setRuntimeConnection Take one
 *   runtime connection's state into the Glass's runtime state.
 * @property {(deploy: any) => void} setRuntimeDeploy Take one deploy's
 *   progress or outcome into the Glass's runtime state.
 * @property {(report: any) => void} setRuntimeProcesses Take a runtime's
 *   process listing into the Glass's runtime state.
 * @property {(report: any) => void} setRuntimeRun Take a runtime's run
 *   state into the Glass's runtime state.
 * @property {(destinationHash: string, schemas: Array<{ digest: string, body: any }>) => void} [runtimeSchemasFetched]
 *   The runtime-schemas echo arrived (work document #57): the Glass's
 *   schema cache ingests the digest-verified bodies.
 * @property {(stream: string, entry: { message: string, status?: string, tone?: "ok" | "fail" | "" }) => void} [emitTelemetry]
 *   Publish a legible telemetry entry on the Glass's bus (work document
 *   #63): the fan-out point for the wires layer.
 * @property {() => void} reloadIntoFreshBoot Reload after a factory reset.
 * @property {(state: any) => void} setDacarState
 * @property {(data: any) => void} ingestMeshStatus Take a mesh-status
 *   report into the Glass's sync state.
 * @property {(state: any) => void} setUndoState Take the Engine's
 *   undo-journal availability report (work document #39) into the Glass's
 *   undo chip state.
 * @property {(payload: any) => void} [workDocCreated] A work document was
 *   created (work document #9): the creation flow navigates to the new
 *   document's view when the echo is its own.
 * @property {(payload: any) => void} [chatResponse] The agent responded to
 *   a chat message (work document #47 item 3): the chat panel appends the
 *   response.
 * @property {(payload: any) => void} [implementationRequested] A component's
 *   implementation-request pointer moved (work document #9 step D): the open
 *   component editor refreshes its request line from the mirror.
 * @property {(name: string | undefined, action: string) => void} [schemaChanged]
 *   A project schema changed (work document #57): the schema view and
 *   the project corner refresh from the mirror.
 */

/**
 * The dispatch key for an Engine → Glass message: `kind:<kind>` for
 * kind-style echoes, `<protocol>/<command>` for protocol echoes.
 *
 * @param {any} data
 * @returns {string}
 */
export function echoKey(data) {
  if (typeof data?.kind === "string") return `kind:${data.kind}`;
  if (typeof data?.protocol === "string" && typeof data?.command === "string") {
    return `${data.protocol}/${data.command}`;
  }
  return "";
}

/**
 * Builds the echo handler table for a running Glass.
 *
 * @param {EchoHandlerDeps} deps
 * @returns {Record<string, (data: any) => void>}
 */
export function createEchoHandlers(deps) {
  return {
    "kind:progress": (data) => {
      // Operation narration (work document #34): the phrase catalog renders
      // the micro-phrase; a running operation replaces the previous one, its
      // done clears it. A failed ATTEMPT is a completed fact, not the current
      // state: pinning it on the chip would contradict a system that has
      // since recovered through another path (the announce fallback). The
      // chip narrates running operations only; failures stay in the console
      // timeline, while state-level failures (identity, provider) surface
      // persistently through mesh-status errors.
      const phrase = progressPhrase(data);
      if (data.state === "running") {
        deps.setNarration({
          phrase,
          operation: data.operation,
          stage: data.stage,
        });
      } else if (data.state === "failed") {
        // A failed attempt stays visible until the system demonstrably
        // recovers (mesh-status reports synced) or a newer operation
        // supersedes it — a dial failure with sync still down is a real
        // problem, not noise (work document #34, no silent failures)
        deps.setNarration({
          phrase,
          operation: data.operation,
          stage: data.stage,
          failed: true,
        });
      } else if (deps.getNarration()?.operation === data.operation) {
        deps.setNarration(null);
      }
      console.info(
        `[progress] ${phrase} (${data.state})`,
        data.detail ? JSON.stringify(data.detail) : "",
      );
      deps.refreshSyncPanel();
    },
    "kind:y-sync": (data) => {
      // Full state: establishes clock contiguity for the incremental stream
      deps.applyMirrorUpdate(data.update);
      deps.emitTelemetry?.("yjs", {
        message: `full state · ${formatBytes(data.update)}`,
        status: "SYNC",
        tone: "ok",
      });
    },
    "kind:y-update": (data) => {
      deps.applyMirrorUpdate(data.update);
      deps.emitTelemetry?.("yjs", {
        message: `update · ${formatBytes(data.update)}`,
        status: "DELTA",
      });
    },
    "kind:awareness": (data) => {
      deps.showPeerGhosts(data.states ?? []);
    },
    "kind:mesh-config": (data) => {
      deps.ingestMeshConfig(data);
    },
    "kind:mesh-invite": (data) => {
      deps.setMeshInvite(data.uri ?? "");
    },
    "kind:mesh-peers": (data) => {
      // Track the peer set for the panel's peers accordion
      deps.updateMeshPeers(
        data.added ?? [],
        data.removed ?? [],
        data.peers ?? 0,
        data.identities ?? {},
      );
    },
    "kind:mesh-peer-reachability": (data) => {
      deps.updatePeerReachability?.(data.states ?? {});
    },
    "kind:mesh-requests": (data) => {
      deps.setJoinRequests(data.requests ?? []);
    },
    "kind:runtime-discovered": (data) => {
      // The FBP runtime population (work document #59): a runtime is just
      // another mesh counterpart with a protocol version
      deps.setRuntimeDiscovery(data.runtimes ?? []);
    },
    "kind:runtime-connection": (data) => {
      deps.setRuntimeConnection(data);
    },
    "kind:runtime-deploy": (data) => {
      deps.setRuntimeDeploy(data);
    },
    "kind:runtime-processes": (data) => {
      deps.setRuntimeProcesses(data);
    },
    "kind:chat-response": (data) => {
      // The agent's response (work document #47 item 3): the chat panel
      // renders the conversation
      deps.chatResponse?.(data.payload);
    },
    "kind:runtime-run": (data) => {
      deps.setRuntimeRun(data);
    },
    "kind:runtime-op-rejected": (data) => {
      // The runtime's explicit "no" (work document #4 updates #34/#35):
      // Phase B wires these into the pending-state round; today they
      // surface as deploy/observation failures in the console
      console.warn(
        `[runtime] op rejected (cmd ${data.rejectedCmd}):`,
        data.detail,
      );
    },
    "kind:runtime-telemetry": (data) => {
      // The FBP protocol stream (work document #63 M3): per-runtime bus
      // stream, so multiple runtimes never interleave
      deps.emitTelemetry?.(`fbp:${data.destinationHash}`, {
        message: data.message,
        status: data.status,
        tone: data.tone ?? "",
      });
    },
    "kind:runtime-schemas": (data) => {
      // The digest-verified bodies (work document #57): the Glass's
      // schema cache ingests — foreign pins resolve from here onward
      deps.runtimeSchemasFetched?.(data.destinationHash, data.schemas ?? []);
    },
    "kind:mesh-telemetry": (data) => {
      // The Reticulum stream (work document #63 M2): mesh presence,
      // interface lifecycle, peer links, and link-policy verdicts for the
      // wires layer's mesh accordion — the engine owns the status tag
      deps.emitTelemetry?.("reticulum", {
        message: data.message,
        status: data.status,
        tone: data.tone ?? "",
      });
    },
    "kind:factory-reset": () => {
      // The Engine wiped local state: reload into a fresh boot (which
      // respawns the worker and re-runs leader election)
      deps.reloadIntoFreshBoot();
    },
    "kind:mesh-dacar": (data) => {
      // Dacar authorization state: anchor, per-grant verification, wallet
      deps.setDacarState(data);
      deps.refreshMeshSettings();
      deps.refreshSyncPanel();
    },
    "kind:mesh-status": (data) => {
      deps.ingestMeshStatus(data);
    },
    "schema/created": (data) => {
      // Project schemas (work document #57 update #1): the CRDT is
      // authoritative — the surfaces refresh from the mirror
      deps.schemaChanged?.(data.payload?.name, "created");
    },
    "schema/edited": (data) => {
      deps.schemaChanged?.(data.payload?.name, "edited");
    },
    "schema/removed": (data) => {
      deps.schemaChanged?.(data.payload?.name, "removed");
    },
    "workdoc/created": (data) => {
      // Work-document echoes (work document #9): the Glass renders from
      // the CRDT mirror; the creation flow navigates to its own document
      deps.workDocCreated?.(data.payload);
      console.debug(`[echo] workdoc/created ${data.payload?.id ?? ""}`);
    },
    "workdoc/updated": (data) => {
      console.debug(
        `[echo] workdoc/updated ${data.payload?.id ?? ""} #${data.payload?.updateId ?? ""}`,
      );
    },
    "workdoc/scoped": (data) => {
      console.debug(
        `[echo] workdoc/scoped ${data.payload?.id ?? ""} → ${data.payload?.pendingScope ?? ""}`,
      );
    },
    "workdoc/requested": (data) => {
      // The implementation-request pointer moved (work document #9 step D):
      // the open component editor refreshes its request line from the mirror
      deps.implementationRequested?.(data.payload);
      console.debug(
        `[echo] workdoc/requested ${data.payload?.component ?? ""} → ${data.payload?.docId ?? "cleared"}`,
      );
    },
    "project/dependency": (data) => {
      // The project's component-library dependency list moved (work
      // document #43): the Glass has no dependency editor yet — the
      // materialized package.json renders from the mirror's metadata
      console.debug(
        `[echo] project/dependency ${data.payload?.module ?? ""} → ${data.payload?.spec ?? "cleared"}`,
      );
    },
    "workdoc/edited": (data) => {
      console.debug(`[echo] workdoc/edited ${data.payload?.id ?? ""}`);
    },
    "workdoc/titled": (data) => {
      console.debug(`[echo] workdoc/titled ${data.payload?.id ?? ""}`);
    },
    "workdoc/repo": (data) => {
      console.debug(`[echo] workdoc/repo ${data.payload?.url ?? "(cleared)"}`);
    },
    "kind:undo": (data) => {
      // Undo/redo availability (work document #39): the corner chips
      // render from this report, never from guessed stack state
      deps.setUndoState(data);
    },
    "system/heartbeat": () => {
      // Liveness only: the Glass renders from the replica, not the heartbeat
      console.debug("[echo] system/heartbeat");
    },
    "system/signature": (data) => {
      // Query response; the Glass currently resolves signatures through the
      // CRDT registry, so this is traced for protocol visibility
      console.debug(
        `[echo] system/signature ${data.payload?.componentName ?? ""}`,
      );
    },
    "network/flowtrace": (data) => {
      // Batched telemetry chunks; playback is work document #15's surface
      console.debug(
        `[echo] network/flowtrace ${data.payload?.events?.length ?? 0} events`,
      );
    },
    "acl/revoke": (data) => {
      // Authoritative revocation echo; the replica converges through the
      // CRDT stream, the echo is traced for protocol visibility
      console.debug(`[echo] acl/revoke ${data.payload?.id ?? ""}`);
    },
    // Authoritative graph echoes: rendering is replica-driven (the y-update
    // stream mirrors the CRDT), so the Glass takes no action — traced at
    // debug for protocol visibility
    "graph/addnode": (data) => traceGraphEcho(data),
    "graph/removenode": (data) => traceGraphEcho(data),
    "graph/movenode": (data) => traceGraphEcho(data),
    "graph/setcomponent": (data) => traceGraphEcho(data),
    "graph/addedge": (data) => traceGraphEcho(data),
    "graph/removeedge": (data) => traceGraphEcho(data),
    "graph/addiip": (data) => traceGraphEcho(data),
    "graph/updateiip": (data) => traceGraphEcho(data),
    "graph/setnodemetadata": (data) => traceGraphEcho(data),
    "graph/setgraphmetadata": (data) => traceGraphEcho(data),
    "graph/removeiip": (data) => traceGraphEcho(data),
    "graph/addinport": (data) => traceGraphEcho(data),
    "graph/addoutport": (data) => traceGraphEcho(data),
    "graph/removeinport": (data) => traceGraphEcho(data),
    "graph/removeoutport": (data) => traceGraphEcho(data),
    "graph/renameinport": (data) => traceGraphEcho(data),
    "graph/renameoutport": (data) => traceGraphEcho(data),
    "graph/creategraph": (data) => traceGraphEcho(data),
    "graph/removegraph": (data) => traceGraphEcho(data),
  };
}

/**
 * @param {any} data
 */
function traceGraphEcho(data) {
  console.debug(`[echo] graph/${data.command}`, data.payload?.id ?? "");
}
