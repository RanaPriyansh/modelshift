import Link from "next/link";

import styles from "./PublicProductPage.module.css";

export type PublicProductPageKind = "how-forge-works" | "university";

type ProductPageCopy = Readonly<{
  context: string;
  title: string;
  lead: string;
  action: string;
  alternateAction: string;
  alternateHref: string;
  truthTitle: string;
  truthLead: string;
  recoveryTitle: string;
  recoveryLead: string;
  closingTitle: string;
  closingLead: string;
}>;

const PAGE_COPY: Readonly<Record<PublicProductPageKind, ProductPageCopy>> = {
  "how-forge-works": {
    context: "HOW FORGE WORKS",
    title: "Make the semester visible before you make a plan.",
    lead:
      "FORGE helps you rebuild a difficult week from today. It keeps the course facts, your available capacity, and each change in one calm place.",
    action: "Open your Semester Desk",
    alternateAction: "For university students",
    alternateHref: "/university",
    truthTitle: "Start with the course facts you can see.",
    truthLead:
      "Add and check your course information before you plan. FORGE shows what matches, what changed, and what still needs your review.",
    recoveryTitle: "A broken plan can become a clear plan.",
    recoveryLead:
      "State the time that you have. Then make each move, reduction, or deferment visible before you confirm it.",
    closingTitle: "Learning stays with you.",
    closingLead:
      "FORGE supports active study and independent checks. It does not complete your work or turn one result into a label.",
  },
  university: {
    context: "FOR UNIVERSITY STUDENTS",
    title: "A private desk for the work of a real degree.",
    lead:
      "Use FORGE when deadlines, class changes, and limited time make the week hard to hold in your head. Begin from today and choose the next honest action.",
    action: "Open your Semester Desk",
    alternateAction: "See how FORGE works",
    alternateHref: "/how-forge-works",
    truthTitle: "Your course site remains the source of record.",
    truthLead:
      "FORGE does not connect to a university system. Add and review the course facts yourself, then check the course site or instructor when a detail conflicts.",
    recoveryTitle: "Plan for the week you have, not the week you hoped for.",
    recoveryLead:
      "Declare real capacity. Keep, move, reduce, or defer work openly. FORGE does not hide the trade-offs that a recovery plan makes.",
    closingTitle: "Build study evidence without losing your agency.",
    closingLead:
      "Use protected practice, answer a new case independently, and return after time has passed. Each step keeps the learning action with you.",
  },
};

const COURSE_CONDITIONS = [
  {
    term: "Checked",
    detail: "The copied fact matches the source that you reviewed. Check again when the course changes.",
  },
  {
    term: "Needs review",
    detail: "A conflict, gap, or unclear detail needs your attention before you rely on it for planning.",
  },
  {
    term: "Changed since last check",
    detail: "The detail is different from the version that you reviewed. Read the change before you adjust the plan.",
  },
  {
    term: "Not yet confirmed",
    detail:
      "FORGE does not have the confirmation that this detail needs. Do not rely on it for an action until you check it.",
  },
] as const;

const RECOVERY_STEPS = [
  {
    title: "See the whole week",
    body:
      "Read the course facts and conflicts before you decide what can fit. The desk does not silently rank your courses.",
  },
  {
    title: "State real capacity",
    body:
      "Set the time that you can give. Your capacity is your choice, not a score that FORGE creates for you.",
  },
  {
    title: "Make recovery visible",
    body:
      "Keep, move, reduce, or defer each item. You can see what changed and why before you confirm the plan.",
  },
  {
    title: "Start one honest action",
    body:
      "Choose one task that can begin now. The desk explains the reason for the choice without pretending it knows your life.",
  },
] as const;

const LEARNING_STEPS = [
  {
    title: "Protected practice",
    body:
      "Use retrieval, explanation, and practice to do the learning. FORGE can structure the work without extracting an answer for you.",
  },
  {
    title: "Independent proof",
    body:
      "After practice, answer a new case without instructional help. The result is one check, not a permanent label.",
  },
  {
    title: "Delayed return",
    body:
      "Choose a future return date. Come back on this date to meet the idea again after time has passed.",
  },
] as const;

function PublicNavigation({ kind }: Readonly<{ kind: PublicProductPageKind }>) {
  return (
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/" aria-label="FORGE home">
        FORGE
      </Link>
      <nav className={styles.navigation} aria-label="Public navigation">
        <Link href="/how-forge-works" aria-current={kind === "how-forge-works" ? "page" : undefined}>
          How it works
        </Link>
        <Link href="/university" aria-current={kind === "university" ? "page" : undefined}>
          University
        </Link>
        <Link href="/privacy">Privacy</Link>
        <Link className={styles.openLink} href="/app">
          Open FORGE
        </Link>
      </nav>
    </header>
  );
}

function CourseTruth({ copy }: Readonly<{ copy: ProductPageCopy }>) {
  return (
    <section className={styles.truthSection} aria-labelledby="course-truth-title">
      <div className={styles.sectionCopy}>
        <p className={styles.context}>SEMESTER TRUTH</p>
        <h2 id="course-truth-title">{copy.truthTitle}</h2>
        <p>{copy.truthLead}</p>
      </div>
      <dl className={styles.conditionList}>
        {COURSE_CONDITIONS.map((condition) => (
          <div key={condition.term}>
            <dt>{condition.term}</dt>
            <dd>{condition.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RecoveryWorkflow({ copy }: Readonly<{ copy: ProductPageCopy }>) {
  return (
    <section className={styles.recoverySection} aria-labelledby="recovery-title">
      <div className={styles.sectionCopy}>
        <p className={styles.context}>TRANSPARENT RECOVERY</p>
        <h2 id="recovery-title">{copy.recoveryTitle}</h2>
        <p>{copy.recoveryLead}</p>
      </div>

      <figure className={styles.workflow} aria-labelledby="workflow-caption">
        <figcaption id="workflow-caption">
          Illustrative Semester Desk workflow. Each decision stays visible to the student.
        </figcaption>
        <ol>
          {RECOVERY_STEPS.map((step, index) => (
            <li key={step.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </figure>
    </section>
  );
}

function LearningBoundary({ copy }: Readonly<{ copy: ProductPageCopy }>) {
  return (
    <section className={styles.learningSection} aria-labelledby="learning-boundary-title">
      <div className={styles.sectionCopy}>
        <p className={styles.context}>ACTIVE LEARNING</p>
        <h2 id="learning-boundary-title">{copy.closingTitle}</h2>
        <p>{copy.closingLead}</p>
      </div>
      <ol className={styles.learningSteps}>
        {LEARNING_STEPS.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LocalDeviceLimit() {
  return (
    <aside className={styles.localLimit} aria-labelledby="local-limit-title">
      <p className={styles.context}>CURRENT WEB LIMIT</p>
      <h2 id="local-limit-title">Your current web data stays in this browser profile.</h2>
      <div>
        <p>
          The current web app does not provide online sign-in, cloud backup, cross-device sync, web reminders, or a university connection.
        </p>
        <p>
          Download a copy before you clear browser data. Use your own calendar for a return date. Read <Link href="/privacy">Privacy</Link> for the current data limits.
        </p>
      </div>
    </aside>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <p>FORGE helps university students rebuild from today without hiding what changed.</p>
      <nav aria-label="Footer navigation">
        <Link href="/how-forge-works">How it works</Link>
        <Link href="/university">University</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </nav>
    </footer>
  );
}

export function PublicProductPage({ kind }: Readonly<{ kind: PublicProductPageKind }>) {
  const copy = PAGE_COPY[kind];
  const pageId = `${kind}-main`;

  return (
    <div className={styles.page} data-public-product-page={kind}>
      <a className={styles.skipLink} href={`#${pageId}`}>
        Skip to main content
      </a>

      <PublicNavigation kind={kind} />

      <main id={pageId} className={styles.main} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="product-page-title">
          <div className={styles.heroCopy}>
            <p className={styles.context}>{copy.context}</p>
            <h1 id="product-page-title">{copy.title}</h1>
            <p className={styles.lead}>{copy.lead}</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/app">
                {copy.action}
              </Link>
              <Link className={styles.secondaryAction} href={copy.alternateHref}>
                {copy.alternateAction}
              </Link>
            </div>
          </div>
          <div className={styles.thresholdTerrain} aria-hidden="true">
            <span className={styles.terrainSky} />
            <span className={styles.terrainHorizon} />
            <span className={styles.terrainField} />
            <span className={styles.terrainPath} />
            <span className={styles.terrainMarker} />
          </div>
        </section>

        <CourseTruth copy={copy} />
        <RecoveryWorkflow copy={copy} />
        <LearningBoundary copy={copy} />
        <LocalDeviceLimit />
      </main>

      <Footer />
    </div>
  );
}
