import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  SEMESTER_DESK_RELEASE_BUDGETS,
  verifyRetiredPublicAssetBoundary,
  verifySemesterDeskV2ReleaseBudgets,
} from "./verify-semester-desk-v2-release-budgets";

const roots: string[] = [];
const releaseRoutes = ["/", "/app", "/how-forge-works", "/university", "/privacy", "/terms", "/support"];

async function fixtureRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "forge-release-assets-"));
  roots.push(root);
  await Promise.all([
    mkdir(resolve(root, "app"), { recursive: true }),
    mkdir(resolve(root, "docs/archive/retired-public-assets/forge"), { recursive: true }),
    mkdir(resolve(root, "docs/archive/retired-public-assets/worlds/primary-source-reasoning"), { recursive: true }),
    mkdir(resolve(root, "src/components/forge/semester-desk-v2"), { recursive: true }),
    mkdir(resolve(root, "public"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(resolve(root, "docs/archive/retired-public-assets/forge/through-the-door.png"), "retired"),
    writeFile(resolve(root, "docs/archive/retired-public-assets/worlds/primary-source-reasoning/provenance.json"), "{}"),
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

describe("Semester Desk retired public asset boundary", () => {
  it("accepts archived assets without a Vercel exclusion", async () => {
    const root = await fixtureRoot();

    expect(() => verifyRetiredPublicAssetBoundary(root)).not.toThrow();
  });

  it("rejects both retired paths under public", async () => {
    const root = await fixtureRoot();
    await mkdir(resolve(root, "public/forge"), { recursive: true });
    await writeFile(resolve(root, "public/forge/through-the-door.png"), "retired");

    expect(() => verifyRetiredPublicAssetBoundary(root)).toThrow(/must not remain under public/i);

    await rm(resolve(root, "public/forge"), { recursive: true });
    await mkdir(resolve(root, "public/worlds/primary-source-reasoning"), { recursive: true });

    expect(() => verifyRetiredPublicAssetBoundary(root)).toThrow(/must not remain under public/i);
  });

  it("rejects a release source reference to an archived asset", async () => {
    const root = await fixtureRoot();
    await writeFile(resolve(root, "app/page.release.tsx"), "const retired = \"/forge/through-the-door.png\";");

    expect(() => verifyRetiredPublicAssetBoundary(root)).toThrow(/referenced by release source/i);
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

  it("counts every public image against the release budget", async () => {
    const root = await fixtureRoot();
    await writeBuildFixture(root);
    await writeFile(
      resolve(root, "public/current-release.png"),
      Buffer.alloc(SEMESTER_DESK_RELEASE_BUDGETS.maximumDeployablePublicImageBytes + 1),
    );

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/public image budget exceeded/i);
  });

  it("counts an absent public asset directory as zero deployable images", async () => {
    const root = await fixtureRoot();
    await writeBuildFixture(root);
    await rm(resolve(root, "public"), { recursive: true });

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).not.toThrow();
  });

  it("rejects unsafe public asset paths", async () => {
    const root = await fixtureRoot();
    await writeBuildFixture(root);
    await rm(resolve(root, "public"), { recursive: true });
    await writeFile(resolve(root, "public"), "not a directory");

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/unsafe public asset directory/i);

    await rm(resolve(root, "public"));
    await mkdir(resolve(root, "outside-public"));
    await symlink(resolve(root, "outside-public"), resolve(root, "public"));

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/unsafe public asset directory/i);

    await rm(resolve(root, "public"));
    await mkdir(resolve(root, "public"));
    await writeFile(resolve(root, "outside.png"), "outside");
    await symlink(resolve(root, "outside.png"), resolve(root, "public/linked.png"));

    expect(() => verifySemesterDeskV2ReleaseBudgets(root)).toThrow(/symbolic link under the public asset directory/i);
  });
});
