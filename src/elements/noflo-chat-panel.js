/**
 * @file The chat panel (work document #47 item 3): the Glass's surface for
 * talking to the Companion's agent. The messages flow Glass → MESH chat →
 * the bridge's chat dispatch (pi) → the response echoes back. The panel
 * renders the conversation — the same agent the LXMF chat surface serves,
 * accessible in the IDE without an external LXMF client.
 *
 * The panel lives as a bottom-sheet overlay (per #62's screen model: a
 * companion surface, not a primary screen). It collapses to a chip and
 * expands on interaction. The visual language follows VISUAL_GUIDELINES:
 * the panel background, the semantic variables, the draft styling for
 * pending sends.
 */

import { emit } from "../events.js";

/**
 * @param {any} value
 * @returns {string}
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class NofloChatPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {Array<{ text: string, role: string, time: number }>} The
     * conversation, newest last. */
    this._messages = [];
    /** @type {boolean} Whether the panel is visible. */
    this._open = false;
    /** @type {string | null} The pending send's text (draft styling). */
    this._pending = null;
  }

  connectedCallback() {
    if (!this.shadowRoot?.innerHTML) this.render();
  }

  /** Shows the panel. */
  show() {
    this._open = true;
    this.removeAttribute("hidden");
    this.render();
    const input = /** @type {HTMLInputElement | null} */ (
      this.shadowRoot?.querySelector(".chat-input")
    );
    input?.focus();
  }

  /** Hides the panel. */
  hide() {
    this._open = false;
    this.setAttribute("hidden", "");
  }

  /**
   * Appends a message to the conversation.
   *
   * @param {{ text: string, role: string }} message
   */
  /**
   * @param {{ text: string, role: string }} message
   */
  addMessage(message) {
    this._messages.push({
      text: message.text,
      role: message.role,
      time: Date.now(),
    });
    this._pending = null;
    this.render();
    this._scrollToBottom();
  }

  /** Marks a send as pending (the draft styling while the agent thinks). */
  /**
   * @param {string} text
   */
  setPending(text) {
    this._pending = text;
    this.render();
    this._scrollToBottom();
  }

  _scrollToBottom() {
    const scroll = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.querySelector(".chat-scroll")
    );
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const messages = this._messages
      .map(
        (/** @type {any} */ message) => `<div class="message ${escapeHtml(message.role)}">
          <span class="role">${message.role === "assistant" ? "agent" : "you"}</span>
          <span class="text">${escapeHtml(message.text)}</span>
        </div>`,
      )
      .join("");
    const pending = this._pending
      ? `<div class="message user pending">
          <span class="role">you</span>
          <span class="text">${escapeHtml(this._pending)}</span>
        </div>`
      : "";
    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 56px;
          right: 16px;
          width: min(380px, calc(100vw - 32px));
          max-height: min(480px, 60vh);
          display: flex;
          flex-direction: column;
          background: var(--ui-bg, rgb(20, 27, 35));
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 8px;
          z-index: 90;
          color: var(--node-text);
          font-family: SourceCodePro, monospace;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }
        :host([hidden]) { display: none; }
        .head {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .head .title { flex: 1; color: var(--ui-accent, rgb(90, 200, 250)); }
        .chat-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 8px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .message {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.5;
        }
        .message.assistant {
          background: color-mix(in srgb, var(--ui-accent, rgb(90, 200, 250)) 8%, transparent);
          align-self: flex-start;
          max-width: 85%;
        }
        .message.user {
          background: color-mix(in srgb, var(--ui-age-calm, #7ee3a0) 10%, transparent);
          align-self: flex-end;
          max-width: 85%;
        }
        .message.pending { opacity: 0.5; }
        .message .role {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: color-mix(in srgb, currentColor 50%, transparent);
        }
        .message .text { white-space: pre-wrap; }
        .composer {
          display: flex;
          gap: 8px;
          padding: 8px 14px;
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: var(--ui-radius, 6px);
          color: inherit;
          font: inherit;
          font-size: 12px;
          padding: 8px 10px;
          outline: none;
          min-height: var(--ui-target, 44px);
        }
        .chat-input:focus { outline: 1px solid var(--ui-accent, rgb(90, 200, 250)); }
        button {
          background: transparent;
          color: var(--ui-accent, rgb(90, 200, 250));
          border: 1px solid var(--ui-accent, rgb(90, 200, 250));
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 11px;
          font-family: inherit;
          text-transform: uppercase;
          cursor: pointer;
        }
      </style>
      <div class="head">
        <span class="title">Agent</span>
        <button data-action="close">✕</button>
      </div>
      <div class="chat-scroll">
        ${messages || '<div class="message system"><span class="text">Talk to your project\'s agent.</span></div>'}
        ${pending}
      </div>
      <div class="composer">
        <input class="chat-input" placeholder="Message…" aria-label="Chat message">
        <button data-action="send">Send</button>
      </div>
    `;
    const input = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector(".chat-input")
    );
    const send = () => {
      const text = input?.value?.trim();
      if (!text) return;
      emit(this, "chat-send", { text });
      this.setPending(text);
      if (input) input.value = "";
    };
    shadow
      .querySelector("[data-action='send']")
      ?.addEventListener("click", send);
    input?.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        send();
      }
    });
    shadow
      .querySelector("[data-action='close']")
      ?.addEventListener("click", () => this.hide());
  }
}

customElements.define("noflo-chat-panel", NofloChatPanel);
