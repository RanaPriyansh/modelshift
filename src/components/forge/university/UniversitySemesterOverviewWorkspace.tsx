"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type {
  UniversitySemesterOverviewFixture,
  UniversitySemesterOverviewFixtureScenarioId as ScenarioId,
} from "@/app/internal/university-semester-overview/semester-overview-fixture.server";

import { UniversitySemesterOverviewUnavailable } from "./UniversitySemesterOverviewUnavailable";
import styles from "./UniversitySemesterOverviewWorkspace.module.css";

type ScrollPosition = {
  readonly left: number;
  readonly top: number;
};

function fullyVisible(element: HTMLElement): boolean {
  const bounds = element.getBoundingClientRect();
  const clearance = 6;
  return bounds.top >= clearance
    && bounds.right <= window.innerWidth - clearance
    && bounds.bottom <= window.innerHeight - clearance
    && bounds.left >= clearance;
}

function AuthorityBoundary({
  fixture,
}: {
  fixture: Readonly<UniversitySemesterOverviewFixture>;
}) {
  const authority = fixture.authority;
  const items = [
    ["Projection", authority.projectionClass],
    ["Order basis", authority.orderBasis],
    ["Identity", authority.identity],
    ["Tenant isolation", authority.tenantIsolation],
    ["Rights enforcement", authority.rightsEnforcement],
    ["Institutional completeness", authority.institutionalCompleteness],
    ["Term feasibility", authority.termFeasibility],
    ["Course selection", authority.courseSelection],
    ["Global action", authority.globalAction],
    ["Recommendation", authority.recommendation],
    ["Scheduling", authority.scheduling],
    ["Provider call", authority.providerCall],
    ["Persistence", authority.persistence],
    ["Session", authority.session],
    ["Evidence", authority.evidence],
    ["Message", authority.message],
    ["Event", authority.event],
    ["External effect", authority.externalEffect],
  ] as const;

  return (
    <footer
      className={styles.authority}
      aria-labelledby="semester-overview-authority-title"
    >
      <p id="semester-overview-authority-title">
        Navigation explanation only
      </p>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </footer>
  );
}

export function UniversitySemesterOverviewWorkspace({
  fixture,
}: {
  fixture: Readonly<UniversitySemesterOverviewFixture>;
}) {
  const first = fixture.scenarios[0];
  const [selectedId, setSelectedId] = useState<ScenarioId>(
    first?.id ?? "mixed-term",
  );
  const firstRadioRef = useRef<HTMLInputElement>(null);
  const pendingScrollPositionRef = useRef<ScrollPosition | null>(null);
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

  if (!selected) return <UniversitySemesterOverviewUnavailable />;

  const view = selected.view;

  function select(nextId: ScenarioId, control: HTMLInputElement) {
    const focusContainer = control.closest("label") ?? control;
    pendingScrollPositionRef.current = (
      document.activeElement === control && fullyVisible(focusContainer)
    )
      ? { left: window.scrollX, top: window.scrollY }
      : null;
    setSelectedId(nextId);
  }

  function reset() {
    const firstRadio = firstRadioRef.current;
    const focusContainer = firstRadio?.closest("label") ?? firstRadio;
    const keepScrollPosition = firstRadio !== null
      && focusContainer !== null
      && fullyVisible(focusContainer);
    pendingScrollPositionRef.current = keepScrollPosition
      ? { left: window.scrollX, top: window.scrollY }
      : null;
    setSelectedId(first?.id ?? "mixed-term");
    firstRadio?.focus({ preventScroll: true });
    if (focusContainer && !keepScrollPosition) {
      focusContainer.scrollIntoView?.({
        behavior: "instant" as ScrollBehavior,
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-semester-overview-title"
      data-status={view.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>
            Internal university workflow research
          </p>
          <p className={styles.productName}>Semester overview</p>
        </div>
        <div className={styles.term}>
          <strong>{fixture.termLabel}</strong>
          <span>{fixture.timeZone}</span>
        </div>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>Copied sources are not university truth</span>
        <span>Course-ID order, not priority</span>
        <span>No save, session, message, or evidence</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend className={styles.srOnly}>
          Select research scenario for this view
        </legend>
        <div className={styles.scenarioLayout}>
          <p aria-hidden="true">Select research scenario for this view</p>
          <div className={styles.scenarioOptions}>
            {fixture.scenarios.map((scenario, index) => (
              <label key={scenario.id}>
                <input
                  ref={index === 0 ? firstRadioRef : undefined}
                  type="radio"
                  name="university-semester-overview-scenario"
                  value={scenario.id}
                  aria-label={`${scenario.label}. ${scenario.description}`}
                  checked={scenario.id === selected.id}
                  onChange={(event) => {
                    select(scenario.id, event.currentTarget);
                  }}
                />
                <span>{scenario.label}</span>
              </label>
            ))}
          </div>
        </div>
        <footer>
          <p>
            Selection changes only this refresh-clear research view.
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={selected.id === first?.id}
          >
            Reset view
          </button>
        </footer>
      </fieldset>

      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {`${selected.label}. ${selected.description}. ${view.announcement}`}
      </p>

      <section className={styles.hero} aria-live="off">
        <p className={styles.heroIndex} aria-hidden="true">01</p>
        <div>
          <p className={styles.eyebrow}>{view.eyebrow}</p>
          <h1 id="university-semester-overview-title">{view.title}</h1>
          <p className={styles.heroBody}>{view.body}</p>
        </div>
      </section>

      {view.termBoundary ? (
        <section
          className={styles.termBand}
          aria-labelledby="semester-overview-term-boundary-title"
        >
          <h2 id="semester-overview-term-boundary-title">
            The term stays one boundary.
          </h2>
          <dl>
            <dt>Term Recovery</dt>
            <dd>{view.termBoundary.statusLabel}</dd>
          </dl>
          <dl>
            <dt>Course set</dt>
            <dd>{view.termBoundary.courseCountLabel}</dd>
          </dl>
          <dl>
            <dt>Interpretation</dt>
            <dd>{view.termBoundary.readinessBoundary}</dd>
          </dl>
        </section>
      ) : (
        <section
          className={styles.termStop}
          aria-labelledby="semester-overview-term-stop-title"
        >
          <h2 id="semester-overview-term-stop-title">
            The term boundary stopped.
          </h2>
          <p>
            No term state or course inspection is exposed from this view.
          </p>
        </section>
      )}

      {view.courses.length > 0 ? (
        <section
          className={styles.ledger}
          aria-labelledby="semester-overview-ledger-title"
        >
          <h2
            id="semester-overview-ledger-title"
            className={styles.srOnly}
          >
            Current-course inspection ledger
          </h2>
          <div className={styles.ledgerHead} aria-hidden="true">
            <span>#</span>
            <span>Course</span>
            <span>Today</span>
            <span>Semester loop</span>
            <span>Explanation</span>
          </div>
          <ol
            className={styles.courseLedger}
            aria-labelledby="semester-overview-ledger-title"
          >
            {view.courses.map((course, index) => (
              <li
                key={`${index}:${course.courseLabel}`}
                data-tone={course.tone}
              >
                <span className={styles.courseIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.courseName}>
                  <span className={styles.rowLabel}>Course</span>
                  <h3>{course.courseLabel}</h3>
                </div>
                <div className={styles.axis}>
                  <span className={styles.rowLabel}>Today</span>
                  <p>{course.todayStatusLabel}</p>
                </div>
                <div className={styles.axis}>
                  <span className={styles.rowLabel}>Semester loop</span>
                  <p>{course.semesterLoopStatusLabel}</p>
                </div>
                <p className={styles.explanation}>
                  <span className={styles.rowLabel}>Explanation</span>
                  {course.explanation}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <AuthorityBoundary fixture={fixture} />
    </article>
  );
}
