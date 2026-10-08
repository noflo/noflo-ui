/**
 * @file Canonical serialization (work document #43): the first half of the
 * materialization module. The fbp-graph JSON format is the interchange
 * serialization — SPEC, "The Source of Truth: CRDT vs. Files" — and
 * byte-stable output is a hard requirement: the same CRDT state must
 * always serialize to identical bytes, regardless of the order the CRDT
 * happened to materialize its collections in.
 *
 * Every collection is emitted in a deterministic order (nodes and ports by
 * id/name, connections by canonical edge id, groups by id) and every
 * object is built in a fixed key order. Round-trip stability —
 * serialize → parse → serialize → identical bytes — is asserted in tests.
 */

/**
 * Recursively sorts object keys for deterministic serialization. Arrays
 * keep their order (the callers sort them semantically); objects rebuild
 * with keys in sorted order.
 *
 * @param {any} value
 * @returns {any}
 */
function sortedDeep(value) {
  if (Array.isArray(value)) return value.map((item) => sortedDeep(item));
  if (value && typeof value === "object") {
    /** @type {Record<string, any>} */
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = sortedDeep(value[key]);
    }
    return result;
  }
  return value;
}

/**
 * Canonicalizes one fbp-graph connection (edge or IIP) into the interchange
 * shape, keyed deterministically.
 *
 * @param {any} connection A projection connection (`src`/`tgt` or `data`).
 * @param {string} id The connection's canonical id.
 * @returns {any}
 */
function canonicalConnection(connection, id) {
  const endpoint = (/** @type {any} */ end) => ({
    process: end.process,
    port: end.port,
    ...(end.index !== undefined && end.index !== null
      ? { index: end.index }
      : {}),
  });
  if (connection.data !== undefined) {
    return {
      data: connection.data,
      tgt: endpoint(connection.tgt),
      metadata: sortedDeep(connection.metadata ?? {}),
    };
  }
  return {
    src: endpoint(connection.src ?? { node: "", port: "" }),
    tgt: endpoint(connection.tgt),
    metadata: sortedDeep(connection.metadata ?? {}),
  };
}

/**
 * Canonicalizes a projected graph view (work document #43): the interchange
 * serialization with deterministic collection and key ordering.
 *
 * @param {any} view The projected graph view (`projectGraph`).
 * @returns {any} The canonical graph JSON.
 */
export function canonicalGraph(view) {
  const processes = Object.fromEntries(
    Object.entries(view.processes ?? {})
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([id, node]) => [
        id,
        {
          component: node.component,
          metadata: sortedDeep(node.metadata ?? {}),
        },
      ]),
  );

  const connections = (view.connections ?? [])
    .map((/** @type {any} */ connection, /** @type {number} */ index) => {
      const src = connection.src ?? { node: "", port: "" };
      const tgt = connection.tgt ?? { node: "", port: "" };
      const id =
        connection.data !== undefined
          ? `DATA->${tgt.process}:${tgt.port}`
          : `${src.process}:${src.port}->${tgt.process}:${tgt.port}`;
      return { connection, id, index };
    })
    .sort((/** @type {any} */ a, /** @type {any} */ b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : a.index - b.index,
    )
    .map((/** @type {any} */ item) =>
      canonicalConnection(item.connection, item.id),
    );

  // Exports stay keyed by public name — the fbp-graph interchange form —
  // so the canonical output is its own input (round-trip stability)
  const direction = (/** @type {string} */ d) => {
    /** @type {Record<string, any>} */
    const result = {};
    for (const [name, info] of Object.entries(view[d] ?? {}).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      result[name] = {
        process: info.process,
        port: info.port,
        ...(info.index !== undefined && info.index !== null
          ? { index: info.index }
          : {}),
        metadata: sortedDeep(info.metadata ?? {}),
      };
    }
    return result;
  };

  const groups = (view.groups ?? [])
    .slice()
    .sort((/** @type {any} */ a, /** @type {any} */ b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    )
    .map((/** @type {any} */ group) => ({
      id: group.id,
      name: group.name,
      nodes: [...group.nodes].sort(),
      metadata: {},
    }));

  return {
    properties: sortedDeep(view.properties ?? {}),
    processes,
    connections,
    inports: direction("inports"),
    outports: direction("outports"),
    groups,
  };
}

/**
 * Serializes a projected graph view to canonical 2-space JSON.
 *
 * @param {any} view The projected graph view (`projectGraph`).
 * @returns {string}
 */
export function serializeGraph(view) {
  return JSON.stringify(canonicalGraph(view), null, 2) + "\n";
}
