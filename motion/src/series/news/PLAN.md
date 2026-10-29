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

## Next

- First story: **Hy-Nomas** (Tencent, interactive world generation, 2026-10-26):
  https://hy-nomas.hy.tencent.com/ , https://github.com/Tencent-Hunyuan/Hy-Nomas ,
  https://huggingface.co/papers/2610.36729 . Write the script from the captured `text.md` files.
- `src/news/PageShot.tsx` + `NewsSegment` composition reading `src/films/news-<slug>/story.json`.
- Notes: Chrome needs network outside the Claude Code sandbox; the promo video on Hy-Nomas is
  over 80 MB. Videos cost bandwidth: use `--no-videos` when only the page is needed. Captured
  pages (`public/films/news-*/pages/`) are other sites' material and stay local (gitignored);
  re-run the capture to get them.

## Open questions for the user

1. Length and cadence: weekly 30-45 min roundup, daily 8-10 min, or one story per Short?
2. Voice: the existing TTS voice, a clone of the user's voice, or another?
3. Story choice: the user picks from a ranked queue, or the agent picks and the user reviews?
4. Brand: Sycamore channel with a plug line, or a separate news brand?
