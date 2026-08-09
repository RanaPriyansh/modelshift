import type { LearningWorldPack } from "../contracts";
import {
  createLearningPathRevision,
  type ActivityStateV1,
  type ReviewedWorldRefV1,
} from "../continuity";
import type {
  CourseSourceReconciliationRequestV1,
  CourseSourceScopeV1,
} from "../course-sources";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import type { UniversityRecoveryRequestV1 } from "../university-recovery";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopProjectionV1,
  type UniversitySemesterLoopRequestV1,
} from "../university-semester-loop";
import type { UniversityTodayRequestV1 } from "../university-today";
import { SOURCE_CORROBORATION_WORLD } from "../worlds";
import {
  AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
  AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
} from "./authored";
import {
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID,
  UniversityResearchCandidateCompilationError,
  type UniversityResearchCandidateCompilationIssueCode,
  type UniversityResearchCandidateCompilationV1,
  type UniversityResearchCandidatePackId,
  type UniversityResearchCandidateScenario,
} from "./candidate-contracts";
import { UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS } from "./contracts";

const FIXTURE_IDENTITIES = deepFreeze({
  "pack-p": {
    ownerUserId: "11111111-1111-4111-8111-111111111111",
    tenantId: "22222222-2222-4222-8222-222222222222",
  },
  "pack-q": {
    ownerUserId: "33333333-3333-4333-8333-333333333333",
    tenantId: "44444444-4444-4444-8444-444444444444",
  },
} as const);

export const UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR = deepFreeze({
  compilerId: UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID,
  packSelection: "frozen_authored_pack_id_only",
  scenarioSelection: "frozen_authored_scenario_id_only",
  rawInputs: [
    "course_source_reconciliation",
    "university_today",
    "university_recovery",
    "learning_world_pack",
  ],
  projection:
    "projectUniversitySemesterLoop_recomputes_all_child_projections",
  expectedStatusUse: "postcondition_only",
  returnedRawRequest: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  messageSendAllowed: false,
  sessionStartAllowed: false,
  externalEffectsAllowed: false,
} as const);

const COMPILATION_AUTHORITY = deepFreeze({
  inputAuthority: "frozen_authored_pack_and_scenario_ids_only",
  factAuthority: "canonical_synthetic_scenario_record",
  expectedStatusAuthority: "postcondition_only",
  rawFixtureDisclosure: "digest_only",
  institutionalTruthEstablished: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  messageSendAllowed: false,
  sessionStartAllowed: false,
  externalEffectsAllowed: false,
} as const);

type AuthoredPack =
  | typeof AUTHORED_UNIVERSITY_RESEARCH_PACK_P
  | typeof AUTHORED_UNIVERSITY_RESEARCH_PACK_Q;

function fail(
  code: UniversityResearchCandidateCompilationIssueCode,
): never {
  throw new UniversityResearchCandidateCompilationError(code);
}

function selectPack(packId: unknown): AuthoredPack {
  if (packId === "pack-p") return AUTHORED_UNIVERSITY_RESEARCH_PACK_P;
  if (packId === "pack-q") return AUTHORED_UNIVERSITY_RESEARCH_PACK_Q;
  return fail("pack.unknown");
}

function selectScenario(
  pack: AuthoredPack,
  scenarioId: unknown,
): UniversityResearchCandidateScenario {
  if (typeof scenarioId !== "string") return fail("scenario.unknown");
  const scenario = pack.scenarios.find(
    (entry) => entry.scenarioId === scenarioId,
  );
  return scenario ?? fail("scenario.unknown");
}

function addMinutes(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function scenarioToken(scenario: UniversityResearchCandidateScenario): string {
  return scenario.scenarioRef.replace(/^scenario\./, "");
}

function scenarioRoute(worldRef: string): string {
  return `/learn/${worldRef.replace(/^world\./, "").replaceAll(".", "-")}`;
}

function scopeFor(
  packId: UniversityResearchCandidatePackId,
  scenario: UniversityResearchCandidateScenario,
): CourseSourceScopeV1 {
  return {
    ...FIXTURE_IDENTITIES[packId],
    termId: scenario.context.termRef,
    courseId: scenario.context.courseRef,
  };
}

function assertScenarioSemantics(
  scenario: UniversityResearchCandidateScenario,
): void {
  const relativeMinutes = (
    Date.parse(scenario.deadline.at) - Date.parse(scenario.context.asOf)
  ) / 60_000;
  const computedCapacity = scenario.capacity.availableMinutes
      >= scenario.capacity.effortMinutesHigh
    ? "fits"
    : scenario.capacity.availableMinutes
        >= scenario.capacity.effortMinutesLow
      ? "low_only"
      : "below_low";
  const terminalForPath = {
    accepted_active: "action_open",
    accepted_complete: "action_complete",
    accepted_blocked: "action_blocked",
  } as const;
  const worldRefsMatch =
    scenario.world.acceptedWorldRef === scenario.world.suppliedWorldRef;

  if (
    relativeMinutes !== scenario.deadline.relativeMinutes
    || computedCapacity !== scenario.capacity.relation
    || terminalForPath[scenario.path.state] !== scenario.terminal.state
    || (scenario.source.state === "reviewed_copy"
      ? scenario.source.conflictCount !== 0
      : scenario.source.conflictCount < 1)
    || (scenario.world.state === "exact_binding"
      ? !worldRefsMatch
      : scenario.world.state === "binding_changed"
        ? worldRefsMatch
        : false)
  ) fail("scenario.semantic_drift");
}

function sourceRequestFor(
  packId: UniversityResearchCandidatePackId,
  scenario: UniversityResearchCandidateScenario,
): CourseSourceReconciliationRequestV1 {
  const token = scenarioToken(scenario);
  const scope = scopeFor(packId, scenario);
  const observedAt = addMinutes(scenario.context.asOf, -120);
  const createdAt = addMinutes(scenario.context.asOf, -90);
  const decidedAt = addMinutes(scenario.context.asOf, -60);
  const freshnessReviewDueAt = addMinutes(scenario.context.asOf, 10_080);
  const coverageWindow = {
    startsAt: addMinutes(scenario.context.asOf, -1_440),
    endsAt: addMinutes(scenario.context.asOf, 100_800),
  };
  const primaryRevisionId = `course-source-revision.${token}.primary`;
  const primaryCandidateId = `course-source-candidate.${token}.deadline-primary`;
  const claimKey = `course-claim.${token}.deadline`;
  const primaryRevision:
    CourseSourceReconciliationRequestV1["sourceRevisions"][number] = {
    schemaVersion: "course-source-revision.v1" as const,
    revisionId: primaryRevisionId,
    scope,
    inputKind: "manual" as const,
    sourceLabel: `Copied source ${scenario.context.sourceRef}`,
    sourceDigest: `sha256:${"a".repeat(64)}`,
    observedAt,
    freshnessReviewDueAt,
    coverage: {
      status: "declared_complete_for_source" as const,
      window: coverageWindow,
      inspectedScopes: [
        "course_commitments",
        "deadlines",
        "assessment_policies",
      ],
      unknownOrOmittedScopes: [],
    },
    privacy: {
      visibility: "private_to_owner" as const,
      retentionClass: "derived_fields_only" as const,
      originalBytesRetained: false as const,
      redistributionAllowed: false as const,
    },
  };
  const primaryCandidate:
    CourseSourceReconciliationRequestV1["candidates"][number] = {
    schemaVersion: "course-source-candidate.v1" as const,
    candidateId: primaryCandidateId,
    scope,
    sourceRevisionId: primaryRevisionId,
    claimKey,
    locator: {
      kind: "manual_field" as const,
      fieldKey: "concept_check_deadline",
    },
    extractedBy: "learner_manual" as const,
    fact: {
      kind: "deadline" as const,
      title: scenario.deadline.title,
      dueAt: scenario.deadline.at,
      timeZone: scenario.context.timeZone,
      consequenceClass: "unknown" as const,
    },
    createdAt,
  };

  if (scenario.source.state === "reviewed_copy") {
    return {
      schemaVersion: "course-source-reconciliation.v1",
      scope,
      asOf: scenario.context.asOf,
      sourceRevisions: [primaryRevision],
      candidates: [primaryCandidate],
      decisions: [{
        schemaVersion: "course-source-decision.v1",
        decisionId: `course-source-decision.${token}.deadline-primary-accept`,
        candidateId: primaryCandidateId,
        scope,
        actor: "learner",
        kind: "accept",
        extractionMatch: "learner_confirmed",
        decidedAt,
      }],
    };
  }

  const secondaryRevisionId =
    `course-source-revision.${token}.secondary`;
  return {
    schemaVersion: "course-source-reconciliation.v1",
    scope,
    asOf: scenario.context.asOf,
    sourceRevisions: [
      primaryRevision,
      {
        ...primaryRevision,
        revisionId: secondaryRevisionId,
        sourceLabel: `Conflicting copy ${scenario.context.sourceRef}`,
        sourceDigest: `sha256:${"b".repeat(64)}`,
      },
    ],
    candidates: [
      primaryCandidate,
      {
        ...primaryCandidate,
        candidateId:
          `course-source-candidate.${token}.deadline-secondary`,
        sourceRevisionId: secondaryRevisionId,
        fact: {
          kind: "deadline",
          title: scenario.deadline.title,
          dueAt: addMinutes(scenario.deadline.at, 60),
          timeZone: scenario.context.timeZone,
          consequenceClass: "unknown",
        },
      },
    ],
    decisions: [],
  };
}

function worldPackFor(
  worldRef: string,
): LearningWorldPack {
  return deepFreeze({
    ...SOURCE_CORROBORATION_WORLD,
    manifest: {
      ...SOURCE_CORROBORATION_WORLD.manifest,
      id: worldRef,
      version: "1.0.0",
      route: scenarioRoute(worldRef),
    },
  }) as LearningWorldPack;
}

function reviewedWorldRefFor(
  scenario: UniversityResearchCandidateScenario,
): ReviewedWorldRefV1 {
  return {
    worldId: scenario.world.acceptedWorldRef,
    worldVersion: "1.0.0",
    worldRoute: scenarioRoute(scenario.world.acceptedWorldRef),
    activityProtocol: SOURCE_CORROBORATION_WORLD.manifest.activityProtocol,
    sourceIds: SOURCE_CORROBORATION_WORLD.manifest.sources.map(
      (source) => source.id,
    ),
  };
}

async function todayRequestFor(
  packId: UniversityResearchCandidatePackId,
  scenario: UniversityResearchCandidateScenario,
  reconciliationRequest: CourseSourceReconciliationRequestV1,
): Promise<UniversityTodayRequestV1> {
  const token = scenarioToken(scenario);
  const scope = scopeFor(packId, scenario);
  const worldRef = reviewedWorldRefFor(scenario);
  const revisionId = `path-revision.${token}.accepted`;
  const nodeId = `path-node.${token}.action`;
  const pathRevision = await createLearningPathRevision({
    schemaVersion: "learning-path-revision.v1",
    pathId: scenario.path.pathRef,
    revisionId,
    revisionNumber: 2,
    goalRef: { goalId: `goal.${token}` },
    planKind: "grounded_learning",
    status: "accepted",
    title: scenario.path.actionTitle,
    authority: {
      kind: "reviewed_world",
      executionEligible: true,
      reviewStatus: "reviewed",
      worldRef,
    },
    nodes: [{
      nodeId,
      position: 0,
      title: scenario.path.actionTitle,
      objective:
        "Work from the copied synthetic facts while preserving their authority ceiling.",
      prerequisiteNodeIds: [],
      authority: {
        kind: "reviewed_world",
        executionEligible: true,
        reviewStatus: "reviewed",
        worldRef,
      },
      activity: {
        activityId: `activity.${token}.study`,
        kind: "reviewed_world_activity",
        runnable: true,
        worldRef,
      },
    }],
    sourcePlanDigest: `sha256:${"c".repeat(64)}`,
    executionAllowed: true,
    acceptanceDecisionId: `path-decision.${token}.accept`,
    supersedesRevisionId: `path-revision.${token}.candidate`,
    createdAt: addMinutes(scenario.context.asOf, -180),
  });
  const activityStatus = {
    accepted_active: "ready",
    accepted_complete: "completed",
    accepted_blocked: "blocked",
  } as const;
  const activityState: ActivityStateV1 = {
    schemaVersion: "activity-state.v1",
    pathId: scenario.path.pathRef,
    pathRevisionId: revisionId,
    nodeId,
    stateVersion: scenario.path.state === "accepted_active" ? 1 : 2,
    status: activityStatus[scenario.path.state],
    updatedAt: addMinutes(scenario.context.asOf, -30),
  };

  return {
    schemaVersion: "university-today-request.v1",
    context: {
      schemaVersion: "university-term-context.v1",
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: `goal.${token}`,
        storageClass: "learner-owned-device-local",
      },
      scope,
      asOf: scenario.context.asOf,
      termLabel: scenario.context.termLabel,
      courseLabel: scenario.context.courseLabel,
      timeZone: scenario.context.timeZone,
      studyWindow: {
        startsAt: scenario.context.asOf,
        endsAt: addMinutes(scenario.context.asOf, 240),
        availableMinutes: scenario.capacity.availableMinutes,
        energy: scenario.capacity.availableMinutes
            < scenario.capacity.effortMinutesLow
          ? "low"
          : "steady",
        declaredBy: "learner_fixture",
      },
      effortEstimate: {
        pathId: scenario.path.pathRef,
        pathRevisionId: revisionId,
        nodeId,
        minutesLow: scenario.capacity.effortMinutesLow,
        minutesHigh: scenario.capacity.effortMinutesHigh,
        basis: "fixture_authored",
      },
    },
    reconciliationRequest,
    pathRevision,
    activityStates: [activityState],
  };
}

function recoveryRequestFor(
  scenario: UniversityResearchCandidateScenario,
  todayRequest: UniversityTodayRequestV1,
  reconciliationRequest: CourseSourceReconciliationRequestV1,
): UniversityRecoveryRequestV1 {
  const token = scenarioToken(scenario);
  const primaryCandidate = reconciliationRequest.candidates[0];
  if (!primaryCandidate) return fail("scenario.semantic_drift");

  return {
    schemaVersion: "university-recovery-request.v1",
    scope: {
      ownerUserId: todayRequest.context.scope.ownerUserId,
      tenantId: todayRequest.context.scope.tenantId,
      termId: todayRequest.context.scope.termId,
    },
    asOf: scenario.context.asOf,
    termLabel: scenario.context.termLabel,
    timeZone: scenario.context.timeZone,
    declaredChange: {
      kind: "capacity_changed",
      declaredBy: "learner_fixture",
    },
    recoveryWindow: {
      startsAt: scenario.context.asOf,
      endsAt: addMinutes(scenario.context.asOf, 240),
      availableMinutes: scenario.capacity.availableMinutes,
      bufferMinutes: 0,
      declaredBy: "learner_fixture",
    },
    courses: [{
      courseId: scenario.context.courseRef,
      courseLabel: scenario.context.courseLabel,
      reconciliationRequest,
    }],
    items: [{
      schemaVersion: "university-recovery-item.v1",
      itemId: `recovery-item.${token}.deadline`,
      courseId: scenario.context.courseRef,
      deadlineCandidateId: primaryCandidate.candidateId,
      learnerDisposition: "required",
      learningEssential: {
        value: true,
        declaredBy: "learner_fixture",
      },
      effort: {
        minutesLow: scenario.capacity.effortMinutesLow,
        minutesHigh: scenario.capacity.effortMinutesHigh,
        basis: "fixture_authored",
      },
      dependencyItemIds: [],
      humanRoute: {
        owner: "instructor",
        declaredBy: "learner_fixture",
      },
    }],
  };
}

async function rawRequestFor(
  packId: UniversityResearchCandidatePackId,
  scenario: UniversityResearchCandidateScenario,
): Promise<Readonly<UniversitySemesterLoopRequestV1>> {
  const reconciliationRequest = sourceRequestFor(packId, scenario);
  const todayRequest = await todayRequestFor(
    packId,
    scenario,
    reconciliationRequest,
  );
  const recoveryRequest = recoveryRequestFor(
    scenario,
    todayRequest,
    reconciliationRequest,
  );
  const worldPack = worldPackFor(scenario.world.suppliedWorldRef);

  return deepFreeze({
    schemaVersion: "university-semester-loop-request.v1",
    todayRequest,
    recoveryRequest,
    worldPack,
  });
}

function hasNoEffectAuthority(
  projection: UniversitySemesterLoopProjectionV1,
): boolean {
  return projection.authority.persistenceAllowed === false
    && projection.authority.eventEmissionAllowed === false
    && projection.authority.messageSendAllowed === false
    && projection.authority.sessionStartAllowed === false
    && projection.authority.externalSideEffectsAllowed === false
    && projection.today?.authority.persistenceAllowed === false
    && projection.today.authority.eventEmissionAllowed === false
    && projection.today.authority.sessionStartAllowed === false
    && projection.today.authority.externalSideEffectsAllowed === false
    && (projection.recoveryDraft === null
      || (
        projection.recoveryDraft.authority.persistenceAllowed === false
        && projection.recoveryDraft.authority.eventEmissionAllowed === false
        && projection.recoveryDraft.authority.messageSendAllowed === false
        && projection.recoveryDraft.authority.externalSideEffectsAllowed
          === false
      ))
    && (projection.protectedStudy === null
      || (
        projection.protectedStudy.authority.persistenceAllowed === false
        && projection.protectedStudy.authority.eventEmissionAllowed === false
        && projection.protectedStudy.authority.sessionStartAllowed === false
        && projection.protectedStudy.authority.externalSideEffectsAllowed
          === false
      ));
}

function assertProjectionSemantics(
  scenario: UniversityResearchCandidateScenario,
  projection: Readonly<UniversitySemesterLoopProjectionV1>,
): void {
  if (
    projection.status === "invalid"
    || projection.projectionDigest === null
    || projection.today === null
  ) fail("projection.invalid");

  const deadlineEntry = projection.today.source?.facts.find(
    (entry) => entry.fact.kind === "deadline",
  );
  const deadline = deadlineEntry?.fact.kind === "deadline"
    ? deadlineEntry.fact
    : null;
  const pathMatches = projection.today.pathState?.pathId
    === scenario.path.pathRef;
  const activeActionMatches = scenario.path.state !== "accepted_active"
    ? projection.today.action === null
    : projection.status === "source_review_required"
      ? projection.today.action === null
      : (
      projection.today.action?.title === scenario.path.actionTitle
      && projection.today.action.selectedFromCourseSourceFacts === false
      && projection.today.action.startAllowedFromThisProjection === false
      );
  const sourceMatches =
    projection.today.source?.unresolvedConflictCount
      === scenario.source.conflictCount;
  const deadlineMatches = scenario.source.state === "reviewed_copy"
    ? deadline?.title === scenario.deadline.title
      && deadline.dueAt === scenario.deadline.at
    : deadline === null;
  const worldMatches = scenario.world.state === "exact_binding"
    ? projection.protectedStudy?.status === "ready"
      && projection.protectedStudy.world?.id
        === scenario.world.suppliedWorldRef
    : scenario.world.state === "binding_changed"
      ? projection.protectedStudy?.status === "world_mismatch"
      : projection.protectedStudy === null;

  if (
    projection.scope?.termId !== scenario.context.termRef
    || projection.scope.courseId !== scenario.context.courseRef
    || projection.asOf !== scenario.context.asOf
    || projection.termLabel !== scenario.context.termLabel
    || projection.courseLabel !== scenario.context.courseLabel
    || projection.timeZone !== scenario.context.timeZone
    || !sourceMatches
    || !deadlineMatches
    || projection.today.capacity?.availableMinutes
      !== scenario.capacity.availableMinutes
    || projection.today.capacity.effortMinutesLow
      !== scenario.capacity.effortMinutesLow
    || projection.today.capacity.effortMinutesHigh
      !== scenario.capacity.effortMinutesHigh
    || !pathMatches
    || !activeActionMatches
    || !worldMatches
  ) fail("projection.semantic_mismatch");

  if (!hasNoEffectAuthority(projection)) {
    fail("projection.authority_mismatch");
  }

  // The expected outcome cannot shape any raw child request. It is consulted
  // only after every child and the semester-loop compositor have recomputed.
  if (projection.status !== scenario.expectedStatus) {
    fail("projection.status_mismatch");
  }
}

async function domainDigest(
  digestDomain: string,
  value: unknown,
): Promise<string> {
  return sha256Digest(canonicalJson({ digestDomain, value }));
}

/**
 * Compiles one frozen authored scenario into the existing raw semester-loop
 * boundary. Callers can select only a known pack/scenario identity; they
 * cannot supply facts, child projections, readiness flags, or expected
 * outcomes. The raw request is reduced to a digest before returning.
 */
export async function compileUniversityResearchCandidateScenario(
  packIdInput: unknown,
  scenarioIdInput: unknown,
): Promise<Readonly<UniversityResearchCandidateCompilationV1>> {
  const pack = selectPack(packIdInput);
  const scenario = selectScenario(pack, scenarioIdInput);
  assertScenarioSemantics(scenario);

  const rawRequest = await rawRequestFor(pack.packId, scenario);
  const [
    projection,
    compilerDigest,
    packDigest,
    scenarioDigest,
    rawFixtureDigest,
  ] = await Promise.all([
    projectUniversitySemesterLoop(rawRequest),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
      UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
      pack,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenario,
      scenario,
    ),
    domainDigest(
      UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateFixture,
      rawRequest,
    ),
  ]);
  assertProjectionSemantics(scenario, projection);

  const projectionDigest = projection.projectionDigest!;
  const bindingDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
    {
      compilerDigest,
      packDigest,
      scenarioDigest,
      rawFixtureDigest,
      projectionDigest,
    },
  );

  return deepFreeze({
    schemaVersion:
      UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION,
    compilerId: UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID,
    packId: pack.packId,
    scenarioId: scenario.scenarioId,
    scenario,
    projection,
    digests: {
      compilerDigest,
      packDigest,
      scenarioDigest,
      rawFixtureDigest,
      projectionDigest,
      bindingDigest,
    },
    authority: COMPILATION_AUTHORITY,
  });
}
