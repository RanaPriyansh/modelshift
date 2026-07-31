import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversitySourceReviewUnavailable } from "@/src/components/forge/university/UniversitySourceReviewUnavailable";

export const metadata: Metadata = {
  title: "Internal university source review · FORGE",
  description: "A fail-closed sample workspace for reviewing connected course-source facts.",
};

export default async function InternalUniversitySourceReviewPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversitySourceReviewDevelopmentSurface
    : null;

  return (
    <ForgeShell
      active="learn"
      navigationPrefetch={false}
      surface="author"
    >
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversitySourceReviewUnavailable />}
      </main>
    </ForgeShell>
  );
}
