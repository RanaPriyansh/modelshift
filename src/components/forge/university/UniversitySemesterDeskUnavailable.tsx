import styles from "./UniversitySemesterDeskWorkspace.module.css";

export function UniversitySemesterDeskUnavailable() {
  return (
    <section
      className={`${styles.surface} ${styles.unavailable}`}
      role="alert"
      aria-labelledby="university-semester-desk-unavailable-title"
    >
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1 id="university-semester-desk-unavailable-title">
        Semester desk is unavailable.
      </h1>
      <p>
        No term boundary, course inspection, learner choice, source, capacity,
        path, World, session, evidence, or external effect was exposed.
      </p>
    </section>
  );
}
