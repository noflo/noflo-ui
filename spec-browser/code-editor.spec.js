/**
 * @file The real-browser smoke layer (work document #56 proposal 1): a
 * Playwright journey that loads the real app shell in Chromium and drives
 * the code editor end to end — the class of browser-only breakage that
 * Node/happy-dom specs miss (import maps, element upgrade order, module
 * caches). The journey follows the app's own #29 flow: sketch (place a
 * node via create), specify (signature editor), implement (code editor),
 * then asserts the collaboration relay arms without errors.
 *
 * The app is served over the repo root by the same static logic the
 * Companion uses (import maps and the worker resolve relative to it).
 *
 * Lives OUTSIDE `spec/` so the unit-test glob stays browser-free: the
 * journey spins up a real Chromium and must not race the parallel unit
 * suite for resources. Run it with `npm run test:browser`.
 */

import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
import net from "node:net";

/** Resolves a free localhost port (the suite runs parallel to other
 * spec files; a fixed port would collide under the full test run). */
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

let PORT = 3899;

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

/** The bridge's static logic: ETag revalidation, no-cache semantics. */
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
    console.log(`[server] 404: ${req.url}`);
    res.writeHead(404).end("not found");
  }
}

describe("browser smoke: the code editor journey (work document #56)", {
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
    page.on("console", (/** @type {any} */ message) => {
      // warn joins errors: the theme/diagnostic signals surface as warns
      if (message.type() === "error" || message.type() === "warning") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (/** @type {any} */ error) =>
      consoleErrors.push(String(error)),
    );
    // Worker diagnostics: the engine worker's console and errors do not
    // surface through the page's handlers (work document #56)
    page.on("worker", (/** @type {any} */ worker) => {
      console.log(`[smoke] worker appeared: ${worker.url?.() ?? worker.url}`);
      worker.on("console", (/** @type {any} */ message) => {
        const text = message.text();
        if (/Mesh start|gates|Requesting|addnode|echo|progress/i.test(text)) {
          console.log(`[worker ${worker.url?.().slice(-12)}] ${text.slice(0, 140)}`);
        }
        if (["error", "warning"].includes(message.type())) {
          consoleErrors.push(`[worker] ${text}`);
        }
      });
      worker.on("pageerror", (/** @type {any} */ error) =>
        consoleErrors.push(`[worker error] ${String(error)}`),
      );
    });
    await page.goto(`http://localhost:${PORT}/app.html`);
    await page.waitForSelector("noflo-editor", { timeout: 15_000 });
  });

  afterEach(async () => {
    // Always capture: the journey's evidence is the page state, not just
    // the assertion (work document #56's failure artifacts)
    await page.screenshot({ path: "/tmp/noflo-smoke-last.png" });
    if (consoleErrors.length > 0) {
      console.log("console errors during the journey:", consoleErrors);
    }
    await page.close();
  });

  after(async () => {
    await browser?.close();
    server?.close();
  });

  it("the shell boots: declared elements upgrade and the vendor surface is complete", async () => {
    const upgraded = await page.evaluate(async () => {
      const editor = document.querySelector("noflo-editor");
      if (!editor || !customElements.get("noflo-editor")) {
        return "noflo-editor not upgraded";
      }
      // The vendor CodeMirror surface: the collaborative editor's module
      // graph (the stale-cache trap that bit the code editor three times)
      const cm = await import("./vendor/codemirror.js");
      const missing = [
        "EditorView",
        "yCollab",
        "ySyncFacet",
        "HighlightStyle",
      ].filter((name) => cm[name] === undefined);
      return missing.length > 0
        ? `vendor missing: ${missing.join(", ")}`
        : null;
    });
    assert.equal(
      upgraded,
      null,
      "the shell and vendor surface must be complete",
    );
  });

  it("create → specify → implement in code, and the relay arms", async () => {
    const editor = page.locator("noflo-editor");
    const box = /** @type {any} */ (await editor.boundingBox());

    // Sketch: right-click the canvas → Add Node → the picker. A fresh
    // project's library is empty, so the create path IS the journey
    // (work document #29: create → specify → implement)
    let created = false;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
        button: "right",
      });
      const addNode = page
        .locator("noflo-radial-menu")
        .locator("text=Add Node")
        .first();
      await addNode.waitFor({ timeout: 10_000 });
      await addNode.click();
      const create = page
        .locator("noflo-component-picker button.create")
        .first();
      try {
        await create.waitFor({ timeout: 3000 });
      } catch {
        await page.keyboard.press("Escape");
        continue;
      }
      await create.click();
      created = true;
    }
    assert.ok(created, "the create-new-component path opened");

    // Specify: the create dialog names the component; Create places the node
    const nameInput = page
      .locator('noflo-json-form input[type="text"]:visible')
      .first();
    await nameInput.waitFor({ timeout: 10_000 });
    await nameInput.fill("SmokeComponent");
    // The form's model must reflect the fill: jedison's hidden input
    // carries the serialized form data
    const formData = await page.evaluate(() => {
      const hidden = document.querySelector('noflo-json-form input[name="json"]');
      return hidden ? JSON.parse(hidden.value).name : null;
    });
    console.log("form data name after fill:", JSON.stringify(formData));
    await page.locator("noflo-modal").locator("text=Create").first().click();

    // Implement: select the node, open its radial menu, implement in code.
    // The intent must reach the engine: the Glass's mirror doc (read
    // through the debug handle) is the authoritative echo channel.
    await page.waitForTimeout(1500);
    const applied = await page.evaluate(() => {
      const mirror = window.__nofloDebug?.mirrorDoc;
      const main = mirror?.getMap("graphs")?.get("main");
      return {
        graphs: mirror ? Array.from(mirror.getMap("graphs").keys()) : null,
        mainKeys: main ? Array.from(main.keys()) : null,
      };
    });
    console.log("after create, mirror state:", JSON.stringify(applied));
    if (!applied.mainKeys?.includes("SmokeComponent")) {
      // Probe the worker directly: spawn a fresh engine worker inside the
      // page and capture its load/boot error — the supervisor does not
      // wire onerror, so a worker that fails to boot dies silently
      // (work document #56: the failure the smoke layer surfaces)
      const bootProbe = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const worker = new Worker("/src/worker/engine.js", {
              type: "module",
            });
            const finish = (result) => resolve(result);
            // The module graph's real failure: import the same entry from
            // the page context — the boot guard skips startEngine here,
            // but any unresolved specifier or broken module surfaces with
            // a real stack
            // Walk the graph: which import 404s? The server logs 404s —
            // intercept and collect them instead
            window.__failedImports = [];
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
              const response = await originalFetch(...args);
              if (response.status === 404) {
                window.__failedImports.push(String(args[0]));
              }
              return response;
            };
            import("/src/worker/engine.js").catch((error) =>
              finish({ importError: String(error?.stack ?? error).slice(0, 600) }),
            );
            worker.onerror = (/** @type {any} */ event) =>
              finish({ error: event.message ?? event.type });
            worker.onmessage = (/** @type {any} */ event) =>
              finish({ firstMessage: event.data?.kind ?? event.data?.type ?? "message" });
            setTimeout(() => finish({ timeout: "no error, no message in 8s" }), 8000);
          }),
      );
      console.log(
        "MIRROR STATE MISSING the created node — worker boot probe:",
        JSON.stringify(bootProbe),
      );
    }
    const node = page.locator("noflo-node").first();
    await node.waitFor({ timeout: 10_000 });
    await node.click({ button: "right" });
    const editItem = page
      .locator("noflo-radial-menu")
      .locator("text=Edit")
      .first();
    await editItem.waitFor({ timeout: 5000 });
    await editItem.click();
    const implement = page
      .locator("noflo-modal")
      .locator("text=Implement in code")
      .first();
    await implement.waitFor({ timeout: 10_000 });
    await implement.click();

    // The code editor opens: the conf resolves, the relay arms, typing
    // works without a crash (the browser-only breakage class)
    await page.waitForFunction(
      () => {
        const editor = document.querySelector("noflo-code-editor");
        return Boolean(editor?.hasAttribute("open"));
      },
      { timeout: 5000 },
    );
    await page.keyboard.type("// smoke");

    // No diagnostic signals: the surface must be complete and the relay
    // armed (a stale bundle or missing surface member shows here)
    const relayErrors = consoleErrors.filter((text) =>
      /facet|ySyncFacet|highlight API|reading 'id'/.test(text),
    );
    assert.deepEqual(
      relayErrors,
      [],
      "the code editor's module graph and surface must be intact",
    );

    // Persistence end to end (the bug this journey exists for: the relay
    // looked armed while edits silently never reached the engine):
    // reload the page — the edit must come back from the engine's doc
    await page.reload();
    await page.waitForSelector("noflo-editor", { timeout: 15_000 });
    // Re-open the same component's editor through the real flow
    const nodeAfterReload = page.locator("noflo-node").first();
    await nodeAfterReload.waitFor({ timeout: 10_000 });
    await nodeAfterReload.click({ button: "right" });
    await page
      .locator("noflo-radial-menu")
      .locator("text=Edit")
      .first()
      .click();
    // A code-implemented component opens its code editor DIRECTLY (the
    // edit-attempt routes by implementation kind — the modal's
    // "Open implementation" is the signature-editor path)
    await page.waitForFunction(
      () => Boolean(document.querySelector("noflo-code-editor")?.hasAttribute("open")),
      { timeout: 10_000 },
    );
    // The typed comment survives: the engine applied the update
    const editorText = await page.evaluate(() => {
      const editor = document.querySelector("noflo-code-editor");
      return editor?._view?.state?.doc?.toString() ?? "";
    });
    assert.match(
      editorText,
      /\/\/ smoke/,
      "the edit persisted over reload — the relay reached the engine",
    );
  });
});
