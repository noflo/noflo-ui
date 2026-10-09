import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  configHome,
  DEFAULT_HUB_PORT,
  DEFAULT_PORT,
  dataHome,
  inDocker,
  resolveCompanionPaths,
} from "../../src/node/companionPaths.js";

describe("Companion zero-configuration defaults (work document #47)", () => {
  it("honors the XDG environment overrides", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-xdg-"));
    process.env.XDG_CONFIG_HOME = path.join(dir, "config");
    process.env.XDG_DATA_HOME = path.join(dir, "data");
    try {
      assert.equal(configHome(), path.join(dir, "config"));
      assert.equal(dataHome(), path.join(dir, "data"));
      const resolved = resolveCompanionPaths({ create: false });
      assert.equal(
        resolved.configPath,
        path.join(dir, "config", "noflo-ui", "companion.json"),
      );
      assert.equal(resolved.stateDir, path.join(dir, "data", "noflo-ui"));
      assert.equal(resolved.exists, false);
      assert.equal(resolved.defaults.port, DEFAULT_PORT);
      assert.equal(DEFAULT_PORT, 3000, "the UI serving port");
      assert.equal(DEFAULT_HUB_PORT, 3569, '"flow" in T9, like noflo-nodejs');
    } finally {
      delete process.env.XDG_CONFIG_HOME;
      delete process.env.XDG_DATA_HOME;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("first run writes a starter config pointing at a project folder beside it", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-xdg-"));
    process.env.XDG_CONFIG_HOME = path.join(dir, "config");
    try {
      const resolved = resolveCompanionPaths();
      assert.equal(resolved.exists, false, "nothing existed before");
      assert.ok(
        existsSync(resolved.configPath),
        "the starter config was written",
      );
      const starter = JSON.parse(readFileSync(resolved.configPath, "utf8"));
      assert.equal(
        starter.folder,
        path.join(path.dirname(resolved.configPath), "project"),
      );
      // Idempotent: a second run sees the file and does not rewrite it
      const again = resolveCompanionPaths();
      assert.equal(again.exists, true);
      assert.equal(again.raw, readFileSync(resolved.configPath, "utf8"));
    } finally {
      delete process.env.XDG_CONFIG_HOME;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("serves on localhost by default and 0.0.0.0 inside Docker", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-xdg-"));
    process.env.XDG_CONFIG_HOME = path.join(dir, "config");
    delete process.env.XDG_CONFIG_HOME;
    rmSync(dir, { recursive: true, force: true });
    const realDocker = existsSync("/.dockerenv");
    if (realDocker) {
      assert.equal(inDocker(), true);
      const resolved = resolveCompanionPaths({ create: false });
      assert.equal(resolved.defaults.host, "0.0.0.0");
    } else {
      assert.equal(inDocker(), false);
      const resolved = resolveCompanionPaths({ create: false });
      assert.equal(resolved.defaults.host, "localhost");
    }
  });

  it("an explicit --config path is used as-is", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "noflo-xdg-"));
    const configPath = path.join(dir, "my-bridge.json");
    const resolved = resolveCompanionPaths({ configPath, create: false });
    assert.equal(resolved.configPath, configPath);
    assert.equal(resolved.exists, false);
    rmSync(dir, { recursive: true, force: true });
  });
});
