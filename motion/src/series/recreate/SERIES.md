# The "recreate" series: how these videos look and move

Read this before building any video for this series, and before inventing a new component for it.
The bank (`bank.tsx`) is a starting set, not a limit: when a beat needs something the bank doesn't
have, build it in this design language, the same way.

## The format

Long-form (landscape, 1920x1080, 30 fps), **voiceover only** (no face). Value, not an ad:

1. **The result.** Show a motion-graphic template from sycamore.to/motion and talk through its look
   (type, colour, the ease, the stagger).
2. **The segue.** "I didn't animate any of this by hand. It came from one prompt."
3. **The tutorial.** Go to the site, find the template, copy its prompt, paste into Claude Code, ask
   for a remix ("make it match XYZ"), wait, show the output. The site and Claude Code steps are REAL
   screen recordings framed in this look, never a fake UI clone.
4. **Extra value** to get past a minute: what the result looks like without the prompt, what's
   inside the prompt, a remix round, fixing a miss.

## Design language

- **Ground: the sky** (`SkyGround`): soft blue gradient. Every scene, unless the user asks otherwise.
  Paper and night grounds exist but aren't used.
- **Cards are tickets.** Everything that is a card is built on `TicketShell` (kit.tsx): white,
  rounded, red ink (`C.red`), italic serif title. The perforated stub with barcode only on the
  prompt ticket and the receipt (where the stub carries the prompt length); template cards have no
  stub.
- **Type** (tokens.ts `F`):
  - `caps`: Archivo condensed bold caps (font-stretch 72%).
  - `serif` / `italic`: Feature Display (trial, local only; falls back to Instrument Serif).
  - `grotesk`: Alte Haas Grotesk, for long display sentences.
  - `mono`: JetBrains Mono, small labels on cards.
  - `body`: Inter, card body text.
- **Mixed lines** are the signature: a caps line plus an italic serif line in the same thought
  ("I DIDN'T ANIMATE / *any of this by hand.*"). White on the sky.
- **Text hierarchy** (loosely after Sycamore's Magic Edit levels, `sycamore-mono/docs/magic-edit-structure.md`):
  - L0 setup: small serif line (~52-64 px).
  - L1 accent: a word swapped to the italic serif.
  - L2 point: a caps line + italic line (~136-210 px).
  - L3 peak (1-3 per video): a full-frame mixed line that racks out of focus when a card arrives in
    front of it.
  - Numbers count up (a ticket stub or a receipt total). Lists become receipt rows. A link or
    action becomes the blue `ActionChip`.
- **Colour:** blue `C.blue` only for the action chip / arrows. Red only as ticket ink. Real template
  previews bring the rest of the colour.
- **Media is real:** templates play from `public/recreate/templates` (`TemplateClip`). Never draw
  stand-in art.

## Motion grammar (moves.tsx, transitions.ts)

- **Words arrive whole on their spoken frame** (`Words`, `useWords`): rise from under the baseline
  with a short blur. Slots are reserved, so lines never re-centre.
- **Float-up** (`floatUp` + `Float3D`): the entrance for cards. Floats up from below the frame,
  tilted in 3D, and unwinds into its pose; a tiny bob after landing.
- **Rack focus** (`rackStyle`): when a card arrives in front of text, the text goes soft (blur +
  slight push back + fade). The blur is a TRANSITION, never a resting style.
- **Emphasis** (`ramp`): to focus one of several things, move it on a speed ramp (slow, then very
  fast with motion blur, hard stop) while the others dim (`dim` 0..1 on `TicketShell`).
- **Camera inside a scene** (`glide`): smooth eased glides between keys. No snaps.
- **Scene transitions** (`transitions.ts`, applied by `Track`): speed ramps. The outgoing scene
  starts slow and ramps up very fast into the move, blurring, ending at peak speed on the cut; the
  incoming scene starts blurred and fast in the same direction and decelerates into place. Kinds:
  zoomIn, zoomOut, slideLeft, slideRight, slideUp, diagonal, zoomInto.
  - Code picks them: a scene with `focus={[x, y]}` (the focused element's centre) leaves by zooming
    into it; otherwise they rotate so the same move never repeats back to back.
  - Override per scene with `transition="slideLeft"` (or `"cut"`) only when the content asks for it.
  - Open every scene with something substantial at local frame 0-3 (a card floating up, a big
    line), so the ramp-in has something to carry.

## Timing

The voiceover's word timestamps are the clock (`timing.tsx`, ported from codemotion):
`TranscriptProvider` > `Track` > one `Scene from="first words"` per spoken beat; inside, `useCue()`
and `useWords(from, to)`. Never hand-type frame numbers for reveals. Visuals land on or just before
the word.

## Building a new component

1. Check the bank first: `MediaTicket`, `DealtTickets`, `TicketBoard`, `TicketStatement`,
   `ReceiptTicket`, `MediaSentence`, `ActionChip`, `PromptTicket`.
2. If none fits, build it from the same parts: `TicketShell` for anything card-like, `F` / `C`
   tokens only, `floatUp` / `rackStyle` / `ramp` / `glide` for motion, cue frames as props (it never
   reads the transcript itself), a pure function of `useCurrentFrame()`.
3. Look at codemotion (`Desktop/Software/codemotion/src/components`) for how a kind of visual was
   solved before (lists, timelines, boards, counters, windows), then re-skin it here.
4. Add it to `bank.tsx` with a one-line description at the top, so the next video can reuse it.

## Never (the user rejected these)

- Website chrome: nav pills, corner labels, CTA buttons as decoration, spinning badges.
- Stickers ("TODAY'S BUILD"), thick coloured frames / polaroids, barcodes on template cards.
- A fake Claude Code / terminal UI with invented lines (use the real recording).
- A full-frame placeholder template with mono tags in the corner (the old opening).
- Snap camera moves (`cameraSnap`); every camera move is a glide or a speed ramp.
