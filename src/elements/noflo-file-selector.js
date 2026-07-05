import icons from "../../vendor/fontawesome-icons-7.3.0.js";

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

  render() {
    const folderIcon = icons()["folder-open"];
    this.shadowRoot.innerHTML = `
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
          background: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          color: black;
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
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          border: 1px solid #ccc;
          cursor: pointer;
          display: none;
          justify-content: center;
          align-items: center;
          font-size: 20px;
          z-index: 1001;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          pointer-events: auto;
        }

        #minimize-btn i {
          font-family: 'Font Awesome 7 Free';
          font-style: normal;
        }

        .control-group {
          pointer-events: auto;
          background: var(--ui-bg, #eee);
          padding: 1rem;
          border-bottom: 1px solid #ccc;
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
          border-bottom: 1px solid #ddd;
        }

        #file-list li:hover {
          background-color: #f0f0f0;
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
    this.shadowRoot
      .getElementById("start-btn")
      .addEventListener("click", this.handleOpenDirectory);
    this.shadowRoot
      .getElementById("new-graph-btn")
      .addEventListener("click", this.handleNewGraph);
    this.shadowRoot
      .getElementById("minimize-btn")
      .addEventListener("click", this.handleExpand);
  }

  handleNewGraph = () => {
    this.dispatchEvent(
      new CustomEvent("new-graph-requested", {
        bubbles: true,
        composed: true,
      }),
    );
  };

  handleExpand = () => {
    this.shadowRoot.getElementById("minimize-btn").style.display = "none";
    if (this.directoryHandle) {
      this.shadowRoot.getElementById("controls").style.display = "block";
      this.listFiles();
    } else {
      this.shadowRoot.getElementById("start-overlay").style.display = "flex";
    }
  };

  minimize() {
    this.shadowRoot.getElementById("start-overlay").style.display = "none";
    this.shadowRoot.getElementById("controls").style.display = "none";
    this.shadowRoot.getElementById("minimize-btn").style.display = "flex";
  }

  handleOpenDirectory = async () => {
    if (!window.showDirectoryPicker) {
      alert(
        "The File System Access API is not supported in this browser. Please use a Chromium-based browser.",
      );
      return;
    }

    try {
      this.directoryHandle = await window.showDirectoryPicker();
      console.log("Directory selected:", this.directoryHandle.name);

      this.shadowRoot.getElementById("start-overlay").style.display = "none";
      this.shadowRoot.getElementById("controls").style.display = "block";

      this.dispatchEvent(
        new CustomEvent("directory-selected", {
          detail: { directoryHandle: this.directoryHandle },
          bubbles: true,
          composed: true,
        }),
      );

      this.listFiles();
    } catch (err) {
      console.error("Error opening directory:", err);
    }
  };

  async listFiles() {
    if (!this.directoryHandle) return;

    const fileList = this.shadowRoot.getElementById("file-list");
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
          this.dispatchEvent(
            new CustomEvent("file-selected", {
              detail: { fileHandle: entry },
              bubbles: true,
              composed: true,
            }),
          );
        });
        fileList.appendChild(li);
      }
    }
  }
}
