# amsterdam-agents

Cloud agents for the Sycamore marketing studio ([amsterdam/sycamore](../amsterdam/sycamore)). Each agent runs on a
GitHub Actions cron, takes a topic from the studio, researches and writes with the [Pi](https://github.com/earendil-works/pi)
agent SDK, and sends the result back.

This repo only **runs** agents. Topic queues, prompts and quality checks live in the studio (its agent API,
`/api/agent/<campaign>/...`, documented in the studio's CLAUDE.md), so a prompt change never needs a change here. The
repo is public on purpose (free Actions minutes): nothing secret is in it.

## How a run works

`node src/run.ts <agent>` reads `agents/<agent>.json`, then for each topic:

1. `POST {STUDIO_URL}/api/agent/<campaign>/next` claims a topic and returns its prompt.
2. A Pi session runs that prompt with only the tools the config lists (`src/tools/`).
3. The agent writes its page to `page.json` in a temporary folder (Pi's `write` tool) and calls `submit_page`, which
   reads the file, repairs small JSON mistakes and sends it. The studio fixes mechanical problems itself and answers
   with the rest; the agent fixes those with `edit` (only the lines that need it, not the whole page) and submits
   again, up to `maxSubmissions`.
4. If nothing got saved (limits hit, error, out of submissions), the topic is reported `failed` with the reason. The
   studio puts it back in the queue, or marks it failed after 3 tries.

Limits per topic: `maxTurns`, `maxCostUsd` (model tokens plus search fees, as OpenRouter reports them), `timeoutMinutes`.

## Tools

| Tool | What it does |
| --- | --- |
| `web_search` | Web search via OpenRouter's web plugin (Parallel turbo, about $0.001 a search) |
| `read_page` | Reads a page as text (Jina Reader, falls back to stripped HTML), first 5,000 characters |
| `find_examples` | Searches one platform for real posts and keeps only single-post links. Parallel turbo for YouTube, TikTok, Instagram and X; Exa ($0.007) for LinkedIn only (Parallel finds no LinkedIn posts) |
| `submit_page` | Reads `page.json`, repairs it with jsonrepair, drops Instagram examples no search returned (the studio can't verify Instagram), sends it to the studio |
| `write` / `edit` / `read` | Pi's built-in file tools, inside the topic's temporary folder |

## Agents

| Agent | Campaign | Schedule | Writes |
| --- | --- | --- | --- |
| `ideas` | `ideas` | every 2 hours (`.github/workflows/ideas.yml`) | sycamore.to/ideas/{platform}/{niche} |

## Adding an agent

1. In the studio: a topic table and a campaign entry in `lib/agent-campaigns.ts` (prompt, and a `submit` that checks and
   saves the work).
2. Here: `agents/<name>.json` and a workflow file copied from `ideas.yml`. Add a tool in `src/tools/` and in
   `buildTools` (`src/run.ts`) if it needs a new one.

## Secrets (repo Settings → Secrets → Actions)

- `STUDIO_URL`: the studio's deployed address
- `AGENT_API_KEY`: same value as the studio's `AGENT_API_KEY`
- `OPENROUTER_API_KEY`: model and search costs go here

## Run locally

```sh
npm install
STUDIO_URL=http://localhost:4000 AGENT_API_KEY=... OPENROUTER_API_KEY=... node src/run.ts ideas
```

Node 22.19+ runs the TypeScript directly (no build step). `npm run typecheck` checks it.
