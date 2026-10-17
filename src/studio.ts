/**
 * Talks to the marketing studio's agent API (amsterdam/sycamore, /api/agent/<campaign>/...).
 * The studio owns the topic queues, the prompts and the checks; this repo only runs agents.
 *
 *   POST  /api/agent/<campaign>/next          -> claim a topic if one is due: { topic, runId, prompt },
 *                                               or { topic: null, reason, nextAt }
 *   PATCH /api/agent/<campaign>/<id>          -> { status: "done", content, model } or { status: "failed", error }
 *   POST  /api/agent/<campaign>/runs/<runId>  -> what the run did and cost (shown on the studio's /agents)
 *
 * The studio decides when a page is due (on/off and pages per day are set on /agents), so
 * the cron can run often and most runs just ask and stop.
 */

const base = () => {
  const url = process.env.STUDIO_URL;
  if (!url) throw new Error("STUDIO_URL is not set (the studio's address, e.g. https://....vercel.app)");
  return url.replace(/\/$/, "");
};

function headers() {
  const key = process.env.AGENT_API_KEY;
  if (!key) throw new Error("AGENT_API_KEY is not set");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type Claimed = { id: string; label: string; prompt: string; runId: string };

/** Claims the next topic if one is due; otherwise says why not (paused, not due, queue empty). */
export async function claimTopic(campaign: string): Promise<{ topic: Claimed } | { topic: null; reason: string; nextAt: string | null }> {
  const res = await fetch(`${base()}/api/agent/${campaign}/next`, { method: "POST", headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claiming a ${campaign} topic failed (${res.status}): ${body.error ?? "no details"}`);
  if (!body.topic) return { topic: null, reason: body.reason ?? "nothing to do", nextAt: body.nextAt ?? null };
  return { topic: { id: body.topic.id, label: body.topic.label, prompt: body.prompt, runId: body.runId } };
}

export type RunReport = {
  outcome: "saved" | "failed";
  pageUrl: string | null;
  error: string | null;
  model: string;
  costUsd: number;
  modelCostUsd: number;
  searchCostUsd: number;
  searches: number;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  turns: number;
  submissions: number;
  runUrl: string | null;
};

/** Tells the studio what a run did and cost. A failed report is only logged: the work is already saved. */
export async function reportRun(campaign: string, runId: string, report: RunReport): Promise<void> {
  try {
    const res = await fetch(`${base()}/api/agent/${campaign}/runs/${runId}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(report),
    });
    if (!res.ok) console.error(`Reporting run ${runId} failed (${res.status})`);
  } catch (e) {
    console.error(`Reporting run ${runId} failed: ${(e as Error).message}`);
  }
}

export type SubmitResult = { ok: true; url: string | null } | { ok: false; status: number; error: string; problems: string[] };

/** Sends the finished work. 422 = the studio's checks found problems to fix (the topic stays ours). */
export async function submitWork(campaign: string, id: string, content: unknown, model: string): Promise<SubmitResult> {
  const res = await fetch(`${base()}/api/agent/${campaign}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ status: "done", content, model }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, url: body.url ?? null };
  return { ok: false, status: res.status, error: body.error ?? `HTTP ${res.status}`, problems: body.problems ?? [] };
}

/** Gives the topic back: the studio requeues it, or marks it failed after its last attempt. */
export async function failTopic(campaign: string, id: string, error: string): Promise<string> {
  const res = await fetch(`${base()}/api/agent/${campaign}/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ status: "failed", error }),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? body.status : `couldn't report the failure (${res.status})`;
}
