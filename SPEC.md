NoFlo Development Environment Specification
===========================================

## Objective

NoFlo Development Environemt (NoFlo UI in short) is a node-based editor for creating, editing, and managing flow-based applications. The approach is known as "live programming", meaning that applications connected to the UI can be modified while they run.

Applications can run in the UI itself (using the in-browser NoFlo runtime) or on a remote system accessible via FBP Protocol. Any FBP Protocol compatible Dataflow engine can be managed with this UI.

The aim is to handle the full lifecycle of flow-based software, from:
- **Sketching**: Using "dummy" placeholder nodes
- **Implementation**: Selecting libraries, writing code, or drawing subgraphs
- **Verification**: Adding/running tests via fbp-spec
- **Deployment**: Running on remote runtimes over FBP Protocol
- **Observability**: Seeing the state of runtimes. Setting tracepoints and traveling through dataflow via Flowtraces

Eventually we also want to be able to:
- Manage and edit project documentation, change logs, and other Markdown documents associated with a project
- Utilize work documents associated with the project (via rngit)
- Version control and make releases (via rngit)

The home view is a zoomable flow editor. Upon first launch, a "home graph" is created to orchestrate discovered runtimes, components, and projects. Offline runtimes appear as stopped/dead nodes, with related runtimes grouped visually.

Visual interactions will enable connecting and disconnecting prots on the various nodes. You can also move a set of nodes to its own subgraph, and easily add new nodes by just dragging from a port to the empty canvas.

In NoFlo UI, a project is a collection of:
- Graph files, in the fbp-graph JSON format. Any NoFlo UI specific parts will be stored in graph/node/edge/IIP metadata. For example: x/y coordinates, chose edge visualization widgets, Flowtrace tracepoints. Similarly the latest CRDT clock may be stored here to make reconciliation easier when reconnecting to a runtime or loading a file from disk.
- Components, in whatever programming language supported by the runtime (JavaScript and TypeScript in case of NoFlo)
- Specs files, in the fbp-spec YAML format
- Markdown documents (`README.md`, `CHANGELOG.md`, etc)

By default these will live in the CRDT structure in the NoFlo UI's IndexedDB. In some technology combinations (for example when `window.showDirectoryPicker` is supported) we may also load and store latest state from disk. Otherwise the runtime may do storage to disk.

Live collaboration will enable inviting other users to edit the project together either over WebRTC or Reticulum. Theoretically we can also introduce AI agents as similar collaborators.

The app is meant to be a durable piece of software that can be run and maintained for years or decades to come. Because of this, reliance on the standard web stack and minimization of technology dependencies outside of that is crucial.

## Primary user interactions

Viewing or managing a graph:
- See the full visual graph and be able to pan and zoom
- Nodes are circular, with their ports along the outer edge. Inports on left, outports on right. Addressable (ArrayPorts) are shown with indexed port instances "stacked together"
- Current state of the graph and the components is given by colors, highlighting, maybe animation (in case of severe problems)
- New nodes can be added by either long-pressing on an empty piece of canvas or by dragging from a port to an empty piece of canvas
  - New nodes can be either selected from list of known subgraphs or elementary (code) components, or created as a "dummy" placeholder to be filled in later
- Multiple nodes can be selected together
- Dragging a node (or a group) into an existing node allows moving all of them to that subgraph
- Nodes can show custom status (from the running implementation) either by an icon (from Font Awesome selection), a 84x84px P4 .pbm image, or a 18x18px P6 .ppm image sent from the runtime
- When a node is selected it expands to show a radial menu and to present larger port targets for easier finger interaction
- When an edge is selected it shows its packets passing through. We will want to support different visualizations for different packet types and edge configurations (line graphs for numbers etc)
- Nodes and edges can be removed from their radial menu
- We will have a forms-based metadata editor for all normal graph parts (graph itself, node, edge, IIP)
- Initial information packets can be added from the menu of an inport or by dragging from inport to empty spot on canvas and choosing IIP instead of new node
- Initial Information packets are edited using a form that supports their JSON Schema or data type

Editing components or documentation:
- Editing a component or documentation file opens a normal text/code editor

Managing tests:
- When editing tests, the current graph or component "zooms out" becoming a new graph editor with itself as the only node being shown
- There is a list of test cases on the side to choose and add to
- Test inputs are edited like normal Initial Information Packets
- Test expects are added as special "assertion nodes" from the component outports
- Test can be run against runtime and flowtrace captured as needed

Viewing a trace:
- There are several ways we may get Flowtraces into the system
  - Loaded by user through a file operation (where available) or maybe URL load
  - Sent by a Runtime when a Flowtrace point is hit
  - Recorded by UI whena Flowtrace point is hit (in case of runtime that can't do it on its own)
  - Recorded by user during an interactive session (we should have record/pause buttons somewhere in the editor)
  - Recorded as part of a failing test run
- Flowtraces are shown with a read-only version of the graph editor
- Edges can be selected to choose what data is shown
- There is a "timeline scrubber" to move back and forth on the trace

Configuration:
- App configuration screen allows configuring WebRTC signaling servers
- App configuration screen allows configuring Reticulum identity and interfaces
- There will likely be some options to enable/disable (like storage to disk)

## Tech stack

- Standard JavaScript and HTML targeting evergreen browsers (both desktop and mobile)
- All code is written in standard JavaScript with TypeScript annotations via JsDoc
- Web Components are used for user interface (no library)
- CRDT is used to keep state (likely Yjs, still a bit open)
- CRDT is persisted in IndexedDB
- We need a separation between project data (kept in CRDT), "awareness" data (user/runtime statuses and interaction), and dataflow data (events and packets flowing from a runtime)
- NoFlo graphs are used to manage interaction between UI and state
- Application is split between UI (main) thread and most backend logic (including the CRDT) in a Web Worker
- Communications with FBP Runtimes is handled using any FBP Protocol transport. Initially WebRTC and WebSockets
- Collaboration is handled over WebRTC and eventually also Reticulum
- Apart from building vendor files when dependencies change, there is no build. Change a source file, reload the browser

## Commands

- Serve: `npm run serve`: Start a local development server
- Vendors: `npm run build-vendors`: build latest vendor modules from `node_modules` into `vendor`

## Project structure

- `src/`: application source code
  - `src/elements/`: Web Components
  - `src/components/`: NoFlo Components
  - `src/graphs/`: NoFlo graphs
- `spec/`: unit and integration tests
  - `spec/elements/`: Web Components tests, using `node:test`, `node:assert`, and `happy-dom`
  - `spec/noflo/`: fbp-spec tests for NoFlo graphs and components
- `docs/`: documentation in Markdown format
- `vendor/`: vendored library dependencies as ES Modules

Technical work is planned using work documents (in Markdown) that are managed [using rngit](https://reticulum.network/manual/git.html#work-documents) in <rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui>.

## Boundaries

- ✅ **Always**: create a branch for any major change set, run tests after every change set
- ⚠️ **Ask first**: adding dependencies, modify CI config
- 🚫 **Never**: AI agents may not make commits on their own
