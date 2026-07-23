import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  FIRST_PILOT_PROJECT_TEMPLATE,
  delayedReturnEventSchema,
  delayedReturnPolicyContentDigest,
  delayedReturnScheduleDigest,
  delayedReturnScheduleSchema,
  practicalProjectAttemptDigest,
  practicalProjectAttemptSchema,
  practicalProjectContentDigest,
  practicalProjectDigest,
  practicalProjectPackageSchema,
  projectCompletionEventDigest,
  projectCompletionEventSchema,
  resolveAuthoredProjectTemplate,
  strictProjectTimestampSchema,
  type DelayedReturnEventV1,
  type DelayedReturnScheduleV1,
  type PracticalProjectAttemptV1,
  type PracticalProjectPackageV1,
} from "./contracts";
import {
  verifyProjectFixtureGrant,
  type ProjectFixtureGrant,
} from "./fixture-authority";

export type ProjectValidationIssue = Readonly<{ code: string; path: string; message: string }>;

export type PracticalProjectValidationContext = Readonly<{
  evaluationAt: string;
  safetyReviewGrant?: ProjectFixtureGrant;
  returnPolicyReviewGrant?: ProjectFixtureGrant;
}>;

export type PracticalProjectValidationResult = Readonly<{
  project: Readonly<PracticalProjectPackageV1> | null;
  issues: readonly ProjectValidationIssue[];
  runtimeAssignmentAuthority: "fixture-only";
  runtimeAssignmentAllowed: false;
  proofAuthority: false;
}>;

export type ProjectAttemptEvaluationContext = PracticalProjectValidationContext & Readonly<{
  learnerProvenanceGrants: readonly ProjectFixtureGrant[];
}>;

export type ProjectAttemptEvaluation = Readonly<{
  attempt: Readonly<PracticalProjectAttemptV1> | null;
  issues: readonly ProjectValidationIssue[];
  protectedProofStatus: "invalid" | "incomplete" | "contaminated" | "complete-self-declared-unverified";
  capabilityClaimIssued: false;
  autonomousScoreIssued: false;
  autonomousMasteryClaimIssued: false;
  proofAuthority: false;
}>;

export type DelayedReturnScheduleCompilation = Readonly<{
  schedule: Readonly<DelayedReturnScheduleV1> | null;
  issues: readonly ProjectValidationIssue[];
  schedulingAuthority: false;
}>;

export type DelayedReturnProjection = Readonly<{
  state: "scheduled" | "due" | "completed" | "untested" | "invalid";
  schedule: Readonly<DelayedReturnScheduleV1> | null;
  event: Readonly<DelayedReturnEventV1> | null;
  issues: readonly ProjectValidationIssue[];
  retainedClaimIssued: false;
  capabilityClaimIssued: false;
}>;

type MutableIssue = { code: string; path: string; message: string };

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stable(issues: readonly MutableIssue[]): readonly ProjectValidationIssue[] {
  return deepFreeze([...issues]
    .map((issue) => ({ ...issue }))
    .sort((left, right) => compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message)));
}

function add(issues: MutableIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function schemaIssues(error: { issues: readonly { code: string; path: readonly PropertyKey[]; message: string }[] }): MutableIssue[] {
  return error.issues.map((issue) => ({
    code: `schema.${issue.code}`,
    path: issue.path.map(String).join(".") || "root",
    message: issue.message,
  }));
}

function capabilityKey(entry: { curriculumNodeId: string; capabilityId: string; capabilityVersion: string }): string {
  return `${entry.curriculumNodeId}@${entry.capabilityId}@${entry.capabilityVersion}`;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort(compare);
  const sortedRight = [...right].sort(compare);
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function contiguousSequences(entries: readonly { sequence: number }[]): boolean {
  return [...entries].map((entry) => entry.sequence).sort((left, right) => left - right).every((value, index) => value === index + 1);
}

function reviewIsCurrent(reviewedAt: string, expiresAt: string, evaluationAt: string): boolean {
  return strictProjectTimestampSchema.safeParse(evaluationAt).success
    && Date.parse(reviewedAt) <= Date.parse(evaluationAt)
    && Date.parse(expiresAt) > Date.parse(evaluationAt);
}

async function projectSemanticIssues(
  project: PracticalProjectPackageV1,
  context: PracticalProjectValidationContext,
  issues: MutableIssue[],
): Promise<void> {
  const manifestDigest = await sha256Digest(canonicalJson(FIRST_PILOT_PROJECT_TEMPLATE.content));
  const authoredManifest = resolveAuthoredProjectTemplate(project.authoredTemplateRef);
  if (
    !authoredManifest
    || manifestDigest !== FIRST_PILOT_PROJECT_TEMPLATE.digest
    || project.projectId !== FIRST_PILOT_PROJECT_TEMPLATE.projectId
    || project.version !== FIRST_PILOT_PROJECT_TEMPLATE.version
    || project.authoredTemplateRef.id !== FIRST_PILOT_PROJECT_TEMPLATE.id
    || project.authoredTemplateRef.version !== FIRST_PILOT_PROJECT_TEMPLATE.version
    || project.authoredTemplateRef.digest !== FIRST_PILOT_PROJECT_TEMPLATE.digest
    || canonicalJson(project.templateContent) !== canonicalJson(FIRST_PILOT_PROJECT_TEMPLATE.content)
  ) {
    add(issues, "project.authored-template-mismatch", "templateContent", "Project semantic content must be byte-equivalent under canonical JSON to the immutable authored fixture manifest.");
  }

  if (!contiguousSequences(project.templateContent.milestones)) {
    add(issues, "project.milestone-sequence-invalid", "templateContent.milestones", "Authored milestone sequence must be contiguous from one.");
  }
  if (!contiguousSequences(project.templateContent.critique.revisionRules)) {
    add(issues, "project.revision-sequence-invalid", "templateContent.critique.revisionRules", "Authored revision sequence must be contiguous from one.");
  }
  const approvedOperations = project.templateContent.approvedOperationIds;
  const requiredOperations = [
    ...project.templateContent.milestones.map((entry) => entry.operationId),
    ...project.templateContent.critique.roles.map((entry) => entry.operationId),
    ...project.templateContent.critique.revisionRules.map((entry) => entry.operationId),
    ...project.templateContent.proofOperations.map((entry) => entry.operationId),
  ];
  if (!sameSet(approvedOperations, [...new Set(requiredOperations)])) {
    add(issues, "project.operation-manifest-incomplete", "templateContent.approvedOperationIds", "Approved operations must exactly enumerate milestone and protected operations.");
  }
  const materialIds = project.templateContent.materials.map((entry) => entry.materialId);
  const substitutions = project.templateContent.noCostMaterialAlternative.substitutions.map((entry) => entry.originalMaterialId);
  if (!sameSet(materialIds, substitutions)) {
    add(issues, "project.no-cost-alternative-incomplete", "templateContent.noCostMaterialAlternative", "The immutable authored alternative must cover every material exactly once.");
  }

  const targetKeys = project.targetCapabilityRefs.map(capabilityKey);
  const prerequisiteKeys = project.prerequisiteCapabilityRefs.map(capabilityKey);
  if (targetKeys.some((key) => prerequisiteKeys.includes(key))) {
    add(issues, "project.target-prerequisite-overlap", "prerequisiteCapabilityRefs", "A capability cannot be both target and prerequisite.");
  }
  const routeKeys = project.prerequisiteRepairRoutes.map((route) => capabilityKey(route.prerequisiteCapabilityRef));
  if (!sameSet(prerequisiteKeys, routeKeys)) {
    add(issues, "project.repair-route-coverage", "prerequisiteRepairRoutes", "Every exact prerequisite must have one exact practice package reference.");
  }
  if (!targetKeys.includes(capabilityKey(project.proof.targetCapabilityRef))) {
    add(issues, "project.proof-target-mismatch", "proof.targetCapabilityRef", "Protected proof must target one exact project target.");
  }
  const defence = project.templateContent.proofOperations.find((entry) => entry.kind === "individual-defence");
  const transfer = project.templateContent.proofOperations.find((entry) => entry.kind === "unfamiliar-transfer");
  if (
    !defence
    || !transfer
    || project.proof.individualDefenceOperationId !== defence.operationId
    || project.proof.unfamiliarTransferOperationId !== transfer.operationId
  ) {
    add(issues, "project.protected-operation-mismatch", "proof", "Proof operation IDs must exactly match the authored defence and unfamiliar-transfer operations.");
  }

  const returnContentDigest = await delayedReturnPolicyContentDigest(project);
  if (
    project.delayedReturn.review.reviewedContentDigest !== returnContentDigest
    || !reviewIsCurrent(project.delayedReturn.review.reviewedAt, project.delayedReturn.review.expiresAt, context.evaluationAt)
    || !verifyProjectFixtureGrant(context.returnPolicyReviewGrant, {
      grantMarker: project.delayedReturn.review.reviewerGrantMarker,
      scope: "return-policy-review",
      subjectRef: returnContentDigest,
      actorRef: project.delayedReturn.review.reviewerIdentityRef,
      evaluationAt: context.evaluationAt,
    })
  ) {
    add(issues, "project.return-policy-review-invalid", "delayedReturn.review", "Delayed-return policy requires its exact current process-local fixture review grant.");
  }

  const contentDigest = await practicalProjectContentDigest(project);
  if (
    project.safetyReview.reviewedContentDigest !== contentDigest
    || !reviewIsCurrent(project.safetyReview.reviewedAt, project.safetyReview.expiresAt, context.evaluationAt)
    || !verifyProjectFixtureGrant(context.safetyReviewGrant, {
      grantMarker: project.safetyReview.reviewerGrantMarker,
      scope: "project-safety-review",
      subjectRef: contentDigest,
      actorRef: project.safetyReview.reviewerIdentityRef,
      evaluationAt: context.evaluationAt,
    })
  ) {
    add(issues, "project.safety-review-invalid", "safetyReview", "Safety review must bind exact project content and a current process-local fixture review grant.");
  }
}

export async function validatePracticalProjectPackage(
  value: unknown,
  context: PracticalProjectValidationContext,
): Promise<PracticalProjectValidationResult> {
  const parsed = practicalProjectPackageSchema.safeParse(value);
  const issues: MutableIssue[] = [];
  if (!strictProjectTimestampSchema.safeParse(context.evaluationAt).success) {
    add(issues, "project.evaluation-time-invalid", "evaluationAt", "Project validation requires a strict UTC timestamp.");
  }
  if (!parsed.success) {
    issues.push(...schemaIssues(parsed.error));
    return deepFreeze({ project: null, issues: stable(issues), runtimeAssignmentAuthority: "fixture-only" as const, runtimeAssignmentAllowed: false as const, proofAuthority: false as const });
  }
  const project = parsed.data;
  const { projectDigest: _digest, ...unsigned } = project;
  void _digest;
  if (project.projectDigest !== await practicalProjectDigest(unsigned)) {
    add(issues, "project.digest-mismatch", "projectDigest", "Project digest must cover the exact sealed package.");
  }
  await projectSemanticIssues(project, context, issues);
  return deepFreeze({
    project,
    issues: stable(issues),
    runtimeAssignmentAuthority: "fixture-only" as const,
    runtimeAssignmentAllowed: false as const,
    proofAuthority: false as const,
  });
}

function learnerContributionGrantIsValid(
  contribution: PracticalProjectAttemptV1["contributions"][number],
  context: ProjectAttemptEvaluationContext,
): boolean {
  if (contribution.kind !== "learner" || !contribution.actorGrantMarker) return false;
  const grant = context.learnerProvenanceGrants.find((entry) => entry.grantMarker === contribution.actorGrantMarker);
  return verifyProjectFixtureGrant(grant, {
    grantMarker: contribution.actorGrantMarker,
    scope: "learner-contribution-provenance",
    subjectRef: contribution.actorRef,
    actorRef: contribution.actorRef,
    evaluationAt: context.evaluationAt,
    contributionId: contribution.contributionId,
    operationIds: contribution.operationIds,
  });
}

function attemptSemanticIssues(
  project: PracticalProjectPackageV1,
  attempt: PracticalProjectAttemptV1,
  context: ProjectAttemptEvaluationContext,
  issues: MutableIssue[],
): "incomplete" | "contaminated" | "complete-self-declared-unverified" {
  if (attempt.projectDigest !== project.projectDigest) {
    add(issues, "attempt.project-digest-mismatch", "projectDigest", "Attempt must bind the exact project digest.");
  }
  const approvedOperations = new Set(project.templateContent.approvedOperationIds);
  const artifacts = new Map(project.templateContent.artifacts.map((entry) => [entry.artifactId, entry]));
  const submissions = new Map(attempt.artifactSubmissions.map((entry) => [entry.artifactId, entry]));
  const submissionsById = new Map(attempt.artifactSubmissions.map((entry) => [entry.submissionId, entry]));
  const contributions = new Map(attempt.contributions.map((entry) => [entry.contributionId, entry]));
  const milestones = new Map(attempt.milestoneRecords.map((entry) => [entry.milestoneId, entry]));
  const critiqueRecords = new Map(attempt.critiqueRecords.map((entry) => [entry.roleId, entry]));
  const revisionRecords = new Map(attempt.revisionRecords.map((entry) => [entry.ruleId, entry]));

  for (const contribution of attempt.contributions) {
    if (contribution.operationIds.some((operationId) => !approvedOperations.has(operationId))) {
      add(issues, "attempt.operation-not-authored", `contributions.${contribution.contributionId}`, "Contribution refers to an operation outside the exact authored manifest.");
    }
    if (contribution.artifactIds.some((artifactId) => !artifacts.has(artifactId))) {
      add(issues, "attempt.contribution-artifact-unknown", `contributions.${contribution.contributionId}`, "Contribution refers to an unknown artifact.");
    }
    if (contribution.kind === "learner" && !learnerContributionGrantIsValid(contribution, context)) {
      add(issues, "attempt.learner-provenance-unverified", `contributions.${contribution.contributionId}`, "Learner provenance needs the exact process-local fixture actor grant; a caller enum or string is insufficient.");
    }
  }

  for (const requirement of project.templateContent.artifacts) {
    const submission = submissions.get(requirement.artifactId);
    if (!submission?.completed) {
      add(issues, "attempt.artifact-incomplete", `artifactSubmissions.${requirement.artifactId}`, "Every authored artifact must be completed.");
      continue;
    }
    if (!requirement.acceptedFormats.includes(submission.format)) {
      add(issues, "attempt.artifact-format-invalid", `artifactSubmissions.${requirement.artifactId}.format`, "Artifact format must be explicitly accepted by the authored artifact contract.");
    }
    const provenanceContributions = submission.provenance.contributionIds.map((id) => contributions.get(id));
    if (provenanceContributions.some((entry) => !entry)) {
      add(issues, "attempt.provenance-contribution-missing", `artifactSubmissions.${requirement.artifactId}.provenance`, "Artifact provenance must refer only to declared contributions.");
    }
    if (!provenanceContributions.some((entry) => entry?.actorRef === submission.provenance.creatorActorRef)) {
      add(issues, "attempt.provenance-creator-unbound", `artifactSubmissions.${requirement.artifactId}.provenance.creatorActorRef`, "Artifact creator must be one of its declared contributors.");
    }
    for (const contribution of provenanceContributions) {
      if (contribution && !contribution.artifactIds.includes(requirement.artifactId)) {
        add(issues, "attempt.provenance-not-bidirectional", `artifactSubmissions.${requirement.artifactId}.provenance`, "Artifact and contribution provenance must reference each other.");
      }
    }
  }
  for (const contribution of attempt.contributions) {
    for (const artifactId of contribution.artifactIds) {
      if (!submissions.get(artifactId)?.provenance.contributionIds.includes(contribution.contributionId)) {
        add(issues, "attempt.contribution-not-bidirectional", `contributions.${contribution.contributionId}.artifactIds`, "Contribution and artifact provenance must reference each other.");
      }
    }
  }

  for (const authored of project.templateContent.milestones) {
    const record = milestones.get(authored.milestoneId);
    if (!record) {
      add(issues, "attempt.milestone-record-missing", `milestoneRecords.${authored.milestoneId}`, "Every authored milestone needs a completion record.");
      continue;
    }
    const expectedSubmissions = authored.completionArtifactIds.map((artifactId) => submissions.get(artifactId)?.submissionId).filter((id): id is string => Boolean(id));
    if (!sameSet(expectedSubmissions, record.artifactSubmissionIds)) {
      add(issues, "attempt.milestone-artifact-mismatch", `milestoneRecords.${authored.milestoneId}`, "Milestone record must bind the exact authored artifact submissions.");
    }
    for (const contributionId of record.contributionIds) {
      const contribution = contributions.get(contributionId);
      if (!contribution || !contribution.operationIds.includes(authored.operationId)) {
        add(issues, "attempt.milestone-contribution-mismatch", `milestoneRecords.${authored.milestoneId}`, "Milestone contributors must declare the exact authored operation.");
      }
    }
    const milestoneContributionArtifacts = record.contributionIds.flatMap((contributionId) => contributions.get(contributionId)?.artifactIds ?? []);
    if (!sameSet([...new Set(milestoneContributionArtifacts)], authored.completionArtifactIds)) {
      add(issues, "attempt.milestone-contribution-artifact-mismatch", `milestoneRecords.${authored.milestoneId}`, "Milestone contributions must account for the exact authored milestone artifacts.");
    }
  }

  for (const role of project.templateContent.critique.roles.filter((entry) => entry.required)) {
    const record = critiqueRecords.get(role.roleId);
    if (!record) {
      add(issues, "attempt.critique-record-missing", `critiqueRecords.${role.roleId}`, "Every required critique role needs a digest-bound record.");
      continue;
    }
    for (const contributionId of record.contributionIds) {
      const contribution = contributions.get(contributionId);
      if (!contribution || !contribution.operationIds.includes(role.operationId)) {
        add(issues, "attempt.critique-contribution-mismatch", `critiqueRecords.${role.roleId}`, "Critique record must bind declared contributors for its exact authored operation.");
      }
    }
  }
  for (const rule of project.templateContent.critique.revisionRules) {
    const record = revisionRecords.get(rule.ruleId);
    if (!record) {
      add(issues, "attempt.revision-record-missing", `revisionRecords.${rule.ruleId}`, "Every authored revision rule needs one completion record.");
      continue;
    }
    if (record.beforeContentDigest === record.afterContentDigest) {
      add(issues, "attempt.revision-content-unchanged", `revisionRecords.${rule.ruleId}`, "Revision must name distinct before and after content digests.");
    }
    const submission = submissionsById.get(record.artifactSubmissionId);
    if (!submission || submission.contentDigest !== record.afterContentDigest) {
      add(issues, "attempt.revision-artifact-mismatch", `revisionRecords.${rule.ruleId}`, "Revision after digest must equal the exact revision artifact submission digest.");
    }
    if (!submission?.provenance.revisionRecordIds.includes(record.revisionRecordId)) {
      add(issues, "attempt.revision-provenance-not-bidirectional", `revisionRecords.${rule.ruleId}`, "Revision record and artifact provenance must reference each other.");
    }
    for (const contributionId of record.contributionIds) {
      const contribution = contributions.get(contributionId);
      if (
        !contribution
        || !contribution.operationIds.includes(rule.operationId)
        || !submission
        || !contribution.artifactIds.includes(submission.artifactId)
        || !submission.provenance.contributionIds.includes(contributionId)
      ) {
        add(issues, "attempt.revision-contribution-mismatch", `revisionRecords.${rule.ruleId}`, "Revision must bind exact authored-operation contributors and bidirectional artifact provenance.");
      }
    }
  }
  for (const submission of attempt.artifactSubmissions) {
    for (const revisionRecordId of submission.provenance.revisionRecordIds) {
      if (!attempt.revisionRecords.some((record) => record.revisionRecordId === revisionRecordId && record.artifactSubmissionId === submission.submissionId)) {
        add(issues, "attempt.artifact-revision-not-bidirectional", `artifactSubmissions.${submission.artifactId}`, "Artifact revision provenance must resolve to a matching revision record.");
      }
    }
  }

  const protectedOperations = new Set([
    project.proof.individualDefenceOperationId,
    project.proof.unfamiliarTransferOperationId,
  ]);
  const contaminated = attempt.contributions.some((entry) =>
    entry.kind !== "learner" && entry.operationIds.some((operationId) => protectedOperations.has(operationId)),
  );
  if (contaminated) {
    add(issues, "attempt.protected-operation-contaminated", "contributions", "AI, reused, or collaborator participation in a protected operation invalidates this attempt.");
  }

  const checkProtected = (
    name: "individualDefence" | "unfamiliarTransfer",
    operationId: string,
  ): void => {
    const record = attempt[name];
    for (const contributionId of record.contributionIds) {
      const contribution = contributions.get(contributionId);
      if (
        !contribution
        || contribution.kind !== "learner"
        || !contribution.operationIds.includes(operationId)
        || !learnerContributionGrantIsValid(contribution, context)
      ) {
        add(issues, `attempt.${name}-not-individual`, name, "Protected response must be backed only by grant-bound learner contributions for its exact operation.");
      }
    }
  };
  checkProtected("individualDefence", project.proof.individualDefenceOperationId);
  checkProtected("unfamiliarTransfer", project.proof.unfamiliarTransferOperationId);

  if (contaminated) return "contaminated";
  return issues.length === 0 ? "complete-self-declared-unverified" : "incomplete";
}

export async function evaluatePracticalProjectAttempt(
  projectValue: unknown,
  attemptValue: unknown,
  context: ProjectAttemptEvaluationContext,
): Promise<ProjectAttemptEvaluation> {
  const projectValidation = await validatePracticalProjectPackage(projectValue, context);
  const attemptResult = practicalProjectAttemptSchema.safeParse(attemptValue);
  const issues: MutableIssue[] = [...projectValidation.issues];
  if (!attemptResult.success) issues.push(...schemaIssues(attemptResult.error));
  if (!projectValidation.project || projectValidation.issues.length > 0 || !attemptResult.success) {
    return deepFreeze({ attempt: null, issues: stable(issues), protectedProofStatus: "invalid" as const, capabilityClaimIssued: false as const, autonomousScoreIssued: false as const, autonomousMasteryClaimIssued: false as const, proofAuthority: false as const });
  }
  const attempt = attemptResult.data;
  const { attemptDigest: _digest, ...unsigned } = attempt;
  void _digest;
  if (attempt.attemptDigest !== await practicalProjectAttemptDigest(unsigned)) {
    add(issues, "attempt.digest-mismatch", "attemptDigest", "Attempt digest must cover milestones, critique, revisions, artifacts, provenance, and protected response digests.");
  }
  const status = attemptSemanticIssues(projectValidation.project, attempt, context, issues);
  return deepFreeze({
    attempt,
    issues: stable(issues),
    protectedProofStatus: issues.some((issue) => issue.code === "attempt.protected-operation-contaminated") ? "contaminated" : status,
    capabilityClaimIssued: false as const,
    autonomousScoreIssued: false as const,
    autonomousMasteryClaimIssued: false as const,
    proofAuthority: false as const,
  });
}

function addDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 86_400_000).toISOString();
}

export async function compileDelayedReturnSchedule(
  projectValue: unknown,
  completionEventValue: unknown,
  context: PracticalProjectValidationContext,
): Promise<DelayedReturnScheduleCompilation> {
  const projectValidation = await validatePracticalProjectPackage(projectValue, context);
  const eventResult = projectCompletionEventSchema.safeParse(completionEventValue);
  const issues: MutableIssue[] = [...projectValidation.issues];
  if (!eventResult.success) issues.push(...schemaIssues(eventResult.error));
  if (!projectValidation.project || projectValidation.issues.length > 0 || !eventResult.success) {
    return deepFreeze({ schedule: null, issues: stable(issues), schedulingAuthority: false as const });
  }
  const project = projectValidation.project;
  const event = eventResult.data;
  const { eventDigest: _eventDigest, ...unsignedEvent } = event;
  void _eventDigest;
  if (event.eventDigest !== await projectCompletionEventDigest(unsignedEvent)) {
    add(issues, "return.completion-event-digest-mismatch", "completionEvent.eventDigest", "Completion event digest must bind the exact project, attempt, and completion timestamp.");
  }
  if (event.projectDigest !== project.projectDigest) {
    add(issues, "return.completion-project-mismatch", "completionEvent.projectDigest", "Completion event must bind the exact project digest.");
  }
  if (issues.length > 0) return deepFreeze({ schedule: null, issues: stable(issues), schedulingAuthority: false as const });
  const scheduledFor = addDays(event.completedAt, project.delayedReturn.delayDays);
  const completionWindowEndsAt = addDays(scheduledFor, project.delayedReturn.completionWindowDays);
  const unsigned = {
    schemaVersion: "delayed-return-schedule.v1" as const,
    scheduleId: `return-schedule.${event.completionEventId}`,
    projectDigest: project.projectDigest,
    attemptDigest: event.attemptDigest,
    completionEventId: event.completionEventId,
    policyRef: project.delayedReturn.policyRef,
    completedAt: event.completedAt,
    scheduledFor,
    completionWindowEndsAt,
  };
  const schedule = delayedReturnScheduleSchema.parse({
    ...unsigned,
    scheduleDigest: await delayedReturnScheduleDigest(unsigned),
  });
  return deepFreeze({ schedule, issues: stable(issues), schedulingAuthority: false as const });
}

export async function projectDelayedReturnState(
  scheduleValue: unknown,
  eventValues: readonly unknown[],
  evaluatedAt: string,
): Promise<DelayedReturnProjection> {
  const scheduleResult = delayedReturnScheduleSchema.safeParse(scheduleValue);
  const evaluationResult = strictProjectTimestampSchema.safeParse(evaluatedAt);
  const eventResults = eventValues.map((value) => delayedReturnEventSchema.safeParse(value));
  const issues: MutableIssue[] = [];
  if (!scheduleResult.success) issues.push(...schemaIssues(scheduleResult.error));
  if (!evaluationResult.success) add(issues, "return.evaluation-time-invalid", "evaluatedAt", "Return projection requires a strict UTC timestamp.");
  for (const result of eventResults) if (!result.success) issues.push(...schemaIssues(result.error));
  if (!scheduleResult.success || !evaluationResult.success || eventResults.some((result) => !result.success)) {
    return deepFreeze({ state: "invalid" as const, schedule: null, event: null, issues: stable(issues), retainedClaimIssued: false as const, capabilityClaimIssued: false as const });
  }
  const schedule = scheduleResult.data;
  const { scheduleDigest: _digest, ...unsigned } = schedule;
  void _digest;
  if (schedule.scheduleDigest !== await delayedReturnScheduleDigest(unsigned)) {
    add(issues, "return.schedule-digest-mismatch", "scheduleDigest", "Return schedule digest must cover the exact deterministic schedule.");
  }
  const events = eventResults.map((result) => {
    if (!result.success) throw new Error("Unreachable parsed return event.");
    return result.data;
  });
  if (events.length > 1) add(issues, "return.multiple-terminal-events", "events", "A delayed-return schedule accepts at most one terminal event.");
  const event = events[0] ?? null;
  if (event && event.scheduleDigest !== schedule.scheduleDigest) {
    add(issues, "return.event-schedule-mismatch", "events.0.scheduleDigest", "Return event must bind the exact schedule digest.");
  }
  if (event && Date.parse(event.occurredAt) > Date.parse(evaluatedAt)) {
    add(issues, "return.event-in-future", "events.0.occurredAt", "A future event cannot affect the current projection.");
  }
  if (event && Date.parse(event.occurredAt) < Date.parse(schedule.scheduledFor)) {
    add(issues, "return.event-before-due", "events.0.occurredAt", "Return completion or untested disposition cannot occur before the due time.");
  }
  if (event?.kind === "completed" && Date.parse(event.occurredAt) > Date.parse(schedule.completionWindowEndsAt)) {
    add(issues, "return.completion-outside-window", "events.0.occurredAt", "A completed return must occur on or after due and within the reviewed completion window.");
  }
  if (issues.length > 0) {
    return deepFreeze({ state: "invalid" as const, schedule, event, issues: stable(issues), retainedClaimIssued: false as const, capabilityClaimIssued: false as const });
  }
  const evaluated = Date.parse(evaluatedAt);
  const state = event?.kind === "completed"
    ? "completed"
    : event?.kind === "untested"
      ? "untested"
      : evaluated < Date.parse(schedule.scheduledFor)
        ? "scheduled"
        : evaluated <= Date.parse(schedule.completionWindowEndsAt)
          ? "due"
          : "untested";
  return deepFreeze({ state, schedule, event, issues: stable(issues), retainedClaimIssued: false as const, capabilityClaimIssued: false as const });
}
