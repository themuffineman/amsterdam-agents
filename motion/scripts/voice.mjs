#!/usr/bin/env node
// voice.mjs: turn a film's narration script into one audio clip per segment.
//
// Usage:  npm run voice -- <film>          e.g. npm run voice -- best-times
//
// Reads  src/films/<film>/script.json   { voice, model, prompt, segments: [{ id, text }] }
// Writes public/films/<film>/audio/<id>.wav   (downloaded clips)
//        src/films/<film>/voice.json          { segments: { <id>: { file, durationSec, marks } } }
//
// TTS goes through the Sycamore backend's /internal/tts (same endpoint amsterdam's tutorial
// pages use): Gemini TTS per segment, silence trimmed, one clip each. Needs
// SYCAMORE_BACKEND_URL and SYCAMORE_INTERNAL_API_KEY in .env.
//
// Marks: write {name} right before a word in the script text, e.g. "then {t2}Wednesday".
// Marks are removed before TTS. Their position is estimated as the fraction of characters
// spoken before them (no word timestamps yet), and the composition uses it to land visuals
// on the word. Good to within a few frames for even-paced speech.

import fs from "node:fs";
import path from "node:path";

const film = process.argv[2];
if (!film) {
  console.error("usage: npm run voice -- <film>");
  process.exit(1);
}
const base = process.env.SYCAMORE_BACKEND_URL;
const key = process.env.SYCAMORE_INTERNAL_API_KEY;
if (!base || !key) {
  console.error("SYCAMORE_BACKEND_URL and SYCAMORE_INTERNAL_API_KEY must be set (.env)");
  process.exit(1);
}

const srcDir = path.resolve("src", "films", film);
const audioDir = path.resolve("public", "films", film, "audio");
fs.mkdirSync(audioDir, { recursive: true });
const script = JSON.parse(fs.readFileSync(path.join(srcDir, "script.json"), "utf8"));

const MARK = /\{([a-z0-9_-]+)\}/gi;

/** Strip marks; return clean text + each mark's character fraction. */
const parse = (text) => {
  const marks = {};
  let clean = "";
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    clean += text.slice(last, m.index);
    marks[m[1]] = clean.length; // position in the clean text
    last = m.index + m[0].length;
  }
  clean += text.slice(last);
  const n = clean.length || 1;
  for (const k of Object.keys(marks)) marks[k] = +(marks[k] / n).toFixed(4);
  return { clean: clean.replace(/\s+/g, " ").trim(), marks };
};

const parsed = script.segments.map((s) => ({ id: s.id, ...parse(s.text) }));

console.error(`requesting ${parsed.length} clips (${script.voice}, ${script.model}) ...`);
const t0 = Date.now();
const res = await fetch(`${base.replace(/\/$/, "")}/internal/tts`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": key },
  body: JSON.stringify({
    segments: parsed.map((p) => ({ id: p.id, text: p.clean })),
    voice: script.voice,
    model: script.model,
    prompt: script.prompt,
  }),
});
const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`tts failed (${res.status}): ${body?.detail ?? res.statusText}`);
  process.exit(1);
}
console.error(`tts done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const out = { film, voice: script.voice, model: script.model, createdAt: new Date().toISOString(), segments: {} };
for (const clip of body.clips) {
  const r = await fetch(clip.url);
  if (!r.ok) throw new Error(`download failed for ${clip.id}: ${r.status}`);
  const file = `films/${film}/audio/${clip.id}.wav`;
  fs.writeFileSync(path.resolve("public", file), Buffer.from(await r.arrayBuffer()));
  const p = parsed.find((x) => x.id === clip.id);
  out.segments[clip.id] = { file, durationSec: clip.durationSec, marks: p?.marks ?? {} };
}
fs.writeFileSync(path.join(srcDir, "voice.json"), JSON.stringify(out, null, 2));

const total = Object.values(out.segments).reduce((a, s) => a + s.durationSec, 0);
for (const [id, s] of Object.entries(out.segments)) console.log(`${id.padEnd(7)} ${s.durationSec.toFixed(2)} s`);
console.log(`total speech ${total.toFixed(1)} s -> src/films/${film}/voice.json`);
