/**
 * @file Single-line text prompts in a modal (guidelines §12: no
 * `window.prompt` anywhere). The Glass asks for names and values through
 * `<noflo-modal>` with a text input; this module owns the prompt element
 * and the export-rename flow built on it (work document #5 update #36):
 * the editor's `export-rename-attempt` opens the prompt, and the resolved
 * name rides the mapper's existing `port-renamed` path.
 */

import { emit, on } from "../events.js";

/**
 * Renders (or hides) an adjacent validation feedback line inside a modal
 * (guidelines §12): an attention-colored message beside the control it
 * describes, placed before the given anchor element. Empty message hides.
 *
 * @param {HTMLElement} modal
 * @param {string} message
 * @param {Element} anchor
 * @returns {void}
 */
export function setModalFeedback(modal, message, anchor) {
  let feedback = modal.querySelector(".prompt-feedback");
  if (message) {
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "prompt-feedback alert alert-danger";
      modal.insertBefore(feedback, anchor);
    }
    feedback.textContent = message;
    /** @type {HTMLElement} */ (feedback).style.display = "";
  } else if (feedback) {
    /** @type {HTMLElement} */ (feedback).style.display = "none";
  }
}

/** The lazily created prompt modal, reused across prompts. */
/** @type {HTMLElement | null} */
let promptModal = null;

/**
 * Opens a modal asking for a single line of text. Resolves with the
 * entered (trimmed) value, or `null` when the user cancels, dismisses the
 * dialog, or confirms an empty value.
 *
 * @param {{ title: string, value?: string, confirmLabel?: string, message?: string }} options
 *   `message` renders an adjacent attention feedback line (a validation
 *   error from a previous attempt, guidelines §12) above the input.
 * @returns {Promise<string | null>}
 */
export async function openTextPrompt({
  title,
  value = "",
  confirmLabel = "OK",
  message = "",
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
    promptModal.setAttribute("data-prompt", "text");
    app.appendChild(promptModal);
  }
  const input = /** @type {HTMLInputElement} */ (
    promptModal.querySelector("input")
  );
  if (!input) return null;
  setModalFeedback(promptModal, message, input);
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

/** The lazily created JSON prompt modal, reused across prompts. */
/** @type {HTMLElement | null} */
let jsonPromptModal = null;

/**
 * Opens a modal asking for a JSON value in a textarea — the fallback for
 * unconstrained datatypes (`all`), where no JSON Schema exists to derive
 * typed widgets from (guidelines §12: raw JSON text only where no typed
 * form is possible). Resolves the parsed JSON value; text that does not
 * parse resolves as a raw string, the same convention the IIP store uses
 * when loading. `null` on cancel, dismissal, or an empty value.
 *
 * @param {{ title: string, value?: string, confirmLabel?: string }} options
 * @returns {Promise<any | null>}
 */
export async function openJsonPrompt({
  title,
  value = "",
  confirmLabel = "OK",
}) {
  const app = document.getElementById("app");
  if (!app) return null;
  if (!jsonPromptModal) {
    jsonPromptModal = /** @type {HTMLElement} */ (
      /** @type {any} */ (document.createElement("noflo-modal"))
    );
    const textarea = document.createElement("textarea");
    textarea.className = "form-control";
    textarea.rows = 6;
    textarea.setAttribute("autocapitalize", "off");
    textarea.setAttribute("autocorrect", "off");
    textarea.setAttribute("spellcheck", "false");
    jsonPromptModal.appendChild(textarea);
    jsonPromptModal.setAttribute("data-prompt", "json");
    app.appendChild(jsonPromptModal);
  }
  const textarea = /** @type {HTMLTextAreaElement} */ (
    jsonPromptModal.querySelector("textarea")
  );
  if (!textarea) return null;
  /** @type {any} */ (jsonPromptModal).setActions([
    { value: "ok", label: confirmLabel, kind: "btn-primary" },
    { value: "cancel", label: "Cancel", kind: "btn-secondary" },
  ]);
  textarea.value = value;
  /** @type {any} */ (jsonPromptModal).open(title);
  textarea.focus();
  const action = await /** @type {any} */ (jsonPromptModal).submit();
  if (action !== "ok") return null;
  const text = textarea.value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Wires the exported-port rename flow: the editor reports the attempt (its
 * port menu's Rename item), the shell asks for the new name here, and the
 * resolved rename is emitted back through `port-renamed`, which the intent
 * mapper maps onto `renameInport`/`renameOutport` (work document #5
 * update #36). Port names are unique per direction: a taken name
 * re-prompts with adjacent feedback instead of sending a refusing intent.
 *
 * @param {HTMLElement} editor
 * @param {(direction: string, name: string) => boolean} isNameTaken
 *   Whether the open graph already has an export of that direction under
 *   the name.
 * @returns {void}
 */
export function wireExportRename(editor, isNameTaken = () => false) {
  on(editor, "export-rename-attempt", async (e) => {
    const detail =
      /** @type {CustomEvent<{ name: string, direction: string }>} */ (e)
        .detail;
    const directionLabel = detail.direction === "in" ? "inport" : "outport";
    let candidate = detail.name;
    let conflict = false;
    for (;;) {
      const renamed = await openTextPrompt({
        title: `Rename ${directionLabel}`,
        value: candidate,
        confirmLabel: "Rename",
        message: conflict
          ? `An ${directionLabel} named "${candidate}" already exists`
          : undefined,
      });
      if (!renamed || renamed === detail.name) return;
      if (!isNameTaken(detail.direction, renamed)) {
        emit(editor, "port-renamed", {
          oldName: detail.name,
          newName: renamed,
          direction: detail.direction,
        });
        return;
      }
      candidate = renamed;
      conflict = true;
    }
  });
}
