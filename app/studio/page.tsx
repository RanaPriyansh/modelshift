import type { Metadata } from "next";

import "../studio.css";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { LessonStudio } from "@/src/components/forge/LessonStudio";

export const metadata: Metadata = {
  title: "Lesson Studio · FORGE",
  description: "Adult authoring workspace for a request-only, unverified lesson draft and staged human review.",
};

export default function LessonStudioPage() {
  return (
    <ForgeShell active="studio">
      <main className="lesson-studio-page" id="forge-main" tabIndex={-1}>
        <header className="lesson-studio-heading">
          <span>Bounded AI · provider-neutral</span>
          <h1>Turn a learning question into a testable lesson draft.</h1>
          <p>
            Adult authors can use a request-only provider key to propose a draft. FORGE requires a separating test and cold transfer—not a teacher impersonation, source claim, proof grade, or publication decision.
          </p>
        </header>
        <LessonStudio />
      </main>
    </ForgeShell>
  );
}
