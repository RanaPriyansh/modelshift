"use client";

import { useCallback } from "react";

import { ProportionalReasoningWorld } from "@/src/components/worlds/proportional-reasoning";
import { recordWorldProof } from "@/src/lib/forge-evidence";
import type { RatioAudience, RatioEvidenceRecord } from "@/src/worlds/proportional-reasoning";

export function ProportionalWorldRoute({ audience }: { audience: RatioAudience }) {
  const recordEvidence = useCallback((evidence: RatioEvidenceRecord) => {
    if (evidence.returnProof.scheduled) return;
    recordWorldProof({
      capabilityId: evidence.capabilityId,
      conditionId: "proof.proportional-reasoning.independent-transfer",
      sourceRefId: "world.proportional-reasoning",
      outcome: evidence.independentTransfer.answerCorrect ? "proved" : "not_proved",
      assistance: evidence.assistance.levelsUsed.map((level) => ({
        kind: level === 1 ? "authored_hint" : level === 2 ? "authored_contrast" : "authored_principle",
        sourceId: `support.proportional-reasoning.level-${level}`,
      })),
      returnIntervalsDays: [3, 14, 30],
    });
  }, []);

  return <ProportionalReasoningWorld audience={audience} onEvidence={recordEvidence} />;
}
