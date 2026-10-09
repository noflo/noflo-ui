/**
 * @file companionPaths.js — the Companion's zero-configuration defaults
 * (work document #47 scope item 8, SPEC "Companion configuration"): sane
 * defaults scoped to the user homedir, complying with FHS/XDG (or
 * platform-equivalent conventions), while power users keep full control
 * via a configuration file and flags.
 *
 * Defaults:
 * - Config: `$XDG_CONFIG_HOME/noflo-ui/companion.json`
 *   (`~/.config/noflo-ui/companion.json`), auto-created on first run
 * - State:  `$XDG_DATA_HOME/noflo-ui/` (`~/.local/share/noflo-ui/`) —
 *   the LXMF identity and pi session pointers live here, never inside
 *   project folders (SPEC: multiple Companions on one machine each use
 *   a different identity and work dir)
 * - Serving port 3569 ("flow" in T9, like noflo-nodejs), listening on
 *   localhost only (`0.0.0.0` when inside Docker)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

/** The default serving port: "flow" in T9, like noflo-nodejs. */
export const DEFAULT_PORT = 3569;

/**
 * The XDG config home, honoring the spec'd env override.
 *
 * @returns {string}
 */
export function configHome() {
  return process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
}

/**
 * The XDG data home, honoring the spec'd env override.
 *
 * @returns {string}
 */
export function dataHome() {
  return process.env.XDG_DATA_HOME || path.join(homedir(), ".local/share");
}

/**
 * Whether the Companion runs inside a Docker container (the detected
 * case for the `0.0.0.0` serving default).
 *
 * @returns {boolean}
 */
export function inDocker() {
  return existsSync("/.dockerenv");
}

/**
 * Resolves the Companion's default paths and configuration.
 *
 * With `--config <file>` the given file is authoritative (created with
 * defaults when missing). Without it, the XDG default path is used the
 * same way — first run writes a starter config instead of failing.
 *
 * @param {object} options
 * @param {string|null} [options.configPath] - `--config` value (already
 *   resolved), or null for the XDG default.
 * @param {boolean} [options.create] - Whether to write a starter config
 *   file when none exists (default true; tests may disable).
 * @returns {{
 *   configPath: string,
 *   stateDir: string,
 *   exists: boolean,
 *   raw: string | null,
 *   defaults: { folder: string, port: number, host: string },
 * }}
 */
export function resolveCompanionPaths(options = {}) {
  const create = options.create !== false;
  const configPath =
    options.configPath ?? path.join(configHome(), "noflo-ui", "companion.json");
  // Companion state lives under the XDG data home; a `stateDir` beside a
  // custom config still wins (each Companion instance owns its identity)
  const stateDir = path.join(dataHome(), "noflo-ui");
  const exists = existsSync(configPath);
  const raw = exists ? readFileSync(configPath, "utf8") : null;
  if (!exists && create) {
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          // The materialized project folder defaults next to the config
          folder: path.join(path.dirname(configPath), "project"),
        },
        null,
        2,
      )}\n`,
    );
  }
  return {
    configPath,
    stateDir,
    exists,
    raw,
    defaults: {
      folder: path.join(path.dirname(configPath), "project"),
      port: DEFAULT_PORT,
      host: inDocker() ? "0.0.0.0" : "localhost",
    },
  };
}
