"use client";

import { useMemo, useRef, useState } from "react";

import type {
  UniversitySemesterSandboxChoiceId,
  UniversitySemesterSandboxFixture,
  UniversitySemesterSandboxFixtureScenario,
} from "@/app/internal/university-semester-loop/semester-sandbox-fixture.server";

import styles from "./UniversitySemesterSandboxWorkspace.module.css";

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function readableDeadline(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function presentation(
  scenario: UniversitySemesterSandboxFixtureScenario,
) {
  const action = scenario.projection.action;

  switch (scenario.id) {
    case "pending":
      return {
        tone: "waiting",
        eyebrow: "Review required",
        title: "This copy stays outside Today.",
        body:
          "FORGE is waiting for your source judgment. It has not used the copied deadline to unblock the semester loop.",
        sourceState: "Not reviewed",
        todayState: "Withheld",
        recoveryState: "Waiting",
        studyState: "Not exposed",
        action,
        announcement:
          "Review required. The copied deadline remains outside Today.",
      } as const;
    case "accept":
      return {
        tone: "ready",
        eyebrow: "Transcription confirmed",
        title: action?.title ?? "The accepted path action is available.",
        body:
          action?.objective
          ?? "The exact accepted-path action can now pass the copied-context boundary.",
        sourceState: "Copy confirmed",
        todayState: "Existing action admitted",
        recoveryState: "Deadline binding valid",
        studyState: "Brief available",
        action,
        announcement:
          `Transcription confirmed. ${action?.title ?? "The accepted path action is available."}`,
      } as const;
    case "fixed_correct":
      return {
        tone: "corrected",
        eyebrow: "Fixed sample correction selected",
        title: action?.title ?? "The accepted path action is available.",
        body:
          "The fixed server-authored sample correction changes copied context only. It does not change which action the accepted path selected.",
        sourceState: "Sample correction selected",
        todayState: "Existing action admitted",
        recoveryState: "Corrected deadline bound",
        studyState: "Brief available",
        action,
        announcement:
          `Fixed sample correction selected. ${action?.title ?? "The accepted path action is available."}`,
      } as const;
    case "reject":
      return {
        tone: "stopped",
        eyebrow: "Replacement source required",
        title: "This copy stops at the source boundary.",
        body:
          "Rejecting the only copied deadline leaves Recovery without an effective deadline. The complete loop refuses the handoff instead of pretending the isolated action is usable.",
        sourceState: "Copy rejected",
        todayState: "Withheld by complete loop",
        recoveryState: "Deadline missing",
        studyState: "Not exposed",
        action: null,
        announcement:
          "Replacement source required. The copied deadline stops at the source boundary.",
      } as const;
  }
}

export function UniversitySemesterSandboxWorkspace({
  fixture,
}: {
  fixture: Readonly<UniversitySemesterSandboxFixture>;
}) {
  const first = fixture.scenarios[0];
  const [selectedId, setSelectedId] =
    useState<UniversitySemesterSandboxChoiceId>(first?.id ?? "pending");
  const pendingRadioRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(
    () => fixture.scenarios.find((scenario) => scenario.id === selectedId)
      ?? first,
    [first, fixture.scenarios, selectedId],
  );

  if (!selected) return <UniversitySemesterSandboxUnavailable />;

  const copy = presentation(selected);
  const projection = selected.projection;
  const shownDeadline = selected.id === "fixed_correct"
    ? fixture.fixedCorrection
    : fixture.copiedDeadline;
  const isReady = projection.status === "ready";
  const decisionLabel = selected.id === "pending"
    ? "No decision"
    : selected.id === "accept"
      ? "Transcription match"
      : selected.id === "fixed_correct"
        ? "Fixed sample correction"
        : "Copy rejected";

  function select(nextId: UniversitySemesterSandboxChoiceId) {
    setSelectedId(nextId);
  }

  function reset() {
    pendingRadioRef.current?.focus();
    setSelectedId("pending");
  }

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-semester-sandbox-title"
      data-choice={selected.id}
      data-status={projection.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.course}>{fixture.courseLabel}</p>
        </div>
        <p className={styles.term}>{fixture.termLabel}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>Refresh-clear</span>
        <span>No real coursework</span>
        <span>No save</span>
        <span>No automatic network request</span>
        <span>No recommendation</span>
      </div>

      <section className={styles.hero}>
        <p className={styles.heroIndex}>01 / Source judgment</p>
        <div>
          <p className={styles.eyebrow}>From copied context to one bounded job</p>
          <h1 id="university-semester-sandbox-title">
            Does this copied deadline match the checked source?
          </h1>
          <p className={styles.intro}>
            Inspect one invented course-source copy and the fixed sample
            alternative before choosing how this research case should treat the
            copy. A match confirms transcription only—not whether the source is
            official, complete, or suitable for a real plan.
          </p>
        </div>
      </section>

      <section
        className={styles.sourceCard}
        aria-labelledby="university-semester-source-title"
      >
        <div className={styles.cardHeader}>
          <p>Copied source fact</p>
          <span>Evidence before choice</span>
        </div>
        <div className={styles.sourceCardBody}>
          <div>
            <p className={styles.sourceLabel}>{fixture.sourceLabel}</p>
            <h2 id="university-semester-source-title">
              {fixture.copiedDeadline.title}
            </h2>
            <p className={styles.sourceBoundary}>
              The alternative is fixed by the synthetic server fixture. It was
              not typed by the current browser user.
            </p>
          </div>
          <dl className={styles.sourceFacts}>
            <div>
              <dt>Copied deadline</dt>
              <dd>
                {readableDeadline(
                  fixture.copiedDeadline.dueAt,
                  fixture.copiedDeadline.timeZone,
                )}
              </dd>
            </div>
            <div>
              <dt>Fixed sample correction</dt>
              <dd>
                {readableDeadline(
                  fixture.fixedCorrection.dueAt,
                  fixture.fixedCorrection.timeZone,
                )}
              </dd>
            </div>
            <div>
              <dt>Source authenticity</dt>
              <dd>Not established</dd>
            </div>
            <div>
              <dt>Institutional completeness</dt>
              <dd>Not established</dd>
            </div>
          </dl>
        </div>
      </section>

      <fieldset className={styles.choiceFieldset}>
        <legend>Choose the fixed sample source decision</legend>
        <div className={styles.choiceGrid}>
          {fixture.scenarios.map((scenario, index) => (
            <label
              className={styles.choice}
              data-selected={scenario.id === selected.id}
              key={scenario.id}
            >
              <input
                checked={scenario.id === selected.id}
                name="university-semester-sandbox-choice"
                onChange={() => select(scenario.id)}
                ref={scenario.id === "pending" ? pendingRadioRef : undefined}
                type="radio"
                value={scenario.id}
              />
              <span className={styles.choiceIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.choiceCopy}>
                <strong>{scenario.label}</strong>
                <small>{scenario.description}</small>
              </span>
            </label>
          ))}
        </div>
        <div className={styles.choiceFooter}>
          <p>
            Four closed server-authored outcomes. No arbitrary decision reaches
            the client.
          </p>
          <button
            disabled={selected.id === "pending"}
            onClick={reset}
            type="button"
          >
            Reset review
          </button>
        </div>
      </fieldset>

      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {copy.announcement}
      </p>

      <section
        className={styles.result}
        aria-labelledby="university-semester-result-title"
        data-tone={copy.tone}
      >
          <div className={styles.resultState}>
            <span aria-hidden="true" />
            <p>{copy.eyebrow}</p>
          </div>
          <h2 id="university-semester-result-title">{copy.title}</h2>
          <p className={styles.resultBody}>{copy.body}</p>

          {isReady && copy.action ? (
            <div className={styles.nextJob}>
              <p>Next bounded job</p>
              <strong>Inspect the exact protected-study contract</strong>
              <span>
                The action still comes from the existing learner-accepted path.
                This fixture cannot start a session or record evidence.
              </span>
            </div>
          ) : selected.id === "reject" ? (
            <div className={styles.nextJob} data-stopped="true">
              <p>Recovery boundary</p>
              <strong>Bring a current source copy</strong>
              <span>
                FORGE did not transfer the isolated Today action through an
                invalid complete loop.
              </span>
            </div>
          ) : (
            <div className={styles.nextJob} data-stopped="true">
              <p>Next bounded job</p>
              <strong>Review the copied deadline</strong>
              <span>
                No learning action is shown until the source decision is
                explicit.
              </span>
            </div>
          )}

          <dl className={styles.resultFacts}>
            <div>
              <dt>Selected case</dt>
              <dd>{decisionLabel}</dd>
            </div>
            <div>
              <dt>Complete loop</dt>
              <dd>{readable(projection.loopStatus ?? projection.status)}</dd>
            </div>
            <div>
              <dt>Action selector</dt>
              <dd>Existing accepted path only</dd>
            </div>
            <div>
              <dt>Session start</dt>
              <dd>Not allowed</dd>
            </div>
            <div>
              <dt>Projection</dt>
              <dd>
                {projection.projectionDigest
                  ? `${projection.projectionDigest.slice(0, 18)}…`
                  : "Unsigned refusal"}
              </dd>
            </div>
          </dl>
          <p className={styles.resultBoundary}>
            {selected.id === "fixed_correct"
              ? `This closed case gives the loop the fixed sample value: ${readableDeadline(shownDeadline.dueAt, shownDeadline.timeZone)}.`
              : selected.id === "reject"
                ? "The rejected copy contributes no effective deadline."
                : "The original copied value is unchanged."}
          </p>
      </section>

      <section
        className={styles.journey}
        aria-label="Synthetic semester boundary"
      >
        <ol>
          {[
            ["Copied source", copy.sourceState],
            ["Today", copy.todayState],
            ["Recovery", copy.recoveryState],
            ["Protected study", copy.studyState],
          ].map(([label, state], index) => (
            <li key={label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{label}</strong>
              <small>{state}</small>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.authority}>
        <div>
          <p>Authority ceiling</p>
          <h2>The learner chooses. The fixture only shows the consequence.</h2>
        </div>
        <dl>
          <div>
            <dt>Source authenticity</dt>
            <dd>Not established</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>External effects</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Product claim</dt>
            <dd>Synthetic workflow research only</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

export function UniversitySemesterSandboxUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No transient semester review is available.</h1>
      <p>
        No source decision, Today action, Recovery draft, protected-study
        contract, session, evidence, or external effect was exposed.
      </p>
    </section>
  );
}
