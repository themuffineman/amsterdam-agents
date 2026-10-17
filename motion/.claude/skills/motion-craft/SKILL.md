---
name: motion-craft
description: Use when creating or reviewing Remotion videos, motion graphics, product promos, kinetic type, or any animated video where it must NOT look like generic AI output. Provides measured easing curves, timing rules, a never-ship list, and a render review procedure.
---

# motion-craft

AI-looking video comes from defaults: one ease on everything, fade-ins, uniform stagger,
centred static cards, glow, held end cards. This skill replaces defaults with measured
decisions. The numbers come from frame-by-frame analysis of human-made motion work
(via motionmaxxing, Apache-2.0).

## Files

- `references/eases.ts`: 12 measured easings + `tween`, `enter`, `exit`, `staggerOnsets`,
  `cameraSnap`, `dive`. Import these instead of writing easing by hand.
- `references/rules.md`: durations, which ease for what, the laws, type and colour rules.
- `references/slop.md`: never-ship list, plan questions, render review procedure, gates.
- `references/ui-kit.md`: how to show UI; Databuddy-derived component policy.
- `references/director.md`: PAGE, beat roles, film shapes, system decisions, seam planning,
  the planning worksheet.
- `references/transitions.md`: cut anatomy and 18 join mechanics (hard cut on motion, carried
  object, effect-becomes-ground, feathered wipe, clip-edge wipe, scale cut...) as `<Sequence>` code.
- `references/ui-demo.md`: framing real UI, cursor, click, typing, toggles/cascades, agent work,
  counters.
- `references/world.md`: ground, light, depth, texture; real UI through a camera; the hero frame.
- `references/type.md`: copy voice, type system, word builds, onset gaps, emphasis, numbers,
  reading time.
- `references/layout.md`: page chrome (G5), coordinates, density, type by role, layer order, 9:16.
- `references/close.md`: end-hold gate (G3), lockup rules, the closes.

All the newer files are condensed from motionmaxxing (Apache-2.0); the full originals are in
`_reference/motionmaxxing/references/` if a number needs checking.

Read `director.md` and `slop.md` before planning. Read `rules.md` before animating, plus the topic
file for the beat you're building. Read `slop.md` again before delivering.

## Process

1. **Find the one true thing** the video says. Cut everything else. Write the idea in one
   sentence that would not work for a competitor.
2. **Plan as events, not states.** For each beat: what moves, what it causes, and which
   object carries across the cut into the next beat. Name the one screenshot-worthy frame
   and spend the hardest work there.
3. **Gather real material first:** real screenshots, real copy, real numbers. Don't invent
   UI or stats.
4. **Build the hardest beat first,** as a still and a short render, before the rest.
5. **Render and look** (slop.md review procedure). Fix the top three problems. One more
   pass. Stop.
6. **Report honestly:** what you checked, what the gates showed, what's still weak.
   Never write "verified" or "perfect".

## Core rules (full list in rules.md)

- Land decelerates (`softLand` 12 f), leave accelerates (`accelExit` 13 f).
- Move, don't fade. Opacity is a 5 f helper only. Nothing grows from zero.
- Overshoot rare and late: `popOver` at most once per beat, one visible spring per film.
- Stagger uneven, 1-3 f gaps, overlapping. CTA stack ~8 f.
- Hard cuts on motion. Next scene starts already moving. Carry an object across.
- No dead frame. Holds only after a payoff, 0.5-1.0 s. End hold <= 1.4 s, end mid-motion.
- One camera group. One clock per moment. One blur grammar per film.
- Words arrive whole, never typed. Weight 400-550. Tight tracking.
- One accent meaning. Real surfaces, not flat swatches.

## Remotion specifics

- Author in **frames** (30 fps default). Everything is a pure function of `useCurrentFrame()`.
  No CSS transitions or animations, no `Date.now()`, no randomness without a seed.
- Use `tween()` / `enter()` / `exit()` from `eases.ts`. For custom easing pass any
  `(t) => number` to `interpolate`.
- Cuts are `<Sequence>` boundaries. Make the outgoing element's exit end on the cut frame
  and the incoming element start already displaced.
- Camera: wrap the UI in one `<div>` with `transform: scale() translate()` driven by
  `cameraSnap()`. Don't scale children individually.
- Optional shutter blur: Remotion's motion-blur package can average sub-frames at render
  time. If you use it, use no per-element smear (one blur grammar).
