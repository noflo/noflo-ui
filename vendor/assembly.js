// node_modules/@noflo/assembly/src/index.js
import { Component as NoFloComponent } from "./noflo.js";

// node_modules/@noflo/graph/src/graph/entities.js
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

// node_modules/@noflo/assembly/src/asAssembly.js
function summarizePorts(inner) {
  if (!inner?.inPorts?.ports || !inner?.outPorts?.ports) {
    throw new TypeError(
      `asAssembly: the target must be a component instance with inPorts and outPorts \u2014 got ${inner === null ? "null" : typeof inner}${inner?.constructor ? ` (${inner.constructor.name})` : ""}`
    );
  }
  const inports = [];
  const outports = [];
  for (const [name, port] of Object.entries(inner.inPorts.ports)) {
    inports.push({
      name,
      addressable: port.isAddressable(),
      control: Boolean(port.options?.control),
      required: Boolean(port.options?.required)
    });
  }
  for (const [name, port] of Object.entries(inner.outPorts.ports)) {
    const summary = {
      name,
      addressable: port.isAddressable(),
      control: false,
      required: false
    };
    outports.push(summary);
  }
  const hasError = outports.some((p) => p.name === "error");
  return {
    inports: inports.filter((p) => p.name !== "error"),
    outports: outports.filter((p) => p.name !== "error"),
    hasError
  };
}
function resolveInMapping(inports, mapping = {}) {
  const resolved = {};
  for (const port of inports) {
    if (port.control) {
      continue;
    }
    const override = mapping.in?.[port.name];
    resolved[port.name] = override === void 0 ? port.name : override;
  }
  return resolved;
}
function resolveOutMapping(outports, mapping = {}) {
  const resolved = {};
  for (const port of outports) {
    const override = mapping.out?.[port.name];
    if (override !== void 0 && typeof override !== "string") {
      throw new TypeError(
        `asAssembly: mapping.out for port '${port.name}' must be a field name string (got ${JSON.stringify(override)})`
      );
    }
    resolved[port.name] = override === void 0 ? port.name : override;
  }
  return resolved;
}
function asAssembly(inner, options) {
  if (!options?.target) {
    throw new Error(
      "asAssembly requires options.target: the registry-resolvable name of the inner component"
    );
  }
  if (inner instanceof Component) {
    throw new Error(
      "asAssembly: component is already an assembly participant \u2014 use it directly in the assembly graph; asAssembly bridges regular Process API components only"
    );
  }
  const { inports, outports, hasError } = summarizePorts(inner);
  for (const port of [...inports, ...outports]) {
    if (port.addressable) {
      throw new Error(
        `asAssembly: inner component has an addressable port '${port.name}' \u2014 addressable ports are not supported by assembly wrapping (work document #36, v1)`
      );
    }
  }
  const inMapping = resolveInMapping(inports, options.mapping);
  const outMapping = resolveOutMapping(outports, options.mapping);
  const graph = new GraphModel();
  graph.addNode({ entity_id: "inner", component: options.target });
  graph.addNode({ entity_id: "fanout", component: "assembly-utils/Fork" });
  graph.addExport({
    direction: "inport",
    public: "msg",
    internal: { node: "fanout", port: "in" }
  });
  let mergeIndex = 0;
  for (const port of inports) {
    if (port.control) {
      graph.addExport({
        direction: "inport",
        public: port.name,
        internal: { node: "inner", port: port.name }
      });
    }
  }
  for (const [innerPort, field] of Object.entries(inMapping)) {
    if (field === null) {
      graph.addEdge({
        from: { node: "fanout", port: "out", index: mergeIndex },
        to: { node: "inner", port: innerPort }
      });
      mergeIndex += 1;
      continue;
    }
    const extractNode = `extract_${innerPort}`;
    graph.addNode({
      entity_id: extractNode,
      component: "assembly-utils/ExtractField",
      metadata: { "assembly.field": field }
    });
    graph.addEdge({
      from: { node: "fanout", port: "out", index: mergeIndex },
      to: { node: extractNode, port: "msg" }
    });
    graph.addEdge({
      from: { node: extractNode, port: "out" },
      to: { node: "inner", port: innerPort }
    });
    mergeIndex += 1;
  }
  const fieldNames = Object.values(outMapping);
  graph.addNode({
    entity_id: "collector",
    component: "assembly-utils/CollectFields"
  });
  graph.addIIP({
    data: JSON.stringify(fieldNames),
    to: { node: "collector", port: "fields" }
  });
  graph.addEdge({
    from: { node: "fanout", port: "out", index: mergeIndex },
    to: { node: "collector", port: "msg" }
  });
  mergeIndex += 1;
  let dataIndex = 0;
  for (const [innerPort] of Object.entries(outMapping)) {
    graph.addEdge({
      from: { node: "inner", port: innerPort },
      to: { node: "collector", port: "data", index: dataIndex }
    });
    dataIndex += 1;
    mergeIndex += 1;
  }
  if (hasError) {
    graph.addEdge({
      from: { node: "inner", port: "error" },
      to: { node: "collector", port: "error" }
    });
  }
  graph.addExport({
    direction: "outport",
    public: "out",
    internal: { node: "collector", port: "out" }
  });
  return graph;
}

// node_modules/@noflo/assembly/src/wrapAssembly.js
function wrapAssembly(registry, config = {}) {
  const skips = [];
  const wrapped = {};
  const libraries = config.libraries ?? [];
  const matches = (name) => libraries.some((lib) => {
    const prefix = `${lib.library}/`;
    return name.startsWith(prefix);
  });
  for (const [name, definition] of Object.entries(registry.list())) {
    if (!matches(name)) {
      continue;
    }
    const library = libraries.find((lib) => name.startsWith(`${lib.library}/`));
    const componentName = name.split("/")[1];
    try {
      const module = (
        /** @type {any} */
        definition
      );
      const getComponent = typeof module?.getComponent === "function" ? module.getComponent : typeof definition === "function" ? (...args) => new /** @type {any} */
      definition(...args) : null;
      if (!getComponent) {
        skips.push({
          name,
          reason: "definition is not a code component"
        });
        continue;
      }
      const inner = getComponent();
      const graph = asAssembly(inner, {
        target: name,
        mapping: library.mapping?.[componentName]
      });
      const wrappedName = `${name}Assembly`;
      if (registry.list()[wrappedName] !== void 0) {
        throw new Error(
          `wrapAssembly: the wrapped name '${wrappedName}' collides with an existing component`
        );
      }
      wrapped[wrappedName] = graph;
    } catch (err) {
      skips.push({
        name,
        reason: (
          /** @type {Error} */
          err.message
        )
      });
    }
  }
  if (typeof config.onSkip === "function") {
    for (const skip of skips) {
      config.onSkip(skip);
    }
  }
  return {
    skips,
    list() {
      const catalog = { ...registry.list() };
      for (const [name, definition] of Object.entries(wrapped)) {
        catalog[name] = definition;
      }
      return catalog;
    },
    async get(name) {
      if (wrapped[name]) {
        return wrapped[name];
      }
      if (registry.get) {
        return registry.get(name);
      }
      return registry.list()[name];
    }
  };
}

// node_modules/@noflo/assembly/src/index.js
var validators = {
  def: (val) => val !== void 0,
  set: (val) => val !== void 0 && val !== null,
  ok: (val) => !!val,
  num: (val) => typeof val === "number",
  str: (val) => typeof val === "string",
  obj: (val) => typeof val === "object" && val !== null,
  func: (val) => typeof val === "function",
  ">0": (val) => val > 0
};
var errorMessages = {
  def: (key) => `${key} is undefined`,
  set: (key) => `${key} is not set`,
  ok: (key) => `${key} is false or empty`,
  num: (key, val) => `${key} is not a number: ${val}`,
  str: (key, val) => `${key} is not a string: ${val}`,
  obj: (key, val) => `${key} is not an object: ${val}`,
  func: (key, val) => `${key} is not a function: ${val}`,
  ">0": (key, val) => `${key} is not positive: ${val}`
};
function fail(msg, err) {
  if (!Array.isArray(msg.errors)) {
    throw new Error("Message.errors is not an array");
  }
  const errs = Array.isArray(err) ? err : [err];
  for (const e of errs) {
    msg.errors.push(e);
  }
  return msg;
}
function failed(msg) {
  return msg.errors && Array.isArray(msg.errors) && msg.errors.length > 0;
}
function normalizePorts(options, direction) {
  const key = `${direction}Ports`;
  const result = options;
  if (key in options) {
    if (Array.isArray(options[key])) {
      const tmp = {};
      const portsArray = (
        /** @type {Array<string>} */
        options[key]
      );
      portsArray.forEach((name) => {
        tmp[name] = { datatype: "all" };
      });
      result[key] = tmp;
    }
  } else {
    const dir = direction === "out" ? "Outgoing" : "Incoming";
    result[key] = {
      [direction]: {
        datatype: "object",
        description: `${dir} message`,
        required: true
      }
    };
  }
  return result;
}
function normalizeValidators(rules) {
  if (Array.isArray(rules)) {
    const res = {};
    rules.forEach((f) => {
      res[f] = "ok";
    });
    return res;
  }
  return rules;
}
var Component = class extends NoFloComponent {
  /**
   * Create the component. Port definitions may be given as arrays of names
   * (typed `all`), full NoFlo port definitions, or omitted for a single
   * default message port. Validation rules from `validates` apply to the
   * `relay` hook.
   *
   * @param {AssemblyComponentOptions} [options]
   */
  constructor(options = {}) {
    let opts = normalizePorts(options, "in");
    opts = normalizePorts(opts, "out");
    super(opts);
    if (options.validates) {
      this.validates = normalizeValidators(options.validates);
    }
    const relay = (
      /** @type {RelayFunction|undefined} */
      /** @type {unknown} */
      this.relay
    );
    if (typeof relay === "function") {
      const func = relay.bind(this);
      this.process((input, output) => {
        if (!input.hasData("in")) {
          return;
        }
        const msg = input.getData("in");
        if (!this.validate(msg)) {
          output.sendDone(msg);
          return;
        }
        func(msg, output);
      });
    }
    const processMessage = (
      /** @type {undefined | ((input: any, output: any) => any)} */
      /** @type {unknown} */
      this.processMessage
    );
    if (typeof processMessage === "function") {
      this.process(processMessage);
    }
  }
  /**
   * Check the fields of a message against validation rules, collecting an
   * Error for every violated rule. Paths may be dotted (`parent.field`).
   *
   * @param {AssemblyMessage} msg
   * @param {AssemblyValidators} rules
   * @returns {Array<Error>}
   */
  checkFields(msg, rules) {
    const errors = [];
    function checkField(obj, objPath, path, validator) {
      if (!obj || path.length <= 0) {
        return;
      }
      const key = (
        /** @type {string} */
        path.shift()
      );
      const v = path.length === 0 ? validator : "obj";
      if (!validators[v](obj[key])) {
        errors.push(new Error(errorMessages[v](`${objPath}.${key}`, obj[key])));
        return;
      }
      if (path.length > 0) {
        checkField(obj[key], `${objPath}.${key}`, path, validator);
      }
    }
    Object.keys(rules).forEach((f) => {
      const path = f.indexOf(".") > 0 ? f.split(".") : [f];
      let v = rules[f];
      if (!(v in validators)) {
        v = "ok";
      }
      checkField(msg, "msg", path, v);
    });
    return errors;
  }
  /**
   * Validate a message against the given rules (defaulting to the rules
   * given at construction). Violations are appended to the message's
   * `errors` array; a message that already carries errors fails without
   * re-validation.
   *
   * @param {AssemblyMessage} msg
   * @param {AssemblyValidators|Array<string>} [rules]
   */
  validate(msg, rules = this.validates) {
    if (failed(msg)) {
      return false;
    }
    if (rules && typeof rules === "object") {
      rules = normalizeValidators(rules);
      const errs = this.checkFields(msg, rules);
      if (errs.length > 0) {
        fail(msg, errs);
        return false;
      }
    }
    return true;
  }
};
function fork(msg, excludeKeys = [], cloneKeys = []) {
  const newMsg = {
    errors: cloneKeys.includes("error") ? msg.errors.slice(0) : msg.errors
  };
  Object.keys(msg).forEach((key) => {
    if (key === "errors") {
      return;
    }
    if (excludeKeys.includes(key)) {
      return;
    }
    if (cloneKeys.includes(key)) {
      newMsg[key] = JSON.parse(JSON.stringify(msg[key]));
    } else {
      newMsg[key] = msg[key];
    }
  });
  return newMsg;
}
function merge(base, extra) {
  const combined = base;
  const baseKeys = Object.keys(base);
  Object.keys(extra).forEach((key) => {
    if ((baseKeys.indexOf(key) === -1 || base[key] === void 0) && extra[key] !== void 0) {
      combined[key] = extra[key];
    }
  });
  return combined;
}
var src_default = Component;
export {
  Component,
  asAssembly,
  src_default as default,
  fail,
  failed,
  fork,
  merge,
  wrapAssembly
};
