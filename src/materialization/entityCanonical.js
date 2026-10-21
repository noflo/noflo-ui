/**
 * @file The canonical-forms converter (work document #59's found gap): the
 * materialized graph file's fbp-graph interchange form — processes as a
 * keyed map, connections with `src`/`tgt`, exports keyed by public name —
 * translated into `@noflo/graph`'s entity-model canonical that
 * `GraphModel.fromCanonical` consumes. The two forms are both "canonical"
 * in their own houses; this module is the bridge the deploy path needs.
 *
 * Deterministic by construction: entity ids carry over (the node id, the
 * connection's canonical id, the export's public name, the group id) and
 * every array sorts by `entity_id`.
 */

/**
 * The @noflo/graph port reference from an interchange endpoint (`process`
 * becomes `node`; the addressable index carries when present).
 *
 * @param {any} end
 * @returns {{ node: string, port: string, index?: number }}
 */
function portRef(end) {
  return {
    node: String(end?.process ?? ""),
    port: String(end?.port ?? ""),
    ...(end?.index !== undefined && end?.index !== null
      ? { index: end.index }
      : {}),
  };
}

/**
 * Converts the materialized interchange graph into the entity-model
 * canonical for `GraphModel.fromCanonical`.
 *
 * @param {any} interchange The canonical interchange graph (work document
 *   #43's `canonicalGraph` output).
 * @returns {{
 *   name?: string,
 *   metadata: Record<string, any>,
 *   nodes: any[],
 *   edges: any[],
 *   iips: any[],
 *   exports: any[],
 *   groups: any[],
 * }}
 */
export function toEntityCanonical(interchange) {
  const source = interchange ?? {};
  const compare = (/** @type {string} */ a, /** @type {string} */ b) =>
    a < b ? -1 : a > b ? 1 : 0;

  const nodes = Object.entries(source.processes ?? {})
    .map(([entityId, node]) => ({
      entity_id: entityId,
      component: node?.component,
      metadata: node?.metadata ?? {},
    }))
    .sort((a, b) => compare(a.entity_id, b.entity_id));

  /** @type {any[]} */
  const edges = [];
  /** @type {any[]} */
  const iips = [];
  for (const connection of source.connections ?? []) {
    // The entity id derives with the interchange's own canonical formula
    // (work document #43's connection id): the materialized file omits it
    // — the field exists for sorting, not storage
    const entityId =
      connection.data !== undefined
        ? `DATA->${connection.tgt?.process}:${connection.tgt?.port}`
        : `${connection.src?.process}:${connection.src?.port}->${connection.tgt?.process}:${connection.tgt?.port}`;
    if (connection.data !== undefined) {
      iips.push({
        entity_id: entityId,
        from: { data: connection.data },
        to: portRef(connection.tgt),
        metadata: connection.metadata ?? {},
      });
    } else {
      edges.push({
        entity_id: entityId,
        from: portRef(connection.src),
        to: portRef(connection.tgt),
        metadata: connection.metadata ?? {},
      });
    }
  }
  edges.sort((a, b) => compare(a.entity_id, b.entity_id));
  iips.sort((a, b) => compare(a.entity_id, b.entity_id));

  const exports = [
    ...Object.entries(source.inports ?? {}).map(([publicName, info]) => ({
      entity_id: `inport:${publicName}`,
      direction: "inport",
      internal: portRef(info),
      public: publicName,
      metadata: info?.metadata ?? {},
    })),
    ...Object.entries(source.outports ?? {}).map(([publicName, info]) => ({
      entity_id: `outport:${publicName}`,
      direction: "outport",
      internal: portRef(info),
      public: publicName,
      metadata: info?.metadata ?? {},
    })),
  ].sort((/** @type {any} */ a, /** @type {any} */ b) =>
    compare(a.entity_id, b.entity_id),
  );

  const groups = (source.groups ?? [])
    .map((/** @type {any} */ group) => ({
      entity_id: group.id,
      name: group.name,
      nodes: [...(group.nodes ?? [])].sort(compare),
      metadata: group.metadata ?? {},
    }))
    .sort((/** @type {any} */ a, /** @type {any} */ b) =>
      compare(a.entity_id, b.entity_id),
    );

  const metadata = { ...(source.properties ?? {}) };
  return {
    ...(source.properties?.name !== undefined
      ? { name: String(source.properties.name) }
      : {}),
    metadata,
    nodes,
    edges,
    iips,
    exports,
    groups,
  };
}
