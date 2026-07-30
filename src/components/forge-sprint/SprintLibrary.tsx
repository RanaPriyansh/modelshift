"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductShell } from "./ProductShell";
import { ArrowIcon, LocalIcon, ProofIcon } from "./SprintIcons";
import { useForgeSprintStore } from "./useForgeSprintStore";

export function SprintLibrary() {
  const sprintStore = useForgeSprintStore();
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const sprints = [...sprintStore.store.sprints].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function remove(id: string, title: string) {
    if (!window.confirm('Remove "' + title + '" from this browser? This cannot be undone.')) return;
    sprintStore.removeSprint(id);
  }

  function exportUnreadableData() {
    const raw = sprintStore.readRawStore();
    if (raw === null) {
      setRecoveryStatus("No unreadable sprint data is present.");
      return;
    }
    const url = URL.createObjectURL(new Blob([raw], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "forge-project-sprint-unreadable-data.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setRecoveryStatus("Unreadable data downloaded without changing the browser copy.");
  }

  function clearUnreadableData() {
    if (!window.confirm("Clear the unreadable FORGE Project Sprint data from this browser? Export it first if you may need it.")) {
      return;
    }
    const error = sprintStore.clearUnreadableStore();
    setRecoveryStatus(error ?? "Unreadable data cleared.");
  }

  return (
    <ProductShell active="sprints">
      <main className="forge-sprint-library" id="forge-sprint-main" tabIndex={-1}>
        <header className="forge-page-heading forge-page-heading--library">
          <span className="forge-sprint-kicker">Stored on this browser</span>
          <h1>My Sprints</h1>
          <p>Resume the next useful move, inspect the proof, or remove work you no longer need.</p>
          <Link className="forge-button forge-button--primary" href="/build/new">Start another sprint <ArrowIcon /></Link>
        </header>

        {!sprintStore.ready ? <p className="forge-loading-state">Opening your local workbench…</p> : null}
        {sprintStore.issues.length > 0 ? (
          <div className="forge-form-alert forge-storage-recovery" role="alert">
            <strong>Some local sprint data could not be read safely.</strong>
            {sprintStore.issues.map((issue) => <p key={issue}>{issue}</p>)}
            {sprintStore.blocked ? (
              <div className="forge-storage-recovery__actions">
                <button type="button" onClick={exportUnreadableData}>Download unreadable data</button>
                <button type="button" onClick={clearUnreadableData}>Clear unreadable data</button>
              </div>
            ) : null}
          </div>
        ) : null}
        {recoveryStatus ? <p className="forge-save-status" role="status">{recoveryStatus}</p> : null}

        {sprintStore.ready && sprints.length === 0 ? (
          <section className="forge-empty-sprints">
            <LocalIcon />
            <span>No sprints on this browser yet</span>
            <h2>Give the week one useful finish line.</h2>
            <p>Start from your own idea or borrow a practical template.</p>
            <div>
              <Link className="forge-button forge-button--primary" href="/build/new">Start a sprint <ArrowIcon /></Link>
              <Link className="forge-text-link" href="/templates">Browse templates</Link>
            </div>
          </section>
        ) : null}

        {sprints.length > 0 ? (
          <section className="forge-sprint-list" aria-label="Local sprints">
            {sprints.map((sprint) => {
              const completedDays = sprint.days.filter((day) => day.completedAt).length;
              return (
                <article key={sprint.id}>
                  <header>
                    <span>{sprint.status === "completed" ? "Completed sprint" : "Active sprint"}</span>
                    <span>{completedDays} / 7 days</span>
                  </header>
                  <h2>{sprint.title}</h2>
                  <p>{sprint.finishLine}</p>
                  <div className="forge-sprint-progress" aria-label={completedDays + " of 7 days complete"}>
                    <i style={{ width: (completedDays / 7) * 100 + "%" }} />
                  </div>
                  <dl>
                    <div><dt>For</dt><dd>{sprint.audience}</dd></div>
                    <div><dt>Next</dt><dd>{sprint.status === "completed" ? "Review the proof" : "Day " + sprint.currentDay}</dd></div>
                  </dl>
                  <footer>
                    <Link href={"/build/" + sprint.id}>Open workspace <ArrowIcon /></Link>
                    <Link href={"/proof/" + sprint.id}><ProofIcon /> Proof</Link>
                    <button type="button" onClick={() => remove(sprint.id, sprint.title)}>Remove</button>
                  </footer>
                </article>
              );
            })}
          </section>
        ) : null}
      </main>
    </ProductShell>
  );
}
