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
 * @property {() => void} reloadIntoFreshBoot Reload after a factory reset.
 * @property {(state: any) => void} setDacarState
 * @property {(data: any) => void} ingestMeshStatus Take a mesh-status
 *   report into the Glass's sync state.
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
    },
    "kind:y-update": (data) => {
      deps.applyMirrorUpdate(data.update);
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
