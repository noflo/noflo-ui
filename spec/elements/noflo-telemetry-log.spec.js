import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-telemetry-log.js";

/**
 * The wires log (work document #63): the terminal grammar's read-only
 * rendering — the pseudo-console three-column grid, the circular buffer
 * with a hard DOM maximum enforced in JS, and a history-replacing
 * hydration for the subscription-on-open contract.
 */

/**
 * @returns {any}
 */
function makeLog() {
  const el = document.createElement("flow-telemetry-log");
  document.body.appendChild(el);
  return el;
}

/** Lets a scheduled paint run (rAF in browsers, a timeout fallback here). */
async function flushPaint() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

/**
 * A synthetic entry.
 *
 * @param {string} message
 * @param {{ status?: string, tone?: "ok" | "fail" | "" }} [options]
 * @returns {{ seq: number, time: number, message: string, status?: string, tone?: string }}
 */
function entry(message, options = {}) {
  return {
    seq: 1,
    time: new Date(2026, 0, 1, 12, 34, 56).getTime(),
    message,
    ...(options.status === undefined ? {} : { status: options.status }),
    ...(options.tone === undefined ? {} : { tone: options.tone }),
  };
}

describe("wires log (work document #63)", () => {
  it("renders the pseudo-console columns", async () => {
    const el = makeLog();
    el.push(entry("update · 1.2 KB", { status: "DELTA" }));
    await flushPaint();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const line = shadow.querySelector(".line");
    assert.ok(line, "the entry renders as a line");
    assert.match(line.textContent ?? "", /update · 1\.2 KB/);
    assert.match(line.textContent ?? "", /\[ DELTA \]/);
    assert.match(line.textContent ?? "", /12:34:56/);
    el.remove();
  });

  it("caps the DOM: the buffer drops the oldest past the maximum", async () => {
    const el = makeLog();
    for (let i = 0; i < 260; i++) {
      el.push(entry(`line ${i}`));
    }
    await flushPaint();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const lines = shadow.querySelectorAll(".line");
    assert.ok(lines.length <= 200, `DOM capped (got ${lines.length})`);
    assert.match(
      /** @type {HTMLElement} */ (lines[lines.length - 1]).textContent ?? "",
      /line 259/,
      "the newest entry survives",
    );
    el.remove();
  });

  it("hydration replaces the buffer — subscription-on-open history", async () => {
    const el = makeLog();
    el.push(entry("stale line"));
    el.setHistory([entry("history one"), entry("history two")]);
    await flushPaint();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const text = shadow.textContent ?? "";
    assert.match(text, /history one/);
    assert.match(text, /history two/);
    assert.doesNotMatch(text, /stale line/);
    el.remove();
  });

  it("statuses carry their semantic tone", async () => {
    const el = makeLog();
    el.push(entry("sync done", { status: "SYNC", tone: "ok" }));
    el.push(entry("op rejected", { status: "REJECTED", tone: "fail" }));
    await flushPaint();
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector(".status.ok"), "the ok tone renders");
    assert.ok(shadow.querySelector(".status.fail"), "the fail tone renders");
    el.remove();
  });
});
