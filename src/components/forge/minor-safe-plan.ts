import type {
  ForgePlanContract,
  ForgePlanRequest,
} from "@/src/lib/forge-planner/schema";
import {
  MINOR_PLANNER_PRACTICAL_OUTCOME,
  MINOR_PLANNER_STARTING_POINT,
  MINOR_PLANNER_SUCCESS_SHAPE,
  type MinorPlannerTopicToken,
} from "@/src/lib/forge-planner/client-contract";

const CANONICAL_TOPIC_MATCHES = [
  {
    question: "force and motion" satisfies MinorPlannerTopicToken,
    terms: ["force", "motion", "velocity", "acceleration", "friction", "inertia"],
  },
  {
    question: "equivalent ratios" satisfies MinorPlannerTopicToken,
    terms: ["ratio", "ratios", "proportion", "recipe", "unit rate", "map scale"],
  },
  {
    question: "learning with ai" satisfies MinorPlannerTopicToken,
    terms: ["artificial intelligence", "chatgpt", "ai", "ai tutor", "generative ai"],
  },
  {
    question: "primary source reasoning" satisfies MinorPlannerTopicToken,
    terms: ["primary source", "historical photograph", "catalog metadata", "historical evidence"],
  },
] as const;

function normalized(value: string) {
  return ` ${value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function canonicalMinorTopicQuestion(
  learnerGoal: string,
): MinorPlannerTopicToken | null {
  const text = normalized(learnerGoal);
  const matches = CANONICAL_TOPIC_MATCHES.filter((topic) =>
    topic.terms.some((term) => text.includes(` ${term} `)),
  );
  return matches.length === 1 ? matches[0]!.question : null;
}

export function minorSafePlannerRequest(
  request: ForgePlanRequest,
  canonicalQuestion: MinorPlannerTopicToken,
): ForgePlanRequest {
  return {
    ...request,
    question: canonicalQuestion,
    startingPoint: MINOR_PLANNER_STARTING_POINT,
    successShape: MINOR_PLANNER_SUCCESS_SHAPE,
    currentKnowledge: "",
    practicalOutcome: MINOR_PLANNER_PRACTICAL_OUTCOME,
    constraints: "",
    sourceMode: "authored_only",
  };
}

export function localMinorExploratoryPlan(
  request: ForgePlanRequest,
): ForgePlanContract {
  const effectiveSourceMode = request.ageMode === "child" ? "guardian_curated" : "curated";
  return {
    schemaVersion: "1.1",
    contractKind: "exploratory_source_plan",
    request: {
      ageMode: request.ageMode,
      depth: request.depth,
      startingPoint: request.startingPoint,
      successShape: request.successShape,
      currentKnowledge: "",
      practicalOutcome: "",
      timeAvailable: request.timeAvailable,
      modalityNeeds: [...request.modalityNeeds],
      constraints: "",
      guardianManaged: request.guardianManaged,
      sourceMode: "authored_only",
    },
    route: { topicId: null, worldId: null, confidence: "no_authored_match" },
    grounding: {
      status: "unverified_exploratory",
      sourceIds: [],
      sources: [],
      claimBoundary:
        "The on-device keyword check found no single reviewed World. No learner wording, source, lesson, or outcome claim was sent or verified.",
    },
    exploration: {
      title: "Source verification required",
      effectiveSourceMode,
      steps: [
        {
          id: "clarify_scope",
          objective: "Keep the learner’s exact scope on this device and identify the smallest capability that needs review.",
          exitGate: "The learner and grown-up, when required, accept a bounded and safe scope.",
        },
        {
          id: "request_reviewed_coverage",
          objective: "Request reviewed sources, activities, age fit, and a proof task without fabricating a course.",
          exitGate: "Named human review publishes exact source and activity identities.",
        },
        {
          id: "compile_grounded_contract",
          objective: "Compile a separate executable candidate only after every required authority resolves.",
          exitGate: "A reviewed World and its exact source IDs resolve; otherwise the question stays open.",
        },
      ],
    },
    model: {
      contribution: "not_used",
      fallbackReason: "disabled",
      rephrasedQuestion: null,
      rephraseStatus: "not_present",
    },
  };
}
