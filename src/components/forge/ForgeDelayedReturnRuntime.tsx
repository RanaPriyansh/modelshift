"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import {
  delayedReturnCompletionWindowEndsAt,
  delayedReturnIdSchema,
  delayedReturnTiming,
  type DelayedReturnTaskV1,
  type StudySessionV1,
} from "@/src/forge/continuity";
import {
  createForceMotionReturnAttemptReceipt,
} from "@/src/forge/delayed-return/force-motion-return";
import {
  FORCE_MOTION_RETURN_FAMILY,
  type ForceMotionReturnChoiceId,
} from "@/src/forge/delayed-return/force-motion-policy";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";
import {
  isProfileAllowedByAgePolicy,
  requiresFreshGrownUpConfirmation,
  type WorldEntryAgeMode,
} from "@/src/lib/forge-auth/world-entry-policy";
import {
  completeDeviceDelayedReturn,
  type DeviceContinuityRecordV1,
} from "@/src/lib/forge-continuity";
import {
  FORGE_DEVICE_PROFILE_EVENT,
  FORGE_DEVICE_PROFILE_KEY,
  readForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import { createBrowserContinuityStore, useDeviceContinuity } from "./continuity-client";
import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";

const SERVER_PROFILE_SNAPSHOT = "__forge_return_profile_server__";

function readableDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ReturnUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <section className="forge-app-empty" role="alert">
        <ForgeStatus tone="human">Return unavailable</ForgeStatus>
        <h1>{title}</h1>
        <p>{detail}</p>
        <Link href="/app/returns">Return to delayed-return tasks</Link>
      </section>
    </main>
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

function findTaskBinding(
  records: readonly DeviceContinuityRecordV1[],
  returnId: string,
): Readonly<{
  record: DeviceContinuityRecordV1;
  task: DelayedReturnTaskV1;
}> | null {
  const matches = records.flatMap((record) =>
    record.delayedReturnTasks
      .filter((task) => task.returnId === returnId)
      .map((task) => ({ record, task })));
  return matches.length === 1 ? matches[0]! : null;
}

function exactOriginatingSession(
  record: DeviceContinuityRecordV1,
  task: DelayedReturnTaskV1,
): StudySessionV1 | null {
  const matches = record.studySessions.filter(
    (session) => session.sessionId === task.studySessionId,
  );
  if (matches.length !== 1) return null;
  const session = matches[0]!;
  const correlation = session.runtimeCorrelation;
  if (
    session.status !== "completed"
    || session.recordId !== record.recordId
    || session.recordId !== task.recordId
    || session.pathId !== task.pathId
    || session.pathRevisionId !== task.pathRevisionId
    || session.nodeId !== task.nodeId
    || session.worldRef.worldId !== task.worldId
    || session.worldRef.worldVersion !== task.worldVersion
    || !correlation
    || correlation.worldId !== task.worldId
    || correlation.worldVersion !== task.worldVersion
    || correlation.evidenceEntryId !== task.originEvidenceEntryId
    || correlation.receiptRecordedAt !== task.scheduledAt
  ) {
    return null;
  }
  return session;
}

export function ForgeDelayedReturnRuntime({ returnId }: { readonly returnId: string }) {
  const { state } = useDeviceContinuity();
  const rawProfile = useSyncExternalStore(
    subscribeToProfile,
    profileSnapshot,
    () => SERVER_PROFILE_SNAPSHOT,
  );
  const [choiceId, setChoiceId] = useState<ForceMotionReturnChoiceId | null>(null);
  const [submission, setSubmission] = useState<"idle" | "saving" | "complete" | "failed">("idle");
  const [message, setMessage] = useState("");
  const [
    confirmedChildReturnBinding,
    setConfirmedChildReturnBinding,
  ] = useState<string | null>(null);

  if (!delayedReturnIdSchema.safeParse(returnId).success) {
    return <ReturnUnavailable title="This delayed-return address is not valid." detail="Only an opaque local return identity may appear in this route." />;
  }
  if (state.phase === "loading" || rawProfile === SERVER_PROFILE_SNAPSHOT) {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Opening the exact local return task…</p></main>;
  }
  if (
    state.result.status === "storage_unavailable"
    || state.result.status === "storage_error"
    || state.result.status === "reset_malformed"
    || state.result.status === "reset_unknown_version"
  ) {
    return <ReturnUnavailable title="FORGE cannot safely read this delayed-return task." detail="Unreadable or unavailable learner-owned continuity data remains untouched." />;
  }

  const binding = findTaskBinding(
    state.result.ledger.records,
    returnId,
  );
  if (!binding) {
    return <ReturnUnavailable title="This local return task was not found." detail="It may belong to another browser, or the learner may have deleted its local path." />;
  }
  const { record, task: exactTask } = binding;
  const originSession = exactOriginatingSession(record, exactTask);
  if (!originSession) {
    return (
      <ReturnUnavailable
        title="The originating study session could not be verified."
        detail="The exact path, World, version, session, and original evidence receipt must all match this return task."
      />
    );
  }

  const releasedOrigins = PUBLIC_WORLD_CATALOG.filter((world) =>
    world.id === originSession.worldRef.worldId
    && world.version === originSession.worldRef.worldVersion
    && world.route === originSession.worldRef.worldRoute
    && world.activityProtocol === originSession.worldRef.activityProtocol
    && world.sourceIds.length === originSession.worldRef.sourceIds.length
    && world.sourceIds.every(
      (sourceId, index) => sourceId === originSession.worldRef.sourceIds[index],
    ));
  if (releasedOrigins.length !== 1) {
    return (
      <ReturnUnavailable
        title="The originating World build is not currently released."
        detail="FORGE will not substitute another World, version, route, or audience policy for this delayed return."
      />
    );
  }
  const originWorld = releasedOrigins[0]!;
  const allowedAgeModes = originWorld.ageModes as readonly WorldEntryAgeMode[];
  const profile = rawProfile
    ? readForgeDeviceProfile({ getItem: () => rawProfile })
    : null;
  if (
    !profile
    || !isProfileAllowedByAgePolicy(allowedAgeModes, profile.ageMode)
  ) {
    return (
      <ReturnUnavailable
        title="This device mode cannot open the originating World."
        detail="The released World audience policy and a valid local device profile must both allow this exact return."
      />
    );
  }

  const childReturnBinding =
    `delayed-return:${profile.profileId}:${originSession.sessionId}:${exactTask.returnId}`;
  if (
    requiresFreshGrownUpConfirmation(allowedAgeModes, profile.ageMode)
    && confirmedChildReturnBinding !== childReturnBinding
  ) {
    return (
      <main
        className="forge-app-page"
        data-testid="delayed-return-grown-up-confirmation"
        id="forge-main"
        tabIndex={-1}
      >
        <section className="forge-app-empty">
          <ForgeStatus tone="human">Fresh local check</ForgeStatus>
          <h1>A grown-up must confirm this exact delayed return.</h1>
          <p>
            This in-memory confirmation applies only to{" "}
            <code>{exactTask.returnId}</code>, bound to{" "}
            <code>{originSession.sessionId}</code>, and is cleared on reload.
            It does not verify identity, guardianship, consent, or authority.
          </p>
          <button
            className="forge-primary-action"
            onClick={() => setConfirmedChildReturnBinding(childReturnBinding)}
            type="button"
          >
            A grown-up is here for this exact return
          </button>
          <Link href="/app/returns">Return without opening the task</Link>
        </section>
      </main>
    );
  }

  const now = new Date().toISOString();
  const timing = delayedReturnTiming(exactTask, now);
  if (!timing) {
    return (
      <ReturnUnavailable
        title="This delayed-return timing record is invalid."
        detail="FORGE will not infer a due, expired, or completed state."
      />
    );
  }
  if (timing === "upcoming") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">Not due yet</ForgeStatus>
          <h1>This unaided return remains closed until {readableDate(exactTask.dueAt)}.</h1>
          <p>The delay is part of the reviewed task. FORGE does not shorten it, reveal an answer, or replace it with a reminder-only completion.</p>
          <Link href="/app/returns">Return to delayed-return tasks</Link>
        </section>
      </main>
    );
  }
  if (timing === "expired") {
    return (
      <ReturnUnavailable
        title="This reviewed completion window has closed."
        detail={`The unaided return remained open through ${readableDate(delayedReturnCompletionWindowEndsAt(exactTask)!)}. It remains untested, and FORGE does not infer retention.`}
      />
    );
  }
  if (timing === "completed" || submission === "complete") {
    return (
      <main className="forge-app-page" data-testid="delayed-return-completed" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty">
          <ForgeStatus tone="evidence">Bounded retention attempt recorded</ForgeStatus>
          <h1>This exact delayed-return task is complete.</h1>
          <p>
            FORGE recorded one unaided authored response after the scheduled delay. It did not
            expose hints, AI interpretation, or the previous transfer result. Broader retention
            and mastery remain untested.
          </p>
          <Link className="forge-primary-action" href="/app/evidence">Inspect bounded evidence</Link>
          <Link className="forge-secondary-action" href="/app/returns">Return to delayed-return tasks</Link>
        </section>
      </main>
    );
  }

  function submit() {
    if (!choiceId || submission === "saving") return;
    const attemptedAt = new Date().toISOString();
    const receipt = createForceMotionReturnAttemptReceipt({ task: exactTask, choiceId, attemptedAt });
    if (!receipt) {
      setSubmission("failed");
      setMessage("FORGE could not open a valid unaided return attempt. The task remains due.");
      return;
    }
    setSubmission("saving");
    const result = completeDeviceDelayedReturn({
      store: createBrowserContinuityStore(),
      returnId: exactTask.returnId,
      receipt,
      completedAt: attemptedAt,
    });
    if (!result.ok) {
      setSubmission("failed");
      setMessage(result.reason === "evidence_not_recorded"
        ? "The bounded retention evidence could not be written, so FORGE left the task due."
        : "FORGE could not safely record this exact return attempt. The task remains due.");
      return;
    }
    setSubmission("complete");
    setMessage("");
  }

  return (
    <main className="forge-app-page" data-testid="delayed-return-runtime" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Delayed return · independent task</ForgeKicker>
        <h1>{FORCE_MOTION_RETURN_FAMILY.title}</h1>
        <p>
          This is a new authored check after a delay. AI interpretation, instructional help,
          replay, and your earlier result are unavailable here. Text, keyboard, and reduced-motion
          access remain available.
        </p>
      </header>

      <section className="forge-study-brief" aria-labelledby="return-question-title">
        <div className="forge-study-brief__primary">
          <ForgeStatus tone="evidence">Unaided return · due now</ForgeStatus>
          <h2 id="return-question-title">{FORCE_MOTION_RETURN_FAMILY.prompt}</h2>
          <fieldset className="forge-prototype-options">
            <legend>Choose one answer. No explanation is stored in the local evidence record.</legend>
            {FORCE_MOTION_RETURN_FAMILY.choices.map((choice) => (
              <label key={choice.id} className={choiceId === choice.id ? "selected" : ""}>
                <input
                  checked={choiceId === choice.id}
                  disabled={submission === "saving"}
                  name={`delayed-return-${exactTask.returnId}`}
                  onChange={() => setChoiceId(choice.id)}
                  type="radio"
                  value={choice.id}
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </fieldset>
          <button className="forge-primary-action" disabled={!choiceId || submission === "saving"} onClick={submit} type="button">
            {submission === "saving" ? "Recording bounded attempt…" : "Submit unaided return"}
          </button>
          {message ? <p className="forge-app-message" role="status">{message}</p> : null}
        </div>
        <aside>
          <ForgeStatus tone="human">What remains available</ForgeStatus>
          <h2>Access, not instruction.</h2>
          <p>A textual question, native keyboard controls, and reduced motion preserve operation without changing the answer or adding a clue.</p>
          <dl>
            <div><dt>Bound session</dt><dd>{exactTask.studySessionId}</dd></div>
            <div><dt>Task family</dt><dd>{exactTask.taskFamilyId}</dd></div>
            <div><dt>Evidence</dt><dd>Capability, outcome, time, and no-help condition only</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
