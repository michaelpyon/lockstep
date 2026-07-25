// Scenario runner for the BlockScore browser regressions. Drives system Chrome
// through playwright-core and fails on any console or page error, so a
// scenario cannot pass while the app is throwing.
//
//   node tools/qa/run.mjs tools/qa/s-selection-cap.mjs http://127.0.0.1:4103/ 1440x900
//
// The app itself stays dependency-free for these checks. playwright-core comes
// from the gstack skill install; override with PLAYWRIGHT_CORE if it moves, and
// CHROME_PATH for a different Chrome build. Pass a trailing `mobile` argument
// for a touch-enabled context.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const PLAYWRIGHT_CORE =
  process.env.PLAYWRIGHT_CORE ||
  "/Users/michaelpyon/.claude/skills/gstack/node_modules/playwright-core/index.js";
const CHROME_PATH =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// playwright-core is CommonJS; Node hands named exports back on `default` when
// its static analysis of the entry file comes up empty.
const playwright = await import(pathToFileURL(PLAYWRIGHT_CORE).href);
const chromium = playwright.chromium ?? playwright.default?.chromium;
if (!chromium) {
  throw new Error(`No chromium export from ${PLAYWRIGHT_CORE}`);
}

const [scenarioPath, targetUrl, viewportArg = "1440x900", mode = "desktop"] =
  process.argv.slice(2);
if (!scenarioPath || !targetUrl) {
  console.error("usage: node run.mjs <scenario> <url> <WxH> [mobile]");
  process.exit(2);
}

const match = viewportArg.match(/^(\d+)x(\d+)$/);
if (!match) throw new Error(`Invalid viewport: ${viewportArg}`);
const viewport = { width: Number(match[1]), height: Number(match[2]) };
const touch = mode === "mobile";

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
  executablePath: CHROME_PATH,
});

try {
  const context = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(targetUrl, { waitUntil: "load" });
  const scenarioModule = await import(pathToFileURL(resolve(scenarioPath)).href);
  const result = await scenarioModule.scenario(page, context);
  const failures = [...consoleErrors, ...pageErrors];
  console.log(
    JSON.stringify({
      pass: failures.length === 0,
      scenario: scenarioPath,
      viewport: viewportArg,
      mode,
      result,
      consoleErrors,
      pageErrors,
    })
  );
  if (failures.length) process.exitCode = 1;
  await context.close();
} catch (error) {
  console.error(
    JSON.stringify({
      pass: false,
      scenario: scenarioPath,
      viewport: viewportArg,
      mode,
      error: error?.stack || String(error),
      consoleErrors,
      pageErrors,
    })
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
