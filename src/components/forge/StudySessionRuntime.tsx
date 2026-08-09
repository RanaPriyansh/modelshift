"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { ModelShiftExperience } from "@/src/components/experience/ModelShiftExperience";
import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";
import { ProportionalReasoningWorld } from "@/src/components/worlds/proportional-reasoning";
import { EvidenceLearningWorld } from "@/src/components/worlds/ai-learning";
import {
  isAudienceAllowed,
  isProfileAllowedByAgePolicy,
  requiresFreshGrownUpConfirmation,
  type WorldEntryPolicy,
} from "@/src/lib/forge-auth/world-entry-policy";
import { studySessionIdSchema } from "@/src/forge/continuity";
import {
  clearWorldSessionCheckpoint,
  completeDeviceStudySession,
} from "@/src/lib/forge-continuity";
import {
  FORGE_DEVICE_PROFILE_EVENT,
  FORGE_DEVICE_PROFILE_KEY,
  readForgeDeviceProfile,
  createActiveForgeProfileBoundStorage,
} from "@/src/lib/forge-profile/device-profile";
import type { BoundedLocalWorldRuntimeReceipt } from "@/src/forge/world-runtime";

import {
  createBrowserContinuityStore,
  useDeviceContinuity,
} from "./continuity-client";
import { ForgeStatus } from "./ForgePrimitives";

const SERVER_PROFILE_SNAPSHOT = "__forge_study_profile_server__";

export type StudyWorldLaunchPolicy = WorldEntryPolicy & Readonly<{
  worldVersion: string;
  worldRoute: string;
  activityProtocol: "modelshift" | "activity";
  sourceIds: readonly string[];
}>;

function exactReleasedWorldBinding(
  policy: StudyWorldLaunchPolicy,
  session: {
    worldRef: {
      worldVersion: string;
      worldRoute: string;
      activityProtocol: "modelshift" | "activity";
      sourceIds: readonly string[];
    };
  },
) {
  return (
    policy.worldVersion === session.worldRef.worldVersion
    && policy.worldRoute === session.worldRef.worldRoute
    && policy.activityProtocol === session.worldRef.activityProtocol
    && policy.sourceIds.length === session.worldRef.sourceIds.length
    && policy.sourceIds.every(
      (sourceId, index) => sourceId === session.worldRef.sourceIds[index],
    )
  );
}

function subscribeToProfile(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === FORGE_DEVICE_PROFILE_KEY) onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FORGE_DEVICE_PROFILE_EVENT, onStoreChange);
  };
}

function profileSnapshot() {
  try {
    return window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY);
  } catch {
    return null;
  }
}

function SessionUnavailable({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <section className="forge-app-empty" role="alert">
        <ForgeStatus tone="human">Session unavailable</ForgeStatus>
        <h1>{title}</h1>
        <p>{detail} No path completion or evidence correlation is being claimed.</p>
        <Link href="/app/study">Return to the action brief</Link>
      </section>
    </main>
  );
}

export function StudySessionRuntime({
  sessionId,
  policies,
  focusKind,
}: {
  sessionId: string;
  policies: readonly StudyWorldLaunchPolicy[];
  /**
   * Focus URLs are protocol-specific, rather than alternate ways to select a
   * World. Keep this optional for the standard session detail route.
   */
  focusKind?: "activity" | "modelshift";
}) {
  const { state } = useDeviceContinuity();
  const rawProfile = useSyncExternalStore(
    subscribeToProfile,
    profileSnapshot,
    () => SERVER_PROFILE_SNAPSHOT,
  );
  const [receiptState, setReceiptState] = useState<
    | { phase: "idle" }
    | { phase: "recording" }
    | { phase: "failed"; message: string }
  >({ phase: "idle" });
  const [
    confirmedChildSessionBinding,
    setConfirmedChildSessionBinding,
  ] = useState<string | null>(null);
  const receiptInFlight = useRef<string | null>(null);
  const onCheckpointError = useCallback(() => {
    setReceiptState({
      phase: "failed",
      message:
        "FORGE could not safely update or replay this device-local session checkpoint.",
    });
  }, []);

  const onRuntimeReceipt = useCallback(async (
    receipt: BoundedLocalWorldRuntimeReceipt,
  ) => {
    if (
      receiptInFlight.current === receipt.attemptId
      || !studySessionIdSchema.safeParse(sessionId).success
    ) {
      return;
    }
    receiptInFlight.current = receipt.attemptId;
    setReceiptState({ phase: "recording" });
    const completed = await completeDeviceStudySession({
      store: createBrowserContinuityStore(),
      sessionId,
      receipt,
      completedAt: new Date().toISOString(),
    });
    if (!completed.ok) {
      receiptInFlight.current = null;
      setReceiptState({
        phase: "failed",
        message: completed.reason === "evidence_not_recorded"
          ? "The runtime receipt could not be written to the learner-owned evidence ledger."
          : "The runtime receipt did not close this exact path session.",
      });
      return;
    }
    const storage = createActiveForgeProfileBoundStorage(window.localStorage);
    if (!storage) {
      setReceiptState({
        phase: "failed",
        message: "FORGE could not safely clear this device-local session checkpoint.",
      });
      return;
    }
    const cleared = clearWorldSessionCheckpoint(storage, {
      sessionId,
      worldId: receipt.world.id,
      worldVersion: receipt.world.version,
    });
    if (!cleared.ok) {
      setReceiptState({
        phase: "failed",
        message: "FORGE could not safely clear this device-local session checkpoint.",
      });
    }
  }, [sessionId]);

  if (!studySessionIdSchema.safeParse(sessionId).success) {
    return (
      <SessionUnavailable
        title="This study-session address is not valid."
        detail="Only an opaque local session identity may appear in this route."
      />
    );
  }
  if (state.phase === "loading" || rawProfile === SERVER_PROFILE_SNAPSHOT) {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <p className="forge-app-loading" role="status">Opening the exact local study session…</p>
      </main>
    );
  }
  if (
    state.result.status === "storage_unavailable"
    || state.result.status === "storage_error"
    || state.result.status === "reset_malformed"
    || state.result.status === "reset_unknown_version"
  ) {
    return (
      <SessionUnavailable
        title="FORGE cannot safely read this device session."
        detail="Unreadable or unavailable learner-owned continuity data remains untouched."
      />
    );
  }

  const matches = state.result.ledger.records.flatMap((record) =>
    record.studySessions
      .filter((session) => session.sessionId === sessionId)
      .map((session) => ({ record, session })));
  if (matches.length !== 1) {
    return (
      <SessionUnavailable
        title="This local study session was not found."
        detail="It may belong to another browser, or its learner-owned path may have been deleted."
      />
    );
  }
  const { record, session } = matches[0]!;
  const expectedFocusKind = session.worldRef.activityProtocol;
  if (focusKind && focusKind !== expectedFocusKind) {
    return (
      <SessionUnavailable
        title="This focus address does not match the bound learning protocol."
        detail="FORGE will not relabel or substitute a path session to satisfy a URL."
      />
    );
  }
  const policy = policies.find((candidate) => candidate.worldId === session.worldRef.worldId);
  if (!policy || !exactReleasedWorldBinding(policy, session)) {
    return (
      <SessionUnavailable
        title="The exact bound World build is not currently released."
        detail="FORGE will not substitute another World, version, route, or reviewed source set."
      />
    );
  }

  const profile = rawProfile
    ? readForgeDeviceProfile({ getItem: () => rawProfile })
    : null;
  if (
    !profile
    || !isAudienceAllowed(policy, profile.ageMode)
    || !isProfileAllowedByAgePolicy(policy.allowedAgeModes, profile.ageMode)
  ) {
    return (
      <SessionUnavailable
        title="This device mode cannot open the bound World."
        detail="The released World policy and a valid local device profile must both allow entry."
      />
    );
  }

  const childSessionBinding =
    `study-session:${profile.profileId}:${session.sessionId}`;
  if (
    requiresFreshGrownUpConfirmation(policy.allowedAgeModes, profile.ageMode)
    && confirmedChildSessionBinding !== childSessionBinding
  ) {
    return (
      <main
        className="forge-app-page"
        data-testid="study-session-grown-up-confirmation"
        id="forge-main"
        tabIndex={-1}
      >
        <section className="forge-app-empty">
          <ForgeStatus tone="human">Fresh local check</ForgeStatus>
          <h1>A grown-up must confirm this exact study session.</h1>
          <p>
            This in-memory confirmation applies only to{" "}
            <code>{session.sessionId}</code> on this screen and is cleared on
            reload. It does not verify identity, guardianship, consent, or
            authority.
          </p>
          <button
            className="forge-primary-action"
            onClick={() => setConfirmedChildSessionBinding(childSessionBinding)}
            type="button"
          >
            A grown-up is here for this exact session
          </button>
          <Link href="/app/study">Return without opening the World</Link>
        </section>
      </main>
    );
  }

  if (session.status === "completed") {
    const correlation = session.runtimeCorrelation;
    if (!correlation) {
      return (
        <SessionUnavailable
          title="This completed session is missing its bounded runtime receipt."
          detail="FORGE will not invent evidence identity or reopen a completed path node."
        />
      );
    }
    const delayedReturn = record.delayedReturnTasks.find(
      (task) => task.studySessionId === session.sessionId,
    ) ?? null;
    return (
      <main
        className="forge-app-page"
        data-testid="study-session-completed"
        id="forge-main"
        tabIndex={-1}
      >
        <section className="forge-app-empty">
          <ForgeStatus tone="evidence">Runtime receipt accepted</ForgeStatus>
          <h1>This exact path activity is complete.</h1>
          <p>
            The bounded runtime receipt created evidence identity{" "}
            <code>{correlation.evidenceEntryId}</code> and closed only this
            local path node. {delayedReturn
              ? "A separate delayed-return task is scheduled; retention and broader capability remain untested until separate evidence says otherwise."
              : "Delayed retention and broader capability remain untested."}
          </p>
          <Link href={`/app/evidence/${encodeURIComponent(correlation.evidenceEntryId)}`}>
            Inspect bounded evidence
          </Link>
          {delayedReturn ? (
            <Link href={`/app/returns/${encodeURIComponent(delayedReturn.returnId)}`}>
              Inspect scheduled delayed return
            </Link>
          ) : null}
          <Link href="/app/path">Return to my path</Link>
        </section>
      </main>
    );
  }

  const world = (() => {
    switch (policy.worldId) {
      case "world.force-and-motion":
        return (
          <ModelShiftExperience
            checkpointIdentity={{
              sessionId,
              worldId: session.worldRef.worldId,
              worldVersion: session.worldRef.worldVersion,
            }}
            onCheckpointError={onCheckpointError}
            onRuntimeReceipt={onRuntimeReceipt}
          />
        );
      case "world.source-corroboration":
        return (
          <EvidenceLearningWorld
            checkpointIdentity={{
              sessionId,
              worldId: session.worldRef.worldId,
              worldVersion: session.worldRef.worldVersion,
            }}
            onCheckpointError={onCheckpointError}
            onRuntimeReceipt={onRuntimeReceipt}
          />
        );
      case "world.proportional-reasoning":
        return (
          <ProportionalReasoningWorld
            audience={profile.ageMode}
            checkpointIdentity={{
              sessionId,
              worldId: session.worldRef.worldId,
              worldVersion: session.worldRef.worldVersion,
            }}
            onCheckpointError={onCheckpointError}
            onRuntimeReceipt={onRuntimeReceipt}
          />
        );
      case "world.primary-source-reasoning":
        return (
          <PrimarySourceReasoningWorld
            checkpointIdentity={{
              sessionId,
              worldId: session.worldRef.worldId,
              worldVersion: session.worldRef.worldVersion,
            }}
            onCheckpointError={onCheckpointError}
            onRuntimeReceipt={onRuntimeReceipt}
          />
        );
    }
  })();

  return (
    <div data-testid="study-session-runtime">
      <header
        aria-label="Exact local path session"
        className="forge-world-entry-disclosure forge-world-entry-disclosure--session"
      >
        <strong className="forge-world-entry-disclosure-title">
          Exact local path session
        </strong>
        <dl className="forge-world-entry-metadata">
          <div>
            <dt>World</dt>
            <dd>{session.worldRef.worldId}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>v{session.worldRef.worldVersion}</dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd>{session.activityId}</dd>
          </div>
        </dl>
        <Link className="forge-world-entry-return" href="/app/study">
          Return without claiming completion
        </Link>
      </header>
      {receiptState.phase === "recording" ? (
        <p className="forge-app-message" role="status">
          Binding the genuine runtime receipt to local evidence and this exact path activity…
        </p>
      ) : null}
      {receiptState.phase === "failed" ? (
        <p className="forge-app-message" role="alert">{receiptState.message}</p>
      ) : null}
      {world}
    </div>
  );
}
