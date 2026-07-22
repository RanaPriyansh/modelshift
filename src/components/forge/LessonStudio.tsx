"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  LESSON_PROVIDER_CAPABILITIES,
  LESSON_PROVIDER_DEFAULTS,
  lessonProviderSchema,
  lessonStudioResponseSchema,
  type LessonProvider,
  type LessonStudioResponse,
} from "@/src/lib/lesson-studio/schema";

const PROVIDER_LABELS: Readonly<Record<LessonProvider, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

const ERROR_FALLBACK = "FORGE could not generate a valid draft. Your key was cleared; review the fields and try again.";

type ErrorEnvelope = { error?: { message?: unknown } };

export function LessonStudio() {
  const [provider, setProvider] = useState<LessonProvider>("openai");
  const [model, setModel] = useState(LESSON_PROVIDER_DEFAULTS.openai);
  const [apiKey, setApiKey] = useState("");
  const [question, setQuestion] = useState("How can we tell whether a historical photograph proves a claim about everyday life?");
  const [ageMode, setAgeMode] = useState<"child" | "teen" | "adult">("teen");
  const [guardianManaged, setGuardianManaged] = useState(false);
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [startingPoint, setStartingPoint] = useState("");
  const [successShape, setSuccessShape] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [result, setResult] = useState<LessonStudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const providerNote = useMemo(() => {
    return `Paste an approved ${PROVIDER_LABELS[provider]} key for this one request. FORGE clears the field after the provider responds and never uses a deployment-managed key.`;
  }, [provider]);

  function changeProvider(value: string) {
    const parsed = lessonProviderSchema.safeParse(value);
    if (!parsed.success) return;
    setProvider(parsed.data);
    setModel(LESSON_PROVIDER_DEFAULTS[parsed.data]);
    setApiKey("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/forge/lesson-draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          provider,
          model,
          apiKey: apiKey.trim(),
          authoringMode: "adult-authoring-no-child-data",
          question,
          ageMode,
          guardianManaged: ageMode === "child" ? guardianManaged : false,
          depth,
          startingPoint,
          successShape,
          sourceContext,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (payload as ErrorEnvelope | null)?.error?.message;
        throw new Error(typeof message === "string" ? message : ERROR_FALLBACK);
      }
      const parsed = lessonStudioResponseSchema.safeParse(payload);
      if (!parsed.success) throw new Error(ERROR_FALLBACK);
      setResult(parsed.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : ERROR_FALLBACK);
    } finally {
      setApiKey("");
      setPending(false);
    }
  }

  return (
    <div className="lesson-studio-layout">
      <form className="lesson-studio-form" onSubmit={submit} aria-describedby="lesson-studio-boundary">
        <fieldset className="lesson-studio-connection">
          <legend>1 · Adult author connection</legend>
          <label>
            Provider
            <select value={provider} onChange={(event) => changeProvider(event.target.value)}>
              {lessonProviderSchema.options.map((value) => (
                <option value={value} key={value}>{PROVIDER_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label>
            Model ID
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              {LESSON_PROVIDER_CAPABILITIES[provider].models.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>{candidate.id}</option>
              ))}
            </select>
          </label>
          <label>
            API key <span aria-hidden="true">· required</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="new-password"
              minLength={10}
              maxLength={512}
              required
              placeholder={`Paste ${PROVIDER_LABELS[provider]} key`}
              aria-describedby="lesson-key-note"
            />
          </label>
          <p id="lesson-key-note">{providerNote} It reaches FORGE&apos;s fixed provider adapter, is not written to browser storage, logs, URLs, or drafts, and is never returned.</p>
        </fieldset>

        <fieldset>
          <legend>2 · Give the compiler a learning question</legend>
          <label className="lesson-studio-wide">
            What should someone understand?
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={300} required rows={4} />
          </label>
          <label>
            Target lesson audience
            <select value={ageMode} onChange={(event) => setAgeMode(event.target.value as typeof ageMode)}>
              <option value="child">Child + grown-up</option>
              <option value="teen">Teen</option>
              <option value="adult">Adult</option>
            </select>
          </label>
          <label>
            Depth
            <select value={depth} onChange={(event) => setDepth(event.target.value as typeof depth)}>
              <option value="quick">Quick orientation</option>
              <option value="standard">Standard lesson</option>
              <option value="deep">Deep investigation</option>
            </select>
          </label>
          {ageMode === "child" ? (
            <label className="lesson-studio-check lesson-studio-wide">
              <input type="checkbox" checked={guardianManaged} onChange={(event) => setGuardianManaged(event.target.checked)} required />
              This child-targeted draft requires grown-up-managed use if it is later reviewed and used.
            </label>
          ) : null}
          <label>
            Starting point <span>· optional</span>
            <textarea value={startingPoint} onChange={(event) => setStartingPoint(event.target.value)} maxLength={300} rows={3} placeholder="The author's initial model of the target audience" />
          </label>
          <label>
            Useful outcome <span>· optional</span>
            <textarea value={successShape} onChange={(event) => setSuccessShape(event.target.value)} maxLength={300} rows={3} placeholder="What the completed lesson should let someone explain, make, decide, or do" />
          </label>
          <label className="lesson-studio-wide">
            Source context <span>· optional, unverified</span>
            <textarea value={sourceContext} onChange={(event) => setSourceContext(event.target.value)} maxLength={3000} rows={5} placeholder="Paste notes or source excerpts. The model must treat them as untrusted context and list what still needs review." />
          </label>
        </fieldset>

        <button className="lesson-studio-generate" type="submit" disabled={pending}>
          {pending ? "Compiling a bounded draft…" : "Generate unverified lesson draft"}
        </button>
        <p className="lesson-studio-boundary" id="lesson-studio-boundary">
          This is an adult authoring surface: do not submit child learner data. AI can propose a lesson instrument, but it cannot publish a World, verify its own claims, grade cold proof, or call one response mastery.
        </p>
        {error ? <p className="lesson-studio-error" role="alert">{error}</p> : null}
      </form>

      <section className={`lesson-studio-output${result ? " has-draft" : ""}`} aria-live="polite" aria-busy={pending}>
        {result ? <LessonDraftView result={result} onDiscard={() => setResult(null)} /> : (
          <div className="lesson-studio-empty">
            <span>Compiler output</span>
            <h2>The smallest instrument needed to test a model will assemble here.</h2>
            <ol>
              <li>Opening phenomenon</li>
              <li>Two plausible readings</li>
              <li>Separating test</li>
              <li>Reconstruction and cold transfer</li>
              <li>Source-review needs and bounded claims</li>
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}

function LessonDraftView({ result, onDiscard }: { result: LessonStudioResponse; onDiscard: () => void }) {
  const { draft } = result;
  return (
    <article className="lesson-draft">
      <header>
        <div><span>Unverified lesson draft · draft state</span><span>{PROVIDER_LABELS[result.provenance.provider]} · {result.provenance.model}</span></div>
        <h2>{draft.title}</h2>
        <p>{draft.learnerGoal}</p>
      </header>

      <section className="lesson-draft-phenomenon">
        <span>Claim · begin with an event</span>
        <p>{draft.phenomenon.opening}</p>
        <h3>{draft.phenomenon.question}</h3>
        <strong>{draft.commitmentPrompt}</strong>
      </section>

      <section className="lesson-draft-readings">
        <span>Compiler · two plausible readings</span>
        <div>
          {draft.plausibleReadings.map((reading, index) => (
            <article key={`${reading.label}-${index}`}>
              <small>Reading {index + 1}</small>
              <h3>{reading.label}</h3>
              <p>{reading.prediction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lesson-draft-test">
        <span>Separating test</span>
        <h3>{draft.separatingTest.setup}</h3>
        <p>{draft.separatingTest.whyItSeparates}</p>
      </section>

      <section className="lesson-draft-explanation">
        <span>Reconstruction</span>
        {draft.explanationSections.map((section, index) => (
          <article key={`${section.heading}-${index}`}>
            <small>{String(index + 1).padStart(2, "0")}</small>
            <div><h3>{section.heading}</h3><p>{section.explanation}</p><strong>{section.checkQuestion}</strong></div>
          </article>
        ))}
        <blockquote>{draft.reconstructionPrompt}</blockquote>
      </section>

      <section className="lesson-draft-proof">
        <span>AI withdraws · unfamiliar transfer</span>
        <h3>{draft.coldTransfer.prompt}</h3>
        <dl>
          <div><dt>Could demonstrate</dt><dd>{draft.coldTransfer.successEvidence}</dd></div>
          <div><dt>Still untested</dt><dd>{draft.coldTransfer.remainsUntested}</dd></div>
        </dl>
      </section>

      <section className="lesson-draft-review">
        <div>
          <h3>Source review required</h3>
          <ul>{draft.sourceNeeds.map((need, index) => <li key={index}><strong>{need.claim}</strong><span>{need.sourceType}</span></li>)}</ul>
        </div>
        <div>
          <h3>Safety and limits</h3>
          <ul>{[...draft.safetyNotes, ...draft.draftLimitations].map((note, index) => <li key={index}>{note}</li>)}</ul>
        </div>
      </section>

      <section className="lesson-draft-workflow">
        <span>Review workflow · not publication</span>
        <h3>Generation → critique → source plan → revision</h3>
        <p>
          The generated draft has a deterministic critique and unresolved source plan. Named human factual, pedagogy, access, and proof reviews are still required. Even an approved package is not a published World.
        </p>
        <dl>
          <div><dt>Draft reference</dt><dd>{result.pipeline.generation.versionRef}</dd></div>
          <div><dt>Source plan</dt><dd>{result.pipeline.sourcePlan.items.length} unresolved source need{result.pipeline.sourcePlan.items.length === 1 ? "" : "s"}</dd></div>
          <div><dt>Request limits</dt><dd>{result.provenance.budget.timeoutMs / 1000}s · {result.provenance.budget.maxOutputTokens.toLocaleString()} output tokens · ${(result.provenance.budget.maxEstimatedCostMicros / 1_000_000).toFixed(2)} maximum estimate</dd></div>
        </dl>
      </section>

      <footer>
        <p>{result.claimBoundary}</p>
        <p>Correlation {result.provenance.correlationId}. This identifier contains no learner text, source text, or key.</p>
        <button type="button" onClick={onDiscard}>Discard draft</button>
      </footer>
    </article>
  );
}
