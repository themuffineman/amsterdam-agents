#!/usr/bin/env node
// brand-capture.mjs: capture a website's real brand material for a film.
//
// Usage:  npm run brand -- <url> <slug> [--download-fonts] [--sections=5]
//                                       [--find="Pricing|Templates"] [--selector="#pricing"]
//
//   --find      screenshot the block around each heading/text (| separates several);
//               easier than a selector when you only know what the section says
//   --selector  screenshot one element by CSS selector
//   --sections  how many automatic section screens (0 = hero only)
//
// Any page URL works, not only homepages. Use a new slug per page (notion, notion-pricing)
// or the next run overwrites the screens.
//
// Writes brand/<slug>/:
//   screens/00-hero.png, 01-<heading>.png ...  viewport shots at 1440x900 (2x pixels, so the
//                                               camera can magnify them 2-3x and stay sharp)
//   logo/logo.svg|png                           the site's own mark: inline SVG serialised with
//                                               computed fills, or the <img> file it loads, or
//                                               (last resort) a transparent element screenshot.
//                                               Never redrawn.
//   screens/s1-<text>.png ...                   the --find / --selector blocks, whole element
//   logo/favicon.*, logo/app-icon.*             icons the page links to; if it links none,
//                                               the site's /favicon.ico, then Google's
//                                               favicon service (brand.json says which)
//   fonts/                                      font files in use (only with --download-fonts;
//                                               check the licence before using them)
//   copy.json                                   visible copy: title, meta, headings, paragraphs,
//                                               buttons/CTAs, nav links
//   brand.json                                  everything above + colours with role guesses,
//                                               fonts in use, warnings
//
// Ideas (cookie dismiss, scroll for lazy content, logo scoring, computed-style SVG export)
// adapted from motionmaxxing scripts/brand.mjs (Apache-2.0,
// https://github.com/Tejashmakwana/motionmaxxing). Rewritten for Puppeteer.
//
// Run it only on the official site of a product the film is actually about (see CLAUDE.md).

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

// ------------------------------------------------------------------ args

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const [rawUrl, slug] = args.filter((a) => !a.startsWith("--"));
if (!rawUrl || !slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("usage: npm run brand -- <url> <slug>   (slug: lowercase letters, digits, dashes)");
  process.exit(1);
}
const startUrl = /^(https?|file):/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
const maxSections = Number(flags.sections ?? 5);
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const out = path.resolve("brand", slug);
for (const d of ["screens", "logo", "fonts"]) fs.mkdirSync(path.join(out, d), { recursive: true });

const warnings = [];
const warn = (m) => {
  warnings.push(m);
  console.error(`warn: ${m}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ browser

/** Puppeteer's own Chrome if it was downloaded, else the system Chrome. */
const chromePath = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const p = puppeteer.executablePath();
    if (typeof p === "string" && fs.existsSync(p)) return p;
  } catch {}
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((c) => fs.existsSync(c));
};

// ------------------------------------------------------------------ colour helpers

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const dist = (a, b) => {
  const p = hex2rgb(a);
  const q = hex2rgb(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const saturation = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
};
// Browser default link colours (unstyled <a>) are not brand colours.
const UA_DEFAULTS = new Set(["#0000ee", "#551a8b", "#0000ff", "#ff0000"]);
const chromatic = (h) => !UA_DEFAULTS.has(h) && saturation(h) > 0.3 && lum(h) > 0.02 && lum(h) < 0.85;

/** Merge near-identical colours (RGB distance < thr), heaviest first. */
const cluster = (items, thr = 16) => {
  const cl = [];
  for (const c of [...items].sort((a, b) => b.w - a.w)) {
    const m = cl.find((x) => dist(x.hex, c.hex) < thr);
    if (m) m.w += c.w;
    else cl.push({ hex: c.hex, w: c.w });
  }
  return cl.sort((a, b) => b.w - a.w);
};

// ------------------------------------------------------------------ in-page functions

/** Click an obvious cookie "accept" button; hide leftover fixed consent banners. */
function pageDismiss() {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden";
  };
  const accept =
    /^(accept( all)?( cookies)?|allow( all)?( cookies)?|i (agree|accept)|agree|got it|ok(ay)?|accept (&|and) close|allow all cookies|accept all cookies)$/i;
  const ctr =
    "[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[class*=gdpr i],[id*=onetrust],[id*=usercentrics],[aria-label*=cookie i],[aria-label*=consent i]";
  let clicked = null;
  for (const b of document.querySelectorAll("button,[role=button],a[role=button]")) {
    const t = (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    if (vis(b) && accept.test(t) && b.closest(ctr)) {
      b.click();
      clicked = t;
      break;
    }
  }
  for (const e of document.querySelectorAll(ctr)) {
    const p = getComputedStyle(e).position;
    if (p === "fixed" || p === "sticky") e.style.setProperty("display", "none", "important");
  }
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
  return clicked;
}

/** Scroll the whole page once so lazy images and fonts load, then return to top. */
async function pageScroll() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const step = Math.round(innerHeight * 0.7);
  const maxY = Math.min(document.documentElement.scrollHeight, 24000);
  for (let y = 0; y < maxY; y += step) {
    scrollTo(0, y);
    await wait(160);
  }
  scrollTo(0, 0);
  await wait(400);
  try {
    await document.fonts.ready;
  } catch {}
  return document.documentElement.scrollHeight;
}

/**
 * The block around the text `q` (for --find): the shortest visible element containing it
 * (headings win), then up to the first section/article or the first ancestor at least
 * 0.6 of a screen tall, never past 2.5 screens.
 */
function pageFindSection(q) {
  const needle = q.toLowerCase();
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isHeading = (e) => /^H[1-6]$/.test(e.tagName) || e.getAttribute("role") === "heading";
  const hit = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading],p,li,a,button,span,strong,div")]
    .filter((e) => {
      const t = (e.innerText || "").trim();
      return t.length <= 200 && t.toLowerCase().includes(needle) && vis(e);
    })
    .sort((a, b) => isHeading(b) - isHeading(a) || a.innerText.length - b.innerText.length)[0];
  if (!hit) return null;
  const maxH = innerHeight * 2.5;
  let best = hit;
  for (let e = hit.parentElement; e && e !== document.body; e = e.parentElement) {
    const h = e.getBoundingClientRect().height;
    if (h > maxH) break;
    best = e;
    if (/^(SECTION|ARTICLE)$/.test(e.tagName) || h >= innerHeight * 0.6) break;
  }
  return best;
}

/** Everything that needs the live DOM: copy, colours, fonts, sections, logo candidates. */
function pageExtract(maxSections) {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const isVis = (e) => {
    try {
      return e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0;
    } catch {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
  };
  const docRect = (e) => {
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const meta = (s) => clean(document.querySelector(s)?.getAttribute("content")) || null;

  // Any CSS colour string -> {hex, a} via a 1x1 canvas.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const memo = new Map();
  const col = (s) => {
    if (!s || s === "transparent" || s === "none") return null;
    if (memo.has(s)) return memo.get(s);
    let r = null;
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = s;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      r = { hex: "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join(""), a: d[3] / 255 };
    } catch {}
    memo.set(s, r);
    return r;
  };

  // ---- copy
  const texts = (sel, max, maxLen) => {
    const seen = new Set();
    const o = [];
    for (const e of document.querySelectorAll(sel)) {
      if (!isVis(e)) continue;
      const t = clean(e.innerText);
      if (t.length < 2 || t.length > maxLen || seen.has(t)) continue;
      seen.add(t);
      o.push(t);
      if (o.length >= max) break;
    }
    return o;
  };
  const copy = {
    title: clean(document.title),
    siteName: meta('meta[property="og:site_name"]'),
    description: meta('meta[name="description"]') || meta('meta[property="og:description"]'),
    h1: texts("h1", 4, 220),
    h2: texts("h2", 16, 180),
    h3: texts("h3", 16, 140),
    paragraphs: texts("main p, section p, p", 24, 400).filter((t) => t.length >= 30),
    ctas: texts('button, a[class*=button i], a[class*=btn i], a[role=button], [class*=cta i] a', 16, 60),
    nav: texts("nav a, header a", 20, 40),
  };

  // ---- colours
  const vw = innerWidth;
  const bgs = [];
  const inks = [];
  const ctaBgs = [];
  const all = [...document.querySelectorAll("body, body *")].slice(0, 8000);
  for (const e of all) {
    const tag = e.tagName.toUpperCase();
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "PATH"].includes(tag) || !isVis(e)) continue;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const bg = col(cs.backgroundColor);
    if (bg && bg.a > 0.5) {
      const area = Math.min(r.width, vw) * Math.min(r.height, 4000);
      bgs.push({ hex: bg.hex, w: area });
      if (e.matches('button, a[class*=button i], a[class*=btn i], [role=button]') && area < 200000) ctaBgs.push({ hex: bg.hex, w: area });
    }
    let own = "";
    for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = clean(own);
    if (own.length >= 2) {
      const c = col(cs.color);
      const fs = parseFloat(cs.fontSize) || 16;
      if (c && c.a > 0.3) inks.push({ hex: c.hex, w: own.length * fs, size: fs });
    }
  }
  const h1 = document.querySelector("h1");
  const headingInk = h1 && isVis(h1) ? col(getComputedStyle(h1).color)?.hex ?? null : null;

  // CSS custom properties on :root that hold colours (same-origin stylesheets only).
  const cssVars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (!rule.selectorText || !/(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) continue;
      for (const prop of rule.style) {
        if (!prop.startsWith("--")) continue;
        const v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
        if (/^(#|rgb|hsl|oklch|oklab|lab|lch|color\()/i.test(v)) {
          const c = col(v);
          if (c && c.a > 0.5) cssVars[prop] = c.hex;
        }
      }
    }
  }

  // ---- fonts in use, weighted by text volume
  const fam = {};
  for (const e of all) {
    let own = "";
    for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent;
    own = clean(own);
    if (own.length < 2 || !isVis(e)) continue;
    const cs = getComputedStyle(e);
    const family = clean(cs.fontFamily.split(",")[0]).replace(/^["']|["']$/g, "");
    const key = `${family}|${cs.fontWeight}`;
    fam[key] = (fam[key] || 0) + own.length * (parseFloat(cs.fontSize) || 16);
  }
  const faces = [...document.fonts]
    .filter((f) => f.status === "loaded")
    .map((f) => ({ family: f.family.replace(/^["']|["']$/g, ""), weight: f.weight, style: f.style }));
  const fontFiles = performance
    .getEntriesByType("resource")
    .map((r) => r.name)
    .filter((n) => /\.(woff2?|ttf|otf)(\?|$)/i.test(n));

  // ---- key sections: big blocks down the page, labelled by their first heading
  const docH = document.documentElement.scrollHeight;
  const blocks = [...document.querySelectorAll("section, main > div, [class*=section i], footer")]
    .filter((e) => isVis(e) && e.getBoundingClientRect().height > innerHeight * 0.35)
    .map((e) => ({ y: docRect(e).y, label: clean(e.querySelector("h1,h2,h3")?.innerText || "").slice(0, 60) }))
    .filter((b) => b.y > innerHeight * 0.6 && b.y < docH - innerHeight * 0.3)
    .sort((a, b) => a.y - b.y);
  const sections = [];
  for (const b of blocks) {
    if (sections.length >= maxSections) break;
    if (sections.some((s) => Math.abs(s.y - b.y) < innerHeight * 0.6)) continue;
    sections.push(b);
  }

  // ---- logo candidates (scored), and their exportable form
  const logoRe = /logo|brand|wordmark|logotype|site-title|navbar-brand|masthead/i;
  const badRe = /arrow|chevron|caret|menu|search|close|hamburger|burger|social|twitter|facebook|linkedin|github|youtube|instagram|tiktok|spinner|check|star|play|avatar|flag/i;
  const attrs = (e) =>
    [e.id, e.getAttribute("class"), e.getAttribute("aria-label"), e.getAttribute("alt"), e.getAttribute("title"), e.getAttribute("src")].join(" ");
  const isHome = (a) => {
    try {
      const u = new URL(a.href, location.href);
      return u.origin === location.origin && /^\/?([a-z]{2}([-_][a-z]{2})?\/?)?$/i.test(u.pathname);
    } catch {
      return false;
    }
  };
  const STY = ["fill", "stroke", "stroke-width", "fill-opacity", "stroke-opacity", "opacity", "fill-rule", "clip-rule", "stroke-linecap", "stroke-linejoin", "color"];
  const svgString = (svg) => {
    const c = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll("*")];
    const dst = [c, ...c.querySelectorAll("*")];
    src.forEach((e, i) => {
      const t = dst[i];
      const cs = getComputedStyle(e);
      for (const p of STY) {
        const v = cs.getPropertyValue(p);
        if (v) t.style?.setProperty(p, v);
      }
      t.removeAttribute("class");
    });
    // Pull in <use>/gradient/clip targets that live outside the svg.
    const ids = new Set();
    for (const e of dst) {
      const h = e.getAttribute("href") || e.getAttribute("xlink:href");
      if (h?.startsWith("#")) ids.add(h.slice(1));
      const blob = `${e.getAttribute("style") || ""} ${e.getAttribute("fill") || ""} ${e.getAttribute("clip-path") || ""} ${e.getAttribute("mask") || ""}`;
      for (const m of blob.matchAll(/url\(\s*["']?#([^)"'\s]+)/g)) ids.add(m[1]);
    }
    const missing = [...ids].filter((id) => !c.querySelector(`#${CSS.escape(id)}`));
    if (missing.length) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      for (const id of missing) {
        const t = document.getElementById(id);
        if (t) defs.appendChild(t.cloneNode(true));
      }
      c.insertBefore(defs, c.firstChild);
    }
    const r = svg.getBoundingClientRect();
    if (!c.getAttribute("viewBox")) {
      try {
        const b = svg.getBBox();
        c.setAttribute("viewBox", `${b.x} ${b.y} ${b.width} ${b.height}`);
      } catch {
        c.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      }
    }
    c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    c.setAttribute("width", String(Math.round(r.width)));
    c.setAttribute("height", String(Math.round(r.height)));
    return new XMLSerializer().serializeToString(c);
  };

  const candidates = [];
  for (const e of document.querySelectorAll("svg, img, [class*=logo i], [id*=logo i]")) {
    const tag = e.tagName.toLowerCase();
    if ((tag !== "svg" && tag !== "img") || !isVis(e)) continue;
    if (tag === "svg" && e.parentElement?.closest("svg")) continue;
    const r = docRect(e);
    if (r.w < 16 || r.h < 10 || r.w > 600 || r.h > 240) continue;
    let s = 0;
    const why = [];
    const home = e.closest("a");
    if (home && isHome(home)) (s += 4), why.push("home-link");
    let anc = e;
    for (let i = 0; i < 4 && anc && anc !== document.body; i++, anc = anc.parentElement) {
      if (logoRe.test(attrs(anc))) {
        s += 5;
        why.push("logo-attr");
        break;
      }
    }
    if (e.closest("header, nav")) (s += 3), why.push("in-header");
    if (r.y < 160) (s += 2), why.push("top");
    if (r.x < innerWidth * 0.3) (s += 1), why.push("left");
    if (tag === "svg" && /logo/i.test(e.querySelector("title")?.textContent || "")) (s += 4), why.push("svg-title");
    if (badRe.test(attrs(e)) || (e.closest("button") && !why.includes("logo-attr"))) (s -= 6), why.push("penalty");
    if (s < 5) continue;
    candidates.push({
      score: s,
      why,
      tag,
      rect: r,
      label: clean(e.getAttribute("aria-label") || e.getAttribute("alt") || home?.getAttribute("aria-label") || ""),
      src: tag === "img" ? e.currentSrc || e.src : null,
      svg: tag === "svg" ? svgString(e) : null,
    });
  }
  candidates.sort((a, b) => b.score - a.score || b.rect.w * b.rect.h - a.rect.w * a.rect.h);

  const icons = [...document.querySelectorAll('link[rel*=icon i]')].map((l) => ({ rel: l.rel, href: l.href, sizes: l.getAttribute("sizes"), type: l.type }));

  return {
    finalUrl: location.href,
    copy,
    colors: { bgs, inks, ctaBgs, headingInk, cssVars },
    fonts: { fam: Object.entries(fam).sort((a, b) => b[1] - a[1]).slice(0, 10), faces, fontFiles },
    sections,
    logo: { candidates: candidates.slice(0, 6), icons },
    ogImage: meta('meta[property="og:image"]'),
  };
}

// ------------------------------------------------------------------ node side

const extOf = (url, type) => {
  const t = (type || "").toLowerCase();
  if (t.includes("svg")) return "svg";
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("icon") || t.includes("ico")) return "ico";
  const m = /\.(svg|png|webp|jpe?g|ico|gif|woff2?|ttf|otf)(\?|#|$)/i.exec(url);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "bin";
};

/** Download through the page's own context so cookies/referrer match. */
const fetchInPage = async (page, url) => {
  const res = await page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: "include" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(s), type: r.headers.get("content-type") || "" };
  }, url);
  return { buf: Buffer.from(res.b64, "base64"), type: res.type };
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "section";

const main = async () => {
  const executablePath = chromePath();
  if (!executablePath) throw new Error("No Chrome found. Set CHROME_PATH or run `npx puppeteer browsers install chrome`.");
  const browser = await puppeteer.launch({ headless: true, executablePath, defaultViewport: VIEWPORT });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    );
    console.error(`loading ${startUrl}`);
    await page.goto(startUrl, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(800);
    const clicked = await page.evaluate(pageDismiss);
    if (clicked) console.error(`dismissed consent: "${clicked}"`);
    await page.evaluate(pageScroll);
    await sleep(300);

    const X = await page.evaluate(pageExtract, maxSections);

    // ---- screens
    const screens = [];
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);
    await page.screenshot({ path: path.join(out, "screens", "00-hero.png") });
    screens.push({ file: "screens/00-hero.png", y: 0, label: "above the fold" });
    for (const [i, s] of X.sections.entries()) {
      const y = Math.max(0, s.y - 40);
      await page.evaluate((yy) => scrollTo(0, yy), y);
      await sleep(450);
      const file = `screens/${String(i + 1).padStart(2, "0")}-${slugify(s.label)}.png`;
      await page.screenshot({ path: path.join(out, file) });
      screens.push({ file, y, label: s.label || null });
    }

    // ---- targeted blocks: --selector=<css>, --find=<text>[|<text>...]
    const targets = [];
    if (typeof flags.selector === "string") targets.push({ kind: "selector", q: flags.selector });
    if (typeof flags.find === "string")
      for (const q of flags.find.split("|").map((s) => s.trim()).filter(Boolean)) targets.push({ kind: "find", q });
    for (const [i, t] of targets.entries()) {
      const el =
        t.kind === "selector" ? await page.$(t.q) : (await page.evaluateHandle(pageFindSection, t.q)).asElement();
      if (!el) {
        warn(`nothing found for --${t.kind}="${t.q}"`);
        continue;
      }
      await el.scrollIntoView();
      await sleep(450);
      const file = `screens/s${i + 1}-${slugify(t.q)}.png`;
      await el.screenshot({ path: path.join(out, file) });
      screens.push({ file, label: t.q, target: t.kind });
    }
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(300);

    // ---- logo: real file only
    const logo = { file: null, source: null, candidates: X.logo.candidates.map(({ svg, ...c }) => c), favicon: null, appIcon: null };
    for (const f of fs.readdirSync(path.join(out, "logo"))) fs.unlinkSync(path.join(out, "logo", f));
    for (const c of X.logo.candidates) {
      try {
        if (c.svg) {
          fs.writeFileSync(path.join(out, "logo", "logo.svg"), c.svg);
          logo.file = "logo/logo.svg";
          logo.source = `inline <svg> (${c.why.join(", ")})`;
        } else if (c.src) {
          const { buf, type } = await fetchInPage(page, c.src);
          const ext = extOf(c.src, type);
          if (ext === "bin" || ext === "ico") throw new Error(`unusable type ${type}`);
          fs.writeFileSync(path.join(out, "logo", `logo.${ext}`), buf);
          logo.file = `logo/logo.${ext}`;
          logo.source = `<img> ${c.src} (${c.why.join(", ")})`;
        }
        if (logo.file) break;
      } catch (e) {
        // Fallback for this candidate: a transparent screenshot of exactly the element.
        try {
          await page.evaluate((y) => scrollTo(0, Math.max(0, y - 100)), c.rect.y);
          await sleep(200);
          const scrollY = await page.evaluate(() => scrollY);
          await page.screenshot({
            path: path.join(out, "logo", "logo.png"),
            omitBackground: true,
            clip: { x: c.rect.x, y: c.rect.y - scrollY, width: c.rect.w, height: c.rect.h },
          });
          logo.file = "logo/logo.png";
          logo.source = `element screenshot (download failed: ${e.message})`;
          warn(`logo saved as a screenshot, not the source file: ${e.message}`);
          break;
        } catch (e2) {
          warn(`logo candidate failed: ${e2.message}`);
        }
      }
    }
    const pickIcon = (pred) =>
      X.logo.icons.filter(pred).sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))[0];
    const fav = pickIcon((i) => /svg/.test(i.type) || /\.svg(\?|$)/.test(i.href)) || pickIcon((i) => !/apple|mask/i.test(i.rel));
    const apple = pickIcon((i) => /apple-touch/i.test(i.rel));
    for (const [item, name, key] of [[fav, "favicon", "favicon"], [apple, "app-icon", "appIcon"]]) {
      if (!item) continue;
      try {
        const { buf, type } = await fetchInPage(page, item.href);
        if (buf.length < 100) throw new Error("empty placeholder icon");
        const f = `logo/${name}.${extOf(item.href, type)}`;
        fs.writeFileSync(path.join(out, f), buf);
        logo[key] = f;
        if (key === "favicon") logo.faviconSource = "linked by the page";
      } catch (e) {
        warn(`${name} download failed: ${e.message}`);
      }
    }
    // No linked favicon: try the site's /favicon.ico, then Google's favicon service (it
    // returns a generic globe for unknown sites, so look at the file before using it).
    if (!logo.favicon) {
      const { origin, hostname } = new URL(X.finalUrl);
      const fallbacks = [
        [`${origin}/favicon.ico`, "site /favicon.ico"],
        [`https://www.google.com/s2/favicons?domain=${hostname}&sz=256`, "Google favicon service (check it is not the generic globe)"],
      ];
      for (const [u, source] of fallbacks) {
        try {
          const r = await fetch(u);
          const type = r.headers.get("content-type") || "";
          if (!r.ok || !/image|icon/i.test(type)) throw new Error(`HTTP ${r.status} ${type}`);
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 100) throw new Error("empty file");
          const f = `logo/favicon.${extOf(u, type)}`;
          fs.writeFileSync(path.join(out, f), buf);
          logo.favicon = f;
          logo.faviconSource = source;
          break;
        } catch (e) {
          warn(`favicon fallback ${source} failed: ${e.message}`);
        }
      }
    }
    if (!logo.file) warn("no logo found on the page. Get the official mark from the brand's press kit; do not redraw it.");

    // ---- fonts (files only on request: check the licence first)
    const fontsOut = [];
    if (flags["download-fonts"]) {
      for (const u of [...new Set(X.fonts.fontFiles)].slice(0, 12)) {
        try {
          const { buf, type } = await fetchInPage(page, u);
          const name = decodeURIComponent(u.split("/").pop().split("?")[0]).replace(/[^\w.-]/g, "_");
          const f = `fonts/${name.includes(".") ? name : `${name}.${extOf(u, type)}`}`;
          fs.writeFileSync(path.join(out, f), buf);
          fontsOut.push(f);
        } catch (e) {
          warn(`font download failed (${u}): ${e.message}`);
        }
      }
    }

    // ---- colour roles
    const grounds = cluster(X.colors.bgs);
    const inks = cluster(X.colors.inks);
    const ctas = cluster(X.colors.ctaBgs);
    const ground = grounds[0]?.hex ?? "#ffffff";
    const theme = lum(ground) < 0.2 ? "dark" : "light";
    const ink = X.colors.headingInk ?? inks[0]?.hex ?? null;
    const inkSoft = inks.find((c) => c.hex !== ink && dist(c.hex, ink ?? "#000000") > 20)?.hex ?? null;
    const accentPool = cluster([
      ...ctas.filter((c) => chromatic(c.hex)).map((c) => ({ hex: c.hex, w: c.w * 3 })),
      ...Object.values(X.colors.cssVars).filter(chromatic).map((hex) => ({ hex, w: 5000 })),
      ...grounds.filter((c) => chromatic(c.hex)).map((c) => ({ hex: c.hex, w: c.w * 0.2 })),
      ...inks.filter((c) => chromatic(c.hex)).map((c) => ({ hex: c.hex, w: c.w * 2 })),
    ]);
    if (!accentPool.length) warn("no chromatic accent found: the brand may be monochrome. Keep the film monochrome too.");

    const totalBg = grounds.reduce((a, c) => a + c.w, 0) || 1;
    const totalInk = inks.reduce((a, c) => a + c.w, 0) || 1;
    const totalFam = X.fonts.fam.reduce((a, [, w]) => a + w, 0) || 1;

    const brand = {
      url: startUrl,
      finalUrl: X.finalUrl,
      slug,
      capturedAt: new Date().toISOString(),
      viewport: VIEWPORT,
      name:
        X.copy.siteName ||
        X.logo.candidates[0]?.label.replace(/\b(logo|home(page)?|go to|link|wordmark)\b/gi, "").trim() ||
        X.copy.title.split(/\s[|\u2013\u2014:-]\s/)[0] || null,
      theme,
      colors: {
        ground,
        surface: grounds.find((c) => c.hex !== ground)?.hex ?? null,
        ink,
        inkSoft,
        accents: accentPool.slice(0, 4).map((c) => c.hex),
        grounds: grounds.slice(0, 8).map((c) => ({ hex: c.hex, share: +(c.w / totalBg).toFixed(3) })),
        text: inks.slice(0, 8).map((c) => ({ hex: c.hex, share: +(c.w / totalInk).toFixed(3) })),
        ctaBackgrounds: ctas.slice(0, 4).map((c) => c.hex),
        cssVariables: X.colors.cssVars,
      },
      fonts: {
        inUse: X.fonts.fam.map(([k, w]) => {
          const [family, weight] = k.split("|");
          return { family, weight: Number(weight), share: +(w / totalFam).toFixed(3) };
        }),
        loadedFaces: X.fonts.faces,
        fileUrls: [...new Set(X.fonts.fontFiles)],
        downloaded: fontsOut,
      },
      logo,
      screens,
      ogImage: X.ogImage,
      copyFile: "copy.json",
      warnings,
    };

    fs.writeFileSync(path.join(out, "copy.json"), JSON.stringify(X.copy, null, 2));
    fs.writeFileSync(path.join(out, "brand.json"), JSON.stringify(brand, null, 2));

    console.log(
      JSON.stringify(
        {
          out: path.relative(process.cwd(), out),
          name: brand.name,
          theme,
          ground,
          ink,
          accents: brand.colors.accents,
          font: brand.fonts.inUse[0]?.family ?? null,
          logo: logo.file ? `${logo.file} <- ${logo.source}` : null,
          screens: screens.length,
          warnings: warnings.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
};

main().catch((e) => {
  console.error(`error: ${e.message}`);
  process.exit(1);
});
