/**
 * @file The on-demand runtime's Dacar replica (work document #47 slice 3,
 * the mesh-replica design ratified in #59): the per-project Dacar node
 * state — Config + StateVector + DeltaReceiver + Engine — that makes the
 * runtime's authorization plane truth-granted instead of deny-closed, plus
 * the capability policy the FBP runtime evaluates per link.
 *
 * The runtime is a replica like any other: the project's Trust Anchor
 * signs the grants (the app's mintAuthorization), the deltas travel as the
 * §11.1 batch and are ingested verify-on-ingest — the runtime needs NO
 * grant of its own to receive pushes, only the anchor's public key
 * material and the Privacy Salt, which the parent provisions (work
 * document #59's Dacar management section: the bootstrap is local and
 * automatic for Companion-hosted runtimes).
 *
 * The relation bridge (work document #59's concrete mapping): the app's
 * grants carry two relations — `sync` (may replicate) and `write` (may
 * mutate) — and the runtime's capability bits evaluate against them.
 * Observer grants read; editor grants read and edit; the anchor's identity
 * is the owner by construction.
 */

import { DacarCapabilityPolicy } from "@noflo/runtime";
// The child runs in Node with node_modules available: the Dacar stack
// imports from the npm package the runtime itself depends on — one type
// tree, no vendor/npm structural conflict in the policy's engine type
import {
  Config,
  DeltaReceiver,
  Engine,
  Keyring,
  StateVector,
} from "@reticulum/dacar";
import { fromHex } from "../../vendor/reticulum-core.js";

/**
 * The runtime's capability-to-relation bridge: every read-class capability
 * evaluates the app's `sync` relation, every mutate-class capability the
 * `write` relation. An unmapped capability (ADMIN) stays per-bit denied —
 * the coarse-grant path is the anchor's, not a role's.
 */
export const RUNTIME_RELATIONS = {
  GRAPH_READ: "sync",
  METADATA_SYNC: "sync",
  TELEMETRY_READ: "sync",
  COMPONENT_READ: "sync",
  GRAPH_EDIT: "write",
  COMPONENT_WRITE: "write",
  LIFECYCLE_CTRL: "write",
};

/**
 * Builds the runtime's Dacar node state from the provisioned binding: the
 * same shape the Glass's Dacar node runs, over the anchor material the
 * parent handed the child.
 *
 * @param {Object} nodeConfig The provisioned binding (the manager writes
 *   it; the anchor hash + pubkey and the Privacy Salt, hex).
 * @param {string} nodeConfig.anchorHashHex
 * @param {string} nodeConfig.anchorPubkeyHex
 * @param {string} nodeConfig.salt
 * @returns {{
 *   engine: import("@reticulum/dacar").Engine,
 *   receiver: import("@reticulum/dacar").DeltaReceiver,
 *   state: import("@reticulum/dacar").StateVector,
 *   apply: (data: Uint8Array) => Promise<number>,
 * }}
 */
export function buildRuntimeDacar(nodeConfig) {
  const config = new Config({
    rootTrustAnchors: [fromHex(nodeConfig.anchorHashHex)],
    primarySalt: fromHex(nodeConfig.salt),
  });
  const state = new StateVector();
  const keyring = new Keyring().registerSingle(
    fromHex(nodeConfig.anchorHashHex),
    fromHex(nodeConfig.anchorPubkeyHex),
  );
  const receiver = new DeltaReceiver(state, keyring);
  const engine = new Engine(config, state);
  return {
    engine,
    receiver,
    state,
    /** The transport seam's ingest: one §5.3 payload or a §11.1 batch,
     * the same disambiguation and future-skew tolerance the Glass's node
     * runs. */
    apply: async (/** @type {Uint8Array} */ data) => {
      if (await receiver.applyPayload(data, { maxFutureMs: null })) return 1;
      try {
        return await receiver.applyPayloads(data, { maxFutureMs: null });
      } catch {
        return 0;
      }
    },
  };
}

/**
 * The FBP runtime's capability policy over the replica's engine: one Dacar
 * evaluation per capability bit, on the project resource the grants
 * address.
 *
 * @param {Object} options
 * @param {import("@reticulum/dacar").Engine} options.engine
 * @param {string} options.projectResource The resource string the grants
 *   carry (`noflo-ui:project:<uuid>`, the app's projectResource).
 * @returns {(identityHash: string, context?: any) => Promise<number>} The
 *   capability policy as the runtime-server consumes it — a function
 *   resolving one peer's mask.
 */
export function runtimeCapabilityPolicy({ engine, projectResource }) {
  const policy = new DacarCapabilityPolicy({
    engine,
    objectId: projectResource,
    relations: RUNTIME_RELATIONS,
  });
  // The runtime-server's capabilityPolicy is a FUNCTION
  // (identityHash, context) → mask — the policy object's resolve is the
  // implementation
  return (/** @type {string} */ identityHash, /** @type {any} */ context) =>
    policy.resolve(identityHash, context);
}
