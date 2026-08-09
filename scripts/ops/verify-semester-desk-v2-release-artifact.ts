import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const RELEASE_APP_PATHS = [
  "/page",
  "/app/page",
  "/how-forge-works/page",
  "/university/page",
  "/privacy/page",
  "/terms/page",
  "/support/page",
  "/api/health/route",
  "/robots.txt/route",
  "/sitemap.xml/route",
  "/manifest.webmanifest/route",
  "/opengraph-image/route",
  "/twitter-image/route",
  "/icon.svg/route",
] as const;

const NEXT_FRAMEWORK_APP_PATHS = [
  "/_global-error/page",
  "/_not-found/page",
] as const;

type AppPathsManifest = Record<string, string>;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function relativePath(directory: string, path: string): string {
  return relative(directory, path).split(sep).join("/");
}

function readAppPathsManifest(path: string): AppPathsManifest {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected an object in ${path}.`);
  }

  const manifest: AppPathsManifest = {};
  for (const [route, output] of Object.entries(parsed)) {
    if (typeof output !== "string") {
      throw new Error(`Expected a string output path for ${route} in ${path}.`);
    }
    manifest[route] = output;
  }
  return manifest;
}

function assertExactSet(
  description: string,
  actualValues: readonly string[],
  expectedValues: readonly string[],
): void {
  const actual = [...new Set(actualValues)].sort();
  const expected = [...new Set(expectedValues)].sort();
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((value) => !actualSet.has(value));
  const unexpected = actual.filter((value) => !expectedSet.has(value));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `${description} mismatch. Missing: ${missing.join(", ") || "none"}. Unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}

function retiredRouteModuleNames(root: string): string[] {
  const appDirectory = resolve(root, "app");
  return filesUnder(appDirectory)
    .map((path) => relativePath(root, path))
    .filter((path) => /(?:^|\/)(?:page|route)\.(?:[cm]?[jt]sx?)$/.test(path))
    .map((path) => path.replace(/\.(?:[cm]?[jt]sx?)$/, ""));
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoRetiredRouteArtifacts(root: string, retiredModules: readonly string[]): void {
  const outputDirectories = [
    resolve(root, ".next/server"),
    resolve(root, ".next/static"),
  ];
  const leaks: string[] = [];

  for (const outputDirectory of outputDirectories) {
    if (!existsSync(outputDirectory)) {
      throw new Error(`Missing Next production output directory: ${outputDirectory}.`);
    }

    for (const path of filesUnder(outputDirectory)) {
      const outputPath = relativePath(root, path);
      for (const retiredModule of retiredModules) {
        const marker = new RegExp(`(?:^|/)${escapeForRegex(retiredModule)}(?:[./-]|$)`);
        if (marker.test(outputPath)) leaks.push(outputPath);
      }
    }
  }

  if (leaks.length > 0) {
    throw new Error(
      `Retired route modules reached Next production output:\n${[...new Set(leaks)].sort().join("\n")}`,
    );
  }
}

export function verifySemesterDeskV2ReleaseArtifact(root = process.cwd()): void {
  const serverDirectory = resolve(root, ".next/server");
  const serverAppDirectory = resolve(serverDirectory, "app");
  const manifestPath = resolve(serverDirectory, "app-paths-manifest.json");
  const expectedAppPaths = [...RELEASE_APP_PATHS, ...NEXT_FRAMEWORK_APP_PATHS];

  if (!existsSync(manifestPath) || !existsSync(serverAppDirectory)) {
    throw new Error("Build the production application before verifying the release artifact.");
  }

  const manifest = readAppPathsManifest(manifestPath);
  assertExactSet("Next app-paths manifest", Object.keys(manifest), expectedAppPaths);

  for (const appPath of expectedAppPaths) {
    const expectedOutput = `app${appPath}.js`;
    if (manifest[appPath] !== expectedOutput) {
      throw new Error(
        `Unexpected output for ${appPath}: expected ${expectedOutput}, received ${manifest[appPath] ?? "none"}.`,
      );
    }
    if (!existsSync(resolve(serverDirectory, expectedOutput))) {
      throw new Error(`Missing compiled server route module: ${expectedOutput}.`);
    }
  }

  const compiledServerRoutes = filesUnder(serverAppDirectory)
    .map((path) => relativePath(serverAppDirectory, path))
    .filter((path) => /(?:^|\/)(?:page|route)\.js$/.test(path))
    .map((path) => `/${path.slice(0, -3)}`);
  assertExactSet("Compiled Next server route modules", compiledServerRoutes, expectedAppPaths);

  const retiredModules = retiredRouteModuleNames(root);
  assertNoRetiredRouteArtifacts(root, retiredModules);

  process.stdout.write(
    `Semester Desk v2 release artifact verified: ${RELEASE_APP_PATHS.length} release routes, ${NEXT_FRAMEWORK_APP_PATHS.length} framework routes, and ${retiredModules.length} retired route modules excluded.\n`,
  );
}

verifySemesterDeskV2ReleaseArtifact();
