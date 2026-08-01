import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const baseURL =
  process.env.FORGE_DESIGN_ATLAS_URL
  ?? "http://localhost:3035/internal/design-lab";
const outputDirectory = path.resolve(
  process.env.FORGE_DESIGN_ATLAS_CAPTURE_DIR
  ?? "docs/design/evidence/forge-terrain",
);

const sections = [
  {
    id: "public-site-atlas",
    desktop: "forge-public-complete-atlas.png",
    narrow: "forge-public-complete-atlas-320.png",
  },
  {
    id: "web-app-atlas",
    desktop: "forge-web-complete-atlas.png",
    narrow: "forge-web-complete-atlas-320.png",
  },
  {
    id: "focus-mode-atlas",
    desktop: "forge-focus-mode-atlas.png",
    narrow: "forge-focus-mode-atlas-320.png",
  },
  {
    id: "ios-app-atlas",
    desktop: "forge-ios-complete-atlas.png",
    narrow: [
      "forge-ios-complete-atlas-320-a.png",
      "forge-ios-complete-atlas-320-b.png",
    ],
  },
];

const viewports = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 320, height: 800 },
};

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const captures = [];

async function recordCapture(filename) {
  const filePath = path.join(outputDirectory, filename);
  const buffer = await readFile(filePath);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  captures.push({
    filename,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}

async function preparePage(viewport) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200);
  await page.locator("#forge-terrain-foundations").waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(window.innerHeight, 800);
    for (let position = 0; position < document.documentElement.scrollHeight; position += step) {
      window.scrollTo(0, position);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      [...document.images].map((image) => new Promise((resolve) => {
        if (image.complete) {
          resolve();
          return;
        }
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 5_000);
      })),
    );
  });
  return { context, errors, page };
}

try {
  for (const [viewportName, viewport] of Object.entries(viewports)) {
    const { context, errors, page } = await preparePage(viewport);
    try {
      for (const section of sections) {
        const locator = page.locator(`#${section.id}`);
        await locator.waitFor();

        if (viewportName === "narrow" && Array.isArray(section.narrow)) {
          await locator.evaluate((element) => {
            document.body.replaceChildren(element.cloneNode(true));
            document.body.style.margin = "0";
            window.scrollTo(0, 0);
          });
          await page.evaluate(() => window.scrollTo(0, 0));
          const isolatedLocator = page.locator(`#${section.id}`);
          const bounds = await isolatedLocator.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            };
          });
          const documentHeight = await page.evaluate(
            () => document.documentElement.scrollHeight,
          );
          assert(
            bounds.height > 0 && documentHeight >= Math.floor(bounds.height),
            `Invalid isolated iOS bounds: ${JSON.stringify({ bounds, documentHeight })}`,
          );
          const totalHeight = Math.min(
            Math.floor(bounds.height),
            documentHeight - 1,
          );
          const firstHeight = await isolatedLocator.evaluate((sectionElement) => {
            const marker = [...sectionElement.querySelectorAll("span")].find(
              (element) => element.textContent?.trim() === "IOS-10",
            );
            const screen = marker?.closest("article");
            if (!screen) throw new Error("The IOS-10 screen boundary is missing.");
            return Math.floor(
              screen.getBoundingClientRect().top
              - sectionElement.getBoundingClientRect().top,
            );
          });
          assert(
            firstHeight > 0 && firstHeight < totalHeight,
            `Invalid IOS-10 split boundary: ${firstHeight}.`,
          );
          const segments = [
            { height: firstHeight, offset: 0 },
            {
              height: totalHeight - firstHeight,
              offset: firstHeight,
            },
          ];

          for (const [index, filename] of section.narrow.entries()) {
            await page.evaluate(
              ({ height, offset, sectionID, width }) => {
                const sectionElement = document.getElementById(sectionID);
                if (!sectionElement) throw new Error(`Missing section: ${sectionID}`);
                let wrapper = document.getElementById("forge-atlas-capture-segment");
                if (!wrapper) {
                  wrapper = document.createElement("div");
                  wrapper.id = "forge-atlas-capture-segment";
                  document.body.replaceChildren(wrapper);
                  wrapper.append(sectionElement);
                }
                Object.assign(wrapper.style, {
                  height: `${height}px`,
                  overflow: "hidden",
                  position: "relative",
                  width: `${width}px`,
                });
                Object.assign(sectionElement.style, {
                  left: "0",
                  position: "absolute",
                  top: `${-offset}px`,
                  width: `${width}px`,
                });
              },
              {
                ...segments[index],
                sectionID: section.id,
                width: Math.floor(bounds.width),
              },
            );
            await page.locator("#forge-atlas-capture-segment").screenshot({
              path: path.join(outputDirectory, filename),
              animations: "disabled",
            });
            await recordCapture(filename);
          }
          continue;
        }

        const filename = section[viewportName];
        assert.equal(typeof filename, "string");
        await locator.screenshot({
          path: path.join(outputDirectory, filename),
          animations: "disabled",
        });
        await recordCapture(filename);
      }
      assert.deepEqual(errors, [], `${viewportName}: browser errors occurred.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(outputDirectory, "forge-design-atlas-capture-manifest.json"),
  `${JSON.stringify({
    status: "captured",
    source: baseURL,
    capturedAt: new Date().toISOString(),
    viewports,
    captures,
  }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  status: "pass",
  source: baseURL,
  outputDirectory,
  captureCount: captures.length,
  captures,
}, null, 2));
