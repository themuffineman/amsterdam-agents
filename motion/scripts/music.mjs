#!/usr/bin/env node
// music.mjs: pick a background track for a film from the allowlist and prepare it.
//
// Usage:  npm run music -- <film> [--track=<id>] [--reroll]
//
// - Tracks come ONLY from src/lib/music-allowlist.json (the calm set from amsterdam's
//   background_music bank; phonk/trap/dancehall/Brazilian funk are excluded on purpose).
// - Without --track it picks one at random the first time, then keeps that pick on later runs
//   (so re-rendering doesn't change the song). --reroll picks a new random one.
// - Downloads once into public/music/<id>.mp3 (shared cache), measures it with ffmpeg, writes
//   src/films/<film>/music.json { id, name, file, durationSec, meanDb }.
//   The composition uses meanDb to set the bed level under the voice automatically.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const film = args.find((a) => !a.startsWith("--"));
const flag = (k) => args.find((a) => a.startsWith(`--${k}`));
if (!film) {
  console.error("usage: npm run music -- <film> [--track=<id>] [--reroll]");
  process.exit(1);
}

const allow = JSON.parse(fs.readFileSync("src/lib/music-allowlist.json", "utf8")).tracks;
const outFile = path.resolve("src", "films", film, "music.json");
const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, "utf8")) : null;

let track;
const forced = flag("track");
if (forced) {
  const id = Number(forced.split("=")[1]);
  track = allow.find((t) => t.id === id);
  if (!track) {
    console.error(`track ${id} is not in the allowlist (${allow.map((t) => t.id).join(", ")})`);
    process.exit(1);
  }
} else if (prev && !flag("reroll") && allow.some((t) => t.id === prev.id)) {
  track = allow.find((t) => t.id === prev.id);
} else {
  const pool = allow.filter((t) => t.id !== prev?.id);
  track = pool[Math.floor(Math.random() * pool.length)] ?? allow[0];
}

const rel = `music/${track.id}.mp3`;
const local = path.resolve("public", rel);
fs.mkdirSync(path.dirname(local), { recursive: true });
if (!fs.existsSync(local)) {
  console.error(`downloading ${track.name} ...`);
  const r = await fetch(track.url);
  if (!r.ok) throw new Error(`download failed: ${r.status}`);
  fs.writeFileSync(local, Buffer.from(await r.arrayBuffer()));
}

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", local], { encoding: "utf8" });
const durationSec = Number(probe.stdout.trim());
const vd = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", local, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
const meanDb = Number(/mean_volume: (-?[\d.]+) dB/.exec(vd.stderr)?.[1] ?? -16);

const out = { id: track.id, name: track.name, file: rel, durationSec: +durationSec.toFixed(2), meanDb };
fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n");
console.log(`${film}: ${track.name} (#${track.id}), ${durationSec.toFixed(1)} s, mean ${meanDb} dB -> ${path.relative(process.cwd(), outFile)}`);
