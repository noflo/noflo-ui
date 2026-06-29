import icons from "../../vendor/fa-icon-map.js";

/**
 * FlowRadialMenu Web Component
 * A radial/pie menu for context actions.
 */
export class FlowRadialMenu extends HTMLElement {
  /** @type {Array<{text: string, onClick: () => void, icon?: string}>} */
  _items = [];
  /** @type {boolean} */
  _isMenuOpen = false;
  /** @type {EventListener | null} */
  _closeMenuListener = null;
  /** @type {EventListener | null} */
  _moveMenuListener = null;
  /** @type {EventListener | null} */
  _releaseMenuListener = null;
  /** @type {HTMLElement | null} */
  menuElement = null;
  /** @type {HTMLElement | null} */
  centerIconElement = null;
  /** @type {SVGElement | null} */
  svgElement = null;
  /** @type {number} */
  _openX = 0;
  /** @type {number} */
  _openY = 0;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: absolute;
          pointer-events: none;
          z-index: 100;
          display: none;
        }
        .context-menu {
          pointer-events: auto;
          color: var(--node-text);
          width: 180px;
          height: 180px;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(var(--ui-bg), 0.7);
          backdrop-filter: blur(8px);
          border-radius: 50%;
        }
        .menu-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 180px;
          height: 180px;
          pointer-events: none;
          z-index: 0;
        }
        .menu-segment {
          fill: var(--node-bg);
          stroke: var(--node-border);
          stroke-width: 1px;
          transition: fill 0.2s;
        }
        .center-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          background: var(--node-bg);
          border: 2px solid var(--node-border);
          pointer-events: none;
          z-index: 2;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .context-menu-item {
          position: absolute;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          transition: all 0.2s;
          text-align: center;
          z-index: 1;
          border: 1px solid transparent;
        }
        .context-menu-item:hover,
        .context-menu-item.highlighted {
          background: var(--ui-accent);
          color: var(--ui-bg);
          transform: scale(1.1);
          box-shadow: 0 0 15px var(--ui-accent);
        }
        .context-menu-item i {
          font-size: 20px;
        }
        .context-menu-item span {
          font-size: 10px;
          margin-top: 2px;
          font-weight: bold;
        }
        .node-icon-fa {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }
      </style>
      <div class="context-menu">
        <svg class="menu-svg"></svg>
        <div class="center-icon"></div>
      </div>
    `;
    this.menuElement = /** @type {HTMLElement} */ (this.shadowRoot.querySelector(".context-menu"));
    this.centerIconElement = /** @type {HTMLElement} */ (this.shadowRoot.querySelector(".center-icon"));
    this.svgElement = /** @type {SVGElement} */ (this.shadowRoot.querySelector(".menu-svg"));
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {Array<{text: string, onClick: () => void, icon?: string}>} items
   * @param {string | null} centerIcon
   */
  open(x, y, items, centerIcon) {
    this._openX = x;
    this._openY = y;
    this._items = items;
    this.render(); // Reset HTML
    this.menuElement = /** @type {HTMLElement} */ (this.shadowRoot?.querySelector(".context-menu"));
    this.centerIconElement = /** @type {HTMLElement} */ (this.shadowRoot?.querySelector(".center-icon"));

    if (this.centerIconElement && centerIcon) {
      this.centerIconElement.innerHTML = this._createIconHtml(centerIcon);
    } else if (this.centerIconElement) {
      this.centerIconElement.innerHTML = "";
    }

    if (this.menuElement) {
      this.menuElement.style.display = "flex";
    }
    this.style.display = "block";
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;

    this._isMenuOpen = true;

    /** @type {EventListener | null} */
    this._closeMenuListener = (e) => {
      const menu = this.menuElement;
      const target = /** @type {Node} */ (e.target);
      if (
        (!menu || !menu.contains(target)) &&
        (!this.shadowRoot || !this.shadowRoot.contains(target)) &&
        !this.contains(target)
      ) {
        this.close();
      }
    };
    window.addEventListener("pointerdown", this._closeMenuListener);

    /** @type {EventListener | null} */
    this._moveMenuListener = (e) => {
      if (this._isMenuOpen && e instanceof PointerEvent) {
        this.handleSlide(e);
      }
    };
    window.addEventListener("pointermove", this._moveMenuListener);

    /** @type {EventListener | null} */
    this._releaseMenuListener = (_e) => {
      const menu = this.menuElement;
      const highlighted = /** @type {HTMLElement} */ (menu?.querySelector(
        ".context-menu-item.highlighted",
      ));
      if (highlighted && (/** @type {any} */ (highlighted))._item) {
        const item = (/** @type {any} */ (highlighted))._item;
        this.close(); // Close first to avoid any event conflicts
        item.onClick();
      }
    };
    window.addEventListener("pointerup", this._releaseMenuListener);
    window.addEventListener("pointercancel", this._releaseMenuListener);

    this.renderItems();
  }

  /**
   * @param {string} icon
   * @returns {string}
   */
  _createIconHtml(icon) {
    if (icon.startsWith("<")) return icon;
    if (icon.startsWith("data:image") || icon.startsWith("http")) {
      return `<img src="${icon}" style="width: 24px; height: 24px; object-fit: contain;">`;
    }
    const iconChar = (/** @type {any} */ (icons()))[icon];
    if (iconChar) {
      return `<i class="node-icon-fa">${iconChar}</i>`;
    }
    return `<i class="fa-solid fa-${icon}"></i>`;
  }

  close() {
    if (this.menuElement) {
      this.menuElement.style.display = "none";
    }
    this.style.display = "none";
    this._isMenuOpen = false;
    if (this._closeMenuListener) {
      window.removeEventListener("pointerdown", this._closeMenuListener);
      this._closeMenuListener = null;
    }
    if (this._moveMenuListener) {
      window.removeEventListener("pointermove", this._moveMenuListener);
      this._moveMenuListener = null;
    }
    if (this._releaseMenuListener) {
      window.removeEventListener("pointerup", this._releaseMenuListener);
      window.removeEventListener("pointercancel", this._releaseMenuListener);
      this._releaseMenuListener = null;
    }
  }

  renderItems() {
    const count = this._items.length;
    if (count === 0) return;

    const radius = 60;
    const centerX = 90;
    const centerY = 90;

    /** @type {Record<string, number>} */
    const ITEM_SECTION_MAP = {
      Delete: 3,
      Remove: 3,
      Close: 4,
      Open: 5,
      "Make subgraph": 6,
    };

    const itemAngles = new Array(count);
    const usedSections = new Set();

    // First pass: assigned sections
    this._items.forEach((item, index) => {
      const section = ITEM_SECTION_MAP[item.text];
      if (section !== undefined) {
        itemAngles[index] = (section + 0.5) * (Math.PI / 4);
        usedSections.add(section);
      }
    });

    // Second pass: fill remaining available sections (3-7)
    const availableSections = [3, 4, 5, 6, 7].filter(
      (s) => !usedSections.has(s),
    );
    let availIdx = 0;

    this._items.forEach((_item, index) => {
      if (itemAngles[index] === undefined) {
        if (availIdx < availableSections.length) {
          const section = availableSections[availIdx++];
          itemAngles[index] = (section + 0.5) * (Math.PI / 4);
        } else {
          itemAngles[index] = (3 + Math.random() * 4 + 0.5) * (Math.PI / 4);
        }
      }
    });

    if (this.svgElement) {
      this.svgElement.innerHTML = "";
    }

    this._items.forEach((item, index) => {
      const angle = itemAngles[index];
      const section = Math.floor(angle / (Math.PI / 4));
      const startAngle = section * (Math.PI / 4);
      const endAngle = (section + 1) * (Math.PI / 4);

      // Create SVG segment
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const x1 = centerX + 90 * Math.cos(startAngle);
      const y1 = centerY + 90 * Math.sin(startAngle);
      const x2 = centerX + 90 * Math.cos(endAngle);
      const y2 = centerY + 90 * Math.sin(endAngle);

      path.setAttribute(
        "d",
        `M ${centerX} ${centerY} L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`,
      );
      path.setAttribute("class", "menu-segment");
      if (this.svgElement) {
        this.svgElement.appendChild(path);
      }

      const el = document.createElement("div");
      el.className = "context-menu-item";

      if (item.icon) {
        const iconEl = document.createElement("i");
        const iconChar = (/** @type {any} */ (icons()))[item.icon];
        if (iconChar) {
          iconEl.textContent = iconChar;
          iconEl.className = "node-icon-fa";
        } else {
          iconEl.className = `fa-solid fa-${item.icon}`;
        }
        el.appendChild(iconEl);
      }

      const textEl = document.createElement("span");
      textEl.textContent = item.text;
      el.appendChild(textEl);

      el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        item.onClick();
        this.close();
      });

      if (this.menuElement) {
        this.menuElement.appendChild(el);
      }

      const x = centerX + radius * Math.cos(angle) - 30;
      const y = centerY + radius * Math.sin(angle) - 30;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      /** @type {any} */ (el)._angle = angle;
      /** @type {any} */ (el)._item = item;
    });
  }

  /**
   * @param {PointerEvent} e
   */
  handleSlide(e) {
    /** @type {PointerEvent} */
    const event = e;
    const centerX = this._openX;
    const centerY = this._openY;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;

    const dist = Math.hypot(dx, dy);
    const items = this.menuElement ? this.menuElement.querySelectorAll(".context-menu-item") : [];

    // Finger-sized empty area in the middle (~44px diameter, so 22px radius)
    if (dist < 22) {
      items.forEach((el) => {
        (/** @type {HTMLElement} */ (el)).classList.remove("highlighted");
      });
      return;
    }

    // Map angle to 45-degree section (0-7)
    const section = Math.floor(angle / (Math.PI / 4));

    let closestItem = null;
    items.forEach((el) => {
      const item = /** @type {any} */ (el);
      // Check if this item's angle falls into the current section
      const itemAngle = item._angle;
      const itemSection = Math.floor(itemAngle / (Math.PI / 4));
      if (itemSection === section) {
        closestItem = el;
      }
    });

    if (closestItem) {
      items.forEach((el) => {
        (/** @type {HTMLElement} */ (el)).classList.remove("highlighted");
      });
      (/** @type {HTMLElement} */ (closestItem)).classList.add("highlighted");
    } else {
      items.forEach((el) => {
        (/** @type {HTMLElement} */ (el)).classList.remove("highlighted");
      });
    }
  }

  get isOpen() {
    return this._isMenuOpen;
  }
}
