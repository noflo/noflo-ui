import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { markdownToHtml } from "../../src/library/markdown.js";

describe("the markdown subset renderer (work document #66)", () => {
  it("renders headings, paragraphs, and joined text lines", () => {
    const html = markdownToHtml("# Title\n\nFirst line\nsecond line\n\nAfter.");
    assert.match(html, /<h1>Title<\/h1>/);
    assert.match(html, /<p>First line second line<\/p>/);
    assert.match(html, /<p>After\.<\/p>/);
  });

  it("renders indented code blocks verbatim", () => {
    const html = markdownToHtml(
      "Before:\n\n    const a = 1;\n    const b = 2;\n\nAfter",
    );
    assert.match(html, /<pre><code>/);
    assert.match(html, /const a = 1;\nconst b = 2;<\/code>/s);
    assert.ok(!html.includes("<p>const"), "code never renders as a paragraph");
  });

  it("a blank line inside an indented block does not end it", () => {
    const html = markdownToHtml("    first\n\n    second\n\nplain");
    assert.match(html, /<pre><code>first\n\nsecond<\/code><\/pre>/);
    assert.match(html, /<p>plain<\/p>/);
  });

  it("renders lists", () => {
    const html = markdownToHtml("Intro\n\n- one\n- two\n\n1. first\n2. second");
    assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
    assert.match(html, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
  });

  it("renders inline code, bold, and links", () => {
    const html = markdownToHtml(
      "Use `getComponent` for **every** module; see [the docs](https://noflojs.org/docs/).",
    );
    assert.match(html, /<code>getComponent<\/code>/);
    assert.match(html, /<strong>every<\/strong>/);
    assert.match(
      html,
      /<a href="https:\/\/noflojs\.org\/docs\/" target="_blank" rel="noreferrer noopener">the docs<\/a>/,
    );
  });

  it("escapes HTML in the source — never trusts its input", () => {
    const html = markdownToHtml('<script>alert(1)</script> & "quotes"');
    assert.ok(!html.includes("<script>"), "raw HTML never passes through");
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&amp;/);
    assert.match(html, /&quot;quotes&quot;/);
  });

  it("a non-http link target renders as its text, not an anchor", () => {
    const html = markdownToHtml("[click](javascript:alert(1))");
    assert.ok(
      !html.includes("<a "),
      "javascript: targets never become anchors",
    );
    assert.match(html, /click/);
  });

  it("empty and null sources render empty", () => {
    assert.equal(markdownToHtml(""), "");
    assert.equal(markdownToHtml(null), "");
  });
});
