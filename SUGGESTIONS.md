# Lockstep: Suggestions and Findings

## Evangelist

The ideal evangelist is a Rhythm Heaven fan in their 20s-30s who hangs out in r/rhythmgames or the Rhythm Heaven Discord, has no Switch nearby at work, and can fire up a browser game for 3 minutes. They are using osu! or Beat Saber but miss the absurd toy-game charm of Rhythm Heaven. What makes them screenshot it: landing a "SUPERB!" run and sharing "SUPERB! on Lockstep: 8420 pts, 14x combo. Beat my score: [link]" in the #scores channel. What makes them bounce in 5 seconds: if there is no audio on the first spacebar press (AudioContext not initialized), if the beat indicator feels off from the metronome, or if the game silently does nothing (mobile).

---

## Ground Truth (as of 2026-05-30)

### Repo HEAD (commit fbfb098)

- Works end-to-end: static HTML/CSS/JS, no build step, no external data.
- No fabricated data, no "real-time" claims, no fake API calls.
- No Census/OSM/SEC or "live" data. Purely generative audio via WebAudioAPI.
- Share text: "SUPERB! on Lockstep: 8420 pts, 14x combo. Beat my score: https://lockstep-eight.vercel.app/?challenge=8420" (both copy and tweet paths).
- Challenge banner: shows gold "Beat this score: 8,420" on start screen when ?challenge=N is in URL.
- Mobile gate: displays on screens under 769px, hides game-container.
- No em dashes found in code or copy.
- Integrity: HONEST. No false claims. Data is player-generated real-time.

### Live URL (lockstep-eight.vercel.app vs lockstep.vercel.app)

- lockstep.vercel.app returns HTTP 401 (likely a Vercel alias with access restriction).
- lockstep-eight.vercel.app is LIVE but serves the OLD pre-fix build:
  - Share text: "SUPERB! on Lockstep - lockstep-eight.vercel.app" (no score, no combo, no challenge URL).
  - No challenge banner feature.
  - No personal best display.
- DEPLOY MISMATCH: repo HEAD has 2 meaningful commits not yet deployed. A Vercel push deploy is needed.

### Issues Remaining in Repo HEAD (not yet fixed)

1. The `og:url` and `BASE_URL` in shareScore both use `lockstep-eight.vercel.app` but the canonical domain may be `lockstep.vercel.app` if that is the intended alias. Low priority until deploy alias is confirmed.
2. No personal best tracking (added this pass, see below).
3. No audio autoplay recovery hint. If a user somehow triggers the AudioContext suspend state (tab switch during countdown), there is no "tap to resume" overlay.

---

## Prioritized Plan

### Quick Wins (effort S, no external dependencies)

1. **Personal best via localStorage** (DONE THIS PASS, contained/safe)
   - Shows "BEST: N pts" on start screen after first run.
   - Shows animated "NEW BEST: N pts" on results screen when score exceeds stored best.
   - Files: game.js, index.html, style.css.
   - Why it matters: gives the evangelist a reason to retry, closes the "how do I know I improved?" loop without needing a server.
   - Deploy needed: yes, but no new infra.

2. **Verify and fix canonical URL** (CONFIRMED CORRECT, no change needed)
   - Curled lockstep-eight.vercel.app (200) and lockstep.vercel.app (401) with Twitterbot UA.
   - lockstep-eight.vercel.app is the live host. og:url and BASE_URL already point there. No fix required.

3. **High score in challenge banner comparison** (DONE WAVE 2)
   - When a challenge param is present, compare the player's final score to the challenge target and show "You beat the challenge by N pts!" or "You missed the challenge by N pts." on results screen.
   - Files: game.js, index.html, style.css.
   - Why: closes the viral loop the challenge link opens.

4. **AudioContext resume hint** (DONE WAVE 2)
   - If `this.audio.ctx.state === 'suspended'` at game start, resume and show a brief animated "Click anywhere to unmute" pill.
   - File: game.js, index.html, style.css.
   - Effort: S.

### Medium Wins (effort M, more logic)

5. **Infinite/endless mode**
   - After the chart ends (138 beats), loop the section pattern at increasing tempo instead of ending.
   - Motivates longer sessions and higher combo streaks.
   - File: game.js (createChart + loop logic).
   - Effort: M. Not a tier-escalation rebuild, but more than one function.

6. **Off-beat visual cue improvement**
   - The mode indicator text ("OFF-BEAT") is small and easy to miss. A full background color flash or animated transition on switch would reduce missed beats from confusion.
   - Files: style.css, game.js.
   - Effort: M.

### Bigger Bets (effort L, out of scope for game tier)

7. **Global leaderboard**
   - Requires a backend or third-party (e.g. Supabase free tier).
   - Out of scope for this tier.

8. **Mobile touch support**
   - Replacing the mobile gate with actual tap-to-beat.
   - Large scope: input.js rewrite, timing recalibration.
   - Out of scope.

---

## Wave 1 (2026-05-30)

Implemented: personal best tracking (localStorage). Files changed: game.js, index.html, style.css.
Build: static, no build script. Syntax verified with `node --check game.js`.
Flagged: deploy mismatch (lockstep-eight.vercel.app still serves old build; needs a Vercel deploy flush).

## Wave 2 (2026-05-30)

Confirmed: lockstep-eight.vercel.app is the live canonical host (HTTP 200 with Twitterbot UA). lockstep.vercel.app returns 401. All meta/share URLs were already correct. No URL fix needed.

Implemented:
- Challenge result comparison on results screen: when arriving via a ?challenge=N link, the results screen now shows "You beat the challenge by N pts!" (green) or "You missed the challenge by N pts." (orange). Closes the viral share loop.
- AudioContext resume hint: if the browser suspends the AudioContext on game start (autoplay policy or tab switch), a brief animated "Click anywhere to unmute" pill appears and auto-fades. Fixes the silent-game bounce case.

Files changed: game.js, index.html, style.css.
Build: static, no build script. Syntax verified with `node --check game.js`.
