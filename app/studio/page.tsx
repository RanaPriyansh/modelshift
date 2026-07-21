import type { Metadata } from "next";

import "../studio.css";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { LessonStudio } from "@/src/components/forge/LessonStudio";

export const metadata: Metadata = {
  title: "Lesson Studio · FORGE",
  description: "Connect an AI provider for one request and compile an editable, unverified lesson draft.",
};

export default function LessonStudioPage() {
  const managedOpenAIAvailable =
    process.env.FORGE_LESSON_STUDIO_OPENAI_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);

  return (
    <ForgeShell active="studio">
      <main className="lesson-studio-page" id="forge-main" tabIndex={-1}>
        <header className="lesson-studio-heading">
          <span>Bounded AI · provider-neutral</span>
          <h1>Turn a learning question into a testable lesson draft.</h1>
          <p>
            Connect OpenAI, Anthropic, Gemini, or OpenRouter for one request. FORGE asks the model to design a separating test and cold transfer—not to impersonate a teacher or declare mastery.
          </p>
        </header>
        <LessonStudio managedOpenAIAvailable={managedOpenAIAvailable} />
      </main>
    </ForgeShell>
  );
}
