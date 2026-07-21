import type { AuthoredSupport, Level1QuestionId, ProbeId } from "@/src/types/modelshift";

export const LEVEL_1_QUESTIONS: Record<Level1QuestionId, string> = {
  what_differs_between_cases: "What is present in the slowing case that is absent in the coasting case?",
  which_quantity_changed: "Which quantity changed: force, velocity, or both?",
  where_is_the_force_now: "After the push ends, where is a horizontal force still acting?",
  compare_force_and_velocity_graphs: "When the force becomes zero, does the velocity become zero or stop changing?",
  neutral_observation_prompt: "Look only at the time after the push. Which track still has a horizontal force?",
};

export const LEVEL_2_CONTRASTS: Record<ProbeId, AuthoredSupport> = {
  friction_contrast: {
    level: 2,
    title: "Compare one difference",
    text: "The coasting puck has velocity but no horizontal force. The slowing puck has both velocity and a friction force pointing backward.",
  },
  brief_vs_continuous_force: {
    level: 2,
    title: "Compare the graph slopes",
    text: "A nonzero net force gives the velocity graph a slope. A zero net force makes the velocity graph flat, not necessarily zero.",
  },
  zero_force_velocity_contrast: {
    level: 2,
    title: "Hold force fixed",
    text: "Both objects have the same zero net force, but they begin with different velocities. Watch what stays unchanged.",
  },
  neutral_core_probe: {
    level: 2,
    title: "Separate motion from change",
    text: "A velocity arrow shows existing motion. A force arrow shows what can change that velocity.",
  },
};

export const LEVEL_3_PRINCIPLE: AuthoredSupport = {
  level: 3,
  title: "The principle",
  text: "Net force determines acceleration—the change in velocity. When net force is zero, acceleration is zero, so an object keeps the velocity it already has.",
};
