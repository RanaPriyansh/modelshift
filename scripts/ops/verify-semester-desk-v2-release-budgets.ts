import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE_PAGE_ROUTES = [
  "/",
  "/app",
  "/how-forge-works",
  "/university",
  "/privacy",
  "/terms",
  "/support",
] as const;

const REQUIRED_VERCEL_IGNORE_LINES = [
  "public/forge/through-the-door.png",
  "public/worlds/primary-source-reasoning",
] as const;

const RETIRED_PUBLIC_ASSET_PATHS = [
  "public/forge/through-the-door.png",
  "public/worlds/primary-source-reasoning",
] as const;

const RETIRED_PUBLIC_ASSET_MARKERS = [
  "/forge/through-the-door.png",
  "/worlds/primary-source-reasoning/",
] as const;

const PUBLIC_IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

/**
 * These limits come from the clean 16972d68 release artifact. They keep room
 * for small product repairs without allowing an unnoticed release-size jump.
 */
export const SEMESTER_DESK_RELEASE_BUDGETS = {
  maximumInitialJavaScriptBytes: 1_000_000,
  maximumInitialCssBytes: 36_000,
  maximumDeployablePublicImageBytes: 500_000,
} as const;

type RouteBundleStatistic = {
  readonly route: string;
  readonly firstLoadUncompressedJsBytes: number;
};

type SizedPath = {
  readonly path: string;
  readonly bytes: number;
};

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function relativePath(directory: string, path: string): string {
  return relative(directory, path).split(sep).join("/");
}

function requireDirectory(directory: string, description: string): void {
  if (!existsSync(directory)) {
    throw new Error(`Missing ${description}: ${directory}. Build the production application first.`);
  }
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(`Could not read JSON at ${path}.${detail}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function largestLines(items: readonly SizedPath[], limit = 5): string {
  return [...items]
    .sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path))
    .slice(0, limit)
    .map((item) => `${item.path} (${item.bytes} bytes)`)
    .join("\n");
}

function routeBundleStatistics(root: string): RouteBundleStatistic[] {
  const path = resolve(root, ".next/diagnostics/route-bundle-stats.json");
  const parsed = readJson(path);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a route bundle list in ${path}.`);
  }

  const statistics: RouteBundleStatistic[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) {
      throw new Error(`Expected a bounded route bundle entry in ${path}.`);
    }
    const route = entry.route;
    const firstLoadUncompressedJsBytes = entry.firstLoadUncompressedJsBytes;
    if (
      typeof route !== "string"
      || typeof firstLoadUncompressedJsBytes !== "number"
      || !Number.isSafeInteger(firstLoadUncompressedJsBytes)
      || firstLoadUncompressedJsBytes < 0
    ) throw new Error(`Expected a bounded route bundle entry in ${path}.`);
    statistics.push({
      route,
      firstLoadUncompressedJsBytes,
    });
  }
  return statistics;
}

function cssChunkPathsForRoute(root: string, route: string): string[] {
  const routeSegments = route === "/" ? [] : route.slice(1).split("/");
  const manifestPath = resolve(
    root,
    ".next/server/app",
    ...routeSegments,
    "page_client-reference-manifest.js",
  );
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing client reference manifest for ${route}: ${manifestPath}.`);
  }

  const source = readFileSync(manifestPath, "utf8").trim();
  const assignment = source.lastIndexOf("= ");
  if (assignment < 0 || !source.endsWith(";")) {
    throw new Error(`Could not read the client reference manifest for ${route}.`);
  }
  const parsed = readJsonText(source.slice(assignment + 2, -1), manifestPath);
  if (!isRecord(parsed) || !isRecord(parsed.entryCSSFiles)) {
    throw new Error(`Expected entry CSS files for ${route} in ${manifestPath}.`);
  }

  const paths = new Set<string>();
  for (const value of Object.values(parsed.entryCSSFiles)) {
    if (!Array.isArray(value)) {
      throw new Error(`Expected an entry CSS list for ${route} in ${manifestPath}.`);
    }
    for (const entry of value) {
      if (!isRecord(entry) || typeof entry.path !== "string") {
        throw new Error(`Expected a CSS path for ${route} in ${manifestPath}.`);
      }
      if (!entry.path.startsWith("static/") || !entry.path.endsWith(".css")) {
        throw new Error(`Rejected an unsafe CSS path for ${route}: ${entry.path}.`);
      }
      paths.add(entry.path);
    }
  }
  return [...paths].sort();
}

function readJsonText(source: string, path: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(`Could not read JSON at ${path}.${detail}`);
  }
}

function sizedCssForRoute(root: string, route: string): SizedPath[] {
  const nextDirectory = resolve(root, ".next");
  return cssChunkPathsForRoute(root, route).map((chunkPath) => {
    const path = resolve(nextDirectory, chunkPath);
    const outputPath = relativePath(nextDirectory, path);
    if (outputPath.startsWith("../") || outputPath === "..") {
      throw new Error(`Rejected a CSS path outside the build output for ${route}.`);
    }
    if (!existsSync(path)) {
      throw new Error(`Missing CSS chunk for ${route}: ${chunkPath}.`);
    }
    return { path: `.next/${outputPath}`, bytes: statSync(path).size };
  });
}

function hasRetiredPublicAssetPath(path: string): boolean {
  return path === "forge/through-the-door.png"
    || path === "worlds/primary-source-reasoning"
    || path.startsWith("worlds/primary-source-reasoning/");
}

function deployablePublicImages(root: string): SizedPath[] {
  const publicDirectory = resolve(root, "public");
  requireDirectory(publicDirectory, "public asset directory");
  return filesUnder(publicDirectory)
    .map((path) => ({ path: relativePath(publicDirectory, path), bytes: statSync(path).size }))
    .filter((entry) => PUBLIC_IMAGE_EXTENSION.test(entry.path))
    .filter((entry) => !hasRetiredPublicAssetPath(entry.path));
}

function releaseSourceFiles(root: string): string[] {
  const appDirectory = resolve(root, "app");
  const componentDirectory = resolve(root, "src/components/forge/semester-desk-v2");
  requireDirectory(appDirectory, "release application source directory");
  requireDirectory(componentDirectory, "Semester Desk source directory");

  const releaseRouteFiles = filesUnder(appDirectory)
    .filter((path) => /\.release\.(?:ts|tsx)$/.test(path));
  const releaseSupportFiles = [
    resolve(appDirectory, "opengraph-image.tsx"),
    resolve(appDirectory, "manifest.ts"),
    resolve(appDirectory, "robots.ts"),
    resolve(appDirectory, "sitemap.ts"),
  ].filter((path) => existsSync(path));
  const semesterDeskFiles = filesUnder(componentDirectory)
    .filter((path) => /\.(?:ts|tsx|css)$/.test(path));
  return [...new Set([...releaseRouteFiles, ...releaseSupportFiles, ...semesterDeskFiles])].sort();
}

function assertNoRetiredReleaseSourceReferences(root: string): void {
  const hits: string[] = [];
  for (const path of releaseSourceFiles(root)) {
    const source = readFileSync(path, "utf8");
    for (const marker of RETIRED_PUBLIC_ASSET_MARKERS) {
      if (source.includes(marker)) hits.push(`${relativePath(root, path)}: ${marker}`);
    }
  }
  if (hits.length > 0) {
    throw new Error(
      `Retired public assets are referenced by release source:\n${hits.slice(0, 10).join("\n")}`,
    );
  }
}

function assertNoRetiredReleaseArtifactReferences(root: string): void {
  const staticDirectory = resolve(root, ".next/static");
  requireDirectory(staticDirectory, "Next static output directory");
  const hits: string[] = [];
  for (const path of filesUnder(staticDirectory)) {
    const bytes = readFileSync(path);
    for (const marker of RETIRED_PUBLIC_ASSET_MARKERS) {
      if (bytes.includes(Buffer.from(marker))) {
        hits.push(`${relativePath(root, path)}: ${marker}`);
      }
    }
  }
  if (hits.length > 0) {
    throw new Error(
      `Retired public assets reached the release artifact:\n${hits.slice(0, 10).join("\n")}`,
    );
  }
}

export function verifyVercelReleaseAssetExclusions(root = process.cwd()): void {
  const ignorePath = resolve(root, ".vercelignore");
  if (!existsSync(ignorePath)) {
    throw new Error("Missing .vercelignore for retired public release assets.");
  }
  const actualLines = readFileSync(ignorePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  if (
    actualLines.length !== REQUIRED_VERCEL_IGNORE_LINES.length
    || actualLines.some((line, index) => line !== REQUIRED_VERCEL_IGNORE_LINES[index])
  ) {
    throw new Error(
      `The Vercel exclusion must contain only:\n${REQUIRED_VERCEL_IGNORE_LINES.join("\n")}`,
    );
  }

  for (const assetPath of RETIRED_PUBLIC_ASSET_PATHS) {
    if (!existsSync(resolve(root, assetPath))) {
      throw new Error(`Missing retired authored asset that the Vercel exclusion protects: ${assetPath}.`);
    }
  }
  assertNoRetiredReleaseSourceReferences(root);
}

export function verifySemesterDeskV2ReleaseBudgets(root = process.cwd()): void {
  const nextDirectory = resolve(root, ".next");
  requireDirectory(nextDirectory, "Next production output directory");
  verifyVercelReleaseAssetExclusions(root);

  const routeStatistics = routeBundleStatistics(root)
    .filter((entry) => RELEASE_PAGE_ROUTES.includes(entry.route as (typeof RELEASE_PAGE_ROUTES)[number]));
  const routesWithStatistics = new Set(routeStatistics.map((entry) => entry.route));
  const missingRoutes = RELEASE_PAGE_ROUTES.filter((route) => !routesWithStatistics.has(route));
  if (missingRoutes.length > 0) {
    throw new Error(`Missing route bundle statistics for: ${missingRoutes.join(", ")}.`);
  }
  const largestJavaScriptRoute = routeStatistics.reduce((largest, entry) => (
    entry.firstLoadUncompressedJsBytes > largest.firstLoadUncompressedJsBytes ? entry : largest
  ));
  if (largestJavaScriptRoute.firstLoadUncompressedJsBytes > SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialJavaScriptBytes) {
    throw new Error(
      `Initial JavaScript budget exceeded by ${largestJavaScriptRoute.route}: ${largestJavaScriptRoute.firstLoadUncompressedJsBytes} bytes exceeds ${SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialJavaScriptBytes} bytes.`,
    );
  }

  const cssRoutes = RELEASE_PAGE_ROUTES.map((route) => {
    const chunks = sizedCssForRoute(root, route);
    return {
      route,
      chunks,
      bytes: chunks.reduce((total, chunk) => total + chunk.bytes, 0),
    };
  });
  const largestCssRoute = cssRoutes.reduce((largest, entry) => (
    entry.bytes > largest.bytes ? entry : largest
  ));
  if (largestCssRoute.bytes > SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialCssBytes) {
    throw new Error(
      `Initial CSS budget exceeded by ${largestCssRoute.route}: ${largestCssRoute.bytes} bytes exceeds ${SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialCssBytes} bytes. Largest CSS files:\n${largestLines(largestCssRoute.chunks)}`,
    );
  }

  const publicImages = deployablePublicImages(root);
  const publicImageBytes = publicImages.reduce((total, image) => total + image.bytes, 0);
  if (publicImageBytes > SEMESTER_DESK_RELEASE_BUDGETS.maximumDeployablePublicImageBytes) {
    throw new Error(
      `Deployable public image budget exceeded: ${publicImageBytes} bytes exceeds ${SEMESTER_DESK_RELEASE_BUDGETS.maximumDeployablePublicImageBytes} bytes. Largest images:\n${largestLines(publicImages)}`,
    );
  }
  assertNoRetiredReleaseArtifactReferences(root);

  process.stdout.write(
    `Semester Desk release budgets verified: ${largestJavaScriptRoute.route} initial JavaScript ${largestJavaScriptRoute.firstLoadUncompressedJsBytes}/${SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialJavaScriptBytes} bytes; ${largestCssRoute.route} initial CSS ${largestCssRoute.bytes}/${SEMESTER_DESK_RELEASE_BUDGETS.maximumInitialCssBytes} bytes; deployable public images ${publicImageBytes}/${SEMESTER_DESK_RELEASE_BUDGETS.maximumDeployablePublicImageBytes} bytes.\n`,
  );
}

const entrypoint = process.argv[1];
if (entrypoint && resolve(entrypoint) === fileURLToPath(import.meta.url)) {
  verifySemesterDeskV2ReleaseBudgets();
}
