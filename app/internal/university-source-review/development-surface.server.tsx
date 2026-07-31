import "server-only";

import { UniversitySourceReview } from "@/src/components/forge/university/UniversitySourceReview";
import { UniversitySourceReviewUnavailable } from "@/src/components/forge/university/UniversitySourceReviewUnavailable";

import { readUniversitySourceReviewGate } from "./fixture-gate.server";
import { reviewedUniversitySourceRequest } from "./review-fixture.server";

export async function UniversitySourceReviewDevelopmentSurface() {
  const gate = readUniversitySourceReviewGate();
  return gate.enabled
    ? (
        <UniversitySourceReview
          initialRequest={await reviewedUniversitySourceRequest()}
        />
      )
    : <UniversitySourceReviewUnavailable />;
}
