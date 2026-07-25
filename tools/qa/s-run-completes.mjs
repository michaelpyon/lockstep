// The offbeat fix touches the beat loop, so confirm a full 138-beat run still
// reaches the results screen with a rank, a score, and the share controls, and
// that the line actually switched modes along the way. No input is sent, so
// the rank is the honest bottom rank; this checks the run completes, not that
// it scores well. Run against `/`.
export async function scenario(page) {
  const out = {};

  await page.waitForFunction(() => window.__LOCKSTEP && window.__LOCKSTEP.version === 1);
  await page.locator("#start-btn").click();
  await page.waitForFunction(() => window.__LOCKSTEP.state === "playing", null, { timeout: 20000 });

  // Sample the mode across the run so a stuck mode indicator is caught.
  const modes = new Set();
  for (const mark of [8, 20, 40, 55, 75, 90, 110, 130]) {
    await page.waitForFunction((b) => window.__LOCKSTEP.beatFloat > b, mark, { timeout: 60000 });
    modes.add(await page.evaluate(() => window.__LOCKSTEP.mode));
  }
  out.modesSeen = [...modes].sort();
  if (out.modesSeen.length !== 2) {
    throw new Error(`Run only ever saw mode(s) ${JSON.stringify(out.modesSeen)}; expected both on and off`);
  }

  await page.waitForFunction(() => window.__LOCKSTEP.state === "results", null, { timeout: 60000 });

  out.resultsVisible = await page.locator("#results-screen").isVisible();
  if (!out.resultsVisible) throw new Error("Song ended but the results screen is not visible");

  const text = await page.locator("#results-screen").innerText();
  out.hasRank = /SUPERB!|Great!|OK|Try Again/i.test(text);
  if (!out.hasRank) throw new Error(`No rank on the results screen:\n${text.slice(0, 400)}`);

  out.hasShare = (await page.locator("#results-screen button").count()) >= 2;
  if (!out.hasShare) throw new Error("Results screen is missing its share and retry controls");

  // No stray formation step may fire after the song ends.
  const stepsAtEnd = await page.evaluate(() => window.__LOCKSTEP.npcSteps.length);
  await page.waitForTimeout(1200);
  const stepsAfter = await page.evaluate(() => window.__LOCKSTEP.npcSteps.length);
  out.stepsAtEnd = stepsAtEnd;
  out.stepsAfter = stepsAfter;
  if (stepsAfter !== stepsAtEnd) {
    throw new Error(`A pending formation step fired after the song ended (${stepsAtEnd} -> ${stepsAfter})`);
  }

  out.overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (out.overflow > 0) throw new Error(`Results screen overflows by ${out.overflow}px`);

  return out;
}
