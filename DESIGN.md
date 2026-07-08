# DESIGN.md - Lockstep (design source of truth)

Core concept and name are locked: **Lockstep**, a Rhythm Heaven inspired marching game. Press Space on the beat; audio cues switch you between on-beat and off-beat; 138 beats at 128 BPM; ranks SUPERB!/Great!/OK/Try Again. Vanilla HTML/CSS/JS + WebAudio, zero backend. Do not re-architect (see feedback_dont_rearchitect_prototypes).

## Layout / IA intent

3 screens in 1 static page, exactly as today: **Start -> Game -> Results**, with the mobile gate as a 4th state under 769 px. No nav, no footer links during play, no settings page. The game container should stop feeling like an 800x600 box floating in a void: let the stage color field bleed to the full viewport (or frame the 800x600 stage deliberately, like a theater proscenium, with the field color extending behind it). 1 page, 1 verb (Space), 1 outcome (a score worth sharing).

## Hero / landing concept (the start screen IS the landing page)

- Full-bleed on-beat indigo field with the marcher grid already standing at idle, bobbing subtly on a silent visual beat. The game is visible before it starts; the title stands on top of the stage, not instead of it.
- LOCKSTEP wordmark in the display face, wide tracking, with a stepped/offset letter treatment that literally echoes on-beat/off-beat (e.g. alternate letters shifted half a step up/down).
- 2-line instruction max: "Press SPACE on the beat." / "When the cue plays, switch to the off-beat."
- Gold challenge banner (existing ?challenge=N feature) sits directly under the title when present: "Beat this score: 8,420". Personal best shows quietly under the START button.
- START button styled as a drum pad / stage light, not a default rounded rect.

## Key screens

1. **Start screen** (hero, above) with challenge banner state + personal best state
2. **Game screen**: full color field, 4x5 marcher grid, minimal HUD (score + combo pills), beat indicator, mode indicator (see off-beat cue note below), feedback text, countdown overlay
3. **Results screen**: poster-grade rank reveal (SUPERB! must be screenshot-worthy: huge type, field color matching final mode, marcher grid saluting), stats block (score, max combo, perfect/good/miss), NEW BEST banner, challenge beat/missed-by-N comparison, Copy Score + Tweet buttons, RETRY
4. **Mobile gate** (<769 px): keep the honest "this needs a keyboard" message + copy-link button, restyled to brand (drawn marcher, not the 🎵 emoji)

Carried-forward improvement worth honoring here (from roster "bigger bets"): the off-beat switch currently signals via a small text mode indicator that is easy to miss. Design intent: the background color hard-swap IS the mode indicator (on-beat = indigo world, off-beat = hot magenta/orange world), with the text label as reinforcement only.

## Empty / loading / error state intent

- **No loading state needed**: static assets, generative audio, near-instant. Never add a fake spinner.
- **Audio-locked state**: the existing "Click anywhere to unmute" resume hint is the critical error state; it must be styled loud enough to actually rescue a muted run (Dani's number 1 bounce trigger is silent Space presses). Treat suspended AudioContext as a first-class state, not a hidden div.
- **Empty best**: before any run, no "Best: 0" placeholder; the best-score line simply does not render until a score exists.
- **Challenge param invalid** (?challenge=garbage): silently ignore, render normal start screen. Never show an error toast for a malformed brag link.

## Metadata / OG intent (X-readiness is mandatory)

- Existing head is already solid: title, description, og:title/description/url/image (1200x630 og-image.png), twitter summary_large_image, twitter:creator @michaelpyon. Keep og:url and share BASE_URL on **lockstep-eight.vercel.app** (canonical; bare lockstep.vercel.app 401s and only Michael can change the alias).
- Regenerate og-image.png to match the new brand: split-field composition (indigo left / hot magenta right at the switch moment), marcher silhouettes mid-step, LOCKSTEP wordmark. The OG image should look like a Rhythm Heaven stage card, not a text banner.
- Share text format stays: "SUPERB! on Lockstep: 8420 pts, 14x combo. Beat my score: [?challenge= link]". This line is the growth loop; never ship a build where Copy Score drops the score again.
- Add twitter:image alt text and keep theme-color synced to the on-beat field color.

## Data honesty

The product claims no real or external data. Pure client-side WebAudio, scores are player-generated at runtime, personal best is localStorage, challenge scores come from the URL param. Verified honest in the 2026-05-30 audit (SUGGESTIONS.md "Integrity: HONEST"). Nothing to disclose. Keep it that way: no fake leaderboard, no invented player counts, no "1,000s of players" copy. If a global leaderboard is ever added (bigger bet, needs Supabase), it must show only real submitted runs.

**Deploy caveat for execution agents**: as of 2026-07-08 the live lockstep-eight.vercel.app still serves the OLD pre-fix build (no challenge banner, no personal best, scoreless Copy Score); repo HEAD has the fixes. Any relaunch build must confirm the Vercel flush actually happened before the X post, but do not deploy from this planning pass.

## The screenshot-worthy moment to engineer

**The SUPERB! results poster.** When perfect rate exceeds 90 percent: rank slams in beat-synced (letters land on 4 consecutive beats), the field flashes through both world colors, the full marcher grid snaps to a salute pose, and score + combo render in gold. Composition rule: rank, score, and the challenge URL region must all fit in a single 16:9 crop with zero UI chrome clutter, because Dani screenshots this exact frame for the Discord #scores channel. Secondary shareable: the mid-game mode-switch hard cut (indigo -> magenta with the grid mid-step) is the GIF moment; ensure the switch beat looks intentional and clean at 60 fps.
