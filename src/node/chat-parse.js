/**
 * @file chat-parse.js — the chat pipeline's pure parse stage (work
 * document #53 extraction 3): decoding and shaping the inbound LXMF
 * envelope. Imported by both the chat surface and the graph's Parse
 * component — keeping the parse here avoids a circular import.
 */

import { toHex as coreToHex } from "../../vendor/reticulum-core.js";

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
