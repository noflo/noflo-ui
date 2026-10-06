/**
 * @file IPC contract between the Main Thread ("The Glass") and the Worker
 * ("The Engine"), per SPEC.md Appendix A.
 *
 * This module is the contract's source of truth: the JSDoc unions type the
 * message shapes, and the exported registries (`UI_MESSAGES`,
 * `ECHO_MESSAGES`) enumerate the exact sets of messages each side handles.
 * The dispatch tables on both sides and the contract test
 * (`spec/crdt/contract.spec.js`) enforce exact-set equality against the
 * registries — a message added on either side without a registry entry, or
 * a registry entry without a handler, fails the build (work document #37).
 *
 * The UI never commands state directly: it requests subscriptions, emits
 * intents, or broadcasts ephemeral awareness. The Engine echoes authoritative
 * `graph`/`network` protocol messages back.
 */

// ---- Glass -> Engine (UIWorkerMessage) -----------------------------------

/**
 * @typedef {Object} LifecycleSubscribeMessage
 * @property {'LIFECYCLE'} type
 * @property {'subscribe'} command
 * @property {{ graphId: string }} payload
 */

/**
 * @typedef {Object} QueryGetSignatureMessage
 * @property {'QUERY'} type
 * @property {'getSignature'} command
 * @property {{ componentName: string }} payload
 */

/**
 * Ephemeral awareness telemetry; never mutates the CRDT.
 *
 * @typedef {Object} AwarenessDragging
 * @property {string} peerId
 * @property {string} graphId
 * @property {string} nodeId
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} AwarenessMessage
 * @property {'AWARENESS'} type
 * @property {'dragging'} command
 * @property {AwarenessDragging} payload
 */

/**
 * @typedef {Object} IntentAddNodePayload
 * @property {string} graphId
 * @property {string} nodeId
 * @property {string} componentName
 * @property {{ x: number, y: number }} metadata
 */

/**
 * @typedef {Object} IntentAddNodeMessage
 * @property {'INTENT'} type
 * @property {'addNode'} command
 * @property {IntentAddNodePayload} payload
 */

/**
 * @typedef {Object} IntentRemoveNodeMessage
 * @property {'INTENT'} type
 * @property {'removeNode'} command
 * @property {{ graphId: string, nodeId: string }} payload
 */

/**
 * @typedef {Object} IntentMoveNodePayload
 * @property {string} graphId
 * @property {string} nodeId
 * @property {{ x: number, y: number }} metadata
 */

/**
 * @typedef {Object} IntentMoveNodeMessage
 * @property {'INTENT'} type
 * @property {'moveNode'} command
 * @property {IntentMoveNodePayload} payload
 */

/**
 * @typedef {Object} IntentAddEdgePayload
 * @property {string} graphId
 * @property {{ node: string, port: string, index?: number }} src
 * @property {{ node: string, port: string, index?: number }} tgt
 */

/**
 * @typedef {Object} IntentAddEdgeMessage
 * @property {'INTENT'} type
 * @property {'addEdge'} command
 * @property {IntentAddEdgePayload} payload
 */

/**
 * Edge removal only requires the deterministic id, not the full payload.
 *
 * @typedef {Object} IntentRemoveEdgeMessage
 * @property {'INTENT'} type
 * @property {'removeEdge'} command
 * @property {{ graphId: string, id: string }} payload
 */

/**
 * Appendix A extension (work document #23): graph lifecycle. A graph without
 * a parent is a root graph.
 *
 * @typedef {Object} IntentCreateGraphMessage
 * @property {'INTENT'} type
 * @property {'createGraph'} command
 * @property {{ graphId: string, name?: string, parent?: string }} payload
 */

/**
 * Appendix A extension (work document #23): graph lifecycle.
 *
 * @typedef {Object} IntentRemoveGraphMessage
 * @property {'INTENT'} type
 * @property {'removeGraph'} command
 * @property {{ graphId: string }} payload
 */

/**
 * Appendix A extension (work document #21): tombstone-revoke a grant.
 *
 * @typedef {Object} IntentRevokePermissionMessage
 * @property {'INTENT'} type
 * @property {'revokePermission'} command
 * @property {{ grantId: string }} payload
 */

/**
 * Appendix A extension (work document #25, reshaped by #27): the MESH
 * command family. Mesh commands bypass the NoFlo dispatcher (they concern
 * the mesh layer, not the CRDT graph) and are routed in the Engine's
 * message router. Most carry no payload; the ones that do are typed here.
 *
 * @typedef {Object} MeshConfigureMessage
 * @property {'MESH'} type
 * @property {'configure'} command
 * @property {Record<string, any>} payload Mesh configuration from the
 *   settings dialog (enabled flag, interface settings).
 */

/**
 * @typedef {Object} MeshJoinMessage
 * @property {'MESH'} type
 * @property {'join'} command
 * @property {{ invite: string }} payload An invite URI (`noflo://join/...`).
 */

/**
 * @typedef {Object} MeshGrantMessage
 * @property {'MESH'} type
 * @property {'grant'} command
 * @property {{ identityHash: string, role: string }} payload
 */

/**
 * @typedef {Object} MeshResolveRequestMessage
 * @property {'MESH'} type
 * @property {'resolveRequest'} command
 * @property {{ identityHash: string, decision: 'approved' | 'declined' }} payload
 */

/**
 * @typedef {Object} MeshImportIdentityMessage
 * @property {'MESH'} type
 * @property {'importIdentity'} command
 * @property {{ identity: string }} payload Base64 private key material.
 */

/**
 * Appendix A extension (work document #29): implement a component as a
 * graph. Creates the component's subgraph (graph id = component name) under
 * the implementing graph; nodes referencing the component become navigable
 * subgraph instances. Idempotent: re-implementing an already-implemented
 * component echoes the existing graph without mutating.
 *
 * @typedef {Object} IntentImplementAsGraphMessage
 * @property {'INTENT'} type
 * @property {'implementAsGraph'} command
 * @property {{ component: string, parentGraph: string }} payload
 */

/**
 * Appendix A extension (work document #29): implement a component in code.
 * Records the implementation kind and language in the component's metadata
 * and writes the scaffold into its collaborative code buffer. Rejected for
 * components already implemented as graphs.
 *
 * @typedef {Object} IntentImplementInCodeMessage
 * @property {'INTENT'} type
 * @property {'implementInCode'} command
 * @property {{ component: string, language: string, scaffold: string }} payload
 */

/**
 * Appendix A extension (work document #29): fork a component. Copies the
 * signature and implementation into the forked name and renames every
 * reference in the project's graphs, so the fork immediately takes over
 * where the original was used. The original component is untouched.
 *
 * @typedef {Object} IntentForkComponentMessage
 * @property {'INTENT'} type
 * @property {'forkComponent'} command
 * @property {{ component: string, to: string }} payload
 */

/**
 * Appendix A extension (work document #29): set a component's signature —
 * the "specify" step of the implementation flow. Graph-implemented
 * components are refused: their signatures are derived from the graph's
 * exports.
 *
 * @typedef {Object} IntentSetSignatureMessage
 * @property {'INTENT'} type
 * @property {'setSignature'} command
 * @property {{ component: string, signature: { inports?: Array<{ name: string, type?: string, addressable?: boolean }>, outports?: Array<{ name: string, type?: string, addressable?: boolean }>, description?: string, icon?: string } }} payload
 */

/**
 * Appendix A extension (work document #5 update #16): graph groups —
 * labeled selections that persist as graph structure. The tariff-zone
 * rendering is WD #35's; these intents own the structure. Membership
 * changes come from nodes dragged into or out of a group's area.
 *
 * @typedef {Object} IntentCreateGroupMessage
 * @property {'INTENT'} type
 * @property {'createGroup'} command
 * @property {{ graphId: string, nodeIds: string[], name?: string }} payload
 */

/**
 * @typedef {Object} IntentRemoveGroupMessage
 * @property {'INTENT'} type
 * @property {'removeGroup'} command
 * @property {{ graphId: string, groupId: string }} payload
 */

/**
 * @typedef {Object} IntentUpdateGroupMessage
 * @property {'INTENT'} type
 * @property {'updateGroup'} command
 * @property {{ graphId: string, groupId: string, add?: string[], remove?: string[] }} payload
 */

/**
 * Appendix A extension (work document #35): set an edge's route — the
 * route index colors the edge and drives the route highlighting; null
 * clears it.
 *
 * @typedef {Object} IntentSetEdgeRouteMessage
 * @property {'INTENT'} type
 * @property {'setEdgeRoute'} command
 * @property {{ graphId: string, edgeId: string, route: number | null }} payload
 */

/**
 * Appendix A extension (work document #35): set an exported port's route
 * — the route index colors the export wire; null clears it.
 *
 * @typedef {Object} IntentSetPortRouteMessage
 * @property {'INTENT'} type
 * @property {'setPortRoute'} command
 * @property {{ graphId: string, name: string, direction: 'inports' | 'outports', route: number | null }} payload
 */

/**
 * Payload-less MESH commands: `status` (re-report mesh state),
 * `createInvite`, `factoryReset`, and `stop` (graceful shutdown on page
 * unload).
 *
 * @typedef {Object} MeshPlainMessage
 * @property {'MESH'} type
 * @property {'status' | 'createInvite' | 'factoryReset' | 'stop'} command
 * @property {Record<string, any>} [payload]
 */

/**
 * Appendix A extension (work document #23): turn nodes into a subgraph.
 * The engine creates the child graph, moves the nodes into it, exports the
 * boundary connections as ports, replaces the nodes with a single subgraph
 * node, and registers the subgraph signature.
 *
 * @typedef {Object} IntentMakeSubgraphMessage
 * @property {'INTENT'} type
 * @property {'makeSubgraph'} command
 * @property {{ graphId: string, nodeIds: string[] }} payload
 */

/**
 * Appendix A extension (work documents #18/#20): IIP mutations. The IIP id
 * follows the `DATA->` deterministic edge rule. Metadata carries the Glass
 * position for rendering.
 *
 * @typedef {Object} IntentAddIIPMessage
 * @property {'INTENT'} type
 * @property {'addIIP'} command
 * @property {{ graphId: string, data: any, tgt: { node: string, port: string, index?: number }, metadata?: { x: number, y: number } }} payload
 */

/**
 * @typedef {Object} IntentUpdateIIPMessage
 * @property {'INTENT'} type
 * @property {'updateIIP'} command
 * @property {{ graphId: string, id: string, data: any }} payload
 */

/**
 * @typedef {Object} IntentRemoveIIPMessage
 * @property {'INTENT'} type
 * @property {'removeIIP'} command
 * @property {{ graphId: string, id: string }} payload
 */

/**
 * Appendix A extension (work documents #18/#20): exported port mutations.
 * Metadata carries the Glass position for rendering.
 *
 * @typedef {Object} IntentAddExportMessage
 * @property {'INTENT'} type
 * @property {'addInport' | 'addOutport'} command
 * @property {{ graphId: string, name: string, nodeId: string, port: string, metadata?: { x: number, y: number } }} payload
 */

/**
 * @typedef {Object} IntentRemoveExportMessage
 * @property {'INTENT'} type
 * @property {'removeInport' | 'removeOutport'} command
 * @property {{ graphId: string, name: string }} payload
 */

/**
 * @typedef {Object} IntentRenameExportMessage
 * @property {'INTENT'} type
 * @property {'renameInport' | 'renameOutport'} command
 * @property {{ graphId: string, from: string, to: string }} payload
 */

/**
 * All messages the Glass may send to the Engine.
 *
 * @typedef {LifecycleSubscribeMessage
 *   | QueryGetSignatureMessage
 *   | AwarenessMessage
 *   | IntentAddNodeMessage
 *   | IntentRemoveNodeMessage
 *   | IntentMoveNodeMessage
 *   | IntentAddEdgeMessage
 *   | IntentRemoveEdgeMessage
 *   | IntentAddIIPMessage
 *   | IntentUpdateIIPMessage
 *   | IntentRemoveIIPMessage
 *   | IntentAddExportMessage
 *   | IntentRemoveExportMessage
 *   | IntentRenameExportMessage
 *   | IntentCreateGraphMessage
 *   | IntentRemoveGraphMessage
 *   | IntentMakeSubgraphMessage
 *   | IntentMoveUpMessage
 *   | IntentRevokePermissionMessage
 *   | IntentImplementAsGraphMessage
 *   | IntentImplementInCodeMessage
 *   | IntentForkComponentMessage
 *   | IntentSetSignatureMessage
 *   | IntentCreateGroupMessage
 *   | IntentRemoveGroupMessage
 *   | IntentUpdateGroupMessage
 *   | IntentSetEdgeRouteMessage
 *   | IntentSetPortRouteMessage
 *   | MeshConfigureMessage
 *   | MeshJoinMessage
 *   | MeshGrantMessage
 *   | MeshResolveRequestMessage
 *   | MeshImportIdentityMessage
 *   | MeshPlainMessage} UIWorkerMessage
 */

// ---- Contract registries (work document #37) ------------------------------

/**
 * A Glass → Engine message key: the discriminator pair a message is
 * dispatched on.
 *
 * @typedef {Object} UIKey
 * @property {string} type
 * @property {string} command
 */

/**
 * The exact set of Glass → Engine messages the Engine handles. The Engine's
 * dispatch (the NoFlo gateway's validation, EngineCore's intent dispatch,
 * and the MESH router) must cover exactly these — no more, no less.
 *
 * @type {UIKey[]}
 */
export const UI_MESSAGES = [
  { type: "LIFECYCLE", command: "subscribe" },
  { type: "QUERY", command: "getSignature" },
  { type: "AWARENESS", command: "dragging" },
  { type: "INTENT", command: "addNode" },
  { type: "INTENT", command: "removeNode" },
  { type: "INTENT", command: "moveNode" },
  { type: "INTENT", command: "addEdge" },
  { type: "INTENT", command: "removeEdge" },
  { type: "INTENT", command: "addIIP" },
  { type: "INTENT", command: "updateIIP" },
  { type: "INTENT", command: "removeIIP" },
  { type: "INTENT", command: "addInport" },
  { type: "INTENT", command: "addOutport" },
  { type: "INTENT", command: "removeInport" },
  { type: "INTENT", command: "removeOutport" },
  { type: "INTENT", command: "renameInport" },
  { type: "INTENT", command: "renameOutport" },
  { type: "INTENT", command: "createGraph" },
  { type: "INTENT", command: "removeGraph" },
  { type: "INTENT", command: "makeSubgraph" },
  { type: "INTENT", command: "moveUp" },
  { type: "INTENT", command: "revokePermission" },
  { type: "INTENT", command: "implementAsGraph" },
  { type: "INTENT", command: "implementInCode" },
  { type: "INTENT", command: "forkComponent" },
  { type: "INTENT", command: "setSignature" },
  { type: "INTENT", command: "createGroup" },
  { type: "INTENT", command: "removeGroup" },
  { type: "INTENT", command: "updateGroup" },
  { type: "INTENT", command: "setEdgeRoute" },
  { type: "INTENT", command: "setPortRoute" },
  { type: "MESH", command: "configure" },
  { type: "MESH", command: "status" },
  { type: "MESH", command: "join" },
  { type: "MESH", command: "grant" },
  { type: "MESH", command: "resolveRequest" },
  { type: "MESH", command: "createInvite" },
  { type: "MESH", command: "factoryReset" },
  { type: "MESH", command: "stop" },
  { type: "MESH", command: "importIdentity" },
];

// ---- Engine -> Glass (EngineUIMessage) ------------------------------------

/**
 * @typedef {Object} HeartbeatMessage
 * @property {'system'} protocol
 * @property {'heartbeat'} command
 * @property {{ status: 'ok' | 'syncing', uptime: number }} payload
 */

/**
 * @typedef {Object} GraphAddNodeMessage
 * @property {'graph'} protocol
 * @property {'addnode'} command
 * @property {{ id: string, component: string, metadata: { [key: string]: any } }} payload
 */

/**
 * @typedef {Object} GraphRemoveNodeMessage
 * @property {'graph'} protocol
 * @property {'removenode'} command
 * @property {{ id: string }} payload
 */

/** Closes the loop for an `INTENT: moveNode`. */
/**
 * @typedef {Object} GraphMoveNodeMessage
 * @property {'graph'} protocol
 * @property {'movenode'} command
 * @property {{ id: string, metadata: { x: number, y: number } }} payload
 */

/**
 * @typedef {Object} GraphEdgePayload
 * @property {string} id
 * @property {{ node: string, port: string, index?: number }} src
 * @property {{ node: string, port: string, index?: number }} tgt
 * @property {{ route?: number, routePoints?: Array<{x: number, y: number}> }} [metadata]
 */

/**
 * @typedef {Object} GraphAddEdgeMessage
 * @property {'graph'} protocol
 * @property {'addedge'} command
 * @property {GraphEdgePayload} payload
 */

/**
 * @typedef {Object} GraphRemoveEdgeMessage
 * @property {'graph'} protocol
 * @property {'removeedge'} command
 * @property {{ id: string }} payload
 */

/**
 * Appendix A extension (work document #23): authoritative graph lifecycle
 * echo.
 *
 * @typedef {Object} GraphCreateGraphMessage
 * @property {'graph'} protocol
 * @property {'creategraph'} command
 * @property {{ id: string, name: string, parent: string }} payload
 */

/**
 * Appendix A extension (work document #23): move nodes from a subgraph back
 * into its parent. When the move empties the subgraph, the graph, its
 * signature, and the parent's subgraph node are removed.
 *
 * @typedef {Object} IntentMoveUpMessage
 * @property {'INTENT'} type
 * @property {'moveUp'} command
 * @property {{ graphId: string, nodeIds: string[] }} payload
 */

/**
 * Appendix A extension (work document #23): authoritative graph lifecycle
 * echo.
 *
 * @typedef {Object} GraphRemoveGraphMessage
 * @property {'graph'} protocol
 * @property {'removegraph'} command
 * @property {{ id: string }} payload
 */

/**
 * Appendix A extension (work document #23): a node's component changed.
 *
 * @typedef {Object} GraphSetComponentMessage
 * @property {'graph'} protocol
 * @property {'setcomponent'} command
 * @property {{ id: string, component: string }} payload
 */

/**
 * Batched telemetry chunk (bounded queue, drop-oldest).
 *
 * @typedef {Object} NetworkFlowtraceMessage
 * @property {'network'} protocol
 * @property {'flowtrace'} command
 * @property {{ graphId: string, events: Array<{ protocol: 'network', command: 'data' | 'begingroup' | 'endgroup', payload: { id: string, src?: any, tgt?: any, data?: any, time: number } }> }} payload
 */

/**
 * Appendix A extension (work document #21): authoritative ACL echo.
 *
 * @typedef {Object} AclRevokeMessage
 * @property {'acl'} protocol
 * @property {'revoke'} command
 * @property {{ id: string }} payload
 */

/**
 * Operation narration (work document #34): the Engine reports named
 * operations as structured progress. `operation` and `stage` are enums the
 * Glass renders micro-phrases from — never free-form Engine text. `detail`
 * carries structured interpolation parameters (hashes, counts).
 *
 * @typedef {Object} ProgressMessage
 * @property {'progress'} kind
 * @property {string} operation Dotted operation name (e.g. `mesh.connect`).
 * @property {string} stage Stage within the operation (e.g. `discovery`).
 * @property {'running' | 'done' | 'failed'} state
 * @property {Record<string, any>} [detail] Parameters for the phrase.
 */

// ---- Mesh and mirror echoes (work documents #21/#25/#27/#34/#37) ----------

/**
 * Full mesh state on boot and after every configuration change: the config,
 * the device's mesh identity, the room, pending join requests, and the
 * interface configuration schemas the settings UI renders forms from.
 *
 * @typedef {Object} MeshConfigEcho
 * @property {'mesh-config'} kind
 * @property {Record<string, any>} config
 * @property {string} identityHash
 * @property {string} [identityError]
 * @property {Record<string, any>} [room]
 * @property {Array<Record<string, any>>} [joinRequests]
 * @property {Record<string, any>} [interfaceSchemas]
 */

/**
 * Mesh connection state. Without `connected` the message carries only an
 * error or narration-relevant state.
 *
 * @typedef {Object} MeshStatusEcho
 * @property {'mesh-status'} kind
 * @property {boolean} [connected]
 * @property {boolean} [synced]
 * @property {number} [peers]
 * @property {string} [error]
 */

/**
 * Peer-set changes on the sync room.
 *
 * @typedef {Object} MeshPeersEcho
 * @property {'mesh-peers'} kind
 * @property {string[]} added
 * @property {string[]} removed
 * @property {number} [peers]
 */

/**
 * Pending join requests (bootstrap knockers and sync-refusal peers).
 *
 * @typedef {Object} MeshRequestsEcho
 * @property {'mesh-requests'} kind
 * @property {Array<{ identityHash: string, destinationHash: string | null, firstSeen: number, source?: string }>} requests
 */

/**
 * Dacar authorization state: the project's Trust Anchor, per-grant
 * verification status, and the local wallet's cataloged grants.
 *
 * @typedef {Object} MeshDacarEcho
 * @property {'mesh-dacar'} kind
 * @property {string} projectId
 * @property {{ hash: string, owner: boolean }} anchor
 * @property {Array<Record<string, any>>} grants
 * @property {Array<Record<string, any>>} wallet
 */

/**
 * A freshly minted invite: the URI plus the invite record's fields.
 *
 * @typedef {Object} MeshInviteEcho
 * @property {'mesh-invite'} kind
 * @property {string} uri
 * @property {Record<string, any>} [invite]
 */

/**
 * The Engine wiped local state; the Glass reloads into a fresh boot.
 *
 * @typedef {Object} FactoryResetEcho
 * @property {'factory-reset'} kind
 */

/**
 * Mirror protocol: full replica state (establishes Yjs clock contiguity).
 *
 * @typedef {Object} YSyncMessage
 * @property {'y-sync'} kind
 * @property {Uint8Array} update
 */

/**
 * Mirror protocol: incremental replica update.
 *
 * @typedef {Object} YUpdateMessage
 * @property {'y-update'} kind
 * @property {Uint8Array} update
 */

/**
 * Ephemeral awareness states from mesh peers (drag ghosts).
 *
 * @typedef {Object} AwarenessEcho
 * @property {'awareness'} kind
 * @property {Array<Record<string, any>>} states
 */

/**
 * All messages the Engine may send to the Glass.
 *
 * @typedef {HeartbeatMessage
 *   | GraphAddNodeMessage
 *   | GraphRemoveNodeMessage
 *   | GraphMoveNodeMessage
 *   | GraphAddEdgeMessage
 *   | GraphRemoveEdgeMessage
 *   | GraphAddIIPMessage
 *   | GraphUpdateIIPMessage
 *   | GraphRemoveIIPMessage
 *   | GraphAddExportMessage
 *   | GraphRemoveExportMessage
 *   | GraphRenameExportMessage
 *   | GraphCreateGraphMessage
 *   | GraphRemoveGraphMessage
 *   | GraphSetComponentMessage
 *   | AclRevokeMessage
 *   | ProgressMessage
 *   | MeshConfigEcho
 *   | MeshStatusEcho
 *   | MeshPeersEcho
 *   | MeshRequestsEcho
 *   | MeshDacarEcho
 *   | MeshInviteEcho
 *   | FactoryResetEcho
 *   | YSyncMessage
 *   | YUpdateMessage
 *   | AwarenessEcho
 *   | NetworkFlowtraceMessage} EngineUIMessage
 */

/**
 * An Engine → Glass message key: kind-style echoes dispatch on `kind`,
 * protocol-style echoes on the `protocol`/`command` pair.
 *
 * @typedef {{ kind: string } | { protocol: string, command: string }} EchoKey
 */

/**
 * The exact set of Engine → Glass messages the Glass handles. The Glass's
 * echo-handler table must cover exactly these — no more, no less. Protocol
 * echoes whose handling is currently trace-only (system, network, acl) are
 * registered and handled explicitly, so nothing arrives unhandled.
 *
 * @type {EchoKey[]}
 */
export const ECHO_MESSAGES = [
  { kind: "progress" },
  { kind: "y-sync" },
  { kind: "y-update" },
  { kind: "awareness" },
  { kind: "mesh-config" },
  { kind: "mesh-status" },
  { kind: "mesh-peers" },
  { kind: "mesh-requests" },
  { kind: "mesh-dacar" },
  { kind: "mesh-invite" },
  { kind: "factory-reset" },
  { protocol: "system", command: "heartbeat" },
  { protocol: "system", command: "signature" },
  { protocol: "graph", command: "addnode" },
  { protocol: "graph", command: "removenode" },
  { protocol: "graph", command: "movenode" },
  { protocol: "graph", command: "setcomponent" },
  { protocol: "graph", command: "addedge" },
  { protocol: "graph", command: "removeedge" },
  { protocol: "graph", command: "addiip" },
  { protocol: "graph", command: "updateiip" },
  { protocol: "graph", command: "removeiip" },
  { protocol: "graph", command: "addinport" },
  { protocol: "graph", command: "addoutport" },
  { protocol: "graph", command: "removeinport" },
  { protocol: "graph", command: "removeoutport" },
  { protocol: "graph", command: "renameinport" },
  { protocol: "graph", command: "renameoutport" },
  { protocol: "graph", command: "creategraph" },
  { protocol: "graph", command: "removegraph" },
  { protocol: "network", command: "flowtrace" },
  { protocol: "acl", command: "revoke" },
];

/**
 * Appendix A extension: authoritative IIP echo.
 *
 * @typedef {Object} GraphAddIIPMessage
 * @property {'graph'} protocol
 * @property {'addiip'} command
 * @property {{ id: string, data: any, tgt: { node: string, port: string, index?: number }, metadata?: { x: number, y: number } }} payload
 */

/**
 * @typedef {Object} GraphUpdateIIPMessage
 * @property {'graph'} protocol
 * @property {'updateiip'} command
 * @property {{ id: string, data: any }} payload
 */

/**
 * @typedef {Object} GraphRemoveIIPMessage
 * @property {'graph'} protocol
 * @property {'removeiip'} command
 * @property {{ id: string }} payload
 */

/**
 * Appendix A extension: authoritative exported-port echoes.
 *
 * @typedef {Object} GraphAddExportMessage
 * @property {'graph'} protocol
 * @property {'addinport' | 'addoutport'} command
 * @property {{ name: string, nodeId: string, port: string, metadata?: { [key: string]: any } }} payload
 */

/**
 * @typedef {Object} GraphRemoveExportMessage
 * @property {'graph'} protocol
 * @property {'removeinport' | 'removeoutport'} command
 * @property {{ name: string }} payload
 */

/**
 * @typedef {Object} GraphRenameExportMessage
 * @property {'graph'} protocol
 * @property {'renameinport' | 'renameoutport'} command
 * @property {{ from: string, to: string }} payload
 */

/**
 * Engine response to a `QUERY: getSignature` message. NOTE: Appendix A does
 * not yet define a query-response channel; this `system: signature` shape is
 * the proposed addition and should be reconciled back into the SPEC.
 *
 * @typedef {Object} SignatureMessage
 * @property {'system'} protocol
 * @property {'signature'} command
 * @property {{ componentName: string, signature: any }} payload
 */

/**
 * Structural check that a message conforms to the Appendix A envelope.
 *
 * @param {any} message
 * @returns {boolean}
 */
export function isUIWorkerMessage(message) {
  return (
    !!message &&
    typeof message === "object" &&
    typeof message.type === "string" &&
    typeof message.command === "string" &&
    typeof message.payload === "object" &&
    message.payload !== null
  );
}
