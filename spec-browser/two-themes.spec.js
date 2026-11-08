/**
 * @file The two-theme pass (work document #63's remaining item; the
 * guidelines §15 checklist's "verified in a real browser in both themes"):
 * the #63 corner chain — the sync panel's wires accordions, the Project
 * corner's rngit log, the Runtime corner's FBP stream, and the Context
 * chip's explorer — rendered in both cyberpunk and tube, screenshotted for
 * review, with the semantic-variable proof that the two themes really are
 * two designs (the accent value must differ), not one recolored.
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

const RUNTIME_HASH = "c".repeat(32);

describe("browser smoke: the corner chain in both themes (work document #63)", {
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
    if (consoleErrors.length > 0) {
      console.log("console errors during the journey:", consoleErrors);
    }
    await page.close();
  });

  after(async () => {
    await browser?.close();
    server?.close();
  });

  for (const theme of ["cyberpunk", "tube"]) {
    it(`renders the corner chain in the ${theme} theme`, async () => {
      const result = /** @type {any} */ (
        await page.evaluate(
          async (/** @type {string} */ themeName) => {
            document.body.setAttribute("data-theme", themeName);
            const { telemetryBus } = await import(
              "/src/glass/telemetryBus.js"
            );
            const bus = telemetryBus();

            // The Yjs wires stream's history (the sync panel's accordion
            // hydrates from the ring on open)
            bus.publish("yjs", {
              message: "update · 1.2 KB",
              status: "DELTA",
              tone: "ok",
            });
            bus.publish("reticulum", {
              message: 'announce heard · runtime "workshop"',
              status: "ANNOUNCE",
              tone: "ok",
            });
            bus.publish("rngit", {
              message: 'pushed "Design notes" → board #4',
              status: "FETCHED",
              tone: "ok",
            });
            bus.publish(`fbp:${"c".repeat(32)}`, {
              message: "→ 0x40 RUN_CTRL",
              status: "TX",
              tone: "ok",
            });

            // The sync panel: the wires accordions open beside the
            // functional panel
            const syncPanel = /** @type {any} */ (
              document.querySelector("noflo-sync-panel")
            );
            syncPanel.setVisible(true);
            for (const id of ["yjs", "reticulum", "diagnostics"]) {
              syncPanel.toggleSegment(id);
            }

            // The Project corner: documents, schemas, collaborators, and
            // the rngit log open
            const project = /** @type {any} */ (
              document.querySelector("noflo-project-corner")
            );
            project.setWorkDocs([
              { id: "a".repeat(32), title: "Design notes", scope: "active" },
              {
                id: "b".repeat(32),
                title: "The second document",
                scope: "proposed",
              },
            ]);
            project.setSchemas?.([
              { name: "ui/point", provenance: "authored" },
            ]);
            project.setCollaborators?.([
              { identityHash: "1".repeat(32), name: "peer", presence: "online" },
              {
                identityHash: "2".repeat(32),
                presence: "offline",
              },
            ]);
            project.toggleSegment("rngit");

            // The Runtime corner: a connected runtime and its FBP stream
            const runtime = /** @type {any} */ (
              document.querySelector("noflo-runtime-corner")
            );
            runtime.setVisible(true);
            runtime.setRuntimes(
              [
                {
                  destinationHash: "c".repeat(32),
                  nodeName: "workshop-runtime",
                  protocolVersion: 2,
                  lastSeen: Date.now(),
                },
              ],
              new Map([
                [
                  "c".repeat(32),
                  {
                    state: "connected",
                    nodeName: "workshop-runtime",
                    capabilityMask: 0b11,
                    capabilities: ["graph.read", "graph.edit"],
                    protocolVersion: 2,
                  },
                ],
              ]),
            );
            runtime.toggleSegment(`fbp:${"c".repeat(32)}`);

            // The Context chip's navigation tree
            const chip = /** @type {any} */ (
              document.querySelector("noflo-context-chip")
            );
            chip.setContents({
              projectName: "Theme journey",
              graphs: [{ name: "main", parent: "" }],
              components: ["core/Repeat"],
              schemas: ["ui/point"],
              specs: [],
              workDocs: [{ id: "a".repeat(32), title: "Design notes" }],
              guides: [
                { id: "writing-components", title: "Writing NoFlo components" },
              ],
            });
            chip.toggleSegment("explorer");

            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );

            // The panels render into the side containers' portals —
            // their shadow roots, so the queries pierce per portal
            const portals = [
              ...document.querySelectorAll(".corner-panel-portal"),
            ];
            const openWires = portals.flatMap((/** @type {any} */ portal) =>
              portal.shadowRoot
                ? [...portal.shadowRoot.querySelectorAll(".panel.telemetry")]
                : [],
            );
            const logs = portals.flatMap((/** @type {any} */ portal) =>
              portal.shadowRoot
                ? [
                    ...portal.shadowRoot.querySelectorAll(
                      ".telemetry-slot flow-telemetry-log",
                    ),
                  ]
                : [],
            );
            const logText = logs
              .map((/** @type {any} */ log) => log.shadowRoot.textContent)
              .join("\n");
            const accent = getComputedStyle(document.body)
              .getPropertyValue("--ui-accent")
              .trim();
            return {
              openWires: openWires.length,
              logCount: logs.length,
              logText,
              explorer: Boolean(
                chip._panelPortal?.shadowRoot?.querySelector(".explorer"),
              ),
              accent,
            };
          },
          theme,
        )
      );
      assert.ok(
        result.openWires >= 4,
        `the wires accordions open (${result.openWires})`,
      );
      assert.ok(result.logCount >= 4, "the wires logs render");
      assert.match(result.logText, /board #4/, "the rngit log hydrated");
      assert.match(result.logText, /0x40 RUN_CTRL/, "the FBP stream hydrated");
      assert.ok(result.explorer, "the navigation tree renders");
      if (theme === "cyberpunk") {
        assert.equal(result.accent, "rgb(0, 229, 255)");
      } else {
        assert.equal(result.accent, "rgb(0, 0, 0)", "tube is the dark-on-light design");
      }
      await page.screenshot({ path: `/tmp/noflo-two-themes-${theme}.png` });
      assert.deepEqual(consoleErrors, [], "no page errors in either theme");
    });
  }

  it("the two themes really are two designs", async () => {
    const accents = /** @type {any} */ (
      await page.evaluate(async () => {
        const read = () =>
          getComputedStyle(document.body)
            .getPropertyValue("--ui-accent")
            .trim();
        document.body.setAttribute("data-theme", "cyberpunk");
        const cyberpunk = read();
        document.body.setAttribute("data-theme", "tube");
        const tube = read();
        return { cyberpunk, tube };
      })
    );

    assert.notEqual(accents.cyberpunk, accents.tube);
  });
});
