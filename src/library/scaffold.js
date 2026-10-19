/**
 * @file The component scaffold's dispatch (work document #66): the flavor
 * registry owns the templates and the interpolation context — this module
 * stays the call site the Glass uses, resolving the flavor for the
 * project's runtime and rendering through it. The declared signature
 * passes through AS-IS: the template reads what it needs (ports, metadata)
 * from the registry's own shape, nothing mapped or lossy.
 */

import { renderScaffold } from "./runtimeinfo/index.js";

/**
 * Renders the scaffold for a new component implementation through the
 * project runtime's flavor (work document #66): the template is the
 * flavor's, deterministic over the declared signature — the generated
 * component is a working signature-only stub that loads and runs as it
 * is.
 *
 * @param {string} componentName The full, library-namespaced component
 *   name.
 * @param {Object} [options]
 * @param {any} [options.signature] The component's declared signature as
 *   the registry holds it (inports/outports with their fields, description,
 *   icon) — passed through to the template untouched.
 * @param {string} [options.runtime] The project's runtime flavor id;
 *   defaults to noflo.
 * @param {string} [options.language] The implementation language;
 *   defaults to the flavor's preferred language.
 * @returns {{ code: string, language: string } | null} Null when the
 *   flavor carries no template for the language.
 */
export function codeScaffold(componentName, options = {}) {
  return renderScaffold(
    options.runtime ?? "noflo",
    options.signature ?? {},
    componentName,
    options.language,
  );
}
