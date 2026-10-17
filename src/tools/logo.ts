import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { uploadImage } from "../studio.ts";
import { normalUrl, type Seen } from "./web.ts";

/**
 * find_logo: a company's or tool's logo, to show small next to its name (a tool section in a
 * blog post, the tools list on an ideas page).
 *
 *   1. SVGL (svgl.app, free API): clean SVG logos of well-known brands. The dark-background
 *      version is preferred, because the site's article pages are dark.
 *   2. Not in SVGL and a website is given: the site's own icon (Google's favicon service at
 *      128 px), stored in the studio's bucket (agent-logos/) so the page never hotlinks it.
 *      Google's generic globe (unknown sites) is rejected by size.
 * Pages only accept logo URLs from these two places (isLogoUrl in sycamore-mono's formats).
 */

type SvglItem = {
  title: string;
  category: string | string[];
  route: string | { light: string; dark: string };
  wordmark?: string | { light: string; dark: string };
  url?: string;
};

const pickDark = (r: SvglItem["route"]) => (typeof r === "string" ? r : r.dark);
const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function svgl(name: string): Promise<SvglItem[]> {
  const r = await fetch(`https://api.svgl.app?search=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) return [];
  const body = await r.json().catch(() => []);
  return Array.isArray(body) ? body : [];
}

/** Width of a PNG from its header, or 0 if it isn't one. */
function pngWidth(b: Uint8Array): number {
  const sig = [0x89, 0x50, 0x4e, 0x47];
  if (b.length < 24 || !sig.every((v, i) => b[i] === v)) return 0;
  return (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
}

async function favicon(website: string, campaign: string, topicId: string): Promise<string | null> {
  const host = new URL(website).hostname.replace(/^www\./, "");
  const r = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  // Unknown sites get a small generic globe: only keep a real, reasonably large icon.
  if (pngWidth(bytes) < 48) return null;
  return uploadImage(campaign, topicId, bytes, "image/png", "logo");
}

export function findLogoTool(opts: { campaign: string; topicId: string; seen: Seen }) {
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

  return defineTool({
    name: "find_logo",
    label: "Find logo",
    description:
      "Find a company's or tool's logo to show small next to its name. Give the name, and its website so the site's own icon can be used when the logo library doesn't have it. Returns a logo URL, or says none was found.",
    parameters: Type.Object({
      name: Type.String({ description: "The company or tool, e.g. \"Notion\"" }),
      website: Type.Optional(Type.String({ description: "Its homepage URL, e.g. https://www.notion.so" })),
    }),
    execute: async (_id, { name, website }) => {
      try {
        const items = await svgl(name);
        const want = simplify(name);
        const exact = items.find((i) => simplify(i.title) === want);
        if (exact) {
          const logo = pickDark(exact.route);
          opts.seen.add(normalUrl(logo));
          const wordmark = exact.wordmark ? pickDark(exact.wordmark) : null;
          if (wordmark) opts.seen.add(normalUrl(wordmark));
          return reply(
            `Logo for ${exact.title} (SVGL): ${logo}${wordmark ? `\nWordmark (logo with the name): ${wordmark}` : ""}\nUse it as ![${exact.title} logo](${logo}).`,
          );
        }
        if (website) {
          const icon = await favicon(website, opts.campaign, opts.topicId);
          if (icon) {
            opts.seen.add(normalUrl(icon));
            return reply(`Icon for ${name} (the site's own icon): ${icon}\nUse it as ![${name} logo](${icon}).`);
          }
        }
        const close = items.slice(0, 5).map((i) => i.title);
        return reply(
          `No logo found for "${name}"${close.length ? `. Similar names in the logo library: ${close.join(", ")} (call again with one of them if it's the same company)` : ""}. ${website ? "" : "Pass its website to try the site's own icon. "}Otherwise leave the logo out.`,
        );
      } catch (e) {
        return reply(`Couldn't look up a logo for ${name}: ${(e as Error).message}`);
      }
    },
  });
}
