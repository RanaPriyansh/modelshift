import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course worksheet",
  description:
    "A development-only neutral synthetic course worksheet for bounded local comparison inspection.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InternalUniversityResearchSubstitutePage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./research-substitute-development-surface.server")
      ).UniversityResearchSubstituteDevelopmentSurface
    : null;

  return developmentSurface
    ? await developmentSurface()
    : (
        <main id="neutral-worksheet-main">
          <section
            role="alert"
            aria-labelledby="research-substitute-unavailable-title"
          >
            <h1 id="research-substitute-unavailable-title">
              No neutral university research worksheet is available.
            </h1>
            <p>
              No scenario pack, comparison surface, participant task, capture,
              or external action was exposed.
            </p>
          </section>
        </main>
      );
}
