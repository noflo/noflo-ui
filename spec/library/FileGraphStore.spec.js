import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDebouncedSaver,
  graphFileNameFor,
  placeMissingElements,
  saveGraphAsJson,
} from "../../src/library/FileGraphStore.js";

// --- tiny in-memory File System Access API fakes (no browser needed) ---

function makeWritableStream() {
  let text = "";
  return {
    async write(s) {
      text = String(s);
    },
    async close() {},
    getText() {
      return text;
    },
  };
}

function makeFileHandle(name) {
  let last = null;
  return {
    name,
    kind: "file",
    async createWritable() {
      last = makeWritableStream();
      return last;
    },
    getText() {
      return last ? last.getText() : "";
    },
  };
}

function makeDir() {
  /** @type {Map<string, ReturnType<typeof makeFileHandle>>} */
  const entries = new Map();
  return {
    entries,
    async *values() {
      for (const entry of entries.values()) yield entry;
    },
    async getFileHandle(name, options = {}) {
      if (entries.has(name)) return entries.get(name);
      if (!options.create) {
        throw new Error(`getFileHandle(${name}): not found`);
      }
      const handle = makeFileHandle(name);
      entries.set(name, handle);
      return handle;
    },
  };
}

/** Minimal graph double exposing the shape these helpers depend on. */
function makeGraph({ nodes = [], initializers = [] } = {}) {
  return {
    nodes,
    initializers,
    toJSON() {
      return {
        processes: Object.fromEntries(
          nodes.map((n) => [
            n.id,
            { component: n.component, metadata: n.metadata },
          ]),
        ),
        connections: [],
      };
    },
  };
}

describe("graphFileNameFor", () => {
  it("appends .graph.json to a plain name", () => {
    assert.equal(graphFileNameFor("Reader"), "Reader.graph.json");
  });
});

describe("saveGraphAsJson", () => {
  it("writes 2-space JSON under the converted name for an .fbp source", async () => {
    const dir = makeDir();
    const graph = makeGraph({
      nodes: [{ id: "A", component: "foo/Bar", metadata: { x: 10, y: 20 } }],
    });

    const name = await saveGraphAsJson(dir, "g.fbp", graph);

    assert.equal(name, "g.graph.json");
    assert.ok(dir.entries.has("g.graph.json"));
    const text = dir.entries.get("g.graph.json").getText();
    assert.equal(text, JSON.stringify(graph.toJSON(), null, 2));
    assert.equal(JSON.parse(text).processes.A.component, "foo/Bar");
    assert.match(text, /\n {2}/, "uses 2-space indentation");
  });

  it("keeps the original name when it is not .fbp", async () => {
    const dir = makeDir();
    const graph = makeGraph();
    const name = await saveGraphAsJson(dir, "h.graph.json", graph);
    assert.equal(name, "h.graph.json");
    assert.ok(dir.entries.has("h.graph.json"));
  });

  it("creates the file when it does not yet exist", async () => {
    const dir = makeDir();
    await saveGraphAsJson(dir, "new.graph.json", makeGraph());
    assert.ok(dir.entries.has("new.graph.json"));
  });
});

describe("placeMissingElements", () => {
  it("is a no-op when every node already has coordinates", () => {
    const graph = makeGraph({
      nodes: [{ id: "A", component: "c", metadata: { x: 1, y: 2 } }],
    });
    assert.equal(placeMissingElements(graph), 0);
    assert.equal(graph.nodes[0].metadata.x, 1);
  });

  it("assigns coordinates to nodes missing them", () => {
    const graph = makeGraph({
      nodes: [{ id: "A", component: "c", metadata: {} }],
    });
    assert.equal(placeMissingElements(graph), 1);
    assert.equal(typeof graph.nodes[0].metadata.x, "number");
    assert.equal(typeof graph.nodes[0].metadata.y, "number");
  });

  it("places new nodes to the right of the existing bounding box", () => {
    const graph = makeGraph({
      nodes: [
        { id: "A", component: "c", metadata: { x: 100, y: 100 } },
        { id: "B", component: "c", metadata: {} },
      ],
    });
    placeMissingElements(graph);
    assert.ok(graph.nodes[1].metadata.x > 100, "B is placed right of A");
  });

  it("places IIPs as well as nodes", () => {
    const graph = makeGraph({
      nodes: [],
      initializers: [{ metadata: {} }],
    });
    assert.equal(placeMissingElements(graph), 1);
    assert.equal(typeof graph.initializers[0].metadata.x, "number");
  });

  it("wraps to a new row once the width budget is exceeded", () => {
    const nodes = [];
    for (let i = 0; i < 10; i++) {
      nodes.push({ id: `N${i}`, component: "c", metadata: {} });
    }
    const graph = makeGraph({ nodes });
    placeMissingElements(graph, {
      maxWidth: 400,
      defaultWidth: 150,
      padding: 50,
    });
    const ys = nodes.map((n) => n.metadata.y);
    const xs = nodes.map((n) => n.metadata.x);
    assert.ok(new Set(ys).size > 1, "wrapped to multiple rows");
    assert.ok(xs.includes(50), "a fresh row restarts X at the padding");
  });
});

describe("createDebouncedSaver", () => {
  // Deterministic fake clock injected via the `timer` argument — avoids the
  // flakiness and API constraints of Node's global mock timers.
  function makeClock() {
    /** @type {Map<number, { fire: number, fn: () => unknown }>} */
    const pending = new Map();
    /** @type {Array<Promise<unknown>>} */
    const inflight = [];
    let now = 0;
    let nextId = 1;
    return {
      setTimeout(fn, ms) {
        const id = nextId++;
        pending.set(id, { fire: now + ms, fn });
        return id;
      },
      clearTimeout(id) {
        pending.delete(id);
      },
      async advance(ms) {
        const target = now + ms;
        now = target;
        const due = [...pending.entries()]
          .filter(([, t]) => t.fire <= target)
          .sort((a, b) => a[1].fire - b[1].fire);
        for (const [id, t] of due) {
          pending.delete(id);
          inflight.push(Promise.resolve(t.fn()));
        }
        await Promise.all(inflight.splice(0));
      },
    };
  }

  it("coalesces repeated schedule() calls into a single write", async () => {
    const clock = makeClock();
    let calls = 0;
    const saver = createDebouncedSaver(
      async () => {
        calls++;
      },
      1000,
      clock,
    );

    saver.schedule();
    saver.schedule();
    saver.schedule();

    await clock.advance(999);
    assert.equal(calls, 0, "no write before the quiet window elapses");
    await clock.advance(1);
    assert.equal(calls, 1, "exactly one write after the window elapses");
  });

  it("flush() writes immediately and clears the pending timer", async () => {
    const clock = makeClock();
    let calls = 0;
    const saver = createDebouncedSaver(
      async () => {
        calls++;
      },
      1000,
      clock,
    );

    saver.schedule();
    await saver.flush();
    assert.equal(calls, 1);
    await clock.advance(2000);
    assert.equal(calls, 1, "no extra write from the cleared timer");
  });

  it("cancel() prevents the pending write", async () => {
    const clock = makeClock();
    let calls = 0;
    const saver = createDebouncedSaver(
      async () => {
        calls++;
      },
      1000,
      clock,
    );

    saver.schedule();
    saver.cancel();
    await clock.advance(2000);
    assert.equal(calls, 0);
  });
});
