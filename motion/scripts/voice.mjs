#!/usr/bin/env node
// voice.mjs: turn a film's narration script into one audio clip per segment.
//
// Usage:  npm run voice -- <film>          e.g. npm run voice -- best-times
//
// Reads  src/films/<film>/script.json   { voice, model, prompt, segments: [{ id, text }] }
//        (or story.json, a news story: same fields, plus a shot per segment)
// Writes public/films/<film>/audio/<id>.wav   (downloaded clips)
//        src/films/<film>/voice.json          { segments: { <id>: { file, durationSec, marks } } }
//
// TTS goes through the Sycamore backend's /internal/tts (same endpoint amsterdam's tutorial
// pages use): Gemini TTS per segment, silence trimmed, one clip each. Needs
// SYCAMORE_BACKEND_URL and SYCAMORE_INTERNAL_API_KEY in .env.
// If the backend fails and OPENROUTER_API_KEY is set, the same model is called on OpenRouter
// directly (/api/v1/audio/speech, raw 24 kHz PCM), silence trimmed here with ffmpeg.
//
// Marks: write {name} right before a word in the script text, e.g. "then {t2}Wednesday".
// Marks are removed before TTS. Their position is estimated as the fraction of characters
// spoken before them (no word timestamps yet), and the composition uses it to land visuals
// on the word. Good to within a few frames for even-paced speech.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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
// A news story's story.json is a script too (its segments have a shot each); segments with no
// text (a clip playing with the voice paused) get no clip.
const scriptFile = ["script.json", "story.json"].map((f) => path.join(srcDir, f)).find((f) => fs.existsSync(f));
if (!scriptFile) throw new Error(`no script.json or story.json in src/films/${film}`);
const script = JSON.parse(fs.readFileSync(scriptFile, "utf8"));
script.segments = script.segments.filter((s) => s.text && s.text.trim());

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

const out = { film, voice: script.voice, model: script.model, createdAt: new Date().toISOString(), segments: {} };
const save = (id, file, durationSec) => {
  const p = parsed.find((x) => x.id === id);
  out.segments[id] = { file, durationSec, marks: p?.marks ?? {} };
};

/** The backend: all clips in one request. Returns false (with the reason logged) if it failed. */
const viaBackend = async () => {
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
    return false;
  }
  for (const clip of body.clips) {
    const r = await fetch(clip.url);
    if (!r.ok) throw new Error(`download failed for ${clip.id}: ${r.status}`);
    const file = `films/${film}/audio/${clip.id}.wav`;
    fs.writeFileSync(path.resolve("public", file), Buffer.from(await r.arrayBuffer()));
    save(clip.id, file, clip.durationSec);
  }
  return true;
};

// Leading/trailing silence off (the backend trims too), 24 kHz mono PCM -> wav.
const TRIM = "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse";

/** OpenRouter directly, one request per clip, one at a time (parallel requests reserve credit
 *  up front, and a low balance answers 402 "in_flight_budget_exhausted"). */
const viaOpenRouter = async (orKey) => {
  const one = async (p) => {
    for (let attempt = 1; ; attempt++) {
      const r = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${orKey}` },
        body: JSON.stringify({ model: script.model, input: p.clean, voice: script.voice }),
      });
      if (r.ok) {
        const pcm = path.join(audioDir, `${p.id}.pcm`);
        const file = `films/${film}/audio/${p.id}.wav`;
        fs.writeFileSync(pcm, Buffer.from(await r.arrayBuffer()));
        const ff = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, "-af", TRIM, path.resolve("public", file)]);
        fs.rmSync(pcm);
        if (ff.status !== 0) throw new Error(`ffmpeg failed for ${p.id}: ${ff.stderr}`);
        const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve("public", file)]);
        save(p.id, file, +Number(String(probe.stdout).trim()).toFixed(3));
        return;
      }
      const err = await r.text();
      if (attempt >= 3) throw new Error(`openrouter tts failed for ${p.id} (${r.status}): ${err.slice(0, 300)}`);
      await new Promise((res) => setTimeout(res, 4000 * attempt));
    }
  };
  for (const p of parsed) await one(p);
};

console.error(`requesting ${parsed.length} clips (${script.voice}, ${script.model}) ...`);
const t0 = Date.now();
if (!(await viaBackend())) {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) process.exit(1);
  console.error("trying OpenRouter directly ...");
  await viaOpenRouter(orKey);
}
console.error(`tts done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
out.segments = Object.fromEntries(parsed.filter((p) => out.segments[p.id]).map((p) => [p.id, out.segments[p.id]]));
fs.writeFileSync(path.join(srcDir, "voice.json"), JSON.stringify(out, null, 2));

const total = Object.values(out.segments).reduce((a, s) => a + s.durationSec, 0);
for (const [id, s] of Object.entries(out.segments)) console.log(`${id.padEnd(7)} ${s.durationSec.toFixed(2)} s`);
console.log(`total speech ${total.toFixed(1)} s -> src/films/${film}/voice.json`);
