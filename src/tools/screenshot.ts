import { existsSync } from "node:fs";

import { defineTool } from "@earendil-works/pi-coding-agent";
import puppeteer, { type ElementHandle, type Page } from "puppeteer-core";
import { Type } from "typebox";

import { uploadImage } from "../studio.ts";
import { normalUrl, type Seen } from "./web.ts";

/**
 * screenshot: a screenshot of a website, for showing it in a post (a "best tools" list with
 * each tool's homepage, a pricing table, a feature). The hero (what you see on arrival, at
 * 1440x900), or the block around a piece of text (`find`, e.g. "Pricing"). The image is sent
 * to the studio, which stores it in its Supabase bucket and returns the public URL; the
 * agent puts it in post.md as ![what it shows](url). Also returns the text visible in the
 * shot, so the agent can describe it accurately.
 *
 * Ported from sycamore-motion/scripts/brand-capture.mjs (cookie banner dismissal, scroll to
 * load lazy content, finding a block by its text). Uses the machine's Chrome via
 * puppeteer-core: GitHub's ubuntu runners have it at /usr/bin/google-chrome; elsewhere set
 * CHROME_PATH.
 */

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MAX_PER_TOPIC = 15;

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((p) => existsSync(p));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One Chrome at a time: models often ask for several screenshots in one turn, and parallel
 * browsers fight for memory (minutes per shot on a small machine, crashes on a busy one).
 */
let queue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

/** Click an obvious cookie "accept" button; hide leftover fixed consent banners. (Runs in the page.) */
function pageDismiss() {
  const vis = (e: Element) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  };
  const accept = /^(accept( all)?( cookies)?|allow( all)?( cookies)?|i (agree|accept)|agree|got it|ok(ay)?|accept (&|and) close)$/i;
  const ctr =
    "[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[class*=gdpr i],[id*=onetrust],[id*=usercentrics],[aria-label*=cookie i],[aria-label*=consent i]";
  for (const b of document.querySelectorAll<HTMLElement>("button,[role=button],a[role=button]")) {
    const t = (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    if (vis(b) && accept.test(t) && b.closest(ctr)) {
      b.click();
      break;
    }
  }
  for (const e of document.querySelectorAll<HTMLElement>(ctr)) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") e.style.setProperty("display", "none", "important");
  }
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
}

/** Scroll the page once so lazy images load, then back to the top. (Runs in the page.) */
async function pageScroll() {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const step = Math.round(innerHeight * 0.7);
  const maxY = Math.min(document.documentElement.scrollHeight, 12000);
  for (let y = 0; y < maxY; y += step) {
    scrollTo(0, y);
    await wait(120);
  }
  scrollTo(0, 0);
  await wait(400);
}

/**
 * The block around the text `q`: the shortest visible element containing it (headings win),
 * then up to the first section/article or ancestor at least 0.6 of a screen tall AND wide (so
 * "Pricing" gives the whole pricing table, not one plan's card), never past 2.5 screens tall.
 * (Runs in the page.)
 */
function pageFindSection(q: string) {
  const needle = q.toLowerCase();
  const vis = (e: Element) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isHeading = (e: Element) => (/^H[1-6]$/.test(e.tagName) || e.getAttribute("role") === "heading" ? 1 : 0);
  const hit = [...document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,[role=heading],p,li,a,button,span,strong,div")]
    .filter((e) => {
      const t = (e.innerText || "").trim();
      return t.length <= 200 && t.toLowerCase().includes(needle) && vis(e);
    })
    .sort((a, b) => isHeading(b) - isHeading(a) || a.innerText.length - b.innerText.length)[0];
  if (!hit) return null;
  const maxH = innerHeight * 2.5;
  let best: HTMLElement = hit;
  for (let e = hit.parentElement; e && e !== document.body; e = e.parentElement) {
    const r = e.getBoundingClientRect();
    if (r.height > maxH) break;
    best = e;
    if (r.width >= innerWidth * 0.6 && (/^(SECTION|ARTICLE)$/.test(e.tagName) || r.height >= innerHeight * 0.6)) break;
  }
  return best;
}

/** Hides fixed and sticky elements (headers, chat bubbles) so they don't cover a block screenshot. (Runs in the page.) */
function pageHideFloating() {
  for (const e of document.querySelectorAll<HTMLElement>("body *")) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") e.style.setProperty("visibility", "hidden", "important");
  }
}

/** Text visible inside a box of the page (headings, paragraphs, buttons), to tell the agent what's in the shot. (Runs in the page.) */
function pageVisibleText(box: { top: number; bottom: number }) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of document.querySelectorAll<HTMLElement>("h1,h2,h3,p,li,button,a[class*=button i],a[class*=btn i]")) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.top < box.top || r.bottom > box.bottom) continue;
    const t = (e.innerText || "").replace(/\s+/g, " ").trim();
    if (t.length < 2 || t.length > 220 || seen.has(t)) continue;
    seen.add(t);
    out.push(/^H[1-3]$/.test(e.tagName) ? `${e.tagName}: ${t}` : t);
    if (out.length >= 25) break;
  }
  return out.join("\n");
}

export async function capture(page: Page, url: string, find?: string): Promise<{ image: Uint8Array; title: string; text: string; note?: string }> {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 }).catch(async (e) => {
    // Busy pages never go network-idle; what has loaded is usually enough.
    if (!/timeout/i.test((e as Error).message)) throw e;
  });
  await sleep(800);
  await page.evaluate(pageDismiss);
  await page.evaluate(pageScroll);
  const title = await page.title();

  if (find) {
    const el = (await page.evaluateHandle(pageFindSection, find)).asElement() as ElementHandle<Element> | null;
    if (el) {
      await page.evaluate(pageHideFloating);
      await el.scrollIntoView();
      await sleep(500);
      const rect = await el.boundingBox();
      const image = (await el.screenshot({ type: "jpeg", quality: 80 })) as Uint8Array;
      const text = rect ? await page.evaluate(pageVisibleText, { top: rect.y - 1, bottom: rect.y + rect.height + 1 }) : "";
      return { image, title, text };
    }
    // Not found: fall back to the hero, and say so.
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
    const image = (await page.screenshot({ type: "jpeg", quality: 80 })) as Uint8Array;
    return { image, title, text: await page.evaluate(pageVisibleText, { top: 0, bottom: VIEWPORT.height }), note: `"${find}" wasn't found on the page, so this is the hero instead` };
  }

  const image = (await page.screenshot({ type: "jpeg", quality: 80 })) as Uint8Array;
  return { image, title, text: await page.evaluate(pageVisibleText, { top: 0, bottom: VIEWPORT.height }) };
}

/**
 * A page's visible text, loaded in Chrome: for read_page when Jina and a plain fetch hit a bot
 * check (Quora's Cloudflare page, JavaScript-only pages). A real browser solves those checks
 * more often. Shares the one-Chrome-at-a-time queue with screenshots.
 */
export function readWithChrome(url: string): Promise<string> {
  return oneAtATime(async () => {
    const executablePath = chromePath();
    if (!executablePath) throw new Error("no Chrome found");
    const browser = await puppeteer.launch({ headless: true, executablePath, defaultViewport: VIEWPORT, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36");
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 }).catch((e) => {
        if (!/timeout/i.test((e as Error).message)) throw e;
      });
      // Bot checks reload the page once they pass; give that time.
      await sleep(4000);
      return await page.evaluate(() => document.body.innerText);
    } finally {
      await browser.close().catch(() => {});
    }
  });
}

export function screenshotTool(opts: { campaign: string; topicId: string; seen: Seen }) {
  let taken = 0;
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

  return defineTool({
    name: "screenshot",
    label: "Screenshot",
    description:
      "Take a screenshot of a website to show in your post: the hero (what a visitor sees first), or the block around some text with find (e.g. find: \"Pricing\"). Returns the image URL to use as ![what it shows](url) and the text visible in the shot.",
    parameters: Type.Object({
      url: Type.String({ description: "The page's full URL" }),
      find: Type.Optional(Type.String({ description: "Text on the page to screenshot the block around, e.g. a heading like \"Pricing\". Leave out for the hero." })),
    }),
    execute: (_id, { url, find }) => oneAtATime(async () => {
      if (taken >= MAX_PER_TOPIC) return reply(`You've taken ${MAX_PER_TOPIC} screenshots, the most for one post. Use the ones you have.`);
      const executablePath = chromePath();
      if (!executablePath) return reply("Screenshots aren't available here (no Chrome found).");
      const browser = await puppeteer.launch({ headless: true, executablePath, defaultViewport: VIEWPORT, args: ["--no-sandbox"] });
      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        );
        const shot = await capture(page, url, find?.trim() || undefined);
        // The page loaded, so it exists: the agent may link it even if storing the image fails.
        opts.seen.add(normalUrl(url));
        const imageUrl = await uploadImage(opts.campaign, opts.topicId, shot.image);
        taken++;
        opts.seen.add(normalUrl(imageUrl));
        return reply(
          [
            `Screenshot of ${url}${find ? ` (block around "${find}")` : " (hero)"}: ${imageUrl}`,
            shot.note ? `Note: ${shot.note}.` : "",
            `Page title: ${shot.title}`,
            `Text visible in the screenshot:\n${shot.text || "(none found: mostly images)"}`,
            `Put it in post.md as ![a short caption saying what it shows](${imageUrl}). Check the text above: if it's a cookie wall, a login page or an error, don't use it.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        );
      } catch (e) {
        return reply(`Couldn't screenshot ${url}: ${(e as Error).message}`);
      } finally {
        await browser.close().catch(() => {});
      }
    }),
  });
}
