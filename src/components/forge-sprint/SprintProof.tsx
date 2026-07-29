"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildForgeProofMarkdown,
  FORGE_SPRINT_STORE_VERSION,
  type ForgeSprint,
} from "@/src/lib/forge-sprint/model";
import { ProductShell } from "./ProductShell";
import { ArrowIcon, CheckIcon, LinkIcon, ProofIcon } from "./SprintIcons";
import { useForgeSprintStore } from "./useForgeSprintStore";

const EXAMPLE_SPRINT: ForgeSprint = {
  schemaVersion: FORGE_SPRINT_STORE_VERSION,
  id: "example",
  title: "Campus Event Matcher",
  audience: "Students who miss useful campus events because calendars are noisy and hard to scan.",
  finishLine: "Students can filter campus events and open one useful event detail page.",
  startingPoint: "A small event fixture, a basic application shell, and five short student conversations.",
  dailyMinutes: 60,
  templateId: "campus-tool",
  status: "completed",
  currentDay: 7,
  createdAt: "2026-07-21T09:00:00.000Z",
  updatedAt: "2026-07-28T09:00:00.000Z",
  days: [
    {
      day: 1,
      workNotes: "Cut the project to one campus, three filters, and one useful event detail.",
      change: "Removed recommendations so the core browse flow could become dependable.",
      evidenceLinks: [],
      completedAt: "2026-07-21T10:00:00.000Z",
    },
    {
      day: 2,
      workNotes: "Asked five students how they currently find events and watched two use the official calendar.",
      change: "Made date and accessibility the first filters after students described those as hard blockers.",
      evidenceLinks: [{ id: "e1", label: "Interview notes", url: "https://example.com/forge/interview-notes" }],
      completedAt: "2026-07-22T10:00:00.000Z",
    },
    {
      day: 3,
      workNotes: "Connected the event fixture to a filterable list and a complete event detail route.",
      change: "Kept filtering client-side because the useful dataset is small and inspectable.",
      evidenceLinks: [{ id: "e2", label: "Working prototype", url: "https://example.com/forge/prototype" }],
      completedAt: "2026-07-23T10:00:00.000Z",
    },
    {
      day: 4,
      workNotes: "Ran the flow with three classmates and recorded every place they paused.",
      change: "Replaced category jargon with student language and made empty states suggest the next move.",
      evidenceLinks: [{ id: "e3", label: "Usability findings", url: "https://example.com/forge/usability" }],
      completedAt: "2026-07-24T10:00:00.000Z",
    },
    {
      day: 5,
      workNotes: "Tightened keyboard focus, small-screen layout, event metadata, and the no-results path.",
      change: "Removed two decorative cards so the event list stays primary on mobile.",
      evidenceLinks: [],
      completedAt: "2026-07-25T10:00:00.000Z",
    },
    {
      day: 6,
      workNotes: "Completed the core flow without notes, repaired one filter bug without AI, and checked every proof link.",
      change: "Fixed inclusive date boundaries after reproducing the failure from a fresh browser session.",
      evidenceLinks: [{ id: "e4", label: "Recorded core flow", url: "https://example.com/forge/core-flow" }],
      completedAt: "2026-07-26T10:00:00.000Z",
    },
    {
      day: 7,
      workNotes: "Published the project, wrote the scope, and invited the original testers back.",
      change: "Stated that event freshness depends on the fixture instead of implying live campus coverage.",
      evidenceLinks: [],
      completedAt: "2026-07-27T10:00:00.000Z",
    },
  ],
  proofLab: {
    explainWithoutNotes: "A student chooses a date and accessibility need, scans the matching events, and opens the detail needed to decide whether to attend.",
    changeWithoutAi: "I reproduced and fixed an inclusive end-date bug, then wrote the boundary cases from memory.",
    realityCheck: "I opened every proof link in a fresh browser and watched two students complete the core flow.",
    coreOutcomeShown: true,
    evidenceIsInspectable: true,
    canExplainScope: true,
    aiUse: "learner_declares_no_ai",
    status: "self_declared",
  },
  whatShipped: [
    "A responsive, filterable campus event list",
    "A complete event detail flow",
    "Keyboard and empty-state coverage for the core path",
  ],
  reflection:
    "The project became useful when I stopped treating recommendations as the product. The strongest decision was narrowing the promise to reliable filtering and a clear detail page. Next I would test how events enter the system and whether organizers can maintain accessibility details.",
  openQuestions: [
    "Who owns event freshness after the fixture becomes a live source?",
    "Which accessibility fields can organizers provide reliably?",
  ],
};

export function SprintProof({ sprintId }: { sprintId: string }) {
  const sprintStore = useForgeSprintStore();
  const [actionStatus, setActionStatus] = useState("");
  const sprint = sprintId === "example"
    ? EXAMPLE_SPRINT
    : sprintStore.store.sprints.find((candidate) => candidate.id === sprintId) ?? null;

  async function copyProof(project: ForgeSprint) {
    try {
      await navigator.clipboard.writeText(buildForgeProofMarkdown(project));
      setActionStatus("Proof Markdown copied.");
    } catch {
      setActionStatus("Copy was unavailable. Download the Markdown instead.");
    }
  }

  function downloadProof(project: ForgeSprint) {
    const blob = new Blob([buildForgeProofMarkdown(project)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-proof.md";
    anchor.click();
    URL.revokeObjectURL(url);
    setActionStatus("Proof Markdown downloaded.");
  }

  if (!sprintStore.ready && sprintId !== "example") {
    return (
      <ProductShell quiet>
        <main className="forge-route-state" id="forge-sprint-main">
          <span>Opening local proof</span>
          <h1>Loading project proof…</h1>
        </main>
      </ProductShell>
    );
  }

  if (!sprint) {
    return (
      <ProductShell quiet>
        <main className="forge-route-state" id="forge-sprint-main">
          <span>Browser-local proof</span>
          <h1>Proof not found</h1>
          <p>This proof link does not match a sprint stored in this browser.</p>
          <p>Forge does not upload private sprint data or invent a public record when the local project is missing.</p>
          <div>
            <Link className="forge-product-primary" href="/sprints">Open My Sprints</Link>
            <Link className="forge-text-action" href="/proof/example">View the example proof</Link>
          </div>
        </main>
      </ProductShell>
    );
  }

  const evidence = sprint.days.flatMap((day) =>
    day.evidenceLinks.map((link) => ({ ...link, day: day.day })),
  );
  const changes = sprint.days
    .map((day) => ({ day: day.day, text: day.change.trim() }))
    .filter((item) => item.text);
  const completedDays = sprint.days.filter((day) => day.completedAt).length;
  const proofComplete = sprint.proofLab.status === "self_declared" && sprint.status === "completed";
  const example = sprintId === "example";

  return (
    <ProductShell quiet>
      <main className="forge-proof-page" id="forge-sprint-main">
        <header className="forge-proof-hero">
          <div className="forge-proof-kicker">
            <span>FORGE / PROJECT PROOF</span>
            <span>{example ? "Local proof preview · Example" : "Browser-local record"}</span>
          </div>
          <h1>{sprint.title}</h1>
          <p>{sprint.finishLine}</p>
          <div className="forge-proof-scope">
            <span>{completedDays} daily moves</span>
            <span>{evidence.length} evidence link{evidence.length === 1 ? "" : "s"}</span>
            <span>{proofComplete ? "Self-declared proof complete" : "Proof in progress"}</span>
          </div>
        </header>

        <section className="forge-proof-boundary">
          <ProofIcon />
          <div>
            <strong>Learner-declared, scoped proof</strong>
            <p>
              This page records what the learner says they built and the evidence they attached.
              Forge has not independently verified identity, authorship, mastery, or every external link.
            </p>
          </div>
        </section>

        <div className="forge-proof-layout">
          <article className="forge-proof-story">
            <section className="forge-proof-section forge-proof-finish">
              <span>01</span>
              <div><h2>The finish line</h2><p>{sprint.finishLine}</p><small>Built for {sprint.audience}</small></div>
            </section>

            <section className="forge-proof-section">
              <span>02</span>
              <div>
                <h2>What shipped</h2>
                {sprint.whatShipped.filter(Boolean).length > 0 ? (
                  <ul className="forge-proof-checklist">
                    {sprint.whatShipped.filter(Boolean).map((item) => <li key={item}><CheckIcon /> {item}</li>)}
                  </ul>
                ) : <p>Not recorded yet.</p>}
              </div>
            </section>

            <section className="forge-proof-section">
              <span>03</span>
              <div>
                <h2>Inspectable evidence</h2>
                {evidence.length > 0 ? (
                  <ul className="forge-proof-evidence">
                    {evidence.map((item) => (
                      <li key={item.id}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <span><LinkIcon /> {item.label}</span><small>Day {item.day} ↗</small>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <p>No inspectable links have been attached.</p>}
              </div>
            </section>

            <section className="forge-proof-section">
              <span>04</span>
              <div>
                <h2>Decisions that changed the work</h2>
                {changes.length > 0 ? (
                  <ol className="forge-proof-changes">
                    {changes.map((change) => <li key={change.day}><span>DAY {change.day}</span><p>{change.text}</p></li>)}
                  </ol>
                ) : <p>No decisions have been recorded yet.</p>}
              </div>
            </section>

            <section className="forge-proof-section forge-proof-lab">
              <span>05</span>
              <div>
                <header className="forge-proof-lab-title">
                  <div><span>Protected Proof Lab</span><h2>What remains when help leaves</h2></div>
                  <strong>{sprint.proofLab.status === "self_declared" ? "Self-declared" : "Not completed"}</strong>
                </header>
                <p className="forge-proof-lab-disclosure">
                  The learner declares whether generative AI was absent during this protected pass.
                  This is an honesty boundary, not technical surveillance.
                </p>
                <dl>
                  <div><dt>Explain without notes</dt><dd>{sprint.proofLab.explainWithoutNotes || "Not recorded."}</dd></div>
                  <div><dt>Change without AI</dt><dd>{sprint.proofLab.changeWithoutAi || "Not recorded."}</dd></div>
                  <div><dt>Reality check</dt><dd>{sprint.proofLab.realityCheck || "Not recorded."}</dd></div>
                </dl>
              </div>
            </section>

            <section className="forge-proof-section">
              <span>06</span>
              <div>
                <h2>Reflection</h2>
                <p>{sprint.reflection || "Not recorded yet."}</p>
              </div>
            </section>

            <section className="forge-proof-section forge-proof-open">
              <span>07</span>
              <div>
                <h2>What remains open</h2>
                {sprint.openQuestions.filter(Boolean).length > 0 ? (
                  <ul>{sprint.openQuestions.filter(Boolean).map((item) => <li key={item}>{item}</li>)}</ul>
                ) : <p>No open questions recorded.</p>}
              </div>
            </section>
          </article>

          <aside className="forge-proof-actions">
            <span>Take the record with you</span>
            <h2>Exportable by design.</h2>
            <p>The useful unit is your artifact and its story—not a Forge profile.</p>
            <button type="button" onClick={() => void copyProof(sprint)}>Copy as Markdown</button>
            <button type="button" onClick={() => downloadProof(sprint)}>Download .md</button>
            <button type="button" onClick={() => window.print()}>Print / save PDF</button>
            {!example ? <Link href={"/build/" + sprint.id}>Return to workspace <ArrowIcon /></Link> : null}
            <span className="forge-save-status" aria-live="polite">{actionStatus}</span>
          </aside>
        </div>

        <footer className="forge-proof-footer">
          <span>Built with Forge · {example ? "Example data" : "Stored on this browser"}</span>
          <span>No score · No ranking · No automated authorship claim</span>
        </footer>
      </main>
    </ProductShell>
  );
}
