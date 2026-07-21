import { z } from "zod";

import { TRANSFER } from "../content/scenarios";
import { scoreColdTransfer } from "../worlds/ai-learning/validator";
import { evaluateTransfer } from "../worlds/proportional-reasoning/validator";
import {
  deterministicValidationResultSchema,
  type AIActionBoundary,
  type DeterministicValidator,
  type LearningWorldPack,
} from "./contracts";

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

export const FORCE_AND_MOTION_WORLD = {
  manifest: {
    schemaVersion: "1.0",
    id: "world.force-and-motion",
    version: "1.0.0",
    route: "/learn/force-and-motion",
    title: "ModelShift: Force and Motion",
    summary:
      "A deterministic force-and-motion world in which learners commit a model, test it against authored physics, and complete a cold transfer with assistance removed.",
    kind: "model",
    evidenceTier: "verified",
    ageModes: ["13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: { status: "available" },
    capabilityIds: ["capability.force-motion.zero-net-force"],
    sources: [],
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
    title: "Corroborate an AI Claim",
    summary:
      "A source-evidence world for tracing a model-generated factual claim to reviewed research sources, comparing support, and stating uncertainty without treating model fluency as proof.",
    kind: "evidence",
    evidenceTier: "grounded",
    ageModes: ["13-17", "18-plus"],
    depthModes: ["introductory", "core", "advanced"],
    availability: { status: "available" },
    capabilityIds: ["capability.ai-literacy.source-corroboration"],
    deterministicValidatorId: SOURCE_CORROBORATION_VALIDATOR_ID,
    sources: [
      {
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
      },
      {
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
      },
    ],
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
    title: "Proportional Reasoning: Compare and Scale",
    summary:
      "An exact-arithmetic model world in which learners compare two mixture relationships, normalize a shared quantity, reconstruct proportionality, and transfer the relationship to an unfamiliar map scale.",
    kind: "model",
    evidenceTier: "verified",
    ageModes: ["under-13", "13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: { status: "available" },
    capabilityIds: ["capability.proportional-reasoning.compare-and-scale"],
    sources: [],
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

export const BUILT_IN_WORLD_PACKS = [
  FORCE_AND_MOTION_WORLD,
  PROPORTIONAL_REASONING_WORLD,
  SOURCE_CORROBORATION_WORLD,
] as const;
export const BUILT_IN_DETERMINISTIC_VALIDATORS = [
  forceAndMotionTransferValidator,
  proportionalReasoningTransferValidator,
  sourceCorroborationTransferValidator,
] as const;
