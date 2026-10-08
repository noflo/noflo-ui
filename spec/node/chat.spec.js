import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ChatMessage,
  createChatSurface,
  parseChatMessage,
} from "../../src/node/chat.js";

const STUB_PI = fileURLToPath(
  new URL("../../src/node/pi-stub.mjs", import.meta.url),
);

/**
 * Boots a chat surface with a stubbed pi manager (the shape the
 * lifecycle manager exposes, backed by the stub child).
 *
 * @param {{ ownerContact?: string | null }} [options]
 */
async function boot(options = {}) {
  const ownerContact = options.ownerContact ?? "aa".repeat(32);
  const dir = mkdtempSync(path.join(tmpdir(), "noflo-chat-"));
  const state = new Map();
  /** @type {Array<{ to: string, text: string, title: string }>} */
  const sent = [];
  const stateAdapter = {
    get: async (key) => state.get(key) ?? null,
    set: async (key, value) => {
      state.set(key, value);
    },
  };
  const { createPiManager } = await import("../../src/node/piManager.js");
  const pi = createPiManager({
    workdir: dir,
    state: stateAdapter,
    piBin: process.execPath,
    idleGraceMs: 30000,
    spawnFn: (_bin, args, opts) =>
      spawn(_bin, [STUB_PI, ...args], {
        ...opts,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    log: () => {},
  });
  const surface = createChatSurface({
    ownerContact,
    sendText: async (to, text, opts = {}) => {
      sent.push({ to, text, title: opts.title ?? "" });
    },
    verifySender: async () => "verified",
    pi,
    state: stateAdapter,
    log: () => {},
  });
  return { surface, pi, sent, state, dir, ownerContact };
}

const OWNER = "aa".repeat(32);
const OTHER = "bb".repeat(32);

/** Wraps a text payload as an inbound LXMF message shape. */
const inbound = (
  /** @type {string} */ sourceHex,
  /** @type {string} */ text,
) => ({
  message: {
    sourceHash: new Uint8Array(
      sourceHex.match(/.{2}/g).map((b) => Number.parseInt(b, 16)),
    ),
    content: text,
  },
});

describe("chat command surface (work document #44 M2)", () => {
  it("parseChatMessage splits verbs and arguments", () => {
    const command = parseChatMessage(OWNER, "/model anthropic:claude");
    assert.ok(command instanceof ChatMessage);
    assert.equal(command.command, "model");
    assert.equal(command.argument, "anthropic:claude");
    const prompt = parseChatMessage(OWNER, "please refactor the graph");
    assert.equal(prompt.isCommand, false);
    assert.equal(prompt.text, "please refactor the graph");
  });

  it("free text becomes a pi prompt; pi answers through events", async () => {
    const { surface, pi, dir } = await boot();
    await surface.handleInbound(inbound(OWNER, "hello pi"));
    const state = await pi.status();
    assert.equal(state.model, "stub-model", "pi took the prompt");
    pi.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("messages from other identities are dropped", async () => {
    const { surface, pi, dir } = await boot();
    await surface.handleInbound(inbound(OTHER, "hello pi"));
    assert.equal(pi.isRunning(), false, "no pi spawned for strangers");
    rmSync(dir, { recursive: true, force: true });
  });

  it("unverified senders are dropped even when the hash matches", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-chat-"));
    /** @type {string[]} */
    const dropped = [];
    const { createPiManager } = await import("../../src/node/piManager.js");
    const pi = createPiManager({
      workdir: dir,
      state: { get: async () => null, set: async () => {} },
      piBin: process.execPath,
      spawnFn: () => {
        throw new Error("pi must not spawn");
      },
      log: () => {},
    });
    const surface = createChatSurface({
      ownerContact: OWNER,
      sendText: async () => {},
      verifySender: async () => "unknown",
      pi,
      state: { get: async () => null, set: async () => {} },
      log: (msg) => dropped.push(msg),
    });
    await surface.handleInbound(inbound(OWNER, "hello"));
    assert.equal(pi.isRunning(), false);
    assert.ok(
      dropped.some((msg) => msg.includes("unknown signature")),
      "the drop was logged with the reason",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("/session reports state; /suspend sleeps pi", async () => {
    const { surface, pi, sent, dir } = await boot();
    await surface.handleInbound(inbound(OWNER, "/session"));
    assert.match(
      sent.at(-1)?.text ?? "",
      /pi is not running/,
      "reported before any prompt",
    );
    await surface.handleInbound(inbound(OWNER, "work"));
    await surface.handleInbound(inbound(OWNER, "/session"));
    assert.match(sent.at(-1)?.text ?? "", /stub-model/);
    await surface.handleInbound(inbound(OWNER, "/suspend"));
    assert.match(sent.at(-1)?.text ?? "", /suspended/);
    assert.equal(pi.isRunning(), false);
    pi.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("/help lists the command surface", async () => {
    const { surface, sent, pi, dir } = await boot();
    await surface.handleInbound(inbound(OWNER, "/help"));
    const text = sent.at(-1)?.text ?? "";
    for (const command of [
      "/sessions",
      "/resume",
      "/session",
      "/compact",
      "/abort",
      "/model",
      "/suspend",
    ]) {
      assert.match(text, new RegExp(command.replace("/", "\\/")));
    }
    pi.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("unknown commands get a diagnostic reply", async () => {
    const { surface, sent, pi, dir } = await boot();
    await surface.handleInbound(inbound(OWNER, "/frobnicate"));
    assert.match(sent.at(-1)?.text ?? "", /unknown command \/frobnicate/);
    pi.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("inbound messages run in arrival order", async () => {
    const { surface, sent, pi, dir } = await boot();
    await Promise.all([
      surface.handleInbound(inbound(OWNER, "/help")),
      surface.handleInbound(inbound(OWNER, "/frobnicate")),
      surface.handleInbound(inbound(OWNER, "/session")),
    ]);
    const texts = sent.map((entry) => entry.text);
    const helpAt = texts.findIndex((t) => t.includes("commands:"));
    const unknownAt = texts.findIndex((t) => t.includes("/frobnicate"));
    const sessionAt = texts.findIndex((t) => t.includes("pi is not running"));
    assert.ok(helpAt < unknownAt && unknownAt < sessionAt, "ordered");
    pi.stop();
    rmSync(dir, { recursive: true, force: true });
  });
});
