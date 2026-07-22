import type { Metadata } from "next";

import "../studio.css";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { LessonStudio } from "@/src/components/forge/LessonStudio";
import { readForgeCloudIdentity } from "@/src/lib/forge-auth/session.server";

export const metadata: Metadata = {
  title: "Lesson Studio · FORGE",
  description: "Adult authoring workspace for a request-only, unverified lesson draft and staged human review.",
};

export default async function LessonStudioPage() {
  // The authoring literal is not authority. Public production currently has no
  // active cloud identity path, so this keeps the connector unavailable.
  const identity = await readForgeCloudIdentity();
  return (
    <ForgeShell active="studio">
      <main className="lesson-studio-page" id="forge-main" tabIndex={-1}>
        <header className="lesson-studio-heading">
          <span>Bounded AI · provider-neutral</span>
          <h1>Turn a learning question into a testable lesson draft.</h1>
          <p>
            Lesson Studio is an adult authoring surface. A future connector requires active adult server-owned authority; it can only propose a draft with a separating test and cold transfer—not a teacher impersonation, source claim, proof grade, or publication decision.
          </p>
        </header>
        <LessonStudio authoringAvailable={Boolean(identity)} />
      </main>
    </ForgeShell>
  );
}
