import type { Metadata } from "next";
import { SprintTemplates } from "@/src/components/forge-sprint/SprintTemplates";

export const metadata: Metadata = {
  title: "Sprint templates",
  description: "Start with a practical project pattern, then make the audience and finish line your own.",
};

export default function TemplatesPage() {
  return <SprintTemplates />;
}
