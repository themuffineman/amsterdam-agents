# AI news series: plan and status

Weekly (or shorter) AI news videos in the style of the "AI Search" YouTube channel: voiceover only,
and almost every shot is a real source: project pages, papers, GitHub/Hugging Face pages, the
page's own demo clips, highlighted text, benchmark tables with a column highlighted, creator
demos from X/Instagram, plus a few black-background explainer animations (3Blue1Brown-like
serif maths and diagrams) only where a concept needs one. Our own name and voice, not theirs.

## What the reference videos are made of (watched 2026-10-29)

- 40-45 min, 15-25 stories, each 1-3 min. Cold open: one line per headline over a quick clip
  ("OpenAI catches their first employee spy. Google finally releases...") then "let's jump right in".
- Narration is plain and points at the screen: "So here's an example of that", "if you look at
  this leaderboard by Artificial Analysis...", "they've already released it on Hugging Face".
  When a demo has sound (TTS samples, video with audio) the voice stops and it plays.
- Visuals, most to least: scrolling pages with a visible cursor; demo videos from those pages
  full screen or in grids; blue browser text selection on a phrase; benchmark tables with one
  column highlighted; leaderboards; creator clips; explainer animations (~10%); rare red text
  callouts ("162 are Lean verified").

## Pipeline

1. **Intake**: candidate stories daily (Hugging Face daily papers API
   `huggingface.co/api/daily_papers?sort=trending`, arXiv, GitHub trending, lab blogs, X, Reddit)
   into a studio queue; the user picks the week's list (studio `/news-gen`, not built).
2. **Story pack**: per story, capture its pages with `npm run news-page` (below) and the creator
   clips with `npm run watch`.
3. **Script + shot list**: narration per story, each sentence tied to a shot (JSON edit list).
4. **Voice**: `npm run voice` / `npm run narrate` (a story is a film: `src/films/news-<slug>/`).
5. **Assembly**: a generic `NewsSegment` composition plays the edit list. Shot types: `scroll`
   (pan the captured page between headings, cursor drawn), `highlight` (blue selection sweep over
   the captured text boxes), `table` (column/row box), `clip` (the page's video, full screen or in
   place on the page, its own audio with the voice paused), `still` (slow push-in), `explainer`,
   `callout`. Stories render separately and are joined with the cold open, so one story can be
   redone alone.
6. **Review**: like films (studio card per story, redo one, approve, post).

## Done

- `scripts/news-page.mjs` (`npm run news-page -- <url> <film> <name> [--highlight=..] [--column=..]
  [--row=..] [--no-videos] [--max-mb=250]`): the page as one tall screenshot (1280 CSS px at 1.5x =
  1920 px, fixed bars hidden, the top bar saved separately as `bar.png`), `text.md` (visible text:
  the only facts the script may use from it), and `page.json` with boxes in page CSS px for
  headings, highlight text (found with the browser's own find), table columns/rows, `<video>`
  and `<audio>` elements (files downloaded with curl), iframes and big images.
  Tested on huggingface.co/papers and hy-nomas.hy.tencent.com (8 demo clips placed on the page).

- `src/news/` (2026-10-29, cloud session): the generic renderer, tested on a local fixture page
  only (see Next: the Hy-Nomas pages couldn't be reached from the cloud container).
  - `types.ts` (page.json + story.json shapes), `stories.ts` (every `src/films/news-*/story.json`
    found by `require.context`, Root registers one composition per story with the folder name as
    its id; `timeline`: voice clip length, else ~2.6 words/s, + pause), `plan.ts` (pure camera /
    cursor / sweep / outline / clip numbers per segment; a segment starts where the last ended),
    `PageShot.tsx` (one camera group: page.png + in-place videos + selection + outline; bar.png
    on top unzoomed; arrow cursor in screen space, kept across cuts; full-screen clips grow out of
    their place on the page over black), `NewsSegment.tsx` (plays the edit list; voice clips when
    `voice.json` exists, else timed captions; series plan comment at the top).
  - Shot types in story.json: `scroll` (`to`/`from`: heading or highlight text, or a y; `zoom`),
    `highlight` (zooms so type is ~46 px, keeps the column's left edge, sweeps line by line),
    `column` / `row` (frames the table, red outline draws in 16 f), `clip` (`video` n, `full`,
    `from` s, `sound`; a segment with `"text": ""` and `seconds` is the voice pausing for the clip).
    Same page = the camera travels (length by distance); another page = hard cut, entering
    already moving. Not built yet: `still`, `explainer`, `callout`, audio samples, grids.
  - `npm run voice -- <film>` now reads story.json when there's no script.json (skips empty text).
  - `news-page.mjs` fixes: highlight boxes were offset by the scroll `window.find` makes (every
    highlight landed at the wrong y; now read per box); `--no-sandbox` as root and Chrome on
    `HTTPS_PROXY` (cloud containers). `remotion.config.ts`: `CHROME_PATH` also sets Remotion's
    browser (the cloud container's headless shell doesn't trust the proxy's CA; full Chromium does).
  - Fixture: `scripts/fixtures/news-test-page.html` + `src/films/news-fixture/` (placeholder
    copy; its README says how to serve and capture it). Review of `news-fixture` (40.7 s draft):
    G0 pass (1220/1220 frames, 46% moving), G2 pass (no flat frames), G3 FAIL by the script
    (final shot 64.8%: the fixture is one page, so the camera never hard-cuts and the review
    sees one long shot; the last planned shot is 4 s; end hold 0 s). By eye: G1 pass on the
    highlight and table shots (type ~43-46 px), G4 one hero per frame, G5 no chrome except the
    stand-in captions.

- **Hy-Nomas story** (2026-10-29, cloud session): `src/films/news-hy-nomas/` (story.json, voice.json,
  voice clips in `public/films/news-hy-nomas/audio/`), 117.6 s, 19 segments over 3 pages. Facts only from
  the three text.md files. Capture (pages stay local, re-run to get them):
  `npm run news-page -- https://hy-nomas.hy.tencent.com/ news-hy-nomas project "--highlight=Generate up to 60 seconds of continuous video|carries objects, environmental details, and spatial context through a changing viewpoint"`
  (default --max-mb: the promo is v01 and over 100 MB),
  `npm run news-page -- https://huggingface.co/papers/2610.36729 news-hy-nomas paper --no-videos "--highlight=an 8B diffusion backbone that supports free-form text instructions and continuous camera control across multiple interaction turns|We release model weights, code and benchmarks|Our model supports the exactly same features as Genie4"`,
  `npm run news-page -- https://github.com/Tencent-Hunyuan/Hy-Nomas news-hy-nomas github --no-videos "--highlight=It runs on a single RTX 4090 with low-memory inference|real-time 720p generation on a v6e-4 slice (4 chips)"`.
  Review (2nd pass, draft at 0.5): G0 pass (3526/3526 frames, 38% moving), G2 pass (no flat
  frames), G3 pass (end hold 0 s, final shot 7.8%). By eye: G1 pass on the highlight shots; the
  scroll shots (specs block, paper abstract at 1.4x, GitHub contributions at 1.35x, gallery) are
  smaller than 43 px type. G4 one hero per frame. G5 no chrome (no captions now there is voice).
  Weak: the Genie4 and TPU highlights crop the line's left edge (the column-edge rule loses to
  the zoom); the specs shot is a zoom-1 page; the backend TTS failed (502) every run, so the clips
  came from the OpenRouter fallback below.
  - `voice.mjs`: when `/internal/tts` fails and `OPENROUTER_API_KEY` is in `.env`, it calls the same
    model on OpenRouter directly (`/api/v1/audio/speech`), one request per sentence, one at a time
    (parallel requests hit 402 "in_flight_budget_exhausted" on a low balance), and trims silence
    with ffmpeg. In a cloud container Node needs `NODE_USE_ENV_PROXY=1
    NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` for fetch to use the proxy.
  - `newsMetadata` no longer throws for a story whose pages aren't captured. It used to stop
    every composition from listing (review/render of any film). That story now throws when it is
    rendered.
  - github.com pages: curl through the cloud session's git proxy gets 403, but Chrome got the
    page (2026-10-29).

- **Genie 4 story** (2026-10-29, cloud session): `src/films/news-genie-4/`, 89.3 s, 15 segments.
  Picked for popularity and pictures, after checking HF trending, X, YouTube roundups and news
  search: Google's X post had 1M views in two days, and TechCrunch and the Google blog covered it.
  Pages: DeepMind post (8 demo clips with their own sound),
  Google's X post, TechCrunch. Capture:
  `npm run news-page -- https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/ news-genie-4 deepmind --max-mb=80 "--highlight=use natural language to modify a simulation in real-time|Genie 4 is our first real-time world model to generate audio natively|We have started rolling Genie 4 out as a research preview for trusted testers"`,
  `npm run news-page -- https://x.com/Google/status/2115114426827501782 news-genie-4 x --max-mb=80`,
  `npm run news-page -- https://techcrunch.com/2026/10/27/googles-genie-4-world-model-adds-audio-more-realistic-worlds-and-real-time-steering/ news-genie-4 techcrunch --no-videos "--highlight=It can maintain a consistent scene for up to two minutes, double its predecessor’s limit|acting as the director that plans steps and checks frames while Genie creates the visuals"`.
  Review (2nd pass): G0 pass (2677/2677, 42% moving), G2 pass, G3 pass (end hold 0 s, final shot
  13.2%). By eye: G1 pass on the highlights and the full-screen demos; the X post's "1M Views"
  is small. Its text.md stops partway down the DeepMind page, past the audio section.
  TechCrunch's infinite scroll swaps the page title for the next article (the text and top of
  page.png are the right one). Three of the four voiceless clips play with their own sound.
  - Renderer: a full-screen clip right after another full-screen clip now hard-cuts in at full
    size (`clip.cut`), instead of dropping back to the page and growing again.

- **Posting** (2026-10-29): final = local `npx remotion render` at 1080p + ffmpeg `loudnorm` to -14
  LUFS. The mp4 and thumbnail go in `gs://androme/renders-marketing/films/`, and their URLs plus the
  title and description are in `src/films/<film>/post.json`. Buffer can't post it: it rejects a custom
  thumbnail for YouTube ("social networks do not accept custom video thumbnail images"), and
  Zernio's YouTube account is another channel (sycamore-to, not @sycamore-app). Upload directly
  with `node scripts/youtube-upload.mjs <film>`, which needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  and YOUTUBE_REFRESH_TOKEN (the studio's). Genie 4 is waiting on those.
  Its thumbnail is a real frame from the saxophone demo, with "GENIE 4 / Steer a world with words".

## Next

- **Re-capture Hy-Nomas before rendering it on another machine.** Its pages are gitignored. The capture commands are under Done.
- Renderer: G3's "final shot" heuristic counts camera travel as one shot; real stories cut
  between pages, so check it on Hy-Nomas. Captions sit over the bottom of the page (a stand-in
  until there's voice). Word timings (`npm run narrate`) to land a sweep on its word instead of
  `at` seconds. Shot types not built: still, explainer, callout, audio sample, clip grid.
- Notes: the promo video on Hy-Nomas is over 80 MB (`--max-mb`). Videos cost bandwidth: use
  `--no-videos` when only the page is needed. Captured pages (`public/films/news-*/pages/`) are
  other sites' material and stay local (gitignored); re-run the capture to get them.

## Open questions for the user

1. Length and cadence: weekly 30-45 min roundup, daily 8-10 min, or one story per Short?
2. Voice: the existing TTS voice, a clone of the user's voice, or another?
3. Story choice: the user picks from a ranked queue, or the agent picks and the user reviews?
4. Brand: Sycamore channel with a plug line, or a separate news brand?
