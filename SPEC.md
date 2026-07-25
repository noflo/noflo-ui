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

The editor is designed so that user can fluidly move from sketching (placing nodes on canvas and connecting them) to specifying (naming things, defining interfaces) and eventually to implementing (writing code and drawing subgraphs). Different parts of the graph might be in different states, so user might be already implementing and running components in one part, while another remains just a sketch.

In NoFlo UI, a project is a collection of:
- Graph files, in the fbp-graph JSON format. Any NoFlo UI specific parts will be stored in graph/node/edge/IIP metadata. For example: x/y coordinates, chose edge visualization widgets, Flowtrace tracepoints. Similarly the latest CRDT clock may be stored here to make reconciliation easier when reconnecting to a runtime or loading a file from disk.
- Components, in whatever programming language supported by the runtime (JavaScript and TypeScript in case of NoFlo)
- Specs files, in the fbp-spec YAML format
- Markdown documents (`README.md`, `CHANGELOG.md`, etc)

By default these will live in the CRDT structure in the NoFlo UI's IndexedDB. In some technology combinations (for example when `window.showDirectoryPicker` is supported) we may also load and store latest state from disk. Otherwise the runtime may do storage to disk.

Live collaboration will enable inviting other users to edit the project together over Reticulum. Theoretically we can also introduce AI agents as similar collaborators.

The app is meant to be a durable piece of software that can be run and maintained for years or decades to come. Because of this, reliance on the standard web stack and minimization of technology dependencies outside of that is crucial. Any 3rd party libraries are built to vendor files that we keep in our own git and loaded from those instead of `node_modules/` etc.

## Primary user interactions

Viewing or managing a graph:
- See the full visual graph and be able to pan and zoom both using mouse and multi-touch
- Nodes are circular, with their ports along the outer edge. Inports on left, outports on right. Addressable (ArrayPorts) are shown with indexed port instances "stacked together"
- Current state of the graph and the components is given by colors, highlighting, maybe animation (in case of severe problems)
- New nodes can be added by either long-pressing on an empty piece of canvas or by dragging from a port to an empty piece of canvas
  - New nodes can be either selected from list of known subgraphs or elementary (code) components, or created as a "dummy" placeholder to be filled in later
- Multiple nodes can be selected together
- Nodes can show custom status (from the running implementation) either by an icon (from Font Awesome selection), a 84x84px P4 .pbm image, or a 18x18px P6 .ppm image sent from the runtime
- When a node is selected it expands to show a radial menu and to present larger port targets for easier finger interaction
- When an edge is selected it shows its packets passing through. We will want to support different visualizations for different packet types and edge configurations (line graphs for numbers etc)
- Nodes and edges can be removed from their radial menu
- We will have a forms-based metadata editor for all normal graph parts (graph itself, node, edge, IIP)
- Initial Information Packets can be added from the menu of an inport or by dragging from inport to empty spot on canvas and choosing IIP instead of new node
- Initial Information Packets are edited using a form that supports their JSON Schema or data type
- Any connectable in or outport in the graph can be exported to be available when the graph is used as a subgraph/node in another graph

Editing components or documentation:
- Editing a component or documentation file opens a normal text/code editor
- When editing a component (or a component signature) we should visualize a node with the component's definition (ports, etc)

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

Work documents:
- Work documents are the planning part of any project. They are Markdown documents with a state (proposed/active/completed)
  - Data structure should be kept compatible with rngit work documents
- User may edit work documents they created, and post updates (comments) to any work document in the project

Configuration:
- Choosing the app theme
- Managing Reticulum identity and interfaces
- There will likely be some options to enable/disable
  - Storing project changes to disk (when implemented)
  - Disabling UI animations (default from `prefers-reduced-motion`)

### Corners

Each corner in the user interface is dedicated to a particular area of functionality:
- Top left: graph/component. Navigating up the tree, fbp-spec tests and their status. Properties/settings
- Bottom left: collaboration. CRDT collaborator status, version control, work documents
- Top right: runtime. connect/disconnect, start/stop, Flowtrace recording controls. Flowtraces associated with runtime, runtime STDOUT console, uptime
- Bottom right: local operations. Undo/redo, graph autolayout controls, minimap

The corners can be in several different visual states:
1. Hidden. Not shown at all so user is not confused by features they don't need
2. Normal. Showing basic info on couple of lines of text and icons
3. Minified. Just showing icons and counts, somewhat similarly to modern terminal status lines
4. Expanded. One of multiple elements expanded, each their own accordion
   - Open Accordions share that side of the screen equally so if you have fbp-spec test cases (top left) and work documents (bottom left) expanded, each gets 50% of vertical space

The items in the corners can be buttons (like undo), or enumerators (like "9 test cases"). Clicking them will either execute the functionality or expand that area.

On small screens like a smartphone the corners should always start either hidden or minified, except if a particular functionality is opened by URL path.

Some corner feature may also expand on its own if there is crucial functionality to show, like a new Flowtrace for a crash.

### Screen usage policy

Currently viewed or edited primary element (Graph, Component, fbp-spec, Work Document, Flowtrace, etc) gets to occupy the full screen except for the corners.

Other elements use pop-up dialogs either centered, or placed contextually (for example packet view for an edge).

### Naming is hard

We should push the decision of naming something, be it a project, graph, or a component as late in the process as humanly possible. Having to come up with names can easily break the sketching flow state. A good example of this is Apple's iMovie asking to name a project only when you close it.

New components should follow the node name until there is either a signature or implementation. New nodes should start with `in` and `out` ports. Components without a signature or implementation are in "inferred era".

### Component implementations

When sketching a graph, we start with inferred components. They just are nodes that may be connected to other nodes.

User can at any point choose to define the component signature (using the component signature schema editor) to add maybe a description and custom ports. They can also choose to implement the component. User can either go from inferred to specified to implemented, or skip the signature specification step.

For implementation there are multiple things user may want to do:
- Implement the new component in code
- Implement the new component as subgraph
- Choose an existing component
- Load a new component library (if supported by runtime) and then choose an existing component from it ("Not finding your component? Add a library")

If there is a signature defined for this component, or for nodes connected to it, these can help to populate a component template or narrow down the list of possible components to use (for example based on port data types or schemas).

When viewing a component signature, there should be big friendly buttons for "Implement as graph", "Implement in JavaScript" etc (depending what the runtime supports). When viewing a library component there should similarly be a "Fork" button to make a local editable copy.

### Guiding users

The user interface should guide user towards making the correct decisions. For example, when dragging a wire from a port, ports that are compatible should expand to show they're available for connection, while incompatible (wrong type, already occupied, etc) should shrink.
Similarly the editor should prevent elements from being positioned on top of each other. Every element should occupy its own space in the canvas.

Undo/redo should always be available so that users feel safe experimenting.

## Tech stack

- Standard JavaScript and HTML targeting evergreen browsers (both desktop and mobile)
- All code is written in standard JavaScript with TypeScript annotations via JsDoc
- Web Components are used for user interface (no library). All of our own Web Components should be prefixed with `noflo-`
- Yjs CRDT is used to keep state
- CRDT is persisted in IndexedDB
- We need a separation between project data (kept in CRDT), "awareness" data (user/runtime statuses and interaction), and dataflow data (events and packets flowing from a runtime)
- NoFlo graphs are used to manage interaction between UI and state
- Application is split between UI (main) thread and most backend logic (including the CRDT) in a Web Worker
- Communications with FBP Runtimes is handled using any FBP Protocol transport. Initially WebRTC and WebSockets
- Collaboration is handled over Reticulum (with reticulum-js)
- Apart from building vendor files when dependencies change, there is no build. Change a source file, reload the browser
- The internal implementation of the main editor in `noflo-editor` should be encapsulated so that all methods and events in exposes use actual graph data and don't leak DOM details

## Commands

- Lint: `npm run lint`: Check code formatting
- Format code: `npm run format`: Fixes linting and formatting errors that can be dealt with automatically
- Run tests: `npm test`
- Check type definitions: `npm run types`
- Serve: `npm run serve`: Start a local development server
- Vendors: `npm run build-vendors`: build latest vendor modules from `node_modules` into `vendor`. Only needed when adding/updating dependencies

## Project structure

- `src/`: application source code
  - `src/elements/`: Web Components
  - `src/components/`: NoFlo Components
  - `src/graphs/`: NoFlo graphs
  - `src/library/`: Helper libraries
- `spec/`: unit and integration tests
  - `spec/elements/`: Web Components tests, using `node:test`, `node:assert`, and `happy-dom`
  - `spec/library/`: library helper tests, using `node:test`, `node:assert`
  - `spec/noflo/`: fbp-spec tests for NoFlo graphs and components
- `docs/`: documentation in Markdown format
- `vendor/`: vendored library dependencies as ES Modules

Technical work is planned using work documents (in Markdown) that are managed [using rngit](https://reticulum.network/manual/git.html#work-documents) in <rns://3ea5aad068a337670f5bb8073226adb4/public/noflo-ui>.
