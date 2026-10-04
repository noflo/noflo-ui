import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ECHO_MESSAGES, UI_MESSAGES } from "../../src/crdt/Protocol.js";

describe("IPC contract registries (work document #37)", () => {
  it("the Glass → Engine registry has no duplicate keys", () => {
    const seen = new Set();
    for (const key of UI_MESSAGES) {
      const id = `${key.type}/${key.command}`;
      assert.ok(!seen.has(id), `duplicate UI message key: ${id}`);
      seen.add(id);
    }
  });

  it("every Glass → Engine entry is a well-formed type/command pair", () => {
    for (const key of UI_MESSAGES) {
      assert.equal(typeof key.type, "string", "type must be a string");
      assert.equal(typeof key.command, "string", "command must be a string");
      assert.match(key.type, /^[A-Z]+$/, "types are upper-case");
      assert.match(key.command, /^[a-zA-Z]+$/, "commands are camelCase");
    }
  });

  it("the Engine → Glass registry has no duplicate keys", () => {
    const seen = new Set();
    for (const key of ECHO_MESSAGES) {
      const id = "kind" in key ? key.kind : `${key.protocol}/${key.command}`;
      assert.ok(!seen.has(id), `duplicate echo message key: ${id}`);
      seen.add(id);
    }
  });

  it("every Engine → Glass entry is a kind or a protocol/command pair", () => {
    for (const key of ECHO_MESSAGES) {
      if ("kind" in key) {
        assert.equal(typeof key.kind, "string");
        assert.match(key.kind, /^[a-z-]+$/, "kinds are kebab-case");
        assert.equal(
          /** @type {any} */ (key).protocol,
          undefined,
          "a kind entry carries no protocol",
        );
      } else {
        assert.equal(typeof key.protocol, "string");
        assert.equal(typeof key.command, "string");
        assert.match(
          /** @type {any} */ (key).command,
          /^[a-z]+$/,
          "protocol echo commands are lower-case",
        );
      }
    }
  });
});
