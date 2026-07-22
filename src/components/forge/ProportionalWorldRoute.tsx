"use client";

import { useCallback } from "react";

import { ProportionalReasoningWorld } from "@/src/components/worlds/proportional-reasoning";
import { recordWorldProof } from "@/src/lib/forge-evidence";
import {
  isIndependentProportionalTransferDemonstrated,
  type RatioAudience,
  type RatioEvidenceRecord,
} from "@/src/worlds/proportional-reasoning";

/**
 * Compatibility projection into the v1 device ledger. It deliberately stays
 * separate from the bounded local runtime receipt and does not store it.
 */
export function proportionalLegacyEvidenceOutcome(evidence: RatioEvidenceRecord): "proved" | "not_proved" {
  return isIndependentProportionalTransferDemonstrated(evidence.independentTransfer)
    ? "proved"
    : "not_proved";
}

export function ProportionalWorldRoute({ audience }: { audience: RatioAudience }) {
  const recordEvidence = useCallback((evidence: RatioEvidenceRecord) => {
    recordWorldProof({
      capabilityId: evidence.capabilityId,
      conditionId: "proof.proportional-reasoning.independent-transfer",
      sourceRefId: "world.proportional-reasoning",
      outcome: proportionalLegacyEvidenceOutcome(evidence),
      assistance: evidence.assistance.levelsUsed.map((level) => ({
        kind: level === 1 ? "authored_hint" : level === 2 ? "authored_contrast" : "authored_principle",
        sourceId: `support.proportional-reasoning.level-${level}`,
      })),
    });
  }, []);

  return <ProportionalReasoningWorld audience={audience} onEvidence={recordEvidence} />;
}
