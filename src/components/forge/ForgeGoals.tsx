"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LearningPathRevisionV1 } from "@/src/forge/continuity";
import type { DeviceContinuityRecordV1 } from "@/src/lib/forge-continuity";

import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";
import { useDeviceContinuity } from "./continuity-client";
import { readStartDraft, type ForgeStartDraft } from "./start-draft";

function currentRevision(record: DeviceContinuityRecordV1): LearningPathRevisionV1 | null {
  return record.revisions.find((revision) => revision.revisionId === record.currentRevisionId) ?? null;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

/**
 * Goals are projections of learner-owned continuity records. This route never
 * invents a profile, general goal database, or cloud draft for the learner.
 */
export function ForgeGoals() {
  const { state } = useDeviceContinuity();
  const [tabDraft, setTabDraft] = useState<ForgeStartDraft | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTabDraft(readStartDraft());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (state.phase === "loading") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Reading learner-owned goals…</p></main>;
  }
  if (state.result.status !== "ok" && state.result.status !== "empty") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Goals unavailable</ForgeStatus>
          <h1>FORGE cannot safely read saved goals on this device.</h1>
          <p>No empty goal list, cloud copy, or reconstructed draft is being inferred.</p>
          <Link href="/start">Start a new unsaved goal</Link>
        </section>
      </main>
    );
  }

  const records = [...state.result.ledger.records]
    .map((record) => ({ record, revision: currentRevision(record) }))
    .filter((entry): entry is { record: DeviceContinuityRecordV1; revision: LearningPathRevisionV1 } => entry.revision !== null)
    .sort((left, right) => Date.parse(right.record.updatedAt) - Date.parse(left.record.updatedAt));

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Goals · learner-owned direction</ForgeKicker>
        <h1>Keep the question visible while the path stays inspectable.</h1>
        <p>
          A saved goal exists only after you explicitly accept a reviewed path or save an open
          question. It remains on this device; FORGE does not infer a learner profile from it.
        </p>
        <Link className="forge-primary-action" href="/start">Shape a new goal</Link>
      </header>

      {tabDraft ? (
        <section className="forge-app-boundary" aria-labelledby="tab-draft-title">
          <ForgeStatus tone="learner">Unsaved tab draft</ForgeStatus>
          <h2 id="tab-draft-title">{tabDraft.goal}</h2>
          <p>
            {tabDraft.desiredOutcome || "No outcome has been added yet."} This draft is held only
            in this browser tab and is not a saved goal, path, or evidence record.
          </p>
          <Link href="/start">Continue reviewing this draft</Link>
        </section>
      ) : null}

      {records.length === 0 ? (
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">No saved goals</ForgeStatus>
          <h2>There is no device-local goal record yet.</h2>
          <p>Goal wording becomes durable only after a learner decision. An abandoned candidate is not retained here.</p>
        </section>
      ) : (
        <section className="forge-app-section" aria-labelledby="saved-goals-title">
          <header className="forge-section-heading">
            <span>Saved local records</span>
            <h2 id="saved-goals-title">{records.length} learner-owned {records.length === 1 ? "goal" : "goals"}</h2>
          </header>
          <div className="forge-path-records">
            {records.map(({ record, revision }) => (
              <article key={record.recordId}>
                <header>
                  <ForgeStatus tone={revision.executionAllowed ? "evidence" : "human"}>
                    {revision.executionAllowed ? "Accepted path" : "Open question · not executable"}
                  </ForgeStatus>
                  <span>Saved {dateLabel(record.updatedAt)}</span>
                </header>
                <h3>{record.goal.learnerWords}</h3>
                <p>{record.goal.desiredOutcome}</p>
                <dl>
                  <div><dt>Route state</dt><dd>{revision.status} · execution {revision.executionAllowed ? "allowed" : "blocked"}</dd></div>
                  <div><dt>Goal ID</dt><dd>{record.goal.goalId}</dd></div>
                  <div><dt>Storage</dt><dd>Local to this browser; no cloud sync is claimed.</dd></div>
                </dl>
                <Link href={`/app/paths/${encodeURIComponent(record.recordId)}`}>Inspect the exact path record</Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
