import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversitySemesterDeskUnavailable,
} from "@/src/components/forge/university/UniversitySemesterDeskUnavailable";

export const metadata: Metadata = {
  title: "Internal university semester desk research | FORGE",
  description:
    "A fail-closed synthetic surface for choosing one course to inspect without ranking, recommendation, or continuity.",
};

export default async function InternalUniversitySemesterDeskPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversitySemesterDeskDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} mobileNavigation={false} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversitySemesterDeskUnavailable />}
      </main>
    </ForgeShell>
  );
}
