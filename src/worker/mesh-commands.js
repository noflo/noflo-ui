/**
 * @file The Engine's MESH command router (work document #37): a dispatch
 * table keyed by the contract registry's MESH commands. Mesh commands
 * bypass the NoFlo dispatcher — they concern the mesh layer, not the CRDT
 * graph — so the Engine's message router calls into this table directly.
 * Unknown commands are refused loudly instead of silently ignored.
 *
 * The table's keys must match the registry's MESH commands exactly; the
 * contract test (`spec/crdt/contract.spec.js`) enforces it.
 */

/**
 * Everything a MESH command handler needs from the running Engine.
 *
 * @typedef {Object} MeshCommandContext
 * @property {any} mesh The MeshSync instance.
 * @property {(message: any) => void} postMessage Send an echo to the Glass.
 * @property {() => void} postMeshConfig Re-report the full mesh state.
 * @property {(payload: any) => void} joinProject Start a bootstrap join.
 * @property {() => Promise<void>} factoryReset Wipe local state.
 */

/**
 * The MESH command dispatch table.
 *
 * @type {Record<string, (ctx: MeshCommandContext, payload: any) => void>}
 */
export const MESH_HANDLERS = {
  configure: (ctx, payload) => {
    ctx.mesh
      .handleConfigure(payload)
      .then(() => ctx.postMeshConfig())
      .catch((/** @type {any} */ err) =>
        console.error("Mesh configuration failed:", err),
      );
  },
  status: (ctx) => {
    ctx.postMeshConfig();
  },
  join: (ctx, payload) => {
    ctx.joinProject(payload);
  },
  grant: (ctx, payload) => {
    ctx.mesh
      .grant(payload)
      .then(() => ctx.postMeshConfig())
      .catch((/** @type {any} */ err) => console.error("Grant failed:", err));
  },
  resolveRequest: (ctx, payload) => {
    ctx.mesh.resolveRequest({
      identityHash: payload?.identityHash,
      decision: payload?.decision === "approved" ? "approved" : "declined",
    });
  },
  createInvite: (ctx) => {
    ctx.mesh
      .createInvite()
      .then((/** @type {any} */ invite) => {
        if (!invite) {
          ctx.postMessage({
            kind: "mesh-status",
            error:
              "Invite unavailable: mesh must be connected and this device must own the project",
          });
          return;
        }
        ctx.postMessage({ kind: "mesh-invite", ...invite });
      })
      .catch((/** @type {any} */ err) =>
        console.error("Invite creation failed:", err),
      );
  },
  factoryReset: (ctx) => {
    ctx.factoryReset();
  },
  stop: (ctx) => {
    // Graceful mesh shutdown on page unload (work document #28 finding):
    // the peer cleans its room state immediately instead of waiting out
    // the Reticulum link timeout after this worker dies mid-session
    ctx.mesh
      .stop()
      .catch((/** @type {any} */ err) =>
        console.error("Mesh stop failed:", err),
      );
  },
  importIdentity: (ctx, payload) => {
    ctx.mesh
      .handleImportedIdentity(payload?.identity)
      .then(() => ctx.postMeshConfig())
      .catch((/** @type {any} */ err) =>
        console.error("Identity import failed:", err),
      );
  },
};

/**
 * Routes one MESH message through the dispatch table.
 *
 * @param {MeshCommandContext} ctx
 * @param {any} message
 * @returns {boolean} Whether the command was recognized.
 */
export function routeMeshCommand(ctx, message) {
  const handler = MESH_HANDLERS[message?.command];
  if (!handler) {
    console.warn("Engine refused an unknown MESH command:", message?.command);
    return false;
  }
  handler(ctx, message.payload ?? {});
  return true;
}
