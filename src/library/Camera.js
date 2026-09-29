/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} CameraDeps
 * @property {HTMLElement} transformLayer `<div>` whose CSS transform applies pan/zoom.
 * @property {HTMLElement} host Element to publish the `--zoom-scale` CSS var on.
 * @property {SpaceManager} spaceManager Spatial authority, kept in sync for coordinate conversions.
 * @property {() => DOMRect} getRect Editor viewport bounding rect.
 */

import { SpaceManager } from "./SpaceManager.js";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SPEED = 0.001;
const TAP_DISTANCE = 5;

/**
 * Camera owns the editor's viewport transform (pan + zoom) and the multi-touch
 * gesture state needed to drive it. It is the single source of truth for
 * `zoom`/`offset`: every mutation re-applies the CSS transform, publishes the
 * `--zoom-scale` CSS variable, and syncs the viewport into `SpaceManager` so
 * coordinate conversions stay correct.
 *
 * The editor decides *which* gesture is happening and calls the matching
 * method (`startPan`/`panBy`/`beginPinch`/...); the camera owns the math.
 */
export class Camera {
  /**
   * @param {CameraDeps} deps
   */
  constructor({ transformLayer, host, spaceManager, getRect }) {
    /** @type {number} */
    this.zoom = 1.0;
    /** @type {Position} */
    this.offset = { x: 0, y: 0 };
    /** @type {HTMLElement} */
    this.transformLayer = transformLayer;
    /** @type {HTMLElement} */
    this.host = host;
    /** @type {SpaceManager} */
    this.spaceManager = spaceManager;
    /** @type {() => DOMRect} */
    this.getRect = getRect;

    // pan gesture state
    /** @type {boolean} */
    this.isPanning = false;
    /** @type {number | null} */
    this.panningPointerId = null;
    /** @type {number} */
    this.panDistance = 0;

    // multi-touch / pinch state
    /** @type {Map<number, PointerEvent>} */
    this.activePointers = new Map();
    /** @type {boolean} */
    this.didPinch = false;
    /** @type {Position | null} */
    this.lastPinchCenter = null;
    /** @type {number} */
    this.lastPinchDistance = 0;
  }

  /** Apply the current zoom/offset to the DOM and sync SpaceManager. */
  apply() {
    if (this.transformLayer) {
      this.transformLayer.style.transform = `translate(${this.offset.x}px, ${this.offset.y}px) scale(${this.zoom})`;
    }
    if (this.host) {
      this.host.style.setProperty("--zoom-scale", this.zoom.toString());
    }
    this.spaceManager.updateViewport(this.zoom, this.offset);
  }

  // ---- pan -----------------------------------------------------------

  /**
   * @param {number} pointerId
   */
  startPan(pointerId) {
    this.isPanning = true;
    this.panningPointerId = pointerId;
    this.panDistance = 0;
  }

  /**
   * Pan by a viewport-space delta.
   * @param {number} dx
   * @param {number} dy
   */
  panBy(dx, dy) {
    this.offset.x += dx;
    this.offset.y += dy;
    this.panDistance += Math.hypot(dx, dy);
    this.apply();
  }

  /**
   * End a pan gesture started by `startPan`.
   * @param {number} pointerId
   * @returns {boolean} true if the gesture was a tap (negligible movement, no pinch)
   */
  endPan(pointerId) {
    if (pointerId !== this.panningPointerId) return false;
    const wasTap =
      this.isPanning && this.panDistance < TAP_DISTANCE && !this.didPinch;
    this.isPanning = false;
    this.panDistance = 0;
    this.panningPointerId = null;
    return wasTap;
  }

  /**
   * @param {number} pointerId
   * @returns {boolean}
   */
  isPanningPointer(pointerId) {
    return pointerId === this.panningPointerId;
  }

  // ---- multi-touch pinch --------------------------------------------

  /** @param {PointerEvent} e */
  trackPointer(e) {
    this.activePointers.set(e.pointerId, e);
  }

  /** @param {number} pointerId */
  releasePointer(pointerId) {
    this.activePointers.delete(pointerId);
  }

  /** @returns {boolean} whether two or more pointers are down (pinch active) */
  isPinching() {
    return this.activePointers.size >= 2;
  }

  /** @returns {boolean} */
  allPointersReleased() {
    return this.activePointers.size === 0;
  }

  /** Begin tracking a pinch from the currently-down pointers. */
  beginPinch() {
    const [p1, p2] = this._pinchPointers();
    if (!p1 || !p2) return;
    this.didPinch = true;
    this.lastPinchDistance = this._distance(p1, p2);
    this.lastPinchCenter = this._midpoint(p1, p2);
  }

  /** Apply pinch zoom + pan from the currently-down pointers. */
  updatePinch() {
    const [p1, p2] = this._pinchPointers();
    if (!p1 || !p2) return;

    const currentDistance = this._distance(p1, p2);
    const currentCenter = this._midpoint(p1, p2);

    if (this.lastPinchDistance === 0) {
      this.lastPinchDistance = currentDistance;
      this.lastPinchCenter = currentCenter;
      return;
    }

    const prevCenter = this.lastPinchCenter;
    if (!prevCenter) return;

    const zoomFactor = currentDistance / this.lastPinchDistance;
    const newZoom = clamp(this.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    const actualZoomFactor = newZoom / this.zoom;

    this.offset.x =
      currentCenter.x - (currentCenter.x - this.offset.x) * actualZoomFactor;
    this.offset.y =
      currentCenter.y - (currentCenter.y - this.offset.y) * actualZoomFactor;
    this.zoom = newZoom;

    this.offset.x += currentCenter.x - prevCenter.x;
    this.offset.y += currentCenter.y - prevCenter.y;

    this.apply();

    this.lastPinchCenter = currentCenter;
    this.lastPinchDistance = currentDistance;
  }

  /** Reset pinch gesture flags once all pointers are up. */
  resetPinchGesture() {
    this.didPinch = false;
    this.lastPinchCenter = null;
    this.lastPinchDistance = 0;
  }

  // ---- wheel zoom ----------------------------------------------------

  /**
   * Zoom towards the cursor position.
   * @param {WheelEvent} e
   */
  wheelZoom(e) {
    const oldZoom = this.zoom;
    const delta = -e.deltaY;
    this.zoom = clamp(this.zoom * (1 + delta * ZOOM_SPEED), MIN_ZOOM, MAX_ZOOM);

    const rect = this.getRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    this.offset.x -= (mouseX - this.offset.x) * (this.zoom / oldZoom - 1);
    this.offset.y -= (mouseY - this.offset.y) * (this.zoom / oldZoom - 1);

    this.apply();
  }

  // ---- viewport fitting / resize ------------------------------------

  /**
   * Keep the current graph center stable when the viewport resizes.
   */
  maintainCenterOnResize() {
    const rect = this.getRect();
    const graphCenter = this.spaceManager.viewportToGraph(
      rect.width / 2,
      rect.height / 2,
    );
    this.offset.x = rect.width / 2 - graphCenter.x * this.zoom;
    this.offset.y = rect.height / 2 - graphCenter.y * this.zoom;
    this.apply();
  }

  /**
   * Frame all graph entities within the viewport.
   *
   * (This replaces the old `SpaceManager.fitElements`, which wrote the fit
   * into SpaceManager's viewport mirror only to have `updateTransform`
   * immediately overwrite it from the editor's stale zoom/offset — i.e. fit
   * silently did nothing. Owning zoom/offset here makes it actually work.)
   * @param {number} [padding]
   */
  fit(padding = 100) {
    const rect = this.getRect();
    const ids = this.spaceManager.getEntityIds();
    if (ids.length === 0) return;

    const bbox = this.spaceManager.getBoundingBox(ids);
    const contentWidth = bbox.width + padding * 2;
    const contentHeight = bbox.height + padding * 2;

    this.zoom = Math.min(
      rect.width / contentWidth,
      rect.height / contentHeight,
      1.0,
    );

    const contentCenterX = bbox.x + bbox.width / 2;
    const contentCenterY = bbox.y + bbox.height / 2;
    this.offset.x = rect.width / 2 - contentCenterX * this.zoom;
    this.offset.y = rect.height / 2 - contentCenterY * this.zoom;

    this.apply();
  }

  // ---- internals -----------------------------------------------------

  /**
   * @returns {(PointerEvent | undefined)[]}
   */
  _pinchPointers() {
    const pointers = Array.from(this.activePointers.values());
    return [pointers[0], pointers[1]];
  }

  /**
   * @param {{clientX: number, clientY: number}} p1
   * @param {{clientX: number, clientY: number}} p2
   * @returns {number}
   */
  _distance(p1, p2) {
    return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
  }

  /**
   * @param {{clientX: number, clientY: number}} p1
   * @param {{clientX: number, clientY: number}} p2
   * @returns {Position}
   */
  _midpoint(p1, p2) {
    return {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
