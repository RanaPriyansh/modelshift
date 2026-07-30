"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  createEvidenceLedgerStore,
  createLocalStorageEvidenceLedgerAdapter,
  evidenceIdentifierSchema,
  type EvidenceEntry,
  type EvidenceLedgerReadStatus,
} from "@/src/lib/forge-evidence";
import { delayedReturnTiming } from "@/src/forge/continuity";

import { useDeviceContinuity } from "./continuity-client";
import { ForgeKicker, ForgeStatus } from "./ForgePrimitives";

function sourceHref(entry: EvidenceEntry): string {
  if (entry.source.kind === "learner_project") return "/app/projects";
  if (entry.capabilityId === "capability.force-motion.zero-net-force") return "/learn/force-and-motion";
  if (entry.capabilityId === "capability.ai-literacy.source-corroboration") return "/learn/ai-and-learning";
  if (entry.capabilityId.includes("proportional")) return "/learn/proportional-reasoning";
  return "/paths";
}

function outcomeLabel(outcome: EvidenceEntry["proof"]["outcome"]) {
  return {
    practice_completed: "Practice completed",
    proved: "Matched this World’s protected transfer criteria",
    not_proved: "Did not match this World’s protected transfer criteria",
    open_question: "Question remains open",
  }[outcome];
}

/** An exact, local-only evidence record view. Unknown IDs never fall back to a nearby entry. */
export function ForgeEvidenceRecord({ evidenceId }: { evidenceId: string }) {
  const { state: continuityState } = useDeviceContinuity();
  const [entry, setEntry] = useState<EvidenceEntry | null>(null);
  const [status, setStatus] = useState<EvidenceLedgerReadStatus | "loading">("loading");

  useEffect(() => {
    const refresh = () => {
      const result = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).read();
      setStatus(result.status);
      const validId = evidenceIdentifierSchema.safeParse(evidenceId).success;
      const matches = validId ? result.ledger.entries.filter((candidate) => candidate.id === evidenceId) : [];
      setEntry(matches.length === 1 ? matches[0]! : null);
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [evidenceId]);

  if (status === "loading") {
    return <main className="forge-app-page" id="forge-main" tabIndex={-1}><p className="forge-app-loading">Opening the exact local evidence record…</p></main>;
  }
  if (status !== "ok" && status !== "empty") {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="human">Evidence unavailable</ForgeStatus>
          <h1>FORGE cannot safely read local evidence on this device.</h1>
          <p>The original stored value remains untouched. No record, result, or recovery is being inferred.</p>
          <Link href="/app/evidence">Return to evidence controls</Link>
        </section>
      </main>
    );
  }
  if (!entry) {
    return (
      <main className="forge-app-page" id="forge-main" tabIndex={-1}>
        <section className="forge-app-empty" role="alert">
          <ForgeStatus tone="quiet">Evidence record not found</ForgeStatus>
          <h1>This opaque evidence identity is not on this device.</h1>
          <p>It may belong to another browser, have been deleted, or not be a valid FORGE evidence identity.</p>
          <Link href="/app/evidence">Return to my evidence</Link>
        </section>
      </main>
    );
  }
  const delayedReturn = continuityState.phase === "ready"
    && (
      continuityState.result.status === "ok"
      || continuityState.result.status === "empty"
    )
    ? continuityState.result.ledger.records
      .flatMap((record) => record.delayedReturnTasks)
      .find((task) => task.originEvidenceEntryId === entry.id) ?? null
    : null;
  const delayedTiming = delayedReturn
    ? delayedReturnTiming(delayedReturn, new Date().toISOString())
    : null;

  return (
    <main className="forge-app-page" id="forge-main" tabIndex={-1}>
      <header className="forge-app-page__hero forge-app-page__hero--compact">
        <ForgeKicker>Evidence detail · exact local record</ForgeKicker>
        <h1>{outcomeLabel(entry.proof.outcome)}</h1>
        <p>
          This record describes one bounded event. It is not a grade, credential, learner profile,
          or claim of general mastery.
        </p>
        <div className="forge-app-page__hero-actions">
          <Link className="forge-secondary-action" href="/app/evidence">All local evidence</Link>
          <Link className="forge-primary-action" href={sourceHref(entry)}>Inspect the bound activity</Link>
        </div>
      </header>

      <section className="forge-app-section" aria-labelledby="evidence-provenance-title">
        <article className="forge-project-brief">
          <header>
            <ForgeStatus tone={entry.proof.outcome === "proved" ? "evidence" : "human"}>
              {entry.proof.mode.replaceAll("_", " ")}
            </ForgeStatus>
            <h2 id="evidence-provenance-title">Provenance and conditions</h2>
          </header>
          <dl>
            <div><dt>Evidence ID</dt><dd>{entry.id}</dd></div>
            <div><dt>Capability</dt><dd>{entry.capabilityId}</dd></div>
            <div><dt>Recorded</dt><dd>{new Date(entry.recordedAt).toLocaleString()}</dd></div>
            <div><dt>Source</dt><dd>{entry.source.kind.replaceAll("_", " ")} · {entry.source.refId}</dd></div>
            <div><dt>Assistance access</dt><dd>{entry.proof.assistanceAccess === "removed" ? "Removed for this task" : "Available for this task"}</dd></div>
            <div><dt>Recorded support</dt><dd>{entry.assistance.length ? entry.assistance.map((item) => `${item.kind.replaceAll("_", " ")} (${item.sourceId})`).join(" · ") : "No recorded support"}</dd></div>
            <div><dt>Sharing state</dt><dd>{entry.sharing.status === "private" ? "Private on this device" : `Selected by learner for ${entry.sharing.scope.replaceAll("_", " ")} export`}</dd></div>
            <div>
              <dt>Return</dt>
              <dd>
                {delayedReturn
                  ? delayedTiming === "completed"
                    ? `Completed ${new Date(delayedReturn.completedAt!).toLocaleString()}`
                    : delayedTiming === "due"
                      ? `Due since ${new Date(delayedReturn.dueAt).toLocaleString()}`
                      : `Next reviewed return due ${new Date(delayedReturn.dueAt).toLocaleString()}`
                  : entry.source.kind === "return_challenge"
                    ? "This record is the completed delayed-return attempt"
                    : entry.returnSchedule?.nextDueAt
                      ? `Next reviewed return due ${new Date(entry.returnSchedule.nextDueAt).toLocaleString()}`
                      : "No return task is scheduled"}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <aside className="forge-app-boundary">
        <ForgeStatus tone="quiet">Claim limit</ForgeStatus>
        <h2>What this record does not establish</h2>
        <p>
          It does not establish broader transfer, delayed retention, independent performance in a
          different domain, or a permanent capability label. Those require separately reviewed evidence.
        </p>
      </aside>
    </main>
  );
}
