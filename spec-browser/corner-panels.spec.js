/**
 * @file The space manager journey (work document #63): a real-browser
 * verification of the corner panels' shared geometry — the side
 * containers span the full vertical space between the corner chips, the
 * open accordions share that space equally (weighted across the side's
 * corners, not per portal), every accordion carries the corners' width,
 * and the bottom accordion's edge sits flush above the bottom corners.
 * The class of layout bug Node/happy-dom specs miss: fixed-position
 * geometry only resolves in a real layout pass.
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

describe("browser smoke: the corner panels' shared geometry (work document #63)", {
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
    page.on("pageerror", (/** @type {any} */ error) =>
      consoleErrors.push(String(error)),
    );
    await page.goto(`http://localhost:${PORT}/app.html`);
  });

  afterEach(async () => {
    await page.screenshot({ path: "/tmp/noflo-corner-panels.png" });
    if (consoleErrors.length > 0) {
      console.log("console errors during the journey:", consoleErrors);
    }
    await page.close();
  });

  after(async () => {
    await browser?.close();
    server?.close();
  });

  it("the side container spans the chips' span and the accordions share it equally", async () => {
    // Two mock corners on the left side: a top corner with two open
    // accordions and a bottom corner with one — the weighting means all
    // three panels end up the same height, a third of the span each
    const geometry = /** @type {any} */ (
      await page.evaluate(async () => {
        const { FlowCornerElement } = await import(
          "/src/elements/corner-element.js"
        );
        class TopCorner extends FlowCornerElement {}
        class BottomCorner extends FlowCornerElement {}
        customElements.define("journey-top-corner", TopCorner);
        customElements.define("journey-bottom-corner", BottomCorner);

        TopCorner.prototype.styles = () => `
          :host { position: fixed; top: 12px; left: 12px; z-index: 900; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        `;
        TopCorner.prototype.chipHtml = () =>
          `<span class="seg"><span class="label">Top</span></span>`;
        TopCorner.prototype.expandedHtml = () => `
          <div class="panel" id="p1"><div class="panel-head">One</div><div class="telemetry-slot" id="slot1"></div></div>
          <div class="panel" id="p2"><div class="panel-head">Two</div></div>`;
        TopCorner.prototype.panelSide = "left";
        TopCorner.prototype.expanded = true;
        BottomCorner.prototype.styles = () => `
          :host { position: fixed; bottom: 12px; left: 12px; z-index: 900; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        `;
        BottomCorner.prototype.chipHtml = () =>
          `<span class="seg"><span class="label">Bottom</span></span>`;
        BottomCorner.prototype.expandedHtml = () =>
          `<div class="panel" id="p3"><div class="panel-head">Three</div></div>`;
        BottomCorner.prototype.panelSide = "left";
        BottomCorner.prototype.expanded = true;

        const top = document.createElement("journey-top-corner");
        const bottom = document.createElement("journey-bottom-corner");
        document.body.append(top, bottom);
        top.render();
        bottom.render();

        // A wires log rides the first panel's slot, as the telemetry
        // accordions mount theirs
        await import("/src/elements/noflo-telemetry-log.js");
        const slot = top.panelShadow.querySelector("#slot1");
        slot?.appendChild(document.createElement("flow-telemetry-log"));

        // Two frames: layout settles after the portals mount
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );

        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
          };
        };
        const container = document.querySelector(".corner-panels-left");
        const panels = [
          ...container.querySelectorAll(".corner-panel-portal"),
        ].flatMap((portal) =>
          [...portal.shadowRoot.children].filter(
            (n) => n.tagName !== "STYLE" && n.classList.contains("panel"),
          ),
        );
        return {
          viewport: { w: innerWidth, h: innerHeight },
          container: box(container),
          chipTop: box(top.shadowRoot.querySelector(".chip")),
          chipBottom: box(bottom.shadowRoot.querySelector(".chip")),
          panels: panels.map(box),
          log: box(top.panelShadow.querySelector("flow-telemetry-log")),
          panelOne: box(portalChild(top, 0)),
          panelTwo: box(portalChild(top, 1)),
        };
        function portalChild(corner, index) {
          const portal = corner._panelPortal;
          const kids = [...portal.shadowRoot.children].filter(
            (n) => n.tagName !== "STYLE",
          );
          return kids[index];
        }
      })
    );

    assert.ok(geometry, "the journey evaluated");
    // The container spans the full space between the chips, with the
    // 6px gutter the corner grammar uses on each end
    assert.equal(
      geometry.container.top,
      geometry.chipTop.bottom + 6,
      "the accordion column starts a gutter below the top chip",
    );
    assert.equal(
      geometry.container.bottom,
      geometry.chipBottom.top - 6,
      "the accordion column ends a gutter above the bottom chip",
    );
    // The width is the corners' width: the same 12px inset edge, the
    // panel column's 360px max
    assert.equal(
      geometry.container.left,
      geometry.chipTop.left,
      "the accordion column shares the corners' edge inset",
    );
    assert.equal(
      geometry.container.width,
      Math.min(360, geometry.viewport.w - 24),
      "the accordion column is the corner panels' width",
    );
    // Three accordions across two corners: every one the same height up
    // to the 6px gutter the grammar puts between stacked accordions —
    // a portal holding k accordions spends (k-1) gutters of its share,
    // so the boxes are equal within one gutter's width
    const heights = geometry.panels.map((/** @type {any} */ p) => p.height);
    for (const height of heights) {
      assert.ok(
        Math.abs(height - heights[0]) < 7,
        `every accordion shares the span equally (${height} vs ${heights[0]})`,
      );
    }
    const bottomPanel = geometry.panels[geometry.panels.length - 1];
    assert.ok(
      Math.abs(bottomPanel.bottom - geometry.container.bottom) < 1,
      "the bottom accordion is bottom-aligned",
    );
    // The wires log fills its accordion's share, not its old 180px cap
    assert.ok(
      geometry.log.height > geometry.panelOne.height * 0.5,
      `the telemetry log fills its accordion (${geometry.log.height} of ${geometry.panelOne.height})`,
    );
  });
});
