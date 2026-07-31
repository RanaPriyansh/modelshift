import styles from "./UniversityDegreeMapWorkspace.module.css";

export function UniversityDegreeMapUnavailable() {
  return (
    <section
      className={`${styles.surface} ${styles.unavailable}`}
      role="alert"
      aria-labelledby="university-degree-map-unavailable-title"
    >
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1 id="university-degree-map-unavailable-title">
        Degree map is unavailable.
      </h1>
      <p>
        This route needs one exact server development token. No degree data,
        save, network, event, or recommendation is available.
      </p>
    </section>
  );
}
