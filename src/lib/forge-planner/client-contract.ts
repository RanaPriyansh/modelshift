/**
 * Zero-dependency planner transport constants that are safe to import from a
 * client component. The full Zod planner schema remains server-owned because
 * it binds the trusted World and source registries.
 */
export const MINOR_PLANNER_TOPIC_TOKENS = [
  "force and motion",
  "equivalent ratios",
  "learning with ai",
  "primary source reasoning",
] as const;

export type MinorPlannerTopicToken =
  (typeof MINOR_PLANNER_TOPIC_TOKENS)[number];

export const MINOR_PLANNER_STARTING_POINT =
  "Use the reviewed World’s authored starting point." as const;
export const MINOR_PLANNER_SUCCESS_SHAPE =
  "Complete the reviewed World’s independent transfer task." as const;
export const MINOR_PLANNER_PRACTICAL_OUTCOME =
  "Complete the reviewed World’s independent transfer task." as const;
