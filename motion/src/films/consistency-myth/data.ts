/**
 * Data for the consistency-myth film ("Do you need to be consistent with content, or is that a
 * myth?"). Every quote, number and label on screen comes from this file. All pages were opened
 * and the quoted strings checked against the raw page HTML on 2026-10-17.
 *
 * PLATFORM STATEMENTS (what the ranking systems read)
 * YouTube Help, "YouTube performance FAQ & Troubleshooting"
 *   https://support.google.com/youtube/answer/141805?hl=en   (no date on page; fetched 2026-10-17)
 *   - "Do I need to upload daily or at least once a week? No, we've done analyses over the years
 *     and found that growth in views across uploads is not correlated with time between uploads."
 *   - "We studied thousands of channels that took a break and found no correlation between break
 *     length and changes in views. Keep in mind it may take some time to "warm up" your audience
 *     again as they get back into their regular viewing routines."
 *   - Listed among reasons for drops in traffic from recommendations: "Uploading less frequently
 *     than usual."
 *   Captured with the FAQ answers expanded: brand/youtube-help/faq/*.png (+ faq-rects.json, the
 *   CSS-px boxes of the quoted phrases inside each 702 px-wide capture). Copies in
 *   public/films/consistency-myth/pages/.
 * YouTube Help, "YouTube's Recommendation System"
 *   https://support.google.com/youtube/answer/16533387?hl=en   (no date; fetched 2026-10-17)
 *   - "The algorithm uses fresh performance data for each individual video, rather than relying
 *     on past results"
 *   - signals: "likes, shares, comments, 'not interested' feedback, and survey responses";
 *     "whether they choose to click, watch, or positively engage with the content"
 *   - "Taking breaks is a healthy and encouraged part of a long-term creative journey - the
 *     algorithm doesn't penalize creators for doing so!"
 * TikTok Newsroom, "5 tips for TikTok creators", 2020-07-30
 *   https://newsroom.tiktok.com/en-us/5-tips-for-tiktok-creators
 *   - "The amount of videos you post won't impact how your content is recommended in the For
 *     You feed, and views vary from video to video."
 *   - "For You feed recommendations generally pull from videos posted within the last 90 days"
 *   Second source for the same position: TikTok Newsroom, "How TikTok recommends videos #ForYou",
 *   2020-06-18 (https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you):
 *   "neither follower count nor whether the account has had previous high-performing videos are
 *   direct factors". NOTE: both TikTok posts are from 2020; the film says "in twenty twenty".
 *
 * STUDIES (what the data shows; all correlational)
 * Buffer, "Consistent Posting Means 5x More Likes, Comments, and Shares: Study", 2025-01-29,
 *   Kirsti Lang / data: Julian Winternheimer
 *   https://buffer.com/resources/consistent-posting-study
 *   100,000+ Buffer users, last 26 weeks, 10 networks pooled (no per-platform split).
 *   Consistency = number of weeks with at least one post. Groups: <= 4 weeks (inconsistent),
 *   5-19 (consistent), >= 20 (highly consistent). Metric: MEDIAN engagements per post.
 *   Highly consistent: +450% vs inconsistent (+26% vs consistent). Consistent: +340% vs
 *   inconsistent. Peak at 21 weeks (4.47 median engagements per post). Did not account for
 *   multiple posts per week. Cross-check: Buffer's creator-growth-playbook restates 450% / 340%
 *   (https://buffer.com/resources/creator-growth-playbook).
 * vidIQ Research, "YouTube upload frequency study", July 2026 (updated 2026-07-08)
 *   https://vidiq.com/research/youtube-upload-frequency-study/
 *   10,210,278 channels with >= 1,000 subscribers, April 2025 - March 2026. Cadence =
 *   trailing-12-month uploads (long-form + Shorts) / 12. Metric: MEDIAN monthly view growth.
 *   Says "This study shows correlation, not causation" and that larger, healthier channels may
 *   have more resources to publish often. Measures count only, not evenness of uploads.
 *   (vidIQ's earlier 2024-25 study of 5.08M channels reported different multiples - 12+ vs 1-3
 *   per month: +53% views - as quoted by Ty Myers, see research/; the film uses only 2026.)
 *   Same direction, second source: Buffer Instagram study, 2.1M posts / 102K accounts
 *   (https://buffer.com/resources/how-often-to-post-on-instagram/): within-account fixed
 *   effects, follower growth rate +0.12% (1-2 posts/wk) -> +0.66% (10+ posts/wk).
 *
 * KEPT OUT OF THE FILM (vendor studies that disagree with each other)
 *   OverseerOS, 2026-09-12, 8,942 videos / 270 channels: on-schedule uploads 1.00x vs >2x-late
 *   uploads 1.17x of channel median (https://www.overseeros.com/blog/does-consistency-matter-on-youtube).
 *   AIR Media-Tech, 18,000 channels: predictable schedule -> more views per subscriber, no
 *   numbers published (https://air.io/en/audience-growth/does-posting-more-on-youtube-help-we-studied-18000-channels-to-find-out).
 *
 * Creator videos read for leads (research/consistency-myth/): Ty Myers (vidIQ study read-through,
 * flags correlation), Adam Ivy ("the algorithm tests every video"), Think Media (schedule Q&A).
 * None of their claims appear on screen.
 */

export interface PageCapture {
  /** File under public/. */
  file: string;
  /** Capture width in CSS px (image is 2x). */
  w: number;
  h: number;
  /** Boxes (CSS px, relative to the capture) of the quoted phrases. */
  phrases: Record<string, { x: number; y: number; w: number; h: number }[]>;
  /** y (CSS px) of the FAQ question line. */
  questionY: number;
}

/** Real captures of YouTube Help (answers expanded), boxes from faq-rects.json. */
export const PAGES = {
  daily: {
    file: "films/consistency-myth/pages/faq-upload-daily.png",
    w: 702,
    h: 1848,
    questionY: 1374,
    phrases: {
      q: [
        { x: 422.1, y: 1409, w: 244.1, h: 20 },
        { x: 18, y: 1433, w: 304.5, h: 20 },
      ],
    },
  },
  breaks: {
    file: "films/consistency-myth/pages/faq-break.png",
    w: 702,
    h: 1976,
    questionY: 1321,
    phrases: {
      b1: [{ x: 178.4, y: 1380, w: 472.4, h: 20 }],
      // "it may take some time to “warm up”": start/top from the DOM rect, right edge (377)
      // measured from the ink columns of the capture (the quote marks split the text node).
      b2: [{ x: 116.5, y: 1404, w: 261, h: 20 }],
    },
  },
  traffic: {
    file: "films/consistency-myth/pages/faq-less-traffic.png",
    w: 702,
    h: 2312,
    questionY: 1842,
    phrases: {
      r2: [{ x: 34, y: 2045, w: 270.8, h: 20 }],
    },
  },
} satisfies Record<string, PageCapture>;

/** YouTube's named signals (Recommendation System page), in the order the voice says them. */
export const SIGNALS = ["Clicks", "Watch time", "Likes", "Shares", "“Not interested”"];

export const TIKTOK_QUOTE = "“The amount of videos you post won’t impact how your content is recommended.”";

/** Buffer consistency study: the two groups the voice compares (rows of 26 weeks). */
export const BUFFER = {
  weeks: 26,
  rows: [
    { label: "Posted in 4 of 26 weeks", lit: 4, value: "baseline" },
    { label: "Posted in 20+ of 26 weeks", lit: 21, value: "+450%" },
  ],
  metric: "median engagement per post",
  sample: "Buffer · 100,000+ accounts · 26 weeks",
};

/** vidIQ 2026: uploads per month -> median monthly view growth (%). `ticks` = uploads drawn. */
export const VIDIQ = {
  sample: "vidIQ · 10.2M channels · Apr 2025 – Mar 2026",
  metric: "Median monthly view growth",
  tiers: [
    { label: "Under 1 a month", ticks: 0, growth: 0.53 },
    { label: "1–3 a month", ticks: 2, growth: 0.89 },
    { label: "4–7 a month", ticks: 5, growth: 1.32 },
    { label: "8–11 a month", ticks: 9, growth: 1.7 },
    { label: "12+ a month", ticks: 13, growth: 2.18 },
  ],
  /** 2.18 / 0.53 = 4.11; vidIQ's own text says 4.1x. */
  ratio: "4.1×",
  caveat: "“This study shows correlation, not causation.”",
};

/** Upload days on the illustrative 20-week track (a diagram of "uploads", not data). `early`
 *  = shown from the start of the each-video beat; the rest drop in on "the amount of videos". */
export const TRACK = {
  days: 140,
  uploads: [
    { day: 2, early: true }, { day: 10 }, { day: 18, early: true }, { day: 29 }, { day: 37, early: true },
    { day: 45 }, { day: 59, early: true }, { day: 67 }, { day: 76 }, { day: 90, early: true },
    { day: 98 }, { day: 106 }, { day: 117, early: true }, { day: 125 }, { day: 133 },
  ],
};

/** TikTok's window (5 tips, 2020): recommendations generally pull from the last 90 days. */
export const WINDOW_DAYS = 90;
