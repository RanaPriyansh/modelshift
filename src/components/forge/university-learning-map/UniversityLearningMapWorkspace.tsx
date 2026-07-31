import type {
  UniversityLearningMapPresentation,
} from "./presentation";
import styles from "./UniversityLearningMapWorkspace.module.css";

export function UniversityLearningMapWorkspace({
  presentation,
}: {
  presentation: UniversityLearningMapPresentation;
}) {
  return (
    <article
      className={styles.surface}
      aria-labelledby="university-learning-map-title"
      data-status={presentation.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university research</p>
          <p className={styles.productName}>Learning map</p>
        </div>
        <p className={styles.status}>{presentation.statusLabel}</p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>{presentation.course.ownershipLabel}</strong>
        <span>{presentation.course.sourceLabel}</span>
        <span>Concept-reference order; not priority or study sequence</span>
      </div>

      <section className={styles.hero}>
        <p className={styles.heroMark} aria-hidden="true">MAP</p>
        <div>
          <p className={styles.eyebrow}>{presentation.course.label}</p>
          <h1 id="university-learning-map-title">
            See the map. Keep the limits.
          </h1>
          <p className={styles.heroBody}>
            This view links declared outcomes, concepts, attempts, help, and
            one delayed return. It does not assess learning.
          </p>
        </div>
      </section>

      <section
        className={styles.outcomes}
        aria-labelledby="university-learning-map-outcomes"
      >
        <div>
          <p className={styles.sectionIndex}>01</p>
          <h2 id="university-learning-map-outcomes">Declared outcomes</h2>
        </div>
        <ul aria-label="Declared course outcomes" role="list">
          {presentation.outcomes.map((outcome) => (
            <li key={outcome.label}>
              <strong>{outcome.label}</strong>
              <span>{outcome.coverageLabel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.path}
        aria-labelledby="university-learning-map-path"
      >
        <header>
          <p className={styles.sectionIndex}>02</p>
          <div>
            <h2 id="university-learning-map-path">
              Declared concept references
            </h2>
            <p>
              Concepts use stable reference order. The order does not set
              priority or a study sequence.
            </p>
          </div>
        </header>
        <ol aria-label="Declared concept references" role="list">
          {presentation.concepts.map((concept) => (
            <li key={concept.label}>
              <p className={styles.conceptIndex} aria-hidden="true">
                {concept.orderLabel}
              </p>
              <div>
                <h3>{concept.label}</h3>
                <dl>
                  <div>
                    <dt>Supports</dt>
                    <dd>{concept.outcomeLabel}</dd>
                  </div>
                  <div>
                    <dt>Prerequisite</dt>
                    <dd>{concept.prerequisiteLabel}</dd>
                  </div>
                  <div>
                    <dt>Attempt</dt>
                    <dd>{concept.attemptLabel}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>{concept.evidenceLabel}</dd>
                  </div>
                  <div>
                    <dt>Help</dt>
                    <dd>{concept.helpLabel}</dd>
                  </div>
                  <div>
                    <dt>Delayed return</dt>
                    <dd>{concept.returnLabel}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside
        className={styles.unknowns}
        aria-labelledby="university-learning-map-unknowns"
      >
        <div>
          <p className={styles.sectionIndex}>03</p>
          <h2 id="university-learning-map-unknowns">
            Keep the unknowns visible.
          </h2>
        </div>
        <ul role="list">
          {presentation.unknowns.map((unknown) => (
            <li key={unknown}>{unknown}</li>
          ))}
        </ul>
      </aside>

      <footer
        className={styles.authority}
        aria-labelledby="university-learning-map-authority"
      >
        <h2 id="university-learning-map-authority">Authority boundary</h2>
        <dl>
          {presentation.authority.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </footer>
    </article>
  );
}
