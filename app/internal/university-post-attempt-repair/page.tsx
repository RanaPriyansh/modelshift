import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversityPostAttemptRepairUnavailable,
} from "@/src/components/forge/university/UniversityPostAttemptRepairUnavailable";

export const metadata: Metadata = {
  title: "Internal post-attempt repair research | FORGE",
  description:
    "A fail-closed synthetic surface for inspecting one exact authored repair after a bounded attempt.",
};

export default async function InternalUniversityPostAttemptRepairPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityPostAttemptRepairDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} mobileNavigation={false} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversityPostAttemptRepairUnavailable />}
      </main>
    </ForgeShell>
  );
}
