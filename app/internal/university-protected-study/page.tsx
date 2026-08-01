import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversityProtectedStudyUnavailable } from "@/src/components/forge/university/UniversityProtectedStudyUnavailable";

export const metadata: Metadata = {
  title: "Internal protected university study research | FORGE",
  description:
    "A fail-closed synthetic brief for inspecting the learning-integrity contract of an exact reviewed World.",
};

export default async function InternalUniversityProtectedStudyPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityProtectedStudyDevelopmentSurface
    : null;

  return (
    <ForgeShell
      active={null}
      navigationPrefetch={false}
      surface="author"
    >
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversityProtectedStudyUnavailable />}
      </main>
    </ForgeShell>
  );
}
