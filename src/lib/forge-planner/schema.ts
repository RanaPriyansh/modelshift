import { z } from "zod";

import { SOURCE_IDS, TOPIC_IDS, WORLD_IDS } from "./catalog";

export const ageModeSchema = z.enum(["child", "teen", "adult"]);
export const depthSchema = z.enum(["quick", "standard", "deep"]);
export const sourceModeSchema = z.enum(["authored_only", "curated", "open_web", "unrestricted"]);

export const forgePlanRequestSchema = z.strictObject({
  question: z.string().trim().min(3).max(600),
  ageMode: ageModeSchema,
  depth: depthSchema,
  startingPoint: z.string().trim().min(1).max(280),
  successShape: z.string().trim().min(1).max(280),
  guardianManaged: z.boolean().default(false),
  sourceMode: sourceModeSchema.default("curated"),
});

export type ForgePlanRequest = z.infer<typeof forgePlanRequestSchema>;

export const modelRouteIds = [...TOPIC_IDS, "exploratory"] as const;

/**
 * The optional model may only rephrase the request and echo a route from the
 * authored registry. Runtime semantic validation separately verifies that the
 * IDs are the exact deterministic route's IDs.
 */
export const modelPlannerOutputSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  route: z.enum(modelRouteIds),
  worldId: z.enum(WORLD_IDS).nullable(),
  sourceIds: z.array(z.enum(SOURCE_IDS)).max(SOURCE_IDS.length),
  rephrasedQuestion: z.string().trim().min(3).max(320),
});

export type ModelPlannerOutput = z.infer<typeof modelPlannerOutputSchema>;

export type ModelFallbackReason =
  | "missing_key"
  | "disabled"
  | "timeout"
  | "api_error"
  | "malformed_output"
  | "invented_or_mismatched_id";

export type PlannerModelMetadata = {
  contribution: "not_used" | "accepted_rephrase";
  fallbackReason: ModelFallbackReason | null;
  rephrasedQuestion: string | null;
  rephraseStatus: "not_present" | "unverified_model_rephrase";
};

export type RefusalReason =
  | "adversarial_input"
  | "unsafe_topic"
  | "guardian_required"
  | "child_source_mode_disallowed"
  | "world_not_reviewed_for_age";

export type RequestSummary = Pick<
  ForgePlanRequest,
  "ageMode" | "depth" | "startingPoint" | "successShape" | "guardianManaged" | "sourceMode"
>;

export type GroundedLearningContract = {
  schemaVersion: "1.0";
  contractKind: "grounded_learning";
  request: RequestSummary;
  route: {
    topicId: (typeof TOPIC_IDS)[number];
    worldId: (typeof WORLD_IDS)[number];
    confidence: "authored_match";
  };
  grounding: {
    status: "grounded_in_authored_sources";
    sourceIds: (typeof SOURCE_IDS)[number][];
    sources: Array<{
      id: (typeof SOURCE_IDS)[number];
      title: string;
      locator: string;
      kind: "authoritative_educational" | "peer_reviewed_research" | "policy_guidance";
    }>;
    claimBoundary: string;
  };
  learning: {
    title: string;
    objective: string;
    startingPoint: string;
    requestedSuccessShape: string;
    milestones: Array<{ id: string; title: string; objective: string }>;
  };
  sourcePolicy: "authored_only";
  model: PlannerModelMetadata;
};

export type ExploratorySourcePlanContract = {
  schemaVersion: "1.0";
  contractKind: "exploratory_source_plan";
  request: RequestSummary;
  route: { topicId: null; worldId: null; confidence: "no_authored_match" };
  grounding: {
    status: "unverified_exploratory";
    sourceIds: [];
    sources: [];
    claimBoundary: string;
  };
  exploration: {
    title: "Source verification required";
    effectiveSourceMode: "authored_only" | "curated" | "guardian_curated" | "open_web";
    steps: Array<{ id: string; objective: string; exitGate: string }>;
  };
  model: PlannerModelMetadata;
};

export type RefusalContract = {
  schemaVersion: "1.0";
  contractKind: "refusal";
  reason: RefusalReason;
  message: string;
  worldId: null;
  sourceIds: [];
  model: PlannerModelMetadata;
};

export type ForgePlanContract =
  | GroundedLearningContract
  | ExploratorySourcePlanContract
  | RefusalContract;
