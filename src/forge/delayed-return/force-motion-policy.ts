/**
 * The first released delayed-return family. This is deliberately small: it is
 * an authored, deterministic task about the same force-and-motion capability,
 * but it is not the original cargo-pod transfer replay. It has no model,
 * hint, replay, or prior-result surface.
 */
export const FORCE_MOTION_RETURN_TASK_FAMILY_ID =
  "task-family.force-motion.delayed-velocity-return.v1" as const;
export const FORCE_MOTION_RETURN_TASK_CODE =
  "force_motion_delayed_velocity_return" as const;
export const FORCE_MOTION_RETURN_POLICY_ID =
  "policy.force-and-motion.delayed-return.v1" as const;
export const FORCE_MOTION_RETURN_DELAY_DAYS = 7 as const;
export const FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS = 30 as const;

export const FORCE_MOTION_RETURN_FAMILY = Object.freeze({
  taskFamilyId: FORCE_MOTION_RETURN_TASK_FAMILY_ID,
  taskCode: FORCE_MOTION_RETURN_TASK_CODE,
  policyId: FORCE_MOTION_RETURN_POLICY_ID,
  version: "1.0.0",
  reviewedAt: "2026-07-24T00:00:00.000Z",
  delayDays: FORCE_MOTION_RETURN_DELAY_DAYS,
  completionWindowDays: FORCE_MOTION_RETURN_COMPLETION_WINDOW_DAYS,
  title: "Motion after a brief push",
  prompt:
    "A cargo pod is moving to the right. A brief rightward force ends, and no other force acts. What does its velocity-time graph show after the force ends?",
  choices: Object.freeze([
    Object.freeze({ id: "returns_to_zero", label: "It returns to zero velocity." }),
    Object.freeze({ id: "keeps_increasing", label: "It keeps increasing at the same rate." }),
    Object.freeze({ id: "constant_positive_velocity", label: "It stays at a constant positive velocity." }),
    Object.freeze({ id: "not_sure", label: "I am not sure." }),
  ]),
  correctChoiceId: "constant_positive_velocity",
  access: Object.freeze({
    textAlternative: true,
    keyboardOperation: true,
    reducedMotion: true,
  }),
  supportPolicy: Object.freeze({
    ai: "off",
    instructionalSupport: "removed",
    priorResult: "unavailable",
  }),
  limitations: Object.freeze([
    "This one delayed response does not establish broad physics mastery.",
    "It does not establish retention beyond this authored representation or repeated reliability.",
  ]),
});

export type ForceMotionReturnChoiceId =
  (typeof FORCE_MOTION_RETURN_FAMILY.choices)[number]["id"];
