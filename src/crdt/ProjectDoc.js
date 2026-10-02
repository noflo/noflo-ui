/**
 * @file Project CRDT document model (work document #17).
 *
 * Implements the project `Y.Doc` structure specified in SPEC.md Appendix B as
 * a pure, dependency-light module: the root map layout, graph entity
 * operations, deterministic edge keys, and the schema version migration hook.
 * No Worker, no UI — everything else (Engine, persistence, mesh) builds on
 * these primitives.
 */

import * as Y from "../../vendor/yjs.js";

/** Current CRDT schema version of the project document. */
export const PROJECT_SCHEMA_VERSION = 1;

/** Root map name for project metadata (name, id, schema version). */
export const METADATA_MAP = "metadata";
/** Root map name for the graph collection. */
export const GRAPHS_MAP = "graphs";
/** Root map name for component configurations and code buffers. */
export const COMPONENTS_MAP = "components";
/** Root map name for component signatures. */
export const REGISTRY_MAP = "registry";
/** Root map name for structural test suites. */
export const SPECS_MAP = "specs";

/**
 * One endpoint of an edge: the node id, the port name, and the ArrayPort
 * index when the port is an arrayport instance.
 *
 * @typedef {Object} EdgeEndpoint
 * @property {string} node
 * @property {string} port
 * @property {number} [index]
 */

/**
 * Optional edge metadata (route color, custom route points).
 *
 * @typedef {Object} EdgeMetadata
 * @property {number} [route]
 */

/**
 * A schema migration step, applied when a loaded document's schema version is
 * lower than the step's version.
 *
 * @typedef {(doc: Y.Doc) => void} Migration
 */

/**
 * Registry of schema migrations keyed by the version they upgrade TO.
 * Version 1 is the identity migration (the initial layout); later versions
 * append here as the schema evolves.
 *
 * @type {Record<number, Migration>}
 */
const MIGRATIONS = {
  1: () => {},
};

/**
 * The canonical edge key for a node-to-node edge, incorporating ArrayPort
 * indexes so concurrent mutations can never collide (SPEC Appendix B).
 *
 * @param {EdgeEndpoint} src
 * @param {EdgeEndpoint} tgt
 * @returns {string}
 */
export function edgeIdFor(src, tgt) {
  return `${src.node}:${src.port}[${src.index ?? 0}]->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]`;
}

/**
 * The canonical edge key for an Initial Information Packet.
 *
 * @param {EdgeEndpoint} tgt
 * @returns {string}
 */
export function iipEdgeIdFor(tgt) {
  return `DATA->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]`;
}

/**
 * Creates an empty project document with the root maps of SPEC Appendix B and
 * the current schema version in metadata.
 *
 * @param {string} name Human-readable project name.
 * @returns {Y.Doc}
 */
export function createProjectDoc(name) {
  const doc = new Y.Doc();
  doc.transact(() => {
    doc.getMap(METADATA_MAP).set("name", name);
    doc.getMap(METADATA_MAP).set("id", newProjectId());
    doc.getMap(METADATA_MAP).set("schemaVersion", PROJECT_SCHEMA_VERSION);
  });
  return doc;
}

/**
 * Generates a project id. Uses `crypto.randomUUID` when available with a
 * deterministic-ish fallback for exotic runtimes.
 *
 * @returns {string}
 */
function newProjectId() {
  const cryptoObject = /** @type {any} */ (globalThis).crypto;
  if (cryptoObject && typeof cryptoObject.randomUUID === "function") {
    return cryptoObject.randomUUID();
  }
  return `project-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * Ensures the document conforms to the current schema version, applying any
 * migrations needed. Safe to call on already-current documents (no-op) and on
 * fresh documents created by {@link createProjectDoc}.
 *
 * @param {Y.Doc} doc
 * @returns {{ from: number, to: number, migrated: boolean }}
 */
export function ensureProjectSchema(doc) {
  const metadata = doc.getMap(METADATA_MAP);
  const from = /** @type {number | undefined} */ (
    metadata.get("schemaVersion")
  );
  const startVersion = from ?? 0;

  if (startVersion === PROJECT_SCHEMA_VERSION) {
    return { from: startVersion, to: PROJECT_SCHEMA_VERSION, migrated: false };
  }

  doc.transact(() => {
    for (
      let version = startVersion + 1;
      version <= PROJECT_SCHEMA_VERSION;
      version++
    ) {
      const migration = MIGRATIONS[version];
      if (migration) {
        migration(doc);
      }
    }
    metadata.set("schemaVersion", PROJECT_SCHEMA_VERSION);
  });
  return { from: startVersion, to: PROJECT_SCHEMA_VERSION, migrated: true };
}

/**
 * Returns the root metadata map of a project document.
 *
 * @param {Y.Doc} doc
 * @returns {Y.Map<any>}
 */
export function getProjectMetadata(doc) {
  return doc.getMap(METADATA_MAP);
}

/**
 * Creates a graph entry in the project, or returns the existing one.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @param {string} [name] Human-readable name; defaults to the graph id.
 * @param {string} [parent] Id of the parent graph, for subgraphs.
 * @returns {Y.Map<any>} The graph map.
 */
export function createGraph(doc, graphId, name = graphId, parent = "") {
  const graphs = doc.getMap(GRAPHS_MAP);
  const existing = /** @type {Y.Map<any> | undefined} */ (graphs.get(graphId));
  if (existing) return existing;

  const graph = new Y.Map();
  doc.transact(() => {
    graphs.set(graphId, graph);
    const graphMetadata = new Y.Map();
    graphMetadata.set("name", name);
    graphMetadata.set("parent", parent);
    graphMetadata.set("created", Date.now());
    graph.set("metadata", graphMetadata);
    graph.set("nodes", new Y.Map());
    graph.set("edges", new Y.Map());
    graph.set("inports", new Y.Map());
    graph.set("outports", new Y.Map());
  });
  return graph;
}

/**
 * Returns a graph map by id, or undefined.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {Y.Map<any> | undefined}
 */
export function getGraph(doc, graphId) {
  return /** @type {Y.Map<any> | undefined} */ (
    doc.getMap(GRAPHS_MAP).get(graphId)
  );
}

/**
 * Returns the ids of a graph's direct children.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {string[]}
 */
export function graphChildren(doc, graphId) {
  /** @type {string[]} */
  const children = [];
  const graphs = doc.getMap(GRAPHS_MAP);
  for (const [id, graph] of graphs.entries()) {
    const metadata = graph.get("metadata");
    if (metadata?.get("parent") === graphId) children.push(id);
  }
  return children;
}

/**
 * Returns the ancestry of a graph, root first. Unknown graphs yield an
 * empty array.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {string[]}
 */
export function graphAncestry(doc, graphId) {
  /** @type {string[]} */
  const chain = [];
  let current = graphId;
  while (current && !chain.includes(current)) {
    chain.unshift(current);
    const graph = getGraph(doc, current);
    current = graph?.get("metadata")?.get("parent") ?? "";
  }
  return chain;
}

/**
 * Deletes a graph and everything in it, including descendant subgraphs.
 *
 * @param {Y.Doc} doc
 * @param {string} graphId
 * @returns {boolean} Whether a graph was deleted.
 */
export function deleteGraph(doc, graphId) {
  const graphs = doc.getMap(GRAPHS_MAP);
  if (!graphs.has(graphId)) return false;
  doc.transact(() => {
    for (const child of graphChildren(doc, graphId)) {
      deleteGraph(doc, child);
    }
    graphs.delete(graphId);
  });
  return true;
}

/**
 * Runs a function inside a single document transaction, so multi-step graph
 * operations apply atomically. Falls back to running directly when the type
 * is not attached to a document (e.g. during tests on detached types).
 *
 * @param {Y.Map<any>} graph
 * @param {() => void} fn
 */
function transact(graph, fn) {
  const doc = graph.doc;
  if (doc) {
    doc.transact(fn);
  } else {
    fn();
  }
}

/**
 * Returns the graph's nodes map.
 *
 * @param {Y.Map<any>} graph
 * @returns {Y.Map<any>}
 */
function nodesOf(graph) {
  return /** @type {Y.Map<any>} */ (graph.get("nodes"));
}

/**
 * Returns the graph's edges map.
 *
 * @param {Y.Map<any>} graph
 * @returns {Y.Map<any>}
 */
function edgesOf(graph) {
  return /** @type {Y.Map<any>} */ (graph.get("edges"));
}

/**
 * Copies a plain metadata object into a fresh Y.Map.
 *
 * @param {Record<string, any>} source
 * @returns {Y.Map<any>}
 */
function metadataMap(source) {
  const map = new Y.Map();
  for (const key of Object.keys(source)) {
    map.set(key, source[key]);
  }
  return map;
}

/**
 * Adds a node to the graph.
 *
 * @param {Y.Map<any>} graph
 * @param {string} nodeId
 * @param {string} component
 * @param {{ x?: number, y?: number, [key: string]: any }} [metadata]
 * @returns {Y.Map<any> | null} The node map, or null when the id already exists.
 */
export function addNode(graph, nodeId, component, metadata = {}) {
  const nodes = nodesOf(graph);
  if (nodes.has(nodeId)) return null;
  const node = new Y.Map();
  node.set("id", nodeId);
  node.set("component", component);
  node.set("metadata", metadataMap(metadata));
  nodes.set(nodeId, node);
  return node;
}

/**
 * Changes a node's component, keeping id and metadata.
 *
 * @param {Y.Map<any>} graph
 * @param {string} nodeId
 * @param {string} component
 * @returns {boolean} Whether the node existed.
 */
export function setNodeComponent(graph, nodeId, component) {
  const node = getNode(graph, nodeId);
  if (!node) return false;
  node.set("component", component);
  return true;
}

/**
 * Removes a node and everything wired to it: edges (node-to-node and IIPs)
 * touching it and exported ports referencing it.
 *
 * @param {Y.Map<any>} graph
 * @param {string} nodeId
 * @returns {boolean} Whether the node existed.
 */
export function removeNode(graph, nodeId) {
  const nodes = nodesOf(graph);
  if (!nodes.has(nodeId)) return false;

  transact(graph, () => {
    const edges = edgesOf(graph);
    for (const edgeId of [...edges.keys()]) {
      const edge = /** @type {Y.Map<any>} */ (edges.get(edgeId));
      const src = /** @type {Y.Map<any>} */ (edge.get("src"));
      const tgt = /** @type {Y.Map<any>} */ (edge.get("tgt"));
      const touchesNode =
        (src && src.get("node") === nodeId) || tgt.get("node") === nodeId;
      if (touchesNode) {
        edges.delete(edgeId);
      }
    }
    for (const direction of ["inports", "outports"]) {
      const ports = /** @type {Y.Map<any>} */ (graph.get(direction));
      for (const portName of [...ports.keys()]) {
        const info = /** @type {Y.Map<any>} */ (ports.get(portName));
        if (info.get("process") === nodeId) {
          ports.delete(portName);
        }
      }
    }
    nodes.delete(nodeId);
  });
  return true;
}

/**
 * Moves a node to new coordinates.
 *
 * @param {Y.Map<any>} graph
 * @param {string} nodeId
 * @param {number} x
 * @param {number} y
 * @returns {boolean} Whether the node existed.
 */
export function moveNode(graph, nodeId, x, y) {
  const node = /** @type {Y.Map<any> | undefined} */ (
    nodesOf(graph).get(nodeId)
  );
  if (!node) return false;
  const metadata = /** @type {Y.Map<any>} */ (node.get("metadata"));
  transact(graph, () => {
    metadata.set("x", x);
    metadata.set("y", y);
  });
  return true;
}

/**
 * Returns a node map by id, or undefined.
 *
 * @param {Y.Map<any>} graph
 * @param {string} nodeId
 * @returns {Y.Map<any> | undefined}
 */
export function getNode(graph, nodeId) {
  return /** @type {Y.Map<any> | undefined} */ (nodesOf(graph).get(nodeId));
}

/**
 * Adds a node-to-node edge under its deterministic key.
 *
 * @param {Y.Map<any>} graph
 * @param {EdgeEndpoint} src
 * @param {EdgeEndpoint} tgt
 * @param {EdgeMetadata} [metadata]
 * @returns {string | null} The edge id, or null on duplicate or unknown node.
 */
export function addEdge(graph, src, tgt, metadata = {}) {
  if (!getNode(graph, src.node) || !getNode(graph, tgt.node)) return null;
  const edgeId = edgeIdFor(src, tgt);
  const edges = edgesOf(graph);
  if (edges.has(edgeId)) return null;

  const edge = new Y.Map();
  edge.set("id", edgeId);
  edge.set("src", endpointMap(src));
  edge.set("tgt", endpointMap(tgt));
  edge.set("metadata", metadataMap(metadata));
  edges.set(edgeId, edge);
  return edgeId;
}

/**
 * Adds an Initial Information Packet under its deterministic `DATA->` key.
 *
 * @param {Y.Map<any>} graph
 * @param {any} data
 * @param {EdgeEndpoint} tgt
 * @param {{ [key: string]: any }} [metadata]
 * @returns {string | null} The edge id, or null on duplicate or unknown node.
 */
export function addIIP(graph, data, tgt, metadata = {}) {
  if (!getNode(graph, tgt.node)) return null;
  const edgeId = iipEdgeIdFor(tgt);
  const edges = edgesOf(graph);
  if (edges.has(edgeId)) return null;

  const edge = new Y.Map();
  edge.set("id", edgeId);
  edge.set("data", data);
  edge.set("tgt", endpointMap(tgt));
  edge.set("metadata", metadataMap(metadata));
  edges.set(edgeId, edge);
  return edgeId;
}

/**
 * Removes an edge (node-to-node or IIP) by its deterministic id.
 *
 * @param {Y.Map<any>} graph
 * @param {string} edgeId
 * @returns {boolean} Whether the edge existed.
 */
export function removeEdge(graph, edgeId) {
  const edges = edgesOf(graph);
  if (!edges.has(edgeId)) return false;
  edges.delete(edgeId);
  return true;
}

/**
 * Copies an edge endpoint into a fresh Y.Map.
 *
 * @param {EdgeEndpoint} endpoint
 * @returns {Y.Map<any>}
 */
function endpointMap(endpoint) {
  const map = new Y.Map();
  map.set("node", endpoint.node);
  map.set("port", endpoint.port);
  if (endpoint.index !== undefined) {
    map.set("index", endpoint.index);
  }
  return map;
}

/**
 * Exports a node port as a graph inport.
 *
 * @param {Y.Map<any>} graph
 * @param {string} publicName
 * @param {string} nodeId
 * @param {string} port
 * @param {{ [key: string]: any }} [metadata]
 * @returns {boolean} False when the node is unknown or the name is taken.
 */
export function addInport(graph, publicName, nodeId, port, metadata = {}) {
  return addExportedPort(graph, "inports", publicName, nodeId, port, metadata);
}

/**
 * Exports a node port as a graph outport.
 *
 * @param {Y.Map<any>} graph
 * @param {string} publicName
 * @param {string} nodeId
 * @param {string} port
 * @param {{ [key: string]: any }} [metadata]
 * @returns {boolean} False when the node is unknown or the name is taken.
 */
export function addOutport(graph, publicName, nodeId, port, metadata = {}) {
  return addExportedPort(graph, "outports", publicName, nodeId, port, metadata);
}

/**
 * @param {Y.Map<any>} graph
 * @param {"inports" | "outports"} direction
 * @param {string} publicName
 * @param {string} nodeId
 * @param {string} port
 * @param {{ [key: string]: any }} metadata
 * @returns {boolean}
 */
function addExportedPort(graph, direction, publicName, nodeId, port, metadata) {
  if (!getNode(graph, nodeId)) return false;
  const ports = /** @type {Y.Map<any>} */ (graph.get(direction));
  if (ports.has(publicName)) return false;
  const info = new Y.Map();
  info.set("process", nodeId);
  info.set("port", port);
  info.set("metadata", metadataMap(metadata));
  ports.set(publicName, info);
  return true;
}

// ---- components ---------------------------------------------------------

/**
 * Returns the components collection.
 *
 * @param {Y.Doc} doc
 * @returns {Y.Map<any>}
 */
function componentsOf(doc) {
  return doc.getMap(COMPONENTS_MAP);
}

/**
 * Ensures a component entry exists, creating an empty collaborative code
 * buffer when it does not. The entry holds component `metadata` (name,
 * description, icon, ...) and the `code` Y.Text buffer.
 *
 * @param {Y.Doc} doc
 * @param {string} componentId
 * @param {{ [key: string]: any }} [metadata]
 * @returns {Y.Map<any>}
 */
export function ensureComponent(doc, componentId, metadata = {}) {
  const components = componentsOf(doc);
  const existing = /** @type {Y.Map<any> | undefined} */ (
    components.get(componentId)
  );
  if (existing) return existing;

  const component = new Y.Map();
  doc.transact(() => {
    components.set(componentId, component);
    component.set("metadata", metadataMap(metadata));
    component.set("code", new Y.Text());
  });
  return component;
}

/**
 * Returns a component entry, or undefined.
 *
 * @param {Y.Doc} doc
 * @param {string} componentId
 * @returns {Y.Map<any> | undefined}
 */
export function getComponent(doc, componentId) {
  return /** @type {Y.Map<any> | undefined} */ (
    componentsOf(doc).get(componentId)
  );
}

/**
 * Deletes a component entry.
 *
 * @param {Y.Doc} doc
 * @param {string} componentId
 * @returns {boolean} Whether the component existed.
 */
export function deleteComponent(doc, componentId) {
  const components = componentsOf(doc);
  if (!components.has(componentId)) return false;
  components.delete(componentId);
  return true;
}

/**
 * Returns the collaborative code buffer of a component.
 *
 * @param {Y.Map<any>} component
 * @returns {Y.Text}
 */
export function getComponentCode(component) {
  return /** @type {Y.Text} */ (component.get("code"));
}

/**
 * Replaces the whole code buffer atomically (single transaction, single
 * delete+insert pair), preserving concurrent edits on other character ranges
 * through Yjs merging.
 *
 * @param {Y.Map<any>} component
 * @param {string} code
 */
export function setComponentCode(component, code) {
  const text = getComponentCode(component);
  transact(component, () => {
    text.delete(0, text.length);
    text.insert(0, code);
  });
}

/**
 * Merges a patch into a component's metadata map.
 *
 * @param {Y.Map<any>} component
 * @param {{ [key: string]: any }} patch
 */
export function updateComponentMetadata(component, patch) {
  const metadata = /** @type {Y.Map<any>} */ (component.get("metadata"));
  transact(component, () => {
    for (const key of Object.keys(patch)) {
      metadata.set(key, patch[key]);
    }
  });
}

// ---- component signatures (registry) ------------------------------------

/**
 * A port signature as stored in the registry.
 *
 * @typedef {Object} PortSignature
 * @property {string} name
 * @property {string} [type]
 * @property {boolean} [addressable]
 */

/**
 * A component signature: the ports a component exposes.
 *
 * @typedef {Object} ComponentSignatureValue
 * @property {PortSignature[]} [inports]
 * @property {PortSignature[]} [outports]
 * @property {string} [description]
 * @property {string} [icon]
 */

/**
 * Copies a port signature list into a fresh Y.Array of Y.Maps.
 *
 * @param {PortSignature[]} [ports]
 * @returns {Y.Array<any>}
 */
function signatureArray(ports = []) {
  const array = new Y.Array();
  for (const port of ports) {
    const entry = new Y.Map();
    entry.set("name", port.name);
    if (port.type !== undefined) entry.set("type", port.type);
    if (port.addressable !== undefined)
      entry.set("addressable", port.addressable);
    array.push([entry]);
  }
  return array;
}

/**
 * Sets (replaces) a component's signature in the registry. The registry holds
 * the ports a component exposes, used by the UI to render nodes.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @param {ComponentSignatureValue} signature
 */
export function setComponentSignature(doc, componentName, signature) {
  const registry = doc.getMap(REGISTRY_MAP);
  const entry = new Y.Map();
  doc.transact(() => {
    entry.set("inports", signatureArray(signature.inports));
    entry.set("outports", signatureArray(signature.outports));
    if (signature.description !== undefined) {
      entry.set("description", signature.description);
    }
    if (signature.icon !== undefined) {
      entry.set("icon", signature.icon);
    }
    registry.set(componentName, entry);
  });
}

/**
 * Returns a component signature entry, or undefined.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @returns {Y.Map<any> | undefined}
 */
export function getComponentSignature(doc, componentName) {
  return /** @type {Y.Map<any> | undefined} */ (
    doc.getMap(REGISTRY_MAP).get(componentName)
  );
}

/**
 * Removes a component signature from the registry.
 *
 * @param {Y.Doc} doc
 * @param {string} componentName
 * @returns {boolean} Whether the signature existed.
 */
export function removeComponentSignature(doc, componentName) {
  const registry = doc.getMap(REGISTRY_MAP);
  if (!registry.has(componentName)) return false;
  registry.delete(componentName);
  return true;
}

// ---- specs ---------------------------------------------------------------

/**
 * Returns the specs collection.
 *
 * @param {Y.Doc} doc
 * @returns {Y.Map<any>}
 */
function specsOf(doc) {
  return doc.getMap(SPECS_MAP);
}

/**
 * Ensures a structural test suite exists for a subject (component or graph).
 * Shape per SPEC Appendix B: `cases` is a Y.Array of case maps, each with
 * `name`, optional `fixtureGraph`, and structural `inputs`/`expects` arrays.
 *
 * @param {Y.Doc} doc
 * @param {string} specId
 * @param {string} topic Subject component or graph name.
 * @returns {Y.Map<any>}
 */
export function ensureSpecSuite(doc, specId, topic) {
  const specs = specsOf(doc);
  const existing = /** @type {Y.Map<any> | undefined} */ (specs.get(specId));
  if (existing) return existing;

  const suite = new Y.Map();
  doc.transact(() => {
    specs.set(specId, suite);
    suite.set("id", specId);
    suite.set("topic", topic);
    suite.set("cases", new Y.Array());
  });
  return suite;
}

/**
 * Returns a spec suite, or undefined.
 *
 * @param {Y.Doc} doc
 * @param {string} specId
 * @returns {Y.Map<any> | undefined}
 */
export function getSpecSuite(doc, specId) {
  return /** @type {Y.Map<any> | undefined} */ (specsOf(doc).get(specId));
}

/**
 * Deletes a spec suite.
 *
 * @param {Y.Doc} doc
 * @param {string} specId
 * @returns {boolean} Whether the suite existed.
 */
export function deleteSpecSuite(doc, specId) {
  const specs = specsOf(doc);
  if (!specs.has(specId)) return false;
  specs.delete(specId);
  return true;
}

/**
 * @typedef {Object} SpecInput
 * @property {string} port
 * @property {any} payload
 */

/**
 * @typedef {Object} SpecExpect
 * @property {string} port
 * @property {any} payload
 * @property {string} [assertion]
 */

/**
 * Adds a test case to a suite. Inputs and expects are stored structurally so
 * the UI can edit them as forms (WD #16); YAML is only an export format.
 *
 * @param {Y.Map<any>} suite
 * @param {{ name: string, inputs?: SpecInput[], expects?: SpecExpect[] }} spec
 * @returns {Y.Map<any>} The created case map.
 */
export function addSpecCase(suite, { name, inputs = [], expects = [] }) {
  const specCase = new Y.Map();
  specCase.set("name", name);
  specCase.set("inputs", inputExpectArray(inputs, ["port", "payload"]));
  specCase.set(
    "expects",
    inputExpectArray(expects, ["port", "payload", "assertion"]),
  );
  const cases = /** @type {Y.Array<any>} */ (suite.get("cases"));
  const doc = suite.doc;
  if (doc) {
    doc.transact(() => {
      cases.push([specCase]);
    });
  } else {
    cases.push([specCase]);
  }
  return specCase;
}

/**
 * Removes a test case by index.
 *
 * @param {Y.Map<any>} suite
 * @param {number} index
 * @returns {boolean} Whether the index existed.
 */
export function removeSpecCase(suite, index) {
  const cases = /** @type {Y.Array<any>} */ (suite.get("cases"));
  if (index < 0 || index >= cases.length) return false;
  const doc = suite.doc;
  if (doc) {
    doc.transact(() => {
      cases.delete(index, 1);
    });
  } else {
    cases.delete(index, 1);
  }
  return true;
}

/**
 * Copies input/expect records into a Y.Array of Y.Maps, keeping only the
 * given keys (skipping undefined values like an optional `assertion`).
 *
 * @param {Array<Record<string, any>>} records
 * @param {string[]} keys
 * @returns {Y.Array<any>}
 */
function inputExpectArray(records, keys) {
  const array = new Y.Array();
  for (const record of records) {
    const entry = new Y.Map();
    for (const key of keys) {
      if (record[key] !== undefined) {
        entry.set(key, record[key]);
      }
    }
    array.push([entry]);
  }
  return array;
}

/**
 * Removes an exported port.
 *
 * @param {Y.Map<any>} graph
 * @param {"inports" | "outports"} direction
 * @param {string} publicName
 * @returns {boolean} Whether the port existed.
 */
export function removeExportedPort(graph, direction, publicName) {
  const ports = /** @type {Y.Map<any>} */ (graph.get(direction));
  if (!ports.has(publicName)) return false;
  ports.delete(publicName);
  return true;
}
