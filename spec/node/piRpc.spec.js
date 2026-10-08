import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createJsonlReader,
  PiRpcClient,
  RpcError,
} from "../../src/node/piRpc.js";

const STUB_PI = fileURLToPath(
  new URL("../../src/node/pi-stub.mjs", import.meta.url),
);

/**
 * Boots a PiRpcClient against the stub pi child.
 *
 * @param {{ sessionPath?: string | null }} [options]
 * @returns {Promise<{ client: PiRpcClient, events: any[], dir: string }>}
 */
async function bootStub(options = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "noflo-pi-"));
  if (options.sessionPath) {
    writeFileSync(options.sessionPath, "{}");
  }
  const client = new PiRpcClient({
    piBin: process.execPath,
    cwd: dir,
    sessionPath: options.sessionPath ?? null,
    spawnFn: (_bin, args, opts) =>
      spawn(_bin, [STUB_PI, ...args], {
        ...opts,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    restartBaseDelayMs: 20,
    log: () => {},
  });
  const events = [];
  client.addEventListener("event", (/** @type {any} */ e) =>
    events.push(e.detail),
  );
  await client.start({ readyTimeoutMs: 5000 });
  return { client, events, dir };
}

describe("pi RPC client (work document #44 M2)", () => {
  it("the JSONL reader handles LF framing, CRLF, and split chunks", () => {
    /** @type {string[]} */
    const lines = [];
    const reader = createJsonlReader((line) => lines.push(line));
    reader.push('{"a":1}\n{"b":"\u2028"}\r\n{"c"');
    reader.push(":3}\n");
    reader.flush();
    assert.deepEqual(lines, ['{"a":1}', '{"b":"\u2028"}', '{"c":3}']);
  });

  it("starts against a stub child and correlates responses", async () => {
    const { client, dir } = await bootStub();
    const state = await client.getState();
    assert.equal(state.model, "stub-model");
    assert.equal(client.cwd, dir);
    client.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it("forwards non-response records as events", async () => {
    const { client, events } = await bootStub();
    await client.prompt("hello");
    const agentEvents = events.filter((e) => e.type === "agent_end");
    assert.equal(agentEvents.length, 1, "the stub emitted one agent_end");
    assert.match(agentEvents[0].message, /hello/);
    client.stop();
    rmSync(client.cwd, { recursive: true, force: true });
  });

  it("command failures throw RpcError with the command name", async () => {
    const { client } = await bootStub();
    await assert.rejects(
      () => client.compact(),
      (/** @type {RpcError} */ e) => e.command === "compact",
    );
    client.stop();
    rmSync(client.cwd, { recursive: true, force: true });
  });

  it("resumes a session when --session points at an existing file", async () => {
    const sessionPath = path.join(tmpdir(), `noflo-session-${Date.now()}.json`);
    const { client } = await bootStub({ sessionPath });
    const state = await client.getState();
    assert.equal(state.sessionFile, sessionPath, "the stub saw --session");
    client.stop();
    rmSync(client.cwd, { recursive: true, force: true });
    rmSync(sessionPath, { force: true });
  });

  it("respawns after an unexpected child exit and stays ready", async () => {
    const { client } = await bootStub();
    // The stub exits when it receives the crash command
    client.write({ type: "crash" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(client.ready, false, "down after the crash");
    const state = await client.getState();
    assert.equal(state.model, "stub-model", "the respawn answered");
    client.stop();
    rmSync(client.cwd, { recursive: true, force: true });
  });
});
