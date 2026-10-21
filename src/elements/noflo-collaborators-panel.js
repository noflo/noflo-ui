/**
 * @file The Collaborators panel (work document #61): avatars, presence
 * borders, and per-peer chat threads — one LXMF thread per identity. The
 * panel docks in the bottom-left Project corner beside the work-documents
 * accordion. The transport is LXMF (work document #42 Phase A'): sends go
 * out as real LXMF messages, inbound messages land in the sender's thread.
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
  const hue = ((bytes[0] ?? 0) * 360) / 256;
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
 * @property {"agent" | "human"} [kind] What the participant is (work
 *   document #61: agents are participants distinguished by kind) — the
 *   agent's status line reads AGENT instead of the presence word.
 * @property {string} [role] The Dacar role, when known.
 * @property {boolean} [self] True for the user's own avatar.
 * @property {number} [lastSeenAt] The peer's last-heard timestamp (work
 *   document #61): the "last seen" offline contacts show.
 * @property {{ icon: string, fg: number[], bg: number[] }} [appearance]
 *   The participant's avatar appearance (work document #61): emoji +
 *   colors, announced with their messages. Renders in place of the
 *   identicon when known.
 */

export class NofloCollaboratorsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    /** @type {Collaborator[]} The roster: self first, then members, then pending. */
    this._collaborators = [];
    /** @type {Map<string, { messages: Array<{ text: string, role: string, time: number, status?: 'sending' | 'delivered' | 'failed', error?: string, messageId?: string }>, unread: number, thinking?: boolean }>} The per-identity chat threads. */
    this._threads = new Map();
    /** @type {Map<string, Map<string, string>>} The per-thread reactions:
     * thread key → LXMF message id (hex) → the reaction emoji. */
    this._reactions = new Map();
    /** Whether the appearance editor is open (the self avatar's click
     * surface, work document #61). */
    this._editingAppearance = false;
    /** @type {{ icon: string, fgHex: string, bgHex: string } | null} The
     * appearance editor's in-progress draft. */
    this._selfAppearanceDraft = null;
    /** @type {string | null} The identity hash whose thread is open. */
    this._openThread = null;
    /** @type {string} The pending draft's text. */
    this._draft = "";
    /** @type {Map<string, string>} The per-thread unsent drafts: re-renders
     * (presence churn, roster updates) rebuild the input, and a lost draft
     * is a lost message the user has to retype. */
    this._drafts = new Map();
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
   * @param {{ text: string, role: string, status?: 'sending' | 'delivered' | 'failed', error?: string, time?: number, messageId?: string }} message
   */
  addThreadMessage(identityHash, message) {
    let thread = this._threads.get(identityHash);
    if (!thread) {
      thread = { messages: [], unread: 0 };
      this._threads.set(identityHash, thread);
    }
    thread.messages.push({
      ...message,
      time: message.time ?? Date.now(),
      status: message.status,
    });
    if (this._openThread !== identityHash) thread.unread += 1;
    this.render();
    this._scrollToBottom(identityHash);
  }

  /**
   * Restores the persisted threads (work document #61): replaces the
   * in-memory threads with the decrypted history. Runs at LXMF-layer
   * start, before live traffic — live messages append after.
   *
   * @param {Array<{ identityHash: string, messages: Array<{ text: string, role: string, time: number }> }>} threads
   */
  loadThreads(threads) {
    for (const thread of threads) {
      const identityHash = String(thread.identityHash ?? "");
      if (!identityHash) continue;
      this._threads.set(identityHash, {
        messages: (thread.messages ?? []).map((/** @type {any} */ m) => ({
          ...m,
        })),
        unread: 0,
      });
    }
    this.render();
  }

  /**
   * Renders an incoming reaction on the reacted-to message (work document
   * #61). The target is the LXMF message id; when no stored message
   * carries it (e.g. the reaction raced the message), it falls back to
   * the thread's latest incoming message.
   *
   * @param {string} identityHash
   * @param {{ target?: string, emoji: string }} reaction
   */
  addReaction(identityHash, reaction) {
    let thread = this._threads.get(identityHash);
    if (!thread) {
      thread = { messages: [], unread: 0 };
      this._threads.set(identityHash, thread);
    }
    let reactions = this._reactions.get(identityHash);
    if (!reactions) {
      reactions = new Map();
      this._reactions.set(identityHash, reactions);
    }
    let target = reaction.target
      ? thread.messages.find((m) => m.messageId === reaction.target)
      : null;
    if (!target) {
      target = [...thread.messages].reverse().find((m) => m.role !== "human");
    }
    if (!target?.messageId) return;
    reactions.set(target.messageId, reaction.emoji);
    this.render();
    if (this._openThread === identityHash) {
      this._scrollToBottom(identityHash);
    }
  }

  /**
   * Marks the thread's pending "sending" message delivered — the worker's
   * `chat-ack` confirmed the LXMF send (work document #42 Phase A').
   *
   * @param {string} identityHash
   * @returns {boolean} Whether a pending message was found.
   */
  markSent(identityHash) {
    const thread = this._threads.get(identityHash);
    if (!thread) return false;
    const pending = thread.messages.find(
      (/** @type {any} */ m) => m.status === "sending",
    );
    if (!pending) return false;
    pending.status = "delivered";
    this.render();
    return true;
  }

  /**
   * Marks the thread's pending "sending" message failed — the send was
   * refused (no path, transport down).
   *
   * @param {string} identityHash
   * @param {string} [reason]
   */
  failThread(identityHash, reason = "send failed") {
    const thread = this._threads.get(identityHash);
    if (!thread) return;
    let changed = false;
    for (const message of thread.messages) {
      if (message.status !== "sending") continue;
      message.status = "failed";
      message.error = reason;
      changed = true;
    }
    if (changed) this.render();
  }

  /**
   * Shows or clears the thread's processing indicator — the peer's LXMF
   * reaction (🤔) is the packet proof that the message was received and
   * is being worked on; the reply clears it.
   *
   * @param {string} identityHash
   * @param {boolean} thinking
   */
  setThinking(identityHash, thinking) {
    let thread = this._threads.get(identityHash);
    if (!thread) {
      thread = { messages: [], unread: 0 };
      this._threads.set(identityHash, thread);
    }
    if (thread.thinking === thinking) return;
    thread.thinking = thinking;
    this.render();
    if (this._openThread === identityHash) {
      this._scrollToBottom(identityHash);
    }
  }

  /**
   * @param {string} identityHash
   */
  _scrollToBottom(identityHash, smooth = false) {
    if (this._openThread !== identityHash) return;
    const scroll = /** @type {HTMLElement | null} */ (
      this.shadowRoot?.querySelector(`[data-thread-scroll="${identityHash}"]`)
    );
    if (scroll) {
      scroll.scrollTo({
        top: scroll.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }

  render() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    // Typing must survive re-renders: remember whether the open thread's
    // input held focus (and the caret position) so render can restore it
    const focusedInput = /** @type {HTMLInputElement | null} */ (
      shadow.activeElement?.matches?.("[data-thread-input]")
        ? shadow.activeElement
        : null
    );
    const focusThread = focusedInput?.getAttribute("data-thread-input") ?? null;
    const caretAt = focusedInput?.selectionStart ?? null;
    // The thread scroll survives the same way: anchored to the latest
    // message when the reader is at the bottom, the exact offset preserved
    // while they are scrolled up reading history (work document #61)
    const openScroll = this._openThread
      ? /** @type {HTMLElement | null} */ (
          this.shadowRoot?.querySelector(
            `[data-thread-scroll="${this._openThread}"]`,
          )
        )
      : null;
    const anchoredToBottom = openScroll
      ? openScroll.scrollHeight -
          openScroll.scrollTop -
          openScroll.clientHeight <
        24
      : true;
    const scrollOffset = openScroll?.scrollTop ?? 0;
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
      // Presence rides the ring color (the container's presence class);
      // the only text under an avatar is the agent KIND chip — a kind,
      // not a status (work document #61: agents are participants
      // distinguished by kind)
      const kindChip =
        c.kind === "agent" ? `<span class="avatar-kind">AGENT</span>` : "";
      const iconMarkup = c.appearance?.icon
        ? `<div class="avatar-emoji" style="color: rgb(${c.appearance.fg.join(",")}); background: rgb(${c.appearance.bg.join(",")})">${escapeHtml(c.appearance.icon)}</div>`
        : identiconSvg(c.identityHash, 36);
      return `<div class="avatar ${presence}" data-identity="${escapeHtml(c.identityHash)}" title="${escapeHtml(c.name ?? c.identityHash)}">
        <div class="avatar-ring">${iconMarkup}</div>
        ${unread > 0 ? `<span class="unread">${unread}</span>` : ""}
        <span class="avatar-name ${c.self ? "" : "editable"}" data-alias-for="${escapeHtml(c.identityHash)}" title="${c.self ? "" : "Click to rename"}">${escapeHtml(c.name ?? c.identityHash.slice(0, 8))}</span>
        ${kindChip}
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
          z-index: 101;
          display: block;
          max-width: min(320px, calc(100vw - 32px));
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
        .avatar-name.editable {
          cursor: pointer;
          text-decoration: underline dotted;
          text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
        }
        .avatar-name.editable:hover {
          color: var(--ui-accent, rgb(90, 200, 250));
        }
        .avatar-emoji {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .appearance-editor {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 10px;
          color: var(--ui-muted, #889);
          padding: 6px 0;
        }
        .appearance-editor input[type="color"] {
          width: 24px;
          height: 20px;
          padding: 0;
          border: 1px solid var(--ui-border, #333);
          background: transparent;
          cursor: pointer;
        }
        .appearance-editor input[data-appearance-icon] {
          width: 40px;
          font-size: 14px;
          text-align: center;
          background: transparent;
          border: 1px solid var(--ui-border, #333);
          color: inherit;
          border-radius: 3px;
        }
        .appearance-editor button {
          font-size: 10px;
          background: transparent;
          border: 1px solid var(--ui-border, #333);
          color: inherit;
          border-radius: 3px;
          cursor: pointer;
          padding: 2px 6px;
        }
        /* the agent kind chip rides the activity semantic (an agent is an
           active participant); presence itself rides the ring color */
        .avatar-kind {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ui-age-activity, #4aa3df);
          font-weight: 600;
          text-align: center;
        }
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
          padding: 8px 10px;
          background: var(--ui-bg, rgb(20, 27, 35));
          border: 1px solid var(--ui-panel-border, rgb(58, 63, 72));
          border-radius: 6px;
          margin-top: 6px;
        }
        .thread-scroll {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px 0;
        }
        .thread-lastseen {
          font-size: 9px;
          color: var(--ui-muted, #889);
          padding: 2px 8px 0;
        }
        .thread-day {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--ui-muted, #889);
          text-align: center;
          padding: 4px 0 2px;
        }
        .msg-time {
          display: block;
          font-size: 8px;
          color: var(--ui-muted, #889);
          margin-top: 2px;
        }
        .msg-reaction {
          display: inline-block;
          margin-left: 6px;
          font-size: 11px;
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
      ${
        this._editingAppearance
          ? `<div class="appearance-editor">
        <label>Emoji <input data-appearance-icon value="${escapeHtml(this._selfAppearanceDraft?.icon ?? "")}" maxlength="8" placeholder="🙂"></label>
        <label>Text <input data-appearance-fg type="color" value="${escapeHtml(this._selfAppearanceDraft?.fgHex ?? "#ffffff")}"></label>
        <label>Ring <input data-appearance-bg type="color" value="${escapeHtml(this._selfAppearanceDraft?.bgHex ?? "#1a237e")}"></label>
        <button data-appearance-apply>Apply</button>
        <button data-appearance-cancel>Cancel</button>
      </div>`
          : ""
      }
      ${openThread}
    `;
    this._wireThreadInput();
    if (focusThread) {
      const input = /** @type {HTMLInputElement | null} */ (
        shadow.querySelector(`[data-thread-input="${focusThread}"]`)
      );
      if (input) {
        input.focus();
        const caret = Math.min(
          caretAt ?? input.value.length,
          input.value.length,
        );
        input.setSelectionRange(caret, caret);
      }
    }
    // The scroll restore: anchored to the latest message when the reader
    // was at the bottom, the exact offset preserved while they were
    // scrolled up reading history
    if (this._openThread) {
      const scroll = /** @type {HTMLElement | null} */ (
        shadow.querySelector(`[data-thread-scroll="${this._openThread}"]`)
      );
      if (scroll) {
        scroll.scrollTop = anchoredToBottom
          ? scroll.scrollHeight
          : scrollOffset;
      }
    }
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
    // The "last seen" an IM client shows: offline peers carry their most
    // recent heard time (work document #61)
    const lastSeen =
      collaborator?.presence === "offline" && collaborator?.lastSeenAt
        ? new Date(collaborator.lastSeenAt)
        : null;
    const lastSeenLabel = lastSeen
      ? lastSeen.toDateString() === new Date().toDateString()
        ? `last seen ${String(lastSeen.getHours()).padStart(2, "0")}:${String(lastSeen.getMinutes()).padStart(2, "0")}`
        : `last seen ${lastSeen.toLocaleDateString()}`
      : "";
    const reactions = this._reactions.get(identityHash) ?? new Map();
    /** The last message's local day: date separators render when it flips. */
    let lastDay = "";
    const timeLabel = (/** @type {number} */ time) => {
      const date = new Date(time);
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    };
    const dayLabel = (/** @type {number} */ time) => {
      const date = new Date(time);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86_400_000);
      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
      return date.toLocaleDateString();
    };
    const messages = (thread?.messages ?? [])
      .map((/** @type {any} */ m) => {
        const day = new Date(m.time ?? Date.now()).toDateString();
        const separator =
          day !== lastDay
            ? `<div class="thread-day">${dayLabel(m.time ?? Date.now())}</div>`
            : "";
        lastDay = day;
        const chip =
          m.messageId && reactions.has(m.messageId)
            ? `<span class="msg-reaction">${reactions.get(m.messageId)}</span>`
            : "";
        return `${separator}<div class="thread-msg ${escapeHtml(m.role)}" data-mid="${escapeHtml(m.messageId ?? "")}">${escapeHtml(m.text)}${chip}${m.status && m.status !== "delivered" ? `<span class="msg-status ${m.status}">${m.status}</span>` : ""}<span class="msg-time">${timeLabel(m.time ?? Date.now())}</span></div>`;
      })
      .join("");
    return `<div class="thread" data-thread="${escapeHtml(identityHash)}">
      <div class="thread-scroll" data-thread-scroll="${escapeHtml(identityHash)}">
        ${messages || '<div class="thread-msg system">Start the conversation.</div>'}
        ${thread?.thinking ? '<div class="thread-msg system">🤔 processing…</div>' : ""}
      </div>
      ${lastSeenLabel ? `<div class="thread-lastseen">${lastSeenLabel}</div>` : ""}
      <div class="thread-input">
        <input data-thread-input="${escapeHtml(identityHash)}" value="${escapeHtml(this._drafts.get(identityHash) ?? "")}" placeholder="Message ${escapeHtml(displayName)}…" aria-label="Message">
        <button data-thread-send="${escapeHtml(identityHash)}">Send</button>
      </div>
    </div>`;
  }

  /** Wires the thread inputs and the avatar clicks. */
  _wireThreadInput() {
    const shadow = /** @type {ShadowRoot} */ (this.shadowRoot);
    for (const nameEl of shadow.querySelectorAll(".avatar-name.editable")) {
      nameEl.addEventListener("click", (/** @type {any} */ event) => {
        event.stopPropagation();
        const identityHash =
          nameEl.closest(".avatar")?.getAttribute("data-identity") ?? "";
        const current =
          this._collaborators.find(
            (/** @type {any} */ c) => c.identityHash === identityHash,
          )?.name ?? "";
        // The inline edit: the name swaps to an input, Enter or blur saves
        const input = document.createElement("input");
        input.type = "text";
        input.value = current === identityHash.slice(0, 8) ? "" : current;
        input.placeholder = identityHash.slice(0, 8);
        input.style.cssText =
          "width:48px;font-size:9px;font-family:inherit;background:transparent;border:1px solid var(--ui-accent, rgb(90, 200, 250));color:inherit;border-radius:3px;padding:1px 2px;outline:none;text-align:center";
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const save = () => {
          const alias = input.value.trim();
          emit(this, "set-alias", { identityHash, alias: alias || null });
          this.render();
        };
        input.addEventListener("keydown", (/** @type {any} */ e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            this.render();
          }
        });
        input.addEventListener("blur", save);
      });
    }
    for (const avatar of shadow.querySelectorAll(".avatar[data-identity]")) {
      avatar.addEventListener("click", () => {
        const identityHash = avatar.getAttribute("data-identity") ?? "";
        const isSelf = this._collaborators.find(
          (c) => c.identityHash === identityHash,
        )?.self;
        if (isSelf) {
          // The self avatar opens the appearance editor, not a chat
          // thread (work document #61: clicking self customizes the
          // avatar — emoji + colors). The draft starts from the current
          // appearance
          if (this._editingAppearance) {
            this._editingAppearance = false;
            this._selfAppearanceDraft = null;
          } else {
            const appearance = this._collaborators.find(
              (c) => c.self,
            )?.appearance;
            const toHex = (/** @type {number[]} */ rgb) =>
              `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
            this._selfAppearanceDraft = appearance
              ? {
                  icon: appearance.icon,
                  fgHex: toHex(appearance.fg),
                  bgHex: toHex(appearance.bg),
                }
              : { icon: "", fgHex: "#ffffff", bgHex: "#1a237e" };
            this._editingAppearance = true;
          }
          this.render();
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
      input.addEventListener("input", () => {
        // The draft survives re-renders: presence and roster updates
        // rebuild this input while the user is typing
        this._drafts.set(
          identityHash,
          /** @type {HTMLInputElement} */ (input).value,
        );
      });
      input.addEventListener("keydown", (/** @type {any} */ e) => {
        if (e.key !== "Enter") return;
        const text = /** @type {HTMLInputElement} */ (input).value.trim();
        if (!text) return;
        /** @type {HTMLInputElement} */ (input).value = "";
        this._drafts.delete(identityHash);
        this.addThreadMessage(identityHash, {
          text,
          role: "human",
          status: "sending",
        });
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
        this._drafts.delete(identityHash);
        this.addThreadMessage(identityHash, {
          text,
          role: "human",
          status: "sending",
        });
        emit(this, "chat-send", { identityHash, text });
      });
    }
    // The appearance editor's wiring (work document #61): the emoji and
    // colors edit a draft; Apply emits the result for the Glass to persist
    // device-locally and forward to the mesh layer
    const iconInput = /** @type {HTMLInputElement | null} */ (
      shadow.querySelector("[data-appearance-icon]")
    );
    if (iconInput) {
      const fgInput = /** @type {HTMLInputElement | null} */ (
        shadow.querySelector("[data-appearance-fg]")
      );
      const bgInput = /** @type {HTMLInputElement | null} */ (
        shadow.querySelector("[data-appearance-bg]")
      );
      const sync = () => {
        this._selfAppearanceDraft = {
          icon: iconInput.value,
          fgHex: fgInput?.value ?? "#ffffff",
          bgHex: bgInput?.value ?? "#1a237e",
        };
      };
      iconInput.addEventListener("input", sync);
      fgInput?.addEventListener("input", sync);
      bgInput?.addEventListener("input", sync);
      shadow
        .querySelector("[data-appearance-apply]")
        ?.addEventListener("click", () => {
          const hexToRgb = (/** @type {string} */ hex) => {
            const bytes = hex.replace("#", "").match(/../g) ?? [];
            return bytes.map((b) => Number.parseInt(b, 16));
          };
          const icon = iconInput.value.trim();
          if (!icon) return;
          const appearance = {
            icon,
            fg: hexToRgb(fgInput?.value ?? "#ffffff"),
            bg: hexToRgb(bgInput?.value ?? "#1a237e"),
          };
          this._editingAppearance = false;
          this._selfAppearanceDraft = null;
          emit(this, "set-appearance", { appearance });
          this.render();
        });
      shadow
        .querySelector("[data-appearance-cancel]")
        ?.addEventListener("click", () => {
          this._editingAppearance = false;
          this._selfAppearanceDraft = null;
          this.render();
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
