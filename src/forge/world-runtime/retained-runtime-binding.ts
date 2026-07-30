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
    version: "1.0.2",
    route: "/learn/force-and-motion",
    runtimeBindingDigest: "sha256:318d3d0e0e6b98f7cbfbcce003e13b621346c5b6e0bf60bf72c904dd4ca8e597",
    packageIntegrityHash: "sha256:0b4ee9c6329d038e42903e009c74b18005c60a65fe32c2770130fdbd4f72e36e",
  },
  {
    id: "world.proportional-reasoning",
    version: "1.0.2",
    route: "/learn/proportional-reasoning",
    runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
    packageIntegrityHash: "sha256:f55197c4985ae4a2964f40411a2ded4c8519779ea8dab046ccc211a64e8fb0e4",
  },
  {
    id: "world.source-corroboration",
    version: "1.0.1",
    route: "/learn/ai-and-learning",
    runtimeBindingDigest: "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5",
    packageIntegrityHash: "sha256:4002e3f6868709f4dca81ce5909140d9bffa96470487ca052f3dd529f6b8a013",
  },
  {
    id: "world.primary-source-reasoning",
    version: "1.0.2",
    route: "/learn/primary-source-reasoning",
    runtimeBindingDigest: "sha256:b3401c71f330d82fdd31958af836683742c9e37f2f3d8cd6cf8f2a887f782029",
    packageIntegrityHash: "sha256:71e60e96a1a6cb9fbd117fc6516c2f0355744e546b315482e1d17604f13a3e6f",
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
