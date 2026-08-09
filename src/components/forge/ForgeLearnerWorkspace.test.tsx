// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyPathDecision,
  createInitialActivityStates,
  createLearningPathRevision,
  type PathDecisionV1,
} from "@/src/forge/continuity";
import {
  createDeviceContinuityRecord,
  encodeDeviceContinuityLedger,
} from "@/src/lib/forge-continuity";
import {
  createForgeDeviceProfile,
  forgeProfileBoundStorageKey,
} from "@/src/lib/forge-profile/device-profile";

import {
  FORGE_CONTINUITY_STORAGE_KEY,
} from "./continuity-client";
import { ForgeToday } from "./ForgeLearnerWorkspace";

const NOW = "2026-08-01T09:00:00.000Z";
const PROFILE_ID = "9be711de-d7a6-4911-b903-f2d829da83d5";
const PRIMARY_SOURCE_WORLD_REF = {
  worldId: "world.primary-source-reasoning",
  worldVersion: "1.0.2",
  worldRoute: "/learn/primary-source-reasoning",
  activityProtocol: "activity" as const,
  sourceIds: [
    "source.loc.primary-source-analysis",
    "source.loc.picture.90706156",
    "source.loc.picture.2017716911",
  ],
};

async function acceptedPrimarySourceRecord() {
  const goal = {
    schemaVersion: "learner-goal.v1" as const,
    goalId: "goal.primary-source",
    storageClass: "learner-owned-device-local" as const,
    learnerWords: "Separate observation from inference in historical photographs.",
    desiredOutcome: "Classify a new historical source.",
    createdAt: NOW,
  };
  const candidate = await createLearningPathRevision({
    schemaVersion: "learning-path-revision.v1",
    pathId: "path.primary-source",
    revisionId: "path-revision.primary-source-1",
    revisionNumber: 1,
    goalRef: { goalId: goal.goalId },
    planKind: "grounded_learning",
    status: "candidate",
    title: "Primary source reasoning",
    authority: {
      kind: "reviewed_world",
      executionEligible: true,
      reviewStatus: "reviewed",
      worldRef: PRIMARY_SOURCE_WORLD_REF,
    },
    nodes: [{
      nodeId: "path-node.primary-source",
      position: 0,
      title: "Commit what the image can establish",
      objective: "Classify the evidence in an unfamiliar historical photograph.",
      prerequisiteNodeIds: [],
      authority: {
        kind: "reviewed_world",
        executionEligible: true,
        reviewStatus: "reviewed",
        worldRef: PRIMARY_SOURCE_WORLD_REF,
      },
      activity: {
        activityId: "activity.world-primary-source-reasoning",
        kind: "reviewed_world_activity",
        runnable: true,
        worldRef: PRIMARY_SOURCE_WORLD_REF,
      },
    }],
    sourcePlanDigest: `sha256:${"b".repeat(64)}`,
    executionAllowed: false,
    acceptanceDecisionId: null,
    supersedesRevisionId: null,
    createdAt: NOW,
  });

  const decision: PathDecisionV1 = {
    schemaVersion: "path-decision.v1",
    decisionId: "path-decision.primary-source-accept",
    decision: "accept",
    pathId: candidate.pathId,
    baseRevisionId: candidate.revisionId,
    baseRevisionNumber: candidate.revisionNumber,
    baseRevisionDigest: candidate.revisionDigest,
    resultRevisionId: "path-revision.primary-source-2",
    decidedAt: "2026-08-01T09:01:00.000Z",
  };
  const accepted = await applyPathDecision(candidate, decision);
  if (!accepted.accepted) throw new Error("Expected the Primary Source path to be accepted.");

  const initialized = await createInitialActivityStates(
    accepted.revision,
    "2026-08-01T09:02:00.000Z",
  );
  if (!initialized.ok) throw new Error("Expected Primary Source activity states.");

  return createDeviceContinuityRecord({
    recordId: "continuity-record.primary-source",
    goal,
    revisions: [candidate, accepted.revision],
    decisions: [decision],
    activityStates: initialized.states,
    currentRevisionId: accepted.revision.revisionId,
    updatedAt: "2026-08-01T09:02:00.000Z",
  });
}

beforeEach(() => {
  createForgeDeviceProfile(
    window.localStorage,
    "adult",
    false,
    new Date("2026-08-02T00:00:00.000Z"),
    PROFILE_ID,
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ForgeToday return proof copy", () => {
  it("keeps the boundary path-neutral for an accepted Primary Source path", async () => {
    const record = await acceptedPrimarySourceRecord();
    const encoded = encodeDeviceContinuityLedger({
      format: "forge-device-continuity",
      schemaVersion: 1,
      records: [record],
    });
    if (!encoded) throw new Error("Expected an encodable continuity ledger.");
    window.localStorage.setItem(
      forgeProfileBoundStorageKey(FORGE_CONTINUITY_STORAGE_KEY, PROFILE_ID),
      encoded,
    );

    render(<ForgeToday />);

    await waitFor(() => {
      expect(screen.getByText(/world\.primary-source-reasoning · v1\.0\.2/)).toBeInTheDocument();
    });
    const status = screen.getByText("Return proof", { exact: true });
    const section = status.closest("section");
    if (!section) throw new Error("Expected Return proof to be in a section.");
    const returnProof = within(section);

    expect(returnProof.getByRole("heading")).toHaveTextContent(
      "No reviewed delayed task is scheduled.",
    );
    expect(returnProof.getByText(
      "A delayed task can be scheduled only for a World with a reviewed task family and after an exact protected proof. FORGE will not generate a retention claim without both.",
    )).toBeInTheDocument();
    expect(returnProof.queryByText(/Force & motion/i)).not.toBeInTheDocument();
  });
});
