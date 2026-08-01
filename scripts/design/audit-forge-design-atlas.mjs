import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { chromium } from "@playwright/test";

const baseURL = process.env.FORGE_DESIGN_ATLAS_URL ?? "http://127.0.0.1:3035/internal/design-lab";
const sourcePath = new URL(
  "../../src/components/forge/design-lab/ProductDesignAtlas.tsx",
  import.meta.url,
);
const source = await readFile(sourcePath, "utf8");
const canonicalIDs = [
  ...new Set(
    [...source.matchAll(/id:\s*"((?:PUB|APP|FOCUS|IOS)-\d+)"/g)].map(
      (match) => match[1],
    ),
  ),
].sort();

const expectedCounts = {
  APP: 14,
  FOCUS: 3,
  IOS: 18,
  PUB: 11,
};
const stateNames = [
  "Loading",
  "Empty",
  "Offline",
  "Blocked",
  "Contaminated",
  "Withdrawn",
  "Error",
  "Safe fallback",
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 320, height: 800 },
];

assert.equal(canonicalIDs.length, 46, "The source must contain 46 canonical identifiers.");
for (const [prefix, expected] of Object.entries(expectedCounts)) {
  assert.equal(
    canonicalIDs.filter((identifier) => identifier.startsWith(`${prefix}-`)).length,
    expected,
    `The source must contain ${expected} ${prefix} identifiers.`,
  );
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const browserFailures = [];

    page.on("console", (message) => {
      if (message.type() === "error") browserFailures.push(message.text());
    });
    page.on("pageerror", (error) => browserFailures.push(error.message));

    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    assert(response, `${viewport.name}: the design atlas did not return a response.`);
    assert.equal(response.status(), 200, `${viewport.name}: the design atlas must return HTTP 200.`);

    await page.locator("#forge-terrain-foundations").waitFor();
    await page.locator("#ios-app-atlas").waitFor();

    for (const identifier of canonicalIDs) {
      assert.equal(
        await page.getByText(identifier, { exact: true }).count(),
        1,
        `${viewport.name}: ${identifier} must occur once.`,
      );
    }

    for (const stateName of stateNames) {
      assert.equal(
        await page.getByRole("heading", { name: stateName, exact: true }).count(),
        1,
        `${viewport.name}: ${stateName} must occur once in the shared state system.`,
      );
    }

    const structuralResult = await page.evaluate(() => ({
      darkModes: document.querySelectorAll('[data-mode="dark"]').length,
      lightModes: document.querySelectorAll('[data-mode="light"]').length,
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sections: [
        "forge-terrain-foundations",
        "public-site-atlas",
        "web-app-atlas",
        "focus-mode-atlas",
        "ios-app-atlas",
      ].filter((identifier) => document.getElementById(identifier)).length,
    }));

    assert.equal(structuralResult.sections, 5, `${viewport.name}: all atlas sections must exist.`);
    assert(structuralResult.lightModes > 0, `${viewport.name}: Light boards must exist.`);
    assert(structuralResult.darkModes > 0, `${viewport.name}: Dark boards must exist.`);
    assert(
      structuralResult.overflow <= 1,
      `${viewport.name}: horizontal overflow is ${structuralResult.overflow}px.`,
    );

    await page.keyboard.press("Tab");
    const initialFocus = await page.evaluate(() => ({
      text: document.activeElement?.textContent?.trim(),
      outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
      outlineWidth: getComputedStyle(document.activeElement).outlineWidth,
    }));
    assert.equal(
      initialFocus.text,
      "Skip to design candidates",
      `${viewport.name}: the skip link must receive the first focus.`,
    );
    assert.notEqual(
      initialFocus.outlineStyle,
      "none",
      `${viewport.name}: the skip link must have a visible outline.`,
    );

    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => document.activeElement?.id),
      "design-lab-main",
      `${viewport.name}: the skip link must move focus to the main content.`,
    );

    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
      true,
      `${viewport.name}: Reduced Motion must be active.`,
    );
    await page.waitForTimeout(30);
    const activeAnimations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => animation.playState === "running")
        .map((animation) => animation.effect?.getTiming().duration ?? 0)
        .filter((duration) => typeof duration === "number" && duration > 1),
    );
    assert.deepEqual(
      activeAnimations,
      [],
      `${viewport.name}: Reduced Motion must leave no active animation over 1ms.`,
    );

    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    assert.equal(
      await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
      true,
      `${viewport.name}: Forced Colors must be active.`,
    );
    const forcedColorsResult = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stateBorder: getComputedStyle(
        document.querySelector('[class*="stateGrid"] article'),
      ).borderRightStyle,
    }));
    assert(
      forcedColorsResult.overflow <= 1,
      `${viewport.name}: Forced Colors overflow is ${forcedColorsResult.overflow}px.`,
    );
    assert.notEqual(
      forcedColorsResult.stateBorder,
      "none",
      `${viewport.name}: Forced Colors must preserve state boundaries.`,
    );

    assert.deepEqual(browserFailures, [], `${viewport.name}: browser errors occurred.`);

    results.push({
      viewport: `${viewport.width}x${viewport.height}`,
      canonicalIdentifiers: canonicalIDs.length,
      sharedStates: stateNames.length,
      lightBoards: structuralResult.lightModes,
      darkBoards: structuralResult.darkModes,
      overflow: structuralResult.overflow,
      forcedColorsOverflow: forcedColorsResult.overflow,
      activeReducedMotionAnimations: activeAnimations.length,
      browserErrors: browserFailures.length,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  JSON.stringify(
    {
      status: "pass",
      url: baseURL,
      canonicalCounts: expectedCounts,
      results,
    },
    null,
    2,
  ),
);
