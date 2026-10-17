# amsterdam-agents: how the agent pipeline works

This repo runs cloud agents that write programmatic-SEO pages for sycamore.to on a schedule. It is one of **three repos**
that work together. Read this before changing anything here or adding a new campaign.

## The three repos

| Repo | Role | Key places |
| --- | --- | --- |
| `amsterdam-agents` (this, public, `github.com/themuffineman/amsterdam-agents`) | **Runs** agents on a GitHub Actions cron. No prompts, no topics, no secrets in code. | `src/run.ts`, `src/tools/`, `agents/*.json`, `.github/workflows/*.yml` |
| `amsterdam/sycamore` ("the studio", Next.js on Vercel, `https://amsterdam-sycamore.vercel.app`) | **Owns** each campaign: topic queue, prompt, quality checks, saving, analytics, the `/agents` screen. | `lib/agent-campaigns.ts`, `app/api/agent/`, `app/api/agents/`, `app/agents/page.tsx`, `lib/idea-pages/` |
| `sycamore-mono/frontend` ("the site", sycamore.to) | **Renders** the pages from its own database. Owns the page format. | `lib/idea-pages.ts`, `lib/idea-pages-db.ts`, `app/ideas/`, `components/idea-pages/` |

Why the split: prompts and checks change often and the studio is where all marketing work lives, so agents stay generic
runners. The repo is public for unlimited free Actions minutes, which is safe because nothing secret is in it.

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
  how many are due), runs one Pi session per topic with limits on `maxTurns`, `maxCostUsd` (model tokens + search
  fees) and `timeoutMinutes`, then reports. No discovery: a hand-built `ResourceLoader`, so no AGENTS.md, skills or
  extensions from the machine leak into the agent. In-memory sessions.
- `src/studio.ts`: the studio API client (claim, submit, fail, report).
- `src/tools/search.ts`: web search through **OpenRouter's web plugin** (same key as the model). Each search is a tiny
  chat request whose `url_citation` annotations are the results. Cost per request comes back in `usage.cost`.
- `src/tools/web.ts`: `web_search` and `read_page` (Jina Reader `r.jina.ai`, falls back to stripped HTML; **5,000
  characters max**, because everything read stays in context and is resent every turn).
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
- Tables (studio DB, `SYCAMORE_DATABASE_URL`): `idea_topics` (the queue), `agent_runs` (one row per claim),
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
- GitHub secrets: `STUDIO_URL`, `AGENT_API_KEY` (same as the studio's Vercel env), `OPENROUTER_API_KEY`.
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
