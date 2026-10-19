// node_modules/@noflo/graph/src/graph/entities.js
var entityKinds = ["node", "edge", "iip", "export", "group"];
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
function foldCase(document) {
  const foldPort = (name, field) => {
    if (name === void 0) {
      return name;
    }
    if (typeof name !== "string") {
      throw new GraphModelError(
        `${field} must be a string; the caseSensitive: false normalization does not coerce`
      );
    }
    return name.toLowerCase();
  };
  const folded = { ...document };
  folded.edges = (document.edges ?? []).map((edge) => ({
    ...edge,
    source: edge.source?.port !== void 0 ? {
      ...edge.source,
      port: foldPort(edge.source.port, "edge.source.port")
    } : edge.source,
    target: edge.target?.port !== void 0 ? {
      ...edge.target,
      port: foldPort(edge.target.port, "edge.target.port")
    } : edge.target
  }));
  folded.inits = (document.inits ?? document.case ?? []).map((iip) => ({
    ...iip,
    target: iip.target?.port !== void 0 ? { ...iip.target, port: foldPort(iip.target.port, "iip.target.port") } : iip.target
  }));
  delete folded.case;
  const foldExports = (direction, defs) => {
    const foldedDefs = {};
    const seen = /* @__PURE__ */ new Map();
    for (const [name, def] of Object.entries(defs ?? {})) {
      const normalized = foldPort(name, `${direction} export name`);
      if (seen.has(normalized)) {
        throw new GraphModelError(
          `caseSensitive: false normalization collides on ${direction} '${normalized}': the document declares both '${seen.get(normalized)}' and '${name}'`
        );
      }
      seen.set(normalized, name);
      foldedDefs[normalized] = {
        ...def,
        port: foldPort(def?.port, `${direction} port`)
      };
    }
    return foldedDefs;
  };
  folded.inports = foldExports("inport", document.inports);
  folded.outports = foldExports("outport", document.outports);
  return folded;
}
function importFbpJson(json) {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    throw new GraphModelError("FBP JSON document must be an object");
  }
  const document = normalizeLegacyFbpJson(json);
  const source = json.caseSensitive === false ? foldCase(document) : document;
  const options = (
    /** @type {GraphModelOptions} */
    {}
  );
  if (json.name !== void 0) {
    options.name = requireString(json.name, "name");
  }
  const model = new GraphModel(options);
  for (const [key, value] of Object.entries(source.properties ?? {})) {
    model.setGraphMetadata(key, value);
  }
  for (const node of source.nodes ?? []) {
    model.addNode({
      entity_id: requireString(node?.id, "node.id"),
      ...node?.component === void 0 ? {} : { component: requireString(node.component, "node.component") },
      ...node?.metadata === void 0 ? {} : { metadata: node.metadata }
    });
  }
  for (const edge of source.edges ?? []) {
    model.addEdge({
      from: jsonPortRef(edge?.source, "edge.source"),
      to: jsonPortRef(edge?.target, "edge.target"),
      ...edge?.metadata === void 0 ? {} : { metadata: edge.metadata }
    });
  }
  const iips = source.inits ?? source.case ?? [];
  for (const iip of iips) {
    model.addIIP({
      data: iip?.data,
      to: jsonPortRef(iip?.target, "iip.target"),
      ...iip?.metadata === void 0 ? {} : { metadata: iip.metadata }
    });
  }
  for (const [publicName, def] of Object.entries(source.inports ?? {})) {
    model.addExport({
      direction: "inport",
      public: publicName,
      internal: jsonPortRef(
        {
          id: def?.process,
          port: def?.port,
          ...def?.index === void 0 ? {} : { index: def.index }
        },
        `inports.${publicName}`
      ),
      ...withDefinedMetadata(exportMetadata(def))
    });
  }
  for (const [publicName, def] of Object.entries(source.outports ?? {})) {
    model.addExport({
      direction: "outport",
      public: publicName,
      internal: jsonPortRef(
        {
          id: def?.process,
          port: def?.port,
          ...def?.index === void 0 ? {} : { index: def.index }
        },
        `outports.${publicName}`
      ),
      ...withDefinedMetadata(exportMetadata(def))
    });
  }
  for (const group of source.groups ?? []) {
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
  if (json.inits !== void 0) {
    document.inits = json.inits;
  } else if (json.case !== void 0) {
    document.case = json.case;
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
export {
  GraphModel,
  GraphModelError,
  entityKinds,
  exportFbpJson,
  importFbpJson,
  sameRef,
  stableStringify
};
