import { expect, test } from "@playwright/test";

const FOUNDATION_FIXTURES_ENABLED =
  process.env.FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE
    === "forge-university-command-center.v1"
  && process.env.FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE
    === "forge-university-degree-map.v1"
  && process.env.FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE
    === "forge-university-learning-map.v1";

test.skip(
  !FOUNDATION_FIXTURES_ENABLED,
  "Run this development-only spec with all three exact foundation fixture tokens.",
);

const ENABLED_SURFACES = [
  {
    path: "/internal/university-command-center",
    heading: "Choose a bounded university workspace.",
  },
  {
    path: "/internal/university-degree-map",
    heading: "Inspect the map. Keep the decision.",
  },
  {
    path: "/internal/university-learning-map",
    heading: "See the map. Keep the limits.",
  },
] as const;

const MAP_SURFACES = ENABLED_SURFACES.filter(
  (surface) => surface.path !== "/internal/university-command-center",
);

for (const surface of ENABLED_SURFACES) {
  test(`${surface.path} reflows and exposes keyboard focus at 320 CSS pixels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(surface.path);

    await expect(page.getByRole("heading", {
      level: 1,
      name: surface.heading,
    })).toBeVisible();
    expect(await page.evaluate(() => ({
      body: document.body.scrollWidth,
      client: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }))).toEqual({ body: 320, client: 320, document: 320 });

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    expect(await skipLink.evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        contained: box.left >= 0 && box.right <= 320,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    })).toEqual({
      contained: true,
      outlineStyle: "solid",
      outlineWidth: "3px",
    });
    await page.keyboard.press("Enter");
    await expect(page.locator("#forge-main")).toBeFocused();

    if (surface.path === "/internal/university-command-center") {
      await page.goto(surface.path);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", {
        name: "FORGE Learning OS home",
      })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", {
        name: "Open Degree map",
      })).toBeFocused();
    }
  });

  test(`${surface.path} honors reduced motion and forced colors`, async ({
    page,
  }) => {
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await page.goto(surface.path);

    await expect(page.getByRole("heading", {
      level: 1,
      name: surface.heading,
    })).toBeVisible();
    expect(await page.evaluate(() => ({
      forcedColors: matchMedia("(forced-colors: active)").matches,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }))).toEqual({ forcedColors: true, reducedMotion: true });

    const motion = await page.locator("article *").evaluateAll((elements) => (
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          animationDuration: Number.parseFloat(style.animationDuration || "0"),
          transitionDuration: Number.parseFloat(
            style.transitionDuration || "0",
          ),
        };
      })
    ));
    expect(motion.every((entry) => (
      entry.animationDuration <= 0.000_01
      && entry.transitionDuration <= 0.000_01
    ))).toBe(true);

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    expect(await skipLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    })).toEqual({
      outlineStyle: "solid",
      outlineWidth: "3px",
    });

    if (surface.path === "/internal/university-command-center") {
      const directoryLink = page.getByRole("link", {
        name: "Open Degree map",
      });
      expect(await directoryLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderStyle: style.borderStyle,
          borderWidth: style.borderWidth,
        };
      })).toEqual({
        borderStyle: "solid",
        borderWidth: "2px",
      });
    }
  });
}

for (const surface of MAP_SURFACES) {
  test(`${surface.path} returns to the workspace directory only after activation`, async ({
    page,
  }) => {
    const commandCenterRequests: string[] = [];
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname
        === "/internal/university-command-center"
      ) {
        commandCenterRequests.push(request.url());
      }
    });

    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(surface.path);
    await expect(page.getByRole("heading", {
      level: 1,
      name: surface.heading,
    })).toBeVisible();
    expect(commandCenterRequests).toHaveLength(0);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const returnLink = page.getByRole("link", {
      name: "Open university workspaces",
    });
    await expect(returnLink).toBeFocused();
    expect(await returnLink.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        contained: box.left >= 0 && box.right <= 320,
        height: box.height,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    })).toEqual({
      contained: true,
      height: 44,
      outlineStyle: "solid",
      outlineWidth: "3px",
    });

    await Promise.all([
      page.waitForURL("**/internal/university-command-center"),
      page.keyboard.press("Enter"),
    ]);
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Choose a bounded university workspace.",
    })).toBeVisible();
    expect(commandCenterRequests.length).toBeGreaterThan(0);
  });
}
