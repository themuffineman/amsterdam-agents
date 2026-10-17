/**
 * Data for the content-calendar film ("How to set up a content calendar that you stick to").
 * Every number and quoted label on screen comes from this file. Pages opened 2026-10-17.
 *
 * THE FINDING (the film is built on it)
 * Buffer, "Consistent Posting Means 5x More Likes, Comments, and Shares: Study", 2025-01-29,
 *   Kirsti Lang / data: Julian Winternheimer
 *   https://buffer.com/resources/consistent-posting-study
 *   100,000+ Buffer users, last 26 weeks, 10 networks pooled. Consistency = number of weeks
 *   with at least one post: <= 4 weeks (inconsistent), 5-19 (consistent), 20+ (highly
 *   consistent). Metric: MEDIAN engagements per post. Highly consistent: "450% more engagement
 *   per post" than inconsistent, "more than 5 times". Sweet spot 21 weeks (4.47 median), "After
 *   21 weeks of posting, engagement started to plateau and eventually decline". Advice:
 *   "posting at least weekly is ideal" (with occasional weeks off); "Build a content bank or
 *   library for those busy weeks". Limitation: "didn't take into account the impact of posting
 *   multiple times per week". Correlational. (Buffer's later pages restate the same numbers,
 *   so they are a restatement, not an independent check.)
 *
 * CADENCE
 * Buffer, "How Often Should You Post on TikTok", 2025-10-08
 *   https://buffer.com/resources/how-often-should-you-post-on-tiktok/
 *   11.4M posts, 150,000+ accounts, fixed-effects (each account vs itself). vs 1 post a week:
 *   2-5/wk +17% views per post, 6-10 +29%, 11+ +34%. "Aim for 2 to 5 posts per week." Median
 *   views per post stay ~500 at every frequency.
 *   Second source, same range: Hootsuite, "How often to post on social media", 2025-04-18
 *   (https://blog.hootsuite.com/how-often-to-post-on-social-media/): TikTok "3-5 times per
 *   week"; Buffer Instagram study 2025-08-13 (2.1M posts, 102K accounts): 3-5 a week "sweet
 *   spot" (https://buffer.com/resources/how-often-to-post-on-instagram/).
 *
 * TEMPLATE FIELDS
 * Later, "Social media planning 30 days ahead", Talar Mazloumian, 2026-04-08
 *   https://later.com/blog/social-media-planning-30-days-ahead/
 *   "the content idea, format, platform, posting date, and strategic pillar for each post";
 *   "Most social media accounts work best with 3 to 5 pillars"; "The full monthly planning
 *   session takes 45 to 60 minutes."
 * Buffer, "Social media calendar", Kirsti Lang, 2024-05-12
 *   https://buffer.com/resources/social-media-calendar/
 *   tags: "Content pillar", "Post status (idea, draft, ready to publish)", "Format".
 * Hootsuite, "Social media calendar", Trish Riswick, 2026-10-01
 *   https://blog.hootsuite.com/social-media-calendar/
 *   "Most teams plan their social media calendar one to four weeks in advance";
 *   "Producing multiple posts at once saves time and helps you stay consistent."
 * Pillars 3-5 cross-checked: Sprout Social, 2026-04-21
 *   (https://sproutsocial.com/insights/social-media-content-pillars/) "at least around 3-5
 *   pillars"; Buffer content pillars, 2023-10-16.
 *
 * CREATOR LEAD (credited by name, it is advice, not a fact)
 * Jade Beason, "1 month of content in 1 hour | Updated guide to content batching & planning",
 *   YouTube, 2023-10-18, https://www.youtube.com/watch?v=rl9ZtPKEdRg (210K views): "for most
 *   people I recommend you start by batching one weeks of content in advance" ... "focus on one
 *   social channel at a time". Transcript in research/content-calendar/.
 *
 * KEPT OUT: CoSchedule "414% more likely to report success" (2021 self-selected survey);
 * creator burnout surveys (52%, Billion Dollar Boy 2025); Mosseri "2 feed posts a week" (2021,
 * paraphrase only, no primary source); vidIQ 2026 frequency study (used in the consistency film).
 *
 * The calendar rows (dates, ideas, pillars, formats) and the dot pattern of the 26-week grid are
 * an ILLUSTRATIVE template, not data: they show what the template looks like filled in.
 */

/** Buffer consistency study, as said and shown. */
export const BUFFER = {
  sample: "Buffer · 100,000+ accounts · 26 weeks",
  weeks: 26,
  topLabel: "Posted in 20+ weeks",
  lowLabel: "Posted in 4 or fewer",
  ratio: "5×+",
  ratioNote: "engagement per post",
  sweetSpot: 21,
};

/** Illustrative account for the grid: 21 of 26 weeks have a post. Day 0 = Monday. */
export const OFF_WEEKS = [4, 10, 15, 19, 23];
const POST_DAYS: number[][] = [[1, 3], [1], [2, 4], [1, 3], [], [0, 3], [1, 4], [2], [1, 3], [1, 3, 5], [], [3], [1, 3], [1], [2, 4], [], [1, 3], [0], [1, 3], [], [2, 5], [1, 3], [4], [], [1, 3], [1]];
export const POSTS: { week: number; day: number }[] = POST_DAYS.flatMap((days, week) => days.map((day) => ({ week, day })));
/** The low account: 4 weeks with a post. */
export const LOW_WEEKS = [2, 9, 16, 22];

/** Buffer TikTok study. */
export const CADENCE = {
  range: "2–5 posts a week",
  source: "Buffer · 11.4M TikTok posts",
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
/** The floor: two posts a week (bottom of Buffer's range). Ghosts fill the rest of the range. */
export const FLOOR_DAYS = [1, 3];
export const GHOST_DAYS = [0, 2, 4];

/** Template columns, in the order the voice names them (Later's fields), then status (Buffer). */
export const COLUMNS = [
  { key: "date", header: "Date", w: 150 },
  { key: "platform", header: "Platform", w: 120 },
  { key: "format", header: "Format", w: 160 },
  { key: "idea", header: "Idea", w: 340 },
  { key: "pillar", header: "Pillar", w: 190 },
  { key: "status", header: "Status", w: 120 },
] as const;

export type Status = "Idea" | "Draft" | "Ready";
export interface Row {
  date: string;
  platform: string;
  format: string;
  idea: string;
  pillar: string;
  status: Status;
}

export const PILLARS = ["How-to", "Behind the scenes", "Results"];

/** One month, two posts a week (illustrative). Week of row i = floor(i / 2). */
export const ROWS: Row[] = [
  { date: "Tue 3 Nov", platform: "TikTok", format: "Talking head", idea: "Hook rewrite, before and after", pillar: "How-to", status: "Ready" },
  { date: "Thu 5 Nov", platform: "TikTok", format: "Screen record", idea: "Editing a Short start to finish", pillar: "Behind the scenes", status: "Draft" },
  { date: "Tue 10 Nov", platform: "TikTok", format: "Voiceover", idea: "Three caption mistakes", pillar: "How-to", status: "Idea" },
  { date: "Thu 12 Nov", platform: "TikTok", format: "Talking head", idea: "What last month's numbers said", pillar: "Results", status: "Idea" },
  { date: "Tue 17 Nov", platform: "TikTok", format: "B-roll", idea: "A filming day, sped up", pillar: "Behind the scenes", status: "Idea" },
  { date: "Thu 19 Nov", platform: "TikTok", format: "Talking head", idea: "Answering a top comment", pillar: "How-to", status: "Idea" },
  { date: "Tue 24 Nov", platform: "TikTok", format: "Screen record", idea: "My planning sheet, filled in", pillar: "Behind the scenes", status: "Idea" },
  { date: "Thu 26 Nov", platform: "TikTok", format: "Talking head", idea: "One month of posting: results", pillar: "Results", status: "Idea" },
];

/** Ready posts kept for weeks that fall apart (Buffer: "a content bank ... for those busy weeks"). */
export const BANK: Row[] = [
  { date: "—", platform: "TikTok", format: "Voiceover", idea: "Desk setup tour", pillar: "Behind the scenes", status: "Ready" },
  { date: "—", platform: "TikTok", format: "Talking head", idea: "The question I get most", pillar: "How-to", status: "Ready" },
];

/** Planning numbers (chips). */
export const PLANNING = {
  session: { text: "45–60 min a month", source: "Later" },
  ahead: { text: "1–4 weeks ahead", source: "Hootsuite" },
  start: { text: "Start with one week, one platform", source: "Jade Beason" },
  sweet: { text: "Best results: 21 of 26 weeks", source: "Buffer" },
};
