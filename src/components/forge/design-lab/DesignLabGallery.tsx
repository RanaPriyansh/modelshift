import Image from "next/image";
import Link from "next/link";

import { ForgeThemeControl } from "@/src/components/forge/ForgeThemeControl";

import { EvidenceAtelierShowcase } from "./EvidenceAtelierShowcase";
import { FieldGuideIPhoneSample } from "./FieldGuideIPhoneSample";
import styles from "./DesignLabGallery.module.css";

const VIVID_DETAILS = [
  ["Composition", "Cinematic horizon with a large cobalt field."],
  ["Agency marker", "One learner waits beside an orange threshold."],
  ["Best use", "Public entry and major Learning World transitions."],
  ["Constraint", "Active work moves onto a quiet, precise surface."],
] as const;

const ATLAS_DETAILS = [
  ["Composition", "Oblique atlas plate with a wide field for copy."],
  ["Agency marker", "One learner stands at an orange route decision."],
  ["Best use", "Question-led planning and route explanation."],
  ["Constraint", "The route never becomes a score or progress game."],
] as const;

function CandidateDetails({ details }: { details: typeof VIVID_DETAILS | typeof ATLAS_DETAILS }) {
  return (
    <dl className={styles.details}>
      {details.map(([term, description]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DesignLabGallery() {
  return (
    <div className={`forge-shell ${styles.gallery}`}>
      <a className={styles.skipLink} href="#design-lab-main">
        Skip to design candidates
      </a>

      <header className={styles.labHeader}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/">
            <span>FORGE</span>
            <small>Design lab</small>
          </Link>

          <nav aria-label="Internal design lab links" className={styles.utilityNav}>
            <Link href="/">Homepage</Link>
            <Link href="/app">Application</Link>
            <ForgeThemeControl />
          </nav>
        </div>
      </header>

      <main className={styles.main} id="design-lab-main" tabIndex={-1}>
        <section className={styles.intro} aria-labelledby="design-lab-title">
          <p className={styles.context}>Internal development route. Local candidates only.</p>
          <h1 id="design-lab-title">Student experience design lab.</h1>
          <p className={styles.introCopy}>
            Compare the implemented visual system with alternate public, application,
            and mobile directions. Each candidate keeps learner action and bounded evidence visible.
          </p>

          <nav aria-label="Design candidates" className={styles.candidateNav}>
            <a href="#vivid-learning-landscapes">Vivid Learning Landscapes</a>
            <a href="#evidence-atelier">Evidence Atelier</a>
            <a href="#expedition-atlas">Expedition Atlas</a>
            <a href="#field-guide-ios">Field Guide iOS study</a>
          </nav>
        </section>

        <section
          className={styles.candidateSection}
          id="vivid-learning-landscapes"
          aria-labelledby="vivid-title"
        >
          <header className={styles.candidateHeader}>
            <div>
              <p className={styles.candidateLabel}>Candidate 01 / Implemented local visual system</p>
              <h2 id="vivid-title">Vivid Learning Landscapes</h2>
            </div>
            <p className={styles.candidateSummary}>
              A cinematic threshold creates curiosity. The interface becomes quieter when work begins.
            </p>
          </header>

          <div className={styles.candidateBody}>
            <figure className={`${styles.visualFrame} ${styles.vividFrame}`}>
              <Image
                className={styles.heroImage}
                src="/forge/landscapes/learning-threshold-cobalt.png"
                alt="Deep green hills beneath a cobalt sky, with an orange stair and doorway beside one learner."
                width={1672}
                height={941}
                priority
                sizes="(max-width: 760px) 100vw, 72vw"
              />
              <figcaption>
                Implemented image direction. The orange threshold marks entry, not achievement.
              </figcaption>
            </figure>

            <aside className={styles.candidateNotes} aria-label="Vivid Learning Landscapes notes">
              <p className={styles.copySample}>
                “Start with something you want to become able to do.”
              </p>
              <CandidateDetails details={VIVID_DETAILS} />
              <div className={styles.palette} aria-label="Vivid Learning Landscapes palette">
                <span data-color="cobalt">Cobalt</span>
                <span data-color="alpine">Alpine</span>
                <span data-color="orange">Orange</span>
                <span data-color="ivory">Ivory</span>
              </div>
            </aside>
          </div>
        </section>

        <section
          className={`${styles.candidateSection} ${styles.applicationStudy}`}
          id="evidence-atelier"
          aria-labelledby="atelier-title"
        >
          <header className={styles.candidateHeader}>
            <div>
              <p className={styles.candidateLabel}>Candidate 02 / Alternate application direction</p>
              <h2 id="atelier-title">Evidence Atelier</h2>
            </div>
            <p className={styles.candidateSummary}>
              A calm work instrument connects commitment, repair, independent proof,
              and delayed return. The preview creates no learning record.
            </p>
          </header>

          <div className={styles.atelierStage}>
            <EvidenceAtelierShowcase />
          </div>

          <p className={styles.recordPath}>
            Concept record
            <code>docs/design/concepts/EVIDENCE_ATELIER_WEB_APP.md</code>
          </p>
        </section>

        <section
          className={styles.candidateSection}
          id="expedition-atlas"
          aria-labelledby="atlas-title"
        >
          <header className={styles.candidateHeader}>
            <div>
              <p className={styles.candidateLabel}>Candidate 03 / Alternate homepage direction</p>
              <h2 id="atlas-title">Expedition Atlas</h2>
            </div>
            <p className={styles.candidateSummary}>
              A learner-owned map makes route choice visible without turning progress into a game.
            </p>
          </header>

          <div className={styles.candidateBody}>
            <figure className={`${styles.visualFrame} ${styles.atlasFrame}`}>
              <div className={styles.atlasField}>
                <Image
                  className={styles.heroImage}
                  src="/forge/concepts/expedition-atlas-hero.png"
                  alt="Topographic green terrain and cobalt water on an ivory atlas, with one learner at an orange route fork."
                  width={1720}
                  height={914}
                  sizes="(max-width: 760px) 100vw, 72vw"
                />
              </div>
              <figcaption>
                Alternate concept. The topographic route explains choice and uncertainty.
              </figcaption>
            </figure>

            <aside className={styles.candidateNotes} aria-label="Expedition Atlas notes">
              <p className={styles.copySample}>
                “Turn one hard question into a path you can prove.”
              </p>
              <CandidateDetails details={ATLAS_DETAILS} />
              <p className={styles.recordPath}>
                Concept record
                <code>docs/design/concepts/EXPEDITION_ATLAS_HOMEPAGE.md</code>
              </p>
            </aside>
          </div>
        </section>

        <section
          className={`${styles.candidateSection} ${styles.mobileStudy}`}
          id="field-guide-ios"
          aria-labelledby="field-guide-title"
        >
          <header className={styles.candidateHeader}>
            <div>
              <p className={styles.candidateLabel}>Candidate 04 / Mobile display study</p>
              <h2 id="field-guide-title">Field Guide iOS sample</h2>
            </div>
            <p className={styles.candidateSummary}>
              The same landscape language becomes one useful mobile action.
              This sample is not a native iOS implementation.
            </p>
          </header>

          <div className={styles.phoneStage}>
            <FieldGuideIPhoneSample />
          </div>
        </section>

        <footer className={styles.footer}>
          <p>
            This route is a local comparison surface. It does not change learning logic,
            public routes, evidence, storage, or API behavior.
          </p>
          <div>
            <Link href="/">Return to the homepage</Link>
            <Link href="/app">Open the application</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
