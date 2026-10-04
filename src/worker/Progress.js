/**
 * @file Operation narration (work document #34): the Engine-side half of
 * the progress channel. Operations are named and staged; each emission is a
 * structured `progress` message the Glass renders with human-authored
 * micro-phrases — this module never sends free-form text.
 *
 * Operations form a vocabulary (see `PROGRESS_OPERATIONS`); the phrase
 * catalog lives Glass-side in `src/glass/progressPhrases.js`.
 */

/**
 * The operation/stage vocabulary. Keys are `operation` names; values list
 * the stages each operation walks. The Glass's catalog keys phrases off
 * `operation.stage` pairs, so adding a stage here requires a phrase there.
 *
 * @type {Record<string, string[]>}
 */
export const PROGRESS_OPERATIONS = {
  "identity.generate": ["restore", "generate"],
  "mesh.connect": ["starting", "transport", "discovery", "discovered"],
  "mesh.announce": ["room", "sync"],
  "mesh.connect.path": ["request"],
  "mesh.connect.link": ["establish"],
  "mesh.connect.proof": ["verify"],
  "mesh.join": [
    "requesting_path",
    "linking",
    "knocking",
    "wait_response",
    "handoff",
    "grant",
    "materialize",
  ],
  "persistence.load": ["load"],
  "project.bind": ["adopt", "rebind"],
};

/**
 * Builds a progress message.
 *
 * @param {string} operation Operation name from PROGRESS_OPERATIONS.
 * @param {string} stage Stage name within the operation.
 * @param {'running' | 'done' | 'failed'} state
 * @param {Record<string, any>} [detail] Structured interpolation parameters.
 * @returns {import("../crdt/Protocol.js").ProgressMessage}
 */
export function progress(operation, stage, state, detail = undefined) {
  return detail === undefined
    ? { kind: "progress", operation, stage, state }
    : { kind: "progress", operation, stage, state, detail };
}
