# NoFlo Development Environment Specification

## Objective

NoFlo Development Environment (NoFlo UI in short) is a node-based editor for creating, editing, and managing flow-based applications. The approach is known as "live programming", meaning that applications connected to the UI can be modified while they run.

Applications can run in the UI itself (using the in-browser NoFlo runtime) or on a remote system accessible via FBP Protocol. Any FBP Protocol compatible Dataflow engine can be managed with this UI. The architecture is engineered for extreme durability, off-grid hardware environments (like marine deployments), and low-bandwidth mesh networks.

The aim is to handle the full lifecycle of flow-based software, from:

* **Sketching**: Using "dummy" placeholder nodes
* **Implementation**: Selecting libraries, writing code, or drawing subgraphs
* **Verification**: Adding/running tests via `fbp-spec`
* **Deployment**: Running on remote runtimes over FBP Protocol
* **Observability**: Seeing the state of runtimes. Setting tracepoints and traveling through dataflow via Flowtraces

Eventually we also want to be able to:

* Manage and edit project documentation, change logs, and other Markdown documents associated with a project
* Utilize work documents associated with the project (via `rngit`)
* Version control and make releases (via `rngit`)

The home view is a zoomable flow editor. Upon first launch, a "home graph" orchestrates discovered runtimes, components, and projects. Runtime discovery happens dynamically via mDNS (facilitated by a local companion daemon) and Reticulum Announce packets. It can also happen out-of-band (the "sneakernet" way) through URLs/QR codes containing connection details.

**Dogfooding:** NoFlo UI is itself built with NoFlo. The application's core business logic, view orchestration, and Worker-to-UI dispatching are defined as NoFlo graphs running in the browser.

---

## Trust Model & Authorization

Remote runtimes, live mesh collaboration, and untrusted graph execution require strict security boundaries.

### Legacy Transports (FBP Protocol 1.0)

WebRTC and WebSockets transports are supported **solely** for connecting to legacy FBP Protocol 1.0 runtimes. The mesh security model is out of scope here; authorization relies entirely on the legacy shared secret mechanism. WebRTC signaling servers are treated as zero-trust brokers, facilitating the handshake while DTLS/SRTP handles the secure payload.

### Mesh Transports (Dacar & FBP Protocol 2.0)

For Reticulum/LXMF connections, NoFlo UI utilizes **Dacar** (a Reticulum-based capability system). Runtimes require a valid Dacar token to accept FBP connections.

* **Observer:** Public access or basic tuple-hash validation (a cryptographic proof-of-delegation chaining back to the graph owner).
* **Operator:** Explicit peer grant from owner.
* **Developer:** Recursive delegation with strict termination rules and deterministic garbage collection of expired token trees (revoked via CRDT tombstones). Automated AI agents are issued strictly scoped, sandboxed Developer/Operator tokens, instantly revocable by human admins.

---

## Architecture, Rendering & Data Model

The application enforces a strict split to guarantee the UI remains highly responsive during heavy CRDT reconciliation.

* **Main Thread (The Glass):** View layer with no independent write authority. Handles DOM/SVG rendering, CSS animations, and keyboard navigation.
* **Worker Thread (The Engine):** Owns FBP Protocol execution, Yjs CRDT state, Dacar authorization, and Reticulum/LXMF mesh connectivity.

### The UI Shadow State (Read Replica)

The UI thread maintains a synchronized read replica of the CRDT graph. The UI queries this local shadow state for immediate UI decisions but cannot commit state unilaterally. All mutations are sent as Intents to the Worker, which validates them and echoes authoritative updates back.

### Rendering Strategy (SVG)

The graph canvas utilizes an **SVG-based rendering engine**. SVG is chosen over Canvas2D/WebGL for its native DOM accessibility (ARIA roles, logical tab-ordering), CSS styling compatibility, and event hit-testing capabilities.

* **Coordinate System:** A dependency-free, hand-rolled `ViewportTransform` utility manages the math between screen space and the primary SVG `<g>` canvas.
* **Performance Ceiling & Culling:** To manage SVG DOM cost, the UI enforces a Level-of-Detail (LOD) ceiling. Beyond ~250 nodes on screen, or when zoomed out past a specific threshold, the UI culls off-screen nodes (via simple bounding box intersection) and degrades rendered nodes to simplified geometric bounds (hiding ports, labels, and icons) to maintain 60fps.

### Project CRDT Structure (Yjs)

Every project is backed by a single `Y.Doc`.

* **`metadata`:** Includes the CRDT schema version. The Worker handles automated data migrations for older UI versions.
* **`graphs`:** A `Y.Map` of graphs. Edges use deterministic keys (incorporating ArrayPort indices) to prevent array index conflicts.
* **`components`:** A `Y.Map` containing per-component configurations and collaborative `Y.Text` code buffers.
* **`registry`:** Component signatures.
* **`specs`:** A `Y.Map` of structural test suites, each containing a nested `Y.Array` of test cases.

### The Source of Truth: CRDT vs. Files

The Yjs CRDT in IndexedDB is the authoritative live editing structure. Standard file formats (fbp-graph JSON, fbp-spec YAML) act as export/interchange serializations. The CRDT clock stored in graph metadata is used to reconcile external file modifications made on disk via the File System Access API, merging them deterministically back into the Yjs vector.

---

## Web Components & Lifecycle Internals

The UI uses standard Web Components, strictly prefixing tags with `noflo-`.

* **The Base Class:** All components extend a custom `NofloElement` base class. This standardizes `connectedCallback` and `disconnectedCallback` lifecycle cleanup to prevent memory leaks in the durable architecture.
* **Light DOM vs. Shadow DOM:** The application standardizes on **Light DOM** for all SVG-based elements. SVG definitions (`<defs>`, markers) and CSS custom property styling (for theme-switching) break down across Shadow boundaries. Shadow DOM is reserved strictly for encapsulated HTML forms/modals outside the graph canvas.
* **Mechanical UI/NoFlo Bridge:** Web Components act as pure, dumb views. Parent elements pass data down via primitive DOM attributes or a standardized `state` property setter. Children communicate upwards exclusively by dispatching native `CustomEvent` bubbles (e.g., `{ action, payload }`). A top-level "View Controller" NoFlo graph (running on the main thread) attaches listeners to the DOM shell, routes those events through the UI-side NoFlo business logic, and maps the outputs back to the DOM nodes' reactive properties.
* **View Stack & Routing:** A hand-rolled Hash Router (`window.onhashchange`) manages navigation. To prevent losing zoom/pan context, navigating away from the graph editor (e.g., into settings) does not unmount the SVG canvas; it is hidden via CSS, preserving its local state.
* **Graph Addressing:** The Glass routes the edited location in the URL as `#/p/<projectId>/<graphId>`, with hierarchical subgraph ids (`main/A/deep`). Navigation into or out of a subgraph pushes history entries, so browser back/forward walks the graph stack, and a reload lands on the routed graph. Unrouted URLs normalize to the project's root graph without polluting history.

---

## Worker Internals & Resilience

* **Intent/Command Dispatch:** The Worker's message dispatcher is a compiled **NoFlo graph**. When an Intent arrives via `postMessage`, it enters the network, routes through capability checks (Dacar), applies to the Yjs doc, and routes the resulting mutations back to the UI.
* **Backpressure & Queuing:** To prevent main-thread UI lag, telemetry pushed from Worker to UI (Flowtraces) utilizes a bounded queue with a drop-oldest policy. Critical Intents (UI to Worker) are queued sequentially.
* **Worker Supervisor:** A supervisor script on the main thread monitors a heartbeat from the Worker. If the Worker crashes or is terminated due to memory pressure, the supervisor seamlessly respins it, resubscribing to the IndexedDB CRDT doc and re-establishing mesh connections.

---

## Observability, Persistence & Testing

### Error Handling & Diagnostics

A global `window.onerror` and `unhandledrejection` boundary captures fatal errors. For field debugging in offline environments, NoFlo UI includes an in-app diagnostic log panel that persists local crash reports and mesh connectivity states, removing reliance on remote telemetry servers.

### IndexedDB Persistence & Multi-Tab Safety

* **Multi-Tab Coordination:** If a user opens the project in two tabs, a `BroadcastChannel` layer performs leader-election. Only the leader tab spins up the Worker and holds write-access to IndexedDB and the mesh sockets. Secondary tabs become read-only observers of the leader's state.
* **Eviction Protection:** The app queries the `navigator.storage` API. If IndexedDB eviction is imminent due to storage limits, the UI proactively warns the user to export critical data.
* **IndexedDB Schema Migration:** The wrapper database uses IndexedDB's native `onupgradeneeded` lifecycle to handle structural storage migrations independently of the Yjs document schema.

### Testing Infrastructure

* **Unit Testing:** `spec/elements/` tests standard Web Components using `node:test` and `happy-dom`. Worker logic is isolated into pure ES modules to be tested without a Worker context.
* **Spatial Testing:** Because `happy-dom` lacks real geometry, a smaller suite of **Playwright** tests asserts spatial interactions (collision detection, hit-testing, radial menu placement) against a real browser layout engine.

### Build/Vendoring Mechanics

The application relies on native `import`/`export` and `<script type="importmap">`.

* **The `build-vendors` Command:** Because import maps cannot resolve nested bare specifiers inside third-party `node_modules`, this command utilizes a bundler strictly to flatten and export vendored dependencies into single, ES module files inside `vendor/`. This ensures the live application runs natively without a build step.

---

## Decades-Long Durability Strategy

* **Dependency Minimization:** Any suggestions of software libraries must be explicitly verified for EUPL-1.2 compatibility.
* **Encapsulated Exceptions:** Yjs, `rngit`, and Dacar/Reticulum are explicitly chosen exceptions. Yjs is utilized because its underlying CRDT mathematics are formally specifiable outside the library itself. Reticulum and `rngit` provide necessary hardware independence and mesh-native versioning.
* **Codec Avoidance:** Nodes can report status via 84x84px P4 `.pbm` or 18x18px P6 `.ppm` images to eliminate PNG/JPEG codec overhead on constrained edge microcontrollers.

---

## Primary User Interactions

### Viewing or managing a graph

* **Canvas Navigation:** See the full visual graph and be able to pan and zoom. The highly visual canvas includes semantic DOM fallbacks, ARIA roles, and logical tab-ordering to support keyboard navigation and screen readers.
* **Node Geometry:** Nodes are circular, with ports along the outer edge. Inports on left, outports on right. Addressable (ArrayPorts) are shown stacked.
* **Spatial Interactions (Ghost Dragging):** When dragging nodes, the UI Space Manager handles synchronous collision detection to prevent overlaps (a single-user affordance, not a strict multi-user invariant). Dragging acts as an ephemeral "ghost" state, emitting `AWARENESS` broadcasts over the mesh (throttled to ~250ms) to render live cursors for peers. Only upon mouse-up does the UI fire the authoritative `INTENT: moveNode` to commit the final coordinates to the Worker.
* **High-Latency Mesh UX (Pending States):** Reticulum/LXMF is a store-and-forward mesh. Optimistic UI updates enter an "unconfirmed/pending" visual state (e.g., dashed outlines). Dependent logic cannot be built on pending nodes until cryptographic confirmation of the CRDT merge is received.
* **Context Menus:** When a node is selected, it expands to show a radial menu. Options are evaluated synchronously by the local NoFlo UI graph.
* **Edge Visualization:** Selected edges show packets passing through. A pluggable UI registry determines packet visualization.

### Managing tests

* When editing tests, the UI isolates the current component, becoming a new graph editor with the subject under test as the only node shown. Tests are managed structurally in the CRDT (allowing form-based test building). Test expects are added as special "assertion nodes" from the component outports.

### Viewing a trace

* **Streaming Architecture:** Execution telemetry is buffered by the Worker into concatenated MsgPack chunks and flushed to the UI.
* There is a timeline scrubber. During standard live execution, the UI renders an ambient density heatmap on the grid; during paused step-debugging, the UI highlights specific packets on the wire.

### Configuration

* Toggling themes, local disk persistence, and animations (`prefers-reduced-motion`).
* Managing Reticulum identity, interfaces, and Dacar tokens.

---

## Commands

* `npm run lint`: Check code formatting
* `npm run format`: Fixes linting/formatting errors automatically
* `npm test`: Run unit, integration, and spatial (Playwright) tests
* `npm run serve`: Start local development server
* `npm run build-vendors`: Flatten `node_modules` into `vendor/` (strictly EUPL-1.2 compatible).

---

## Project structure

* `src/`: application source code
* `src/elements/`: Web Components (Light DOM preferred, `NofloElement` base)
* `src/graphs/`: NoFlo graphs (driving UI business logic & Worker dispatch)
* `src/worker/`: Web Worker execution engine


* `spec/`: unit, integration, and Playwright spatial tests
* `vendor/`: flattened dependencies as ES Modules

---

## Boundaries

* ✅ **Always**: add basic test coverage, check linters, verify EUPL-1.2 compatibility.
* ⚠️ **Ask first**: adding dependencies.
* Additional boundaries for AI Agents can be found from `AGENTS.md`.

---

## Appendix A: IPC Contract Schemas

These interfaces enforce a strict Application Boundary between the Main Thread (UI) and the Web Worker (Engine), defined using exact discriminated unions to guarantee type safety. The UI never commands state directly; it requests subscriptions, emits intents, or broadcasts ephemeral awareness. The Worker echoes authoritative FBP Protocol 2.0 commands back.

**Source of truth and enforcement (work document #37):** the contract lives as machine-readable registries in `src/crdt/Protocol.js` (`UI_MESSAGES`, `ECHO_MESSAGES`) alongside the JSDoc-typed unions. The Engine dispatches through enumerable tables (`EngineCore`'s `CORE_TYPE_HANDLERS`/`INTENT_HANDLERS`, the MESH router in `src/worker/mesh-commands.js`), the Glass through its echo dispatch table (`src/glass/echo-handlers.js`), and the NoFlo gateway refuses messages outside the registry at the boundary. `spec/crdt/contract.spec.js` (run by `npm test`) asserts exact-set equality between the registries and the dispatch tables on both sides — a message added on either side without a registry entry, or a registry entry without a handler, fails the build. **Process rule: a contract change lands in the same commit or milestone as the dispatch change that requires it, never "later".**

### Part 1: UI to Worker (`Main -> Engine`)

```typescript
type UIWorkerMessage =
  | { type: 'LIFECYCLE'; command: 'subscribe'; payload: { graphId: string } }
  | { type: 'QUERY'; command: 'getSignature'; payload: { componentName: string } }
  | { type: 'AWARENESS'; command: 'dragging'; payload: AwarenessDragging }
  | { type: 'INTENT'; command: 'addNode'; payload: IntentAddNode }
  | { type: 'INTENT'; command: 'removeNode'; payload: IntentRemoveNode }
  | { type: 'INTENT'; command: 'moveNode'; payload: IntentMoveNode }
  | { type: 'INTENT'; command: 'addEdge'; payload: IntentAddEdge }
  | { type: 'INTENT'; command: 'removeEdge'; payload: IntentRemoveEdge }
  | { type: 'INTENT'; command: 'addIIP'; payload: IntentAddIIP }
  | { type: 'INTENT'; command: 'updateIIP'; payload: IntentUpdateIIP }
  | { type: 'INTENT'; command: 'removeIIP'; payload: IntentRemoveIIP }
  | { type: 'INTENT'; command: 'addInport' | 'addOutport'; payload: IntentAddExport }
  | { type: 'INTENT'; command: 'removeInport' | 'removeOutport'; payload: IntentRemoveExport }
  | { type: 'INTENT'; command: 'renameInport' | 'renameOutport'; payload: IntentRenameExport }
  | { type: 'INTENT'; command: 'createGraph'; payload: IntentCreateGraph }
  | { type: 'INTENT'; command: 'removeGraph'; payload: IntentRemoveGraph }
  | { type: 'INTENT'; command: 'makeSubgraph'; payload: IntentMakeSubgraph }
  | { type: 'INTENT'; command: 'moveUp'; payload: IntentMoveUp }
  | { type: 'INTENT'; command: 'revokePermission'; payload: IntentRevokePermission }
  | { type: 'INTENT'; command: 'implementAsGraph'; payload: { component: string; parentGraph: string } }
  | { type: 'INTENT'; command: 'implementInCode'; payload: { component: string; language: string; scaffold: string } }
  | { type: 'INTENT'; command: 'forkComponent'; payload: { component: string; to: string } }
  | { type: 'INTENT'; command: 'setSignature'; payload: { component: string; signature: { inports?: Array<{ name: string }>; outports?: Array<{ name: string }>; description?: string; icon?: string } } }
  | { type: 'INTENT'; command: 'createGroup'; payload: { graphId: string; nodeIds: string[]; name?: string } }
  | { type: 'INTENT'; command: 'removeGroup'; payload: { graphId: string; groupId: string } }
  | { type: 'INTENT'; command: 'updateGroup'; payload: { graphId: string; groupId: string; add?: string[]; remove?: string[] } }
  | { type: 'INTENT'; command: 'setEdgeRoute'; payload: { graphId: string; edgeId: string; route: number | null } }
  | { type: 'INTENT'; command: 'setPortRoute'; payload: { graphId: string; name: string; direction: 'inports' | 'outports'; route: number | null } }
  | { type: 'MESH'; command: 'configure'; payload: Record<string, any> }
  | { type: 'MESH'; command: 'status' }
  | { type: 'MESH'; command: 'join'; payload: { invite: string } }
  | { type: 'MESH'; command: 'grant'; payload: { identityHash: string; role: string } }
  | { type: 'MESH'; command: 'resolveRequest'; payload: { identityHash: string; decision: 'approved' | 'declined' } }
  | { type: 'MESH'; command: 'createInvite' }
  | { type: 'MESH'; command: 'factoryReset' }
  | { type: 'MESH'; command: 'stop' }
  | { type: 'MESH'; command: 'importIdentity'; payload: { identity: string } };

// Tombstone-revoke a grant (work document #21). Grants are minted born-verified
// through `MESH grant` (work document #27); the intent only ever revokes.
interface IntentRevokePermission { grantId: string }

// Component implementation flow (work document #29): sketch to specify to
// implement. `implementAsGraph` creates the component's subgraph (graph id =
// component name, parent = the implementing graph); `implementInCode` records
// the implementation kind and language and writes the scaffold into the
// component's collaborative code buffer; `forkComponent` copies a component
// into the forked name and renames every reference in the project's graphs.
interface IntentRevokePermission { grantId: string }

// Awareness: Throttled telemetry for mesh peers (does not mutate CRDT)
interface AwarenessDragging { peerId: string; graphId: string; nodeId: string; x: number; y: number; }

// Intents: Requests to mutate the CRDT
interface IntentAddNode { graphId: string; nodeId: string; componentName: string; metadata: { x: number; y: number } }
interface IntentRemoveNode { graphId: string; nodeId: string; }
interface IntentMoveNode { graphId: string; nodeId: string; x: number; y: number; }
interface IntentAddEdge {
  graphId: string;
  src: { node: string; port: string; index?: number };
  tgt: { node: string; port: string; index?: number }
}
// Edge removal only requires the deterministic ID, not the full payload
interface IntentRemoveEdge { graphId: string; id: string; }

// IIPs are stored as edges with a `DATA->` deterministic id (Appendix B).
// Metadata carries the Glass position so renders are stable across reloads.
interface IntentAddIIP {
  graphId: string;
  data: any;
  tgt: { node: string; port: string; index?: number };
  metadata?: { x: number; y: number };
}
interface IntentUpdateIIP { graphId: string; id: string; data: any }
interface IntentRemoveIIP { graphId: string; id: string }

// Exported ports. Metadata carries the Glass position of the exported port
// element, persisted so layouts survive reloads.
interface IntentAddExport {
  graphId: string;
  name: string;
  nodeId: string;
  port: string;
  metadata?: { x: number; y: number };
}
interface IntentRemoveExport { graphId: string; name: string }
interface IntentRenameExport { graphId: string; from: string; to: string }

// Graph lifecycle. A graph without a parent is a root graph. Graph creation
// is idempotent; graphs with children cannot be removed until the children
// are removed first.
interface IntentCreateGraph { graphId: string; name?: string; parent?: string }
interface IntentRemoveGraph { graphId: string }

// Subgraph operations (see Appendix B for the full semantics). Both operate
// atomically: the engine applies the whole transformation and echoes the
// resulting changes.
interface IntentMakeSubgraph { graphId: string; nodeIds: string[] }
interface IntentMoveUp { graphId: string; nodeIds: string[] }

// MESH commands (work documents #25/#27) bypass the NoFlo dispatcher: they
// concern the mesh layer, not the CRDT graph, and are routed by the Engine's
// message router (`src/worker/mesh-commands.js`). Unknown commands are
// refused loudly.
```

### Part 2: Worker to UI (`Engine -> Main`)

```typescript
type EngineUIMessage =
  | { protocol: 'system'; command: 'heartbeat'; payload: { status: 'ok' | 'syncing'; uptime: number } }
  | { protocol: 'system'; command: 'signature'; payload: SignatureResponse }
  | { protocol: 'graph'; command: 'addnode'; payload: GraphAddNode }
  | { protocol: 'graph'; command: 'removenode'; payload: GraphRemoveNode }
  | { protocol: 'graph'; command: 'movenode'; payload: GraphMoveNode }
  | { protocol: 'graph'; command: 'setcomponent'; payload: GraphSetComponent }
  | { protocol: 'graph'; command: 'addedge'; payload: GraphEdge }
  | { protocol: 'graph'; command: 'removeedge'; payload: { id: string } }
  | { protocol: 'graph'; command: 'addiip'; payload: GraphIIP }
  | { protocol: 'graph'; command: 'updateiip'; payload: { id: string; data: any } }
  | { protocol: 'graph'; command: 'removeiip'; payload: { id: string } }
  | { protocol: 'graph'; command: 'addinport' | 'addoutport'; payload: GraphExport }
  | { protocol: 'graph'; command: 'removeinport' | 'removeoutport'; payload: { name: string } }
  | { protocol: 'graph'; command: 'renameinport' | 'renameoutport'; payload: { from: string; to: string } }
  | { protocol: 'graph'; command: 'creategraph'; payload: GraphCreateGraph }
  | { protocol: 'graph'; command: 'removegraph'; payload: { id: string } }
  | { protocol: 'acl'; command: 'revoke'; payload: { id: string } }
  | { kind: 'progress'; operation: string; stage: string; state: 'running' | 'done' | 'failed'; detail?: Record<string, any> }
  | { kind: 'y-sync'; update: Uint8Array }
  | { kind: 'y-update'; update: Uint8Array }
  | { kind: 'awareness'; states: Array<Record<string, any>> }
  | { kind: 'mesh-config'; config: Record<string, any>; identityHash: string; identityError?: string; room?: Record<string, any>; joinRequests?: Array<Record<string, any>>; interfaceSchemas?: Record<string, any> }
  | { kind: 'mesh-status'; connected?: boolean; synced?: boolean; peers?: number; error?: string }
  | { kind: 'mesh-peers'; added: string[]; removed: string[]; peers?: number }
  | { kind: 'mesh-requests'; requests: Array<{ identityHash: string; destinationHash: string | null; firstSeen: number; source?: string }> }
  | { kind: 'mesh-dacar'; projectId: string; anchor: { hash: string; owner: boolean }; grants: Array<Record<string, any>>; wallet: Array<Record<string, any>> }
  | { kind: 'mesh-invite'; uri: string }
  | { kind: 'factory-reset' }
  | { protocol: 'network'; command: 'flowtrace'; payload: NetworkFlowtraceChunk };

// Graph Protocol (The UI blindly executes these to update DOM/SVG shadow state)
interface GraphAddNode { id: string; component: string; metadata: { [key: string]: any } }
interface GraphRemoveNode { id: string; }
// Closes the loop for IntentMoveNode
interface GraphMoveNode { id: string; metadata: { x: number; y: number } }
// Emitted when a node's component changes (e.g. on subgraph conversion)
interface GraphSetComponent { id: string; component: string }
interface GraphEdge {
  id: string;
  src: { node: string; port: string; index?: number };
  tgt: { node: string; port: string; index?: number };
  metadata?: { route?: number; routePoints?: Array<{x: number, y: number}> };
}
// IIP echoes reuse the deterministic edge id. GraphIIP.id is the `DATA->` key.
interface GraphIIP {
  id: string;
  data: any;
  tgt: { node: string; port: string; index?: number };
  metadata?: { [key: string]: any };
}
interface GraphExport {
  name: string;
  nodeId: string;
  port: string;
  metadata?: { [key: string]: any };
}
interface GraphCreateGraph { id: string; name: string; parent: string }

// Query response for `QUERY: getSignature`; also serves as the echo channel
// when signatures are written. A null signature means the component is
// unknown to the registry.
interface SignatureResponse { componentName: string; signature: any }

// Operation narration (work document #34): named operations report structured
// progress. `operation` and `stage` are enums the Glass renders micro-phrases
// from — the Engine never sends free-form user-facing text.
interface ProgressDetail { [key: string]: any }

// Mesh and mirror echoes (work documents #21/#25/#27/#34). Kind-style echoes
// carry their discriminator in `kind`; the Glass dispatches every Engine
// message through `src/glass/echo-handlers.js`, whose keys must equal the
// registry exactly (see the process rule at the top of this appendix).
interface MeshStatus { connected?: boolean; synced?: boolean; peers?: number; error?: string }
interface MeshPeerChange { added: string[]; removed: string[]; peers?: number }
interface MeshJoinRequest { identityHash: string; destinationHash: string | null; firstSeen: number; source?: string }
interface MeshDacarState { projectId: string; anchor: { hash: string; owner: boolean }; grants: Array<Record<string, any>>; wallet: Array<Record<string, any>> }

// Network Protocol (Batched telemetry chunks)
interface NetworkFlowtraceChunk {
  graphId: string;
  events: Array<{
    protocol: 'network';
    command: 'data' | 'begingroup' | 'endgroup';
    payload: { id: string; src?: object; tgt?: object; data?: any; time: number; }
  }>;
}
```

**Known gap — graph scoping of echoes:** graph protocol echoes do not yet carry a `graphId`, so a consumer subscribed to multiple graphs cannot tell which graph a change belongs to. The Glass is unaffected today because it re-renders from CRDT synchronization and only projects the graph the URL router selects. Before any consumer relies on the echo channel across graphs, the graph-scoped echo payloads gain a `graphId` field.

---

## Appendix B: Yjs CRDT Document Structure

Each NoFlo project is backed by a single `Y.Doc`. This structure provides an explicit security/sync unit over Reticulum and IndexedDB.

### Root Layout

```javascript
const doc = new Y.Doc();
const metadata   = doc.getMap('metadata');   // Project metadata (name, id, schema version)
const graphs     = doc.getMap('graphs');     // Y.Map<graphId, Y.Map>
const components = doc.getMap('components'); // Y.Map<componentId, Y.Map> (metadata and Y.Text buffer)
const registry   = doc.getMap('registry');   // Y.Map<componentName, Y.Map> (Signatures)
const specs      = doc.getMap('specs');      // Y.Map<specId, Y.Map> (fbp-spec testing)

```

### Graph Layout and Hierarchy

Each graph carries a `metadata` map describing it in the project-wide graph hierarchy. A graph without a `parent` is a root graph; subgraph ids are hierarchical (`parent/nodeName`), which also makes them directly addressable in the Glass URL router (`#/p/<projectId>/<graphId>`).

```typescript
// Inside doc.getMap('graphs').get(graphId)
metadata: Y.Map<{
  name: string;    // Human-readable name, defaults to the graph id
  parent: string;  // Parent graph id, empty string for root graphs
  created: number; // Creation timestamp
}>
nodes: Y.Map<string, Y.Map<{ id: string, component: string, metadata: Y.Map }>>
inports: Y.Map<string, Y.Map<{ process: string, port: string, metadata: Y.Map }>>
outports: Y.Map<string, Y.Map<{ process: string, port: string, metadata: Y.Map }>>

```

Exported port metadata carries the Glass position (`x`, `y`) so exported port layouts persist across reloads; IIP edge metadata carries the packet's canvas position the same way.

### Subgraph Lifecycle Semantics

`makeSubgraph` turns a selection of nodes into a subgraph in one atomic operation:

* A child graph `parent/<firstNodeId>` is created; the selected nodes **move** into it with their original components, ids, and positions.
* The moved nodes are replaced in the parent by a single **subgraph node** — the first moved node's id, component switched to the child graph id, positioned at the bounding-box center of the selection.
* Connections are rewired: edges between moved nodes follow them into the child; edges crossing the boundary retarget to the subgraph node and the crossed port becomes an exported child port (unique names on conflicts, e.g. `in`, `in2`); IIPs into moved nodes stay in the parent, retargeted, with the port exported. With no boundary connections at all, the default `in0`/`out0` ports are exported.
* The child graph's exported ports are registered as the subgraph component's registry signature, so the node renders with its real ports and is openable.

`moveUp` is the reverse: a selection of nodes moves back into the parent graph. Internal wiring moves with the nodes; connections between moved and staying nodes reroute through new exports on the staying side (reusing an existing export when the same port already crosses the boundary); parent connections routed through the subgraph node's exported ports reconnect directly, replacing the routed edge; parent IIPs routed into the subgraph retarget to the moved node. When the move empties the subgraph, the graph, its registry signature, and the parent's subgraph node are removed. A moved node may take over the subgraph node's id on a full unnest; other id collisions are rejected.

### Registry Signatures

The registry holds the ports a component exposes, used by the UI to render nodes. When a node is added referencing a component without a signature, the engine registers the default `in0`/`out0` signature — the same fallback the editor renders for signature-less components — so the registry and the UI stay consistent. Existing signatures are never overwritten.

### Graph & Edge Determinism

Edges map keys must be deterministic string hashes to prevent `Y.Array` index shifts during concurrent peer mutations. Crucially, the hash incorporates the `index` property to prevent silent collisions when multiple ArrayPort instances fan into or out of a single component.

```typescript
// Inside doc.getMap('graphs').get(graphId)
edges: Y.Map<string, Y.Map<{
  id: string; // The deterministic key
  src?: { node: string, port: string, index?: number };
  data?: any; // Static payload (Replaces `src` for Initial Information Packets)
  tgt: { node: string, port: string, index?: number };
  metadata: Y.Map<{ route?: number, routePoints?: Y.Array<{x: number, y: number}> }>
}>>

```

* **Standard Edge ID Rule:** `"${src.node}:${src.port}[${src.index ?? 0}]->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]"`
* **IIP Edge ID Rule:** `"DATA->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]"`

### fbp-spec Structural Layout

To prevent YAML merge conflicts and enable forms-based test editing, specs are defined structurally with an optional fixture graph sub-topology.

```typescript
// Inside doc.getMap('specs').get(specId)
{
  id: "test-nmea-parsing",
  topic: "marine/NMEA2000-Reader",
  cases: Y.Array<Y.Map<{
    name: string,
    fixtureGraph?: Y.Map<{ nodes: Y.Map, edges: Y.Map }>, // Optional contextual setup
    inputs: Y.Array<Y.Map<{ port: string, payload: any }>>,
    expects: Y.Array<Y.Map<{ port: string, payload: any, assertion?: string }>>
  }>>
}

```
