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

describe("the radial menu's submenu split (guidelines §10)", () => {
  /** Eleven unmapped items: the free sections hold ten, one overflows. */
  function makeOverflowMenu() {
    const el = makeMenu();
    const clicks = [];
    const items = Array.from({ length: 11 }, (_, i) => ({
      text: `Item ${i + 1}`,
      onClick: () => clicks.push(`Item ${i + 1}`),
    }));
    el.open(200, 200, items, "gear");
    return { el, clicks };
  }

  it("sections hold two staggered items at most; the rest collapse into a More slot", () => {
    const { el } = makeOverflowMenu();
    const items = [...el.shadowRoot.querySelectorAll(".context-menu-item")];
    assert.equal(items.length, 11, "ten placed plus the More slot");
    const texts = items.map(
      (/** @type {HTMLElement} */ i) => i.querySelector("span")?.textContent,
    );
    assert.ok(texts.includes("More (1)"), "the overflow carries the slot");
    // The outermost stagger is the second ring: nothing renders at a
    // third ring's radius
    for (const item of items) {
      const left = Number.parseFloat(item.style.left);
      assert.ok(
        left < 300,
        `no item marches off the menu (${item.textContent} at ${left})`,
      );
    }
    el.remove();
  });

  it("a real node menu's section overflow stays within two rings", () => {
    // The worst real menu's shape: five items mapping to one section
    // (the node menu's section 5) plus four elsewhere
    const el = makeMenu();
    const items = [
      "Open",
      "Edit",
      "Add Node",
      "Add IIP",
      "Group node",
      "Rename",
      "Metadata",
      "Delete",
      "Remove",
    ].map((text) => ({ text, onClick: () => {} }));
    el.open(200, 200, items, "gear");
    for (const item of [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ]) {
      const left = Number.parseFloat(item.style.left);
      assert.ok(left < 300, `${item.textContent} stays on the menu`);
    }
    el.remove();
  });

  it("the More slot opens the submenu; the center release navigates back", () => {
    const { el, clicks } = makeOverflowMenu();
    const more = [...el.shadowRoot.querySelectorAll(".context-menu-item")].find(
      (/** @type {HTMLElement} */ i) =>
        i.querySelector("span")?.textContent === "More (1)",
    );
    assert.ok(more, "the More slot renders");
    more.dispatchEvent(new Event("pointerup", { bubbles: true }));
    // The submenu's items replace the parent's; the overflowed item is
    // now a top-level slot and the center icon turns back
    const subTexts = [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ].map(
      (/** @type {HTMLElement} */ i) => i.querySelector("span")?.textContent,
    );
    assert.ok(subTexts.includes("Item 11"), "the overflowed item serves");
    assert.ok(!subTexts.includes("More (1)"), "no nested marker");
    assert.equal(el._submenuOf, true, "the submenu is active");
    assert.ok(
      /** @type {HTMLElement} */ (el.centerIconElement.innerHTML || "").length >
        0,
      "the center carries the back chevron",
    );
    // The center release navigates back
    // The center release navigates back (a real PointerEvent — the
    // handler branches on it)
    el._releaseMenuListener(
      new PointerEvent("pointerup", {
        clientX: el._openX,
        clientY: el._openY,
      }),
    );
    assert.equal(el._submenuOf, false, "back at the parent");
    const parentTexts = [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ].map(
      (/** @type {HTMLElement} */ i) => i.querySelector("span")?.textContent,
    );
    assert.ok(parentTexts.includes("More (1)"), "the parent's More is back");
    assert.deepEqual(clicks, [], "navigation activates nothing");
    el.remove();
  });

  it("a submenu item activates normally and closes the whole menu", () => {
    const { el, clicks } = makeOverflowMenu();
    el.shadowRoot
      .querySelectorAll(".context-menu-item")
      .forEach((/** @type {HTMLElement} */ i) => {
        if (i.querySelector("span")?.textContent === "More (1)") {
          i.dispatchEvent(new Event("pointerup", { bubbles: true }));
        }
      });
    const subItem = [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ].find(
      (/** @type {HTMLElement} */ i) =>
        i.querySelector("span")?.textContent === "Item 11",
    );
    assert.ok(subItem, "the overflowed item serves in the submenu");
    subItem.dispatchEvent(new Event("pointerup", { bubbles: true }));
    assert.deepEqual(clicks, ["Item 11"]);
    assert.equal(el._isMenuOpen, false, "activation closes");
    el.remove();
  });
});

describe("the radial's left-handed mirror (guidelines §10)", () => {
  it("left-handed mode mirrors the sections across the vertical axis", () => {
    document.body.setAttribute("data-handedness", "left");
    const el = makeMenu();
    // Remove is section 3 (the right-handed bottom-left): mirrored to
    // section 1 — the bottom-right quadrant
    el.open(
      200,
      200,
      [
        { text: "Remove", onClick: () => {} },
        { text: "Add Node", onClick: () => {} },
      ],
      "gear",
    );
    const remove = [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ].find(
      (/** @type {HTMLElement} */ i) =>
        i.querySelector("span")?.textContent === "Remove",
    );
    assert.ok(remove, "the item renders");
    const left = Number.parseFloat(remove.style.left);
    // The mirrored item sits right of the origin (the menu's 180px box):
    // the right-handed bottom-left would render left of center
    // The item's CENTER sits right of the origin (the box's left edge is
    // the center minus half the 60px box)
    assert.ok(
      left > 60,
      `the mirrored section renders right of the origin (center ${left + 30})`,
    );
    // The slide matches through the same mirror: sliding to the item's
    // rendered position highlights it
    // The slide works in the menu box's coordinates: the origin is the
    // box's center (90, 90)
    const dx = Number.parseFloat(remove.style.left) + 30 - 90;
    const dy = Number.parseFloat(remove.style.top) + 30 - 90;
    el.handleSlide({ clientX: el._openX + dx, clientY: el._openY + dy });
    assert.ok(
      remove.classList.contains("highlighted"),
      "the slide finds the mirrored item",
    );
    document.body.setAttribute("data-handedness", "right");
    el.remove();
  });

  it("right-handed mode stays the default", () => {
    document.body.removeAttribute("data-handedness");
    const el = makeMenu();
    el.open(200, 200, [{ text: "Remove", onClick: () => {} }], "gear");
    const remove = [
      ...el.shadowRoot.querySelectorAll(".context-menu-item"),
    ].find(
      (/** @type {HTMLElement} */ i) =>
        i.querySelector("span")?.textContent === "Remove",
    );
    const left = Number.parseFloat(remove.style.left);
    assert.ok(
      left <= 90,
      `the right-handed section renders left of the origin (${left})`,
    );
    el.remove();
  });
});
