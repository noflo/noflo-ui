/**
 * @file The Collaborators panel (work document #61): avatars, presence
 * borders, and per-peer chat threads — one LXMF thread per identity. The
 * panel docks in the bottom-left Project corner beside the work-documents
 * accordion. The transport rides the project's chat relay (the interim
 * mesh path; #42's webapp LXMF router is the eventual replacement).
 *
 * The avatar's visual identity: a deterministic identicon from the
 * identity hash (#38's algorithm — one hash, one avatar, one identity
 * story). The hash stays visible beside every avatar as the recognition
 * cue.
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

/**
 * Derives a deterministic color pair from an identity hash: the
 * identicon's foreground and background. The hash's first bytes drive the
 * hue — one hash, one avatar, one identity story (#38).
 *
 * @param {string} hashHex The 32-hex-char identity hash.
 * @returns {{ fg: string, bg: string }}
 */
export function identiconColors(hashHex) {
  const bytes = [];
  for (let i = 0; i < 6 && i * 2 < hashHex.length; i += 2) {
    bytes.push(parseInt(hashHex.slice(i * 2, i * 2 + 2), 16) || 0);
  }
  const hue = (bytes[0] ?? 0) * 360 / 256;
  const sat = 45 + ((bytes[1] ?? 0) % 30);
  const light = 30 + ((bytes[2] ?? 0) % 25);
  return {
    fg: `hsl(${hue.toFixed(0)}, ${sat}%, ${light + 25}%)`,
    bg: `hsl(${hue.toFixed(0)}, ${sat}%, ${light}%)`,
  };
}

/**
 * Renders a 4×4 identicon SVG from an identity hash: the hash's bytes
 * determine which cells are filled and their color, mirrored for
 * symmetry. The visual fingerprint one hash produces.
 *
 * @param {string} hashHex The 32-hex-char identity hash.
 * @param {number} [size] The SVG's pixel size.
 * @returns {string} The SVG markup.
 */
export function identiconSvg(hashHex, size = 36) {
  const { fg, bg } = identiconColors(hashHex);
  const cells = [];
  const grid = 4;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < Math.ceil(grid / 2); x++) {
      const index = y * 2 + x;
      const byte = parseInt(hashHex.slice(index * 2, index * 2 + 2) || "0", 16);
      if (byte % 3 !== 0) {
        const px = (size / grid) * x;
        const pxMirror = (size / grid) * (grid - 1 - x);
        const py = (size / grid) * y;
        const wh = size / grid;
        cells.push(
          `<rect x="${px}" y="${py}" width="${wh}" height="${wh}" fill="${fg}"/>`,
        );
        if (x !== grid - 1 - x) {
          cells.push(
            `<rect x="${pxMirror}" y="${py}" width="${wh}" height="${wh}" fill="${fg}"/>`,
          );
        }
      }
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="${bg}" rx="4"/>${cells.join("")}</svg>`;
}

/**
 * A collaborator entry in the panel's roster.
 *
 * @typedef {Object} Collaborator
 * @property {string} identityHash The 32-hex identity hash.
 * @property {string} [name] The announced display name (#38), when known.
 * @property {string} [presence] The presence state driving the border.
 *   The presence state driving the border.
 * @property {string} [role] The Dacar role, when known.
 * @property {boolean} [self] True for the user's own avatar.
 */

export class NofloCollaboratorsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {Collaborator[]} The roster: self first, then members, then pending. */
    this._collaborators = [];
    /** @type {Map<string, { messages: Array<{ text: string, role: string, time: number, status?: 'sending' | 'delivered' | 'failed' }>, unread: number }>} The per-identity chat threads. */
    this._threads = new Map();
    /** @type {string | null} The identity hash whose thread is open. */
    this._openThread = null;
    /** @type {string} The pending draft's text. */
    this._draft = "";
  }

  connectedCallback() {
    if (!this.shadowRoot?.innerHTML) this.render();
  }

  /**
   * Sets the roster.
   *
   * @param {Collaborator[]} collaborators
   */
  /**
   * @param {Collaborator[]} collaborators
   */
  setCollaborators(collaborators) {
    this._collaborators = collaborators;
    this.render();
  }

  /**
   * Appends a message to a thread.
   *
   * @param {string} identityHash
   * @param {{ text: string, role: string }} message
   */
  /**
   * @param {string} identityHash
   * @param {{ text: string, role: string, status?: 'sending' | 'delivered' | 'failed' }} message
   */
  addThreadMessage(identityHash, message) {
    let thread = this._threads.get(identityHash);
    if (!thread) {
      thread = { messages: [], unread: 0 };
      this._threads.set(identityHash, thread);
    }
    thread.messages.push({ ...message, time: Date.now(), status: message.status });
    if (this._openThread !== identityHash) thread.unread += 1;
    this.render();
    this._scrollToBottom(identityHash);
  }

  /**
   * Delivers a response to the thread with a pending "sending" message:
   * the user's message becomes "delivered" and the agent's response
   * appends. The response goes to the most recent pending thread.
   *
   * @param {{ text: string, role: string }} response
   * @returns {boolean} Whether a pending thread was found.
   */
  deliverResponse(response) {
    for (const [identityHash, thread] of this._threads) {
      const pending = thread.messages.find(
        (/** @type {any} */ m) => m.status === "sending",
      );
      if (!pending) continue;
      pending.status = "delivered";
      thread.messages.push({
        text: response.text,
        role: response.role,
        time: Date.now(),
      });
      if (this._openThread !== identityHash) thread.unread += 1;
      this.render();
      this._scrollToBottom(identityHash);
      return true;
    }
    return false;
  }

  /**
   * Marks all "sending" messages as "failed" — the transport didn't
   * deliver within the timeout.
   */
  failPending() {
    for (const [, thread] of this._threads) {
      for (const message of thread.messages) {
        if (message.status === "sending") message.status = "failed";
      }
    }
    this.render();
  }

  /**
   * @param {string} identityHash
   */
  _scrollToBottom(identityHash) {
    if (this._openThread !== identityHash) return;
    const scroll = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.querySelector(
        `[data-thread-scroll="${identityHash}"]`,
      )
    );
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    const self = this._collaborators.find((c) => c.self);
    const members = this._collaborators.filter(
      (c) => !c.self && c.presence !== "requested" && c.presence !== "invited",
    );
    const pending = this._collaborators.filter(
      (c) => c.presence === "requested" || c.presence === "invited",
    );

    const avatar = (/** @type {Collaborator} */ c) => {
      const colors = identiconColors(c.identityHash);
      const presence = c.presence ?? "offline";
      const thread = this._threads.get(c.identityHash);
      const unread = thread?.unread ?? 0;
      return `<div class="avatar ${presence}" data-identity="${escapeHtml(c.identityHash)}" title="${escapeHtml(c.name ?? c.identityHash)}">
        <div class="avatar-ring">${identiconSvg(c.identityHash, 36)}</div>
        ${unread > 0 ? `<span class="unread">${unread}</span>` : ""}
        <span class="avatar-name">${escapeHtml(c.name ?? c.identityHash.slice(0, 8))}</span>
        <span class="avatar-status ${presence}">${presence}</span>
      </div>`;
    };

    const selfAvatar = self ? avatar(self) : "";
    const memberAvatars = members.map(avatar).join("");
    const pendingAvatars = pending.map(avatar).join("");

    // The open thread's accordion
    const openThread = this._openThread
      ? this._renderThread(this._openThread)
      : "";

    shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 56px;
          left: 16px;
          z-index: 60;
          display: block;
          max-width: min(320px, calc(100vw - 32px));
          background: var(--ui-bg, rgb(20, 27, 35));
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 8px;
          padding: 8px;
        }
        @media (min-width: 760px) {
          :host { left: 220px; }
        }
        .avatar-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 6px 0;
        }
        .avatar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: pointer;
          position: relative;
          min-width: 48px;
        }
        .avatar-ring {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          padding: 2px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .avatar-ring svg {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
        .avatar.active .avatar-ring { border: 2px solid var(--ui-age-activity, #4aa3df); }
        .avatar.online .avatar-ring { border: 2px solid var(--ui-age-calm, #7ee3a0); }
        .avatar.offline .avatar-ring { border: 2px solid var(--ui-border, #333); opacity: 0.5; }
        .avatar.requested .avatar-ring,
        .avatar.invited .avatar-ring { border: 2px dashed var(--ui-age-attention, #e3a17e); }
        .avatar.agent-working .avatar-ring { border: 2px solid var(--ui-age-activity, #4aa3df); }
        .avatar.agent-idle .avatar-ring { border: 2px solid var(--ui-age-calm, #7ee3a0); }
        .unread {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--ui-age-attention, #e3a17e);
          color: var(--ui-bg, rgb(20, 27, 35));
          border-radius: 8px;
          font-size: 9px;
          min-width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .avatar-name {
          font-size: 9px;
          color: var(--node-text);
          max-width: 48px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .avatar-status {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .avatar-status.active { color: var(--ui-age-activity, #4aa3df); }
        .avatar-status.online { color: var(--ui-age-calm, #7ee3a0); }
        .avatar-status.offline { color: var(--ui-muted, #889); }
        .avatar-status.requested,
        .avatar-status.invited { color: var(--ui-age-attention, #e3a17e); }
        .add-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px dashed var(--ui-border, #333);
          cursor: pointer;
          color: var(--ui-accent, rgb(90, 200, 250));
          font-size: 18px;
        }
        .thread {
          border-top: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          padding: 8px 0;
          background: var(--ui-bg, rgb(20, 27, 35));
        }
        .thread-scroll {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px 0;
        }
        .thread-msg {
          font-size: 11px;
          line-height: 1.4;
          padding: 4px 8px;
          border-radius: 4px;
          max-width: 85%;
        }
        .thread-msg.pi { background: color-mix(in srgb, var(--ui-accent, rgb(90, 200, 250)) 10%, transparent); align-self: flex-start; }
        .thread-msg.human { background: color-mix(in srgb, var(--ui-age-calm, #7ee3a0) 10%, transparent); align-self: flex-end; }
        .thread-msg.system { color: var(--ui-muted, #889); font-size: 10px; align-self: center; }
        .msg-status {
          display: block;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
          color: var(--ui-muted, #889);
        }
        .msg-status.failed { color: var(--ui-age-attention, #e3a17e); }
        .msg-status.delivered { color: var(--ui-age-calm, #7ee3a0); }
        .thread-input {
          display: flex;
          gap: 6px;
          padding: 4px 0;
        }
        .thread-input input {
          flex: 1;
          background: transparent;
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 4px;
          color: inherit;
          font: inherit;
          font-size: 11px;
          padding: 6px 8px;
          outline: none;
        }
        .thread-input input:focus { outline: 1px solid var(--ui-accent, rgb(90, 200, 250)); }
        .thread-input button {
          background: transparent;
          color: var(--ui-accent, rgb(90, 200, 250));
          border: 1px solid var(--ui-accent, rgb(90, 200, 250));
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 10px;
          font-family: inherit;
          cursor: pointer;
        }
      </style>
      <div class="avatar-row">
        ${selfAvatar}
        ${memberAvatars}
        ${pendingAvatars}
        <div class="add-tile" data-action="add-user" title="Add a collaborator">+</div>
      </div>
      ${openThread}
    `;
    this._wireThreadInput();
  }

  /**
   * Renders one open chat thread.
   *
   * @param {string} identityHash
   * @returns {string}
   */
  /**
   * @param {string} identityHash
   * @returns {string}
   */
  _renderThread(identityHash) {
    const thread = this._threads.get(identityHash);
    const collaborator = this._collaborators.find(
      (c) => c.identityHash === identityHash,
    );
    const displayName = collaborator?.name ?? identityHash.slice(0, 8);
    const messages = (thread?.messages ?? [])
      .map(
        (/** @type {any} */ m) =>
          `<div class="thread-msg ${escapeHtml(m.role)}">${escapeHtml(m.text)}${m.status && m.status !== "delivered" ? `<span class="msg-status ${m.status}">${m.status}</span>` : ""}</div>`,
      )
      .join("");
    return `<div class="thread" data-thread="${escapeHtml(identityHash)}">
      <div class="thread-scroll" data-thread-scroll="${escapeHtml(identityHash)}">
        ${messages || '<div class="thread-msg system">Start the conversation.</div>'}
      </div>
      <div class="thread-input">
        <input data-thread-input="${escapeHtml(identityHash)}" placeholder="Message ${escapeHtml(displayName)}…" aria-label="Message">
        <button data-thread-send="${escapeHtml(identityHash)}">Send</button>
      </div>
    </div>`;
  }

  /** Wires the thread inputs and the avatar clicks. */
  _wireThreadInput() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    for (const avatar of shadow.querySelectorAll(".avatar[data-identity]")) {
      avatar.addEventListener("click", () => {
        const identityHash = avatar.getAttribute("data-identity") ?? "";
        const isSelf = this._collaborators.find(
          (c) => c.identityHash === identityHash,
        )?.self;
        if (isSelf) {
          // The self avatar opens customization, not a chat thread
          emit(this, "edit-avatar", { identityHash });
          return;
        }
        if (this._openThread === identityHash) {
          this._openThread = null;
        } else {
          this._openThread = identityHash;
          const thread = this._threads.get(identityHash);
          if (thread) thread.unread = 0;
        }
        this.render();
      });
    }
    for (const input of shadow.querySelectorAll("[data-thread-input]")) {
      const identityHash = input.getAttribute("data-thread-input") ?? "";
      input.addEventListener("keydown", (/** @type {any} */ e) => {
        if (e.key !== "Enter") return;
        const text = /** @type {HTMLInputElement} */ (input).value.trim();
        if (!text) return;
        /** @type {HTMLInputElement} */ (input).value = "";
        this.addThreadMessage(identityHash, { text, role: "human" });
        emit(this, "chat-send", {
          identityHash,
          text,
        });
      });
    }
    for (const button of shadow.querySelectorAll("[data-thread-send]")) {
      const identityHash = button.getAttribute("data-thread-send") ?? "";
      button.addEventListener("click", () => {
        const input = /** @type {HTMLInputElement | null} */ (
          shadow.querySelector(`[data-thread-input="${identityHash}"]`)
        );
        const text = input?.value?.trim();
        if (!text || !input) return;
        input.value = "";
        this.addThreadMessage(identityHash, { text, role: "human" });
        emit(this, "chat-send", { identityHash, text });
      });
    }
    shadow
      .querySelector("[data-action='add-user']")
      ?.addEventListener("click", () => {
        emit(this, "add-collaborator", undefined);
      });
  }
}

customElements.define("noflo-collaborators-panel", NofloCollaboratorsPanel);
