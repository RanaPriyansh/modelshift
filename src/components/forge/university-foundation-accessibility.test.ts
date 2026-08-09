import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function cssHexVariable(css: string, variable: string): string {
  const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing CSS variable: ${variable}`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => (
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  )).map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (
    0.2126 * channels[0]!
    + 0.7152 * channels[1]!
    + 0.0722 * channels[2]!
  );
}

function contrastRatio(first: string, second: string): number {
  const values = [relativeLuminance(first), relativeLuminance(second)]
    .sort((left, right) => right - left);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe("university foundation accessibility tokens", () => {
  it("uses an accent with sufficient contrast for small text", () => {
    const forgeCss = readSource("app/forge-system.css");
    const background = cssHexVariable(forgeCss, "--forge-bg");
    const accent = cssHexVariable(forgeCss, "--forge-cyan-deep");

    expect(contrastRatio(accent, background)).toBeGreaterThanOrEqual(4.5);

    for (const path of [
      "src/components/forge/university-command-center/UniversityCommandCenterWorkspace.module.css",
      "src/components/forge/university-degree-map/UniversityDegreeMapWorkspace.module.css",
      "src/components/forge/university-learning-map/UniversityLearningMapUnavailable.module.css",
      "src/components/forge/university-learning-map/UniversityLearningMapWorkspace.module.css",
    ]) {
      const css = readSource(path);
      expect(css).toContain("var(--forge-cyan-deep)");
    }
  });

  it("uses a Semester Desk commitment token with sufficient text contrast", () => {
    const css = readSource(
      "src/components/forge/semester-desk-v2/app/SemesterDeskV2App.module.css",
    );
    const commitment = cssHexVariable(css, "--orange");

    expect(css).toContain("color: #fffaf4");
    expect(contrastRatio(commitment, "#fffaf4")).toBeGreaterThanOrEqual(4.5);
  });
});
