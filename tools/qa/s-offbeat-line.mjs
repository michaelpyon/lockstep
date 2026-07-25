// Michael's report: the other characters jump at the wrong time on off-beats.
//
// Lockstep asks the player to match the formation. In on-beat sections the
// line steps on the downbeat; once the cue switches the line off-beat, it must
// step halfway between downbeats, which is exactly where the game scores the
// player. This measures where the formation's steps actually land on the beat
// grid in each mode.
//
// Run against the game with ?bot=0 style manual start: the scenario presses
// Space to start and then only observes.
const TOLERANCE = 0.14; // beats; covers frame jitter at 128 BPM

export async function scenario(page) {
  const out = {};

  await page.waitForFunction(() => window.__LOCKSTEP && window.__LOCKSTEP.version === 1);

  // Start the run. The title screen listens for Space.
  await page.locator("#start-btn").click();
  await page.waitForFunction(() => window.__LOCKSTEP.state === "playing", null, {
    timeout: 20000,
  });

  // The chart switches to off-beat at beat 16 and back on at beat 32.
  // Sample the scored hit grid from inside the off-beat section. expectedHits
  // only ever holds the short scheduling lookahead and is consumed as the
  // judge resolves each one, so collect across several points rather than
  // reading it once.
  const expected = new Set();
  for (const mark of [18, 21, 24, 27, 30]) {
    await page.waitForFunction(
      (b) => window.__LOCKSTEP.beatFloat > b,
      mark,
      { timeout: 45000 }
    );
    const sample = await page.evaluate(() => window.__LOCKSTEP.expectedHitBeats);
    sample.forEach((b) => expected.add(b));
  }

  // Watch through the rest of the off-beat section plus a margin.
  await page.waitForFunction(() => window.__LOCKSTEP.beatFloat > 34, null, {
    timeout: 45000,
  });

  const steps = await page.evaluate(() => window.__LOCKSTEP.npcSteps);
  out.stepCount = steps.length;
  if (steps.length < 20) {
    throw new Error(`Only ${steps.length} formation steps recorded; expected the full section`);
  }

  // Distance from the nearest downbeat, in beats.
  const offsetFromDownbeat = (b) => {
    const frac = b - Math.floor(b);
    return Math.min(frac, 1 - frac);
  };

  // Ignore steps within a beat of a mode switch: the line changes feet there
  // and one irregular interval is intended.
  const SWITCH_BEATS = [16, 32];
  const settled = steps.filter(
    (s) => s.beatFloat > 2 && !SWITCH_BEATS.some((sb) => Math.abs(s.beatFloat - sb) < 1)
  );

  const onSteps = settled.filter((s) => s.mode === "on");
  const offSteps = settled.filter((s) => s.mode === "off");
  out.onCount = onSteps.length;
  out.offCount = offSteps.length;
  if (onSteps.length < 5) throw new Error(`Only ${onSteps.length} settled on-beat steps`);
  if (offSteps.length < 5) throw new Error(`Only ${offSteps.length} settled off-beat steps`);

  // On-beat sections: the line lands on the downbeat.
  const onWorst = Math.max(...onSteps.map((s) => offsetFromDownbeat(s.beatFloat)));
  out.onWorstOffsetFromDownbeat = Number(onWorst.toFixed(3));
  if (onWorst > TOLERANCE) {
    throw new Error(
      `On-beat step drifted ${onWorst.toFixed(3)} beats from the downbeat (limit ${TOLERANCE})`
    );
  }

  // Off-beat sections: the line lands halfway between downbeats. This is the
  // assertion that fails against the prior build, where it stepped on 0.0.
  const offDistances = offSteps.map((s) => Math.abs(offsetFromDownbeat(s.beatFloat) - 0.5));
  const offWorst = Math.max(...offDistances);
  out.offWorstDistanceFromHalfBeat = Number(offWorst.toFixed(3));
  out.offSample = offSteps.slice(0, 6).map((s) => Number(s.beatFloat.toFixed(3)));
  if (offWorst > TOLERANCE) {
    throw new Error(
      `Off-beat step landed ${offWorst.toFixed(3)} beats from the half-beat (limit ${TOLERANCE}). ` +
        `Sample beat positions: ${JSON.stringify(out.offSample)}`
    );
  }

  // The formation must land where the game scores the player. Every hit the
  // judge expected while the line was off-beat has to sit on a half beat.
  const sampled = [...expected].sort((a, b) => a - b);
  const offExpected = sampled.filter((b) => b > 16 && b < 32);
  out.offExpectedSample = offExpected.slice(0, 6);
  if (offExpected.length < 3) {
    throw new Error(
      `Only ${offExpected.length} expected hits sampled inside the off-beat section: ${JSON.stringify(sampled)}`
    );
  }
  const badExpected = offExpected.filter((b) => Math.abs((b % 1) - 0.5) > 1e-6);
  if (badExpected.length) {
    throw new Error(`Off-beat expected hits are not on the half beat: ${JSON.stringify(badExpected.slice(0, 4))}`);
  }

  return out;
}
