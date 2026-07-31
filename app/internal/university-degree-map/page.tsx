import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversityDegreeMapUnavailable,
} from "@/src/components/forge/university-degree-map/UniversityDegreeMapUnavailable";

export const metadata: Metadata = {
  title: "Internal university degree map | FORGE",
  description: "A development-only synthetic degree-map inspection.",
};

export default async function InternalUniversityDegreeMapPage() {
  const DevelopmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityDegreeMapDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} mobileNavigation={false} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {DevelopmentSurface
          ? <DevelopmentSurface />
          : <UniversityDegreeMapUnavailable />}
      </main>
    </ForgeShell>
  );
}
