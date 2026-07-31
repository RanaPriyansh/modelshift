import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  assertNoAdultPilotPublicArtifactLeaks,
  scanAdultPilotProductionPublicAssets,
} from "../../src/components/forge/pilot/adult-pilot-public-artifact-boundary";
import {
  assertNoUniversitySourceReviewProductionArtifactLeaks,
  scanUniversitySourceReviewProductionArtifacts,
} from "../../src/components/forge/university/university-source-review-public-artifact-boundary";
import {
  assertNoUniversityRecoveryPublicArtifactLeaks,
  scanUniversityRecoveryProductionPublicAssets,
} from "../../src/components/forge/university/university-recovery-public-artifact-boundary";
import {
  assertNoUniversityResearchReadinessPublicArtifactLeaks,
  scanUniversityResearchReadinessProductionPublicAssets,
} from "../../src/components/forge/university/university-research-readiness-public-artifact-boundary";
import {
  assertNoUniversityResearchSubstitutePublicArtifactLeaks,
  scanUniversityResearchSubstituteProductionPublicAssets,
} from "../../src/components/forge/university/university-research-substitute-public-artifact-boundary";
import {
  assertNoUniversityProtectedStudyProductionArtifactLeaks,
  scanUniversityProtectedStudyProductionArtifacts,
} from "../../src/components/forge/university/university-protected-study-public-artifact-boundary";
import {
  assertNoUniversityPostAttemptRepairPublicArtifactLeaks,
  scanUniversityPostAttemptRepairProductionPublicAssets,
} from "../../src/components/forge/university/university-post-attempt-repair-public-artifact-boundary";
import {
  assertNoUniversitySemesterLoopPublicArtifactLeaks,
  scanUniversitySemesterLoopProductionPublicAssets,
} from "../../src/components/forge/university/university-semester-loop-public-artifact-boundary";
import {
  assertNoUniversitySemesterDeskPublicArtifactLeaks,
  scanUniversitySemesterDeskProductionPublicAssets,
} from "../../src/components/forge/university/university-semester-desk-public-artifact-boundary";
import {
  assertNoUniversitySemesterOverviewPublicArtifactLeaks,
  scanUniversitySemesterOverviewProductionPublicAssets,
} from "../../src/components/forge/university/university-semester-overview-public-artifact-boundary";
import {
  assertNoUniversityTodayProductionArtifactLeaks,
  scanUniversityTodayProductionArtifacts,
} from "../../src/components/forge/university/university-today-public-artifact-boundary";
import {
  assertNoUniversityFoundationPublicArtifactLeaks,
  scanUniversityFoundationProductionArtifacts,
} from "../../src/components/forge/university/university-foundation-public-artifact-boundary";

import { readPublicAssetDigest } from "./release-digests";
import { publicBuildBoundaryReceiptLine } from "./public-build-boundary-receipt";
import {
  clearProductionRuntimeCache,
  writeProductionBuildReceipt,
} from "./production-build-receipt";

const RETAINED_ARGUMENT_EVIDENCE_MARKERS = [
  "argument-evidence",
  "world.argument-evidence",
  "source.argument-evidence.authored-fixture",
  "forge-internal:source.argument-evidence.authored-fixture",
  "The rooftop garden lowers",
  "rooftop_garden_evidence_table",
  "The new morning bus route reduced",
  "bus_route_late_arrivals_table",
  "roof.outcome-linked",
  "supports_with_limit",
  "bus.outcome-linked",
  "compares_named_outcome",
  "other_changes_not_ruled_out",
  "8ce3d6a8138f49a499202cacf4d38b58e03d7978bf151b3138020bdf24ce9ed9",
  "a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
  "c60de18c1bd0cf910379c76fde69d3eb5bd9f9952b21f27d2c25a9a5e796b6df",
  "sha256:a38c116d6b81e0e30f2f5d711c0f19346eefc76504859b3fc929c317731ab9fc",
  "sha256:c60de18c1bd0cf910379c76fde69d3eb5bd9f9952b21f27d2c25a9a5e796b6df",
] as const;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function verifyPublicBuildBoundary(root = process.cwd()): void {
  const staticDirectory = resolve(root, ".next/static");
  const files = filesUnder(staticDirectory);
  const leaks: string[] = [];
  for (const file of files) {
    const bytes = readFileSync(file);
    for (const marker of RETAINED_ARGUMENT_EVIDENCE_MARKERS) {
      if (bytes.includes(Buffer.from(marker))) leaks.push(`${file}: ${marker}`);
    }
  }
  const adultPilotLeaks = scanAdultPilotProductionPublicAssets(root);
  const universitySourceReviewLeaks =
    scanUniversitySourceReviewProductionArtifacts(root);
  const universityRecoveryLeaks = scanUniversityRecoveryProductionPublicAssets(root);
  const universityResearchReadinessLeaks =
    scanUniversityResearchReadinessProductionPublicAssets(root);
  const universityResearchSubstituteLeaks =
    scanUniversityResearchSubstituteProductionPublicAssets(root);
  const universityProtectedStudyLeaks =
    scanUniversityProtectedStudyProductionArtifacts(root);
  const universityPostAttemptRepairLeaks =
    scanUniversityPostAttemptRepairProductionPublicAssets(root);
  const universitySemesterLoopAndResearchCandidateLeaks =
    scanUniversitySemesterLoopProductionPublicAssets(root);
  const universitySemesterDeskLeaks =
    scanUniversitySemesterDeskProductionPublicAssets(root);
  const universitySemesterOverviewLeaks =
    scanUniversitySemesterOverviewProductionPublicAssets(root);
  const universityTodayLeaks = scanUniversityTodayProductionArtifacts(root);
  const universityFoundationLeaks =
    scanUniversityFoundationProductionArtifacts(root);
  if (leaks.length > 0) {
    throw new Error(`Retained unavailable Argument & Evidence data reached public build assets:\n${leaks.join("\n")}`);
  }
  assertNoAdultPilotPublicArtifactLeaks(adultPilotLeaks);
  assertNoUniversitySourceReviewProductionArtifactLeaks(
    universitySourceReviewLeaks,
  );
  assertNoUniversityRecoveryPublicArtifactLeaks(universityRecoveryLeaks);
  assertNoUniversityResearchReadinessPublicArtifactLeaks(
    universityResearchReadinessLeaks,
  );
  assertNoUniversityResearchSubstitutePublicArtifactLeaks(
    universityResearchSubstituteLeaks,
  );
  assertNoUniversityProtectedStudyProductionArtifactLeaks(
    universityProtectedStudyLeaks,
  );
  assertNoUniversityPostAttemptRepairPublicArtifactLeaks(
    universityPostAttemptRepairLeaks,
  );
  assertNoUniversitySemesterLoopPublicArtifactLeaks(
    universitySemesterLoopAndResearchCandidateLeaks,
  );
  assertNoUniversitySemesterDeskPublicArtifactLeaks(
    universitySemesterDeskLeaks,
  );
  assertNoUniversitySemesterOverviewPublicArtifactLeaks(
    universitySemesterOverviewLeaks,
  );
  assertNoUniversityTodayProductionArtifactLeaks(universityTodayLeaks);
  assertNoUniversityFoundationPublicArtifactLeaks(universityFoundationLeaks);
  clearProductionRuntimeCache(root);
  const publicAssetDigest = readPublicAssetDigest(root);
  process.stdout.write(publicBuildBoundaryReceiptLine(
    files.length,
    publicAssetDigest,
  ));
  const buildReceipt = writeProductionBuildReceipt(root);
  process.stdout.write(
    `Production build receipt: ${buildReceipt.sourceState} source ${buildReceipt.sourceCommit}; ${buildReceipt.artifactFileCount} files; artifact ${buildReceipt.artifactDigest}.\n`,
  );
}

verifyPublicBuildBoundary();
