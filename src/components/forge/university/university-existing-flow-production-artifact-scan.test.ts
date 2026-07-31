import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { scanUniversityPostAttemptRepairProductionArtifacts } from "./university-post-attempt-repair-public-artifact-boundary";
import { scanUniversityRecoveryProductionArtifacts } from "./university-recovery-public-artifact-boundary";
import { scanUniversityResearchReadinessProductionArtifacts } from "./university-research-readiness-public-artifact-boundary";
import { scanUniversityResearchSubstituteProductionArtifacts } from "./university-research-substitute-public-artifact-boundary";
import { scanUniversitySemesterDeskProductionArtifacts } from "./university-semester-desk-public-artifact-boundary";
import { scanUniversitySemesterLoopProductionArtifacts } from "./university-semester-loop-public-artifact-boundary";
import { scanUniversitySemesterOverviewProductionArtifacts } from "./university-semester-overview-public-artifact-boundary";

const SCANNERS = [
  {
    name: "recovery",
    marker: "forge-university-recovery.v1",
    scan: scanUniversityRecoveryProductionArtifacts,
  },
  {
    name: "post-attempt repair",
    marker: "forge-university-post-attempt-repair.v1",
    scan: scanUniversityPostAttemptRepairProductionArtifacts,
  },
  {
    name: "semester loop",
    marker: "forge-university-semester-loop.v1",
    scan: scanUniversitySemesterLoopProductionArtifacts,
  },
  {
    name: "semester overview",
    marker: "forge-university-semester-overview.v1",
    scan: scanUniversitySemesterOverviewProductionArtifacts,
  },
  {
    name: "semester desk",
    marker: "forge-university-semester-desk.v1",
    scan: scanUniversitySemesterDeskProductionArtifacts,
  },
  {
    name: "research readiness",
    marker: "forge-university-research-readiness.v1",
    scan: scanUniversityResearchReadinessProductionArtifacts,
  },
  {
    name: "research substitute",
    marker: "forge-university-research-substitute.pack-p.v1",
    scan: scanUniversityResearchSubstituteProductionArtifacts,
  },
] as const;

describe("existing university production artifact scanners", () => {
  it.each(SCANNERS)(
    "scans server artifacts for $name fixture markers",
    ({ marker, scan }) => {
      const root = mkdtempSync(join(tmpdir(), "forge-university-artifacts-"));
      try {
        const staticDirectory = join(root, ".next", "static");
        const serverDirectory = join(root, ".next", "server");
        mkdirSync(staticDirectory, { recursive: true });
        mkdirSync(serverDirectory, { recursive: true });
        writeFileSync(
          join(staticDirectory, "unavailable.js"),
          "generic unavailable shell",
        );
        writeFileSync(join(serverDirectory, "leak.js"), marker);

        expect(scan(root)).toContainEqual({
          path: ".next/server/leak.js",
          marker,
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
