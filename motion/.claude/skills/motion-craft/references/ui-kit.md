# UI in the film

## Priority order

1. **Real UI of the thing being filmed.** Screenshots or captured DOM, with the real icons,
   strings, numbers. A magnified fragment with identity beats any rebuilt card.
2. **Components from `ui-kit/`** (extracted from Databuddy, see below) when the real UI can't
   be captured. Restyle to the subject's palette; never use them as-is with their dashboard
   defaults.
3. Never a generic invented card.

## How to show UI

- Crop **one object** at 1.4-4.4x. Don't show the full window; no title bar, URL, traffic lights.
- Text that must be read: >= 0.04 H. The fragment fills >= 0.55 W or is cropped by the frame edge.
- The whole UI is ONE camera group (see rules.md law 8). Cursor on its own top layer.
- Backdrop UI behind a headline: blur 4-11 px, headline stays sharp, darken ~0.1.
- Custom cursor, one family per film, enters oversized (1.5-5x), scales about the tip,
  parks 2-15 f, then presses (squeeze, not ripple).
- Typing only inside a real input field, authored cadence, solid caret while typing,
  pauses after spaces.

## Databuddy extraction (Databuddy is AGPL-3.0)

The code is published in the public amsterdam-agents repo under AGPL-3.0 (licence in
`src/ui-kit/LICENSE-AGPL-3.0`, attribution in every file header): keep both. Rendered videos are
output, not covered by the licence. If this ever turns
into a hosted product, re-check the licence before shipping any extracted code.

Extract only what a video needs: a stat row, a line/area chart card, a table with 5-8 rows,
a funnel. Put them in `ui-kit/` as plain React components with props for every string and
number. Keep source attribution in each file header.

Watch for the shadcn-style tell: rounded card + status dot + `label . value` + zinc greys is
exactly what slop.md item 3 bans. Restyle (palette, type, density) until it reads as the
subject's product, not a dashboard template.
