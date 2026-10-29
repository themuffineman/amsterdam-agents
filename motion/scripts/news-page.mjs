#!/usr/bin/env node
// news-page.mjs: capture one web page as material for a news story (AI news series).
//
// Usage:  npm run news-page -- <url> <film> <name> [--highlight="1M tokens|open weights"]
//                              [--column="Gemini 4 Argon"] [--row="Vals Index"] [--max-height=10000]
//                              [--no-videos] [--max-mb=250]
//
//   --highlight  text to select later in the film (| separates several); found with the
//                browser's own find, so it must be on the page as written
//   --column     a table cell's text: every cell in that cell's column (benchmark tables)
//   --row        a table cell's text: that cell's whole row
//
// The page is not recorded as video: it is captured once, and the film does the scrolling,
// the text-selection sweep and the cursor (src/news/PageShot.tsx), so every move can land on
// a word of the narration and be retimed without capturing again. Browser at 1280x720 CSS px,
// 1.5x pixels, so the page is exactly 1920 px wide (the film's width).
//
// Writes public/films/<film>/pages/<name>/:
//   page.png       the whole page (fixed/sticky bars hidden), at most --max-height CSS px tall
//   bar.png        the fixed/sticky top bar as seen at the top, if the page has one (the film
//                  keeps it on top while scrolling, as a browser does)
//   videos/*.mp4   the page's own <video> files (demo clips), audio/* its <audio> files
//   text.md        the page's visible text (what the script may say comes from here)
//   page.json      { url, title, width, height, scale, bar, headings, highlights, columns,
//                    rows, videos, audios, embeds, images }: every box in CSS px of the page
//                    (multiply by `scale` for page.png pixels)
//
// Rule: capture only the pages a story is about (the project page, paper, repo, model card,
// the lab's post, the leaderboard it cites), and keep the URL in the story's sources.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer";

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const [url, film, name] = args.filter((a) => !a.startsWith("--"));
if (!url || !film || !name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error('usage: npm run news-page -- <url> <film> <name> [--highlight="a|b"] [--column=..] [--row=..]');
  process.exit(1);
}
const list = (v) => (typeof v === "string" ? v.split("|").map((s) => s.trim()).filter(Boolean) : []);
const VIEWPORT = { width: 1280, height: 720, deviceScaleFactor: 1.5 };
const MAX_HEIGHT = Number(flags["max-height"] ?? 10000); // 10000 x 1.5 stays under Chrome's 16384 px limit
const MAX_VIDEOS = 8;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const MAX_MEDIA_BYTES = Number(flags["max-mb"] ?? 250) * 1024 * 1024;

const out = path.resolve("public", "films", film, "pages", name);
fs.rmSync(out, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); // retries: Windows briefly locks files an editor or antivirus is reading
fs.mkdirSync(out, { recursive: true });
const rel = (p) => path.relative(path.resolve("public"), p).split(path.sep).join("/");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ------------------------------------------------------------------ in-page functions

/** Click an obvious cookie "accept" button; hide leftover consent banners (from brand-capture.mjs). */
function pageDismiss() {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  };
  const accept =
    /^(accept( all)?( cookies)?|allow( all)?( cookies)?|i (agree|accept)|agree|got it|ok(ay)?|accept (&|and) close|allow all cookies|accept all cookies)$/i;
  const ctr =
    "[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[class*=gdpr i],[id*=onetrust],[id*=usercentrics],[aria-label*=cookie i],[aria-label*=consent i]";
  for (const b of document.querySelectorAll("button,[role=button],a[role=button]")) {
    const t = (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    if (vis(b) && accept.test(t) && b.closest(ctr)) {
      b.click();
      break;
    }
  }
  for (const e of document.querySelectorAll(ctr)) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") e.style.setProperty("display", "none", "important");
  }
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
}

/** Scroll the whole page once so lazy images load and videos get their src, then back to top. */
async function pageScroll(maxY) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let y = 0; y < Math.min(document.documentElement.scrollHeight, maxY); y += Math.round(innerHeight * 0.7)) {
    scrollTo(0, y);
    await wait(180);
  }
  scrollTo(0, 0);
  await wait(500);
  try {
    await document.fonts.ready;
  } catch {}
}

/** The fixed/sticky bars along the top (site headers): their bottom edge, then hide them all. */
function pageBars() {
  let bottom = 0;
  const hidden = [];
  for (const e of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(e);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.top <= 4 && r.height >= 24 && r.height < 160 && r.width > innerWidth * 0.5) bottom = Math.max(bottom, Math.round(r.bottom));
    hidden.push(e);
  }
  return { bottom, count: hidden.length };
}
function pageHideBars() {
  for (const e of document.querySelectorAll("body *")) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") e.style.setProperty("position", p === "sticky" ? "static" : "absolute", "important");
  }
  // Absolute-positioned former fixed elements near the bottom (chat bubbles, banners) just go.
  for (const e of document.querySelectorAll("body *")) {
    const r = e.getBoundingClientRect();
    if (e.style.position === "absolute" && r.top > innerHeight * 0.6 && r.top < innerHeight) e.style.setProperty("display", "none", "important");
  }
}

/** Everything the film needs to point at, as boxes in page CSS px. */
function pageMap({ highlights, columns, rows }) {
  const sy = scrollY;
  const box = (r) => ({ x: Math.round(r.left), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) });
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && getComputedStyle(e).visibility !== "hidden";
  };
  const text = (e) => (e.innerText || e.textContent || "").replace(/\s+/g, " ").trim();

  const headings = [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).slice(0, 80).map((e) => ({ tag: e.tagName.toLowerCase(), text: text(e).slice(0, 120), ...box(e.getBoundingClientRect()) }));

  // Text selections: the browser's own find, so the boxes are exactly what a user would drag over.
  const found = highlights.map((q) => {
    getSelection().removeAllRanges();
    scrollTo(0, 0);
    const ok = window.find(q, false, false, true, false, false, false);
    const sel = getSelection();
    if (!ok || !sel.rangeCount) return { text: q, rects: [] };
    const rects = [...sel.getRangeAt(0).getClientRects()].filter((r) => r.width > 1).map(box);
    // Merge rects on the same line (inline elements split them).
    const lines = [];
    for (const r of rects) {
      const l = lines.find((x) => Math.abs(x.y - r.y) < 4);
      if (l) {
        const right = Math.max(l.x + l.w, r.x + r.w);
        l.x = Math.min(l.x, r.x);
        l.w = right - l.x;
        l.h = Math.max(l.h, r.h);
      } else lines.push({ ...r });
    }
    return { text: q, rects: lines };
  });
  getSelection().removeAllRanges();
  scrollTo(0, 0);

  const cellFor = (q) => {
    const n = q.toLowerCase();
    return [...document.querySelectorAll("th,td")].filter((c) => vis(c) && text(c).toLowerCase().includes(n)).sort((a, b) => text(a).length - text(b).length)[0];
  };
  const colOut = columns.map((q) => {
    const c = cellFor(q);
    if (!c) return { text: q, rects: [] };
    const table = c.closest("table");
    // cellIndex ignores colspans; count spans so header and body line up.
    const colOf = (cell) => [...cell.parentElement.cells].slice(0, cell.cellIndex).reduce((a, x) => a + (x.colSpan || 1), 0);
    const want = colOf(c);
    const cells = [...table.rows].map((r) => [...r.cells].find((x) => colOf(x) === want)).filter(Boolean);
    const rs = cells.map((x) => x.getBoundingClientRect());
    const top = Math.min(...rs.map((r) => r.top));
    const bottom = Math.max(...rs.map((r) => r.bottom));
    return { text: q, rects: [box({ left: rs[0].left, top, width: rs[0].width, height: bottom - top })], table: box(table.getBoundingClientRect()) };
  });
  const rowOut = rows.map((q) => {
    const c = cellFor(q);
    if (!c) return { text: q, rects: [] };
    return { text: q, rects: [box(c.parentElement.getBoundingClientRect())], table: box(c.closest("table").getBoundingClientRect()) };
  });

  const videos = [...document.querySelectorAll("video")].filter(vis).map((v) => ({
    src: v.currentSrc || v.src || v.querySelector("source")?.src || "",
    poster: v.poster || "",
    ...box(v.getBoundingClientRect()),
  })).filter((v) => v.src && !v.src.startsWith("blob:"));
  const audios = [...document.querySelectorAll("audio")].map((a) => ({
    src: a.currentSrc || a.src || a.querySelector("source")?.src || "",
    label: text(a.closest("tr,li,figure,div") || a).slice(0, 120),
    ...box((a.closest("tr,li,figure,div") || a).getBoundingClientRect()),
  })).filter((a) => a.src && !a.src.startsWith("blob:"));
  const embeds = [...document.querySelectorAll("iframe")].filter(vis).map((f) => ({ src: f.src, ...box(f.getBoundingClientRect()) })).filter((f) => /youtube|vimeo|x\.com|twitter|tiktok|instagram/.test(f.src));
  const images = [...document.querySelectorAll("img")].filter((i) => vis(i) && i.getBoundingClientRect().width >= 300).slice(0, 60).map((i) => ({ src: i.currentSrc || i.src, alt: (i.alt || "").slice(0, 120), ...box(i.getBoundingClientRect()) }));

  const pageText = (document.querySelector("main,article") || document.body).innerText.replace(/\n{3,}/g, "\n\n").slice(0, 40000);
  return { text: pageText, title: document.title, height: document.documentElement.scrollHeight, headings, highlights: found, columns: colOut, rows: rowOut, videos, audios, embeds, images };
}

// ------------------------------------------------------------------ media

const extOf = (src, type) => {
  const m = /\.(mp4|webm|mov|m4v|mp3|wav|m4a|ogg|flac)(\?|#|$)/i.exec(src);
  if (m) return m[1].toLowerCase();
  if (/webm/.test(type)) return "webm";
  if (/mpeg/.test(type)) return "mp3";
  if (/wav/.test(type)) return "wav";
  return "mp4";
};

/** Download a media file with the page as referrer, through curl (Node's fetch failed on some CDNs). */
const download = (src, dir, base) => {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${base}.${extOf(src, "")}`);
  const r = spawnSync("curl", ["-sSfL", "--max-time", "90", "--max-filesize", String(MAX_MEDIA_BYTES), "-e", url, "-A", UA, "-o", file, src], { encoding: "utf8" });
  if (r.status !== 0) {
    fs.rmSync(file, { force: true });
    throw new Error((r.stderr || `curl exit ${r.status}`).trim().slice(0, 200));
  }
  return file;
};

// ------------------------------------------------------------------ main

const executablePath = chromePath();
if (!executablePath) throw new Error("No Chrome found. Set CHROME_PATH or run `npx puppeteer browsers install chrome`.");
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  defaultViewport: VIEWPORT,
  args: ["--autoplay-policy=no-user-gesture-required", "--hide-scrollbars"],
});
const warnings = [];
const warn = (m) => {
  warnings.push(m);
  console.error(`warn: ${m}`);
};
try {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90_000 }).catch((e) => warn(`load: ${e.message} (captured what loaded)`));
  await sleep(1500);
  await page.evaluate(pageDismiss);
  await page.evaluate(pageScroll, MAX_HEIGHT);
  await sleep(800);
  // Pause every video on its first frame so the still matches the clip the film plays on top.
  await page.evaluate(() => document.querySelectorAll("video").forEach((v) => { try { v.pause(); v.currentTime = 0; } catch {} }));
  await sleep(400);

  const bars = await page.evaluate(pageBars);
  let bar = null;
  if (bars.bottom > 0) {
    await page.screenshot({ path: path.join(out, "bar.png"), clip: { x: 0, y: 0, width: VIEWPORT.width, height: bars.bottom } });
    bar = { file: rel(path.join(out, "bar.png")), h: bars.bottom };
  }
  await page.evaluate(pageHideBars);
  await sleep(300);

  const map = await page.evaluate(pageMap, { highlights: list(flags.highlight), columns: list(flags.column), rows: list(flags.row) });
  for (const k of ["highlights", "columns", "rows"]) for (const h of map[k]) if (!h.rects.length) warn(`--${k === "highlights" ? "highlight" : k.slice(0, -1)} "${h.text}" not found on the page`);

  const height = Math.min(map.height, MAX_HEIGHT);
  if (map.height > MAX_HEIGHT) warn(`page is ${map.height} px tall; captured the first ${MAX_HEIGHT} (--max-height)`);
  await page.screenshot({ path: path.join(out, "page.png"), clip: { x: 0, y: 0, width: VIEWPORT.width, height }, captureBeyondViewport: true });

  // The page's own demo clips and audio samples, in page order, skipping repeats.
  const videos = [];
  if (flags["no-videos"] !== true) {
    const seen = new Set();
    for (const v of map.videos.filter((v) => v.y < height)) {
      if (seen.has(v.src) || videos.length >= MAX_VIDEOS) continue;
      seen.add(v.src);
      try {
        const file = download(v.src, path.join(out, "videos"), `v${String(videos.length + 1).padStart(2, "0")}`);
        videos.push({ ...v, file: rel(file) });
      } catch (e) {
        warn(`video ${v.src}: ${e.message}`);
      }
    }
  }
  const audios = [];
  for (const a of map.audios.slice(0, 12)) {
    try {
      const file = download(a.src, path.join(out, "audio"), `a${String(audios.length + 1).padStart(2, "0")}`);
      audios.push({ ...a, file: rel(file) });
    } catch (e) {
      warn(`audio ${a.src}: ${e.message}`);
    }
  }

  const result = {
    url,
    title: map.title,
    capturedAt: new Date().toISOString(),
    width: VIEWPORT.width,
    viewportHeight: VIEWPORT.height,
    height,
    scale: VIEWPORT.deviceScaleFactor,
    page: rel(path.join(out, "page.png")),
    bar,
    headings: map.headings.filter((h) => h.y < height),
    highlights: map.highlights,
    columns: map.columns,
    rows: map.rows,
    videos,
    audios,
    embeds: map.embeds,
    images: map.images.filter((i) => i.y < height),
    warnings,
  };
  fs.writeFileSync(path.join(out, "text.md"), `# ${map.title}\n\n${url}\n\n${map.text}\n`);
  fs.writeFileSync(path.join(out, "page.json"), JSON.stringify(result, null, 2));
  console.log(`${name}: "${map.title}" ${result.width}x${height} css px, ${result.headings.length} headings, ${videos.length} videos, ${audios.length} audio, ${map.embeds.length} embeds -> ${rel(out)}`);
} finally {
  await browser.close();
}
