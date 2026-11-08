/**
 * @file The `/runtime` chat command (work document #47 item 3): start,
 * stop, and status for the project's on-demand runtime child — the
 * command surface over the runtime manager the bridge provisions per
 * project. The replies are honest about the trust model: the child joins
 * the project's mesh as a Dacar replica and evaluates grants pushed by
 * the peers — a fresh child resolves deny-closed until the project's
 * grant state reaches it.
 *
 * A pure module over the manager seam (work document #53's principle):
 * testable with a fake, no spawn required.
 */

/**
 * @typedef {Object} RuntimeCommandManager
 * @property {() => string} status
 * @property {() => string} [destinationHash]
 * @property {() => Promise<void>} start
 * @property {() => Promise<void>} stop
 */

/**
 * Builds the `/runtime [start|stop|status]` handler over one manager.
 *
 * @param {RuntimeCommandManager | null} manager The active project's
 *   runtime manager; null when no project is active.
 * @returns {(argument: string) => Promise<string>}
 */
export function createRuntimeCommand(manager) {
  return async (argument) => {
    if (!manager) {
      return "no active project — the runtime starts per project (/projects lists them)";
    }
    const sub = String(argument ?? "")
      .trim()
      .toLowerCase();
    const current = manager.status();
    if (sub === "start") {
      if (current === "running" || current === "starting") {
        return `runtime already ${current}`;
      }
      await manager.start();
      const hash = manager.destinationHash?.() ?? "";
      return [
        "runtime started — announcing on the mesh.",
        hash ? `Destination: ${hash}` : "",
        "It evaluates the project's Dacar state as a replica; grants reach it as the wallet changes, and the Runtime corner lists it once it announces.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    if (sub === "stop") {
      if (current === "stopped") return "runtime is not running";
      await manager.stop();
      return "runtime stopped";
    }
    // status (the default, including unknown arguments)
    const hash = manager.destinationHash?.() ?? "";
    return [
      `runtime: ${current}`,
      current === "running" && hash ? `— announcing as ${hash}` : "",
      "/runtime start | stop | status",
    ]
      .filter(Boolean)
      .join(" ");
  };
}
