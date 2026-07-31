import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";

import styles from "@/src/components/forge/university/UniversityResearchReadinessWorkspace.module.css";

export const metadata: Metadata = {
  title: "Internal university research readiness | FORGE",
  description:
    "A fail-closed synthetic plan inspection for protocol, approval references, fixture roles, comparator declarations, and sample limits.",
};

export default async function InternalUniversityResearchReadinessPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./research-readiness-development-surface.server")
      ).UniversityResearchReadinessDevelopmentSurface
    : null;

  return (
    <ForgeShell
      active={null}
      mobileNavigation={false}
      navigationPrefetch={false}
      surface="author"
    >
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversityResearchReadinessUnavailable />}
      </main>
    </ForgeShell>
  );
}

function UniversityResearchReadinessUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No university research-readiness state is available.</h1>
      <p>
        No protocol, approval, operator plan, comparator, sample, participant,
        recording, or research evidence was exposed.
      </p>
    </section>
  );
}
