import { existsSync, readFileSync, readdirSync } from "node:fs";
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

describe("university internal navigation boundary", () => {
  it("disables shell prefetch on every internal university ForgeShell route", () => {
    const internalRoot = resolve(process.cwd(), "app/internal");
    const pagePaths = readdirSync(internalRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("university-"))
      .map((entry) => `app/internal/${entry.name}/page.tsx`)
      .filter((path) => existsSync(resolve(process.cwd(), path)));

    const shellPages = pagePaths.filter((path) => (
      readSource(path).includes("<ForgeShell")
    ));
    expect(shellPages.length).toBeGreaterThan(0);

    for (const path of shellPages) {
      const shellTags = openingTags(readSource(path), "ForgeShell");
      expect(shellTags.length, path).toBeGreaterThan(0);
      expect(
        shellTags.every((tag) => tag.includes("navigationPrefetch={false}")),
        path,
      ).toBe(true);
    }
  });

  it("disables prefetch on every university Next Link", () => {
    const componentRoot = resolve(
      process.cwd(),
      "src/components/forge/university",
    );
    const linkComponentPaths = readdirSync(componentRoot, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
      .map((entry) => `src/components/forge/university/${entry.name}`)
      .filter((path) => readSource(path).includes('from "next/link"'));

    expect(linkComponentPaths.length).toBeGreaterThan(0);
    for (const path of linkComponentPaths) {
      const linkTags = openingTags(readSource(path), "Link");
      expect(linkTags.length, path).toBeGreaterThan(0);
      expect(
        linkTags.every((tag) => tag.includes("prefetch={false}")),
        path,
      ).toBe(true);
    }
  });

  it("does not deny explicit navigation with an over-broad network claim", () => {
    const componentRoot = resolve(
      process.cwd(),
      "src/components/forge/university",
    );
    const componentPaths = readdirSync(componentRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".tsx"))
      .map((entry) => `src/components/forge/university/${entry.name}`);

    for (const path of componentPaths) {
      const source = readSource(path);
      expect(source, path).not.toContain("<span>No network</span>");
      expect(source, path).not.toContain("<span>No network request</span>");
    }
  });
});
