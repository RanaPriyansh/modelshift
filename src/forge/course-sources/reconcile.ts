import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  COURSE_SOURCE_GOAL_CONTEXT_SCHEMA_VERSION,
  courseSourceGoalRefSchema,
  courseSourceReconciliationRequestSchema,
  type CourseSourceCandidateV1,
  type CourseSourceCoverageDeclarationV1,
  type CourseSourceDecisionV1,
  type CourseSourceFactV1,
  type CourseSourceGoalRefV1,
  type CourseSourceLocatorV1,
  type CourseSourceReconciliationRequestV1,
  type CourseSourceRevisionV1,
  type CourseSourceScopeV1,
} from "./contracts";

export const COURSE_SOURCE_ISSUE_CODES = [
  "schema.invalid",
  "revision.scope_mismatch",
  "revision.observed_in_future",
  "candidate.scope_mismatch",
  "candidate.source_missing",
  "candidate.locator_kind_mismatch",
  "candidate.created_before_source",
  "candidate.created_in_future",
  "decision.scope_mismatch",
  "decision.candidate_missing",
  "decision.duplicate_for_candidate",
  "decision.before_candidate",
  "decision.decided_in_future",
  "decision.corrected_fact_kind_mismatch",
] as const;

const COURSE_SOURCE_SNAPSHOT_OPTIONS = {
  allowNullPrototypeObjects: true,
} as const;
const MAX_RETURNED_SCHEMA_ISSUES = 64;

export type CourseSourceIssueCode = (typeof COURSE_SOURCE_ISSUE_CODES)[number];

export interface CourseSourceIssue {
  readonly code: CourseSourceIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface CourseSourceFreshnessProjection {
  readonly sourceRevisionId: string;
  readonly state: "current_within_declared_window" | "stale" | "unknown";
  readonly observedAt: string;
  readonly freshnessReviewDueAt: string | null;
}

export interface CourseSourceCandidateProjection {
  readonly candidateId: string;
  readonly sourceRevisionId: string;
  readonly claimKey: string;
  readonly locator: CourseSourceLocatorV1;
  readonly extractedBy: CourseSourceCandidateV1["extractedBy"];
  readonly createdAt: string;
  readonly decisionId: string | null;
  readonly extractionState: "candidate" | "learner_confirmed" | "learner_corrected" | "learner_rejected";
  readonly originalFact: CourseSourceFactV1;
  readonly effectiveFact: CourseSourceFactV1 | null;
  readonly factAuthority:
    | "learner_connected_source_copy_candidate"
    | "learner_connected_source_copy"
    | "student_entered_correction"
    | "none";
  readonly sourceAuthenticity: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly institutionalPolicyAuthorization: "not_established";
  readonly effectiveAssessmentMode: "restricted_assessment" | null;
}

export interface CourseSourceDuplicateGroup {
  readonly groupKey: string;
  readonly claimKey: string;
  readonly candidateIds: readonly string[];
  readonly canonicalFactDigest: string;
  readonly resolution: "learner_review_required";
}

export interface CourseSourceConflictGroup {
  readonly groupKey: string;
  readonly claimKey: string;
  readonly candidateIds: readonly string[];
  readonly canonicalFactDigests: readonly string[];
  readonly resolution: "learner_or_authorized_human_required";
}

export interface CourseSourceReconciliationResult {
  readonly schemaVersion: "course-source-reconciliation-result.v1";
  readonly status: "invalid" | "review_required" | "connected_sources_reviewed";
  readonly scope: CourseSourceScopeV1 | null;
  readonly asOf: string | null;
  readonly authority: {
    readonly identityScopeAuthority: "caller_asserted_fixture_only";
    readonly tenantIsolationAuthority: "not_established";
    readonly rightsEnforcementAuthority: "not_established";
    readonly sourceClass: "learner_connected_source_copy";
    readonly sourceAuthenticity: "not_established";
    readonly institutionalCompleteness: "not_established";
    readonly publicationAuthority: "not_established";
    readonly durableStorageAuthority: "not_established";
    readonly persistenceAllowed: false;
    readonly eventEmissionAllowed: false;
    readonly externalSideEffectsAllowed: false;
  };
  readonly coverage: {
    readonly state: "unknown" | "partial" | "connected_sources_reviewed";
    readonly institutionalCompleteness: "not_established";
    readonly declarations: readonly {
      readonly sourceRevisionId: string;
      readonly coverage: CourseSourceCoverageDeclarationV1;
    }[];
  };
  readonly freshness: readonly CourseSourceFreshnessProjection[];
  readonly sources: readonly CourseSourceRevisionV1[];
  readonly candidates: readonly CourseSourceCandidateProjection[];
  readonly duplicateGroups: readonly CourseSourceDuplicateGroup[];
  readonly conflicts: readonly CourseSourceConflictGroup[];
  readonly contextCandidateIds: readonly string[];
  readonly issues: readonly CourseSourceIssue[];
  readonly projectionDigest: string | null;
}

export interface CourseSourceGoalContextV1 {
  readonly schemaVersion: typeof COURSE_SOURCE_GOAL_CONTEXT_SCHEMA_VERSION;
  readonly goalRef: CourseSourceGoalRefV1;
  readonly scope: CourseSourceScopeV1;
  readonly sourceProjectionDigest: string;
  readonly authority: "candidate_unverified";
  readonly scopeAuthority: "caller_asserted_fixture_only";
  readonly coverageState: CourseSourceReconciliationResult["coverage"]["state"];
  readonly sourceAuthenticity: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly facts: readonly {
    readonly candidateId: string;
    readonly sourceRevisionId: string;
    readonly claimKey: string;
    readonly fact: CourseSourceFactV1;
    readonly factAuthority: "learner_connected_source_copy" | "student_entered_correction";
    readonly effectiveAssessmentMode: "restricted_assessment" | null;
  }[];
  readonly executionAllowed: false;
  readonly recommendationAllowed: false;
  readonly pathActivationAllowed: false;
}

export interface CourseSourceGoalContextResult {
  readonly status: "available" | "unavailable";
  readonly reconciliation: CourseSourceReconciliationResult;
  readonly context: CourseSourceGoalContextV1 | null;
  readonly issues: readonly CourseSourceIssue[];
}

const AUTHORITY_CEILING = deepFreeze({
  identityScopeAuthority: "caller_asserted_fixture_only" as const,
  tenantIsolationAuthority: "not_established" as const,
  rightsEnforcementAuthority: "not_established" as const,
  sourceClass: "learner_connected_source_copy" as const,
  sourceAuthenticity: "not_established" as const,
  institutionalCompleteness: "not_established" as const,
  publicationAuthority: "not_established" as const,
  durableStorageAuthority: "not_established" as const,
  persistenceAllowed: false as const,
  eventEmissionAllowed: false as const,
  externalSideEffectsAllowed: false as const,
});

function sameScope(left: CourseSourceScopeV1, right: CourseSourceScopeV1): boolean {
  return left.ownerUserId === right.ownerUserId
    && left.tenantId === right.tenantId
    && left.termId === right.termId
    && left.courseId === right.courseId;
}

function issue(
  issues: CourseSourceIssue[],
  code: CourseSourceIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function orderedIssues(issues: readonly CourseSourceIssue[]): CourseSourceIssue[] {
  return [...issues].sort((left, right) => {
    const code = left.code.localeCompare(right.code);
    return code !== 0 ? code : left.path.localeCompare(right.path);
  });
}

function structuralRequest(value: unknown): {
  readonly request: CourseSourceReconciliationRequestV1 | null;
  readonly issues: readonly CourseSourceIssue[];
} {
  const parsed = courseSourceReconciliationRequestSchema.safeParse(value);
  if (parsed.success) return { request: parsed.data, issues: [] };
  return {
    request: null,
    issues: parsed.error.issues.slice(0, MAX_RETURNED_SCHEMA_ISSUES).map((entry) => ({
      code: "schema.invalid",
      path: entry.path.join("."),
      message: entry.message,
    })),
  };
}

function validateSemantics(request: CourseSourceReconciliationRequestV1): CourseSourceIssue[] {
  const issues: CourseSourceIssue[] = [];
  const asOf = Date.parse(request.asOf);
  const revisions = new Map(request.sourceRevisions.map((revision) => [revision.revisionId, revision]));
  const candidates = new Map(request.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const decisionsByCandidate = new Map<string, CourseSourceDecisionV1>();

  request.sourceRevisions.forEach((revision, index) => {
    if (!sameScope(revision.scope, request.scope)) {
      issue(issues, "revision.scope_mismatch", `sourceRevisions.${index}.scope`, "The source revision is outside the requested owner, tenant, term, or course.");
    }
    if (Date.parse(revision.observedAt) > asOf) {
      issue(issues, "revision.observed_in_future", `sourceRevisions.${index}.observedAt`, "The source revision was observed after the reconciliation time.");
    }
  });

  request.candidates.forEach((candidate, index) => {
    if (!sameScope(candidate.scope, request.scope)) {
      issue(issues, "candidate.scope_mismatch", `candidates.${index}.scope`, "The candidate is outside the requested owner, tenant, term, or course.");
    }
    const revision = revisions.get(candidate.sourceRevisionId);
    if (!revision) {
      issue(issues, "candidate.source_missing", `candidates.${index}.sourceRevisionId`, "The candidate source revision is missing.");
    } else {
      const locatorMatches = (
        revision.inputKind === "manual" && candidate.locator.kind === "manual_field"
      ) || (
        revision.inputKind === "ics" && candidate.locator.kind === "ics_component"
      );
      if (!locatorMatches) {
        issue(issues, "candidate.locator_kind_mismatch", `candidates.${index}.locator`, "The locator kind does not match the source input kind.");
      }
      if (Date.parse(candidate.createdAt) < Date.parse(revision.observedAt)) {
        issue(issues, "candidate.created_before_source", `candidates.${index}.createdAt`, "The candidate predates its source observation.");
      }
    }
    if (Date.parse(candidate.createdAt) > asOf) {
      issue(issues, "candidate.created_in_future", `candidates.${index}.createdAt`, "The candidate was created after the reconciliation time.");
    }
  });

  request.decisions.forEach((decision, index) => {
    if (!sameScope(decision.scope, request.scope)) {
      issue(issues, "decision.scope_mismatch", `decisions.${index}.scope`, "The decision is outside the requested owner, tenant, term, or course.");
    }
    const candidate = candidates.get(decision.candidateId);
    if (!candidate) {
      issue(issues, "decision.candidate_missing", `decisions.${index}.candidateId`, "The decision candidate is missing.");
    } else {
      if (Date.parse(decision.decidedAt) < Date.parse(candidate.createdAt)) {
        issue(issues, "decision.before_candidate", `decisions.${index}.decidedAt`, "The decision predates its candidate.");
      }
      if (decision.kind === "correct" && decision.correctedFact.kind !== candidate.fact.kind) {
        issue(
          issues,
          "decision.corrected_fact_kind_mismatch",
          `decisions.${index}.correctedFact.kind`,
          "A correction may revise a fact but cannot change its fact kind.",
        );
      }
    }
    if (Date.parse(decision.decidedAt) > asOf) {
      issue(issues, "decision.decided_in_future", `decisions.${index}.decidedAt`, "The decision occurred after the reconciliation time.");
    }
    if (decisionsByCandidate.has(decision.candidateId)) {
      issue(issues, "decision.duplicate_for_candidate", `decisions.${index}.candidateId`, "A candidate may have only one decision in this contract version.");
    } else {
      decisionsByCandidate.set(decision.candidateId, decision);
    }
  });

  return orderedIssues(issues);
}

function freshnessProjection(
  revision: CourseSourceRevisionV1,
  asOf: string,
): CourseSourceFreshnessProjection {
  const state = revision.freshnessReviewDueAt === null
    ? "unknown"
    : Date.parse(asOf) >= Date.parse(revision.freshnessReviewDueAt)
      ? "stale"
      : "current_within_declared_window";
  return {
    sourceRevisionId: revision.revisionId,
    state,
    observedAt: revision.observedAt,
    freshnessReviewDueAt: revision.freshnessReviewDueAt,
  };
}

function combinedCoverage(
  revisions: readonly CourseSourceRevisionV1[],
): CourseSourceReconciliationResult["coverage"] {
  const states = revisions.map((revision) => revision.coverage.status);
  const state = states.includes("unknown")
    ? "unknown"
    : states.includes("partial")
      ? "partial"
      : "connected_sources_reviewed";
  return {
    state,
    institutionalCompleteness: "not_established",
    declarations: revisions
      .map((revision) => ({
        sourceRevisionId: revision.revisionId,
        coverage: revision.coverage,
      }))
      .sort((left, right) => left.sourceRevisionId.localeCompare(right.sourceRevisionId)),
  };
}

function candidateProjection(
  candidate: CourseSourceCandidateV1,
  decision: CourseSourceDecisionV1 | undefined,
): CourseSourceCandidateProjection {
  const policy = candidate.fact.kind === "assessment_assistance_policy";
  if (!decision) {
    return {
      candidateId: candidate.candidateId,
      sourceRevisionId: candidate.sourceRevisionId,
      claimKey: candidate.claimKey,
      locator: candidate.locator,
      extractedBy: candidate.extractedBy,
      createdAt: candidate.createdAt,
      decisionId: null,
      extractionState: "candidate",
      originalFact: candidate.fact,
      effectiveFact: candidate.fact,
      factAuthority: "learner_connected_source_copy_candidate",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      institutionalPolicyAuthorization: "not_established",
      effectiveAssessmentMode: policy ? "restricted_assessment" : null,
    };
  }
  if (decision.kind === "reject") {
    return {
      candidateId: candidate.candidateId,
      sourceRevisionId: candidate.sourceRevisionId,
      claimKey: candidate.claimKey,
      locator: candidate.locator,
      extractedBy: candidate.extractedBy,
      createdAt: candidate.createdAt,
      decisionId: decision.decisionId,
      extractionState: "learner_rejected",
      originalFact: candidate.fact,
      effectiveFact: null,
      factAuthority: "none",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      institutionalPolicyAuthorization: "not_established",
      effectiveAssessmentMode: policy ? "restricted_assessment" : null,
    };
  }
  const corrected = decision.kind === "correct";
  return {
    candidateId: candidate.candidateId,
    sourceRevisionId: candidate.sourceRevisionId,
    claimKey: candidate.claimKey,
    locator: candidate.locator,
    extractedBy: candidate.extractedBy,
    createdAt: candidate.createdAt,
    decisionId: decision.decisionId,
    extractionState: corrected ? "learner_corrected" : "learner_confirmed",
    originalFact: candidate.fact,
    effectiveFact: corrected ? decision.correctedFact : candidate.fact,
    factAuthority: corrected ? "student_entered_correction" : "learner_connected_source_copy",
    sourceAuthenticity: "not_established",
    institutionalCompleteness: "not_established",
    institutionalPolicyAuthorization: "not_established",
    effectiveAssessmentMode: policy ? "restricted_assessment" : null,
  };
}

async function factDigest(fact: CourseSourceFactV1): Promise<string> {
  return sha256Digest(canonicalJson(fact));
}

async function groupCandidateFacts(
  candidates: readonly CourseSourceCandidateProjection[],
): Promise<{
  readonly duplicateGroups: CourseSourceDuplicateGroup[];
  readonly conflicts: CourseSourceConflictGroup[];
}> {
  const byClaim = new Map<string, CourseSourceCandidateProjection[]>();
  candidates.forEach((candidate) => {
    if (candidate.effectiveFact === null) return;
    const values = byClaim.get(candidate.claimKey) ?? [];
    values.push(candidate);
    byClaim.set(candidate.claimKey, values);
  });

  const duplicateGroups: CourseSourceDuplicateGroup[] = [];
  const conflicts: CourseSourceConflictGroup[] = [];

  for (const [claimKey, entries] of [...byClaim.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (entries.length < 2) continue;
    const digestEntries = await Promise.all(entries.map(async (entry) => ({
      candidateId: entry.candidateId,
      digest: await factDigest(entry.effectiveFact!),
    })));
    const digests = [...new Set(digestEntries.map((entry) => entry.digest))].sort();
    const candidateIds = digestEntries.map((entry) => entry.candidateId).sort();
    if (digests.length === 1) {
      duplicateGroups.push({
        groupKey: `duplicate:${claimKey}`,
        claimKey,
        candidateIds,
        canonicalFactDigest: digests[0]!,
        resolution: "learner_review_required",
      });
    } else {
      conflicts.push({
        groupKey: `conflict:${claimKey}`,
        claimKey,
        candidateIds,
        canonicalFactDigests: digests,
        resolution: "learner_or_authorized_human_required",
      });
    }
  }
  return { duplicateGroups, conflicts };
}

function invalidResult(issues: readonly CourseSourceIssue[]): Readonly<CourseSourceReconciliationResult> {
  return deepFreeze({
    schemaVersion: "course-source-reconciliation-result.v1",
    status: "invalid",
    scope: null,
    asOf: null,
    authority: AUTHORITY_CEILING,
    coverage: {
      state: "unknown",
      institutionalCompleteness: "not_established",
      declarations: [],
    },
    freshness: [],
    sources: [],
    candidates: [],
    duplicateGroups: [],
    conflicts: [],
    contextCandidateIds: [],
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

async function reconcileCourseSourceSnapshot(
  snapshot: unknown,
): Promise<Readonly<CourseSourceReconciliationResult>> {
  const structural = structuralRequest(snapshot);
  if (structural.request === null) return invalidResult(structural.issues);

  const request = structural.request;
  const semanticIssues = validateSemantics(request);
  if (semanticIssues.length > 0) return invalidResult(semanticIssues);

  const decisions = new Map(request.decisions.map((decision) => [decision.candidateId, decision]));
  const candidates = request.candidates
    .map((candidate) => candidateProjection(candidate, decisions.get(candidate.candidateId)))
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const { duplicateGroups, conflicts } = await groupCandidateFacts(candidates);
  const blockedCandidateIds = new Set([
    ...duplicateGroups.flatMap((group) => group.candidateIds),
    ...conflicts.flatMap((group) => group.candidateIds),
  ]);
  const contextCandidateIds = candidates
    .filter((candidate) => (
      (candidate.extractionState === "learner_confirmed" || candidate.extractionState === "learner_corrected")
      && candidate.effectiveFact !== null
      && !blockedCandidateIds.has(candidate.candidateId)
    ))
    .map((candidate) => candidate.candidateId);
  const freshness = request.sourceRevisions
    .map((revision) => freshnessProjection(revision, request.asOf))
    .sort((left, right) => left.sourceRevisionId.localeCompare(right.sourceRevisionId));
  const sources = [...request.sourceRevisions]
    .sort((left, right) => left.revisionId.localeCompare(right.revisionId));
  const coverage = combinedCoverage(request.sourceRevisions);
  const needsReview = candidates.some((candidate) => candidate.extractionState === "candidate")
    || duplicateGroups.length > 0
    || conflicts.length > 0
    || freshness.some((entry) => entry.state !== "current_within_declared_window")
    || coverage.state !== "connected_sources_reviewed";

  const unsigned = {
    schemaVersion: "course-source-reconciliation-result.v1" as const,
    status: needsReview ? "review_required" as const : "connected_sources_reviewed" as const,
    scope: request.scope,
    asOf: request.asOf,
    authority: AUTHORITY_CEILING,
    coverage,
    freshness,
    sources,
    candidates,
    duplicateGroups,
    conflicts,
    contextCandidateIds,
    issues: [] as const,
  };
  return deepFreeze({
    ...unsigned,
    projectionDigest: await sha256Digest(canonicalJson(unsigned)),
  });
}

export async function reconcileCourseSources(
  value: unknown,
): Promise<Readonly<CourseSourceReconciliationResult>> {
  let snapshot: unknown;
  try {
    snapshot = boundedJsonSnapshot(value, COURSE_SOURCE_SNAPSHOT_OPTIONS);
  } catch {
    return invalidResult([{
      code: "schema.invalid",
      path: "",
      message: "The reconciliation request must contain only bounded, accessor-free JSON data.",
    }]);
  }
  return reconcileCourseSourceSnapshot(snapshot);
}

export async function buildCourseSourceGoalContext(input: {
  readonly goalRef: unknown;
  readonly reconciliationRequest: unknown;
}): Promise<Readonly<CourseSourceGoalContextResult>> {
  let snapshot: unknown;
  try {
    snapshot = boundedJsonSnapshot(input, COURSE_SOURCE_SNAPSHOT_OPTIONS);
  } catch {
    const issues: CourseSourceIssue[] = [{
      code: "schema.invalid",
      path: "",
      message: "The goal-context request must contain only bounded, accessor-free JSON data.",
    }];
    return deepFreeze({
      status: "unavailable",
      reconciliation: invalidResult(issues),
      context: null,
      issues,
    });
  }

  const snapshotRecord = (
    snapshot !== null
    && typeof snapshot === "object"
    && !Array.isArray(snapshot)
  ) ? snapshot as Record<string, unknown> : {};
  const wrapperKeys = Reflect.ownKeys(snapshotRecord);
  if (
    wrapperKeys.length !== 2
    || !Object.hasOwn(snapshotRecord, "goalRef")
    || !Object.hasOwn(snapshotRecord, "reconciliationRequest")
  ) {
    const issues: CourseSourceIssue[] = [{
      code: "schema.invalid",
      path: "",
      message: "The goal-context request must contain exactly goalRef and reconciliationRequest.",
    }];
    return deepFreeze({
      status: "unavailable",
      reconciliation: invalidResult(issues),
      context: null,
      issues,
    });
  }
  const reconciliation = await reconcileCourseSourceSnapshot(snapshotRecord.reconciliationRequest);
  const parsedGoal = courseSourceGoalRefSchema.safeParse(snapshotRecord.goalRef);
  if (!parsedGoal.success) {
    const issues: CourseSourceIssue[] = parsedGoal.error.issues.slice(0, MAX_RETURNED_SCHEMA_ISSUES).map((entry) => ({
      code: "schema.invalid",
      path: `goalRef.${entry.path.join(".")}`,
      message: entry.message,
    }));
    return deepFreeze({
      status: "unavailable",
      reconciliation,
      context: null,
      issues: orderedIssues([...reconciliation.issues, ...issues]),
    });
  }
  if (
    reconciliation.status === "invalid"
    || reconciliation.scope === null
    || reconciliation.projectionDigest === null
  ) {
    return deepFreeze({
      status: "unavailable",
      reconciliation,
      context: null,
      issues: reconciliation.issues,
    });
  }

  const contextIds = new Set(reconciliation.contextCandidateIds);
  const facts = reconciliation.candidates
    .filter((candidate) => contextIds.has(candidate.candidateId))
    .map((candidate) => ({
      candidateId: candidate.candidateId,
      sourceRevisionId: candidate.sourceRevisionId,
      claimKey: candidate.claimKey,
      fact: candidate.effectiveFact!,
      factAuthority: candidate.factAuthority as "learner_connected_source_copy" | "student_entered_correction",
      effectiveAssessmentMode: candidate.effectiveAssessmentMode,
    }));

  return deepFreeze({
    status: "available",
    reconciliation,
    context: {
      schemaVersion: COURSE_SOURCE_GOAL_CONTEXT_SCHEMA_VERSION,
      goalRef: parsedGoal.data,
      scope: reconciliation.scope,
      sourceProjectionDigest: reconciliation.projectionDigest,
      authority: "candidate_unverified",
      scopeAuthority: "caller_asserted_fixture_only",
      coverageState: reconciliation.coverage.state,
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      facts,
      executionAllowed: false,
      recommendationAllowed: false,
      pathActivationAllowed: false,
    },
    issues: [],
  });
}
