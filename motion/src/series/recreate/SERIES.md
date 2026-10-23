# The "recreate" series: how these videos look and move

Read this before building any video for this series, and before inventing a new component for it.

**Don't constrain yourself to the components that exist.** The bank (`bank.tsx`) is a starting set,
not a menu. For every beat, first ask what would SHOW the idea best, then build that, even if
nothing like it exists yet. The design here is a direction (type, colour, ground, motion
grammar), not a kit: come up with the structure that conveys the point, then paint it in this
look. Reusing a component that only half fits (e.g. a receipt to list a prompt's contents) reads
as lazy; the user called that out. Example of the right instinct: the prompt's contents became
`PromptDoc`, the actual document with each section lighting up as it's spoken, instead of a
generic list card.

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

## Making one, end to end

The worked example is `src/compositions/RecreateRigel.tsx` (Type Staircase) with its film folder
`src/films/recreate-rigel/`. Copy its structure for a new template; don't copy its words.

1. **Pick the template** (`src/series/recreate/templates.ts`, previews in
   `public/recreate/templates/<id>.mp4`). Watch it frame by frame before writing anything:
   `ffmpeg -i public/recreate/templates/<id>.mp4 -vf "fps=2.4,scale=480:-1,tile=4x4" -frames:v 1 out/<id>-frames.png`,
   then look at the image. Describe only what it really does (sizes, entrance, layout, camera,
   colours). If it opens on an empty frame, set a `trim` for `TemplateClip`.
2. **Script** in `src/films/<slug>/script.json` (same `voice` / `model` as recreate-rigel, NO
   `prompt` field: Gemini TTS reads it aloud). One segment per beat, optional `pause` (seconds
   after it; ~0.35 inside a beat, ~0.7 between beats, ~1.6 between asks to Claude so replies
   have time on screen). The shape:
   - the discovery: I was going through Sycamore Motion and found this one; what I liked, in
     specifics (Codegrid-style: what it is, what makes it feel like itself);
   - what you'll learn: the same kind of animation for any text, with Claude Code and Sycamore;
   - the renderers aside (Remotion / HyperFrames / a web page with screenshots; "I'm using
     Remotion");
   - step one: the site, Copy prompt; what's in the prompt (the specifics that make it itself);
   - step two: paste into Claude Code, run it as is first, then the remix asks one at a time in
     the same conversation;
   - why one at a time; the original next to mine; outro: like and subscribe (no plug).
   Talk like you're telling a friend. No fragment lists, punchline triplets or presenter tone.
3. **Voice:** `npm run voice -- <slug>`, then **`npm run narrate -- <slug>`**: joins the clips
   with their pauses into `public/films/<slug>/voice.wav` and writes word timings to
   `src/films/<slug>/transcript.json`. Read the transcript it prints and use the words it
   actually wrote as cues (it may write "Step 2", "webpage", "changed").
4. **Build** `src/compositions/Recreate<Name>.tsx` and register it in `src/Root.tsx`:
   `TranscriptProvider` > `Track` > one `Scene` per beat, cues from `useCue` / `useWords`,
   `<Audio src={staticFile("films/<slug>/voice.wav")} />`. Check the hardest beats as stills.
   Coordinates for cursor clicks (Copy prompt, send) must be measured on a still.
5. **Review:** `npm run review -- <Id>` and the contact sheet; fix the top problems, once more.
6. **Placeholders:** there is no real prompt or real Claude output yet. Outputs are the
   template preview with a CSS filter, the prompt text and word count are dummies, and the site
   page / Claude windows are drawn. Keep them, mark them in the composition's header comment,
   and list them under `weak` in the result file.

## Design language

- **Ground: the sky** (`SkyGround`): soft blue gradient. Every scene, unless the user asks otherwise.
  Paper and night grounds exist but aren't used.
- **Cards are tickets.** Everything that is a card is built on `TicketShell` (kit.tsx): white,
  rounded, red ink (`C.red`), italic serif title. The perforated stub with barcode only on the
  prompt ticket and the receipt (where the stub carries the prompt length); template cards have no
  stub.
- **Type: two fonts, nothing else.** Alte Haas Grotesk (sans) and Feature Display (serif, UPRIGHT).
  The user rejected the condensed bold caps (Archivo), mono labels (they look AI-made) and the
  italic serif. In tokens.ts the old role names still exist but now map to these two:
  `caps` = Alte Haas sentence case, `italic` = upright serif, `mono` = small Alte Haas.
  `body` (Inter) only for small text inside UI cards.
- **Mixed lines**: a sans line + a serif line in the same thought ("for any text / you want.").
  White on the sky.
- **Text hierarchy** (loosely after Sycamore's Magic Edit levels, `sycamore-mono/docs/magic-edit-structure.md`):
  - L0 setup: small serif line (~52-64 px).
  - L1 accent: a word swapped to the serif.
  - L2 point: a sans line + serif line (~120-150 px).
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

1. Decide what the beat should look like first; then check whether the bank has it
   (`MediaTicket`, `DealtTickets`, `TicketBoard`, `TicketStatement`, `ReceiptTicket`, `PromptDoc`,
   `MediaSentence`, `ActionChip`, `PromptTicket`, macbook.tsx `MacBook`, devices.tsx `SafariWindow`, ui.tsx
   `ClaudeWindow` / `TemplatePage` / `Cursor`). Only reuse it if it really fits.
2. Otherwise build it from the same parts: `TicketShell` for anything card-like, `F` / `C`
   tokens only, `floatUp` / `rackStyle` / `ramp` / `glide` for motion, cue frames as props (it never
   reads the transcript itself), a pure function of `useCurrentFrame()`.
3. Look at codemotion (`Desktop/Software/codemotion/src/components`) for how a kind of visual was
   solved before (lists, timelines, boards, counters, windows), then re-skin it here.
4. Add it to `bank.tsx` with a one-line description at the top, so the next video can reuse it.

## Sizes that worked (first full video)

- Mixed lines: sans ~120-150 px with the serif line about the same (200+ filled the screen).
- Naming the template at the start: a lower third (darkened bottom), the name only, centred,
  written as it's spoken. No subtitle line.
- Outro: no Sycamore plug; a plain "like and subscribe".
- Sizing demos: big words ~120 px, serif lines around them 56-72 px (not 190 vs 40).
- Showing a template: inside a device (`MacBook` opening, template looping on its screen), not
  a bare card. A browser page goes in `SafariWindow`.
- Before/after: plain media cards with a small serif label above each ("Reference" / "Output"),
  no titles or captions under them.

## Never (the user rejected these)

- Website chrome: nav pills, corner labels, CTA buttons as decoration, spinning badges.
- Stickers ("TODAY'S BUILD"), thick coloured frames / polaroids, barcodes on template cards.
- A fake Claude Code / terminal UI with invented lines (use the real recording).
- A full-frame placeholder template with mono tags in the corner (the old opening).
- Snap camera moves (`cameraSnap`); every camera move is a glide or a speed ramp.
