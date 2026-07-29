import type { Metadata } from "next";
import { SprintWorkspace } from "@/src/components/forge-sprint/SprintWorkspace";

export const metadata: Metadata = {
  title: "Sprint workspace",
  description: "Do today’s smallest useful move, record the decision, and keep the proof inspectable.",
};

export default async function SprintWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SprintWorkspace sprintId={id} />;
}
