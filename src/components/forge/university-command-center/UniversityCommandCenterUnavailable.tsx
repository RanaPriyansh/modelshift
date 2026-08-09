import styles from "./UniversityCommandCenterWorkspace.module.css";

export function UniversityCommandCenterUnavailable() {
  return (
    <section
      className={`${styles.surface} ${styles.unavailable}`}
      role="alert"
      aria-labelledby="university-command-center-unavailable-title"
    >
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1 id="university-command-center-unavailable-title">
        University workspace map is unavailable.
      </h1>
      <p>
        No workspace directory, selection, course state, learner data, session,
        provider, persistence, or external effect was exposed.
      </p>
    </section>
  );
}
