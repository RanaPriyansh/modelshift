import { sourcesForTopic, type AuthoredTopic } from "./catalog";
import { classifyAuthoredTopic } from "./classify";
import { runOptionalModelGovernor, type PlannerModelOptions } from "./model";
import { policyRefusal } from "./safety";
import type {
  ExploratorySourcePlanContract,
  ForgePlanContract,
  ForgePlanRequest,
  GroundedLearningContract,
  PlannerModelMetadata,
  RefusalContract,
  RefusalReason,
  RequestSummary,
} from "./schema";

const NO_MODEL: PlannerModelMetadata = {
  contribution: "not_used",
  fallbackReason: null,
  rephrasedQuestion: null,
  rephraseStatus: "not_present",
};

const REFUSAL_MESSAGES: Readonly<Record<RefusalReason, string>> = {
  adversarial_input: "This request cannot be planned because it attempts to override the planner boundary.",
  unsafe_topic: "This planner cannot create an instructional path for that request.",
  guardian_required: "Child mode requires a guardian-managed learning session.",
  child_source_mode_disallowed:
    "Child mode does not permit unrestricted or open-web planning. Choose authored-only or guardian-curated sources.",
  world_not_reviewed_for_age:
    "The reviewed World for this topic is not released for this age mode. Choose another reviewed World or keep the question open.",
  world_not_reviewed_for_depth:
    "The reviewed World for this topic is not released at the requested depth. Choose a supported depth or keep the deeper question open.",
};

function summarizeRequest(request: ForgePlanRequest): RequestSummary {
  return {
    ageMode: request.ageMode,
    depth: request.depth,
    startingPoint: request.startingPoint,
    successShape: request.successShape,
    guardianManaged: request.guardianManaged,
    sourceMode: request.sourceMode,
  };
}

function refusal(reason: RefusalReason): RefusalContract {
  return {
    schemaVersion: "1.1",
    contractKind: "refusal",
    reason,
    message: REFUSAL_MESSAGES[reason],
    worldId: null,
    sourceIds: [],
    model: NO_MODEL,
  };
}

function milestoneCount(depth: ForgePlanRequest["depth"]): number {
  if (depth === "quick") return 2;
  if (depth === "standard") return 3;
  return 4;
}

function groundedContract(
  request: ForgePlanRequest,
  topic: AuthoredTopic,
  model: PlannerModelMetadata,
): GroundedLearningContract {
  return {
    schemaVersion: "1.1",
    contractKind: "grounded_learning",
    request: summarizeRequest(request),
    route: {
      topicId: topic.id,
      worldId: topic.worldId,
      worldVersion: topic.worldVersion,
      worldRoute: topic.route,
      confidence: "authored_match",
    },
    grounding: {
      status: "grounded_in_authored_sources",
      sourceIds: [...topic.sourceIds],
      sources: sourcesForTopic(topic),
      claimBoundary:
        "Only the authored objective, milestones, and registered source references are grounded. The requested success shape is learner-provided, and any model rephrase is explicitly unverified.",
    },
    learning: {
      title: topic.title,
      objective: topic.objective,
      startingPoint: request.startingPoint,
      requestedSuccessShape: request.successShape,
      milestones: topic.milestones.slice(0, milestoneCount(request.depth)).map((milestone) => ({ ...milestone })),
    },
    sourcePolicy: "authored_only",
    model,
  };
}

function effectiveExplorationMode(
  request: ForgePlanRequest,
): ExploratorySourcePlanContract["exploration"]["effectiveSourceMode"] {
  if (request.sourceMode === "authored_only") return "authored_only";
  if (request.ageMode === "child") return "guardian_curated";
  if (request.sourceMode === "open_web" || request.sourceMode === "unrestricted") return "open_web";
  return "curated";
}

function exploratoryContract(
  request: ForgePlanRequest,
  model: PlannerModelMetadata,
): ExploratorySourcePlanContract {
  const effectiveSourceMode = effectiveExplorationMode(request);
  return {
    schemaVersion: "1.1",
    contractKind: "exploratory_source_plan",
    request: summarizeRequest(request),
    route: { topicId: null, worldId: null, confidence: "no_authored_match" },
    grounding: {
      status: "unverified_exploratory",
      sourceIds: [],
      sources: [],
      claimBoundary:
        "No topic, source, world ID, lesson content, or outcome claim has been verified. This contract plans source discovery only.",
    },
    exploration: {
      title: "Source verification required",
      effectiveSourceMode,
      steps: [
        {
          id: "clarify_scope",
          objective: "Turn the learner question, starting point, and success shape into a bounded research question.",
          exitGate: "The scope excludes unsafe, unrestricted, and unsupported outcomes.",
        },
        {
          id: "identify_candidate_sources",
          objective:
            effectiveSourceMode === "authored_only"
              ? "Request an authored registry addition; do not search or assert candidate sources."
              : "Identify candidate primary, authoritative, or peer-reviewed sources under the effective source policy.",
          exitGate: "Every candidate has provenance, scope, and a stable locator; candidates are not yet treated as verified.",
        },
        {
          id: "verify_sources",
          objective: "Review candidate sources for authority, relevance, age fit, and contradiction.",
          exitGate: "A human or trusted verification process explicitly approves the source set.",
        },
        {
          id: "compile_grounded_contract",
          objective: "Only after approval, add authored IDs and compile a separate grounded learning contract.",
          exitGate: "All world and source IDs resolve to the authored registry; otherwise remain exploratory.",
        },
      ],
    },
    model,
  };
}

/**
 * Deterministic planner authority. The optional model can only add a visibly
 * unverified rephrase after echoing the already-frozen route and authored IDs.
 */
export async function planForgeLearning(
  request: ForgePlanRequest,
  modelOptions: PlannerModelOptions = {},
): Promise<ForgePlanContract> {
  const refusedBy = policyRefusal(request);
  if (refusedBy) return refusal(refusedBy);

  const topic = classifyAuthoredTopic(request.question);
  if (topic && !topic.ageModes.includes(request.ageMode)) return refusal("world_not_reviewed_for_age");
  if (topic && !topic.depthModes.includes(request.depth)) return refusal("world_not_reviewed_for_depth");
  const model = await runOptionalModelGovernor(request, topic, modelOptions);
  return topic ? groundedContract(request, topic, model) : exploratoryContract(request, model);
}
