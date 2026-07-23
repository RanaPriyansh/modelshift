import { z } from "zod";

import { SOURCE_IDS, TOPIC_IDS, WORLD_IDS, WORLD_ROUTES } from "./catalog";

export const ageModeSchema = z.enum(["child", "teen", "adult"]);
export const depthSchema = z.enum(["quick", "standard", "deep"]);
export const sourceModeSchema = z.enum(["authored_only", "curated", "open_web", "unrestricted"]);
export const timeAvailableSchema = z.enum(["15_min", "45_min", "2_hours", "ongoing"]);
export const modalityNeedSchema = z.enum([
  "text",
  "video",
  "visual",
  "audio",
  "hands_on",
  "low_bandwidth",
  "screen_reader",
]);

export const forgePlanRequestSchema = z.strictObject({
  question: z.string().trim().min(3).max(600),
  ageMode: ageModeSchema,
  depth: depthSchema,
  startingPoint: z.string().trim().min(1).max(280),
  successShape: z.string().trim().min(1).max(280),
  currentKnowledge: z.string().trim().max(280).default(""),
  practicalOutcome: z.string().trim().max(280).default(""),
  timeAvailable: timeAvailableSchema.default("45_min"),
  modalityNeeds: z.array(modalityNeedSchema).min(1).max(4).superRefine((needs, context) => {
    const seen = new Set<string>();
    needs.forEach((need, index) => {
      if (seen.has(need)) {
        context.addIssue({ code: "custom", path: [index], message: "Representation needs must be unique." });
      }
      seen.add(need);
    });
  }).default(["text", "visual"]),
  constraints: z.string().trim().max(280).default(""),
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
  schemaVersion: z.literal("1.1"),
  route: z.enum(modelRouteIds),
  worldId: z.enum(WORLD_IDS).nullable(),
  worldVersion: z.string().regex(/^\d+\.\d+\.\d+$/).nullable(),
  worldRoute: z.enum(WORLD_ROUTES).nullable(),
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
  | "world_not_reviewed_for_age"
  | "world_not_reviewed_for_depth";

export type RequestSummary = Pick<
  ForgePlanRequest,
  | "ageMode"
  | "depth"
  | "startingPoint"
  | "successShape"
  | "currentKnowledge"
  | "practicalOutcome"
  | "timeAvailable"
  | "modalityNeeds"
  | "constraints"
  | "guardianManaged"
  | "sourceMode"
>;

export type GroundedLearningContract = {
  schemaVersion: "1.1";
  contractKind: "grounded_learning";
  request: RequestSummary;
  route: {
    topicId: (typeof TOPIC_IDS)[number];
    worldId: (typeof WORLD_IDS)[number];
    worldVersion: string;
    worldRoute: (typeof WORLD_ROUTES)[number];
    confidence: "authored_match";
  };
  grounding: {
    status: "grounded_in_authored_sources";
    sourceIds: (typeof SOURCE_IDS)[number][];
    sources: Array<{
      id: (typeof SOURCE_IDS)[number];
      title: string;
      publisher: string;
      locator: string;
      contentVersion: string;
      kind: "authoritative_educational" | "peer_reviewed_research" | "primary_research" | "policy_guidance";
      reviewStatus: "reviewed";
      reviewedAt: string;
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
  schemaVersion: "1.1";
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
  schemaVersion: "1.1";
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
