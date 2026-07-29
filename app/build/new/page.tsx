import type { Metadata } from "next";
import { SprintSetup } from "@/src/components/forge-sprint/SprintSetup";

export const metadata: Metadata = {
  title: "Shape your sprint",
  description: "Set a concrete audience, finish line, starting point, and daily timebox.",
};

export default async function NewSprintPage({
  searchParams,
}: {
  searchParams: Promise<{ idea?: string | string[]; template?: string | string[] }>;
}) {
  const query = await searchParams;
  const idea = typeof query.idea === "string" ? query.idea : "";
  const template = typeof query.template === "string" ? query.template : "";
  return <SprintSetup initialIdea={idea} initialTemplateId={template} />;
}
