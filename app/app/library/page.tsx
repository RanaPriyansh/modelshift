import type { Metadata } from "next";

import { ForgeLibrary } from "@/src/components/forge/ForgeAppStaticPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Reviewed library — FORGE",
  description: "Released source receipts bound to working FORGE Worlds, with external-resource and media boundaries.",
};

export default function ForgeLibraryPage() {
  return <ForgeShell active="paths" surface="app"><ForgeLibrary /></ForgeShell>;
}
