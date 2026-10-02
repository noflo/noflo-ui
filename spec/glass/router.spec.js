import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { buildHash, createRouter, parseRoute } from "../../src/glass/router.js";

/**
 * Installs a minimal hash-navigation surface on the global object, mirroring
 * what a browser provides (location.hash, history, hashchange events).
 */
function installLocation() {
  const listeners = new Set();
  let hash = "";
  globalThis.window = {
    addEventListener: (kind, cb) => {
      if (kind === "hashchange") listeners.add(cb);
    },
    removeEventListener: (kind, cb) => {
      if (kind === "hashchange") listeners.delete(cb);
    },
    history: {
      replaceState: (_state, _title, url) => {
        hash = /** @type {string} */ (url);
      },
      pushState: (_state, _title, url) => {
        hash = /** @type {string} */ (url);
      },
    },
    location: {
      get hash() {
        return hash;
      },
      set hash(value) {
        hash = value;
        for (const cb of listeners) cb();
      },
    },
  };
  return () => {
    listeners.clear();
    delete globalThis.window;
  };
}

describe("glass URL router (work document #23)", () => {
  let cleanup = /** @type {() => void} */ (() => {});
  beforeEach(() => {
    cleanup = installLocation();
  });
  afterEach(() => {
    cleanup();
  });

  it("parses project and graph segments", () => {
    assert.deepEqual(parseRoute("#/p/default/main"), {
      projectId: "default",
      graphId: "main",
    });
    // Hierarchical subgraph ids keep their slashes
    assert.deepEqual(parseRoute("#/p/myproject/main/A/deep"), {
      projectId: "myproject",
      graphId: "main/A/deep",
    });
    assert.equal(parseRoute("#/other"), null);
    assert.equal(parseRoute(""), null);
  });

  it("builds hash routes from project and graph", () => {
    assert.equal(buildHash("default", "main"), "#/p/default/main");
    assert.equal(buildHash("default", "main/A"), "#/p/default/main/A");
  });

  it("normalizes an unrouted URL to the default graph without history noise", () => {
    const routes = [];
    const router = createRouter({
      onRouteChange: (route) => routes.push(route),
    });
    assert.equal(router.graphId(), "main");
    assert.equal(window.location.hash, "#/p/default/main");
    assert.equal(routes.length, 0, "initial normalization emits no event");
    router.destroy();
  });

  it("adopts the route from the URL on boot", () => {
    window.location.hash = "#/p/default/main/A";
    const router = createRouter({});
    assert.equal(router.graphId(), "main/A");
    router.destroy();
  });

  it("navigates by pushing a hash change and notifies the listener", () => {
    const routes = [];
    const router = createRouter({ onRouteChange: (r) => routes.push(r) });
    router.navigate("main/A");
    assert.equal(router.graphId(), "main/A");
    assert.deepEqual(routes, [{ projectId: "default", graphId: "main/A" }]);
    router.destroy();
  });

  it("replaces the route silently when asked", () => {
    const routes = [];
    const router = createRouter({ onRouteChange: (r) => routes.push(r) });
    router.navigate("main/B", { replace: true });
    assert.equal(router.graphId(), "main/B");
    assert.equal(window.location.hash, "#/p/default/main/B");
    assert.equal(routes.length, 0);
    router.destroy();
  });

  it("does not notify when navigating to the current graph", () => {
    const routes = [];
    const router = createRouter({ onRouteChange: (r) => routes.push(r) });
    router.navigate("main");
    assert.equal(routes.length, 0);
    router.destroy();
  });

  it("supports back/forward via external hash changes", () => {
    const routes = [];
    const router = createRouter({ onRouteChange: (r) => routes.push(r) });
    router.navigate("main/A");
    // Simulate the browser going back: the URL changes externally
    window.location.hash = "#/p/default/main";
    assert.equal(router.graphId(), "main");
    assert.equal(routes.length, 2);
    router.destroy();
  });
});
