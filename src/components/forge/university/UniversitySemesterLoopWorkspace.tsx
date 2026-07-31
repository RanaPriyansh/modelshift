"use client";

import Link from "next/link";
import { useState } from "react";

import type { UniversitySemesterLoopFixtureScenario } from "@/app/internal/university-semester-loop/semester-loop-fixture.server";
import type {
  UniversitySemesterLoopProjectionStatus,
  UniversitySemesterLoopProjectionV1,
} from "@/src/forge/university-semester-loop";

import styles from "./UniversitySemesterLoopWorkspace.module.css";

type JourneyState = "checked" | "current" | "not_needed" | "stopped" | "waiting";

type JourneyStage = Readonly<{
  id: "sources" | "today" | "recovery" | "study" | "return";
  label: string;
  state: JourneyState;
}>;

type JobPresentation = Readonly<{
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  route: string | null;
  routeLabel: string | null;
  routeBoundary: string;
}>;

const JOURNEY_LABELS = Object.freeze({
  sources: "Sources",
  today: "Today",
  recovery: "Recovery",
  study: "Protected study",
  return: "Return",
});

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function journeyFor(status: UniversitySemesterLoopProjectionStatus): readonly JourneyStage[] {
  const states: Record<JourneyStage["id"], JourneyState> = {
    sources: "waiting",
    today: "waiting",
    recovery: "waiting",
    study: "waiting",
    return: "waiting",
  };

  switch (status) {
    case "source_review_required":
      states.sources = "current";
      break;
    case "recovery_required":
      states.sources = "checked";
      states.today = "stopped";
      states.recovery = "current";
      break;
    case "learner_choice_required":
      states.sources = "checked";
      states.today = "current";
      break;
    case "protected_study_ready":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "current";
      break;
    case "world_review_required":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "current";
      break;
    case "path_complete":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "not_needed";
      states.return = "current";
      break;
    case "path_blocked":
      states.sources = "checked";
      states.today = "stopped";
      break;
    case "invalid":
      states.sources = "stopped";
      break;
  }

  return (Object.keys(JOURNEY_LABELS) as JourneyStage["id"][]).map((id) => ({
    id,
    label: JOURNEY_LABELS[id],
    state: states[id],
  }));
}

function presentation(
  projection: UniversitySemesterLoopProjectionV1,
): JobPresentation {
  switch (projection.status) {
    case "source_review_required":
      return {
        index: "01",
        eyebrow: "Current job / copied sources",
        title: "Review what the copied sources disagree about.",
        body:
          "The semester loop stops before capacity or study while a copied source is uncertain. Learner review can confirm the copy, not turn it into university truth.",
        route: "/internal/university-source-review",
        routeLabel: "Review copied sources",
        routeBoundary:
          "Opens a separate synthetic review. No decision or source state transfers or saves.",
      };
    case "recovery_required":
      return {
        index: "03",
        eyebrow: "Current job / recovery",
        title: "Rebuild from the time you actually have.",
        body:
          "The accepted action does not fit the learner-declared window. The same reviewed deadline is available in a bounded recovery draft without shortening work or moving the deadline.",
        route: "/internal/university-recovery",
        routeLabel: "Inspect recovery draft",
        routeBoundary:
          "Opens a separate synthetic draft. No capacity, classification, message, or plan transfers or saves.",
      };
    case "learner_choice_required":
      return {
        index: "02",
        eyebrow: "Current job / learner choice",
        title: "You decide whether this tight window is workable.",
        body:
          "Only the low end of the fixture-authored effort range fits. FORGE will not compress the work, infer your capacity, or choose whether you should continue.",
        route: null,
        routeLabel: null,
        routeBoundary:
          "No action opens until the learner makes an explicit choice in an authorized continuity model.",
      };
    case "protected_study_ready":
      return {
        index: "04",
        eyebrow: "Current job / protected study",
        title: "Inspect how help turns off before proof.",
        body:
          "The reviewed source copy, accepted action, declared window, and exact released World align. The next view explains the learning contract before any World preview.",
        route: "/internal/university-protected-study",
        routeLabel: "Inspect protected study brief",
        routeBoundary:
          "Preview only. No course state, learner session, completion, evidence, or progress transfers or saves.",
      };
    case "world_review_required":
      return {
        index: "04",
        eyebrow: "Current job / exact World",
        title: "The reviewed learning activity changed.",
        body:
          "The supplied World is unavailable or no longer matches the exact version, route, protocol, and source order accepted in the path. FORGE will not substitute a similar activity.",
        route: null,
        routeLabel: null,
        routeBoundary:
          "No World or session control is available until the exact binding is reviewed.",
      };
    case "path_complete":
      return {
        index: "05",
        eyebrow: "Current job / honest return",
        title: "This action is complete. The course is not.",
        body:
          "The accepted path has no next action in this fixture. That does not establish course completion, capability, retention, or a durable learning record.",
        route: null,
        routeLabel: null,
        routeBoundary:
          "No new action is selected and no course or semester outcome is claimed.",
      };
    case "path_blocked":
      return {
        index: "02",
        eyebrow: "Current job / accepted path",
        title: "The accepted action is blocked. Do not route around it.",
        body:
          "The existing learner-accepted path cannot currently produce a runnable next action. The loop does not infer why, score the learner, or choose a replacement.",
        route: null,
        routeLabel: null,
        routeBoundary:
          "Repair or replace the accepted path through a separately authorized learner decision.",
      };
    case "invalid":
      return {
        index: "00",
        eyebrow: "Current job / repair input",
        title: "This semester envelope did not line up.",
        body:
          "Owner, tenant, term, course, time, source, Today, Recovery, and World inputs must recompute inside one exact bounded envelope.",
        route: null,
        routeLabel: null,
        routeBoundary:
          "No source, action, recovery draft, World, or learner effect is available.",
      };
  }
}

function stateLabel(state: JourneyState): string {
  if (state === "not_needed") return "not needed";
  return readable(state);
}

function shortDigest(value: string | null): string {
  return value ? `${value.slice(0, 19)}...` : "Unavailable";
}

export function UniversitySemesterLoopWorkspace({
  scenarios,
}: {
  scenarios: readonly UniversitySemesterLoopFixtureScenario[];
}) {
  const [selectedId, setSelectedId] = useState<
    UniversitySemesterLoopFixtureScenario["id"]
  >(scenarios[0]?.id ?? "ready");
  const selected =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];

  if (!selected) return <UniversitySemesterLoopUnavailable />;

  const projection = selected.projection;
  const job = presentation(projection);
  const journey = journeyFor(projection.status);
  const today = projection.today;
  const source = today?.source;
  const capacity = today?.capacity;
  const action = today?.action;
  const recovery = projection.recoveryDraft;
  const protectedStudy = projection.protectedStudy;
  const world = protectedStudy?.world;

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-semester-loop-title"
      data-status={projection.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.course}>
            {projection.courseLabel ?? "Semester envelope unavailable"}
          </p>
        </div>
        <div className={styles.termBlock}>
          <p>{projection.termLabel ?? "Synthetic adult fixture"}</p>
          <span>{projection.timeZone ?? "No time zone"}</span>
        </div>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>Copied sources are not university truth</span>
        <span>No recommendation</span>
        <span>No save, session, message, or evidence</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Stress-test the same semester</legend>
        <div>
          {scenarios.map((scenario) => (
            <label key={scenario.id}>
              <input
                type="radio"
                name="university-semester-loop-scenario"
                value={scenario.id}
                checked={scenario.id === selected.id}
                onChange={() => setSelectedId(scenario.id)}
              />
              <span>{scenario.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.hero}>
        <p className={styles.heroIndex} aria-hidden="true">{job.index}</p>
        <div>
          <p className={styles.eyebrow}>{job.eyebrow}</p>
          <h1 id="university-semester-loop-title">
            One semester. One honest next move.
          </h1>
        </div>
      </section>

      <nav className={styles.journey} aria-label="Semester learning loop">
        <ol>
          {journey.map((stage, index) => (
            <li
              key={stage.id}
              data-state={stage.state}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <span className={styles.stageIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.stageName}>{stage.label}</span>
              <span className={styles.stageState}>{stateLabel(stage.state)}</span>
            </li>
          ))}
        </ol>
      </nav>

      <section className={styles.currentJob} aria-live="polite">
        <div className={styles.jobLead}>
          <p>{job.eyebrow}</p>
          <h2>{job.title}</h2>
        </div>
        <div className={styles.jobBody}>
          <p>{job.body}</p>
          {job.route && job.routeLabel ? (
            <div className={styles.actionControl}>
              <Link href={job.route} prefetch={false}>
                {job.routeLabel}
              </Link>
              <small>{job.routeBoundary}</small>
            </div>
          ) : (
            <p className={styles.noAction}>{job.routeBoundary}</p>
          )}
        </div>
      </section>

      <section className={styles.evidence} aria-labelledby="loop-evidence-title">
        <header>
          <p>Why this state exists</p>
          <h2 id="loop-evidence-title">The checks stay separate.</h2>
          <span>
            No score blends source uncertainty, learner time, path authority,
            and World integrity.
          </span>
        </header>

        <div className={styles.evidenceGrid}>
          <section className={styles.evidenceCard}>
            <p className={styles.cardIndex}>01 / Copied context</p>
            <h3>What the connected source says</h3>
            <dl>
              <div>
                <dt>Review state</dt>
                <dd>{source ? readable(source.reconciliationStatus) : "unavailable"}</dd>
              </div>
              <div>
                <dt>Reviewed facts</dt>
                <dd>{source?.reviewedContextFactCount ?? 0}</dd>
              </div>
              <div>
                <dt>Unresolved conflicts</dt>
                <dd>{source?.unresolvedConflictCount ?? 0}</dd>
              </div>
              <div>
                <dt>Institutional completeness</dt>
                <dd>{source ? readable(source.institutionalCompleteness) : "not established"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.evidenceCard}>
            <p className={styles.cardIndex}>02 / Declared reality</p>
            <h3>What fits today</h3>
            <dl>
              <div>
                <dt>Available</dt>
                <dd>{capacity ? `${capacity.availableMinutes} minutes` : "unavailable"}</dd>
              </div>
              <div>
                <dt>Authored effort</dt>
                <dd>
                  {capacity
                    ? `${capacity.effortMinutesLow} to ${capacity.effortMinutesHigh} minutes`
                    : "unavailable"}
                </dd>
              </div>
              <div>
                <dt>Fit</dt>
                <dd>{capacity ? readable(capacity.state) : "unavailable"}</dd>
              </div>
              <div>
                <dt>Declared by</dt>
                <dd>Learner fixture</dd>
              </div>
            </dl>
          </section>

          <section className={styles.evidenceCard}>
            <p className={styles.cardIndex}>03 / Accepted path</p>
            <h3>Where the action came from</h3>
            <p className={styles.cardStatement}>
              {action?.title
                ?? (projection.status === "path_complete"
                  ? "No next action remains in this accepted path."
                  : projection.status === "path_blocked"
                    ? "The accepted path cannot expose a runnable action."
                    : "No action is exposed in this state.")}
            </p>
            <dl>
              <div>
                <dt>Selection basis</dt>
                <dd>Existing learner-accepted reviewed path</dd>
              </div>
              <div>
                <dt>Selected from source facts</dt>
                <dd>No</dd>
              </div>
            </dl>
          </section>

          <section className={styles.evidenceCard}>
            <p className={styles.cardIndex}>04 / Learning boundary</p>
            <h3>What must still match</h3>
            <dl>
              <div>
                <dt>World</dt>
                <dd>{world ? `${world.id} / ${world.version}` : "not exposed"}</dd>
              </div>
              <div>
                <dt>Protected study</dt>
                <dd>{protectedStudy ? readable(protectedStudy.status) : "not available"}</dd>
              </div>
              <div>
                <dt>AI during proof</dt>
                <dd>{protectedStudy?.learningContract ? "Off" : "not asserted"}</dd>
              </div>
              <div>
                <dt>Session start</dt>
                <dd>Not allowed</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      {recovery ? (
        <section className={styles.recoveryStrip} aria-labelledby="recovery-strip-title">
          <div>
            <p>Same-envelope recovery</p>
            <h2 id="recovery-strip-title">The work stays whole.</h2>
          </div>
          <dl>
            <div>
              <dt>Protected work</dt>
              <dd>
                {recovery.capacity
                  ? `${recovery.capacity.protectedEffortMinutesLow} to ${recovery.capacity.protectedEffortMinutesHigh} minutes`
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Protected buffer</dt>
              <dd>
                {recovery.capacity
                  ? `${recovery.capacity.protectedBufferMinutes} minutes`
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Draft state</dt>
              <dd>{readable(recovery.status)}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{recovery.humanHelpDraft ? "Prepared, not sent" : "Not prepared"}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <footer className={styles.authority}>
        <div>
          <p>Authority ceiling</p>
          <strong>Navigation explanation only</strong>
        </div>
        <dl>
          <div>
            <dt>Scope</dt>
            <dd>
              {projection.scope
                ? `${projection.scope.termId} / ${projection.scope.courseId}`
                : "Unavailable"}
            </dd>
          </div>
          <div>
            <dt>As of</dt>
            <dd>{projection.asOf ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Projection digest</dt>
            <dd>{shortDigest(projection.projectionDigest)}</dd>
          </div>
        </dl>
        <p className={styles.claimCeiling}>
          This synthetic fixture does not establish live data, institutional
          truth, demand, learning, recovery efficacy, accessibility
          conformance, or production readiness.
        </p>
      </footer>
    </article>
  );
}

export function UniversitySemesterLoopUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No university semester-loop research state is available.</h1>
      <p>
        No source, action, recovery draft, World, session, message, or evidence
        was exposed.
      </p>
    </section>
  );
}
