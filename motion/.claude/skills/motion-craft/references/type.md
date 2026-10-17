# Type: kinetic typography

Adapted from motionmaxxing `references/type.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Numbers measured from 53 human-made moments,
converted to 30 fps. Rewritten for Remotion with `src/lib/eases.ts`. Format: **WHEN** -> **DO**
-- *because*. Sizes are em (font-size) as % of frame height H.

## 0. What the word should do

**WHEN** a key word has a physical meaning -> **DO** act it out on the type itself ("splitting"
sliced in two, "tighter" tightening its tracking, every word leaving except "important") --
*because* a word that does what it says can't be mistaken for a slide. One or two words per
film, not every line.

**WHEN** a line names an abstract thing (a count, privacy, speed) -> **DO** turn it into an
object the viewer can count or watch -- *because* a watched quantity is believed; a bigger
number is not.

**WHEN** writing on-screen copy -> **DO** use the brand's own voice and real lines verbatim
(`brand/<slug>/copy.json`), then cut half. Sentence case with a full stop reads as a person.

**Copy tells, delete on sight:** "Not just X. It's Y."; one-word triplets ("Faster. Smarter.
Yours."); "Unlock", "Meet X", "Introducing", "seamless", "effortless", "reimagined", "all-in-one";
invented numbers or users; on-screen disclaimers; puns on the brand name; any line that could be
pasted into another brand's film.

**Headline typing is banned.** Letter-by-letter with a caret is only for the product's own input
field. A narrative reason is not an exception.

## 1. The type system

| Property | Rule |
|---|---|
| Family | ONE family. The brand's own face when it has one; otherwise a neutral grotesque (Inter-class). See `src/lib/tokens.ts` |
| Weight | 400 default; 350-450 on pale grounds; 450-550 headlines; 600 only on a wordmark; 650 only on a single word or UI label |
| Case | Sentence case or lowercase. No tracked caps, no kickers |
| Tracking | display -1.5% to -5.5% em (`letterSpacing: "-0.03em"`); small UI normal |
| Ink | charcoal (#383837, #20201E), not #000; pure black only on the hero figure/wordmark |
| Connectives | dim grey ("and" #A6A09E) that never brightens |
| Second face | at most one per film, as a deliberate second voice for one line; never a lone serif-italic accent word |
| Emphasis | size, one accent word, or one device (section 6). Never bold, underline or glow |

**Role scale (em % H):** UI texture 1.3-1.9 / UI card text 2.2-2.5 / UI prompt 4-5 / supporting
phrase 5-7 / headline 7-11 (9 typical) / emphasis word 16 / hero number 22-29 / opening thesis 33
/ wordmark 9-14. At 1080 H: headline 9% = 97 px. At 1920 H (portrait), size by W instead:
headline 8-10% W = 86-108 px.

## 2. Whole-word builds

**Onset gaps (no voice):** hook 2-4 f, standard headline 4-6 f accelerating toward the end,
thoughtful 8-12 f irregular, before the stinger word 1.5-2x the base gap. Add +/-40% jitter in a
speech pattern, never a constant interval:

```ts
// Headline, 5 words, accelerating + longer gap before the stinger:
const onsets = staggerOnsets(5, 12, [6, 5, 4, 7]);   // 12, 18, 23, 27, 34
```

**Entry:** offset and decelerate, no overshoot, no opacity ramp (opacity is only `enter()`'s 5 f
helper):
- rise from 0.03-0.07 H below (big rise up to 0.24 H, shrinking per word: 24/18/13/13% H);
- or 0.03 W from the entry side;
- curve: ~59% of travel in 5 f, 80% by 10 f, tail 12-36 f. That's `softLand` (12-15 f); hero
  first word `snapSettle`.

```tsx
const e = enter(frame, onsets[i], { from: { y: 0.05 * height, blur: 5 }, frames: 14 });
<span style={{ display: "inline-block", transform: `translateY(${e.y}px)`,
               filter: `blur(${e.blur}px)`, opacity: e.opacity,
               visibility: e.visible ? "visible" : "hidden" }}>{word}</span>
// visibility, not conditional render: the word's slot is reserved so the line never re-flows.
```

**WHEN** words join a held line -> **DO** either lay out final slots first and never re-centre
(needed when boxes/loops/badges depend on geometry, or lines > 6 words), or re-centre with
+12-32 px extra gap closing 50% in ~7 f. Decide once per line.

## 3. Entry mechanics (pick by line type)

| Line | Mechanic | Numbers |
|---|---|---|
| First word / thesis noun | start oversized, shrink | 33% H em, ink ~0.9 W, 6 px blur -> 0.09 H in ~9 f (86% of shrink in 8 f), tail 8 f. ONCE per film |
| Spoken hook, 3-6 words | pop whole + x-decay | 1-frame appearance 16 px offset, x decays x0.6/f; group re-centres |
| Calm 3-5 word headline | rise | 4-8 f gaps, grey -> ink in 2 f, settle ~15 f |
| Technical statement | hard step | 1 f cuts, zero ramp, drift continues; busy background carries energy |
| Status / CTA words | blur-resolve in place | opacity .12/.3/.65/.9/1 and blur 8/6/4/1.5/0 px, 4 f per word, back-to-back |
| A word that differs | per-glyph or scattered fragments | ~1 glyph/f; rare signature |
| Reply phrase | change axis: first rises, second slides from right with 3 f anticipation | |

## 4. Accent colour on arrival

**WHEN** a new word deserves attention -> **DO** give it the film's ONE accent for 4-10 f
(sweet spot 4-8 f), decaying to ink; the line is monochrome at rest -- *because* colour then means
"this is arriving". Use `interpolateColors(frame, [at, at + 6], [ACCENT, INK])`.

Never a new hue per line. A second signal (green) only for "done".

## 5. Phrase replacement and exits

**WHEN** one phrase replaces another -> **DO** exits faster than entries and overlapping by ~2 f:
exit one word per frame, each 3-4 f (up 0.07 H, fading toward #CCC), entries 2-3 f apart settling
over ~15 f.

| Exit | Numbers | When |
|---|---|---|
| Hard vanish in steps | words 2 f apart | short phrase, crisp |
| Clip-edge wipe | `clipPath: inset()` L->R in 5 f, accelerating, while sliding | removing a typed line |
| Wind-up, hard replace | nudge out 0 -> 95 px with last 8 f accelerating, replace | line pulled before a cut |
| Shrink into centre | 0.55 W -> 0.28 W -> gone in ~7 f | oversized words |
| Drift up + fade | line drifts up 26-42 px accelerating | claim line before a hard end |
| Backspace one letter / 2 f | R->L, survivors don't move | name erased as a mark transforms |

**WHEN** you must fade a word -> **DO** pair it with outward motion or a replacing object.

## 6. Key-word emphasis (one device per line)

| Device | Numbers | Film |
|---|---|---|
| Selection box | solid rect behind the word, 4-5 f, 1 empty frame between boxes, hard in/out, fired when the line completes | product-mechanic |
| Hand-drawn loop | 5 px stroke, round caps, ~9 poses held 2 f each (on twos), drawn from under an object | editorial |
| Reticle | 4 thin lines drawn by travelling dashes over ~11 f | technical |
| Accent / size | accent colour on the argument noun, or 10-40% larger | any |

Start the highlight when the line is readable (~18 f after completion for a loop). Never
underline, never glow.

## 7. Typing (product input fields only)

Readable content 14-30 chars/s, irregular; long prompt/result 70-85 chars/s in 3-6 char bursts.
Author the cadence as data (see ui-demo.md section 4). Caret 1 f early, solid while typing,
blinks only in idle waits on its own clock. Prompts end without a period; hold 15-18 f with a
blinking caret before the cursor moves. Proof the copy: a typo in your own copy is not a style.

## 8. Numbers

**Hero number arrives:** one value per frame, step sizes decaying, 15-23 steps over 15-27 f;
last 3 frames barely move so it lands. Never an eased tween of the digits.

**Role decides the landing:** hero claim ends round (100.00, 10%); product data ends un-round
(522.14, $194.67). Proof-texture numbers appear complete, no count-up.

**Two quantities compared:** same height (hero numerals 0.22 H), sentences at 6.5-8% H, second
figure left cropped and moving at the cut.

Use `font-variant-numeric: tabular-nums` so digits don't jitter while counting.

## 9. Reading time

Floor 14 f after the line completes (only with voice carrying it); ~6 f per word for 2-5 words
(3 words 18-27 f, 5 words 30 f); 51-60 f for 6-8 words on two lines; single number 15-36 f.
Phrases shorten through a film; the last one lingers. UI texture text gets no reading time.

## 10. No dead frame while holding

**WHEN** a line holds -> **DO** keep one living thing: lateral drift 1-1.5 px/f, shrink 5-10% per
second, 0.02 H vertical creep, a caret, a counter, light moving on the ground. Accelerate 2-5x in
the last 2-8 f before the cut. True static holds only after a payoff, 15-20 f.

```ts
const drift = (frame - landed) * -1.2;                       // px, linear: cruise
const lean = tween(frame, cutAt - 6, 6, 0, -40, "crashOut");  // pulled into the cut
```

## Slop tells

| AI default | Do instead |
|---|---|
| Opacity 0 -> 1 on every word | Rise with fast head + long tail, hard step, or blur-resolve |
| Headline typed letter by letter with caret | Whole words on speech rhythm |
| Constant 3 f per word | 5,5,3,3 f; longer gap before the stinger |
| Bounce on every pop | No overshoot; 80-90% in the first 8-10 f |
| Bold for emphasis | Size, one accent word, or one device |
| New accent colour per line | One accent, 4-8 f on arrival, decays to ink |
| Smooth count-up to round number | Per-frame decaying steps; un-round product data |
| Every phrase held 60 f | 14 f floor, ~6 f per word |
| Re-centring survivors after a delete | Survivors stay put |
| Centred lines held still on flat grounds | Paced to speech, drifting, something alive under it |
| Tracked small caps for kickers/labels | Sentence case at role size; no labels |
