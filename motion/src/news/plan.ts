// plan.ts: turns a story's shots into numbers PageShot draws: for each segment where the camera
// starts and lands, where the cursor goes, when the selection sweeps or the outline draws.
// Pure (story + page.json boxes + timeline in, plain objects out), so every frame is a function
// of the frame number, and a segment's start state is the previous segment's end state.
//
// Coordinates: page CSS px. Camera {x, y, z}: the page point at the frame's top-left, and the
// zoom (1 = the page's own 1280 CSS px across the 1920 px frame). The site's bar covers the top
// of the frame as in a browser (at y 0 it sits exactly on the page's own header), so framing
// uses the part below it.
import type { Box, PageData, Segment, Shot, Target } from "./types";
import type { Timed } from "./stories";

export const W = 1920;
export const H = 1080;
export type Cam = { x: number; y: number; z: number };
export type Pt = { x: number; y: number };

/** Film px per page CSS px at zoom 1. */
export const pxPer = (p: PageData) => W / p.width;
/** Height of the site's bar in film px (kept on top like a browser keeps the page's header). */
export const barPx = (p: PageData) => (p.bar ? p.bar.h * pxPer(p) : 0);
const viewW = (p: PageData, z: number) => p.width / z;
/** Page CSS px hidden under the bar, and visible below it, at zoom z. */
const underBar = (p: PageData, z: number) => barPx(p) / (pxPer(p) * z);
const viewH = (p: PageData, z: number) => (H - barPx(p)) / (pxPer(p) * z);

export const clampCam = (p: PageData, c: Cam): Cam => {
  const z = Math.max(1, c.z);
  return {
    z,
    x: Math.min(Math.max(0, c.x), Math.max(0, p.width - viewW(p, z))),
    y: Math.min(Math.max(0, c.y), Math.max(0, p.height - H / (pxPer(p) * z))),
  };
};

/** Camera with page point `f` at screen fraction (ax, ay) of the view. */
const around = (p: PageData, f: Pt, z: number, ax = 0.5, ay = 0.45): Cam =>
  clampCam(p, { z, x: f.x - viewW(p, z) * ax, y: f.y - underBar(p, z) - viewH(p, z) * ay });

/** Page point -> film px on screen, for camera c. */
export const toScreen = (p: PageData, c: Cam, pt: Pt): Pt => ({
  x: (pt.x - c.x) * pxPer(p) * c.z,
  y: (pt.y - c.y) * pxPer(p) * c.z,
});

export const lerpCam = (a: Cam, b: Cam, t: number): Cam => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

const bbox = (rs: Box[]): Box => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
};
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const fail = (seg: Segment, msg: string): never => {
  throw new Error(`story segment "${seg.id}": ${msg}`);
};

/** A heading or highlight whose text contains `t`, or a page y. */
const resolveY = (p: PageData, t: Target, seg: Segment): { y: number; box: Box | null } => {
  if (typeof t === "number") return { y: t, box: null };
  const n = norm(t);
  const h = p.headings.find((x) => norm(x.text).includes(n)) ?? p.headings.find((x) => n.includes(norm(x.text)) && x.text.length > 3);
  if (h) return { y: h.y, box: h };
  const m = p.highlights.find((x) => norm(x.text) === n && x.rects.length);
  if (m) return { y: m.rects[0].y, box: bbox(m.rects) };
  return fail(seg, `no heading or highlight "${t}" on page "${seg.shot.page}" (headings: ${p.headings.map((x) => x.text.slice(0, 30)).join(" | ")})`);
};

const marked = (list: PageData["highlights"], text: string, kind: string, seg: Segment) =>
  list.find((x) => norm(x.text) === norm(text) && x.rects.length) ??
  fail(seg, `no --${kind}="${text}" in page.json for "${seg.shot.page}": re-run npm run news-page with it`);

/** Type size to aim for when zooming onto text: G1 wants text >= 0.04 H (43 px). A line's
 *  selection box is ~1.18x its font size. */
const TEXT_PX = 46;

export interface SegPlan {
  frames: number;
  page: string;
  from: Cam;
  to: Cam;
  /** where the camera ends (`to` + a bounded drift); the next segment starts here */
  end: Cam;
  move: number;
  moveEase: "softInOut" | "softLand";
  cursorFrom: Pt | null; // screen px; null = enters from off screen
  cursorTo: Pt | null; // null = hidden (full-screen clip)
  cursorAt: number;
  sweep: { at: number; frames: number; rects: Box[] } | null;
  outline: { at: number; box: Box } | null;
  /** `cut`: a full-screen clip right after another one starts full size (a hard cut between
   *  clips), instead of dropping back to the page and growing out of it again. */
  clip: { video: PageData["videos"][number]; full: boolean; expandAt: number; fromSec: number; sound: boolean; cut: boolean } | null;
}

/** Where the cursor sits when it is just reading along (screen px). */
const REST: Pt = { x: W * 0.72, y: H * 0.62 };

const targetOf = (p: PageData, shot: Shot, seg: Segment, prev: Cam | null) => {
  const S = pxPer(p);
  switch (shot.type) {
    case "scroll": {
      const z = shot.zoom ?? 1;
      if (shot.to === undefined) return { cam: clampCam(p, prev ?? { x: 0, y: 0, z }), aim: null as Pt | null };
      const r = resolveY(p, shot.to, seg);
      const cam = clampCam(p, { z, x: r.box ? r.box.x + r.box.w / 2 - viewW(p, z) / 2 : 0, y: r.y - underBar(p, z) - viewH(p, z) * 0.14 });
      const aim = r.box ? { x: r.box.x + Math.min(r.box.w, 520) + 24, y: r.box.y + r.box.h * 0.6 } : null;
      return { cam, aim };
    }
    case "highlight": {
      const m = marked(p.highlights, shot.highlight, "highlight", seg);
      const b = bbox(m.rects);
      const lineH = Math.max(...m.rects.map((r) => r.h));
      const z = clamp(Math.min(TEXT_PX / ((lineH / 1.18) * S), (W * 0.86) / (b.w * S)), 1, 2.4);
      // Keep the text column's left edge in view (lines read from there), taken from the
      // nearest heading above, as long as the whole phrase still fits.
      const head = [...p.headings].reverse().find((h) => h.y < b.y);
      const c = around(p, { x: b.x + b.w / 2, y: b.y + b.h / 2 }, z);
      const left = head ? Math.max(head.x - 28, b.x + b.w + 28 - viewW(p, z)) : c.x;
      return { cam: clampCam(p, { ...c, x: Math.min(c.x, left) }), aim: { x: m.rects[0].x, y: m.rects[0].y + m.rects[0].h / 2 } };
    }
    case "column":
    case "row": {
      const m = shot.type === "column" ? marked(p.columns, shot.column, "column", seg) : marked(p.rows, shot.row, "row", seg);
      const t = m.table ?? m.rects[0];
      const z = clamp(Math.min((W * 0.92) / (t.w * S), (H - barPx(p) - 90) / (t.h * S)), 1, 2.2);
      const r = m.rects[0];
      // Keep the table in view; lean towards the marked column/row when the table is wider than the view.
      const f = { x: t.w * S * z > W ? r.x + r.w / 2 : t.x + t.w / 2, y: t.h * S * z > H * 0.8 ? r.y + Math.min(r.h, 160) / 2 : t.y + t.h / 2 };
      return { cam: around(p, f, z, 0.5, 0.5), aim: shot.type === "column" ? { x: r.x + r.w * 0.72, y: r.y + 16 } : { x: r.x + r.w * 0.9, y: r.y + r.h / 2 } };
    }
    case "clip": {
      const v = p.videos[shot.video - 1] ?? fail(seg, `page "${shot.page}" has ${p.videos.length} videos, no video ${shot.video}`);
      const z = clamp(Math.min((W * 0.8) / (v.w * S), (H - barPx(p) - 70) / (v.h * S)), 1, 2.2);
      return { cam: around(p, { x: v.x + v.w / 2, y: v.y + v.h / 2 }, z, 0.5, 0.5), aim: { x: v.x + v.w * 0.83, y: v.y + v.h * 0.78 } };
    }
  }
};

/** Frames for the camera to travel a distance (film px on screen): longer trips take longer. */
const travel = (p: PageData, a: Cam, b: Cam, min: number, max: number) => {
  const d = Math.hypot((b.x - a.x) * pxPer(p) * b.z, (b.y - a.y) * pxPer(p) * b.z) + Math.abs(b.z - a.z) * 600;
  return Math.round(clamp(min + d / 45, min, max));
};

export const planStory = (segments: Segment[], pages: Record<string, PageData>, times: Timed[]): SegPlan[] => {
  const out: SegPlan[] = [];
  let cam: Cam | null = null;
  let pageName: string | null = null;
  let cursor: Pt | null = null;
  segments.forEach((seg, i) => {
    const shot = seg.shot;
    const p = pages[shot.page] ?? fail(seg, `page "${shot.page}" isn't captured (public/films/<film>/pages/${shot.page}/page.json)`);
    const frames = times[i].frames;
    const samePage = pageName === shot.page && cam !== null;
    const { cam: to, aim } = targetOf(p, shot, seg, samePage ? cam : null);

    // Entering a page (story start or a cut from another page): start already moving, a little
    // below where it lands, and land on softLand. Same page: travel from where the last one ended.
    let from: Cam;
    let move: number;
    let moveEase: SegPlan["moveEase"] = "softInOut";
    if (shot.type === "scroll" && shot.from !== undefined) {
      const r = resolveY(p, shot.from, seg);
      from = clampCam(p, { z: to.z, x: to.x, y: r.y - underBar(p, to.z) - viewH(p, to.z) * 0.14 });
      move = Math.max(12, frames - 8); // a reading scroll across the whole sentence
    } else if (!samePage) {
      from = clampCam(p, { ...to, y: to.y + 90 / to.z, z: to.z * 1.04 });
      move = 16;
      moveEase = "softLand";
    } else {
      from = cam!;
      move = shot.type === "scroll" ? travel(p, from, to, 24, Math.min(80, frames - 6)) : travel(p, from, to, 16, 36);
    }
    move = Math.max(1, Math.min(move, frames - 2));

    const S = pxPer(p);
    // Bounded drift after landing (rules.md law 7): ~10 px on screen and +1.2% scale over the rest.
    const end = clampCam(p, { z: to.z * 1.012, x: to.x + (viewW(p, to.z) - viewW(p, to.z * 1.012)) / 2, y: to.y + 7 / to.z + (H / (S * to.z) - H / (S * to.z * 1.012)) / 2 });

    let sweep: SegPlan["sweep"] = null;
    let outline: SegPlan["outline"] = null;
    let clip: SegPlan["clip"] = null;
    const at = (s: { at?: number }, dflt: number) => Math.min(frames - 4, s.at !== undefined ? Math.round(s.at * 30) : dflt);
    if (shot.type === "highlight") {
      const m = marked(p.highlights, shot.highlight, "highlight", seg);
      const chars = shot.highlight.length;
      sweep = { at: at(shot, move + 5), frames: Math.round(clamp(chars * 0.55, 14, 42)), rects: m.rects };
    }
    if (shot.type === "column" || shot.type === "row") {
      const m = shot.type === "column" ? marked(p.columns, shot.column, "column", seg) : marked(p.rows, shot.row, "row", seg);
      outline = { at: at(shot, move + 4), box: m.rects[0] };
    }
    if (shot.type === "clip") {
      const v = p.videos[shot.video - 1];
      const cut = !!shot.full && !!out[out.length - 1]?.clip?.full;
      clip = { video: v, full: !!shot.full, expandAt: cut ? 0 : samePage ? Math.min(move + 2, 20) : 6, fromSec: shot.from ?? 0, sound: shot.sound ?? !seg.text, cut };
    }

    // Cursor: travels in screen space from where it was to the thing the sentence is about.
    const aimScreen = aim ? toScreen(p, to, aim) : (cursor ?? REST);
    const cursorTo = clip?.full ? null : aimScreen;
    out.push({ frames, page: shot.page, from, to, end, move, moveEase, cursorFrom: cursor, cursorTo, cursorAt: Math.max(2, move - 12), sweep, outline, clip });
    if (sweep) {
      const last = sweep.rects[sweep.rects.length - 1];
      cursor = toScreen(p, end, { x: last.x + last.w, y: last.y + last.h / 2 });
    } else cursor = cursorTo ?? cursor;
    cam = end;
    pageName = shot.page;
  });
  return out;
};
