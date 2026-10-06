/**
 * @file The Glass's custom event contract (work document #11): one
 * centralized event map typing every `CustomEvent` the Glass's components
 * dispatch, plus the `emit`/`on` helpers that enforce it. Payload mistakes
 * and unknown event names fail `npm run types` — see
 * `src/events.tripwires.js` for the proof.
 *
 * The map is Glass-internal only: Engine communication stays on the
 * Appendix A message contract (work document #37); nothing here crosses the
 * worker boundary.
 */

// ---- Payload types ---------------------------------------------------------

/**
 * A graph entity element the editor operates on: a node, an IIP, or an
 * exported port.
 *
 * @typedef {Element} EditorEntity
 */

/**
 * A graph edge endpoint in the data-flow identifier form (work document
 * #5): node name, port name, and the ArrayPort index when present.
 *
 * @typedef {{ node: string, port: string, index?: number }} PortEndpoint
 */

/**
 * The editor's rendered edge: its hit and visual paths plus the two port
 * elements it connects (EdgeManager's shape).
 *
 * @typedef {Object} EditorEdge
 * @property {SVGPathElement} hitPath
 * @property {SVGPathElement} visualPath
 * @property {HTMLElement} portA
 * @property {HTMLElement} portB
 * @property {string} [routeId]
 */

/**
 * @typedef {Object} NodeMove
 * @property {string} node
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} MovedNode
 * @property {string} name
 * @property {{ x: number, y: number }} position
 * @property {string} type
 * @property {any} direction
 * @property {string | null} portName
 */

/**
 * @typedef {Object} SelectionSnapshot
 * @property {string[]} nodes
 * @property {string[]} edges
 * @property {string[]} iips
 * @property {string[]} ports
 */

// ---- Event map -------------------------------------------------------------

/**
 * Every custom event dispatched inside the Glass, mapped to its
 * `CustomEvent` shape. Event names are globally unique across components,
 * so one map types the whole surface.
 *
 * @typedef {Object} GlassEventMap
 * @property {CustomEvent<{ node: string }>} navigate-down-attempt
 * @property {CustomEvent<void>} navigate-up-attempt
 * @property {CustomEvent<{ nodes: NodeMove[] }>} nodes-dragging
 * @property {CustomEvent<{ nodes: string[] }>} nodes-drag-end
 * @property {CustomEvent<{ nodes: MovedNode[] }>} nodes-moved
 * @property {CustomEvent<{ nodes: EditorEntity[] }>} node-removal-attempt
 * @property {CustomEvent<{ edge: EditorEdge }>} edge-removal-attempt
 * @property {CustomEvent<{ x: number, y: number, startPort: Element | null }>} iip-creation-attempt
 * @property {CustomEvent<{ x: number, y: number, startPort: Element | null }>} node-creation-attempt
 * @property {CustomEvent<{ iip: Element }>} iip-edit-attempt
 * @property {CustomEvent<{ iip: Element }>} iip-removal-attempt
 * @property {CustomEvent<{ iip: Element }>} iip-send-attempt
 * @property {CustomEvent<{ node: Element }>} edit-component-attempt
 * @property {CustomEvent<{ nodes: string[] }>} create-subgraph-attempt
 * @property {CustomEvent<{ nodes: string[] }>} create-group-attempt
 * @property {CustomEvent<{ groupId: string }>} remove-group-attempt
 * @property {CustomEvent<{ memberships: Array<{ groupId: string, add: string[], remove: string[] }> }>} update-group-attempt
 * @property {CustomEvent<{ nodes: string[] }>} move-nodes-up-attempt
 * @property {CustomEvent<{ node: string }>} unpack-subgraph-attempt
 * @property {CustomEvent<{ edge: string, x: number, y: number }>} edge-menu-open
 * @property {CustomEvent<{ edgeId: string, route: number | null }>} set-edge-route
 * @property {CustomEvent<{ edgeId: string, src: PortEndpoint, tgt: PortEndpoint, x: number, y: number }>} splice-node-attempt
 * @property {CustomEvent<{ x: number, y: number, type: "canvas" }>} canvas-menu-open
 * @property {CustomEvent<{ portA: Element, portB: Element }>} wire-connection-attempt
 * @property {CustomEvent<{ oldName: string, newName: string, direction: any, position: { x: number, y: number } }>} port-renamed
 * @property {CustomEvent<{ name: string, direction: "in" | "out", position: { x: number, y: number }, process: string | null, port: string | null }>} port-exported
 * @property {CustomEvent<{ name: string | null, direction: any }>} port-removed
 * @property {CustomEvent<SelectionSnapshot>} selection-changed
 * @property {CustomEvent<{ compName: string, definition?: any }>} component-changed
 * @property {CustomEvent<void>} new-graph-requested
 * @property {CustomEvent<{ directoryHandle: any }>} directory-selected
 * @property {CustomEvent<{ fileHandle: any }>} file-selected
 * @property {CustomEvent<{ data: any, isValid: boolean, errors: any[] }>} form-change
 * @property {CustomEvent<{ type: string }>} clear-selection
 * @property {CustomEvent<void>} open-settings
 * @property {CustomEvent<void>} navigate-up
 * @property {CustomEvent<void>} sync-invite
 * @property {CustomEvent<{ invite: string }>} sync-join
 * @property {CustomEvent<{ identityHash: string | null }>} sync-approve
 * @property {CustomEvent<{ identityHash: string | null }>} sync-decline
 * @property {CustomEvent<void>} sync-settings
 * @property {CustomEvent<{ theme: string }>} appearance-theme
 * @property {CustomEvent<void>} mesh-close
 * @property {CustomEvent<{ config: any }>} mesh-configure
 * @property {CustomEvent<{ peerHash: string, role: string }>} mesh-grant
 * @property {CustomEvent<void>} mesh-factory-reset
 * @property {CustomEvent<{ id: string | null }>} mesh-revoke
 */

// ---- Helpers ---------------------------------------------------------------

/**
 * Dispatches a strictly typed custom event from a target: the event name
 * must be in the map, and the detail must match the map's payload (pass
 * `undefined` for detail-less events). Defaults to bubbling and crossing
 * shadow boundaries; pass `options` to narrow it (matching the exact
 * `CustomEvent` options the previous untyped call sites used).
 *
 * @template {keyof GlassEventMap} K
 * @param {EventTarget} target
 * @param {K} type
 * @param {GlassEventMap[K]["detail"]} detail
 * @param {{ bubbles?: boolean, composed?: boolean }} [options]
 */
export function emit(target, type, detail, options = {}) {
  const { bubbles = true, composed = true } = options;
  target.dispatchEvent(
    /** @type {Event} */ (new CustomEvent(type, { detail, bubbles, composed })),
  );
}

/**
 * Subscribes to a strictly typed custom event: the listener receives the
 * map's `CustomEvent` for the given name, so `event.detail` is fully typed
 * without inline casts. Null or undefined targets are a no-op, preserving
 * the old `receiver?.addEventListener` ergonomics for elements that may not
 * be mounted.
 *
 * @template {keyof GlassEventMap} K
 * @param {EventTarget | null | undefined} target
 * @param {K} type
 * @param {(event: GlassEventMap[K]) => void} listener
 * @param {boolean | AddEventListenerOptions} [options]
 * @returns {() => void} Unsubscribe function.
 */
export function on(target, type, listener, options) {
  target?.addEventListener(
    type,
    /** @type {EventListener} */ (listener),
    options,
  );
  return () => {
    target?.removeEventListener(
      type,
      /** @type {EventListener} */ (listener),
      options,
    );
  };
}
