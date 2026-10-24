/**
 * Problems: things that went wrong in a run without (necessarily) failing it, collected so
 * the studio can show them on /agents. A tool that fails tells the agent, and the agent works
 * around it, so without this nobody would know snapsave broke or Apify ran out of credit.
 *
 * Collected per topic in `problems` (module state, like searchCost; run.ts resets it), sent
 * to the studio at the end of the topic with sendProblems. On the claude-code engine the
 * tools run in the MCP server's process, which writes its list to the state file (mcp.ts)
 * for the runner to send.
 *
 *   tool failures      buildTools wraps every tool (agent.ts): "Couldn't ...", "Search failed"
 *   partial failures   watch_video's broken steps (Invidious, snapsave, Whisper, Gemini), SearXNG falling back to paid
 *   runner crash       run.ts's main().catch
 *   workflow crash     the workflows' last step (if: failure()), straight to the studio
 */
import { log } from "./agent.ts";
import { postProblems } from "./studio.ts";

export type Problem = {
  /** Where: a tool name (read_page, watch_video...), "search", "runner". */
  source: string;
  message: string;
  url?: string | null;
  at: string;
};

export const problems: Problem[] = [];

/** At most this many per topic: a run where everything breaks shouldn't send hundreds. */
const MAX = 50;

export function noteProblem(source: string, message: string, url?: string | null) {
  if (problems.length >= MAX) return;
  problems.push({ source, message: message.slice(0, 1000), url: url ?? null, at: new Date().toISOString() });
}

export const resetProblems = () => void problems.splice(0);

/** Sends a topic's problems (or a crash, with runId null) to the studio. Never throws. */
export async function sendProblems(campaign: string, runId: string | null, list: Problem[], runUrl: string | null) {
  if (!list.length) return;
  log(`${list.length} problem(s) for /agents: ${list.map((p) => `${p.source}: ${p.message.slice(0, 80)}`).join(" | ")}`);
  await postProblems(campaign, { runId, runUrl, problems: list });
}
