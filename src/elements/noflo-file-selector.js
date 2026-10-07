import icons from "../../vendor/fontawesome-icons.js";
import { emit } from "../events.js";

/**
 * @typedef {Object} FileSelectorEventDetail
 * @property {FileSystemDirectoryHandle} [directoryHandle]
 * @property {FileSystemFileHandle} [fileHandle]
 */

/**
 * File Selector Web Component
 *
 * Handles directory selection and file listing.
 *
 * @extends HTMLElement
 */
export class FileSelector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {FileSystemDirectoryHandle | null} */
    this.directoryHandle = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  /**
   * Shadow root accessor that satisfies the type checker; the element always
   * attaches its shadow root in the constructor.
   *
   * @returns {ShadowRoot}
   */
  get uiRoot() {
    return /** @type {ShadowRoot} */ (this.shadowRoot);
  }

  /**
   * Looks up a template element inside the shadow root. Throws if the element
   * is missing, since the template is static and all IDs are known.
   *
   * @param {string} id
   * @returns {HTMLElement}
   */
  uiElement(id) {
    const el = this.uiElement(id);
    if (!el) throw new Error(`FileSelector is missing element #${id}`);
    return el;
  }

  render() {
    const folderIcon = icons()["folder-open"];
    /** @type {ShadowRoot} */ (this.shadowRoot).innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          pointer-events: none;
        }

        #start-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          pointer-events: auto;
        }

        #overlay-content {
          background: var(--ui-bg);
          color: var(--node-text);
          border: 1px solid var(--ui-panel-border);
          border-radius: var(--ui-radius);
          padding: 2rem;
          text-align: center;
        }

        #controls {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          pointer-events: none;
          display: none;
        }

        #minimize-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          width: var(--ui-target, 44px);
          height: var(--ui-target, 44px);
          border-radius: var(--ui-radius);
          background: var(--ui-bg);
          color: var(--node-text);
          border: 1px solid var(--ui-border);
          cursor: pointer;
          display: none;
          justify-content: center;
          align-items: center;
          font-size: 20px;
          z-index: 1001;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          pointer-events: auto;
        }
        #minimize-btn:focus-visible {
          outline: 2px solid var(--ui-focus);
          outline-offset: 2px;
        }

        #minimize-btn i {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }

        .control-group {
          pointer-events: auto;
          background: var(--ui-bg);
          color: var(--node-text);
          padding: 1rem;
          border-bottom: 1px solid var(--ui-panel-border);
        }

        .control-label {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        #file-list {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 300px;
          overflow-y: auto;
        }

        #file-list li {
          padding: 0.5rem;
          cursor: pointer;
          color: var(--node-text);
          border-bottom: 1px solid var(--ui-border);
        }

        #file-list li:hover {
          background-color: color-mix(in srgb, var(--ui-accent) 12%, transparent);
        }

        #file-list li:focus-visible {
          outline: 2px solid var(--ui-focus);
          outline-offset: -2px;
        }

        #new-graph-btn {
          margin-top: 10px;
          width: 100%;
        }
      </style>

      <div id="start-overlay">
        <div id="overlay-content">
          <h2>Flowbased Graph Editor</h2>
          <p>Please select a directory to begin.</p>
          <button id="start-btn" type="button">Open Directory</button>
        </div>
      </div>

      <div id="controls">
        <div class="control-group">
          <div class="control-label">Files</div>
          <ul id="file-list"></ul>
          <button id="new-graph-btn" type="button">New Graph</button>
        </div>
      </div>

      <button id="minimize-btn" title="Open Files"><i class="fa-solid fa-folder-open">${folderIcon}</i></button>
    `;
  }

  setupEventListeners() {
    this.uiElement("start-btn").addEventListener(
      "click",
      this.handleOpenDirectory,
    );
    this.uiElement("new-graph-btn").addEventListener(
      "click",
      this.handleNewGraph,
    );
    this.uiElement("minimize-btn").addEventListener("click", this.handleExpand);
  }

  handleNewGraph = () => {
    emit(this, "new-graph-requested", undefined);
  };

  handleExpand = () => {
    this.uiElement("minimize-btn").style.display = "none";
    if (this.directoryHandle) {
      this.uiElement("controls").style.display = "block";
      this.listFiles();
    } else {
      this.uiElement("start-overlay").style.display = "flex";
    }
  };

  minimize() {
    this.uiElement("start-overlay").style.display = "none";
    this.uiElement("controls").style.display = "none";
    this.uiElement("minimize-btn").style.display = "flex";
  }

  handleOpenDirectory = async () => {
    const picker = /** @type {any} */ (window).showDirectoryPicker;
    if (!picker) {
      alert(
        "The File System Access API is not supported in this browser. Please use a Chromium-based browser.",
      );
      return;
    }

    try {
      this.directoryHandle = await picker();
      console.log("Directory selected:", this.directoryHandle?.name);

      this.uiElement("start-overlay").style.display = "none";
      this.uiElement("controls").style.display = "block";

      emit(this, "directory-selected", {
        directoryHandle: this.directoryHandle,
      });

      this.listFiles();
    } catch (err) {
      console.error("Error opening directory:", err);
    }
  };

  async listFiles() {
    if (!this.directoryHandle) return;

    const fileList = this.uiElement("file-list");
    if (!fileList) return;
    fileList.innerHTML = "";
    for await (const entry of this.directoryHandle.values()) {
      if (
        entry.kind === "file" &&
        entry.name !== "fbp.library.json" &&
        (entry.name.endsWith(".json") || entry.name.endsWith(".fbp"))
      ) {
        const li = document.createElement("li");
        li.textContent = entry.name.split(".")[0];
        li.addEventListener("click", () => {
          emit(this, "file-selected", { fileHandle: entry });
        });
        fileList.appendChild(li);
      }
    }
  }
}

customElements.define("noflo-file-selector", FileSelector);
