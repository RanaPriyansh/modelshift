import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * Exact reviewed-fixture identifiers and instructional strings that are never
 * permitted in public static assets. They may be present only in the
 * server-only projection after the exact review gate admits the route.
 */
export const ADULT_PILOT_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS = Object.freeze([
  "forge-reviewed-adult-pilot-route.v1",
  "journey.fixture.adult-ratio-route",
  "2026-07-23T12:00:00.000Z",
  "authority.fixture.reviewed-adult-route",
  "capability-map.fixture.ratio-map",
  "resource.fixture.ratio-comparison",
  "representation.fixture.ratio-table",
  "project.fixture.individual-mixture-explanation",
  "practice.fixture.equal-quantities",
  "world-runtime.fixture.ratio",
  "evidence-contract.fixture.this-attempt",
  "route.fixture.ratio-comparison",
  "checkpoint.fixture.equal-quantity-test",
  "operation.fixture.compare-equal-quantities",
  "transfer.fixture.unfamiliar-mixture",
  "attempt.fixture.adult-ratio-return",
  "reading.fixture.equal-quantities",
  "reading.fixture.single-change",
  "Practical ratio comparison prompt",
  "Reviewed-fixture route identity",
  "Equal-quantity prerequisite connection",
  "Sequence suggestion awaiting your decision",
  "Compare quantities that have been scaled by the same factor",
  "Try a second mixture after the separating comparison",
  "Whether one quantity may change alone",
  "Individual practical explanation, not a group artifact",
  "Unfamiliar mixture after explicit support withdrawal",
  "Compare both quantities after scaling them by the same factor.",
  "Change one quantity and treat the resulting ratio as equivalent.",
  "Whether equivalent quantities must change together.",
  "Compare two mixtures by scaling both quantities equally, then inspect whether the relationship stays equivalent.",
  "Equal quantities comparison",
  "Active checkpoint: compare the multiplier before deciding.",
  "No external player, iframe, video completion, or media evidence is present in this route.",
  "Reviewed fixture reference",
  "Ratio table alternative",
  "Active, not complete",
  "Select the equal-quantity comparison",
  "Use this reviewed checkpoint",
  "On an unfamiliar mixture, what comparison would you make first?",
  "Your unfamiliar comparison",
  "Submit this unfamiliar comparison",
  "2026-07-23T12:01:00.000Z",
  "2026-07-30T12:01:00.000Z",
] as const);

export type AdultPilotPublicAsset = Readonly<{ path: string; contents: string }>;
export type AdultPilotPublicArtifactLeak = Readonly<{ path: string; marker: string }>;

export function findAdultPilotPublicArtifactLeaks(
  assets: readonly AdultPilotPublicAsset[],
): readonly AdultPilotPublicArtifactLeak[] {
  return Object.freeze(assets.flatMap((asset) => ADULT_PILOT_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS.flatMap((marker) => (
    asset.contents.includes(marker) ? [Object.freeze({ path: asset.path, marker })] : []
  ))));
}

export function assertNoAdultPilotPublicArtifactLeaks(
  leaks: readonly AdultPilotPublicArtifactLeak[],
): void {
  if (leaks.length > 0) {
    throw new Error(`Reviewed adult-pilot fixture data reached public build assets:\n${leaks.map((leak) => `${leak.path}: ${leak.marker}`).join("\n")}`);
  }
}

function publicStaticFiles(directory: string): readonly string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink()) throw new Error(`Adult pilot public-asset scan rejected symlink: ${absolutePath}`);
    if (stat.isDirectory()) return publicStaticFiles(absolutePath);
    return stat.isFile() ? [absolutePath] : [];
  });
}

/** Greps every emitted public static asset from a completed production build. */
export function scanAdultPilotProductionPublicAssets(projectRoot: string = process.cwd()): readonly AdultPilotPublicArtifactLeak[] {
  const staticDirectory = resolve(projectRoot, ".next/static");
  if (!existsSync(staticDirectory) || !lstatSync(staticDirectory).isDirectory()) {
    throw new Error("Adult pilot public-asset scan requires a completed production .next/static build.");
  }
  const assets = publicStaticFiles(staticDirectory).map((absolutePath) => Object.freeze({
    path: relative(projectRoot, absolutePath),
    contents: readFileSync(absolutePath, "utf8"),
  }));
  return findAdultPilotPublicArtifactLeaks(assets);
}
