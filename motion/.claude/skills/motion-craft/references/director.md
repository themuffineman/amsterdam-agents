# Director: planning before animating

Adapted from motionmaxxing `references/director.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Frames at 30 fps. Format: **WHEN** -> **DO** --
*because*. Fill the worksheet (section 6) before writing a composition.

## 0. PAGE, script cues, importance budget

**PAGE**, one line each: **P**roblem (a true, annoying situation, not a feature), **A**udience
(who, where: muted feed?, how long), **G**oal (the one thing they do/think after), **E**motion
(what they feel at the end that they didn't at the start).

**Script cues:** mark every number, abstract noun, name and contrast word. Each gets a visual: a
number becomes a physical quantity, an abstract noun an object, a name the real mark, a contrast
a before/after cut. Mute test: does the picture alone tell the story?

**Importance budget:** each beat gets 1, 2 or 3. At most 25% of beats are 3. Importance 3 gets
the scale, camera move and hardest work; 1 is small and quick -- *because* animating every line
as important is the most common AI tell.

## 1. Beat roles

| Role | Viewer must come to believe | Length |
|---|---|---|
| hook | A specific promise was made by competent people | 93-189 f, median 150 |
| turn | The problem just seen has an answer, and this is its name | 106-169 f |
| proof | The claim is operable: someone acts, the result appears | 95-225 f, median 150 |
| cta | The next action is mine; this brand is where it ends | 65-193 f, <= 25% of film |

**WHEN** designing any beat -> **DO** write "Buys: the viewer ..." first (a viewer state change,
not an effect; no "and") -- *because* a beat with no purchase is decoration. Delete-test: if
removing it loses no belief, remove it.

## 2. Film shapes (choose one on purpose; write two rejected ones)

| Shape | Works when | Watch out |
|---|---|---|
| Claim -> cut -> proof -> cta | one operable action + a sentence naming it | the default; considered alone = reached for |
| Held shot | the product is a place/object with a lot to see | needs a world |
| UI documentary of one real task | product is operable and the task has stakes | no feature tour |
| Typographic essay | the brand is a voice | words must DO something |
| Montage of real output | output is beautiful/varied and real material exists | never invented thumbnails |
| Stillness that breaks | calm promise; product removes a disturbance | the held part is a designed breath |
| Transformation chain | rarely: each link is true | the most over-used shape |

Cover-the-logo test: if the film could advertise a competitor, it's not an idea yet.

## 3. Skeletons (claim -> proof -> cta shape)

| Film | Frames | Beats |
|---|---|---|
| 8-10 s | 240-300 | hook 90 / proof 135 / cta 75 (<= 25%); or two proofs ending on the action |
| 15 s | 450 | hook 120 / proof 135 / proof 105 / cta 90 |
| 20-30 s | 600-900 | hook 135 / turn 135 / proof 150 x2-3 / cta 135-150 |

Every beat 90-210 f (type-only hook 60-90 f). Add beats; never stretch one. ~1 proof per 8-10 s.

**WHEN** the film opens -> **DO** frame 0 already in motion (card mid-open, word half-risen, log
scrolling); never open on a logo or empty frame.

## 4. System decisions (once per film, never mixed)

1. **Clock:** smooth 30 (default for UI), on twos (`Math.floor(frame / 2) * 2` for EVERY layer),
   or split (drawn items on 12 fps poses, camera smooth). Mixed step rates read as a bug.
2. **Motion grammar:** per-element smear, OR crisp steps, OR shutter blur. One.
3. **Type:** one family, role scale (type.md), weights 400-550.
4. **Ground per act:** a surface (capture, material, lit gradient), not a swatch per scene.
   Changes only at a hard cut or by a growing object.
5. **One accent, one meaning:** "machine acting", "arriving", "ON", "the argument noun". Green
   only for "done". Accent on at most one element per scene.
6. **Carrier object (optional):** must move, scale or change role at every seam, never pinned.
7. **Cursor art:** one custom family; arrow-only OR pose film.
8. **World per act:** ground / light / depth / texture / sound, five words each (world.md).
9. **Hero frame:** the one screenshot-worthy frame and its frame number. Built first.

## 5. Continuity (every seam)

1. Name the carried element and device (carried object > same pose & velocity > same geometry >
   transition starts in A finishes in B > blur-matched cut > running VO > effect becomes ground).
2. Write A's exit state (last 1-3 f): x, y, size, velocity px/f, blur, ground hex, text.
3. Write B's frame 0 = that state; at least one other object already moving.
4. Ground differs? Name the object or band that flips it.
5. Cut at max velocity or just before a hold, never after a settle.

## 6. Energy curve

**WHEN** planning the curve -> **DO** put the strongest frame at 60-75% of the film; before it,
beats shorten, travel shrinks, cadence tightens -- *because* acceleration reads as arrival.

**Scale** spent once or twice per film; the ending is smaller than the climax.
**Overshoot** at most one visible springy payoff per film (+4-12% on one object).
**Holds** only after a payoff: list 24 f, number 14 f, lockup 20 f. Elsewhere micro-drift.

## 7. Worksheet (copy into the composition's plan comment or a PLAN.md)

```
PAGE:            P: / A: / G: / E:
One true thing:
Shape (+2 rejected, why):
Length (frames):
Clock / grammar:
Type family, weights, role sizes:
World per act (ground+source file / light / depth / texture / sound):
Importance (count of 3s, <= 25%):
Accent hex + ONE meaning:      Signal colour:
Carrier:                        Cursor:
Hero frame (frame no., beat, how made):
Overshoot spent on:

# | role | imp | Buys: the viewer... | picture with text covered | copy | moves | enters | exits | into next | carried | frames
```

**Checks:** lengths sum, each 90-210 f; CTA <= 25% with 18-42 f end hold; every row has a Buys
sentence; every seam has a carried object; one new thing per beat; each proof names its readable
object (G1); strongest frame at 60-75%; chrome audit (list every text that isn't claim / UI words /
logo, delete the list); picture audit (no "flat colour" / "card on a flat colour"); for each of
shape, ground, type, ending, transitions say why THIS brand chose it.

## Slop tells

| AI default | Do instead |
|---|---|
| Open on a logo or empty frame | Open already in motion |
| Five equal beats, equal energy | Shorten toward a peak at 60-75%, hold after payoffs |
| Seams decided last, crossfaded | Seams planned first: carried object, cut mid-motion |
| Beat described by effects | Beat described by what it buys |
| Stretch beats for length | Add beats; each 90-210 f |
| Every line animated as important | <= 25% importance 3 |
| Pick claim->proof->cta because it's here | Two other shapes considered, cover the logo |
| Swatch ground per act | Surface + light + depth + texture per act |
