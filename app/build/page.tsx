import type { Metadata } from "next";
import { BuildEntry } from "@/src/components/forge-sprint/BuildEntry";

export const metadata: Metadata = {
  title: "Start a sprint",
  description: "Name the useful thing you want to ship, then shape a focused seven-day build.",
};

export default function BuildPage() {
  return <BuildEntry />;
}
