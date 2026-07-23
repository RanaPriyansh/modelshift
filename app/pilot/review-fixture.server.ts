import "server-only";

import type { AdultPilotFixtureProjection } from "@/src/components/forge/pilot/AdultPilotExperience";

const REVIEWED_READINGS: AdultPilotFixtureProjection["readings"] = Object.freeze([
  Object.freeze({ id: "reading.fixture.equal-quantities", wording: "Compare both quantities after scaling them by the same factor." }),
  Object.freeze({ id: "reading.fixture.single-change", wording: "Change one quantity and treat the resulting ratio as equivalent." }),
] as const);

/**
 * The entire reviewed projection is server-only. The public route renders the
 * generic unavailable state unless the exact server-owned gate admits this
 * projection; none of these identifiers or instructional strings are part of
 * the public client artifact.
 */
export function reviewedAdultPilotProjection(): AdultPilotFixtureProjection {
  return Object.freeze({
    fixture: Object.freeze({
      schemaVersion: "adult-pilot-experience.v1",
      audience: "adult-fixture",
      journeyId: "journey.fixture.adult-ratio-route",
      startedAt: "2026-07-23T12:00:00.000Z",
      authorityRef: "authority.fixture.reviewed-adult-route",
      capabilityMapRef: "capability-map.fixture.ratio-map",
      resourceRef: "resource.fixture.ratio-comparison",
      representationRef: "representation.fixture.ratio-table",
      projectRef: "project.fixture.individual-mixture-explanation",
      practiceRef: "practice.fixture.equal-quantities",
      worldRuntimeRef: "world-runtime.fixture.ratio",
      evidenceContractRef: "evidence-contract.fixture.this-attempt",
      reviewedRouteRef: "route.fixture.ratio-comparison",
      activeCheckpointRef: "checkpoint.fixture.equal-quantity-test",
      separatingOperationRef: "operation.fixture.compare-equal-quantities",
      coldTransferRef: "transfer.fixture.unfamiliar-mixture",
    }),
    mapEntries: Object.freeze([
      Object.freeze({ provenance: "Authored", detail: "Practical ratio comparison prompt" }),
      Object.freeze({ provenance: "Fixture", detail: "Reviewed-fixture route identity" }),
      Object.freeze({ provenance: "Graph-derived", detail: "Equal-quantity prerequisite connection" }),
      Object.freeze({ provenance: "Model proposal", detail: "Sequence suggestion awaiting your decision" }),
      Object.freeze({ provenance: "Prerequisite node", detail: "Compare quantities that have been scaled by the same factor" }),
      Object.freeze({ provenance: "Optional node", detail: "Try a second mixture after the separating comparison" }),
      Object.freeze({ provenance: "Visible gap", detail: "Whether one quantity may change alone" }),
      Object.freeze({ provenance: "Project node", detail: "Individual practical explanation, not a group artifact" }),
      Object.freeze({ provenance: "Proof node", detail: "Unfamiliar mixture after explicit support withdrawal" }),
    ]),
    readings: REVIEWED_READINGS,
    pointOfDisagreement: "Whether equivalent quantities must change together.",
    separatingOperation: Object.freeze({
      explanation: "Compare two mixtures by scaling both quantities equally, then inspect whether the relationship stays equivalent. This is a selected operation, not a completed resource or evidence result.",
      actionLabel: "Select the equal-quantity comparison",
    }),
    reviewedRoute: Object.freeze({
      title: "Equal quantities comparison",
      description: "Active checkpoint: compare the multiplier before deciding. No external player, iframe, video completion, or media evidence is present in this route.",
      details: Object.freeze([
        Object.freeze({ label: "Resource", value: "Reviewed fixture reference" }),
        Object.freeze({ label: "Representation", value: "Ratio table alternative" }),
        Object.freeze({ label: "Checkpoint", value: "Active, not complete" }),
      ]),
      actionLabel: "Use this reviewed checkpoint",
    }),
    coldTransfer: Object.freeze({
      heading: "On an unfamiliar mixture, what comparison would you make first?",
      label: "Your unfamiliar comparison",
      submitLabel: "Submit this unfamiliar comparison",
    }),
    delayedReturn: Object.freeze({
      scheduledAt: "2026-07-23T12:01:00.000Z",
      dueAt: "2026-07-30T12:01:00.000Z",
      delayDays: 7,
      dueAttemptId: "attempt.fixture.adult-ratio-return",
    }),
  });
}
