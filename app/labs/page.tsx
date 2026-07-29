import type { Metadata } from "next";
import { ForgeLabs } from "@/src/components/forge-sprint/ForgeLabs";

export const metadata: Metadata = {
  title: "Learning Labs",
  description: "Optional authored learning paths for practicing a difficult idea before using it in a real project.",
};

export default function LabsPage() {
  return <ForgeLabs />;
}
