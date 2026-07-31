import { ForgeShell } from "../ForgeShell";
import styles from "./UniversityLearningMapUnavailable.module.css";

export function UniversityLearningMapUnavailable() {
  return (
    <ForgeShell
      active={null}
      mobileNavigation={false}
      navigationPrefetch={false}
      surface="author"
    >
      <main id="forge-main" tabIndex={-1}>
        <section
          className={styles.surface}
          role="alert"
          aria-labelledby="university-learning-map-unavailable-title"
        >
          <p className={styles.kicker}>Fixture unavailable</p>
          <h1 id="university-learning-map-unavailable-title">
            University learning map is unavailable.
          </h1>
          <p>
            This route accepts only one exact synthetic development fixture.
            No course data, student data, save, message, provider, or external
            action is available.
          </p>
        </section>
      </main>
    </ForgeShell>
  );
}
