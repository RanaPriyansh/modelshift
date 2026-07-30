export {
  COURSE_SOURCE_CANDIDATE_SCHEMA_VERSION,
  COURSE_SOURCE_COVERAGE_STATES,
  COURSE_SOURCE_DECISION_SCHEMA_VERSION,
  COURSE_SOURCE_FACT_KINDS,
  COURSE_SOURCE_GOAL_CONTEXT_SCHEMA_VERSION,
  COURSE_SOURCE_INPUT_KINDS,
  COURSE_SOURCE_RECONCILIATION_SCHEMA_VERSION,
  COURSE_SOURCE_RETENTION_CLASSES,
  COURSE_SOURCE_REVISION_SCHEMA_VERSION,
  COURSE_SOURCE_SCOPES,
  courseSourceCandidateSchema,
  courseSourceCoverageDeclarationSchema,
  courseSourceDecisionSchema,
  courseSourceFactSchema,
  courseSourceGoalRefSchema,
  courseSourceLocatorSchema,
  courseSourceReconciliationRequestSchema,
  courseSourceRevisionSchema,
  courseSourceScopeSchema,
  parseCourseSourceCandidate,
  parseCourseSourceDecision,
  parseCourseSourceReconciliationRequest,
  parseCourseSourceRevision,
} from "./contracts";

export type {
  CourseSourceCandidateV1,
  CourseSourceCoverageDeclarationV1,
  CourseSourceDecisionV1,
  CourseSourceFactV1,
  CourseSourceGoalRefV1,
  CourseSourceLocatorV1,
  CourseSourceReconciliationRequestV1,
  CourseSourceRevisionV1,
  CourseSourceScopeV1,
} from "./contracts";

export {
  COURSE_SOURCE_ISSUE_CODES,
  buildCourseSourceGoalContext,
  reconcileCourseSources,
} from "./reconcile";

export type {
  CourseSourceCandidateProjection,
  CourseSourceConflictGroup,
  CourseSourceDuplicateGroup,
  CourseSourceFreshnessProjection,
  CourseSourceGoalContextResult,
  CourseSourceGoalContextV1,
  CourseSourceIssue,
  CourseSourceIssueCode,
  CourseSourceReconciliationResult,
} from "./reconcile";

export {
  COURSE_SOURCE_ICS_SUBSET,
  COURSE_SOURCE_INGESTION_LIMITS,
  COURSE_SOURCE_INGESTION_RESULT_SCHEMA_VERSION,
  COURSE_SOURCE_INGESTION_SCHEMA_VERSION,
  ingestCourseSource,
} from "./ingest";

export type {
  CourseSourceIngestionIssue,
  CourseSourceIngestionIssueCode,
  CourseSourceIngestionResultV1,
} from "./ingest";
