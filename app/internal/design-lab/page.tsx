import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DesignLabGallery } from "@/src/components/forge/design-lab/DesignLabGallery";

export const metadata: Metadata = {
  title: "Student design lab | FORGE",
  description:
    "An internal comparison of the current FORGE visual system and alternate student experience candidates.",
};

export default function InternalDesignLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignLabGallery />;
}
