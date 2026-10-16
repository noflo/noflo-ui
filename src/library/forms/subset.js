/**
 * @file The forms-subset walker (work document #57): classifies a JSON
 * Schema (2020-12) per subtree into what the forms renderer draws and
 * what falls back to the raw JSON editor. The declared subset is exact —
 * `type`, `enum`, `const`, `default`, `examples`, `format` (declared
 * set), `title`/`description`, `properties`/`required`,
 * `additionalProperties`, `items`, the size and numeric bounds, and
 * `allOf` merged — and a keyword outside it (`$ref`, `oneOf`,
 * `anyOf`, `if`/`then`/`else`, `not`, `pattern`, `patternProperties`,
 * discriminator-typed composition, recursion) makes that subtree a
 * fallback: the raw JSON editor with Tier B validation errors shown
 * beside it. The form and the validator can never silently disagree,
 * because the fallback is a declared outcome, not a gap.
 *
 * Annotations that carry no rendering or validation semantics
 * (`$schema`, `$id`, `$comment`, `$defs`, `definitions`) are ignored,
 * not fallback triggers — schemas routinely carry them.
 */

/** The keywords the forms renderer draws. */
export const FORM_KEYWORDS = new Set([
  "type",
  "enum",
  "const",
  "default",
  "examples",
  "format",
  "title",
  "description",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "allOf",
  "$ref",
  "oneOf",
  "discriminator",
]);

/** Annotations ignored rather than treated as fallback triggers. */
export const ANNOTATION_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$comment",
  "$defs",
  "definitions",
  "title",
  "description",
  "default",
  "examples",
  "deprecated",
  "readOnly",
  "writeOnly",
]);

/** The declared `format` set (work document #57): what renders specially. */
export const DECLARED_FORMATS = new Set([
  "date",
  "date-time",
  "time",
  "color",
  "uri",
  "email",
  "uuid",
]);

/** The keywords that force a subtree to the raw JSON fallback. */
export const FALLBACK_KEYWORDS = [
  "anyOf",
  "if",
  "then",
  "else",
  "not",
  "pattern",
  "patternProperties",
  "unevaluatedProperties",
  "unevaluatedItems",
  "contains",
  "dependentSchemas",
  "dependentRequired",
  "propertyNames",
];

/**
 * The rendered node kinds.
 *
 * @typedef {"object" | "array" | "string" | "number" | "integer" | "boolean" | "enum" | "const" | "picker" | "fallback"} NodeKind
 */

/**
 * A render-tree node.
 *
 * @typedef {Object} FormNode
 * @property {NodeKind} kind
 * @property {any} schema The (possibly merged) schema for this subtree.
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [format]
 * @property {any} [defaultValue]
 * @property {Array<{ name: string, node: FormNode, required: boolean }>} [properties]
 * @property {boolean} [closed] `additionalProperties: false`.
 * @property {FormNode} [items] The array items' node.
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {any[]} [enum]
 * @property {any} [const]
 * @property {string} [fallbackReason] Why this subtree fell back.
 * @property {{ propertyName: string, branches: Array<{ value: any, label: string, node: FormNode }> }} [picker]
 */

/**
 * Whether a schema object carries a fallback-triggering keyword.
 *
 * @param {any} schema
 * @returns {string | null} The reason, or null when none applies.
 */
function fallbackReason(schema) {
  for (const keyword of FALLBACK_KEYWORDS) {
    if (schema[keyword] !== undefined) {
      return `the "${keyword}" keyword is outside the declared forms subset`;
    }
  }
  // An unknown keyword is a declared-vocabulary risk: fallback rather
  // than render a form that silently ignores it
  for (const keyword of Object.keys(schema)) {
    if (
      !FORM_KEYWORDS.has(keyword) &&
      !ANNOTATION_KEYWORDS.has(keyword) &&
      !FALLBACK_KEYWORDS.includes(keyword)
    ) {
      return `the "${keyword}" keyword is not in the declared vocabulary`;
    }
  }
  return null;
}

/**
 * Merges an `allOf` composition into one schema for rendering: the
 * members' property maps combine (the member's own field wins on
 * conflicts — later constraints specialize earlier ones), `required`
 * unions, and the members' own scalar fields fill gaps. A member that
 * carries a fallback keyword taints the whole composition — the merged
 * form cannot silently under-render it.
 *
 * @param {any[]} members
 * @returns {any}
 */
function mergeAllOf(members) {
  /** @type {any} */
  const merged = {};
  for (const member of members) {
    if (!member || typeof member !== "object") continue;
    for (const [key, value] of Object.entries(member)) {
      if (key === "allOf") continue;
      if (key === "required") {
        merged.required = [...new Set([...(merged.required ?? []), ...value])];
      } else if (key === "properties") {
        merged.properties = { ...(merged.properties ?? {}), ...value };
      } else if (merged[key] === undefined) {
        merged[key] = value;
      }
    }
  }
  return merged;
}

/**
 * The walk context: the root document (local `$ref` resolution), and the
 * resolved reference map the element prepared — refs the session could
 * not resolve fall back, per the offline degradation ladder.
 *
 * @typedef {Object} WalkContext
 * @property {any} [root]
 * @property {Map<string, any>} [refs]
 */

/**
 * Resolves a `$ref`: local pointers into the root document, prepared
 * refs by their published form, or unresolved.
 *
 * @param {string} ref
 * @param {WalkContext | undefined} ctx
 * @returns {any | null} The referenced schema, or null.
 */
function resolveRef(ref, ctx) {
  if (!ctx) return null;
  const prepared = ctx.refs?.get(ref);
  if (prepared !== undefined) return prepared;
  if (ref.startsWith("#") && ctx.root) {
    // Local pointer: #/$defs/name walks the root document
    const pointer = ref.slice(1);
    if (pointer === "") return ctx.root;
    let current = ctx.root;
    for (const segment of pointer.split("/").filter(Boolean)) {
      current = current?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")];
    }
    return current ?? null;
  }
  return null;
}

/**
 * Classifies and renders a schema into the forms render tree.
 *
 * @param {any} schema
 * @param {number} [depth] Recursion guard for pathological documents.
 * @param {WalkContext} [ctx]
 * @returns {FormNode}
 */
export function buildFormNode(schema, depth = 0, ctx) {
  // $ref: resolve first, then classify the target — a ref the session
  // cannot resolve falls back (the offline degradation ladder), and a
  // resolvable one renders its target's form
  if (schema?.$ref !== undefined) {
    const resolved = resolveRef(schema.$ref, ctx);
    if (resolved === null || resolved === undefined) {
      return {
        kind: "fallback",
        schema,
        fallbackReason: `the "$ref" "${schema.$ref}" cannot be resolved in this session`,
      };
    }
    return buildFormNode(resolved, depth + 1, ctx);
  }

  const reason = fallbackReason(schema ?? {});
  if (reason) {
    return { kind: "fallback", schema: schema ?? {}, fallbackReason: reason };
  }

  let resolved = schema;
  if (Array.isArray(schema.allOf)) {
    resolved = mergeAllOf(schema.allOf);
    const mergedReason = fallbackReason(resolved);
    if (mergedReason) {
      return {
        kind: "fallback",
        schema,
        fallbackReason: `the allOf composition carries ${mergedReason}`,
      };
    }
  }

  /** @type {FormNode} */
  const node = {
    kind: "string",
    schema: resolved,
    ...(resolved.title === undefined ? {} : { title: resolved.title }),
    ...(resolved.description === undefined
      ? {}
      : { description: resolved.description }),
    ...(resolved.default === undefined
      ? {}
      : { defaultValue: resolved.default }),
    ...(resolved.format === undefined ? {} : { format: resolved.format }),
  };

  if (resolved.const !== undefined) {
    node.kind = "const";
    node.const = resolved.const;
    return node;
  }
  if (Array.isArray(resolved.enum)) {
    node.kind = "enum";
    node.enum = resolved.enum;
    return node;
  }

  // The oneOf picker (work document #57): OpenAPI-style discriminator —
  // the property whose value selects the implementation, with the
  // optional value-to-reference mapping resolved through the prepared
  // refs. A oneOf without a discriminator stays a fallback: pickers
  // need the selector
  if (Array.isArray(resolved.oneOf)) {
    const discriminator = resolved.discriminator;
    if (
      !discriminator ||
      typeof discriminator.propertyName !== "string" ||
      depth > 8
    ) {
      return {
        kind: "fallback",
        schema: resolved,
        fallbackReason: 'a "oneOf" without a discriminator',
      };
    }
    const propertyName = discriminator.propertyName;
    /** @type {Array<{ value: any, label: string, node: FormNode }>} */
    const branches = [];
    if (discriminator.mapping && typeof discriminator.mapping === "object") {
      for (const [value, ref] of Object.entries(discriminator.mapping)) {
        const resolvedBranch = resolveRef(ref, ctx);
        if (resolvedBranch === null || resolvedBranch === undefined) {
          return {
            kind: "fallback",
            schema: resolved,
            fallbackReason: `the discriminator mapping's "${ref}" cannot be resolved in this session`,
          };
        }
        const branchNode = buildFormNode(resolvedBranch, depth + 1, ctx);
        branches.push({ value, label: value, node: branchNode });
      }
    } else {
      for (const member of resolved.oneOf) {
        const selector = member?.properties?.[propertyName];
        const value =
          selector?.const ??
          (Array.isArray(selector?.enum) ? selector.enum[0] : undefined);
        if (value === undefined) {
          return {
            kind: "fallback",
            schema: resolved,
            fallbackReason: 'a "oneOf" branch without a selector value',
          };
        }
        const label = member.title ?? selector.title ?? String(value);
        branches.push({
          value,
          label,
          node: buildFormNode(member, depth + 1, ctx),
        });
      }
    }
    node.kind = "picker";
    node.picker = { propertyName, branches };
    return node;
  }

  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  if (type === "object" || resolved.properties !== undefined) {
    node.kind = "object";
    node.properties = Object.entries(resolved.properties ?? {}).map(
      ([name, child]) => ({
        name,
        node:
          depth > 8
            ? {
                kind: "fallback",
                schema: child,
                fallbackReason: "recursion depth",
              }
            : buildFormNode(child, depth + 1),
        required: (resolved.required ?? []).includes(name),
      }),
    );
    node.closed = resolved.additionalProperties === false;
    return node;
  }

  if (type === "array" || resolved.items !== undefined) {
    node.kind = "array";
    node.items = resolved.items
      ? depth > 8
        ? {
            kind: "fallback",
            schema: resolved.items,
            fallbackReason: "recursion depth",
          }
        : buildFormNode(resolved.items, depth + 1)
      : undefined;
    node.minItems = resolved.minItems;
    node.maxItems = resolved.maxItems;
    return node;
  }

  if (type === "boolean") {
    node.kind = "boolean";
    return node;
  }

  if (type === "integer" || type === "number") {
    node.kind = type === "integer" ? "integer" : "number";
    node.minimum = resolved.minimum;
    node.maximum = resolved.maximum;
    return node;
  }

  // type: string (the default for schemas without an explicit type), or
  // no type at all with only annotations — an unconstrained value renders
  // as the string form only when the schema says string; anything else is
  // the shapeless passthrough
  if (type === undefined && resolved.properties === undefined) {
    node.kind = "fallback";
    node.fallbackReason = "no type constraint: the shapeless passthrough";
    return node;
  }

  return node;
}
