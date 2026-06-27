import icons from "../../vendor/fa-icon-map.js";

/**
 * FlowRadialMenu Web Component
 * A radial/pie menu for context actions.
 */
export class FlowRadialMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = [];
    this._isMenuOpen = false;
    this._closeMenuListener = null;
  }

  connectedCallback() {
    this.render();
  }

  render() {
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
          background: var(--node-bg);
          border: 1px solid var(--node-border);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          color: var(--node-text);
          width: 180px;
          height: 180px;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
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
          border: 1px solid var(--node-border);
          pointer-events: none;
          z-index: 2;
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
          transition: background 0.2s;
          text-align: center;
          z-index: 1;
        }
        .context-menu-item:hover {
          background: var(--node-border);
        }
        .context-menu-item.highlighted {
          background: var(--node-border);
          transform: scale(1.1);
        }
        .context-menu-item i {
          font-size: 20px;
        }
        .context-menu-item span {
          font-size: 10px;
          margin-top: 2px;
        }
        .node-icon-fa {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }
      </style>
      <div class="context-menu">
        <div class="center-icon"></div>
      </div>
    `;
    this.menuElement = this.shadowRoot.querySelector(".context-menu");
    this.centerIconElement = this.shadowRoot.querySelector(".center-icon");
  }

  open(x, y, items, centerIcon) {
    this._items = items;
    this.render(); // Reset HTML
    this.menuElement = this.shadowRoot.querySelector(".context-menu");
    this.centerIconElement = this.shadowRoot.querySelector(".center-icon");

    if (centerIcon) {
      this.centerIconElement.innerHTML = this._createIconHtml(centerIcon);
    } else {
      this.centerIconElement.innerHTML = "";
    }

    this.menuElement.style.display = "flex";
    this.style.display = "block";
    this.style.left = `${x}px`;
    this.style.top = `${y}px`;

    this._isMenuOpen = true;

    this._closeMenuListener = (e) => {
      if (
        !this.menuElement.contains(e.target) &&
        !this.shadowRoot.contains(e.target) &&
        !this.contains(e.target)
      ) {
        this.close();
      }
    };
    window.addEventListener("pointerdown", this._closeMenuListener);

    this._moveMenuListener = (e) => {
      if (this._isMenuOpen) {
        this.handleSlide(e);
      }
    };
    window.addEventListener("pointermove", this._moveMenuListener);

    this.renderItems();
  }

  _createIconHtml(icon) {
    if (icon.startsWith("data:image") || icon.startsWith("http")) {
      return `<img src="${icon}" style="width: 24px; height: 24px; object-fit: contain;">`;
    }
    const iconChar = icons()[icon];
    if (iconChar) {
      return `<i class="node-icon-fa">${iconChar}</i>`;
    }
    return `<i class="fa-solid fa-${icon}"></i>`;
  }

  close() {
    this.menuElement.style.display = "none";
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
  }

  renderItems() {
    const count = this._items.length;
    if (count === 0) return;

    const radius = 60;
    const centerX = 90;
    const centerY = 90;

    const ITEM_SECTION_MAP = {
      'Delete': 3,
      'Remove': 3,
      'Close': 5,
      'Open': 6,
      'Make subgraph': 7,
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
    const availableSections = [3, 4, 5, 6, 7].filter(s => !usedSections.has(s));
    let availIdx = 0;

    this._items.forEach((item, index) => {
      if (itemAngles[index] === undefined) {
        if (availIdx < availableSections.length) {
          const section = availableSections[availIdx++];
          itemAngles[index] = (section + 0.5) * (Math.PI / 4);
        } else {
          // If we run out of sections, we just place them randomly in available space
          itemAngles[index] = (3 + Math.random() * 4 + 0.5) * (Math.PI / 4);
        }
      }
    });

    this._items.forEach((item, index) => {
      const angle = itemAngles[index];
      const el = document.createElement("div");
      el.className = "context-menu-item";

      if (item.icon) {
        const iconEl = document.createElement("i");
        const iconChar = icons()[item.icon];
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

      this.menuElement.appendChild(el);

      const x = centerX + radius * Math.cos(angle) - 30;
      const y = centerY + radius * Math.sin(angle) - 30;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el._angle = angle;
    });
  }

  handleSlide(e) {
    const rect = this.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;

    const dist = Math.hypot(dx, dy);
    const items = this.menuElement.querySelectorAll(".context-menu-item");

    // Finger-sized empty area in the middle (~44px diameter, so 22px radius)
    if (dist < 22) {
      items.forEach((el) => el.classList.remove("highlighted"));
      return;
    }

    // Map angle to 45-degree section (0-7)
    const section = Math.floor(angle / (Math.PI / 4));
    
    let closestItem = null;
    items.forEach((el) => {
      // Check if this item's angle falls into the current section
      const itemAngle = el._angle;
      const itemSection = Math.floor(itemAngle / (Math.PI / 4));
      if (itemSection === section) {
        closestItem = el;
      }
    });

    if (closestItem) {
      items.forEach((el) => el.classList.remove("highlighted"));
      closestItem.classList.add("highlighted");
    } else {
      items.forEach((el) => el.classList.remove("highlighted"));
    }
  }

  get isOpen() {
    return this._isMenuOpen;
  }
}
