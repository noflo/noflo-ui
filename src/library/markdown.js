/**
 * @file The read-only Markdown subset renderer (work document #66): the
 * bundled flavor docs render in-app without a Markdown dependency — a
 * deterministic transform over the constructs the bundled docs use
 * (headings, paragraphs, lists, indented code blocks, inline code, bold,
 * links). Safety by construction: the source escapes first, formatting
 * wraps escaped text — the docs are first-party, but the renderer never
 * trusts its input.
 *
 * Outside the subset the source renders as plain paragraph text — never
 * raw HTML.
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Inline transforms over already-escaped text: `code`, **bold**, and
 * [text](https://…). Operates on the escaped form, so it matches literal
 * characters as the reader wrote them.
 *
 * @param {string} escaped
 * @returns {string}
 */
function inlineHtml(escaped) {
  let html = escaped;
  // Links first, so their URL text survives the code/bold passes untouched.
  // Only http(s) targets become anchors; anything else renders as its text.
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, /** @type {string} */ text, /** @type {string} */ url) =>
      `<a href="${url}" target="_blank" rel="noreferrer noopener">${text}</a>`,
  );
  html = html.replace(
    /`([^`]+)`/g,
    (_m, /** @type {string} */ code) => `<code>${code}</code>`,
  );
  html = html.replace(
    /\*\*([^*]+)\*\*/g,
    (_m, /** @type {string} */ strong) => `<strong>${strong}</strong>`,
  );
  return html;
}

/**
 * @param {string[]} lines The block's raw source lines.
 * @returns {string}
 */
function codeBlockHtml(lines) {
  // The 4-space indent is the block's own marker — strip exactly one level;
  // trailing blank lines (the block's end boundary) are not content
  const body = lines
    .map((line) => (line.startsWith("    ") ? line.slice(4) : line))
    .join("\n")
    .replace(/\n+$/, "");
  return `<pre><code>${escapeHtml(body)}</code></pre>`;
}

/**
 * Renders the Markdown subset to HTML. Pure — string in, string out.
 *
 * @param {string} source The Markdown source.
 * @returns {string} The HTML fragment.
 */
export function markdownToHtml(source) {
  const lines = String(source ?? "").split("\n");
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  let paragraph = [];
  /** @type {string[] | null} */
  let code = null;
  /** @type {{ tag: "ul" | "ol", items: string[] } | null} */
  let list = null;

  /** Flushes the open paragraph. */
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    out.push(`<p>${inlineHtml(escapeHtml(paragraph.join(" ")))}</p>`);
    paragraph = [];
  };
  /** Flushes the open list. */
  const flushList = () => {
    if (!list) return;
    const items = list.items
      .map((item) => `<li>${inlineHtml(escapeHtml(item))}</li>`)
      .join("");
    out.push(`<${list.tag}>${items}</${list.tag}>`);
    list = null;
  };

  for (const rawLine of lines) {
    if (code !== null) {
      // Inside an indented code block: a blank line only suspends — the
      // block ends at the first non-indented, non-blank line
      if (
        rawLine.trim() === "" ||
        rawLine.startsWith("    ") ||
        rawLine === "\t"
      ) {
        code.push(rawLine);
        continue;
      }
      out.push(codeBlockHtml(code));
      code = null;
    }
    if (rawLine.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(rawLine);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineHtml(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    if (rawLine.startsWith("    ") || rawLine === "\t") {
      flushParagraph();
      flushList();
      code = [rawLine];
      continue;
    }
    const unordered = /^[-*]\s+(.*)$/.exec(rawLine);
    const ordered = /^\d+\.\s+(.*)$/.exec(rawLine);
    if (unordered || ordered) {
      flushParagraph();
      const tag = unordered ? "ul" : "ol";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push((unordered ?? ordered)?.[1] ?? "");
      continue;
    }
    // A non-list line ends a list; consecutive text lines join the paragraph
    flushList();
    paragraph.push(rawLine.trim());
  }
  if (code !== null) out.push(codeBlockHtml(code));
  flushParagraph();
  flushList();
  return out.join("\n");
}
