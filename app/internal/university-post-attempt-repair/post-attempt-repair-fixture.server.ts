import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  createUniversityPostAttemptFixtureReceipt,
  projectUniversityPostAttemptRepair,
  type UniversityPostAttemptRepairEvidence,
  type UniversityPostAttemptRepairMove,
  type UniversityPostAttemptRepairProjectionStatus,
  type UniversityPostAttemptRepairProjectionV1,
} from "@/src/forge/university-post-attempt-repair/index.server";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";

import { universityTodayFixtureRequest } from "../university-today/today-fixture.server";

export type UniversityPostAttemptRepairFixtureScenarioId =
  | "one-check-open"
  | "two-checks-open"
  | "both-checks-held"
  | "receipt-unavailable";

export type UniversityPostAttemptRepairFixtureView = Readonly<{
  status: UniversityPostAttemptRepairProjectionStatus;
  eyebrow: string;
  title: string;
  body: string;
  context: Readonly<{
    binding: "server_paired_synthetic_not_receipt_bound";
    activityTitle: string;
    worldTitle: string;
    worldVersion: string;
    taskLabel: string;
    resultBoundary: string;
  }> | null;
  evidence: UniversityPostAttemptRepairEvidence | null;
  repair: UniversityPostAttemptRepairMove | null;
  announcement: string;
}>;

export type UniversityPostAttemptRepairFixtureScenario = Readonly<{
  id: UniversityPostAttemptRepairFixtureScenarioId;
  label: string;
  description: string;
  view: UniversityPostAttemptRepairFixtureView;
}>;

export type UniversityPostAttemptRepairFixture = Readonly<{
  schemaVersion: "university-post-attempt-repair-fixture.v1";
  termLabel: string;
  courseLabel: string;
  scenarios: readonly UniversityPostAttemptRepairFixtureScenario[];
  authority: Readonly<{
    receipt: "Exact process-local synthetic runtime object";
    repair: "One fixed internal authored mapping";
    diagnosis: "Not allowed";
    saveOrEvidence: "Not allowed";
    sessionOrPathChange: "Not allowed";
    externalEffect: "Not allowed";
  }>;
}>;

function view(
  projection: Readonly<UniversityPostAttemptRepairProjectionV1>,
): UniversityPostAttemptRepairFixtureView {
  const context = projection.context
    ? {
        binding: projection.context.binding,
        activityTitle: projection.context.activityTitle,
        worldTitle: projection.context.worldTitle,
        worldVersion: projection.context.worldVersion,
        taskLabel: projection.context.taskLabel,
        resultBoundary: projection.context.resultBoundary,
      }
    : null;
  switch (projection.status) {
    case "repair_ready":
      return {
        status: projection.status,
        eyebrow: "One check remains open",
        title: "Repair the boundary, not the answer.",
        body:
          "This is one immediate authored result. Inspect one precise repair move without turning it into a diagnosis, answer, or stronger proof.",
        context,
        evidence: projection.evidence,
        repair: projection.repair,
        announcement:
          "One check remains open. One authored repair move is available for inspection.",
      };
    case "repair_mapping_missing":
      return {
        status: projection.status,
        eyebrow: "Authored repair unavailable",
        title: "Stop before inventing advice.",
        body:
          "The attempt is exact, but this result has no fixed authored repair mapping. FORGE preserves the gap instead of generating a generic next step.",
        context,
        evidence: projection.evidence,
        repair: null,
        announcement:
          "No fixed authored repair mapping exists for this exact result.",
      };
    case "not_applicable":
      return {
        status: projection.status,
        eyebrow: "Both checks held once",
        title: "No immediate repair is selected.",
        body:
          "This immediate authored result does not choose a repair. It still does not establish retention, repeat reliability, mastery, or broader capability.",
        context,
        evidence: projection.evidence,
        repair: null,
        announcement:
          "Both authored checks held in this immediate attempt. No repair was selected.",
      };
    default:
      return {
        status: "invalid",
        eyebrow: "Attempt boundary stopped",
        title: "No result or repair is available.",
        body:
          "An exact process-attested receipt is required before this research surface can expose attempt evidence or authored repair copy.",
        context: null,
        evidence: null,
        repair: null,
        announcement:
          "Attempt boundary stopped. No result or repair was exposed.",
      };
  }
}

export async function universityPostAttemptRepairFixture(): Promise<
  UniversityPostAttemptRepairFixture
> {
  const todayRequest = await universityTodayFixtureRequest("ready");
  const mappedReceipt = createUniversityPostAttemptFixtureReceipt(
    "bounded-measures",
    "color-choice",
  );
  const unmappedReceipt = createUniversityPostAttemptFixtureReceipt(
    "always-harms",
    "reader-preference",
  );
  const passReceipt = createUniversityPostAttemptFixtureReceipt(
    "bounded-measures",
    "held-constant",
  );
  const request = (runtimeReceipt: unknown) => ({
    schemaVersion: "university-post-attempt-repair-request.v1" as const,
    todayRequest,
    worldPack: SOURCE_CORROBORATION_WORLD,
    runtimeReceipt,
  });
  const [mapped, unmapped, passed, unavailable] = await Promise.all([
    projectUniversityPostAttemptRepair(request(mappedReceipt)),
    projectUniversityPostAttemptRepair(request(unmappedReceipt)),
    projectUniversityPostAttemptRepair(request(passReceipt)),
    projectUniversityPostAttemptRepair(request(null)),
  ]);
  const statuses = [
    mapped.status,
    unmapped.status,
    passed.status,
    unavailable.status,
  ] as const;
  const expectedStatuses = [
    "repair_ready",
    "repair_mapping_missing",
    "not_applicable",
    "invalid",
  ] as const;
  if (
    statuses.some((status, index) => status !== expectedStatuses[index])
  ) {
    throw new Error(
      `Post-attempt repair fixture taxonomy drifted: ${statuses.join(", ")}.`,
    );
  }

  return deepFreeze({
    schemaVersion: "university-post-attempt-repair-fixture.v1",
    termLabel: mapped.context?.termLabel ?? "Autumn 2026",
    courseLabel:
      mapped.context?.courseLabel ?? "CS102: Evidence and computation",
    scenarios: [
      {
        id: "one-check-open",
        label: "One check open",
        description: "One fixed authored mapping",
        view: view(mapped),
      },
      {
        id: "two-checks-open",
        label: "Two checks open",
        description: "No authored repair mapping",
        view: view(unmapped),
      },
      {
        id: "both-checks-held",
        label: "Both checks held",
        description: "Immediate result only",
        view: view(passed),
      },
      {
        id: "receipt-unavailable",
        label: "Receipt unavailable",
        description: "Attempt boundary stops",
        view: view(unavailable),
      },
    ],
    authority: {
      receipt: "Exact process-local synthetic runtime object",
      repair: "One fixed internal authored mapping",
      diagnosis: "Not allowed",
      saveOrEvidence: "Not allowed",
      sessionOrPathChange: "Not allowed",
      externalEffect: "Not allowed",
    },
  });
}
