"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createEvidenceLedgerStore,
  createLocalStorageEvidenceLedgerAdapter,
  deriveEvidenceState,
  type EvidenceEntry,
  type EvidenceLedger,
  type EvidenceLedgerReadStatus,
} from "@/src/lib/forge-evidence";

const CAPABILITIES: Readonly<Record<string, { title: string; href: string }>> = {
  "capability.force-motion.zero-net-force": {
    title: "Force, acceleration, and velocity",
    href: "/learn/force-and-motion",
  },
  "capability.ai-literacy.source-corroboration": {
    title: "AI-learning evidence boundaries",
    href: "/learn/ai-and-learning",
  },
  "capability.proportional-reasoning.compare-and-scale": {
    title: "Proportional relationships",
    href: "/learn/proportional-reasoning",
  },
  "proportional-reasoning.compare-and-scale": {
    title: "Proportional relationships",
    href: "/learn/proportional-reasoning",
  },
};

const STATE_LABELS = {
  building: "Building",
  proved_once: "One local result",
  ready_to_revisit: "Ready to revisit",
  carried_into_project: "Carried into a project",
  open_question: "Open question",
} as const;

const OUTCOME_LABELS = {
  practice_completed: "Practice completed",
  proved: "Matched this World’s protected transfer criteria (local record)",
  not_proved: "Not proved on this attempt",
  open_question: "Question remains open",
} as const;

function readLedger() {
  return createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).read();
}

function readableDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function capability(entry: EvidenceEntry) {
  return CAPABILITIES[entry.capabilityId] ?? {
    title: entry.capabilityId.replaceAll(/[._:-]+/g, " "),
    href: "/#worlds",
  };
}

export function EvidenceLedgerPanel({ compact = false }: { compact?: boolean }) {
  const [ledger, setLedger] = useState<EvidenceLedger>({ schemaVersion: 1, entries: [] });
  const [readStatus, setReadStatus] = useState<EvidenceLedgerReadStatus>("empty");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [message, setMessage] = useState("");
  const [now] = useState(() => new Date().toISOString());
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deleteConfirmRef = useRef<HTMLSpanElement>(null);
  const clearConfirmRef = useRef<HTMLSpanElement>(null);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoreDeleteFocusRef = useRef<string | null>(null);
  const restoreClearFocusRef = useRef(false);

  const refresh = useCallback(() => {
    const current = readLedger();
    setLedger(current.ledger);
    setReadStatus(current.status);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (pendingDeleteId) {
      deleteConfirmRef.current?.focus();
      return;
    }
    const entryId = restoreDeleteFocusRef.current;
    if (entryId) {
      restoreDeleteFocusRef.current = null;
      window.requestAnimationFrame(() => deleteTriggerRefs.current.get(entryId)?.focus());
    }
  }, [pendingDeleteId]);

  useEffect(() => {
    if (pendingClear) {
      clearConfirmRef.current?.focus();
      return;
    }
    if (restoreClearFocusRef.current) {
      restoreClearFocusRef.current = false;
      window.requestAnimationFrame(() => clearTriggerRef.current?.focus());
    }
  }, [pendingClear]);

  const entries = useMemo(
    () => [...ledger.entries].sort((left, right) => Date.parse(right.recordedAt) - Date.parse(left.recordedAt)),
    [ledger],
  );

  function deleteEntry(entryId: string) {
    const result = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).delete(entryId);
    if (result.ok) {
      setLedger(result.ledger);
      setPendingDeleteId(null);
      setMessage("Evidence record deleted from this browser.");
      window.requestAnimationFrame(() => headingRef.current?.focus());
    } else {
      setMessage("That record could not be deleted from browser storage.");
    }
  }

  function clearLedger() {
    const result = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).deleteAll();
    if (result.ok) {
      setLedger(result.ledger);
      setPendingClear(false);
      setMessage("All FORGE evidence was deleted from this browser.");
      window.requestAnimationFrame(() => headingRef.current?.focus());
    } else {
      setMessage("The local evidence ledger could not be cleared.");
    }
  }

  function toggleEducatorExport(entry: EvidenceEntry) {
    const updatedAt = new Date().toISOString();
    const sharing =
      entry.sharing.status === "shared_by_learner" && entry.sharing.scope === "educator"
        ? { status: "private" as const, updatedAt }
        : { status: "shared_by_learner" as const, scope: "educator" as const, updatedAt };
    const result = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).setSharing(entry.id, sharing);
    if (result.ok) {
      setLedger(result.ledger);
      setMessage(
        sharing.status === "private"
          ? "This record is private again."
          : "This record will be included if you download an educator copy.",
      );
    } else {
      setMessage("The sharing choice could not be changed.");
    }
  }

  function download(scope: "learner_copy" | "educator") {
    const result = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).export(
      scope,
      new Date().toISOString(),
    );
    if (!result.ok) {
      setMessage("The evidence copy could not be prepared.");
      return;
    }

    const blob = new Blob([JSON.stringify(result.value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = scope === "learner_copy" ? "forge-evidence.json" : "forge-educator-evidence.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(
      scope === "learner_copy"
        ? "Downloaded your complete local evidence copy."
        : `Downloaded ${result.value.entries.length} learner-selected record${result.value.entries.length === 1 ? "" : "s"}.`,
    );
  }

  if (readStatus === "storage_unavailable" || readStatus === "storage_error") {
    return (
      <section className="forge-live-ledger forge-live-ledger--unavailable" aria-labelledby="local-ledger-title">
        <header>
          <span>Local evidence ledger</span>
          <h2 id="local-ledger-title" ref={headingRef} tabIndex={-1}>Browser storage is unavailable.</h2>
        </header>
        <p>Learning Worlds still work, but this browser cannot retain a private evidence record right now. No record was saved or shared.</p>
        <button type="button" onClick={refresh}>Try local storage again</button>
      </section>
    );
  }

  return (
    <section className={`forge-live-ledger${compact ? " forge-live-ledger--compact" : ""}`} aria-labelledby="local-ledger-title">
      <header>
        <div>
          <span>Live · this browser only</span>
          <h2 id="local-ledger-title" ref={headingRef} tabIndex={-1}>Your evidence, under your control.</h2>
        </div>
        <p>{entries.length} bounded record{entries.length === 1 ? "" : "s"} · no account or cloud sync</p>
      </header>

      {entries.length === 0 ? (
        <div className="forge-ledger-empty">
          <strong>No local evidence records yet.</strong>
          <p>A protected transfer attempt in a working World can create a browser-local record of the outcome and help used—not your raw explanation.</p>
          <Link href="/learn/proportional-reasoning">Open a 10-minute World</Link>
        </div>
      ) : (
        <ol className="forge-ledger-list">
          {entries.map((entry) => {
            const item = capability(entry);
            const state = deriveEvidenceState(ledger, entry.capabilityId, now);
            const educatorSelected = entry.sharing.status === "shared_by_learner" && entry.sharing.scope === "educator";
            return (
              <li key={entry.id}>
                <div className="forge-ledger-record-heading">
                  <span>{STATE_LABELS[state]}</span>
                  <h3><Link href={item.href}>{item.title}</Link></h3>
                  <small>{readableDate(entry.recordedAt)}</small>
                </div>
                <dl>
                  <div><dt>Condition</dt><dd>{entry.proof.mode.replaceAll("_", " ")}</dd></div>
                  <div><dt>Outcome</dt><dd>{OUTCOME_LABELS[entry.proof.outcome]}</dd></div>
                  <div><dt>Support</dt><dd>{entry.assistance.length === 0 ? "No recorded support" : `${entry.assistance.length} bounded cue${entry.assistance.length === 1 ? "" : "s"}`}</dd></div>
                  <div><dt>Return</dt><dd>{entry.returnSchedule?.nextDueAt ? readableDate(entry.returnSchedule.nextDueAt) : "Not scheduled"}</dd></div>
                </dl>
                <div className="forge-ledger-record-actions">
                  <button type="button" onClick={() => toggleEducatorExport(entry)} aria-pressed={educatorSelected}>
                    {educatorSelected ? "Remove from educator copy" : "Include in educator copy"}
                  </button>
                  {pendingDeleteId === entry.id ? (
                    <span
                      className="forge-ledger-confirm"
                      ref={deleteConfirmRef}
                      role="group"
                      aria-label={`Confirm deletion of ${item.title}`}
                      tabIndex={-1}
                    >
                      Delete locally?
                      <button type="button" onClick={() => deleteEntry(entry.id)}>Yes, delete</button>
                      <button type="button" onClick={() => {
                        restoreDeleteFocusRef.current = entry.id;
                        setPendingDeleteId(null);
                      }}>Cancel</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      ref={(element) => {
                        if (element) deleteTriggerRefs.current.set(entry.id, element);
                        else deleteTriggerRefs.current.delete(entry.id);
                      }}
                      onClick={() => setPendingDeleteId(entry.id)}
                    >
                      Delete record
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {entries.length > 0 ? (
        <footer className="forge-ledger-controls">
          <div>
            <button type="button" onClick={() => download("learner_copy")}>Download my copy</button>
            <button type="button" onClick={() => download("educator")}>Download selected educator copy</button>
          </div>
          {pendingClear ? (
            <span
              className="forge-ledger-confirm"
              ref={clearConfirmRef}
              role="group"
              aria-label="Confirm clearing all local FORGE evidence"
              tabIndex={-1}
            >
              Delete every local record?
              <button type="button" onClick={clearLedger}>Yes, clear all</button>
              <button type="button" onClick={() => {
                restoreClearFocusRef.current = true;
                setPendingClear(false);
              }}>Cancel</button>
            </span>
          ) : (
            <button ref={clearTriggerRef} type="button" onClick={() => setPendingClear(true)}>Clear this browser</button>
          )}
        </footer>
      ) : null}

      <p className="forge-ledger-boundary">
        Stored: capability, condition, outcome, bounded support provenance, and return dates. Excluded: identity, raw chat,
        learner explanations, confidence, personality inference, and mastery scores.
      </p>
      <p className="forge-ledger-message" aria-live="polite">{message}</p>
    </section>
  );
}
