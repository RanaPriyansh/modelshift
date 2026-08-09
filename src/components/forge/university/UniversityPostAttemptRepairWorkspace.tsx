"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  UniversityPostAttemptRepairFixture,
  UniversityPostAttemptRepairFixtureScenarioId,
} from "@/app/internal/university-post-attempt-repair/post-attempt-repair-fixture.server";

import styles from "./UniversityPostAttemptRepairWorkspace.module.css";

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function AuthorityBoundary({
  fixture,
}: {
  fixture: Readonly<UniversityPostAttemptRepairFixture>;
}) {
  return (
    <footer
      className={styles.authority}
      aria-labelledby="post-attempt-repair-authority"
    >
      <p id="post-attempt-repair-authority">Authority ceiling</p>
      <dl>
        <div>
          <dt>Receipt</dt>
          <dd>{fixture.authority.receipt}</dd>
        </div>
        <div>
          <dt>Repair selection</dt>
          <dd>{fixture.authority.repair}</dd>
        </div>
        <div>
          <dt>Diagnosis</dt>
          <dd>{fixture.authority.diagnosis}</dd>
        </div>
        <div>
          <dt>Save or evidence</dt>
          <dd>{fixture.authority.saveOrEvidence}</dd>
        </div>
        <div>
          <dt>Session or path change</dt>
          <dd>{fixture.authority.sessionOrPathChange}</dd>
        </div>
        <div>
          <dt>External effect</dt>
          <dd>{fixture.authority.externalEffect}</dd>
        </div>
      </dl>
    </footer>
  );
}

export function UniversityPostAttemptRepairWorkspace({
  fixture,
}: {
  fixture: Readonly<UniversityPostAttemptRepairFixture>;
}) {
  const first = fixture.scenarios[0];
  const [selectedId, setSelectedId] =
    useState<UniversityPostAttemptRepairFixtureScenarioId>(
      first?.id ?? "one-check-open",
    );
  const firstRadioRef = useRef<HTMLInputElement>(null);
  const pendingScrollPositionRef = useRef<{
    readonly left: number;
    readonly top: number;
  } | null>(null);
  const selected = useMemo(
    () => fixture.scenarios.find((scenario) => scenario.id === selectedId)
      ?? first,
    [first, fixture.scenarios, selectedId],
  );

  useLayoutEffect(() => {
    const pending = pendingScrollPositionRef.current;
    if (!pending) return;
    pendingScrollPositionRef.current = null;
    window.scrollTo({
      behavior: "auto",
      left: pending.left,
      top: pending.top,
    });
  }, [selectedId]);

  if (!selected) return null;

  const view = selected.view;
  const evidence = view.evidence;
  const repair = view.repair;

  function select(
    nextId: UniversityPostAttemptRepairFixtureScenarioId,
    control: HTMLInputElement,
  ) {
    const bounds = control.getBoundingClientRect();
    const clearance = 6;
    const activeControlIsVisible = document.activeElement === control
      && bounds.top >= clearance
      && bounds.right <= window.innerWidth - clearance
      && bounds.bottom <= window.innerHeight - clearance
      && bounds.left >= clearance;
    pendingScrollPositionRef.current = activeControlIsVisible
      ? { left: window.scrollX, top: window.scrollY }
      : null;
    setSelectedId(nextId);
  }

  function reset() {
    pendingScrollPositionRef.current = null;
    setSelectedId(first?.id ?? "one-check-open");
    firstRadioRef.current?.focus();
  }

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-post-attempt-repair-title"
      data-status={view.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>
            Internal university workflow research
          </p>
          <p className={styles.productName}>After the attempt</p>
        </div>
        <p className={styles.term}>{fixture.termLabel}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>Transient</span>
        <span>Not saved</span>
        <span>Not a grade</span>
        <span>No mastery claim</span>
        <span>No AI diagnosis</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Select a closed synthetic result</legend>
        <div>
          {fixture.scenarios.map((scenario, index) => (
            <label key={scenario.id}>
              <input
                ref={index === 0 ? firstRadioRef : undefined}
                type="radio"
                name="university-post-attempt-repair-scenario"
                value={scenario.id}
                aria-label={`${scenario.label}. ${scenario.description}`}
                checked={scenario.id === selected.id}
                onChange={(event) => {
                  select(scenario.id, event.currentTarget);
                }}
              />
              <span>
                <strong>{scenario.label}</strong>
                <small>{scenario.description}</small>
              </span>
            </label>
          ))}
        </div>
        <footer>
          <p>
            Four closed server-authored outcomes. Selection changes only this
            refresh-clear research view.
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={selected.id === first?.id}
          >
            Reset result
          </button>
        </footer>
      </fieldset>

      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {view.announcement}
      </p>

      <section className={styles.hero} aria-live="off">
        <p className={styles.stateLabel}>{view.eyebrow}</p>
        <h1 id="university-post-attempt-repair-title">{view.title}</h1>
        <p>{view.body}</p>
      </section>

      {view.context ? (
        <section
          className={styles.context}
          aria-labelledby="post-attempt-context-title"
        >
          <header>
            <p>Server-paired synthetic context</p>
            <h2 id="post-attempt-context-title">
              {view.context.activityTitle}
            </h2>
          </header>
          <dl>
            <div>
              <dt>Course</dt>
              <dd>{fixture.courseLabel}</dd>
            </div>
            <div>
              <dt>Reviewed World</dt>
              <dd>
                {view.context.worldTitle} · {view.context.worldVersion}
              </dd>
            </div>
            <div>
              <dt>Task</dt>
              <dd>{view.context.taskLabel}</dd>
            </div>
            <div>
              <dt>Result boundary</dt>
              <dd>{view.context.resultBoundary}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {evidence ? (
        <section
          className={styles.evidence}
          aria-labelledby="post-attempt-evidence-title"
        >
          <header>
            <p>Deterministic attempt evidence</p>
            <h2 id="post-attempt-evidence-title">{evidence.countLabel}</h2>
            <span>{evidence.summary}</span>
          </header>

          {evidence.checks.length > 0 ? (
            <ol className={styles.checkRail}>
              {evidence.checks.map((check, index) => (
                <li key={check.id} data-state={check.state}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{check.label}</strong>
                    <small>{readable(check.state)}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.withheldChecks}>
              Check-level repair detail is withheld because no exact authored
              mapping covers this result.
            </p>
          )}

          <p className={styles.attemptLimit}>
            Immediate attempt only. This count is not a grade, progress meter,
            mastery estimate, or durable capability claim.
          </p>
        </section>
      ) : null}

      {view.status === "repair_ready" && repair ? (
        <section
          className={styles.repair}
          aria-labelledby="post-attempt-repair-move-title"
        >
          <p className={styles.repairIndex}>01</p>
          <div className={styles.repairMove}>
            <p>Next cognitive move</p>
            <h2 id="post-attempt-repair-move-title">{repair.title}</h2>
            <p>{repair.instruction}</p>

            <p className={styles.frameLabel}>
              Illustrative response shape — not an input
            </p>
            <div
              className={styles.responseFrame}
              role="note"
              aria-label="Illustrative response shape, not an input"
            >
              <span>[ {repair.responseFrame.firstSlot} ]</span>
              <b>{repair.responseFrame.connective}</b>
              <span>[ {repair.responseFrame.secondSlot} ].</span>
            </div>

            <div className={styles.completion}>
              <p>Completion condition</p>
              <strong>{repair.completionCondition}</strong>
            </div>
          </div>

          <aside className={styles.repairBoundary}>
            <div>
              <p>Support boundary</p>
              <strong>{repair.supportBoundary}</strong>
              <span>{repair.freshProofBoundary}</span>
            </div>
            <details>
              <summary>Why this move</summary>
              <p>{repair.whyThisMove}</p>
            </details>
          </aside>
        </section>
      ) : (
        <section
          className={styles.refusal}
          aria-labelledby="post-attempt-refusal-title"
        >
          <p>
            {view.status === "not_applicable"
              ? "Immediate result boundary"
              : view.status === "repair_mapping_missing"
                ? "Authored mapping boundary"
                : "Receipt boundary"}
          </p>
          <h2 id="post-attempt-refusal-title">
            {view.status === "not_applicable"
              ? "No repair action is available."
              : view.status === "repair_mapping_missing"
                ? "No authored mapping is available."
                : "Evidence stays hidden."}
          </h2>
          <strong>
            No repair, answer, retry, session, save, rescore, path change, or
            evidence upgrade is available from this state.
          </strong>
        </section>
      )}

      <AuthorityBoundary fixture={fixture} />
    </article>
  );
}
