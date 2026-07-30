// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  complete: vi.fn(),
  state: {
    phase: "ready",
    result: {
      status: "ok",
      ledger: { records: [] as unknown[] },
    },
  },
  catalog: [{
    id: "world.force-and-motion",
    version: "1.0.2",
    route: "/learn/force-and-motion",
    title: "Force & motion",
    summary: "Reviewed force and motion World.",
    kind: "model",
    activityProtocol: "modelshift",
    evidenceTier: "verified",
    ageModes: ["13-17", "18-plus"] as string[],
    depthModes: ["introductory", "core"],
    sourceIds: ["source.openstax.newtons-first-law"],
  }],
}));

vi.mock("@/src/lib/forge-continuity", () => ({
  completeDeviceDelayedReturn: mocked.complete,
}));
vi.mock("./continuity-client", () => ({
  createBrowserContinuityStore: () => ({ kind: "browser-continuity-store" }),
  useDeviceContinuity: () => ({ state: mocked.state }),
}));
vi.mock("@/src/forge/worlds", () => ({
  PUBLIC_WORLD_CATALOG: mocked.catalog,
}));

import { ForgeDelayedReturnRuntime } from "./ForgeDelayedReturnRuntime";

const SCHEDULED_AT = "2026-07-24T13:00:00.000Z";
const DUE_AT = "2026-07-31T13:00:00.000Z";

function completedSession(suffix: string) {
  return {
    schemaVersion: "study-session.v1",
    sessionId: `study-session.${suffix}`,
    recordId: "continuity-record.force-return",
    pathId: "path.force-return",
    pathRevisionId: "path-revision.force-return-2",
    pathRevisionDigest: `sha256:${"a".repeat(64)}`,
    nodeId: `path-node.${suffix}`,
    activityId: `activity.${suffix}`,
    worldRef: {
      worldId: "world.force-and-motion",
      worldVersion: "1.0.2",
      worldRoute: "/learn/force-and-motion",
      activityProtocol: "modelshift",
      sourceIds: ["source.openstax.newtons-first-law"],
    },
    sessionVersion: 2,
    status: "completed",
    startedAt: "2026-07-24T12:00:00.000Z",
    updatedAt: "2026-07-24T13:01:00.000Z",
    completedAt: "2026-07-24T13:01:00.000Z",
    runtimeCorrelation: {
      schemaVersion: "study-runtime-correlation.v1",
      receiptSchemaVersion: "1.1.0",
      attemptId: `attempt.${suffix}`,
      receiptRecordedAt: SCHEDULED_AT,
      worldId: "world.force-and-motion",
      worldVersion: "1.0.2",
      runtimeBindingDigest: `sha256:${"b".repeat(64)}`,
      packageIntegrityHash: `sha256:${"c".repeat(64)}`,
      evidenceEntryId: `proof.attempt.${suffix}`,
    },
  };
}

function delayedReturn(suffix: string) {
  return {
    schemaVersion: "delayed-return-task.v1",
    returnId: `return-task.${suffix}`,
    recordId: "continuity-record.force-return",
    pathId: "path.force-return",
    pathRevisionId: "path-revision.force-return-2",
    nodeId: `path-node.${suffix}`,
    studySessionId: `study-session.${suffix}`,
    originEvidenceEntryId: `proof.attempt.${suffix}`,
    returnEvidenceEntryId: `return-proof.${suffix}`,
    worldId: "world.force-and-motion",
    worldVersion: "1.0.2",
    capabilityId: "capability.force-motion.zero-net-force",
    proofClaimId: "proof.force-motion.independent-transfer",
    taskFamilyId: "task-family.force-motion.delayed-velocity-return.v1",
    scheduledAt: SCHEDULED_AT,
    dueAt: DUE_AT,
    status: "scheduled",
    completedAt: null,
  };
}

function record(...suffixes: string[]) {
  return {
    recordId: "continuity-record.force-return",
    studySessions: suffixes.map(completedSession),
    delayedReturnTasks: suffixes.map(delayedReturn),
  };
}

function setProfile(
  ageMode: "child_with_grown_up" | "teen" | "adult",
  profileId: string,
) {
  window.localStorage.setItem("forge.device-profile:v1", JSON.stringify({
    schemaVersion: 1,
    profileId,
    ageMode,
    guardianPresent: ageMode === "child_with_grown_up",
    createdAt: "2026-07-24T12:00:00.000Z",
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T12:00:00.000Z"));
  window.localStorage.clear();
  mocked.complete.mockReset();
  mocked.complete.mockReturnValue({
    ok: true,
    operation: "completed",
    evidenceEntryId: "return-proof.force-return-one",
  });
  mocked.catalog[0]!.ageModes = ["13-17", "18-plus"];
  mocked.state.phase = "ready";
  mocked.state.result.status = "ok";
  mocked.state.result.ledger.records = [record("force-return-one")];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ForgeDelayedReturnRuntime", () => {
  it("preserves the adult due-task flow after exact origin and policy checks", () => {
    setProfile("adult", "82000000-0000-4000-8000-000000000001");

    render(<ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />);

    expect(screen.getByRole("heading", { name: "Motion after a brief push" })).toBeTruthy();
    expect(screen.queryByText(/grown-up must confirm/i)).toBeNull();
    fireEvent.click(screen.getByLabelText("It stays at a constant positive velocity."));
    fireEvent.click(screen.getByRole("button", { name: "Submit unaided return" }));

    expect(mocked.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        returnId: "return-task.force-return-one",
        receipt: expect.objectContaining({
          returnId: "return-task.force-return-one",
          outcome: "proved",
        }),
      }),
    );
  });

  it("allows a teen only when the released originating World policy allows teens, without a child guardian claim", () => {
    setProfile("teen", "82000000-0000-4000-8000-000000000002");

    render(<ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />);

    expect(screen.getByRole("heading", { name: "Motion after a brief push" })).toBeTruthy();
    expect(screen.queryByText(/grown-up/i)).toBeNull();
    expect(screen.queryByText(/guardianship/i)).toBeNull();
  });

  it("fails closed on a missing or corrupt local profile", () => {
    window.localStorage.setItem("forge.device-profile:v1", "{not-json");

    render(<ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />);

    expect(screen.getByRole("heading", {
      name: "This device mode cannot open the originating World.",
    })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Motion after a brief push" })).toBeNull();
  });

  it("rejects a return whose originating session and evidence receipt do not exactly bind", () => {
    setProfile("adult", "82000000-0000-4000-8000-000000000003");
    const invalidRecord = record("force-return-one");
    invalidRecord.studySessions[0]!.runtimeCorrelation.evidenceEntryId =
      "proof.attempt.different-origin";
    mocked.state.result.ledger.records = [invalidRecord];

    render(<ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />);

    expect(screen.getByRole("heading", {
      name: "The originating study session could not be verified.",
    })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Motion after a brief push" })).toBeNull();
  });

  it("does not turn a persistent child device mode into access when the originating World excludes children", () => {
    setProfile("child_with_grown_up", "82000000-0000-4000-8000-000000000004");

    render(<ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />);

    expect(screen.getByRole("heading", {
      name: "This device mode cannot open the originating World.",
    })).toBeTruthy();
    expect(screen.queryByText(/must confirm this exact delayed return/i)).toBeNull();
  });

  it("requires a fresh in-memory confirmation bound to the exact child return and origin session", () => {
    mocked.catalog[0]!.ageModes = ["under-13", "13-17", "18-plus"];
    setProfile("child_with_grown_up", "82000000-0000-4000-8000-000000000005");
    const { rerender } = render(
      <ForgeDelayedReturnRuntime returnId="return-task.force-return-one" />,
    );

    expect(screen.getByRole("heading", {
      name: "A grown-up must confirm this exact delayed return.",
    })).toBeTruthy();
    expect(screen.getByText(/does not verify identity, guardianship, consent, or authority/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Motion after a brief push" })).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: "A grown-up is here for this exact return",
    }));
    expect(screen.getByRole("heading", { name: "Motion after a brief push" })).toBeTruthy();

    mocked.state.result.ledger.records = [
      record("force-return-one", "force-return-two"),
    ];
    rerender(<ForgeDelayedReturnRuntime returnId="return-task.force-return-two" />);

    expect(screen.getByRole("heading", {
      name: "A grown-up must confirm this exact delayed return.",
    })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Motion after a brief push" })).toBeNull();
  });
});
