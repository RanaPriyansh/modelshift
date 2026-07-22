import { z } from "zod";

import { TRANSFER } from "../content/scenarios";
import { scoreColdTransfer } from "../worlds/ai-learning/validator";
import {
  PRIMARY_SOURCE_CAPABILITY_ID,
  PRIMARY_SOURCE_PROOF_CLAIM_ID,
  PRIMARY_SOURCE_TRANSFER_TASK_ID,
  PRIMARY_SOURCE_VALIDATOR_ID,
  PRIMARY_SOURCE_WORLD_ID,
  PRIMARY_SOURCE_WORLD_VERSION,
  validatePrimarySourceTransfer,
} from "../worlds/primary-source-reasoning";
import { evaluateTransfer } from "../worlds/proportional-reasoning/validator";
import {
  deterministicValidationResultSchema,
  type AIActionBoundary,
  type DeterministicValidator,
  type LearningWorldPack,
  type SourceProvenance,
} from "./contracts";
import { PRIMARY_SOURCE_RUNTIME_BINDING } from "./world-runtime/primary-source-binding";

const AI_OFF = {
  mode: "off",
  allowedActions: [],
  retrievalMode: "none",
  modelMayDetermineCorrectness: false,
  modelMayChangePolicy: false,
} satisfies AIActionBoundary;

export const FORCE_AND_MOTION_VALIDATOR_ID = "validator.force-motion-transfer.v1" as const;
export const SOURCE_CORROBORATION_VALIDATOR_ID = "validator.source-corroboration-transfer.v1" as const;
export const PROPORTIONAL_REASONING_VALIDATOR_ID = "validator.proportional-reasoning-transfer.v1" as const;

export const OPENSTAX_NEWTONS_FIRST_LAW_SOURCE = {
  id: "source.openstax.newtons-first-law",
  title: "Newton's First Law of Motion: Inertia",
  publisher: "OpenStax",
  kind: "open-educational-resource",
  url: "https://openstax.org/books/physics/pages/4-2-newtons-first-law-of-motion-inertia",
  contentVersion: "openstax-physics-4.2",
  accessedAt: "2026-07-22T00:00:00.000Z",
  license: "CC BY 4.0",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const OPENSTAX_RATIOS_AND_RATE_SOURCE = {
  id: "source.openstax.ratios-and-rate",
  title: "Ratios and Rate",
  publisher: "OpenStax",
  kind: "open-educational-resource",
  url: "https://openstax.org/books/prealgebra-2e/pages/5-6-ratios-and-rate",
  contentVersion: "openstax-prealgebra-2e-5.6",
  accessedAt: "2026-07-22T00:00:00.000Z",
  license: "CC BY 4.0",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const BASTANI_PNAS_AI_LEARNING_SOURCE = {
  id: "source.bastani-pnas.genai-learning-2025",
  title: "Generative AI without guardrails can harm learning",
  publisher: "Proceedings of the National Academy of Sciences",
  kind: "peer-reviewed",
  url: "https://www.pnas.org/doi/10.1073/pnas.2422633122",
  contentVersion: "doi-10.1073-pnas.2422633122",
  accessedAt: "2026-07-22T00:00:00.000Z",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const TUTOR_COPILOT_SOURCE = {
  id: "source.tutor-copilot.arxiv-2024",
  title: "A Human-AI Approach for Scaling Real-Time Expertise",
  publisher: "arXiv",
  kind: "primary",
  url: "https://arxiv.org/abs/2410.03017",
  contentVersion: "arxiv-2410.03017-v2",
  accessedAt: "2026-07-22T00:00:00.000Z",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const LOC_PRIMARY_SOURCE_ANALYSIS_SOURCE = {
  id: "source.loc.primary-source-analysis",
  title: "Getting Started with Primary Sources",
  publisher: "Library of Congress",
  kind: "institutional",
  url: "https://www.loc.gov/programs/teachers/getting-started-with-primary-sources/",
  contentVersion: "loc-teachers-primary-sources-2026-07-22",
  accessedAt: "2026-07-22T00:00:00.000Z",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const LOC_PHILADELPHIA_STREET_SOURCE = {
  id: "source.loc.picture.90706156",
  title: "Street scene, Philadelphia, Pa.",
  publisher: "Library of Congress Prints and Photographs Division",
  kind: "primary",
  url: "https://www.loc.gov/pictures/item/90706156/",
  contentVersion: "loc-item-90706156-lc-dig-stereo-1s15239",
  accessedAt: "2026-07-22T00:00:00.000Z",
  license: "No known restrictions on publication",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const LOC_WASHINGTON_STREET_SOURCE = {
  id: "source.loc.picture.2017716911",
  title: "Street scene, Washington, D.C.",
  publisher: "Library of Congress Prints and Photographs Division",
  kind: "primary",
  url: "https://www.loc.gov/pictures/item/2017716911/",
  contentVersion: "loc-item-2017716911-lc-dig-fsa-8a03094",
  accessedAt: "2026-07-22T00:00:00.000Z",
  license: "No known restrictions on publication",
  review: {
    status: "reviewed",
    reviewedBy: "Forge curriculum source review",
    reviewedAt: "2026-07-22T00:00:00.000Z",
  },
} as const satisfies SourceProvenance;

export const FORCE_AND_MOTION_WORLD = {
  manifest: {
    schemaVersion: "1.0",
    id: "world.force-and-motion",
    version: "1.0.0",
    route: "/learn/force-and-motion",
    title: "Force & motion",
    summary:
      "A deterministic force-and-motion world in which learners commit a model, test it against authored physics, and complete a cold transfer with assistance removed.",
    kind: "model",
    evidenceTier: "verified",
    ageModes: ["13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: { status: "available" },
    capabilityIds: ["capability.force-motion.zero-net-force"],
    sources: [OPENSTAX_NEWTONS_FIRST_LAW_SOURCE],
    deterministicValidatorId: FORCE_AND_MOTION_VALIDATOR_ID,
    aiBoundary: {
      mode: "bounded",
      allowedActions: ["classify-evidence", "rank-hypotheses"],
      retrievalMode: "none",
      modelMayDetermineCorrectness: false,
      modelMayChangePolicy: false,
    },
    returnProof: {
      enabled: false,
      reason: "The current routed product records a future check but does not yet schedule delayed return proof.",
      aiBoundary: AI_OFF,
    },
    safety: {
      guardianManaged: false,
      retrievalMode: "none",
      inputModeration: false,
      outputModeration: false,
      escalationMessage: "Stop the activity and ask a teacher or trusted adult when a concern falls outside this physics world.",
      data: {
        collectPreciseLocation: false,
        trainOnLearnerContent: false,
        rawMediaRetention: "none",
      },
      prohibitedPhysicalRisks: ["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"],
    },
  },
  release: {
    status: "released",
    contentVersion: "1.0.0",
  },
  capabilities: [
    {
      id: "capability.force-motion.zero-net-force",
      version: "1.0.0",
      title: "Distinguish net force from velocity",
      description:
        "Predict and explain that zero net force means zero acceleration, so an already-moving object can retain constant velocity in an idealized resistance-free system.",
      domain: "conceptual physics",
      learnerCan: [
        "separate force, acceleration, and velocity",
        "transfer the model to an unfamiliar force-time graph",
      ],
      prerequisites: [],
      representations: ["motion scene", "force-time graph", "velocity-time graph", "causal explanation"],
      proofClaimIds: ["proof.force-motion.independent-transfer"],
    },
  ],
  proofClaims: [
    {
      id: "proof.force-motion.independent-transfer",
      capabilityId: "capability.force-motion.zero-net-force",
      statement:
        "On an unseen post-thrust scenario, the learner independently selects the constant-velocity continuation and explains the result without AI assistance.",
      successCriteria: [
        "selects the authored constant-velocity transfer answer",
        "submits an independent explanation or explicit uncertainty",
      ],
      minimumEvidenceRecords: 1,
      aiBoundary: AI_OFF,
    },
  ],
  deterministicValidators: [
    {
      id: FORCE_AND_MOTION_VALIDATOR_ID,
      capabilityId: "capability.force-motion.zero-net-force",
      description: "Checks the authored cold-transfer answer without model judgment.",
      inputContractVersion: "1.0.0",
      outputContractVersion: "1.0.0",
    },
  ],
} satisfies LearningWorldPack;

export const SOURCE_CORROBORATION_WORLD = {
  manifest: {
    schemaVersion: "1.0",
    id: "world.source-corroboration",
    version: "1.0.0",
    route: "/learn/ai-and-learning",
    title: "AI & learning",
    summary:
      "A source-evidence world for tracing a model-generated factual claim to reviewed research sources, comparing support, and stating uncertainty without treating model fluency as proof.",
    kind: "evidence",
    evidenceTier: "grounded",
    ageModes: ["13-17", "18-plus"],
    depthModes: ["introductory", "core", "advanced"],
    availability: { status: "available" },
    capabilityIds: ["capability.ai-literacy.source-corroboration"],
    deterministicValidatorId: SOURCE_CORROBORATION_VALIDATOR_ID,
    sources: [BASTANI_PNAS_AI_LEARNING_SOURCE, TUTOR_COPILOT_SOURCE],
    aiBoundary: {
      mode: "bounded",
      allowedActions: [
        "clarify-input",
        "summarize-learner-work",
        "retrieve-reviewed-source",
        "coach-question",
      ],
      retrievalMode: "curated-only",
      modelMayDetermineCorrectness: false,
      modelMayChangePolicy: false,
    },
    returnProof: {
      enabled: false,
      reason: "Return-proof scheduling remains disabled until a persisted scheduler and reviewed delayed task family exist.",
      aiBoundary: AI_OFF,
    },
    safety: {
      guardianManaged: false,
      retrievalMode: "curated-only",
      inputModeration: false,
      outputModeration: false,
      escalationMessage: "Ask a guardian or teacher to review sensitive, harmful, medical, legal, or personally identifying claims.",
      data: {
        collectPreciseLocation: false,
        trainOnLearnerContent: false,
        rawMediaRetention: "none",
      },
      prohibitedPhysicalRisks: ["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"],
    },
  },
  release: {
    status: "released",
    contentVersion: "1.0.0",
  },
  capabilities: [
    {
      id: "capability.ai-literacy.source-corroboration",
      version: "1.0.0",
      title: "Corroborate a model-generated factual claim",
      description:
        "Trace a factual claim to identified sources, compare what each source actually supports, and preserve uncertainty where the reviewed evidence does not settle the claim.",
      domain: "AI and information literacy",
      learnerCan: [
        "separate a fluent answer from supporting evidence",
        "compare source support and name unresolved uncertainty",
      ],
      prerequisites: [],
      representations: ["claim map", "source card", "support matrix", "uncertainty statement"],
      proofClaimIds: ["proof.ai-literacy.independent-corroboration"],
    },
  ],
  proofClaims: [
    {
      id: "proof.ai-literacy.independent-corroboration",
      capabilityId: "capability.ai-literacy.source-corroboration",
      statement:
        "Given a new claim and a reviewed source set, the learner independently identifies support, contradiction, and unresolved uncertainty without generative assistance.",
      successCriteria: [
        "cites the exact reviewed sources used",
        "distinguishes supported content from inference",
        "states uncertainty when the source set is insufficient",
      ],
      minimumEvidenceRecords: 1,
      aiBoundary: AI_OFF,
    },
  ],
  deterministicValidators: [
    {
      id: SOURCE_CORROBORATION_VALIDATOR_ID,
      capabilityId: "capability.ai-literacy.source-corroboration",
      description: "Scores the authored cold-transfer claim and uncertainty choices without model judgment.",
      inputContractVersion: "1.0.0",
      outputContractVersion: "1.0.0",
    },
  ],
} satisfies LearningWorldPack;

export const PROPORTIONAL_REASONING_WORLD = {
  manifest: {
    schemaVersion: "1.0",
    id: "world.proportional-reasoning",
    version: "1.0.0",
    route: "/learn/proportional-reasoning",
    title: "Ratios that stay the same",
    summary:
      "An exact-arithmetic model world in which learners compare two mixture relationships, normalize a shared quantity, reconstruct proportionality, and transfer the relationship to an unfamiliar map scale.",
    kind: "model",
    evidenceTier: "verified",
    ageModes: ["under-13", "13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: { status: "available" },
    capabilityIds: ["capability.proportional-reasoning.compare-and-scale"],
    sources: [OPENSTAX_RATIOS_AND_RATE_SOURCE],
    deterministicValidatorId: PROPORTIONAL_REASONING_VALIDATOR_ID,
    aiBoundary: AI_OFF,
    returnProof: {
      enabled: false,
      reason: "The local ledger can schedule a return, but a reviewed delayed task family is not yet published.",
      aiBoundary: AI_OFF,
    },
    safety: {
      guardianManaged: true,
      retrievalMode: "none",
      inputModeration: false,
      outputModeration: false,
      escalationMessage: "A child uses this World with a grown-up; the exact mathematical standard remains unchanged.",
      data: {
        collectPreciseLocation: false,
        trainOnLearnerContent: false,
        rawMediaRetention: "none",
      },
      prohibitedPhysicalRisks: ["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"],
    },
  },
  release: {
    status: "released",
    contentVersion: "1.0.0",
  },
  capabilities: [
    {
      id: "capability.proportional-reasoning.compare-and-scale",
      version: "1.0.0",
      title: "Compare and scale proportional relationships",
      description:
        "Compare two relationships by holding one quantity constant, preserve a ratio by scaling both quantities, and apply the same reasoning in a new representation.",
      domain: "mathematics",
      learnerCan: [
        "distinguish an additive difference from a multiplicative relationship",
        "scale a proportional relationship exactly into an unfamiliar map context",
      ],
      prerequisites: [],
      representations: ["mixture parts", "common-quantity table", "ratio statement", "map scale"],
      proofClaimIds: ["proof.proportional-reasoning.independent-transfer"],
    },
  ],
  proofClaims: [
    {
      id: "proof.proportional-reasoning.independent-transfer",
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      statement:
        "On an unfamiliar map scale, the learner independently selects the exact proportional distance and submits a relationship explanation after all conceptual support is removed.",
      successCriteria: [
        "selects the exact authored map-scale distance",
        "submits a relationship explanation in a single assistance-free attempt",
      ],
      minimumEvidenceRecords: 1,
      aiBoundary: AI_OFF,
    },
  ],
  deterministicValidators: [
    {
      id: PROPORTIONAL_REASONING_VALIDATOR_ID,
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      description: "Checks the authored map-scale answer with exact rational arithmetic and records explanation signals.",
      inputContractVersion: "1.0.0",
      outputContractVersion: "1.0.0",
    },
  ],
} satisfies LearningWorldPack;

export const PRIMARY_SOURCE_REASONING_WORLD = {
  manifest: {
    schemaVersion: "1.0",
    id: PRIMARY_SOURCE_WORLD_ID,
    version: PRIMARY_SOURCE_WORLD_VERSION,
    route: "/learn/primary-source-reasoning",
    title: "What can a photograph prove?",
    summary:
      "A primary-source investigation that separates visible observation, catalog metadata, inference, and open questions before an unfamiliar cold transfer.",
    kind: "evidence",
    evidenceTier: "grounded",
    ageModes: ["under-13", "13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: { status: "available" },
    capabilityIds: [PRIMARY_SOURCE_CAPABILITY_ID],
    sources: [
      LOC_PRIMARY_SOURCE_ANALYSIS_SOURCE,
      LOC_PHILADELPHIA_STREET_SOURCE,
      LOC_WASHINGTON_STREET_SOURCE,
    ],
    deterministicValidatorId: PRIMARY_SOURCE_VALIDATOR_ID,
    aiBoundary: AI_OFF,
    returnProof: {
      enabled: false,
      reason: "Delayed retention is named as untested until a reviewed return task and persisted scheduler exist.",
      aiBoundary: AI_OFF,
    },
    safety: {
      guardianManaged: true,
      retrievalMode: "curated-only",
      inputModeration: false,
      outputModeration: false,
      escalationMessage: "Use only the reviewed Library of Congress source set; a child investigates with a grown-up.",
      data: {
        collectPreciseLocation: false,
        trainOnLearnerContent: false,
        rawMediaRetention: "none",
      },
      prohibitedPhysicalRisks: ["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"],
    },
  },
  release: {
    status: "released",
    contentVersion: PRIMARY_SOURCE_WORLD_VERSION,
  },
  capabilities: [
    {
      id: PRIMARY_SOURCE_CAPABILITY_ID,
      version: "1.0.0",
      title: "Keep historical claims inside their evidence boundary",
      description:
        "Distinguish what an image visibly shows, what its catalog record supplies, what is inferred beyond those sources, and what remains an open question.",
      domain: "historical and primary-source literacy",
      learnerCan: [
        "separate visible evidence from recorded provenance and inference",
        "preserve unanswered questions instead of filling them with a plausible story",
      ],
      prerequisites: [],
      representations: ["historical photograph", "catalog record", "evidence categories", "claim classification"],
      proofClaimIds: [PRIMARY_SOURCE_PROOF_CLAIM_ID],
    },
  ],
  proofClaims: [
    {
      id: PRIMARY_SOURCE_PROOF_CLAIM_ID,
      capabilityId: PRIMARY_SOURCE_CAPABILITY_ID,
      statement:
        "On an unfamiliar photograph, the learner independently classifies one observation, one catalog fact, one inference, and one open question after support is removed.",
      successCriteria: [
        "classifies all four authored transfer statements correctly",
        "submits once with interpretation and hints absent",
      ],
      minimumEvidenceRecords: 1,
      aiBoundary: AI_OFF,
    },
  ],
  deterministicValidators: [
    {
      id: PRIMARY_SOURCE_VALIDATOR_ID,
      capabilityId: PRIMARY_SOURCE_CAPABILITY_ID,
      description: "Checks the authored four-category cold transfer without model judgment.",
      inputContractVersion: "1.0.0",
      outputContractVersion: "1.0.0",
    },
  ],
  runtime: PRIMARY_SOURCE_RUNTIME_BINDING,
} satisfies LearningWorldPack;

const forceMotionTransferInputSchema = z.strictObject({
  taskId: z.literal("cargo_pod_force_graph"),
  selectedAnswer: z.enum(["returns_to_zero", "stays_constant_after_force", "keeps_accelerating"]),
});

export const forceAndMotionTransferValidator: DeterministicValidator = Object.freeze({
  id: FORCE_AND_MOTION_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = forceMotionTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const passed = parsed.data.selectedAnswer === TRANSFER.correctChoiceId;
    return deterministicValidationResultSchema.parse({
      passed,
      score: passed ? 1 : 0,
      code: passed ? "transfer.demonstrated" : "transfer.not-demonstrated",
      evidence: [`task:${parsed.data.taskId}`, `answer:${parsed.data.selectedAnswer}`],
    });
  },
});

const sourceCorroborationTransferInputSchema = z.strictObject({
  choiceId: z.enum(["always-helps", "always-harms", "bounded-measures", "same-measure"]),
  openQuestionId: z.enum(["color-choice", "held-constant", "reader-preference"]),
});

export const sourceCorroborationTransferValidator: DeterministicValidator = Object.freeze({
  id: SOURCE_CORROBORATION_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = sourceCorroborationTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const result = scoreColdTransfer(parsed.data.choiceId, parsed.data.openQuestionId);
    return deterministicValidationResultSchema.parse({
      passed: result.outcome === "held",
      score: result.points / 2,
      code: `transfer.${result.outcome}`,
      evidence: [`choice:${parsed.data.choiceId}`, `open-question:${parsed.data.openQuestionId}`],
    });
  },
});

const proportionalReasoningTransferInputSchema = z.strictObject({
  choiceId: z.enum(["18_km", "24_km", "32_km", "96_km"]),
  explanation: z.string().trim().min(8).max(400),
  confidence: z.number().int().min(0).max(100),
});

export const proportionalReasoningTransferValidator: DeterministicValidator = Object.freeze({
  id: PROPORTIONAL_REASONING_VALIDATOR_ID,
  validate(input: unknown) {
    const parsed = proportionalReasoningTransferInputSchema.safeParse(input);
    if (!parsed.success) {
      return deterministicValidationResultSchema.parse({
        passed: false,
        score: 0,
        code: "invalid.transfer-input",
        evidence: [],
      });
    }

    const result = evaluateTransfer(parsed.data.choiceId, parsed.data.explanation, parsed.data.confidence);
    return deterministicValidationResultSchema.parse({
      passed: result.answerCorrect,
      score: result.answerCorrect ? 1 : 0,
      code: result.answerCorrect ? "transfer.demonstrated" : "transfer.not-demonstrated",
      evidence: [
        `answer:${result.choiceId}`,
        `mechanism-signals:${result.mechanismSignals.join(",") || "none"}`,
      ],
    });
  },
});

export const primarySourceReasoningTransferValidator: DeterministicValidator = Object.freeze({
  id: PRIMARY_SOURCE_VALIDATOR_ID,
  validate(input: unknown) {
    const result = validatePrimarySourceTransfer(input);
    return deterministicValidationResultSchema.parse({
      passed: result.passed,
      score: result.score,
      code: result.code,
      evidence: result.valid
        ? [
            `task:${PRIMARY_SOURCE_TRANSFER_TASK_ID}`,
            `correct-categories:${result.correctCount}/4`,
          ]
        : [],
    });
  },
});

export const BUILT_IN_WORLD_PACKS = [
  FORCE_AND_MOTION_WORLD,
  PROPORTIONAL_REASONING_WORLD,
  SOURCE_CORROBORATION_WORLD,
  PRIMARY_SOURCE_REASONING_WORLD,
] as const;
export const BUILT_IN_WORLD_IDS = [
  FORCE_AND_MOTION_WORLD.manifest.id,
  PROPORTIONAL_REASONING_WORLD.manifest.id,
  SOURCE_CORROBORATION_WORLD.manifest.id,
  PRIMARY_SOURCE_REASONING_WORLD.manifest.id,
] as const;
export const BUILT_IN_WORLD_ROUTES = [
  FORCE_AND_MOTION_WORLD.manifest.route,
  PROPORTIONAL_REASONING_WORLD.manifest.route,
  SOURCE_CORROBORATION_WORLD.manifest.route,
  PRIMARY_SOURCE_REASONING_WORLD.manifest.route,
] as const;
export const BUILT_IN_SOURCE_IDS = [
  OPENSTAX_NEWTONS_FIRST_LAW_SOURCE.id,
  OPENSTAX_RATIOS_AND_RATE_SOURCE.id,
  BASTANI_PNAS_AI_LEARNING_SOURCE.id,
  TUTOR_COPILOT_SOURCE.id,
  LOC_PRIMARY_SOURCE_ANALYSIS_SOURCE.id,
  LOC_PHILADELPHIA_STREET_SOURCE.id,
  LOC_WASHINGTON_STREET_SOURCE.id,
] as const;

/** Client-safe, read-only discovery data projected from the canonical manifests. */
export const PUBLIC_WORLD_CATALOG = Object.freeze(
  BUILT_IN_WORLD_PACKS.map(({ manifest }) => Object.freeze({
    id: manifest.id,
    version: manifest.version,
    route: manifest.route,
    title: manifest.title,
    summary: manifest.summary,
    kind: manifest.kind,
    evidenceTier: manifest.evidenceTier,
    ageModes: Object.freeze([...manifest.ageModes]),
    depthModes: Object.freeze([...manifest.depthModes]),
  })),
);
export const BUILT_IN_DETERMINISTIC_VALIDATORS = [
  forceAndMotionTransferValidator,
  proportionalReasoningTransferValidator,
  sourceCorroborationTransferValidator,
  primarySourceReasoningTransferValidator,
] as const;
