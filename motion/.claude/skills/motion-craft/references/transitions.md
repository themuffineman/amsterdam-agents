# Transitions: how beat A becomes beat B

Adapted from motionmaxxing `references/transitions.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Numbers measured from 53 human-made moments
(M913-M974). Rewritten for Remotion: frames at 30 fps, `<Sequence>` = cut, helpers from
`src/lib/eases.ts`. Format: **WHEN** -> **DO** -- *because*.

No `@remotion/transitions` in this project. Every join below is a hard `<Sequence>` boundary made
invisible by motion, a carried object, a mask, or an effect that becomes the next ground.

## 1. Anatomy of a cut

1. A accelerates into the cut over its last 3-8 f (`accelExit` / `crashOut`, biggest step on
   the last frame).
2. The cut: one frame, zero fade.
3. B's frame 0 is already moving or already built (a card 105 px into its slide, a modal at
   1.42x already shrinking).
4. Optional 0-3 empty frames where A's vector continues.
5. B's entrance continues A's direction.

**WHEN** you plan a cut -> **DO** spec A's last 6 f and B's first 6 f together: object,
position (within 0.02 of frame), scale, colour, blur, velocity -- *because* in every measured
handoff something concrete is identical across the cut.

**WHEN** a beat ends -> **DO** end on a peak (fastest frame of an exit, max compression, mid-shrink)
-- *because* B inherits momentum. Settled endings are rare (2 of 53).

```tsx
// A (frames 0-89) exits on accelExit ending exactly at the cut; B starts displaced and moving.
const A_END = 90;
<Sequence durationInFrames={A_END}><SceneA exitAt={A_END - 13} /></Sequence>
<Sequence from={A_END}><SceneB /></Sequence>   // SceneB: enter(frame, 0, { from: { x: -120 } })
// Inside SceneB, frame 0 must NOT be the rest pose. enter() at=0 is mid-travel by frame 1.
```

## 2. Choosing a transition (by what changes)

| What changes A -> B | First choice | Start numbers |
|---|---|---|
| Only state (same UI) | T1 hard cut on motion + T2 carried object | cut at peak velocity |
| Ground (dark <-> light) | T3 effect becomes ground | bead x1.5-2.2 per 2 f, ~17x total |
| Scale (different distance) | T14 scale cut + content jump same frame | 3.7x in 1 f |
| Subject, content-heavy both sides | T7 feathered wipe in B's ground | feather 0.31-0.42 of axis, 17-18 f |
| Text line -> text line | T19 hard replacement | 1 f swap; or T8 clip sweep 5 f |
| Brand -> product | T11 dive into a logo detail | `dive()` 9 f, 3 blank f |
| Product -> sign-off | T4 container contraction + T1 | UI to 0.53x, mark at same centre |
| Question -> answer | T8 two soft masks, erase ahead of reveal by 3 f | |
| Breadth / many items | T20 strobe | 4 f per plate, first plate 2 f |

## 3. The mechanics

**T1 Hard cut on motion.** WHEN any scene boundary (default) -> DO cut on A's fastest frame;
B opens mid-move (frame 1 already 53% of its slide, 72% by f4) -- *because* the eye carries the
velocity across. If B is an empty field, let it arrive built, then move it (panel drops 0.09 H
decelerating while an overlay clears in ~11 f).

**T2 Carried object.** WHEN two scenes must read as one take -> DO keep one object (dot, caret,
card, headline, cursor, ground colour) at the same screen position (within 0.02), scale and
velocity on both sides of the `<Sequence>` boundary -- *because* the object that doesn't change
carries the eye. Write a handoff table: one row per seam.

```ts
// Shared handoff constants: both scenes import them so the match is exact.
export const CARRY = { x: 0.33, y: 0.15, w: 0.37, radius: 16, vy: -6 /* px/f at the cut */ };
```

**T3 Effect becomes the next ground.** WHEN the ground must change -> DO grow the product of A's
last action until it fills the frame and IS B's ground: a 0.04 W bead growing x1.5-2.2 per 2 f
into a full-frame disk (~17x), a band sweeping with a 25 px blurred edge, a feathered wash --
*because* the change has a cause and a direction. Never a white flash.

```ts
const s = dive(frame, 0, 6, 1.6);   // constant-octave growth, ~17x over 6 f
// render a circle of r = 0.02 * W * s, clipped to frame; B's ground colour = circle colour
```

**T4 Container replacement.** WHEN A ends on an input/list and the result is a box -> DO contract
A's container ~9% on `gentleIn` (biggest step last), then replace it outright at full size on the
next frame, ground one step darker (#ECEBE3 -> #C4C2B1). A 1-frame empty card/capsule may hold the
slot -- *because* the cut is the proof of the click; no loading frame.

**T5 Grey dip hiding a theme flip.** WHEN light -> dark plus a 1.5x magnification would show -> DO
contrast wash 30% -> 65% -> one flat #7D7D7D frame -> dark under a grey veil -> clear (4-5 f
total), while the sliding object keeps sliding -- *because* the dip hides two jumps at once.

**T6 Blur-matched cut** (smear grammar films only). WHEN cutting between zoom levels with blur ->
DO ramp A's blur over 3-8 f up to ~18 px, start B at >= that (up to 80 px) and resolve over ~8 f
-- *because* equal-or-more blur on the incoming side hides the discontinuity.

**T7 Wipe that starts in A, finishes in B.** WHEN both scenes are content-heavy -> DO start a
feathered wipe in B's ground colour in A's last frames (feather 0.31-0.42 of the axis, 17-18 f
total, short wash 8-10 f), finish it in B's first 3 f over a blurred remnant of A; B's hero enters
3 f before the wipe completes; rotate direction across the film (R->L, B->T, B->T, R->L) --
*because* the overlap kills dead time and the wipe reveals rather than erases.

```tsx
// Feathered wipe as a CSS mask, a pure function of frame:
const p = tween(frame, start, 17, -0.4, 1.0, "softInOut");   // edge position, incl. feather
const mask = `linear-gradient(90deg, #000 ${p * 100}%, transparent ${(p + 0.36) * 100}%)`;
<AbsoluteFill style={{ background: B_GROUND, WebkitMaskImage: mask, maskImage: mask }} />
```

**T8 Clip-edge wipe through glyphs.** WHEN a line is replaced in place -> DO sweep a
`clipPath: inset(0 0 0 X%)` through it in 5 f, accelerating (visible fraction
0.94/0.87/0.76/0.33/0.23/0), while the line slides the same way; or two soft masks where the
erase front leads the reveal front by ~3 f with a 25-45 px accent leading edge -- *because*
mid-glyph cuts feel physical. Never crossfade.

**T9 Stair / block wipe.** WHEN the world is a grid or stepped shape -> DO advance the wipe front
in whole grid steps (0.06 W = 115 px at 1920), no interpolation, 2 f per step --
*because* the grid is the unit.

**T10 Pixel dissolve.** WHEN a field becomes a logo or number, AND the brand's texture is pixels
-> DO real cells 1.5-2.5% W with stepped coverage 90 -> 60 -> 35 -> 10 -> 0% over ~10 f, opening
from the bottom. Seed cell order with `random(seed)` from `remotion`, never `Math.random()` --
*because* hard cell occlusion reads as craft; opacity reads as default.

**T11 Dive into a logo detail.** WHEN brand -> product -> DO `dive(frame, at, 9, 1.6)` (~69x),
translate following the detail (an underscore, a dot), not frame centre; detail becomes a pill
that fades in place over 3 f, 3 blank frames, then the product container zooms OUT from beyond
the frame over ~19 f -- *because* "the logo contains the product".

**T12 Pull-back reveal with snap.** WHEN "it was inside a real product" is the beat -> DO start on
one fragment at ~3.3x, creep 3.31 -> 3.01 over ~12 f while the rest of the UI comes up behind,
then `cameraSnap(frame, at, 2.5, 1.0, { share: 0.56, tail: 17 })`, released ~12 f after the last
completion beat -- *because* completion releasing the camera reads as cause -> effect.

**T13 Whip pan with content changing during the whip.** WHEN moving between regions of one UI ->
DO pan ~8 f with peak ~13% W/f at t = 0.25 of the move; old content exits and new content enters
INSIDE the pan; keep one constant-size anchor (cursor, badge). Crisp films: no blur --
*because* the change hides inside the speed.

**T14 Scale cut.** WHEN the scale change is an edit, not a camera -> DO change scale in one
frame (e.g. 0.037 W -> 0.136 W, 3.7x) AND change content in the same frame; background keeps its
own scale and drift -- *because* a zoom tween announces itself; a snap reads as editing.

**T15 Ground flips by act.** WHEN acts differ (data world vs claim; product vs sign-off) -> DO
flip by a growing object, a band crossing the frame, a cut hidden in fast motion, or a
15-21 f sRGB ramp timed to what is leaving -- *because* the flip has a cause. Never number the act.

**T17 Occlusion.** WHEN the new scene sits "on top" -> DO a surface rises over the old content:
62% of 0.61 H travel in the first 4 f (`snapSettle`), no overshoot, old content hidden bottom-up
-- *because* occlusion implies physical space; fades imply slides.

**T18 One-frame double exposure / ghost.** WHEN the cut should be felt, not seen -> DO exactly ONE
frame at 50% A over B, or a 2 f ghost of A's headline behind B's hero -- never more.

**T19 Hard replacement of a word or line.** WHEN a phrase replaces another -> DO swap in 1 f
with at most 1 empty frame; or drop leading words 1 f at a time without re-centring, then append
new words; or a wind-up (line leans out 7 -> 14 px/f over its last 2 f) then a hard replace --
*because* the fixed anchor (left edge, centre) carries the eye.

**T20 Strobe reel.** WHEN breadth must read without reading each item -> DO hard-switch full-bleed
plates on a 4 f rhythm (first plate 2 f), or a syncopated 4/2 f pattern, inside a fixed container,
entered and exited on peak-velocity cuts.

## 4. Cadence

**WHEN** setting shot lengths -> **DO** cut every 10-70 f inside a beat (10 f on a beat grid, 11 f
for item swaps, 21-39 f for stinger beats, 45-75 f for claim/product phases); shorten scenes
toward the end, let the last scene linger (51 / 45 / 24 / 43 f) -- *because* rhythm is the pace of
cuts.

**WHEN** music-led -> **DO** cut on a constant interval (10 f x4), state complete at the cut,
secondary detail echoing 1-3 f later. **WHEN** voice-led -> **DO** land onsets on the spoken word;
a wipe leads the voice by ~5 f.

**WHEN** picking a transition shape -> **DO** build it from geometry already in the film (the
logo's own mark, the brand's cell grid, the carrier dot) -- *because* a generic slide-in reads as
a template.

**One grammar.** Crisp film: T1, T2, T4, T9, T10, T14, T19, crisp T13. Smear film: add T6 and the
blurred whip. Never both.

## Slop tells

| AI default | Do instead |
|---|---|
| 15-frame crossfade between scenes | Hard cut on motion, feathered wipe in B's ground, or effect becomes B |
| Chapter number / title card | Ground change + carried object |
| Cut after everything settled | Cut at peak velocity; B opens mid-move |
| Fade to white/black to change ground | Growing bead -> disk, sweeping band, 4 f grey dip, 15-21 f ramp |
| Zoom-tween into next scene | One-frame scale cut + content jump, or `cameraSnap` |
| Fade old headline out, new one in | Hard replace, backspace drop-outs, two soft masks |
| Logo dissolves in over 20 f | Stepped cell coverage ~10 f, or `dive()` |
| Spinner between scenes | 1-f placeholder card at full size |
| Whole-frame glitch pass | <= 6 f localized rects, one cut inside |
