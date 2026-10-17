# Layout: where things go

Adapted from motionmaxxing `references/layout.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Frame = 1.0 x 1.0, origin top-left. W = width,
H = height. Type sizes are em as % of H. Format: **WHEN** -> **DO** -- *because*.

## 0. Page chrome is never in the film (gate G5)

The only text on screen is the claim, the product's own UI words (inside the UI fragment), and the
logo once. Delete, don't justify:

| Pattern | Looks like |
|---|---|
| Corner/edge label | small repeated text in the outer 12% band (x < 0.2 or > 0.8, y < 0.14 or > 0.86) |
| Tracked-caps label | "BRAND NAME", "A NEW MODEL FROM..." |
| Chapter counter | "02 / SPEAK", "Step 2", "Act II" |
| Timecode / metadata | "T+01.6s", "120 BPM", "1920x1080", version numbers |
| Header/footer bar | a strip holding logo, nav, price, URL |
| Kicker | small line directly over a headline |
| Progress bar / hairline | thin line that fills |
| Corner brackets | L-marks in the corners |
| Scene label chip | "Messages", "Editor" naming the shot |
| Deck layout | left headline block at x < 0.2 beside right-side media |
| Pinned element | pill/dock/caption at identical coordinates across 3+ shots |

## 1. Coordinates

| Zone | Coords | What lives there |
|---|---|---|
| Centre band | y 0.43-0.55, baseline 0.52-0.54 | every one-line statement, counter, lockup |
| Optical centre x | 0.46-0.50 | final titles sit left of true centre (x 0.46-0.47) |
| Sub-line | y 0.57-0.61, 0.05 H, light grey | only under a name/lockup, never under a held headline |
| Left margin x 0.10-0.14 | | only a one-line split phrase on screen < 36 f, handing to an object on the right |
| Outer 0.12 W / 0.10 H band | | empty, or cropped CONTENT. No text, label or logo |

**WHEN** a statement is one centred line -> **DO** baseline at y 0.52-0.54, ink span 0.30-0.56 W
for 3-5 words at 6.5-10% H; cap held statements at ~0.8 W, break to two lines beyond (line pitch
1.15-1.35 em) -- *because* the eye rests slightly above centre and 40-57% of frame stays free.

Ink width estimate (16:9, tight Inter-class): `W_frac ~= 0.47 * em_fracH * chars / 1.78`.

## 2. How many things, how much empty

**WHEN** composing any beat -> **DO** 1 hero + at most 2 supporting elements (UI frames: card + 3
rows; hook peaks: up to 4 groups for < 15 f) -- *because* a 4th element must replace one.

**WHEN** judging density -> **DO** ink + objects 5-44% of frame area; the rest is a BUILT ground
(world.md), not a flat swatch -- *because* free space makes one line loud; flat empty space is
minimalism as a hiding place.

**HARD GATE G4:** two panels side by side only if one is >= 2x the other's area, or the camera
moves between them. Otherwise one object per frame and cut or move the camera between them.
Equal panels are allowed only when the claim IS a comparison (same height, shared baseline).

## 3. Type size by role

| Role | em % H | Weight |
|---|---|---|
| UI texture (inside UI only) | 1.3-1.9 | 400 |
| UI card text | 2.2-2.5 | 400 |
| UI prompt (the readable object) | 4-5 | 370-450 |
| Supporting phrase | 5-7 | 350-450 |
| Headline | 7-11 (9 typical) | 400 (500-550 branded) |
| Emphasis word | 16 | 550 |
| Hero number | 22-29 | 400-500 |
| Opening thesis word | 33 | 400 |
| Wordmark | 9-14 (ink 0.22-0.38 W) | 500-600 |

Text that must be read: >= 4% H. Below 2% H it is texture and no one is asked to read it.
Hierarchy by size, not weight.

## 4. UI framing

**WHEN** UI is the proof -> **DO** modal/dashboard 1.4-2x, one card or button 2.3-4.4x, then pull
back; exactly one readable object at 0.04-0.12 H, everything else 1.3-1.9% H texture.

**WHEN** a container is bigger than the frame -> **DO** let it overflow (box 1.78 W, card 0.90 W
with the lower half cropped) and crop text by the box edge instead of wrapping -- *because* the
viewer infers a larger system from the part.

**WHEN** one clip hands to the next -> **DO** carry geometry across the cut (same right edge,
same row y-positions, same column stops).

## 5. Layer order (back to front)

1. Ground (a surface). 2. Texture (screen-fixed, never in the camera group, never above text).
3. Background UI, defocused 4-11 px. 4. Hero object / camera group. 5. Claim text, screen-fixed,
never blurred. 6. In-front accent only if the story needs depth. 7. Caption pill. 8. Cursor, own
top layer.

**WHEN** a headline and a device share the frame -> **DO** headline BEHIND the device, one small
accent in front of its corner.

**WHEN** something must disappear under another -> **DO** occlude it, don't fade it.

## 6. Cards, rings, lockups

- Fan of 3: centre on top, sides at -18 and +8 deg (asymmetric), centre hides 1/3-1/2 of each.
- Ring of items: ellipse, upper items smaller, each entering at its own slot, never from one point.
- Orbit: irregular sizes, tall ones outside, upright, constant size while moving.
- Grid: orthogonal lattice with 5-10 px seeded jitter, never hex or random.
- Lockup: wordmark ink 0.22-0.38 W (modal 0.27), icon 0.05-0.14 W left of it, gap 0.02-0.06 W;
  centre the combined box on x 0.50, y 0.50.

## 7. Edge cropping

Crop CONTENT on purpose (avatars on the edge, phone corners off-frame, a card 0.20 W of its edge
showing, a second figure cropped and moving) -- *because* cropping says "there's more than you see".
Text and logos stay out of the outer band unless the crop is the point. An oversized first word
clipped at the left edge as it shrinks: once per film.

## 8. Aspect ratios

**16:9 (1920x1080):** all numbers above. Source numbers were on a 1280 stage: multiply px by 1.5.

**9:16 (1080x1920), practice:** size type by W (headline 8-10% W = 86-108 px); break statements
to 2-3 lines of <= 0.8 W; keep the centre band at y 0.40-0.52 (platform UI covers top ~0.10 and
bottom ~0.20); stack instead of splitting (hero y 0.30-0.40, labels y 0.62-0.70; icon above
wordmark).

## Slop tells

| AI default | Do instead |
|---|---|
| Brand label, counter, kicker, header, footer | Nothing: claim, product, logo once |
| Left headline + sub-line + device right | One centred line, a split phrase, or headline behind a cropped device |
| Everything at exactly (0.50, 0.50) | Baseline 0.52-0.54; final title x 0.46-0.47 |
| Small card in a dark void | Fragment >= 0.55 W, text >= 0.04 H, in a world |
| Code and result side by side | One object per frame (G4) |
| 6-8 elements per beat | 1 hero + 1-2 supporting |
| Symmetric fan, equal orbit | Asymmetric -18/+8; irregular upright orbit |
| Everything inside safe margins | Deliberate content crops; text stays in |
| 16:9 numbers reused for 9:16 | Size by W, stack, keep platform bands clear |
