/**
 * Talks to the marketing studio's agent API (amsterdam/sycamore, /api/agent/<campaign>/...).
 * The studio owns the topic queues, the prompts and the checks; this repo only runs agents.
 *
 *   POST  /api/agent/<campaign>/next   -> claim a topic: { topic: { id, label }, prompt } or { topic: null }
 *   PATCH /api/agent/<campaign>/<id>   -> { status: "done", content, model } or { status: "failed", error }
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

export type Claimed = { id: string; label: string; prompt: string };

/** Claims the next topic, or null when the campaign's queue is empty. */
export async function claimTopic(campaign: string): Promise<Claimed | null> {
  const res = await fetch(`${base()}/api/agent/${campaign}/next`, { method: "POST", headers: headers() });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claiming a ${campaign} topic failed (${res.status}): ${body.error ?? "no details"}`);
  if (!body.topic) return null;
  return { id: body.topic.id, label: body.topic.label, prompt: body.prompt };
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
