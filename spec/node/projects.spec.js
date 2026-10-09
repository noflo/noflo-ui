import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  loadProjectsRegistry,
  registerProject,
  removeProject,
  saveProjectsRegistry,
  setActiveProject,
} from "../../src/node/projects.js";

describe("Companion project registry (work document #47, multi-project)", () => {
  it("starts fresh and persists registrations atomically", () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), "noflo-registry-"));
    const registry = loadProjectsRegistry(stateDir);
    assert.deepEqual(registry, { activeProjectId: null, projects: [] });

    registerProject(stateDir, {
      id: "p1",
      name: "First",
      folder: "/workdirs/p1",
    });
    registerProject(stateDir, {
      id: "p2",
      name: "Second",
      folder: "/workdirs/p2",
    });
    const loaded = loadProjectsRegistry(stateDir);
    assert.equal(loaded.projects.length, 2);
    // The file on disk is valid JSON with a trailing newline
    const raw = readFileSync(path.join(stateDir, "projects.json"), "utf8");
    assert.ok(raw.endsWith("\n"));
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("re-registration by id updates the entry", () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), "noflo-registry-"));
    registerProject(stateDir, { id: "p1", name: "First", folder: "/a" });
    registerProject(stateDir, { id: "p1", name: "Renamed", folder: "/b" });
    const loaded = loadProjectsRegistry(stateDir);
    assert.equal(loaded.projects.length, 1);
    assert.equal(loaded.projects[0].name, "Renamed");
    assert.equal(loaded.projects[0].folder, "/b");
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("the active pointer moves and refuses unknown ids", () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), "noflo-registry-"));
    registerProject(stateDir, { id: "p1", name: "First", folder: "/a" });
    const registry = setActiveProject(stateDir, "p1");
    assert.equal(registry.activeProjectId, "p1");
    assert.throws(() => setActiveProject(stateDir, "ghost"), /Unknown project/);
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("removal re-points the active pointer to a survivor", () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), "noflo-registry-"));
    registerProject(stateDir, { id: "p1", name: "First", folder: "/a" });
    registerProject(stateDir, { id: "p2", name: "Second", folder: "/b" });
    setActiveProject(stateDir, "p1");
    removeProject(stateDir, "p1");
    const loaded = loadProjectsRegistry(stateDir);
    assert.equal(loaded.activeProjectId, "p2", "fell back to the survivor");
    removeProject(stateDir, "p2");
    assert.equal(loadProjectsRegistry(stateDir).activeProjectId, null);
    rmSync(stateDir, { recursive: true, force: true });
  });

  it("a corrupt registry fails loudly instead of emptying", () => {
    const stateDir = mkdtempSync(path.join(tmpdir(), "noflo-registry-"));
    registerProject(stateDir, { id: "p1", name: "First", folder: "/a" });
    // Corrupt the registry on disk
    writeFileSync(path.join(stateDir, "projects.json"), "{broken");
    assert.throws(() => loadProjectsRegistry(stateDir), /corrupt/);
    rmSync(stateDir, { recursive: true, force: true });
  });
});
