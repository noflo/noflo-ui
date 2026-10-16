/**
 * @file The schema-driven form (work document #57): the declared forms
 * subset rendered through vanilla Web Components — native JSON Schema
 * parsing, DOM construction, no framework dependency. Jedison is the
 * incumbent implementation, not a commitment; this element is what the
 * schema-driven surfaces (inspector forms, IIP forms, control ports)
 * consume.
 *
 * The forms subset renders as typed widgets per the visual guidelines'
 * typed-forms rule; anything the subset cannot draw falls back per
 * subtree to the raw JSON textarea (evaluated on change; non-JSON text
 * becomes a string value, matching the store's load convention), with
 * the validation error shown beside it — the form and the validator can
 * never silently disagree.
 *
 * Validation: errors are paths into the value tree, and the element
 * carries a `validator` seam — the in-repo subset validator by default,
 * with the full Tier B validator (a vendored 2020-12 implementation)
 * swapping in through the same seam when it lands. Invalid existing
 * state renders with visible errors, never blank.
 */

import { collectSchemaRefs } from "../../vendor/fbp-protocol.js";
import { emit } from "../events.js";
import { buildFormNode } from "../library/forms/subset.js";
import { tierBValidate } from "../library/forms/tierB.js";
import { validate as subsetValidate } from "../library/forms/validate.js";

/**
 * The default validator chain: the full Tier B vocabulary first — a
 * schema that compiles validates fully, whatever keywords it carries —
 * falling back to the in-repo subset validator when the schema does not
 * compile. Validation never silently passes.
 *
 * @param {any} value
 * @param {any} schema
 * @returns {import("../library/forms/validate.js").ValidationError[]}
 */
function defaultValidator(value, schema) {
  const full = tierBValidate(value, schema);
  if (full) return full;
  return subsetValidate(value, schema);
}

/** Styles: the §12 form-row grammar (muted label, control, hairlines). */
const STYLES = `
  :host {
    display: block;
    font-family: inherit;
    font-size: 13px;
    color: inherit;
  }
  .row {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 4px 0;
    padding: 3px 0;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
  }
  .row > label {
    color: color-mix(in srgb, currentColor 60%, transparent);
    flex: 0 0 auto;
    min-width: 88px;
  }
  .row > .control {
    flex: 1;
    min-width: 0;
  }
  .row.invalid > .control input,
  .row.invalid > .control textarea,
  .row.invalid > .control select {
    border-color: var(--ui-age-attention, #e2b344);
  }
  .error {
    color: var(--ui-age-attention, #e2b344);
    font-size: 10px;
    margin: 2px 0 0 96px;
  }
  input, textarea, select {
    background: var(--ui-bg, transparent);
    color: inherit;
    border: 1px solid var(--ui-border, #333);
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    min-height: var(--ui-target, 44px);
  }
  textarea {
    min-height: 72px;
    font-family: SourceCodePro, monospace;
  }
  input[type="checkbox"] {
    width: 18px;
    min-height: 18px;
    accent-color: var(--ui-accent, #4aa3df);
  }
  input[type="color"] {
    padding: 2px;
    min-height: 32px;
  }
  select {
    appearance: auto;
  }
  .field {
    border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 6px;
    padding: 8px 10px;
    margin: 6px 0;
  }
  .field > .legend {
    font-size: 12px;
    font-weight: bold;
    color: var(--ui-accent, #4aa3df);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .array-row {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    margin: 4px 0;
  }
  .array-row > .control {
    flex: 1;
    min-width: 0;
  }
  button.remove {
    background: transparent;
    color: inherit;
    border: 1px solid var(--ui-border, #333);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-family: inherit;
    min-height: var(--ui-target, 44px);
  }
  button.add {
    background: transparent;
    color: var(--ui-accent, #4aa3df);
    border: 1px solid var(--ui-accent, #4aa3df);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    font-family: inherit;
    text-transform: uppercase;
    min-height: var(--ui-target, 44px);
  }
  .const-value {
    font-family: SourceCodePro, monospace;
    padding: 5px 8px;
  }
`;

/**
 * Formats a wall-clock timestamp as the muted HH:MM:SS column.
 *
 * @param {string | undefined} value
 * @returns {string}
 */
function controlType(value) {
  switch (value) {
    case "date":
      return "date";
    case "date-time":
      return "datetime-local";
    case "time":
      return "time";
    case "color":
      return "color";
    default:
      return "text";
  }
}

/**
 * The error path prefix matches the validator's JSON Pointer root.
 *
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  return path === "#" ? "" : path.replace(/^#/, "");
}

/**
 * Substitutes resolved references into a schema document: a `$ref` whose
 * target the session resolved replaces with the referenced body (the
 * validator then sees the resolved document); unresolvable refs keep
 * their `$ref` — the render tree falls back per subtree, and validation
 * never silently passes.
 *
 * @param {any} node
 * @param {Map<string, any>} refs
 * @param {number} depth
 * @returns {any}
 */
function substituteRefs(node, refs, depth) {
  if (depth > 16) return node;
  if (Array.isArray(node)) {
    return node.map((item) => substituteRefs(item, refs, depth + 1));
  }
  if (node === null || typeof node !== "object") return node;
  if (typeof node.$ref === "string" && refs.has(node.$ref)) {
    return substituteRefs(refs.get(node.$ref), refs, depth + 1);
  }
  /** @type {any} */
  const result = {};
  for (const [key, value] of Object.entries(node)) {
    result[key] = substituteRefs(value, refs, depth + 1);
  }
  return result;
}

export class NofloSchemaForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {any} */
    this._schema = {};
    /** @type {any} */
    this._data = undefined;
    /** @type {import("../library/forms/subset.js").FormNode | null} */
    this._root = null;
    /** @type {((value: any, schema: any) => import("../library/forms/validate.js").ValidationError[]) | null} */
    this._validator = null;
    /** @type {((ref: string) => Promise<any | null>) | null} The schema
     * reference resolver (the schema cache, work document #57): urn refs
     * resolve through it, local pointers through the document itself. */
    this._refResolver = null;
    /** @type {Promise<void> | null} The in-flight schema preparation. */
    this._building = null;
    /** @type {any} The schema with resolved refs inlined (validation and
     * render see the resolved document). */
    this._preparedSchema = null;
    /** The default chain runs when no explicit validator is set. */
    this._defaultValidator = defaultValidator;
    /** @type {Map<string, HTMLElement>} Error message elements by control path. */
    this._errorSlots = new Map();
  }

  /** The JSON Schema document the form renders. */
  set schema(value) {
    this._schema = value ?? {};
    this._building = this._prepare();
  }

  /** The in-flight schema preparation, for callers that await the build. */
  get building() {
    return this._building ?? Promise.resolve();
  }

  /**
   * Resolves the document's references (the refs the session can reach),
   * then builds the render tree. Unresolvable refs fall back per subtree
   * — the offline degradation ladder.
   *
   * @returns {Promise<void>}
   */
  async _prepare() {
    /** @type {Map<string, any>} */
    const refs = new Map();
    if (this._refResolver) {
      for (const ref of collectSchemaRefs(this._schema) ?? []) {
        try {
          const body = await this._refResolver(ref);
          if (body !== null && body !== undefined) refs.set(ref, body);
        } catch {
          // Unresolvable: the subtree falls back with its reason
        }
      }
    }
    // The prepared schema inlines the resolved references: both the
    // validators (Ajv cannot compile an unresolvable urn ref, and the
    // subset validator does not follow them) and the render tree see the
    // resolved document. Unresolvable refs keep their $ref — the render
    // tree falls back per subtree, and validation never silently passes
    this._preparedSchema = substituteRefs(
      structuredClone(this._schema),
      refs,
      0,
    );
    this._root = buildFormNode(this._preparedSchema, 0, {
      root: this._preparedSchema,
    });
    if (this._data === undefined) {
      // Schema default prefill (work document #37 §3.4): prefill, no
      // runtime behavior — the defaults tree walks the render tree
      this._data = this.prefillDefaults(this._root);
    }
    if (this.isConnected) {
      this.render();
      this.revalidate();
    }
  }

  /**
   * The schema reference resolver seam (work document #57): urn refs
   * resolve through it — the schema cache is the intended provider.
   */
  set refResolver(/** @type {((ref: string) => Promise<any | null>) | null} */ fn) {
    this._refResolver = typeof fn === "function" ? fn : null;
  }

  /**
   * Builds the defaults tree from a render node: object properties fill
   * from their own defaults; a node with a default prefills wholesale.
   *
   * @param {import("../library/forms/subset.js").FormNode} node
   * @returns {any}
   */
  prefillDefaults(node) {
    if (node.defaultValue !== undefined) {
      return structuredClone(node.defaultValue);
    }
    if (node.kind === "object") {
      /** @type {any} */
      const object = {};
      for (const property of node.properties ?? []) {
        const value = this.prefillDefaults(property.node);
        if (value !== undefined) object[property.name] = value;
      }
      return Object.keys(object).length > 0 ? object : undefined;
    }
    return undefined;
  }

  get schema() {
    return this._schema;
  }

  /** The current value. */
  set data(value) {
    this._data = value;
    if (this.isConnected) {
      this.render();
      this.revalidate();
    }
  }

  get data() {
    return this._data;
  }

  /**
   * The validator seam: a function of (value, schema) returning the
   * error list. Defaults to the in-repo subset validator; the full Tier
   * B validator swaps in through this seam.
   */
  set validator(/** @type {(value: any, schema: any) => import("../library/forms/validate.js").ValidationError[]} | null} */ fn) {
    this._validator = typeof fn === "function" ? fn : null;
    this.revalidate();
  }

  connectedCallback() {
    this._upgradeProperty("schema");
    this._upgradeProperty("data");
    this._upgradeProperty("validator");
    this.render();
    this.revalidate();
  }

  /**
   * Captures properties set before the element was upgraded.
   *
   * @param {string} prop
   */
  _upgradeProperty(prop) {
    if (Object.hasOwn(this, prop)) {
      const value = /** @type {any} */ (this)[prop];
      delete (/** @type {any} */ (this)[prop]);
      /** @type {any} */ (this)[prop] = value;
    }
  }

  /** Runs validation and reports the change. */
  revalidate() {
    const validator = this._validator ?? this._defaultValidator;
    this._errors =
      validator(this._data, this._preparedSchema ?? this._schema) ?? [];
    emit(this, "form-change", {
      data: this._data,
      isValid: this._errors.length === 0,
      errors: this._errors,
    });
    // The per-control messages update in place: the DOM stays put
    for (const [path, slot] of this._errorSlots) {
      const error = this._errors.find(
        (/** @type {any} */ e) => normalizePath(e.path) === path,
      );
      slot.textContent = error ? error.message : "";
      const row = slot.closest(".row");
      row?.classList.toggle("invalid", Boolean(error));
    }
  }

  /**
   * Mutates the value at a JSON Pointer path and revalidates.
   *
   * @param {string} pointer The path below the root ("" is the root).
   * @param {any} value
   */
  _setAt(pointer, value) {
    if (pointer === "") {
      this._data = value;
    } else {
      const segments = pointer
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
      /** @type {any} */
      let parent = this._data;
      for (let i = 0; i < segments.length - 1; i++) {
        parent = parent[segments[i]];
      }
      parent[segments[segments.length - 1]] = value;
    }
    this.revalidate();
  }

  /**
   * Builds the control for one render node. The DOM binds directly to
   * the value tree — no framework, no re-render per keystroke.
   *
   * @param {import("../library/forms/subset.js").FormNode} node
   * @param {string} pointer The path below the root.
   * @param {any} value
   * @param {string | null} label The row label (the property name or the
   *   schema title).
   * @returns {HTMLElement} The row (or field) element.
   */
  buildControl(node, pointer, value, label) {
    if (node.kind === "fallback") {
      return this.fallbackControl(node, pointer, value, label);
    }

    if (node.kind === "object") {
      const field = document.createElement("div");
      field.className = "field";
      const legend = document.createElement("div");
      legend.className = "legend";
      legend.textContent = node.title ?? label ?? "";
      field.appendChild(legend);
      for (const property of node.properties ?? []) {
        const childValue = value?.[property.name];
        field.appendChild(
          this.buildControl(
            property.node,
            `${pointer}/${property.name}`,
            childValue,
            property.node.title ?? property.name,
          ),
        );
      }
      // The field's own errors (bounds, closure) surface beside it
      const error = document.createElement("div");
      error.className = "error";
      this._errorSlots.set(normalizePath(pointer), error);
      field.appendChild(error);
      return field;
    }

    if (node.kind === "array") {
      const field = document.createElement("div");
      field.className = "field";
      const legend = document.createElement("div");
      legend.className = "legend";
      legend.textContent = node.title ?? label ?? "";
      field.appendChild(legend);
      const items = Array.isArray(value) ? value : [];
      items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "array-row";
        const control = document.createElement("div");
        control.className = "control";
        control.appendChild(
          this.buildControl(
            node.items ?? {
              kind: "fallback",
              schema: {},
              fallbackReason: "no items schema",
            },
            `${pointer}/${index}`,
            item,
            null,
          ),
        );
        row.appendChild(control);
        const remove = document.createElement("button");
        remove.className = "remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
          const next = [...items];
          next.splice(index, 1);
          this._setAt(pointer, next);
        });
        row.appendChild(remove);
        field.appendChild(row);
      });
      const add = document.createElement("button");
      add.className = "add";
      add.textContent = "Add";
      add.addEventListener("click", () => {
        const next = [...items, node.items?.defaultValue ?? null];
        this._setAt(pointer, next);
      });
      field.appendChild(add);
      // The field's own errors (bounds) surface beside it
      const error = document.createElement("div");
      error.className = "error";
      this._errorSlots.set(normalizePath(pointer), error);
      field.appendChild(error);
      return field;
    }

    if (node.kind === "picker" && node.picker) {
      const picker = node.picker;
      const field = document.createElement("div");
      field.className = "field";
      const legend = document.createElement("div");
      legend.className = "legend";
      legend.textContent = node.title ?? label ?? "";
      field.appendChild(legend);
      const selected = value?.[picker.propertyName];
      const select = document.createElement("select");
      for (const branch of picker.branches) {
        const optionEl = document.createElement("option");
        optionEl.value = JSON.stringify(branch.value);
        optionEl.textContent = branch.label;
        optionEl.selected =
          JSON.stringify(branch.value) === JSON.stringify(selected);
        select.appendChild(optionEl);
      }
      select.addEventListener("change", () => {
        // Switching implementations: the selector's value writes into the
        // data, the branch's form re-renders around it
        const branchValue = JSON.parse(select.value);
        const next = { ...(value ?? {}), [picker.propertyName]: branchValue };
        this._data = next;
        this.render();
        this.revalidate();
      });
      field.appendChild(select);
      const active = picker.branches.find(
        (branch) => JSON.stringify(branch.value) === JSON.stringify(selected),
      );
      if (active) {
        const branchField = document.createElement("div");
        branchField.className = "control";
        branchField.appendChild(
          this.buildControl(active.node, pointer, value, null),
        );
        field.appendChild(branchField);
      }
      const pickerError = document.createElement("div");
      pickerError.className = "error";
      this._errorSlots.set(normalizePath(pointer), pickerError);
      field.appendChild(pickerError);
      return field;
    }

    // The scalar row: muted label + control, the §12 grammar
    const row = document.createElement("div");
    row.className = "row";
    if (label !== null) {
      const labelEl = document.createElement("label");
      labelEl.textContent = node.title ?? label ?? "";
      row.appendChild(labelEl);
    }
    const control = document.createElement("div");
    control.className = "control";

    if (node.kind === "enum") {
      const select = document.createElement("select");
      for (const option of node.enum ?? []) {
        const optionEl = document.createElement("option");
        optionEl.value = JSON.stringify(option);
        optionEl.textContent =
          typeof option === "string" ? option : JSON.stringify(option);
        optionEl.selected = JSON.stringify(option) === JSON.stringify(value);
        select.appendChild(optionEl);
      }
      select.addEventListener("change", () => {
        this._setAt(pointer, JSON.parse(select.value));
      });
      control.appendChild(select);
    } else if (node.kind === "const") {
      const display = document.createElement("div");
      display.className = "const-value";
      display.textContent = JSON.stringify(node.const);
      control.appendChild(display);
    } else if (node.kind === "boolean") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = value === true;
      input.addEventListener("change", () => {
        this._setAt(pointer, input.checked);
      });
      control.appendChild(input);
    } else if (node.kind === "number" || node.kind === "integer") {
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.value = value === undefined || value === null ? "" : String(value);
      input.addEventListener("change", () => {
        // Accept both "." and "," decimal separators — normalize commas
        // before parsing (the locales rule)
        const normalized = input.value.replaceAll(",", ".");
        const parsed = Number(normalized);
        this._setAt(pointer, normalized === "" ? undefined : parsed);
      });
      control.appendChild(input);
    } else if (node.kind === "string") {
      const input = document.createElement("input");
      input.type = controlType(node.format);
      input.value = value ?? "";
      input.addEventListener("change", () => {
        this._setAt(pointer, input.value === "" ? undefined : input.value);
      });
      control.appendChild(input);
    }

    // The error slot: the message sits beside the control it describes
    const error = document.createElement("div");
    error.className = "error";
    this._errorSlots.set(normalizePath(pointer), error);
    control.appendChild(error);
    row.appendChild(control);
    return row;
  }

  /**
   * The raw JSON fallback: a textarea evaluated on change — valid JSON
   * parses, non-JSON text becomes a string value (the store's load
   * convention).
   *
   * @param {import("../library/forms/subset.js").FormNode} node
   * @param {string} pointer
   * @param {any} value
   * @param {string | null} label
   * @returns {HTMLElement}
   */
  fallbackControl(node, pointer, value, label) {
    const row = document.createElement("div");
    row.className = "row";
    if (label !== null) {
      const labelEl = document.createElement("label");
      labelEl.textContent = node.title ?? label ?? "";
      row.appendChild(labelEl);
    }
    const control = document.createElement("div");
    control.className = "control";
    const textarea = document.createElement("textarea");
    textarea.value = value === undefined ? "" : JSON.stringify(value, null, 2);
    textarea.addEventListener("change", () => {
      try {
        this._setAt(pointer, JSON.parse(textarea.value));
      } catch {
        // Non-JSON text becomes a string value
        this._setAt(pointer, textarea.value);
      }
    });
    control.appendChild(textarea);
    if (node.fallbackReason) {
      const reason = document.createElement("div");
      reason.className = "error";
      reason.textContent = `raw JSON editor — ${node.fallbackReason}`;
      control.appendChild(reason);
    }
    const error = document.createElement("div");
    error.className = "error";
    this._errorSlots.set(normalizePath(pointer), error);
    control.appendChild(error);
    row.appendChild(control);
    return row;
  }

  render() {
    this._errorSlots.clear();
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    shadow.innerHTML = `<style>${STYLES}</style>`;
    const container = document.createElement("div");
    container.className = "schema-form";
    if (this._root) {
      container.appendChild(
        this.buildControl(this._root, "", this._data, null),
      );
    }
    shadow.appendChild(container);
  }
}

customElements.define("noflo-schema-form", NofloSchemaForm);
