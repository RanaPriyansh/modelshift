"use client";

import Link from "next/link";
import { useState } from "react";

import {
  delayedReturnCompletionWindowEndsAt,
  delayedReturnTiming,
  type DelayedReturnTaskV1,
} from "@/src/forge/continuity";

import { useDeviceContinuity } from "./continuity-client";
import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";

function readableDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ReturnItem = Readonly<{
  task: DelayedReturnTaskV1;
  pathTitle: string;
}>;

function ReturnRows({
  items,
  timing,
}: {
  items: readonly ReturnItem[];
  timing: "upcoming" | "due" | "expired" | "completed";
}) {
  const title = timing === "upcoming"
    ? "Upcoming"
    : timing === "due"
      ? "Due now"
      : timing === "expired"
        ? "Window closed"
        : "Completed";
  return (
    <section className="forge-app-section" aria-labelledby={`return-${timing}-title`}>
      <header className="forge-section-heading">
        <div>
          <span>Local delayed-return tasks</span>
          <h2 id={`return-${timing}-title`}>{title}</h2>
        </div>
        <p>{timing === "upcoming"
          ? "These reviewed tasks remain closed until their delay has elapsed."
          : timing === "due"
            ? "Each task is an unaided unfamiliar check. Help and prior results stay unavailable."
            : timing === "expired"
              ? "The reviewed completion window closed without a bounded attempt. No retention result is inferred."
              : "A completed return records one bounded delayed attempt; it is not a mastery label."}</p>
      </header>
      <ul className="forge-return-list" data-testid={`return-${timing}-list`}>
        {items.map(({ task, pathTitle }) => (
          <li key={task.returnId}>
            <div>
              <ForgeStatus tone={timing === "due" ? "evidence" : timing === "expired" ? "human" : timing === "completed" ? "quiet" : "learner"}>
                {timing === "due" ? "Due" : timing === "expired" ? "Untested" : timing === "completed" ? "Completed" : "Scheduled"}
              </ForgeStatus>
              <h3>Motion after a brief push</h3>
              <p>{pathTitle}</p>
            </div>
            <dl>
              <div><dt>Scheduled from</dt><dd>One exact completed Force &amp; motion session</dd></div>
              <div>
                <dt>{timing === "completed" ? "Completed" : timing === "expired" ? "Window closed" : "Due"}</dt>
                <dd>{readableDate(
                  timing === "completed"
                    ? task.completedAt!
                    : timing === "expired"
                      ? delayedReturnCompletionWindowEndsAt(task)!
                      : task.dueAt,
                )}</dd>
              </div>
              <div><dt>AI and hints</dt><dd>Off; access controls remain available</dd></div>
            </dl>
            {timing === "due" ? (
              <Link className="forge-primary-action" href={`/app/returns/${encodeURIComponent(task.returnId)}`}>
                Open unaided return
              </Link>
            ) : timing === "upcoming" ? (
              <Link className="forge-secondary-action" href={`/app/returns/${encodeURIComponent(task.returnId)}`}>
                Inspect task boundary
              </Link>
            ) : timing === "expired" ? (
              <Link className="forge-secondary-action" href={`/app/returns/${encodeURIComponent(task.returnId)}`}>
                Inspect closed boundary
              </Link>
            ) : (
              <Link className="forge-secondary-action" href="/app/evidence">Inspect bounded retention evidence</Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ForgeReturnsWorkspace() {
  const { state } = useDeviceContinuity();
  const [now, setNow] = useState(() => new Date().toISOString());

  if (state.phase === "loading") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Reading local delayed-return tasks…</p></main>;
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
          <ForgeStatus tone="human">Returns unavailable</ForgeStatus>
          <h1>FORGE cannot safely read this device&apos;s return tasks.</h1>
          <p>Unreadable or unavailable local data remains untouched. No return status is inferred.</p>
          <Link href="/app/settings">Manage learner-owned local data</Link>
        </section>
      </main>
    );
  }

  const items = state.result.ledger.records.flatMap((record) =>
    record.delayedReturnTasks.map((task) => ({
      task,
      pathTitle: record.goal.desiredOutcome,
    })));
  const upcoming = items.filter((item) => delayedReturnTiming(item.task, now) === "upcoming");
  const due = items.filter((item) => delayedReturnTiming(item.task, now) === "due");
  const expired = items.filter((item) => delayedReturnTiming(item.task, now) === "expired");
  const completed = items.filter((item) => delayedReturnTiming(item.task, now) === "completed");

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Return proof · retention after delay</ForgeKicker>
        <h1>Immediate performance is not a retention claim.</h1>
        <p>
          FORGE opens only a separately reviewed, deterministic return task that is bound to one
          genuine completed local session and evidence receipt. It never reconstructs a task from
          your previous answer.
        </p>
        <button className="forge-secondary-action" type="button" onClick={() => setNow(new Date().toISOString())}>
          Refresh due status
        </button>
      </header>

      {items.length === 0 ? (
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">No scheduled returns</ForgeStatus>
          <h2>No local completed session has yet produced an eligible return task.</h2>
          <p>Only a proved, independently completed reviewed Force &amp; motion path session can schedule the first local return family.</p>
          <Link href="/app/study">Open my next reviewed action</Link>
        </section>
      ) : (
        <>
          {due.length > 0 ? <ReturnRows items={due} timing="due" /> : null}
          {upcoming.length > 0 ? <ReturnRows items={upcoming} timing="upcoming" /> : null}
          {expired.length > 0 ? <ReturnRows items={expired} timing="expired" /> : null}
          {completed.length > 0 ? <ReturnRows items={completed} timing="completed" /> : null}
        </>
      )}

      <aside className="forge-app-boundary">
        <ForgeStatus tone="human">Claim boundary</ForgeStatus>
        <h2>A return attempt is a bounded observation, not a verdict.</h2>
        <p>
          FORGE records whether this one delayed authored task was completed unaided. It does not
          call that mastery, infer ability, or establish retention in other situations.
        </p>
      </aside>
    </main>
  );
}
