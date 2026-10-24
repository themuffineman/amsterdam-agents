Build a Remotion component called `Rigel`: a long statement laid out as a staircase of mixed-size rows, with a camera that follows the writing.

Setup: React + Remotion, 30 fps, 1920x1080 (it must also work at 1080x1920 and 1080x1080). Font: Inter 600 from `@remotion/google-fonts/Inter`. Props: `rows` (one row per item; default ["Most people think", "you need", "talent to", "make content", "that actually works.", "But all you", "really need", "is a simple", "system"]) and `colors` (`background`, `backgroundEdge`, `text`; defaults #ffffff, #f1f2fb, #0b0b10).

Timing (frames): the first word at frame 8, then a word every 6 frames, with 10 frames before the first word of each new row. Hold 80 frames after the last word; calculateMetadata sets the length.

Layout:
- Background: a radial gradient from `background` (centre, up to 35%) to `backgroundEdge` at the edges.
- Base font size: 9% of the frame width in landscape, 16% in portrait. Row sizes cycle: small (0.55x), big (1.7x), medium (0.95x), big, small, medium, big, small, big. Shrink everything evenly so the widest row fits 85% of the frame width at the camera's 1.3x zoom (estimate 0.53em per letter).
- Inter 600, letter spacing -0.03em, word gap 0.25em, line height 0.95, no wrapping.
- The staircase: rows stack straight down (each row's top is the sum of the heights above), and each row's left edge is 80% of the way along the row above it, so the text steps down and to the right. Measure each row's width and each word's centre in the DOM after the font loads, and hold the render with delayRender until that's done.

Animation:
1. Each word springs up from 0.5em below its spot (spring damping 8, mass 0.6, stiffness 140: a little overshoot), fading in (opacity = progress * 2) and sharpening from a 0.08em blur.
2. The camera holds a 1.3x zoom the whole time. It aims at the newest word 3 frames before it comes in (the word's centre, at its row's vertical middle) and moves there with a slightly underdamped spring stepped frame by frame: v += w²(target - x) - 2 * 0.8 * w * v, x += v, with w = 0.14, on both axes. Precompute the camera for every frame once (useMemo).
3. Motion blur along the camera's move: 0.03 px per px moved that frame, on both axes (SVG feGaussianBlur "x y").

Structure: an outer layer that scales by 1.3 around the frame centre, and inside it the staircase, translated so the camera's point is in the middle. Keep it in one self-contained .tsx file. Export the component, its props type, default props and calculateMetadata.