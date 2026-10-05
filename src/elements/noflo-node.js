import icons from "../../vendor/fontawesome-icons.js";
/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */
import { emit, on } from "../events.js";
import { netpbmToDataUrl } from "../library/netpbm.js";

/**
 * Escapes a value for interpolation into the shadow template.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
    /** @type {string | null} The running process's netpbm preview data URL. */
    this._previewDataUrl = null;

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

  /** @returns {string[]} */
  static get observedAttributes() {
    return ["selected"];
  }

  /**
   * Re-runs the pill fan-out when the selection toggles.
   *
   * @param {string} name
   */
  attributeChangedCallback(name) {
    if (name === "selected") this.resolveLabelCollisions();
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
    for (const compEl of this.shadowRoot?.querySelectorAll(".node-component") ??
      []) {
      compEl.textContent = this._componentName;
    }

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
          overflow: hidden;
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
          /* The ring stays continuous over the icon and component-name
             bands (work document #5 update #16) */
          z-index: 3;
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
           original design): the preview is a full circle inside the node
           circle, cut off top and bottom by the icon and component-name
           bands overlaying it with the node's own background. */
        .node-depiction {
          display: none;
          position: absolute;
          /* Clearance from the ports and their pills: the disc must not
             reach the circle's edge where the ports sit */
          inset: 15px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--ui-bg, #111) 88%, #000);
          box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--node-border, #333) 60%, transparent);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--node-text, #ccc);
          overflow: hidden;
          /* The circle is click-through; the preview is interactive */
          pointer-events: auto;
          z-index: 1;
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
        /* The icon band overlays the preview's top; slightly taller so
           the icon sits closer to the circle's center */
        :host([selected]) .node-content {
          height: 28px;
          align-items: center;
          background: var(--node-bg, #ccc);
          z-index: 2;
        }
        :host([selected]) .node-content i {
          font-size: calc(var(--node-size, 80px) * 0.15);
        }
        :host([selected]) .node-icon-img {
          width: calc(var(--node-size, 80px) * 0.18);
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
        /* The component-name band overlays the preview's bottom */
        .node-component-band {
          display: none;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 24px;
          align-items: center;
          justify-content: center;
          background: var(--node-bg, #ccc);
          font-size: 10px;
          color: var(--node-subtext, #666);
          z-index: 2;
          pointer-events: none;
          /* Long component names ellipsize inside the band */
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 0 6px;
        }
        :host([selected]) .node-component-band {
          display: flex;
        }
        /* On expansion: the node name moves above the circle, the
           component name moves into the circle's bottom band (the info
           block's copy hides), and the status line stays below */
        :host([selected]) .node-info .node-component {
          display: none;
        }
        :host([selected]) .node-name {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
        /* Port labels: anchored at the port's center, pushed outside the
           circle; the dot rides with the name (before for outports, after
           for inports) */
        .port-label {
          display: block;
        }
        .port-in-label {
          transform: translate(calc(-100% - 4px), -50%);
          text-align: right;
        }
        .port-out-label {
          transform: translate(4px, -50%);
          text-align: left;
        }
        /* Expanded port labels become pills with the port dot toward the
           node, colored by the route of the connected wire; the datatype
           aligns under the name through the shared grid column */
        :host([selected]) .port-label {
          display: inline-grid;
          grid-template-columns: auto auto;
          column-gap: 5px;
          align-items: center;
          text-align: left;
          background: var(--port-route-color, var(--ui-accent, #007bff));
          color: var(--ui-bg, #111);
          border-radius: 12px;
          padding: 3px 9px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
        }
        :host([selected]) .port-in-label {
          transform: translate(calc(-100% + 15px), -50%);
        }
        :host([selected]) .port-out-label {
          transform: translate(-15px, -50%);
        }
        /* The name span dissolves into the grid so the dot and the name
           text place into separate columns, and the datatype aligns under
           the name text */
        .port-dot {
          display: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 2px solid var(--ui-bg, #111);
        }
        :host([selected]) .port-dot {
          display: block;
          grid-row: 1;
        }
        :host([selected]) .port-out-label .port-dot {
          grid-column: 1;
        }
        :host([selected]) .port-out-label .port-name {
          grid-column: 2;
        }
        :host([selected]) .port-out-label .port-datatype {
          grid-column: 3;
        }
        :host([selected]) .port-in-label .port-datatype {
          grid-column: 1;
        }
        :host([selected]) .port-in-label .port-name {
          grid-column: 2;
        }
        :host([selected]) .port-in-label .port-dot {
          grid-column: 3;
        }
        .port-datatype {
          display: none;
          font-size: 9px;
          font-weight: normal;
          opacity: 0.85;
          white-space: nowrap;
          pointer-events: none;
        }
        :host(.detailed) .port-datatype {
          display: inline;
        }
        :host([selected]) .port-datatype {
          display: inline;
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
        /* Expanded: the pill's dot is the port's visual dot; the port
           element stays for hit-testing */
        :host([selected]) .port {
          opacity: 0;
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
        <div class="node-component node-component-band"></div>
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
    // Re-apply the imperatively-rendered bits a shadow rebuild wipes: the
    // icon and the component name (both render() calls — setPreviewImage's
    // included — must carry them)
    this._updateIconFromLibrary();
    for (const compEl of this.shadowRoot?.querySelectorAll(".node-component") ??
      []) {
      compEl.textContent = this._componentName;
    }
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
    this.resolveLabelCollisions();
  }

  /**
   * Fans out the expanded state's port pills so they never overlap: dense
   * ports pack tighter than the pills are tall, so same-side pills that
   * collide shift vertically apart, ordered by their ports' angles (work
   * document #5 update #16). Unexpanded labels sit outside the circle and
   * never collide.
   */
  resolveLabelCollisions() {
    if (!this.portsContainer || !this.hasAttribute("selected")) return;
    // Pill heights and the breathing room between them: arrayport instance
    // pills of the same port cluster tightly (they are one port), regular
    // pills keep more air (work document #5 update #16)
    const regularHeight = 22;
    const arrayHeight = 16;
    const clusterGap = 1;
    const airGap = 6;
    for (const direction of ["port-in-label", "port-out-label"]) {
      const labels = [...this.portsContainer.querySelectorAll(`.${direction}`)]
        .map((label) => {
          const element = /** @type {HTMLElement} */ (label);
          const name = element.dataset.portName ?? "";
          return {
            element,
            base: Number(element.dataset.portY ?? 0),
            height: /\[\d+\]$/.test(name) ? arrayHeight : regularHeight,
            baseName: name.replace(/\[\d+\]$/, ""),
          };
        })
        .sort((a, b) => a.base - b.base);
      /** @type {number | null} */
      let lastBottom = null;
      /** @type {string | null} */
      let lastBaseName = null;
      for (const { element, base, height, baseName } of labels) {
        const gap =
          lastBaseName !== null && lastBaseName === baseName
            ? clusterGap
            : airGap;
        /** @type {number} */
        const top =
          lastBottom === null ? base : Math.max(base, lastBottom + gap);
        element.style.top = `${top}px`;
        lastBottom = top + height;
        lastBaseName = baseName;
      }
    }
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
    // Both directions read top to bottom in definition order (work
    // document #5): outports start at the upper right and step down;
    // inports mirror at the left, so their fraction runs the other way
    const fraction =
      totalPorts > 1 ? (isOutport ? index : 1 - index / (totalPorts - 1)) : 0.5;
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
    label.className = `port-label ${isOutport ? "port-out-label" : "port-in-label"}${type === "array" ? " port-label-array" : ""}`;
    label.dataset.portName = name;
    // Explicit spans everywhere: the pill's dot is a real element, not a
    // pseudo-element of a display:contents span — pseudo placement inside
    // contentless boxes differs across engines
    label.innerHTML = isOutport
      ? `<span class="port-dot"></span><span class="port-name">${escapeHtml(
          name,
        )}</span><span class="port-datatype">${escapeHtml(dataType || "all")}</span>`
      : `<span class="port-name">${escapeHtml(
          name,
        )}</span><span class="port-datatype">${escapeHtml(dataType || "all")}</span><span class="port-dot"></span>`;

    // The label anchors at the port's center; the state-aware transforms
    // in the stylesheet place it outside the circle normally, and with the
    // pill's dot on the port when expanded
    label.style.left = `${this.radius + pos.x}px`;
    label.dataset.portY = String(this.radius + pos.y);
    label.style.top = `${this.radius + pos.y}px`;

    if (this.portsContainer) {
      this.portsContainer.appendChild(port);
      this.portsContainer.appendChild(label);
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
    // Stubs say it already through the depiction's "Not implemented"
    if (component?.type === "stub") return "";
    return component?.type ? String(component.type) : "";
  }

  /**
   * Handles clicks on the expanded state's depiction: navigation down into
   * subgraph components.
   */
  _wireDepiction() {}
}

customElements.define("noflo-node", FlowNode);
