import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversitySemesterOverviewUnavailable,
} from "@/src/components/forge/university/UniversitySemesterOverviewUnavailable";

export const metadata: Metadata = {
  title: "Internal university semester overview research | FORGE",
  description:
    "A fail-closed synthetic surface for inspecting all current courses without ranking or recommendation.",
};

export default async function InternalUniversitySemesterOverviewPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversitySemesterOverviewDevelopmentSurface
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
          : <UniversitySemesterOverviewUnavailable />}
      </main>
    </ForgeShell>
  );
}
