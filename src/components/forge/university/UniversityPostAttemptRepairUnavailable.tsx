import styles from "./UniversityPostAttemptRepairWorkspace.module.css";

export function UniversityPostAttemptRepairUnavailable() {
  return (
    <section
      className={`${styles.surface} ${styles.unavailable}`}
      role="alert"
    >
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>Post-attempt repair is unavailable.</h1>
      <p>
        This route accepts only an exact server-owned development fixture.
        No result, repair, session, save, or evidence operation was exposed.
      </p>
    </section>
  );
}
