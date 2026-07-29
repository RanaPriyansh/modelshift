"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  FORGE_SPRINT_TEMPLATES,
  getForgeSprintTemplate,
  type ForgeDailyMinutes,
  type ForgeSprintTemplateId,
  validateSprintSetup,
} from "@/src/lib/forge-sprint/model";
import { ProductShell } from "./ProductShell";
import { ArrowIcon, CheckIcon } from "./SprintIcons";
import { useForgeSprintStore } from "./useForgeSprintStore";

const DAILY_OPTIONS: ForgeDailyMinutes[] = [30, 60, 90, 120];

function isTemplateId(value: string): value is ForgeSprintTemplateId {
  return FORGE_SPRINT_TEMPLATES.some((template) => template.id === value);
}

export function SprintSetup({
  initialIdea = "",
  initialTemplateId = "",
}: {
  initialIdea?: string;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const initialTemplate = isTemplateId(initialTemplateId) ? initialTemplateId : "campus-tool";
  const seed = getForgeSprintTemplate(initialTemplate);
  const [title, setTitle] = useState(initialIdea);
  const [audience, setAudience] = useState("");
  const [finishLine, setFinishLine] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [templateId, setTemplateId] = useState<ForgeSprintTemplateId>(initialTemplate);
  const [dailyMinutes, setDailyMinutes] = useState<ForgeDailyMinutes>(60);
  const [submitted, setSubmitted] = useState(false);
  const [storageError, setStorageError] = useState("");
  const sprintStore = useForgeSprintStore();

  const input = useMemo(() => ({
    title,
    audience,
    finishLine,
    startingPoint,
    dailyMinutes,
    templateId,
  }), [title, audience, finishLine, startingPoint, dailyMinutes, templateId]);
  const validation = validateSprintSetup(input);

  function applyExample() {
    const template = getForgeSprintTemplate(templateId);
    if (!title.trim()) setTitle(template.exampleTitle);
    setAudience(template.exampleAudience);
    setFinishLine(template.exampleFinishLine);
    setStartingPoint(template.exampleStartingPoint);
    setSubmitted(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setStorageError("");
    if (!validation.ok) return;
    const result = sprintStore.createSprint(input);
    if (!result.sprint) {
      setStorageError(result.error ?? "Forge could not create this sprint.");
      return;
    }
    router.push("/build/" + result.sprint.id);
  }

  return (
    <ProductShell active="build">
      <main className="forge-setup" id="forge-sprint-main" tabIndex={-1}>
        <header className="forge-page-heading forge-page-heading--setup">
          <span className="forge-sprint-kicker">Shape the finish line</span>
          <h1>Make seven days small enough to finish.</h1>
          <p>
            A strong sprint names one audience, one useful result, and the starting
            material already in your hands. You can change the map as reality changes.
          </p>
        </header>

        <form className="forge-setup-form" onSubmit={submit} noValidate>
          <section className="forge-setup-form__main">
            <div className="forge-form-section">
              <span>01 / The project</span>
              <label>
                <strong>What are you building?</strong>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={80}
                  placeholder={seed.exampleTitle}
                  autoFocus
                />
                <small>Use a name that makes the artifact visible.</small>
              </label>
              <label>
                <strong>Who is it for?</strong>
                <textarea
                  aria-label="Who is it for?"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  maxLength={240}
                  rows={3}
                  placeholder="One specific person or group with a real need."
                />
              </label>
              <label>
                <strong>What should work by Day 7?</strong>
                <textarea
                  aria-label="What should work by Day 7?"
                  value={finishLine}
                  onChange={(event) => setFinishLine(event.target.value)}
                  maxLength={360}
                  rows={4}
                  placeholder="Describe one observable, testable result."
                />
              </label>
              <label>
                <strong>What do you already have?</strong>
                <textarea
                  aria-label="What do you already have?"
                  value={startingPoint}
                  onChange={(event) => setStartingPoint(event.target.value)}
                  maxLength={360}
                  rows={3}
                  placeholder="An idea, rough files, research, a prototype, or nothing yet."
                />
              </label>
            </div>

            <div className="forge-form-section">
              <span>02 / Starting pattern</span>
              <div className="forge-template-choices">
                {FORGE_SPRINT_TEMPLATES.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    className={template.id === templateId ? "is-selected" : undefined}
                    aria-pressed={template.id === templateId}
                    onClick={() => {
                      setTemplateId(template.id);
                      setSubmitted(false);
                    }}
                  >
                    {template.id === templateId ? <CheckIcon /> : null}
                    <strong>{template.name}</strong>
                    <span>{template.shortDescription}</span>
                  </button>
                ))}
              </div>
              <button className="forge-use-example" type="button" onClick={applyExample}>
                Use the {getForgeSprintTemplate(templateId).name.toLowerCase()} example
              </button>
            </div>
          </section>

          <aside className="forge-setup-form__rail">
            <div>
              <span>03 / Daily timebox</span>
              <fieldset>
                <legend>How much focused time can you protect?</legend>
                {DAILY_OPTIONS.map((minutes) => (
                  <label key={minutes} className={dailyMinutes === minutes ? "is-selected" : undefined}>
                    <input
                      type="radio"
                      name="daily-minutes"
                      value={minutes}
                      checked={dailyMinutes === minutes}
                      onChange={() => setDailyMinutes(minutes)}
                    />
                    <strong>{minutes}</strong><span>min / day</span>
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="forge-setup-summary">
              <span>Your sprint contract</span>
              <p><strong>Finish:</strong> {finishLine.trim() || "Name the Day 7 outcome."}</p>
              <p><strong>Time:</strong> {dailyMinutes * 7} focused minutes across the week.</p>
              <p><strong>Storage:</strong> This browser only.</p>
            </div>

            {submitted && !validation.ok ? (
              <div className="forge-form-alert" role="alert">
                <strong>Make the sprint a little more concrete.</strong>
                <ul>{validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            ) : null}
            {storageError ? <p className="forge-form-alert" role="alert">{storageError}</p> : null}
            {sprintStore.blocked ? (
              <p className="forge-form-alert" role="alert">
                Existing local sprint data could not be read safely. Export or clear it before creating another sprint.
              </p>
            ) : null}

            <button className="forge-button forge-button--primary forge-setup-submit" type="submit" disabled={!sprintStore.ready || sprintStore.blocked}>
              Build my 7-day map <ArrowIcon />
            </button>
            <small>Nothing is uploaded. You can export the proof when you are ready.</small>
          </aside>
        </form>
      </main>
    </ProductShell>
  );
}
