import { describe, expect, it } from "vitest";

import type { RatioEvidenceRecord } from "@/src/worlds/proportional-reasoning";

import { proportionalLegacyEvidenceOutcome } from "./ProportionalWorldRoute";

function evidenceWith(
  answerCorrect: boolean,
  mechanismSignals: RatioEvidenceRecord["independentTransfer"]["mechanismSignals"],
): RatioEvidenceRecord {
  return {
    independentTransfer: {
      answerCorrect,
      mechanismSignals,
    },
  } as RatioEvidenceRecord;
}

describe("proportionalLegacyEvidenceOutcome", () => {
  it("keeps the v1 local projection aligned with the domain relationship criterion", () => {
    expect(proportionalLegacyEvidenceOutcome(evidenceWith(true, ["scale_factor"]))).toBe("proved");
    expect(proportionalLegacyEvidenceOutcome(evidenceWith(true, ["same_relationship"]))).toBe("proved");
    expect(proportionalLegacyEvidenceOutcome(evidenceWith(true, ["calculation"]))).toBe("not_proved");
    expect(proportionalLegacyEvidenceOutcome(evidenceWith(true, []))).toBe("not_proved");
    expect(proportionalLegacyEvidenceOutcome(evidenceWith(false, ["scale_factor"]))).toBe("not_proved");
  });
});
