/**
 * @file The runtime flavor registry (work document #66): the resolver over
 * the bundled flavor descriptors. Sources layer — bundled first, project
 * overrides and runtime-provided self-description later — but Phase 1
 * serves the bundled registry alone; the resolver's shape is the seam the
 * later layers plug into.
 *
 * Flavor ids are implementation families (`noflo`); legacy FBP 1.0
 * platform-qualified type strings (`noflo-nodejs`, `noflo-browser`, …)
 * collapse onto them through the alias table.
 */

import { nofloFlavor } from "./noflo.js";

/** The bundled flavors, keyed by id. */
const BUNDLED = new Map([["noflo", nofloFlavor]]);

/**
 * The legacy platform-qualified runtime types collapse onto flavors: every
 * `noflo-*` type is the noflo implementation family.
 *
 * @param {string} typeId
 * @returns {string} The flavor id.
 */
export function resolveFlavorId(typeId) {
  const id = String(typeId ?? "").trim();
  if (BUNDLED.has(id)) return id;
  if (id.startsWith("noflo-") || id === "noflo") return "noflo";
  return id;
}

/**
 * Returns the flavor for a runtime type id, falling back to the generic
 * descriptor for unknown families — the resolver never fails on an
 * unknown runtime.
 *
 * @param {string} typeId
 * @returns {any} The flavor descriptor.
 */
export function getFlavor(typeId) {
  const id = resolveFlavorId(typeId);
  return (
    BUNDLED.get(id) ?? {
      id,
      shortname: id,
      icon: "cloud",
      description: "A flow-based programming runtime",
      languages: [{ id: "text", label: "Plain text", ext: "txt" }],
      preferredLanguage: "text",
      templates: {},
      materialization: {
        manifest: null,
        dependencies: {},
        graphFormat: "graph-json",
        testDir: "specs/",
        testScript: null,
        componentCodeExt: "txt",
      },
      docs: [],
      examples: {},
    }
  );
}

/**
 * Derives a code-safe identifier from a component's local name: PascalCase
 * over the alphanumeric runs — the class-name form languages with nominal
 * types need ("Parse", "MyWidget"). The namespace is deliberately not part
 * of it: the flavor's template decides how namespace and identifier combine.
 *
 * @param {string} shortName The component's local name (after the slash).
 * @returns {string}
 */
export function identifierFrom(shortName) {
  const parts = String(shortName ?? "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) return "Component";
  return parts.map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

/**
 * Builds the template interpolation context for one component: the name in
 * every form the per-language templates need — the full namespaced name,
 * the namespace (module prefix), the short local name, and the sanitized
 * identifier (the class-name form) — plus the declared SIGNATURE AS-IS
 * (inports/outports with their registry fields, description, icon). The
 * signature passes through untouched: templates read what they need,
 * nothing is mapped or lossy.
 *
 * @param {any} flavor The flavor descriptor.
 * @param {any} signature The declared signature as the registry holds it.
 * @param {string} componentName The full, library-namespaced name.
 * @returns {any} The template context.
 */
export function templateContext(flavor, signature, componentName) {
  const name = String(componentName ?? "");
  const slash = name.indexOf("/");
  const namespace = slash === -1 ? "" : name.slice(0, slash);
  const shortName = slash === -1 ? name : name.slice(slash + 1);
  return {
    name,
    namespace,
    shortName,
    identifier: identifierFrom(shortName),
    ...signature,
    language: flavor.preferredLanguage,
  };
}

/**
 * Renders one component's scaffold through the flavor's template for the
 * language. The template is a deterministic interpolation over the
 * context — no EJS.
 *
 * @param {string} typeId The runtime type id (aliased onto flavors).
 * @param {any} signature The declared signature as the registry holds it.
 * @param {string} componentName The full, library-namespaced name.
 * @param {string} [language] The implementation language; defaults to the
 *   flavor's preferred language.
 * @returns {{ code: string, language: string } | null} Null when the
 *   flavor carries no template for the language.
 */
export function renderScaffold(typeId, signature, componentName, language) {
  const flavor = getFlavor(typeId);
  const lang = language ?? flavor.preferredLanguage;
  const template = flavor.templates?.[lang];
  if (!template) return null;
  return {
    code: template(templateContext(flavor, signature, componentName)),
    language: lang,
  };
}
