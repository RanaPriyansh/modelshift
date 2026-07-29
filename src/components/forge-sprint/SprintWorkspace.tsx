"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  addEvidenceLink,
  completeCurrentSprintDay,
  FORGE_SPRINT_DAYS,
  getForgeSprintDay,
  removeEvidenceLink,
  updateForgeSprint,
  type ForgeProofLab,
  type ForgeSprint,
} from "@/src/lib/forge-sprint/model";
import { ProductShell } from "./ProductShell";
import { ArrowIcon, CheckIcon, LinkIcon, ProofIcon } from "./SprintIcons";
import { useForgeSprintStore } from "./useForgeSprintStore";

export function SprintWorkspace({ sprintId }: { sprintId: string }) {
  const sprintStore = useForgeSprintStore();
  const storedSprint = sprintStore.store.sprints.find((candidate) => candidate.id === sprintId) ?? null;
  const [draft, setDraft] = useState<ForgeSprint | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const applicableDraft = draft?.id === sprintId ? draft : null;
  const currentDraft = applicableDraft ?? storedSprint;

  function editDraft(update: (current: ForgeSprint) => ForgeSprint) {
    const base = applicableDraft ?? storedSprint;
    if (!base) return;
    setDraft(update(base));
    setSaveStatus("");
    setErrors([]);
  }

  function updateDay(field: "workNotes" | "change", value: string) {
    if (!currentDraft) return;
    editDraft((current) => updateForgeSprint(current, {
      days: current.days.map((day) =>
        day.day === current.currentDay ? { ...day, [field]: value } : day,
      ),
    }));
  }

  function updateProofLab(update: Partial<ForgeProofLab>) {
    editDraft((current) => updateForgeSprint(current, {
      proofLab: { ...current.proofLab, ...update },
    }));
  }

  function save() {
    if (!currentDraft) return;
    const error = sprintStore.saveSprint(currentDraft);
    if (error) {
      setErrors([error]);
      setSaveStatus("");
      return;
    }
    setDraft(currentDraft);
    setSaveStatus("Saved on this browser.");
  }

  function completeDay() {
    if (!currentDraft) return;
    const result = completeCurrentSprintDay(currentDraft);
    if (!result.result.ok) {
      setErrors(result.result.errors);
      setSaveStatus("");
      return;
    }
    const error = sprintStore.saveSprint(result.sprint);
    if (error) {
      setErrors([error]);
      return;
    }
    setDraft(result.sprint);
    setErrors([]);
    setSaveStatus(result.sprint.status === "completed" ? "Sprint complete. Your proof is ready to inspect." : "Day complete. The next move is ready.");
  }

  function attachEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentDraft) return;
    const result = addEvidenceLink(
      currentDraft,
      currentDraft.currentDay,
      { label: evidenceLabel, url: evidenceUrl },
    );
    if (result.error) {
      setErrors([result.error]);
      return;
    }
    setDraft(result.sprint);
    setEvidenceLabel("");
    setEvidenceUrl("");
    setErrors([]);
    setSaveStatus("Evidence added to the draft. Save today’s move to keep it.");
  }

  if (!sprintStore.ready) {
    return (
      <ProductShell active="build">
        <main className="forge-route-state" id="forge-sprint-main" tabIndex={-1}>
          <span>Opening local workbench</span>
          <h1>Loading your sprint…</h1>
        </main>
      </ProductShell>
    );
  }

  if (!currentDraft) {
    return (
      <ProductShell active="build">
        <main className="forge-route-state" id="forge-sprint-main" tabIndex={-1}>
          <span>Local sprint</span>
          <h1>Sprint not found</h1>
          <p>This link does not match a sprint stored in this browser.</p>
          <div>
            <Link className="forge-product-primary" href="/sprints">Open My Sprints</Link>
            <Link className="forge-text-action" href="/build/new">Start a new sprint</Link>
          </div>
        </main>
      </ProductShell>
    );
  }

  const definition = getForgeSprintDay(currentDraft.currentDay);
  const day = currentDraft.days.find((entry) => entry.day === currentDraft.currentDay) ?? currentDraft.days[0];
  const completedDays = currentDraft.days.filter((entry) => entry.completedAt).length;
  const allEvidence = currentDraft.days.flatMap((entry) => entry.evidenceLinks);

  return (
    <ProductShell active="build">
      <main className="forge-workspace" id="forge-sprint-main" tabIndex={-1}>
        <aside className="forge-workspace-project">
          <header>
            <span>{currentDraft.status === "completed" ? "Sprint complete" : "Active 7-day sprint"}</span>
            <h1>{currentDraft.title}</h1>
            <p>{currentDraft.finishLine}</p>
          </header>
          <section>
            <span>Built for</span>
            <p>{currentDraft.audience}</p>
          </section>
          <section>
            <span>Starting point</span>
            <p>{currentDraft.startingPoint}</p>
          </section>
          <nav className="forge-sprint-map" aria-label="Seven-day sprint map">
            <span>{completedDays} / 7 moves complete</span>
            <ol>
              {FORGE_SPRINT_DAYS.map((item) => {
                const entry = currentDraft.days.find((candidate) => candidate.day === item.day);
                const state = entry?.completedAt ? "complete" : item.day === currentDraft.currentDay ? "current" : "upcoming";
                return (
                  <li key={item.day} data-state={state}>
                    <span>{entry?.completedAt ? "✓" : item.day}</span>
                    <div><strong>{item.title}</strong><small>{state === "current" ? "Today’s move" : state}</small></div>
                  </li>
                );
              })}
            </ol>
          </nav>
          <section>
            <span>Daily timebox</span>
            <strong>{currentDraft.dailyMinutes} focused minutes</strong>
          </section>
        </aside>

        <article className="forge-today-move">
          <header>
            <span>DAY {definition.day} / 07</span>
            <h2>{definition.title}</h2>
            <p>{definition.objective}</p>
          </header>

          <div className="forge-task-block">
            <span>Today’s smallest useful move</span>
            <p>{definition.task}</p>
          </div>

          <label className="forge-work-field">
            <span>Work notes</span>
            <textarea
              aria-label="Work notes"
              rows={8}
              maxLength={2400}
              value={day.workNotes}
              onChange={(event) => updateDay("workNotes", event.target.value)}
              placeholder="What did you make, try, observe, or learn? Write enough that tomorrow-you can continue."
            />
            <small>{day.workNotes.length} / 2400</small>
          </label>

          <label className="forge-work-field">
            <span>Most important change</span>
            <textarea
              rows={4}
              maxLength={800}
              value={day.change}
              onChange={(event) => updateDay("change", event.target.value)}
              placeholder="What changed in the project or in your understanding—and why?"
            />
            <small>{day.change.length} / 800</small>
          </label>

          {currentDraft.currentDay === 6 ? (
            <section className="forge-proof-lab-fields" aria-labelledby="proof-lab-heading">
              <header className="forge-proof-lock-heading">
                <ProofIcon />
                <div>
                  <span>Protected proof work</span>
                  <h3 id="proof-lab-heading">Show the outcome. Explain the judgment.</h3>
                  <p>Do this pass without AI. Access tools remain welcome; generative help waits outside the proof window.</p>
                </div>
              </header>
              <label>
                <span>Explain the core flow without notes</span>
                <textarea
                  rows={4}
                  value={currentDraft.proofLab.explainWithoutNotes}
                  onChange={(event) => updateProofLab({ explainWithoutNotes: event.target.value })}
                />
              </label>
              <label>
                <span>One meaningful change made without AI</span>
                <textarea
                  rows={4}
                  value={currentDraft.proofLab.changeWithoutAi}
                  onChange={(event) => updateProofLab({ changeWithoutAi: event.target.value })}
                />
              </label>
              <label>
                <span>How did you check the result in reality?</span>
                <textarea
                  rows={3}
                  value={currentDraft.proofLab.realityCheck}
                  onChange={(event) => updateProofLab({ realityCheck: event.target.value })}
                />
              </label>
              <fieldset className="forge-ai-declaration">
                <legend>Protected-work declaration</legend>
                <label>
                  <input
                    type="radio"
                    name="ai-use"
                    checked={currentDraft.proofLab.aiUse === "learner_declares_no_ai"}
                    onChange={() => updateProofLab({ aiUse: "learner_declares_no_ai" })}
                  />
                  I declare that I completed this protected Proof Lab pass without generative AI.
                </label>
                <label>
                  <input
                    type="radio"
                    name="ai-use"
                    checked={currentDraft.proofLab.aiUse === "ai_used_or_unsure"}
                    onChange={() => updateProofLab({ aiUse: "ai_used_or_unsure" })}
                  />
                  I used AI or I am unsure. I will repeat the protected pass before completing Day 6.
                </label>
              </fieldset>
            </section>
          ) : null}

          {currentDraft.currentDay === 7 ? (
            <section className="forge-delivery-fields" aria-labelledby="delivery-heading">
              <header>
                <span>Deliver with honest edges</span>
                <h3 id="delivery-heading">Package what exists—not the fantasy version.</h3>
              </header>
              <label>
                <span>What shipped? One item per line</span>
                <textarea
                  rows={4}
                  value={currentDraft.whatShipped.join("\n")}
                  onChange={(event) => editDraft((current) => updateForgeSprint(current, {
                    whatShipped: event.target.value.split("\n").slice(0, 12),
                  }))}
                />
              </label>
              <label>
                <span>Reflection</span>
                <textarea
                  rows={6}
                  maxLength={1600}
                  value={currentDraft.reflection}
                  onChange={(event) => editDraft((current) => updateForgeSprint(current, { reflection: event.target.value }))}
                  placeholder="What changed in the project and in your judgment? What would you test next?"
                />
              </label>
              <label>
                <span>What remains open? One item per line</span>
                <textarea
                  rows={4}
                  value={currentDraft.openQuestions.join("\n")}
                  onChange={(event) => editDraft((current) => updateForgeSprint(current, {
                    openQuestions: event.target.value.split("\n").slice(0, 12),
                  }))}
                />
              </label>
            </section>
          ) : null}

          <section className="forge-evidence-links" aria-labelledby="evidence-heading">
            <header>
              <div>
                <span>Evidence links</span>
                <h3 id="evidence-heading">Attach things another person can inspect.</h3>
              </div>
              <small>{day.evidenceLinks.length} on this day</small>
            </header>
            {day.evidenceLinks.length > 0 ? (
              <ul>
                {day.evidenceLinks.map((link) => (
                  <li key={link.id}>
                    <a href={link.url} target="_blank" rel="noreferrer"><LinkIcon /> {link.label}</a>
                    <button
                      type="button"
                      onClick={() => editDraft((current) => removeEvidenceLink(current, current.currentDay, link.id))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p>No evidence attached to today’s move yet.</p>}
            <form onSubmit={attachEvidence}>
              <label><span>Label</span><input value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} placeholder="Working prototype" /></label>
              <label><span>https:// link</span><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label>
              <button type="submit">Add link</button>
            </form>
          </section>

          {errors.length > 0 ? (
            <div className="forge-form-errors" role="alert">
              <strong>Before this day can close:</strong>
              <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          ) : null}

          <div className="forge-day-actions">
            <button className="forge-product-primary" type="button" onClick={save}>Save today’s move</button>
            {currentDraft.status === "active" ? (
              <button className="forge-text-action" type="button" onClick={completeDay}>
                Complete Day {currentDraft.currentDay} <ArrowIcon />
              </button>
            ) : (
              <Link className="forge-product-primary" href={"/proof/" + currentDraft.id}>Open project proof <ArrowIcon /></Link>
            )}
            <span className="forge-save-status" aria-live="polite">{saveStatus}</span>
          </div>
        </article>

        <aside className="forge-workspace-review">
          <section className="forge-evidence-checklist">
            <span>Today is real when…</span>
            <label>
              <input
                type="checkbox"
                checked={currentDraft.proofLab.coreOutcomeShown}
                onChange={(event) => updateProofLab({ coreOutcomeShown: event.target.checked })}
                disabled={currentDraft.currentDay !== 6}
              />
              The core outcome is shown
            </label>
            <label>
              <input
                type="checkbox"
                checked={currentDraft.proofLab.evidenceIsInspectable}
                onChange={(event) => updateProofLab({ evidenceIsInspectable: event.target.checked })}
                disabled={currentDraft.currentDay !== 6}
              />
              Evidence opens and can be inspected
            </label>
            <label>
              <input
                type="checkbox"
                checked={currentDraft.proofLab.canExplainScope}
                onChange={(event) => updateProofLab({ canExplainScope: event.target.checked })}
                disabled={currentDraft.currentDay !== 6}
              />
              I can explain the scope and limits
            </label>
          </section>
          <section>
            <span>Evidence so far</span>
            <strong>{allEvidence.length} inspectable link{allEvidence.length === 1 ? "" : "s"}</strong>
            <Link href={"/proof/" + currentDraft.id}>Preview proof <ArrowIcon /></Link>
          </section>
          <section className="forge-day-boundary">
            <CheckIcon />
            <div><strong>No score. No streak.</strong><p>A day closes when the useful work and its decision are recorded.</p></div>
          </section>
          {definition.tomorrow ? (
            <section className="forge-tomorrow">
              <span>Tomorrow</span>
              <p>{definition.tomorrow}</p>
            </section>
          ) : (
            <section className="forge-tomorrow">
              <span>After Day 7</span>
              <p>Export the proof, share the artifact, and choose the next test only if the project earns it.</p>
            </section>
          )}
        </aside>
      </main>
    </ProductShell>
  );
}
