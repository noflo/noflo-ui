/**
 * @file Micro-phrase catalog for operation narration (work document #34):
 * human-authored phrasing for user-visible Engine operations, written the
 * way capable assistants narrate their work. Keyed by `operation.stage`
 * from the Engine's progress vocabulary (`PROGRESS_OPERATIONS` in
 * `src/worker/Progress.js`); `running` and `failed` states render from the
 * same phrase with state-specific styling. `{param}` placeholders
 * interpolate from the message's `detail`.
 *
 * A stage without a phrase falls back to a plain readable form of the stage
 * name; an operation without any entry renders its operation name.
 */

/**
 * Phrase catalog: `operation.stage` → phrase template. Entries are either a
 * single phrase for all states, or a `{ running, failed }` record when the
 * failure needs different wording. `{param}` placeholders interpolate from
 * the message's `detail`.
 *
 * @type {Record<string, string | { running?: string, failed?: string }>}
 */
const PHRASES = {
  "identity.generate.restore": {
    running: "Restoring the mesh identity",
    failed: "The stored mesh identity could not be restored: {error}",
  },
  "identity.generate.generate": "Generating the mesh identity",
  "mesh.connect.starting": "Starting mesh sync",
  "mesh.connect.transport": {
    running: "Connecting to the relay",
    failed: "Mesh transport failed: {error}",
  },
  "mesh.connect.discovery": "Working locally",
  "mesh.connect.discovered": "Discovered peer {peer}",
  "mesh.announce.room": "Announced the project room",
  "mesh.connect.path.request":
    "Requesting a path to peer {peer}",
  "mesh.connect.link.establish": "Establishing a link to peer {peer}",
  "mesh.connect.proof.verify":
    "Validating link proof for peer {peer}",
  "mesh.join.request_path": "Resolving the host’s path",
  "mesh.join.linking": "Establishing a link to the host",
  "mesh.join.knocking": "Knocking on the host’s door",
  "mesh.join.wait_response": "Waiting for the host’s decision",
  "mesh.join.handoff": "Receiving the project handoff",
  "mesh.join.grant": "Verifying the project grant",
  "mesh.join.materialize": "Materializing the joined project",
  "persistence.load.load": "Loading project store",
  "project.bind.adopt": "Adopting the joined project",
  "project.bind.rebind": "Binding sync to the project room",
  "mesh.connect.transport.failed": "Mesh transport failed: {error}",
};

/**
 * Renders a progress message as a human-readable phrase.
 *
 * @param {import("../crdt/Protocol.js").ProgressMessage} message
 * @returns {string}
 */
export function progressPhrase(message) {
  const key = `${message.operation}.${message.stage}`;
  /** @type {any} */
  const entry = PHRASES[key];
  const fallback = `${message.operation} ${message.stage}`;
  const template =
    typeof entry === "string"
      ? entry
      : entry
        ? (message.state === "failed"
            ? entry.failed ?? entry.running ?? fallback
            : entry.running ?? fallback)
        : fallback;
  return String(template).replace(
    /\{(\w+)\}/g,
    (_match, /** @type {string} */ param) =>
      String(message.detail?.[param] ?? `{${param}}`),
  );
}
