import styles from "./UniversityTodayWorkspace.module.css";

export function UniversityTodayWorkspaceUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="status">
      <p className={styles.kicker}>Internal research surface</p>
      <h1>University Today is unavailable.</h1>
      <p>
        This route accepts only an exact server-owned development fixture.
        No live student, course, planning, or institutional data is available here.
      </p>
    </section>
  );
}
