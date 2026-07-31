"use client";

import Link from "next/link";
import { useState } from "react";

import type { UniversityRecoveryFixtureScenario } from "@/app/internal/university-recovery/recovery-fixture.server";
import type {
  UniversityRecoveryProjectedItem,
  UniversityRecoveryProjectionV1,
} from "@/src/forge/university-recovery";

import styles from "./UniversityRecoveryWorkspace.module.css";

function readableState(value: string): string {
  return value.replaceAll("_", " ");
}

function readableDeadline(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function presentation(projection: UniversityRecoveryProjectionV1) {
  switch (projection.status) {
    case "draft_ready":
      return {
        label: "A workable reset",
        title: "Rebuild from what fits now.",
        body: "Required work and the protected buffer fit inside the time entered for this recovery window.",
      };
    case "learner_choice_required":
      return {
        label: "One choice is still open",
        title: "Protect the learning. Choose the trade-off.",
        body: "FORGE has kept the effort range intact and separated work that needs your decision.",
      };
    case "human_help_required":
      return {
        label: "A consequence needs a human decision",
        title: "Ask before carrying the conflict forward.",
        body: "The draft prepares one precise question. It does not send it or guess what the course will allow.",
      };
    case "source_review_required":
      return {
        label: "Course facts need review",
        title: "Resolve the copied deadline first.",
        body: "No recovery lane is shown while a connected source is stale, incomplete, duplicated, or conflicting.",
      };
    default:
      return {
        label: "Recovery unavailable",
        title: "No usable recovery draft was produced.",
        body: "The fixture failed closed before classifying, scheduling, saving, or sending anything.",
      };
  }
}

function laneReason(item: UniversityRecoveryProjectedItem): string {
  switch (item.laneReason) {
    case "learner_marked_required":
      return "You marked this required.";
    case "learner_choice_or_human_decision_needed":
      return item.learningEssential
        ? "You marked its learning value as essential, so it stays visible for a choice."
        : "You marked this negotiable, so no choice has been made for you.";
    case "learner_marked_deferrable":
      return "You marked this deferrable for this window.";
    case "learner_marked_no_longer_useful":
      return "You marked this no longer useful.";
  }
}

function RecoveryItem({
  item,
  timeZone,
}: {
  item: UniversityRecoveryProjectedItem;
  timeZone: string;
}) {
  return (
    <article className={styles.workItem}>
      <div className={styles.itemHeading}>
        <div>
          <p>{item.courseLabel}</p>
          <h3>{item.title}</h3>
        </div>
        <span data-timing={item.timing}>{readableState(item.timing)}</span>
      </div>
      <dl className={styles.itemFacts}>
        <div>
          <dt>Copied deadline</dt>
          <dd>{readableDeadline(item.dueAt, timeZone)}</dd>
        </div>
        <div>
          <dt>Entered effort</dt>
          <dd>{item.effortMinutesLow}-{item.effortMinutesHigh} minutes</dd>
        </div>
        <div>
          <dt>Consequence</dt>
          <dd>{readableState(item.consequenceClass)}</dd>
        </div>
      </dl>
      <p className={styles.itemReason}>{laneReason(item)}</p>
      <p className={styles.sourceLine}>
        Reviewed learner copy. Authenticity and institutional completeness are not established.
      </p>
    </article>
  );
}

function RecoveryLane({
  title,
  description,
  items,
  timeZone,
  empty,
}: {
  title: string;
  description: string;
  items: readonly UniversityRecoveryProjectedItem[];
  timeZone: string;
  empty: string;
}) {
  return (
    <section className={styles.lane} aria-labelledby={`recovery-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <header>
        <div>
          <h2 id={`recovery-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span aria-label={`${items.length} items`}>{items.length}</span>
      </header>
      {items.length > 0 ? (
        <div className={styles.itemList}>
          {items.map((item) => (
            <RecoveryItem key={item.itemId} item={item} timeZone={timeZone} />
          ))}
        </div>
      ) : <p className={styles.emptyLane}>{empty}</p>}
    </section>
  );
}

export function UniversityRecoveryWorkspace({
  scenarios,
}: {
  scenarios: readonly UniversityRecoveryFixtureScenario[];
}) {
  const [selectedId, setSelectedId] = useState<UniversityRecoveryFixtureScenario["id"]>(
    scenarios[0]?.id ?? "reset-fits",
  );
  const selected = scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  if (!selected) return <UniversityRecoveryWorkspaceFallback />;

  const projection = selected.projection;
  const copy = presentation(projection);
  const timeZone = projection.timeZone ?? "UTC";
  const showDraft = projection.capacity !== null && projection.status !== "source_review_required";

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-recovery-title"
      data-status={projection.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.productName}>Recovery draft</p>
        </div>
        <p className={styles.term}>{projection.termLabel ?? "Sample term"}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>No save</span>
        <span>No messages</span>
        <span>No deadline changes</span>
        <span>No backlog score</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Test a recovery state</legend>
        <div>
          {scenarios.map((scenario) => (
            <label key={scenario.id}>
              <input
                type="radio"
                name="university-recovery-scenario"
                value={scenario.id}
                checked={scenario.id === selected.id}
                onChange={() => setSelectedId(scenario.id)}
              />
              <span>{scenario.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.summary} aria-live="polite">
        <div className={styles.summaryCopy}>
          <p className={styles.stateLabel}>{copy.label}</p>
          <h1 id="university-recovery-title">{copy.title}</h1>
          <p>{copy.body}</p>
          {projection.status === "source_review_required" ? (
            <div className={styles.primaryAction}>
              <Link
                href="/internal/university-source-review"
                prefetch={false}
              >
                Review source copies
              </Link>
              <p>The source-review fixture keeps conflicts blocked and prepares a responsible-human question.</p>
            </div>
          ) : null}
        </div>

        <aside className={styles.capacity} aria-labelledby="recovery-capacity-title">
          <h2 id="recovery-capacity-title">Declared recovery window</h2>
          {projection.capacity ? (
            <>
              <p className={styles.capacityValue}>
                <strong>{projection.capacity.workableMinutes}</strong>
                <span>workable minutes</span>
              </p>
              <dl>
                <div>
                  <dt>Protected work</dt>
                  <dd>
                    {projection.capacity.protectedEffortMinutesLow}-
                    {projection.capacity.protectedEffortMinutesHigh} min
                  </dd>
                </div>
                <div>
                  <dt>Buffer kept</dt>
                  <dd>{projection.capacity.protectedBufferMinutes} min</dd>
                </div>
                <div>
                  <dt>Fit</dt>
                  <dd>{readableState(projection.capacity.state)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className={styles.capacityUnavailable}>Withheld until connected source copies are reviewed.</p>
          )}
        </aside>
      </section>

      {projection.humanHelpDraft ? (
        <section className={styles.helpDraft} aria-labelledby="recovery-help-title">
          <div>
            <p>Prepared, not sent</p>
            <h2 id="recovery-help-title">{projection.humanHelpDraft.subject}</h2>
            <p>{projection.humanHelpDraft.question}</p>
          </div>
          <dl>
            <div>
              <dt>Route you entered</dt>
              <dd>{readableState(projection.humanHelpDraft.route)}</dd>
            </div>
            <div>
              <dt>Send authority</dt>
              <dd>Not allowed</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {showDraft ? (
        <>
          <div className={styles.orderNote} role="note">
            <strong>How this is ordered</strong>
            <span>Reviewed deadline, then item ID. This is not a priority or ability score.</span>
          </div>
          <div className={styles.lanes}>
            <RecoveryLane
              title="Protect now"
              description="Work you marked required. Its full effort range stays intact."
              items={projection.lanes.protectNow}
              timeZone={timeZone}
              empty="Nothing is marked required in this sample."
            />
            <RecoveryLane
              title="Decide or ask"
              description="Trade-offs that still need your choice or a responsible human."
              items={projection.lanes.decideOrAsk}
              timeZone={timeZone}
              empty="No open trade-off in this sample."
            />
            <RecoveryLane
              title="Outside this window"
              description="Items you marked deferrable or no longer useful."
              items={projection.lanes.outsideThisWindow}
              timeZone={timeZone}
              empty="Nothing has been placed outside this window."
            />
          </div>
        </>
      ) : null}

      <section className={styles.sources} aria-labelledby="recovery-sources-title">
        <div>
          <h2 id="recovery-sources-title">Course-source boundary</h2>
          <p>Connected copies can supply a reviewed deadline. They cannot prove institutional truth.</p>
        </div>
        <dl>
          {projection.sourceCourses.map((course) => (
            <div key={course.courseId}>
              <dt>{course.courseLabel}</dt>
              <dd>{readableState(course.reconciliationStatus)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className={styles.authority}>
        <p>Authority ceiling</p>
        <dl>
          <div>
            <dt>Dispositions</dt>
            <dd>Learner fixture only</dd>
          </div>
          <div>
            <dt>Automatic deferral</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Persistence and messages</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Projection digest</dt>
            <dd>{projection.projectionDigest?.slice(0, 19) ?? "Unavailable"}...</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

function UniversityRecoveryWorkspaceFallback() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No recovery state is available.</h1>
      <p>No work was classified, saved, changed, or sent.</p>
    </section>
  );
}
