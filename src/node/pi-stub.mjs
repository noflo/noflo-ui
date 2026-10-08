/**
 * @file pi-stub.mjs — a minimal fake `pi --mode rpc` child for the
 * Companion's RPC client tests: speaks the JSONL protocol (responses
 * correlated by id), emits one `agent_end` event per prompt, and exits
 * on a `crash` command.
 */

import { createInterface } from "node:readline";

if (process.argv.includes("--fake-version")) {
  process.stdout.write("stub-pi 1.0.0\n");
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  if (line.length === 0) return;
  /** @type {any} */
  let cmd;
  try {
    cmd = JSON.parse(line);
  } catch {
    return;
  }
  if (cmd.type === "crash") {
    process.exit(1);
  }
  if (cmd.type === "prompt") {
    process.stdout.write(
      `${JSON.stringify({ type: "agent_start", message: cmd.message })}\n`,
    );
    process.stdout.write(
      `${JSON.stringify({ type: "agent_end", message: `done: ${cmd.message}` })}\n`,
    );
    respond(cmd.id, { success: true, data: { accepted: true } });
    return;
  }
  if (cmd.type === "get_state") {
    respond(cmd.id, {
      success: true,
      data: {
        model: "stub-model",
        isStreaming: false,
        sessionFile: process.argv.includes("--session")
          ? process.argv[process.argv.indexOf("--session") + 1]
          : null,
      },
    });
    return;
  }
  if (cmd.type === "compact") {
    respond(cmd.id, { success: false, error: "nothing to compact" });
    return;
  }
  respond(cmd.id, { success: true, data: {} });
});

/** @param {string} id @param {any} body */
function respond(id, body) {
  process.stdout.write(
    `${JSON.stringify({ ...body, type: "response", id })}\n`,
  );
}
