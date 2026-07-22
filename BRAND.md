# BRAND.md - Lockstep

## Positioning line (in Dani's language)

**"The evil marching minigame from Rhythm Heaven, in a browser tab. Press Space. Don't lose the beat when it switches."**

Secondary line for meta/descriptions: "A 1 minute on-beat/off-beat skill check. 1 key, 138 beats, no mercy."

## Palette direction

Rhythm Heaven Fever's Lockstep stage is the reference: huge flat color fields that hard-swap when the mode switches. That mechanic IS the brand, so the palette is 2 opposing worlds plus accents:

- **On-beat world**: deep indigo/violet field (current #1a1a4e / #2a2a6e family is the right instinct, push it richer and flatter, less gradient)
- **Off-beat world**: a genuinely different temperature, e.g. hot magenta-red or burnt orange field, so a screenshot instantly tells you which mode the player was in
- **Marchers**: near-black silhouettes with 1 high-contrast player accent (Rhythm Heaven uses stark figure-on-field contrast; keep marchers iconic, not detailed)
- **Feedback accents**: white for PERFECT flash, gold #ffdd55 (already in use for challenge banner) reserved exclusively for bests, SUPERB, and challenge moments
- No gradients on UI chrome, no glassmorphism, no neon glow soup. Flat, confident, poster-like.

## Type system

- **Display (title, rank, countdown, mode indicator)**: 1 chunky geometric or rounded-heavy display face, self-hosted (e.g. a heavy rounded sans in the Rhythm Heaven logo spirit). Big, wide letter-spacing, allowed to shout.
- **UI/body (instructions, stats, buttons)**: 1 clean sans with real character, not Segoe UI/system default. Everything currently in 'Segoe UI' must move to the chosen faces.
- 2 faces max. Numbers in scores should be tabular so the score does not jitter while counting.

## Spacing and motion personality

- Layout breathes like a title card: generous vertical rhythm on start/results screens, tight and minimal HUD during play.
- **Motion is metronomic.** Every animation duration derives from the beat (60/128 bpm = 469 ms; use the beat, half-beat, and quarter-beat as the only durations). Nothing eases lazily; steps SNAP.
- Mode switches are hard cuts or 1-beat wipes, never slow crossfades. The 0.25 s background transition today is the right length; make the color change bigger.
- Hit feedback: 1 frame of scale/flash on the marcher row, screen-level pulse only on PERFECT streak milestones. Misses get a short shake, not a long wobble.
- Idle states still breathe on the beat (marchers bob subtly) so the game never looks frozen in a screenshot.

## Voice and tone rules

- Drill-sergeant-meets-toy: short, imperative, playful. "March." "Switch!" "Don't blink."
- Rank names stay in Rhythm Heaven's register: SUPERB! / Great! / OK / Try Again. Never add corporate copy ("You achieved a score of...").
- Share text is a brag written in first person, already composed: score, combo, challenge link. No hashtags stuffed in.
- Never explain the joke. Instructions are 2 lines max; the game teaches by cue and failure.
- No exclamation inflation outside rank/feedback moments. HUD and buttons are calm; the game screen is where the energy lives.

## 3 reference products to measure taste against

1. **Rhythm Heaven Fever (Lockstep stage)** - flat fields, silhouette figures, sound-first readability
2. **A Dance of Fire and Ice** - minimal geometry that reads perfectly in a 3 second clip
3. **Trombone Champ** - shareable scoreboard energy; the results screen as a meme-able artifact

## 3 anti-references (never look like this)

1. **Generic AI-template slop**: system-font headings, purple-to-blue gradients on cards, glowing borders, emoji-as-icon UI (the current 🎵 favicon/mobile-gate emoji is on the edge; replace with a drawn marcher mark)
2. **osu!/Beat Saber HUD maximalism**: accuracy percentages, spinning combo fire, settings gear during play. Lockstep is 1 key and 2 numbers.
3. **Coding-tutorial browser game look**: default buttons, 800x600 rounded box floating on a void, Segoe UI everywhere. The game field should feel like a stage, not a demo canvas.
