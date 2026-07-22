import { expect, test, type Page } from "@playwright/test";

const ROUTES = [
  { path: "/", heading: "What do you want to understand?", main: "#forge-main" },
  { path: "/studio", heading: "Turn a learning question into a testable lesson draft.", main: "#forge-main" },
  { path: "/login", heading: "Pick where your learning trail lives.", main: "#forge-main" },
  { path: "/account", heading: "Continuity is optional. Your work stays yours.", main: "#forge-main" },
  { path: "/learn/force-and-motion", heading: "The engine is off. What happens next?", main: "#world-content" },
  { path: "/learn/proportional-reasoning", heading: "The two citrus mixes", main: "#world-content" },
  { path: "/learn/ai-and-learning", heading: "Commit before the evidence appears.", main: "#world-content" },
  { path: "/learn/primary-source-reasoning", heading: "What can this photograph prove?", main: "#world-content" },
  { path: "/evidence", heading: "Proof should say exactly what happened.", main: "#forge-main" },
  { path: "/trail", heading: "A map of questions and evidence—not a level.", main: "#forge-main" },
  { path: "/pathways", heading: "What FORGE can—and cannot—offer today.", main: "#forge-main" },
] as const;

const CHILD_CAPABLE_WORLD_PATHS = new Set([
  "/learn/proportional-reasoning",
  "/learn/primary-source-reasoning",
]);

const CONTRAST_SAMPLES = [
  { route: "/", name: "Home paper heading", selector: ".forge-hero-heading h1" },
  { route: "/", name: "Home muted body text", selector: ".forge-hero-heading > p:last-child" },
  { route: "/", name: "Home dark intake label", selector: ".forge-question-field > span" },
  { route: "/", name: "Home evidence status text", selector: ".forge-world-row--ready .forge-status" },
  { route: "/", name: "Home quiet planned status text", selector: ".forge-world-row--planned .forge-status" },
  { route: "/", name: "Home primary action", selector: ".forge-primary-action" },
  { route: "/studio", name: "Studio dark-instrument heading", selector: ".lesson-studio-heading h1" },
  { route: "/studio", name: "Studio muted instrument text", selector: ".lesson-studio-heading > p" },
  { route: "/pathways", name: "Pathways availability heading", selector: ".forge-pathways-hero h1" },
  { route: "/pathways", name: "Pathways boundary text", selector: ".forge-pathways-boundary p" },
] as const;

type ContrastSample = (typeof CONTRAST_SAMPLES)[number];

type RenderedContrast = {
  background: string;
  backgroundResolved: boolean;
  floor: number;
  foreground: string;
  largeText: boolean;
  name: string;
  ratio: number;
  visible: boolean;
};

async function tabTo(page: Page, selector: string, maximumTabs = 6) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.locator(selector).evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}.`);
}

async function visitOwnedRoute(page: Page, route: (typeof ROUTES)[number]) {
  if (CHILD_CAPABLE_WORLD_PATHS.has(route.path)) {
    await page.addInitScript(() => {
      localStorage.setItem("forge.device-profile:v1", JSON.stringify({
        schemaVersion: 1,
        profileId: "9be711de-d7a6-4911-b903-f2d829da83d5",
        ageMode: "teen",
        guardianPresent: false,
        createdAt: "2026-07-22T00:00:00.000Z",
      }));
    });
  }

  await page.goto(route.path);
}

async function mobileContract(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const styles = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
    };
    const targetSelector = [
      "a",
      "button",
      'input:not([type="radio"]):not([type="checkbox"]):not([type="range"])',
      "textarea",
      "select",
      'label:has(input[type="radio"])',
      'label:has(input[type="checkbox"])',
    ].join(",");
    const inlineCitationSelector = 'a[data-forge-inline-citation="true"]';
    const inlineCitationExceptions = Array.from(document.querySelectorAll<HTMLElement>(inlineCitationSelector))
      .map((element) => ({
        display: getComputedStyle(element).display,
        inProse: Boolean(element.closest("p, li, blockquote")),
        name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "inline citation",
      }));
    const undersized = Array.from(document.querySelectorAll<HTMLElement>(targetSelector))
      .filter(visible)
      .filter((element) => !element.matches(inlineCitationSelector))
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName,
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44);
    const inputSizes = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"))
      .filter(visible)
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      undersized,
      inputSizes,
      inlineCitationExceptions,
      rovingTabContract: tabs.length === 0 || (tabs.filter((tab) => tab.tabIndex === 0).length === 1 && tabs.every((tab) => tab.tabIndex === 0 || tab.tabIndex === -1)),
    };
  });
}

async function renderedContrast(page: Page, sample: ContrastSample): Promise<RenderedContrast> {
  await page.goto(sample.route);
  const target = page.locator(sample.selector).first();
  await expect(target, sample.name).toBeVisible();
  return target.evaluate((element, name) => {
    type Rgba = [number, number, number, number];

    const parseColor = (value: string): Rgba => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (channels.length < 3) throw new Error(`Unable to parse rendered color: ${value}`);
      return [channels[0], channels[1], channels[2], channels[3] ?? 1];
    };
    const composite = (foreground: Rgba, background: Rgba): Rgba => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
        alpha,
      ];
    };
    const luminance = ([red, green, blue]: Rgba) => {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const serialize = ([red, green, blue, alpha]: Rgba) => `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha.toFixed(3)})`;
    const effectiveBackground = (target: HTMLElement) => {
      const layers: Rgba[] = [];
      for (let current: HTMLElement | null = target; current; current = current.parentElement) {
        layers.push(parseColor(getComputedStyle(current).backgroundColor));
      }
      let resolved: Rgba = [255, 255, 255, 1];
      let foundOpaqueLayer = false;
      for (const layer of layers.reverse()) {
        foundOpaqueLayer ||= layer[3] > 0;
        resolved = composite(layer, resolved);
      }
      return { color: resolved, foundOpaqueLayer };
    };

    const styles = getComputedStyle(element);
    const foreground = parseColor(styles.color);
    const resolvedBackground = effectiveBackground(element as HTMLElement);
    const blendedForeground = composite(foreground, resolvedBackground.color);
    const ratio = (Math.max(luminance(blendedForeground), luminance(resolvedBackground.color)) + 0.05)
      / (Math.min(luminance(blendedForeground), luminance(resolvedBackground.color)) + 0.05);
    const fontSize = Number.parseFloat(styles.fontSize);
    const fontWeight = Number.parseFloat(styles.fontWeight);
    const largeText = fontSize >= 24 || (fontWeight >= 700 && fontSize >= 18.66);
    const bounds = element.getBoundingClientRect();

    return {
      background: serialize(resolvedBackground.color),
      backgroundResolved: resolvedBackground.foundOpaqueLayer,
      floor: largeText ? 3 : 4.5,
      foreground: serialize(blendedForeground),
      largeText,
      name,
      ratio,
      visible: styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0,
    };
  }, sample.name);
}

test.describe("FORGE Packet A experience system", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The explicit 320px contract runs once in Chromium.");
    await page.setViewportSize({ width: 320, height: 800 });
  });

  test("all owned routes reflow at 320px with named controls and mobile input floors", async ({ page }) => {
    for (const route of ROUTES) {
      await visitOwnedRoute(page, route);
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      await expect(page.locator(route.main)).toBeVisible();

      const contract = await mobileContract(page);
      expect(contract.overflow, `${route.path} should not create a horizontal canvas`).toBeLessThanOrEqual(1);
      expect(contract.undersized, `${route.path} should preserve 44px actionable controls`).toEqual([]);
      expect(contract.inputSizes.every((size) => size >= 16), `${route.path} should preserve 16px mobile form text`).toBe(true);
      expect(contract.inlineCitationExceptions.every((citation) => citation.display === "inline" && citation.inProse), `${route.path} can exempt only explicit inline-prose citations`).toBe(true);
      expect(contract.rovingTabContract, `${route.path} should retain a valid roving-tab contract when tabs are present`).toBe(true);
    }

    await page.goto("/");
    const question = page.getByRole("textbox", { name: "Your question" });
    await question.fill("Help me understand force and motion after a push ends.");
    await page.getByRole("button", { name: "Shape my first move" }).click();
    const grounded = page.getByTestId("forge-plan-grounded");
    await expect(grounded).toBeVisible();
    await expect(grounded.locator(".forge-plan-sources a")).not.toHaveCount(0);
    const populatedContract = await mobileContract(page);
    expect(populatedContract.undersized, "a populated reviewed plan should preserve 44px source and action targets").toEqual([]);
    expect(populatedContract.inlineCitationExceptions.every((citation) => citation.display === "inline" && citation.inProse), "a populated plan can exempt only explicit inline-prose citations").toBe(true);
  });

  test("the home question stays inside its gutters with wide fallback font metrics", async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.addStyleTag({ content: ".forge-hero-heading h1 { font-family: monospace !important; }" });

      const contract = await mobileContract(page);
      expect(contract.overflow, `${width}px document overflow`).toBeLessThanOrEqual(1);
      const headingFits = await page.locator(".forge-hero-heading h1").evaluate((heading) => heading.scrollWidth <= heading.clientWidth);
      expect(headingFits, `${width}px heading overflow`).toBe(true);
    }
  });

  test("keyboard skip links, home controls, and unique visible action names remain operable", async ({ page }) => {
    for (const route of ROUTES) {
      await visitOwnedRoute(page, route);
      const skip = page.locator(".forge-skip-link");
      await expect(skip).toHaveCount(1);
      await tabTo(page, ".forge-skip-link");
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      expect(await page.evaluate(() => document.activeElement?.id), `${route.path} skip target`).toBe(route.main.slice(1));
    }

    for (const route of ["/", "/pathways"]) {
      await page.goto(route);
      const visibleActionNames = await page.evaluate(() => {
        const visible = (element: Element) => {
          const styles = getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return styles.display !== "none" && styles.visibility !== "hidden" && bounds.width > 0 && bounds.height > 0;
        };
        return Array.from(document.querySelectorAll<HTMLElement>("a, button"))
          .filter(visible)
          .map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "")
          .filter(Boolean);
      });
      expect(visibleActionNames, `${route} visible action names`).toHaveLength(new Set(visibleActionNames).size);
    }

    await page.goto("/");
    const question = page.getByRole("textbox", { name: "Your question" });
    await question.fill("Why does motion continue after a push ends?");
    await expect(question).toHaveValue("Why does motion continue after a push ends?");
    const adultMode = page.getByRole("radio", { name: "Adult Self-directed" });
    await adultMode.press("Space");
    await expect(adultMode).toBeChecked();
  });

  test("reduced motion, forced colors, and increased contrast retain visible meaning", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const contrasts: RenderedContrast[] = [];
    for (const sample of CONTRAST_SAMPLES) contrasts.push(await renderedContrast(page, sample));
    for (const contrast of contrasts) {
      expect(contrast.visible, `${contrast.name} should be a rendered visible element`).toBe(true);
      expect(contrast.backgroundResolved, `${contrast.name} should resolve a rendered ancestor background`).toBe(true);
      expect(contrast.ratio, `${contrast.name} should meet its ${contrast.largeText ? "large" : "normal"} WCAG AA floor against ${contrast.background}`)
        .toBeGreaterThanOrEqual(contrast.floor);
    }

    for (const route of ["/", "/pathways"]) {
      await page.goto(route);
      const motion = await page.locator(".forge-shell").evaluate((shell) => {
        const toMilliseconds = (raw: string) => raw.split(",").map((part) => {
          const value = part.trim();
          return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1_000;
        });
        return Array.from(shell.querySelectorAll("*")).flatMap((element) => {
          const styles = getComputedStyle(element);
          const durations = [...toMilliseconds(styles.animationDuration), ...toMilliseconds(styles.transitionDuration)];
          return durations.some((duration) => Number.isFinite(duration) && duration > 20)
            ? [`${element.tagName.toLowerCase()}.${element.className}`]
            : [];
        });
      });
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
      expect(motion, `${route} should not retain motion above 20ms`).toEqual([]);
    }

    await page.goto("/");
    await expect(page.locator(".forge-status").filter({ hasText: "Working model World" })).toHaveCount(2);

    await page.emulateMedia({ forcedColors: "active" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await expect(page.getByRole("heading", { name: "What do you want to understand?" })).toBeVisible();
    await page.goto("/pathways");
    await expect(page.getByRole("heading", { name: "What FORGE can—and cannot—offer today." })).toBeVisible();
    await expect(page.getByText("Released capability", { exact: true }).first()).toBeVisible();
    const pathwayAction = page.getByRole("link", { name: "Open Force & motion World" });
    await expect(pathwayAction).toBeVisible();
    await tabTo(page, '[href="/learn/force-and-motion"]', 16);
    await expect(pathwayAction).toBeFocused();
    const pathwayForcedColors = await page.evaluate(() => {
      type Rgb = [number, number, number];

      const parseColor = (value: string): Rgb => {
        const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
        if (channels.length !== 3) throw new Error(`Unable to parse rendered color: ${value}`);
        return [channels[0], channels[1], channels[2]];
      };
      const luminance = ([red, green, blue]: Rgb) => {
        const channels = [red, green, blue].map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const ratio = (foreground: string, background: string) => {
        const [lighter, darker] = [luminance(parseColor(foreground)), luminance(parseColor(background))]
          .sort((left, right) => right - left);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const inheritedBackground = (element: HTMLElement) => {
        for (let current: HTMLElement | null = element; current; current = current.parentElement) {
          const background = getComputedStyle(current).backgroundColor;
          if (!background.endsWith(", 0)")) return background;
        }
        return "rgb(255, 255, 255)";
      };
      const boundary = document.querySelector<HTMLElement>(".forge-pathways-boundary");
      const action = document.querySelector<HTMLElement>('[href="/learn/force-and-motion"]');
      if (!boundary || !action) throw new Error("Pathway forced-colors representatives are missing");
      const boundaryStyle = getComputedStyle(boundary);
      const actionStyle = getComputedStyle(action);
      return {
        actionBorderRatio: ratio(actionStyle.borderTopColor, inheritedBackground(action)),
        actionBorderWidth: Number.parseFloat(actionStyle.borderTopWidth),
        actionFocusOutlineRatio: ratio(actionStyle.outlineColor, inheritedBackground(action)),
        actionFocusOutlineStyle: actionStyle.outlineStyle,
        actionFocusOutlineWidth: Number.parseFloat(actionStyle.outlineWidth),
        actionTextRatio: ratio(actionStyle.color, inheritedBackground(action)),
        boundaryBorderRatio: ratio(boundaryStyle.borderTopColor, inheritedBackground(boundary)),
        boundaryBorderWidth: Number.parseFloat(boundaryStyle.borderTopWidth),
      };
    });
    expect(pathwayForcedColors.boundaryBorderWidth).toBeGreaterThanOrEqual(1);
    expect(pathwayForcedColors.boundaryBorderRatio).toBeGreaterThanOrEqual(3);
    expect(pathwayForcedColors.actionBorderWidth).toBeGreaterThanOrEqual(1);
    expect(pathwayForcedColors.actionBorderRatio).toBeGreaterThanOrEqual(3);
    expect(pathwayForcedColors.actionTextRatio).toBeGreaterThanOrEqual(4.5);
    expect(pathwayForcedColors.actionFocusOutlineStyle).not.toBe("none");
    expect(pathwayForcedColors.actionFocusOutlineWidth).toBeGreaterThanOrEqual(2);
    expect(pathwayForcedColors.actionFocusOutlineRatio).toBeGreaterThanOrEqual(3);
    await page.goto("/");
    const skip = page.locator(".forge-skip-link");
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    const forcedColors = await page.evaluate(() => {
      type Rgb = [number, number, number];

      const parseColor = (value: string): Rgb => {
        const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
        if (channels.length !== 3) throw new Error(`Unable to parse rendered color: ${value}`);
        return [channels[0], channels[1], channels[2]];
      };
      const luminance = ([red, green, blue]: Rgb) => {
        const channels = [red, green, blue].map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const ratio = (foreground: string, background: string) => {
        const [lighter, darker] = [luminance(parseColor(foreground)), luminance(parseColor(background))]
          .sort((left, right) => right - left);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const inheritedBackground = (element: HTMLElement) => {
        for (let current: HTMLElement | null = element; current; current = current.parentElement) {
          const background = getComputedStyle(current).backgroundColor;
          if (!background.endsWith(", 0)")) return background;
        }
        return "rgb(255, 255, 255)";
      };
      const skip = document.querySelector<HTMLElement>(".forge-skip-link");
      const action = document.querySelector<HTMLElement>(".forge-primary-action");
      const status = document.querySelector<HTMLElement>(".forge-world-row--ready .forge-status");
      const statusIcon = status?.querySelector<HTMLElement>("i");
      const card = status?.closest<HTMLElement>(".forge-world-row");
      if (!skip || !action || !status || !statusIcon || !card) throw new Error("Forced-colors representatives are missing");
      const skipStyle = getComputedStyle(skip);
      const actionStyle = getComputedStyle(action);
      const statusStyle = getComputedStyle(status);
      const statusIconStyle = getComputedStyle(statusIcon);
      const cardStyle = getComputedStyle(card);
      return {
        actionBorderRatio: ratio(actionStyle.borderTopColor, inheritedBackground(action)),
        actionTextRatio: ratio(actionStyle.color, inheritedBackground(action)),
        cardBorderRatio: ratio(cardStyle.borderTopColor, inheritedBackground(card)),
        cardBorderWidth: Number.parseFloat(cardStyle.borderTopWidth),
        focusOutlineRatio: ratio(skipStyle.outlineColor, inheritedBackground(skip)),
        focusOutlineStyle: skipStyle.outlineStyle,
        focusOutlineWidth: Number.parseFloat(skipStyle.outlineWidth),
        statusIconRatio: ratio(statusIconStyle.backgroundColor, inheritedBackground(status)),
        statusTextRatio: ratio(statusStyle.color, inheritedBackground(status)),
      };
    });
    expect(forcedColors.focusOutlineStyle).not.toBe("none");
    expect(forcedColors.focusOutlineWidth).toBeGreaterThanOrEqual(2);
    expect(forcedColors.focusOutlineRatio).toBeGreaterThanOrEqual(3);
    expect(forcedColors.actionTextRatio).toBeGreaterThanOrEqual(4.5);
    expect(forcedColors.actionBorderRatio).toBeGreaterThanOrEqual(3);
    expect(forcedColors.statusTextRatio).toBeGreaterThanOrEqual(4.5);
    expect(forcedColors.statusIconRatio).toBeGreaterThanOrEqual(3);
    expect(forcedColors.cardBorderWidth).toBeGreaterThanOrEqual(1);
    expect(forcedColors.cardBorderRatio).toBeGreaterThanOrEqual(3);

    await page.emulateMedia({ contrast: "more" });
    await page.reload();
    expect(await page.evaluate(() => matchMedia("(prefers-contrast: more)").matches)).toBe(true);
    await page.keyboard.press("Tab");
    await expect(page.locator(".forge-skip-link")).toBeFocused();
  });
});
