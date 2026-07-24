"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { writeStartDraft } from "../../start-draft";

export function StartDraftLink({
  children,
  className,
  goal,
}: {
  children: ReactNode;
  className?: string;
  goal: string;
}) {
  return (
    <Link
      className={className}
      href="/start"
      onClick={() => {
        // If tab-local storage is unavailable the canonical empty form still
        // opens; learner wording never enters the URL.
        writeStartDraft({ goal, desiredOutcome: "" });
      }}
    >
      {children}
    </Link>
  );
}
