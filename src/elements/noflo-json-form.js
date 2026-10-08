// @ts-nocheck
import Jedison from "../../vendor/jedison.js";
import { emit } from "../events.js";
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
   * and routes them through the class setters.
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
      // Bootstrap-styled markup: the class names match the theme CSS in
      // src/styles/json-form.css
      theme: new Jedison.ThemeBootstrap3(),
      schema: this._schema,
      startval: this._data,
      customEditors: [FontAwesomeEditor],
      // Custom schema constraints (work document #5): the validator merges
      // these with the JSON Schema draft's built-ins, so schemas carrying
      // the `uniquePortNames` keyword flag duplicates live — on every
      // change, not only on save
      constraints: {
        uniquePortNames: ({ value, path }) => {
          const names = (value ?? [])
            .map((/** @type {any} */ port) => port?.name)
            .filter(Boolean);
          const duplicates = [
            ...new Set(
              names.filter((name, index) => names.indexOf(name) !== index),
            ),
          ];
          if (duplicates.length === 0) return [];
          return [
            {
              type: "error",
              path,
              constraint: "uniquePortNames",
              messages: [
                `Port names must be unique per direction: ${duplicates.join(", ")}`,
              ],
            },
          ];
        },
      },
    });

    // The live stream: jedison re-validates on every change, so
    // duplicates surface as the user types, not on save. Jedison does
    // not emit for the constructor's startval, so the initial state
    // forwards once here (work document #5)
    const forwardChange = () => {
      const errors = this.editor.getErrors();
      emit(this, "form-change", {
        data: this.editor.getValue(),
        isValid: errors.length === 0,
        errors,
      });
    };
    this.editor.on("change", forwardChange);
    forwardChange();
  }
}

// Register the custom element with the browser
customElements.define("noflo-json-form", NofloJsonForm);
