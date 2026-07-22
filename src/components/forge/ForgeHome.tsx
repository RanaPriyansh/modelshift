"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";
import type { ForgePlanContract } from "@/src/lib/forge-planner";

import {
  ForgeKicker,
  ForgeSectionHeading,
  ForgeStatus,
  ForgeTrustLine,
} from "./ForgePrimitives";
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

const WORLD_ROWS = [
  ...PUBLIC_WORLD_CATALOG.map((world) => ({
    eyebrow: `Working ${world.kind} World · v${world.version}`,
    title: world.title,
    description: world.summary,
    detail: `${world.evidenceTier} evidence · ${world.ageModes.includes("under-13") ? "child + grown-up, teen, adult" : "teen + adult"}`,
    href: world.route,
    action: "Open world",
    tone: "ready" as const,
  })),
  {
    eyebrow: "Planned world",
    title: "How money compounds",
    description: "Compare rates, time, fees, and uncertainty before making everyday financial decisions.",
    detail: "Not built yet",
    tone: "planned",
  },
  {
    eyebrow: "Planned world",
    title: "How language carries meaning",
    description: "Trace voice, structure, ambiguity, and interpretation across literature without outsourcing judgment.",
    detail: "Not built yet",
    tone: "planned",
  },
  {
    eyebrow: "Planned world",
    title: "Cells, energy & systems",
    description: "Move between mechanisms, diagrams, and observable consequences in a living system.",
    detail: "Not built yet",
    tone: "planned",
  },
] as const;

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
  const [ageMode, setAgeMode] = useState<string>("teen");
  const [startingPoint, setStartingPoint] = useState<string>("curious");
  const [successShape, setSuccessShape] = useState<string>("explain");
  const [depth, setDepth] = useState<string>("standard");
  const [guardianPresent, setGuardianPresent] = useState(false);
  const [plan, setPlan] = useState<ForgePlanContract | null>(null);
  const [planning, setPlanning] = useState(false);
  const [plannerError, setPlannerError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlanning(true);
    setPlan(null);
    setPlannerError("");

    try {
      const response = await fetch("/api/forge/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          ageMode,
          depth,
          startingPoint,
          successShape,
          guardianManaged: ageMode === "child" && guardianPresent,
          sourceMode: "curated",
        }),
      });
      const contract = (await response.json()) as ForgePlanContract;
      if (!response.ok && contract.contractKind !== "refusal") throw new Error("planner_unavailable");
      setPlan(contract);
    } catch {
      setPlannerError("The path service is unavailable. Your question was not saved; choose a reviewed World below.");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <form className="forge-intake" onSubmit={submit}>
      <label className="forge-question-field" htmlFor="learning-question">
        <span>Your question</span>
        <textarea
          id="learning-question"
          name="question"
          rows={2}
          maxLength={240}
          required
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="I want to understand…"
        />
        <small>{question.length} / 240</small>
      </label>

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
        <ChoiceGroup legend="Depth" name="depth" options={DEPTH_MODES} value={depth} onChange={setDepth} />
      </div>

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

      <div className="forge-intake-actions">
        <button className="forge-primary-action" type="submit" disabled={planning}>
          {planning ? "Checking reviewed paths…" : "Shape my first move"}
          <ForgeArrow />
        </button>
        <a href="#worlds">Or choose a working world</a>
      </div>

      <div className="forge-intake-response" aria-live="polite">
        {plannerError ? <p>{plannerError}</p> : null}
        {plan ? <LearningPlanResult plan={plan} /> : null}
      </div>
    </form>
  );
}

function LearningPlanResult({ plan }: { plan: ForgePlanContract }) {
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
        <ol>
          {plan.exploration.steps.slice(0, 3).map((step) => (
            <li key={step.id}><strong>{step.objective}</strong><small>{step.exitGate}</small></li>
          ))}
        </ol>
        <p className="forge-plan-privacy">Your question was used for this response and was not added to a learner profile.</p>
      </div>
    );
  }

  const route = plan.route.worldId === "world.proportional-reasoning"
    ? `${plan.route.worldRoute}?audience=${plan.request.ageMode === "child" ? "child_with_grown_up" : plan.request.ageMode}`
    : plan.route.worldRoute;
  return (
    <div className="forge-plan-result forge-plan-result--grounded" data-testid="forge-plan-grounded">
      <span>Reviewed Learning Contract</span>
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
      <Link className="forge-primary-action" href={route}>
        Enter reviewed World <ForgeArrow />
      </Link>
      <p className="forge-plan-privacy">The route and sources are authored. Any optional AI rephrase is unverified and cannot change them.</p>
    </div>
  );
}

function WorldCatalog() {
  return (
    <section className="forge-section forge-worlds" id="worlds" aria-labelledby="worlds-title">
      <ForgeSectionHeading
        id="worlds-title"
        label="Honest catalog"
        title="Enter through a world, not a course list."
        description="Four Worlds work end to end across simulation, exact mathematics, AI literacy, and primary-source reasoning. The rest name the intended breadth without pretending the curriculum already exists."
      />

      <div className="forge-world-list">
        {WORLD_ROWS.map((world, index) => (
          <article className={`forge-world-row forge-world-row--${world.tone}`} key={world.title}>
            <span className="forge-world-index">0{index + 1}</span>
            <div className="forge-world-copy">
              <ForgeStatus tone={world.tone === "ready" ? "evidence" : "quiet"}>{world.eyebrow}</ForgeStatus>
              <h3>{world.title}</h3>
              <p>{world.description}</p>
            </div>
            <span className="forge-world-detail">{world.detail}</span>
            {"href" in world ? (
              <Link href={world.href} className="forge-world-link" aria-label={`Open ${world.title} World`}>
                {world.action}
                <ForgeArrow />
              </Link>
            ) : (
              <span className="forge-world-link forge-world-link--disabled">Roadmap only</span>
            )}
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
        <span>Learning contract</span>
        <h2 id="contract-title">
          <em>Learner acts.</em> <i>AI assists.</i> <b>Evidence decides.</b>
        </h2>
      </div>
      <ol>
        <li>
          <span>01</span>
          <div><strong>Commit before explanation</strong><p>Your prediction, question, sketch, or plan comes first.</p></div>
        </li>
        <li>
          <span>02</span>
          <div><strong>Use the smallest useful help</strong><p>AI interprets and supports; it does not own the consequence.</p></div>
        </li>
        <li>
          <span>03</span>
          <div><strong>Cross into a new context</strong><p>Repeating the assisted task is not independent proof.</p></div>
        </li>
        <li>
          <span>04</span>
          <div><strong>Return after time</strong><p>One success stays bounded until retrieval holds up later.</p></div>
        </li>
      </ol>
    </section>
  );
}

function FoundationsAndFrontier() {
  return (
    <section className="forge-section forge-foundations" aria-labelledby="foundation-title">
      <ForgeSectionHeading
        id="foundation-title"
        label="Shared depth, personal direction"
        title="A common foundation. A learner-owned frontier."
        description="Personalization changes the entry point, pacing, language, and examples—not the standard of evidence."
      />
      <div className="forge-two-rails">
        <article>
          <span>Common foundations</span>
          <h3>Knowledge that keeps choices open</h3>
          <ul>
            <li><strong>Language & explanation</strong><span>Read closely, make claims, revise clearly.</span></li>
            <li><strong>Quantitative reasoning</strong><span>Estimate, model, compare, and test.</span></li>
            <li><strong>Science & systems</strong><span>Follow causes across scales and representations.</span></li>
            <li><strong>History & civic knowledge</strong><span>Locate ideas in people, institutions, and consequences.</span></li>
            <li><strong>Making & digital fluency</strong><span>Turn understanding into inspectable work.</span></li>
          </ul>
        </article>
        <article className="forge-frontier-rail">
          <span>Learner frontier</span>
          <h3>Questions only you can choose</h3>
          <ul>
            <li><strong>Your unresolved questions</strong><span>Curiosity is saved as an edge, not auto-played into a lesson.</span></li>
            <li><strong>Cross-domain connections</strong><span>Follow an idea through science, culture, craft, and consequence.</span></li>
            <li><strong>Deep projects</strong><span>Compile an ambition into the capabilities it genuinely requires.</span></li>
            <li><strong>Experiments & fieldwork</strong><span>Observe, measure, build, and revise outside the screen.</span></li>
            <li><strong>Research & creation</strong><span>Produce claims and artifacts that can survive critique.</span></li>
          </ul>
        </article>
      </div>
      <Link className="forge-secondary-action forge-foundations-link" href="/pathways">
        See current availability and gaps
        <ForgeArrow />
      </Link>
    </section>
  );
}

function Continuity() {
  return (
    <section className="forge-section forge-continuity" aria-labelledby="continuity-title">
      <ForgeSectionHeading
        id="continuity-title"
        label="Continuity without streaks"
        title="Continue the question. Return for proof."
        description="This foundation has no account or cloud sync. Bounded proof outcomes and return dates stay privately in this browser."
      />
      <div className="forge-continuity-actions">
        <Link href="/learn/force-and-motion">
          <span>Continue a working world</span>
          <strong>Force & motion</strong>
          <small>A fresh session starts; completed proof remains local.</small>
          <ForgeArrow />
        </Link>
        <Link href="/trail">
          <span>Return proof</span>
          <strong>See the Trail contract</strong>
          <small>Dates are scheduled; reminders and return challenges remain planned.</small>
          <ForgeArrow />
        </Link>
        <Link href="/evidence">
          <span>Proof record</span>
          <strong>Open your local evidence</strong>
          <small>Export, select for an educator copy, or delete it.</small>
          <ForgeArrow />
        </Link>
      </div>
    </section>
  );
}

function ProjectsAndPeople() {
  return (
    <section className="forge-section forge-projects" aria-labelledby="projects-title">
      <ForgeSectionHeading
        id="projects-title"
        label="Beyond the screen"
        title="Projects turn knowledge into work. People make it matter."
        description="AI can help prepare a project or a critique. It cannot manufacture community legitimacy, mentorship, friendship, or care."
      />
      <div className="forge-projects-layout">
        <article>
          <span>Project compiler · planned</span>
          <h3>“Build a low-cost air-quality monitor.”</h3>
          <p>Break one ambition into electronics, measurement, calibration, uncertainty, documentation, and a safe field protocol.</p>
          <dl>
            <div><dt>Foundation</dt><dd>Circuits, units, data quality</dd></div>
            <div><dt>Artifact</dt><dd>Working monitor + calibration note</dd></div>
            <div><dt>Proof</dt><dd>Explain one failure and redesign choice</dd></div>
          </dl>
        </article>
        <aside>
          <span>People layer · planned</span>
          <h3>Human attention stays scarce—and human.</h3>
          <p>Future mentor and peer interactions should be short, prepared by evidence, safeguarded, and centered on critique or real contribution.</p>
          <ul>
            <li>No open social feed</li>
            <li>No unverified mentor marketplace</li>
            <li>No AI pretending to be a friend</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

export function ForgeHome() {
  return (
    <ForgeShell active="home">
      <main id="forge-main" tabIndex={-1}>
        <section className="forge-hero" aria-labelledby="forge-question">
          <div className="forge-hero-heading">
            <ForgeKicker>Start with a question, not a course.</ForgeKicker>
            <h1 id="forge-question">What do you want to understand?</h1>
            <p>FORGE builds from your present model toward knowledge you can use—and asks for proof after the help leaves.</p>
          </div>
          <LearningIntake />
          <div className="forge-loop-line" aria-label="Learning loop: question, model, experience, rebuild, prove alone, return">
            <span>Question</span><i /><span>Current model</span><i /><span>Experience</span><i /><span>Rebuild</span><i /><span>Prove alone</span><i /><span>Return</span>
          </div>
        </section>
        <WorldCatalog />
        <Continuity />
        <LearningContract />
        <FoundationsAndFrontier />
        <ProjectsAndPeople />
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
      <div><strong>FORGE</strong><span>Learning OS</span></div>
      <p>A working prototype. No account, diagnosis, grade, or claim of mastery.</p>
      <ForgeTrustLine />
    </>
  );
}
