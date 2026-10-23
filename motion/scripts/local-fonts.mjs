#!/usr/bin/env node
// local-fonts.mjs: the licensed fonts that can't go in this public repo (Feature Display), kept
// in the project's GCS bucket instead, so the cloud film agent renders with them too.
//
// Usage:  npm run fonts -- upload      public/fonts/local/* -> gs://<GCS_BUCKET>/motion-assets/fonts/
//         npm run fonts -- download    the reverse (the film runner does this before each film)
//
// Needs GCS_BUCKET and GOOGLE_APPLICATION_CREDENTIALS_JSON (or _B64), read like cloud.mjs: the
// environment, this project's .env, then sycamore-mono/backend/.env. Fails loudly: a missing font
// must stop the job, not fall back to another typeface.
import { Storage } from "@google-cloud/storage";
import fs from "node:fs";
import path from "node:path";

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
loadEnv(path.resolve("../../sycamore-mono/backend/.env"));

const action = process.argv[2];
if (action !== "upload" && action !== "download") {
  console.error("usage: npm run fonts -- upload | download");
  process.exit(1);
}
const need = (k) => {
  if (!process.env[k]) throw new Error(`${k} is not set`);
  return process.env[k];
};
const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ?? Buffer.from(need("GOOGLE_APPLICATION_CREDENTIALS_JSON_B64"), "base64").toString("utf8");
const credentials = JSON.parse(raw);
const bucket = new Storage({ credentials, projectId: credentials.project_id }).bucket(need("GCS_BUCKET"));

const PREFIX = "motion-assets/fonts/";
const DIR = path.resolve("public", "fonts", "local");

if (action === "upload") {
  const files = fs.readdirSync(DIR).filter((f) => /\.(otf|ttf|woff2?)$/i.test(f));
  if (!files.length) throw new Error(`no fonts in ${DIR}`);
  for (const f of files) {
    await bucket.upload(path.join(DIR, f), { destination: PREFIX + f, resumable: false });
    console.log(`uploaded ${f}`);
  }
} else {
  const [objects] = await bucket.getFiles({ prefix: PREFIX });
  const fonts = objects.filter((o) => !o.name.endsWith("/"));
  if (!fonts.length) throw new Error(`no fonts at gs://${bucket.name}/${PREFIX} (run npm run fonts -- upload locally)`);
  fs.mkdirSync(DIR, { recursive: true });
  for (const o of fonts) {
    await o.download({ destination: path.join(DIR, path.basename(o.name)) });
    console.log(`downloaded ${path.basename(o.name)}`);
  }
}
