import Link from "next/link";

import { ForgeStatus } from "@/src/components/forge/ForgePrimitives";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export default function NotFound() {
  return (
    <ForgeShell active="home" surface="public">
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty">
          <ForgeStatus tone="quiet">Route not found</ForgeStatus>
          <h1>This FORGE surface does not exist.</h1>
          <p>
            No path, activity, source, or learner record was inferred from the missing address.
            Choose a released surface below.
          </p>
          <div className="forge-app-page__hero-actions">
            <Link href="/">Public home</Link>
            <Link href="/paths">Reviewed activities and goal directions</Link>
            <Link href="/app">Learner workspace</Link>
          </div>
        </section>
      </main>
    </ForgeShell>
  );
}
