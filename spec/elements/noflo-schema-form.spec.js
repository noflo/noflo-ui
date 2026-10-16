import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import "../../src/elements/noflo-schema-form.js";

/**
 * The schema-driven form (work document #57): the declared forms subset
 * rendered through vanilla Web Components, with per-subtree fallback to
 * the raw JSON editor and validation errors beside the controls they
 * describe.
 */

/**
 * @returns {any}
 */
function makeForm() {
  const el = document.createElement("noflo-schema-form");
  document.body.appendChild(el);
  return el;
}

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", title: "Name" },
    count: { type: "integer", default: 3, maximum: 10 },
    enabled: { type: "boolean" },
    role: { type: "string", enum: ["observer", "editor"] },
    tags: { type: "array", items: { type: "string" } },
    started: { type: "string", format: "date" },
    fancy: { pattern: "^a" },
  },
  required: ["name"],
};

describe("schema form (work document #57)", () => {
  it("resolves $ref through the schema cache's published form", async () => {
    const { createSchemaCache } = await import(
      "../../src/library/schemaCache.js"
    );
    const cache = createSchemaCache({
      storage: (() => {
        const records = new Map();
        return {
          get: async (digest) => records.get(digest) ?? null,
          put: async (record) => {
            records.set(record.digest, record);
          },
          all: async () => [...records.values()],
        };
      })(),
    });
    const point = {
      type: "object",
      properties: { x: { type: "number" }, y: { type: "number" } },
      required: ["x"],
    };
    const digest = await cache.put(point, "ui/point");
    const el = makeForm();
    el.refResolver = (/** @type {string} */ ref) => cache.getRef(ref);
    el.schema = {
      type: "object",
      properties: {
        origin: { $ref: `urn:noflo:ui/point@${digest}` },
      },
    };
    el.data = { origin: { y: 2 } };
    await el.building;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(
      shadow.textContent ?? "",
      /origin/,
      "the referenced property renders",
    );
    // The referenced schema's required x validates through the resolved
    // subtree
    assert.match(shadow.textContent ?? "", /required property 'x'/);
    el.remove();
  });

  it("an unresolvable $ref falls back per subtree, never blank", async () => {
    const el = makeForm();
    el.schema = {
      type: "object",
      properties: {
        origin: { $ref: `urn:noflo:ui/point@${"0".repeat(64)}` },
      },
    };
    await el.building;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(
      shadow.textContent ?? "",
      /cannot be resolved in this session/,
    );
    assert.ok(
      shadow.querySelector("textarea"),
      "the raw JSON fallback renders",
    );
    el.remove();
  });

  it("a oneOf with a discriminator renders the picker", async () => {
    const el = makeForm();
    el.schema = {
      type: "object",
      oneOf: [
        {
          type: "object",
          title: "Color fill",
          properties: {
            kind: { const: "color" },
            value: { type: "string", format: "color" },
          },
          required: ["kind"],
        },
        {
          type: "object",
          title: "Fixed value",
          properties: { kind: { const: "fixed" }, value: { type: "integer" } },
          required: ["kind"],
        },
      ],
      discriminator: { propertyName: "kind" },
    };
    el.data = { kind: "fixed", value: 3 };
    await el.building;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const select = shadow.querySelector("select");
    assert.ok(select, "the discriminator picker renders");
    const options = [...shadow.querySelectorAll("select option")].map(
      (o) => o.textContent,
    );
    assert.deepEqual(options, ["Color fill", "Fixed value"]);
    // The selected branch renders its own widgets; the other branch's
    // widgets do not
    assert.ok(
      shadow.querySelector('input[type="text"]'),
      "the fixed branch's integer widget",
    );
    assert.ok(
      !shadow.querySelector('input[type="color"]'),
      "the unselected branch does not render",
    );
    // Switching the picker swaps the branch
    select.value = JSON.stringify("color");
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        'input[type="color"]',
      ),
      "the color branch renders after the switch",
    );
    assert.equal(
      el.data.kind,
      "color",
      "the selector's value wrote into the data",
    );
    el.remove();
  });

  it("a oneOf without a discriminator falls back", async () => {
    const el = makeForm();
    el.schema = { oneOf: [{ type: "string" }, { type: "integer" }] };
    await el.building;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(
      /** @type {ShadowRoot} */ (el.shadowRoot).textContent ?? "",
      /without a discriminator/,
    );
    el.remove();
  });

  it("renders the typed widgets for the declared subset", async () => {
    const el = makeForm();
    el.schema = SCHEMA;
    el.data = { name: "main", enabled: true, role: "editor", tags: ["a"] };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector('input[type="text"]'), "the string widget");
    assert.ok(
      shadow.querySelector('input[type="checkbox"]'),
      "the boolean widget",
    );
    assert.ok(
      shadow.querySelector("select"),
      "the enum widget renders a picker",
    );
    assert.ok(shadow.querySelector(".field"), "the array renders a field");
    // The fallback renders per subtree with its declared reason
    assert.ok(shadow.querySelector("textarea"), "the fallback subtree");
    assert.match(shadow.textContent ?? "", /outside the declared forms subset/);
    el.remove();
  });

  it("prefills from the schema default and emits the change", async () => {
    const el = makeForm();
    /** @type {any[]} */
    const changes = [];
    el.addEventListener("form-change", (/** @type {any} */ e) =>
      changes.push(e.detail),
    );
    el.schema = {
      type: "object",
      properties: { count: { type: "integer", default: 7 } },
    };
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(el.data.count, 7, "the schema default prefills");
    assert.ok(changes.length > 0, "the initial state forwards");
    const input = /** @type {HTMLInputElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector(
        'input[type="text"]',
      )
    );
    input.value = "12";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    assert.equal(el.data.count, 12, "the edit lands in the value tree");
    const last = changes[changes.length - 1];
    assert.equal(last.data.count, 12);
    assert.equal(last.isValid, true, "the aggregate validity reports");
    el.remove();
  });

  it("decimal separators normalize: commas parse as the decimal point", async () => {
    const el = makeForm();
    el.schema = { type: "object", properties: { ratio: { type: "number" } } };
    el.data = { ratio: 1 };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const input = /** @type {HTMLInputElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("input")
    );
    input.value = "2,5";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    assert.equal(el.data.ratio, 2.5);
    el.remove();
  });

  it("validation errors render beside the control they describe", async () => {
    const el = makeForm();
    el.schema = SCHEMA;
    el.data = { name: 4, count: 99 };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const rows = [...shadow.querySelectorAll(".row")];
    const invalid = rows.filter((row) => row.classList.contains("invalid"));
    assert.ok(invalid.length >= 2, "the invalid controls are flagged");
    assert.match(shadow.textContent ?? "", /must be string/);
    assert.match(shadow.textContent ?? "", /must be <= 10/);
    // Fix both invalid controls: the count row's bounds error clears with
    // the name row's type error
    const nameInput = /** @type {HTMLInputElement} */ (
      invalid[0].querySelector("input")
    );
    nameInput.value = "fixed";
    nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    const change = await new Promise((resolve) => {
      el.addEventListener(
        "form-change",
        (/** @type {any} */ e) => resolve(e.detail),
        {
          once: true,
        },
      );
      const countInput = /** @type {HTMLInputElement} */ (
        invalid[1].querySelector("input")
      );
      countInput.value = "3";
      countInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    assert.equal(change.isValid, true, "fixing the values clears the errors");
    el.remove();
  });

  it("the full Tier B vocabulary validates the fallback subtree", async () => {
    // `pattern` is outside the rendering subset: the subtree falls back
    // to the raw JSON editor, and the full validator still enforces it —
    // the form and the validator never silently disagree
    const el = makeForm();
    el.schema = {
      type: "object",
      properties: { fancy: { type: "string", pattern: "^a" } },
    };
    el.data = { fancy: "bee" };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.match(shadow.textContent ?? "", /must match pattern/);
    // A matching value clears it
    const textarea = /** @type {HTMLTextAreaElement} */ (
      shadow.querySelector("textarea")
    );
    textarea.value = '"apple"';
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.doesNotMatch(
      /** @type {ShadowRoot} */ (el.shadowRoot).textContent ?? "",
      /must match pattern/,
    );
    el.remove();
  });

  it("the fallback textarea evaluates on change: JSON parses, text becomes a string", async () => {
    const el = makeForm();
    el.schema = {
      type: "object",
      properties: { fancy: { pattern: "^a" } },
    };
    el.data = { fancy: null };
    await new Promise((resolve) => setTimeout(resolve, 0));
    const textarea = /** @type {HTMLTextAreaElement} */ (
      /** @type {ShadowRoot} */ (el.shadowRoot).querySelector("textarea")
    );
    textarea.value = '{"nested": true}';
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    assert.deepEqual(el.data.fancy, { nested: true }, "valid JSON parses");
    textarea.value = "just some text";
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    assert.equal(
      el.data.fancy,
      "just some text",
      "non-JSON text becomes a string",
    );
    el.remove();
  });
});
