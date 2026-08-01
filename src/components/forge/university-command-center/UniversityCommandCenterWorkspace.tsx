import Link from "next/link";

import styles from "./UniversityCommandCenterWorkspace.module.css";

const WORKSPACES = Object.freeze([
  {
    name: "Degree map",
    href: "/internal/university-degree-map",
    description:
      "Inspect a learner-declared degree structure without graduation claims.",
  },
  {
    name: "Learning map",
    href: "/internal/university-learning-map",
    description:
      "Inspect declared learning continuity without a mastery judgment.",
  },
  {
    name: "Post-attempt repair",
    href: "/internal/university-post-attempt-repair",
    description: "Inspect a bounded repair after one synthetic attempt.",
  },
  {
    name: "Protected study",
    href: "/internal/university-protected-study",
    description: "Inspect the protected-study boundary before proof.",
  },
  {
    name: "Recovery",
    href: "/internal/university-recovery",
    description: "Inspect a learner-owned capacity recovery draft.",
  },
  {
    name: "Research readiness",
    href: "/internal/university-research-readiness",
    description: "Review open research gates without involving a person.",
  },
  {
    name: "Semester desk",
    href: "/internal/university-semester-desk",
    description: "Scan a synthetic term and choose one course to inspect.",
  },
  {
    name: "Semester loop",
    href: "/internal/university-semester-loop",
    description: "Inspect one bounded semester learning-loop scenario.",
  },
  {
    name: "Semester overview",
    href: "/internal/university-semester-overview",
    description: "Inspect one synthetic term overview without a priority claim.",
  },
  {
    name: "Source review",
    href: "/internal/university-source-review",
    description: "Inspect copied-source disagreement without declaring truth.",
  },
  {
    name: "Today",
    href: "/internal/university-today",
    description: "Inspect one bounded study action without automatic planning.",
  },
] as const);

export function UniversityCommandCenterWorkspace() {
  return (
    <article
      className={styles.surface}
      aria-labelledby="university-command-center-title"
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workspace map</p>
          <p className={styles.productName}>FORGE / bounded surfaces</p>
        </div>
        <p className={styles.order}>
          Alphabetical order / not priority
        </p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic development directory</strong>
        <span>No default workspace</span>
        <span>No save, session, provider, or external action</span>
      </div>

      <section className={styles.introduction}>
        <p className={styles.index} aria-hidden="true">11</p>
        <div>
          <p className={styles.eyebrow}>Explicit learner or operator choice</p>
          <h1 id="university-command-center-title">
            Choose a bounded university workspace.
          </h1>
          <p>
            These links open existing internal surfaces. Their order is not a
            recommendation, urgency signal, course priority, or readiness claim.
            Nothing is selected before you act.
          </p>
        </div>
      </section>

      <nav aria-label="University workspaces" className={styles.directory}>
        <ul role="list">
          {WORKSPACES.map((workspace, index) => (
            <li key={workspace.href}>
              <span className={styles.itemIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{workspace.name}</h2>
                <p>{workspace.description}</p>
              </div>
              <Link href={workspace.href} prefetch={false}>
                Open {workspace.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className={styles.authority}>
        <p>Authority ceiling</p>
        <strong>Route selection only</strong>
        <span>
          This fixture establishes no identity, enrollment, course truth,
          recommendation, persistence, research approval, learning evidence, or
          production readiness.
        </span>
      </footer>
    </article>
  );
}
