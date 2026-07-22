import retainedContentManifest from "../../../scripts/ops/content-package-manifest.json";

import type { LearningWorldPack, WorldRuntimeBinding } from "../contracts";

type ReleasedRuntimePack = LearningWorldPack & { readonly runtime: WorldRuntimeBinding };

/**
 * This is deliberately a read-only projection of the retained content
 * manifest. It contains only published packages safe for browser runtimes.
 */
export function retainedRuntimeBindingDigestFor(
  pack: Pick<ReleasedRuntimePack, "manifest">,
): string | null {
  return retainedRuntimeIdentityFor(pack)?.runtimeBindingDigest ?? null;
}

export interface RetainedRuntimeIdentity {
  readonly runtimeBindingDigest: string;
  readonly packageIntegrityHash: string;
}

export function retainedRuntimeIdentityFor(
  pack: Pick<ReleasedRuntimePack, "manifest">,
): RetainedRuntimeIdentity | null {
  const entry = retainedContentManifest.packages.find(
    (candidate) =>
      candidate.id === pack.manifest.id
      && candidate.version === pack.manifest.version
      && candidate.route === pack.manifest.route,
  );
  if (entry?.runtime_binding_digest && entry.package_integrity_hash) {
    return {
      runtimeBindingDigest: entry.runtime_binding_digest,
      packageIntegrityHash: entry.package_integrity_hash,
    };
  }
  return null;
}
