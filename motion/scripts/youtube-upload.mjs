#!/usr/bin/env node
// youtube-upload.mjs: upload a finished film straight to YouTube with its custom thumbnail
// (the studio's lib/youtubeUpload.ts, without the googleapis package: plain REST calls).
//
// Usage:  node scripts/youtube-upload.mjs <film>  [--privacy=public|unlisted|private] [--publish-at=<ISO time>]
//
// Reads src/films/<film>/post.json { title, description, videoUrl, thumbnailUrl, categoryId? }
// (public URLs, e.g. the renders-marketing/films/ bucket files). Needs GOOGLE_CLIENT_ID,
// GOOGLE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN (the studio's: the @sycamore-app channel's token
// from its /get-token page; GOOGLE_REFRESH_TOKEN is another channel). Buffer can't do this: it
// rejects custom thumbnails for YouTube. Writes the video id and URL back into post.json, and
// refuses to upload a film that already has one.
// In a cloud container run it with NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.replace(/^--/, "").split("=")));
const film = args.find((a) => !a.startsWith("--"));
if (!film) {
  console.error("usage: node scripts/youtube-upload.mjs <film> [--privacy=public] [--publish-at=<ISO>]");
  process.exit(1);
}
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
  console.error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN must be set");
  process.exit(1);
}
const postFile = path.resolve("src", "films", film, "post.json");
const post = JSON.parse(fs.readFileSync(postFile, "utf8"));
if (post.youtube?.videoId) {
  console.error(`already uploaded: ${post.youtube.url}`);
  process.exit(1);
}
const publishAt = flags["publish-at"] ? new Date(flags["publish-at"]) : null;
if (publishAt && !(publishAt.getTime() > Date.now())) throw new Error("--publish-at must be a time in the future");

const must = async (res, what) => {
  if (res.ok) return res;
  throw new Error(`${what} failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
};

// 1. An access token from the channel's refresh token
const tok = await must(
  await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token" }),
  }),
  "token",
).then((r) => r.json());
const auth = { Authorization: `Bearer ${tok.access_token}` };

// 2. The video: a resumable upload session, then the whole file in one PUT
const video = Buffer.from(await (await must(await fetch(post.videoUrl), "video download")).arrayBuffer());
const meta = {
  snippet: { title: post.title, description: post.description, categoryId: post.categoryId ?? "28" },
  status: {
    // YouTube only takes a publish time on a private video
    privacyStatus: publishAt ? "private" : (flags.privacy ?? "public"),
    ...(publishAt && { publishAt: publishAt.toISOString() }),
    selfDeclaredMadeForKids: false,
    embeddable: true,
  },
};
const session = await must(
  await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(video.length) },
    body: JSON.stringify(meta),
  }),
  "upload session",
);
const inserted = await must(
  await fetch(session.headers.get("location"), { method: "PUT", headers: { ...auth, "Content-Type": "video/mp4" }, body: video }),
  "video upload",
).then((r) => r.json());
const url = `https://www.youtube.com/watch?v=${inserted.id}`;
post.youtube = { videoId: inserted.id, url, privacyStatus: inserted.status?.privacyStatus, publishAt: inserted.status?.publishAt ?? null, uploadedAt: new Date().toISOString() };
fs.writeFileSync(postFile, JSON.stringify(post, null, 2) + "\n");
console.log(`uploaded ${url} (${post.youtube.privacyStatus})`);

// 3. The thumbnail. A failure here doesn't undo the upload (e.g. a channel not verified for custom thumbnails).
if (post.thumbnailUrl) {
  try {
    const img = await must(await fetch(post.thumbnailUrl), "thumbnail download");
    await must(
      await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${inserted.id}&uploadType=media`, {
        method: "POST",
        headers: { ...auth, "Content-Type": img.headers.get("content-type") ?? "image/jpeg" },
        body: Buffer.from(await img.arrayBuffer()),
      }),
      "thumbnail",
    );
    console.log("thumbnail set");
  } catch (e) {
    console.error(`uploaded, but the thumbnail wasn't set: ${e.message}`);
    process.exitCode = 2;
  }
}
