import type { LearningWorldPack, WorldRuntimeBinding } from "../contracts";
import { deepFreeze } from "../deep-freeze";

type ReleasedRuntimePack = LearningWorldPack & { readonly runtime: WorldRuntimeBinding };

/**
 * Runtime authority is intentionally independent of the importable JSON
 * object. Release tests require these literals to equal both that checked-in
 * manifest and freshly computed canonical package identities.
 */
const retainedPackageIdentities = deepFreeze([
  {
    id: "world.force-and-motion",
    version: "1.0.1",
    route: "/learn/force-and-motion",
    runtimeBindingDigest: "sha256:9ac8b15244c5839abc4e0644564699a8b0b5fff9d7fc8603d6181fd739d85c54",
    packageIntegrityHash: "sha256:975d00b8f7b7b25f2323a0ba2fe7712bcf6d5221212c86e67f0520021e76b783",
  },
  {
    id: "world.proportional-reasoning",
    version: "1.0.2",
    route: "/learn/proportional-reasoning",
    runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
    packageIntegrityHash: "sha256:b8430668c5b061415aa5ec24bb8e62ae4a4e4c95a808c7a65b04e3ff78a8a353",
  },
  {
    id: "world.source-corroboration",
    version: "1.0.1",
    route: "/learn/ai-and-learning",
    runtimeBindingDigest: "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5",
    packageIntegrityHash: "sha256:2f7900a0c3e7cfe5c993ec27b8071cc14d84dc605eef28cca041dc60b870f690",
  },
  {
    id: "world.primary-source-reasoning",
    version: "1.0.2",
    route: "/learn/primary-source-reasoning",
    runtimeBindingDigest: "sha256:b3401c71f330d82fdd31958af836683742c9e37f2f3d8cd6cf8f2a887f782029",
    packageIntegrityHash: "sha256:f8c42959595156cf84ff300cfd523bc37824aceec38165bf875bab19e4b17419",
  },
] as const);

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
  const entry = retainedPackageIdentities.find(
    (candidate) =>
      candidate.id === pack.manifest.id
      && candidate.version === pack.manifest.version
      && candidate.route === pack.manifest.route,
  );
  if (entry?.runtimeBindingDigest && entry.packageIntegrityHash) {
    return {
      runtimeBindingDigest: entry.runtimeBindingDigest,
      packageIntegrityHash: entry.packageIntegrityHash,
    };
  }
  return null;
}
