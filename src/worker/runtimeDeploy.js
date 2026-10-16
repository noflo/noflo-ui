/**
 * @file The deploy converter (work document #59): turns a projected graph
 * view (`projectGraph`, the Appendix B projection) into the stream of
 * `0x14` graph ops that deploys it onto a runtime plane. This is the
 * concrete instance of the canonical-forms gap #59 flagged: noflo-ui's
 * file-level canonical is the fbp-graph interchange form, while the
 * runtime's graph state is the entity model — the deploy path converts
 * view → ops directly, never through the interchange form.
 *
 * Payloads are the entity-model entities minus their `entity_id` (the op
 * frame carries the id explicitly), matching the shapes `@noflo/graph`'s
 * `addNode`/`addEdge`/`addIIP`/`addExport`/`addGroup` accept. Entity ids
 * are the CRDT's own deterministic ids, so a redeploy converges onto the
 * same entities rather than duplicating them.
 */

import { OP_TYPE } from "../../vendor/fbp-protocol.js";
import { edgeIdFor, iipEdgeIdFor } from "../crdt/ProjectDoc.js";

/**
 * Strips the entity id from an entity object: the op frame carries it.
 *
 * @param {any} entity
 * @returns {any}
 */
function entityPayload(entity) {
  const { entity_id, ...payload } = entity;
  return payload;
}

/**
 * Converts a projected graph view into deploy ops, in dependency order:
 * nodes first, then edges and IIPs (they reference nodes), then exports
 * and groups. Positions and other canvas metadata ride each entity's
 * `metadata` — the `ui` catalog classifies them positional (work document
 * #57), and the runtime's mirror may carry them.
 *
 * @param {any} view The projected graph view from `projectGraph`.
 * @returns {Array<{ opType: number, entityId: string, payload: any }>}
 */
export function graphViewToOps(view) {
  /** @type {Array<{ opType: number, entityId: string, payload: any }>} */
  const ops = [];

  for (const node of view.nodes ?? []) {
    ops.push({
      opType: OP_TYPE.INSERT_NODE,
      entityId: node.id,
      payload: entityPayload({
        entity_id: node.id,
        component: node.component,
        metadata: node.metadata ?? {},
      }),
    });
  }

  for (const edge of view.edges ?? []) {
    const entityId = edgeIdFor(
      {
        node: edge.from.node,
        port: edge.from.port,
        index: edge.from.index,
      },
      {
        node: edge.to.node,
        port: edge.to.port,
        index: edge.to.index,
      },
    );
    ops.push({
      opType: OP_TYPE.INSERT_EDGE,
      entityId,
      payload: entityPayload({
        entity_id: entityId,
        from: edge.from,
        to: edge.to,
        metadata: edge.metadata ?? {},
      }),
    });
  }

  for (const iip of view.initializers ?? []) {
    const entityId = iip.metadata?.id ?? iipEdgeIdFor(iip.to);
    ops.push({
      opType: OP_TYPE.INSERT_IIP,
      entityId,
      payload: entityPayload({
        entity_id: entityId,
        from: { data: iip.from.data },
        to: iip.to,
        metadata: iip.metadata ?? {},
      }),
    });
  }

  // Exports: the projection keys them by public name per direction; the
  // entity id derives from both, so a rename deploys as a new export
  for (const [direction, key] of [
    ["inports", "inport"],
    ["outports", "outport"],
  ]) {
    for (const [name, info] of Object.entries(view[direction] ?? {})) {
      const entityId = `export:${key}:${name}`;
      ops.push({
        opType: OP_TYPE.INSERT_EXPORT,
        entityId,
        payload: entityPayload({
          entity_id: entityId,
          direction: key,
          public: name,
          internal: {
            node: info.process,
            port: info.port,
            ...(info.index !== undefined && info.index !== null
              ? { index: info.index }
              : {}),
          },
          metadata: info.metadata ?? {},
        }),
      });
    }
  }

  for (const group of view.groups ?? []) {
    ops.push({
      opType: OP_TYPE.INSERT_GROUP,
      entityId: group.id,
      payload: entityPayload({
        entity_id: group.id,
        name: group.name,
        nodes: [...(group.nodes ?? [])],
        metadata: {},
      }),
    });
  }

  return ops;
}
