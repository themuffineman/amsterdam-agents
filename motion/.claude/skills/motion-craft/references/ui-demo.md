# UI demo: showing a product working

Adapted from motionmaxxing `references/ui-demo.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Numbers measured from human-made moments
(M913-M974), converted to 30 fps. Rewritten for Remotion with `src/lib/eases.ts`.
Format: **WHEN** -> **DO** -- *because*. Positions are 0-1 of frame; sizes % of W or H.

A UI demo is a magnified fragment of a real product, one pointer, and a chain of cause and
effect readable in under a second per link. It is not a screenshot with animation on it.

## 0. The case (decide before any mechanics)

**WHEN** demonstrating a product -> **DO** follow ONE specific case with stakes from trigger to
result (one lead found -> the message that lands; one trade -> the alert that fires), not three
features -- *because* a case is a story; a feature tour is a deck of cards.

**WHEN** filling UI with content -> **DO** use the real sender, icon, time, sentence and numbers
from `brand/<slug>/` (copy.json, screens) -- *because* "Project Alpha", lorem ipsum and round
stats prove nothing was gathered. Anything rebuilt or invented is declared in the film's notes,
never on screen.

**WHEN** the product "thinks" -> **DO** show an object from the customer's world or the real log,
never an orb, sparkles, neural net or scrambled glyphs.

**WHEN** copy names a capability -> **DO** show its consequence (the line crosses the threshold,
the notification fires) and put the proof before the line.

**WHEN** reaching for "prompt box + send arrow + cursor click" -> **DO** use it only if the product
is genuinely typed into -- *because* as a default structure it's a 2025-26 cliche.

## 1. Framing

**WHEN** the UI is the proof -> **DO** crop to ONE object and magnify it with the camera group:
card 3.3x (0.76 W x 0.44 H), prompt 1.6x, dashboard 1.7x, modal 1.4x, single button 2.3-4.4x.
Keep top and bottom ~28% of frame quiet -- *because* the viewer reads one thing at a time.

**HARD GATE G1:** the one readable object has text >= 0.04 H (43 px at 1080 tall, 77 px at 1920
tall) and fills >= 0.55 W, or is cropped by the frame edge. Captured UI is ~0.015 H: scale it
2-3x with the camera, never by inflating its font-size. Exception: a wide establishing shot under
30 f immediately followed by a push-in.

**WHEN** revealing the product by pulling back -> **DO** creep 3.31 -> 3.01 over ~12 f while the
surrounding UI comes up, then one-frame snap (ratio 0.56-0.77) + 9-18 f `softLand` tail, released
~12 f after the last completion beat:

```ts
// Slow-then-accelerating creep 3.31 -> 2.5, then frame 95 is already 2.5 -> 1.41
// ((2.5 - 1.41) / 1.5 = 0.73 of the way), then an 18 f decelerating tail to 1.0.
const creep = tween(frame, 76, 18, 3.31, 2.5, "gentleIn");
const snap = cameraSnap(frame, 94, 2.5, 1.0, { share: 0.73, tail: 18 });
const scale = frame <= 94 ? creep : snap;
```

**WHEN** anything moves with the camera -> **DO** one transform on one wrapper for card, panels,
chips, scrubber; ground and dot grid stay screen-fixed or drift on their own; parallax ratios
2-2.4x -- *because* one transform reads as one physical object.

```tsx
<AbsoluteFill>{/* ground: screen-fixed */}</AbsoluteFill>
<AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                       transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
  {/* ALL UI here */}
</AbsoluteFill>
<Cursor />  {/* own top layer, outside the camera */}
```

**WHEN** panning -> **DO** two phases, not one ease: `softLand` from ~1.2 H/s down to 0.18 H/s
over 60 f; or a whip (7-8 f `whip`, leaving half `accelExit`) -- *because* two pushes look like an
operator; one ease looks like a keyframe.

**WHEN** a scene opens on UI -> **DO** let it arrive built and already moving (card 105 px into
its slide on frame 1; modal at 1.42x already shrinking) -- *because* "the app was already running".

**WHEN** UI is a backdrop -> **DO** defocus by blur not opacity: 4 px (still readable), 7-15 px
(non-hero), cap 11 px under a headline + darken ~0.1; refocus 4 -> 0 px over ~14 f.

**WHEN** drawing the surface -> **DO** no browser bar, URL, traffic lights or bezel; keep the
real icon, name and sentence; 1-1.5 px hairline (#262627 dark / #DCE1DE pale); radius ~0.2 x card
height for prompt cards; shadow none or <= 12% -- *because* chrome is the strongest stock-recording
tell.

**WHEN** output cards appear -> **DO** keep live content playing in them (`<OffthreadVideo>`
cover-fit) -- static thumbnails read as slides. Output stats appear whole; values caused by a
control animate.

## 2. The cursor

**WHEN** choosing cursor art -> **DO** one custom SVG family per film: white arrow + 3-4 px dark
outline on dark grounds; black arrow + 1 px white edge on pale. Rest size 0.04-0.06 W. Never the
OS cursor, emoji or I-beam. Arrow-only OR pose film (arrow -> hand 3-5 f before click), not both.

**WHEN** the cursor enters -> **DO** start oversized (1.5-5x) and scale about the TIP
(`transformOrigin: "0 0"` on an arrow whose tip is at 0,0); first frame covers ~60% of travel,
then a long `snapSettle` tail; total 15-27 f, 85% done by ~21 f; shrink 15-20% near the target --
*because* it reads as thrown at the screen.

```ts
const k = tween(frame, at, 26, 0, 1, "snapSettle");
const s = tween(frame, at, 26, 3.0, 1.0, "snapSettle");
// x/y on a curve: interpolate along a quadratic Bezier with k, rotate heading toward target
```

**WHEN** the cursor travels -> **DO** curve the path (arc dips up to 0.23 H on a long move) and
rotate heading with travel (~20 deg lean at peak speed); straight lines only for drags. Stepped
films: 2-frame steps, each ~0.72 of the previous, x converging faster than y.

**WHEN** reaching a target -> **DO** park 2 f (obvious button), 3-5 f (switch), 5-15 f (when the
camera must zoom first). Finish any camera move BEFORE the press. Hover states fire early (5 f
before the hand lands).

**WHEN** the cursor leaves -> **DO** accelerate off-frame (0.04-0.06 W/f at peak, curved, tilting
10-45 deg), or shrink to nothing in place over ~9 f, or ride out with the whole view. Never fade.

## 3. The click

**WHEN** a click happens -> **DO** cause then effect: cursor 2 f down to 0.71-0.90 (tip pushed
~0.03 H), 3 f back to 1.0; target 0-1 f after the cursor minimum to 0.63-0.81, glyph inside
lagging 1 f; page responds on the press-minimum frame.

```ts
// Frame-exact press (relative p = frame - pressAt). No springs, no state.
const CURSOR = [1, 0.81, 0.71, 0.88, 1.0];
const TARGET = [1, 1, 1, 0.86, 0.80, 0.93, 1.0];
const pick = (arr: number[], p: number) => arr[Math.max(0, Math.min(arr.length - 1, p))];
const cursorScale = pick(CURSOR, frame - pressAt);
const targetScale = pick(TARGET, frame - pressAt);
```

**WHEN** the click needs weight -> **DO** fast squeeze (`glide`), hold the minimum 2 f, slower
release (`softLand`), OR one `popOver` rebound to ~1.05 -- one style per film.

**WHEN** showing the response -> **DO** put it in the UI: a hard 1-frame colour step on the
target, a sheen band (25-45 px) crossing the button in 7-16 f, a bar dipping 15% and recovering
in ~4 f. **No ripple ring** (6 of 7 click films forbid it).

**WHEN** ending on a CTA click -> **DO** cut at max compression or before release (last 7 f
accelerate 0.947 -> 0.74, biggest step last) -- *because* the release then belongs to the viewer.

## 4. Typing (only inside the product's own input field)

**WHEN** text is typed -> **DO** pick rate by the viewer's task: recognise "someone typed"
~85 chars/s in bursts of 3-4 graphemes/f; read the content 21-30 chars/s, bursty; a fast field
fill ~70 chars/s.

**WHEN** authoring rhythm -> **DO** write it as data, by hand: 1-f letter bursts, 6-10 f pauses
after spaces (10 f after word 1, 6 f after word 2), skipped intermediate states (two-letter words
arrive whole), a slower last word (one glyph per 3 f). Never `Math.floor(frame * rate)`:

```ts
// [frame offset, chars visible]: authored cadence
const CADENCE: [number, number][] = [[0, 2], [1, 4], [2, 5], [12, 7], [13, 9], [19, 12] /* ... */];
const shown = CADENCE.filter(([f]) => frame - at >= f).at(-1)?.[1] ?? 0;
```

**WHEN** the caret appears -> **DO** clear the placeholder in 1 f, show a lone accent caret 1 f
before the first char, keep it SOLID while typing; blink only after typing, on its own clock
(`Math.floor((frame - end) / 8) % 2`).

**WHEN** the newest glyph needs life -> **DO** tint the leading 1-3 glyphs accent for 1 f.

**WHEN** typing overflows -> **DO** step the camera: one-frame contraction x0.77 mid-line + fast
`softLand` return, regrow ~1.13x before the send click. Numeric fields grow LEFT around a still
caret.

## 5. Toggles, cascades, checklists

**Switch:** 2-3 frames: knob moves, one pale in-between frame (#CED9DC), full colour. No glow, no
bounce. Flip ~1 f after contact.

**Cascade:** starts ~5 f after the master; per-item onsets `staggerOnsets(7, start, [4,3,3,3,2,2])`;
whole wave <= 18 f; each item its own 2-3 f flip -- *because* a wave short enough to hold in working
memory reads as one gesture.

**Checklist:** pending (dashed ring, ink) / active (spinner, GREY text #808086) / done (check, ink).
Icon swaps in ONE frame, row nudges 14-18 px right and returns over 6-8 f. ~26-29 f per row.
Baton: next row's spinner grows 2-3 f BEFORE the previous check. Rows read "verb + number".

## 6. Drag and drop

**WHEN** a card is dragged into a field -> **DO** target reacts early (grows, hover rim ~12 f
before drop), card lifts on `softLand` ~11 f with a 2 f crest hold and a -8 deg tilt, the drop is
ONE frame (card becomes the attachment, hand -> arrow same frame, fill flash).

**WHEN** a stack drops into an uploader -> **DO** cards shrink to nothing about their own centres
in 3 f each, 1 f apart, blur to 10 px. They do not fly to slots.

## 7. Agent work

**Thinking:** status text per whole word: blur 12 px + opacity 0.1 -> sharp in 4-5 f, words
back-to-back; then two shimmer passes (masked brighter copy, band ~0.23 W, 13 f each, 6 f gap).
No spinner, no dots, never per-character.

**Colour:** one hue = "machine acting", green ONLY for "done". Never both on one object.

**Volume of work:** at least three items in progress at once, ~27 f per step, verb + number.

## 8. Lists, logs, cards

**Log proving volume:** starts populated and already moving: ~6 px/f accelerating to ~250 px/f
over ~55 f, no blur; viewport may run empty after the last block; decelerate over ~9 f onto a
short readable list; hold 24 f.

**New item at top:** blank tinted card first, text pops 2-4 f later; older cards shoved in
piecewise jumps (first ~105 px in ONE frame, one 2 f hold).

**Carousel selection:** row slides ~36 f (`softInOut`, no overshoot); the stop IS the selection.

**Popup:** height-wipe in ~4 f, rows to full 1-2 f apart top-down. Never fade the whole panel.

## 9. Counters inside UI

**WHEN** a control moves numbers -> **DO** drive all of them every frame off ONE handle value on
`softInOut`, no overshoot.

**WHEN** numbers must feel real -> **DO** product fields end un-round ($194.67), hero claims end
round; skip values, hold 1-3 f per value, step size decaying. Never `Math.round(tween(...))` over
a linear ramp:

```ts
// Authored decaying steps: [frame offset, value]
const STEPS: [number, number][] = [[0, 2.71], [1, 6.5], [2, 12.5], [3, 21.3], /* ... */ [22, 522.14]];
const value = STEPS.filter(([f]) => frame - at >= f).at(-1)?.[1] ?? STEPS[0][1];
```

**Timecode / scrubber on screen:** creeps sub-pixel during holds; never ticks.

## Slop tells

| AI default | Do instead |
|---|---|
| Three features, each in its own card | One case with stakes, trigger -> result |
| "Project Alpha", "Good morning", status dot | Real sender/icon/time/sentence from brand capture |
| Orb/sparkles for "AI thinking" | Object from the user's world, or the real log |
| Whole app window with title bar | One fragment at 1.4-4.4x, pull back to reveal |
| Small 0.3 W card floating in empty ground | >= 0.55 W, text >= 0.04 H, cropped by frame or in a world |
| Smooth ease-out zoom into the UI | `cameraSnap` + 9-18 f tail |
| OS cursor, straight constant-speed path | Custom SVG, oversized entry about tip, curved path |
| Click with ripple ring | Squeeze 0.71-0.9, target 0.63-0.81 1 f later, colour step |
| Uniform typing + blinking caret | Authored cadence data, solid caret while typing |
| Toggle with long ease + glow | 2-3 f: knob, pale frame, colour |
| Uniform 0.1 s cascade | `staggerOnsets` with uneven 2-4 f gaps |
| Linear count-up to round number | Authored decaying steps, un-round product values |
| Backdrop blurred to mush (20 px) | 4 px readable, 7-15 px non-hero, cap 11 px under type |
