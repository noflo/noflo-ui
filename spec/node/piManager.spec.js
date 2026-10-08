import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createPiManager, discoverPi } from "../../src/node/piManager.js";

const STUB_PI = fileURLToPath(
  new URL("../../src/node/pi-stub.mjs", import.meta.url),
);

/**
 * Boots a manager against the stub pi child with an in-memory state
 * store and a short idle grace.
 *
 * @param {{ idleGraceMs?: number }} [options]
 * @returns {{ manager: any, state: Map<string, any>, events: any[], dir: string }}
 */
function boot(options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "noflo-pim-"));
  const state = new Map();
  const events = [];
  const manager = createPiManager({
    workdir: dir,
    state: {
      get: async (key) => state.get(key) ?? null,
      set: async (key, value) => {
        state.set(key, value);
      },
    },
    piBin: process.execPath,
    idleGraceMs: options.idleGraceMs ?? 200,
    spawnFn: (_bin, args, opts) =>
      spawn(_bin, [STUB_PI, ...args], {
        ...opts,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    log: () => {},
  });
  manager.addEventListener("event", (/** @type {any} */ e) =>
    events.push(e.detail),
  );
  return { manager, state, events, dir };
}

const sleep = (/** @type {number} */ ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("pi lifecycle manager (work document #44 M2)", () => {
  it("discoverPi reports availability with a version", async () => {
    const { available, version } = await discoverPi({
      piBin: process.execPath,
      execFile: (bin, args) =>
        spawn(bin, [STUB_PI, "--fake-version", ...args], {
          stdio: ["pipe", "pipe", "pipe"],
        }),
    });
    assert.equal(available, true);
    assert.match(version ?? "", /stub-/, "the version came from the stub");
  });

  it("discoverPi reports unavailable when the binary is missing", async () => {
    const { available } = await discoverPi({ piBin: "definitely-not-pi" });
    assert.equal(available, false);
  });

  it("spawns on first prompt and reuses the client after", async () => {
    const { manager, dir } = boot();
    await manager.prompt("first");
    assert.equal(manager.isRunning(), true, "spawned by the prompt");
    const first = manager.client;
    await manager.prompt("second");
    assert.equal(manager.client, first, "the same client is reused");
    manager.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("shuts the child down after the idle grace", async () => {
    const { manager, dir } = boot({ idleGraceMs: 100 });
    await manager.prompt("work");
    assert.equal(manager.isRunning(), true);
    await sleep(400);
    assert.equal(manager.isRunning(), false, "idle grace stopped the child");
    rmSync(dir, { recursive: true, force: true });
  });

  it("persists the session pointer; the next spawn resumes", async () => {
    const sessionPath = path.join(tmpdir(), `noflo-pim-${Date.now()}.json`);
    writeFileSync(sessionPath, "{}");
    const { manager, state, dir } = boot({ idleGraceMs: 30000 });
    await manager.prompt("work");
    // Seed the pointer as the RPC layer would after observing state
    await state.set("session", { sessionFile: sessionPath, workdir: dir });
    manager.suspend();
    while (manager.isRunning()) await sleep(20);
    await manager.prompt("resume work");
    const argv = manager.client.argv();
    assert.ok(
      argv.includes("--session") && argv.includes(sessionPath),
      "the respawn resumed the persisted session",
    );
    manager.stop();
    rmSync(dir, { recursive: true, force: true });
    rmSync(sessionPath, { force: true });
  });

  it("suspend stops immediately and keeps the session pointer", async () => {
    const { manager, state, dir } = boot();
    await manager.prompt("work");
    await state.set("session", {
      sessionFile: "/tmp/some-session.json",
      workdir: dir,
    });
    manager.suspend();
    await sleep(100);
    assert.equal(manager.isRunning(), false);
    assert.deepEqual(
      state.get("session"),
      {
        sessionFile: "/tmp/some-session.json",
        workdir: dir,
      },
      "the pointer survives suspend",
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("forwards pi events and narrates lifecycle moments", async () => {
    const { manager, events, dir } = boot();
    /** @type {string[]} */
    const narrations = [];
    manager.addEventListener("narration", (/** @type {any} */ e) =>
      narrations.push(e.detail.text),
    );
    await manager.prompt("hello");
    assert.ok(
      events.some((e) => e.type === "agent_end"),
      "pi events forwarded through the manager",
    );
    assert.ok(
      narrations.some((text) => /pi started a fresh session/.test(text)),
      "spawn narration emitted",
    );
    manager.stop();
    rmSync(dir, { recursive: true, force: true });
  });
});
