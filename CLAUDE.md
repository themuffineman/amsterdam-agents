# amsterdam-agents: how the agent pipeline works

This repo runs cloud agents that write pages for sycamore.to on a schedule. Three campaigns so far:

| Campaign | Writes | Topics come from | Studio code | Site code |
| --- | --- | --- | --- | --- |
| `ideas` | programmatic-SEO pages, sycamore.to/ideas/{platform}/{niche} | `idea_topics`, loaded by script | `lib/idea-pages/` | `lib/idea-pages.ts`, `app/ideas/` |
| `blog-posts` | traditional articles (X vs Y, alternatives, best-of, reviews, how-tos, guides), sycamore.to/blog/{slug} | `blog_post_topics`, typed in by hand on `/agents` or `/agents/add` (phone) | `lib/blog-posts/` | `lib/blog-posts.ts`, `app/blog/[slug]` |
| `tutorials` | how to do or fix one thing in an editor, sycamore.to/blog/tutorial/{slug}, from one Reddit help thread each | `tutorial_topics`, filled by the studio's `/tutorial-gen` harvest | `lib/tutorial-posts/` | `lib/tutorial-posts.ts`, `app/blog/tutorial/[slug]` |

The ideas campaign is the worked example in most of this file; the blog posts campaign is described in its own section. It is one of **three repos**
that work together. Read this before changing anything here or adding a new campaign.

## The three repos

| Repo | Role | Key places |
| --- | --- | --- |
| `amsterdam-agents` (this, public, `github.com/themuffineman/amsterdam-agents`) | **Runs** agents on a GitHub Actions cron. No prompts, no topics, no secrets in code. | `src/run.ts`, `src/tools/`, `agents/*.json`, `.github/workflows/*.yml` |
| `amsterdam/sycamore` ("the studio", Next.js on Vercel, `https://amsterdam-sycamore.vercel.app`) | **Owns** each campaign: topic queue, prompt, quality checks, saving, analytics, the `/agents` screen. | `lib/agent-campaigns.ts`, `app/api/agent/`, `app/api/agents/`, `app/agents/page.tsx`, `lib/idea-pages/` |
| `sycamore-mono/frontend` ("the site", sycamore.to) | **Renders** the pages from its own database. Owns the page format. | `lib/idea-pages.ts`, `lib/idea-pages-db.ts`, `app/ideas/`, `components/idea-pages/` |

Why the split: prompts and checks change often and the studio is where all marketing work lives, so agents stay generic
runners. The repo is public for unlimited free Actions minutes, which is safe because nothing secret is in it.

**`motion/`**: the Remotion explainer films (moved in from the standalone `sycamore-motion` repo on 2026-10-17, without
its history). A separate npm project: `cd motion` for anything there; its own `CLAUDE.md`, `.claude/skills`
(motion-craft), `.env` (gitignored) and `node_modules`. The root runner doesn't use it yet. Published as-is: the
`src/ui-kit/` files are AGPL-3.0 (Databuddy; licence in `motion/src/ui-kit/LICENSE-AGPL-3.0`, keep the file
headers); creator transcripts in `motion/research/` stay local (gitignored).

## The film agent (`src/film.ts`, `.github/workflows/films.yml`)

Not a campaign like the page agents: one film is a 1-2 hour coding job in `motion/`, and a person reviews it.
Two kinds (studio `motion_films.kind`, migration 0035): **explainer** (a title from /motion-gen's queue, the Motion
Film Brief) and **recreate** (a video about one sycamore.to/motion template and how to make it with Claude Code:
the Recreate Brief, studio `lib/motion-films/recreate-prompt.ts`, which sends the agent to
`motion/src/series/recreate/SERIES.md`). This runner treats both the same; recreate videos also use
`npm run narrate` (faster-whisper, installed by film.ts, model cached by the workflow).

- **Start:** studio `/motion-gen` → draw a title → **Make film** (landscape or portrait) → a `motion_films` row
  `queued` (studio `lib/motion-films/`, migration 0032). No schedule yet (the user wants the button first).
- **Run:** the workflow polls every 10 minutes (`POST /api/agent/films/next`, Bearer `AGENT_API_KEY`); empty polls
  stop in seconds. **That schedule is unreliable** (2026-10-24: it really fired every 3-5 hours), so the studio
  starts the workflow itself: "Make film"/Redo dispatch it, and cron-job.org calls `GET /api/agent/films/kick`
  (Bearer `AGENT_API_KEY`) every 5 minutes, which dispatches only when a film is queued and none is running.
  Both need `GITHUB_DISPATCH_TOKEN` in Vercel (fine-grained, this repo only, Actions read/write). A claim gets the **Motion Film Brief** in agent mode (studio `lib/motion-films/prompt.ts`, the
  same brief as the copy-paste flow) and the previous attempt's branch for a redo. The runner: branches
  `film/<slug>-<id>` (from the previous branch on a redo), installs motion's packages + Claude Code + faster-whisper, runs
  `claude -p` (model in `agents/films.json`, default **opus**; the subscription token) in `motion/`, which ends by
  writing `motion/out/film-result.json` (compositionId, YouTube title, description ending with one Sycamore plug
  line, claims + sources, gates, weak, changed). Then the **runner** renders (`npm run cloud`, which uploads the
  normalised mp4 to the public GCS bucket and writes `out/<Id>.json` with its URL), commits + pushes the branch, and
  PATCHes `/api/agent/films/<id>` `review` (or `failed` with the reason; a partial branch is pushed too).
- **Keys:** Claude Code's environment has only its token, the TTS key and the optional Gemini key; the GCS/Modal keys and the
  studio key stay in the runner (a web page can't talk the agent into leaking them). Its tools are an allow list
  (`ALLOWED_TOOLS`: file tools, web search/fetch, `npm run`, `npx remotion`, `node`, ffmpeg, plain shell file
  commands); anything else is refused (`--permission-prompts none`). Read-only git is allowed by Claude Code; the
  brief says not to use git.
- **Review (studio):** the film card on `/motion-gen`: video, claims to check, the agent's notes, editable title +
  description, **Generate thumbnail** (the AI Thumbnail generator; Google/OpenAI models first, our thumbnails as the
  style reference), Approve, Redo with notes (a new queued attempt building on this branch), Drop. **Post**:
  landscape straight to YouTube (`uploadToYouTube`, can be scheduled), portrait as a Short through Buffer; counted
  in /analytics as `motion-film`; the title leaves the queue.
- **Usage:** a film is a long Claude session (a big share of a 5-hour subscription window). A usage limit fails the
  film with that reason; Make film again later.
- **Secrets** (besides the page agents'): `CLAUDE_CODE_OAUTH_TOKEN`, `SYCAMORE_BACKEND_URL`,
  `SYCAMORE_INTERNAL_API_KEY` (TTS), `GCS_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS_JSON_B64`, `MODAL_RENDER_TOKEN`
  (all in sycamore-mono `backend/.env` or motion's `.env`). The workflow needs `contents: write` to push branches.
- **Not tested end to end yet** (2026-10-17): claim → prompt → review report → review card → thumbnail were tested
  against the real studio API with a fake result; a real film run on GitHub hasn't happened.

## One run, end to end

```
GitHub Actions cron (hourly, :17)          node src/run.ts ideas
  │
  ├─ POST {STUDIO_URL}/api/agent/ideas/next          (Bearer AGENT_API_KEY)
  │     studio: is a page due? (on/off + pages per day, /agents screen)
  │       no  → { topic: null, reason, nextAt }  → runner logs it and exits
  │       yes → claims a random pending topic (FOR UPDATE SKIP LOCKED), inserts an agent_runs row
  │             → { topic: {id, label}, runId, prompt }
  │
  ├─ Pi agent session (SDK, in-process) with ONLY the tools in agents/ideas.json:
  │     web_search · read_page · find_examples · write/edit/read (page.json in a temp dir) · submit_page
  │     agent researches, writes page.json, calls submit_page()
  │
  ├─ submit_page → PATCH /api/agent/ideas/<topicId> { status: "done", content, model }
  │     studio: auto-fix mechanical problems → format check → quality checks → verify example posts
  │       problems → 422 { problems }  → agent edits page.json, submits again (max 4 submissions)
  │       ok       → upsert into sycamore-mono's idea_pages (published today), topic 'done',
  │                  content_posts row for /analytics → { url }
  │
  ├─ not saved (limits, error, out of submissions) → PATCH { status: "failed", error }
  │     studio: attempts+1 → back to 'pending', or 'failed' after 3
  │
  └─ POST /api/agent/ideas/runs/<runId>  { outcome, cost split, tokens, turns, submissions, runUrl }
        → shown on the studio's /agents screen

sycamore.to/ideas/{platform}/{niche}: rendered from idea_pages on first visit, cached 1 hour (ISR). No deploy needed.
```

## This repo

- `src/run.ts`: the runner. Reads `agents/<name>.json`, loops up to `topicsPerRun` (a safety cap; the studio decides
  how many are due), runs each topic on its **engine** (below) with limits on `maxTurns`, `maxCostUsd` (model tokens +
  search fees; Pi only) and `timeoutMinutes`, then reports. Pi: no discovery, a hand-built `ResourceLoader`, so no
  AGENTS.md, skills or extensions from the machine leak into the agent. In-memory sessions.
- `src/agent.ts`: what both engines share: config (`loadConfig`), `SYSTEM_PROMPT`, `STANDARD_TOOLS`, `buildTools`.
  A config with `noResearchTools: true` leaves the standard research tools out (tutorials).
- **Engines.** Each campaign has an engine, switched on the studio's `/agents` screen (`agent_campaign_settings.engine`,
  sent as `engine` with every claim); a manual run can force one (workflow input `engine`, env `ENGINE`).
  - `pi`: Pi + the OpenRouter model in `model`. Paid per token.
  - `claude-code` (`src/claude.ts`): `claude -p` on the **Claude subscription** (`CLAUDE_CODE_OAUTH_TOKEN` from
    `claude setup-token`; any `ANTHROPIC_API_KEY` is removed from its env so it can't bill the API). Model
    `claudeModel` (default `haiku`). Runs in the topic folder with `--restricted` (no shell, no web fetch, file tools
    only inside that folder, none of the machine's settings), `--tools Read,Write,Edit`, our system prompt, the
    studio's prompt on stdin. Our tools come from `src/mcp.ts`, an MCP stdio server around the same `buildTools`; it
    writes how submitting went and the search cost to a state file the runner reads (it's Claude Code's child
    process). Searches are mostly free (SearXNG, the fallback costs), the model costs $0; reports say model `claude-code/haiku`.
    Usage limits are shared with the subscription owner's own Claude Code use. On a usage limit, overload or a
    Claude Code that can't start, the topic is redone with Pi in the same run (`fallback`; the report's model says
    so). Local test: `CLAUDE_BIN=<path to claude.exe>` (the VS Code extension's `resources/native-binary/claude.exe`
    on Windows; the npm package's binary doesn't run there).
- `src/studio.ts`: the studio API client (claim, submit, fail, report).
- `src/tools/search.ts`: web search, **SearXNG first (free), OpenRouter's web plugin as the fallback** (paid, same key
  as the model). SearXNG is our own meta-search engine: the ideas/blog-posts workflows start the `searxng/searxng`
  container on the runner ("Start SearXNG", config `searxng/settings.yml`) and set `SEARXNG_URL`; unset (locally), every
  search is paid as before. The paid search runs when SearXNG fails or returns nothing usable (`accept`: for
  find_examples, no single posts). The paid one is a tiny chat request whose `url_citation` annotations are the
  results; its cost comes back in `usage.cost`. Logs say how many searches were free (`searchCost.free`); the studio
  report's `searchCostUsd` is the paid ones only. `SEARXNG_URL` is in the claude-code engine's `TOOL_ENV` (the MCP
  server only gets listed variables).
- **SearXNG on GitHub runners** (tested 2026-10-18 with `.github/workflows/search-test.yml`, which runs on a push to the
  search files or by hand and posts totals as annotations; free, writes nothing): Google CSE, Bing and Yahoo answer;
  Brave rate-limits, DuckDuckGo shows a CAPTCHA, Qwant denies (SearXNG pauses those and uses the rest). No proxies:
  each job is a fresh machine/IP with few searches. Research 8/8 queries got results; single posts found for YouTube,
  TikTok, Instagram, LinkedIn, Facebook, few for X and Pinterest. If engines start blocking, the paid share in the run
  logs goes up: rerun the search test and change the engines in `settings.yml`.
- `src/tools/web.ts`: `web_search` and `read_page` (**5,000 characters max**, because everything read stays in context
  and is resent every turn). Both record every URL they return or read in `seen`, for `checkLinks`. `read_page` tries
  Jina Reader (`r.jina.ai`), then a plain fetch (tags stripped), then **Chrome** (`readWithChrome` in screenshot.ts,
  sharing its one-browser queue), and skips any answer that is a block page (`isBlockPage`: Reddit's "You've been
  blocked", Cloudflare's "Just a moment", Quora's "Something went wrong"; texts under 3,000 characters only). If all
  three are blocked it returns an error, so the agent doesn't cite a page it never read (before 2026-10-23 block pages
  were returned as the page). Checked 2026-10-23 from a home IP: Jina is blocked on Reddit and Quora; Chrome gets
  Quora answers and Reddit listings. **Not yet checked from GitHub's IPs** (Reddit blocks data centres harder).
- `src/tools/reddit.ts`: Reddit **threads** (`/r/<sub>/comments/<id>`) in `read_page` go to the Apify
  `automation-lab~reddit-scraper` actor instead (same actor and settings as the studio's tutorial harvest), when
  `APIFY_TOKEN` is set: post + up to 30 comments, flat, [OP] marked, no votes (always 0). About 1 cent a thread, at most
  3 per topic (`MAX_REDDIT`); not counted in the run's reported cost. Without the token, threads go through the normal
  chain.
- **Standard tools** (`STANDARD_TOOLS` in run.ts): every agent gets `web_search`, `read_page`, `watch_video`,
  `screenshot` and `find_logo` whatever its config lists, so a new campaign can use them; its config adds the rest
  (`find_examples`, Pi's file tools, `submit_page`). The studio's prompt says which ones to use and how. Add a new
  general-purpose tool here too.
- `src/tools/logo.ts`: `find_logo(name, website?)`: SVGL (`api.svgl.app?search=`, free; the dark-background variant,
  since article pages are dark), else the site's own icon from Google's favicon service at 128px (a small generic globe
  is rejected), stored through the studio upload with `?kind=logo` (bucket `agent-logos/`). Pages accept logos only
  from those two places (`isLogoUrl` in sycamore-mono's `lib/blog-posts.ts` and `lib/idea-pages.ts`); blog posts show
  them inline next to a tool's link, ideas pages next to `tips.tools[].name` (`logo` field).
- `src/tools/watch.ts`: `watch_video(url)`: a YouTube/TikTok/Instagram/X/Facebook video as text (creator, date, views,
  caption, transcript with [m:ss]; 7,000 characters max). Adds the URL to `seen` (and `found` if it's a post). The
  fetching lives in `src/tools/video-sources.ts`, shared with the film agent's `motion/scripts/watch.mjs`.
  **No yt-dlp, no Supadata, no logins** (since 2026-10-24: on GitHub's IPs yt-dlp got YouTube's "Sign in to confirm
  you're not a bot" and broken TikTok responses, and Supadata ran out of credits). Every platform goes through a
  service that fetches the video on its own servers:
  - YouTube: **Invidious** (open-source YouTube front-end with a JSON API). Instances: `INVIDIOUS_URLS` (comma list),
    else the healthy ones with the API on from `api.invidious.io`, plus `yt.chocolatemoo53.com` (the only public one
    that answered on 2026-10-24). Metadata from `/api/v1/videos/<id>`; its captions (often empty: the instance can't
    get them either); else the audio (itag 140, first 7 MB ≈ 7 minutes via a Range request, proxied with
    `local=true`, retried 3× because instances hand requests to several servers and some 500) through Whisper; else
    **Gemini** (`GEMINI_API_KEY`, optional, `gemini-flash-latest` with the YouTube URL as `file_data`: Google fetches
    it itself). The key must come from an AI Studio project **without billing** (free tier); the sycamore-mono
    backend's key is prepaid and was empty (402) on 2026-10-24, so the Gemini step is untested. No Invidious →
    YouTube oEmbed for title and channel.
  - Instagram, TikTok, X, Facebook: **snapsave.app** (`snapsave-media-downloader`, pinned): caption + video file
    through Whisper. No date/views/likes from it; the creator comes from the link (TikTok, X).
  - Whisper: `scripts/transcribe.py`, faster-whisper `base` on the CPU (the workflows install it and cache the model
    in `~/.cache/huggingface`).
  Step failures go to the Problems panel only when no transcript came back. Test on a GitHub runner:
  `.github/workflows/watch-test.yml` (`scripts/watch-test.ts`, runs on a push to these files). Tested 2026-10-24 from
  a home IP on the videos that failed in production: 3 YouTube (incl. a 27-min one) and a TikTok transcribed, a
  speechless TikTok correctly empty; same 4/5 on a GitHub runner (watch test, 34-58 s a YouTube video). **PyAV is
  pinned to 17.0.0**: faster-whisper 1.2.1 breaks on newer PyAV (`metadata_errors`), which silently broke every
  Whisper transcript (Instagram too) until 2026-10-24. Snapsave alternatives tried 2026-10-22: `btch-downloader` returned empty links,
  `ruhend-scraper` is a 15 MB obfuscated file. YouTube transcript sites tried 2026-10-24 (tactiq, kome.ai,
  youtubetotranscript) are behind bot checks; most public Invidious/Piped instances were down or blocked.
- `src/tools/screenshot.ts`: `screenshot(url, find?)`: the hero at 1440x900, or the block around some text (at least 60%
  of the screen wide, fixed/sticky headers hidden), JPEG. Ported from sycamore-motion `scripts/brand-capture.mjs`.
  puppeteer-core with the runner's own Chrome (`/usr/bin/google-chrome` on GitHub; `CHROME_PATH` elsewhere). The image
  goes to the studio (`POST /api/agent/<campaign>/<id>/screenshot`, stored in the Supabase bucket under
  `agent-screens/<campaign>/`), which returns the public URL; the tool returns it plus the text visible in the shot. Max 15
  per topic, one Chrome at a time (models ask for several per turn; parallel browsers starve a small machine). Comparison
  posts put each tool's homepage hero under its `## Tool` heading, with its logo and a link (prompt), and need at least
  3 (alternatives, best), 2 (versus) or 1 (review) screenshots (`MIN_SCREENSHOTS` in the studio's save.ts). Blog posts may embed only these URLs (`isScreenshotUrl` in sycamore-mono `lib/blog-posts.ts`).
- `src/tools/examples.ts`: `find_examples(platform, query)`: platform-scoped search, keeps only single-post URLs
  (`isPostUrl`, which must stay in step with `parsePostUrl` in sycamore-mono's `lib/idea-pages.ts`).
- `src/tools/submit.ts`: `submit_page()` takes **no arguments**: it reads `page.json` from the topic's temp folder,
  repairs it with `jsonrepair`, drops Instagram/Facebook examples no search returned, and submits.
- `agents/<name>.json`: campaign, model, thinking level, tool list, limits. Pi's built-in `write`/`edit`/`read` are
  allowed by name (`PI_FILE_TOOLS` in run.ts); everything else must be a tool from `buildTools`.
- `.github/workflows/<name>.yml`: hourly cron + manual "Run workflow" (optional `topics` input). `concurrency` keeps
  one run at a time.

Pi details that matter: package `@earendil-works/pi-coding-agent` (pinned 1.3.0), `createAgentSession({ customTools,
tools, resourceLoader, sessionManager: SessionManager.inMemory(), settingsManager: SettingsManager.inMemory(...) })`,
model via `modelRuntime.getModel("openrouter", "<id>")` after `setRuntimeApiKey("openrouter", key)`. Custom tools use
`defineTool` + `typebox` schemas; `prepareArguments` runs before schema validation. Pi's `getSessionStats().cost` uses
OpenRouter's live prices and matched the real bill when checked.

## The studio side (`amsterdam/sycamore`)

- `lib/agent-campaigns.ts`: the campaign registry and everything the API does: `pacing()` (pages per day spread over
  the UTC day: by any moment at most `floor(pagesPerDay × share of day) + 1` claims; failed runs count), `claimTopic`,
  `finishTopic`, `releaseTopic`, `reportRun`, `overview` (for /agents), `requeueTopic` (Rewrite), `removeTopicPage`
  (Delete). A claim older than 3 hours is treated as abandoned and can be claimed again.
- API for agents (Bearer `AGENT_API_KEY`): `app/api/agent/[campaign]/next`, `.../[id]` (PATCH done/failed),
  `.../runs/[runId]` (report). API for the screen (no auth, like the rest of the studio): `app/api/agents/...`.
- Tables (studio DB, `SYCAMORE_DATABASE_URL`): `idea_topics` and `blog_post_topics` (the queues), `agent_runs` (one row per claim),
  `agent_campaign_settings` (on/off, pages per day), `content_posts` (/analytics). Migrations in `db/migrations/`,
  applied with `node scripts/apply-migration.mjs <file>` (drizzle-kit's journal isn't used).
- Ideas campaign code, `lib/idea-pages/`:
  - `prompt.ts`: the agent's whole brief (research rules, example rules, the JSON shape, house voice). Edit tone here.
  - `save.ts`: `autoFix` (drop empty examples, em dashes → commas, drop example posts that don't exist, keep the
    first 10, trim ideas above 18 from the biggest group), then format check, quality checks (banned phrases quoted in
    context, markdown, 1,000+ words, no repeated ideas/templates, ≤15% shared 5-word phrases with pages of the same
    platform or niche), then upsert. `removeIdeaPage` for Delete.
  - `examples.ts`: checks each example post exists and fills author/title/thumbnail.
  - `db.ts`: a copy of sycamore-mono's `idea_pages` table definition, over `CAPTION_PAGES_DATABASE_URL`.
  - `format/idea-pages.ts`: a **copy** of sycamore-mono's `lib/idea-pages.ts`, made by `npm run sync:caption-format`.
    Never edit the copy; change sycamore-mono and re-sync.
  - `topics/*.json` + `scripts/add-idea-topics.mjs`: topics as `[platform, title, niche plural, niche singular]`.
    The user writes titles by hand and wants them used **verbatim** (varied on purpose so pages don't look templated).
    The first "23" in a title becomes `{n}`; the site fills in the page's real idea count.

## The site side (`sycamore-mono/frontend`)

- `lib/idea-pages.ts`: the page format, **no imports** (the studio copies it): platforms, `IDEA_TARGET` 15 and
  `IDEA_RANGE` 12–18, `LIMITS`, `ideaTitle` (the topic's own title, else 3 patterns), `parsePostUrl` + `embedUrl`,
  `ideaPageProblems` / `parseIdeaPage`.
- `lib/idea-pages-db.ts`: reads (published only), `relatedIdeas` (same niche on other platforms; neighbours on the
  same platform). Every row is re-checked when read; a bad row is a 404, not a crash.
- `app/ideas/[platform]/[niche]/page.tsx` (ISR 1h), hubs `app/ideas/page.tsx`, `app/ideas/[platform]/page.tsx`
  (404 until they have pages), sitemap entries in `app/sitemap.ts`.
- `components/idea-pages/PostEmbed.tsx`: example posts are a light card; the platform's player loads only on click.
- Table `idea_pages` (PK platform + niche_slug, `data` jsonb, `title_template`, `published_at`, `source`), migrations
  0031, 0032, applied with `npm run db:apply -- <file>` (hand-written; the drizzle journal is stale).

## The blog posts campaign (`blog-posts`)

- **Topics**: `blog_post_topics` (studio DB, migration 0030): `title` (verbatim), `slug` (unique, from the title, years
  stripped so a rewrite keeps the URL), `post_type` (versus | alternatives | best | review | howto | guide; guessed from
  the title when not picked, `guessPostType`), optional `notes` (a brief for the agent, put in the prompt). Added through
  `POST /api/agents/blog-posts/topics` (`lib/blog-posts/topics.ts`): one title per line, bullets/numbers stripped,
  duplicates and slugs the site already uses (`format/reserved-slugs.json`, synced) skipped with a reason.
- **Prompt** (`lib/blog-posts/prompt.ts`): a brief per post type, the honesty rules (Sycamore gets a warm, full write-up;
  other tools are never put down; limits stated as sourced facts; say when another tool is the better pick), research
  rules (each tool's own pricing page wins), the list of sycamore.to pages it may link to (key pages + published posts),
  house voice. **What it may say about Sycamore is `lib/blog-posts/sycamore-facts.ts`**: keep it true to the product.
- **Files**: the agent writes the article to `post.md` and metaDescription/excerpt/faq/sources to `page.json`
  (`agents/blog-posts.json` sets `bodyFile: "post.md"`; submit_page sends it as `body`). With `checkLinks`, submit_page
  refuses (without spending a submission) any link or source that wasn't a search result or a page the agent read
  (`seen` in run.ts, compared with `normalUrl`).
- **Checks** (`lib/blog-posts/save.ts`): autoFix (em dashes, a leading `# title`, trailing FAQ/Sources sections), the
  format (`blogPostProblems`: lengths, 4-14 `##` sections, no H1/HTML/images, a table for comparison types), then
  1,200+ words, banned phrases, put-down words ("clunky", "overpriced"... quoted in context), Sycamore mentioned, own-site
  links only to listed pages, ≤20% shared 5-word phrases with posts of the same type. Saved to sycamore-mono's
  `blog_posts` (migration 0033); `content_posts` gets `content_type 'article'` ("Agent blog posts" on /analytics).
- **Site**: `app/blog/[slug]/page.tsx` serves an MDX file from `content/blog/edu-blogs` if one has the slug, else the
  database post (ISR 1h) via `components/blog-posts/BlogPostArticle.tsx` (Markdown rendered by `renderMarkdown` in
  `lib/mdx.tsx`: no JSX, no raw HTML, no math, so prices stay prices; FAQ + BlogPosting JSON-LD). Listed on `/blog`,
  in the sitemap.
- Workflow `.github/workflows/blog-posts.yml`, hourly at :47.

## The tutorials campaign (`tutorials`)

- **Topics**: `tutorial_topics` (studio DB), the queue `/tutorial-gen` fills: its Modal harvest keeps Reddit help
  threads with a working answer (`seo_title`, `keyword`, `question`, `solutions`, the scraped `thread`). Migration 0033
  added `claimed_at`, `attempts`, `last_error`, `post_slug`. The manual "Copy prompt" flow on /tutorial-gen draws from the
  same `pending` rows.
- **No research**: everything the post may say is in the thread pasted into the prompt (`lib/tutorial-posts/prompt.ts`).
  `agents/tutorials.json` sets `noResearchTools: true`, so the agent gets only write/edit/read + submit_page (no search,
  no SearXNG in the workflow), and `checkLinks` refuses every external link (it never saw one). Own-site links only to
  the listed posts (MDX list synced into `format/mdx-posts.json` + published agent tutorials).
- **Outcomes**: saved; `{ "duplicateOf": "<path>" }` (an existing post covers it, topic `duplicate`; a slug clash with an
  MDX tutorial or another topic's post is handled the same way); `{ "tooThin": "why" }` (the thread can't carry the
  title, topic `rejected`). Neither writes a page or an /analytics row; after a Rewrite they also take the old post down.
- **Checks** (`lib/tutorial-posts/save.ts`): autoFix (dashes, H1, trailing FAQ, JSX copied from MDX posts), format
  (`tutorialPostProblems`), 200-2,000 words, banned phrases, no Reddit traces (reddit, u/, r/, "the OP", lower-case
  "thread", "linked in"), `steps` = the first numbered list, **at most answers + 1 `##` sections** (+1 Sycamore section on
  caption posts) and **no more FAQ items than answers** (free models pad thin threads with invented fixes), Sycamore only
  in caption/subtitle posts (and then required, with `captionPreview`), no error-free promises, max 25% shared 5-word
  phrases with other agent tutorials. Saved to sycamore-mono's `tutorial_posts` (migration 0034); `content_posts`
  `content_type 'tutorial'` ("Tutorials" on /analytics, same as the manual ones).
- **Engine**: claude-code (set 2026-10-21). Tested 2026-10-21 on Pi + `nemotron-3-ultra:free`: 6 posts, $0, 1-2 min
  each, but it embellishes: a one-tip thread came back with 5 sections of invented tips (hence the section cap), and it
  adds menu paths and FAQ answers the thread doesn't have. Fine as the fallback, not as the default.
- Workflow `.github/workflows/tutorials.yml`, hourly at :32, no SearXNG/Whisper.

## Problems: what went wrong (the /agents "Problems" panel)

A tool that fails doesn't fail the run (the agent works around it), so without this a broken tool (snapsave, Apify,
SearXNG) would go unnoticed. Added 2026-10-23.

- **Runner** (`src/problems.ts`): `noteProblem(source, message, url?)` into a per-topic list (module state like
  `searchCost`; `runTopic` resets it), sent after the run report with `POST /api/agent/<campaign>/problems`
  (`{ runId, runUrl, problems: [{ source, message, url, at }] }`). What's noted: every failed tool call
  (`recordingFailures` in agent.ts wraps all tools but submit_page and matches "Couldn't ...", "Search failed",
  "Screenshots aren't", or a throw), watch_video's broken steps (when no transcript came back), SearXNG falling back to paid search, and
  a runner crash (`main().catch`, runId null). On claude-code the MCP server writes its list to the state file and
  claude.ts reads it back (`ClaudeOutcome.problems`).
- **Workflows**: each agent workflow ends with "Report the failure to the studio" (`if: failure()`), a curl with
  source `workflow`, so a setup step that breaks (npm ci, Whisper install) shows up too.
- **Studio**: table `agent_problems` (migration 0034), `lib/agent-problems.ts` (`recordProblems`, `problemsOverview`),
  route `app/api/agent/[campaign]/problems` (any campaign name, films too). `/api/agents` returns `problems`; the panel
  groups the last 7 days by campaign + source + cause (`causeOf`: URLs and long ids stripped), and also lists failed
  runs (`run failed`) and runs still "running" after 3 hours (`run died`). Each group opens to its 8 newest cases with
  the URL and the run log.
- read_page's errors say which: "the site showed a bot check" vs "couldn't load it (HTTP 404 / DNS ...)".

## Tracking: what is recorded where

Everything lives in the studio's database (`SYCAMORE_DATABASE_URL`), except the pages themselves.

| What | Where | Written by | Seen on |
| --- | --- | --- | --- |
| Each published page (one row per topic) | `content_posts` (`kind 'blog'`, `content_type 'ideas'`, `platform 'website'`, title, page URL, `topic_id`, `posted_at`) | `onDone` in the campaign entry, when the studio saves a page | `/analytics` → Blog → "Ideas pages" (posts per day, cumulative) |
| Each agent run (claim → outcome) | `agent_runs` (outcome running/saved/failed, page URL, error, model, cost total + model + searches, searches, tokens in/out/cache read/cache write, turns, submissions, GitHub run URL, started/finished) | row inserted by `claimTopic`; filled by the runner's report (`POST /api/agent/<campaign>/runs/<runId>`) | `/agents`: per-run list, per-campaign spend, totals, last 7 days |
| Each topic's state | the topic table (`idea_topics`: status pending/claimed/done/failed/removed, attempts, last_error) | claim, done, failed, Rewrite, Delete | `/agents` queue counts and the note on each run ("back in the queue", "deleted"...) |
| Campaign controls | `agent_campaign_settings` (enabled, pages_per_day) | the `/agents` screen | `/agents` |
| The page | sycamore-mono's `idea_pages` (`source` = `agent:<model>`) | studio `save.ts` | sycamore.to |

How they interact:
- `content_posts` is unique on `(content_type, topic_id)`, so a **Rewrite** that saves a new version doesn't count
  twice in /analytics; the post keeps its first publish date. **Delete** removes the `content_posts` row (the page is
  gone) and retires the topic.
- Cost comes from the runner: Pi's `getSessionStats().cost` (model, at OpenRouter's live prices; matched the real bill
  when checked) plus the `usage.cost` OpenRouter returns for every search. Failed runs cost money too and are counted in
  totals and in "per page".
- Runs record the **attempt**, so pacing counts every claim of the UTC day, including failures.
- A runner that dies before reporting leaves its `agent_runs` row on `running`. The topic itself is reclaimed after
  3 hours.
- The first three pages (2026-10-17) were backfilled into `agent_runs` by hand from their logs.
- Not tracked here: hourly cron runs that found nothing due (only in the Actions log), and page traffic or rankings
  (sycamore-mono's own analytics and Search Console).

## Platform facts (checked 2026-10-17)

| Platform | Found by | Existence check (studio, `examples.ts`) | Embed |
| --- | --- | --- | --- |
| YouTube | Parallel | oEmbed (400 if missing) | youtube-nocookie iframe |
| TikTok | Parallel | oEmbed (rate-limits; retried once) | `tiktok.com/embed/v2/<id>` |
| X | Parallel | `publish.twitter.com/oembed` with a twitter.com URL | `platform.twitter.com/embed/Tweet.html` |
| LinkedIn | **Exa** (Parallel finds none) | embed page 200 vs 404 | `linkedin.com/embed/feed/update/urn:li:activity:<id>` |
| Pinterest | Parallel (mostly boards; only `/pin/` kept) | `widgets.pinterest.com/v3/pidgets/pins/info` | `assets.pinterest.com/ext/embed.html` |
| Instagram | Parallel (Exa finds none) | **none possible** (same page for fake ids) | `/p/<id>/embed/` |
| Facebook | Parallel | **none possible** (plugin returns 400 to servers; renders in browsers) | `plugins/post.php` / `video.php`; no group posts |

For unverifiable platforms the only guard is that the URL must have come from our own search (`found` set in the runner).

Search engines on OpenRouter's web plugin: Parallel `mode: "turbo"` ≈ $0.001–0.0013 a search (the default), Exa ≈
$0.007 (LinkedIn only).

## Costs (measured)

**Engines and models (2026-10-18):** the campaigns run on the claude-code engine (subscription) with free SearXNG
search, so a post costs about $0. The Pi engine's model (`model` in agents/blog-posts.json and ideas.json) is
`nvidia/nemotron-3-ultra-550b-a55b:free`: the free fallback, used when Claude Code hits a usage limit (run.ts does
the topic with Pi) or when a campaign is switched to "pi" on /agents. Tested: it saves posts first try at $0 but
invents some first-hand and Sycamore details, so it's the last resort, not the default. Free models allow 20
requests/min and 1,000/day each on our account (~30 posts/day); free endpoints can be congested (Gemma 4 was).
Other free models tested worse (Nemotron 3 Super: contradictions; Inkling: ignored research rules). For one run
with another model, use the workflow's "model" input. The Haiku figures below are from before.

About **$0.03–0.05 a page** with `anthropic/claude-haiku-5.5`: model ≈ $0.015–0.027, searches ≈ $0.015–0.02. What
drove cost down from $0.24: Parallel instead of Exa, 5K-character page reads, and drafting in `page.json` with
small `edit` fixes instead of resending the whole page per fix (output fell from ~27K to ~12K tokens). Each rejection
the studio can fix itself instead of rejecting saves a round, so prefer auto-fixes for anything mechanical.

## Running and operating

- Local run (studio on `npm run dev`, port 4000):
  `STUDIO_URL=http://localhost:4000 AGENT_API_KEY=... OPENROUTER_API_KEY=... TOPICS_PER_RUN=1 node src/run.ts ideas`
  (keys from `amsterdam/sycamore/.env.local`; the OpenRouter one is `OPEN_ROUTER_KEY` there). Local runs write real
  pages to production and count toward the day's pacing.
- `npm run typecheck`. Node 22.19+ runs the TypeScript directly; imports use `.ts` extensions.
- GitHub secrets: `STUDIO_URL`, `AGENT_API_KEY` (same as the studio's Vercel env), `OPENROUTER_API_KEY`,
  `GEMINI_API_KEY` (optional, watch_video's last YouTube fallback; a free-tier key), `CLAUDE_CODE_OAUTH_TOKEN`
  (the claude-code engine; `claude setup-token`, valid a year).
- Turn a campaign off, or change its pages per day: the studio's `/agents` screen. Disabling the workflow in GitHub
  also works, but leave the schedule alone otherwise.
- Quality control: `/agents` lists every run with the live page and the Actions log; Rewrite requeues the topic,
  Delete unpublishes and retires it.
- **Deploy order** when the API between runner and studio changes: push sycamore-mono/studio first, wait for Vercel,
  then push this repo. The cron picks up whatever is on `main` at the next run.
- GitHub turns off scheduled workflows in a public repo after 60 days without a commit; re-enable from the Actions tab.

## Adding a new campaign (checklist)

Example: "best tools for X" pages. Follow the ideas campaign as the worked example.

1. **sycamore-mono** (the format and rendering):
   - `lib/<name>.ts`: the page format, no imports (types, limits, a `...Problems(data)` checker, `parse...` for rows).
   - A table + hand-written migration (`db/migrations/00NN_*.sql`, `npm run db:apply -- <file>`), Drizzle schema in
     `db/schema.ts`, a read module that re-checks rows, the route(s), sitemap entries.
2. **studio** (queue, prompt, checks):
   - Add the format file to `scripts/sync-caption-format.mjs` (a `target` under `lib/<name>/format/`) and run
     `npm run sync:caption-format`.
   - A topic table with `id, status, claimed_at, attempts, last_error, created_at` (+ campaign fields), migration in
     `db/migrations/`, schema in `db/schema.ts`.
   - `lib/<name>/`: `db.ts` (copy of the site's table over `CAPTION_PAGES_DATABASE_URL`), `prompt.ts`, `save.ts`
     (autoFix → format → quality → save, and a remove function), plus any verification.
   - One entry in `campaigns` in `lib/agent-campaigns.ts` (title, label, buildPrompt, submit, onDone → a
     `content_posts` row with a new `ContentType` and an /analytics filter label, removePage, maxAttempts) and its
     table in `QueueTable`.
   - Topics: a JSON file + a loader script, titles verbatim from the user.
3. **this repo**: `agents/<name>.json` (campaign name, tools, limits) and a copy of `.github/workflows/ideas.yml`
   (change `name`, `concurrency.group` and the agent name in the run step). Add a tool in `src/tools/` + `buildTools`
   only if the prompt needs one.
4. Test locally with `TOPICS_PER_RUN=1`, read the page it wrote, then deploy in the order above and trigger one run
   from the Actions tab. The new campaign shows on `/agents` automatically (default: on, 12 a day).

## Gotchas

- Models can't count characters: checks that fail on length must say how much to cut or add.
- Quote where a problem is (e.g. the banned phrase in context), or the agent spends rounds searching for it.
- Banned words can be real jargon in some niches (crypto "token unlock"); ban filler phrases, not single words.
- The model sometimes writes `"example": null`: treat as no example (autoFix), don't reject.
- A run can stall and end with an empty reply; the runner records the model's `stopReason`/`errorMessage` in the
  failure so it shows on /agents.
- Studio raw `sql` fragments can't take a JS `Date` with this postgres driver: pass an ISO string and cast `::timestamptz`.
