#!/usr/bin/env node
// page-capture.mjs: the real sycamore.to/motion template page, for "recreate" videos.
//
// Usage:  npm run page -- <template-page-url> <film-slug>
//         e.g. npm run page -- https://www.sycamore.to/motion/type-staircase recreate-rigel
//
// Opens the page at 1440x900 (2x pixels) in Chrome and writes, to public/films/<slug>/page/:
//   page.png      the page as a visitor first sees it
//   copied.png    right after clicking "Copy prompt" (the button's copied state)
//   capture.json  { viewport, button: {x, y, width, height} } in CSS px of the 1440x900 view,
//                 so the video's cursor can click the real button
// and the prompt the button copied (read back from the clipboard) to src/films/<slug>/prompt.md:
// the exact text a viewer gets, which is what Claude Code is given in the video.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const [url, slug] = process.argv.slice(2);
if (!url || !slug) {
  console.error("usage: npm run page -- <template-page-url> <film-slug>");
  process.exit(1);
}

/** Puppeteer's own Chrome if it was downloaded, else the system Chrome (as brand-capture.mjs). */
const chromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const p = puppeteer.executablePath();
    if (typeof p === "string" && fs.existsSync(p)) return p;
  } catch {}
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ].find((c) => fs.existsSync(c));
};

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };
const outDir = path.resolve("public", "films", slug, "page");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, executablePath: chromePath(), defaultViewport: VIEWPORT });
try {
  await browser.defaultBrowserContext().overridePermissions(new URL(url).origin, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1500)); // let the preview video start and layout settle
  await page.screenshot({ path: path.join(outDir, "page.png") });

  const button = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button, a")].find((el) => /copy prompt/i.test(el.textContent ?? "")),
  );
  const el = button.asElement();
  if (!el) throw new Error('no "Copy prompt" button on the page');
  const box = await el.boundingBox();
  await el.click();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, "copied.png") });

  const prompt = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  if (prompt.trim()) {
    fs.mkdirSync(path.resolve("src", "films", slug), { recursive: true });
    fs.writeFileSync(path.resolve("src", "films", slug, "prompt.md"), prompt);
  }
  fs.writeFileSync(
    path.join(outDir, "capture.json"),
    JSON.stringify({ url, viewport: { width: VIEWPORT.width, height: VIEWPORT.height }, button: box }, null, 2),
  );
  console.log(`page.png, copied.png, capture.json -> ${outDir}`);
  console.log(prompt.trim() ? `prompt: ${prompt.split(/\s+/).length} words -> src/films/${slug}/prompt.md` : "couldn't read the copied prompt from the clipboard");
} finally {
  await browser.close();
}
