import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import styles from "@/src/components/forge/university/UniversitySemesterLoopWorkspace.module.css";

export const metadata: Metadata = {
  title: "Internal university semester-loop research | FORGE",
  description:
    "A fail-closed synthetic composition of source review, current capacity, an accepted learning action, and its exact protected-study boundary.",
};

export default async function InternalUniversitySemesterLoopPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./semester-loop-development-surface.server")
      ).UniversitySemesterLoopDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversitySemesterLoopUnavailable />}
      </main>
    </ForgeShell>
  );
}

function UniversitySemesterLoopUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No university semester-loop state is available.</h1>
      <p>
        No source, capacity, accepted path, recovery draft, World, action,
        session, evidence, or external effect was exposed.
      </p>
    </section>
  );
}
