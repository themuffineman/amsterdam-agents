# Motion rules (measured defaults)

Source: motionmaxxing (Apache-2.0), `references/motion.md`. Numbers are from ~4,300 moves
decoded frame-by-frame from 53 human-made motion moments. Frames @30 fps. Where a rule
disagrees with your taste, the number is the default and your taste is a signature move:
use it once per film, on purpose.

## Duration by property (median, p25-p75)

| Property | Median | Range |
|---|---|---|
| translate x / y | 12 f | 6-24 f |
| scale | 10 f | 5-22 f |
| rotation | 11 f | 6-21 f |
| opacity | 6 f | 4-12 f |
| blur | 7 f | 4-10 f |

All moves pooled: 10 f (0.33 s). 13% of moves are 2-3 f snaps. If you have no other information:
translate/scale entries 12 f, opacity 6 f, blur 7 f, exits 13-14 f.

## By role

| Beat | Entry | Notes |
|---|---|---|
| hook | 12-14 f | most overshoot (12%), glide/cruise heavy |
| turn | 12-15 f, exits 14-16 f | built on things pulled away; lean on acceleration |
| proof | 12-14 f | quieter, ~6% overshoot |
| cta | **6 f** | most staccato; `snapSettle` + `softLand`, no overshoot; stack gaps ~8 f |

## Which ease

| Moving thing | Ease | Frames |
|---|---|---|
| Card / panel landing | `softLand` | 12 |
| Hero entry or CTA element | `snapSettle` | 11, up to 18-30 for a hero mark |
| Whole word arriving | `softLand` | 12-15 |
| Medium move | `glide` | 10 |
| Big fast move / whip entry | `whip` | 7-8 |
| **Anything leaving** | `accelExit` | 13 |
| Hard exit into a cut | `crashOut` | 17 |
| Fade | `cruise` | 4-7 |
| Opacity/blur/colour ramps | `softInOut` | 9 |
| Drift, counters, ambient | `cruise` | 26+ |
| Small bounce (rare) | `popOver` | 15 |
| Slam | `crashIn` | 10 |

## The laws

1. **Land decelerates, leave accelerates.** 58% of landings ease out; leaving is 37% ease-in
   (scale exits 42%, blur exits 63%). Same object on the wrong curve reads floaty or thrown.
   An exit across the frame ends at peak speed.
2. **Move, don't fade.** 3,392 transform entries vs 584 opacity fades. Entry = offset/scale/blur
   decaying. Opacity is a 4-6 f helper (0.15 -> 1) at most. 16% of entries and 25% of exits
   are hard 1-frame steps; use them for "system event" things (rows, UI state).
3. **Nothing grows from zero.** Identity objects (logo, word, card, cursor) arrive decelerating
   from 1.4-5x oversize, or move in from an edge. Exceptions: items in a 1-f cascade, a growing
   object that IS the next scene, and identity objects starting no smaller than ~0.3-0.6x.
   Spend oversize **once per film**; let the ending get smaller.
4. **Overshoot is rare and late.** Under 9% of moves, peaking after 35% of the duration
   (a slow lean, not a fast spring). Max one `popOver` per beat. One visible spring per film
   (payoff only, +4-6%). `bounceHard` almost never.
5. **Stagger is uneven and overlapping.** Gaps 1-3 f (56% of gaps are 1 f), e.g. 3,2,2,2,2,2.
   Each move ~2x longer than the gap so tails overlap. Never a uniform 0.1 s timer.
   Whole words run slower than letters (2-5 f). CTA stacks widen to ~8 f.
6. **Cut on motion.** 96% of moments use hard cuts, ~20 per moment. Cut mid-move. The next
   scene's first frame is already moving. Carry one object, string, ground or pose across
   the cut. Crossfading between scenes is the AI default; single objects may fade, scenes don't.
7. **No dead frame.** Anything held > 3 f needs one living thing: 1-3 px/f drift, 0.5-1% scale
   creep, sweep, caret, light moving on the ground. Payoff holds 0.5-1.0 s. A designed breath
   (0.6-1.5 s, before a payoff) is allowed. End hold <= 1.4 s. End mid-motion, not at rest.
   (Whole human films breathe; the "99% of frames move" stat is for 3-7 s moments, not a target.)
   **Drift is bounded.** A living drift is a fixed small total over the hold (`drift()` in
   `src/lib/scene.tsx`: <= ~2% W, e.g. 24-40 px at 1920), never px-per-frame forever, and a
   camera creep is capped (+2.5% scale, `MAX_CREEP`). Unbounded drift walks text and tables off
   screen on long voiced holds. Clamp the camera to the content's edges (no looking past it).
8. **One camera group.** The whole UI is one transform. Cursor on its own top layer. Text is
   never zoomed separately. Camera reveal = one-frame snap (ratio 0.56-0.77) + 9-18 f tail.
   Multipliers by duration: 6 f punch ~1.25x, 12-18 f ~1.4x, 20-45 f ~1.5x, slow drift 2.4x.
   Pans are two pushes with different accelerations, parallax layers at 2-2.4x speed ratios.
9. **One clock per moment.** All smooth 30/60, or all on-twos (even frames), or 12 fps drawn
   things under a smooth camera. Mixed step rates read as a bug.
10. **One blur grammar per film:** per-element smear on frame 0-1 of fast moves, OR crisp
    steps, OR render-time shutter blur (never combined). Backdrop blur behind a headline
    capped ~11 px; the type stays sharp.
11. **Press = squeeze, not ripple.** Cursor squeezes to 0.71-0.9 in 2-6 f, target squeezes
    0.63-0.81 one frame later and hard-steps its colour, slower release. No ripple ring, no glow.

## Type

- Words arrive **whole** on the speech rhythm (2-5 f apart, longer gap before the stinger),
  from an offset 0.03-0.24 H with 3-6 px blur clearing in 4-8 f. Never opacity alone, never
  letter-by-letter with a caret (typing only inside a real input field).
- Weight 400-550 everywhere; bold only on a wordmark (<= 600) or one headline word.
  Hierarchy by scale (headlines 7-11% H, hero figures 22-29% H), not bold.
- Display tracking -1.5% to -5% em. Charcoal ink (#383837-ish) over pure #000 except hero figure.
- Surviving words never re-centre when others leave.
- One family. No lone serif-italic accent word.

## Colour

- One hue for "arriving / machine acting", at most one signal colour (green = done).
- Arrival tints settle to ink within ~6 f; words are not permanently coloured.
- No glow as wallpaper; a halo only at an event, decaying in ~0.3 s.
- Ground is a surface (light, texture, real material), not a flat swatch per scene.

## Numbers

- Counters step one value per frame with decaying step size, skipped values; product fields
  end un-round, claims end round. Never a linear tween between integers.
