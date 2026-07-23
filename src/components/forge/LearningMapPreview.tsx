"use client";

import { useMemo, useState } from "react";

import type { ExploratorySourcePlanContract } from "@/src/lib/forge-planner/schema";

type RevisionNotes = Readonly<Record<string, string>>;

export function LearningMapPreview({
  learnerQuestion,
  plan,
}: {
  learnerQuestion: string;
  plan: ExploratorySourcePlanContract;
}) {
  const [revisionNotes, setRevisionNotes] = useState<RevisionNotes>({});
  const [openRevisionId, setOpenRevisionId] = useState<string | null>(null);

  const requestedChanges = useMemo(
    () => Object.values(revisionNotes).filter((note) => note.trim().length > 0).length,
    [revisionNotes],
  );

  return (
    <section className="forge-map-preview" aria-labelledby="forge-map-preview-title">
      <header className="forge-map-preview__header">
        <span>Contestable map · not yet verified</span>
        <h4 id="forge-map-preview-title">Your goal has a visible route to review.</h4>
        <p>
          This is a source-verification map, not a generated course. Every gate must resolve before FORGE can
          call subject content, resources, projects, or proof available.
        </p>
      </header>

      <article className="forge-map-intent">
        <span>Your exact words</span>
        <blockquote>{learnerQuestion}</blockquote>
        <small>Held only in this open page. It is not saved to a learner profile.</small>
      </article>

      <ol className="forge-map-gates">
        {plan.exploration.steps.map((step, index) => {
          const note = revisionNotes[step.id] ?? "";
          const revisionOpen = openRevisionId === step.id;
          return (
            <li key={step.id} className={note.trim() ? "has-revision" : undefined}>
              <span className="forge-map-gates__index">{String(index + 1).padStart(2, "0")}</span>
              <div className="forge-map-gates__copy">
                <span>{note.trim() ? "Learner revision requested" : "Required verification gate"}</span>
                <strong>{step.objective}</strong>
                <small>{step.exitGate}</small>

                {revisionOpen ? (
                  <label htmlFor={`forge-map-revision-${step.id}`}>
                    <span>What should change?</span>
                    <textarea
                      id={`forge-map-revision-${step.id}`}
                      rows={2}
                      maxLength={240}
                      value={note}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRevisionNotes((current) => ({ ...current, [step.id]: value }));
                      }}
                      placeholder="Describe the scope, order, wording, or constraint you want reviewed."
                    />
                    <small>{note.length} / 240 · local and unsent</small>
                  </label>
                ) : null}
              </div>
              <button
                type="button"
                aria-expanded={revisionOpen}
                aria-controls={`forge-map-revision-${step.id}`}
                onClick={() => setOpenRevisionId(revisionOpen ? null : step.id)}
              >
                {revisionOpen ? "Close note" : note.trim() ? "Edit request" : "Ask to revise"}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="forge-map-unavailable" aria-label="Capabilities not yet available for this goal">
        <span>Still uncompiled</span>
        <ul>
          <li>Reviewed concepts and prerequisites</li>
          <li>Eligible text, video, and visual representations</li>
          <li>Safe practical project and practice sequence</li>
          <li>Assistance withdrawal and independent proof</li>
        </ul>
      </div>

      <footer className="forge-map-preview__footer">
        <p aria-live="polite">
          {requestedChanges === 0
            ? "No revision requests in this page."
            : `${requestedChanges} local revision ${requestedChanges === 1 ? "request" : "requests"} — not submitted or saved.`}
        </p>
        {requestedChanges > 0 ? (
          <button
            type="button"
            onClick={() => {
              setRevisionNotes({});
              setOpenRevisionId(null);
            }}
          >
            Clear local requests
          </button>
        ) : null}
      </footer>
    </section>
  );
}
