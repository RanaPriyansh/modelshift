import { describe, expect, it } from "vitest";

import {
  EVIDENCE_TIERS,
  LEARNER_AGE_MODES,
  LEARNER_DEPTH_MODES,
  WORLD_KINDS,
  aiActionBoundarySchema,
  assistanceEventSchema,
  evidenceRecordSchema,
  learningWorldManifestSchema,
  proofClaimSchema,
  returnProofScheduleSchema,
  type ProofClaim,
} from "./contracts";
import { FORCE_AND_MOTION_WORLD } from "./worlds";

const AI_OFF = {
  mode: "off",
  allowedActions: [],
  retrievalMode: "none",
  modelMayDetermineCorrectness: false,
  modelMayChangePolicy: false,
} as const;

describe("Forge runtime contracts", () => {
  it("exports the exact learner, evidence, and world vocabularies", () => {
    expect(LEARNER_AGE_MODES).toEqual(["under-13", "13-17", "18-plus"]);
    expect(LEARNER_DEPTH_MODES).toEqual(["introductory", "core", "advanced"]);
    expect(EVIDENCE_TIERS).toEqual(["verified", "grounded", "exploratory", "restricted"]);
    expect(WORLD_KINDS).toEqual(["model", "evidence", "practice", "project"]);
  });

  it("strictly parses a complete manifest and rejects undeclared fields", () => {
    expect(learningWorldManifestSchema.safeParse(FORCE_AND_MOTION_WORLD.manifest).success).toBe(true);
    expect(
      learningWorldManifestSchema.safeParse({ ...FORCE_AND_MOTION_WORLD.manifest, clientTrusted: true }).success,
    ).toBe(false);
  });

  it("requires AI-off boundaries to have no model action or retrieval path", () => {
    expect(aiActionBoundarySchema.safeParse(AI_OFF).success).toBe(true);
    expect(aiActionBoundarySchema.safeParse({ ...AI_OFF, allowedActions: ["coach-question"] }).success).toBe(false);
    expect(aiActionBoundarySchema.safeParse({ ...AI_OFF, retrievalMode: "curated-only" }).success).toBe(false);
  });

  it("requires AI assistance events to identify the bounded action and model version", () => {
    const event = {
      id: "event.assistance.001",
      learnerRef: "learner.pseudonym.001",
      worldId: "world.force-and-motion",
      capabilityId: "capability.force-motion.zero-net-force",
      occurredAt: "2026-07-22T00:00:00.000Z",
      stageId: "stage.interpret",
      kind: "attention-cue",
      source: "ai",
      aiAction: "classify-evidence",
      modelVersion: "gpt-example-2026-07",
      policyDecision: "allowed",
      reasonCode: "policy.minimum-cue",
      assistanceWeight: 0.2,
      protectedOperationOverlap: 0.1,
      evidenceRecordIds: [],
    };

    expect(assistanceEventSchema.safeParse(event).success).toBe(true);
    expect(assistanceEventSchema.safeParse({ ...event, modelVersion: undefined }).success).toBe(false);
    expect(assistanceEventSchema.safeParse({ ...event, aiAction: undefined }).success).toBe(false);
    expect(assistanceEventSchema.safeParse({ ...event, source: "authored" }).success).toBe(false);
  });

  it("accepts non-AI assistance without model metadata", () => {
    const result = assistanceEventSchema.safeParse({
      id: "event.assistance.002",
      learnerRef: "learner.pseudonym.001",
      worldId: "world.force-and-motion",
      capabilityId: "capability.force-motion.zero-net-force",
      occurredAt: "2026-07-22T00:00:00.000Z",
      stageId: "stage.experiment",
      kind: "accessibility",
      source: "accessibility",
      policyDecision: "allowed",
      reasonCode: "policy.accessibility-equivalent",
      assistanceWeight: 0,
      protectedOperationOverlap: 0,
      evidenceRecordIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects proof claims that leave AI enabled", () => {
    const claim = structuredClone(FORCE_AND_MOTION_WORLD.proofClaims[0]) as ProofClaim;
    claim.aiBoundary = {
      mode: "bounded",
      allowedActions: ["coach-question"],
      retrievalMode: "none",
      modelMayDetermineCorrectness: false,
      modelMayChangePolicy: false,
    };
    expect(proofClaimSchema.safeParse(claim).success).toBe(false);
  });

  it("requires proof evidence to identify a claim and record AI as off", () => {
    const record = {
      id: "evidence.transfer.001",
      learnerRef: "learner.pseudonym.001",
      worldId: "world.force-and-motion",
      capabilityId: "capability.force-motion.zero-net-force",
      proofClaimId: "proof.force-motion.independent-transfer",
      taskId: "task.cargo-pod-transfer",
      taskVersion: "1.0.0",
      observedAt: "2026-07-22T00:00:00.000Z",
      kind: "proof",
      result: "demonstrated",
      score: 1,
      aiMode: "off",
      assistanceEventIds: [],
      sourceIds: [],
      validatorId: "validator.force-motion-transfer.v1",
      responseDigest: `sha256:${"a".repeat(64)}`,
    };

    expect(evidenceRecordSchema.safeParse(record).success).toBe(true);
    expect(evidenceRecordSchema.safeParse({ ...record, aiMode: "bounded" }).success).toBe(false);
    expect(evidenceRecordSchema.safeParse({ ...record, proofClaimId: undefined }).success).toBe(false);
  });

  it("allows bounded AI on non-proof attempt evidence", () => {
    const result = evidenceRecordSchema.safeParse({
      id: "evidence.attempt.001",
      learnerRef: "learner.pseudonym.001",
      worldId: "world.source-corroboration",
      capabilityId: "capability.ai-literacy.source-corroboration",
      taskId: "task.claim-map",
      taskVersion: "0.1.0",
      observedAt: "2026-07-22T00:00:00.000Z",
      kind: "attempt",
      result: "partial",
      aiMode: "bounded",
      assistanceEventIds: ["event.assistance.001"],
      sourceIds: ["source.unesco.genai-education-guidance-2023"],
    });
    expect(result.success).toBe(true);
  });

  it("validates chronological, AI-off return-proof schedules", () => {
    const schedule = {
      id: "schedule.return-proof.001",
      learnerRef: "learner.pseudonym.001",
      worldId: "world.force-and-motion",
      capabilityId: "capability.force-motion.zero-net-force",
      proofClaimId: "proof.force-motion.independent-transfer",
      taskFamilyId: "task-family.force-motion.return",
      excludedTaskIds: ["task.cargo-pod-transfer"],
      scheduledAt: "2026-07-22T00:00:00.000Z",
      opensAt: "2026-07-29T00:00:00.000Z",
      dueAt: "2026-08-01T00:00:00.000Z",
      status: "scheduled",
      aiBoundary: AI_OFF,
    };

    expect(returnProofScheduleSchema.safeParse(schedule).success).toBe(true);
    expect(returnProofScheduleSchema.safeParse({ ...schedule, dueAt: schedule.opensAt }).success).toBe(false);
    expect(
      returnProofScheduleSchema.safeParse({
        ...schedule,
        aiBoundary: { ...AI_OFF, mode: "bounded", allowedActions: ["coach-question"] },
      }).success,
    ).toBe(false);
  });
});
