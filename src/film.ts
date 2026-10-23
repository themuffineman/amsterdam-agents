/**
 * The film agent: `node src/film.ts` (config in agents/films.json), run by the films workflow
 * every ~10 minutes. Different from the page agents (run.ts): one film is a 1-2 hour coding
 * job in motion/, not a page the studio checks. Two kinds, decided by the studio's brief: an
 * explainer film (Motion Film Brief) or a "recreate" video about a sycamore.to/motion template
 * (Recreate Brief, motion/src/series/recreate/SERIES.md). This runner treats both the same.
 *
 *   1. Claim the oldest queued film from the studio (POST /api/agent/films/next); none -> exit.
 *   2. Branch film/<slug>-<id> (from the previous attempt's branch for a redo).
 *   3. Claude Code (subscription, CLAUDE_CODE_OAUTH_TOKEN) runs the Motion Film Brief in motion/:
 *      research, script, voice, build, review. It ends by writing out/film-result.json.
 *   4. This runner renders the composition on Modal (`npm run cloud`, which uploads the final
 *      mp4 to the public GCS bucket and writes out/<Id>.json with its URL).
 *   5. Commit the film's files to the branch and push it.
 *   6. Report to the studio (PATCH /api/agent/films/<id>): "review" with the video, title,
 *      description, claims and gates, or "failed" with the reason.
 *
 * Claude Code gets only what its tools need (its own token, the TTS and Supadata keys). The
 * GCS/Modal keys and the studio key stay in this process: a web page can't talk the agent
 * into leaking them. Its tools are an allow list (file tools, web, npm scripts, remotion,
 * ffmpeg); anything else is refused without asking (--permission-prompts none).
 *
 * Needs STUDIO_URL, AGENT_API_KEY, CLAUDE_CODE_OAUTH_TOKEN, SYCAMORE_BACKEND_URL,
 * SYCAMORE_INTERNAL_API_KEY, GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS_JSON (or _B64),
 * MODAL_RENDER_TOKEN; SUPADATA_API_KEY optional.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RUN_URL, log, short } from "./agent.ts";

type FilmConfig = { claudeModel: string; maxTurns: number; timeoutMinutes: number };
const config: FilmConfig = JSON.parse(readFileSync(new URL("../agents/films.json", import.meta.url), "utf8"));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOTION = join(ROOT, "motion");

// ---------------------------------------------------------------- studio API

const studio = (path: string, init: { method: string; body?: unknown }) => {
  const url = process.env.STUDIO_URL?.replace(/\/$/, "");
  const key = process.env.AGENT_API_KEY;
  if (!url || !key) throw new Error("STUDIO_URL and AGENT_API_KEY must be set");
  return fetch(`${url}/api/agent/films${path}`, {
    method: init.method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`studio ${init.method} ${path} failed (${res.status}): ${body.error ?? "no details"}`);
    return body;
  });
};

type Claimed = { film: { id: string; title: string; format: string; redo: boolean } | null; prompt?: string; previousBranch?: string | null };

// ---------------------------------------------------------------- helpers

/** Runs a command and returns its output; throws with the output when it fails. */
function sh(cmd: string, args: string[], cwd = ROOT, env: NodeJS.ProcessEnv = process.env): string {
  const r = spawnSync(cmd, args, { cwd, env, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${short(out.trim(), 1500)}`);
  return out;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");

/** What Claude Code may do without asking. Everything else is refused (--permission-prompts none). */
const ALLOWED_TOOLS = [
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "TodoWrite",
  "Bash(npm run *)",
  "Bash(npx remotion *)",
  "Bash(npx tsc *)",
  "Bash(node *)",
  "Bash(ffmpeg *)",
  "Bash(ffprobe *)",
  "Bash(ls *)",
  "Bash(mkdir *)",
  "Bash(cp *)",
  "Bash(mv *)",
  "Bash(rm *)",
  "Bash(cat *)",
  "Bash(head *)",
  "Bash(tail *)",
  "Bash(wc *)",
  "Bash(grep *)",
  "Bash(find *)",
];

/** Only the keys the agent's own tools need: TTS (npm run voice), Supadata (npm run watch). */
function agentEnv(): NodeJS.ProcessEnv {
  const keep = ["PATH", "HOME", "USER", "LANG", "TMPDIR", "TEMP", "TMP", "USERPROFILE", "SYSTEMROOT", "APPDATA", "LOCALAPPDATA", "CHROME_PATH",
    "CLAUDE_CODE_OAUTH_TOKEN", "SYCAMORE_BACKEND_URL", "SYCAMORE_INTERNAL_API_KEY", "SUPADATA_API_KEY"];
  const env: NodeJS.ProcessEnv = {};
  for (const k of keep) if (process.env[k]) env[k] = process.env[k];
  return env;
}

/** motion/.env for the npm scripts (voice.mjs runs with --env-file=.env, which must exist). */
function writeMotionEnv() {
  const file = join(MOTION, ".env");
  if (existsSync(file)) return; // a local run keeps its own
  const lines = ["SYCAMORE_BACKEND_URL", "SYCAMORE_INTERNAL_API_KEY", "SUPADATA_API_KEY"]
    .filter((k) => process.env[k])
    .map((k) => `${k}=${process.env[k]}`);
  writeFileSync(file, `${lines.join("\n")}\n`);
}

// ---------------------------------------------------------------- Claude Code

/** Errors that mean the subscription (not the film) is the problem: try again later. */
const LIMIT_ERROR = /usage limit|hit your limit|limit reached|rate.?limit|429|overloaded|529/i;

async function runClaude(prompt: string): Promise<{ ok: boolean; why: string | null; lastText: string; turns: number }> {
  const [bin, ...pre] = (process.env.CLAUDE_BIN ?? "claude").split(" ");
  const args = [
    ...pre,
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--model", config.claudeModel,
    "--max-turns", String(config.maxTurns),
    "--allowedTools", ALLOWED_TOOLS.join(","),
    "--permission-prompts", "none",
    "--no-session-persistence",
  ];
  const child = spawn(bin, args, { cwd: MOTION, env: agentEnv(), shell: process.platform === "win32", stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(prompt);

  let stopReason: string | null = null;
  const timer = setTimeout(() => {
    stopReason = `over ${config.timeoutMinutes} minutes`;
    log(`stopping: ${stopReason}`);
    child.kill();
  }, config.timeoutMinutes * 60_000);

  let stderr = "";
  child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
  let lastText = "";
  let resultError: string | null = null;
  let turns = 0;
  let buffer = "";
  const onLine = (line: string) => {
    let ev: any;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "system" && ev.subtype === "init") log(`claude code ${ev.claude_code_version ?? ""} · ${ev.model}`);
    if (ev.type === "assistant") {
      for (const c of ev.message?.content ?? []) {
        if (c.type === "tool_use") {
          const what = c.input?.command ?? c.input?.file_path ?? c.input?.url ?? c.input?.query ?? c.input?.pattern ?? "";
          log(`→ ${c.name} ${short(what, 200)}`);
        }
        if (c.type === "text" && c.text?.trim()) log(`  ${short(c.text.trim().replace(/\s+/g, " "), 300)}`);
      }
    }
    if (ev.type === "result") {
      turns = ev.num_turns ?? 0;
      if (typeof ev.result === "string") lastText = ev.result;
      if (ev.is_error || ev.subtype !== "success") resultError = `${ev.subtype}: ${short(ev.result ?? "", 400)}`;
      const u = ev.usage ?? {};
      log(`claude code done: ${turns} turns, tokens in ${u.input_tokens ?? 0}, out ${u.output_tokens ?? 0}, cache read ${u.cache_read_input_tokens ?? 0}`);
    }
  };
  child.stdout.on("data", (d) => {
    buffer += d;
    let i: number;
    while ((i = buffer.indexOf("\n")) >= 0) {
      onLine(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
    }
  });
  const code = await new Promise<number | null>((resolve) => {
    child.on("close", resolve);
    child.on("error", (e) => {
      stderr += String(e);
      resolve(-1);
    });
  });
  clearTimeout(timer);
  onLine(buffer);

  const why = stopReason ?? resultError ?? (code !== 0 ? `exit ${code}: ${short(stderr.trim(), 400)}` : null);
  return { ok: !why, why, lastText, turns };
}

// ---------------------------------------------------------------- one film

type FilmResult = {
  compositionId: string;
  slug?: string;
  title?: string;
  description?: string;
  claims?: { claim: string; source: string }[];
  gates?: Record<string, unknown>;
  weak?: string;
  changed?: string;
  summary?: string;
};

async function makeFilm(claim: Required<Claimed>) {
  const film = claim.film!;
  const branch = `film/${slugify(film.title)}-${film.id.slice(0, 6)}`;
  let pushed = false;

  const pushBranch = (message: string) => {
    sh("git", ["add", "motion"]);
    const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: ROOT }).status !== 0;
    if (staged) sh("git", ["commit", "-q", "-m", message]);
    sh("git", ["push", "-q", "-u", "origin", branch]);
    pushed = true;
  };

  try {
    // 2. the film's branch
    if (claim.previousBranch) {
      sh("git", ["fetch", "-q", "origin", claim.previousBranch]);
      sh("git", ["checkout", "-q", "-b", branch, `origin/${claim.previousBranch}`]);
    } else {
      sh("git", ["checkout", "-q", "-b", branch]);
    }
    log(`branch ${branch}`);
    writeMotionEnv();
    // Only now (a film was claimed) install what making it needs; empty polls stay quick.
    if (process.env.GITHUB_ACTIONS) {
      log("installing ffmpeg, motion's packages, Claude Code, yt-dlp and faster-whisper");
      // GitHub's Ubuntu image has no ffmpeg; music, review and cloud all need the full one.
      sh("sudo", ["apt-get", "update", "-qq"]);
      sh("sudo", ["apt-get", "install", "-y", "-qq", "ffmpeg"]);
      sh("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], MOTION);
      sh("npm", ["install", "-g", "@anthropic-ai/claude-code", "--no-audit", "--no-fund"]);
      sh("pipx", ["install", "yt-dlp"]);
      // npm run narrate (recreate videos): word timings from faster-whisper; the workflow
      // caches its model in ~/.cache/huggingface.
      sh("python3", ["-m", "pip", "install", "-q", "faster-whisper==1.2.1"]);
    }

    // 3. Claude Code makes the film
    const resultFile = join(MOTION, "out", "film-result.json");
    if (existsSync(resultFile)) writeFileSync(resultFile, ""); // a redo's old result doesn't count
    const c = await runClaude(claim.prompt);
    if (!c.ok && c.why && LIMIT_ERROR.test(c.why)) throw new Error(`Claude subscription limit: ${c.why}. Try again later (Make film again).`);

    let result: FilmResult | null = null;
    try {
      result = JSON.parse(readFileSync(resultFile, "utf8"));
    } catch {
      // handled below
    }
    if (!result?.compositionId) {
      throw new Error(
        `no out/film-result.json with a compositionId${c.why ? ` (claude: ${c.why})` : ""}. Last message: ${short(c.lastText, 400) || "(none)"}`,
      );
    }

    // Keep the result with the film's files (out/ isn't committed), so a failed render or a
    // later look at the branch still has the title, description and claims.
    const slugDir = join(MOTION, "src", "films", result.slug ?? "");
    if (result.slug && existsSync(slugDir)) writeFileSync(join(slugDir, "film-result.json"), JSON.stringify(result, null, 2));

    // 4. render on Modal (this process holds the keys)
    log(`rendering ${result.compositionId} on Modal`);
    sh("npm", ["run", "cloud", "--", result.compositionId], MOTION);
    const rendered = JSON.parse(readFileSync(join(MOTION, "out", `${result.compositionId}.json`), "utf8")) as { url: string; durationSec: number };
    log(`rendered: ${rendered.url} (${rendered.durationSec} s)`);

    // 5. keep the film's code
    pushBranch(`film: ${film.title}\n\nMade by the film agent (${config.claudeModel}); review on the studio's /motion-gen.\n${RUN_URL ?? ""}`);

    // 6. to the studio for review
    await studio(`/${film.id}`, {
      method: "PATCH",
      body: {
        status: "review",
        videoUrl: rendered.url,
        durationSec: rendered.durationSec,
        compositionId: result.compositionId,
        branch,
        ytTitle: result.title ?? film.title,
        ytDescription: result.description ?? "",
        claims: result.claims ?? [],
        report: { gates: result.gates, weak: result.weak, changed: result.changed, summary: result.summary },
        runUrl: RUN_URL,
      },
    });
    log(`ready for review: ${film.title}`);
  } catch (e) {
    const error = (e as Error).message;
    log(`failed: ${error}`);
    // Keep whatever was made, for a look at what went wrong.
    if (!pushed) {
      try {
        pushBranch(`film (failed): ${film.title}\n\n${short(error, 500)}`);
      } catch (pushError) {
        log(`couldn't push the partial film: ${(pushError as Error).message}`);
      }
    }
    await studio(`/${film.id}`, { method: "PATCH", body: { status: "failed", error, runUrl: RUN_URL, branch: pushed ? branch : null } });
  }
}

async function main() {
  const claim = (await studio("/next", { method: "POST" })) as Claimed;
  if (!claim.film || !claim.prompt) {
    log("no film queued");
    return;
  }
  log(`claimed film "${claim.film.title}" (${claim.film.format}${claim.film.redo ? ", redo" : ""}, ${claim.film.id})`);
  await makeFilm(claim as Required<Claimed>);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
