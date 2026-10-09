/**
 * @file Vendor build entry (per SPEC "Build/Vendoring Mechanics"): exposes
 * the CodeMirror surface the editor uses as a single vendor module.
 *
 * CodeMirror's package graph (@codemirror/* internals, lib0, y-protocols)
 * is inlined so all contexts share one instance; `yjs` stays external and
 * re-points to the sibling `yjs.js` vendor bundle — the Y.Text instances
 * bound through `yCollab` must be the same yjs copy the CRDT layer uses.
 */
import { EditorState } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
export { EditorView, basicSetup, minimalSetup } from "codemirror";
export { EditorState, HighlightStyle, syntaxHighlighting, tags };
export { javascript } from "@codemirror/lang-javascript";
export { markdown } from "@codemirror/lang-markdown";
export { yCollab } from "y-codemirror.next";
