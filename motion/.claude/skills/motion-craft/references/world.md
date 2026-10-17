# World: what a frame is made of

Adapted from motionmaxxing `references/world.md` (Apache-2.0,
https://github.com/Tejashmakwana/motionmaxxing). Rewritten for Remotion. Format: **WHEN** -> **DO**
-- *because*.

A film is a place with light in it, not a layout with animation on it. The target is **one focal
point inside a built world**: many layers, one lit thing. Both failures are real: "a card on a
flat colour" (too sparse, the most common AI output) and everything lit at once (clutter).

## 1. Six layers per act

Decide per ACT (not per scene) and write it in the plan:

| Layer | Question | Sources, best first |
|---|---|---|
| Ground | What is behind everything? | a captured surface (`brand/<slug>/screens/`, product screen, brand photo); a real material; a code-built structured surface; flat colour ONLY for a brand that is genuinely flat or a flood under 30 f |
| Light | Where from, doing what? | one key with direction, a rim to separate the silhouette, falloff, contact shadow; brand colour as light more than paint |
| Depth | Near / far? | 2-3 planes: blurred/cropped foreground, lit subject, quieter background; parallax 2-2.4x |
| Texture | What does the surface feel like? | grain, paper tooth, a halftone; seeded, frame-deterministic |
| Material | What are objects made of? | brand plastic, glass, paper, ink; UI with real chrome and density |
| Sound | What do you hear? | room tone, a bed that changes where the picture changes, silence before the hit |

**WHEN** a frame has only a flat colour and a card -> **DO** add ground, light and depth before
touching type -- *because* one layer of six is a slide, not a world.

**WHEN** grounds change scene to scene (cream, ink, lavender, green) -> **DO** one surface per
act -- *because* a swatch per scene reads as a deck.

## 2. Light logic

- **Key + rim + falloff + contact shadow.** One source. Flat fills + drop shadow + glow on every
  element read cheap.
- **A light sweep across a surface** reads premium; a wide flash over the whole object reads as a
  glitch. Sweep the one thing the idea is about, once.
- **Light only where it means something.** The same floor glow under every scene reads as a
  template. Radial glow + vignette + orbs around a logo on near-black is premium pastiche.
- **Brand colour as light:** a rim, a horizon glow, the colour of the one source.
- **Light grounds** are as premium as dark. Choose by the brand, not habit (six of ten no-skill AI
  films sat on near-black; under a third of human films do).
- **Flat brands** stay flat on purpose: hard colour, hard shadow, grain, still an edge and a cause.

Remotion recipes (all pure functions of frame):

```tsx
// Key light with direction + falloff (not a centred radial glow):
background: `radial-gradient(120% 90% at ${18 + drift}% -10%, ${keyTint} 0%, transparent 55%), ${groundColor}`
// Contact shadow under an object: a blurred ellipse, not box-shadow on everything.
// Light sweep across one surface: a masked linear-gradient band whose x = tween(frame, at, 12, -0.3, 1.3, "softInOut")
```

## 3. Grounds that are not flat swatches

Build the ground from, in order:
1. **The capture.** `brand/<slug>/screens/*.png` cropped, pushed in, blurred to a plate
   (`filter: blur(18px) saturate(0.9)`), tinted, or used as the lit surface. Use `<Img>` +
   `staticFile()` so Remotion waits for the load.
2. **A real material** (paper for a notes app, a desk, fabric): a photograph you have rights to.
3. **A code-built surface with structure:** an SVG `feTurbulence` grain with a fixed `seed`, a
   halftone, a lit gradient whose colours come from the product's state colours.

**WHEN** the ground must flip light/dark -> **DO** flip it between acts by a carried object or a
hard cut on motion (transitions.md T3, T15), never by changing swatches for rhythm.

## 4. Real UI through a camera

Readability comes from the camera, not from inflating the interface (a film whose UI text was
blown up to 33 px was called a slide; the fix was real size and a macro push).

- **Magnify with the camera** until the readable object passes G1 (text >= 0.04 H, >= 0.55 W, or
  cropped by the frame edge).
- **Lit:** the UI catches the key, has an edge, contrasts with the ground, has a rim or soft shadow.
- **Framed:** crop to the active control, the cursor and its consequence. A whole dashboard small
  is filler.
- **With identity:** the real icon, sender, time, sentence, density, type. If you must rebuild a
  fragment (ui-kit), build it from the subject's tokens and say so in the plan.

## 5. Finish (Remotion)

**Shutter blur.** Code is perfectly sharp and frozen between frames, which reads as "computer".
`@remotion/motion-blur` (`<CameraMotionBlur shutterAngle={180} samples={8}>`) integrates
sub-frames. Fewer than 8 samples leaves double outlines. Use it only on smooth-clock films, and
never with per-element smear or a stepped clock (one blur grammar). Not installed: ask before
adding.

**Grain.** A little temporal grain kills banding in gradients and makes flat colour feel
photographed. Use an SVG `feTurbulence` with `seed={frame % 4}` (deterministic per frame) at very
low opacity, or a pre-rendered grain plate. Skip for brands that are crisp and flat on purpose.

**3D.** `@remotion/three` is out of scope for this project. If an idea genuinely needs a physical
object, raise it before building; don't fake 3D with CSS tilts.

## 6. The screenshot-worthy hero frame

**WHEN** planning -> **DO** name the one frame someone would screenshot and send to a friend: one
focal point, a source of light, a surface you can feel, a thing happening -- *because* if you can't
describe it in a sentence the idea is still a topic.

**WHEN** building -> **DO** build that frame FIRST with `npx remotion still <id> --frame=N` and
look at it before the rest of the film exists.

## 7. Richness is not clutter

- One focal point in a built world. Hierarchy by light and scale, then colour, then isolation.
- Density that rewards a second look (grain, a rim, a detail in the UI) is richness. Everything
  the same size and brightness is clutter.
- Richness is not energy: the user picked a calm legible film over a frantic one.
- Empty is allowed when it does a job (a breath before a payoff, isolation after a matched cut),
  for under ~45 f.
- **Test:** cover the type. Each frame should still show a picture (surface, light, object). "A
  flat colour" or "a card on a flat colour" = the beat has no picture.

## Slop tells

| AI default | Decision |
|---|---|
| Flat swatch per scene | Captured surface or real material; flat only for a flood under 30 f |
| Radial glow, vignette, orbs round the logo | Light with a source and a direction, at an event |
| Ghost text 5-8% opacity, hairline rules, grid patterns, "grain overlay" as decoration | Texture that belongs to the surface |
| CSS 3D tilt / 3D bar charts on a flat card | A cropped held-pose device and a camera move |
| A small card floating on a void | The fragment magnified by the camera in a lit world |
| Glass cards stacked over a gradient | One material, one light logic |
| Generated image as a centred backdrop | A plate that performs: revealed, travelled, lit |
| Bloom and lens flare as "premium" | Bloom on true light sources only, or none |
| Four rendering styles in one frame | One light, one lens, one drawing style |
