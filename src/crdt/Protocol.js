/**
 * @file IPC contract between the Main Thread ("The Glass") and the Worker
 * ("The Engine"), transcribed from SPEC.md Appendix A as JSDoc-typed
 * discriminated unions.
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
 * Appendix A extension (work documents #18/#20): IIP mutations. The IIP id
 * follows the `DATA->` deterministic edge rule.
 *
 * @typedef {Object} IntentAddIIPMessage
 * @property {'INTENT'} type
 * @property {'addIIP'} command
 * @property {{ graphId: string, data: any, tgt: { node: string, port: string, index?: number } }} payload
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
 *
 * @typedef {Object} IntentAddExportMessage
 * @property {'INTENT'} type
 * @property {'addInport' | 'addOutport'} command
 * @property {{ graphId: string, name: string, nodeId: string, port: string }} payload
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
 *   | IntentRenameExportMessage} UIWorkerMessage
 */

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
 * @property {{ id: string, component: string, metadata: { x: number, y: number, [key: string]: any } }} payload
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
 * Batched telemetry chunk (bounded queue, drop-oldest).
 *
 * @typedef {Object} NetworkFlowtraceMessage
 * @property {'network'} protocol
 * @property {'flowtrace'} command
 * @property {{ graphId: string, events: Array<{ protocol: 'network', command: 'data' | 'begingroup' | 'endgroup', payload: { id: string, src?: any, tgt?: any, data?: any, time: number } }> }} payload
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
 *   | NetworkFlowtraceMessage} EngineUIMessage
 */

/**
 * Appendix A extension: authoritative IIP echo.
 *
 * @typedef {Object} GraphAddIIPMessage
 * @property {'graph'} protocol
 * @property {'addiip'} command
 * @property {{ id: string, data: any, tgt: { node: string, port: string, index?: number } }} payload
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
 * @property {{ name: string, nodeId: string, port: string }} payload
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
