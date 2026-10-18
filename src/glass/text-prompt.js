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
  // The modals live on the body: #app hides while other screens are
  // active (work document #62), and a display:none ancestor suppresses
  // even the top layer
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
    document.body.appendChild(promptModal);
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
    document.body.appendChild(jsonPromptModal);
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

/**
 * The group-naming flow (work document #35's zone labels): the group
 * context menu's "Rename" opens the single-line modal prefilled with the
 * group's current name; the confirmed name emits back for the intent
 * mapper. An unchanged name renames nothing; empty keeps the "Group"
 * fallback label.
 *
 * @param {HTMLElement} editor
 * @param {(groupId: string) => string} currentName Resolves the group's
 *   current name from the replica.
 * @returns {void}
 */
export function wireGroupRename(editor, currentName) {
  on(editor, "group-rename-attempt", async (e) => {
    const detail = /** @type {CustomEvent<{ groupId: string }>} */ (e).detail;
    const named = await openTextPrompt({
      title: "Name group",
      value: currentName(detail.groupId),
      confirmLabel: "Name group",
    });
    if (named === null || named === currentName(detail.groupId)) return;
    emit(editor, "group-renamed", { groupId: detail.groupId, name: named });
  });
}

/**
 * The node's display-label rename (work document #64's small editors):
 * the node menu's Rename opens the shared single-line modal prefilled
 * with the node's current label; the confirmed label emits back for the
 * intent mapper. The label renders as the station's name; the id stays
 * the wire-referencing identity.
 *
 * @param {HTMLElement} editor
 * @param {(nodeId: string) => string} currentLabel Resolves the node's
 *   current display label (the metadata label, defaulting to the id).
 * @returns {void}
 */
export function wireNodeRename(editor, currentLabel) {
  on(editor, "node-rename-attempt", async (e) => {
    const detail = /** @type {CustomEvent<{ node: Element }>} */ (e).detail;
    const nodeId = /** @type {any} */ (detail.node).getAttribute("name") ?? "";
    const named = await openTextPrompt({
      title: "Rename node",
      value: currentLabel(nodeId),
      confirmLabel: "Rename node",
    });
    if (named === null || named === currentLabel(nodeId)) return;
    emit(editor, "node-renamed", { nodeId, label: named });
  });
}

/**
 * The graph's display-name rename (work document #64's small editors):
 * the canvas menu's Rename graph opens the shared single-line modal
 * prefilled with the graph's current name; the confirmed name emits back
 * for the intent mapper. The routing id stays.
 *
 * @param {HTMLElement} editor
 * @param {(graphId: string) => string} currentName Resolves the graph's
 *   current display name.
 * @param {() => string} graphId The active graph's id.
 * @returns {void}
 */
export function wireGraphRename(editor, currentName, graphId) {
  on(editor, "graph-rename-attempt", async () => {
    const id = graphId();
    const named = await openTextPrompt({
      title: "Rename graph",
      value: currentName(id),
      confirmLabel: "Rename graph",
    });
    if (named === null || named === currentName(id)) return;
    emit(editor, "graph-renamed", { graphId: id, name: named });
  });
}

/**
 * The route-naming flow (work document #35's route context): the editor's
 * "Name route" menu item opens the single-line modal prefilled with the
 * route's current name; the confirmed name emits back for the intent
 * mapper. An unchanged or empty name renames nothing — empty means the
 * custom name clears and the Tube line default takes over.
 *
 * @param {HTMLElement} editor
 * @param {(route: number) => string} currentName Resolves the route's
 *   current display name (custom when named, the Tube line default
 *   otherwise).
 * @returns {void}
 */
export function wireRouteNaming(editor, currentName) {
  on(editor, "route-name-attempt", async (e) => {
    const detail = /** @type {CustomEvent<{ route: number }>} */ (e).detail;
    const route = detail.route;
    const named = await openTextPrompt({
      title: `Name route ${route}`,
      value: currentName(route),
      confirmLabel: "Name route",
    });
    if (named === null || named === currentName(route)) return;
    emit(editor, "route-named", { route, name: named });
  });
}
