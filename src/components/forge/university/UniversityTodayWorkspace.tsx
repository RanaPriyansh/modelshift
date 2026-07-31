"use client";

import Link from "next/link";
import { useState } from "react";

import type { UniversityTodayFixtureScenario } from "@/app/internal/university-today/today-fixture.server";
import type {
  UniversityTodayProjectionV1,
  UniversityTodaySourceSummary,
} from "@/src/forge/university-today";

import styles from "./UniversityTodayWorkspace.module.css";

function readableState(value: string): string {
  return value.replaceAll("_", " ");
}

function readableTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function factSummary(source: UniversityTodaySourceSummary, timeZone: string): string {
  const fact = source.facts[0]?.fact;
  if (!fact) return "No reviewed source fact is eligible as context.";
  if (fact.kind === "deadline") {
    return `${fact.title} is copied as due ${new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(fact.dueAt))}.`;
  }
  if (fact.kind === "course_commitment") return `${fact.title} is present in the reviewed source context.`;
  return "A copied assessment policy is present, but restricted assessment mode still applies.";
}

function presentation(projection: UniversityTodayProjectionV1) {
  switch (projection.status) {
    case "ready":
      return {
        label: "Your accepted path has one ready action",
        title: projection.action?.title ?? "Accepted action unavailable",
        body: projection.action?.objective ?? "Repair the accepted path before continuing.",
      };
    case "source_review_required":
      return {
        label: "Source decision needed",
        title: "Resolve the course-source conflict first.",
        body: "FORGE has not chosen between copied facts or used either one to shape this action.",
      };
    case "learner_choice_required":
      return {
        label: "Your time window is tight",
        title: "The activity fits only at the low estimate.",
        body: "Choose whether to protect more time. FORGE will not shorten a reviewed activity silently.",
      };
    case "capacity_conflict":
      return {
        label: "Your entered time is not enough",
        title: "This activity does not fit this window.",
        body: "The accepted activity stays intact. Your plan needs a different window or a learner-approved revision.",
      };
    case "complete":
      return {
        label: "Accepted path complete",
        title: "No next action is due from this path.",
        body: "FORGE has not invented another activity.",
      };
    case "blocked":
      return {
        label: "Accepted path needs repair",
        title: "No safe action can be shown.",
        body: "Repair or replace the path before continuing.",
      };
    default:
      return {
        label: "Projection unavailable",
        title: "No usable action was produced.",
        body: "The sample failed closed before planning or starting anything.",
      };
  }
}

export function UniversityTodayWorkspace({
  scenarios,
}: {
  scenarios: readonly UniversityTodayFixtureScenario[];
}) {
  const [selectedId, setSelectedId] = useState<UniversityTodayFixtureScenario["id"]>(scenarios[0]?.id ?? "ready");
  const selected = scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  if (!selected) return <UniversityTodayWorkspaceUnavailableFallback />;

  const projection = selected.projection;
  const copy = presentation(projection);
  const timeZone = projection.timeZone ?? "UTC";
  const windowLabel = projection.capacity
    ? `${readableTime(projection.capacity.startsAt, timeZone)} to ${readableTime(projection.capacity.endsAt, timeZone)}`
    : "Unavailable";

  return (
    <article className={styles.surface} aria-labelledby="university-today-title" data-status={projection.status}>
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.course}>{projection.courseLabel ?? "Sample course"}</p>
        </div>
        <p className={styles.term}>{projection.termLabel ?? "Sample term"}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>No save</span>
        <span>No automatic fetch</span>
        <span>No session start</span>
        <span>No source-based recommendation</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Test an uncertain state</legend>
        <div>
          {scenarios.map((scenario) => (
            <label key={scenario.id}>
              <input
                type="radio"
                name="university-today-scenario"
                value={scenario.id}
                checked={scenario.id === selected.id}
                onChange={() => setSelectedId(scenario.id)}
              />
              <span>{scenario.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.decisionPlane}>
        <section className={styles.action} aria-labelledby="university-today-title" aria-live="polite">
          <p className={styles.stateLabel}>{copy.label}</p>
          <h1 id="university-today-title">{copy.title}</h1>
          <p className={styles.objective}>{copy.body}</p>

          {projection.status === "learner_choice_required" || projection.status === "capacity_conflict" ? (
            <div className={styles.actionControl}>
              <Link
                href="/internal/university-recovery"
                prefetch={false}
              >
                Open recovery draft
              </Link>
              <p>This opens a separate synthetic fixture. No capacity, work item, deadline, or decision is transferred or saved.</p>
            </div>
          ) : projection.action ? (
            <div className={styles.actionControl}>
              <Link
                href="/internal/university-protected-study"
                prefetch={false}
              >
                Inspect protected study brief
              </Link>
              <p>This opens a separate synthetic integrity brief. No action, course state, or session is transferred or saved.</p>
            </div>
          ) : projection.status === "source_review_required" ? (
            <div className={styles.actionControl}>
              <Link
                href="/internal/university-source-review"
                prefetch={false}
              >
                Review source copies
              </Link>
              <p>The review sample keeps conflicting facts blocked and prepares a question for a human.</p>
            </div>
          ) : (
            <p className={styles.noAction}>No action control is available in this state.</p>
          )}

          <dl className={styles.reasoning}>
            <div>
              <dt>Why this action</dt>
              <dd>
                {projection.action
                  ? "It is next in an existing learner-accepted path bound to an exact reviewed World."
                  : "No action is being selected from uncertain course-source data."}
              </dd>
            </div>
            <div id="capacity">
              <dt>Declared capacity</dt>
              <dd>
                {projection.capacity
                  ? `${projection.capacity.availableMinutes} minutes available, ${projection.capacity.effortMinutesLow}-${projection.capacity.effortMinutesHigh} minutes fixture-authored effort`
                  : "Unavailable"}
              </dd>
            </div>
          </dl>
        </section>

        <aside className={styles.context} aria-labelledby="university-today-context">
          <h2 id="university-today-context">What shaped this view</h2>
          <dl className={styles.contextFacts}>
            <div>
              <dt>Your entered window</dt>
              <dd>{windowLabel}</dd>
            </div>
            <div>
              <dt>Capacity comparison</dt>
              <dd>{projection.capacity ? readableState(projection.capacity.state) : "unavailable"}</dd>
            </div>
            <div>
              <dt>Connected-source state</dt>
              <dd>{projection.source ? readableState(projection.source.reconciliationStatus) : "unavailable"}</dd>
            </div>
            <div>
              <dt>Institutional completeness</dt>
              <dd>Not established</dd>
            </div>
          </dl>
          <div className={styles.sourceNote}>
            <h3>Reviewed context</h3>
            <p>{projection.source ? factSummary(projection.source, timeZone) : "No source context is available."}</p>
            <small>Course-source facts explain context only. They did not select the learning action.</small>
          </div>
        </aside>
      </div>

      <footer className={styles.authority} id="action-authority">
        <p>Authority ceiling</p>
        <dl>
          <div>
            <dt>Action selector</dt>
            <dd>Existing accepted reviewed path</dd>
          </div>
          <div>
            <dt>Source authenticity</dt>
            <dd>Not established</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Projection digest</dt>
            <dd>{projection.projectionDigest?.slice(0, 19) ?? "Unavailable"}…</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

function UniversityTodayWorkspaceUnavailableFallback() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No research state is available.</h1>
      <p>No action was planned, stored, or started.</p>
    </section>
  );
}
