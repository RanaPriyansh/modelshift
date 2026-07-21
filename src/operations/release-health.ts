const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/i;

type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

export type ReleaseHealth = {
  schema_version: "1.0";
  status: "ok";
  service: "forge-learning-os";
  release_sha: string | "unknown";
};

export function resolveReleaseSha(environment: ReleaseEnvironment = process.env): string | "unknown" {
  const candidate = environment.FORGE_RELEASE_SHA ?? environment.VERCEL_GIT_COMMIT_SHA ?? "";
  return RELEASE_SHA_PATTERN.test(candidate) ? candidate.toLowerCase() : "unknown";
}

/** Minimal liveness metadata: no learner state, configuration dump, or dependency detail. */
export function buildReleaseHealth(environment: ReleaseEnvironment = process.env): ReleaseHealth {
  return {
    schema_version: "1.0",
    status: "ok",
    service: "forge-learning-os",
    release_sha: resolveReleaseSha(environment),
  };
}
