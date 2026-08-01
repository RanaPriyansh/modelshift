"use client";

import Link from "next/link";

import type { LearningPathRevisionV1 } from "@/src/forge/continuity";
import type { DeviceContinuityRecordV1 } from "@/src/lib/forge-continuity";

import { useDeviceContinuity } from "./continuity-client";
import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";

function currentRevision(record: DeviceContinuityRecordV1): LearningPathRevisionV1 | null {
  return record.revisions.find(
    (candidate) => candidate.revisionId === record.currentRevisionId,
  ) ?? null;
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ForgePathRecord({ recordId }: { readonly recordId: string }) {
  const { state } = useDeviceContinuity();

  if (state.phase === "loading") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <p className="forge-app-loading" role="status">Reading the exact local path record…</p>
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
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Path unavailable</ForgeStatus>
          <h1>FORGE cannot safely open this path record.</h1>
          <p>
            Device continuity is {state.result.status.replaceAll("_", " ")}. No empty,
            deleted, or synchronized path state is being inferred.
          </p>
          <Link href="/app/paths">Return to my paths</Link>
        </section>
      </main>
    );
  }

  const matches = state.result.ledger.records.filter(
    (candidate) => candidate.recordId === recordId,
  );
  if (matches.length !== 1) {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="quiet">Path not found</ForgeStatus>
          <h1>This opaque path identity is not on this device.</h1>
          <p>It may belong to another browser, or the learner may have deleted it.</p>
          <Link href="/app/paths">Return to my paths</Link>
        </section>
      </main>
    );
  }

  const record = matches[0]!;
  const revision = currentRevision(record);
  if (!revision) {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Invalid path history</ForgeStatus>
          <h1>The current immutable revision is missing.</h1>
          <p>No activity is executable from this record.</p>
          <Link href="/app/paths">Return to my paths</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Path detail · exact local revision</ForgeKicker>
        <h1>{record.goal.learnerWords}</h1>
        <p>{record.goal.desiredOutcome}</p>
        <div className="forge-app-page__hero-actions">
          <Link className="forge-secondary-action" href="/app/paths">All local paths</Link>
          {revision.status === "accepted" && revision.executionAllowed ? (
            <Link className="forge-primary-action" href="/app/study">Open next action</Link>
          ) : null}
        </div>
      </header>

      <section className="forge-app-section" aria-labelledby="path-authority-title">
        <div className="forge-path-records">
          <article>
            <header>
              <ForgeStatus tone={revision.executionAllowed ? "evidence" : "human"}>
                {revision.status} · execution {revision.executionAllowed ? "allowed" : "blocked"}
              </ForgeStatus>
              <span>Updated {readableDate(record.updatedAt)}</span>
            </header>
            <h2 id="path-authority-title">{revision.title}</h2>
            <dl>
              <div><dt>Path identity</dt><dd>{revision.pathId}</dd></div>
              <div><dt>Revision</dt><dd>{revision.revisionNumber} · {revision.revisionId}</dd></div>
              <div><dt>Integrity</dt><dd>{revision.revisionDigest}</dd></div>
              <div><dt>Authority</dt><dd>{revision.authority.kind.replaceAll("_", " ")}</dd></div>
              <div><dt>Storage</dt><dd>Learner-owned device-local; no cloud copy is claimed.</dd></div>
            </dl>
            <ol>
              {revision.nodes.map((node) => {
                const activity = record.activityStates.find(
                  (candidate) => candidate.nodeId === node.nodeId,
                );
                const session = record.studySessions.find(
                  (candidate) =>
                    candidate.pathRevisionId === revision.revisionId
                    && candidate.nodeId === node.nodeId,
                );
                const delayedReturn = session
                  ? record.delayedReturnTasks.find(
                    (candidate) => candidate.studySessionId === session.sessionId,
                  )
                  : null;
                return (
                  <li key={node.nodeId}>
                    <span>{String(node.position + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{node.title}</strong>
                      <small>
                        {activity?.status.replaceAll("_", " ") ?? "not executable"}
                        {session ? ` · session ${session.status}` : ""}
                      </small>
                      {session ? (
                        <Link href={`${session.worldRef.activityProtocol === "modelshift" ? "/focus/modelshift" : "/focus/activity"}/${encodeURIComponent(session.sessionId)}`}>
                          Open exact session
                        </Link>
                      ) : null}
                      {delayedReturn ? (
                        <Link href={`/app/returns/${encodeURIComponent(delayedReturn.returnId)}`}>
                          {delayedReturn.status === "completed" ? "Inspect delayed return" : "Inspect delayed return schedule"}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>
      </section>

      <aside className="forge-app-boundary">
        <ForgeStatus tone="quiet">Claim boundary</ForgeStatus>
        <h2>Path progress and capability evidence remain different records.</h2>
        <p>
          A completed activity means its exact World session closed with a bounded runtime
          receipt. Broader transfer, delayed retention, and lasting capability remain untested
          unless a separate reviewed record says otherwise.
        </p>
        <Link href="/app/evidence">Inspect bounded evidence</Link>
      </aside>
    </main>
  );
}
