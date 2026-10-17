/**
 * @file The app diagnostics journey (work document #63's app diagnostics
 * tenant): a real-browser verification of the Glass error boundary end to
 * end — an uncaught error and an unhandled rejection become legible
 * entries on the diagnostics wires accordion, the sync panel becomes
 * reachable even where the mesh is unused (no silent failures), the chip
 * badges the unacknowledged crash, and the log survives a reload because
 * the store persists it. The class of breakage Node specs miss: window
 * error events, IndexedDB persistence, and the live DOM's attention path
 * are browser-only.
 *
 * Lives OUTSIDE `spec/` per the smoke-layer convention (work document #56
 * proposal 1): real Chromium, run with `npm run test:browser`.
 */

import assert from "node:assert/strict";
import net from "node:net";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");

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
};

/** The bridge's static logic: ETag revalidation, no-cache semantics. */
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

describe("browser smoke: the app diagnostics journey (work document #63)", {
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
    page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    // The journey itself throws into the page: pageerrors are the fixture,
    // not a failure signal
    page.on("pageerror", (/** @type {any} */ error) =>
      consoleErrors.push(String(error)),
    );
    await page.goto(`http://localhost:${PORT}/app.html`);
    await page.waitForSelector("noflo-sync-panel", { timeout: 15_000, state: "attached" });
  });

  afterEach(async () => {
    await page.screenshot({ path: "/tmp/noflo-diagnostics.png" });
    await page.close();
  });

  after(async () => {
    await browser?.close();
    server?.close();
  });

  it("a crash badges the chip, the accordion renders it, and the log survives a reload", async () => {
    // The sync panel is hidden where the mesh is unused; a diagnostics
    // entry makes it reachable (no silent failures)
    const before = /** @type {any} */ (
      await page.evaluate(() => ({
        visible: !document.querySelector("noflo-sync-panel").hasAttribute("hidden"),
      }))
    );
    // Two failures: an uncaught error and an unhandled rejection
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("journey crash: the renderer lied");
      }, 0);
      Promise.reject(new Error("journey rejection: the promise vanished"));
    });
    await page.waitForTimeout(500);

    const after = /** @type {any} */ (
      await page.evaluate(() => {
        const panel = document.querySelector("noflo-sync-panel");
        const chip = panel.shadowRoot.querySelector(".chip");
        const segment = chip.querySelector('[data-segment-toggle="diagnostics"]');
        return {
          visible: !panel.hasAttribute("hidden"),
          hasSegment: Boolean(segment),
          attention: segment?.classList.contains("attention") ?? false,
          throb: segment?.classList.contains("throb") ?? false,
        };
      })
    );
    if (!before.visible) {
      assert.ok(after.visible, "the diagnostics entry makes the panel reachable");
    }
    assert.ok(after.hasSegment, "the chip carries the diagnostics segment");
    assert.ok(
      after.attention && after.throb,
      "the unacknowledged crash demands attention",
    );

    // Opening the accordion acknowledges the crash and renders the log
    await page.evaluate(() => {
      const panel = document.querySelector("noflo-sync-panel");
      panel.shadowRoot
        .querySelector('[data-segment-toggle="diagnostics"]')
        .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    });
    await page.waitForTimeout(400);
    const opened = /** @type {any} */ (
      await page.evaluate(() => {
        const panel = document.querySelector("noflo-sync-panel");
        const portal = panel._panelPortal?.shadowRoot;
        const slot = portal?.querySelector("#panel-telemetry-diagnostics");
        const log = slot?.querySelector("flow-telemetry-log");
        const segment = panel.shadowRoot.querySelector(
          '[data-segment-toggle="diagnostics"]',
        );
        return {
          open: panel._telemetry.diagnostics.open,
          attentionCleared: !segment.classList.contains("attention"),
          text: log?.shadowRoot?.textContent ?? "",
        };
      })
    );
    assert.ok(opened.open, "the segment opened its accordion");
    assert.ok(opened.attentionCleared, "viewing acknowledges the crash");
    assert.match(opened.text, /journey crash: the renderer lied/);
    assert.match(opened.text, /CRASH/);
    assert.match(opened.text, /journey rejection: the promise vanished/);
    assert.match(opened.text, /REJECT/);

    // The store persists: after a reload the log still renders
    await page.reload();
    await page.waitForSelector("noflo-sync-panel", { timeout: 15_000, state: "attached" });
    await page.waitForTimeout(600);
    const reloaded = /** @type {any} */ (
      await page.evaluate(async () => {
        const panel = document.querySelector("noflo-sync-panel");
        // The panel is reachable without the mesh because the store holds
        // the previous session's entries
        const visible = !panel.hasAttribute("hidden");
        panel.shadowRoot
          .querySelector('[data-segment-toggle="diagnostics"]')
          .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
        // The persisted stream hydrates from the store asynchronously
        await new Promise((resolve) => setTimeout(resolve, 400));
        const portal = panel._panelPortal?.shadowRoot;
        const slot = portal?.querySelector("#panel-telemetry-diagnostics");
        const log = slot?.querySelector("flow-telemetry-log");
        return {
          visible,
          text: log?.shadowRoot?.textContent ?? "",
        };
      })
    );
    assert.ok(reloaded.visible, "the persisted entries keep the panel reachable");
    assert.match(
      reloaded.text,
      /journey crash: the renderer lied/,
      "the crash report survived the reload — persisted, not just in memory",
    );
  });
});
