"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import { ArrowIcon } from "@/src/components/forge/refoundation/orient/OrientFrame";

import styles from "./study.module.css";

type StudyStage = "resource" | "retrieve" | "world";

const STAGES: ReadonlyArray<{
  id: StudyStage;
  label: string;
}> = [
  { id: "resource", label: "Study" },
  { id: "retrieve", label: "Retrieve" },
  { id: "world", label: "Enter the World" },
];

const PREDICTIONS = [
  {
    id: "fluency",
    label: "A fluent answer is enough to justify trust.",
  },
  {
    id: "conditions",
    label: "Source fit, conditions, and later unaided performance matter.",
  },
  {
    id: "never",
    label: "AI-supported work can never contribute to learning.",
  },
] as const;

const PRACTICE_CHOICES = [
  {
    id: "always",
    label: "AI always improves learning.",
    note: "A universal claim about learning.",
  },
  {
    id: "bounded",
    label:
      "AI may improve assisted output in this setting; independent learning remains untested.",
    note: "A claim bounded to the observed outcome and missing test.",
  },
  {
    id: "never",
    label: "AI does not help learners.",
    note: "The opposite universal claim.",
  },
] as const;

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9" />
    </svg>
  );
}
function DiagramArrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 20">
      <path d="M2 10h26m-6-6 6 6-6 6" />
    </svg>
  );
}

export function StudySession() {
  const [stage, setStage] = useState<StudyStage>("resource");
  const [prediction, setPrediction] = useState("");
  const [notes, setNotes] = useState("");
  const [practiceChoice, setPracticeChoice] = useState("");
  const [feedback, setFeedback] = useState<
    "idle" | "correct" | "incorrect"
  >("idle");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageIndex = STAGES.findIndex((item) => item.id === stage);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stage]);

  function checkPractice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(practiceChoice === "bounded" ? "correct" : "incorrect");
  }

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#study-main" tabIndex={0}>
        Skip to active study
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="FORGE home">
          FORGE
        </Link>
        <div className={styles.sessionIdentity}>
          <span>Active study</span>
          <strong>AI foundations</strong>
        </div>
        <p className={styles.stepSummary}>
          {STAGES[stageIndex]?.label} · step {stageIndex + 1} of {STAGES.length}
        </p>
        <Link className={styles.exitLink} href="/app">
          Exit
          <ExitIcon />
        </Link>
      </header>

      <div className={styles.progress} aria-label="Study progress">
        {STAGES.map((item, index) => (
          <span
            aria-current={stage === item.id ? "step" : undefined}
            data-state={
              index < stageIndex
                ? "complete"
                : index === stageIndex
                  ? "current"
                  : "upcoming"
            }
            key={item.id}
          >
            <i>{index + 1}</i>
            {item.label}
          </span>
        ))}
      </div>

      <main className={styles.main} id="study-main" tabIndex={-1}>
        {stage === "resource" ? (
          <section className={styles.resourceStage}>
            <header className={styles.stageHeader}>
              <div>
                <p className={styles.stageLabel}>A focused study session</p>
                <h1 ref={headingRef} tabIndex={-1}>
                  When does AI output deserve trust?
                </h1>
              </div>
              <dl>
                <div>
                  <dt>Time</dt>
                  <dd>About 18 minutes</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>AI &amp; Learning World</dd>
                </div>
              </dl>
            </header>

            <section className={styles.why} aria-labelledby="why-title">
              <h2 id="why-title">Why this matters</h2>
              <p>
                Trustworthy AI use begins by separating a fluent claim from the
                evidence that can actually bear its weight. Stronger work while
                help is present and capability that remains later are different
                outcomes.
              </p>
            </section>

            <div className={styles.resourceGrid}>
              <article className={styles.studyNote}>
                <header className={styles.resourceHeader}>
                  <div>
                    <p>Internal authored study note</p>
                    <h2>Follow the claim to its boundary.</h2>
                  </div>
                  <span>Available offline</span>
                </header>

                <div className={styles.claimDiagram} aria-label="Claim checking sequence">
                  <div>
                    <span>01</span>
                    <strong>Claim</strong>
                    <small>What exactly is being asserted?</small>
                  </div>
                  <DiagramArrow />
                  <div>
                    <span>02</span>
                    <strong>Outcome</strong>
                    <small>What changed, for whom, and when?</small>
                  </div>
                  <DiagramArrow />
                  <div>
                    <span>03</span>
                    <strong>Source fit</strong>
                    <small>Does the evidence bear on that outcome?</small>
                  </div>
                  <DiagramArrow />
                  <div>
                    <span>04</span>
                    <strong>Boundary</strong>
                    <small>What remains unsupported or untested?</small>
                  </div>
                </div>

                <div className={styles.noticeGrid}>
                  <section>
                    <h3>What to notice</h3>
                    <ul>
                      <li>A topic match is not automatically evidence.</li>
                      <li>Assisted performance is not later unaided performance.</li>
                      <li>Missing evidence should narrow the claim, not disappear.</li>
                    </ul>
                  </section>
                  <section className={styles.providerNotice}>
                    <p>External media</p>
                    <h3>Video/provider unavailable</h3>
                    <span>
                      No iframe or external request is made. The internal text
                      and diagram above are the complete fallback for this step.
                    </span>
                  </section>
                </div>
              </article>

              <aside className={styles.notesPanel}>
                <div>
                  <p className={styles.stageLabel}>Your scratchpad</p>
                  <h2>Capture what changes your mind.</h2>
                  <p>
                    These notes stay only in this open page. They are not saved,
                    sent, scored, or added to evidence.
                  </p>
                </div>
                <label>
                  <span>Notes</span>
                  <textarea
                    maxLength={800}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="A claim needs a source that tests the same outcome…"
                    rows={8}
                    value={notes}
                  />
                  <small>{notes.length} / 800</small>
                </label>
              </aside>
            </div>

            <form
              className={styles.prediction}
              onSubmit={(event) => {
                event.preventDefault();
                if (prediction) setStage("retrieve");
              }}
            >
              <div>
                <p className={styles.stageLabel}>Predict before practice</p>
                <h2>Which idea should guide your first source check?</h2>
              </div>
              <div className={styles.predictionOptions}>
                {PREDICTIONS.map((item) => (
                  <label
                    data-selected={prediction === item.id}
                    key={item.id}
                  >
                    <input
                      checked={prediction === item.id}
                      name="prediction"
                      onChange={() => setPrediction(item.id)}
                      type="radio"
                      value={item.id}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <button disabled={!prediction} type="submit">
                Continue to retrieval
                <ArrowIcon />
              </button>
            </form>
          </section>
        ) : null}

        {stage === "retrieve" ? (
          <section className={styles.retrieveStage}>
            <header className={styles.compactHeader}>
              <p className={styles.stageLabel}>Retrieve without the note</p>
              <h1 ref={headingRef} tabIndex={-1}>
                Keep the conclusion inside the evidence.
              </h1>
              <p>
                This is unscored practice, not protected proof and not an
                evidence record. You may revise the answer.
              </p>
            </header>

            <div className={styles.practiceLayout}>
              <article className={styles.claimBrief}>
                <p>Authored practice brief</p>
                <blockquote>
                  “Students using an AI writing assistant produced stronger first
                  drafts during the session.”
                </blockquote>
                <dl>
                  <div>
                    <dt>Observed</dt>
                    <dd>First-draft quality during assisted work</dd>
                  </div>
                  <div>
                    <dt>Not tested</dt>
                    <dd>Later unaided performance on a new task</dd>
                  </div>
                  <div>
                    <dt>Source status</dt>
                    <dd>Authored practice fixture, not an external research source</dd>
                  </div>
                </dl>
              </article>

              <form className={styles.practiceForm} onSubmit={checkPractice}>
                <fieldset>
                  <legend>Which conclusion stays within this brief?</legend>
                  {PRACTICE_CHOICES.map((choice) => (
                    <label
                      data-selected={practiceChoice === choice.id}
                      key={choice.id}
                    >
                      <input
                        checked={practiceChoice === choice.id}
                        name="practice-choice"
                        onChange={() => {
                          setPracticeChoice(choice.id);
                          setFeedback("idle");
                        }}
                        type="radio"
                        value={choice.id}
                      />
                      <span>
                        <strong>{choice.label}</strong>
                        <small>{choice.note}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <button disabled={!practiceChoice} type="submit">
                  Check this practice answer
                </button>
                {feedback === "incorrect" ? (
                  <p className={styles.incorrect} role="status">
                    That conclusion reaches beyond the observed outcome. Keep the
                    setting and the untested later performance visible.
                  </p>
                ) : null}
                {feedback === "correct" ? (
                  <div className={styles.correct} role="status">
                    <strong>The claim is bounded.</strong>
                    <p>
                      It names the assisted outcome without turning missing
                      independent evidence into a positive or negative verdict.
                    </p>
                    <button onClick={() => setStage("world")} type="button">
                      See the reviewed World
                      <ArrowIcon />
                    </button>
                  </div>
                ) : null}
              </form>
            </div>

            <button
              className={styles.backButton}
              onClick={() => setStage("resource")}
              type="button"
            >
              Back to the study note
            </button>
          </section>
        ) : null}

        {stage === "world" ? (
          <section className={styles.worldStage}>
            <div className={styles.worldCopy}>
              <p className={styles.stageLabel}>Reviewed activity ready</p>
              <h1 ref={headingRef} tabIndex={-1}>
                Now test your starting stance against evidence.
              </h1>
              <p>
                The AI &amp; Learning World begins before evidence appears. It
                asks you to commit, inspect authored source briefs, contrast
                plausible readings, rebuild the claim, and make one
                assistance-free transfer.
              </p>

              <dl>
                <div>
                  <dt>World</dt>
                  <dd>AI &amp; Learning</dd>
                </div>
                <div>
                  <dt>Authority</dt>
                  <dd>Authored scoring only; no external provider request</dd>
                </div>
                <div>
                  <dt>This study page</dt>
                  <dd>Creates no evidence record and saves no notes</dd>
                </div>
              </dl>

              <div className={styles.worldActions}>
                <Link className={styles.worldLink} href="/learn/ai-and-learning">
                  Enter AI &amp; Learning
                  <ArrowIcon />
                </Link>
                <button onClick={() => setStage("retrieve")} type="button">
                  Review the practice
                </button>
              </div>
            </div>

            <aside className={styles.handoff}>
              <span>From study to focused World</span>
              <ol>
                <li>
                  <i>1</i>
                  <p>
                    <strong>Commit</strong>
                    State what you think before seeing the evidence.
                  </p>
                </li>
                <li>
                  <i>2</i>
                  <p>
                    <strong>Inspect</strong>
                    Compare conditions, outcomes, and missing tests.
                  </p>
                </li>
                <li>
                  <i>3</i>
                  <p>
                    <strong>Prove</strong>
                    Apply the bounded rule once after assistance is removed.
                  </p>
                </li>
              </ol>
            </aside>
          </section>
        ) : null}
      </main>

      <footer className={styles.footer}>
        <span>Learner acts</span>
        <i>·</i>
        <span>AI assists</span>
        <i>·</i>
        <span>Evidence decides</span>
      </footer>
    </div>
  );
}
