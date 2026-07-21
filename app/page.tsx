import type { Metadata } from "next";

import { ForgeHome } from "@/src/components/forge/ForgeHome";

export const metadata: Metadata = {
  title: "FORGE — Learning OS",
  description: "Start with a question. Act before AI explains. Build knowledge you can prove for yourself.",
};

export default function HomePage() {
  return <ForgeHome />;
}
