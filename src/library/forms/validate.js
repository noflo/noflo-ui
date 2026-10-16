/**
 * @file The forms-subset validator (work document #57): validation for
 * the declared forms vocabulary, in-repo so the form is functional
 * without a validator dependency.
 *
 * The seam: the noflo-side normative rule set puts **full JSON Schema
 * validation** in the editor bundle (Tier B, hard enforcement at send
 * time — validator dependencies are expected there). This module
 * validates the declared subset and ignores unknown keywords; when the
 * full Tier B validator lands (a vendored 2020-12 implementation), the
 * element's `validator` seam swaps it in without touching the renderer.
 *
 * Errors are paths into the value tree (`$.ports[2].name` JSON Pointer
 * form) so the form can place each error beside the control it
 * describes.
 */

/**
 * A validation error.
 *
 * @typedef {Object} ValidationError
 * @property {string} path JSON Pointer into the value tree.
 * @property {string} message
 */

/**
 * The declared `format` checks, kept deliberately shallow: the guards'
 * vocabulary excludes formats (ReDoS, recursion — editor concerns), and
 * these are the editor-side light checks, not full format assertions.
 *
 * @type {Record<string, (value: string) => boolean>}
 */
const FORMAT_CHECKS = {
  date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
  "date-time": (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value),
  time: (value) => /^\d{2}:\d{2}/.test(value),
  color: (value) =>
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value),
  uuid: (value) =>
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value,
    ),
};

/**
 * Whether a value satisfies a schema's type keyword (the single-string
 * form; the array form takes the first — the declared subset's own
 * simplification, mirroring the in-band guards).
 *
 * @param {any} value
 * @param {string | undefined} type
 * @returns {boolean}
 */
function matchesType(value, type) {
  switch (type) {
    case undefined:
      return true;
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return (
        value !== null && typeof value === "object" && !Array.isArray(value)
      );
    case "array":
      return Array.isArray(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}

/**
 * Validates a value against a schema (the declared subset).
 *
 * @param {any} value
 * @param {any} schema
 * @param {string} path JSON Pointer prefix for this subtree.
 * @param {ValidationError[]} errors The collector.
 * @param {number} depth Recursion guard.
 */
function validateNode(value, schema, path, errors, depth) {
  if (depth > 16 || schema === undefined || schema === null) return;

  // Composition: allOf validates against every member (the members' own
  // fallback keywords validate structurally too — the validator is not
  // bound by the renderer's subset)
  if (Array.isArray(schema.allOf)) {
    for (const member of schema.allOf) {
      validateNode(value, member, path, errors, depth + 1);
    }
  }

  if (schema.type !== undefined && !matchesType(value, schema.type)) {
    errors.push({
      path,
      message: `expected ${schema.type}${value === null ? "" : ` (${typeof value} given)`}`,
    });
    return;
  }

  if (
    schema.const !== undefined &&
    JSON.stringify(value) !== JSON.stringify(schema.const)
  ) {
    errors.push({
      path,
      message: `must equal ${JSON.stringify(schema.const)}`,
    });
    return;
  }

  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some(
      (/** @type {any} */ option) =>
        JSON.stringify(option) === JSON.stringify(value),
    )
  ) {
    errors.push({
      path,
      message: `must be one of: ${schema.enum.map((/** @type {any} */ option) => JSON.stringify(option)).join(", ")}`,
    });
    return;
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path, message: `must be ≥ ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path, message: `must be ≤ ${schema.maximum}` });
    }
  }

  if (typeof value === "string" && typeof schema.format === "string") {
    const check = FORMAT_CHECKS[schema.format];
    if (check && !check(value)) {
      errors.push({ path, message: `is not a valid ${schema.format}` });
    }
  }

  if (Array.isArray(value) && typeof schema.items === "object") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path, message: `needs at least ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path, message: `allows at most ${schema.maxItems} items` });
    }
    value.forEach((item, index) =>
      validateNode(item, schema.items, `${path}/${index}`, errors, depth + 1),
    );
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];
    for (const name of required) {
      if (value[name] === undefined) {
        errors.push({ path: `${path}/${name}`, message: "is required" });
      }
    }
    for (const [name, child] of Object.entries(properties)) {
      if (value[name] !== undefined) {
        validateNode(value[name], child, `${path}/${name}`, errors, depth + 1);
      }
    }
    if (schema.additionalProperties === false) {
      for (const name of Object.keys(value)) {
        if (properties[name] === undefined) {
          errors.push({
            path: `${path}/${name}`,
            message: "is not allowed (the schema is closed)",
          });
        }
      }
    }
  }
}

/**
 * Validates a value against a schema, returning the errors (empty when
 * valid). The path root is `#` per JSON Pointer convention so messages
 * read naturally beside controls.
 *
 * @param {any} value
 * @param {any} schema
 * @returns {ValidationError[]}
 */
export function validate(value, schema) {
  /** @type {ValidationError[]} */
  const errors = [];
  validateNode(value, schema, "#", errors, 0);
  return errors;
}
