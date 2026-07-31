import type { Metadata } from "next";

import {
  UniversityLearningMapUnavailable,
} from "@/src/components/forge/university-learning-map/UniversityLearningMapUnavailable";

export const metadata: Metadata = {
  title: "Internal university learning map | FORGE",
  description:
    "A fail-closed synthetic view of declared learning continuity.",
};

export default async function InternalUniversityLearningMapPage() {
  const DevelopmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityLearningMapDevelopmentSurface
    : null;

  return DevelopmentSurface
    ? <DevelopmentSurface />
    : <UniversityLearningMapUnavailable />;
}
