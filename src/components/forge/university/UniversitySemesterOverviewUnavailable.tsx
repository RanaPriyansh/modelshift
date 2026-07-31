import styles from "./UniversitySemesterOverviewWorkspace.module.css";

export function UniversitySemesterOverviewUnavailable() {
  return (
    <section
      className={`${styles.surface} ${styles.unavailable}`}
      role="alert"
    >
      <p className={styles.kicker}>Internal research surface</p>
      <h1>Semester overview is unavailable.</h1>
      <p>
        This route accepts only an exact server-owned development fixture.
        No term, course, recommendation, session, save, message, or evidence
        operation was exposed.
      </p>
    </section>
  );
}
