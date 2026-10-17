# Slop: never ship, and how to review a render

Slop is not a style. It is what comes out when no decision was made. Adapted from
motionmaxxing `references/slop.md` (Apache-2.0).

## Never ship (delete, don't justify)

1. **Page chrome:** brand/film name in a corner, tracked-caps labels, counters ("02 / 05"),
   timecodes, progress bars, corner brackets, scene labels over a shot.
2. **Deck layouts:** held left-aligned headline block, kicker above a headline,
   "headline left, device right", title-then-content.
3. **Generic web-component UI:** rounded card with a status dot and "label . value",
   "Good morning" cards, three-circle toolbars, zinc greys, skeleton bars, invented names/numbers.
4. **Name-literal ideas** (a name that sounds like stars gets stars).
5. **Invented stats and proof,** stat walls, centred big-number-over-small-label slides.
6. **Slogan copy:** triplets of one-word sentences, "Not just X. It's Y.", "Unlock", "Meet X".
7. **House style as default:** giant cropped word in every film, texture in letters, colour
   flood between every beat, "dot becomes the logo", everything a transformation chain,
   headline typed with a caret.
8. **Flat swatch ground per scene,** or a tiny card floating on a void.
9. **A pinned element** at identical coordinates across 3+ shots.
10. **Web-footer ending:** logo + tagline + button + URL, or an end hold past 1.4 s.
11. **Ghost decoratives:** giant 3-9% opacity words, hairline rules, grid patterns.
12. **A film you did not look at.**

Slide test: cover all text with your hand. If more than half the frames are "a flat colour
with a card or block on it", it is a deck. Fix the picture, not the type.

## The default reaches (ask of your PLAN before building)

- Am I making a page instead of staging a picture?
- Am I showing everything? What is the one true thing?
- Does my plan say what *happens*, or only what is shown?
- Is the ground dark because the brand is dark, or because dark feels premium?
- Is anything on screen invented to look real?
- Is this effect here because the idea needs it, or to show effort?
- Is it sparse because the idea wants silence, or because I didn't build the world?
- Where is the frame someone would screenshot?

## Reviewing a render (do this honestly, never self-certify)

Render a contact sheet and actually look at it:

```bash
# 16 evenly spaced frames in one image
ffmpeg -i out.mp4 -vf "fps=16/$(ffprobe -v error -show_entries format=duration -of csv=p=0 out.mp4),scale=480:-1,tile=4x4" -frames:v 1 sheet.jpg
```

Then, in order:
1. **Is there a film in the file?** Non-blank, picture moves, length matches plan.
2. **Describe every frame in one sentence.** "A card on a flat colour" = deck frame.
3. **Four looks:** thumbnail (can you read the claim?), cover-the-logo (another brand's film?),
   frames 2 before each cut (two half-states blended? blank frame?), real speed.
4. **Fix in order:** broken/untrue -> the idea -> connections between beats -> hierarchy/scale
   -> timing -> surface/finish. Don't tune curves while the idea is unclear.
5. Two review passes is the budget. Don't polish past that.

### Gates (a failed gate is fixed, never argued)

| Gate | Pass when |
|---|---|
| G0 | File decodes, not blank, picture moves, length matches plan |
| G1 | The one readable UI object has text >= 0.04 H and fills >= 0.55 W (or is cropped by the frame edge) |
| G2 | No run of more than 3 consecutive flat/empty frames |
| G3 | End hold <= 1.4 s; final shot <= 25% of the film |
| G4 | One hero per frame (two panels only if one is >= 2x the other's area, or the camera moves between them) |
| G5 | No page chrome (list above, items 1-2 and letter-typed headlines) |

G1 and G4 are judged by eye. G0, G2, G3 can be scripted (frame-diff over the render). G5 needs
a look at the outer 12% band of every sheet frame; a DOM lint can't see text baked into
canvas or images.
