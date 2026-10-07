/**
 * @file Single-line text prompts in a modal (guidelines §12: no
 * `window.prompt` anywhere). The Glass asks for names and values through
 * `<noflo-modal>` with a text input; this module owns the prompt element
 * and the export-rename flow built on it (work document #5 update #36):
 * the editor's `export-rename-attempt` opens the prompt, and the resolved
 * name rides the mapper's existing `port-renamed` path.
 */

import { emit, on } from "../events.js";

/** The lazily created prompt modal, reused across prompts. */
/** @type {HTMLElement | null} */
let promptModal = null;

/**
 * Opens a modal asking for a single line of text. Resolves with the
 * entered (trimmed) value, or `null` when the user cancels, dismisses the
 * dialog, or confirms an empty value.
 *
 * @param {{ title: string, value?: string, confirmLabel?: string }} options
 * @returns {Promise<string | null>}
 */
export async function openTextPrompt({
  title,
  value = "",
  confirmLabel = "OK",
}) {
  const app = document.getElementById("app");
  if (!app) return null;
  if (!promptModal) {
    promptModal = /** @type {HTMLElement} */ (
      /** @type {any} */ (document.createElement("noflo-modal"))
    );
    const input = document.createElement("input");
    input.className = "form-control";
    input.type = "text";
    // Identifier-like values: no mobile autocorrect noise (guidelines §12)
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    promptModal.appendChild(input);
    app.appendChild(promptModal);
  }
  const input = /** @type {HTMLInputElement} */ (
    promptModal.querySelector("input")
  );
  if (!input) return null;
  // The confirm action is the footer's first button, so the input's
  // implicit Enter submission confirms rather than cancels
  /** @type {any} */ (promptModal).setActions([
    { value: "ok", label: confirmLabel, kind: "btn-primary" },
    { value: "cancel", label: "Cancel", kind: "btn-secondary" },
  ]);
  input.value = value;
  /** @type {any} */ (promptModal).open(title);
  input.focus();
  input.select();
  const action = await /** @type {any} */ (promptModal).submit();
  if (action !== "ok") return null;
  const trimmed = input.value.trim();
  return trimmed || null;
}

/**
 * Wires the exported-port rename flow: the editor reports the attempt (its
 * port menu's Rename item), the shell asks for the new name here, and the
 * resolved rename is emitted back through `port-renamed`, which the intent
 * mapper maps onto `renameInport`/`renameOutport` (work document #5
 * update #36).
 *
 * @param {HTMLElement} editor
 * @returns {void}
 */
export function wireExportRename(editor) {
  on(editor, "export-rename-attempt", async (e) => {
    const detail =
      /** @type {CustomEvent<{ name: string, direction: string }>} */ (e)
        .detail;
    const newName = await openTextPrompt({
      title: `Rename ${detail.direction === "in" ? "inport" : "outport"}`,
      value: detail.name,
      confirmLabel: "Rename",
    });
    if (!newName || newName === detail.name) return;
    emit(editor, "port-renamed", {
      oldName: detail.name,
      newName,
      direction: detail.direction,
    });
  });
}
