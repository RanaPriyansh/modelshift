import type { Metadata } from "next";
import { ForgeLanding } from "@/src/components/forge-sprint/ForgeLanding";

export const metadata: Metadata = {
  title: "FORGE — Build something real. Prove it’s yours.",
  description:
    "Turn one useful idea into a shipped project and an honest proof of your decisions in seven focused days.",
};

export default function HomePage() {
  return <ForgeLanding />;
}
