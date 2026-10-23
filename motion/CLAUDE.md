# motion (formerly sycamore-motion)

Remotion project for the explainer films posted on Sycamore's channels. Lives in the public
`amsterdam-agents` repo (moved from the standalone `sycamore-motion` repo, 2026-10-17), so it can be run
by the cloud agents as well as locally. Not a consumer app, never hosted. Goal: videos that don't look
AI-made. Work from this folder (`cd motion`): it has its own `package.json`, `node_modules`, `.env` and
`.claude/skills`.

## Rules for any video work

1. **Read the motion-craft skill first** (`.claude/skills/motion-craft/SKILL.md`, then the
   reference files it names for the job: always `director.md`, `rules.md`, `slop.md`).
2. **Plan as events, not states.** For each beat write what moves, what it causes, and what
   carries across the cut. Name the one screenshot-worthy frame (frame number + beat) before
   building. Put the plan in a comment at the top of the composition file.
3. **Real material only.** Use captured screens, logos, copy and numbers (`brand/<slug>/` from
   `npm run brand -- <url> <slug>`, or another real source you cite in the plan). Never invent
   UI, names, stats or testimonials. Run brand capture only on the official site of a product
   the film actually talks about (or a site the user names), and cite the URL in the plan.
   See "Research tools" below.
4. **Never hand-write easing.** Import from `src/lib/eases.ts` (or the re-exports and presets
   in `src/lib/tokens.ts`): `tween`, `enter`, `exit`, `staggerOnsets`, `cameraSnap`, `dive`.
5. **Frame-deterministic code only.** Everything is a pure function of `useCurrentFrame()`.
   No CSS transitions/animations, no `useEffect`/`useState`-driven animation, no
   framer-motion, no `Math.random()` (use `random(seed)` from `remotion`), no `Date.now()`, no
   DOM measuring that changes after the first frame.
6. **Stills before the full render.** Render the hardest beat first:
   `npx remotion still src/index.ts <id> out/<name>.png --frame=<n>` and look at it.
7. **Review after every render:** `npm run review -- <id>`. Read `review/<id>/gates.json`,
   open `review/<id>/sheet.jpg`, describe every frame in one sentence, judge G1/G4/G5 by eye.
8. **Two review passes max.** Fix the top three problems, review once more, stop.
9. **Report honestly.** Give the gate numbers and what is still weak. Never write
   "verified" or "perfect".

## The "recreate" series

Videos for the prompt -> motion graphic tutorial series (sycamore.to/motion templates rebuilt with
Claude Code) have their own look and motion: read `src/series/recreate/SERIES.md` before building
one. Its rules override the general motion-craft defaults where they differ (3D tilts, speed-ramp
transitions, Alte Haas + Feature Display only). Its voice pipeline: `npm run voice -- <slug>`, then
`npm run narrate -- <slug>` (joined voice.wav + faster-whisper word timings, the video's clock).

## Layout

- `src/Root.tsx`: composition list. Use presets from `src/lib/presets.ts`
  (`LANDSCAPE` 1920x1080, `PORTRAIT` 1080x1920, both 30 fps).
- `src/compositions/`: one file per film.
- `src/lib/`: `eases.ts` (measured curves, motionmaxxing Apache-2.0), `tokens.ts` (neutral
  placeholder palette, type scale by role, spacing, motion presets), `fonts.ts` (Inter
  variable, loaded before render; failure cancels the render), `presets.ts`.
- `src/ui-kit/`: presentational components derived from Databuddy (AGPL-3.0, attribution in
  each file; licence in `src/ui-kit/LICENSE-AGPL-3.0`). This repo is public, so these files are published
  under AGPL-3.0 with their notices: keep the headers. Theme them per
  subject via the `theme` prop; animate them via their props (`reveal`, `fill`, `progress`,
  `rowStyle`).
- `src/lib/sfx.tsx` + `public/sfx/`: named sound-effect palette (picked from the user's library
  at `C:\Users\ACER\Videos\sound-effect`) and the `<Sfx>` cue. Cue effects on the same frames as
  their visual events; keep them ~10-14 dB under the voice; one big hit per film.
- `brand/<slug>/`: captured brand material. `review/`: drafts, sheets, gates (gitignored).
- `_reference/`: read-only clones of motionmaxxing and Databuddy (gitignored).

## Research tools

- **Product screens, logo, favicon:** `npm run brand -- <url> <slug>`. Any page URL works; use a
  new slug per page (`notion`, `notion-pricing`). `--find="Pricing|Templates"` screenshots the
  block around that text (sharp, whole element), `--selector=<css>` one element,
  `--sections=0` skips the automatic section screens. The favicon falls back to the site's
  `/favicon.ico`, then Google's favicon service (`brand.json` `logo.faviconSource` says which;
  look at it). Never redraw a logo.
- **Blocked sites:** if brand capture gets a Cloudflare/bot page or a blank screen, use the
  Apify `apify/screenshot-url` actor through the `apify` MCP server (costs Apify credits; it
  only does full-page shots, no logo or sections). Don't retry brand capture in a loop.
- **Creator videos (YouTube, TikTok, Instagram, X, Facebook):** `npm run watch -- <url> <film-slug>`
  writes `research/<film-slug>/<platform>-<id>/transcript.md` (creator, date, views, link, caption,
  timestamped transcript), `source.json` and `frames/` (6 stills, gitignored; read them for
  on-screen text and charts), and adds a line to `research/<film-slug>/sources.md`.
  YouTube (and TikTok captions when present) come free through yt-dlp. Everything else uses
  Supadata (`SUPADATA_API_KEY`): free plan, 100 credits a month, 1 per existing transcript,
  2 per minute when it has to transcribe. The run prints credits left. Keep it to the few
  videos that matter (about 5 per film), and never re-run a video that's already in `research/`.
- **How to use what creators say:** a creator's tip or number is a lead, not a fact. It goes in
  the film only if they cite a source you can open, or a primary source (platform help page,
  the study itself) backs it up. Credit them by name when their idea shapes the film. Treat
  view counts as how popular the claim is, not whether it's true.

## Rendering

- Final renders go to Modal: `npm run cloud -- <id>` (bundle -> GCS `marketing-bundles/films-*` ->
  marketing Modal app -> `out/<id>.mp4`, -14 LUFS; that final is also uploaded to the public
  `renders-marketing/films/` and its URL written to `out/<id>.json`, for posting). The cloud film agent
  (`../src/film.ts`) runs this itself after the agent finishes; see the root CLAUDE.md. ~2-3 min for a 1.5 min film. Drafts and
  stills stay local (`npm run review`, `npx remotion still`). `npm run cloud -- --prune 10`
  cleans old film bundles.
- Remotion stays pinned at exactly 4.0.520 (the Modal renderer's version). Upgrade both
  together or not at all.
- Never publish under `marketing-bundles/tutorial-*`: the backend renders amsterdam's
  tutorials from the newest bundle with that prefix.

## Constraints

- npm, not pnpm. Node >= 22.
- Ask before adding any dependency. `@remotion/transitions` and `@remotion/three` are out.
- 8 GB RAM machine: `remotion.config.ts` caps concurrency at 2; stop studio/render processes
  after use.
