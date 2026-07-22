import retainedContentManifest from "../../../scripts/ops/content-package-manifest.json";

import type { LearningWorldPack, WorldRuntimeBinding } from "../contracts";

type ReleasedRuntimePack = LearningWorldPack & { readonly runtime: WorldRuntimeBinding };

/**
 * This retained executable identity is deliberately separate from the public
 * content-package manifest. The unavailable Argument & Evidence package can
 * run its bounded local runtime, but it is not a published curriculum package.
 */
const RETAINED_UNAVAILABLE_RUNTIME_IDENTITIES = [
  {
    id: "world.argument-evidence",
    version: "1.0.0",
    route: "/learn/argument-evidence",
    runtimeBindingDigest: "sha256:a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
    packageIntegrityHash: "sha256:6529ad6571852c31eadd49a30b7889c7da46ff1268dfa9bc4579bb69ba4d07d1",
  },
] as const;

/**
 * This is deliberately a read-only projection of the retained content
 * manifest. Browser runtime code needs the released digest to place it in a
 * local receipt, while compiler code independently recalculates the digest
 * before it accepts that receipt.
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
  const retainedUnavailable = RETAINED_UNAVAILABLE_RUNTIME_IDENTITIES.find(
    (candidate) => candidate.id === pack.manifest.id
      && candidate.version === pack.manifest.version
      && candidate.route === pack.manifest.route,
  );
  return retainedUnavailable ?? null;
}
