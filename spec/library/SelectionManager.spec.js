import assert from "node:assert";
import { SelectionManager } from "../../src/library/SelectionManager.js";

async function testSelectionManager() {
  console.log("Running SelectionManager tests...");

  const sm = new SelectionManager();

  // Test initial state
  assert.strictEqual(
    sm.hasAnySelection(),
    false,
    "Should have no selection initially",
  );
  assert.deepStrictEqual(
    sm.getSnapshot(),
    {
      nodes: [],
      edges: [],
      iips: [],
      ports: [],
    },
    "Snapshot should be empty initially",
  );

  // Test select single
  sm.select("nodes", "node-1");
  assert.strictEqual(
    sm.hasAnySelection(),
    true,
    "Should have selection after selecting a node",
  );
  assert.deepStrictEqual(
    sm.getSnapshot().nodes,
    ["node-1"],
    "Snapshot should contain node-1",
  );

  // Test select multiple (multi-select)
  sm.select("nodes", "node-2", true);
  assert.deepStrictEqual(
    sm.getSnapshot().nodes,
    ["node-1", "node-2"],
    "Snapshot should contain node-1 and node-2",
  );

  // Test select single (clears previous)
  sm.select("nodes", "node-3");
  assert.deepStrictEqual(
    sm.getSnapshot().nodes,
    ["node-3"],
    "Snapshot should only contain node-3",
  );

  // Test toggle
  sm.toggle("nodes", "node-3");
  assert.strictEqual(
    sm.hasAnySelection(),
    false,
    "Selection should be empty after toggling off",
  );
  sm.toggle("nodes", "node-3");
  assert.deepStrictEqual(
    sm.getSnapshot().nodes,
    ["node-3"],
    "Selection should contain node-3 after toggling on",
  );

  // Test clear
  sm.clear();
  assert.strictEqual(
    sm.hasAnySelection(),
    false,
    "Selection should be empty after clear",
  );

  // Test event dispatching
  let eventFired = false;
  let eventDetail = null;
  sm.addEventListener("selection-changed", (e) => {
    eventFired = true;
    eventDetail = e.detail;
  });

  sm.select("edges", "edge-1");
  assert.strictEqual(eventFired, true, "Event should have fired");
  assert.deepStrictEqual(
    eventDetail.edges,
    ["edge-1"],
    "Event detail should contain edge-1",
  );

  console.log("All SelectionManager tests passed!");
}

testSelectionManager().catch((err) => {
  console.error("Tests failed:", err);
  process.exit(1);
});
