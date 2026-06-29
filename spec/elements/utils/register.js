import { Window } from "happy-dom";

const window = new Window();

// Expose essential browser globals to Node's global scope
Object.assign(globalThis, {
  window,
  document: window.document,
  customElements: window.customElements,
  HTMLElement: window.HTMLElement,
  Event: window.Event,
  CustomEvent: window.CustomEvent,
  ShadowRoot: window.ShadowRoot,
  MutationObserver: window.MutationObserver,
  Node: window.Node,
});
