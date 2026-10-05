import icons from "../../vendor/fontawesome-icons.js";
/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */
import { emit, on } from "../events.js";
import { netpbmToDataUrl } from "../library/netpbm.js";

/**
 * @typedef {import("./noflo-editor.js").PortConfig} PortConfig
 */

/**
 * @typedef {Object} Metadata
 * @property {string} [name]
 * @property {string} [componentName]
 * @property {string} [icon]
 */

/**
 * FlowNode Web Component
 * A circular representation of a NoFlo node.
 * Follows the architecture defined in SPEC.md and work document #1.
 *
 * @extends HTMLElement
 */
export class FlowNode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {number} */
    this._x = 0;
    /** @type {number} */
    this._y = 0;
    /** @type {number} */
    this._size = 80;
    /** @type {PortConfig[]} */
    this._inPorts = [{ type: "regular" }];
    /** @type {PortConfig[]} */
    this._outPorts = [{ type: "regular" }];
    /** @type {HTMLElement | null} */
    this.portsContainer = null;

    /** @type {import("../library/LibraryManager.js").LibraryManager | null} */
    this._libraryManager = null;
    /** @type {string | null} */
    this._componentName = null;
    /** @type {MutationObserver | null} */
    this._observer = null;
  }

  /**
   * @param {import("../library/LibraryManager.js").LibraryManager} lm
   */
  set libraryManager(lm) {
    this._libraryManager = lm;
    this._updatePortsFromLibrary();
    this._updateIconFromLibrary();
    if (this._observer && this._libraryManager) {
      const manager = this._libraryManager;
      manager.removeEventListener(
        "component-changed",
        this._onComponentChanged,
      );
      on(manager, "component-changed", this._onComponentChanged);
    }
  }

  /**
   * @returns {import("../library/LibraryManager.js").LibraryManager | null}
   */
  get libraryManager() {
    return this._libraryManager;
  }

  /**
   * @type {(e: Event) => void}
   */
  _onComponentChanged = (e) => {
    const { compName } = /** @type {CustomEvent} */ (e).detail;
    if (compName === this._componentName) {
      this._updatePortsFromLibrary();
      this._updateIconFromLibrary();
    }
  };

  /**
   * @private
   */
  _updatePortsFromLibrary() {
    if (!this._libraryManager || !this._componentName) return;
    const comp = this._libraryManager.getComponent(this._componentName);
    if (comp) {
      this.setPorts(comp.inports || [], comp.outports || []);
    }
  }

  /**
   * @private
   */
  _updateIconFromLibrary() {
    if (!this._libraryManager || !this._componentName) return;
    const comp = this._libraryManager.getComponent(this._componentName);
    console.log(comp);
    if (comp && comp.icon) {
      const iconEl = this.shadowRoot?.querySelector(".node-content");
      if (iconEl) {
        if (
          comp.icon.startsWith("data:image") ||
          comp.icon.startsWith("http")
        ) {
          iconEl.innerHTML = `<img src="${comp.icon}" class="node-icon-img">`;
        } else {
          const iconName = comp.icon;
          iconEl.innerHTML = `<i class="node-icon-fa">${/** @type {any} */ (icons())[iconName]}</i>`;
        }
      }
    }
  }

  /**
   * @type {string | null}
   */
  get component() {
    return this._componentName;
  }

  /**
   * @param {string} componentName
   */
  set component(componentName) {
    this._componentName = componentName;
    // Reflect to an attribute: consumers (the signature editor flow, event
    // handlers) read the component through getAttribute, and an attribute is
    // observable in the DOM inspector
    this.setAttribute("component", componentName);
    this._updatePortsFromLibrary();
    this._updateIconFromLibrary();
    const compEl = this.shadowRoot?.querySelector(".node-component");
    if (compEl) compEl.textContent = componentName;
  }

  /**
   * @type {number}
   */
  get size() {
    return this._size;
  }

  /**
   * @param {number} val
   */
  set size(val) {
    this._size = val;
    if (this.shadowRoot) {
      this.style.setProperty("--node-size", `${val}px`);
    }
  }

  /**
   * @type {number}
   */
  get radius() {
    return this._size / 2;
  }

  /**
   * @param {Position} pos
   */
  set position({ x, y }) {
    this._x = x;
    this._y = y;
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
  }

  /**
   * @param {Metadata} metadata
   */
  setMetadata({ name }) {
    if (name) this.textContent = name;
  }

  /**
   * @type {Position}
   */
  get position() {
    return { x: this._x, y: this._y };
  }

  connectedCallback() {
    const sizeAttr = this.getAttribute("size");
    if (sizeAttr) {
      this.size = parseInt(sizeAttr, 10);
    }
    this.render();
    // The expanded state's depiction navigation (work document #5 update
    // #16): delegated on the shadow root so selection-driven re-renders
    // never orphan the listener. Selection toggles re-render the shadow
    // between pointerdown and click; a per-element listener would die.
    if (!this._depictionWired) {
      this._depictionWired = true;
      // The depiction swallows its own presses (capture phase, so the stop
      // happens before the event leaves the shadow): without this, the
      // editor captures the pointer on node press and the selection-toggle
      // re-render moves the depiction out from under the click
      this.shadowRoot?.addEventListener(
        "pointerdown",
        (/** @type {Event} */ event) => {
          const target = /** @type {HTMLElement} */ (event.target);
          if (target?.closest?.(".node-depiction")) {
            event.stopPropagation();
          }
        },
        true,
      );
      this.shadowRoot?.addEventListener(
        "click",
        (/** @type {Event} */ event) => {
          const target = /** @type {HTMLElement} */ (event.target);
          if (!target?.closest?.(".node-depiction")) return;
          const component = this._libraryManager?.getComponent(
            this._componentName ?? "",
          );
          if (component?.type !== "subgraph") return;
          event.stopPropagation();
          emit(this, "navigate-down-attempt", {
            node: this.getAttribute("name") ?? "",
          });
        },
      );
    }

    if (this._libraryManager) {
      on(this._libraryManager, "component-changed", this._onComponentChanged);
    }
    const compEl = this.shadowRoot?.querySelector(".node-component");
    if (compEl) compEl.textContent = this._componentName;

    this._updatePortsFromLibrary();
    this._updateIconFromLibrary();
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
    }
    if (this._libraryManager) {
      this._libraryManager.removeEventListener(
        "component-changed",
        this._onComponentChanged,
      );
    }
  }

  /**
   * @param {PortConfig[]} inPorts
   * @param {PortConfig[]} outPorts
   */
  setPorts(inPorts, outPorts) {
    this._inPorts = inPorts;
    this._outPorts = outPorts;

    if (this.portsContainer) {
      this.renderPorts(this._inPorts, this._outPorts);
    }
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          width: var(--node-size, 80px);
          height: calc(var(--node-size, 80px) + 30px);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --node-size: 80px;
        }
        .node-circle {
          flex-shrink: 0;
          width: var(--node-size, 80px);
          height: var(--node-size, 80px);
          border-radius: 50%;
          background-color: var(--node-bg, #ccc);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.2s;
          position: relative;
          box-shadow: 0 0 10px var(--node-glow, transparent);
        }
        .node-circle::after {
          content: '';
          position: absolute;
          top: var(--node-ring-inset, 4px);
          left: var(--node-ring-inset, 4px);
          right: var(--node-ring-inset, 4px);
          bottom: var(--node-ring-inset, 4px);
          border-radius: 50%;
          border: var(--node-stroke-width, 2px) solid var(--node-border, #333);
          pointer-events: none;
          z-index: 1;
        }
        .node-content {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: calc(var(--node-size, 80px) * 0.3);
          text-align: center;
          color: var(--node-icon, inherit);
        }
        .node-info {
          text-align: center;
          margin-top: 4px;
          pointer-events: none;
          z-index: 1;
        }
        .node-name {
          font-size: 12px;
          font-weight: bold;
          color: var(--node-text, #333);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: var(--node-size, 80px);
        }
        .node-component {
          font-size: 10px;
          color: var(--node-subtext, #666);
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: var(--node-size, 80px);
        }
        .node-icon-fa {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }

        text, .node-label {
          user-select: none;
          -webkit-user-select: none;
        }

        /* Semantic Zooming: Use clamp() to create a binary switch based on --zoom-scale */
        .node-component, .port-label {
          opacity: clamp(0, (var(--zoom-scale) - 0.6) * 100, 1);
          pointer-events: none;
        }

        .node-name {
          opacity: clamp(0, (var(--zoom-scale) - 0.5) * 100, 1);
          pointer-events: none;
        }

        .port {
          opacity: clamp(0, (var(--zoom-scale) - 0.2) * 100, 1);
        }

        .node-content i {
          font-size: calc(var(--node-size, 80px) * 0.4);
        }

        :host([selected]) {
          transform: scale(2);
          z-index: 10;
        }
        /* The expanded state (work document #5 update #16, per the
           original design): the node name moves above the circle; inside
           the circle top to bottom are the icon, the preview area, and the
           component name. The preview area is a filled disc cut off top
           and bottom where the icon and component name sit. */
        .node-depiction {
          display: none;
          position: absolute;
          top: 50%;
          left: 5%;
          right: 5%;
          height: 52%;
          transform: translateY(-50%);
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: color-mix(in srgb, var(--ui-bg, #111) 88%, #000);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--node-border, #333) 60%, transparent);
          cursor: pointer;
          color: var(--node-text, #ccc);
          overflow: hidden;
          /* The circle is click-through; the preview is interactive */
          pointer-events: auto;
        }
        :host([selected]) .node-depiction {
          display: flex;
        }
        .node-depiction img.depiction-preview {
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: pixelated;
        }
        /* The icon moves to the circle's top and shrinks when expanded */
        :host([selected]) .node-content {
          align-items: flex-start;
          padding-top: 7px;
        }
        :host([selected]) .node-content i {
          font-size: calc(var(--node-size, 80px) * 0.18);
        }
        :host([selected]) .node-icon-img {
          width: calc(var(--node-size, 80px) * 0.22);
        }
        .node-depiction.openable:hover {
          box-shadow:
            inset 0 0 0 2px var(--ui-accent, #007bff),
            0 0 12px color-mix(in srgb, var(--ui-accent, #007bff) 40%, transparent);
        }
        .depiction-node {
          fill: var(--node-text, #ccc);
        }
        .depiction-wire {
          stroke: var(--node-text, #ccc);
          fill: none;
          stroke-width: 1.5;
        }
        .depiction-code {
          font-family: SourceCodePro, monospace;
          font-size: 13px;
          font-weight: bold;
        }
        .depiction-hint {
          font-size: 8px;
          text-align: center;
          padding: 0 4px;
        }
        /* On expansion: the node name moves above the circle, the
           component name sits inside the circle's bottom, and the status
           line stays below */
        :host([selected]) .node-name {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          max-width: none;
          white-space: nowrap;
        }
        :host([selected]) .node-component {
          position: absolute;
          bottom: 30px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 3;
          color: var(--node-subtext, #999);
        }
        :host([selected]) .node-status {
          position: absolute;
          top: 102%;
          left: 0;
          right: 0;
          text-align: center;
        }
        .node-status {
          display: block;
          font-size: 10px;
          color: var(--node-subtext, #666);
        }
        /* Expanded port labels become pills with the port dot toward the
           node, colored by the route of the connected wire */
        :host([selected]) .port-label {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--port-route-color, var(--ui-accent, #007bff));
          color: var(--ui-bg, #111);
          border-radius: 12px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
        }
        :host([selected]) .port-label::after,
        :host([selected]) .port-out-label::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid var(--ui-bg, #111);
          flex-shrink: 0;
        }
        :host([selected]) .port-out-label::after {
          display: none;
        }
        :host([selected]) .port-in-label::before {
          display: none;
        }
        .port-datatype {
          display: none;
          position: absolute;
          font-size: 9px;
          color: var(--node-subtext, #666);
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
        }
        /* Port datatypes show at high zoom levels (the editor toggles the
           detailed class) and whenever the node is expanded */
        :host(.detailed) .port-datatype,
        :host([selected]) .port-datatype {
          display: block;
        }
        :host([selected]) .node-circle {
          box-shadow: 0 0 15px var(--node-glow), 0 0 30px var(--node-glow);
        }
        :host([selected]) .node-circle::after {
          border-color: var(--node-border);
          border-width: 3px;
        }
        /* Pending state (work document #21): the change is optimistic until
           the read replica confirms the CRDT merge */
        :host([pending]) .node-circle {
          stroke-dasharray: 4 3;
          opacity: 0.75;
        }
        :host([pending="remove"]) {
          opacity: 0.4;
        }
        .port {
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: var(--node-border, #333);
          border: 2px solid var(--node-bg, #fff);
          border-radius: 50%;
          z-index: 2;
          cursor: grab;
          transition: opacity 0.2s, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
        }
        .port-label {
          position: absolute;
          font-size: 10px;
          color: var(--node-text, #666);
          white-space: nowrap;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.2s;
        }
        .port:hover {
          background-color: var(--ui-accent, #007bff);
          transform: scale(1.2);
        }
        .port-compatible {
          background-color: var(--ui-accent, #007bff) !important;
          transform: scale(1.8) !important;
          box-shadow: 0 0 10px var(--ui-accent, #007bff);
          z-index: 10;
        }
        .port-incompatible {
          transform: scale(0.5) !important;
          opacity: 0.4 !important;
        }
        .node-icon-img {
          width: calc(var(--node-size, 80px) * 0.5);
          height: calc(var(--node-size, 80px) * 0.5);
          object-fit: contain;
        }
      </style>
      <div class="node-circle">
        <div class="node-content"></div>
        <div class="node-depiction">${this.depictionHtml()}</div>
      </div>
      <div class="node-info">
        <span class="node-name">
          <slot></slot>
        </span>
        <span class="node-component"></span>
        <span class="node-status">${this.statusHtml()}</span>
      </div>
      <div id="ports-container" style="position: absolute; top: 0; left: 0; width: var(--node-size, 80px); height: var(--node-size, 80px);"></div>
    `;
    this.portsContainer = this.shadowRoot.getElementById("ports-container");
    // Render ports based on stored config or defaults
    this.renderPorts(this._inPorts, this._outPorts);
  }

  /**
   * @param {PortConfig[]} inPorts
   * @param {PortConfig[]} outPorts
   */
  renderPorts(inPorts, outPorts) {
    if (!this.portsContainer) return;
    this.portsContainer.innerHTML = "";

    // Inports (left side: PI/2 to 3PI/2)
    inPorts.forEach((portCfg, i) => {
      this.createPort(i, inPorts.length, false, portCfg);
    });
    // Outports (right side: -PI/2 to PI/2)
    outPorts.forEach((portCfg, i) => {
      this.createPort(i, outPorts.length, true, portCfg);
    });
  }

  /**
   * @param {number} index
   * @param {number} totalPorts
   * @param {boolean} isOutport
   * @param {PortConfig} cfg
   */
  createPort(index, totalPorts, isOutport, cfg) {
    // The common default: a single in and out port (work document #29);
    // further unnamed ports keep their index
    const name =
      cfg.name ||
      (index === 0
        ? isOutport
          ? "out"
          : "in"
        : isOutport
          ? `out${index}`
          : `in${index}`);
    const addressable = cfg.addressable || false;
    const size = addressable ? 3 : 1;

    const angleRange = Math.PI * 0.5;
    const centerAngle = isOutport ? 0 : Math.PI;
    const fraction = totalPorts > 1 ? index / (totalPorts - 1) : 0.5;
    const baseAngle = centerAngle + (fraction - 0.5) * angleRange;

    if (!addressable) {
      const pos = {
        x: this.radius * Math.cos(baseAngle),
        y: this.radius * Math.sin(baseAngle),
      };
      this.addPortElement(pos, isOutport, name, "regular", cfg.type);
    } else {
      // Use an angular step that makes 12px circles almost touch
      // Chord length approx 13px -> angle approx 0.32 radians
      const angularStep = 0.32;
      const direction = isOutport ? 1 : -1;

      for (let i = 0; i < size; i++) {
        const instanceName = `${name}[${i}]`;
        const angle =
          baseAngle + direction * (i - (size - 1) / 2) * angularStep;
        const instancePos = {
          x: this.radius * Math.cos(angle),
          y: this.radius * Math.sin(angle),
        };
        this.addPortElement(
          instancePos,
          isOutport,
          instanceName,
          "array",
          cfg.type,
          i,
        );
      }
    }
  }

  /**
   * @param {Position} pos
   * @param {boolean} isOutport
   * @param {string} name
   * @param {string} type
   * @param {string} [dataType] The port's declared datatype.
   * @param {number} [index]
   */
  addPortElement(pos, isOutport, name, type, dataType, index) {
    const port = document.createElement("div");
    port.className = `port ${isOutport ? "port-out" : "port-in"}`;

    port.dataset.portName = name;
    port.dataset.portType = type;
    // The port's declared datatype (work document #29 update #1): the
    // typed-port guiding matches on it; `portType` stays the structural
    // kind (regular/array)
    port.dataset.portDataType = dataType || "all";
    if (index !== undefined) port.dataset.portIndex = index.toString();

    // All ports are now 12px (radius 6px)
    port.style.left = `${this.radius + pos.x - 6}px`;
    port.style.top = `${this.radius + pos.y - 6}px`;

    const label = document.createElement("div");
    label.className = `port-label ${isOutport ? "port-out-label" : "port-in-label"}`;
    label.dataset.portName = name;
    label.textContent = name;

    label.style.left = `${this.radius + pos.x + (isOutport ? 14 : -14)}px`;
    label.style.top = `${this.radius + pos.y}px`;
    label.style.transform = isOutport
      ? "translateY(-50%)"
      : "translate(-100%, -50%)";
    label.style.textAlign = isOutport ? "left" : "right";

    if (this.portsContainer) {
      this.portsContainer.appendChild(port);
      this.portsContainer.appendChild(label);
      this._appendDatatypeTag(pos, isOutport, dataType);
    }
  }

  /**
   * The datatype tag shown next to a port at high zoom levels (work
   * document #5 update #16).
   *
   * @param {{ x: number, y: number }} pos
   * @param {boolean} isOutport
   * @param {string | undefined} dataType
   */
  _appendDatatypeTag(pos, isOutport, dataType) {
    const tag = document.createElement("div");
    tag.className = "port-datatype";
    tag.textContent = dataType || "all";
    tag.style.left = `${this.radius + pos.x + (isOutport ? 14 : -14)}px`;
    tag.style.top = `${this.radius + pos.y + (isOutport ? 12 : -12)}px`;
    tag.style.transform = isOutport
      ? "translateY(-50%)"
      : "translate(-100%, -50%)";
    tag.style.textAlign = isOutport ? "left" : "right";
    if (this.portsContainer) {
      this.portsContainer.appendChild(tag);
    }
  }

  /**
   * Sets the running process's preview image (work document #5 update
   * #16): netpbm bytes (or ASCII text) rendered inside the expanded
   * node's preview area. Most components never output netpbm; the
   * depiction renders when no preview is set. Null clears it.
   *
   * @param {Uint8Array | string | null} pnm
   */
  setPreviewImage(pnm) {
    this._previewDataUrl = pnm ? netpbmToDataUrl(pnm) : null;
    this.render();
  }

  /**
   * The navigation depiction of the expanded state (work document #5
   * update #16): a mini graph depiction for subgraph components, an
   * abstract code depiction for elementary ones, a placeholder for stubs.
   * Clicking an openable depiction navigates down.
   *
   * @returns {string}
   */
  depictionHtml() {
    // A running process's netpbm output takes the preview area when the
    // component produces one (work document #15's streaming); most
    // components never do, and the depictions below are the default
    if (this._previewDataUrl) {
      return `<img class="depiction-preview" src="${this._previewDataUrl}" alt="Running process preview">`;
    }
    const component = this._libraryManager?.getComponent(
      this._componentName ?? "",
    );
    const name = this.getAttribute("name") ?? "";
    if (component?.type === "subgraph") {
      return `<svg class="openable" width="56" height="40" viewBox="0 0 56 40" aria-label="Open subgraph"><circle cx="12" cy="12" r="6" class="depiction-node"/><circle cx="44" cy="12" r="6" class="depiction-node"/><circle cx="28" cy="30" r="6" class="depiction-node"/><path d="M17 14 L39 14 M17 16 L24 27 M39 16 L32 27" class="depiction-wire"/></svg>`;
    }
    if (component && component.type !== "stub") {
      return `<span class="depiction-code">&lt;/&gt;</span>`;
    }
    return `<span class="depiction-hint">Not implemented</span>`;
  }

  /**
   * The status line of the expanded state: the component's type until the
   * runtime status vocabulary (WD #15) feeds it.
   *
   * @returns {string}
   */
  statusHtml() {
    const component = this._libraryManager?.getComponent(
      this._componentName ?? "",
    );
    return component?.type ? String(component.type) : "";
  }

  /**
   * Handles clicks on the expanded state's depiction: navigation down into
   * subgraph components.
   */
  _wireDepiction() {}
}

customElements.define("noflo-node", FlowNode);
