"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ProportionalReasoningWorld } from "@/src/components/worlds/proportional-reasoning";
import { recordWorldProof } from "@/src/lib/forge-evidence";
import type { RatioAudience, RatioEvidenceRecord } from "@/src/worlds/proportional-reasoning";

export function ProportionalWorldRoute({ audience }: { audience: RatioAudience }) {
  const [grownUpConfirmed, setGrownUpConfirmed] = useState(audience !== "child_with_grown_up");
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

  if (!grownUpConfirmed) {
    return (
      <main className="forge-world-entry-gate" id="ratio-grown-up-gate">
        <span>Child + grown-up World</span>
        <h1>A grown-up needs to join this learning session.</h1>
        <p>
          This World keeps sources off and uses exact authored mathematics, but under-13 mode still requires a responsible
          grown-up to manage the session. This confirmation is local and does not verify identity or legal consent.
        </p>
        <button type="button" onClick={() => setGrownUpConfirmed(true)}>
          I’m the grown-up managing this session
        </button>
        <Link href="/">Return to FORGE home</Link>
      </main>
    );
  }

  return <ProportionalReasoningWorld audience={audience} onEvidence={recordEvidence} />;
}
