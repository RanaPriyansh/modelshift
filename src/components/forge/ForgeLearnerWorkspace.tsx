"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  delayedReturnTiming,
  projectNextAction,
  type LearningPathRevisionV1,
  type NextActionProjectionV1,
} from "@/src/forge/continuity";
import {
  startDeviceStudySession,
  type DeviceContinuityRecordV1,
} from "@/src/lib/forge-continuity";

import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";
import { ForgeArrow } from "./ForgeShell";
import {
  createBrowserContinuityStore,
  useDeviceContinuity,
} from "./continuity-client";
import { writeStartDraft } from "./start-draft";

function currentRevision(record: DeviceContinuityRecordV1): LearningPathRevisionV1 {
  const revision = record.revisions.find((candidate) => candidate.revisionId === record.currentRevisionId);
  if (!revision) throw new Error("Continuity record current revision is missing.");
  return revision;
}

function orderedRecords(records: readonly DeviceContinuityRecordV1[]) {
  return [...records].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function activeAcceptedRecord(records: readonly DeviceContinuityRecordV1[]) {
  return orderedRecords(records).find((record) => currentRevision(record).status === "accepted") ?? null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function WorkspaceUnavailable({
  reason,
  canReset = false,
}: {
  reason: string;
  canReset?: boolean;
}) {
  const [resetMessage, setResetMessage] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);

  function downloadUnreadableCopy() {
    const result = createBrowserContinuityStore().exportUnreadable();
    if (!result.ok) {
      setResetMessage(`The unreadable path copy could not be prepared (${result.reason.replaceAll("_", " ")}).`);
      return;
    }
    const blob = new Blob([result.raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "forge-unreadable-path-recovery.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setResetMessage("Downloaded the unchanged unreadable path data. Nothing was removed.");
  }

  return (
    <section className="forge-app-empty" role="alert">
      <ForgeStatus tone="human">Device continuity unavailable</ForgeStatus>
      <h2>FORGE cannot safely read this device path.</h2>
      <p>
        {reason} No empty path, save, or sync state is being claimed. You can still open a
        reviewed World directly, but this page cannot remember the next action.
      </p>
      {canReset ? (
        <div className="forge-app-recovery-actions">
          <button className="forge-secondary-action" onClick={downloadUnreadableCopy} type="button">
            Download unchanged recovery copy
          </button>
          {confirmingReset ? (
            <div role="group" aria-label="Confirm removing unreadable local path data">
              <p>This cannot be undone. Download a recovery copy first if you may need the original bytes.</p>
              <button
                className="forge-secondary-action"
                onClick={() => {
                  const result = createBrowserContinuityStore().clear();
                  setResetMessage(
                    result.ok
                      ? "The malformed or unknown-version path store was removed."
                      : `The path store was not removed (${result.reason.replaceAll("_", " ")}).`,
                  );
                  setConfirmingReset(false);
                }}
                type="button"
              >
                Yes, remove unreadable data
              </button>
              <button onClick={() => setConfirmingReset(false)} type="button">Keep it</button>
            </div>
          ) : (
            <button onClick={() => setConfirmingReset(true)} type="button">
              Remove unreadable local path data
            </button>
          )}
        </div>
      ) : null}
      <Link href="/paths">Open reviewed activities</Link>
      {resetMessage ? <p role="status">{resetMessage}</p> : null}
    </section>
  );
}

export function ForgeToday() {
  const { state } = useDeviceContinuity();
  const [projectionState, setProjectionState] = useState<{
    recordId: string;
    value: NextActionProjectionV1;
  } | null>(null);

  const records = useMemo(
    () => state.phase === "ready" ? state.result.ledger.records : [],
    [state],
  );
  const activeRecord = useMemo(() => activeAcceptedRecord(records), [records]);
  const openQuestions = useMemo(
    () => records.filter((record) => currentRevision(record).status === "candidate").length,
    [records],
  );

  useEffect(() => {
    let active = true;
    if (!activeRecord) {
      return () => { active = false; };
    }
    void projectNextAction(currentRevision(activeRecord), activeRecord.activityStates).then((next) => {
      if (!active) return;
      setProjectionState({ recordId: activeRecord.recordId, value: next });
    });
    return () => { active = false; };
  }, [activeRecord]);

  if (state.phase === "loading") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <p className="forge-app-loading" role="status">Reading learner-owned device continuity…</p>
      </main>
    );
  }
  if (state.result.status === "storage_unavailable" || state.result.status === "storage_error") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <WorkspaceUnavailable reason="Browser storage is unavailable or failed." />
      </main>
    );
  }
  if (state.result.status === "reset_malformed" || state.result.status === "reset_unknown_version") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <WorkspaceUnavailable
          canReset
          reason="The stored path data is malformed or uses an unsupported schema version."
        />
      </main>
    );
  }

  if (!activeRecord) {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-today-empty" aria-labelledby="forge-today-empty-title">
          <div className="forge-today-empty__landscape" aria-hidden="true" />
          <div className="forge-today-empty__copy">
            <p className="forge-today-empty__state">No active path</p>
            <h1 id="forge-today-empty-title">What do you want to be able to do?</h1>
            <p>
              FORGE can propose one learning path. You inspect the work, sources, proof, and
              limits before anything becomes active.
            </p>
            <div className="forge-today-empty__actions">
              <Link className="forge-primary-action" href="/start">
                Shape a path
                <ForgeArrow />
              </Link>
              <Link className="forge-text-link" href="/paths">Browse reviewed paths</Link>
            </div>
            <p className="forge-today-empty__stop">
              <Link href="/">Leave for now</Link>. Nothing will start.
            </p>
          </div>
        </section>
        {openQuestions > 0 ? (
          <section className="forge-app-open-questions">
            <ForgeStatus tone="human">{openQuestions} saved open {openQuestions === 1 ? "question" : "questions"}</ForgeStatus>
            <p>They remain non-runnable until reviewed capability, source, activity, proof, and publication authority exists.</p>
            <Link href="/app/path">Inspect open questions</Link>
          </section>
        ) : null}
      </main>
    );
  }

  const revision = currentRevision(activeRecord);
  const projection = projectionState?.recordId === activeRecord.recordId
    ? projectionState.value
    : null;
  const projectionPending = projection === null;
  const nextNode = projection?.kind === "action"
    ? revision.nodes.find((node) => node.nodeId === projection.nodeId) ?? null
    : null;
  const returnTimings = activeRecord.delayedReturnTasks.map((task) => ({
    task,
    timing: delayedReturnTiming(task, new Date().toISOString()),
  }));
  const dueReturn = returnTimings.find((item) => item.timing === "due") ?? null;
  const upcomingReturn = returnTimings.find((item) => item.timing === "upcoming") ?? null;
  const expiredReturn = returnTimings.find((item) => item.timing === "expired") ?? null;
  const completedReturn = returnTimings.find((item) => item.timing === "completed") ?? null;

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Today · one meaningful action</ForgeKicker>
        <h1>{activeRecord.goal.learnerWords}</h1>
        <p>
          Active device path: {revision.title}. The accepted revision is pinned to its exact
          reviewed World and source IDs; path progress remains separate from capability evidence.
        </p>
      </header>

      <section className="forge-next-action" aria-labelledby="next-action-title">
        {projectionPending ? <p role="status">Projecting the next deterministic action…</p> : null}
        {!projectionPending && projection?.kind === "action" && nextNode ? (
          <>
            <header>
              <ForgeStatus tone="evidence">{projection.state === "in_progress" ? "Continue" : "Ready"}</ForgeStatus>
              <span>{String(nextNode.position + 1).padStart(2, "0")} / {String(revision.nodes.length).padStart(2, "0")}</span>
            </header>
            <h2 id="next-action-title">{nextNode.title}</h2>
            <p>{nextNode.objective}</p>
            <dl>
              <div><dt>Why now</dt><dd>Every authored prerequisite before this node is recorded complete in local path progress.</dd></div>
              <div><dt>Activity</dt><dd>Reviewed World · {projection.activity.worldRef.worldId} · v{projection.activity.worldRef.worldVersion}</dd></div>
              <div><dt>Proof boundary</dt><dd>The World creates its own bounded private receipt. Finishing this path step alone creates no capability claim.</dd></div>
            </dl>
            <Link className="forge-primary-action" href="/app/study">
              Open action brief
              <ForgeArrow />
            </Link>
          </>
        ) : null}
        {!projectionPending && projection?.kind === "complete" ? (
          <>
            <ForgeStatus tone="quiet">Path work complete</ForgeStatus>
            <h2 id="next-action-title">Every activity in this accepted path has been worked through.</h2>
            <p>That describes path progress only. Inspect the evidence ledger for what was demonstrated independently and what remains untested.</p>
            <Link className="forge-primary-action" href="/app/evidence">Inspect bounded evidence <ForgeArrow /></Link>
          </>
        ) : null}
        {!projectionPending && projection?.kind === "blocked" ? (
          <>
            <ForgeStatus tone="human">Next action blocked</ForgeStatus>
            <h2 id="next-action-title">FORGE cannot safely activate this path state.</h2>
            <p>Reason: {projection.reason.replaceAll("_", " ")}. The accepted path and local history were not changed.</p>
            <Link href="/app/path">Inspect the path contract</Link>
          </>
        ) : null}
      </section>

      <div className="forge-app-supporting">
        <section>
          <ForgeStatus tone="learner">Path context</ForgeStatus>
          <h2>{revision.nodes.filter((node) => {
            const stateForNode = activeRecord.activityStates.find((item) => item.nodeId === node.nodeId);
            return stateForNode?.status === "completed";
          }).length} of {revision.nodes.length} activities worked through</h2>
          <p>No percentage, streak, grade, rank, or permanent mastery label is derived from this count.</p>
          <Link href="/app/path">Inspect exact path and revisions</Link>
        </section>
        <section>
          <ForgeStatus tone={dueReturn ? "evidence" : expiredReturn ? "human" : "quiet"}>Return proof</ForgeStatus>
          {dueReturn ? (
            <>
              <h2>A reviewed delayed task is due.</h2>
              <p>It remains a separate unaided observation. No retention result exists until this exact return is completed.</p>
            </>
          ) : upcomingReturn ? (
            <>
              <h2>A reviewed delayed task is scheduled.</h2>
              <p>It opens {formatDate(upcomingReturn.task.dueAt)}. Help, prior results, and AI interpretation remain unavailable in that task.</p>
            </>
          ) : expiredReturn ? (
            <>
              <h2>A reviewed return window closed untested.</h2>
              <p>The task stays visible, but FORGE records no late result and infers no retention.</p>
            </>
          ) : completedReturn ? (
            <>
              <h2>A bounded delayed attempt is recorded.</h2>
              <p>That one authored return is evidence of one attempt, not a broad retention or mastery claim.</p>
            </>
          ) : (
            <>
              <h2>No reviewed delayed task is scheduled.</h2>
              <p>Force &amp; motion can schedule one only after an exact protected proof. FORGE will not generate a fake retention claim.</p>
            </>
          )}
          <Link href="/app/returns">Inspect return tasks and boundaries</Link>
        </section>
      </div>
    </main>
  );
}

export function ForgePathWorkspace() {
  const router = useRouter();
  const { state, refresh } = useDeviceContinuity();
  const [deletePending, setDeletePending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (state.phase === "loading") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Reading path history…</p></main>;
  }
  if (state.result.status === "storage_unavailable" || state.result.status === "storage_error") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><WorkspaceUnavailable reason="Path storage could not be read." /></main>;
  }
  if (state.result.status === "reset_malformed" || state.result.status === "reset_unknown_version") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <WorkspaceUnavailable
          canReset
          reason="The stored path history is malformed or uses an unsupported schema version."
        />
      </main>
    );
  }

  const records = orderedRecords(state.result.ledger.records);
  const active = activeAcceptedRecord(records);

  function removeRecord(recordId: string) {
    const result = createBrowserContinuityStore().delete(recordId);
    if (!result.ok) {
      setMessage(`Nothing was deleted (${result.reason.replaceAll("_", " ")}).`);
      return;
    }
    setDeletePending(null);
    setMessage("The selected device path and its learner-owned goal were deleted.");
    refresh();
  }

  function makeCurrent(record: DeviceContinuityRecordV1) {
    const result = createBrowserContinuityStore().upsert({
      ...record,
      updatedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      setMessage(`The active path did not change (${result.reason.replaceAll("_", " ")}).`);
      return;
    }
    setMessage("This is now the most recent accepted path on this device.");
    refresh();
  }

  function exportAll() {
    const result = createBrowserContinuityStore().export(new Date().toISOString());
    if (!result.ok) {
      setMessage(`No export was created (${result.reason.replaceAll("_", " ")}).`);
      return;
    }
    const href = URL.createObjectURL(new Blob([JSON.stringify(result.value, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "forge-device-paths.json";
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("A learner-owned JSON copy was created. It includes exact local goal wording.");
  }

  function shapeNewCandidate(record: DeviceContinuityRecordV1) {
    const prepared = writeStartDraft({
      goal: record.goal.learnerWords,
      desiredOutcome: record.goal.desiredOutcome,
    });
    if (!prepared) {
      setMessage("The new candidate draft could not be kept in tab-local storage. No learner wording was put in the URL.");
      return;
    }
    router.push("/start");
  }

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>My paths · device-local revisions</ForgeKicker>
        <h1>Inspect what you accepted and what FORGE still cannot run.</h1>
        <p>Candidate and accepted revisions remain immutable. Changing direction starts a new candidate; it never silently rewrites accepted history.</p>
        <div className="forge-app-page__hero-actions">
          <Link className="forge-primary-action" href="/start">Shape another path <ForgeArrow /></Link>
          {records.length > 0 ? <button className="forge-secondary-action" onClick={exportAll} type="button">Export local paths</button> : null}
        </div>
      </header>

      {records.length === 0 ? (
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">No saved paths</ForgeStatus>
          <h2>This device has no learner-owned path history.</h2>
          <p>Planning responses remain ephemeral until you explicitly accept a reviewed path or save an open question.</p>
        </section>
      ) : (
        <div className="forge-path-records">
          {records.map((record) => {
            const revision = currentRevision(record);
            const accepted = revision.status === "accepted";
            const isActive = active?.recordId === record.recordId;
            return (
              <article key={record.recordId}>
                <header>
                  <ForgeStatus tone={accepted ? "evidence" : "human"}>
                    {accepted ? isActive ? "Current accepted path" : "Accepted path" : "Open question · not executable"}
                  </ForgeStatus>
                  <span>Updated {formatDate(record.updatedAt)}</span>
                </header>
                <h2>{record.goal.learnerWords}</h2>
                <p>{record.goal.desiredOutcome}</p>
                <dl>
                  <div><dt>Revision</dt><dd>{revision.revisionNumber} · {revision.status} · {revision.revisionDigest.slice(0, 18)}…</dd></div>
                  <div><dt>Authority</dt><dd>{revision.authority.kind.replaceAll("_", " ")} · execution {revision.executionAllowed ? "allowed" : "blocked"}</dd></div>
                  <div><dt>Storage</dt><dd>Learner-owned device-local record; no cloud sync is claimed.</dd></div>
                </dl>
                <Link href={`/app/paths/${encodeURIComponent(record.recordId)}`}>
                  Inspect exact revision and session bindings
                </Link>
                <ol>
                  {revision.nodes.map((node) => {
                    const progress = record.activityStates.find((item) => item.nodeId === node.nodeId);
                    return (
                      <li key={node.nodeId}>
                        <span>{String(node.position + 1).padStart(2, "0")}</span>
                        <div><strong>{node.title}</strong><small>{progress?.status.replaceAll("_", " ") ?? "not executable"}</small></div>
                      </li>
                    );
                  })}
                </ol>
                <div className="forge-path-records__actions">
                  {accepted && !isActive ? (
                    <button onClick={() => makeCurrent(record)} type="button">Make current</button>
                  ) : null}
                  <button onClick={() => shapeNewCandidate(record)} type="button">Shape a new candidate</button>
                  {deletePending === record.recordId ? (
                    <>
                      <button className="is-danger" onClick={() => removeRecord(record.recordId)} type="button">Confirm delete</button>
                      <button onClick={() => setDeletePending(null)} type="button">Keep it</button>
                    </>
                  ) : (
                    <button onClick={() => setDeletePending(record.recordId)} type="button">Delete from device</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {message ? <p className="forge-app-message" role="status">{message}</p> : null}
    </main>
  );
}

export function ForgeStudy() {
  const router = useRouter();
  const { state } = useDeviceContinuity();
  const [projectionState, setProjectionState] = useState<{
    recordId: string;
    value: NextActionProjectionV1;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const records = useMemo(
    () => state.phase === "ready" ? state.result.ledger.records : [],
    [state],
  );
  const activeRecord = useMemo(() => activeAcceptedRecord(records), [records]);

  useEffect(() => {
    let active = true;
    if (!activeRecord) {
      return () => { active = false; };
    }
    void projectNextAction(currentRevision(activeRecord), activeRecord.activityStates).then((next) => {
      if (active) setProjectionState({ recordId: activeRecord.recordId, value: next });
    });
    return () => { active = false; };
  }, [activeRecord]);

  if (state.phase === "loading") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Preparing action brief…</p></main>;
  }
  if (state.result.status === "storage_unavailable" || state.result.status === "storage_error") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><WorkspaceUnavailable reason="The action brief could not read device continuity." /></main>;
  }
  if (state.result.status === "reset_malformed" || state.result.status === "reset_unknown_version") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <WorkspaceUnavailable
          canReset
          reason="The stored action state is malformed or uses an unsupported schema version."
        />
      </main>
    );
  }
  const projection = activeRecord && projectionState?.recordId === activeRecord.recordId
    ? projectionState.value
    : null;
  if (!activeRecord || projection?.kind !== "action") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">No runnable action</ForgeStatus>
          <h1>There is no reviewed next action to open.</h1>
          <p>Accept a reviewed path first, or inspect the current path if its state is blocked or complete.</p>
          <Link href="/app/path">Inspect my path</Link>
        </section>
      </main>
    );
  }

  const revision = currentRevision(activeRecord);
  const node = revision.nodes.find((candidate) => candidate.nodeId === projection.nodeId)!;
  const activityState = activeRecord.activityStates.find((candidate) => candidate.nodeId === node.nodeId)!;

  async function beginWorld() {
    if (!activeRecord || projection?.kind !== "action") return;
    setWorking(true);
    setMessage("");
    try {
      const started = await startDeviceStudySession({
        store: createBrowserContinuityStore(),
        recordId: activeRecord.recordId,
        nodeId: node.nodeId,
        sessionId: `study-session.${crypto.randomUUID()}`,
        startedAt: new Date().toISOString(),
      });
      if (!started.ok) throw new Error(started.reason);
      const focusRoute = projection.activity.kind === "modelshift_world"
        ? "/focus/modelshift"
        : "/focus/activity";
      router.push(`${focusRoute}/${encodeURIComponent(started.session.sessionId)}`);
    } catch {
      setMessage("No exact local study session could be saved, so FORGE did not open the World.");
      setWorking(false);
    }
  }

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Action brief · reviewed activity</ForgeKicker>
        <h1>{node.title}</h1>
        <p>{node.objective}</p>
      </header>

      <section className="forge-study-brief">
        <div className="forge-study-brief__primary">
          <ForgeStatus tone="evidence">{activityState.status.replaceAll("_", " ")}</ForgeStatus>
          <h2>Open the exact World bound to this path revision.</h2>
          <p>
            The activity runs in focused mode. Its own authored protocol controls commitment,
            governed support, assistance withdrawal, unfamiliar transfer, and its private bounded receipt.
          </p>
          <dl>
            <div><dt>World</dt><dd>{projection.activity.worldRef.worldId}</dd></div>
            <div><dt>Version</dt><dd>{projection.activity.worldRef.worldVersion}</dd></div>
            <div><dt>Sources</dt><dd>{projection.activity.worldRef.sourceIds.join(" · ")}</dd></div>
            <div><dt>Local progress</dt><dd>{activityState.status}; separate from the World evidence ledger</dd></div>
          </dl>
          <button className="forge-primary-action" disabled={working} onClick={() => { void beginWorld(); }} type="button">
            {activityState.status === "in_progress" ? "Return to reviewed World" : "Begin reviewed World"}
            <ForgeArrow />
          </button>
        </div>
        <aside>
          <ForgeStatus tone="learner">Receipt-governed return</ForgeStatus>
          <h2>Only the World runtime can close this path activity.</h2>
          <p>
            A genuine bounded runtime receipt must match this exact session, reviewed World,
            activity, version, and time. There is no manual completion control.
          </p>
          <Link href="/app/evidence">Inspect what the World actually recorded</Link>
        </aside>
      </section>
      {message ? <p className="forge-app-message" role="status">{message}</p> : null}
    </main>
  );
}
