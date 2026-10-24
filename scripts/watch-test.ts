// Tests watch_video on real posts (videos that failed in production on 2026-10-24, when
// yt-dlp was blocked): which way each transcript came, or why none did. Free, writes nothing.
// Runs on a GitHub runner from .github/workflows/watch-test.yml (that's where IP blocks bite);
// totals show as notes on the run's page.
//   node scripts/watch-test.ts [url ...]

import { watch } from "../src/tools/watch.ts";

const urls = process.argv.slice(2).length ? process.argv.slice(2) : [
  "https://www.youtube.com/watch?v=whKQaJeQdvA",
  "https://www.youtube.com/shorts/p6dHrxavAH8",
  "https://www.youtube.com/watch?v=zkJoRU8_HlA",
  "https://www.tiktok.com/@mikaylarainauthor/video/7681114930707172638",
  "https://www.tiktok.com/@alex.aster/video/7315179455465393438",
];

let ok = 0;
for (const url of urls) {
  const t0 = Date.now();
  try {
    const { text, transcript, failures } = await watch(url);
    const secs = Math.round((Date.now() - t0) / 1000);
    if (transcript) ok++;
    const line = transcript
      ? `${url}: ${transcript.chunks.length} chunks, ${transcript.source}, ${secs}s`
      : `${url}: NO transcript (${failures.join("; ") || "no failures recorded"}), ${secs}s`;
    console.log(`${transcript ? "::notice" : "::warning"}::${line}`);
    console.log(text.split("\n").slice(0, 2).join("\n"), "\n", text.split("## Transcript")[1]?.slice(0, 300), "\n");
  } catch (e) {
    console.log(`::error::${url}: ${(e as Error).message}`);
  }
}
console.log(`::notice::${ok}/${urls.length} videos got a transcript`);
