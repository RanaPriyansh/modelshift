import styles from "./UniversityDegreeMapWorkspace.module.css";

export interface UniversityDegreeMapPresentation {
  readonly schemaVersion: "university-degree-map-presentation.v1";
  readonly programRef: string;
  readonly statusLabel: string;
  readonly credits: Readonly<{
    completed: number;
    inProgress: number;
    planned: number;
    allDeclared: number;
  }>;
  readonly courses: readonly Readonly<{
    courseId: string;
    creditUnits: number;
    stateLabel: string;
    prerequisiteCourseIds: readonly string[];
    unmetPrerequisiteCourseIds: readonly string[];
  }>[];
  readonly requirements: readonly Readonly<{
    requirementId: string;
    kindLabel: string;
    statusLabel: string;
    creditLabel: string;
  }>[];
  readonly authority: readonly Readonly<{
    label: string;
    value: string;
  }>[];
}

function referenceList(values: readonly string[]) {
  return values.length === 0 ? "None declared" : values.join(", ");
}

export function UniversityDegreeMapWorkspace({
  presentation,
}: {
  presentation: Readonly<UniversityDegreeMapPresentation>;
}) {
  const creditFacts = [
    ["Completed", presentation.credits.completed],
    ["In progress", presentation.credits.inProgress],
    ["Planned", presentation.credits.planned],
    ["All declared", presentation.credits.allDeclared],
  ] as const;

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-degree-map-title"
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university degree map</p>
          <p className={styles.productName}>FORGE / learner-declared inspection</p>
        </div>
        <p className={styles.status}>{presentation.statusLabel}</p>
      </header>

      <aside className={styles.boundary} aria-label="Inspection boundary">
        <strong>Synthetic adult fixture</strong>
        <span>No rank or recommendation</span>
        <span>No save, network, or event</span>
      </aside>

      <section className={styles.introduction}>
        <p className={styles.index} aria-hidden="true">01</p>
        <div>
          <p className={styles.eyebrow}>Declared program</p>
          <h1 id="university-degree-map-title">
            Inspect the map. Keep the decision.
          </h1>
          <p>
            This view shows one learner-managed declaration. It does not approve
            a degree plan or verify a source.
          </p>
          <code>{presentation.programRef}</code>
        </div>
      </section>

      <dl className={styles.creditRail} aria-label="Declared credit totals">
        {creditFacts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className={styles.mapSection} aria-labelledby="courses-title">
        <div className={styles.sectionHeading}>
          <p>Course declarations</p>
          <h2 id="courses-title">Courses and prerequisites</h2>
        </div>
        <ol className={styles.courseList} aria-label="Declared courses">
          {presentation.courses.map((course, index) => (
            <li key={course.courseId}>
              <span className={styles.itemIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className={styles.courseIdentity}>
                <h3>{course.courseId}</h3>
                <p>{course.stateLabel} · learner declared</p>
              </div>
              <p className={styles.creditValue}>
                <strong>{course.creditUnits}</strong>
                <span>credits</span>
              </p>
              <dl className={styles.prerequisites}>
                <div>
                  <dt>Prerequisites</dt>
                  <dd>{referenceList(course.prerequisiteCourseIds)}</dd>
                </div>
                <div>
                  <dt>Open prerequisites</dt>
                  <dd>{referenceList(course.unmetPrerequisiteCourseIds)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles.requirementSection}
        aria-labelledby="requirements-title"
      >
        <div className={styles.sectionHeading}>
          <p>Requirement declarations</p>
          <h2 id="requirements-title">Requirements</h2>
        </div>
        <ul className={styles.requirementList} aria-label="Declared requirements">
          {presentation.requirements.map((requirement) => (
            <li key={requirement.requirementId}>
              <div>
                <h3>{requirement.requirementId}</h3>
                <p>{requirement.kindLabel}</p>
              </div>
              <p>
                <strong>{requirement.statusLabel}</strong>
                <span>{requirement.creditLabel}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.authority}>
        <div className={styles.sectionHeading}>
          <p>Authority ceiling</p>
          <h2>Inspection only</h2>
        </div>
        <dl>
          {presentation.authority.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </footer>
    </article>
  );
}
