import styles from "./UniversityProtectedStudyWorkspace.module.css";

export function UniversityProtectedStudyUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No protected-study research state is available.</h1>
      <p>No World was exposed, session was started, or evidence was claimed.</p>
    </section>
  );
}
