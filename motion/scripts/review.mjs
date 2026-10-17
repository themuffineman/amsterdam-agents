#!/usr/bin/env node
// review.mjs: render a low-res draft, build a 4x4 contact sheet, compute the scriptable gates.
//
// Usage:  npm run review -- <compositionId> [--scale=0.5] [--no-render]
//
// Writes review/<id>/:
//   draft.mp4          low-res render (scale 0.5 by default)
//   sheet.jpg          16 evenly spaced frames in a 4x4 grid (the slop.md command)
//   frames/NN.jpg      the same 16 frames full-size, for a closer look at G1/G5
//   gates.json         numbers below; also copied to review/gates.json (latest run)
//
// Gates computed from the rendered pixels (never from source):
//   G0  decodes, not blank, picture moves, frame count matches the composition
//   G2  no run of more than 3 consecutive flat frames (near-uniform picture)
//   G3  end hold <= 1.4 s (trailing frames with ~no change); final shot <= 25% of the film
// G1, G4, G5 are judged by eye on sheet.jpg: describe every frame in one sentence.
//
// Thresholds are on 8-bit luma of a 160 px wide downscale. They are heuristics: a gate that
// fails is fixed, but read the numbers before trusting a pass.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: npm run review -- <compositionId> [--scale=0.5] [--no-render]");
  process.exit(1);
}
const scale = Number(flags.scale ?? 0.5);

const T = {
  flatStd: 4, // luma std-dev below this = flat / empty frame
  blankStd: 2, // whole-film "blank" check
  moveDiff: 0.6, // mean abs diff per pixel above this = the picture moved
  holdDiff: 0.25, // below this = held frame (for end hold)
  cutDiff: 18, // above this AND a spike vs neighbours = a cut
  maxFlatRun: 3,
  maxEndHoldS: 1.4,
  maxFinalShare: 0.25,
  minMovingShare: 0.1,
};

const dir = path.resolve("review", id);
fs.mkdirSync(path.join(dir, "frames"), { recursive: true });
const draft = path.join(dir, "draft.mp4");

const run = (cmd, argv, opts = {}) => {
  const r = spawnSync(cmd, argv, { encoding: opts.binary ? "buffer" : "utf8", maxBuffer: 1 << 30, shell: process.platform === "win32" && cmd === "npx", ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${argv.slice(0, 3).join(" ")} failed:\n${(r.stderr || "").toString().slice(-2000)}`);
  }
  return r;
};

// ------------------------------------------------------------------ 1. planned length

const listing = run("npx", ["remotion", "compositions", "src/index.ts"]).stdout;
// Rows look like: "<id>   30   1920x1080   300 (10.00 sec)"
const row = listing.split(/\r?\n/).find((l) => l.trim().split(/\s+/)[0] === id);
if (!row) {
  console.error(`composition "${id}" not found. Available:\n${listing}`);
  process.exit(1);
}
const m = /\s(\d+(?:\.\d+)?)\s+(\d+)x(\d+)\s+(\d+)\s/.exec(` ${row} `);
const plan = m ? { fps: Number(m[1]), width: Number(m[2]), height: Number(m[3]), frames: Number(m[4]) } : null;
if (!plan) console.error(`warn: could not parse composition row: ${row}`);

// ------------------------------------------------------------------ 2. render draft

if (!flags["no-render"]) {
  console.error(`rendering ${id} at scale ${scale} ...`);
  const t0 = Date.now();
  // Relative output path: npx runs through a shell on Windows, so avoid quoting issues.
  const rel = path.relative(process.cwd(), draft).split(path.sep).join("/");
  run("npx", ["remotion", "render", "src/index.ts", id, rel, `--scale=${scale}`, "--log=error"], { stdio: ["ignore", "inherit", "inherit"] });
  console.error(`rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
if (!fs.existsSync(draft)) {
  console.error(`no draft at ${draft}`);
  process.exit(1);
}

// ------------------------------------------------------------------ 3. probe + decode

const probe = JSON.parse(
  run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=width,height,nb_read_frames,r_frame_rate:format=duration", "-of", "json", draft]).stdout,
);
const st = probe.streams?.[0] ?? {};
const [fn, fd] = (st.r_frame_rate || "30/1").split("/").map(Number);
const fps = fn / (fd || 1);
const duration = Number(probe.format?.duration ?? 0);

const sw = 160;
const sh = Math.max(2, Math.round((sw * st.height) / st.width / 2) * 2);
const raw = run("ffmpeg", ["-v", "error", "-i", draft, "-vf", `scale=${sw}:${sh}:flags=area,format=gray`, "-f", "rawvideo", "-"], { binary: true }).stdout;
const px = sw * sh;
const n = Math.floor(raw.length / px);

const stats = [];
for (let f = 0; f < n; f++) {
  const off = f * px;
  let sum = 0;
  let sq = 0;
  let diff = 0;
  for (let i = 0; i < px; i++) {
    const v = raw[off + i];
    sum += v;
    sq += v * v;
    if (f > 0) diff += Math.abs(v - raw[off - px + i]);
  }
  const mean = sum / px;
  stats.push({ mean, std: Math.sqrt(Math.max(0, sq / px - mean * mean)), diff: f > 0 ? diff / px : 0 });
}

// ------------------------------------------------------------------ 4. gates

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// G0
const blankFrames = stats.filter((s) => s.std < T.blankStd).length;
const movingFrames = stats.slice(1).filter((s) => s.diff > T.moveDiff).length;
const movingShare = n > 1 ? movingFrames / (n - 1) : 0;
const lengthOk = plan ? Math.abs(n - plan.frames) <= 1 : null;
const G0 = {
  pass: n > 0 && blankFrames < n * 0.5 && movingShare >= T.minMovingShare && lengthOk !== false,
  decodedFrames: n,
  plannedFrames: plan?.frames ?? null,
  lengthMatches: lengthOk,
  durationS: round(duration),
  fps: round(fps, 3),
  blankFrames,
  movingFrames,
  movingShare: round(movingShare, 3),
};

// G2: longest run of flat frames
let run_ = 0;
let longest = 0;
let longestAt = -1;
for (let f = 0; f < n; f++) {
  if (stats[f].std < T.flatStd) {
    run_++;
    if (run_ > longest) {
      longest = run_;
      longestAt = f - run_ + 1;
    }
  } else run_ = 0;
}
const flatTotal = stats.filter((s) => s.std < T.flatStd).length;
const G2 = { pass: longest <= T.maxFlatRun, longestFlatRun: longest, longestFlatRunStartsAt: longestAt, flatFramesTotal: flatTotal };

// G3: end hold + final shot
let hold = 0;
for (let f = n - 1; f > 0 && stats[f].diff < T.holdDiff; f--) hold++;
const holdS = hold / fps;
const cuts = [];
for (let f = 1; f < n; f++) {
  const d = stats[f].diff;
  const near = [stats[f - 2]?.diff, stats[f - 1]?.diff, stats[f + 1]?.diff, stats[f + 2]?.diff].filter((v) => v !== undefined);
  const local = near.length ? Math.max(...near) : 0;
  if (d > T.cutDiff && d > local * 1.8) cuts.push(f);
}
const lastCut = cuts.length ? cuts[cuts.length - 1] : 0;
const finalShotFrames = n - lastCut;
const finalShare = n ? finalShotFrames / n : 1;
const G3 = {
  pass: holdS <= T.maxEndHoldS && finalShare <= T.maxFinalShare,
  endHoldFrames: hold,
  endHoldS: round(holdS),
  cutsDetected: cuts,
  finalShotStartsAt: lastCut,
  finalShotFrames,
  finalShotShare: round(finalShare, 3),
};

// ------------------------------------------------------------------ 5. contact sheet + frames

const sheet = path.join(dir, "sheet.jpg");
run("ffmpeg", ["-v", "error", "-y", "-i", draft, "-vf", `fps=16/${duration},scale=480:-1,tile=4x4`, "-frames:v", "1", "-q:v", "3", sheet]);
for (const f of fs.readdirSync(path.join(dir, "frames"))) fs.unlinkSync(path.join(dir, "frames", f));
run("ffmpeg", ["-v", "error", "-y", "-i", draft, "-vf", `fps=16/${duration}`, "-frames:v", "16", "-q:v", "3", path.join(dir, "frames", "%02d.jpg")]);
// Which source frame each sheet tile shows (the fps filter samples at the middle of each 1/16).
const sheetFrames = Array.from({ length: 16 }, (_, i) => Math.min(n - 1, Math.round(((i + 0.5) / 16) * n)));

// ------------------------------------------------------------------ 6. write + print

const result = {
  composition: id,
  draft: path.relative(process.cwd(), draft),
  sheet: path.relative(process.cwd(), sheet),
  sheetFrames,
  plan,
  renderScale: scale,
  thresholds: T,
  gates: { G0, G2, G3 },
  byEye: {
    G1: "readable UI object: text >= 0.04 H and >= 0.55 W (or cropped by the frame edge)",
    G4: "one hero per frame",
    G5: "no page chrome in the outer 12% band",
  },
  perFrame: stats.map((s, f) => ({ f, mean: round(s.mean, 1), std: round(s.std, 1), diff: round(s.diff, 2) })),
};
fs.writeFileSync(path.join(dir, "gates.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(path.resolve("review", "gates.json"), JSON.stringify(result, null, 2));

const mark = (p) => (p ? "PASS" : "FAIL");
console.log(`\n${id}: ${n} frames decoded, ${round(duration)} s @ ${round(fps, 2)} fps`);
console.log(`G0 ${mark(G0.pass)}  frames ${n}/${G0.plannedFrames ?? "?"}  blank ${blankFrames}  moving ${movingFrames} (${(movingShare * 100).toFixed(1)}%)`);
console.log(`G2 ${mark(G2.pass)}  longest flat run ${longest} f${longest ? ` (from f${longestAt})` : ""}  flat total ${flatTotal}`);
console.log(`G3 ${mark(G3.pass)}  end hold ${hold} f = ${round(holdS)} s  final shot ${finalShotFrames} f = ${(finalShare * 100).toFixed(1)}%  cuts at [${cuts.join(", ")}]`);
console.log(`sheet  ${result.sheet}  (tiles = frames ${sheetFrames.join(", ")})`);
console.log(`gates  review/${id}/gates.json`);
console.log("G1, G4, G5: look at the sheet and describe every frame in one sentence.");
