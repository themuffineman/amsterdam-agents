#!/usr/bin/env node
// narrate.mjs: one voice track + a word-level transcript, for "recreate" videos.
//
// Usage:  npm run narrate -- <film>          (after `npm run voice -- <film>`)
//
// Reads  src/films/<film>/script.json   segments in order; optional "pause" (seconds of silence
//                                       after the segment, default 0.5; 0 on the last)
//        src/films/<film>/voice.json    the clips `npm run voice` made
// Writes public/films/<film>/voice.wav  the clips joined with their pauses
//        src/films/<film>/transcript.json  faster-whisper word timings (the clock the
//                                       composition's TranscriptProvider reads)
// Then fixes what Whisper reliably mishears here ("Cloud"/"clod" -> Claude, "Claude code" ->
// Claude Code, a stray trailing "you") and prints the transcript, so you can check cue words
// (it may write "Step 2", "webpage", "changed": use the words it actually wrote as cues).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const film = process.argv[2];
if (!film) {
  console.error("usage: npm run narrate -- <film>");
  process.exit(1);
}
const srcDir = path.resolve("src", "films", film);
const pubDir = path.resolve("public", "films", film);
const script = JSON.parse(fs.readFileSync(path.join(srcDir, "script.json"), "utf8"));
const voice = JSON.parse(fs.readFileSync(path.join(srcDir, "voice.json"), "utf8"));

/** ffmpeg's concat list wants forward slashes. */
const toPosix = (p) => p.split(path.sep).join("/");

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || r.stdout || "").slice(-1500)}`);
  return r.stdout;
};

// 1. join the clips with their pauses (silence at the clips' own sample rate)
const first = path.resolve("public", voice.segments[script.segments[0].id].file);
const [rate, channels] = run("ffprobe", ["-v", "error", "-show_entries", "stream=sample_rate,channels", "-of", "csv=p=0", first]).trim().split(",");
const tmp = fs.mkdtempSync(path.join(pubDir, ".join-"));
const list = [];
script.segments.forEach((s, i) => {
  const clip = voice.segments[s.id];
  if (!clip) throw new Error(`voice.json has no clip "${s.id}": run npm run voice -- ${film}`);
  list.push(`file '${toPosix(path.resolve("public", clip.file))}'`);
  const pause = i === script.segments.length - 1 ? 0 : (s.pause ?? 0.5);
  if (pause > 0) {
    const gap = path.join(tmp, `gap-${i}.wav`);
    run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `anullsrc=r=${rate}:cl=${channels === "1" ? "mono" : "stereo"}`, "-t", String(pause), "-c:a", "pcm_s16le", gap]);
    list.push(`file '${toPosix(gap)}'`);
  }
});
fs.writeFileSync(path.join(tmp, "list.txt"), list.join("\n"));
const out = path.join(pubDir, "voice.wav");
run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), "-c:a", "pcm_s16le", out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.error(`voice.wav: ${run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).trim()} s`);

// 2. word timings
const transcriptFile = path.join(srcDir, "transcript.json");
const python = process.platform === "win32" ? "python" : "python3";
console.error("transcribing (faster-whisper) ...");
run(python, ["scripts/transcribe-words.py", out, transcriptFile, process.env.WHISPER_MODEL ?? "small.en"]);

// 3. known mishearings
const t = JSON.parse(fs.readFileSync(transcriptFile, "utf8"));
const w = t.words;
while (w.length && /^you\.?$/i.test(w[w.length - 1].text) && w[w.length - 1].end - w[w.length - 1].start < 0.25) w.pop();
// "Claude Code" heard as one word ("Clotcode", "Cloudcode"): split it back into two, sharing the time.
for (let i = w.length - 1; i >= 0; i--) {
  const m = /^(clot|cloud|claud|claude|clod)code([.,!?;:]*)$/i.exec(w[i].text);
  if (!m) continue;
  const mid = +((w[i].start + w[i].end) / 2).toFixed(3);
  w.splice(i, 1, { text: "Claude", start: w[i].start, end: mid }, { text: `Code${m[2]}`, start: mid, end: w[i].end });
}
w.forEach((x, i) => {
  const core = x.text.replace(/[.,!?;:]+$/, "");
  if (/^(cloud|clod|claud)$/i.test(core)) x.text = x.text.replace(core, "Claude");
  if (i && w[i - 1].text === "Claude" && /^code/i.test(x.text)) x.text = "Code" + x.text.slice(4);
});
fs.writeFileSync(transcriptFile, JSON.stringify(t, null, 1));
console.log(w.map((x) => x.text).join(" "));
