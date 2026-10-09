/**
 * @file projects.js — the Companion's project registry (work document #47
 * scope item 2, multi-project support). It mirrors the webapp's
 * multi-project model: device-level state (mesh identity, Dacar wallet,
 * the `activeProjectId` pointer) stays at the Companion level, while
 * project content lives in per-project scopes — the webapp's
 * `noflo-project-<id>` IndexedDB stores map to per-project workdirs here,
 * each carrying its own `.noflo-doc.bin` persistence and materialized
 * tree.
 *
 * The registry itself is a small JSON file in the Companion state
 * directory (`projects.json`): inspectable, hand-editable, and the single
 * place that maps a project identity to its workdir. Switching projects
 * restarts the engine with the other project's scope — the daemon
 * equivalent of the webapp's page reload — while the process-level mesh
 * node, LXMF layer, and chat stay up.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";

/** The registry file name inside the Companion state directory. */
export const REGISTRY_FILENAME = "projects.json";

/**
 * A registered project: its CRDT identity and the workdir its content
 * materializes into (an existing folder is overlay mode per work
 * document #43 update #4).
 *
 * @typedef {Object} ProjectEntry
 * @property {string} id - The project's CRDT identity (uuid).
 * @property {string} name - Display name from project metadata.
 * @property {string} folder - Absolute path of the materialized workdir.
 */

/**
 * @typedef {Object} ProjectsRegistry
 * @property {string | null} activeProjectId - The project the engine is
 *   currently bound to (null when none yet).
 * @property {ProjectEntry[]} projects
 */

/**
 * Loads the registry, or a fresh one when the file does not exist.
 *
 * @param {string} stateDir - The Companion state directory.
 * @returns {ProjectsRegistry}
 */
export function loadProjectsRegistry(stateDir) {
  const file = path.join(stateDir, REGISTRY_FILENAME);
  if (!existsSync(file)) {
    return { activeProjectId: null, projects: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return {
      activeProjectId:
        typeof parsed.activeProjectId === "string"
          ? parsed.activeProjectId
          : null,
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.filter(
            (/** @type {any} */ entry) =>
              entry &&
              typeof entry.id === "string" &&
              typeof entry.folder === "string",
          )
        : [],
    };
  } catch {
    // A corrupt registry must not look like "no projects": fail loudly —
    // project identities are load-bearing for grants and workdirs
    throw new Error(`Companion project registry is corrupt: ${file}`);
  }
}

/**
 * Saves the registry atomically (temp + rename).
 *
 * @param {string} stateDir
 * @param {ProjectsRegistry} registry
 */
export function saveProjectsRegistry(stateDir, registry) {
  mkdirSync(stateDir, { recursive: true });
  const file = path.join(stateDir, REGISTRY_FILENAME);
  const temp = `${file}.tmp`;
  writeFileSync(temp, `${JSON.stringify(registry, null, 2)}\n`);
  renameSync(temp, file);
}

/**
 * Registers a project (idempotent by id; a re-registration updates the
 * name and folder).
 *
 * @param {string} stateDir
 * @param {ProjectEntry} entry
 * @returns {ProjectsRegistry} The updated registry (also persisted).
 */
export function registerProject(stateDir, entry) {
  const registry = loadProjectsRegistry(stateDir);
  const existing = registry.projects.findIndex((p) => p.id === entry.id);
  if (existing > -1) {
    registry.projects[existing] = entry;
  } else {
    registry.projects.push(entry);
  }
  saveProjectsRegistry(stateDir, registry);
  return registry;
}

/**
 * Sets the active project pointer. Unknown ids are refused: switching to
 * a project the registry never heard of would silently materialize an
 * empty doc over an untracked folder.
 *
 * @param {string} stateDir
 * @param {string} projectId
 * @returns {ProjectsRegistry}
 */
export function setActiveProject(stateDir, projectId) {
  const registry = loadProjectsRegistry(stateDir);
  if (!registry.projects.some((p) => p.id === projectId)) {
    throw new Error(`Unknown project: ${projectId}`);
  }
  registry.activeProjectId = projectId;
  saveProjectsRegistry(stateDir, registry);
  return registry;
}

/**
 * Removes a project from the registry (the workdir on disk is left
 * alone — deleting content is the human's call).
 *
 * @param {string} stateDir
 * @param {string} projectId
 * @returns {ProjectsRegistry}
 */
export function removeProject(stateDir, projectId) {
  const registry = loadProjectsRegistry(stateDir);
  registry.projects = registry.projects.filter((p) => p.id !== projectId);
  if (registry.activeProjectId === projectId) {
    registry.activeProjectId = registry.projects[0]?.id ?? null;
  }
  saveProjectsRegistry(stateDir, registry);
  return registry;
}
