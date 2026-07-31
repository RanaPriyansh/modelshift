import { execFileSync } from "node:child_process";

export const PRODUCTION_BUILD_ID_PREFIX = "forge-source-v1-" as const;
const SHA = /^[a-f0-9]{40}$/;

function normalizedSha(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return SHA.test(normalized) ? normalized : null;
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
    const indexExceptions = execFileSync(
      "git",
      ["ls-files", "-v"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).split("\n").filter(Boolean).some((entry) => entry[0] !== "H");
    const ignoredBuildInputs = execFileSync(
      "git",
      [
        "ls-files",
        "--others",
        "--ignored",
        "--exclude-standard",
        "--",
        ".env",
        ".env.local",
        ".env.production",
        ".env.production.local",
        "app",
        "src",
        "public",
        "next.config.ts",
      ],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (
      commit
      && status === ""
      && !indexExceptions
      && ignoredBuildInputs === ""
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
