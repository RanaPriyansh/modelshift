import type { Metadata } from "next";
import { ForgeHome } from "@/src/components/forge/ForgeHome";

export const metadata: Metadata = {
  title: "Learning Labs — FORGE",
  description:
    "Explore Forge’s authored learning paths. Predict, act, use bounded help, and prove the learning after help leaves.",
};

export default function LearnPage() {
  return <ForgeHome />;
}
