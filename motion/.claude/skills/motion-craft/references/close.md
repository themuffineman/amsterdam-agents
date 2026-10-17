# Close: CTA, logo and endings

Adapted from motionmaxxing `references/close.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Frames at 30 fps. Format: **WHEN** -> **DO** --
*because*.

**The logo arrives by cause** (a click, a result, a camera move, the end of a motion), not by
default. An ending is one beat, usually smaller than the climax before it.

## Hard gate (G3)

**WHEN** timing the end -> **DO** resolved end hold (lockup landed -> last frame) 18-42 f
(0.6-1.4 s); whole CTA beat <= 25% of the film -- *because* a mark registers in ~15 f and a name
in ~30 f; the rest is the viewer waiting. A slow contraction does not make a long hold OK. Need
more length? Add a proof beat, never logo time.

## Universal rules

**WHEN** sizing a lockup -> **DO** wordmark ink 0.22-0.38 W, icon 0.05-0.14 W, gap 0.02-0.06 W,
centred, ~95% of frame free (but the free part is a lit ground).

**WHEN** adding copy -> **DO** zero or one tagline (one line, 0.05 H, light grey). Most closes have
none. Never logo + tagline + button + URL (web footer).

**WHEN** a mark enters -> **DO** decelerate in from 1.5-3.75x (`snapSettle`, then `cruise`
creep); never scale up from zero, never fade up. If scale was already spent earlier in the film,
arrive at ~1.1x on a long ease.

**WHEN** the lockup is resolved -> **DO** keep something alive the whole hold: scale creep
(1.008 -> 1.001), an accelerating contraction in the last 6 f, a sweep on a fixed period (~21 f),
a slight sway. One static hold allowed: 15-20 f after a settle.

**WHEN** ending -> **DO** NOT fade the lockup out. End mid-motion, on a one-frame placeholder,
or on a hard cut. Calm brands may end calmly (about 22 of 51 human films) when it follows
sustained motion and the mark arrived by cause.

**WHEN** building toward the end -> **DO** scenes that shorten then the last lingers (51 / 45 /
24 / 43 f), hard cuts, no hold > 15 f before the last scene.

## The closes (pick from the idea first, then brand personality)

| Close | Mechanics | Fits | Hold |
|---|---|---|---|
| C1 Wordmark crash-in | hard cut to inverted dark ground; name enters 3.5-3.75x, 39% of collapse in 1 f, ~86% by 6 f, 1.0 by 20 f, then keeps contracting (0.93 by 36 f) and accelerates out in the last 6 f. Premium-pastiche risk: only for genuinely dark/weighty brands | premium/dark | 36-43 f |
| C2 Logo built from parts | stems/bars/line built in discrete steps, solid in ONE frame. House-style risk: only if the mark really is repeated parts | dev/enterprise | 18-36 f |
| C3 Emblem blur-down | enters 0.28 W, 18 px blur; every 2 f halves the excess (0.28 -> 0.19 -> 0.14 -> 0.12 -> 0.10 W); blur 18/9/4/2/0.6/0; name types 1 letter / 2 f, no caret | quiet/editorial | 20 f static |
| C4 Icon settling from 1.86x | hard cut to white; 48% of travel in 4 f, 67% in 10 f, last 0.5% over 60 f | minimal pure-shape mark | settle is the motion |
| C5 Pixel resolve | cells 1.5-2.5% W, coverage 90/60/35/10/0% over ~10 f from the bottom (seeded) | data/technical brands whose texture IS pixels | 21-42 f alive |
| C6 Name morph | per-glyph flip with fixed left anchor, ~1 glyph per 1-1.2 f | rebrand, "X to Y" | 0 |
| C7 Dive into the logo | `dive(frame, at, 9, 1.6)` into a logo feature that becomes the product's input | dev tools | 0 |
| C8 Button click, cut before release | button blooms from 0.60x (31% of travel on frame 1, 1.0 by 20 f); oversized cursor; one-frame click; last 7 f shrink accelerating; cut at max velocity | consumer/dev CTA, button is the product's own control | 0 |
| C9 Typed prompt, cut before send | human cadence, solid caret, film ends 3 f after the pointer reaches send | dev/AI tool | 0-15 f |

**WHEN** two closes tempt you -> **DO** use one.

## Slop tells

| AI default | Do instead |
|---|---|
| Logo fades up with a bounce + tagline | Hard cut, enters 1.5-3.75x, exponential settle, 0-1 tagline |
| End card 3-5 s with slow contraction | 18-42 f resolved hold; CTA <= 25% |
| Logo held still 60 f then fade to black | Alive hold, end mid-motion |
| Click ripple then show the result | Squeeze, cut before release |
| Mark scales up from zero | Oversized and blurred, halve excess every 2 f |
| Glow on everything | Light at the sign-off only, if the brand is dark |
| Big gradient "Get started" button | Small lockup, CTA at 7% H with focus-in words |
| Logo + "Download" pill + cursor | The product's own control pressed, cut before release |
| Every film ends with the dot becoming the logo | The logo arrives by cause |
