/**
 * @file The language registry (work document #66): maps a language id to
 * the CodeMirror extension the editors render with, and — through the
 * flavor's language entries — to the file extension materialization uses.
 * The CodeMirror half takes the vendored surface (one module instance per
 * context); languages without a vendored `@codemirror/lang-*` package fall
 * back to plain text until their package lands (dependency decisions
 * handled separately, ask-first).
 */

/**
 * The CodeMirror language extension for one language id, or null for
 * plain text.
 *
 * @param {any} cm The vendored CodeMirror surface (EditorView, basicSetup,
 *   javascript, markdown, …).
 * @param {string} language The language id.
 * @returns {any | null} The extension, or null when the language has no
 *   vendored mode.
 */
export function codeMirrorExtension(cm, language) {
  const id = String(language ?? "");
  if (id === "markdown") return cm.markdown();
  if (id === "javascript") return cm.javascript();
  if (id === "typescript") {
    // The vendored @codemirror/lang-javascript carries the TypeScript
    // dialect behind one option
    return cm.javascript({ typescript: true });
  }
  return null;
}

/**
 * The file extension for a language, from the flavor's language entries —
 * the materialization's component code path consults this so a TypeScript
 * component materializes as `.ts`.
 *
 * @param {any} flavor The flavor descriptor.
 * @param {string} language The language id.
 * @param {string} [fallback] The extension when the language is unknown to
 *   the flavor; defaults to the flavor's preferred language's extension.
 * @returns {string} The extension without the dot.
 */
export function fileExtensionFor(flavor, language, fallback) {
  const id = String(language ?? "");
  const entry = (flavor?.languages ?? []).find(
    (/** @type {any} */ l) => l.id === id,
  );
  if (entry) return entry.ext;
  if (fallback !== undefined) return fallback;
  const preferred = (flavor?.languages ?? []).find(
    (/** @type {any} */ l) => l.id === flavor?.preferredLanguage,
  );
  return preferred?.ext ?? "txt";
}
