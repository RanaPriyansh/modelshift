import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PLAYWRIGHT_EVIDENCE_TARGETS,
} from "../../scripts/ops/playwright-evidence-receipt";
import {
  PRODUCTION_BROWSER_SPECS,
} from "../../scripts/ops/run-production-browser-verification";
import {
  SEMESTER_DESK_V2_BROWSER_PROJECTS,
  SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC,
  SEMESTER_DESK_V2_LOCAL_REPORT_DIRECTORY,
  SEMESTER_DESK_V2_PRODUCTION_REPORT_DIRECTORY,
} from "../../scripts/ops/semester-desk-v2-browser-contract";

describe("Semester Desk v2 browser release contract", () => {
  it("uses the canonical flow in both receipt contexts", () => {
    expect(PRODUCTION_BROWSER_SPECS).toEqual([
      SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC,
    ]);
    expect(PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Local).toMatchObject({
      report_directory: SEMESTER_DESK_V2_LOCAL_REPORT_DIRECTORY,
      expected_specs: [SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC],
      expected_projects: SEMESTER_DESK_V2_BROWSER_PROJECTS,
      evidence_environment: "development",
    });
    expect(PLAYWRIGHT_EVIDENCE_TARGETS.semesterDeskV2Production).toMatchObject({
      report_directory: SEMESTER_DESK_V2_PRODUCTION_REPORT_DIRECTORY,
      expected_specs: [SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC],
      expected_projects: SEMESTER_DESK_V2_BROWSER_PROJECTS,
      evidence_environment: "production",
      artifact_class: "production_build_artifact",
    });
  });

  it("limits package scripts to the canonical local and production browser flow", async () => {
    const packageFile = await readFile(resolve(process.cwd(), "package.json"), "utf8");
    const packageJson = JSON.parse(packageFile) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["test:e2e"]).toBe(
      `playwright test ${SEMESTER_DESK_V2_CANONICAL_BROWSER_SPEC}`,
    );
    expect(packageJson.scripts["test:e2e:prod"]).toContain(
      "scripts/ops/run-production-browser-verification.ts",
    );
    expect(packageJson.scripts["test:e2e:prod"]).toContain(
      "FORGE_EXPECTED_RELEASE_SHA=${FORGE_EXPECTED_RELEASE_SHA:?Set FORGE_EXPECTED_RELEASE_SHA}",
    );
    expect(packageJson.scripts["test:e2e:prod"]).not.toContain(
      "PLAYWRIGHT_BASE_URL",
    );
    expect(Object.keys(packageJson.scripts).filter((script) => (
      script.startsWith("test:e2e:") && script !== "test:e2e:prod"
    ))).toEqual([]);
  });

  it("runs local and production CI gates with the exact canonical spec", async () => {
    const workflow = await readFile(
      resolve(process.cwd(), ".github/workflows/quality-gates.yml"),
      "utf8",
    );
    const uses = workflow.match(
      /tests\/e2e\/semester-desk-v2-canonical\.spec\.ts/g,
    ) ?? [];

    expect(uses).toHaveLength(1);
    expect(workflow).toContain(
      "FORGE_PLAYWRIGHT_OUTPUT_DIR: test-results/semester-desk-v2-local",
    );
    expect(workflow).toContain("--target semesterDeskV2Local");
    expect(workflow).toContain("--target semesterDeskV2Production");
    expect(workflow).not.toContain("FORGE_UNIVERSITY_");
    expect(workflow).not.toContain("university-foundation");
  });
});
