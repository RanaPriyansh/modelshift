import { createHash } from "node:crypto";

import type {
  ImmutableVersionRef,
  LessonDraft,
  LessonDraftPipeline,
} from "./schema";

function hashValue(value: unknown): ImmutableVersionRef {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function sourceNeedId(claim: string, sourceType: string): `source-need-${string}` {
  return `source-need-${createHash("sha256").update(`${claim}\u0000${sourceType}`).digest("hex").slice(0, 12)}`;
}

/**
 * The model only supplies the draft. The following workflow artifacts are
 * deterministic and deliberately do not decide truth, review, publication, or
 * proof. They make the work that still needs named human review explicit.
 */
export function compileLessonDraftPipeline(draft: LessonDraft): LessonDraftPipeline {
  const generationVersionRef = hashValue({ phase: "generation", draft });
  const sourcePlan = {
    status: "source-needed" as const,
    items: draft.sourceNeeds.map((need) => ({
      id: sourceNeedId(need.claim, need.sourceType),
      claim: need.claim,
      requiredSourceType: need.sourceType,
      disposition: "unresolved" as const,
    })),
  };
  const sourcePlanVersionRef = hashValue({ phase: "source-plan", sourcePlan, generationVersionRef });
  const critique = {
    status: "needs-human-review" as const,
    findings: [
      {
        id: "critique.factual-source-needs",
        category: "factual" as const,
        message: "Every source need remains unresolved until a named reviewer binds an acquired source snapshot, rights record, claim locator, and decision.",
      },
      {
        id: "critique.pedagogy-human-review",
        category: "pedagogy" as const,
        message: "A named pedagogy reviewer must decide whether the two readings and separating test fit the intended learning goal.",
      },
      {
        id: "critique.access-human-review",
        category: "access" as const,
        message: "A named access reviewer must determine representation, safety, and grown-up-management needs for the target audience.",
      },
      {
        id: "critique.proof-human-review",
        category: "proof" as const,
        message: "A named proof reviewer must decide whether the cold-transfer task is unfamiliar and free of instructional assistance; this pipeline never grades it.",
      },
    ],
  };
  const critiqueVersionRef = hashValue({ phase: "critique", critique, generationVersionRef, sourcePlanVersionRef });
  const revision = {
    basedOnDraftVersionRef: generationVersionRef,
    status: "unreviewed" as const,
    appliedCritiqueIds: [],
    draft,
  };
  const revisionVersionRef = hashValue({ phase: "revision", revision, critiqueVersionRef, sourcePlanVersionRef });

  return {
    generation: { versionRef: generationVersionRef, draft },
    critique: { versionRef: critiqueVersionRef, ...critique },
    sourcePlan: { versionRef: sourcePlanVersionRef, ...sourcePlan },
    revision: { versionRef: revisionVersionRef, ...revision },
  };
}
