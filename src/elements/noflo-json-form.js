// @ts-nocheck
import Jedison from "../../vendor/jedison-1.13.0.js";
import { FontAwesomeEditor } from "../library/editors/fontawesome.js";

class NofloJsonForm extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this._schema = {};
    this._data = null;
  }

  /**
   * Intercept schema assignments to rebuild the editor dynamically.
   */
  set schema(val) {
    this._schema = val;
    if (this.isConnected) {
      this._rebuildEditor();
    }
  }

  get schema() {
    return this._schema;
  }

  /**
   * Intercept data assignments to update the form state.
   */
  set data(val) {
    this._data = val;
    if (this.editor) {
      this.editor.setValue(val);
    }
  }

  get data() {
    return this.editor ? this.editor.getValue() : this._data;
  }

  /**
   * Mounts the editor when the element is added to the DOM.
   */
  connectedCallback() {
    // 1. Capture any pre-upgrade values shadowing our setters
    this._upgradeProperty("schema");
    this._upgradeProperty("data");

    // 2. Build the editor
    this._rebuildEditor();
  }

  /**
   * Captures properties set before the element was upgraded
   * and routes:them through the class setters.
   */
  _upgradeProperty(prop) {
    if (Object.hasOwn(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  /**
   * Crucial for graph editors: cleans up memory when a node is deselected/removed.
   */
  disconnectedCallback() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }

  /**
   * Handles creating or recreating the Jedison instance.
   */
  _rebuildEditor() {
    // 1. Clean up the old instance if it exists
    if (this.editor) {
      this.editor.destroy();
      this.innerHTML = "";
    }

    if (!this._schema || Object.keys(this._schema).length === 0) return;

    this.editor = new Jedison.Create({
      container: this,
      theme: new Jedison.Theme(),
      schema: this._schema,
      startval: this._data,
      customEditors: [FontAwesomeEditor],
    });

    // 2. Wait for the engine to finish its initial render and data binding
    this.editor.on("ready", () => {
      // 3. Now it is safe to listen for actual user changes
      this.editor.on("change", () => {
        // 4. Access the auto-generated validation results directly
        // Fallback to an empty array just in case it is perfectly valid and undefined
        const errors = this.editor.validation_results || [];

        this.dispatchEvent(
          new CustomEvent("form-change", {
            detail: {
              data: this.editor.getValue(),
              isValid: errors.length === 0,
              errors: errors,
            },
            bubbles: true,
            composed: true,
          }),
        );
      });
    });
  }
}

// Register the custom element with the browser
customElements.define("noflo-json-form", NofloJsonForm);
