/**
 * @file primer.js — the AGENTS.md primer the Companion ships into each
 * materialized project folder (work document #44, M2 context
 * provisioning). It teaches a file-based agent — pi, or any tool reading
 * the folder — what a NoFlo project is and how to behave while the
 * folder is live-synced with the mesh.
 *
 * Overlay rule (work document #43 update #4): a pre-existing AGENTS.md is
 * never overwritten; the primer is emitted only when the path is absent.
 */

export const PRIMER_FILENAME = "AGENTS.md";

/**
 * Builds the primer for one project. The header names the project and
 * pins the scope: pi walks up the directory tree reading AGENTS.md files,
 * and a materialization that happens to live inside another checkout must
 * never inherit that checkout's context.
 *
 * @param {object} options
 * @param {(file: string) => boolean} options.exists Whether a file exists
 *   in the project folder (the overlay rule's check).
 * @param {string} [options.projectName] The project's name from the CRDT
 *   metadata, when known.
 * @returns {string | null} The primer text, or null when the project
 *   already carries an AGENTS.md (the overlay rule: never overwrite).
 */
export function primerFor({ exists, projectName = "" }) {
  if (exists(PRIMER_FILENAME)) return null;
  const name = projectName ? `"${projectName}"` : "the project";
  return `# NoFlo project — agent primer

You are working in the materialized NoFlo dataflow project ${name}.
THIS FOLDER IS THE ENTIRE PROJECT. Do not adopt context from parent
directories: the materialization may happen to live inside another
codebase's folder tree, but that codebase is not your project — its
README, AGENTS files, package manifest, and conventions do not apply
here. Your scope is this folder and nothing above it.

This folder is live-synced over a mesh by the NoFlo UI Companion. The
CRDT document held by the mesh participants is authoritative; the files
you see here are a materialized projection that updates in near-real
time.

## Layout

- \`graphs/*.graph.json\` — the flow graphs (canonical serialization; one
  file per graph, flat: subgraphs are components of their parent graph,
  not files of their own)
- \`components/<name>.js\` + \`components/<name>.json\` — code components
  and their signatures
- \`docs/*.md\` — project-carried documentation (conventions, notes,
  AGENTS-style instructions)
- \`COMPONENTS.md\` — generated reference of every component the project
  can place, with ports, datatypes, and addressable flags
- \`package.json\` — generated from project metadata
- \`project.json\` — the project manifest (derived state; do not edit)

## NoFlo in one paragraph

NoFlo is flow-based programming: a program is a graph of independent
processes (nodes) connected through their ports. Data travels between
nodes as information packets over edges; nodes react to packets as they
arrive. Initial information packets (IIPs) attach constant data to an
inport. Components declare inports and outports with datatypes in their
signature; an addressable port can hold several connections at indexed
slots. \`COMPONENTS.md\` lists what is available.

## Routes: visual subway lines

Connections may carry \`metadata.route: <index>\` in the graph file.
Connections sharing the same route index belong to the same visual
route — a "subway line" the editor draws through them (work document
#35). The line's human-readable name lives in the graph's route table,
which the editor keeps in its own state; it is not part of the
materialized files yet. When wiring new connections:

- Reuse an existing route index when the connection visually belongs to
  a line other connections already use.
- Otherwise leave the route unset — a new route is created in the
  editor, where a human names it.
- Never renumber existing routes: the index is the identifier the
  editor's route table keys on.

## Groups: named node clusters

A graph's \`groups\` array holds named clusters of nodes
(\`{ id, name, nodes }\`): visual containers grouping nodes that belong
to a shared concern. When you add nodes that clearly belong to an
existing group's concern, extend that group's \`nodes\` list; when a
cluster is new, create a group with a human-readable name. Empty
nameless groups carry no meaning — remove them rather than leaving
them behind.

## Live-sync etiquette

- **Files change at any time.** Other participants (human or agent) edit
  the same project through the mesh. Always re-read a file before
  editing it, even if you read it moments ago.
- **Keep edits small.** Each change propagates as a diff to every
  participant; large rewrites are hard to reconcile and hard to review.
- **Edit graphs through the canonical format.** \`graphs/*.graph.json\`
  is a projection of the CRDT; malformed files are reported as
  diagnostics and never reach the document. Change what you mean to
  change — removing a node also removes its edges and IIPs.
- **Component code is JavaScript** (ES modules, \`export default\`).
  The \`.json\` sidecar carries the signature (ports, datatypes).
- **Docs are Markdown.** \`docs/*.md\` files are collaborative documents;
  treat them like shared notes.
`;
}
