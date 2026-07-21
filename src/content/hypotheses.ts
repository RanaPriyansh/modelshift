import type { HypothesisDefinition, HypothesisId } from "@/src/types/modelshift";

export const HYPOTHESES: Record<HypothesisId, HypothesisDefinition> = {
  continuous_force_required: {
    id: "continuous_force_required",
    learnerFacingName: "Motion needs an ongoing push",
    learnerFacingSummary: "One model that fits is that motion fades when the push ends.",
    internalDefinition: "The learner treats a continuing force as necessary to sustain motion.",
  },
  implicit_resistance: {
    id: "implicit_resistance",
    learnerFacingName: "Something in the surroundings slows it",
    learnerFacingSummary: "Another possibility is that some resistance is assumed even when none is shown.",
    internalDefinition: "The learner assumes air, space, or an unspecified medium necessarily resists motion.",
  },
  force_equals_velocity: {
    id: "force_equals_velocity",
    learnerFacingName: "Force sets the current speed",
    learnerFacingSummary: "One model that fits is that force directly determines how fast the object moves.",
    internalDefinition: "The learner treats force as current velocity rather than the cause of velocity change.",
  },
  scientific_or_near_scientific: {
    id: "scientific_or_near_scientific",
    learnerFacingName: "Force changes velocity",
    learnerFacingSummary: "Your explanation may already separate motion from the force that changes it.",
    internalDefinition: "The explanation contains the essential force, acceleration, and velocity distinction.",
  },
  mixed_or_unclear: {
    id: "mixed_or_unclear",
    learnerFacingName: "More than one model still fits",
    learnerFacingSummary: "There are a few ways to read that explanation.",
    internalDefinition: "The evidence is insufficient, contradictory, irrelevant, adversarial, or ambiguous.",
  },
};
