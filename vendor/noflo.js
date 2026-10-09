var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@noflo/graph/src/graph/entities.js
function sameRef(a, b) {
  return a.node === b.node && a.port === b.port && (a.index ?? void 0) === (b.index ?? void 0);
}
var GraphModelError = class extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = "GraphModelError";
  }
};
function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new GraphModelError(`${field} must be a non-empty string`);
  }
  return value;
}
function requirePortRef(value, field) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new GraphModelError(`${field} must be a { node, port } reference`);
  }
  const ref = (
    /** @type {Record<string, unknown>} */
    value
  );
  requireString(ref.node, `${field}.node`);
  requireString(ref.port, `${field}.port`);
  const out = {
    node: (
      /** @type {string} */
      ref.node
    ),
    port: (
      /** @type {string} */
      ref.port
    )
  };
  if (ref.index !== void 0) {
    if (typeof ref.index !== "number" || !Number.isInteger(ref.index) || ref.index < 0) {
      throw new GraphModelError(
        `${field}.index must be a non-negative integer`
      );
    }
    out.index = ref.index;
  }
  return out;
}
function freezeMetadata(value, field) {
  if (value === void 0 || value === null) {
    return void 0;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new GraphModelError(`${field} must be an object`);
  }
  return deepFreeze(structuredClone(value));
}
function freezeIipData(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }
  let data = value;
  try {
    data = structuredClone(value);
  } catch {
  }
  return deepFreeze(data);
}
function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
    Object.freeze(value);
  }
  return value;
}
var KIND_PREFIX = (
  /** @type {Record<EntityKind, string>} */
  {
    node: "n",
    edge: "e",
    iip: "i",
    export: "x",
    group: "g"
  }
);
function makeEntityId(kind, counter) {
  return `${KIND_PREFIX[kind]}${counter}`;
}
function compareEntityIds(a, b) {
  if (a.entity_id < b.entity_id) {
    return -1;
  }
  if (a.entity_id > b.entity_id) {
    return 1;
  }
  return 0;
}

// node_modules/@noflo/graph/src/graph/canonical.js
function stableStringify(value) {
  return JSON.stringify(canonicalize(value, /* @__PURE__ */ new Set()));
}
function canonicalize(value, ancestors) {
  if (Array.isArray(value)) {
    return value.map((element) => canonicalize(element, ancestors));
  }
  if (value !== null && typeof value === "object") {
    if (ancestors.has(value)) {
      throw new GraphModelError("Cannot canonicalize a cyclic structure");
    }
    ancestors.add(value);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key], ancestors);
    }
    ancestors.delete(value);
    return out;
  }
  return value;
}

// node_modules/@noflo/graph/src/graph/GraphModel.js
function edgeKey(from, to) {
  return `${from.node}\0${from.port}\0${from.index ?? ""}${to.node}\0${to.port}\0${to.index ?? ""}`;
}
var GraphModel = class _GraphModel extends EventTarget {
  /** @type {string|undefined} */
  #name;
  /** @type {Map<string, GraphNode>} */
  #nodes = /* @__PURE__ */ new Map();
  /** @type {Map<string, GraphEdge>} */
  #edges = /* @__PURE__ */ new Map();
  /** Lookup index for duplicate-edge detection: ref-key → entity_id */
  #edgeIndex = /* @__PURE__ */ new Map();
  /** @type {Map<string, GraphIIP>} */
  #iips = /* @__PURE__ */ new Map();
  /** @type {Map<string, GraphExport>} */
  #exports = /* @__PURE__ */ new Map();
  /** @type {Map<string, GraphGroup>} */
  #groups = /* @__PURE__ */ new Map();
  /** @type {Object<string, any>} */
  #metadata = {};
  /** @type {number} */
  #counter = 0;
  /**
   * @param {GraphModelOptions} [options]
   */
  constructor(options = {}) {
    super();
    if (options.name !== void 0) {
      this.#name = requireString(options.name, "name");
    }
  }
  // ## Identity
  /**
   * @returns {string|undefined}
   */
  get name() {
    return this.#name;
  }
  /**
   * @param {string} value
   */
  set name(value) {
    this.#name = requireString(value, "name");
  }
  // ## Graph-level metadata
  /**
   * Return a mutable deep clone of the graph-level metadata.
   *
   * @returns {Object<string, any>}
   */
  graphMetadata() {
    return structuredClone(this.#metadata);
  }
  /**
   * Set a graph-level metadata key.
   *
   * @param {string} key
   * @param {any} value
   * @returns {void}
   */
  setGraphMetadata(key, value) {
    requireString(key, "key");
    this.#metadata[key] = value;
    this.#emit("changeProperties", { key, value });
  }
  /**
   * Remove a graph-level metadata key.
   *
   * @param {string} key
   * @returns {void}
   */
  removeGraphMetadata(key) {
    requireString(key, "key");
    delete this.#metadata[key];
    this.#emit("changeProperties", { key, value: void 0 });
  }
  // ## Nodes
  /**
   * Add a node. When `entity_id` is omitted a compact generated id is
   * assigned (`n1`, `n2`, …). Node ids are unique within the graph. The
   * `component` may be omitted for placeholder nodes — the engine
   * registers them without instantiating a process.
   *
   * @param {{ entity_id?: string, component?: string, metadata?: Object<string, any> }} definition
   * @returns {GraphNode} The frozen stored entity
   */
  addNode(definition) {
    const entityId = definition.entity_id === void 0 ? this.#nextId("node") : requireString(definition.entity_id, "entity_id");
    if (this.#nodes.has(entityId)) {
      throw new GraphModelError(`Node "${entityId}" already exists`);
    }
    const component = definition.component === void 0 ? void 0 : requireString(definition.component, "component");
    const metadata = freezeMetadata(definition.metadata, "metadata");
    const node = Object.freeze({
      entity_id: entityId,
      ...component === void 0 ? {} : { component },
      ...metadata === void 0 ? {} : { metadata }
    });
    this.#nodes.set(entityId, node);
    this.#emit("addNode", { entity: node });
    return node;
  }
  /**
   * @param {string} entityId
   * @returns {GraphNode|undefined}
   */
  node(entityId) {
    return this.#nodes.get(entityId);
  }
  /**
   * @param {string} entityId
   * @returns {boolean}
   */
  hasNode(entityId) {
    return this.#nodes.has(entityId);
  }
  /**
   * All nodes, in insertion order.
   *
   * @returns {GraphNode[]}
   */
  nodes() {
    return [...this.#nodes.values()];
  }
  /**
   * Rename a node, rewriting every reference: edges, IIPs, exports, and
   * group memberships keep pointing at the same node under its new id.
   * Emits `renameNode` after the change events of rewritten references.
   *
   * @param {string} previous
   * @param {string} next
   * @returns {GraphNode} The renamed entity
   */
  renameNode(previous, next) {
    requireString(previous, "previous");
    requireString(next, "next");
    const node = this.#requireEntity(this.#nodes, "node", previous);
    if (previous === next) {
      return node;
    }
    if (this.#nodes.has(next)) {
      throw new GraphModelError(`Node "${next}" already exists`);
    }
    this.#nodes.delete(previous);
    const renamed = Object.freeze({
      entity_id: next,
      component: node.component,
      ...node.metadata === void 0 ? {} : { metadata: node.metadata }
    });
    this.#nodes.set(next, renamed);
    for (const edge of [...this.#edges.values()]) {
      if (edge.from.node === previous || edge.to.node === previous) {
        const from = edge.from.node === previous ? { node: next, port: edge.from.port } : edge.from;
        const to = edge.to.node === previous ? { node: next, port: edge.to.port } : edge.to;
        this.#edgeIndex.delete(edgeKey(edge.from, edge.to));
        this.#edges.set(
          edge.entity_id,
          this.#freezeEdge(edge.entity_id, from, to, edge.metadata)
        );
        this.#edgeIndex.set(edgeKey(from, to), edge.entity_id);
        this.#emit("changeEdge", {
          entity: this.#edges.get(edge.entity_id)
        });
      }
    }
    for (const iip of [...this.#iips.values()]) {
      if (iip.to.node === previous) {
        this.#iips.set(
          iip.entity_id,
          this.#freezeIip(
            iip.entity_id,
            iip.from,
            { node: next, port: iip.to.port },
            iip.metadata
          )
        );
        this.#emit("changeIIP", {
          entity: this.#iips.get(iip.entity_id)
        });
      }
    }
    for (const exp of [...this.#exports.values()]) {
      if (exp.internal.node === previous) {
        this.#exports.set(
          exp.entity_id,
          this.#freezeExport(
            exp.entity_id,
            exp.direction,
            exp.public,
            { node: next, port: exp.internal.port },
            exp.metadata
          )
        );
        this.#emit("changeExport", {
          entity: this.#exports.get(exp.entity_id)
        });
      }
    }
    for (const group of [...this.#groups.values()]) {
      if (group.nodes.includes(previous)) {
        this.#groups.set(
          group.entity_id,
          Object.freeze({
            ...group,
            nodes: Object.freeze(
              group.nodes.map((id) => id === previous ? next : id)
            )
          })
        );
        this.#emit("changeGroup", {
          entity: this.#groups.get(group.entity_id)
        });
      }
    }
    this.#emit("renameNode", { entity: renamed, previous });
    return renamed;
  }
  /**
   * Remove a node and everything attached to it: incident edges, IIPs
   * targeting it, exports exposing it, and its group memberships. Each
   * removal emits its own event; `removeNode` is emitted last.
   *
   * @param {string} entityId
   * @returns {GraphNode} The removed entity
   */
  removeNode(entityId) {
    const node = this.#requireEntity(this.#nodes, "node", entityId);
    for (const edge of [...this.#edges.values()]) {
      if (edge.from.node === entityId || edge.to.node === entityId) {
        this.#edgeIndex.delete(edgeKey(edge.from, edge.to));
        this.#edges.delete(edge.entity_id);
        this.#emit("removeEdge", { entity: edge });
      }
    }
    for (const iip of [...this.#iips.values()]) {
      if (iip.to.node === entityId) {
        this.#removeEntity(this.#iips, "iip", iip.entity_id, "removeIIP");
      }
    }
    for (const exp of [...this.#exports.values()]) {
      if (exp.internal.node === entityId) {
        this.#removeEntity(
          this.#exports,
          "export",
          exp.entity_id,
          "removeExport"
        );
      }
    }
    for (const group of [...this.#groups.values()]) {
      if (group.nodes.includes(entityId)) {
        this.#groups.set(
          group.entity_id,
          Object.freeze({
            ...group,
            nodes: Object.freeze(group.nodes.filter((id) => id !== entityId))
          })
        );
        this.#emit("changeGroup", {
          entity: this.#groups.get(group.entity_id)
        });
      }
    }
    this.#nodes.delete(entityId);
    this.#emit("removeNode", { entity: node });
    return node;
  }
  /**
   * Set one metadata key on a node.
   *
   * @param {string} entityId
   * @param {string} key
   * @param {any} value - Pass `undefined` to remove the key
   * @returns {GraphNode} The updated entity
   */
  setNodeMetadata(entityId, key, value) {
    return this.#setMetadata(
      this.#nodes,
      "node",
      entityId,
      key,
      value,
      "changeNode"
    );
  }
  // ## Edges
  /**
   * Add an edge between two existing node ports. Duplicate edges (same
   * source and target pair) are rejected.
   *
   * @param {{ from: GraphPortRef, to: GraphPortRef, metadata?: Object<string, any>, entity_id?: string }} definition
   * @returns {GraphEdge} The frozen stored entity
   */
  addEdge(definition) {
    const entityId = definition.entity_id === void 0 ? this.#nextId("edge") : requireString(definition.entity_id, "entity_id");
    if (this.#edges.has(entityId)) {
      throw new GraphModelError(`Edge "${entityId}" already exists`);
    }
    const from = requirePortRef(definition.from, "from");
    const to = requirePortRef(definition.to, "to");
    this.#requireNodeRef(from.node, "from.node");
    this.#requireNodeRef(to.node, "to.node");
    const duplicateId = this.#edgeIndex.get(edgeKey(from, to));
    if (duplicateId !== void 0) {
      throw new GraphModelError(
        `Edge "${duplicateId}" already connects ${from.node}:${from.port} to ${to.node}:${to.port}`
      );
    }
    const edge = this.#freezeEdge(entityId, from, to, definition.metadata);
    this.#edges.set(entityId, edge);
    this.#edgeIndex.set(edgeKey(from, to), entityId);
    this.#emit("addEdge", { entity: edge });
    return edge;
  }
  /**
   * @param {string} entityId
   * @returns {GraphEdge|undefined}
   */
  edge(entityId) {
    return this.#edges.get(entityId);
  }
  /**
   * All edges, in insertion order.
   *
   * @returns {GraphEdge[]}
   */
  edges() {
    return [...this.#edges.values()];
  }
  /**
   * All edges with the given node as their source.
   *
   * @param {string} nodeId
   * @returns {GraphEdge[]}
   */
  edgesFrom(nodeId) {
    return this.edges().filter((edge) => edge.from.node === nodeId);
  }
  /**
   * All edges with the given node as their target.
   *
   * @param {string} nodeId
   * @returns {GraphEdge[]}
   */
  edgesTo(nodeId) {
    return this.edges().filter((edge) => edge.to.node === nodeId);
  }
  /**
   * @param {string} entityId
   * @returns {GraphEdge} The removed entity
   */
  removeEdge(entityId) {
    const edge = this.#requireEntity(this.#edges, "edge", entityId);
    this.#edgeIndex.delete(edgeKey(edge.from, edge.to));
    this.#edges.delete(entityId);
    this.#emit("removeEdge", { entity: edge });
    return edge;
  }
  /**
   * Set one metadata key on an edge.
   *
   * @param {string} entityId
   * @param {string} key
   * @param {any} value
   * @returns {GraphEdge}
   */
  setEdgeMetadata(entityId, key, value) {
    return this.#setMetadata(
      this.#edges,
      "edge",
      entityId,
      key,
      value,
      "changeEdge"
    );
  }
  // ## IIPs
  /**
   * Add an initial Information Packet targeting an existing node port.
   *
   * @param {{ data: any, to: GraphPortRef, metadata?: Object<string, any>, entity_id?: string }} definition
   * @returns {GraphIIP} The frozen stored entity
   */
  addIIP(definition) {
    const entityId = definition.entity_id === void 0 ? this.#nextId("iip") : requireString(definition.entity_id, "entity_id");
    if (this.#iips.has(entityId)) {
      throw new GraphModelError(`IIP "${entityId}" already exists`);
    }
    const to = requirePortRef(definition.to, "to");
    this.#requireNodeRef(to.node, "to.node");
    const from = Object.freeze({ data: freezeIipData(definition.data) });
    const iip = this.#freezeIip(entityId, from, to, definition.metadata);
    this.#iips.set(entityId, iip);
    this.#emit("addIIP", { entity: iip });
    return iip;
  }
  /**
   * @param {string} entityId
   * @returns {GraphIIP|undefined}
   */
  iip(entityId) {
    return this.#iips.get(entityId);
  }
  /**
   * All IIPs, in insertion order.
   *
   * @returns {GraphIIP[]}
   */
  iips() {
    return [...this.#iips.values()];
  }
  /**
   * @param {string} entityId
   * @returns {GraphIIP} The removed entity
   */
  removeIIP(entityId) {
    return this.#removeEntity(this.#iips, "iip", entityId, "removeIIP");
  }
  /**
   * Set one metadata key on an IIP.
   *
   * @param {string} entityId
   * @param {string} key
   * @param {any} value
   * @returns {GraphIIP}
   */
  setIIPMetadata(entityId, key, value) {
    return this.#setMetadata(
      this.#iips,
      "iip",
      entityId,
      key,
      value,
      "changeIIP"
    );
  }
  // ## Exports
  /**
   * Add an export exposing an internal port on the graph boundary. Public
   * names are unique within their direction.
   *
   * @param {{ direction: "inport"|"outport", public: string, internal: GraphPortRef, metadata?: Object<string, any>, entity_id?: string }} definition
   * @returns {GraphExport} The frozen stored entity
   */
  addExport(definition) {
    const entityId = definition.entity_id === void 0 ? this.#nextId("export") : requireString(definition.entity_id, "entity_id");
    if (this.#exports.has(entityId)) {
      throw new GraphModelError(`Export "${entityId}" already exists`);
    }
    if (definition.direction !== "inport" && definition.direction !== "outport") {
      throw new GraphModelError('direction must be "inport" or "outport"');
    }
    const publicName = requireString(definition.public, "public");
    const internal = requirePortRef(definition.internal, "internal");
    this.#requireNodeRef(internal.node, "internal.node");
    const clash = [...this.#exports.values()].find(
      (exp2) => exp2.direction === definition.direction && exp2.public === publicName
    );
    if (clash) {
      throw new GraphModelError(
        `${definition.direction} "${publicName}" is already exported by "${clash.entity_id}"`
      );
    }
    const exp = this.#freezeExport(
      entityId,
      definition.direction,
      publicName,
      internal,
      definition.metadata
    );
    this.#exports.set(entityId, exp);
    this.#emit("addExport", { entity: exp });
    return exp;
  }
  /**
   * @param {string} entityId
   * @returns {GraphExport|undefined}
   */
  export(entityId) {
    return this.#exports.get(entityId);
  }
  /**
   * All exports, in insertion order.
   *
   * @returns {GraphExport[]}
   */
  exports() {
    return [...this.#exports.values()];
  }
  /**
   * @param {string} entityId
   * @returns {GraphExport} The removed entity
   */
  removeExport(entityId) {
    return this.#removeEntity(
      this.#exports,
      "export",
      entityId,
      "removeExport"
    );
  }
  /**
   * Set one metadata key on an export.
   *
   * @param {string} entityId
   * @param {string} key
   * @param {any} value
   * @returns {GraphExport}
   */
  setExportMetadata(entityId, key, value) {
    return this.#setMetadata(
      this.#exports,
      "export",
      entityId,
      key,
      value,
      "changeExport"
    );
  }
  // ## Groups
  /**
   * Add a visual-only group over existing nodes.
   *
   * @param {{ name: string, nodes: readonly string[], metadata?: Object<string, any>, entity_id?: string }} definition
   * @returns {GraphGroup} The frozen stored entity
   */
  addGroup(definition) {
    const entityId = definition.entity_id === void 0 ? this.#nextId("group") : requireString(definition.entity_id, "entity_id");
    if (this.#groups.has(entityId)) {
      throw new GraphModelError(`Group "${entityId}" already exists`);
    }
    const name = requireString(definition.name, "name");
    if (!Array.isArray(definition.nodes)) {
      throw new GraphModelError("nodes must be an array of node ids");
    }
    for (const nodeId of definition.nodes) {
      this.#requireNodeRef(nodeId, "group member");
    }
    const group = Object.freeze({
      entity_id: entityId,
      name,
      nodes: Object.freeze([...definition.nodes]),
      ...definition.metadata === void 0 ? {} : { metadata: freezeMetadata(definition.metadata, "metadata") }
    });
    this.#groups.set(entityId, group);
    this.#emit("addGroup", { entity: group });
    return group;
  }
  /**
   * @param {string} entityId
   * @returns {GraphGroup|undefined}
   */
  group(entityId) {
    return this.#groups.get(entityId);
  }
  /**
   * All groups, in insertion order.
   *
   * @returns {GraphGroup[]}
   */
  groups() {
    return [...this.#groups.values()];
  }
  /**
   * @param {string} entityId
   * @returns {GraphGroup} The removed entity
   */
  removeGroup(entityId) {
    return this.#removeEntity(this.#groups, "group", entityId, "removeGroup");
  }
  /**
   * Set one metadata key on a group.
   *
   * @param {string} entityId
   * @param {string} key
   * @param {any} value
   * @returns {GraphGroup}
   */
  setGroupMetadata(entityId, key, value) {
    return this.#setMetadata(
      this.#groups,
      "group",
      entityId,
      key,
      value,
      "changeGroup"
    );
  }
  // ## Canonical serialization
  /**
   * Canonical, deterministic representation: entity collections sorted by
   * `entity_id`, graph metadata as-is. Two models holding the same graph
   * serialize identically regardless of the order entities were added in.
   *
   * @returns {CanonicalGraph}
   */
  serialize() {
    return {
      ...this.#name === void 0 ? {} : { name: this.#name },
      metadata: structuredClone(this.#metadata),
      nodes: this.nodes().sort(compareEntityIds),
      edges: this.edges().sort(compareEntityIds),
      iips: this.iips().sort(compareEntityIds),
      exports: this.exports().sort(compareEntityIds),
      groups: this.groups().sort(compareEntityIds)
    };
  }
  /**
   * Rebuild a model from a canonical representation produced by
   * {@link GraphModel#serialize}.
   *
   * @param {CanonicalGraph} canonical
   * @returns {GraphModel}
   */
  static fromCanonical(canonical) {
    const model = new _GraphModel(
      canonical.name === void 0 ? {} : { name: canonical.name }
    );
    for (const [key, value] of Object.entries(canonical.metadata ?? {})) {
      model.setGraphMetadata(key, value);
    }
    for (const node of canonical.nodes ?? []) {
      model.addNode(node);
    }
    for (const edge of canonical.edges ?? []) {
      model.addEdge(edge);
    }
    for (const iip of canonical.iips ?? []) {
      model.addIIP({
        entity_id: iip.entity_id,
        data: iip.from.data,
        to: iip.to,
        ...iip.metadata === void 0 ? {} : { metadata: iip.metadata }
      });
    }
    for (const exp of canonical.exports ?? []) {
      model.addExport(exp);
    }
    for (const group of canonical.groups ?? []) {
      model.addGroup(group);
    }
    return model;
  }
  /**
   * Canonical JSON string for content addressing (epoch snapshots).
   *
   * @returns {string}
   */
  canonicalString() {
    return stableStringify(this.serialize());
  }
  /**
   * Deep clone of the whole model.
   *
   * @returns {GraphModel}
   */
  clone() {
    return _GraphModel.fromCanonical(structuredClone(this.serialize()));
  }
  // ## Internals
  /**
   * @param {string} type
   * @param {any} detail
   * @returns {void}
   */
  #emit(type, detail) {
    this.dispatchEvent(new globalThis.CustomEvent(type, { detail }));
  }
  /**
   * @param {EntityKind} kind
   * @returns {string}
   */
  #nextId(kind) {
    let id;
    do {
      this.#counter += 1;
      id = makeEntityId(kind, this.#counter);
    } while (this.#nodes.has(id) || this.#edges.has(id) || this.#iips.has(id) || this.#exports.has(id) || this.#groups.has(id));
    return id;
  }
  /**
   * @param {Map<string, any>} map
   * @param {EntityKind} kind
   * @param {string} entityId
   * @returns {any}
   */
  #requireEntity(map, kind, entityId) {
    const entity = map.get(entityId);
    if (entity === void 0) {
      throw new GraphModelError(`No such ${kind}: "${entityId}"`);
    }
    return entity;
  }
  /**
   * @param {string} nodeId
   * @param {string} field
   * @returns {void}
   */
  #requireNodeRef(nodeId, field) {
    if (!this.#nodes.has(nodeId)) {
      throw new GraphModelError(`${field} references unknown node "${nodeId}"`);
    }
  }
  /**
   * @param {string} entityId
   * @param {GraphPortRef} from
   * @param {GraphPortRef} to
   * @param {Object<string, any>|undefined} metadata
   * @returns {GraphEdge}
   */
  #freezeEdge(entityId, from, to, metadata) {
    const frozenMetadata = freezeMetadata(metadata, "metadata");
    return frozenMetadata === void 0 ? Object.freeze({
      entity_id: entityId,
      from: Object.freeze(from),
      to: Object.freeze(to)
    }) : Object.freeze({
      entity_id: entityId,
      from: Object.freeze(from),
      to: Object.freeze(to),
      metadata: frozenMetadata
    });
  }
  /**
   * @param {string} entityId
   * @param {{ data: any }} from
   * @param {GraphPortRef} to
   * @param {Object<string, any>|undefined} metadata
   * @returns {GraphIIP}
   */
  #freezeIip(entityId, from, to, metadata) {
    const frozenMetadata = freezeMetadata(metadata, "metadata");
    return frozenMetadata === void 0 ? Object.freeze({
      entity_id: entityId,
      from: Object.freeze(from),
      to: Object.freeze(to)
    }) : Object.freeze({
      entity_id: entityId,
      from: Object.freeze(from),
      to: Object.freeze(to),
      metadata: frozenMetadata
    });
  }
  /**
   * @param {string} entityId
   * @param {"inport"|"outport"} direction
   * @param {string} publicName
   * @param {GraphPortRef} internal
   * @param {Object<string, any>|undefined} metadata
   * @returns {GraphExport}
   */
  #freezeExport(entityId, direction, publicName, internal, metadata) {
    const frozenMetadata = freezeMetadata(metadata, "metadata");
    return frozenMetadata === void 0 ? Object.freeze({
      entity_id: entityId,
      direction,
      public: publicName,
      internal: Object.freeze(internal)
    }) : Object.freeze({
      entity_id: entityId,
      direction,
      public: publicName,
      internal: Object.freeze(internal),
      metadata: frozenMetadata
    });
  }
  /**
   * Remove an entity from a collection and emit its removal event.
   *
   * @template T
   * @param {Map<string, T>} map
   * @param {EntityKind} kind
   * @param {string} entityId
   * @param {string} eventType
   * @returns {T} The removed entity
   */
  #removeEntity(map, kind, entityId, eventType) {
    const entity = this.#requireEntity(map, kind, entityId);
    map.delete(entityId);
    this.#emit(eventType, { entity });
    return entity;
  }
  /**
   * Replace an entity with a copy carrying an updated metadata map, and
   * emit its change event.
   *
   * @template T
   * @param {Map<string, T>} map
   * @param {EntityKind} kind
   * @param {string} entityId
   * @param {string} key
   * @param {any} value
   * @param {string} eventType
   * @returns {T} The updated entity
   */
  #setMetadata(map, kind, entityId, key, value, eventType) {
    const entity = this.#requireEntity(map, kind, entityId);
    requireString(key, "key");
    const metadata = {
      .../** @type {{ metadata?: Object<string, any> }} */
      entity.metadata ?? {}
    };
    if (value === void 0) {
      delete metadata[key];
    } else {
      metadata[key] = value;
    }
    const { metadata: previousMetadata, ...rest } = (
      /** @type {{ metadata?: Object<string, any> }} */
      entity
    );
    const updated = (
      /** @type {T} */
      Object.freeze({
        ...rest,
        ...Object.keys(metadata).length === 0 ? {} : { metadata: deepFreeze(metadata) }
      })
    );
    map.set(entityId, updated);
    this.#emit(eventType, { entity: updated, key, value });
    return updated;
  }
};

// node_modules/@noflo/graph/src/graph/fbpJson.js
function importFbpJson(json) {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new GraphModelError("FBP JSON document must be an object");
  }
  const document = normalizeLegacyFbpJson(json);
  const options = (
    /** @type {GraphModelOptions} */
    {}
  );
  if (json.name !== void 0) {
    options.name = requireString(json.name, "name");
  }
  const model = new GraphModel(options);
  for (const [key, value] of Object.entries(document.properties ?? {})) {
    model.setGraphMetadata(key, value);
  }
  for (const node of document.nodes ?? []) {
    model.addNode({
      entity_id: requireString(node?.id, "node.id"),
      ...node?.component === void 0 ? {} : { component: requireString(node.component, "node.component") },
      ...node?.metadata === void 0 ? {} : { metadata: node.metadata }
    });
  }
  for (const edge of document.edges ?? []) {
    model.addEdge({
      from: jsonPortRef(edge?.source, "edge.source"),
      to: jsonPortRef(edge?.target, "edge.target"),
      ...edge?.metadata === void 0 ? {} : { metadata: edge.metadata }
    });
  }
  const iips = document.inits ?? document.case ?? [];
  for (const iip of iips) {
    model.addIIP({
      data: iip?.data,
      to: jsonPortRef(iip?.target, "iip.target"),
      ...iip?.metadata === void 0 ? {} : { metadata: iip.metadata }
    });
  }
  for (const [publicName, def] of Object.entries(document.inports ?? {})) {
    model.addExport({
      direction: "inport",
      public: publicName,
      internal: requirePortRef(
        { node: def?.process, port: def?.port },
        `inports.${publicName}`
      ),
      ...withDefinedMetadata(exportMetadata(def))
    });
  }
  for (const [publicName, def] of Object.entries(document.outports ?? {})) {
    model.addExport({
      direction: "outport",
      public: publicName,
      internal: requirePortRef(
        { node: def?.process, port: def?.port },
        `outports.${publicName}`
      ),
      ...withDefinedMetadata(exportMetadata(def))
    });
  }
  for (const group of document.groups ?? []) {
    model.addGroup({
      name: requireString(group?.name, "group.name"),
      nodes: requireGroupNodes(group?.nodes),
      ...withDefinedMetadata(group?.metadata)
    });
  }
  return model;
}
function normalizeLegacyFbpJson(json) {
  if (json.processes === void 0 && json.connections === void 0) {
    return json;
  }
  const document = (
    /** @type {Object<string, any>} */
    {}
  );
  if (json.properties !== void 0) {
    document.properties = json.properties;
  }
  if (json.processes !== void 0) {
    document.nodes = Object.entries(json.processes).map(([id, def]) => ({
      id,
      component: def?.component,
      ...def?.metadata === void 0 ? {} : { metadata: def.metadata }
    }));
  }
  if (json.connections !== void 0) {
    const edges = (
      /** @type {Object<string, any>[]} */
      []
    );
    const inits = (
      /** @type {Object<string, any>[]} */
      []
    );
    for (const connection of json.connections) {
      if (connection?.data !== void 0) {
        inits.push({
          data: connection.data,
          target: jsonRefIn(connection.tgt),
          ...connection.metadata === void 0 ? {} : { metadata: connection.metadata }
        });
      } else if (connection?.src && connection?.tgt) {
        edges.push({
          source: jsonRefIn(connection.src),
          target: jsonRefIn(connection.tgt),
          ...connection.metadata === void 0 ? {} : { metadata: connection.metadata }
        });
      } else {
        throw new GraphModelError(
          "Legacy JSON connection must have both src and tgt, or data and tgt"
        );
      }
    }
    document.edges = edges;
    if (inits.length > 0) {
      document.inits = inits;
    }
  }
  if (json.inports !== void 0) {
    document.inports = json.inports;
  }
  if (json.outports !== void 0) {
    document.outports = json.outports;
  }
  if (json.groups !== void 0) {
    document.groups = json.groups;
  }
  return document;
}
function jsonRefIn(ref) {
  if (ref === void 0) {
    return void 0;
  }
  return {
    id: ref.process,
    port: ref.port,
    ...ref.index === void 0 ? {} : { index: ref.index }
  };
}
function exportFbpJson(model) {
  const result = (
    /** @type {Object<string, any>} */
    {
      properties: model.graphMetadata()
    }
  );
  const inports = (
    /** @type {Object<string, any>} */
    {}
  );
  const outports = (
    /** @type {Object<string, any>} */
    {}
  );
  for (const exp of model.exports()) {
    const target = exp.direction === "inport" ? inports : outports;
    target[exp.public] = {
      process: exp.internal.node,
      port: exp.internal.port,
      ...exp.metadata === void 0 ? {} : { metadata: exp.metadata }
    };
  }
  if (Object.keys(inports).length > 0) {
    result.inports = inports;
  }
  if (Object.keys(outports).length > 0) {
    result.outports = outports;
  }
  const groups = model.groups().map((group) => ({
    name: group.name,
    nodes: [...group.nodes],
    ...group.metadata === void 0 ? {} : { metadata: group.metadata }
  }));
  if (groups.length > 0) {
    result.groups = groups;
  }
  result.nodes = model.nodes().map((node) => ({
    id: node.entity_id,
    component: node.component,
    ...node.metadata === void 0 ? {} : { metadata: node.metadata }
  }));
  result.edges = model.edges().map((edge) => ({
    source: jsonRefOut(edge.from),
    target: jsonRefOut(edge.to),
    ...edge.metadata === void 0 ? {} : { metadata: edge.metadata }
  }));
  const iips = model.iips().map((iip) => ({
    data: iip.from.data,
    target: jsonRefOut(iip.to),
    ...iip.metadata === void 0 ? {} : { metadata: iip.metadata }
  }));
  if (iips.length > 0) {
    result.inits = iips;
  }
  return result;
}
function exportMetadata(def) {
  const metadata = { ...def?.metadata ?? {} };
  for (const field of ["schema", "type", "required", "values"]) {
    if (def?.[field] !== void 0) {
      metadata[field] = def[field];
    }
  }
  return Object.keys(metadata).length === 0 ? void 0 : metadata;
}
function jsonRefOut(ref) {
  return {
    id: ref.node,
    port: ref.port,
    ...ref.index === void 0 ? {} : { index: ref.index }
  };
}
function jsonPortRef(ref, field) {
  return requirePortRef(
    {
      node: ref?.id,
      port: ref?.port,
      ...ref?.index === void 0 ? {} : { index: ref.index }
    },
    field
  );
}
function withDefinedMetadata(metadata) {
  return metadata === void 0 ? {} : { metadata };
}
function requireGroupNodes(nodes) {
  if (!Array.isArray(nodes)) {
    throw new GraphModelError("group.nodes must be an array of node ids");
  }
  return nodes.map((id) => requireString(id, "group.nodes[]"));
}

// node_modules/@noflo/noflo/src/lib/LegacyEvents.js
var makeDetailEvent = typeof globalThis.CustomEvent === "function" ? (type, detail) => new globalThis.CustomEvent(type, {
  detail,
  bubbles: false,
  composed: false
}) : (type, detail) => {
  const event = new Event(type, { bubbles: false, composed: false });
  event.detail = detail;
  return event;
};
var registries = /* @__PURE__ */ new WeakMap();
function registryFor(instance) {
  let registry = registries.get(instance);
  if (!registry) {
    registry = { active: /* @__PURE__ */ new Map() };
    registries.set(instance, registry);
  }
  return registry;
}
function LegacyEventMixin(Base) {
  return class LegacyEventBase extends Base {
    /**
     * Track listener registrations, so `listeners()` can answer the
     * "is anyone listening" question EventTarget can't, and so
     * `dispatchLifecycleEvent` can invoke listeners synchronously.
     *
     * @param {string} type
     * @param {Function} listener
     * @param {any} [options]
     */
    addEventListener(type, listener, options) {
      const registry = registryFor(this);
      if (!registry.active.has(type)) registry.active.set(type, []);
      const listeners = (
        /** @type {{ listener: Function, once: boolean }[]} */
        registry.active.get(type)
      );
      if (listeners.some((entry) => entry.listener === listener)) {
        return;
      }
      const once = typeof options === "object" && options !== null && options.once;
      listeners.push({ listener, once });
      super.addEventListener(type, listener, options);
    }
    /**
     * @param {string} type
     * @param {Function} listener
     * @param {any} [options]
     */
    removeEventListener(type, listener, options) {
      const registry = registryFor(this);
      const listeners = registry.active.get(type);
      if (listeners) {
        const index = listeners.findIndex(
          (entry) => entry.listener === listener
        );
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
      super.removeEventListener(type, listener, options);
    }
    /**
     * Listeners registered for an event type. The count is the contractual
     * part (the engine's error escalation checks it); the array is provided
     * for introspection.
     *
     * @param {string} type
     * @returns {Function[]}
     */
    listeners(type) {
      const registry = registryFor(this);
      return (registry.active.get(type) || []).map((entry) => entry.listener);
    }
    /**
     * Remove registrations for one event type, or for all types when no
     * type is given. `EventTarget` cannot enumerate listeners, so the
     * registry provides the removal path.
     *
     * @param {string} [type]
     * @returns {this}
     */
    removeAllListeners(type) {
      const registry = registryFor(this);
      const types = type ? [type] : [...registry.active.keys()];
      for (const eventType of types) {
        for (const entry of [...registry.active.get(eventType) || []]) {
          this.removeEventListener(eventType, entry.listener);
        }
      }
      return this;
    }
    /**
     * Internal, clean-room dispatch used by engine code paths. Invokes the
     * registered listeners synchronously, in registration order, letting
     * listener exceptions propagate to the caller (matching the
     * synchronous propagation NoFlo's error escalation relies on).
     *
     * @param {string} type
     * @param {any} [detail]
     * @returns {boolean}
     */
    dispatchLifecycleEvent(type, detail) {
      const registry = registryFor(this);
      const listeners = registry.active.get(type) || [];
      if (!listeners.length) {
        return false;
      }
      const event = makeDetailEvent(type, detail);
      for (const entry of [...listeners]) {
        if (entry.once) {
          this.removeEventListener(type, entry.listener);
        }
        entry.listener(event);
      }
      return true;
    }
  };
}
var LegacyEventBase = LegacyEventMixin(EventTarget);

// node_modules/@noflo/noflo/src/lib/BasePort.js
var validTypes = [
  "all",
  "string",
  "number",
  "int",
  "object",
  "array",
  "boolean",
  "color",
  "date",
  "bang",
  "function",
  "buffer",
  "stream"
];
function handleOptions(options) {
  let datatype = options.datatype || "all";
  if (datatype === "integer") {
    datatype = "int";
  }
  const required = options.required || false;
  if (validTypes.indexOf(datatype) === -1) {
    throw new Error(
      `Invalid port datatype '${datatype}' specified, valid are ${validTypes.join(", ")}`
    );
  }
  const schema = options.schema || options.type;
  if (schema && schema.indexOf("/") === -1) {
    throw new Error(
      `Invalid port schema '${schema}' specified. Should be URL or MIME type`
    );
  }
  const scoped = typeof options.scoped === "boolean" ? options.scoped : true;
  const description = options.description || "";
  return Object.assign({}, options, {
    description,
    datatype,
    required,
    schema,
    scoped
  });
}
var BasePort = class extends LegacyEventBase {
  /**
   * @param {BaseOptions} options
   */
  constructor(options) {
    super();
    this.options = handleOptions(options);
    this.sockets = [];
    this.node = null;
    this.nodeInstance = null;
    this.name = null;
  }
  getId() {
    if (!this.node || !this.name) {
      return "Port";
    }
    return `${this.node} ${this.name.toUpperCase()}`;
  }
  /**
   * @returns {string}
   */
  getDataType() {
    return this.options.datatype || "all";
  }
  getSchema() {
    return this.options.schema || null;
  }
  getDescription() {
    return this.options.description;
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  attach(socket, index = null) {
    let idx = (
      /** @type {number} */
      index
    );
    if (!this.isAddressable() || index === null) {
      idx = this.sockets.length;
    }
    this.sockets[idx] = socket;
    this.attachSocket(socket, idx);
    if (this.isAddressable()) {
      this.dispatchLifecycleEvent("attach", [socket, idx]);
      return;
    }
    this.dispatchLifecycleEvent("attach", socket);
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  // biome-ignore lint/correctness/noUnusedFunctionParameters: Overridden in implementation class
  attachSocket(socket, index = null) {
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   */
  detach(socket) {
    const index = this.sockets.indexOf(socket);
    if (index === -1) {
      return;
    }
    this.sockets[index] = void 0;
    if (this.isAddressable()) {
      this.dispatchLifecycleEvent("detach", [socket, index]);
      return;
    }
    this.dispatchLifecycleEvent("detach", socket);
  }
  isAddressable() {
    if (this.options.addressable) {
      return true;
    }
    return false;
  }
  isBuffered() {
    if (this.options.buffered) {
      return true;
    }
    return false;
  }
  isRequired() {
    if (this.options.required) {
      return true;
    }
    return false;
  }
  /**
   * @param {number|null} socketId
   * @returns {boolean}
   */
  isAttached(socketId = null) {
    if (this.isAddressable() && socketId !== null) {
      if (this.sockets[socketId]) {
        return true;
      }
      return false;
    }
    if (this.sockets.length) {
      return true;
    }
    return false;
  }
  listAttached() {
    const attached = [];
    for (let idx = 0; idx < this.sockets.length; idx += 1) {
      const socket = this.sockets[idx];
      if (socket) {
        attached.push(idx);
      }
    }
    return attached;
  }
  /**
   * @param {number|null} socketId
   * @returns {boolean}
   */
  isConnected(socketId = null) {
    if (this.isAddressable()) {
      if (socketId === null) {
        throw new Error(`${this.getId()}: Socket ID required`);
      }
      if (!this.sockets[socketId]) {
        throw new Error(`${this.getId()}: Socket ${socketId} not available`);
      }
      const socket = (
        /** @type {import("./InternalSocket.js").InternalSocket} */
        this.sockets[socketId]
      );
      return socket.isConnected();
    }
    let connected = false;
    this.sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      if (socket.isConnected()) {
        connected = true;
      }
    });
    return connected;
  }
  /* eslint-disable class-methods-use-this */
  canAttach() {
    return true;
  }
};

// node_modules/@noflo/noflo/src/lib/InPort.js
var InPort = class extends BasePort {
  /**
   * @param {PortOptions} [options]
   */
  constructor(options = {}) {
    const opts = options;
    if (opts.control == null) {
      opts.control = false;
    }
    if (opts.scoped == null) {
      opts.scoped = true;
    }
    if (opts.triggering == null) {
      opts.triggering = true;
    }
    super(opts);
    const baseOptions = this.options;
    this.options = /** @type {PortOptions} */
    baseOptions;
    this.nodeInstance = null;
    this.prepareBuffer();
  }
  /**
   * Assign a delegate for retrieving data should this inPort
   *
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [localId]
   */
  attachSocket(socket, localId = null) {
    if (this.hasDefault()) {
      socket.setDataDelegate(() => this.options.default);
    }
    const forward = (type, detail) => this.handleSocketEvent(type, detail, localId);
    socket.addEventListener("connect", () => forward("connect", socket));
    socket.addEventListener(
      "begingroup",
      (event) => forward("begingroup", event.detail)
    );
    socket.addEventListener("data", (event) => {
      this.validateData(event.detail);
      return forward("data", event.detail);
    });
    socket.addEventListener(
      "endgroup",
      (event) => forward("endgroup", event.detail)
    );
    socket.addEventListener("disconnect", () => forward("disconnect", socket));
    socket.addEventListener(
      "ip",
      (event) => this.handleIP(event.detail, localId)
    );
  }
  /**
   * @param {import("./IP.js").default} packet
   * @param {number|null} [index]
   */
  handleIP(packet, index = null) {
    const ip = packet;
    ip.owner = this.nodeInstance;
    if (this.isAddressable()) {
      ip.index = index;
    }
    if (ip.datatype === "all") {
      ip.datatype = this.getDataType();
    }
    if (this.getSchema() && !ip.schema) {
      ip.schema = this.getSchema();
    }
    const buf = this.prepareBufferForIP(ip);
    if (this.options.control) {
      if (packet.type === "openBracket" && buf.length > 0) {
        buf.length = 0;
      }
      if (packet.type === "data" && !buf.some((buffered) => buffered.type === "openBracket")) {
        buf.length = 0;
      }
    }
    buf.push(ip);
    this.dispatchLifecycleEvent("ip", ip);
  }
  /**
   * @param {string} event
   * @param {any} payload
   */
  handleSocketEvent(event, payload, id) {
    if (this.isAddressable()) {
      return this.dispatchLifecycleEvent(event, [payload, id]);
    }
    return this.dispatchLifecycleEvent(event, payload);
  }
  hasDefault() {
    return this.options.default !== void 0;
  }
  prepareBuffer() {
    if (this.isAddressable()) {
      if (this.options.scoped) {
        this.indexedScopedBuffer = {};
      }
      this.indexedIipBuffer = {};
      this.indexedBuffer = {};
      return;
    }
    if (this.options.scoped) {
      this.scopedBuffer = {};
    }
    this.iipBuffer = [];
    this.buffer = [];
  }
  /**
   * @param {import("./IP.js").default} ip
   * @returns {Array<import("./IP.js").default>}
   */
  prepareBufferForIP(ip) {
    if (this.isAddressable()) {
      if (ip.scope != null && this.options.scoped) {
        if (!(ip.scope in this.indexedScopedBuffer)) {
          this.indexedScopedBuffer[ip.scope] = [];
        }
        if (!(ip.index in this.indexedScopedBuffer[ip.scope])) {
          this.indexedScopedBuffer[ip.scope][ip.index] = [];
        }
        return this.indexedScopedBuffer[ip.scope][ip.index];
      }
      if (ip.initial) {
        if (!(ip.index in this.indexedIipBuffer)) {
          this.indexedIipBuffer[ip.index] = [];
        }
        return this.indexedIipBuffer[ip.index];
      }
      if (!(ip.index in this.indexedBuffer)) {
        this.indexedBuffer[ip.index] = [];
      }
      return this.indexedBuffer[ip.index];
    }
    if (ip.scope != null && this.options.scoped) {
      if (!(ip.scope in this.scopedBuffer)) {
        this.scopedBuffer[ip.scope] = [];
      }
      return this.scopedBuffer[ip.scope];
    }
    if (ip.initial) {
      return this.iipBuffer;
    }
    return this.buffer;
  }
  /**
   * @param {any} data
   */
  validateData(data) {
    if (!this.options.values) {
      return;
    }
    if (this.options.values.indexOf(data) === -1) {
      throw new Error(
        `Invalid data='${data}' received, not in [${this.options.values}]`
      );
    }
  }
  /**
   * @param {string|null} scope
   * @param {number|null} index
   * @param {boolean} [initial]
   * @returns {Array<import("./IP.js").default>}
   */
  getBuffer(scope, index, initial = false) {
    if (this.isAddressable()) {
      if (scope != null && this.options.scoped) {
        if (!(scope in this.indexedScopedBuffer)) {
          return void 0;
        }
        if (!(index in this.indexedScopedBuffer[scope])) {
          return void 0;
        }
        return this.indexedScopedBuffer[scope][index];
      }
      if (initial) {
        if (!(index in this.indexedIipBuffer)) {
          return void 0;
        }
        return this.indexedIipBuffer[index];
      }
      if (!(index in this.indexedBuffer)) {
        return void 0;
      }
      return this.indexedBuffer[index];
    }
    if (scope != null && this.options.scoped) {
      if (!(scope in this.scopedBuffer)) {
        return void 0;
      }
      return this.scopedBuffer[scope];
    }
    if (initial) {
      return this.iipBuffer;
    }
    return this.buffer;
  }
  /**
   * @param {string|null} scope
   * @param {number|null} index
   * @param {boolean} [initial]
   * @returns {import("./IP.js").default|void}
   */
  getFromBuffer(scope, index, initial = false) {
    const buf = this.getBuffer(scope, index, initial);
    if (!(buf != null ? buf.length : void 0)) {
      return void 0;
    }
    if (this.options.control) {
      for (let i = buf.length - 1; i >= 0; i -= 1) {
        if (buf[i].type === "data") {
          return buf[i];
        }
      }
      return void 0;
    }
    return buf.shift();
  }
  /**
   * Fetches a packet from the port
   * @param {string|null} scope
   * @param {number|null} [index]
   */
  get(scope, index = null) {
    const res = this.getFromBuffer(scope, index);
    if (res !== void 0) {
      return res;
    }
    return this.getFromBuffer(null, index, true);
  }
  /**
   * Fetches a packet from the port
   * @param {string|null} scope
   * @param {number|null} index
   * @param {HasValidationCallback} validate
   * @param {boolean} [initial]
   */
  hasIPinBuffer(scope, index, validate, initial = false) {
    const buf = this.getBuffer(scope, index, initial);
    if (!(buf != null ? buf.length : void 0)) {
      return false;
    }
    for (let i = 0; i < buf.length; i += 1) {
      if (validate(buf[i])) {
        return true;
      }
    }
    return false;
  }
  /**
   * @param {number|null} index
   * @param {HasValidationCallback} validate
   */
  hasIIP(index, validate) {
    return this.hasIPinBuffer(null, index, validate, true);
  }
  /**
   * Returns true if port contains packet(s) matching the validator
   * @param {string|null} scope
   * @param {number|null|HasValidationCallback} index
   * @param {HasValidationCallback} [validate]
   */
  has(scope, index, validate) {
    let valid = validate;
    let idx;
    if (typeof index === "function") {
      valid = /** @type {HasValidationCallback} */
      index;
      idx = null;
    } else {
      idx = index;
    }
    if (this.options.control) {
      const original = valid;
      valid = (ip) => ip.type === "data" && original(ip);
    }
    if (this.hasIPinBuffer(scope, idx, valid)) {
      return true;
    }
    if (this.hasIIP(idx, valid)) {
      return true;
    }
    return false;
  }
  /**
   * Returns the number of data packets in an inport
   * @param {string|null} scope
   * @param {number|null} [index]
   * @returns {number}
   */
  length(scope, index = null) {
    const buf = this.getBuffer(scope, index);
    if (!buf) {
      return 0;
    }
    return buf.length;
  }
  /**
   * Tells if buffer has packets or not
   * @param {string|null} scope
   */
  ready(scope) {
    return this.length(scope) > 0;
  }
  // Clears inport buffers
  clear() {
    return this.prepareBuffer();
  }
};

// node_modules/@noflo/noflo/src/lib/IP.js
var IP = class _IP {
  // Detects if an arbitrary value is an IP
  /**
   * @param {any} obj
   * @returns {boolean}
   */
  static isIP(obj) {
    return obj && typeof obj === "object" && obj.isIP === true;
  }
  // Creates as new IP object
  // Valid types: 'data', 'openBracket', 'closeBracket'
  /**
   * @param {string} type
   * @param {any} data
   * @param {IPOptions} [options]
   */
  constructor(type, data = null, options = {}) {
    this.type = type || "data";
    this.data = data;
    this.isIP = true;
    this.scope = null;
    this.owner = null;
    this.clonable = false;
    this.index = null;
    this.schema = null;
    this.datatype = "all";
    this.initial = false;
    if (typeof options === "object") {
      Object.keys(options).forEach((key) => {
        this[key] = options[key];
      });
    }
  }
  // Creates a new IP copying its contents by value not reference
  /**
   * @returns {IP}
   */
  clone() {
    const ip = new _IP(this.type);
    Object.keys(this).forEach((key) => {
      const val = this[key];
      if (key === "owner") {
        return;
      }
      if (val === null) {
        return;
      }
      if (typeof val === "object") {
        ip[key] = JSON.parse(JSON.stringify(val));
      } else {
        ip[key] = val;
      }
    });
    return ip;
  }
  // Moves an IP to a different owner
  /**
   * @param {import("./Component.js").Component|null} owner
   */
  move(owner) {
    this.owner = owner;
    return this;
  }
  // Frees IP contents
  drop() {
    Object.keys(this).forEach((key) => {
      delete this[key];
    });
  }
};

// node_modules/@noflo/noflo/src/lib/Platform.js
function isBrowser() {
  if (typeof process !== "undefined" && process.versions && (process.versions.node || process.versions.deno || process.versions.bun)) {
    return false;
  }
  return true;
}
function deprecated(message) {
  if (isBrowser()) {
    console.warn(message);
    return;
  }
  if (process.env.NOFLO_FATAL_DEPRECATED) {
    throw new Error(message);
  }
  console.warn(message);
}
function makeAsync(func, sameLoop = false) {
  if (isBrowser()) {
    setTimeout(func, 0);
    return;
  }
  if (sameLoop) {
    setImmediate(() => {
      func();
    });
    return;
  }
  process.nextTick(func);
}

// node_modules/@noflo/noflo/src/lib/logger.js
function getPattern() {
  if (!isBrowser()) {
    if (typeof process === "undefined" || !process.env) return null;
    return process.env.DEBUG || null;
  }
  const stored = globalThis.localStorage?.getItem("debug");
  return stored || null;
}
var cachedPattern;
var cachedMatchers = null;
function parsePatterns(patternString) {
  if (patternString === cachedPattern) {
    return (
      /** @type {PatternMatcher[]} */
      cachedMatchers
    );
  }
  const matchers = (patternString || "").split(",").map((pattern) => pattern.trim()).filter(Boolean).map((pattern) => {
    const negate = pattern.startsWith("-");
    const clean = negate ? pattern.slice(1) : pattern;
    const regexSource = clean.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return {
      regex: new RegExp(`^${regexSource}$`),
      negate
    };
  });
  cachedPattern = patternString;
  cachedMatchers = matchers;
  return matchers;
}
function isEnabled(namespace) {
  const pattern = getPattern();
  if (!pattern) {
    return false;
  }
  let enabled = false;
  for (const { regex, negate } of parsePatterns(pattern)) {
    if (regex.test(namespace)) {
      enabled = !negate;
    }
  }
  return enabled;
}
function namespaceHue(namespace) {
  const hash = namespace.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0);
  return Math.abs(hash) % 360;
}
function createDebug(namespace) {
  const log = (...args) => {
    if (!log.enabled) {
      return;
    }
    if (typeof window !== "undefined") {
      const color = `hsl(${namespaceHue(namespace)}, 80%, 40%)`;
      console.debug(
        `%c${namespace}`,
        `color: ${color}; font-weight: bold;`,
        ...args
      );
      return;
    }
    const colorCode = namespaceHue(namespace) % 6 + 31;
    console.error(`\x1B[${colorCode};1m${namespace}\x1B[0m`, ...args);
  };
  Object.defineProperty(log, "enabled", {
    get: () => isEnabled(namespace)
  });
  return log;
}

// node_modules/@noflo/noflo/src/lib/OutPort.js
var OutPort = class extends BasePort {
  /**
   * @param {PortOptions} options - Options for the outport
   */
  constructor(options = {}) {
    const opts = options;
    if (opts.scoped == null) {
      opts.scoped = true;
    }
    if (typeof opts.caching !== "boolean") {
      opts.caching = false;
    }
    super(opts);
    const baseOptions = this.options;
    this.options = /** @type {PortOptions} */
    baseOptions;
    this.cache = {};
    this.lastWrite = Promise.resolve();
  }
  /**
   * @param {import("./InternalSocket.js").InternalSocket} socket
   * @param {number|null} [index]
   */
  attach(socket, index = null) {
    super.attach(socket, index);
    if (this.isCaching() && this.cache[`${index}`] != null) {
      this.send(this.cache[`${index}`], index);
    }
  }
  /**
   * @param {number|null} [index]
   */
  connect(index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.connect();
    });
  }
  /**
   * @param {string} group
   * @param {number|null} [index]
   */
  beginGroup(group, index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.beginGroup(group);
    });
  }
  /**
   * @param {any} data
   * @param {number|null} [index]
   */
  send(data, index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    if (this.isCaching() && data !== this.cache[`${index}`]) {
      this.cache[`${index}`] = data;
    }
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.send(data);
    });
  }
  /**
   * @param {number|null} [index]
   */
  endGroup(index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.endGroup();
    });
  }
  /**
   * @param {number|null} [index]
   */
  disconnect(index = null) {
    const sockets = this.getSockets(index);
    this.checkRequired(sockets);
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      socket.disconnect();
    });
  }
  /**
   * @param {string|IP} type
   * @param {any} [data]
   * @param {import("./IP.js").IPOptions} [options]
   * @param {number|null} [index]
   * @param {boolean} [autoConnect]
   */
  sendIP(type, data, options, index = null, autoConnect = true) {
    let ip;
    let idx = index;
    if (IP.isIP(type)) {
      ip = /** @type {IP} */
      type;
      idx = ip.index;
    } else if (typeof type === "string") {
      ip = new IP(type, data, options);
    } else {
      throw new Error("Unknown type for IP type");
    }
    const sockets = this.getSockets(idx);
    this.checkRequired(sockets);
    if (ip.datatype === "all") {
      ip.datatype = this.getDataType();
    }
    if (this.getSchema() && !ip.schema) {
      ip.schema = this.getSchema();
    }
    const cachedData = this.cache[`${idx}`] != null ? this.cache[`${idx}`].data : void 0;
    if (this.isCaching() && data !== cachedData) {
      this.cache[`${idx}`] = ip;
    }
    let pristine = true;
    const writes = [];
    sockets.forEach((socket) => {
      if (!socket) {
        return;
      }
      if (pristine) {
        writes.push(socket.post(ip, autoConnect));
        pristine = false;
      } else {
        if (ip.clonable) {
          ip = ip.clone();
        }
        writes.push(socket.post(ip, autoConnect));
      }
    });
    const admission = Promise.all(writes).then(() => void 0);
    admission.catch(() => {
    });
    this.lastWrite = admission;
    return this;
  }
  /**
   * @param {string|null} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  openBracket(data = null, options = {}, index = null) {
    return this.sendIP("openBracket", data, options, index);
  }
  /**
   * @param {any} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  data(data, options = {}, index = null) {
    return this.sendIP("data", data, options, index);
  }
  /**
   * @param {string|null} data
   * @param {import("./IP.js").IPOptions} options
   * @param {number|null} [index]
   */
  closeBracket(data = null, options = {}, index = null) {
    return this.sendIP("closeBracket", data, options, index);
  }
  /**
   * @param {Array<import("./InternalSocket.js").InternalSocket|void>} sockets
   */
  checkRequired(sockets) {
    if (sockets.length === 0 && this.isRequired()) {
      throw new Error(`${this.getId()}: No connections available`);
    }
  }
  /**
   * @param {number|null} index
   * @returns {Array<import("./InternalSocket.js").InternalSocket|void>}
   */
  getSockets(index) {
    if (this.isAddressable()) {
      if (index === null) {
        throw new Error(`${this.getId()} Socket ID required`);
      }
      const idx = (
        /** @type {number} */
        index
      );
      if (!this.sockets[idx]) {
        return [];
      }
      return [this.sockets[idx]];
    }
    if (index !== null) {
      throw new Error(
        `${this.getId()} is not addressable port and index ${index} provided`
      );
    }
    return this.sockets;
  }
  isCaching() {
    if (this.options.caching) {
      return true;
    }
    return false;
  }
};

// node_modules/@noflo/noflo/src/lib/Ports.js
var Ports = class extends LegacyEventBase {
  /**
   * @param {Object<string, import("./BasePort.js").default|PortOptions>} ports
   * @param {typeof import("./BasePort.js").default} model
   */
  constructor(ports, model) {
    super();
    this.model = model;
    this.ports = {};
    if (!ports) {
      return;
    }
    Object.keys(ports).forEach((name) => {
      const options = ports[name];
      this.add(name, options);
    });
  }
  /**
   * @param {string} name
   * @param {Object|import("./BasePort.js").default|PortOptions} [options]
   */
  add(name, options = {}) {
    if (name === "add" || name === "remove") {
      throw new Error("Add and remove are restricted port names");
    }
    if (!name.match(/^[a-z0-9_./]+$/)) {
      throw new Error(
        `Port names can only contain lowercase alphanumeric characters and underscores. '${name}' not allowed`
      );
    }
    if (this.ports[name]) {
      this.remove(name);
    }
    const maybePort = (
      /** @type {import("./BasePort.js").default} */
      options
    );
    if (typeof maybePort === "object" && maybePort.canAttach) {
      this.ports[name] = maybePort;
    } else {
      const Model = this.model;
      this.ports[name] = new Model(options);
    }
    this[name] = this.ports[name];
    this.dispatchLifecycleEvent("add", name);
    return this;
  }
  /**
   * @param {string} name
   */
  remove(name) {
    if (!this.ports[name]) {
      throw new Error(`Port ${name} not defined`);
    }
    delete this.ports[name];
    delete this[name];
    this.dispatchLifecycleEvent("remove", name);
    return this;
  }
};
var InPorts = class extends Ports {
  /**
   * @param {InPortsOptions} [ports]
   */
  constructor(ports = {}) {
    super(ports, InPort);
    const basePorts = this.ports;
    this.ports = /** @type {Object<string, InPort>} */
    basePorts;
  }
};
var OutPorts = class extends Ports {
  /**
   * @param {OutPortsOptions} [ports]
   */
  constructor(ports = {}) {
    super(ports, OutPort);
    const basePorts = this.ports;
    this.ports = /** @type {Object<string, OutPort>} */
    basePorts;
  }
  connect(name, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.connect(socketId);
  }
  beginGroup(name, group, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.beginGroup(group, socketId);
  }
  send(name, data, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.send(data, socketId);
  }
  endGroup(name, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.endGroup(socketId);
  }
  disconnect(name, socketId) {
    const port = (
      /** @type {OutPort} */
      this.ports[name]
    );
    if (!port) {
      throw new Error(`Port ${name} not available`);
    }
    port.disconnect(socketId);
  }
};
function normalizePortName(name) {
  const port = { name };
  if (name.indexOf("[") === -1) {
    return port;
  }
  const matched = name.match(/(.*)\[([0-9]+)\]/);
  if (!matched || matched.length < 3) {
    return port;
  }
  return {
    name: matched[1],
    index: matched[2]
  };
}

// node_modules/@noflo/noflo/src/lib/ProcessContext.js
var ProcessContext = class {
  /**
   * @param {import("./IP.js").default} ip - IP for this processing context
   * @param {import("./Component.js").Component} nodeInstance - Component being run
   * @param {import("./InPort.js").default} port - InPort that triggered this context
   * @param {Object<string, any>} result
   */
  constructor(ip, nodeInstance, port, result) {
    this.ip = ip;
    this.nodeInstance = nodeInstance;
    this.port = port;
    this.result = result;
    this.scope = this.ip.scope;
    this.activated = false;
    this.deactivated = false;
  }
  activate() {
    if (this.result.__resolved || this.nodeInstance.outputQ.indexOf(this.result) === -1) {
      this.result = {};
    }
    this.nodeInstance.activate(this);
  }
  deactivate() {
    if (!this.result.__resolved) {
      this.result.__resolved = true;
    }
    this.nodeInstance.deactivate(this);
  }
};

// node_modules/@noflo/noflo/src/lib/ProcessInput.js
var debugComponent = createDebug("noflo:component");
var ProcessInput = class {
  /**
   * @param {import("./Ports.js").InPorts} ports - Component inports
   * @param {import("./ProcessContext.js").default} context - Processing context
   */
  constructor(ports, context) {
    this.ports = ports;
    this.context = context;
    this.nodeInstance = this.context.nodeInstance;
    this.ip = this.context.ip;
    this.port = this.context.port;
    this.result = this.context.result;
    this.scope = this.context.scope;
  }
  // When preconditions are met, set component state to `activated`
  activate() {
    if (this.context.activated) {
      return;
    }
    if (this.nodeInstance.isOrdered()) {
      this.result.__resolved = false;
    }
    this.nodeInstance.activate(this.context);
    if (this.port.isAddressable()) {
      debugComponent(
        `${this.nodeInstance.nodeId} packet on '${this.port.name}[${this.ip.index}]' caused activation ${this.nodeInstance.load}: ${this.ip.type}`
      );
    } else {
      debugComponent(
        `${this.nodeInstance.nodeId} packet on '${this.port.name}' caused activation ${this.nodeInstance.load}: ${this.ip.type}`
      );
    }
  }
  // ## Connection listing
  // This allows components to check which input ports are attached. This is
  // useful mainly for addressable ports
  /**
   * @param {...string} params - Port names to check for attachment
   * @returns {Array<number> | Array<Array<number>>}
   */
  attached(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const res = [];
    args.forEach((port) => {
      if (!this.ports.ports[port]) {
        throw new Error(
          `Node ${this.nodeInstance.nodeId} has no port '${port}'`
        );
      }
      res.push(this.ports.ports[port].listAttached());
    });
    if (args.length === 1) {
      return res[0];
    }
    return res;
  }
  // ## Input preconditions
  // When the processing function is called, it can check if input buffers
  // contain the packets needed for the process to fire.
  // This precondition handling is done via the `has` and `hasStream` methods.
  // Returns true if a port (or ports joined by logical AND) has a new IP
  // Passing a validation callback as a last argument allows more selective
  // checking of packets.
  /**
   * @typedef {string|Array<string|number>} GetArgument
   * @typedef {import("./InPort.js").HasValidationCallback} HasValidationCallback
   */
  /**
   * @typedef {GetArgument|HasValidationCallback} HasArgument
   */
  /**
   * @param {...HasArgument} params
   */
  has(...params) {
    let validate;
    let args = params.filter((p) => typeof p !== "function");
    if (!args.length) {
      args = ["in"];
    }
    if (typeof params[params.length - 1] === "function") {
      validate = /** @type {HasValidationCallback} */
      params[params.length - 1];
    } else {
      validate = () => true;
    }
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      if (Array.isArray(port)) {
        const portImpl = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[port[0]]
        );
        if (!portImpl) {
          throw new Error(
            `Node ${this.nodeInstance.nodeId} has no port '${port[0]}'`
          );
        }
        if (!portImpl.isAddressable()) {
          throw new Error(
            `Non-addressable ports, access must be with string ${port[0]}`
          );
        }
        const portIdx = typeof port[1] === "string" ? parseInt(port[1], 10) : port[1];
        if (!portImpl.has(this.scope, portIdx, validate)) {
          return false;
        }
      } else if (typeof port === "string") {
        const portImpl = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[port]
        );
        if (!portImpl) {
          throw new Error(
            `Node ${this.nodeInstance.nodeId} has no port '${port}'`
          );
        }
        if (portImpl.isAddressable()) {
          throw new Error(
            `For addressable ports, access must be with array [${port}, idx]`
          );
        }
        if (!portImpl.has(this.scope, validate)) {
          return false;
        }
      } else {
        throw new Error(`Unknown port type ${typeof port}`);
      }
    }
    return true;
  }
  // Returns true if the ports contain data packets
  /**
   * @param {...string} params - Port names to check for data packets
   * @returns {boolean}
   */
  hasData(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const hasArgs = [
      ...args,
      /**
       * @param {import("./IP.js").default} ip
       */
      (ip) => ip.type === "data"
    ];
    return this.has(...hasArgs);
  }
  // Returns true if a port has a complete stream in its input buffer.
  /**
   * @param {...HasArgument} params - Port names to check for streams
   * @returns {boolean}
   */
  hasStream(...params) {
    let args = params;
    let validateStream;
    if (!args.length) {
      args = ["in"];
    }
    if (typeof args[args.length - 1] === "function") {
      validateStream = /** @type {Function} */
      args.pop();
    } else {
      validateStream = () => true;
    }
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      const portBrackets = [];
      let hasData = false;
      const validate = (ip) => {
        if (ip.type === "openBracket") {
          portBrackets.push(ip.data);
          return false;
        }
        if (ip.type === "data") {
          hasData = validateStream(ip, portBrackets);
          if (!portBrackets.length) {
            return hasData;
          }
          return false;
        }
        if (ip.type === "closeBracket") {
          portBrackets.pop();
          if (portBrackets.length) {
            return false;
          }
          if (!hasData) {
            return false;
          }
          return true;
        }
        return false;
      };
      if (!this.has(port, validate)) {
        return false;
      }
    }
    return true;
  }
  // ## Input processing
  //
  // Once preconditions have been met, the processing function can read from
  // the input buffers. Reading packets sets the component as "activated".
  //
  // Fetches IP object(s) for port(s)
  /**
   * @param {...GetArgument} params
   * @returns {void|IP|Array<IP|void>}
   */
  get(...params) {
    this.activate();
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const res = [];
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      let idx;
      let ip;
      let portname;
      if (Array.isArray(port)) {
        [portname, idx] = Array.from(port);
        if (!this.ports.ports[portname].isAddressable()) {
          throw new Error(
            "Non-addressable ports, access must be with string portname"
          );
        }
      } else {
        portname = port;
        if (this.ports.ports[portname].isAddressable()) {
          throw new Error(
            "For addressable ports, access must be with array [portname, idx]"
          );
        }
      }
      const name = (
        /** @type {string} */
        portname
      );
      const idxName = (
        /** @type {number} */
        idx
      );
      if (this.nodeInstance.isForwardingInport(name)) {
        ip = this.__getForForwarding(name, idxName);
        res.push(ip);
      } else {
        const portImpl = (
          /** @type {import("./InPort.js").default} */
          this.ports.ports[name]
        );
        ip = portImpl.get(this.scope, idxName);
        res.push(ip);
      }
    }
    if (args.length === 1) {
      return res[0];
    }
    return res;
  }
  /**
   * @private
   * @param {string} port
   * @param {number} [idx]
   * @returns {IP|void}
   */
  __getForForwarding(port, idx) {
    const prefix = [];
    let dataIp;
    let ok = true;
    while (ok) {
      const portImpl = (
        /** @type {import("./InPort.js").default} */
        this.ports.ports[port]
      );
      const ip = portImpl.get(this.scope, idx);
      if (!ip) {
        break;
      }
      if (ip.type === "data") {
        dataIp = ip;
        ok = false;
        break;
      }
      prefix.push(ip);
    }
    for (let i = 0; i < prefix.length; i += 1) {
      const ip = prefix[i];
      if (ip.type === "closeBracket") {
        if (!this.result.__bracketClosingBefore) {
          this.result.__bracketClosingBefore = [];
        }
        const context = this.nodeInstance.getBracketContext("in", port, this.scope, idx).pop();
        context.closeIp = ip;
        this.result.__bracketClosingBefore.push(context);
      } else if (ip.type === "openBracket") {
        this.nodeInstance.getBracketContext("in", port, this.scope, idx).push({
          ip,
          ports: [],
          source: port
        });
      }
    }
    if (!this.result.__bracketContext) {
      this.result.__bracketContext = {};
    }
    this.result.__bracketContext[port] = this.nodeInstance.getBracketContext("in", port, this.scope, idx).slice(0);
    return dataIp;
  }
  // Fetches `data` property of IP object(s) for given port(s)
  /**
   * @param {...GetArgument} params
   * @returns {any|Array<any>}
   */
  getData(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const datas = [];
    args.forEach((port) => {
      let packet = (
        /** @type {IP} */
        this.get(port)
      );
      if (packet == null) {
        datas.push(packet);
        return;
      }
      while (packet.type !== "data") {
        packet = /** @type {IP} */
        this.get(port);
        if (!packet) {
          break;
        }
      }
      datas.push(packet.data);
    });
    if (args.length === 1) {
      return datas.pop();
    }
    return datas;
  }
  // Fetches a complete data stream from the buffer.
  /**
   * @param {...GetArgument} params
   * @returns {void|Array<IP>|Array<void|Array<IP>>}
   */
  getStream(...params) {
    let args = params;
    if (!args.length) {
      args = ["in"];
    }
    const datas = [];
    for (let i = 0; i < args.length; i += 1) {
      const port = args[i];
      const portname = (
        /** @type {string} */
        Array.isArray(port) ? port[0] : port
      );
      const idx = Array.isArray(port) ? (
        /** @type {number|undefined} */
        port[1]
      ) : void 0;
      if (this.nodeInstance.isForwardingInport(portname)) {
        datas.push(this.__getStreamForForwarding(portname, idx));
        continue;
      }
      const portBrackets = [];
      const portImpl = (
        /** @type {import("./InPort.js").default} */
        this.ports.ports[portname]
      );
      if (portImpl?.options?.control) {
        const buffered = portImpl.getBuffer(this.scope, idx);
        const scanned = [];
        for (const ip2 of buffered) {
          if (ip2.type === "openBracket") {
            portBrackets.push(ip2.data);
          }
          if (ip2.type === "closeBracket") {
            portBrackets.pop();
          }
          if (ip2.type === "data") {
            scanned.push(ip2);
          }
        }
        datas.push(scanned);
        continue;
      }
      let portPackets = [];
      let hasData = false;
      let ip = (
        /** @type {IP} */
        this.get(port)
      );
      if (!ip) {
        datas.push(void 0);
      }
      while (ip) {
        if (ip.type === "openBracket") {
          if (!portBrackets.length) {
            portPackets = [];
            hasData = false;
          }
          portBrackets.push(ip.data);
          portPackets.push(ip);
        }
        if (ip.type === "data") {
          portPackets.push(ip);
          hasData = true;
          if (!portBrackets.length) {
            break;
          }
        }
        if (ip.type === "closeBracket") {
          portPackets.push(ip);
          portBrackets.pop();
          if (hasData && !portBrackets.length) {
            break;
          }
        }
        ip = /** @type {IP} */
        this.get(port);
      }
      datas.push(portPackets);
    }
    if (args.length === 1) {
      return datas[0];
    }
    return datas;
  }
  /**
   * Collect the complete stream buffered for a forwarding inport,
   * consuming it including its brackets (issue #545). Bracket openings
   * and closings are mirrored into the bracket forwarding context so
   * that output forwarding keeps working.
   *
   * @private
   * @param {string} port
   * @param {number|null} [idx]
   * @returns {Array<IP>}
   */
  __getStreamForForwarding(port, idx) {
    const portImpl = (
      /** @type {import("./InPort.js").default} */
      this.ports.ports[port]
    );
    const stream = [];
    const portBrackets = [];
    let hasData = false;
    for (; ; ) {
      const buffer = portImpl.getBuffer(this.scope, idx);
      if (!buffer.length) {
        break;
      }
      const ip = (
        /** @type {IP} */
        portImpl.get(this.scope, idx)
      );
      stream.push(ip);
      if (ip.type === "openBracket") {
        portBrackets.push(ip.data);
        this.nodeInstance.getBracketContext("in", port, this.scope, idx).push({ ip, ports: [], source: port });
        continue;
      }
      if (ip.type === "data") {
        hasData = true;
        if (!portBrackets.length) {
          break;
        }
        continue;
      }
      if (ip.type === "closeBracket") {
        portBrackets.pop();
        const context = this.nodeInstance.getBracketContext("in", port, this.scope, idx).pop();
        if (context) {
          context.closeIp = ip;
        }
        if (hasData && !portBrackets.length) {
          break;
        }
      }
    }
    if (!this.result.__bracketContext) {
      this.result.__bracketContext = {};
    }
    this.result.__bracketContext[port] = this.nodeInstance.getBracketContext("in", port, this.scope, idx).slice(0);
    return stream;
  }
};

// node_modules/@noflo/noflo/src/lib/ProcessOutput.js
var debugComponent2 = createDebug("noflo:component");
function isError(err) {
  return err instanceof Error || Array.isArray(err) && err.length > 0 && err[0] instanceof Error;
}
var ProcessOutput = class {
  /**
   * @param {import("./Ports.js").OutPorts} ports - Component outports
   * @param {import("./ProcessContext.js").default} context - Processing context
   */
  constructor(ports, context) {
    this.ports = ports;
    this.context = context;
    this.nodeInstance = this.context.nodeInstance;
    this.ip = this.context.ip;
    this.result = this.context.result;
    this.scope = this.context.scope;
  }
  // Sends an error object
  /**
   * @param {Error|Error[]} err
   * @returns {void}
   */
  error(err) {
    const errs = Array.isArray(err) ? err : [err];
    if (this.ports.ports.error && (this.ports.ports.error.isAttached() || !this.ports.ports.error.isRequired())) {
      if (errs.length > 1) {
        this.sendIP("error", new IP("openBracket"));
      }
      errs.forEach((e) => {
        this.sendIP("error", e);
      });
      if (errs.length > 1) {
        this.sendIP("error", new IP("closeBracket"));
      }
    } else {
      errs.forEach((e) => {
        throw e;
      });
    }
  }
  // Sends a single IP object to a port
  /**
   * @param {string} port - Port to send to
   * @param {IP|any} packet - IP or data to send
   * @returns {Promise<void>|void} Resolves when the packet has been
   *   admitted by the receiving edge per its high-water mark. Fire-and-
   *   forget compatible: callers may ignore the Promise.
   */
  sendIP(port, packet) {
    const ip = IP.isIP(packet) ? packet : new IP("data", packet);
    if (this.scope !== null && ip.scope === null) {
      ip.scope = this.scope;
    }
    if (!this.nodeInstance.outPorts.ports[port]) {
      throw new Error(
        `Node ${this.nodeInstance.nodeId} does not have outport ${port}`
      );
    }
    const portImpl = (
      /** @type {import("./OutPort.js").default} */
      this.nodeInstance.outPorts.ports[port]
    );
    if (portImpl.isAddressable() && ip.index === null) {
      throw new Error(
        `Sending packets to addressable port ${this.nodeInstance.nodeId} ${port} requires specifying index`
      );
    }
    if (this.nodeInstance.isOrdered()) {
      this.nodeInstance.addToResult(this.result, port, ip);
      return;
    }
    if (!portImpl.options.scoped) {
      ip.scope = null;
    }
    portImpl.sendIP(ip);
    return portImpl.lastWrite;
  }
  // Sends packets for each port as a key in the map
  // or sends Error or a list of Errors if passed such
  /**
   * @param {Error|Array<Error>|Object<string, any>} outputMap
   * @returns {Promise<void>|void} Resolves when all sent packets have
   *   been admitted by their edges per the high-water marks. Callers may
   *   await it for backpressure; fire-and-forget use stays safe (send
   *   errors escalate through the socket error path).
   */
  send(outputMap) {
    if (isError(outputMap)) {
      const errors = (
        /** @type {Error|Array<Error>} */
        outputMap
      );
      this.error(errors);
      return;
    }
    const componentPorts = [];
    let mapIsInPorts = false;
    Object.keys(this.ports.ports).forEach((port) => {
      if (port !== "error" && port !== "ports" && port !== "_callbacks") {
        componentPorts.push(port);
      }
      if (!mapIsInPorts && outputMap != null && typeof outputMap === "object" && Object.keys(outputMap).indexOf(port) !== -1) {
        mapIsInPorts = true;
      }
    });
    if (componentPorts.length === 1 && !mapIsInPorts) {
      return this.sendIP(componentPorts[0], outputMap);
    }
    if (componentPorts.length > 1 && !mapIsInPorts) {
      throw new Error("Port must be specified for sending output");
    }
    const writes = [];
    Object.keys(outputMap).forEach((port) => {
      const packet = outputMap[port];
      writes.push(this.sendIP(port, packet));
    });
    const admission = Promise.all(writes).then(() => void 0);
    admission.catch(() => {
    });
    return admission;
  }
  // Sends the argument via `send()` and marks activation as `done()`.
  // A null/undefined outputMap (e.g. a `return output.done()` chain
  // resolving with nothing) marks done without sending a null packet.
  /**
   * @param {Error|Array<Error>|Object<string, any>|null|undefined} outputMap
   * @returns {Promise<void>|void} Resolves when sent packets have been
   *   admitted and the activation has been marked done
   */
  sendDone(outputMap) {
    if (outputMap == null) {
      this.done();
      return;
    }
    const sent = this.send(outputMap);
    this.done();
    return sent;
  }
  // Makes a map-style component pass a result value to `out`
  // keeping all IP metadata received from `in`,
  // or modifying it if `options` is provided
  /**
   * @param {any} data
   * @param {Object<string, any>} [options]
   */
  pass(data, options = {}) {
    if (!("out" in this.ports)) {
      throw new Error('output.pass() requires port "out" to be present');
    }
    Object.keys(options).forEach((key) => {
      const val = options[key];
      this.ip[key] = val;
    });
    this.ip.data = data;
    const sent = this.sendIP("out", this.ip);
    this.done();
    return sent;
  }
  // Finishes process activation gracefully
  /**
   * @param {Error|Array<Error>} [error]
   */
  done(error) {
    this.result.__resolved = true;
    this.nodeInstance.activate(this.context);
    if (error) {
      this.error(error);
    }
    const isLast = () => {
      const resultsOnly = this.nodeInstance.outputQ.filter((q) => {
        if (!q.__resolved) {
          return true;
        }
        if (Object.keys(q).length === 2 && q.__bracketClosingAfter) {
          return false;
        }
        return true;
      });
      const pos = resultsOnly.indexOf(this.result);
      const len = resultsOnly.length;
      const { load } = this.nodeInstance;
      if (pos === len - 1) {
        return true;
      }
      if (pos === -1 && load === len + 1) {
        return true;
      }
      if (len <= 1 && load === 1) {
        return true;
      }
      return false;
    };
    if (this.nodeInstance.isOrdered() && isLast()) {
      Object.keys(this.nodeInstance.bracketContext.in).forEach((port) => {
        const contexts = this.nodeInstance.bracketContext.in[port];
        if (!contexts[this.scope]) {
          return;
        }
        const nodeContext = contexts[this.scope];
        if (!nodeContext.length) {
          return;
        }
        const context = nodeContext[nodeContext.length - 1];
        const inPorts = (
          /** @type {import("./InPort.js").default} */
          this.nodeInstance.inPorts.ports[context.source]
        );
        const buf = inPorts.getBuffer(context.ip.scope, context.ip.index);
        while (buf.length > 0 && buf[0].type === "closeBracket") {
          const ip = inPorts.get(context.ip.scope, context.ip.index);
          const ctx = nodeContext.pop();
          ctx.closeIp = ip;
          if (!this.result.__bracketClosingAfter) {
            this.result.__bracketClosingAfter = [];
          }
          this.result.__bracketClosingAfter.push(ctx);
        }
      });
    }
    debugComponent2(
      `${this.nodeInstance.nodeId} finished processing ${this.nodeInstance.load}`
    );
    this.nodeInstance.deactivate(this.context);
  }
};

// node_modules/@noflo/noflo/src/lib/Component.js
var debugComponent3 = createDebug("noflo:component");
var debugBrackets = createDebug("noflo:component:brackets");
var debugSend = createDebug("noflo:component:send");
var Component = class extends LegacyEventBase {
  /**
   * @param {ComponentOptions} [options]
   */
  constructor(options = {}) {
    super();
    const opts = options;
    if (!opts.inPorts) {
      opts.inPorts = {};
    }
    if (opts.inPorts instanceof InPorts) {
      this.inPorts = opts.inPorts;
    } else {
      this.inPorts = new InPorts(opts.inPorts);
    }
    if (!opts.outPorts) {
      opts.outPorts = {};
    }
    if (opts.outPorts instanceof OutPorts) {
      this.outPorts = opts.outPorts;
    } else {
      this.outPorts = new OutPorts(opts.outPorts);
    }
    this.icon = opts.icon ? opts.icon : "";
    this.description = opts.description ? opts.description : "";
    this.componentName = null;
    this.baseDir = null;
    this.started = false;
    this.load = 0;
    this.ordered = opts.ordered != null ? opts.ordered : false;
    this.autoOrdering = opts.autoOrdering != null ? opts.autoOrdering : null;
    this.outputQ = [];
    this.bracketContext = {
      in: {},
      out: {}
    };
    this.activateOnInput = opts.activateOnInput != null ? opts.activateOnInput : true;
    if (!opts.forwardBrackets) {
      opts.forwardBrackets = { in: ["out", "error"] };
    }
    this.forwardBrackets = opts.forwardBrackets;
    if (typeof opts.process === "function") {
      this.process(opts.process);
    }
    this.nodeId = null;
    this.__openConnections = 0;
  }
  getDescription() {
    return this.description;
  }
  isReady() {
    return true;
  }
  isSubgraph() {
    return false;
  }
  /**
   * @param {string} icon - Updated icon for the component
   */
  setIcon(icon) {
    this.icon = icon;
    this.dispatchLifecycleEvent("icon", this.icon);
  }
  getIcon() {
    return this.icon;
  }
  // ### Error emitting helper
  //
  // If component has an `error` outport that is connected, errors
  // are sent as IP objects there. If the port is not connected,
  // errors are thrown.
  /**
   * @param {Error} e
   * @param {Array<string>} [groups]
   * @param {string} [errorPort]
   * @param {string | null} [scope]
   */
  error(e, groups = [], errorPort = "error", scope = null) {
    const outPort = (
      /** @type {OutPort} */
      this.outPorts.ports[errorPort]
    );
    if (outPort && (outPort.isAttached() || !outPort.isRequired())) {
      groups.forEach((group) => {
        outPort.openBracket(group, { scope });
      });
      outPort.data(e, { scope });
      groups.forEach((group) => {
        outPort.closeBracket(group, { scope });
      });
      return;
    }
    throw e;
  }
  /**
   * @callback ErrorableCallback
   * @param {Error | null} error
   */
  // ### Setup
  //
  // The setUp method is for component-specific initialization.
  // Called at network start-up.
  //
  // Override in component implementation to do component-specific
  // setup work.
  /**
   * @returns {Promise<void>}
   */
  setUp() {
    return Promise.resolve();
  }
  // ### Teardown
  //
  // The tearDown method is for component-specific cleanup. Called
  // at network shutdown
  //
  // Override in component implementation to do component-specific
  // cleanup work, like clearing any accumulated state.
  /**
   * @returns {Promise<void>}
   */
  tearDown() {
    return Promise.resolve();
  }
  // ### Start
  //
  // Called when network starts. This sets calls the setUp
  // method and sets the component to a started state.
  /**
   * @returns {Promise<void>}
   */
  start() {
    if (this.isStarted()) {
      return Promise.resolve();
    }
    return Promise.resolve().then(() => this.setUp()).then(() => {
      this.started = true;
      this.dispatchLifecycleEvent("start");
    });
  }
  // ### Shutdown
  //
  // Called when network is shut down. This sets calls the
  // tearDown method and sets the component back to a
  // non-started state.
  //
  // The returned Promise settles when tearDown finishes and
  // all active processing contexts have ended.
  /**
   * @returns {Promise<void>}
   */
  shutdown() {
    return Promise.resolve().then(() => this.tearDown()).then(
      () => new Promise((resolve) => {
        if (this.load > 0) {
          const checkLoad = (event) => {
            if (event.detail > 0) {
              return;
            }
            this.removeEventListener("deactivate", checkLoad);
            resolve();
          };
          this.addEventListener("deactivate", checkLoad);
          return;
        }
        resolve();
      })
    ).then(() => {
      const inPorts = this.inPorts.ports || this.inPorts;
      Object.keys(inPorts).forEach((portName) => {
        const inPort = (
          /** @type {InPort} */
          inPorts[portName]
        );
        if (typeof inPort.clear !== "function") {
          return;
        }
        inPort.clear();
      });
      this.bracketContext = {
        in: {},
        out: {}
      };
      if (!this.isStarted()) {
        return Promise.resolve();
      }
      this.started = false;
      this.dispatchLifecycleEvent("end");
      return Promise.resolve();
    });
  }
  isStarted() {
    return this.started;
  }
  // Ensures bracket forwarding map is correct for the existing ports
  prepareForwarding() {
    Object.keys(this.forwardBrackets).forEach((inPort) => {
      const outPorts = this.forwardBrackets[inPort];
      if (!(inPort in this.inPorts.ports)) {
        delete this.forwardBrackets[inPort];
        return;
      }
      const tmp = [];
      outPorts.forEach((outPort) => {
        if (outPort in this.outPorts.ports) {
          tmp.push(outPort);
        }
      });
      if (tmp.length === 0) {
        delete this.forwardBrackets[inPort];
      } else {
        this.forwardBrackets[inPort] = tmp;
      }
    });
  }
  // Method for determining if a component is using the modern
  // NoFlo Process API
  isLegacy() {
    if (this.handle) {
      return false;
    }
    return true;
  }
  // Sets process handler function
  /**
   * @param {ProcessingFunction} handle - Processing function
   * @returns {this}
   */
  process(handle) {
    if (typeof handle !== "function") {
      throw new Error("Process handler must be a function");
    }
    if (!this.inPorts) {
      throw new Error(
        "Component ports must be defined before process function"
      );
    }
    this.prepareForwarding();
    this.handle = handle;
    Object.keys(this.inPorts.ports).forEach((name) => {
      const port = (
        /** @type {InPort} */
        this.inPorts.ports[name]
      );
      if (!port.name) {
        port.name = name;
      }
      port.addEventListener("ip", (event) => this.handleIP(event.detail, port));
    });
    return this;
  }
  // Method for checking if a given inport is set up for
  // automatic bracket forwarding
  /**
   * @param {InPort|string} port
   * @returns {boolean}
   */
  isForwardingInport(port) {
    let portName;
    if (typeof port === "string") {
      portName = port;
    } else {
      portName = port.name;
    }
    if (portName && portName in this.forwardBrackets) {
      return true;
    }
    return false;
  }
  // Method for checking if a given outport is set up for
  // automatic bracket forwarding
  /**
   * @param {InPort|string} inport
   * @param {OutPort|string} outport
   * @returns {boolean}
   */
  isForwardingOutport(inport, outport) {
    let inportName;
    let outportName;
    if (typeof inport === "string") {
      inportName = inport;
    } else {
      inportName = inport.name;
    }
    if (typeof outport === "string") {
      outportName = outport;
    } else {
      outportName = outport.name;
    }
    if (!inportName || !outportName) {
      return false;
    }
    if (!this.forwardBrackets[inportName]) {
      return false;
    }
    if (this.forwardBrackets[inportName].indexOf(outportName) !== -1) {
      return true;
    }
    return false;
  }
  // Method for checking whether the component sends packets
  // in the same order they were received.
  isOrdered() {
    if (this.ordered) {
      return true;
    }
    if (this.autoOrdering) {
      return true;
    }
    return false;
  }
  // ### Handling IP objects
  //
  // The component has received an Information Packet. Call the
  // processing function so that firing pattern preconditions can
  // be checked and component can do processing as needed.
  /**
   * @param {IP} ip
   * @param {InPort} port
   * @returns {void}
   */
  handleIP(ip, port) {
    if (!port.options.triggering) {
      if (ip.type !== "data") {
        return;
      }
      if (port.options.scoped && ip.scope == null) {
        debugComponent3(
          `${this.nodeId} unscoped control IP on scoped control port '${port.name}': the control value cannot be read; declare the port scoped: false`
        );
      }
      const hasPendingData = (buffer) => Boolean(buffer?.some((buffered) => buffered.type === "data"));
      const isNonControl = (other) => other !== port && other.options.triggering !== false;
      const scopesToFire = [];
      let anyPending = false;
      Object.keys(this.inPorts.ports).forEach((name) => {
        const other = this.inPorts.ports[name];
        if (!isNonControl(other)) {
          return;
        }
        if (hasPendingData(other.getBuffer(null, null))) {
          if (!scopesToFire.includes(null)) {
            scopesToFire.push(null);
            anyPending = true;
          }
        }
        if (other.scopedBuffer) {
          Object.keys(other.scopedBuffer).forEach((scope) => {
            if (hasPendingData(other.scopedBuffer[scope]) && !scopesToFire.includes(scope)) {
              scopesToFire.push(scope);
              anyPending = true;
            }
          });
        }
      });
      if (!anyPending) {
        return;
      }
      scopesToFire.forEach((scope) => {
        const contextIp = scope === null ? ip : new IP(ip.type, ip.data, { scope });
        this.fireProcess(contextIp, port);
      });
      return;
    }
    this.fireProcess(ip, port);
  }
  /**
   * Run the processing function for an Information Packet in a prepared
   * context. Precondition checks (forwarding brackets, firing gates)
   * are the caller's responsibility.
   *
   * @param {IP} ip
   * @param {InPort} port
   */
  fireProcess(ip, port) {
    if (ip.type === "openBracket" && this.autoOrdering === null && !this.ordered) {
      debugComponent3(
        `${this.nodeId} port '${port.name}' entered auto-ordering mode`
      );
      this.autoOrdering = true;
    }
    let result = {};
    if (this.isForwardingInport(port)) {
      if (ip.type === "openBracket") {
        return;
      }
      if (ip.type === "closeBracket") {
        const buf = port.getBuffer(ip.scope, ip.index);
        const dataPackets = buf.filter((p) => p.type === "data");
        if (this.outputQ.length >= this.load && dataPackets.length === 0) {
          if (buf[0] !== ip) {
            return;
          }
          if (!port.name) {
            return;
          }
          port.get(ip.scope, ip.index);
          const bracketCtx = this.getBracketContext(
            "in",
            port.name,
            ip.scope,
            ip.index
          ).pop();
          bracketCtx.closeIp = ip;
          debugBrackets(
            `${this.nodeId} closeBracket-C from '${bracketCtx.source}' to ${bracketCtx.ports}: '${ip.data}'`
          );
          result = {
            __resolved: true,
            __bracketClosingAfter: [bracketCtx]
          };
          this.outputQ.push(result);
          this.processOutputQueue();
        }
        if (!dataPackets.length) {
          return;
        }
      }
    }
    const context = new ProcessContext(ip, this, port, result);
    const input = new ProcessInput(this.inPorts, context);
    const output = new ProcessOutput(this.outPorts, context);
    try {
      if (!this.handle) {
        throw new Error("Processing function not defined");
      }
      const res = this.handle(input, output, context);
      if (res && res.then) {
        res.then(
          (data) => output.sendDone(data),
          (err) => output.done(err)
        );
      }
    } catch (e) {
      this.deactivate(context);
      output.sendDone(e);
    }
    if (context.activated) {
      return;
    }
    if (port.isAddressable()) {
      debugComponent3(
        `${this.nodeId} packet on '${port.name}[${ip.index}]' didn't match preconditions: ${ip.type}`
      );
      return;
    }
    debugComponent3(
      `${this.nodeId} packet on '${port.name}' didn't match preconditions: ${ip.type}`
    );
  }
  // Get the current bracket forwarding context for an IP object
  /**
   * @param {string} type
   * @param {string} port
   * @param {string|null} scope
   * @param {number|null} [idx]
   */
  getBracketContext(type, port, scope, idx = null) {
    let { name, index } = normalizePortName(port);
    if (idx != null) {
      index = `${idx}`;
    }
    const portsList = type === "in" ? this.inPorts : this.outPorts;
    if (portsList.ports[name].isAddressable()) {
      name = `${name}[${index}]`;
    } else {
      name = port;
    }
    if (!this.bracketContext[type][name]) {
      this.bracketContext[type][name] = {};
    }
    if (!this.bracketContext[type][name][scope]) {
      this.bracketContext[type][name][scope] = [];
    }
    return this.bracketContext[type][name][scope];
  }
  // Add an IP object to the list of results to be sent in
  // order
  /**
   * @param {ProcessResult} result
   * @param {Object} port
   * @param {IP} packet
   * @param {boolean} [before]
   */
  addToResult(result, port, packet, before = false) {
    const res = result;
    const ip = packet;
    const { name, index } = normalizePortName(port);
    const method = before ? "unshift" : "push";
    if (this.outPorts.ports[name].isAddressable()) {
      const idx = (
        /** @type {number} */
        index ? parseInt(index, 10) : ip.index
      );
      if (!res[name]) {
        res[name] = {};
      }
      if (!res[name][idx]) {
        res[name][idx] = [];
      }
      ip.index = idx;
      res[name][idx][method](ip);
      return;
    }
    if (!res[name]) {
      res[name] = [];
    }
    res[name][method](ip);
  }
  // Get contexts that can be forwarded with this in/outport
  // pair.
  /** @private */
  getForwardableContexts(inport, outport, contexts) {
    const { name, index } = normalizePortName(outport);
    const forwardable = [];
    contexts.forEach((ctx, idx) => {
      if (!this.isForwardingOutport(inport, name)) {
        return;
      }
      if (ctx.ports.indexOf(outport) !== -1) {
        return;
      }
      const outContext = this.getBracketContext(
        "out",
        name,
        ctx.ip.scope,
        parseInt(index, 10)
      )[idx];
      if (outContext) {
        if (outContext.ip.data === ctx.ip.data && outContext.ports.indexOf(outport) !== -1) {
          return;
        }
      }
      forwardable.push(ctx);
    });
    return forwardable;
  }
  // Add any bracket forwards needed to the result queue
  /** @private */
  addBracketForwards(result) {
    const res = result;
    if (res.__bracketClosingBefore != null ? res.__bracketClosingBefore.length : void 0) {
      res.__bracketClosingBefore.forEach((context) => {
        debugBrackets(
          `${this.nodeId} closeBracket-A from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`
        );
        if (!context.ports.length) {
          return;
        }
        context.ports.forEach((port) => {
          const ipClone = context.closeIp.clone();
          this.addToResult(res, port, ipClone, true);
          this.getBracketContext("out", port, ipClone.scope).pop();
        });
      });
    }
    if (res.__bracketContext) {
      Object.keys(res.__bracketContext).reverse().forEach((inport) => {
        const context = res.__bracketContext[inport];
        if (!context.length) {
          return;
        }
        Object.keys(res).forEach((outport) => {
          let datas;
          let forwardedOpens;
          let unforwarded;
          const ips = res[outport];
          if (outport.indexOf("__") === 0) {
            return;
          }
          if (this.outPorts[outport].isAddressable()) {
            Object.keys(ips).forEach((idx) => {
              const idxIps = ips[idx];
              datas = idxIps.filter((ip) => ip.type === "data");
              if (!datas.length) {
                return;
              }
              const portIdentifier = `${outport}[${idx}]`;
              unforwarded = this.getForwardableContexts(
                inport,
                portIdentifier,
                context
              );
              if (!unforwarded.length) {
                return;
              }
              forwardedOpens = [];
              unforwarded.forEach((ctx) => {
                debugBrackets(
                  `${this.nodeId} openBracket from '${inport}' to '${portIdentifier}': '${ctx.ip.data}'`
                );
                const ipClone = ctx.ip.clone();
                ipClone.index = parseInt(idx, 10);
                forwardedOpens.push(ipClone);
                ctx.ports.push(portIdentifier);
                this.getBracketContext(
                  "out",
                  outport,
                  ctx.ip.scope,
                  ipClone.index
                ).push(ctx);
              });
              forwardedOpens.reverse();
              forwardedOpens.forEach((ip) => {
                this.addToResult(res, outport, ip, true);
              });
            });
            return;
          }
          datas = ips.filter((ip) => ip.type === "data");
          if (!datas.length) {
            return;
          }
          unforwarded = this.getForwardableContexts(inport, outport, context);
          if (!unforwarded.length) {
            return;
          }
          forwardedOpens = [];
          unforwarded.forEach((ctx) => {
            debugBrackets(
              `${this.nodeId} openBracket from '${inport}' to '${outport}': '${ctx.ip.data}'`
            );
            forwardedOpens.push(ctx.ip.clone());
            ctx.ports.push(outport);
            this.getBracketContext("out", outport, ctx.ip.scope).push(ctx);
          });
          forwardedOpens.reverse();
          forwardedOpens.forEach((ip) => {
            this.addToResult(res, outport, ip, true);
          });
        });
      });
    }
    if (res.__bracketClosingAfter != null ? res.__bracketClosingAfter.length : void 0) {
      res.__bracketClosingAfter.forEach((context) => {
        debugBrackets(
          `${this.nodeId} closeBracket-B from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`
        );
        if (!context.ports.length) {
          return;
        }
        context.ports.forEach((port) => {
          const ipClone = context.closeIp.clone();
          this.addToResult(res, port, ipClone, false);
          this.getBracketContext("out", port, ipClone.scope).pop();
        });
      });
    }
    delete res.__bracketClosingBefore;
    delete res.__bracketContext;
    delete res.__bracketClosingAfter;
  }
  // Whenever an execution context finishes, send all resolved
  // output from the queue in the order it is in.
  /** @private */
  processOutputQueue() {
    while (this.outputQ.length > 0) {
      if (!this.outputQ[0].__resolved) {
        break;
      }
      const result = this.outputQ.shift();
      this.addBracketForwards(result);
      Object.keys(result).forEach((port) => {
        let portIdentifier;
        const ips = result[port];
        if (port.indexOf("__") === 0) {
          return;
        }
        if (this.outPorts.ports[port].isAddressable()) {
          Object.keys(ips).forEach((index) => {
            const idxIps = ips[index];
            const idx = parseInt(index, 10);
            if (!this.outPorts.ports[port].isAttached(idx)) {
              return;
            }
            idxIps.forEach((packet) => {
              const ip = packet;
              portIdentifier = `${port}[${ip.index}]`;
              if (ip.type === "openBracket") {
                debugSend(
                  `${this.nodeId} sending ${portIdentifier} < '${ip.data}'`
                );
              } else if (ip.type === "closeBracket") {
                debugSend(
                  `${this.nodeId} sending ${portIdentifier} > '${ip.data}'`
                );
              } else {
                debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
              }
              if (!this.outPorts[port].options.scoped) {
                ip.scope = null;
              }
              this.outPorts[port].sendIP(ip);
            });
          });
          return;
        }
        if (!this.outPorts.ports[port].isAttached()) {
          return;
        }
        ips.forEach((packet) => {
          const ip = packet;
          portIdentifier = port;
          if (ip.type === "openBracket") {
            debugSend(
              `${this.nodeId} sending ${portIdentifier} < '${ip.data}'`
            );
          } else if (ip.type === "closeBracket") {
            debugSend(
              `${this.nodeId} sending ${portIdentifier} > '${ip.data}'`
            );
          } else {
            debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
          }
          if (!this.outPorts[port].options.scoped) {
            ip.scope = null;
          }
          this.outPorts[port].sendIP(ip);
        });
      });
    }
  }
  // Signal that component has activated. There may be multiple
  // activated contexts at the same time
  /**
   * @param {Object} context
   * @param {boolean} context.activated
   * @param {boolean} context.deactivated
   * @param {Object} context.result
   */
  activate(context) {
    if (context.activated) {
      return;
    }
    context.activated = true;
    context.deactivated = false;
    this.load += 1;
    this.dispatchLifecycleEvent("activate", this.load);
    if (this.ordered || this.autoOrdering) {
      this.outputQ.push(context.result);
    }
  }
  // Signal that component has deactivated. There may be multiple
  // activated contexts at the same time
  /**
   * @param {Object} context
   * @param {boolean} context.activated
   * @param {boolean} context.deactivated
   */
  deactivate(context) {
    if (context.deactivated) {
      return;
    }
    context.deactivated = true;
    context.activated = false;
    if (this.isOrdered()) {
      this.processOutputQueue();
    }
    this.load -= 1;
    this.dispatchLifecycleEvent("deactivate", this.load);
  }
};
Component.description = "";
Component.icon = null;

// node_modules/@noflo/noflo/src/components/Subgraph.js
var Subgraph = class extends Component {
  /**
   * @param {Object<string, any>} [metadata]
   */
  constructor(metadata) {
    super();
    this.metadata = metadata;
    this.network = null;
    this.ready = true;
    this.started = false;
    this.starting = false;
    this.loader = null;
    this.load = 0;
    this.inPorts = new InPorts({
      graph: {
        datatype: "all",
        description: "NoFlo graph definition to be used with the subgraph component",
        required: true
      }
    });
    this.outPorts = new OutPorts();
    this.inPorts.ports.graph.addEventListener("ip", (event) => {
      const packet = event.detail;
      if (packet.type !== "data") {
        return;
      }
      deprecated(
        "Sending graph packets into a subgraph at runtime is deprecated; register pre-parsed graph models with the component loader or construct networks directly"
      );
      this.setGraph(packet.data).catch(this.error);
    });
  }
  /**
   * @param {import("@noflo/graph").GraphModel|Object<string, any>} graph
   *   A live graph model or an FBP JSON definition
   * @returns {Promise<void>}
   */
  setGraph(graph) {
    this.ready = false;
    if (graph instanceof GraphModel) {
      return this.createNetwork(graph);
    }
    return this.createNetwork(importFbpJson(graph));
  }
  /**
   * @param {import("@noflo/graph").GraphModel} graph
   * @returns {Promise<void>}
   */
  createNetwork(graph) {
    const graphMetadata = graph.graphMetadata();
    this.description = graphMetadata.description || "";
    this.icon = graphMetadata.icon || this.icon;
    const graphObj = graph;
    if (!graphObj.name && this.nodeId) {
      graphObj.name = this.nodeId;
    }
    const network = new Network(graphObj, {
      componentLoader: this.loader || void 0
    });
    return network.loader.listComponents().then(() => {
      this.network = network;
      this.dispatchLifecycleEvent("network", network);
      this.subscribeNetwork(network);
      return network.connect();
    }).then(() => {
      Object.keys(network.processes).forEach((name) => {
        const node = network.processes[name];
        this.findEdgePorts(name, node);
      });
      this.setToReady();
    });
  }
  /**
   * @typedef SubgraphContext
   * @property {boolean} activated
   * @property {boolean} deactivated
   */
  /**
   * @param {import("../lib/Network.js").Network} network
   */
  subscribeNetwork(network) {
    const contexts = [];
    network.addEventListener("start", () => {
      const ctx = {
        activated: false,
        deactivated: false,
        result: {}
      };
      contexts.push(ctx);
      this.activate(ctx);
    });
    network.addEventListener("end", () => {
      const ctx = contexts.pop();
      if (!ctx) {
        return;
      }
      this.deactivate(ctx);
    });
  }
  /**
   * @param {import("../lib/InPort.js").default} _port
   * @param {string} nodeName
   * @param {string} portName
   * @returns {boolean|string}
   */
  isExportedInport(_port, nodeName, portName) {
    if (!this.network) {
      return false;
    }
    for (const exp of this.network.graph.exports()) {
      if (exp.direction !== "inport" || exp.internal.node !== nodeName || exp.internal.port !== portName) {
        continue;
      }
      return exp.public;
    }
    return false;
  }
  /**
   * @param {import("../lib/OutPort.js").default} _port
   * @param {string} nodeName
   * @param {string} portName
   * @returns {boolean|string}
   */
  isExportedOutport(_port, nodeName, portName) {
    if (!this.network) {
      return false;
    }
    for (const exp of this.network.graph.exports()) {
      if (exp.direction !== "outport" || exp.internal.node !== nodeName || exp.internal.port !== portName) {
        continue;
      }
      return exp.public;
    }
    return false;
  }
  setToReady() {
    if (!isBrowser()) {
      process.nextTick(() => {
        this.ready = true;
        return this.dispatchLifecycleEvent("ready");
      });
    } else {
      setTimeout(() => {
        this.ready = true;
        return this.dispatchLifecycleEvent("ready");
      }, 0);
    }
  }
  /**
   * @param {string} name
   * @param {import("../lib/BaseNetwork.js").NetworkProcess} process
   * @returns {boolean}
   */
  findEdgePorts(name, process2) {
    if (!process2.component) {
      return false;
    }
    const inPorts = process2.component.inPorts.ports;
    const outPorts = process2.component.outPorts.ports;
    Object.keys(inPorts).forEach((portName) => {
      const port = inPorts[portName];
      const targetPortName = this.isExportedInport(port, name, portName);
      if (typeof targetPortName !== "string") {
        return;
      }
      this.inPorts.add(targetPortName, port);
      this.inPorts.ports[targetPortName].addEventListener("connect", () => {
        if (this.starting || !this.network) {
          return;
        }
        if (this.network.isStarted()) {
          return;
        }
        if (this.network.startupDate) {
          this.network.setStarted(true);
          return;
        }
        this.setUp();
      });
    });
    Object.keys(outPorts).forEach((portName) => {
      const port = outPorts[portName];
      const targetPortName = this.isExportedOutport(port, name, portName);
      if (typeof targetPortName !== "string") {
        return;
      }
      this.outPorts.add(targetPortName, port);
    });
    return true;
  }
  isReady() {
    return this.ready;
  }
  isSubgraph() {
    return true;
  }
  isLegacy() {
    return false;
  }
  setUp() {
    this.starting = true;
    if (!this.isReady()) {
      return new Promise((resolve, reject) => {
        const onReady = (_event) => {
          this.removeEventListener("ready", onReady);
          this.setUp().then(resolve, reject);
        };
        this.addEventListener("ready", onReady);
      });
    }
    if (!this.network) {
      return Promise.resolve();
    }
    return this.network.start().then(() => {
      this.starting = false;
    });
  }
  tearDown() {
    this.starting = false;
    if (!this.network) {
      return Promise.resolve();
    }
    return this.network.stop().then(() => {
    });
  }
};

// node_modules/@noflo/noflo/src/lib/ComponentLoader.js
var ComponentLoader = class {
  /**
   * @param {ComponentLoaderOptions} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.registry = this.options.registry || null;
    this.components = {};
    this.libraryIcons = {};
    if (this.registry && typeof this.registry.list === "function") {
      const list = this.registry.list();
      Object.keys(list || {}).forEach((name) => {
        this.components[name] = list[name];
      });
    }
    if (this.registry && typeof /** @type {any} */
    this.registry.addEventListener === "function") {
      this.registry.addEventListener(
        "change",
        (event) => {
          const name = event.detail?.name;
          if (!name || !this.components) {
            return;
          }
          if (typeof this.registry?.get !== "function") {
            return;
          }
          Promise.resolve(this.registry.get(name)).then((impl) => {
            if (!this.components) {
              return;
            }
            if (impl) {
              this.components[name] = impl;
            } else {
              delete this.components[name];
            }
          }).catch(() => {
          });
        }
      );
      this.registry.addEventListener("invalidate", () => {
        this.components = {};
        if (this.registry && typeof this.registry.list === "function") {
          const list = this.registry.list();
          Object.keys(list || {}).forEach((name) => {
            this.components[name] = list[name];
          });
        }
      });
    }
  }
  // Get the library prefix for a given module name. This
  // is mostly used for generating valid names for namespaced
  // NPM modules, as well as for convenience renaming all
  // `noflo-` prefixed modules with just their base name.
  //
  // Examples:
  //
  // * `my-project` becomes `my-project`
  // * `@foo/my-project` becomes `my-project`
  // * `noflo-core` becomes `core`
  /**
   * @param {string} name
   * @returns {string}
   */
  getModulePrefix(name) {
    if (!name) {
      return "";
    }
    let res = name;
    if (res === "noflo") {
      return "";
    }
    if (res[0] === "@") {
      res = res.replace(/@[a-z-]+\//, "");
    }
    return res.replace(/^noflo-/, "");
  }
  // Get the list of all available components. Promise-returning
  // accessor per work document #8; the catalog is already populated
  // at construction.
  /**
   * @returns {Promise<ComponentList>} Promise resolving to list of loaded components
   */
  listComponents() {
    return Promise.resolve(this.components);
  }
  // Load an instance of a specific component. If the
  // registered component is a graph model or FBP JSON definition,
  // it will be loaded as an instance of the NoFlo subgraph
  // component.
  /**
   * @param {string} name - Component name
   * @param {Object<string, any>} [meta] - Node metadata
   * @returns {Promise<import("./Component.js").Component>}
   */
  load(name, meta) {
    const metadata = meta;
    const promise = new Promise((resolve, reject) => {
      if (!this.components) {
        reject(new Error(`Component ${name} not available`));
        return;
      }
      let component = this.components[name];
      if (!component) {
        const keys = Object.keys(this.components);
        for (let i = 0; i < keys.length; i += 1) {
          const componentName = keys[i];
          if (componentName.split("/")[1] === name) {
            component = this.components[componentName];
            break;
          }
        }
      }
      if (!component) {
        if (this.registry && typeof this.registry.get === "function") {
          resolve(
            Promise.resolve(this.registry.get(name)).then((impl) => {
              if (!impl) {
                reject(new Error(`Component ${name} not available`));
                return void 0;
              }
              return impl;
            })
          );
          return;
        }
      }
      if (!component) {
        reject(new Error(`Component ${name} not available`));
        return;
      }
      resolve(component);
    }).then((component) => {
      if (this.isGraph(component)) {
        return (
          /** @type {Promise<import("./Component.js").Component>} */
          this.loadGraph(name, component, metadata)
        );
      }
      return this.createComponent(name, component, metadata).then(
        (instance) => {
          if (!instance) {
            return Promise.reject(
              new Error(`Component ${name} could not be loaded.`)
            );
          }
          const inst = instance;
          if (typeof name === "string") {
            inst.componentName = name;
          }
          if (inst.isLegacy()) {
            deprecated(
              `Component ${name} uses legacy NoFlo APIs. Please port to Process API`
            );
          }
          this.setIcon(name, inst);
          return inst;
        }
      );
    });
    return promise;
  }
  /**
   * Creates an instance of a component.
   * @param {string} name
   * @param {ComponentDefinition} component
   * @param {Object<string, any>} [metadata]
   * @returns {Promise<import("./Component.js").Component>}
   */
  createComponent(name, component, metadata) {
    const implementation = component;
    if (!implementation) {
      return Promise.reject(new Error(`Component ${name} not available`));
    }
    let instance;
    const impl = (
      /** @type ModuleComponent */
      implementation
    );
    if (typeof impl.getComponent === "function") {
      try {
        instance = impl.getComponent(metadata);
      } catch (error) {
        return Promise.reject(error);
      }
    } else if (typeof implementation === "function") {
      try {
        instance = implementation(metadata);
      } catch (error) {
        return Promise.reject(error);
      }
    } else {
      return Promise.reject(
        new Error(
          `Invalid type ${typeof implementation} for component ${name}.`
        )
      );
    }
    return Promise.resolve(instance);
  }
  // Check if a given value is a graph definition
  /**
   * @param {import("@noflo/graph").GraphModel|object} cPath
   * @returns {boolean}
   */
  isGraph(cPath) {
    if (cPath instanceof GraphModel) {
      return true;
    }
    if (typeof cPath !== "object") {
      return false;
    }
    if (Array.isArray(cPath.nodes)) {
      return true;
    }
    if (typeof cPath.processes === "object" && cPath.processes !== null && !Array.isArray(cPath.processes)) {
      return true;
    }
    return false;
  }
  // Load a graph as a NoFlo subgraph component instance
  /**
   * @protected
   * @param {string} name
   * @param {import("@noflo/graph").GraphModel} component
   * @param {Object<string, any>} [metadata]
   * @returns {Promise<Subgraph>}
   */
  loadGraph(name, component, metadata) {
    const subgraph = new Subgraph(metadata);
    subgraph.loader = this;
    subgraph.inPorts.remove("graph");
    this.setIcon(name, subgraph);
    return subgraph.setGraph(component).then(() => subgraph);
  }
  // Set icon for the component instance. If the instance
  // has an icon set, then this is a no-op. Otherwise we
  // determine an icon based on the module it is coming
  // from, or use a fallback icon separately for subgraphs
  // and elementary components.
  /**
   * @param {string} name - Icon to set
   * @param {import("./Component.js").Component} instance
   */
  setIcon(name, instance) {
    if (!instance.getIcon || instance.getIcon()) {
      return;
    }
    const [library, componentName] = name.split("/");
    if (componentName && this.getLibraryIcon(library)) {
      instance.setIcon(this.getLibraryIcon(library));
      return;
    }
    if (instance.isSubgraph()) {
      instance.setIcon("sitemap");
      return;
    }
    instance.setIcon("gear");
  }
  /**
   * @param {string} prefix
   * @returns {string|null}
   */
  getLibraryIcon(prefix) {
    if (this.libraryIcons[prefix]) {
      return this.libraryIcons[prefix];
    }
    return null;
  }
  /**
   * @param {string} prefix
   * @param {string} icon
   */
  setLibraryIcon(prefix, icon) {
    this.libraryIcons[prefix] = icon;
  }
  /**
   * @param {string} packageId
   * @param {string} name
   * @returns {string}
   */
  normalizeName(packageId, name) {
    const prefix = this.getModulePrefix(packageId);
    let fullName = `${prefix}/${name}`;
    if (!packageId) {
      fullName = name;
    }
    return fullName;
  }
  /**
   * @callback ErrorableCallback
   * @param {Error|null} error
   * @returns {void}
   */
  // ### Registering components at runtime
  //
  // In addition to components provided by the registry,
  // it is possible to register components at runtime.
  //
  // With the `registerComponent` method you can register
  // a NoFlo Component constructor or factory method
  // as a component available for loading.
  /**
   * @param {string} packageId
   * @param {string} name
   * @param {ComponentDefinition} cPath
   * @returns {Promise<void>}
   */
  registerComponent(packageId, name, cPath) {
    const fullName = this.normalizeName(packageId, name);
    this.components[fullName] = cPath;
    return Promise.resolve();
  }
  // With the `registerGraph` method you can register new
  // graphs as loadable components.
  /**
   * @param {string} packageId
   * @param {string} name
   * @param {import("@noflo/graph").GraphModel} gPath
   * @returns {Promise<void>}
   */
  registerGraph(packageId, name, gPath) {
    return this.registerComponent(packageId, name, gPath);
  }
  // With `registerLoader` you can register custom component
  // loaders. They will be called immediately and can register
  // any components or graphs they wish. Registry implementations
  // like `@noflo/loader-node` drive this hook for `noflo.loader`
  // plugin modules discovered in package manifests; core accepts
  // plugins, it never discovers them.
  /**
   * @callback CustomLoader
   * @param {ComponentLoader} loader
   * @param {ErrorableCallback} callback
   * @returns {void}
   */
  /**
   * @param {CustomLoader} loader
   * @returns {Promise<void>}
   */
  registerLoader(loader) {
    const promise = new Promise((resolve, reject) => {
      loader(this, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    return promise;
  }
  clear() {
    this.components = {};
    if (this.registry && typeof this.registry.list === "function") {
      const list = this.registry.list();
      Object.keys(list || {}).forEach((name) => {
        this.components[name] = list[name];
      });
    }
  }
};

// node_modules/@noflo/noflo/src/lib/Edge.js
function validateHighWaterMark(value, source) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(
      `Edge highWaterMark from ${source} must be a non-negative integer or null, got ${value}`
    );
  }
  return value;
}
function resolveHighWaterMark(metadata, componentDefault, runtimeDefault) {
  const fromMetadata = metadata ? metadata.highWaterMark : void 0;
  if (fromMetadata !== void 0 && fromMetadata !== null) {
    return validateHighWaterMark(fromMetadata, "edge metadata");
  }
  if (componentDefault !== void 0 && componentDefault !== null) {
    return validateHighWaterMark(componentDefault, "component default");
  }
  if (runtimeDefault !== void 0 && runtimeDefault !== null) {
    return validateHighWaterMark(runtimeDefault, "runtime default");
  }
  return null;
}
var Edge = class {
  /**
   * @param {EdgeOptions} [options]
   */
  constructor(options = {}) {
    this.highWaterMark = options.highWaterMark === void 0 || options.highWaterMark === null ? null : validateHighWaterMark(options.highWaterMark, "options");
    this.observers = [];
    this.lastError = null;
    this.closed = false;
    this.inFlight = 0;
    this.waitingWriters = [];
    const self = this;
    if (this.highWaterMark !== null) {
      this.writableStream = new WritableStream({
        // Delivery runs one microtask after the write call, matching the
        // pump design's timing: the sending side's bookkeeping settles
        // before the receiving side's cascade begins. The sink completes
        // once the delivery handler has released the IP, so the
        // writer-side queue reflects undelivered packets.
        write(ip) {
          return Promise.resolve().then(() => {
            let release = null;
            if (self.deliver) {
              release = self.deliver(ip);
            }
            const finish = () => {
              self.#released();
            };
            if (release && typeof release.then === "function") {
              return release.then(
                () => finish(),
                () => finish()
              );
            }
            finish();
          });
        },
        abort(reason) {
          self.lastError = reason;
        }
      });
      this.writer = this.writableStream.getWriter();
    }
  }
  /**
   * Deliver one IP to the registered handler. If the handler returns a
   * Promise, the completion link is registered so that the release
   * (delivery consumed) frees writer capacity.
   * Handler exceptions propagate synchronously to the caller.
   *
   * @param {any} ip
   */
  #deliver(ip) {
    if (this.deliver) {
      const release = this.deliver(ip);
      if (release && typeof release.then === "function") {
        release.then(
          () => this.#released(),
          () => this.#released()
        );
        return;
      }
      this.#released();
    }
  }
  /**
   * Mark delivery as consumed: decrement in-flight count and admit a
   * parked writer if one is waiting.
   */
  #released() {
    if (this.highWaterMark === null) {
      return;
    }
    this.inFlight -= 1;
    const next = this.waitingWriters.shift();
    if (next) {
      this.inFlight += 1;
      next.resolve();
    }
    const completion = this.pendingSinkCompletion;
    this.pendingSinkCompletion = null;
    if (completion) {
      completion();
    }
  }
  /**
   * Register the delivery handler invoked for each IP entering the edge.
   * At most one handler is active. If the handler returns a Promise, the
   * IP is considered delivered only once that Promise resolves
   * (consumer-paced backpressure).
   *
   * @param {(ip: any) => void | Promise<void>} handler
   * @returns {this}
   */
  onDelivery(handler) {
    this.deliver = handler;
    return this;
  }
  /**
   * Register the error handler invoked when delivery throws. Without
   * one, the error is recorded on the edge and delivery stops.
   *
   * @param {(error: any) => void} handler
   * @returns {this}
   */
  onErrorDelivery(handler) {
    this.onError = handler;
    return this;
  }
  /**
   * Register an observation middleware. Observers run synchronously,
   * in registration order, before an IP is delivered. Each observer
   * receives the IP and a `next()` to continue the chain.
   *
   * @param {(ip: any, next: () => void) => void} callback
   * @returns {this}
   */
  observe(callback) {
    this.observers.push(callback);
    return this;
  }
  /**
   * Track bracket stream integrity across the transport.
   *
   * @param {any} ip
   */
  #validateBrackets(ip) {
    if (!ip || typeof ip !== "object") {
      return;
    }
    if (ip.type === "openBracket") {
      this.bracketDepth = (this.bracketDepth || 0) + 1;
      return;
    }
    if (ip.type === "closeBracket") {
      this.bracketDepth = (this.bracketDepth || 0) - 1;
      if (this.bracketDepth < 0) {
        this.bracketDepth = 0;
        throw new Error(
          "Edge received a closeBracket without a matching openBracket"
        );
      }
    }
  }
  /**
   * Write an IP into the edge. The returned Promise resolves when the
   * write is admitted per the high-water mark: immediately for
   * unbounded edges and while capacity remains for bounded ones; once
   * the packet has been consumed for `highWaterMark: 0`.
   *
   * @param {any} ip
   * @returns {Promise<void>}
   */
  write(ip) {
    if (this.closed) {
      return Promise.reject(new Error("Edge is closed for writing"));
    }
    try {
      this.#validateBrackets(ip);
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.highWaterMark === null) {
      const deliverSync = () => {
        if (this.deliver) {
          const release = this.deliver(ip);
          if (release && typeof release.then === "function") {
            release.then(
              () => this.#released(),
              () => this.#released()
            );
          }
        }
      };
      const observers2 = this.observers;
      if (!observers2.length) {
        deliverSync();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const runObserver = (index) => {
          if (index >= observers2.length) {
            deliverSync();
            resolve();
            return;
          }
          observers2[index](ip, () => runObserver(index + 1));
        };
        runObserver(0);
      });
    }
    const observers = this.observers;
    const admitted = (resolve, reject) => {
      if (this.highWaterMark !== null && this.highWaterMark > 0) {
        this.writer.write(ip).then(null, (error) => {
          this.lastError = error;
        });
        resolve();
        return;
      }
      this.writer.write(ip).then(
        () => resolve(),
        (error) => {
          this.lastError = error;
          reject(error);
        }
      );
    };
    if (!observers.length) {
      return this.#admission().then(
        () => new Promise(admitted),
        (error) => Promise.reject(error)
      );
    }
    return this.#admission().then(
      () => new Promise((resolve, reject) => {
        const runObserver = (index) => {
          if (index >= observers.length) {
            admitted(resolve, reject);
            return;
          }
          observers[index](ip, () => runObserver(index + 1));
        };
        runObserver(0);
      })
    );
  }
  /**
   * Admission control per the resolved high-water mark.
   *
   * @returns {Promise<void>}
   */
  #admission() {
    if (this.highWaterMark === null) {
      return Promise.resolve();
    }
    if (this.highWaterMark === 0) {
      return Promise.resolve();
    }
    if (this.inFlight < this.highWaterMark) {
      this.inFlight += 1;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.waitingWriters.push({ resolve, reject });
    });
  }
  /**
   * Current backpressure signal: how many more IPs can be admitted
   * before writers should wait. Positive means room available.
   *
   * @returns {number|null}
   */
  desiredSize() {
    if (this.highWaterMark === null) {
      return Infinity;
    }
    return this.highWaterMark - this.inFlight;
  }
  /**
   * Close the edge for writing. The delivery handler finishes with the
   * remaining IPs.
   *
   * @returns {Promise<void>}
   */
  close() {
    this.closed = true;
    const parked = this.waitingWriters;
    this.waitingWriters = [];
    for (const waiter of parked) {
      waiter.reject(new Error("Edge is closed for writing"));
    }
    if (this.writer) {
      return this.writer.close();
    }
    return Promise.resolve();
  }
};

// node_modules/@noflo/noflo/src/lib/InternalSocket.js
var InternalSocket_exports = {};
__export(InternalSocket_exports, {
  InternalSocket: () => InternalSocket,
  createSocket: () => createSocket
});
function legacyToIp(event, payload) {
  if (IP.isIP(payload)) {
    return payload;
  }
  switch (event) {
    case "begingroup":
      return new IP("openBracket", payload);
    case "endgroup":
      return new IP("closeBracket");
    case "data":
      return new IP("data", payload);
    default:
      return null;
  }
}
function ipToLegacy(ip) {
  switch (ip.type) {
    case "openBracket":
      return {
        event: "begingroup",
        payload: ip.data
      };
    case "data":
      return {
        event: "data",
        payload: ip.data
      };
    case "closeBracket":
      return {
        event: "endgroup",
        payload: ip.data
      };
    default:
      return null;
  }
}
var InternalSocket = class extends LegacyEventBase {
  /**
   * @private
   */
  regularEmitEvent(event, data) {
    this.dispatchLifecycleEvent(event, data);
  }
  /**
   * @private
   */
  debugEmitEvent(event, data) {
    try {
      this.dispatchLifecycleEvent(event, data);
    } catch (error) {
      if (error.id && error.metadata && error.error) {
        if (this.listeners("error").length === 0) {
          throw error.error;
        }
        this.dispatchLifecycleEvent("error", error);
        return;
      }
      if (this.listeners("error").length === 0) {
        throw error;
      }
      this.dispatchLifecycleEvent("error", {
        id: this.to ? this.to.process.id : null,
        error,
        metadata: this.metadata
      });
    }
  }
  /**
   * @typedef InternalSocketOptions
   * @property {boolean} [debug] - Whether to catch exceptions caused by IP transmission
   * @property {boolean} [async] - Whether IP transmission should be asynchronous
   * @property {number|null} [highWaterMark] - Pre-resolved default (component ∪ runtime levels); the socket's edge metadata still takes precedence
   */
  /**
   * @param {Object<string, any>} [metadata]
   * @param {InternalSocketOptions} [options]
   */
  constructor(metadata = {}, options = {}) {
    super();
    this.metadata = metadata;
    this.brackets = [];
    this.connected = false;
    this.dataDelegate = null;
    this.debug = options.debug || false;
    this.async = options.async || false;
    this.from = null;
    this.to = null;
    this.edge = new Edge({
      highWaterMark: resolveHighWaterMark(metadata, options.highWaterMark)
    });
    this.edge.onDelivery((ip) => this.#deliverIP(ip));
    this.edge.onErrorDelivery((error) => {
      if (this.listeners("error").length === 0) {
        setImmediate(() => {
          throw error;
        });
        return;
      }
      this.dispatchLifecycleEvent("error", {
        id: this.to ? this.to.process.id : null,
        error,
        metadata: this.metadata
      });
    });
  }
  /**
   * Deliver an IP from the edge to the socket's listeners: the modern
   * `ip` event plus the derived legacy event.
   *
   * @param {IP} ip
   */
  #deliverIP(ip) {
    this.emitEvent("ip", ip);
    if (!ip?.type) {
      return;
    }
    const legacy = ipToLegacy(ip);
    if (legacy.event === "connect") {
      this.connected = true;
    }
    if (legacy.event === "disconnect") {
      this.connected = false;
    }
    this.emitEvent(legacy.event, legacy.payload);
  }
  emitEvent(event, data) {
    if (this.debug) {
      if (this.async) {
        makeAsync(() => this.debugEmitEvent(event, data));
        return;
      }
      this.debugEmitEvent(event, data);
      return;
    }
    if (this.async) {
      makeAsync(() => this.regularEmitEvent(event, data));
      return;
    }
    this.regularEmitEvent(event, data);
  }
  // ## Socket connections
  //
  // Sockets that are attached to the ports of processes may be
  // either connected or disconnected. The semantical meaning of
  // a connection is that the outport is in the process of sending
  // data. Disconnecting means an end of transmission.
  //
  // This can be used for example to signal the beginning and end
  // of information packets resulting from the reading of a single
  // file or a database query.
  //
  // Example, disconnecting when a file has been completely read:
  //
  //     readBuffer: (fd, position, size, buffer) ->
  //       fs.read fd, buffer, 0, buffer.length, position, (err, bytes, buffer) =>
  //         # Send data. The first send will also connect if not
  //         # already connected.
  //         @outPorts.out.send buffer.slice 0, bytes
  //         position += buffer.length
  //
  //         # Disconnect when the file has been completely read
  //         return @outPorts.out.disconnect() if position >= size
  //
  //         # Otherwise, call same method recursively
  //         @readBuffer fd, position, size, buffer
  connect() {
    if (this.connected) {
      return;
    }
    this.connected = true;
    this.emitEvent("connect", null);
  }
  disconnect() {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.emitEvent("disconnect", null);
  }
  isConnected() {
    return this.connected;
  }
  // ## Sending information packets
  //
  // The _send_ method is used by a processe's outport to
  // send information packets. The actual packet contents are
  // not defined by NoFlo, and may be any valid JavaScript data
  // structure.
  //
  // The packet contents however should be such that may be safely
  // serialized or deserialized via JSON. This way the NoFlo networks
  // can be constructed with more flexibility, as file buffers or
  // message queues can be used as additional packet relay mechanisms.
  send(data) {
    if (data === void 0 && typeof this.dataDelegate === "function") {
      this.handleSocketEvent("data", this.dataDelegate());
      return;
    }
    this.handleSocketEvent("data", data);
  }
  // ## Sending information packets without open bracket
  //
  // As _connect_ event is considered as open bracket, it needs to be followed
  // by a _disconnect_ event or a closing bracket. In the new simplified
  // sending semantics single IP objects can be sent without open/close brackets.
  /**
   * @param {IP} packet
   * @param {boolean} [autoDisconnect]
   * @returns {Promise<void>|void} Resolves when the packet has been
   *   admitted by the edge per its high-water mark, and rejects on send
   *   errors — which also escalate through the socket error path
   *   (process-error with a listener, loud throw without). Void when the
   *   packet is silently dropped (e.g. a stray bracket closing).
   *   Fire-and-forget compatible: callers may ignore the Promise —
   *   internal handling keeps ignored rejections off the unhandled
   *   channel.
   */
  post(packet, autoDisconnect = true) {
    let ip = packet;
    if (ip === void 0 && typeof this.dataDelegate === "function") {
      ip = this.dataDelegate();
    }
    if (!this.isConnected() && this.brackets.length === 0) {
      this.connect();
    }
    const write = this.handleSocketEvent("ip", ip, false);
    if (write) {
      write.catch(() => {
      });
    }
    if (autoDisconnect && this.isConnected() && this.brackets.length === 0) {
      this.disconnect();
    }
    return write;
  }
  // ## Information Packet grouping
  //
  // Processes sending data to sockets may also group the packets
  // when necessary. This allows transmitting tree structures as
  // a stream of packets.
  //
  // For example, an object could be split into multiple packets
  // where each property is identified by a separate grouping:
  //
  //     # Group by object ID
  //     @outPorts.out.beginGroup object.id
  //
  //     for property, value of object
  //       @outPorts.out.beginGroup property
  //       @outPorts.out.send value
  //       @outPorts.out.endGroup()
  //
  //     @outPorts.out.endGroup()
  //
  // This would cause a tree structure to be sent to the receiving
  // process as a stream of packets. So, an article object may be
  // as packets like:
  //
  // * `/<article id>/title/Lorem ipsum`
  // * `/<article id>/author/Henri Bergius`
  //
  // Components are free to ignore groupings, but are recommended
  // to pass received groupings onward if the data structures remain
  // intact through the component's processing.
  beginGroup(group) {
    this.handleSocketEvent("begingroup", group);
  }
  endGroup() {
    this.handleSocketEvent("endgroup");
  }
  // ## Socket data delegation
  //
  // Sockets have the option to receive data from a delegate function
  // should the `send` method receive undefined for `data`.  This
  // helps in the case of defaulting values.
  setDataDelegate(delegate) {
    if (typeof delegate !== "function") {
      throw Error("A data delegate must be a function.");
    }
    this.dataDelegate = delegate;
  }
  // ## Socket debug mode
  //
  // Sockets can catch exceptions happening in processes when data is
  // sent to them. These errors can then be reported to the network for
  // notification to the developer.
  setDebug(active) {
    this.debug = active;
  }
  // ## Socket identifiers
  //
  // Socket identifiers are mainly used for debugging purposes.
  // Typical identifiers look like _ReadFile:OUT -> Display:IN_,
  // but for sockets sending initial information packets to
  // components may also loom like _DATA -> ReadFile:SOURCE_.
  getId() {
    const fromStr = (from) => `${from.process.id}() ${from.port.toUpperCase()}`;
    const toStr = (to) => `${to.port.toUpperCase()} ${to.process.id}()`;
    if (!this.from && !this.to) {
      return "UNDEFINED";
    }
    if (this.from && !this.to) {
      return `${fromStr(this.from)} -> ANON`;
    }
    if (!this.from) {
      return `DATA -> ${toStr(this.to)}`;
    }
    return `${fromStr(this.from)} -> ${toStr(this.to)}`;
  }
  /* eslint-disable no-param-reassign */
  handleSocketEvent(event, payload, autoConnect = true) {
    const isIP = event === "ip" && IP.isIP(payload);
    const ip = isIP ? payload : legacyToIp(event, payload);
    if (!ip) {
      return;
    }
    if (!this.isConnected() && autoConnect && this.brackets.length === 0) {
      this.connect();
    }
    if (event === "begingroup") {
      this.brackets.push(payload);
    }
    if (isIP && ip.type === "openBracket") {
      this.brackets.push(ip.data);
    }
    if (event === "endgroup") {
      if (this.brackets.length === 0) {
        return;
      }
      ip.data = this.brackets.pop();
      payload = ip.data;
    }
    if (isIP && payload.type === "closeBracket") {
      if (this.brackets.length === 0) {
        return;
      }
      this.brackets.pop();
    }
    const write = this.edge.write(ip);
    write.catch((error) => {
      if (this.listeners("error").length === 0) {
        setImmediate(() => {
          throw error;
        });
        return;
      }
      this.dispatchLifecycleEvent("error", {
        id: this.to ? this.to.process.id : null,
        error,
        metadata: this.metadata
      });
    });
    return write;
  }
};
function createSocket(metadata = {}, options = {}) {
  return new InternalSocket(metadata, options);
}

// node_modules/@noflo/noflo/src/lib/Utils.js
function debounce(func, wait, immediate) {
  let timeout;
  let args;
  let context;
  let timestamp;
  let result;
  function later() {
    const last = Date.now() - timestamp;
    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        if (!timeout) {
          context = null;
          args = null;
        }
      }
    }
  }
  return function after() {
    context = this;
    args = arguments;
    timestamp = Date.now();
    const callNow = immediate && !timeout;
    if (!timeout) {
      timeout = setTimeout(later, wait);
    }
    if (callNow) {
      result = func.apply(context, args);
      context = null;
      args = null;
    }
    return result;
  };
}

// node_modules/@noflo/noflo/src/lib/BaseNetwork.js
function connectPort(socket, process2, port, index, inbound) {
  if (inbound) {
    socket.to = {
      process: process2,
      port,
      index
    };
    if (!process2.component?.inPorts?.ports[port]) {
      return Promise.reject(
        new Error(
          `No inport '${port}' defined in process ${process2.id} (${socket.getId()})`
        )
      );
    }
    if (process2.component.inPorts.ports[port].isAddressable()) {
      process2.component.inPorts.ports[port].attach(socket, index);
      return Promise.resolve(socket);
    }
    process2.component.inPorts.ports[port].attach(socket);
    return Promise.resolve(socket);
  }
  socket.from = {
    process: process2,
    port,
    index
  };
  if (!process2.component?.outPorts?.ports[port]) {
    return Promise.reject(
      new Error(
        `No outport '${port}' defined in process ${process2.id} (${socket.getId()})`
      )
    );
  }
  if (process2.component.outPorts.ports[port].isAddressable()) {
    process2.component.outPorts.ports[port].attach(socket, index);
    return Promise.resolve(socket);
  }
  process2.component.outPorts.ports[port].attach(socket);
  return Promise.resolve(socket);
}
var BaseNetwork = class extends LegacyEventBase {
  /**
   * All NoFlo networks are instantiated with a graph. Upon instantiation
   * they will load all the needed components, instantiate them, and
   * set up the defined connections and IIPs.
   *
   * @param {import("@noflo/graph").GraphModel} graph - Graph definition to build a Network for
   * @param {NetworkOptions} options - Network options
   */
  constructor(graph, options = {}) {
    super();
    this.options = options;
    this.processes = {};
    this.connections = [];
    this.edgeObservers = [];
    this.initials = [];
    this.nextInitials = [];
    this.defaults = [];
    this.graph = graph;
    this.started = false;
    this.stopped = true;
    this.debug = true;
    this.asyncDelivery = options.asyncDelivery || false;
    this.eventBuffer = [];
    this.startupDate = null;
    if (options.componentLoader) {
      this.loader = options.componentLoader;
    } else if (this.graph.graphMetadata().componentLoader) {
      deprecated(
        "Passing componentLoader via Graph properties is deprecated, pass via Network options instead"
      );
      this.loader = this.graph.graphMetadata().componentLoader;
    } else {
      this.loader = new ComponentLoader({
        registry: options.registry
      });
    }
    this.flowtraceName = null;
    this.setFlowtrace(options.flowtrace || false, null);
  }
  // The uptime of the network is the current time minus the start-up
  // time, in seconds.
  /**
   * @returns {number}
   */
  uptime() {
    if (!this.startupDate) {
      return 0;
    }
    return Date.now() - this.startupDate.getTime();
  }
  /**
   * @returns {string[]}
   */
  getActiveProcesses() {
    const active = [];
    if (!this.started) {
      return active;
    }
    Object.keys(this.processes).forEach((name) => {
      const process2 = this.processes[name];
      if (!process2?.component) {
        return;
      }
      if (process2.component.load > 0) {
        active.push(name);
      }
      if (process2.component.__openConnections > 0) {
        active.push(name);
      }
    });
    return active;
  }
  /**
   * @param {string} event
   * @param {any} payload
   * @private
   */
  traceEvent(event, payload) {
    if (!this.flowtrace) {
      return;
    }
    if (this.flowtraceName && this.flowtraceName !== this.flowtrace.mainGraph) {
      return;
    }
    switch (event) {
      case "ip": {
        let type = "data";
        if (payload.type === "openBracket") {
          type = "begingroup";
        } else if (payload.type === "closeBracket") {
          type = "endgroup";
        }
        const src = payload.socket.from ? {
          node: payload.socket.from.process.id,
          port: payload.socket.from.port
        } : null;
        const tgt = payload.socket.to ? {
          node: payload.socket.to.process.id,
          port: payload.socket.to.port
        } : null;
        this.flowtrace.addNetworkPacket(
          `network:${type}`,
          src,
          tgt,
          this.flowtraceName,
          {
            subgraph: payload.subgraph,
            group: payload.group,
            datatype: payload.datatype,
            schema: payload.schema,
            data: payload.data
          }
        );
        break;
      }
      case "start": {
        this.flowtrace.addNetworkStarted(this.flowtraceName);
        break;
      }
      case "end": {
        this.flowtrace.addNetworkStopped(this.flowtraceName);
        break;
      }
      default: {
      }
    }
  }
  /**
   * @param {string} event
   * @param {any} payload
   * @protected
   */
  bufferedEmit(event, payload) {
    this.traceEvent(event, payload);
    if (["icon", "process-error", "end"].includes(event)) {
      this.dispatchLifecycleEvent(event, payload);
      return;
    }
    if (!this.isStarted() && event !== "end") {
      this.eventBuffer.push({
        type: event,
        payload
      });
      return;
    }
    this.dispatchLifecycleEvent(event, payload);
    if (event === "start") {
      this.eventBuffer.forEach((ev) => {
        this.dispatchLifecycleEvent(ev.type, ev.payload);
      });
      this.eventBuffer = [];
    }
    if (event === "ip") {
      switch (payload.type) {
        case "openBracket":
          this.bufferedEmit("begingroup", payload);
          return;
        case "closeBracket":
          this.bufferedEmit("endgroup", payload);
          return;
        case "data":
          this.bufferedEmit("data", payload);
          break;
        default:
      }
    }
  }
  // ## Loading components
  //
  // Components can be passed to the NoFlo network in two ways:
  //
  // * As direct, instantiated JavaScript objects
  // * As filenames
  /**
   * @param {string} component
   * @param {Object<string, any>} metadata
   * @returns {Promise<import("./Component.js").Component>}
   */
  load(component, metadata) {
    return this.loader.load(component, metadata);
  }
  // ## Add a process to the network
  //
  // Processes can be added to a network at either start-up time
  // or later. The processes are added with a node definition object
  // that includes the following properties:
  //
  // * `id`: Identifier of the process in the network. Typically a string
  // * `component`: Filename or path of a NoFlo component, or a component instance object
  /**
   * @callback AddNodeCallback
   * @param {Error|null} error
   * @param {NetworkProcess} [process]
   * @returns {void}
   */
  /**
   * @param {import("@noflo/graph").GraphNode} node
   * @param {Object} options
   * @param {AddNodeCallback} [callback]
   * @returns {Promise<NetworkProcess>}
   */
  addNode(node, options, callback) {
    if (typeof options === "function") {
      callback = /** @type {AddNodeCallback} */
      options;
      options = {};
    }
    let promise;
    if (this.processes[node.entity_id]) {
      promise = Promise.resolve(this.processes[node.entity_id]);
    } else {
      const process2 = { id: node.entity_id };
      if (!node.component) {
        this.processes[process2.id] = process2;
        promise = Promise.resolve(process2);
      } else {
        promise = this.load(node.component, node.metadata).then((instance) => {
          instance.nodeId = node.entity_id;
          process2.component = instance;
          process2.componentName = node.component;
          const inPorts = process2.component.inPorts.ports;
          const outPorts = process2.component.outPorts.ports;
          Object.keys(inPorts).forEach((name) => {
            const port = inPorts[name];
            port.node = node.entity_id;
            port.nodeInstance = instance;
            port.name = name;
          });
          Object.keys(outPorts).forEach((name) => {
            const port = outPorts[name];
            port.node = node.entity_id;
            port.nodeInstance = instance;
            port.name = name;
          });
          if (instance.isSubgraph()) {
            this.subscribeSubgraph(process2);
          }
          this.subscribeNode(process2);
          this.processes[process2.id] = process2;
          return process2;
        });
      }
    }
    return promise;
  }
  /**
   * @param {import("@noflo/graph").GraphNode} node
   * @returns {Promise<void>}
   */
  removeNode(node) {
    const process2 = this.getNode(node.entity_id);
    if (!process2) {
      return Promise.reject(new Error(`Node ${node.entity_id} not found`));
    }
    if (!process2.component) {
      delete this.processes[node.entity_id];
      return Promise.resolve();
    }
    return process2.component.shutdown().then(() => {
      delete this.processes[node.entity_id];
      return Promise.resolve();
    });
  }
  /**
   * @param {string} oldId
   * @param {string} newId
   * @returns {Promise<void>}
   */
  renameNode(oldId, newId) {
    const process2 = this.getNode(oldId);
    if (!process2) {
      return Promise.reject(new Error(`Process ${oldId} not found`));
    }
    process2.id = newId;
    if (process2.component) {
      const inPorts = process2.component.inPorts.ports;
      const outPorts = process2.component.outPorts.ports;
      Object.keys(inPorts).forEach((name) => {
        const port = inPorts[name];
        if (!port) {
          return;
        }
        port.node = newId;
      });
      Object.keys(outPorts).forEach((name) => {
        const port = outPorts[name];
        if (!port) {
          return;
        }
        port.node = newId;
      });
    }
    this.processes[newId] = process2;
    delete this.processes[oldId];
    return Promise.resolve();
  }
  // Get process by its ID.
  /**
   * @param {string} id compone
   * @returns {NetworkProcess|void}
   */
  getNode(id) {
    return this.processes[id];
  }
  /**
   * @returns {Promise<this>}
   */
  connect() {
    const handleAll = (entities, method) => entities.reduce(
      (chain, entity) => chain.then(
        () => this[method](entity, {
          initial: true
        })
      ),
      Promise.resolve()
    );
    const promise = Promise.resolve().then(() => handleAll(this.graph.nodes(), "addNode")).then(() => handleAll(this.graph.edges(), "addEdge")).then(() => handleAll(this.graph.iips(), "addInitial")).then(() => handleAll(this.graph.nodes(), "addDefaults")).then(() => this);
    return promise;
  }
  /**
   * @private
   * @param {NetworkProcess} node
   */
  subscribeSubgraph(node) {
    if (!node.component) {
      return;
    }
    if (!node.component.isReady()) {
      const onReady = (_event) => {
        node.component.removeEventListener("ready", onReady);
        this.subscribeSubgraph(node);
      };
      node.component.addEventListener("ready", onReady);
      return;
    }
    const instance = (
      /** @type {import("../components/Subgraph.js").Subgraph} */
      node.component
    );
    if (!instance.network) {
      return;
    }
    instance.network.setDebug(this.debug);
    instance.network.setAsyncDelivery(this.asyncDelivery);
    if (this.flowtrace) {
      instance.network.setFlowtrace(this.flowtrace, node.componentName, false);
    }
    const emitSub = (type, data) => {
      if (type === "process-error" && this.listeners("process-error").length === 0) {
        if (data.id && data.metadata && data.error) {
          throw data.error;
        }
        throw data;
      }
      if (!data) {
        data = {};
      }
      if (data.subgraph) {
        if (!data.subgraph.unshift) {
          data.subgraph = [data.subgraph];
        }
        data.subgraph.unshift(node.id);
      } else {
        data.subgraph = [node.id];
      }
      this.bufferedEmit(type, data);
    };
    instance.network.addEventListener("ip", (event) => {
      emitSub("ip", event.detail);
    });
    instance.network.addEventListener("process-error", (event) => {
      emitSub("process-error", event.detail);
    });
  }
  // Subscribe to events from all connected sockets and re-emit them
  /**
   * @param {internalSocket.InternalSocket} socket
   * @param {NetworkProcess} [source]
   */
  subscribeSocket(socket, source) {
    socket.edge.observe((ip, next) => {
      let advanced = false;
      const advance = () => {
        if (advanced) {
          return;
        }
        advanced = true;
        next();
      };
      for (const observer of this.edgeObservers) {
        observer(ip, socket, advance);
      }
      advance();
    });
    socket.addEventListener("ip", (event) => {
      const ip = event.detail;
      this.bufferedEmit("ip", {
        id: socket.getId(),
        type: ip.type,
        socket,
        data: ip.data,
        metadata: socket.metadata
      });
    });
    socket.addEventListener("error", (event) => {
      const errEvent = event.detail;
      if (this.listeners("process-error").length === 0) {
        if (errEvent.id && errEvent.metadata && errEvent.error) {
          throw errEvent.error;
        }
        throw errEvent;
      }
      this.bufferedEmit("process-error", errEvent);
    });
    if (!source?.component?.isLegacy()) {
      return;
    }
    const comp = (
      /** @type {import("./Component.js").Component} */
      source.component
    );
    socket.addEventListener("connect", () => {
      if (!comp.__openConnections) {
        comp.__openConnections = 0;
      }
      comp.__openConnections += 1;
    });
    socket.addEventListener("disconnect", () => {
      comp.__openConnections -= 1;
      if (comp.__openConnections < 0) {
        comp.__openConnections = 0;
      }
      if (comp.__openConnections === 0) {
        this.checkIfFinished();
      }
    });
  }
  /**
   * @param {NetworkProcess} node
   */
  subscribeNode(node) {
    if (!node.component) {
      return;
    }
    const instance = (
      /** @type {import("./Component.js").Component} */
      node.component
    );
    instance.addEventListener("activate", () => {
      if (this.debouncedEnd) {
        this.abortDebounce = true;
      }
    });
    instance.addEventListener(
      "deactivate",
      /** @param {Event & { detail: number }} event */
      (event) => {
        if (event.detail > 0) {
          return;
        }
        this.checkIfFinished();
      }
    );
    if (!instance.getIcon) {
      return;
    }
    instance.addEventListener("icon", () => {
      this.bufferedEmit("icon", {
        id: node.id,
        icon: instance.getIcon()
      });
    });
  }
  /**
   * @protected
   * @param {string} node
   * @param {string} direction
   * @returns Promise<NetworkProcess>
   */
  ensureNode(node, direction) {
    const instance = this.getNode(node);
    if (!instance) {
      return Promise.reject(
        new Error(`No process defined for ${direction} node ${node}`)
      );
    }
    if (!instance.component) {
      return Promise.reject(
        new Error(`No component defined for ${direction} node ${node}`)
      );
    }
    const comp = (
      /** @type {import("./Component.js").Component} */
      instance.component
    );
    if (!comp.isReady()) {
      return new Promise((resolve) => {
        const onReady = (_event) => {
          comp.removeEventListener("ready", onReady);
          resolve(instance);
        };
        comp.addEventListener("ready", onReady);
      });
    }
    return Promise.resolve(instance);
  }
  /**
   * Register a transport-level observer for every edge in this network:
   * the middleware sees each Information Packet on each edge before it is
   * delivered, as `(ip, socket, next)`. Call `next()` to continue delivery.
   * Applies to edges wired before and after registration. This is the
   * observability hook for fbp-protocol and Flowtrace; packet tracing via
   * network events is unaffected.
   *
   * @param {(ip: any, socket: internalSocket.InternalSocket, next: () => void) => void} callback
   * @returns {this}
   */
  observe(callback) {
    this.edgeObservers.push(callback);
    return this;
  }
  /**
   * @param {import("@noflo/graph").GraphEdge} edge
   * @param {Object} [_options]
   * @returns {Promise<internalSocket.InternalSocket>}
   */
  addEdge(edge, _options = {}) {
    const promise = this.ensureNode(edge.from.node, "outbound").then((from) => {
      const sourcePort = (
        /** @type {any} */
        from.component.outPorts.ports[edge.from.port]
      );
      const portDefault = sourcePort?.options?.highWaterMark;
      const socket = createSocket(edge.metadata, {
        debug: this.debug,
        async: this.asyncDelivery,
        highWaterMark: resolveHighWaterMark(
          void 0,
          portDefault,
          this.options.highWaterMark
        )
      });
      return this.ensureNode(edge.to.node, "inbound").then((to) => {
        this.subscribeSocket(socket, from);
        return connectPort(socket, to, edge.to.port, edge.to.index, true);
      }).then(
        () => connectPort(socket, from, edge.from.port, edge.from.index, false)
      ).then(() => {
        this.connections.push(socket);
        return socket;
      });
    });
    return promise;
  }
  /**
   * @param {import("@noflo/graph").GraphEdge} edge
   * @returns {Promise<void>}
   */
  removeEdge(edge) {
    this.connections.forEach((connection) => {
      if (!connection) {
        return;
      }
      if (edge.to.node !== connection.to.process.id || edge.to.port !== connection.to.port) {
        return;
      }
      connection.to.process.component.inPorts[connection.to.port].detach(
        connection
      );
      if (edge.from.node) {
        if (connection.from && edge.from.node === connection.from.process.id && edge.from.port === connection.from.port) {
          connection.from.process.component.outPorts[connection.from.port].detach(connection);
        }
      }
      this.connections.splice(this.connections.indexOf(connection), 1);
    });
    return Promise.resolve();
  }
  /**
   * @protected
   * @param {import("@noflo/graph").GraphNode} node
   * @returns {Promise<void>}
   */
  addDefaults(node) {
    return this.ensureNode(node.entity_id, "inbound").then(
      (process2) => Promise.all(
        Object.keys(process2.component.inPorts.ports).map((key) => {
          const port = process2.component.inPorts.ports[key];
          if (!port.hasDefault() || port.isAttached()) {
            return Promise.resolve();
          }
          const socket = createSocket(
            {},
            {
              debug: this.debug,
              async: this.asyncDelivery
            }
          );
          this.subscribeSocket(socket);
          return connectPort(socket, process2, key, void 0, true).then(
            () => {
              this.connections.push(socket);
              this.defaults.push(socket);
            }
          );
        })
      )
    ).then(() => {
    });
  }
  /**
   * @param {import("@noflo/graph").GraphIIP} initializer
   * @param {Object} [_options]
   * @returns {Promise<internalSocket.InternalSocket>}
   */
  addInitial(initializer, _options = {}) {
    const promise = this.ensureNode(initializer.to.node, "inbound").then((to) => {
      const socket = createSocket(initializer.metadata, {
        debug: this.debug,
        async: this.asyncDelivery
      });
      this.subscribeSocket(socket);
      return connectPort(
        socket,
        to,
        initializer.to.port,
        initializer.to.index,
        true
      );
    }).then((socket) => {
      this.connections.push(socket);
      const init = {
        socket,
        data: initializer.from.data
      };
      this.initials.push(init);
      this.nextInitials.push(init);
      if (this.isRunning()) {
        this.sendInitials();
      } else if (!this.isStopped()) {
        this.setStarted(true);
        this.sendInitials();
      }
      return socket;
    });
    return promise;
  }
  /**
   * @param {import("@noflo/graph").GraphIIP} initializer
   * @returns {Promise<void>}
   */
  removeInitial(initializer) {
    this.connections.forEach((connection) => {
      if (!connection) {
        return;
      }
      if (initializer.to.node !== connection.to.process.id || initializer.to.port !== connection.to.port) {
        return;
      }
      connection.to.process.component.inPorts[connection.to.port].detach(
        connection
      );
      this.connections.splice(this.connections.indexOf(connection), 1);
      for (let i = 0; i < this.initials.length; i += 1) {
        const init = this.initials[i];
        if (!init) {
          return;
        }
        if (init.socket !== connection) {
          return;
        }
        this.initials.splice(this.initials.indexOf(init), 1);
      }
      for (let i = 0; i < this.nextInitials.length; i += 1) {
        const init = this.nextInitials[i];
        if (!init) {
          return;
        }
        if (init.socket !== connection) {
          return;
        }
        this.nextInitials.splice(this.nextInitials.indexOf(init), 1);
      }
    });
    return Promise.resolve();
  }
  /**
   * @returns Promise<void>
   */
  sendInitials() {
    return new Promise((resolve) => {
      makeAsync(resolve, true);
    }).then(
      () => this.initials.reduce(
        (chain, initial) => chain.then(() => {
          initial.socket.post(
            new IP("data", initial.data, {
              initial: true
            })
          );
          return Promise.resolve();
        }),
        Promise.resolve()
      )
    ).then(() => {
      this.initials = [];
      return Promise.resolve();
    });
  }
  isStarted() {
    return this.started;
  }
  isStopped() {
    return this.stopped;
  }
  isRunning() {
    return this.getActiveProcesses().length > 0;
  }
  /**
   * @protected
   * @returns {Promise<void>}
   */
  startComponents() {
    if (!this.processes || !Object.keys(this.processes).length) {
      return Promise.resolve();
    }
    return Promise.all(
      Object.keys(this.processes).map((id) => {
        const process2 = this.processes[id];
        if (!process2.component) {
          return Promise.resolve();
        }
        return process2.component.start();
      })
    ).then(() => {
    });
  }
  /**
   * @returns Promise<void>
   */
  sendDefaults() {
    return Promise.all(
      this.defaults.map((socket) => {
        if (socket.to.process.component.inPorts[socket.to.port].sockets.length !== 1) {
          return Promise.resolve();
        }
        socket.connect();
        socket.send();
        socket.disconnect();
        return Promise.resolve();
      })
    ).then(() => {
    });
  }
  /**
   * @returns {Promise<this>}
   */
  start() {
    if (this.debouncedEnd) {
      this.abortDebounce = true;
    }
    if (this.started) {
      return this.stop().then(() => this.start());
    }
    this.initials = this.nextInitials.slice(0);
    this.eventBuffer = [];
    return this.startComponents().then(() => this.sendInitials()).then(() => this.sendDefaults()).then(() => {
      this.setStarted(true);
      return Promise.resolve(this);
    });
  }
  /**
   * @returns {Promise<this>}
   */
  stop() {
    if (this.debouncedEnd) {
      this.abortDebounce = true;
    }
    if (!this.started) {
      this.stopped = true;
      return Promise.resolve(this);
    }
    this.connections.forEach((connection) => {
      if (!connection.isConnected()) {
        return;
      }
      connection.disconnect();
    });
    if (!this.processes || !Object.keys(this.processes).length) {
      this.setStarted(false);
      this.stopped = true;
      return Promise.resolve(this);
    }
    return Promise.all(
      Object.keys(this.processes).map((id) => {
        if (!this.processes[id].component) {
          return Promise.resolve();
        }
        const comp = (
          /** @type {import("./Component.js").Component} */
          this.processes[id].component
        );
        return comp.shutdown();
      })
    ).then(() => {
      this.setStarted(false);
      this.stopped = true;
      return Promise.resolve(this);
    });
  }
  /**
   * @param {boolean} started
   */
  setStarted(started) {
    if (this.started === started) {
      return;
    }
    if (!started) {
      this.started = false;
      this.bufferedEmit("end", {
        start: this.startupDate,
        end: /* @__PURE__ */ new Date(),
        uptime: this.uptime()
      });
      return;
    }
    if (!this.startupDate) {
      this.startupDate = /* @__PURE__ */ new Date();
    }
    this.started = true;
    this.stopped = false;
    this.bufferedEmit("start", {
      start: this.startupDate
    });
  }
  checkIfFinished() {
    if (this.isRunning()) {
      return;
    }
    delete this.abortDebounce;
    if (!this.debouncedEnd) {
      this.debouncedEnd = debounce(() => {
        if (this.abortDebounce) {
          return;
        }
        if (this.isRunning()) {
          return;
        }
        this.setStarted(false);
      }, 50);
    }
    this.debouncedEnd();
  }
  getDebug() {
    return this.debug;
  }
  /**
   * @param {boolean} active
   */
  setDebug(active) {
    if (active === this.debug) {
      return;
    }
    this.debug = active;
    this.connections.forEach((socket) => {
      socket.setDebug(active);
    });
    Object.keys(this.processes).forEach((processId) => {
      const process2 = this.processes[processId];
      if (!process2.component) {
        return;
      }
      const instance = process2.component;
      if (instance.isSubgraph()) {
        const inst = (
          /** @type {import("../components/Subgraph.js").Subgraph} */
          instance
        );
        inst.network.setDebug(active);
      }
    });
  }
  /**
   * @param {boolean} active
   */
  setAsyncDelivery(active) {
    if (active === this.asyncDelivery) {
      return;
    }
    this.asyncDelivery = active;
    this.connections.forEach((socket) => {
      socket.async = this.asyncDelivery;
    });
    Object.keys(this.processes).forEach((processId) => {
      const process2 = this.processes[processId];
      if (!process2.component) {
        return;
      }
      const instance = process2.component;
      if (instance.isSubgraph()) {
        const inst = (
          /** @type {import("../components/Subgraph.js").Subgraph} */
          instance
        );
        inst.network.setAsyncDelivery(active);
      }
    });
  }
  /**
   * @param {Object|null} flowtrace
   * @param {string|null} [name]
   * @param {boolean} [main]
   */
  setFlowtrace(flowtrace, name = null, main = true) {
    if (!flowtrace) {
      this.flowtraceName = null;
      this.flowtrace = null;
      return;
    }
    if (this.flowtrace) {
      return;
    }
    this.flowtrace = flowtrace;
    this.flowtraceName = name || this.graph.name;
    this.flowtrace.addGraph(
      this.flowtraceName,
      exportFbpJson(this.graph),
      main
    );
    Object.keys(this.processes).forEach((nodeId) => {
      const node = this.processes[nodeId];
      const inst = (
        /** @type {import("../components/Subgraph.js").Subgraph} */
        node.component
      );
      if (!inst.isSubgraph() || !inst.network) {
        return;
      }
      inst.network.setFlowtrace(this.flowtrace, node.componentName, false);
    });
  }
};

// node_modules/@noflo/noflo/src/lib/Network.js
var Network = class extends BaseNetwork {
  // Add a process to the network. The node will also be registered
  // with the current graph.
  /**
   * @param {import("@noflo/graph").GraphNode} node
   * @param {Object} options
   * @returns {Promise<NetworkProcess>}
   */
  /**
   * @param {import("@noflo/graph").GraphNode} node
   * @param {Object} [options]
   * @returns {Promise<NetworkProcess>}
   */
  addNode(node, options = {}) {
    return super.addNode(node, options).then((process2) => {
      if (!options.initial && !this.graph.hasNode(node.entity_id)) {
        this.graph.addNode(node);
      }
      return process2;
    });
  }
  // Remove a process from the network. The node will also be removed
  // from the current graph.
  removeNode(node) {
    return super.removeNode(node).then(() => {
      this.graph.removeNode(node.entity_id);
    });
  }
  // Rename a process in the network. Renaming a process also modifies
  // the current graph.
  renameNode(oldId, newId) {
    return super.renameNode(oldId, newId).then(() => {
      this.graph.renameNode(oldId, newId);
    });
  }
  // Add a connection to the network. The edge will also be registered
  // with the current graph.
  addEdge(edge, options = {}) {
    return super.addEdge(edge, options).then((socket) => {
      if (!options.initial) {
        this.graph.addEdge({
          from: edge.from,
          to: edge.to,
          ...edge.metadata === void 0 ? {} : { metadata: edge.metadata }
        });
      }
      return socket;
    });
  }
  // Remove a connection from the network. The edge will also be removed
  // from the current graph.
  removeEdge(edge) {
    return super.removeEdge(edge).then(() => {
      this.removeGraphEdge(edge);
    });
  }
  // Add an IIP to the network. The IIP will also be registered with the
  // current graph. If the network is running, the IIP will be sent immediately.
  addInitial(iip, options = {}) {
    return super.addInitial(iip, options).then((socket) => {
      if (!options.initial) {
        this.graph.addIIP({
          data: iip.from.data,
          to: iip.to,
          ...iip.metadata === void 0 ? {} : { metadata: iip.metadata }
        });
      }
      return socket;
    });
  }
  // Remove an IIP from the network. The IIP will also be removed from the
  // current graph.
  removeInitial(iip) {
    return super.removeInitial(iip).then(() => {
      this.removeGraphIIP(iip);
    });
  }
  /**
   * Remove the edge matching the given connection from the graph.
   *
   * @param {import("@noflo/graph").GraphEdge} edge
   * @returns {void}
   */
  removeGraphEdge(edge) {
    const match = this.graph.edges().find(
      (candidate) => sameRef(candidate.from, edge.from) && sameRef(candidate.to, edge.to)
    );
    if (!match) {
      throw new Error(
        `No edge from ${edge.from.node}:${edge.from.port} to ${edge.to.node}:${edge.to.port} to remove`
      );
    }
    this.graph.removeEdge(match.entity_id);
  }
  /**
   * Remove the IIP matching the given initializer from the graph.
   *
   * @param {import("@noflo/graph").GraphIIP} iip
   * @returns {void}
   */
  removeGraphIIP(iip) {
    const match = this.graph.iips().find((candidate) => sameRef(candidate.to, iip.to));
    if (!match) {
      throw new Error(
        `No IIP targeting ${iip.to.node}:${iip.to.port} to remove`
      );
    }
    this.graph.removeIIP(match.entity_id);
  }
};

// node_modules/@noflo/noflo/src/lib/AsCallback.js
function normalizeOptions(options, component) {
  if (!options) {
    options = {};
  }
  if (!options.name && typeof component === "string") {
    options.name = component;
  }
  if (!options.loader) {
    options.loader = new ComponentLoader({
      registry: options.registry
    });
  }
  if (!options.raw) {
    options.raw = false;
  }
  if (!options.asyncDelivery) {
    options.asyncDelivery = false;
  }
  return options;
}
function prepareNetwork(component, options) {
  if (component instanceof GraphModel) {
    const network = new Network(component, {
      ...options,
      componentLoader: options.loader
    });
    return network.connect();
  }
  if (!options.loader) {
    return Promise.reject(new Error("No component loader provided"));
  }
  return options.loader.load(component, {}).then((instance) => {
    const graph = new GraphModel(
      options.name === void 0 ? {} : { name: options.name }
    );
    const nodeName = options.name || "AsCallback";
    graph.addNode({ entity_id: nodeName, component });
    const inPorts = instance.inPorts.ports;
    const outPorts = instance.outPorts.ports;
    Object.keys(inPorts).forEach((port) => {
      graph.addExport({
        direction: "inport",
        public: port,
        internal: { node: nodeName, port }
      });
    });
    Object.keys(outPorts).forEach((port) => {
      graph.addExport({
        direction: "outport",
        public: port,
        internal: { node: nodeName, port }
      });
    });
    const network = new Network(graph, {
      ...options,
      componentLoader: options.loader
    });
    return network.connect();
  });
}
function runNetwork(network, inputs) {
  return new Promise((resolve, reject) => {
    let inSockets = {};
    const received = [];
    const outPorts = network.graph.exports().filter((exp) => exp.direction === "outport");
    let outSockets = {};
    outPorts.forEach((portDef) => {
      const process2 = network.getNode(portDef.internal.node);
      if (!process2) {
        return;
      }
      if (!process2.component) {
        return;
      }
      outSockets[portDef.public] = createSocket(
        {},
        {
          debug: false
        }
      );
      network.subscribeSocket(outSockets[portDef.public]);
      process2.component.outPorts.ports[portDef.internal.port].attach(
        outSockets[portDef.public]
      );
      outSockets[portDef.public].from = {
        process: process2,
        port: portDef.internal.port
      };
      outSockets[portDef.public].addEventListener("ip", (event) => {
        const ip = event.detail;
        const res = {};
        res[portDef.public] = ip;
        received.push(res);
      });
    });
    let onEnd;
    const onError = (event) => {
      network.removeEventListener("process-error", onError);
      const err = event.detail;
      reject(err.error);
      network.removeEventListener("end", onEnd);
    };
    network.addEventListener("process-error", onError);
    onEnd = () => {
      network.removeEventListener("end", onEnd);
      Object.keys(outSockets).forEach((port) => {
        const socket = outSockets[port];
        socket.from.process.component.outPorts[socket.from.port].detach(socket);
      });
      outSockets = {};
      inSockets = {};
      resolve(received);
      network.removeEventListener("process-error", onError);
    };
    network.addEventListener("end", onEnd);
    network.start().then(() => {
      for (let i = 0; i < inputs.length; i += 1) {
        const inputMap = inputs[i];
        const keys = Object.keys(inputMap);
        for (let j = 0; j < keys.length; j += 1) {
          const port = keys[j];
          const value = inputMap[port];
          if (!inSockets[port]) {
            const portDef = network.graph.exports().find((exp) => exp.direction === "inport" && exp.public === port);
            if (!portDef) {
              reject(new Error(`Port ${port} not available in the graph`));
              return;
            }
            const process2 = network.getNode(portDef.internal.node);
            if (!process2) {
              reject(
                new Error(
                  `Process ${portDef.internal.node} for port ${port} not available in the graph`
                )
              );
              return;
            }
            if (!process2.component) {
              reject(
                new Error(
                  `Process ${portDef.internal.node} for port ${port} not available in the graph`
                )
              );
              return;
            }
            inSockets[port] = createSocket(
              {},
              {
                debug: false
              }
            );
            network.subscribeSocket(inSockets[port]);
            inSockets[port].to = {
              process: process2,
              port
            };
            process2.component.inPorts.ports[portDef.internal.port].attach(
              inSockets[port]
            );
          }
          try {
            if (IP.isIP(value)) {
              inSockets[port].post(value);
            } else {
              inSockets[port].post(new IP("data", value));
            }
          } catch (e) {
            reject(e);
            network.removeEventListener("process-error", onError);
            network.removeEventListener("end", onEnd);
            return;
          }
        }
      }
    }, reject);
  });
}
function getType(inputs, network) {
  if (typeof inputs !== "object" || !inputs) {
    return "simple";
  }
  if (Array.isArray(inputs)) {
    const maps = inputs.filter((entry) => getType(entry, network) === "map");
    if (maps.length === inputs.length) {
      return "sequence";
    }
    return "simple";
  }
  const keys = Object.keys(inputs);
  if (!keys.length) {
    return "simple";
  }
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (!network.graph.exports().some((exp) => exp.direction === "inport" && exp.public === key)) {
      return "simple";
    }
  }
  return "map";
}
function prepareInputMap(inputs, inputType, network) {
  if (inputType === "sequence") {
    return inputs;
  }
  if (inputType === "map") {
    return [inputs];
  }
  const exportedInports = network.graph.exports().filter((exp) => exp.direction === "inport");
  let inPort = exportedInports.length > 0 ? exportedInports[0].public : null;
  if (!inPort) {
    return {};
  }
  if (exportedInports.some((exp) => exp.public === "in")) {
    inPort = "in";
  }
  const map = {};
  map[inPort] = inputs;
  return [map];
}
function normalizeOutput(values, options) {
  if (options.raw) {
    return values;
  }
  const result = [];
  let previous = null;
  let current = result;
  values.forEach((packet) => {
    if (packet.type === "openBracket") {
      previous = current;
      current = [];
      previous.push(current);
    }
    if (packet.type === "data") {
      current.push(packet.data);
    }
    if (packet.type === "closeBracket") {
      current = /** @type {Array<any>} */
      previous;
    }
  });
  if (result.length === 1) {
    return result[0];
  }
  return result;
}
function sendOutputMap(outputs, resultType, options) {
  const errors = outputs.filter((map) => map.error != null).map((map) => map.error);
  if (errors.length) {
    return Promise.reject(normalizeOutput(errors, options));
  }
  if (resultType === "sequence") {
    return Promise.resolve(
      outputs.map((map) => {
        const res = {};
        Object.keys(map).forEach((key) => {
          const val = map[key];
          if (options.raw) {
            res[key] = val;
            return;
          }
          res[key] = normalizeOutput([val], options);
        });
        return res;
      })
    );
  }
  const mappedOutputs = {};
  outputs.forEach((map) => {
    Object.keys(map).forEach((key) => {
      const val = map[key];
      if (!mappedOutputs[key]) {
        mappedOutputs[key] = [];
      }
      mappedOutputs[key].push(val);
    });
  });
  const outputKeys = Object.keys(mappedOutputs);
  const withValue = outputKeys.filter(
    (outport) => mappedOutputs[outport].length > 0
  );
  if (withValue.length === 0) {
    return Promise.resolve(null);
  }
  if (withValue.length === 1 && resultType === "simple") {
    return Promise.resolve(
      normalizeOutput(mappedOutputs[withValue[0]], options)
    );
  }
  const result = {};
  Object.keys(mappedOutputs).forEach((port) => {
    const packets = mappedOutputs[port];
    result[port] = normalizeOutput(packets, options);
  });
  return Promise.resolve(result);
}
function asPromise(component, options) {
  if (!component) {
    throw new Error("No component or graph provided");
  }
  options = normalizeOptions(options, component);
  return (inputs) => prepareNetwork(component, options).then((network) => {
    if (options.networkCallback) {
      options.networkCallback(network);
    }
    const resultType = getType(inputs, network);
    const inputMap = prepareInputMap(inputs, resultType, network);
    return runNetwork(network, inputMap).then(
      (outputMap) => sendOutputMap(outputMap, resultType, options)
    );
  });
}
function asCallback(component, options) {
  const promised = asPromise(component, options);
  return (inputs, callback) => {
    promised(inputs).then((output) => {
      callback(null, output);
    }, callback);
  };
}

// node_modules/@noflo/noflo/src/lib/NoFlo.js
function createNetwork(graphInstance, options = {}) {
  const network = new Network(graphInstance, options);
  const promise = network.loader.listComponents().then(() => {
    if (options.delay) {
      return Promise.resolve(network);
    }
    const connected = (
      /** @type {Promise<Network>} */
      network.connect()
    );
    return connected.then(() => network.start());
  });
  return promise;
}
var NoFlo_default = {
  isBrowser,
  GraphModel,
  importFbpJson,
  exportFbpJson,
  ComponentLoader,
  Component,
  InPorts,
  OutPorts,
  InPort,
  OutPort,
  internalSocket: InternalSocket_exports,
  IP,
  createNetwork,
  asCallback,
  asPromise
};
export {
  Component,
  ComponentLoader,
  GraphModel,
  IP,
  InPort,
  InPorts,
  OutPort,
  OutPorts,
  asCallback,
  asPromise,
  createNetwork,
  NoFlo_default as default,
  exportFbpJson,
  importFbpJson,
  InternalSocket_exports as internalSocket,
  isBrowser
};
