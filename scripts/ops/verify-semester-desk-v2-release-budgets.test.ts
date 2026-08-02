import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  SEMESTER_DESK_RELEASE_BUDGETS,
  verifySemesterDeskV2ReleaseBudgets,
  verifyVercelReleaseAssetExclusions,
} from "./verify-semester-desk-v2-release-budgets";

const roots: string[] = [];
const releaseRoutes = ["/", "/app", "/how-forge-works", "/university", "/privacy", "/terms", "/support"];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "forge-release-assets-"));
  roots.push(root);
  await Promise.all([
    mkdir(resolve(root, "app"), { recursive: true }),
    mkdir(resolve(root, "src/components/forge/semester-desk-v2"), { recursive: true }),
    mkdir(resolve(root, "public/forge"), { recursive: true }),
    mkdir(resolve(root, "public/worlds/primary-source-reasoning"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(resolve(root, ".vercelignore"), "public/forge/through-the-door.png\npublic/worlds/primary-source-reasoning\n"),
    writeFile(resolve(root, "public/forge/through-the-door.png"), "retired"),
    writeFile(resolve(root, "public/worlds/primary-source-reasoning/provenance.json"), "{}"),
    writeFile(resolve(root, "app/page.release.tsx"), "export default function Page() { return null; }"),
  ]);
  return root;
}

function clientReferenceManifest(): string {
  return "globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {}; globalThis.__RSC_MANIFEST[\"/page\"] = {\"entryCSSFiles\":{\"[project]/app/layout.release\":[{\"path\":\"static/chunks/layout.css\",\"inlined\":false}]}};";
}

async function writeBuildFixture(root: string, firstLoadBytes = 1): Promise<void> {
  await Promise.all([
    mkdir(resolve(root, ".next/diagnostics"), { recursive: true }),
    mkdir(resolve(root, ".next/static/chunks"), { recursive: true }),
    ...releaseRoutes.map((route) => mkdir(resolve(
      root,
      ".next/server/app",
      ...(route === "/" ? [] : route.slice(1).split("/")),
    ), { recursive: true })),
  ]);
  await Promise.all([
    writeFile(
      resolve(root, ".next/diagnostics/route-bundle-stats.json"),
      JSON.stringify(releaseRoutes.map((route) => ({
        route,
        firstLoadUncompressedJsBytes: firstLoadBytes,
      }))),
    ),
    writeFile(resolve(root, ".next/static/chunks/layout.css"), "x"),
    ...releaseRoutes.map((route) => writeFile(resolve(
      root,
      ".next/server/app",
      ...(route === "/" ? [] : route.slice(1).split("/")),
      "page_client-reference-manifest.js",
    ), clientReferenceManifest())),
  ]);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Semester Desk Vercel public asset exclusions", () => {
  it("allows only the two retired public asset exclusions", async () => {
    const root = await fixtureRoot();

    expect(() => verifyVercelReleaseAssetExclusions(root)).not.toThrow();
  });

  it("rejects a broad Vercel exclusion or a release source reference", async () => {
    const root = await fixtureRoot();
    await writeFile(resolve(root, ".vercelignore"), "public/**\n");

    expect(() => verifyVercelReleaseAssetExclusions(root)).toThrow(/must contain only/i);

    await writeFile(resolve(root, ".vercelignore"), "public/forge/through-the-door.png\npublic/worlds/primary-source-reasoning\n");
    await writeFile(resolve(root, "app/page.release.tsx"), "const retired = \"/forge/through-the-door.png\";");

    expect(() => verifyVercelReleaseAssetExclusions(root)).toThrow(/referenced by release source/i);
  });

  it("runs after a Next build and fails closed for a budget excess", async () => {
    const root = await fixtureRoot();
    const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8")) as {
      readonly scripts?: { readonly build?: string };
    };
    const buildCommand = packageJson.scripts?.build ?? "";
    expect(buildCommand.indexOf("next build")).toBeGreaterThanOrEqual(0);
    expect(buildCommand.indexOf("next build")).toBeLessThan(
      buildCommand.indexOf("verify-semester-desk-v2-release-budgets.ts"),
    );

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/Missing Next production output/i);

    await writeBuildFixture(root);
    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).not.toThrow();

    await writeBuildFixture(root, SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialJavaScriptBytes + 1);
    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/Initial JavaScript budget exceeded/i);
  });
});
