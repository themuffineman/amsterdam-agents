#!/usr/bin/env node
// cloud.mjs: render a composition on Modal instead of this machine.
//
// Usage:  npm run cloud -- <CompositionId>            bundle, upload, render, download
//         npm run cloud -- --prune [keep]             delete old film bundles (default keep 10)
//
// Steps:
//  1. Bundle this project (webpack, same as the Studio) into a temp folder.
//  2. Read the composition's size, fps and length from that bundle.
//  3. Upload the bundle to gs://androme/marketing-bundles/films-<id>-<time>/
//     (the "films-" prefix keeps it out of the backend's "newest tutorial-* bundle" pick).
//  4. Ask the marketing Modal app to render it (parallel picture chunks + one audio pass).
//  5. Download the result and normalise loudness for YouTube -> out/<id>.mp4.
//  6. Upload that final file to gs://androme/renders-marketing/films/ (public) and write its
//     URL to out/<id>.json, so the studio can post it (the cloud film agent reads it).
//
// Needs GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS_JSON (or _B64) and MODAL_RENDER_TOKEN,
// read from the environment, this project's .env, then sycamore-mono/backend/.env (next to
// the amsterdam-agents folder) for anything missing.
// Remotion here must match the Modal renderer's version (4.0.520), or the render fails.

import { bundle } from "@remotion/bundler";
import { selectComposition } from "@remotion/renderer";
import { Storage } from "@google-cloud/storage";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------- env

/** Minimal .env reader: fills only keys that aren't set yet. */
const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
};
loadEnv(path.resolve(".env"));
// This project lives in amsterdam-agents/motion; sycamore-mono sits next to amsterdam-agents.
loadEnv(path.resolve("../../sycamore-mono/backend/.env"));

const SUBMIT_URL = process.env.MODAL_MARKETING_SUBMIT_URL ?? "https://pendorastudios--marketing-submit-render.modal.run";
const STATUS_URL = process.env.MODAL_MARKETING_STATUS_URL ?? "https://pendorastudios--marketing-get-render-status.modal.run";
const PREFIX = "marketing-bundles/films-";
const UPLOAD_CONCURRENCY = 6;
const TIMEOUT_MIN = 40;

const need = (k) => {
  if (!process.env[k]) {
    console.error(`${k} is not set (environment, .env or sycamore-mono/backend/.env)`);
    process.exit(1);
  }
  return process.env[k];
};

const storageBucket = () => {
  const raw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_B64
      ? Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_B64, "base64").toString("utf8")
      : "");
  if (!raw) need("GOOGLE_APPLICATION_CREDENTIALS_JSON");
  const credentials = JSON.parse(raw);
  return new Storage({ credentials, projectId: credentials.project_id }).bucket(need("GCS_BUCKET"));
};

// ---------------------------------------------------------------- helpers

const secs = (t0) => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

const listFiles = (dir) =>
  fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return fs.statSync(p).isDirectory() ? listFiles(p) : [p];
  });

const uploadAll = async (bucket, dir, prefix) => {
  const files = listFiles(dir).filter((f) => !f.endsWith(".map")); // source maps aren't needed to render
  const bytes = files.reduce((n, f) => n + fs.statSync(f).size, 0);
  let next = 0;
  await Promise.all(
    Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
      while (next < files.length) {
        const file = files[next++];
        const destination = `${prefix}/${path.relative(dir, file).split(path.sep).join("/")}`;
        for (let attempt = 1; ; attempt++) {
          try {
            // Each bundle has its own prefix, so a file at a given URL never changes
            await bucket.upload(file, { destination, resumable: false, metadata: { cacheControl: "public, max-age=31536000, immutable" } });
            break;
          } catch (e) {
            if (attempt >= 5) throw e;
            await new Promise((r) => setTimeout(r, 2000 * attempt));
          }
        }
      }
    }),
  );
  return { count: files.length, mb: bytes / 1e6 };
};

/** Delete all but the newest `keep` film bundles (names sort by time). Never touches tutorial-* bundles. */
const prune = async (bucket, keep) => {
  const [, , res] = await bucket.getFiles({ prefix: PREFIX, delimiter: "/", autoPaginate: false });
  const prefixes = (res?.prefixes ?? []).sort((a, b) => a.slice(-16).localeCompare(b.slice(-16)));
  const old = prefixes.slice(0, Math.max(0, prefixes.length - keep));
  for (const p of old) {
    await bucket.deleteFiles({ prefix: p });
    console.log(`deleted ${p}`);
  }
  console.log(`kept ${prefixes.length - old.length} of ${prefixes.length} film bundles`);
};

// ---------------------------------------------------------------- main

const args = process.argv.slice(2);
if (args[0] === "--prune") {
  const keep = Number(args[1] ?? 10);
  if (!Number.isInteger(keep) || keep < 1) throw new Error("--prune needs a number, e.g. --prune 10");
  await prune(storageBucket(), keep);
  process.exit(0);
}

const id = args[0];
if (!id) {
  console.error("usage: npm run cloud -- <CompositionId>   |   npm run cloud -- --prune [keep]");
  process.exit(1);
}
const token = need("MODAL_RENDER_TOKEN");
const bucket = storageBucket();
const tStart = Date.now();

// 1. bundle
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "motion-bundle-"));
let serveUrl;
let comp;
try {
  let t = Date.now();
  const local = await bundle({ entryPoint: path.resolve("src/index.ts"), outDir });
  console.log(`bundled in ${secs(t)}`);

  // 2. composition metadata (size, fps, length) straight from the bundle
  t = Date.now();
  comp = await selectComposition({ serveUrl: local, id, inputProps: {}, logLevel: "error" });
  console.log(`${id}: ${comp.width}x${comp.height} @ ${comp.fps} fps, ${comp.durationInFrames} frames (${(comp.durationInFrames / comp.fps).toFixed(1)} s) [${secs(t)}]`);

  // 3. upload
  t = Date.now();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const prefix = `${PREFIX}${id.toLowerCase()}-${stamp}`;
  const up = await uploadAll(bucket, outDir, prefix);
  serveUrl = `https://storage.googleapis.com/${bucket.name}/${prefix}/index.html`;
  console.log(`uploaded ${up.count} files, ${up.mb.toFixed(1)} MB in ${secs(t)}`);
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

// 4. render on Modal
let t = Date.now();
const submit = await fetch(SUBMIT_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-modal-token": token },
  body: JSON.stringify({
    composition_id: id,
    total_frames: comp.durationInFrames,
    input_props: {},
    width: comp.width,
    height: comp.height,
    fps: comp.fps,
    serve_url: serveUrl,
  }),
});
if (!submit.ok) {
  console.error(`Modal submit failed (${submit.status}): ${await submit.text()}`);
  process.exit(1);
}
const { job_id: jobId } = await submit.json();
console.log(`rendering on Modal (job ${jobId}) ...`);

let videoUrl;
const deadline = Date.now() + TIMEOUT_MIN * 60_000;
while (!videoUrl) {
  if (Date.now() > deadline) {
    console.error(`no result after ${TIMEOUT_MIN} min (job ${jobId})`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 5000));
  // A failed poll (network blip, Modal cold start) is not a failed render
  const s = await fetch(`${STATUS_URL}?job_id=${encodeURIComponent(jobId)}`, { headers: { "x-modal-token": token } })
    .then((r) => r.json())
    .catch(() => null);
  if (s?.status === "done") videoUrl = s.public_url;
  else if (s?.status === "failed") {
    console.error(`render failed:\n${s.error}`);
    process.exit(1);
  }
}
console.log(`rendered in ${secs(t)}`);

// 5. download + loudness
t = Date.now();
fs.mkdirSync("out", { recursive: true });
const raw = `out/${id}.cloud-raw.mp4`;
const final = `out/${id}.mp4`;
const res = await fetch(videoUrl);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
const norm = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", final], { stdio: "inherit" });
if (norm.status !== 0) {
  console.error(`ffmpeg (loudness) failed: ${norm.error?.message ?? `exit ${norm.status}`}. Is ffmpeg installed? The raw render is at ${videoUrl}`);
  process.exit(norm.status ?? 1);
}
fs.unlinkSync(raw);
console.log(`downloaded + normalised in ${secs(t)}`);

// 6. the final (normalised) file, public, for posting
t = Date.now();
const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
const destination = `renders-marketing/films/${id.toLowerCase()}-${stamp}.mp4`;
await bucket.upload(final, { destination, resumable: true, metadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000, immutable" } });
const url = `https://storage.googleapis.com/${bucket.name}/${destination}`;
fs.writeFileSync(
  `out/${id}.json`,
  JSON.stringify({ id, url, width: comp.width, height: comp.height, fps: comp.fps, durationSec: +(comp.durationInFrames / comp.fps).toFixed(2) }, null, 2),
);
console.log(`uploaded in ${secs(t)}`);
console.log(`\n${final}  (total ${((Date.now() - tStart) / 60000).toFixed(1)} min)\nurl: ${url}`);
