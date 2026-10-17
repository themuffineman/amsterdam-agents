#!/usr/bin/env node
// final.mjs: full-resolution render, then loudness-normalise the mix for YouTube.
//
// Usage:  npm run final -- <compositionId>
// Writes  out/<id>.mp4   (video stream copied untouched; audio normalised to -14 LUFS,
//                         true peak <= -1.5 dBTP, AAC 192k)
// Run `npm run review -- <id>` on the draft first; this is the slow one.

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const id = process.argv[2];
if (!id) {
  console.error("usage: npm run final -- <compositionId>");
  process.exit(1);
}
fs.mkdirSync("out", { recursive: true });
const raw = `out/${id}.raw.mp4`;
const final = `out/${id}.mp4`;

const run = (cmd, argv) => {
  const r = spawnSync(cmd, argv, { stdio: "inherit", shell: process.platform === "win32" && cmd === "npx" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const t0 = Date.now();
run("npx", ["remotion", "render", "src/index.ts", id, raw, "--log=error"]);
console.error(`rendered in ${((Date.now() - t0) / 60000).toFixed(1)} min, normalising audio ...`);
run("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", final]);
fs.unlinkSync(raw);

const m = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", final, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
// Read from the Summary block: per-frame log lines before it also contain "I:" (-70 at the silent start).
const summary = m.stderr.split("Summary:").pop() ?? "";
const I = /I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1];
const P = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary.split("True peak").pop() ?? "")?.[1];
console.log(`${final}: integrated ${I} LUFS, true peak ${P} dBFS`);
