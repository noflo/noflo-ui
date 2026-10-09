/**
 * @file chat.js — the Companion's chat command surface (work document #44
 * M2): inbound LXMF messages are gated (owner contact, signature
 * verification), parsed into commands and prompts, dispatched to the pi
 * lifecycle manager, and answered with reply LXMF messages.
 *
 * Command surface (work document #44, Phase A):
 * - project-scoped: `/sessions`, `/resume [n]`, `/session`, `/compact`,
 *   `/new`, `/abort`, `/model`
 * - bridge-level: `/suspend`, `/help`
 * - free text = prompt for the active project
 *
 * Trust (Phase A bootstrap): inbound is admitted only from the configured
 * owner contact, with a verified sender signature — "unknown" (sender
 * identity not yet recalled, e.g. a propagation-synced message) is dropped.
 * The full agent-plane Dacar governance (`noflo-ui:agent:<identity-hash>`
 * resource, `command`/`admin`) replaces this gate per work document #47's
 * permission list.
 */

import { toHex as coreToHex } from "../../vendor/reticulum-core.js";
import { messageClaims } from "./claim.js";

/** A parsed inbound chat message. */
export class ChatMessage {
  /**
   * @param {object} parts
   * @param {string} parts.sourceHex - Sender's `lxmf.delivery` hash (hex).
   * @param {string} parts.text - The message body.
   * @param {boolean} parts.isCommand - Whether the text is a `/command`.
   * @param {string} parts.command - The command verb (lowercase, no slash),
   *   empty when not a command.
   * @param {string} parts.argument - Everything after the verb (trimmed).
   */
  constructor({ sourceHex, text, isCommand, command, argument }) {
    this.sourceHex = sourceHex;
    this.text = text;
    this.isCommand = isCommand;
    this.command = command;
    this.argument = argument;
  }
}

/**
 * Parses inbound text into a ChatMessage shape.
 *
 * @param {string} sourceHex
 * @param {string} text
 * @returns {ChatMessage}
 */
export function parseChatMessage(sourceHex, text) {
  const trimmed = text.trim();
  const commandMatch = /^\/([A-Za-z]+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  if (commandMatch) {
    return new ChatMessage({
      sourceHex,
      text: trimmed,
      isCommand: true,
      command: commandMatch[1].toLowerCase(),
      argument: (commandMatch[2] ?? "").trim(),
    });
  }
  return new ChatMessage({
    sourceHex,
    text: trimmed,
    isCommand: false,
    command: "",
    argument: "",
  });
}

/**
 * Creates the chat surface. Inbound handling is serialized so prompts and
 * commands keep order (the pi-lxmf pattern).
 *
 * @param {object} deps
 * @param {string|null} deps.ownerContact - The owner's `lxmf.delivery` hash
 *   (hex); messages from other identities are dropped. Null = unclaimed
 *   mode: only the claim check admits messages (tests/claim setup).
 *   Mutable after claiming via the surface's `setOwnerContact`.
 * @param {(destinationHex: string, text: string, options?: {title?: string}) => Promise<void>} deps.sendText
 * @param {((destinationHex: string, targetMessageId: Uint8Array, emoji: string) => Promise<void>) | null} [deps.sendReaction]
 * @param {(message: any) => Promise<"verified"|"unknown"|"invalid">} deps.verifySender
 * @param {import("./piManager.js").PiManagerHandle | null} deps.pi - The pi
 *   lifecycle manager; null when pi is unavailable (the surface answers
 *   diagnostics instead).
 * @param {{ code: string, onClaim: (ownerIdentityHash: string) => Promise<void> } | null} [deps.claim]
 *   The unclaimed-mode bootstrap (work document #47 scope item 1): the
 *   first verified sender whose message contains the code becomes the
 *   owner. Inactive once claimed.
 * @param {((message: any) => Promise<string | null>) | null} [deps.senderIdentityHash]
 *   Recalls the sender's Reticulum identity hash (the claim persists it).
 * @param {{ get: (key: string) => Promise<any>, set: (key: string, value: any) => Promise<void> }} deps.state
 * @param {(msg: string) => void} [deps.log]
 * @returns {{
 *   handleInbound: (event: { message: any }) => Promise<void>,
 *   chatMessage: (sourceHex: string, text: string, triggerMessageId?: Uint8Array | null) => Promise<void>,
 *   reply: (text: string, title?: string) => Promise<void>,
 *   clearReaction: () => void,
 *   setOwnerContact: (contact: string) => void,
 * }}
 */
export function createChatSurface({
  ownerContact,
  sendText,
  sendReaction = null,
  verifySender,
  pi,
  state,
  claim = null,
  senderIdentityHash = null,
  log = () => {},
}) {
  /** Serialization chain: inbound messages run strictly in arrival order. */
  /** @type {Promise<void>} */
  let queue = Promise.resolve();
  /** The claimed owner's contact; set through `setOwnerContact`. */
  let owner = ownerContact;
  /** The "thinking" acknowledgement (the pi-lxmf pattern): a reaction to
   * the prompt message after a debounce, cleared when the real reply
   * lands — fast runs never get the extra ping. */
  const REACTION_EMOJI = "🤔";
  const REACTION_DEBOUNCE_MS = 2000;
  /** @type {NodeJS.Timeout | null} */
  let reactionTimer = null;
  /** @type {Uint8Array | null} */
  let reactionTarget = null;
  /** Whether the claim code is still open (unclaimed mode). */
  let claimOpen = claim != null;

  /**
   * Sends a reply to the owner contact.
   *
   * @param {string} text
   * @param {string} [title]
   * @returns {Promise<void>}
   */
  async function reply(text, title = "Companion") {
    if (!owner) {
      log("companion: reply dropped (no owner contact configured)");
      return;
    }
    await sendText(owner, text, { title });
  }

  /**
   * The persisted session index (the `/sessions` surface), newest first.
   *
   * @returns {Promise<Array<{ file: string, mtimeMs: number }>>}
   */
  async function sessions() {
    const list = await state
      .get("sessions")
      .then((value) => (Array.isArray(value) ? value : []))
      .catch(() => []);
    return /** @type {Array<{ file: string, mtimeMs: number }>} */ (
      list
    ).filter((entry) => entry && typeof entry.file === "string");
  }

  /**
   * Schedules the run-start reaction to `messageId` (best effort). Only
   * meaningful when a reaction channel and an owner exist.
   *
   * @param {Uint8Array | null} messageId
   */
  function scheduleReaction(messageId) {
    clearReaction();
    if (!sendReaction || !owner || !messageId) return;
    const contact = owner;
    const send = sendReaction;
    reactionTarget = messageId;
    reactionTimer = setTimeout(() => {
      reactionTimer = null;
      if (!reactionTarget) return;
      const target = reactionTarget;
      reactionTarget = null;
      send(contact, target, REACTION_EMOJI).catch((error) =>
        log(
          `companion: reaction send failed: ${
            error instanceof Error ? error.message : error
          }`,
        ),
      );
    }, REACTION_DEBOUNCE_MS);
    if (reactionTimer.unref) reactionTimer.unref();
  }

  /**
   * Cancels any pending run-start reaction. Idempotent.
   */
  function clearReaction() {
    if (reactionTimer) {
      clearTimeout(reactionTimer);
      reactionTimer = null;
    }
    reactionTarget = null;
  }

  /**
   * Runs one admitted inbound message through the dispatch.
   *
   * @param {string} sourceHex
   * @param {string} text
   * @param {Uint8Array | null} [triggerMessageId]
   * @returns {Promise<void>}
   */
  async function chatMessage(sourceHex, text, triggerMessageId = null) {
    const message = parseChatMessage(sourceHex, text);
    if (!message.isCommand) {
      scheduleReaction(triggerMessageId);
      // Free text is a prompt for the active project
      if (!pi) {
        await reply("pi is not available on this Companion");
        return;
      }
      try {
        await pi.prompt(message.text);
      } catch (e) {
        await reply(
          `⚠️ pi could not take the prompt: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
      return;
    }
    await runCommand(message);
  }

  /**
   * @param {ChatMessage} message
   * @returns {Promise<void>}
   */
  async function runCommand(message) {
    switch (message.command) {
      case "sessions": {
        const current = pi?.isRunning() ? await pi.status() : null;
        /** @type {string[]} */
        const lines = [];
        if (current?.sessionFile) {
          lines.push(`active: ${current.sessionFile}`);
        }
        const known = await sessions();
        const others = known
          .filter((entry) => entry.file !== current?.sessionFile)
          .slice(0, 10);
        for (const [index, entry] of others.entries()) {
          lines.push(`${index + 1}. ${entry.file}`);
        }
        await reply(
          lines.length > 0
            ? lines.join("\n")
            : "no known sessions yet — the first prompt starts one",
        );
        return;
      }
      case "resume": {
        const index = Number.parseInt(message.argument, 10) - 1;
        const known = await sessions();
        const target =
          Number.isInteger(index) && index >= 0 ? known[index] : known[0];
        if (!target) {
          await reply("no session to resume — /sessions lists what is known");
          return;
        }
        // Point the manager at the target session and sleep: the next
        // prompt respawns with `--session` (work document #44 lifecycle)
        await state.set("session", { sessionFile: target.file, workdir: null });
        pi?.suspend();
        await reply(`${target.file} resumes on the next prompt`);
        return;
      }
      case "session": {
        const current = pi?.isRunning() ? await pi.status() : null;
        if (!current) {
          await reply("pi is not running — a prompt starts it");
          return;
        }
        await reply(
          [
            `session: ${current.sessionFile ?? "none"}`,
            `model: ${current.model ?? "?"}`,
            `streaming: ${current.isStreaming === true ? "yes" : "no"}`,
          ].join("\n"),
        );
        return;
      }
      case "compact": {
        if (!pi?.isRunning()) {
          await reply("pi is not running — nothing to compact");
          return;
        }
        try {
          await pi.compact(message.argument || undefined);
          await reply("compacted");
        } catch (e) {
          await reply(
            `⚠️ compact failed: ${e instanceof Error ? e.message : e}`,
          );
        }
        return;
      }
      case "new": {
        if (!pi?.isRunning()) {
          await reply("pi is not running — a prompt starts it");
          return;
        }
        try {
          await pi.newSession();
          await reply(
            "fresh session started; the previous one is in /sessions",
          );
        } catch (e) {
          await reply(
            `⚠️ new session failed: ${e instanceof Error ? e.message : e}`,
          );
        }
        return;
      }
      case "abort": {
        pi?.client?.abort();
        await reply("abort sent");
        return;
      }
      case "model": {
        if (!message.argument) {
          const current = pi?.isRunning() ? await pi.status() : null;
          await reply(`model: ${current?.model ?? "not running"}`);
          return;
        }
        const [provider, ...rest] = message.argument.split(":");
        const modelId = rest.join(":");
        if (!provider || !modelId) {
          await reply(
            'usage: /model provider:model (e.g. "anthropic:claude-sonnet-4-5")',
          );
          return;
        }
        try {
          const model = await pi?.setModel(provider, modelId);
          await reply(`model set to ${model?.id ?? message.argument}`);
          return;
        } catch (e) {
          await reply(
            `⚠️ model switch failed: ${e instanceof Error ? e.message : e}`,
          );
        }
        return;
      }
      case "suspend": {
        if (!pi) {
          await reply("pi is not available on this Companion");
          return;
        }
        pi.suspend();
        await reply("pi suspended — the session resumes on the next prompt");
        return;
      }
      case "help": {
        await reply(
          [
            "**Companion commands**",
            "",
            "- `/sessions` — list known pi sessions",
            "- `/resume [n]` — pick a session to resume (default: newest)",
            "- `/session` — show the active session and model",
            "- `/compact` — compact the active session's context",
            "- `/new` — start a fresh session (the old one stays in /sessions)",
            "- `/abort` — interrupt the current run",
            "- `/model provider:model` — switch models (e.g. `anthropic:claude-sonnet-4-5`)",
            "- `/suspend` — sleep pi now; it resumes on the next prompt",
            "- `/help` — this list",
          ].join("\n"),
        );
        return;
      }
      default:
        await reply(`unknown command /${message.command} — try /help`);
    }
  }

  /**
   * Gates and dispatches one inbound LXMF message. In unclaimed mode the
   * claim check runs on every verified sender; once claimed (or when an
   * owner is configured) the gate admits only the owner contact.
   *
   * @param {{ message: any }} event
   * @returns {Promise<void>}
   */
  async function handleInbound(event) {
    const message = event?.message;
    if (!message?.sourceHash) return;
    const sourceHex = coreToHex(message.sourceHash);
    const proof = await verifySender(message);
    if (proof !== "verified") {
      log(`companion: inbound from ${sourceHex} dropped (${proof} signature)`);
      return;
    }
    const text =
      typeof message.content === "string"
        ? message.content
        : new TextDecoder().decode(message.content ?? new Uint8Array());
    if (!text.trim()) return;
    // Unclaimed mode: the first verified sender of the claim code wins
    if (claimOpen && claim) {
      if (!messageClaims(text, claim.code)) {
        log(
          `companion: inbound from ${sourceHex} dropped (unclaimed, not the claim code)`,
        );
        return;
      }
      const identityHash = senderIdentityHash
        ? await senderIdentityHash(message)
        : null;
      if (!identityHash) {
        log("companion: claimant identity not recalled; claim not processed");
        return;
      }
      claimOpen = false;
      await claim.onClaim(identityHash);
      return;
    }
    if (owner && sourceHex !== owner.toLowerCase()) {
      log(`companion: inbound from ${sourceHex} dropped (not the owner)`);
      return;
    }
    // Serialize: prompts and commands keep order
    const triggerMessageId = /** @type {Uint8Array | null} */ (
      message.messageId ?? null
    );
    const run = queue
      .then(() => chatMessage(sourceHex, text, triggerMessageId))
      .catch((e) => {
        log(
          `companion: inbound handling failed: ${
            e instanceof Error ? e.message : e
          }`,
        );
      });
    queue = run;
    await run;
  }

  return {
    handleInbound,
    chatMessage,
    reply,
    /** Cancels a pending run-start reaction (the reply landed). */
    clearReaction,
    /**
     * Switches the gate to a newly claimed owner's contact.
     *
     * @param {string} contact - The owner's `lxmf.delivery` hash (hex).
     */
    setOwnerContact(contact) {
      owner = contact;
    },
  };
}
