/**
 * Manages the selection state of the NoFlo graph.
 * Extends EventTarget to natively emit events when selection changes.
 */
export class SelectionManager extends EventTarget {
  /** @type {Set<string>} */
  nodes;
  /** @type {Set<string>} */
  edges;
  /** @type {Set<string>} */
  iips;
  /** @type {Set<string>} */
  ports;

  constructor() {
    super();
    // Using Sets ensures uniqueness and provides O(1) lookups
    this.nodes = new Set();
    this.edges = new Set();
    this.iips = new Set();
    this.ports = new Set();
  }

  /**
   * Selects an item, optionally preserving existing selections (multi-select)
   * @param {'nodes'|'edges'|'iips'|'ports'} type 
   * @param {string} id 
   * @param {boolean} [multiSelect=false] (e.g., is Shift key held?)
   */
  select(type, id, multiSelect = false) {
    let changed = false;

    if (!multiSelect) {
      // If not multi-selecting, clear ONLY the specified type first
      const hadSelection = this[type].size > 0;
      this[type].clear();
      if (hadSelection) changed = true;
    }

    if (!this[type].has(id)) {
      this[type].add(id);
      changed = true;
    }

    if (changed) this._notify();
  }

  /**
   * Toggles the selection state of an item
   * @param {'nodes'|'edges'|'iips'|'ports'} type 
   * @param {string} id 
   */
  toggle(type, id) {
    if (this[type].has(id)) {
      this[type].delete(id);
    } else {
      this[type].add(id);
    }
    this._notify();
  }

  /**
   * Clears all current selections
   */
  clear() {
    if (this.hasAnySelection()) {
      this._clearSilently();
      this._notify();
    }
  }

  /**
   * Clears all current selections of a specific type
   * @param {'nodes'|'edges'|'iips'|'ports'} type
   */
  clearType(type) {
    if (this[type].size > 0) {
      this[type].clear();
      this._notify();
    }
  }

  /**
   * Clears all sets without notifying
   * @private
   */
  _clearSilently() {
    this.nodes.clear();
    this.edges.clear();
    this.iips.clear();
    this.ports.clear();
  }

  /**
   * Checks if there is any selection
   * @returns {boolean}
   */
  hasAnySelection() {
    return this.nodes.size > 0 || this.edges.size > 0 || 
           this.iips.size > 0 || this.ports.size > 0;
  }

  /**
   * Returns a snapshot of the current selection for UI rendering
   * @returns {{nodes: string[], edges: string[], iips: string[], ports: string[]}}
   */
  getSnapshot() {
    return {
      nodes: Array.from(this.nodes),
      edges: Array.from(this.edges),
      iips: Array.from(this.iips),
      ports: Array.from(this.ports)
    };
  }

  /**
   * Dispatches a 'selection-changed' event
   * @private
   */
  _notify() {
    // Dispatch a standard CustomEvent with the new state
    this.dispatchEvent(new CustomEvent('selection-changed', {
      detail: this.getSnapshot()
    }));
  }
}
