import Link from "next/link";

import styles from "./SemesterDeskV2PublicHome.module.css";

const COURSE_STATES = [
  {
    course: "Statistics",
    detail: "Problem set due Friday",
    state: "Checked",
    tone: "checked",
  },
  {
    course: "Writing seminar",
    detail: "Reading list needs a review",
    state: "Needs review",
    tone: "review",
  },
  {
    course: "Biology lab",
    detail: "Lab time moved to Thursday",
    state: "Changed since last check",
    tone: "changed",
  },
  {
    course: "Economics",
    detail: "The next deadline is not yet available",
    state: "Not yet confirmed",
    tone: "unconfirmed",
  },
] as const;

const RECOVERY_CHANGES = [
  ["Held", "Statistics problem set stays due Friday."],
  ["Moved", "Essay plan now starts after your Thursday lab."],
  ["Removed", "Two low-value tasks no longer use your available time."],
] as const;

const LEARNING_LOOP = [
  {
    title: "See what changed",
    body: "Read the course facts and conflicts before you make a plan.",
  },
  {
    title: "State real capacity",
    body: "Say what time you can give this week. FORGE does not invent it.",
  },
  {
    title: "Study actively",
    body: "Explain, retrieve, and practise. Get help without giving your learning away.",
  },
  {
    title: "Show and return",
    body: "Check understanding independently. Then come back on a future date to test retention.",
  },
] as const;

export function SemesterDeskV2PublicHome() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#semester-desk-main">
        Skip to main content
      </a>

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="FORGE home">
          FORGE
        </Link>
        <nav className={styles.navigation} aria-label="Public navigation">
          <Link href="/how-forge-works">How it works</Link>
          <Link href="/university">University</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </header>

      <main id="semester-desk-main" className={styles.main} tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="semester-desk-title">
          <div className={styles.heroCopy}>
            <p className={styles.context}>FOR UNIVERSITY STUDENTS</p>
            <h1 id="semester-desk-title">Rebuild from today.</h1>
            <p className={styles.heroLead}>
              When your week has broken, FORGE helps you see what changed, name real capacity, and choose the next honest action.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} href="/app">
                Open your Semester Desk
              </Link>
              <a className={styles.secondaryAction} href="#how-it-works">
                See how recovery works
              </a>
            </div>
          </div>

          <div className={styles.thresholdLandscape} aria-hidden="true">
            <span className={styles.landscapeSky} />
            <span className={styles.landscapeBackRidge} />
            <span className={styles.landscapeFrontRidge} />
            <span className={styles.landscapePath} />
            <span className={styles.landscapeDoor} />
            <span className={styles.landscapeFigure} />
          </div>
        </section>

        <section className={styles.deskSection} aria-labelledby="desk-title">
          <div className={styles.sectionIntro}>
            <p className={styles.context}>SEMESTER DESK</p>
            <h2 id="desk-title">The desk tells the truth first.</h2>
            <p>
              Use one calm view to understand every course, identify conflicts, and rebuild a week without hiding what changed.
            </p>
          </div>

          <section className={styles.deskPreview} aria-labelledby="desk-preview-title">
            <header className={styles.previewHeader}>
              <div>
                <p className={styles.previewKicker}>Example recovery desk</p>
                <h3 id="desk-preview-title">This week, rebuilt from today</h3>
              </div>
              <p className={styles.capacity}>4 hours available</p>
            </header>

            <div className={styles.deskGrid}>
              <section aria-labelledby="course-truth-title">
                <h4 id="course-truth-title">Course truth</h4>
                <ul className={styles.courseList}>
                  {COURSE_STATES.map((course) => (
                    <li key={course.course}>
                      <div>
                        <strong>{course.course}</strong>
                        <p>{course.detail}</p>
                      </div>
                      <span className={styles[`status${course.tone}`]}>{course.state}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.changeList} aria-labelledby="changes-title">
                <h4 id="changes-title">What changed</h4>
                <ol>
                  {RECOVERY_CHANGES.map(([label, detail]) => (
                    <li key={label}>
                      <strong>{label}</strong>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ol>
                <p>Every change stays visible. You choose what to keep.</p>
              </section>
            </div>
          </section>
        </section>

        <section className={styles.honestAction} aria-labelledby="honest-action-title">
          <p className={styles.context}>NEXT HONEST ACTION</p>
          <div>
            <h2 id="honest-action-title">Do one piece of work you can actually finish.</h2>
            <p>
              Start the statistics problem set for 25 minutes. The plan explains why this work matters now.
            </p>
          </div>
          <p className={styles.actionNote}>No shame. No hidden ranking. No answer extraction.</p>
        </section>

        <section id="how-it-works" className={styles.learningSection} aria-labelledby="learning-title">
          <div className={styles.sectionIntro}>
            <p className={styles.context}>LEARNING STAYS YOURS</p>
            <h2 id="learning-title">Recovery makes room for real learning.</h2>
            <p>
              FORGE helps you work through a degree. It does not do the learning in your place.
            </p>
          </div>

          <ol className={styles.learningLoop}>
            {LEARNING_LOOP.map((step, index) => (
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

        <section id="privacy" className={styles.privacySection} aria-labelledby="privacy-title">
          <div className={styles.privacyRule} aria-hidden="true" />
          <div>
            <p className={styles.context}>PRIVATE BY DESIGN</p>
            <h2 id="privacy-title">Your plan stays understandable and under your control.</h2>
            <p>
              FORGE shows what it checked, what needs your review, and what is not yet confirmed. You can download or remove local Semester Desk data.
            </p>
            <p>
              Web data stays in this browser. The iPhone application keeps separate local data and does not sync with the web application.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>FORGE is a private university operating system for the work of a real degree.</p>
        <nav aria-label="Footer navigation">
          <Link href="/how-forge-works">How it works</Link>
          <Link href="/university">University</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}
