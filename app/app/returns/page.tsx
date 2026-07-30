import type { Metadata } from "next";

import { ForgeReturnsWorkspace } from "@/src/components/forge/ForgeReturnsWorkspace";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Return proof — FORGE",
  description: "Device-local reviewed delayed-return tasks, their due state, and bounded retention evidence.",
};

export default function ForgeReturnsPage() {
  return <ForgeShell active="today" surface="app"><ForgeReturnsWorkspace /></ForgeShell>;
}
