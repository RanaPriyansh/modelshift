import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3317";
const outputDirectory = path.resolve(
  process.env.FORGE_SCREENSHOT_DIR ?? "output/playwright/forge-full-pages",
);

const pages = [
  ["/", "public-home"],
  ["/paths", "public-paths"],
  ["/paths/ai-literacy", "public-path-ai-literacy"],
  ["/paths/source-corroboration", "public-path-source-corroboration"],
  ["/how-forge-works", "public-how-forge-works"],
  ["/how-it-works", "public-how-it-works"],
  ["/explore", "public-explore"],
  ["/pricing", "public-pricing"],
  ["/trust", "public-trust"],
  ["/trust/evidence", "public-trust-evidence"],
  ["/modelshift", "public-modelshift"],
  ["/start", "start"],
  ["/login", "login"],
  ["/sign-in", "sign-in"],
  ["/account", "account"],
  ["/app", "app-home"],
  ["/app/goals", "app-goals"],
  ["/app/path", "app-path"],
  ["/app/paths", "app-paths"],
  ["/app/study", "app-study"],
  ["/app/projects", "app-projects"],
  ["/app/library", "app-library"],
  ["/app/returns", "app-returns"],
  ["/app/evidence", "app-evidence"],
  ["/app/settings", "app-settings"],
  ["/app/paths/not-a-real-path", "app-path-recovery"],
  ["/app/projects/not-a-real-project", "app-project-recovery"],
  ["/app/evidence/not-a-real-evidence", "app-evidence-recovery"],
  ["/app/returns/not-a-real-return", "app-return-recovery"],
  ["/learn/force-and-motion", "world-force-and-motion"],
  ["/learn/ai-and-learning", "world-source-corroboration"],
  ["/learn/proportional-reasoning", "world-proportional-reasoning"],
  ["/learn/primary-source-reasoning", "world-primary-source-reasoning"],
  ["/studio", "studio"],
  ["/author", "author"],
  ["/coverage", "coverage"],
  ["/home", "compat-home"],
  ["/plan", "compat-plan"],
  ["/orient", "compat-orient"],
  ["/onboarding", "compat-onboarding"],
  ["/planner", "compat-planner"],
  ["/explore-auth", "compat-explore-auth"],
  ["/projects", "compat-projects"],
  ["/profile", "compat-profile"],
  ["/evidence", "compat-evidence"],
  ["/pathways", "compat-pathways"],
  ["/study/ai-foundations", "compat-study-ai-foundations"],
  ["/trail", "compat-trail"],
  ["/pilot", "compat-pilot"],
  ["/internal/pilot", "internal-pilot-production-boundary"],
];

const EXPECTED_OPERATIONAL_CAPTURE_COUNT = 3;
const EXPECTED_CAPTURE_COUNT = 53;

const expectedFinalRoutes = new Map([
  ["/how-it-works", "/how-forge-works"],
  ["/login", "/sign-in"],
  ["/studio", "/author"],
  ["/home", "/app"],
  ["/plan", "/app/path"],
  ["/orient", "/start"],
  ["/onboarding", "/start"],
  ["/planner", "/start"],
  ["/explore-auth", "/paths"],
  ["/projects", "/app/projects"],
  ["/profile", "/app/settings"],
  ["/evidence", "/app/evidence"],
  ["/pathways", "/coverage"],
  ["/study/ai-foundations", "/learn/ai-and-learning"],
  ["/pilot", "/internal/pilot"],
]);

if (pages.length + EXPECTED_OPERATIONAL_CAPTURE_COUNT !== EXPECTED_CAPTURE_COUNT) {
  throw new Error(
    `Capture inventory changed: expected ${EXPECTED_CAPTURE_COUNT} total captures, `
    + `but ${pages.length} static routes plus ${EXPECTED_OPERATIONAL_CAPTURE_COUNT} `
    + "operational routes are configured.",
  );
}

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserOptions = {
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
  colorScheme: "dark",
};
const context = await browser.newContext(browserOptions);

async function addAdultDeviceProfile(targetContext) {
  await targetContext.addInitScript((profile) => {
    window.localStorage.setItem("forge.device-profile:v1", JSON.stringify(profile));
  }, {
    ageMode: "adult",
    createdAt: "2026-07-24T00:00:00.000Z",
    guardianPresent: false,
    profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
    schemaVersion: 1,
  });
}

await addAdultDeviceProfile(context);

const captures = [];

async function captureRoute(
  targetContext,
  route,
  slug,
  expectedFinalUrl = expectedFinalRoutes.get(route) ?? route,
) {
  const page = await targetContext.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  let response = await page.goto(new URL(route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const currentPath = () => {
    const url = new URL(page.url());
    return `${url.pathname}${url.search}`;
  };
  if (currentPath() !== expectedFinalUrl) {
    const finalResponse = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return candidate.request().isNavigationRequest()
        && `${url.pathname}${url.search}` === expectedFinalUrl;
    }, { timeout: 30_000 });
    await page.waitForURL((url) =>
      `${url.pathname}${url.search}` === expectedFinalUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    response = await finalResponse;
  }
  await page.waitForLoadState("networkidle", { timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const filename =
    `${String(captures.length + 1).padStart(2, "0")}-${slug}.png`;
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    fullPage: true,
    animations: "disabled",
  });

  const surface = await page.evaluate(() => ({
    finalUrl: window.location.pathname + window.location.search,
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim() ?? null,
    h1Count: document.querySelectorAll("h1").length,
    mainCount: document.querySelectorAll("main").length,
    width: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  captures.push({
    requestedRoute: route,
    expectedFinalUrl,
    status: response?.status() ?? null,
    filename,
    consoleErrors,
    ...surface,
  });
  await page.close();
}

async function createOperationalSession({
  goal,
  outcome,
  focusProtocol,
}) {
  const operationalContext = await browser.newContext(browserOptions);
  await addAdultDeviceProfile(operationalContext);
  const setupPage = await operationalContext.newPage();
  try {
    await setupPage.goto(new URL("/start", baseUrl).toString(), {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await setupPage.getByPlaceholder("I want to…").fill(goal);
    await setupPage.getByRole("button", { name: "Name the outcome" }).click();
    await setupPage.getByPlaceholder(
      "For example: build, explain, decide, repair, investigate, or perform…",
    ).fill(outcome);
    await setupPage.getByRole("button", { name: "Set route context" }).click();
    await setupPage.getByRole("checkbox", {
      name: /Use these exact fields for one first-party planning response/,
    }).check();
    await setupPage.getByRole("button", {
      name: "Build inspectable candidate",
    }).click();
    await setupPage.getByRole("button", { name: "Accept exact path" }).click();
    await setupPage.waitForURL("**/app");
    await setupPage.getByRole("link", { name: "Open action brief" }).click();
    await setupPage.getByRole("button", { name: "Begin reviewed World" }).click();
    await setupPage.waitForURL(
      new RegExp(`/focus/${focusProtocol}/study-session\\.[a-z0-9._-]+$`),
    );
    const focusRoute = new URL(setupPage.url()).pathname;
    const sessionId = focusRoute.split("/").at(-1);
    if (!sessionId) {
      throw new Error(`Operational ${focusProtocol} setup produced no session ID.`);
    }
    return {
      context: operationalContext,
      focusRoute,
      studyRoute: `/app/study/${sessionId}`,
    };
  } catch (error) {
    await operationalContext.close();
    throw error;
  } finally {
    await setupPage.close();
  }
}

try {
  for (const [route, slug] of pages) {
    await captureRoute(context, route, slug);
  }

  const modelshiftSession = await createOperationalSession({
    goal: "Understand why a moving object keeps moving after a brief force ends.",
    outcome: "Predict and explain a new force-and-motion case without hints.",
    focusProtocol: "modelshift",
  });
  try {
    await captureRoute(
      modelshiftSession.context,
      modelshiftSession.focusRoute,
      "focus-modelshift-operational",
      modelshiftSession.focusRoute,
    );
    await captureRoute(
      modelshiftSession.context,
      modelshiftSession.studyRoute,
      "app-study-operational",
      modelshiftSession.studyRoute,
    );
  } finally {
    await modelshiftSession.context.close();
  }

  const activitySession = await createOperationalSession({
    goal: "Understand how equivalent ratios keep a recipe in proportion.",
    outcome: "Solve and explain a new equivalent-ratio case without hints.",
    focusProtocol: "activity",
  });
  try {
    await captureRoute(
      activitySession.context,
      activitySession.focusRoute,
      "focus-activity-operational",
      activitySession.focusRoute,
    );
  } finally {
    await activitySession.context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  `${JSON.stringify({
    baseUrl,
    capturedAt: new Date().toISOString(),
    expectedCaptureCount: EXPECTED_CAPTURE_COUNT,
    viewport: { width: 1440, height: 1000 },
    pages: captures,
  }, null, 2)}\n`,
  "utf8",
);

const failed = captures.filter((capture) => (
  capture.status !== 200
  || capture.finalUrl !== capture.expectedFinalUrl
  || capture.mainCount !== 1
  || capture.h1Count !== 1
  || capture.width > capture.viewportWidth + 1
  || capture.consoleErrors.length > 0
));

if (failed.length > 0 || captures.length !== EXPECTED_CAPTURE_COUNT) {
  process.stderr.write(`${JSON.stringify({
    expectedCaptureCount: EXPECTED_CAPTURE_COUNT,
    observedCaptureCount: captures.length,
    failed,
  }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Captured ${captures.length}/${EXPECTED_CAPTURE_COUNT} full pages in ${outputDirectory}\n`,
  );
}
