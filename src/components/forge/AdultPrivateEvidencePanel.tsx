"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { createEvidenceLedgerStore, createLocalStorageEvidenceLedgerAdapter } from "@/src/lib/forge-evidence";

export type PrivateEvidenceUiStatus = "unavailable" | "signed_out" | "needs_activation" | "device_only" | "adult";
const SYNC_BATCH_SIZE = 100;

export function AdultPrivateEvidencePanel({ status }: { status: PrivateEvidenceUiStatus }) {
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refreshCloudCount = useCallback(async () => {
    if (status !== "adult") return;
    try {
      const response = await fetch("/api/forge/private-evidence", { cache: "no-store" });
      if (!response.ok) {
        setCloudCount(null);
        return;
      }
      const result = (await response.json()) as { entries?: unknown[] };
      setCloudCount(Array.isArray(result.entries) ? result.entries.length : null);
    } catch {
      setCloudCount(null);
    }
  }, [status]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void refreshCloudCount());
    return () => window.cancelAnimationFrame(frame);
  }, [refreshCloudCount]);

  async function syncNow() {
    const local = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).read();
    if (local.status === "storage_error" || local.status === "storage_unavailable") {
      setMessage("This browser ledger is unavailable, so nothing was uploaded.");
      return;
    }
    if (local.ledger.entries.length === 0) {
      setMessage("There are no local evidence records to sync.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      let synced = 0;
      for (let offset = 0; offset < local.ledger.entries.length; offset += SYNC_BATCH_SIZE) {
        const entries = local.ledger.entries.slice(offset, offset + SYNC_BATCH_SIZE);
        const response = await fetch("/api/forge/private-evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });
        if (!response.ok) {
          setMessage(
            synced === 0
              ? "Private sync failed. The local browser copy was not changed."
              : `Synced ${synced} records before the request stopped. Retry is safe because writes are idempotent.`,
          );
          return;
        }
        synced += entries.length;
      }
      await refreshCloudCount();
      setMessage(`Synced ${synced} bounded record${synced === 1 ? "" : "s"}.`);
    } catch {
      setMessage("Private sync could not reach the server. The local browser copy was not changed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCloudCopy() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/forge/private-evidence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) {
        setMessage("The private cloud copy could not be deleted. Your browser copy was not changed.");
        return;
      }
      setCloudCount(0);
      setConfirmDelete(false);
      setMessage("Deleted every synced evidence record. Browser evidence remains on this device.");
    } catch {
      setMessage("The private cloud copy could not be deleted. Your browser copy was not changed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "device_only") {
    return (
      <section className="forge-private-sync" aria-labelledby="private-sync-title">
        <span>Device-only by design</span>
        <h2 id="private-sync-title">Cloud evidence is off for under-18 profiles.</h2>
        <p>Learning and the private browser ledger remain available. This slice does not create or sync minor learning records.</p>
      </section>
    );
  }

  if (status === "signed_out" || status === "needs_activation") {
    return (
      <section className="forge-private-sync" aria-labelledby="private-sync-title">
        <span>Optional · adults 18+</span>
        <h2 id="private-sync-title">Private cross-device evidence is opt-in.</h2>
        <p>No evidence uploads automatically. Adults can activate a private, owner-only copy while this device ledger stays the default.</p>
        <Link href={status === "signed_out" ? "/login" : "/account/activate"}>
          {status === "signed_out" ? "Adult sign in" : "Finish adult activation"}
        </Link>
      </section>
    );
  }

  if (status === "unavailable") {
    return (
      <section className="forge-private-sync" aria-labelledby="private-sync-title">
        <span>Cloud sync unavailable</span>
        <h2 id="private-sync-title">This evidence remains on your device.</h2>
        <p>The Supabase environment is absent or unavailable. Learning, local export, and local deletion continue to work.</p>
      </section>
    );
  }

  return (
    <section className="forge-private-sync" aria-labelledby="private-sync-title">
      <header>
        <div><span>Adult private evidence</span><h2 id="private-sync-title">Sync only when you choose.</h2></div>
        <p>{cloudCount === null ? "Checking private copy…" : `${cloudCount} synced record${cloudCount === 1 ? "" : "s"}`}</p>
      </header>
      <p>
        Sync stores the same bounded proof metadata under your pseudonymous account ID. It never uploads raw explanations,
        chat, confidence, identity traits, or a mastery score.
      </p>
      <div className="forge-private-sync-actions">
        <button type="button" onClick={() => void syncNow()} disabled={busy}>Sync this device now</button>
        <Link href="/account">Account boundary</Link>
        {confirmDelete ? (
          <span className="forge-ledger-confirm" role="group" aria-label="Confirm deletion of all synced evidence">
            Delete the cloud copy?
            <button type="button" onClick={() => void deleteCloudCopy()} disabled={busy}>Yes, delete</button>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy || cloudCount === 0}>Delete cloud copy</button>
        )}
      </div>
      <p className="forge-ledger-message" aria-live="polite">{message}</p>
    </section>
  );
}
