/**
 * @file The environment age's aggregator (work documents #30 update #3,
 * #3): the environment age depicts the runtime/network — a crashed
 * network makes it Crashed, the mesh disconnecting makes it Offline, a
 * live network makes it Golden, the sketch stays Abstract. The Engine
 * computes it from the state it already holds (its own echo stream) and
 * publishes it on transitions; the Glass only renders it.
 *
 * Priority, per the at-a-glance truth (guidelines §5): crash is not
 * deferred — any crashed constituent flips the environment at once;
 * offline outranks golden (an unreachable runtime's live state is not
 * visible here); golden is earned by a runtime actually running.
 */

/**
 * @typedef {"abstract" | "golden" | "offline" | "crashed"} EnvironmentAge
 */

/**
 * The aggregator's running state: what the echo stream has reported,
 * keyed per runtime where applicable.
 */
export function createEnvironmentAge() {
  /** @type {boolean | undefined} Whether the mesh is enabled. */
  let meshEnabled = undefined;
  /** @type {boolean | undefined} The mesh's connected state. */
  let meshConnected = undefined;
  /** @type {string | undefined} The mesh's error, when set. */
  let meshError = undefined;
  /** @type {Map<string, string>} Per-runtime connection state. */
  const connections = new Map();
  /** @type {Map<string, string>} Per-runtime run state. */
  const runs = new Map();

  /**
   * Absorbs one echo's facts. Returns the computed age.
   *
   * @param {any} echo The Engine → Glass echo.
   * @returns {EnvironmentAge}
   */
  function absorb(echo) {
    switch (echo?.kind) {
      case "mesh-config": {
        meshEnabled = Boolean(echo.config?.enabled);
        meshError = echo.identityError ?? undefined;
        break;
      }
      case "mesh-status": {
        if (typeof echo.connected === "boolean") {
          meshConnected = echo.connected;
        }
        if (echo.error !== undefined) {
          meshError = echo.error || undefined;
        }
        break;
      }
      case "runtime-connection": {
        if (typeof echo.destinationHash === "string") {
          connections.set(echo.destinationHash, String(echo.state ?? ""));
        }
        break;
      }
      case "runtime-run": {
        if (typeof echo.destinationHash === "string") {
          runs.set(echo.destinationHash, String(echo.state ?? ""));
        }
        break;
      }
      case "runtime-deploy": {
        if (
          typeof echo.destinationHash === "string" &&
          echo.state === "deployed"
        ) {
          // A deploy's success clears nothing by itself — the run state
          // rules; but a deploy on a runtime we hold no run state for
          // means the runtime is at least alive: record it connected
          if (!runs.has(echo.destinationHash)) {
            runs.set(echo.destinationHash, "stopped");
          }
        }
        break;
      }
      default:
        break;
    }
    return compute();
  }

  /**
   * The priority: crashed > offline > golden > abstract. A disabled
   * mesh is not Offline — the sketch works without it (the zero-friction
   * principle); Offline is the mesh in use and down.
   *
   * @returns {EnvironmentAge}
   */
  function compute() {
    for (const state of runs.values()) {
      if (state === "error") return "crashed";
    }
    const meshInUse = meshEnabled === true || meshConnected !== undefined;
    const meshUp = meshConnected === true && !meshError;
    if (meshInUse && !meshUp) return "offline";
    for (const [hash, run] of runs.entries()) {
      if (run === "running" && connections.get(hash) === "connected") {
        return "golden";
      }
    }
    return "abstract";
  }

  return { absorb, compute };
}

/**
 * A convenient alias for the union's values, so call sites stay honest.
 *
 * @returns {EnvironmentAge[]} The ages in priority order.
 */
export function environmentAges() {
  return ["crashed", "offline", "golden", "abstract"];
}
