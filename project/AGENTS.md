# NoFlo project — agent primer

This folder is a NoFlo dataflow project, live-synced over a mesh by the
NoFlo UI Companion. The CRDT document held by the mesh participants is
authoritative; the files you see here are a materialized projection that
updates in near-real time.

## Layout

- `graphs/*.graph.json` — the flow graphs (canonical serialization; one
  file per graph, flat: subgraphs are components of their parent graph,
  not files of their own)
- `components/<name>.js` + `components/<name>.json` — code components
  and their signatures
- `docs/*.md` — project-carried documentation (conventions, notes,
  AGENTS-style instructions)
- `COMPONENTS.md` — generated reference of every component the project
  can place, with ports, datatypes, and addressable flags
- `package.json` — generated from project metadata
- `project.json` — the project manifest (derived state; do not edit)

## NoFlo in one paragraph

NoFlo is flow-based programming: a program is a graph of independent
processes (nodes) connected through their ports. Data travels between
nodes as information packets over edges; nodes react to packets as they
arrive. Initial information packets (IIPs) attach constant data to an
inport. Components declare inports and outports with datatypes in their
signature; an addressable port can hold several connections at indexed
slots. `COMPONENTS.md` lists what is available.

## Live-sync etiquette

- **Files change at any time.** Other participants (human or agent) edit
  the same project through the mesh. Always re-read a file before
  editing it, even if you read it moments ago.
- **Keep edits small.** Each change propagates as a diff to every
  participant; large rewrites are hard to reconcile and hard to review.
- **Edit graphs through the canonical format.** `graphs/*.graph.json`
  is a projection of the CRDT; malformed files are reported as
  diagnostics and never reach the document. Change what you mean to
  change — removing a node also removes its edges and IIPs.
- **Component code is JavaScript** (ES modules, `export default`).
  The `.json` sidecar carries the signature (ports, datatypes).
- **Docs are Markdown.** `docs/*.md` files are collaborative documents;
  treat them like shared notes.
