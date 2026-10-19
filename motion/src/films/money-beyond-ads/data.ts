/**
 * Data for the money-beyond-ads film: who takes a cut of each dollar, stream by stream.
 * Every number on screen is quoted from the pages below (all opened 2026-10-19). The film
 * shows the platform's published fee or share only; card/payment processing is named where the
 * source says it is extra and never drawn as cells (no source publishes one figure for it).
 *
 * Non-ad income   YouTube, How YouTube Works: Creator economy
 *                 https://www.youtube.com/howyoutubeworks/creator-economy/
 *                 "over half of YPP channels that earned 5 figures or more (USD) on YouTube in 2024
 *                 earned from sources other than ads and YouTube Premium" (YouTube internal data,
 *                 Jan-Dec 2024). Same page: creators earn 55% of the ads shown on their videos.
 * Ad shares       YouTube Help, YouTube Partner Program overview
 *                 https://support.google.com/youtube/answer/72902
 *                 55% of net ad revenue on the Watch Page (long-form); 45% of the revenue allocated
 *                 from the Shorts Creator Pool; 70% of net revenue from channel memberships.
 *                 Cross-check: https://support.google.com/youtube/answer/12504220 (Shorts: "keep
 *                 45% of their allocated revenue") and the How YouTube Works page above (55%).
 * Brand deals     Influencer Marketing Hub x NeoReach, Creator Earnings Report 2025
 *                 https://influencermarketinghub.com/creator-earnings-report-2025/
 *                 3,000+ creators surveyed; "over 49% of surveyed creators earn most of their
 *                 revenue from brand deals" (fieldwork dates not published).
 * Affiliate       Amazon Associates, Standard Commission Income Statement (US, Table 1)
 *                 https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ
 *                 Fixed rates 1% (grocery, health) to 10% (luxury beauty); headphones 3%;
 *                 some categories 0%. Cross-check of the range: getlasso.co Amazon affiliate
 *                 commission guide (secondary; agrees on 10% luxury beauty, 3% home/pets).
 * Products        Gumroad pricing, https://gumroad.com/pricing
 *                 "10% + $0.50 per transaction for all sales through your profile or direct links";
 *                 30% through the Discover marketplace. Secondary guides (checkoutpage.com,
 *                 schoolmaker.com) say card processing is charged on top; Gumroad's own page
 *                 doesn't say, so the voice says "before any card fees".
 * Memberships     YouTube 70% to creators: answer/72902 above.
 *                 Patreon: support article "A standard platform fee for new creators, effective
 *                 after August 4, 2025" https://support.patreon.com/hc/en-us/articles/36426991446797
 *                 (blocked to our fetcher; title read from the search result), cross-checked with
 *                 AlternativeTo news (2025-06) https://alternativeto.net/news/2025/6/patreon-is-increasing-platform-fees-for-new-creators-starting-august-2025/
 *                 flat 10% for new pages, replacing the 8% Pro and 12% Premium plans; payment
 *                 processing is charged separately.
 */

/** One dollar = 100 cells (cents). */
export const CELLS = 100;

export interface Split {
  /** Script mark that triggers this state. */
  mark: string;
  /** Cells that are yours after this mark (the rest are taken, from the last cell back). */
  yours: number;
  /** What the card's figure reads at this state. */
  figure: string;
  /** Small line under the figure: what the cells mean here. */
  note: string;
  /** Chip naming who keeps the rest (the source's own wording, shortened). */
  chip?: string;
}

export interface Stream {
  id: "ads" | "sponsor" | "affiliate" | "product" | "member";
  /** Card header: the stream. */
  name: string;
  /** What the 100 cells stand for in this beat. */
  unit: string;
  /** Cells yours when the card lands (before the first mark). */
  start: number;
  /** Figure + note shown before the first mark. */
  startFigure: string;
  startNote: string;
  splits: Split[];
}

export const STREAMS: Stream[] = [
  {
    id: "ads",
    name: "Ad revenue",
    unit: "one ad dollar",
    start: 100,
    startFigure: "$1",
    startNote: "an advertiser pays",
    splits: [
      { mark: "a", yours: 55, figure: "55¢", note: "long videos", chip: "YouTube keeps 45%" },
      { mark: "s", yours: 45, figure: "45¢", note: "Shorts, from the Creator Pool", chip: "YouTube keeps 55%" },
    ],
  },
  {
    id: "sponsor",
    name: "Sponsorship",
    unit: "one sponsor dollar",
    start: 100,
    startFigure: "$1",
    startNote: "a brand pays",
    splits: [{ mark: "b", yours: 100, figure: "$1", note: "paid by the brand", chip: "No platform share" }],
  },
  {
    id: "affiliate",
    name: "Affiliate link",
    unit: "one $100 sale",
    start: 0,
    startFigure: "$100",
    startNote: "someone else's sale",
    splits: [
      { mark: "r", yours: 10, figure: "1–10%", note: "Amazon, by category", chip: "Luxury beauty 10% · grocery 1%" },
      { mark: "h", yours: 3, figure: "$3", note: "headphones, 3%", chip: "Amazon headphones: 3%" },
    ],
  },
  {
    id: "product",
    name: "Your own product",
    unit: "one $10 guide",
    start: 3,
    startFigure: "$3",
    startNote: "the affiliate cut",
    splits: [
      { mark: "f", yours: 100, figure: "$10", note: "a guide you sell" },
      { mark: "p", yours: 85, figure: "$8.50", note: "before any card fees", chip: "Gumroad keeps 10% + 50¢" },
    ],
  },
  {
    id: "member",
    name: "Memberships",
    unit: "one member dollar",
    start: 100,
    startFigure: "$1",
    startNote: "a member pays",
    splits: [
      { mark: "y", yours: 70, figure: "70¢", note: "YouTube channel memberships", chip: "YouTube keeps 30%" },
      { mark: "pt", yours: 90, figure: "90¢", note: "Patreon, new creators", chip: "10% + payment processing" },
    ],
  },
];

/** Survey figure shown in the sponsorship beat (NeoReach, 3,000+ creators). */
export const SURVEY = { value: "49%", line: ["of", "3,000+", "creators", "earn", "most", "from", "brand", "deals."] };

/** Recap rows: stream / platform's cut, landing on the recap marks. */
export const RECAP = [
  { mark: "r1", cells: ["Ads", "45–55%"] },
  { mark: "r2", cells: ["Memberships", "10–30%"] },
  { mark: "r3", cells: ["Your product", "10% + 50¢"] },
  { mark: "r4", cells: ["Sponsorship", "none"] },
] as const;
