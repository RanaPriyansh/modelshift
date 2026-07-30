import type { Metadata } from "next";
import { SprintLibrary } from "@/src/components/forge-sprint/SprintLibrary";

export const metadata: Metadata = {
  title: "My FORGE Project Sprints",
  description: "Resume, inspect, or remove the project sprints stored on this browser.",
};

export default function SprintsPage() {
  return <SprintLibrary />;
}
