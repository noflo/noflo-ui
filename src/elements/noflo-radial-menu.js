import icons from "../../vendor/fontawesome-icons.js";

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
    /** The last text the live region announced — a repeated section
     * stays silent. */
    this._announcedText = "";
    /** The open menu's center icon name, for the submenu's back
     * restore. */
    this._centerIconName = null;
    /** Submenu state: the parent's items and center icon while a
     * submenu is open (guidelines §10's submenu split). */
    this._submenuOf = false;
    /** @type {any[] | null} */
    this._parentItems = null;
    /** @type {string | null} */
    this._parentCenterIcon = null;
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
        /* Hover enhances pointer devices only (guidelines §13): touch
           highlights through the slide, so the highlighted state is
           unconditional and :hover is media-wrapped */
        .context-menu-item.highlighted {
          background: var(--ui-accent);
          color: var(--ui-bg);
          transform: scale(1.1);
          box-shadow: 0 0 15px var(--ui-accent);
        }
        @media (hover: hover) {
          .context-menu-item:hover {
            background: var(--ui-accent);
            color: var(--ui-bg);
            transform: scale(1.1);
            box-shadow: 0 0 15px var(--ui-accent);
          }
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
        /* The press-and-slide announcement (guidelines §10): visually
           hidden, screen-reader reach only */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      </style>
      <div class="context-menu">
        <svg class="menu-svg"></svg>
        <div class="center-icon"></div>
      </div>
      <div class="sr-only" role="status" aria-live="assertive"></div>
    `;
    this.menuElement = /** @type {HTMLElement} */ (
      this.shadowRoot.querySelector(".context-menu")
    );
    this.centerIconElement = /** @type {HTMLElement} */ (
      this.shadowRoot.querySelector(".center-icon")
    );
    this.svgElement = /** @type {SVGElement} */ (
      this.shadowRoot.querySelector(".menu-svg")
    );
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
    this._centerIconName = centerIcon;
    this.render(); // Reset HTML
    this.menuElement = /** @type {HTMLElement} */ (
      this.shadowRoot?.querySelector(".context-menu")
    );
    this.centerIconElement = /** @type {HTMLElement} */ (
      this.shadowRoot?.querySelector(".center-icon")
    );

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
        !menu?.contains(target) &&
        !this.shadowRoot?.contains(target) &&
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
    this._releaseMenuListener = (e) => {
      // A submenu's release in the finger-free center navigates back to
      // the parent menu — the same gesture vocabulary, one level up
      if (this._submenuOf && e instanceof PointerEvent) {
        const dist = Math.hypot(
          e.clientX - this._openX,
          e.clientY - this._openY,
        );
        if (dist < 22) {
          this._backToParent();
          return;
        }
      }
      const menu = this.menuElement;
      const highlighted = /** @type {HTMLElement} */ (
        menu?.querySelector(".context-menu-item.highlighted")
      );
      if (highlighted && /** @type {any} */ (highlighted)._item) {
        const item = /** @type {any} */ (highlighted)._item;
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
    const iconChar = /** @type {any} */ (icons())[icon];
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
    this._announcedText = "";
    const region = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.querySelector(".sr-only")
    );
    if (region) region.textContent = "";
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

    const centerX = 90;
    const centerY = 90;

    /** @type {Record<string, number>} */
    const ITEM_SECTION_MAP = {
      "Add Node": 5,
      "Add IIP": 5,
      "Rename & metadata": 4,
      Metadata: 4,
      Delete: 3,
      Remove: 3,
      Close: 4,
      Open: 5,
      Edit: 5,
      "Edit Component": 6,
      "Edit metadata": 4,
      "Make subgraph": 6,
      Export: 6,
      "Disconnect all": 7,
      "Send now": 7,
      "Move up": 7,
      Unpack: 7,
      "Group node": 5,
      "Group selection": 5,
    };

    // The submenu split (guidelines §10): a section holds two staggered
    // items at most — the third collapses into one submenu slot instead
    // of a third ring marching off-screen. The submenu carries the
    // overflow as its own menu, the center icon turning back.
    const CAP = 2;

    /** @type {Array<{ item: any, angle: number, radius: number }>} */
    const placed = [];
    const perSection = new Map();
    const assign = (/** @type {any} */ item, /** @type {number} */ section) => {
      const used = perSection.get(section) ?? 0;
      perSection.set(section, used + 1);
      placed.push({
        item,
        angle: (section + 0.5) * (Math.PI / 4),
        radius: used === 0 ? 60 : 60 + 55 * used,
      });
    };

    /** @type {any[]} */
    let overflow = [];
    for (const item of this._items) {
      const section = ITEM_SECTION_MAP[item.text];
      if (section !== undefined && (perSection.get(section) ?? 0) < CAP) {
        assign(item, section);
      } else {
        overflow.push(item);
      }
    }
    // Unmapped and over-cap items fill the free sections' remaining
    // stagger — deterministically, the bottom-right sections empty
    // because fingers cover those on touch
    const availableSections = [3, 4, 5, 6, 7];
    let availIdx = 0;
    /** @type {any[]} */
    const still = [];
    for (const item of overflow) {
      let home = null;
      for (let i = 0; i < availableSections.length; i++) {
        const section =
          availableSections[(availIdx + i) % availableSections.length];
        if ((perSection.get(section) ?? 0) < CAP) {
          home = section;
          availIdx = (availIdx + i + 1) % availableSections.length;
          break;
        }
      }
      if (home === null) {
        still.push(item);
        continue;
      }
      assign(item, home);
    }
    overflow = still;
    if (overflow.length > 0) {
      // The submenu slot: the section with room, deepest from the finger
      // zone first
      let section = 7;
      for (const candidate of [7, 6, 5, 4, 3]) {
        if ((perSection.get(candidate) ?? 0) < CAP) {
          section = candidate;
          break;
        }
      }
      assign(
        {
          text: `More (${overflow.length})`,
          icon: "chevron-right",
          // The submenu slot's activation swaps the menu's content —
          // the close() in the release handler must not strip the
          // submenu's fresh gesture listeners
          staysOpen: true,
          onClick: () => this._openSubmenu(overflow),
        },
        section,
      );
    }

    if (this.svgElement) {
      this.svgElement.innerHTML = "";
    }

    for (const { item, angle, radius } of placed) {
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
        const iconChar = /** @type {any} */ (icons())[item.icon];
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
      el.addEventListener("pointerup", (e) => {
        e.stopPropagation();
        // A submenu slot swaps the content instead of closing — its
        // open() arms the fresh gesture listeners this close would strip
        if (!item.staysOpen) this.close();
        item.onClick();
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
    }
  }

  /**
   * Opens the overflow items as a submenu at the same origin: the
   * parent's items restore through the center-release gesture, and the
   * center icon turns the back chevron.
   *
   * @param {any[]} items
   */
  _openSubmenu(items) {
    this._parentItems = this._items;
    this._parentCenterIcon = this._centerIconName ?? null;
    this._submenuOf = true;
    // The reopen must not stack the gesture listeners: tear the previous
    // gesture's wiring down first (close() also hides — not wanted here)
    this._teardownGesture();
    this.open(this._openX, this._openY, items, "chevron-left");
  }

  /**
   * Restores the parent menu (the center-release gesture's job).
   */
  _backToParent() {
    const parent = this._parentItems ?? [];
    const icon = this._parentCenterIcon;
    this._submenuOf = false;
    this._parentItems = null;
    this._parentCenterIcon = null;
    this._teardownGesture();
    this.open(this._openX, this._openY, parent, icon);
  }

  /**
   * Removes the gesture listeners without hiding the menu — the reopen
   * paths' teardown (close() hides as well).
   */
  _teardownGesture() {
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
    const items = this.menuElement
      ? this.menuElement.querySelectorAll(".context-menu-item")
      : [];

    // Finger-sized empty area in the middle (~44px diameter, so 22px radius)
    if (dist < 22) {
      items.forEach((el) => {
        /** @type {HTMLElement} */ (el).classList.remove("highlighted");
      });
      this._announceHighlight();
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
        /** @type {HTMLElement} */ (el).classList.remove("highlighted");
      });
      /** @type {HTMLElement} */ (closestItem).classList.add("highlighted");
      this._announceHighlight();
    } else {
      items.forEach((el) => {
        /** @type {HTMLElement} */ (el).classList.remove("highlighted");
      });
      this._announceHighlight();
    }
  }

  /**
   * Announces the highlighted item through the live region (guidelines
   * §10's press-and-slide affordance): a pointer slide has no focus, so
   * the section under the finger — destructive items especially — is
   * announced as it highlights, and cleared when nothing is. Only a
   * change speaks: the same section repeated stays silent.
   */
  _announceHighlight() {
    const region = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.querySelector(".sr-only")
    );
    if (!region) return;
    const highlighted = /** @type {HTMLElement | null} */ (
      this.menuElement?.querySelector(".context-menu-item.highlighted")
    );
    const text = highlighted?.textContent?.trim() ?? "";
    if (text === this._announcedText) return;
    this._announcedText = text;
    region.textContent = text;
  }

  get isOpen() {
    return this._isMenuOpen;
  }
}

customElements.define("noflo-radial-menu", FlowRadialMenu);
