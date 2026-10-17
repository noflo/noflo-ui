/**
 * @file The space manager journey (work document #63): a real-browser
 * verification of the corner panels' shared geometry — the side
 * containers span the full vertical space between the corner chips, the
 * open accordions share that space equally (weighted across the side's
 * corners, not per portal), every accordion carries the corner boxes'
 * width, and the bottom accordion's edge sits flush above the bottom
 * corners. The class of layout bug Node/happy-dom specs miss:
 * fixed-position geometry only resolves in a real layout pass.
 *
 * The journey mounts two mock corners beside the real app's own so the
 * measured geometry has to reconcile corners it did not create: the
 * container's edges and width are computed from the live chips.
 *
 * Lives OUTSIDE `spec/` per the smoke-layer convention (work document #56
 * proposal 1): real Chromium, run with `npm run test:browser`.
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import net from "node:net";
import { extname, join, resolve } from "node:path";
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
    await page.waitForSelector("noflo-editor", { timeout: 15_000 });
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
    // Two mock corners on the left side: a top corner with a taller chip
    // (as the context chip's buttons make it) and two open accordions,
    // and a bottom corner with one — the weighting means all three
    // panels end up the same height, a third of the span each
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
          .chip { min-height: 58px; }
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
        // Every chip on the left side — the real app's own plus the
        // mocks — contributes to the column's expected geometry
        const chipRects = [];
        for (const tag of [
          "noflo-context-chip",
          "noflo-project-corner",
          "journey-top-corner",
          "journey-bottom-corner",
        ]) {
          const chip = document
            .querySelector(tag)
            ?.shadowRoot?.querySelector(".chip");
          if (!chip) continue;
          const r = chip.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          chipRects.push(r);
        }
        const height = innerHeight;
        const topChips = chipRects.filter(
          (r) => r.top + r.height / 2 < height / 2,
        );
        const bottomChips = chipRects.filter(
          (r) => r.top + r.height / 2 >= height / 2,
        );
        const expectedTopInset = Math.max(
          62,
          ...topChips.map((r) => r.bottom + 6),
        );
        const expectedBottomInset = Math.max(
          62,
          ...bottomChips.map((r) => height - r.top + 6),
        );
        const expectedWidth = Math.max(260, ...chipRects.map((r) => r.width));

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
          expectedTopInset,
          expectedBottomInset,
          expectedWidth,
          panels: panels.map(box),
          log: box(top.panelShadow.querySelector("flow-telemetry-log")),
          panelOne: box(portalChild(top, 0)),
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
    const near = (a, b) => Math.abs(a - b) < 1;
    // The container spans the full space between the chips, with the
    // 6px gutter the corner grammar uses on each end — measured from
    // the live chips, so a taller top chip pushes the column down
    assert.ok(
      near(geometry.container.top, geometry.expectedTopInset),
      `the accordion column starts a gutter below the topmost chip (${geometry.container.top} vs ${geometry.expectedTopInset})`,
    );
    assert.ok(
      near(
        geometry.container.bottom,
        geometry.viewport.h - geometry.expectedBottomInset,
      ),
      `the accordion column ends a gutter above the bottommost chip (${geometry.container.bottom} vs ${geometry.viewport.h - geometry.expectedBottomInset})`,
    );
    // The width is the corner boxes' width: the same 12px inset edge,
    // and the column matches the widest chip on the side (floored at
    // the panels' 260px readability minimum)
    assert.ok(
      near(geometry.container.left, 12),
      "the accordion column shares the corners' edge inset",
    );
    assert.ok(
      near(geometry.container.width, geometry.expectedWidth),
      `the accordion column is as wide as the corner boxes (${geometry.container.width} vs ${geometry.expectedWidth})`,
    );
    for (const panel of geometry.panels) {
      assert.ok(
        near(panel.width, geometry.container.width),
        "every accordion shares the corner boxes' width",
      );
    }
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
      near(bottomPanel.bottom, geometry.container.bottom),
      "the bottom accordion is bottom-aligned",
    );
    // The wires log fills its accordion's share, not its old 180px cap
    assert.ok(
      geometry.log.height > geometry.panelOne.height * 0.5,
      `the telemetry log fills its accordion (${geometry.log.height} of ${geometry.panelOne.height})`,
    );
  });

  it("on a phone the chips go minimal and the column keeps a usable width", async () => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(300);
    const small = /** @type {any} */ (
      await page.evaluate(async () => {
        const { FlowCornerElement } = await import(
          "/src/elements/corner-element.js"
        );
        class PhoneCorner extends FlowCornerElement {}
        customElements.define("journey-phone-corner", PhoneCorner);
        PhoneCorner.prototype.styles = () => `
          :host { position: fixed; top: 12px; left: 12px; z-index: 900; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        `;
        PhoneCorner.prototype.chipHtml = () =>
          `<span class="seg"><span class="label">Phone</span><span class="count">3</span></span>`;
        PhoneCorner.prototype.expandedHtml = () =>
          `<div class="panel" id="pp"><div class="panel-head">Phone panel</div></div>`;
        PhoneCorner.prototype.panelSide = "left";
        PhoneCorner.prototype.expanded = true;
        const corner = document.createElement("journey-phone-corner");
        document.body.append(corner);
        corner.render();
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const context = document
          .querySelector("noflo-context-chip")
          ?.shadowRoot?.querySelector(".chip");
        const box = (el) => {
          const r = el.getBoundingClientRect();
          return {
            top: r.top,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        };
        const container = document.querySelector(".corner-panels-left");
        const panel = container
          ? [...container.querySelectorAll(".corner-panel-portal")]
              .flatMap((portal) =>
                [...portal.shadowRoot.children].filter(
                  (n) => n.tagName !== "STYLE" && n.classList.contains("panel"),
                ),
              )
              .map((n) => box(n))
          : [];
        return {
          viewport: { w: innerWidth, h: innerHeight },
          contextMicro: document
            .querySelector("noflo-context-chip")
            ?.hasAttribute("data-micro"),
          contextMinified: document
            .querySelector("noflo-context-chip")
            ?.hasAttribute("data-minified"),
          chipWidths: [box(context), box(corner.shadowRoot.querySelector(".chip"))],
          container: box(container),
          panels: panel,
        };
      })
    );
    assert.ok(small, "the phone journey evaluated");
    // The ladder: the compact band minifies, 360px is the micro rung
    assert.ok(
      small.contextMinified,
      "the phone viewport minifies the chips",
    );
    assert.ok(
      small.contextMicro,
      "at 360px the chips read icon only",
    );
    // The icon-only chips are narrow; the column keeps the panels'
    // readability floor instead of collapsing with them
    const chipWidth = Math.max(
      ...small.chipWidths.map((/** @type {any} */ c) => c.width),
    );
    assert.equal(
      small.container.width,
      Math.max(260, chipWidth),
      "the column holds the readability floor under minimal chips",
    );
    assert.ok(
      small.panels.every((/** @type {any} */ p) => p.width === small.container.width),
      "the accordions still share the column's width",
    );
  });
});
