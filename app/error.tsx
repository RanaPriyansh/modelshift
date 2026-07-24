"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ForgeStatus } from "@/src/components/forge/ForgePrimitives";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export default function ForgeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the learner-facing message neutral. Framework logging retains the
    // opaque digest without rendering stack or input data into the page.
    console.error("FORGE route boundary failed", { digest: error.digest ?? "unavailable" });
  }, [error]);

  return (
    <ForgeShell active="home" surface="public">
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Surface unavailable</ForgeStatus>
          <h1>FORGE could not safely finish this view.</h1>
          <p>
            No save, completion, evidence, account, or sync state is being claimed. Retry the
            route, return to the learner workspace, or open a reviewed activity directly.
          </p>
          <div className="forge-app-page__hero-actions">
            <button className="forge-secondary-action" onClick={reset} type="button">Retry this view</button>
            <Link href="/app">Open learner workspace</Link>
            <Link href="/paths">Open reviewed activities</Link>
          </div>
        </section>
      </main>
    </ForgeShell>
  );
}
