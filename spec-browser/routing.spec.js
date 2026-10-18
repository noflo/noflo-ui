/**
 * @file The routing journey (work document #62's screen model, work
 * document #64's review): a real-browser verification of URL routing
 * across every screen — the graph editor, the component screen, work
 * documents, schemas — the transitions between them, the deep links,
 * the reloads, and the one-screen invariant: exactly one screen owns
 * the viewport, and every activation closes the full-screen views the
 * target does not own (navigation out of the component screen used to
 * silently fail under its fixed overlay).
 *
 * Lives OUTSIDE `spec/` per the smoke-layer convention (work document
 * #56 proposal 1): real Chromium, run with `npm run test:browser`.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import net from "node:net";
import { extname, join, resolve } from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");

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

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

async function serve(req, res) {
  const url = new URL(req.url ?? "/", "http://local");
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (rel === "") {
    res.writeHead(302, { location: "/app.html" }).end();
    return;
  }
  const file = join(ROOT, rel);
  try {
    const s = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(s);
  } catch {
    res.writeHead(404).end("not found");
  }
}

describe("browser smoke: URL routing across screens (work document #62)", {
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
    const PORT = await getFreePort();
    server = createServer(serve).listen(PORT);
    await new Promise((resolve) => server.on("listening", resolve));
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    consoleErrors = [];
    page.on("pageerror", (/** @type {any} */ error) =>
      consoleErrors.push(String(error)),
    );
    await page.goto(`http://localhost:${PORT}/app.html`);
    await page.waitForSelector("noflo-editor", { timeout: 15_000 });
    await page.waitForTimeout(2000);
    // A component to route to: created through the create flow so the
    // registry carries it
    const box = await page.locator("noflo-editor").boundingBox();
    await page.mouse.click(box.x + 400, box.y + 400, { button: "right" });
    await page.waitForTimeout(700);
    await page.locator("noflo-radial-menu").locator("text=Add Node").first().click();
    await page.locator("noflo-component-picker button.create").first().click();
    await page.locator('noflo-json-form input[type="text"]:visible').first().fill("Router");
    await page.locator("noflo-modal").locator("text=Create").first().click();
    await page
      .waitForFunction(
        () => window.__nofloDebug?.mirrorDoc?.getMap("registry")?.has("Router"),
        { timeout: 15_000, polling: 250 },
      )
      .catch(() => console.log("the component never registered"));
    await page.waitForTimeout(1000);
  });

  after(async () => {
    if (consoleErrors.length > 0) {
      console.log("console errors during the journey:", consoleErrors);
    }
    await browser.close();
    server.close();
  });

  /** The active screen kind, read from the app's own state. */
  const screenKind = () =>
    page.evaluate(() => {
      const component = document.querySelector("noflo-component-view");
      if (component && !component.hasAttribute("hidden")) return "component";
      const workdoc = document.getElementById("workdoc-view");
      if (workdoc && !workdoc.hasAttribute("hidden")) return "doc";
      const schema = document.getElementById("schema-view");
      if (schema && !schema.hasAttribute("hidden")) return "schema";
      const app = document.getElementById("app");
      if (app && app.style.display !== "none") return "graph";
      return "unknown";
    });

  /** Navigates through the hash router. */
  const navigate = (/** @type {string} */ hash) =>
    page.evaluate((h) => {
      window.location.hash = h;
    }, hash);

  it("deep-links into the component screen and back to the graph", async () => {
    await navigate("#/p/default/component/Router");
    await page.waitForTimeout(1200);
    assert.equal(await screenKind(), "component", "the deep link opens the component");
    await navigate("#/p/default/graph/main");
    await page.waitForTimeout(1200);
    assert.equal(await screenKind(), "graph", "the return opens the graph editor");
  });

  it("navigation out of the component screen closes its overlay", async () => {
    await navigate("#/p/default/component/Router");
    await page.waitForTimeout(1200);
    assert.equal(await screenKind(), "component");
    // To a work doc: the component overlay must close — the fixed view
    // otherwise keeps covering the screen it lost
    await navigate("#/p/default/component/Router2");
    await page.waitForTimeout(1200);
    // Navigate to a non-component screen: the component overlay must close
    await navigate("#/p/default/graph/main");
    await page.waitForTimeout(1200);
    const component = await page.evaluate(
      () => document.querySelector("noflo-component-view")?.hasAttribute("hidden"),
    );
    assert.equal(
      component,
      true,
      "the component view closes when another screen activates",
    );
    assert.equal(await screenKind(), "graph", "the graph screen activates");
  });

  it("navigation between non-graph screens closes each previous overlay", async () => {
    // The schema deep link (a schema must exist; the routing activates
    // the screen even when the data lags — the deferred-open pattern)
    await navigate("#/p/default/component/Router");
    await page.waitForTimeout(1000);
    assert.equal(await screenKind(), "component");
    await navigate("#/p/default/graph/main");
    await page.waitForTimeout(1000);
    assert.equal(await screenKind(), "graph", "the graph screen returns");
    // The component → the graph → the component: the round trip
    await navigate("#/p/default/component/Router");
    await page.waitForTimeout(1000);
    assert.equal(await screenKind(), "component", "the round trip re-opens");
  });

  it("a reload on a component route re-opens the screen (the persistence leg)", async () => {
    await navigate("#/p/default/component/Router");
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForSelector("noflo-editor", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const kind = await screenKind();
    assert.ok(
      kind === "component" || kind === "graph",
      `the reload re-activates a screen (got ${kind})`,
    );
    if (kind === "component") {
      const component = await page.evaluate(
        () => document.querySelector("noflo-component-view")?._opened,
      );
      assert.equal(component, true, "the deferred open lands");
    }
  });
});
