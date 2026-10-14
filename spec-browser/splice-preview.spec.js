/**
 * @file The splice preview journey (work document #5): a real-browser
 * verification of the splice hover — the edge highlight, the ~250 ms
 * preview spring, and the single-undo splice. Built after the preview
 * shipped inert: the scheduling block was lost in an edit and no spec
 * noticed, because the whole chain is browser-only (screen CTM hit
 * testing, pointer capture, CSS transforms). The journey asserts each
 * stage in the live DOM so the next loss cannot pass silently.
 *
 * Lives OUTSIDE `spec/` per the smoke-layer convention (work document #56
 * proposal 1): real Chromium, run with `npm run test:browser`.
 */

import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
import net from "node:net";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen({ host: "127.0.0.1", port: 0 }, () => {
      const { port } = /** @type {net.AddressInfo} */ (probe.address());
      probe.close(() => resolve(port));
    });
  });
}

let PORT = 3901;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
};

async function serve(req, res) {
  const url = new URL(req.url ?? "/", "http://local");
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = resolve(ROOT, rel || "index.html");
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(file);
    const etag = `"${s.size}-${s.mtimeMs}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-cache",
      etag,
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
}

describe("browser smoke: the splice preview journey (work document #5)", {
  timeout: 120_000,
}, () => {
  /** @type {any} */
  let server;
  /** @type {any} */
  let browser;
  /** @type {any} */
  let page;
  /** @type {string[]} */
  let consoleErrors;

  before(async () => {
    PORT = await getFreePort();
    server = createServer(serve).listen(PORT);
    await new Promise((resolve) => server.on("listening", resolve));
    browser = await chromium.launch();
  });

  beforeEach(async () => {
    consoleErrors = [];
    page = await browser.newPage();
    page.on("pageerror", (/** @type {any} */ error) =>
      consoleErrors.push(String(error)),
    );
    await page.goto(`http://localhost:${PORT}/app.html`);
    await page.waitForSelector("noflo-editor", { timeout: 15_000 });
  });

  afterEach(async () => {
    await page.screenshot({ path: "/tmp/noflo-splice-preview.png" });
    if (consoleErrors.length > 0) {
      console.log("console errors during the journey:", consoleErrors);
    }
    await page.close();
  });

  after(async () => {
    await browser?.close();
    server?.close();
  });

  it("hovering an edge highlights it, springs the preview, and the splice is one undo", async () => {
    const editor = page.locator("noflo-editor");
    const box = /** @type {any} */ (await editor.boundingBox());

    // Build the fixture directly through the debug mirror + intents:
    // two nodes and a wire, with the default in/out signatures (the
    // engine registers them on addNode) — the graph-level setup rides
    // the real pipeline so the render is the app's own
    await page.evaluate(() => {
      const editor = document.querySelector("noflo-editor");
      return new Promise((resolveDone) => {
        const send = (command, payload) => {
          editor.dispatchEvent(
            new CustomEvent("debug-intent", {
              detail: { command, payload },
            }),
          );
        };
        // The Glass's own sendIntent is not exported; drive the worker
        // through the same supervisor channel the mapper uses
        send("addNode", {
          graphId: "main",
          nodeId: "A",
          componentName: "core/Repeat",
          metadata: { x: 400, y: 300 },
        });
        send("addNode", {
          graphId: "main",
          nodeId: "B",
          componentName: "core/Repeat",
          metadata: { x: 800, y: 300 },
        });
        setTimeout(resolveDone, 800);
      });
    });

    // The debug-intent path may not exist in the app; fall back to the
    // canvas menu for the two nodes if the mirror stayed empty
    let mirror = await page.evaluate(() => {
      const m = window.__nofloDebug?.mirrorDoc;
      const main = m?.getMap("graphs")?.get("main");
      return main ? Array.from(main.get("nodes").keys()) : [];
    });

    if (mirror.length < 3) {
      // Canvas menu path: Add Node → picker → the create flow is heavy;
      // create three: two endpoints for the wire, one node to drag in
      const spots = [
        { x: 250, dy: -80 },
        { x: 550, dy: -80 },
        { x: 400, dy: 80 },
      ];
      for (let i = 0; i < 3; i++) {
        await page.mouse.click(
          box.x + spots[i].x,
          box.y + box.height / 2 + spots[i].dy,
          { button: "right" },
        );
        const addNode = page
          .locator("noflo-radial-menu")
          .locator("text=Add Node")
          .first();
        await addNode.waitFor({ timeout: 10_000 });
        await addNode.click();
        // The picker: a fresh library has no components — create two
        const create = page
          .locator("noflo-component-picker button.create")
          .first();
        await create.waitFor({ timeout: 10_000 });
        await create.click();
        const nameInput = page
          .locator('noflo-json-form input[type="text"]:visible')
          .first();
        await nameInput.fill(`SpliceNode${i}`);
        await page.locator("noflo-modal").locator("text=Create").first().click();
        await page.waitForTimeout(600);
      }
      mirror = await page.evaluate(() => {
        const m = window.__nofloDebug?.mirrorDoc;
        const main = m?.getMap("graphs")?.get("main");
        return main ? Array.from(main.get("nodes").keys()) : [];
      });
    }
    assert.ok(mirror.length >= 3, `three nodes exist: ${mirror.length}`);

    // Connect A to B through a port drag: drag from A's outport to B's
    // inport via the rendered port elements
    const wire = await page.evaluate(async () => {
      const editor = document.querySelector("noflo-editor");
      const nodes = editor.nodeLayer.querySelectorAll("noflo-node");
      const [a, b] = [nodes[0], nodes[1]];
      const portA =
        /** @type {any} */ (a.shadowRoot.querySelector(".port-out"))
        ?? /** @type {any} */ (a.shadowRoot.querySelectorAll(".port")[0]);
      const portB =
        /** @type {any} */ (b.shadowRoot.querySelector(".port-in"))
        ?? /** @type {any} */ (b.shadowRoot.querySelectorAll(".port")[1]);
      if (!portA || !portB) return null;
      const rectA = portA.getBoundingClientRect();
      const rectB = portB.getBoundingClientRect();
      return {
        ax: rectA.left + rectA.width / 2,
        ay: rectA.top + rectA.height / 2,
        bx: rectB.left + rectB.width / 2,
        by: rectB.top + rectB.height / 2,
      };
    });
    assert.ok(wire, "both nodes render ports");
    // Wire drag: pointerdown on A's outport, move, drop on B's inport
    await page.mouse.move(wire.ax, wire.ay);
    await page.mouse.down();
    await page.mouse.move((wire.ax + wire.bx) / 2, (wire.ay + wire.by) / 2, {
      steps: 5,
    });
    await page.mouse.move(wire.bx, wire.by, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(800);

    const edgeCount = await page.evaluate(() => {
      const editor = document.querySelector("noflo-editor");
      return editor.edgeManager?.edges?.length ?? 0;
    });
    assert.ok(edgeCount >= 1, `the wire exists: ${edgeCount} edges`);

    // The third node drags onto the wire: hover → preview → drop
    const drag = await page.evaluate(() => {
      const editor = document.querySelector("noflo-editor");
      const nodes = editor.nodeLayer.querySelectorAll("noflo-node");
      // The dragee is the THIRD node: the first two are the wire's
      // endpoints, and the splice correctly excludes the dragged node's
      // own edges (the journey's first draft dragged an endpoint and the
      // candidate never appeared)
      const target = nodes[2];
      const rect = target.getBoundingClientRect();
      const edge = editor.edgeManager.edges[0];
      const mid = edge.hitPath.getBoundingClientRect();
      return {
        nx: rect.left + rect.width / 2,
        ny: rect.top + rect.height / 2,
        name: target.getAttribute("name"),
        ex: mid.left + mid.width / 2,
        ey: mid.top + mid.height / 2,
        wasSelected: target.hasAttribute("selected"),
      };
    });
    assert.ok(drag.name, "the dragged node resolves");

    // Drag the node slowly toward the wire's midpoint and HOVER there
    await page.mouse.move(drag.nx, drag.ny);
    await page.mouse.down();
    await page.mouse.move(drag.ex, drag.ey, { steps: 12 });
    await page.waitForTimeout(100);

    // Stage 1: the edge highlights as the splice candidate
    const candidate = await page.evaluate(() => {
      const editor = document.querySelector("noflo-editor");
      const marked = editor.edgeManager.edges.find((/** @type {any} */ e) =>
        e.visualPath.classList.contains("splice-candidate"),
      );
      return marked ? editor.edgeManager.getEdgeId(marked) : null;
    });
    assert.ok(candidate, "the edge highlights as the splice candidate");

    // Stage 2: after the ghost cadence, the node springs to its
    // non-expanded form — a visual-only state, selection stays
    await page.waitForTimeout(400);
    const preview = await page.evaluate(() => {
      const editor = document.querySelector("noflo-editor");
      const node = editor.nodeLayer.querySelectorAll("noflo-node")[2];
      const candidate = editor.edgeManager.edges.some((/** @type {any} */ e) =>
        e.visualPath.classList.contains("splice-candidate"),
      );
      return {
        previewing: node.hasAttribute("data-splice-preview"),
        stillSelected: node.hasAttribute("selected"),
        candidateStillMarked: candidate,
      };
    });
    assert.ok(
      preview.previewing,
      "the node springs to the non-expanded preview",
    );
    assert.ok(preview.stillSelected, "the drag selection persists");

    // Stage 3: the drop splices; ONE undo reverts it all
    await page.mouse.up();
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => {
      const m = window.__nofloDebug?.mirrorDoc;
      const main = m?.getMap("graphs")?.get("main");
      return {
        nodes: Array.from(main.get("nodes").keys()),
        edges: Array.from(main.get("edges").keys()),
      };
    });
    assert.ok(
      after.edges.length >= 2,
      `the splice rewired: ${JSON.stringify(after)}`,
    );

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(800);
    const undone = await page.evaluate(() => {
      const m = window.__nofloDebug?.mirrorDoc;
      const main = m?.getMap("graphs")?.get("main");
      return {
        nodes: Array.from(main.get("nodes").keys()),
        edges: Array.from(main.get("edges").keys()),
      };
    });
    assert.equal(
      undone.edges.length,
      1,
      `one undo reverts the whole splice: ${JSON.stringify(undone)}`,
    );
  });
});
