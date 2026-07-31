import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function openingTags(source: string, component: string): readonly string[] {
  return Array.from(
    source.matchAll(new RegExp(`<${component}\\b[\\s\\S]*?>`, "g")),
    (match) => match[0],
  );
}

describe("university source-to-study route boundary", () => {
  it("keeps development fixtures behind production-erased imports", () => {
    for (const path of [
      "app/internal/university-source-review/page.tsx",
      "app/internal/university-today/page.tsx",
      "app/internal/university-protected-study/page.tsx",
    ]) {
      const source = readSource(path);
      expect(source).toContain(
        'await import("./development-surface.server")',
      );
      expect(source).not.toMatch(
        /fixture-gate\.server|review-fixture\.server|today-fixture\.server|protected-study-fixture\.server/,
      );
      const shellTags = openingTags(source, "ForgeShell");
      expect(shellTags).toHaveLength(1);
      expect(shellTags[0]).toContain("navigationPrefetch={false}");
    }
  });

  it("disables automatic prefetch on every enabled-surface route link", () => {
    for (const path of [
      "src/components/forge/university/UniversityTodayWorkspace.tsx",
      "src/components/forge/university/UniversityProtectedStudyWorkspace.tsx",
    ]) {
      const tags = openingTags(readSource(path), "Link");
      expect(tags.length).toBeGreaterThan(0);
      expect(
        tags.every((tag) => tag.includes("prefetch={false}")),
      ).toBe(true);
    }
  });

  it("states the automatic-network boundary without denying explicit navigation", () => {
    const today = readSource(
      "src/components/forge/university/UniversityTodayWorkspace.tsx",
    );
    const sourceReview = readSource(
      "src/components/forge/university/UniversitySourceReview.tsx",
    );

    expect(today).toContain("No automatic fetch");
    expect(today).not.toContain("<span>No network</span>");
    expect(sourceReview).toContain("No automatic network request");
    expect(sourceReview).not.toContain("<span>No network request</span>");
  });
});
