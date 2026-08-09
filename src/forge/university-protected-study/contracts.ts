import { z } from "zod";

import type {
  EvidenceTier,
  WorldActivityProtocol,
  WorldRuntimeActionKind,
  WorldRuntimeStage,
} from "../contracts";

z.config({ jitless: true });

export const UNIVERSITY_PROTECTED_STUDY_REQUEST_SCHEMA_VERSION =
  "university-protected-study-request.v1" as const;
export const UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION =
  "university-protected-study-projection.v1" as const;

export const universityProtectedStudyRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_PROTECTED_STUDY_REQUEST_SCHEMA_VERSION),
  todayRequest: z.unknown(),
  worldPack: z.unknown(),
});

export type UniversityProtectedStudyRequestV1 = z.infer<
  typeof universityProtectedStudyRequestSchema
>;

export const UNIVERSITY_PROTECTED_STUDY_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "today.invalid",
  "today.not_ready",
  "world.invalid",
  "world.not_released",
  "world.not_available",
  "world.binding_mismatch",
  "world.runtime_missing",
  "world.integrity_unenforceable",
] as const);

export type UniversityProtectedStudyIssueCode =
  (typeof UNIVERSITY_PROTECTED_STUDY_ISSUE_CODES)[number];

export interface UniversityProtectedStudyIssue {
  readonly code: UniversityProtectedStudyIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityProtectedStudyAuthority {
  readonly projectionClass: "fixture_only_protected_study_brief";
  readonly identityScopeAuthority: "caller_asserted_fixture_only";
  readonly courseSourceAuthority: "learner_connected_copy_not_institutional_truth";
  readonly worldAuthority: "validated_supplied_package_snapshot";
  readonly learnerIntentAuthority: "not_established";
  readonly recommendationAllowed: false;
  readonly assignmentAnsweringAllowed: false;
  readonly policyInterpretationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly previewAllowed: true;
  readonly persistenceAllowed: false;
  readonly evidenceClaimAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversityProtectedStudyContext {
  readonly termLabel: string;
  readonly courseLabel: string;
  readonly title: string;
  readonly objective: string;
  readonly effortMinutesLow: number;
  readonly effortMinutesHigh: number;
  readonly availableMinutes: number;
}

export interface UniversityProtectedStudyWorld {
  readonly id: string;
  readonly version: string;
  readonly route: string;
  readonly title: string;
  readonly summary: string;
  readonly activityProtocol: WorldActivityProtocol;
  readonly evidenceTier: EvidenceTier;
  readonly sourceIds: readonly string[];
  readonly sourceProvenanceStatus: "bound" | "incomplete";
}

export interface UniversityProtectedStudySupport {
  readonly policyId: string;
  readonly allowedDuringProof: false;
  readonly recordsCognitiveSupport: boolean;
  readonly catalog: readonly {
    readonly actionId: string;
    readonly label: string;
    readonly stage: WorldRuntimeStage;
    readonly source: "authored" | "model" | "human";
    readonly tier: "attention" | "cue" | "representation" | "example" | "repair" | "solution";
    readonly maxOccurrences: number;
    readonly answerExposing: boolean;
  }[];
}

export interface UniversityProtectedStudyProof {
  readonly proofClaimId: string;
  readonly statement: string;
  readonly successCriteria: readonly string[];
  readonly aiMode: "off";
  readonly validatorId: string;
  readonly validatorDescription: string;
  readonly modelMayDetermineCorrectness: false;
  readonly blockedActionKinds: readonly Extract<
    WorldRuntimeActionKind,
    "instructional_support" | "model_action" | "experience_replay"
  >[];
  readonly accessAllowed: true;
}

export interface UniversityProtectedStudyReceiptBoundary {
  readonly proofAuthority: "honour_based";
  readonly persistence: "not_persisted";
  readonly durable: false;
  readonly delayedReturnAvailable: boolean;
  readonly remainsUntested: readonly string[];
}

export interface UniversityProtectedStudyContract {
  readonly semanticStages: readonly WorldRuntimeStage[];
  readonly beginsWithLearnerWork: true;
  readonly support: UniversityProtectedStudySupport;
  readonly proof: UniversityProtectedStudyProof;
  readonly receipt: UniversityProtectedStudyReceiptBoundary;
  readonly accessAccommodations: readonly {
    readonly id: string;
    readonly kind: "text_alternative" | "keyboard_operation" | "motion_reduction";
    readonly constructPreservation: "preserves_construct";
    readonly answerChanging: false;
  }[];
}

export type UniversityProtectedStudyProjectionStatus =
  | "invalid"
  | "today_not_ready"
  | "world_mismatch"
  | "world_unavailable"
  | "ready";

export interface UniversityProtectedStudyProjectionV1 {
  readonly schemaVersion: typeof UNIVERSITY_PROTECTED_STUDY_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityProtectedStudyProjectionStatus;
  readonly authority: UniversityProtectedStudyAuthority;
  readonly todayStatus: string | null;
  readonly context: UniversityProtectedStudyContext | null;
  readonly world: UniversityProtectedStudyWorld | null;
  readonly learningContract: UniversityProtectedStudyContract | null;
  readonly recovery:
    | "repair_fixture_input"
    | "return_to_today"
    | "review_world_binding"
    | "inspect_protected_study";
  readonly issues: readonly UniversityProtectedStudyIssue[];
  readonly projectionDigest: string | null;
}
