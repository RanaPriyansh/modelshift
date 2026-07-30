import styles from "./UniversitySourceReview.module.css";

export function UniversitySourceReviewUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} aria-labelledby="source-review-unavailable-title">
      <p className={styles.kicker}>Internal sample route</p>
      <h1 id="source-review-unavailable-title">Course source review is unavailable.</h1>
      <p>
        This route stays closed unless a local development server receives the exact
        server-owned fixture switch. The switch does not create learner, course, or
        institutional authority.
      </p>
    </section>
  );
}
