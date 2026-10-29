// PageShot: one segment of a news story on one captured web page, drawn like a screen
// recording: the page pans and zooms as ONE camera group (page.png + its in-place videos +
// selection + outline), the site's own bar stays on top unzoomed (bar.png, as a browser keeps a
// sticky header), and the cursor is its own top layer in screen space. Everything comes from
// plan.ts numbers and useCurrentFrame() (frame 0 = the segment's first frame).
//
// Grammar for the whole series: smooth 30 fps clock, crisp (no blur), one cursor (arrow only),
// the browser's own blue for text selection, ONE accent (red, #E5372B) meaning "look here",
// used only for table outlines.
import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { tween } from "../lib/eases";
import { H, W, barPx, lerpCam, pxPer, toScreen, type Cam, type SegPlan } from "./plan";
import type { Box, PageData } from "./types";

export const ACCENT = "#E5372B";
const SELECTION = "rgba(50, 132, 255, 0.36)";

export const cameraAt = (plan: SegPlan, f: number): Cam => {
  if (f < plan.move) return lerpCam(plan.from, plan.to, tween(f, 0, plan.move, 0, 1, plan.moveEase));
  return lerpCam(plan.to, plan.end, tween(f, plan.move, Math.max(1, plan.frames - plan.move), 0, 1, "cruise"));
};

/** How much of each line the selection covers at frame f (left to right, line by line). */
const sweepRects = (rects: Box[], p: number) => {
  const total = rects.reduce((a, r) => a + r.w, 0);
  let left = p * total;
  return rects.map((r) => {
    const w = Math.max(0, Math.min(r.w, left));
    left -= r.w;
    return { ...r, w };
  });
};

const Arrow: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg
    width={44}
    height={44}
    viewBox="0 0 24 24"
    style={{ position: "absolute", left: x - 6, top: y - 3, transform: `scale(${press})`, transformOrigin: "6px 3px", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}
  >
    <path d="M5.5 3.2 L5.5 19.6 L9.6 15.7 L12.3 21.4 L15 20.2 L12.4 14.6 L18.2 14.6 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
  </svg>
);

export const PageShot: React.FC<{ page: PageData; plan: SegPlan }> = ({ page, plan }) => {
  const f = useCurrentFrame();
  const S = pxPer(page);
  const B = barPx(page);
  const cam = cameraAt(plan, f);
  const clip = plan.clip;

  // Full-screen clip: the video's own rectangle grows from where it sits on the page to fill the
  // frame (the carried object of that cut), over a black ground that comes up with it.
  const grow = clip?.full ? tween(f, clip.expandAt, 14, 0, 1, "softLand") : 0;
  const vBox = clip ? clip.video : null;
  let full: { x: number; y: number; w: number; h: number } | null = null;
  if (clip?.full && vBox && f >= clip.expandAt) {
    const a = toScreen(page, cam, vBox);
    const aw = vBox.w * S * cam.z;
    const ah = vBox.h * S * cam.z;
    const k = Math.min(W / vBox.w, H / vBox.h);
    const fw = vBox.w * k;
    const fh = vBox.h * k;
    full = { x: a.x + ((W - fw) / 2 - a.x) * grow, y: a.y + ((H - fh) / 2 - a.y) * grow, w: aw + (fw - aw) * grow, h: ah + (fh - ah) * grow };
  }
  const video = clip ? (
    <OffthreadVideo
      src={staticFile(clip.video.file)}
      startFrom={Math.round(clip.fromSec * 30)}
      muted={!clip.sound}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  ) : null;

  // Cursor: screen space; glides to its aim as the camera lands, rides the sweep, squeezes on click.
  let cursor: { x: number; y: number } | null = null;
  if (plan.cursorTo) {
    const from = plan.cursorFrom ?? { x: W + 60, y: plan.cursorTo.y + 140 };
    const t = tween(f, plan.cursorAt, 18, 0, 1, "softInOut");
    cursor = { x: from.x + (plan.cursorTo.x - from.x) * t, y: from.y + (plan.cursorTo.y - from.y) * t };
  }
  const sw = plan.sweep;
  const sweepP = sw ? tween(f, sw.at, sw.frames, 0, 1, "softInOut") : 0;
  if (sw && f >= sw.at) {
    const rs = sweepRects(sw.rects, sweepP);
    const cur = [...rs].reverse().find((r) => r.w > 0) ?? rs[0];
    cursor = toScreen(page, cam, { x: cur.x + cur.w, y: cur.y + cur.h / 2 });
  }
  if (full && grow > 0.05) cursor = null;
  // A click on the clip before it plays full screen.
  const press = clip?.full ? 1 - 0.18 * Math.max(0, 1 - Math.abs(f - (clip.expandAt - 2)) / 3) : 1;

  const outline = plan.outline;
  const draw = outline ? tween(f, outline.at, 16, 0, 1, "softLand") : 0;
  const pad = 5;

  return (
    <AbsoluteFill style={{ backgroundColor: "#fff", overflow: "hidden" }}>
      {/* the camera group: page, in-place video, selection, outline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: page.height * S,
          transformOrigin: "0 0",
          transform: `scale(${cam.z}) translate(${-cam.x * S}px, ${-cam.y * S}px)`,
        }}
      >
        <Img src={staticFile(page.page)} style={{ position: "absolute", left: 0, top: 0, width: W, height: page.height * S }} />
        {video && !full ? (
          <div style={{ position: "absolute", left: vBox!.x * S, top: vBox!.y * S, width: vBox!.w * S, height: vBox!.h * S, overflow: "hidden", borderRadius: 4 }}>{video}</div>
        ) : null}
        {sw && f >= sw.at
          ? sweepRects(sw.rects, sweepP).map((r, i) =>
              r.w > 0 ? (
                <div key={i} style={{ position: "absolute", left: r.x * S, top: (r.y - 1) * S, width: r.w * S, height: (r.h + 2) * S, background: SELECTION, mixBlendMode: "multiply" }} />
              ) : null,
            )
          : null}
        {outline && f >= outline.at ? (
          <svg style={{ position: "absolute", left: (outline.box.x - pad) * S, top: (outline.box.y - pad) * S, overflow: "visible" }} width={(outline.box.w + pad * 2) * S} height={(outline.box.h + pad * 2) * S}>
            <rect
              x={0}
              y={0}
              width={(outline.box.w + pad * 2) * S}
              height={(outline.box.h + pad * 2) * S}
              rx={6}
              fill="none"
              stroke={ACCENT}
              strokeWidth={4 / cam.z}
              pathLength={1}
              strokeDasharray={`${draw} 1`}
            />
          </svg>
        ) : null}
      </div>
      {page.bar ? <Img src={staticFile(page.bar.file)} style={{ position: "absolute", left: 0, top: 0, width: W, height: B }} /> : null}
      {full ? (
        <>
          <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${grow})` }} />
          <div style={{ position: "absolute", left: full.x, top: full.y, width: full.w, height: full.h, overflow: "hidden" }}>{video}</div>
        </>
      ) : null}
      {cursor ? <Arrow x={cursor.x} y={cursor.y} press={press} /> : null}
    </AbsoluteFill>
  );
};
