"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";
import type { ForgePlanContract } from "@/src/lib/forge-planner";

import {
  ForgeKicker,
  ForgeSectionHeading,
  ForgeStatus,
  ForgeTrustLine,
} from "./ForgePrimitives";
import { LearningMapPreview } from "./LearningMapPreview";
import { ForgeArrow, ForgeShell } from "./ForgeShell";

const AGE_MODES = [
  { id: "child", label: "Child + grown-up", note: "Shared guidance" },
  { id: "teen", label: "Teen", note: "Growing independence" },
  { id: "adult", label: "Adult", note: "Self-directed" },
] as const;

const STARTING_POINTS = [
  { id: "curious", label: "I’m curious", note: "Begin with the phenomenon" },
  { id: "familiar", label: "I’ve met this", note: "Find the fragile part" },
  { id: "stuck", label: "I’m stuck", note: "Repair the blocker" },
] as const;

const SUCCESS_SHAPES = [
  { id: "explain", label: "Explain it", note: "Build a causal model" },
  { id: "use", label: "Use it", note: "Transfer into a new case" },
  { id: "build", label: "Build with it", note: "Turn knowledge into work" },
] as const;

const DEPTH_MODES = [
  { id: "quick", label: "First look", note: "Find the central distinction" },
  { id: "standard", label: "Working knowledge", note: "Build and transfer the model" },
  { id: "deep", label: "Deep study", note: "Trace assumptions and limits" },
] as const;

const TIME_OPTIONS = [
  { id: "15_min", label: "15 minutes" },
  { id: "45_min", label: "45 minutes" },
  { id: "2_hours", label: "Up to 2 hours" },
  { id: "ongoing", label: "An ongoing path" },
] as const;

const MODALITY_OPTIONS = [
  { id: "text", label: "Text" },
  { id: "video", label: "Video" },
  { id: "visual", label: "Visuals" },
  { id: "audio", label: "Audio" },
  { id: "hands_on", label: "Hands-on" },
  { id: "low_bandwidth", label: "Low bandwidth" },
  { id: "screen_reader", label: "Screen reader" },
] as const;

const EXAMPLE_GOALS = [
  {
    label: "Understand why motion continues",
    question: "Why can an object keep moving after the push ends?",
    outcome: "Predict and explain an unfamiliar motion graph without hints.",
  },
  {
    label: "Judge an AI claim",
    question: "How can I tell whether an AI-generated factual claim is actually supported?",
    outcome: "Trace one claim to sources and state what remains uncertain.",
  },
  {
    label: "Reason with ratios",
    question: "How do I compare two mixtures without being fooled by the raw amounts?",
    outcome: "Use proportional reasoning on a new comparison without a worked example.",
  },
] as const;

const PLANNER_REQUEST_TIMEOUT_MS = 8_000;

const WORLD_ROWS = PUBLIC_WORLD_CATALOG.map((world) => ({
  eyebrow: `Working ${world.kind} World · v${world.version}`,
  title: world.title,
  description: world.summary,
  detail: `${world.evidenceTier} evidence · ${world.ageModes.includes("under-13") ? "child + grown-up, teen, adult" : "teen + adult"}`,
  href: world.route,
  action: "Open path",
  tone: "ready" as const,
}));

function ChoiceGroup({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ id: string; label: string; note: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="forge-choice-group">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option.id} className={value === option.id ? "is-selected" : undefined}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <strong>{option.label}</strong>
            <small>{option.note}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function LearningIntake() {
  const [question, setQuestion] = useState("");
  const [ageMode, setAgeMode] = useState<string>("adult");
  const [startingPoint, setStartingPoint] = useState<string>("curious");
  const [successShape, setSuccessShape] = useState<string>("explain");
  const [depth, setDepth] = useState<string>("standard");
  const [currentKnowledge, setCurrentKnowledge] = useState("");
  const [practicalOutcome, setPracticalOutcome] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("45_min");
  const [modalityNeeds, setModalityNeeds] = useState<string[]>(["text", "visual"]);
  const [constraints, setConstraints] = useState("");
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [plan, setPlan] = useState<ForgePlanContract | null>(null);
  const [plannedQuestion, setPlannedQuestion] = useState("");
  const [planning, setPlanning] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const activePlannerRequestRef = useRef<AbortController | null>(null);
  const questionRef = useRef<HTMLTextAreaElement | null>(null);
  const personalizationRef = useRef<HTMLDetailsElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    // At the explicit 320px accessibility floor, expose all controls rather than
    // placing a long form behind a second nested interaction.
    if (window.innerWidth <= 320 && personalizationRef.current) {
      personalizationRef.current.open = true;
    }
    return () => {
      mountedRef.current = false;
      activePlannerRequestRef.current?.abort();
      activePlannerRequestRef.current = null;
    };
  }, []);

  function updateQuestion(nextQuestion: string) {
    setQuestion(nextQuestion);
    setPlannerError("");
  }

  function chooseExample(example: (typeof EXAMPLE_GOALS)[number]) {
    updateQuestion(example.question);
    setPracticalOutcome(example.outcome);
    questionRef.current?.focus();
  }

  async function requestPlan() {
    const submittedQuestion = question.trim();
    activePlannerRequestRef.current?.abort();
    const controller = new AbortController();
    activePlannerRequestRef.current = controller;
    const timeout = window.setTimeout(() => {
      if (activePlannerRequestRef.current !== controller) return;
      controller.abort();
      activePlannerRequestRef.current = null;
      if (!mountedRef.current) return;
      setPlanning(false);
      setPlannerError("The path request took too long. Your question was not saved. Try again or choose a reviewed path below.");
    }, PLANNER_REQUEST_TIMEOUT_MS);

    setPlanning(true);
    setPlan(null);
    setPlannerError("");

    try {
      const response = await fetch("/api/forge/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: submittedQuestion,
          ageMode,
          depth,
          startingPoint,
          successShape,
          currentKnowledge,
          practicalOutcome,
          timeAvailable,
          modalityNeeds,
          constraints,
          guardianManaged: ageMode === "child" && guardianPresent,
          sourceMode: "curated",
        }),
        signal: controller.signal,
      });
      const contract = (await response.json()) as ForgePlanContract;
      if (!response.ok && contract.contractKind !== "refusal") throw new Error("planner_unavailable");
      if (!mountedRef.current || activePlannerRequestRef.current !== controller || controller.signal.aborted) return;
      setPlannedQuestion(submittedQuestion);
      setPlan(contract);
    } catch {
      if (!mountedRef.current || activePlannerRequestRef.current !== controller || controller.signal.aborted) return;
      setPlannerError("The path service is unavailable. Your question was not saved; choose a reviewed path below.");
    } finally {
      window.clearTimeout(timeout);
      if (activePlannerRequestRef.current === controller) activePlannerRequestRef.current = null;
      if (mountedRef.current && !controller.signal.aborted) setPlanning(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestPlan();
  }

  return (
    <form className="forge-intake forge-intake--focused" onSubmit={submit}>
      <label className="forge-question-field" htmlFor="learning-question">
        <span>Your question</span>
        <textarea
          ref={questionRef}
          id="learning-question"
          name="question"
          rows={2}
          maxLength={240}
          required
          value={question}
          onChange={(event) => updateQuestion(event.target.value)}
          placeholder="I want to understand, decide, or build…"
        />
        <small>{question.length} / 240</small>
      </label>

      <div className="forge-intake-shortcuts" aria-label="Example goals">
        <span>Try a real goal</span>
        <div>
          {EXAMPLE_GOALS.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => chooseExample(example)}
              aria-label={`Use example: ${example.label}`}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <div className="forge-intake-actions">
        <button className="forge-primary-action" type="submit" disabled={planning}>
          {planning ? "Checking reviewed paths…" : "Shape my first move"}
          <ForgeArrow />
        </button>
        <a href="#worlds">Explore working paths</a>
      </div>

      <details ref={personalizationRef} className="forge-intake-details">
        <summary>
          <span>Personalize the path</span>
          <small>Optional · starting point, outcome, time, and access needs</small>
        </summary>

        <div className="forge-intake-details__body">
          <div className="forge-intake-choices">
            <ChoiceGroup
              legend="Age mode"
              name="age-mode"
              options={AGE_MODES}
              value={ageMode}
              onChange={(value) => {
                setAgeMode(value);
                if (value !== "child") setGuardianPresent(false);
              }}
            />
            <ChoiceGroup
              legend="Starting point"
              name="starting-point"
              options={STARTING_POINTS}
              value={startingPoint}
              onChange={setStartingPoint}
            />
            <ChoiceGroup
              legend="Success looks like"
              name="success-shape"
              options={SUCCESS_SHAPES}
              value={successShape}
              onChange={setSuccessShape}
            />
            <ChoiceGroup
              legend="Depth"
              name="depth"
              options={DEPTH_MODES}
              value={depth}
              onChange={setDepth}
            />
          </div>

          <div className="forge-intake-context">
            <label>
              <span>What can you already do?</span>
              <textarea
                rows={2}
                maxLength={280}
                value={currentKnowledge}
                onChange={(event) => setCurrentKnowledge(event.target.value)}
                placeholder="Optional: name relevant knowledge, experience, or the point where you get stuck."
              />
              <small>{currentKnowledge.length} / 280</small>
            </label>
            <label>
              <span>What do you want to do or make?</span>
              <textarea
                rows={2}
                maxLength={280}
                value={practicalOutcome}
                onChange={(event) => setPracticalOutcome(event.target.value)}
                placeholder="Optional: explain a decision, build an artifact, solve a real problem, or perform a skill."
              />
              <small>{practicalOutcome.length} / 280</small>
            </label>
            <label className="forge-time-field">
              <span>Time available now</span>
              <select value={timeAvailable} onChange={(event) => setTimeAvailable(event.target.value)}>
                {TIME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Constraints to respect</span>
              <textarea
                rows={2}
                maxLength={280}
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="Optional: equipment, cost, language, mobility, location, bandwidth, or deadline."
              />
              <small>{constraints.length} / 280</small>
            </label>
          </div>

          <fieldset className="forge-modality-group">
            <legend>Representations that help</legend>
            <p>Choose one to four. Access needs remain available during independent proof.</p>
            <div>
              {MODALITY_OPTIONS.map((option) => {
                const selected = modalityNeeds.includes(option.id);
                const disabled = !selected && modalityNeeds.length >= 4;
                return (
                  <label
                    key={option.id}
                    className={[selected ? "is-selected" : "", disabled ? "is-disabled" : ""].filter(Boolean).join(" ") || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => {
                        setModalityNeeds((current) => {
                          if (current.includes(option.id)) {
                            return current.length === 1 ? current : current.filter((id) => id !== option.id);
                          }
                          return current.length >= 4 ? current : [...current, option.id];
                        });
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            <small>
              {modalityNeeds.length} selected{modalityNeeds.length === 4 ? " · limit reached" : ""} · held only for this planning response
            </small>
          </fieldset>
        </div>
      </details>

      {ageMode === "child" ? (
        <label className="forge-guardian-check">
          <input
            type="checkbox"
            required
            checked={guardianPresent}
            onChange={(event) => setGuardianPresent(event.target.checked)}
          />
          <span>
            <strong>A grown-up is here and managing this session.</strong>
            <small>This local confirmation is not verified identity, consent infrastructure, or a child-safety approval.</small>
          </span>
        </label>
      ) : null}

      <div className="forge-intake-response" aria-live="polite">
        {plannerError ? (
          <div role="alert">
            <p>{plannerError}</p>
            <button disabled={planning} onClick={() => { void requestPlan(); }} type="button">Try again</button>
          </div>
        ) : null}
        {plan ? <LearningPlanResult learnerQuestion={plannedQuestion} plan={plan} /> : null}
      </div>
    </form>
  );
}

function LearningPlanResult({
  learnerQuestion,
  plan,
}: {
  learnerQuestion: string;
  plan: ForgePlanContract;
}) {
  if (plan.contractKind === "refusal") {
    return (
      <div className="forge-plan-result forge-plan-result--restricted" data-testid="forge-plan-refusal">
        <span>Restricted path</span>
        <h3>This request needs a different boundary.</h3>
        <p>{plan.message}</p>
      </div>
    );
  }

  if (plan.contractKind === "exploratory_source_plan") {
    return (
      <div className="forge-plan-result forge-plan-result--exploratory" data-testid="forge-plan-exploratory">
        <span>Exploratory · not yet verified</span>
        <h3>{plan.exploration.title}</h3>
        <p>{plan.grounding.claimBoundary}</p>
        <LearningMapPreview
          key={`${learnerQuestion}:${plan.exploration.steps.map((step) => step.id).join(",")}`}
          learnerQuestion={learnerQuestion}
          plan={plan}
        />
        <p className="forge-plan-privacy">Your goal was used for this response and was not added to a learner profile.</p>
      </div>
    );
  }

  const route = plan.route.worldId === "world.proportional-reasoning"
    ? `${plan.route.worldRoute}?audience=${plan.request.ageMode === "child" ? "child_with_grown_up" : plan.request.ageMode}`
    : plan.route.worldRoute;

  return (
    <div className="forge-plan-result forge-plan-result--grounded" data-testid="forge-plan-grounded">
      <span>Current working World route</span>
      <h3>{plan.learning.title}</h3>
      <p>{plan.learning.objective}</p>
      <ol>
        {plan.learning.milestones.map((milestone) => (
          <li key={milestone.id}><strong>{milestone.title}</strong><small>{milestone.objective}</small></li>
        ))}
      </ol>
      <div className="forge-plan-sources">
        <span>How this path knows</span>
        {plan.grounding.sources.map((source) => (
          <a key={source.id} href={source.locator} target="_blank" rel="noreferrer">{source.title}</a>
        ))}
      </div>
      <LearningMapPreview
        key={`${learnerQuestion}:${plan.route.worldId}:${plan.route.worldVersion}`}
        learnerQuestion={learnerQuestion}
        plan={plan}
        routeHref={route}
      />
      <p className="forge-plan-privacy">
        This is a bounded working path, not a universal curriculum or claim of mastery.
        Its authored sources and route cannot be changed by an optional AI rephrase.
      </p>
    </div>
  );
}

function WorldCatalog() {
  return (
    <section className="forge-section forge-worlds" id="worlds" aria-labelledby="worlds-title">
      <ForgeSectionHeading
        id="worlds-title"
        label="Working paths"
        title="Begin with something Forge can already prove."
        description="These four authored paths are usable now. Each asks you to act, gives bounded help, removes that help, and records only the evidence the task can honestly support."
      />

      <div className="forge-world-list">
        {WORLD_ROWS.map((world, index) => (
          <article className={`forge-world-row forge-world-row--${world.tone}`} key={world.title}>
            <span className="forge-world-index">0{index + 1}</span>
            <div className="forge-world-copy">
              <ForgeStatus tone="evidence">{world.eyebrow}</ForgeStatus>
              <h3>{world.title}</h3>
              <p>{world.description}</p>
            </div>
            <span className="forge-world-detail">{world.detail}</span>
            <Link href={world.href} className="forge-world-link" aria-label={`Open ${world.title} World`}>
              {world.action}
              <ForgeArrow />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningContract() {
  return (
    <section className="forge-contract" aria-labelledby="contract-title">
      <div className="forge-contract-statement">
        <span>The Forge method</span>
        <h2 id="contract-title">
          <em>Goal becomes path.</em> <i>Work builds understanding.</i> <b>Proof survives the help.</b>
        </h2>
      </div>
      <ol>
        <li>
          <span>01</span>
          <div><strong>Name the real outcome</strong><p>Start with what you want to understand, decide, make, or perform—not a course category.</p></div>
        </li>
        <li>
          <span>02</span>
          <div><strong>Approve the path</strong><p>Inspect the route, sources, constraints, and gaps before Forge activates it.</p></div>
        </li>
        <li>
          <span>03</span>
          <div><strong>Work with bounded help</strong><p>Predict, explain, test, build, and revise. AI supports the work; it does not own the consequence.</p></div>
        </li>
        <li>
          <span>04</span>
          <div><strong>Prove it without help</strong><p>Transfer into a changed problem after assistance leaves. Evidence stays narrow and inspectable.</p></div>
        </li>
      </ol>
    </section>
  );
}

export function ForgeHome() {
  return (
    <ForgeShell active="home">
      <main id="forge-main" tabIndex={-1}>
        <section className="forge-hero forge-hero--focused" aria-labelledby="forge-question">
          <div className="forge-hero-heading">
            <ForgeKicker>Goal → path → work → proof</ForgeKicker>
            <h1 id="forge-question">What do you want to understand?</h1>
            <p>
              Forge builds an editable path, helps only where needed, then removes the help
              so you can see what is actually yours.
            </p>
          </div>
          <LearningIntake />
          <div className="forge-loop-line forge-loop-line--focused" aria-label="Forge loop: goal, path, work, proof">
            <span>Goal</span><i /><span>Path</span><i /><span>Work</span><i /><span>Proof</span>
          </div>
        </section>
        <WorldCatalog />
        <LearningContract />
      </main>
      <footer className="forge-footer">
        <BrandFooter />
      </footer>
    </ForgeShell>
  );
}

function BrandFooter() {
  return (
    <>
      <div><strong>FORGE</strong><span>Goal to proof</span></div>
      <p>An evolving learning system. No required account, diagnosis, grade, or claim of mastery.</p>
      <ForgeTrustLine />
    </>
  );
}
