import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversitySourceReview } from "@/src/components/forge/university/UniversitySourceReview";
import { UniversitySourceReviewUnavailable } from "@/src/components/forge/university/UniversitySourceReviewUnavailable";

import { readUniversitySourceReviewGate } from "./fixture-gate.server";
import { reviewedUniversitySourceRequest } from "./review-fixture.server";

export const metadata: Metadata = {
  title: "Internal university source review · FORGE",
  description: "A fail-closed sample workspace for reviewing connected course-source facts.",
};

export default async function InternalUniversitySourceReviewPage() {
  const gate = process.env.NODE_ENV === "development"
    ? readUniversitySourceReviewGate()
    : { enabled: false as const, status: "review-fixture-unavailable" as const };

  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? <UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />
          : <UniversitySourceReviewUnavailable />}
      </main>
    </ForgeShell>
  );
}
