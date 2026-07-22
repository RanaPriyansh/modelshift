import {
  ARGUMENT_EVIDENCE_CAPABILITY_ID,
  ARGUMENT_EVIDENCE_CONTENT_VERSION,
  ARGUMENT_EVIDENCE_PROOF_CLAIM_ID,
  ARGUMENT_EVIDENCE_VALIDATOR_ID,
  ARGUMENT_EVIDENCE_WORLD_ID,
  ARGUMENT_EVIDENCE_WORLD_VERSION,
} from "../worlds/argument-evidence";
import type {
  AIActionBoundary,
  LearningWorldPack,
  SourceProvenance,
} from "./contracts";
import { deepFreeze } from "./deep-freeze";
import { argumentEvidenceTransferValidator } from "./deterministic-validators.internal";
import { ARGUMENT_EVIDENCE_RUNTIME_BINDING } from "./world-runtime/argument-evidence-binding";
import {
  BUILT_IN_DETERMINISTIC_VALIDATORS,
  BUILT_IN_SOURCE_IDS,
  BUILT_IN_WORLD_PACKS,
} from "./worlds";

const AI_OFF = {
  mode: "off",
  allowedActions: [],
  retrievalMode: "none",
  modelMayDetermineCorrectness: false,
  modelMayChangePolicy: false,
} satisfies AIActionBoundary;

/** Internal locator for a retained fixture that has no browser/static asset. */
export const ARGUMENT_EVIDENCE_AUTHORED_FIXTURE_SOURCE = {
  id: "source.argument-evidence.authored-fixture",
  title: "Argument & Evidence fictional authored fixture",
  publisher: "FORGE authored fixture",
  kind: "expert-authored",
  url: "forge-internal:source.argument-evidence.authored-fixture",
  contentVersion: ARGUMENT_EVIDENCE_CONTENT_VERSION,
  accessedAt: "2026-07-22T00:00:00.000Z",
  license: "FORGE internal authored curriculum candidate",
  review: { status: "pending" },
} as const satisfies SourceProvenance;

/**
 * Retained executable package only. Nothing in this module may be re-exported
 * by a client/public barrel before publication authority is granted.
 */
export const ARGUMENT_EVIDENCE_WORLD = deepFreeze({
  manifest: {
    schemaVersion: "1.0",
    id: ARGUMENT_EVIDENCE_WORLD_ID,
    version: ARGUMENT_EVIDENCE_WORLD_VERSION,
    route: "/learn/argument-evidence",
    title: "Argument & evidence",
    summary: "A retained authored-fixture package that separates topical detail from outcome-linked evidence in one bounded transfer task.",
    kind: "evidence",
    evidenceTier: "exploratory",
    ageModes: ["13-17", "18-plus"],
    depthModes: ["introductory", "core"],
    availability: {
      status: "unavailable",
      reason: "Retained package only: source, access, curriculum, independent review, and publication authority remain incomplete.",
    },
    capabilityIds: [ARGUMENT_EVIDENCE_CAPABILITY_ID],
    sources: [ARGUMENT_EVIDENCE_AUTHORED_FIXTURE_SOURCE],
    deterministicValidatorId: ARGUMENT_EVIDENCE_VALIDATOR_ID,
    aiBoundary: AI_OFF,
    returnProof: {
      enabled: false,
      reason: "No reviewed delayed task family or scheduler is published.",
      aiBoundary: AI_OFF,
    },
    safety: {
      guardianManaged: false,
      retrievalMode: "none",
      inputModeration: false,
      outputModeration: false,
      escalationMessage: "This authored World stays on its bounded claim-to-evidence task and does not provide real-world fact-checking or advice.",
      data: { collectPreciseLocation: false, trainOnLearnerContent: false, rawMediaRetention: "none" },
      prohibitedPhysicalRisks: ["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"],
    },
  },
  release: { status: "released", contentVersion: ARGUMENT_EVIDENCE_CONTENT_VERSION },
  capabilities: [
    {
      id: ARGUMENT_EVIDENCE_CAPABILITY_ID,
      version: "1.0.0",
      title: "Relate evidence to an exact claim",
      description: "Distinguish topical detail from an outcome-linked comparison and name one limitation in an authored claim-to-evidence task.",
      domain: "language and literacy",
      learnerCan: ["identify the authored item that bears on an exact claim", "name a bounded relation and limitation in one unfamiliar authored task"],
      prerequisites: [],
      representations: ["authored claim card", "paired evidence comparison", "claim-evidence-relation table", "cold-transfer table"],
      proofClaimIds: [ARGUMENT_EVIDENCE_PROOF_CLAIM_ID],
    },
  ],
  proofClaims: [
    {
      id: ARGUMENT_EVIDENCE_PROOF_CLAIM_ID,
      capabilityId: ARGUMENT_EVIDENCE_CAPABILITY_ID,
      statement: "On one unfamiliar authored bus-route task, the learner independently selects the outcome-linked item, relation, and named limitation after supports are withdrawn.",
      successCriteria: ["selects the authored outcome-linked transfer item", "names the authored outcome-comparison relation", "names the authored limitation in one assistance-free submission"],
      minimumEvidenceRecords: 1,
      aiBoundary: AI_OFF,
    },
  ],
  deterministicValidators: [
    {
      id: ARGUMENT_EVIDENCE_VALIDATOR_ID,
      capabilityId: ARGUMENT_EVIDENCE_CAPABILITY_ID,
      description: "Checks one authored claim-to-evidence cold-transfer selection without model judgment.",
      inputContractVersion: "1.0.0",
      outputContractVersion: "1.0.0",
    },
  ],
  runtime: ARGUMENT_EVIDENCE_RUNTIME_BINDING,
} satisfies LearningWorldPack);

export const INTERNAL_BUILT_IN_WORLD_PACKS = deepFreeze([
  ...BUILT_IN_WORLD_PACKS,
  ARGUMENT_EVIDENCE_WORLD,
] as const);

export const INTERNAL_BUILT_IN_WORLD_IDS = deepFreeze(INTERNAL_BUILT_IN_WORLD_PACKS.map(
  (pack) => pack.manifest.id,
));

export const INTERNAL_BUILT_IN_WORLD_ROUTES = deepFreeze(INTERNAL_BUILT_IN_WORLD_PACKS.map(
  (pack) => pack.manifest.route,
));

export const INTERNAL_BUILT_IN_SOURCE_IDS = deepFreeze([
  ...BUILT_IN_SOURCE_IDS,
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE_SOURCE.id,
] as const);

export const INTERNAL_BUILT_IN_DETERMINISTIC_VALIDATORS = deepFreeze([
  ...BUILT_IN_DETERMINISTIC_VALIDATORS,
  argumentEvidenceTransferValidator,
] as const);
