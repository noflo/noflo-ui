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

import { toHex as coreToHex } from "@reticulum/core";

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
 *   (hex); messages from other identities are dropped. Null disables the
 *   gate (tests only).
 * @param {(destinationHex: string, text: string, options?: {title?: string}) => Promise<void>} deps.sendText
 * @param {(message: any) => Promise<"verified"|"unknown"|"invalid">} deps.verifySender
 * @param {{
 *   prompt: (text: string) => Promise<any>,
 *   status: () => Promise<any>,
 *   compact: (customInstructions?: string) => Promise<any|null>,
 *   setModel: (provider: string, modelId: string) => Promise<any|null>,
 *   newSession: () => Promise<any|null>,
 *   suspend: () => void,
 *   stop: () => void,
 *   isRunning: () => boolean,
 *   client: { abort: () => void } | null,
 * }} deps.pi - The pi lifecycle manager.
 * @param {{ get: (key: string) => Promise<any>, set: (key: string, value: any) => Promise<void> }} deps.state
 * @param {(msg: string) => void} [deps.log]
 * @returns {{
 *   handleInbound: (event: { message: any }) => Promise<void>,
 *   chatMessage: (sourceHex: string, text: string) => Promise<void>,
 *   reply: (text: string, title?: string) => Promise<void>,
 * }}
 */
export function createChatSurface({
  ownerContact,
  sendText,
  verifySender,
  pi,
  state,
  log = () => {},
}) {
  /** Serialization chain: inbound messages run strictly in arrival order. */
  /** @type {Promise<void>} */
  let queue = Promise.resolve();

  /**
   * Sends a reply to the owner contact.
   *
   * @param {string} text
   * @param {string} [title]
   * @returns {Promise<void>}
   */
  async function reply(text, title = "Companion") {
    if (!ownerContact) {
      log("companion: reply dropped (no owner contact configured)");
      return;
    }
    await sendText(ownerContact, text, { title });
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
   * Runs one admitted inbound message through the dispatch.
   *
   * @param {string} sourceHex
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function chatMessage(sourceHex, text) {
    const message = parseChatMessage(sourceHex, text);
    if (!message.isCommand) {
      // Free text is a prompt for the active project
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
        const current = pi.isRunning() ? await pi.status() : null;
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
        pi.suspend();
        await reply(`${target.file} resumes on the next prompt`);
        return;
      }
      case "session": {
        const current = pi.isRunning() ? await pi.status() : null;
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
        if (!pi.isRunning()) {
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
        if (!pi.isRunning()) {
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
        pi.client?.abort();
        await reply("abort sent");
        return;
      }
      case "model": {
        if (!message.argument) {
          const current = pi.isRunning() ? await pi.status() : null;
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
          const model = await pi.setModel(provider, modelId);
          await reply(`model set to ${model?.id ?? message.argument}`);
        } catch (e) {
          await reply(
            `⚠️ model switch failed: ${e instanceof Error ? e.message : e}`,
          );
        }
        return;
      }
      case "suspend": {
        pi.suspend();
        await reply("pi suspended — the session resumes on the next prompt");
        return;
      }
      case "help": {
        await reply(
          [
            "commands: /sessions /resume [n] /session /compact /new /abort /model provider:model /suspend /help",
            "free text goes to pi as a prompt",
          ].join("\n"),
        );
        return;
      }
      default:
        await reply(`unknown command /${message.command} — try /help`);
    }
  }

  /**
   * Gates and dispatches one inbound LXMF message. The gate: the sender
   * must be the configured owner contact AND carry a verified signature —
   * "unknown" (identity not recalled yet) is dropped; a re-sync after the
   * announce lands re-delivers it.
   *
   * @param {{ message: any }} event
   * @returns {Promise<void>}
   */
  async function handleInbound(event) {
    const message = event?.message;
    if (!message?.sourceHash) return;
    const sourceHex = coreToHex(message.sourceHash);
    if (ownerContact && sourceHex !== ownerContact.toLowerCase()) {
      log(`companion: inbound from ${sourceHex} dropped (not the owner)`);
      return;
    }
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
    // Serialize: prompts and commands keep order
    const run = queue
      .then(() => chatMessage(sourceHex, text))
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

  return { handleInbound, chatMessage, reply };
}
