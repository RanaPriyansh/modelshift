"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ArrowIcon } from "./OrientFrame";
import styles from "./orient.module.css";

type FlowStep =
  | "goal"
  | "clarify"
  | "starting"
  | "constraints"
  | "plan";

type ChoiceOption = {
  readonly id: string;
  readonly label: string;
  readonly note: string;
};

type PreviewStep = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tone: "reviewed" | "candidate" | "gap";
  readonly status: string;
  readonly optional?: boolean;
};

const FLOW_STEPS: ReadonlyArray<FlowStep> = [
  "goal",
  "clarify",
  "starting",
  "constraints",
  "plan",
];

const EXAMPLE_GOALS = [
  "I want to become AI-literate.",
  "I want to understand politics.",
  "I want to think like an engineer.",
  "I am not sure what I should study.",
] as const;

const AI_DIRECTIONS: ReadonlyArray<ChoiceOption> = [
  {
    id: "use",
    label: "Use AI more thoughtfully in work and study",
    note: "Focus on judgment, verification, and responsible use.",
  },
  {
    id: "understand",
    label: "Understand how modern AI systems work",
    note: "Build a conceptual model before adding technical depth.",
  },
  {
    id: "build",
    label: "Build AI applications",
    note: "Connect foundations to software and a real artifact.",
  },
  {
    id: "impacts",
    label: "Evaluate AI claims and social effects",
    note: "Trace evidence, limits, incentives, and consequences.",
  },
  {
    id: "combined",
    label: "Combine several of these carefully",
    note: "Begin with reviewed foundations; keep later coverage visible.",
  },
  {
    id: "custom",
    label: "Name a different direction",
    note: "Use your own words.",
  },
];

const GENERAL_DIRECTIONS: ReadonlyArray<ChoiceOption> = [
  {
    id: "understand",
    label: "Understand the foundations",
    note: "Build a reliable mental model before moving outward.",
  },
  {
    id: "use",
    label: "Use this in a real decision or situation",
    note: "Connect the idea to meaningful action.",
  },
  {
    id: "build",
    label: "Make or complete something",
    note: "Let a project reveal the capabilities the goal requires.",
  },
  {
    id: "evaluate",
    label: "Evaluate claims and sources",
    note: "Learn what the available evidence can and cannot support.",
  },
  {
    id: "custom",
    label: "Name a different direction",
    note: "Use your own words.",
  },
];

const STARTING_POINTS: ReadonlyArray<ChoiceOption> = [
  {
    id: "new",
    label: "This is new to me",
    note: "Start with the essential distinctions and vocabulary.",
  },
  {
    id: "familiar",
    label: "I know some of the basics",
    note: "Find the gaps and turn familiarity into usable understanding.",
  },
  {
    id: "using",
    label: "I already use this",
    note: "Strengthen judgment, explanation, and transfer.",
  },
  {
    id: "experienced",
    label: "I have substantial experience",
    note: "Begin with a demanding question and inspect what remains open.",
  },
];

const TIME_OPTIONS: ReadonlyArray<ChoiceOption> = [
  {
    id: "two",
    label: "About 2 hours each week",
    note: "A light path with one focused action at a time.",
  },
  {
    id: "four",
    label: "About 4 hours each week",
    note: "A steady path with study and active practice.",
  },
  {
    id: "six",
    label: "6 or more hours each week",
    note: "Room for deeper study and project work.",
  },
  {
    id: "uncertain",
    label: "My availability changes",
    note: "Keep the next action small and let the pace remain editable.",
  },
];

function isAiLiteracyGoal(goal: string) {
  return /\b(ai|artificial intelligence|machine learning|language model|chatgpt)\b/i.test(
    goal,
  );
}
function optionLabel(options: ReadonlyArray<ChoiceOption>, id: string) {
  return options.find((option) => option.id === id)?.label ?? "";
}

function ChoiceList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<ChoiceOption>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.choiceList}>
      {options.map((option) => (
        <label
          className={styles.choice}
          data-selected={value === option.id}
          key={option.id}
        >
          <input
            checked={value === option.id}
            name={name}
            onChange={() => onChange(option.id)}
            type="radio"
            value={option.id}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.note}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

export function OnboardingFlow({ initialGoal = "" }: { initialGoal?: string }) {
  const safeInitialGoal = initialGoal.trim().slice(0, 500);
  const [step, setStep] = useState<FlowStep>("goal");
  const [goal, setGoal] = useState(safeInitialGoal);
  const [direction, setDirection] = useState("");
  const [customDirection, setCustomDirection] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [weeklyTime, setWeeklyTime] = useState("");
  const [constraints, setConstraints] = useState("");
  const [pathTitle, setPathTitle] = useState("");
  const [openQuestion, setOpenQuestion] = useState(
    "When should I trust a model-generated claim?",
  );
  const [includedCandidates, setIncludedCandidates] = useState<
    Record<string, boolean>
  >({
    "model-limits": true,
    "project-audit": true,
  });
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  const aiGoal = isAiLiteracyGoal(goal);
  const directionOptions = aiGoal ? AI_DIRECTIONS : GENERAL_DIRECTIONS;
  const currentStepIndex = FLOW_STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / FLOW_STEPS.length) * 100;
  const defaultPathTitle = aiGoal
    ? "A careful first route toward AI literacy"
    : "A first route from question to capability";
  const directionSummary =
    direction === "custom"
      ? customDirection
      : optionLabel(directionOptions, direction);

  const planSteps = useMemo<ReadonlyArray<PreviewStep>>(() => {
    if (!aiGoal) {
      return [
        {
          id: "orient",
          title: "Clarify the capability and starting model",
          description:
            "Keep the learner’s words, desired outcome, and constraints visible before routing.",
          tone: "reviewed",
          status: "Available orientation · no evidence claim",
        },
        {
          id: "route-review",
          title: "Inspect reviewed World matches",
          description:
            "A route must come from the reviewed registry; this preview does not invent one.",
          tone: "candidate",
          status: "Candidate routing step · review required",
        },
        {
          id: "coverage-gap",
          title: "Broader path coverage remains open",
          description:
            "No complete reviewed path is claimed for this goal yet. The gap stays visible instead of becoming generated curriculum.",
          tone: "gap",
          status: "Coverage gap · not executable",
        },
      ];
    }

    return [
      {
        id: "claim-frame",
        title: "Frame the claim you need to test",
        description:
          "Commit a starting stance before evidence appears inside the authored AI & Learning World.",
        tone: "reviewed",
        status: "Reviewed activity · available now",
      },
      {
        id: "source-conditions",
        title: "Compare source conditions and outcomes",
        description:
          "Separate stronger assisted work from what remains independently demonstrated.",
        tone: "reviewed",
        status: "Reviewed activity · available now",
      },
      {
        id: "model-limits",
        title: "Understand model limits and failure modes",
        description:
          "A later step should connect mechanisms, uncertainty, and failure analysis to reviewed sources.",
        tone: "candidate",
        status: "Candidate step · review required",
        optional: true,
      },
      {
        id: "project-audit",
        title: "Build and audit a small AI system",
        description:
          "A meaningful project can test application, documentation, and failure analysis once its route is reviewed.",
        tone: "candidate",
        status: "Candidate project · not assigned",
        optional: true,
      },
      {
        id: "coverage-gap",
        title: "Broader AI-literacy frontier",
        description:
          "Training, current tools, technical building, and social impacts still need reviewed path expansion.",
        tone: "gap",
        status: "Coverage gap · kept visible",
      },
    ];
  }, [aiGoal]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function goTo(nextStep: FlowStep) {
    setMessage("");
    setStep(nextStep);
  }

  function goBack() {
    const previous = FLOW_STEPS[Math.max(0, currentStepIndex - 1)];
    if (previous) goTo(previous);
  }

  function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goal.trim().length < 3) {
      setMessage("Write a short goal or choose one of the examples.");
      return;
    }
    setDirection("");
    goTo("clarify");
  }

  function submitClarification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!direction) {
      setMessage("Choose the direction that best fits, even if it is imperfect.");
      return;
    }
    if (direction === "custom" && customDirection.trim().length < 3) {
      setMessage("Add a few words about the direction you mean.");
      return;
    }
    goTo("starting");
  }

  function submitStartingPoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startingPoint) {
      setMessage("Choose the closest starting point.");
      return;
    }
    goTo("constraints");
  }

  function revealPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!weeklyTime) {
      setMessage("Choose a realistic amount of time for this first route.");
      return;
    }
    if (!pathTitle) setPathTitle(defaultPathTitle);
    goTo("plan");
  }

  return (
    <main className={styles.onboarding} id="forge-main" tabIndex={-1}>
      <div className={styles.progressHeader}>
        <p>
          {step === "plan"
            ? "Your editable preview"
            : `Question ${currentStepIndex + 1} of 4`}
        </p>
        <div
          aria-label={`Onboarding progress: ${Math.round(progress)} percent`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className={styles.progressRail}
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === "goal" ? (
        <form className={styles.question} onSubmit={submitGoal}>
          <h1 ref={headingRef} tabIndex={-1}>
            What do you want to understand, build, or be able to do?
          </h1>
          <p>
            An imperfect ambition is enough. Forge will ask only for context that
            changes the route.
          </p>
          <label className={styles.goalField}>
            <span>Your goal</span>
            <textarea
              autoFocus
              maxLength={500}
              onChange={(event) => {
                setGoal(event.target.value);
                setMessage("");
              }}
              placeholder="I want to…"
              value={goal}
            />
          </label>
          <div className={styles.examples} aria-label="Example goals">
            {EXAMPLE_GOALS.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setGoal(example);
                  setMessage("");
                }}
                type="button"
              >
                {example}
              </button>
            ))}
          </div>
          <div className={styles.questionActions}>
            <button className={styles.primaryButton} type="submit">
              Clarify this goal
              <ArrowIcon />
            </button>
          </div>
          {message ? (
            <p className={styles.message} role="alert">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}

      {step === "clarify" ? (
        <form className={styles.question} onSubmit={submitClarification}>
          <h1 ref={headingRef} tabIndex={-1}>
            What would meaningful progress look like first?
          </h1>
          <p>
            You said: “{goal.trim()}” Choose the closest interpretation. You can
            revise it before entering the workspace.
          </p>
          <ChoiceList
            name="direction"
            onChange={(value) => {
              setDirection(value);
              setMessage("");
            }}
            options={directionOptions}
            value={direction}
          />
          {direction === "custom" ? (
            <label className={styles.textField}>
              <span>Your direction</span>
              <input
                autoFocus
                maxLength={220}
                onChange={(event) => {
                  setCustomDirection(event.target.value);
                  setMessage("");
                }}
                placeholder="I want the first route to help me…"
                value={customDirection}
              />
            </label>
          ) : null}
          <div className={styles.questionActions}>
            <button className={styles.textButton} onClick={goBack} type="button">
              Back
            </button>
            <button className={styles.primaryButton} type="submit">
              Set the starting point
              <ArrowIcon />
            </button>
          </div>
          {message ? (
            <p className={styles.message} role="alert">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}

      {step === "starting" ? (
        <form className={styles.question} onSubmit={submitStartingPoint}>
          <h1 ref={headingRef} tabIndex={-1}>
            Where are you starting from?
          </h1>
          <p>
            This changes the entry point, not the standard of evidence or the
            claim Forge can make.
          </p>
          <ChoiceList
            name="starting-point"
            onChange={(value) => {
              setStartingPoint(value);
              setMessage("");
            }}
            options={STARTING_POINTS}
            value={startingPoint}
          />
          <div className={styles.questionActions}>
            <button className={styles.textButton} onClick={goBack} type="button">
              Back
            </button>
            <button className={styles.primaryButton} type="submit">
              Set realistic constraints
              <ArrowIcon />
            </button>
          </div>
          {message ? (
            <p className={styles.message} role="alert">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}

      {step === "constraints" ? (
        <form className={styles.question} onSubmit={revealPlan}>
          <h1 ref={headingRef} tabIndex={-1}>
            What should this path respect?
          </h1>
          <p>
            Choose a realistic weekly rhythm. Add only the access, resource, or
            scheduling constraints that materially change the first step.
          </p>
          <ChoiceList
            name="weekly-time"
            onChange={(value) => {
              setWeeklyTime(value);
              setMessage("");
            }}
            options={TIME_OPTIONS}
            value={weeklyTime}
          />
          <label className={styles.textField}>
            <span>Important constraints (optional)</span>
            <textarea
              maxLength={400}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="For example: low bandwidth, screen reader, no paid resources, a deadline…"
              rows={3}
              value={constraints}
            />
          </label>
          <div className={styles.questionActions}>
            <button className={styles.textButton} onClick={goBack} type="button">
              Back
            </button>
            <button className={styles.primaryButton} type="submit">
              Reveal the first route
              <ArrowIcon />
            </button>
          </div>
          {message ? (
            <p className={styles.message} role="alert">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}

      {step === "plan" ? (
        <section className={styles.plan} aria-labelledby="path-preview-title">
          <header className={styles.planHeader}>
            <h1 id="path-preview-title" ref={headingRef} tabIndex={-1}>
              A credible beginning, with the edges still visible.
            </h1>
            <p>
              {directionSummary}
              {" · "}
              {optionLabel(STARTING_POINTS, startingPoint)}
              {" · "}
              {optionLabel(TIME_OPTIONS, weeklyTime)}
            </p>
          </header>

          <div className={styles.planEditor}>
            <div className={styles.planTitle}>
              <label htmlFor="path-title">Working title</label>
              <input
                className={styles.planTitleInput}
                id="path-title"
                maxLength={120}
                onChange={(event) => setPathTitle(event.target.value)}
                value={pathTitle}
              />
            </div>
            <label className={styles.textField}>
              <span>Question to keep open</span>
              <input
                maxLength={220}
                onChange={(event) => setOpenQuestion(event.target.value)}
                value={openQuestion}
              />
            </label>

            <ol className={styles.planSteps}>
              {planSteps.map((item, index) => {
                const included = item.optional
                  ? includedCandidates[item.id] !== false
                  : true;
                return (
                  <li
                    className={styles.planStep}
                    data-included={included}
                    data-tone={item.tone}
                    key={item.id}
                  >
                    <span className={styles.stepNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.stepCopy}>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                    </div>
                    {item.optional ? (
                      <label className={styles.candidateToggle}>
                        <input
                          checked={included}
                          onChange={(event) =>
                            setIncludedCandidates((current) => ({
                              ...current,
                              [item.id]: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        Keep in preview
                      </label>
                    ) : (
                      <span className={styles.stepStatus}>{item.status}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className={styles.coverageNote}>
            <strong aria-hidden="true">!</strong>
            <div>
              <h2>Coverage stays conditional</h2>
              <p>
                {aiGoal
                  ? "Two activities are available inside one reviewed AI & Learning World. Later AI-literacy steps remain candidates or explicit gaps until their sources, learning sequence, and proof conditions are reviewed."
                  : "This preview has not found or activated a complete reviewed path for the goal. It keeps the routing work and coverage gap visible instead of generating a course."}
                {constraints.trim()
                  ? ` The preview should also respect: ${constraints.trim()}`
                  : ""}
              </p>
            </div>
          </aside>

          <footer className={styles.planFooter}>
            <p>
              Nothing here is saved, uploaded, or treated as evidence. Editing
              this preview changes only the open page. Open question:{" "}
              {openQuestion.trim() || "not yet named"}.
            </p>
            <div className={styles.planActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => goTo("constraints")}
                type="button"
              >
                Adjust the route
              </button>
              {aiGoal ? (
                <Link
                  className={styles.primaryLink}
                  href="/study/ai-foundations"
                >
                  Try the reviewed study session
                  <ArrowIcon />
                </Link>
              ) : (
                <Link className={styles.primaryLink} href="/paths">
                  Explore reviewed directions
                  <ArrowIcon />
                </Link>
              )}
            </div>
          </footer>
        </section>
      ) : null}
    </main>
  );
}
