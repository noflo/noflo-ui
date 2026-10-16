/**
 * @file The Tier B validator (work document #57; the noflo-side normative
 * rule set): full JSON Schema 2020-12 validation for the editor bundle —
 * hard enforcement at send time, errors rendered beside the controls
 * they describe. Ajv's 2020-12 class compiled with `allErrors` and
 * `strict: false`: the noflo extension vocabulary (`discriminator`,
 * root-level `implements`, the catalog annotations) is declared optional
 * through `$vocabulary`'s `false` form, so a validator that does not
 * know our keywords ignores them rather than refusing the document.
 *
 * The seam contract: returns the error list with JSON Pointer paths, or
 * **null** when the schema does not compile — the caller falls back to
 * the in-repo subset validator, because a schema Ajv refuses is exactly
 * the schema whose validation must not silently pass.
 */

import Ajv2020 from "../../../vendor/ajv.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });

/** Compiled validators keyed by schema object identity. */
const compiled = new WeakMap();

/**
 * Validates a value against a schema with the full 2020-12 vocabulary.
 *
 * @param {any} value
 * @param {any} schema
 * @returns {import("./validate.js").ValidationError[] | null} The errors,
 *   or null when the schema does not compile.
 */
export function tierBValidate(value, schema) {
  if (!schema || typeof schema !== "object") return null;
  try {
    let validate = compiled.get(schema);
    if (!validate) {
      validate = ajv.compile(schema);
      compiled.set(schema, validate);
    }
    const valid = validate(value);
    if (valid) return [];
    return (validate.errors ?? []).map((/** @type {any} */ error) => {
      // Required errors land on the parent object with the missing
      // property in params — the path moves to the missing child so the
      // error renders beside the control that satisfies it
      const missing = error.params?.missingProperty;
      const path = missing
        ? `#${error.instancePath ?? ""}/${missing}`
        : `#${error.instancePath ?? ""}`;
      return { path, message: error.message ?? "is invalid" };
    });
  } catch {
    // A schema Ajv cannot compile (uncompilable regular expressions,
    // malformed documents): null sends the caller to the subset
    // validator — validation never silently passes
    return null;
  }
}
