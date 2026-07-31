import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

export const UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS =
  Object.freeze([
    "/internal/university-research-substitute",
    "FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE",
    "forge-university-research-substitute.pack-p.v1",
    "forge-university-research-substitute.pack-q.v1",
    "university-research-surface-packet.v1",
    "university-research-neutral-worksheet-renderer.v1",
    "matched-substitute.phase-minus-one.v1",
    "research-scenario-pack.northstar.v1",
    "research-scenario-pack.riverglass.v1",
    "Autumn Studio Term",
    "Spring Lab Term",
    "Systems Sketching",
    "Evidence Mapping",
    "Compare the seven examples",
  ] as const);

export const UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS = Object.freeze([
  "Example 1",
  "Example 2",
  "Example 3",
  "Example 4",
  "Example 5",
  "Example 6",
  "Example 7",
] as const);

const ORDINAL_LABEL_SET_MARKER =
  "university research substitute server-only ordinal label set";

export type UniversityResearchSubstitutePublicAsset =
  Readonly<{ path: string; contents: string }>;
export type UniversityResearchSubstitutePublicArtifactLeak =
  Readonly<{ path: string; marker: string }>;

export function findUniversityResearchSubstitutePublicArtifactLeaks(
  assets: readonly UniversityResearchSubstitutePublicAsset[],
): readonly UniversityResearchSubstitutePublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => {
    const markerLeaks =
      UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap(
        (marker) => (
          asset.contents.includes(marker)
            ? [Object.freeze({ path: asset.path, marker })]
            : []
        ),
      );
    const labelSetLeak = UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS.every(
      (label) => asset.contents.includes(label),
    )
      ? [Object.freeze({
          path: asset.path,
          marker: ORDINAL_LABEL_SET_MARKER,
        })]
      : [];
    return [...markerLeaks, ...labelSetLeak];
  }));
}

export function assertNoUniversityResearchSubstitutePublicArtifactLeaks(
  leaks: readonly UniversityResearchSubstitutePublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(
      `University research-substitute data reached public build assets:\n${leaks.map(
        (leak) => `${leak.path}: ${leak.marker}`,
      ).join("\n")}`,
    );
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new Error(
        `University research-substitute public-asset scan rejected symlink: ${absolutePath}`,
      );
    }
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

export function scanUniversityResearchSubstituteProductionPublicAssets(
  projectRoot: string = process.cwd(),
): readonly UniversityResearchSubstitutePublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error(
      "University research-substitute public-asset scan requires a completed production .next/static build.",
    );
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => (
    Object.freeze({
      path: relative(projectRoot, absolutePath),
      contents: readFileSync(absolutePath, "utf8"),
    })
  ));
  return findUniversityResearchSubstitutePublicArtifactLeaks(assets);
}
