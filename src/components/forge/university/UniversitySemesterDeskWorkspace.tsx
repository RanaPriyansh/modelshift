"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  UniversitySemesterDeskFixture,
} from "@/app/internal/university-semester-desk/semester-desk-fixture.server";

import { UniversitySemesterDeskUnavailable } from "./UniversitySemesterDeskUnavailable";
import styles from "./UniversitySemesterDeskWorkspace.module.css";

type Scenario = UniversitySemesterDeskFixture["scenarios"][number];
type Course = Scenario["courses"][number];

const AUTHORITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  projectionClass: "Projection",
  orderBasis: "Order basis",
  identity: "Identity",
  tenantIsolation: "Tenant isolation",
  rightsEnforcement: "Rights enforcement",
  institutionalCompleteness: "Institutional completeness",
  inspectionSelection: "Inspection selection",
  courseWorkSelection: "Course-work selection",
  priority: "Priority",
  termFeasibility: "Term feasibility",
  courseSelection: "Course selection",
  globalAction: "Global action",
  recommendation: "Recommendation",
  scheduling: "Scheduling",
  providerCall: "Provider call",
  persistence: "Persistence",
  session: "Session",
  evidence: "Evidence",
  message: "Message",
  event: "Event",
  externalEffect: "External effect",
});

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function readableAuthorityKey(key: string): string {
  return AUTHORITY_LABELS[key]
    ?? key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toUpperCase());
}

function fullyVisible(element: HTMLElement): boolean {
  const bounds = element.getBoundingClientRect();
  const clearance = 6;
  return bounds.top >= clearance
    && bounds.right <= window.innerWidth - clearance
    && bounds.bottom <= window.innerHeight - clearance
    && bounds.left >= clearance;
}

function courseAccessibleName(course: Course): string {
  return [
    course.courseLabel,
    `Today ${course.todayStatusLabel}.`,
    `Semester loop ${course.semesterLoopStatusLabel}.`,
    "Inspect this course.",
    "Inspection changes only this view. FORGE does not choose course work or priority.",
  ].join(" ");
}

function AuthorityBoundary({
  authority,
}: {
  authority: UniversitySemesterDeskFixture["authority"];
}) {
  return (
    <footer
      className={styles.authority}
      aria-labelledby="semester-desk-authority-title"
    >
      <p id="semester-desk-authority-title">Authority ceiling</p>
      <dl>
        {Object.entries(authority).map(([key, value]) => (
          <div key={key}>
            <dt>{readableAuthorityKey(key)}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
    </footer>
  );
}

function CourseChapter({
  course,
  onClear,
}: {
  course: Course;
  onClear: () => void;
}) {
  const evidence = course.evidence;

  return (
    <section
      className={styles.courseChapter}
      aria-labelledby="semester-desk-course-title"
      data-tone={course.tone}
    >
      <header className={styles.courseChapterHeader}>
        <div className={styles.chapterIdentity}>
          <p aria-hidden="true">02</p>
          <div>
            <span>{course.currentJob.eyebrow}</span>
            <h2 id="semester-desk-course-title">{course.courseLabel}</h2>
            <small>{course.learnerSelectionStatement}</small>
          </div>
        </div>
        <button type="button" onClick={onClear}>
          Clear course inspection
        </button>
      </header>

      <section
        className={styles.journey}
        aria-label="Selected course semester loop"
      >
        <ol>
          {course.journey.map((stage, index) => (
            <li
              key={stage.id}
              data-state={stage.state}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{stage.label}</strong>
              <small>{readable(stage.state)}</small>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles.currentJob}
        aria-labelledby="semester-desk-current-job-title"
      >
        <div className={styles.currentJobTitle}>
          <p>{course.currentJob.eyebrow}</p>
          <h3 id="semester-desk-current-job-title">
            {course.currentJob.title}
          </h3>
        </div>
        <div className={styles.currentJobBody}>
          <p>{course.currentJob.body}</p>
          <small>{course.currentJob.boundary}</small>
        </div>
      </section>

      <section
        className={styles.evidence}
        aria-labelledby="semester-desk-evidence-title"
      >
        <header>
          <p>Why this boundary exists</p>
          <h3 id="semester-desk-evidence-title">
            The checks stay separate.
          </h3>
          <span>
            No score blends copied context, learner-declared time, path
            ownership, and exact World integrity.
          </span>
        </header>
        <dl>
          <div>
            <dt>Copied context</dt>
            <dd>
              {evidence.sourceReviewState}
              <small>
                {evidence.reviewedFactCountLabel}
                {" · "}
                {evidence.conflictCountLabel}
                {" · "}
                institutional completeness {evidence.institutionalCompleteness}
              </small>
            </dd>
          </div>
          <div>
            <dt>Declared reality</dt>
            <dd>
              {evidence.capacityState}
              <small>
                {evidence.availableTimeLabel} · {evidence.effortLabel}
              </small>
            </dd>
          </div>
          <div>
            <dt>Accepted path</dt>
            <dd>
              {evidence.actionStatement}
              <small>{evidence.actionSelectionBasis}</small>
            </dd>
          </div>
          <div>
            <dt>Learning boundary</dt>
            <dd>
              {evidence.protectedStudyState}
              <small>{evidence.worldState}</small>
            </dd>
          </div>
        </dl>
        <p className={styles.noEffectBoundary}>
          {course.noEffectBoundary}
        </p>
      </section>
    </section>
  );
}

export function UniversitySemesterDeskWorkspace({
  fixture,
}: {
  fixture: Readonly<UniversitySemesterDeskFixture>;
}) {
  const firstScenario = fixture.scenarios[0];
  const [selectedScenarioId, setSelectedScenarioId] = useState<
    Scenario["id"] | null
  >(firstScenario?.id ?? null);
  const [selectedCourseOptionId, setSelectedCourseOptionId] =
    useState<string | null>(null);
  const [announcement, setAnnouncement] = useState(
    "No course is selected for inspection. FORGE has not chosen a course or priority.",
  );
  const courseRadioRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingClearOptionIdRef = useRef<string | null>(null);
  const scenario = useMemo(
    () => fixture.scenarios.find(
      (candidate) => candidate.id === selectedScenarioId,
    ) ?? firstScenario,
    [firstScenario, fixture.scenarios, selectedScenarioId],
  );
  const selectedCourse = useMemo(
    () => scenario?.courses.find(
      (course) => course.optionId === selectedCourseOptionId,
    ) ?? null,
    [scenario, selectedCourseOptionId],
  );

  useLayoutEffect(() => {
    const optionId = pendingClearOptionIdRef.current;
    if (optionId === null || selectedCourseOptionId !== null) return;

    const selectedControl = courseRadioRefs.current.get(optionId);
    if (!selectedControl) return;
    const focusContainer = selectedControl.closest("label") ?? selectedControl;
    selectedControl.focus({ preventScroll: true });

    let frame: number | null = null;
    let pass = 0;
    const revealAfterLayout = () => {
      if (pendingClearOptionIdRef.current !== optionId) {
        frame = null;
        return;
      }
      if (focusContainer && !fullyVisible(focusContainer)) {
        focusContainer.scrollIntoView?.({
          behavior: "instant" as ScrollBehavior,
          block: "center",
          inline: "nearest",
        });
      }
      if (pass === 0) {
        pass = 1;
        frame = window.requestAnimationFrame(revealAfterLayout);
      } else {
        pendingClearOptionIdRef.current = null;
        frame = null;
      }
    };
    frame = window.requestAnimationFrame(revealAfterLayout);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [selectedCourseOptionId, selectedScenarioId]);

  if (!scenario) return <UniversitySemesterDeskUnavailable />;

  function selectScenario(nextScenario: Scenario) {
    pendingClearOptionIdRef.current = null;
    setSelectedScenarioId(nextScenario.id);
    setSelectedCourseOptionId(null);
    setAnnouncement(
      `${nextScenario.label} research scenario selected. No course is selected for inspection.`,
    );
  }

  function selectCourse(course: Course) {
    pendingClearOptionIdRef.current = null;
    setSelectedCourseOptionId(course.optionId);
    setAnnouncement(course.announcement);
  }

  function clearCourseInspection() {
    if (!selectedCourseOptionId) return;
    pendingClearOptionIdRef.current = selectedCourseOptionId;
    setSelectedCourseOptionId(null);
    setAnnouncement(
      "Course inspection cleared. No course is selected for inspection.",
    );
  }

  return (
    <div className={styles.surface}>
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>
            Internal university workflow research
          </p>
          <p className={styles.productName}>Semester desk</p>
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
        <span>Scenario changes clear inspection; no save or evidence</span>
      </div>

      <fieldset
        className={styles.scenarioPicker}
        aria-describedby="semester-desk-scenario-boundary"
      >
        <legend className={styles.srOnly}>
          Select research scenario for this view
        </legend>
        <div className={styles.scenarioLayout}>
          <p aria-hidden="true">Select research scenario for this view</p>
          <div className={styles.scenarioOptions}>
            {fixture.scenarios.map((candidate) => (
              <label key={candidate.id}>
                <input
                  type="radio"
                  name="university-semester-desk-scenario"
                  checked={candidate.id === scenario.id}
                  aria-label={`${candidate.label}. ${candidate.description}`}
                  onChange={() => selectScenario(candidate)}
                />
                <span>{candidate.label}</span>
              </label>
            ))}
          </div>
        </div>
        <p
          id="semester-desk-scenario-boundary"
          className={styles.srOnly}
        >
          Experiment control only. Changing scenario clears course inspection
          and creates no effect.
        </p>
      </fieldset>

      <p
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>

      <article
        className={styles.studentArticle}
        aria-labelledby="university-semester-desk-title"
      >
        <section className={styles.hero}>
          <p className={styles.heroIndex} aria-hidden="true">01</p>
          <div>
            <p className={styles.eyebrow}>
              All current courses / shallow inspection
            </p>
            <h1 id="university-semester-desk-title">
              See the whole term. Choose where to look closer.
            </h1>
            <div className={styles.heroSupport}>
              <p>
                See each bounded course state without a score,
                recommendation, or hidden ranking.
              </p>
              <small>
                Chosen by you for inspection — not selected or prioritized by
                FORGE.
              </small>
            </div>
          </div>
        </section>

        <section
          className={styles.termBand}
          aria-labelledby="semester-desk-term-boundary-title"
        >
          <h2 id="semester-desk-term-boundary-title">
            The term stays one boundary.
          </h2>
          <dl>
            <dt>Term Recovery</dt>
            <dd>{scenario.termBoundary.statusLabel}</dd>
          </dl>
          <dl>
            <dt>Course set</dt>
            <dd>{scenario.termBoundary.courseCountLabel}</dd>
          </dl>
          <dl>
            <dt>Interpretation</dt>
            <dd>{scenario.termBoundary.readinessBoundary}</dd>
          </dl>
        </section>

        <fieldset className={styles.courseSelector}>
          <legend className={styles.srOnly}>
            Choose one course to inspect
          </legend>
          <div className={styles.ledgerHead} aria-hidden="true">
            <span>#</span>
            <span>Course</span>
            <span>Today</span>
            <span>Semester loop</span>
            <span>Inspect</span>
          </div>
          <ol className={styles.courseLedger}>
            {scenario.courses.map((course, index) => (
              <li
                key={course.optionId}
                data-tone={course.tone}
                data-selected={course.optionId === selectedCourseOptionId
                  ? "true"
                  : "false"}
              >
                <span className={styles.courseIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.courseName}>
                  <span className={styles.rowLabel}>Course</span>
                  <strong>{course.courseLabel}</strong>
                </div>
                <div className={styles.axis}>
                  <span className={styles.rowLabel}>Today</span>
                  <p>{course.todayStatusLabel}</p>
                </div>
                <div className={styles.axis}>
                  <span className={styles.rowLabel}>Semester loop</span>
                  <p>{course.semesterLoopStatusLabel}</p>
                </div>
                <label className={styles.inspectControl}>
                  <input
                    ref={(control) => {
                      if (control) {
                        courseRadioRefs.current.set(course.optionId, control);
                      } else {
                        courseRadioRefs.current.delete(course.optionId);
                      }
                    }}
                    type="radio"
                    name="university-semester-desk-course"
                    checked={course.optionId === selectedCourseOptionId}
                    aria-label={courseAccessibleName(course)}
                    onChange={() => selectCourse(course)}
                  />
                  <span>Inspect this course</span>
                </label>
                <p className={styles.explanation}>
                  <span className={styles.rowLabel}>Explanation</span>
                  {course.explanation}
                </p>
              </li>
            ))}
          </ol>
          <p className={styles.ledgerBoundary}>
            Course-ID order is deterministic, not pedagogical, chronological,
            urgent, difficult, or recommended. Selecting a row changes only
            this refresh-clear inspection.
          </p>
        </fieldset>

        {selectedCourse ? (
          <CourseChapter
            course={selectedCourse}
            onClear={clearCourseInspection}
          />
        ) : (
          <section
            className={styles.noCourse}
            aria-labelledby="semester-desk-no-course-title"
          >
            <p>Course focus</p>
            <h2 id="semester-desk-no-course-title">
              No course is selected.
            </h2>
            <span>
              Choose one course above to inspect its exact bounded learning
              loop. FORGE has not chosen a course or next action.
            </span>
          </section>
        )}

        <AuthorityBoundary authority={fixture.authority} />
      </article>
    </div>
  );
}
