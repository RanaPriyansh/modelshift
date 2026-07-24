// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundedLocalWorldRuntimeReceipt } from "@/src/forge/world-runtime";

const mocked = vi.hoisted(() => ({
  clearCheckpoint: vi.fn(),
  complete: vi.fn(),
  state: {
    phase: "ready",
    result: {
      status: "ok",
      ledger: { records: [] as unknown[] },
    },
  },
  ratioProps: [] as Array<{
    audience: string;
    checkpointIdentity?: {
      sessionId: string;
      worldId: string;
      worldVersion: string;
    };
    onCheckpointError?: (reason: string) => void;
    onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
  }>,
}));

vi.mock("@/src/lib/forge-continuity", () => ({
  clearWorldSessionCheckpoint: mocked.clearCheckpoint,
  completeDeviceStudySession: mocked.complete,
}));
vi.mock("./continuity-client", () => ({
  createBrowserContinuityStore: () => ({ kind: "browser-continuity-store" }),
  useDeviceContinuity: () => ({ state: mocked.state }),
}));
vi.mock("@/src/components/experience/ModelShiftExperience", () => ({
  ModelShiftExperience: () => <div>force world</div>,
}));
vi.mock("@/src/components/worlds/ai-learning", () => ({
  EvidenceLearningWorld: () => <div>source world</div>,
}));
vi.mock("@/src/components/worlds/primary-source-reasoning", () => ({
  PrimarySourceReasoningWorld: () => <div>primary source world</div>,
}));
vi.mock("@/src/components/worlds/proportional-reasoning", () => ({
  ProportionalReasoningWorld: (props: {
    audience: string;
    checkpointIdentity?: {
      sessionId: string;
      worldId: string;
      worldVersion: string;
    };
    onCheckpointError?: (reason: string) => void;
    onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
  }) => {
    mocked.ratioProps.push(props);
    return (
      <main>
        <button
          type="button"
          onClick={() => props.onRuntimeReceipt?.({
            attemptId: "attempt.component-session",
            world: {
              id: "world.proportional-reasoning",
              version: "1.0.2",
            },
          } as BoundedLocalWorldRuntimeReceipt)}
        >
          emit genuine runtime receipt
        </button>
      </main>
    );
  },
}));

import { StudySessionRuntime } from "./StudySessionRuntime";

const SESSION = {
  schemaVersion: "study-session.v1",
  sessionId: "study-session.component-ratios",
  recordId: "continuity-record.component-ratios",
  pathId: "path.component-ratios",
  pathRevisionId: "path-revision.component-ratios-2",
  pathRevisionDigest: `sha256:${"1".repeat(64)}`,
  nodeId: "path-node.world-proportional_reasoning",
  activityId: "activity.world-proportional_reasoning",
  worldRef: {
    worldId: "world.proportional-reasoning",
    worldVersion: "1.0.2",
    worldRoute: "/learn/proportional-reasoning",
    activityProtocol: "activity",
    sourceIds: ["source.openstax.ratios-and-rate"],
  },
  sessionVersion: 1,
  status: "active",
  startedAt: "2026-07-24T12:03:00.000Z",
  updatedAt: "2026-07-24T12:03:00.000Z",
  completedAt: null,
  runtimeCorrelation: null,
} as const;

const POLICIES = [{
  worldId: "world.proportional-reasoning",
  worldTitle: "Proportional reasoning",
  allowedAgeModes: ["13-17", "18-plus"],
  allowedAudienceModes: ["teen", "adult"],
  worldVersion: "1.0.2",
  worldRoute: "/learn/proportional-reasoning",
  activityProtocol: "activity",
  sourceIds: ["source.openstax.ratios-and-rate"],
}] as const;

const CHILD_POLICIES = [{
  ...POLICIES[0],
  allowedAgeModes: ["under-13", "13-17", "18-plus"],
  allowedAudienceModes: ["child_with_grown_up", "teen", "adult"],
}] as const;

function setAdultProfile() {
  window.localStorage.setItem("forge.device-profile:v1", JSON.stringify({
    schemaVersion: 1,
    profileId: "81000000-0000-4000-8000-000000000001",
    ageMode: "adult",
    guardianPresent: false,
    createdAt: "2026-07-24T12:00:00.000Z",
  }));
}

function setTeenProfile() {
  window.localStorage.setItem("forge.device-profile:v1", JSON.stringify({
    schemaVersion: 1,
    profileId: "81000000-0000-4000-8000-000000000002",
    ageMode: "teen",
    guardianPresent: false,
    createdAt: "2026-07-24T12:00:00.000Z",
  }));
}

function setChildProfile() {
  window.localStorage.setItem("forge.device-profile:v1", JSON.stringify({
    schemaVersion: 1,
    profileId: "81000000-0000-4000-8000-000000000003",
    ageMode: "child_with_grown_up",
    guardianPresent: true,
    createdAt: "2026-07-24T12:00:00.000Z",
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  mocked.clearCheckpoint.mockReset();
  mocked.clearCheckpoint.mockReturnValue({ ok: true, operation: "cleared" });
  mocked.complete.mockReset();
  mocked.ratioProps.length = 0;
  mocked.state.phase = "ready";
  mocked.state.result.status = "ok";
  mocked.state.result.ledger.records = [{
    recordId: SESSION.recordId,
    studySessions: [SESSION],
    delayedReturnTasks: [],
  }];
  mocked.complete.mockResolvedValue({
    ok: true,
    operation: "completed",
    session: { ...SESSION, status: "completed" },
    evidenceEntryId: "proof.attempt.component-session",
  });
});

afterEach(() => {
  cleanup();
});

describe("StudySessionRuntime", () => {
  it("renders only the exactly bound World and sends its receipt through the session coordinator", async () => {
    setAdultProfile();
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );

    expect(screen.getByTestId("study-session-runtime").textContent).toContain(
      "world.proportional-reasoning · v1.0.2 · activity.world-proportional_reasoning",
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(mocked.ratioProps.at(-1)?.audience).toBe("adult");
    expect(mocked.ratioProps.at(-1)?.checkpointIdentity).toEqual({
      sessionId: "study-session.component-ratios",
      worldId: "world.proportional-reasoning",
      worldVersion: "1.0.2",
    });
    expect(mocked.ratioProps.at(-1)?.onCheckpointError).toEqual(
      expect.any(Function),
    );
    expect(screen.queryByRole("button", { name: /record step worked through/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "emit genuine runtime receipt" }));

    await waitFor(() => expect(mocked.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "study-session.component-ratios",
        receipt: expect.objectContaining({ attemptId: "attempt.component-session" }),
      }),
    ));
    expect(mocked.clearCheckpoint).toHaveBeenCalledWith(
      window.localStorage,
      {
        sessionId: "study-session.component-ratios",
        worldId: "world.proportional-reasoning",
        worldVersion: "1.0.2",
      },
    );
  });

  it("follows the released teen policy without making a child guardian claim", () => {
    setTeenProfile();
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );

    expect(screen.getByText("emit genuine runtime receipt")).toBeTruthy();
    expect(mocked.ratioProps.at(-1)?.audience).toBe("teen");
    expect(screen.queryByText(/grown-up must confirm/i)).toBeNull();
    expect(screen.queryByText(/verify identity, guardianship/i)).toBeNull();
  });

  it("requires a fresh in-memory confirmation for the exact child session", () => {
    setChildProfile();
    const { rerender } = render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={CHILD_POLICIES}
      />,
    );

    expect(screen.getByRole("heading", {
      name: "A grown-up must confirm this exact study session.",
    })).toBeTruthy();
    expect(screen.getByText(/does not verify identity, guardianship, consent, or authority/i)).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: "A grown-up is here for this exact session",
    }));

    expect(screen.getByText("emit genuine runtime receipt")).toBeTruthy();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(mocked.ratioProps.at(-1)?.audience).toBe("child_with_grown_up");

    const secondSession = {
      ...SESSION,
      sessionId: "study-session.component-ratios-second",
    };
    mocked.state.result.ledger.records = [{
      recordId: SESSION.recordId,
      studySessions: [secondSession],
      delayedReturnTasks: [],
    }];
    rerender(
      <StudySessionRuntime
        sessionId="study-session.component-ratios-second"
        policies={CHILD_POLICIES}
      />,
    );

    expect(screen.getByRole("heading", {
      name: "A grown-up must confirm this exact study session.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("fails closed on an internally inconsistent child audience policy", () => {
    setChildProfile();
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={[{
          ...POLICIES[0],
          allowedAudienceModes: ["child_with_grown_up", "teen", "adult"],
        }]}
      />,
    );

    expect(screen.getByRole("heading", {
      name: "This device mode cannot open the bound World.",
    })).toBeTruthy();
    expect(screen.queryByText(/must confirm this exact study session/i)).toBeNull();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("fails closed when the local device profile is missing", () => {
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );
    expect(screen.getByRole("heading", {
      name: "This device mode cannot open the bound World.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("fails closed when the local device profile is corrupt", () => {
    window.localStorage.setItem("forge.device-profile:v1", "{not-json");
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );
    expect(screen.getByRole("heading", {
      name: "This device mode cannot open the bound World.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("refuses a ModelShift focus URL for a session bound to another activity grammar", () => {
    setAdultProfile();
    render(
      <StudySessionRuntime
        focusKind="modelshift"
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );
    expect(screen.getByRole("heading", {
      name: "This focus address does not match the bound learning protocol.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("allows the matching general activity focus URL", () => {
    setAdultProfile();
    render(
      <StudySessionRuntime
        focusKind="activity"
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );
    expect(screen.getByText("emit genuine runtime receipt")).toBeTruthy();
  });

  it("refuses to substitute a different released World version or source set", () => {
    setAdultProfile();
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={[{
          ...POLICIES[0],
          worldVersion: "1.0.3",
          sourceIds: ["source.unreviewed-substitute"],
        }]}
      />,
    );
    expect(screen.getByRole("heading", {
      name: "The exact bound World build is not currently released.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("refuses a released policy that relabels the bound activity protocol", () => {
    setAdultProfile();
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={[{
          ...POLICIES[0],
          activityProtocol: "modelshift",
        }]}
      />,
    );
    expect(screen.getByRole("heading", {
      name: "The exact bound World build is not currently released.",
    })).toBeTruthy();
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("shows correlation identity after completion without relaunching the World", () => {
    setAdultProfile();
    mocked.state.result.ledger.records = [{
      recordId: SESSION.recordId,
      studySessions: [{
        ...SESSION,
        sessionVersion: 2,
        status: "completed",
        completedAt: "2026-07-24T13:01:00.000Z",
        updatedAt: "2026-07-24T13:01:00.000Z",
        runtimeCorrelation: {
          evidenceEntryId: "proof.attempt.component-session",
        },
      }],
      delayedReturnTasks: [],
    }];
    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );
    expect(screen.getByTestId("study-session-completed").textContent).toContain(
      "proof.attempt.component-session",
    );
    expect(screen.queryByText("emit genuine runtime receipt")).toBeNull();
  });

  it("fails closed when a completed session has no bounded runtime correlation", () => {
    setAdultProfile();
    mocked.state.result.ledger.records = [{
      recordId: SESSION.recordId,
      studySessions: [{
        ...SESSION,
        sessionVersion: 2,
        status: "completed",
        completedAt: "2026-07-24T13:01:00.000Z",
        updatedAt: "2026-07-24T13:01:00.000Z",
        runtimeCorrelation: null,
      }],
      delayedReturnTasks: [],
    }];

    render(
      <StudySessionRuntime
        sessionId="study-session.component-ratios"
        policies={POLICIES}
      />,
    );

    expect(screen.getByRole("heading", {
      name: "This completed session is missing its bounded runtime receipt.",
    })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Inspect bounded evidence" })).toBeNull();
  });
});
