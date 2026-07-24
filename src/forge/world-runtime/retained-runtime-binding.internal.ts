import type { LearningWorldPack, WorldRuntimeBinding } from "../contracts";
import {
  retainedRuntimeIdentityFor,
  type RetainedRuntimeIdentity,
} from "./retained-runtime-binding";

type ReleasedRuntimePack = LearningWorldPack & { readonly runtime: WorldRuntimeBinding };

export const ARGUMENT_EVIDENCE_RETAINED_RUNTIME_IDENTITY = Object.freeze({
  runtimeBindingDigest: "sha256:a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
  packageIntegrityHash: "sha256:c60de18c1bd0cf910379c76fde69d3eb5bd9f9952b21f27d2c25a9a5e796b6df",
} as const satisfies RetainedRuntimeIdentity);

export function retainedRuntimeIdentityForInternal(
  pack: Pick<ReleasedRuntimePack, "manifest">,
): RetainedRuntimeIdentity | null {
  const published = retainedRuntimeIdentityFor(pack);
  if (published) return published;
  return pack.manifest.id === "world.argument-evidence"
    && pack.manifest.version === "1.0.0"
    && pack.manifest.route === "/learn/argument-evidence"
    ? ARGUMENT_EVIDENCE_RETAINED_RUNTIME_IDENTITY
    : null;
}
