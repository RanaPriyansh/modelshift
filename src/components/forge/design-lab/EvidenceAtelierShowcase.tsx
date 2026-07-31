"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import styles from "./EvidenceAtelierShowcase.module.css";

export type EvidenceAtelierStage =
  | "today"
  | "attempt"
  | "feedback"
  | "proof"
  | "return";

export type EvidenceAtelierTheme = "light" | "dark";

type Props = {
  readonly initialStage?: EvidenceAtelierStage;
  readonly initialTheme?: EvidenceAtelierTheme;
};

const STAGES: ReadonlyArray<{
  id: EvidenceAtelierStage;
  label: string;
  shortLabel: string;
}> = [
  { id: "today", label: "Today", shortLabel: "Today" },
  { id: "attempt", label: "Attempt", shortLabel: "Work" },
  { id: "feedback", label: "Feedback", shortLabel: "Repair" },
  { id: "proof", label: "Protected proof", shortLabel: "Proof" },
  { id: "return", label: "Delayed return", shortLabel: "Return" },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path d="M3.75 9h10.5M10.25 5l4 4-4 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <rect height="10.5" rx="2" width="14" x="5" y="10" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v3" />
    </svg>
  );
}

function PrimaryAction({
  children,
  onClick,
}: {
  readonly children: string;
  readonly onClick: () => void;
}) {
  return (
    <button className={styles.primaryAction} onClick={onClick} type="button">
      <span>{children}</span>
      <span className={styles.actionIcon}><ArrowIcon /></span>
    </button>
  );
}

function QuietAction({
  children,
  onClick,
}: {
  readonly children: string;
  readonly onClick: () => void;
}) {
  return (
    <button className={styles.quietAction} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function TodayScreen({ onContinue }: { readonly onContinue: () => void }) {
  return (
    <section className={styles.todayScreen} aria-labelledby="atelier-today-title">
      <div className={styles.thresholdField}>
        <Image
          alt=""
          className={styles.thresholdImage}
          fill
          priority
          sizes="(max-width: 700px) 100vw, 1180px"
          src="/forge/concepts/evidence-atelier-instrument-landscape.png"
        />
        <div className={styles.thresholdCopy}>
          <p className={styles.stateLabel}>Today · Return ready</p>
          <h2 id="atelier-today-title">Test your ratio model in a new case.</h2>
          <p>
            This check removes the diagram support. It shows whether the
            relationship travels.
          </p>
          <PrimaryAction onClick={onContinue}>Continue</PrimaryAction>
        </div>
      </div>

      <dl className={styles.todayDetails}>
        <div><dt>Expected time</dt><dd>About 12 minutes</dd></div>
        <div><dt>Assistance</dt><dd>Hints after commitment</dd></div>
        <div><dt>Source state</dt><dd>Reviewed World v1.3</dd></div>
        <div><dt>Stopping point</dt><dd>After one fresh case</dd></div>
      </dl>
    </section>
  );
}

function AttemptScreen({
  onCommit,
  onStop,
}: {
  readonly onCommit: () => void;
  readonly onStop: () => void;
}) {
  const answerId = useId();

  return (
    <section className={styles.workScreen} aria-labelledby="atelier-attempt-title">
      <div className={styles.workPlateOuter}>
        <article className={styles.workPlate}>
          <header className={styles.workHeader}>
            <p className={styles.stateLabel}>Attempt · Hints after commitment</p>
            <span className={styles.localSeal}>Saved on this device</span>
          </header>
          <h2 id="atelier-attempt-title">
            How must the recipe change for eight people?
          </h2>
          <p className={styles.prompt}>
            Explain the relationship before you calculate.
          </p>
          <label className={styles.answerLabel} htmlFor={answerId}>
            Your explanation
          </label>
          <textarea
            defaultValue="The number of people doubles, so I think each ingredient must..."
            id={answerId}
            rows={7}
          />
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onCommit}>Commit my attempt</PrimaryAction>
            <QuietAction onClick={onStop}>Save and stop</QuietAction>
          </div>
        </article>
      </div>

      <aside className={styles.contextRail} aria-label="Attempt conditions">
        <h3>Conditions</h3>
        <dl>
          <div><dt>Current operation</dt><dd>Name the invariant relationship</dd></div>
          <div><dt>Support</dt><dd>Available after commitment</dd></div>
          <div><dt>Source</dt><dd>Reviewed ratio model</dd></div>
          <div><dt>Evidence</dt><dd>No evidence from this draft</dd></div>
        </dl>
        <p>
          Accessibility support stays available. Cognitive help changes what
          this attempt can show.
        </p>
      </aside>
    </section>
  );
}

function FeedbackScreen({
  onFreshCase,
  onStop,
}: {
  readonly onFreshCase: () => void;
  readonly onStop: () => void;
}) {
  return (
    <section className={styles.feedbackScreen} aria-labelledby="atelier-feedback-title">
      <header className={styles.screenHeading}>
        <p className={styles.stateLabel}>Calibration note</p>
        <h2 id="atelier-feedback-title">One relationship needs repair.</h2>
        <p>The note names the useful part. It then gives one exact change.</p>
      </header>

      <div className={styles.calibrationSheet}>
        <section>
          <span aria-hidden="true">01</span>
          <div><h3>What held</h3><p>You kept the number of people and the amount linked.</p></div>
        </section>
        <section>
          <span aria-hidden="true">02</span>
          <div><h3>What changed</h3><p>You added four portions only once.</p></div>
        </section>
        <section>
          <span aria-hidden="true">03</span>
          <div><h3>What to test next</h3><p>Scale each ingredient by the same factor.</p></div>
        </section>
      </div>

      <div className={styles.freshCase}>
        <div>
          <p className={styles.stateLabel}>Fresh case</p>
          <h3>Try the same relationship with different values.</h3>
          <p>The next case does not repeat the original answer pattern.</p>
        </div>
        <div className={styles.actionRow}>
          <PrimaryAction onClick={onFreshCase}>Prepare fresh proof</PrimaryAction>
          <QuietAction onClick={onStop}>Save this point</QuietAction>
        </div>
      </div>
    </section>
  );
}

function ProofScreen({
  onBegin,
  onLeave,
}: {
  readonly onBegin: () => void;
  readonly onLeave: () => void;
}) {
  return (
    <section className={styles.proofScreen} aria-labelledby="atelier-proof-title">
      <div className={styles.proofOuter}>
        <article className={styles.proofBoundary}>
          <LockIcon />
          <p className={styles.stateLabel}>Protected proof</p>
          <h2 id="atelier-proof-title">
            Solve one unfamiliar ratio case without instructional help.
          </h2>
          <p className={styles.proofIntro}>
            Read the conditions before you open the task.
          </p>
          <dl className={styles.proofConditions}>
            <div><dt>Your operation</dt><dd>Find and apply one scale factor.</dd></div>
            <div><dt>Unavailable</dt><dd>Hints, examples, solution steps, and prior answers.</dd></div>
            <div><dt>Available</dt><dd>Keyboard, larger text, read-aloud, and contrast controls.</dd></div>
            <div><dt>Submission</dt><dd>One submission for this task version.</dd></div>
          </dl>
          <p className={styles.proofLimit}>
            This result can support one bounded evidence statement. It cannot
            prove permanent mastery.
          </p>
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onBegin}>Begin proof preview</PrimaryAction>
            <QuietAction onClick={onLeave}>Leave before submission</QuietAction>
          </div>
        </article>
      </div>
    </section>
  );
}

function ReturnScreen({
  onBegin,
  onPlanLater,
}: {
  readonly onBegin: () => void;
  readonly onPlanLater: () => void;
}) {
  return (
    <section className={styles.returnScreen} aria-labelledby="atelier-return-title">
      <div className={styles.returnField}>
        <Image
          alt=""
          className={styles.returnImage}
          fill
          sizes="(max-width: 700px) 100vw, 1180px"
          src="/forge/concepts/evidence-atelier-instrument-landscape.png"
        />
        <div className={styles.returnCopy}>
          <p className={styles.stateLabel}>Return · New context</p>
          <h2 id="atelier-return-title">Test the same relationship in a graph.</h2>
          <p>
            Your earlier proof used a recipe. This case checks whether the idea
            travels.
          </p>
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onBegin}>Begin return preview</PrimaryAction>
            <QuietAction onClick={onPlanLater}>Plan another time</QuietAction>
          </div>
        </div>
      </div>

      <article className={styles.receiptStrip} aria-labelledby="receipt-strip-title">
        <div>
          <p className={styles.stateLabel}>Earlier evidence</p>
          <h3 id="receipt-strip-title">Recipe scale case · 1 August 2026</h3>
        </div>
        <dl>
          <div><dt>State</dt><dd>Observed</dd></div>
          <div><dt>Mode</dt><dd>Closed</dd></div>
          <div><dt>Open</dt><dd>Graph transfer</dd></div>
        </dl>
      </article>
    </section>
  );
}

export function EvidenceAtelierShowcase({
  initialStage = "today",
  initialTheme = "light",
}: Props) {
  const [stage, setStage] = useState<EvidenceAtelierStage>(initialStage);
  const [theme, setTheme] = useState<EvidenceAtelierTheme>(initialTheme);
  const [previewMessage, setPreviewMessage] = useState(
    "No learning record is created in this preview.",
  );
  const screenRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    screenRef.current?.focus();
  }, [stage]);

  function showStage(
    nextStage: EvidenceAtelierStage,
    message = "The display-only preview changed screens.",
  ) {
    setStage(nextStage);
    setPreviewMessage(message);
  }

  function stopPreview() {
    showStage("today", "The preview returned to Today. No work or evidence was saved.");
  }

  return (
    <section
      aria-label="Evidence Atelier display-only design preview"
      className={styles.showcase}
      data-theme={theme}
    >
      <a className={styles.skipLink} href="#evidence-atelier-preview">
        Skip to concept screen
      </a>

      <div className={styles.previewNotice}>
        <strong>Display-only concept</strong>
        <span>No learning record is created.</span>
      </div>

      <header className={styles.atelierRail}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">F</span>
          <span><strong>FORGE</strong><small>Evidence Atelier</small></span>
        </div>

        <div className={styles.themeControl} aria-label="Preview theme">
          <span className={styles.themeLabel}>Theme</span>
          {(["light", "dark"] as const).map((themeOption) => (
            <button
              aria-pressed={theme === themeOption}
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              type="button"
            >
              {themeOption === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </header>

      <nav className={styles.stageRail} aria-label="Evidence Atelier screens">
        <ol>
          {STAGES.map((item, index) => (
            <li key={item.id}>
              <button
                aria-current={stage === item.id ? "step" : undefined}
                data-active={stage === item.id ? "true" : undefined}
                onClick={() => showStage(item.id)}
                type="button"
              >
                <span className={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stageFull}>{item.label}</span>
                <span className={styles.stageShort}>{item.shortLabel}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div
        className={styles.screenViewport}
        id="evidence-atelier-preview"
        ref={screenRef}
        tabIndex={-1}
      >
        {stage === "today" ? <TodayScreen onContinue={() => showStage("attempt")} /> : null}
        {stage === "attempt" ? (
          <AttemptScreen onCommit={() => showStage("feedback")} onStop={stopPreview} />
        ) : null}
        {stage === "feedback" ? (
          <FeedbackScreen onFreshCase={() => showStage("proof")} onStop={stopPreview} />
        ) : null}
        {stage === "proof" ? (
          <ProofScreen
            onBegin={() =>
              showStage("return", "The preview moved to the delayed return. No proof was submitted.")
            }
            onLeave={stopPreview}
          />
        ) : null}
        {stage === "return" ? (
          <ReturnScreen
            onBegin={() =>
              showStage("today", "The preview completed its visual sequence. No result was recorded.")
            }
            onPlanLater={stopPreview}
          />
        ) : null}
      </div>

      <p className={styles.liveMessage} aria-live="polite">
        {previewMessage}
      </p>
    </section>
  );
}
