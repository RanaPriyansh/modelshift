import type { HypothesisId, ProbeId } from "@/src/types/modelshift";

import type { InterpretationFixture } from "./fixtures";

export type BaselineResult = { primary: HypothesisId | null; probe: ProbeId };

/** A transparent keyword baseline used as a floor, never as production adaptation. */
export function ruleBaseline(explanation: string): BaselineResult {
  const text = explanation.toLowerCase();
  if (/ignore (previous|prior)|system prompt|give me (the )?answer|reveal (the )?(answer|system)|you are now/.test(text)) {
    return { primary: null, probe: "neutral_core_probe" };
  }
  if (/\b(idk|maybe|not sure)\b/.test(text) || text.length < 12) return { primary: null, probe: "neutral_core_probe" };
  if (/do not think it needs force|does not stop just because|not true that no force means no motion|nothing .*change|force .*changing speed|keeps? (the )?speed|just coast/.test(text)) {
    return { primary: "scientific_or_near_scientific", probe: "brief_vs_continuous_force" };
  }
  if (/air|drag|resist|friction|dust|pushes back|rub/.test(text)) return { primary: "implicit_resistance", probe: "friction_contrast" };
  if (/force.*(speed|velocity)|speed.*force|no force.*(no speed|zero)|force and velocity/.test(text)) {
    return { primary: "force_equals_velocity", probe: "zero_force_velocity_contrast" };
  }
  if (/need.*(push|force)|without.*(push|force)|no engine|push.*gone|motion.*(fade|wear|stop)|no movement/.test(text)) {
    return { primary: "continuous_force_required", probe: "friction_contrast" };
  }
  return { primary: null, probe: "neutral_core_probe" };
}

export function scoreRuleBaseline(fixtures: readonly InterpretationFixture[]) {
  const clear = fixtures.filter((fixture) => fixture.clear);
  const correct = clear.filter((fixture) => ruleBaseline(fixture.explanation).primary === fixture.expected_primary).length;
  return { clear: clear.length, correct, agreement: clear.length === 0 ? 0 : correct / clear.length };
}
