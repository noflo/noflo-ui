import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-radial-menu.js";

/**
 * @returns {any}
 */
function makeMenu() {
  const el = /** @type {any} */ (document.createElement("noflo-radial-menu"));
  document.body.appendChild(el);
  return el;
}

/**
 * Slides the pointer to a point relative to the menu's origin.
 *
 * @param {any} el
 * @param {number} dx
 * @param {number} dy
 */
function slide(el, dx, dy) {
  el.handleSlide({
    clientX: el._openX + dx,
    clientY: el._openY + dy,
  });
}

describe("the radial menu's press-and-slide announcement (guidelines §10)", () => {
  it("announces the section under the finger as it highlights", () => {
    const el = makeMenu();
    el.open(
      200,
      200,
      [
        { text: "Remove", onClick: () => {} },
        { text: "Add Node", onClick: () => {} },
      ],
      "gear",
    );
    const region = /** @type {HTMLElement} */ (
      el.shadowRoot.querySelector(".sr-only")
    );
    assert.equal(region.getAttribute("role"), "status");
    assert.equal(region.getAttribute("aria-live"), "assertive");

    // Section 3 (Remove/Delete's section) is the 135°-180° quadrant:
    // left and slightly below the origin
    slide(el, -60, 12);
    assert.equal(
      region.textContent,
      "Remove",
      "the highlighted item announces",
    );
    // The same section repeated stays silent (no re-announcement churn)
    slide(el, -70, 14);
    assert.equal(region.textContent, "Remove");

    // A different section announces its own item (section 5 is the
    // steep up-left quadrant, 225°–270°)
    slide(el, -60, -62);
    assert.equal(region.textContent, "Add Node");

    // Back to the finger-free center: the announcement clears
    slide(el, 0, 0);
    assert.equal(
      region.textContent,
      "",
      "nothing highlighted, nothing announced",
    );
    el.remove();
  });

  it("close clears the live region", () => {
    const el = makeMenu();
    el.open(200, 200, [{ text: "Remove", onClick: () => {} }], "gear");
    slide(el, -60, 12);
    const region = /** @type {HTMLElement} */ (
      el.shadowRoot.querySelector(".sr-only")
    );
    assert.equal(region.textContent, "Remove");
    el.close();
    assert.equal(region.textContent, "", "the region clears with the menu");
    el.remove();
  });
});
