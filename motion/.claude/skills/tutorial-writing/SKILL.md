---
name: tutorial-writing
description: How to write the spoken script of a coding tutorial or any video whose words we write, so it sounds like a human teacher and not AI. Read this before writing or editing any voiceover script, in any video project. Has real examples of what to avoid, from the owner's corrections.
---

# Writing tutorial scripts

**The goal is to be helpful.** Someone watching a coding tutorial wants to learn how to do this themselves. We're
teaching them, not entertaining them. However cool the visuals are, a video that teaches nothing is slop, and we don't
make quick drive-by content.

**Length follows the teaching.** A coding tutorial isn't three minutes long. If explaining something properly makes the
video longer, the video gets longer. Never cut an explanation to save time.

Read a line out loud in your head before keeping it. If a real presenter wouldn't say it to someone sitting next to them,
rewrite it.

## 1. Don't rap

Short clipped fragments in a rhythm are the strongest sign of AI writing. Use full sentences that connect to each other.

| Avoid | Write |
| --- | --- |
| Same frame, both versions. | This is the same frame from both videos. |
| All code. Refactored. One frame, no stress. | (Nobody talks like this. Say what happened in a sentence.) |
| Frame number first, then the position. | In each entry, the first number is the frame and the second number is the distance from the top in pixels. |
| The speed goes into the blur here, one value for x and one for y. | We calculate the blur using that speed. We have one blur value for the x axis and one for the y axis, because the word moves vertically when it comes in and horizontally when it leaves. |
| Give it a frame and it interpolates between the two nearest rows. | If you give it a frame number, you get back the word's position on that frame. If that frame isn't in the array, it interpolates between the two closest entries. |

## 2. Use the common word

Don't reach for a synonym to sound clever. Say the word everyone already uses, and the proper term for code.

| Avoid | Write |
| --- | --- |
| the type | the font |
| how this word moves | how this word animates |
| I stepped through the clip | I analysed the clip |
| table | array |
| bunch up near the top | get closer together near the top |
| that smear | that motion blur |
| gets close | looks similar |
| Each dot is one frame. | Each dot represents one frame. |

## 3. Don't shorten

Say all the words. Dropping them to sound snappy makes the writing lazy and harder to follow.

| Avoid | Write |
| --- | --- |
| This helper reads a table. | We use this helper function to read the array. |
| To get that, we draw... | To create that effect, we draw... |

## 4. Be specific, and say what things are for

Never point at code without saying what it does for the animation. Don't explain what the syntax literally is.

| Avoid | Write |
| --- | --- |
| That's this table. | This array is where I stored how far the word is from the top of the screen on each frame. |
| We initialise a variable called WORD_X and set it to an array of numbers. | This array tracks how far the word has moved sideways from where it settled. |

Skip what's too simple to need explaining, like a background colour or a paragraph of text. Explain what drives the
animation.

## 5. Give context

Never mention something the viewer hasn't been given a reason to understand.

| Avoid | Write |
| --- | --- |
| ...multiply by one and a half, because I measured at 720p and we render at 1080. | The clip I analysed is 720p, so all of those positions are based on a 720p screen. Our video renders at 1080p, which is one and a half times bigger, so we need to scale the positions up to match. |

## 6. Don't sound clever

| Avoid | Write |
| --- | --- |
| Every section in this video runs on it. | We're going to use this helper a lot in this project. |
| Every frame of the video is a component, rendered with a frame number. | So we're going to do it all in code. |

## 7. Guide the viewer

The voice is someone walking the viewer through what's on screen.

- Say where we are before explaining it: "Now let's look at the colour of the word."
- Tell them when you're slowing something down: "It's very quick, so I'm going to slow it down." Then actually slow it down.
- **After slowing a clip down, leave it on screen** with no talking, long enough to watch. Cutting away straight after
  defeats the point of slowing it down.
- Never leave work to the viewer. Never "slow it down and you can see it".

## Check before finishing

Go through every line of the script and ask:

1. Is it a full sentence a person would say out loud?
2. Is every word the common one, and every code term the correct one?
3. Did I shorten anything to sound snappy?
4. Does the viewer know what this array, value or number is for?
5. Does the viewer have the context to understand it?
6. Does this line help someone recreate this themselves?

Also apply `NoSlopSkill.md`.
