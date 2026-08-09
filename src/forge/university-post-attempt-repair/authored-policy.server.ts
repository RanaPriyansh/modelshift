import "server-only";

import { deepFreeze } from "../deep-freeze";

/**
 * One fixed internal research mapping only. It has no independent or domain
 * review provenance. Ordered criteria contain validator answer identities and
 * therefore stay server-only.
 */
export const UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY = deepFreeze({
  policyId: "policy.university-post-attempt-repair.source-corroboration.v1",
  world: {
    id: "world.source-corroboration",
    version: "1.0.1",
    contentVersion: "1.0.0",
    route: "/learn/ai-and-learning",
    proofClaimId: "proof.ai-literacy.independent-corroboration",
    taskCode: "source_corroboration_transfer",
    taskFamilyId: "task-family.source-corroboration.cold-transfer.v1",
    protocolVersion: "1.1.0",
    runtimeBindingDigest:
      "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5",
    packageIntegrityHash:
      "sha256:4002e3f6868709f4dca81ce5909140d9bffa96470487ca052f3dd529f6b8a013",
  },
  validator: {
    id: "validator.source-corroboration-transfer.v1",
    outputVersion: "1.0.0",
  },
  pass: {
    code: "transfer.held",
    outcome: "pass",
    disposition: "demonstrated",
    criteria: [
      "choice:bounded-measures",
      "open-question:held-constant",
    ],
  },
  mapping: {
    code: "transfer.partial",
    outcome: "fail",
    disposition: "not_demonstrated",
    criteria: [
      "choice:bounded-measures",
      "open-question:color-choice",
    ],
    evidence: {
      checksTotal: 2,
      checksHeld: 1,
      countLabel: "1 of 2 authored checks",
      summary:
        "The bounded-conclusion check held in this immediate attempt. The unresolved-condition check remains open.",
      checks: [
        {
          id: "bounded_conclusion",
          label: "Bounded conclusion",
          state: "held_this_attempt",
        },
        {
          id: "unresolved_condition",
          label: "Unresolved condition",
          state: "still_open",
        },
      ],
      immediateAttemptOnly: true,
    },
    repair: {
      errorClass: "unresolved_condition",
      title: "Name the missing comparison.",
      instruction:
        "In your own notes, write one sentence that names a condition the two source briefs do not keep comparable, then end with what they still cannot establish.",
      responseFrame: {
        firstSlot: "Name one condition the briefs do not keep comparable",
        connective: "so we still cannot tell",
        secondSlot: "what the two briefs cannot establish",
      },
      completionCondition:
        "One named non-comparable condition plus one bounded “we still cannot tell” clause.",
      whyThisMove:
        "The authored result says the conclusion stayed bounded, but the open question did not identify the comparison needed to isolate the remaining claim. This is a fixed mapping for that result, not an inference about the learner.",
      supportBoundary:
        "Authored prompt only during repair. It may direct attention to the comparison boundary but does not fill either response slot.",
      freshProofBoundary:
        "A future independent proof must begin as a fresh attempt with instructional help removed. This repair cannot upgrade the prior receipt.",
      answerExposing: false,
    },
  },
} as const);
