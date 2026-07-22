import type { LessonStudioRequest } from "@/src/lib/lesson-studio/schema";

export type LessonStudioGoldenFixture = Pick<LessonStudioRequest, "ageMode" | "guardianManaged" | "depth"> & {
  id: string;
  domain: "history" | "physics" | "mathematics" | "health";
  question: string;
  sourceNeedKeywords: readonly string[];
  forbiddenColdTransferFragments: readonly string[];
  coldTransferAnchor: string;
};

/**
 * Authored, non-learner fixtures. Their IDs and aggregate metrics may appear
 * in a live report; their prompts and generated drafts may not.
 */
export const LESSON_STUDIO_GOLDEN_FIXTURES: readonly LessonStudioGoldenFixture[] = [
  {
    id: "lesson-history-teen-01",
    domain: "history",
    ageMode: "teen",
    guardianManaged: false,
    depth: "standard",
    question: "What can a historical photograph prove about everyday life?",
    sourceNeedKeywords: ["catalog", "rights"],
    forbiddenColdTransferFragments: ["observation, catalog fact, inference"],
    coldTransferAnchor: "unfamiliar",
  },
  {
    id: "lesson-physics-child-01",
    domain: "physics",
    ageMode: "child",
    guardianManaged: true,
    depth: "quick",
    question: "Why does a rolling toy slow down after a push?",
    sourceNeedKeywords: ["safety"],
    forbiddenColdTransferFragments: ["friction makes it slow down"],
    coldTransferAnchor: "new",
  },
  {
    id: "lesson-mathematics-adult-01",
    domain: "mathematics",
    ageMode: "adult",
    guardianManaged: false,
    depth: "deep",
    question: "How can a graph help distinguish proportional from non-proportional change?",
    sourceNeedKeywords: ["definition"],
    forbiddenColdTransferFragments: ["a proportional relationship is a straight line through the origin"],
    coldTransferAnchor: "unfamiliar",
  },
  {
    id: "lesson-health-teen-01",
    domain: "health",
    ageMode: "teen",
    guardianManaged: false,
    depth: "standard",
    question: "How can we compare claims about sleep routines without making medical advice?",
    sourceNeedKeywords: ["public health", "review"],
    forbiddenColdTransferFragments: ["eight hours"],
    coldTransferAnchor: "new",
  },
];
