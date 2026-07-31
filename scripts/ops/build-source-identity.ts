import { execFileSync } from "node:child_process";

export const PRODUCTION_BUILD_ID_PREFIX = "forge-source-v1-" as const;
const SHA = /^[a-f0-9]{40}$/;
const ALLOWED_IGNORED_DIRECTORIES = Object.freeze([
  ".next",
  ".playwright-cli",
  "coverage",
  "node_modules",
  "out",
  "playwright-report",
  "test-results",
]);

function normalizedSha(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SHA.test(normalized) ? normalized : null;
}

function allowedIgnoredBuildOutput(path: string): boolean {
  const normalized = path.replaceAll("\\", "/").replace(/\/$/, "");
  if (
    normalized.length === 0
    || normalized.startsWith("/")
    || normalized.split("/").some((part) => part === "..")
  ) return false;
  if (
    ALLOWED_IGNORED_DIRECTORIES.some((directory) =>
      normalized === directory || normalized.startsWith(`${directory}/`)
    )
  ) return true;
  const basename = normalized.split("/").at(-1) ?? "";
  return (
    basename === ".DS_Store"
    || basename.endsWith(".swp")
    || basename.endsWith(".tsbuildinfo")
  );
}

export function hiddenBuildInputExceptions(
  root: string = process.cwd(),
): readonly string[] {
  const indexExceptions = execFileSync(
    "git",
    ["ls-files", "-v"],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  ).split("\n").filter(Boolean).filter((entry) => entry[0] !== "H");
  const ignoredEntries = execFileSync(
    "git",
    [
      "ls-files",
      "--others",
      "--ignored",
      "--exclude-standard",
      "--directory",
    ],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  ).split("\n").filter(Boolean);
  return Object.freeze([
    ...indexExceptions.map((entry) => `index:${entry}`),
    ...ignoredEntries
      .filter((entry) => !allowedIgnoredBuildOutput(entry))
      .map((entry) => `ignored:${entry}`),
  ]);
}

/**
 * Resolve the source marker while Next is loading its build configuration.
 * Git is authoritative for local builds. A provider SHA is only a fallback
 * when the checkout metadata is unavailable inside a declared Vercel build.
 */
export function readBuildSourceCommit(
  root: string = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
): string | "unverified" {
  try {
    const commit = normalizedSha(execFileSync(
      "git",
      ["rev-parse", "HEAD"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ));
    if (
      environment.VERCEL === "1"
      && normalizedSha(environment.VERCEL_GIT_COMMIT_SHA) !== commit
    ) {
      return "unverified";
    }
    const status = execFileSync(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    const inputExceptions = hiddenBuildInputExceptions(root);
    if (
      commit
      && status === ""
      && inputExceptions.length === 0
    ) {
      return commit;
    }
    return "unverified";
  } catch {
    // A provider-owned fallback remains explicitly bounded below.
  }
  if (environment.VERCEL === "1") {
    return normalizedSha(environment.VERCEL_GIT_COMMIT_SHA) ?? "unverified";
  }
  return "unverified";
}

export function productionBuildId(
  sourceCommit: string | "unverified",
): string {
  return `${PRODUCTION_BUILD_ID_PREFIX}${sourceCommit}`;
}

export function sourceCommitFromProductionBuildId(
  buildId: string,
): string | null {
  if (!buildId.startsWith(PRODUCTION_BUILD_ID_PREFIX)) return null;
  return normalizedSha(buildId.slice(PRODUCTION_BUILD_ID_PREFIX.length));
}
