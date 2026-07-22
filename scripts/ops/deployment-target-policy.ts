/** Checked-in, principal-reviewable deployment origins. Dispatch callers choose an ID, never a URL. */
export const DEPLOYMENT_TARGETS = {
  forge_learning_os_project: {
    origin: "https://modelshift.vercel.app",
    hostname: "modelshift.vercel.app",
  },
} as const;

export type DeploymentTargetId = keyof typeof DEPLOYMENT_TARGETS;

export function resolveDeploymentTarget(targetId: string): (typeof DEPLOYMENT_TARGETS)[DeploymentTargetId] {
  if (!Object.hasOwn(DEPLOYMENT_TARGETS, targetId)) throw new Error("deployment target is not in the checked-in allowlist");
  return DEPLOYMENT_TARGETS[targetId as DeploymentTargetId];
}
