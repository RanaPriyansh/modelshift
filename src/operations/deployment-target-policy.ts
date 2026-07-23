/**
 * Checked-in, principal-reviewable deployment authority. Dispatch callers
 * select an ID, never an origin, project, or immutable-host pattern. The
 * immutable-host rule is a naming-authority check only; it does not claim
 * Vercel exposes a cryptographic deployment-ID-to-host relation.
 */
export const DEPLOYMENT_TARGETS = {
  forge_learning_os_project: {
    origin: "https://modelshift.vercel.app",
    hostname: "modelshift.vercel.app",
    project_id: "prj_SnTYtzLicYKYlHvXCNwq9J7ehQZB",
    team_id: "team_lr0E9GlEDc3XYJP7xrx8po2W",
    git_source: {
      type: "github",
      repository: "RanaPriyansh/modelshift",
      ref: "main",
    },
    immutable_deployment: {
      hostname_prefix: "forge-learning-",
      hostname_suffix: "-ranapriyanshs-projects.vercel.app",
    },
  },
} as const;

export type DeploymentTargetId = keyof typeof DEPLOYMENT_TARGETS;
export type ImmutableDeploymentTargetPolicy = Readonly<{ hostname_prefix: string; hostname_suffix: string }>;
export type GitSourceTargetPolicy = Readonly<{ type: "github"; repository: string; ref: string }>;
export type DeploymentTarget = Readonly<{
  origin: string;
  hostname: string;
  project_id: string;
  team_id: string;
  git_source: GitSourceTargetPolicy;
  immutable_deployment: ImmutableDeploymentTargetPolicy;
}>;

const VERCEL_DEPLOYMENT_ID = /^dpl_[A-Za-z0-9]{20,64}$/;

function isCanonicalPublicHttpsOrigin(url: URL): boolean {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  return url.protocol === "https:"
    && url.hostname !== ""
    && isIP(hostname) === 0
    && hostname !== "localhost"
    && url.username === ""
    && url.password === ""
    && url.port === ""
    && url.pathname === "/"
    && url.search === ""
    && url.hash === "";
}

export function isPlausibleVercelDeploymentId(value: unknown): value is string {
  return typeof value === "string" && VERCEL_DEPLOYMENT_ID.test(value);
}

/**
 * Validate only policy facts this repository owns: HTTPS origin form, a
 * non-placeholder Vercel deployment-ID shape, project identity, the checked-in
 * FORGE Vercel hostname authority, and distinction from the inspected alias.
 */
export function matchesImmutableDeploymentTarget(
  deployment: Readonly<{ id: string; url: string; project_id: string }>,
  aliasOrigin: string,
  target: Readonly<{ project_id: string; immutable_deployment: ImmutableDeploymentTargetPolicy }> | undefined,
): boolean {
  if (!target || !isPlausibleVercelDeploymentId(deployment.id) || deployment.project_id !== target.project_id) return false;
  try {
    const immutable = new URL(deployment.url);
    const alias = new URL(aliasOrigin);
    const hostname = immutable.hostname.toLowerCase();
    const prefix = target.immutable_deployment.hostname_prefix;
    const suffix = target.immutable_deployment.hostname_suffix;
    const opaqueDeploymentLabel = hostname.slice(prefix.length, hostname.length - suffix.length);
    return isCanonicalPublicHttpsOrigin(immutable)
      && isCanonicalPublicHttpsOrigin(alias)
      && immutable.origin !== alias.origin
      && hostname.startsWith(prefix)
      && hostname.endsWith(suffix)
      && /^[a-z0-9]{6,128}$/.test(opaqueDeploymentLabel);
  } catch {
    return false;
  }
}

export function resolveDeploymentTarget(targetId: string): (typeof DEPLOYMENT_TARGETS)[DeploymentTargetId] {
  if (!Object.hasOwn(DEPLOYMENT_TARGETS, targetId)) throw new Error("deployment target is not in the checked-in allowlist");
  return DEPLOYMENT_TARGETS[targetId as DeploymentTargetId];
}
import { isIP } from "node:net";
