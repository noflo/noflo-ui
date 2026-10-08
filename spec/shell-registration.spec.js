import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Shell registration contract: every custom element declared in an HTML
 * shell must be registered by that shell's entry module's import graph.
 * Element modules self-register on import, so a "cleaned up" unused import
 * silently un-registers a declared element — the element then stays an
 * un-upgraded HTMLElement and its methods are missing at runtime (this bit
 * the mesh settings dialog when a lint pass dropped app.js's side-effect
 * import). This check walks the static import graph with file reads only.
 */

const ROOT = path.resolve(import.meta.dirname, "..");

/** @type {Array<[string, string]>} shell, entry module (repo-relative) */
const SHELLS = [
  ["index.html", "src/main.js"],
  ["app.html", "src/app.js"],
];

/**
 * The custom element tag names a module registers.
 *
 * @param {string} file Repo-relative module path
 * @returns {string[]}
 */
function definedTags(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  return [
    ...source.matchAll(/customElements\.define\(\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
}

/**
 * All modules reachable from the entry through static imports (relative
 * specifiers only; bare specifiers map through the import map to vendored
 * files that register nothing).
 *
 * @param {string} entry Repo-relative module path
 * @returns {Set<string>}
 */
function importGraph(entry) {
  const seen = new Set([entry]);
  /** @type {string[]} */
  const queue = [entry];
  while (queue.length > 0) {
    const file = /** @type {string} */ (queue.pop());
    let source = "";
    try {
      source = readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    const specs = [
      ...source.matchAll(
        /(?:^|\s)(?:import|export)\s+(?:[^;\n]*?from\s+)?["']([^"']+)["']/g,
      ),
    ].map((match) => match[1]);
    for (const spec of specs) {
      if (!spec.startsWith(".")) continue;
      const resolved = path
        .relative(ROOT, path.resolve(path.dirname(path.join(ROOT, file)), spec))
        .replaceAll("\\", "/");
      if (!seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return seen;
}

describe("shell element registration contract", () => {
  for (const [shell, entry] of SHELLS) {
    it(`registers every custom element ${shell} declares`, () => {
      const html = readFileSync(path.join(ROOT, shell), "utf8");
      const tags = [
        ...new Set(
          [...html.matchAll(/<(noflo|flow)-[a-z-]+/g)].map((match) =>
            match[0].slice(1),
          ),
        ),
      ];
      const modules = importGraph(entry);
      /** @type {Map<string, string>} */
      const defining = new Map();
      for (const module of modules) {
        for (const tag of definedTags(module)) {
          defining.set(tag, module);
        }
      }
      for (const tag of tags) {
        assert.ok(
          defining.has(tag),
          `${shell} declares <${tag}> but no module in ${entry}'s import graph registers it — add the element module's side-effect import to the entry`,
        );
      }
    });
  }
});
