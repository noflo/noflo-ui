import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("http://localhost:3001/app.html");
await page.waitForSelector("noflo-editor", { timeout: 15000 });
const check = await page.evaluate(async () => {
  // What the APP's import specifier actually gets
  const app = await import("./vendor/codemirror.js?v=2");
  const plain = await import("./vendor/codemirror.js");
  return {
    v2: {
      ySyncFacet: typeof app.ySyncFacet,
      highlight: typeof app.HighlightStyle,
    },
    plain: {
      ySyncFacet: typeof plain.ySyncFacet,
      highlight: typeof plain.HighlightStyle,
    },
  };
});
console.log(JSON.stringify(check, null, 1));
console.log("page errors:", errors.slice(0, 3));
await browser.close();
