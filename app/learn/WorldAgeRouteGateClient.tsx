"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export function LocalGrownUpConfirmationClient({ children, worldTitle }: { children: ReactNode; worldTitle: string }) {
  const [confirmed, setConfirmed] = useState(false);
  if (confirmed) return children;

  return (
    <main className="forge-world-entry-gate" id="ratio-grown-up-gate" data-testid="local-grown-up-confirmation">
      <span>Child + grown-up World</span>
      <h1>A grown-up needs to join this learning session.</h1>
      <p>
        {worldTitle} uses only its reviewed materials in child mode. This confirmation is local and does not verify identity,
        legal consent, or guardian authority.
      </p>
      <button type="button" onClick={() => setConfirmed(true)}>I’m the grown-up managing this session</button>
      <Link href="/">Return to FORGE home</Link>
    </main>
  );
}
