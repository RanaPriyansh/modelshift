"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  BOUNDED_CLAIMS,
  COLD_TRANSFER,
  DIFFERENCE_OPTIONS,
  ERROR_MESSAGES,
  PLAUSIBLE_READINGS,
  READING_VERDICTS,
  REVIEWED_EVIDENCE,
  STAGE_STEPS,
  STANCES,
  TEST_PREDICTION_OPTIONS,
  WORLD_CLAIM,
} from "../../../worlds/ai-learning";
import type {
  BoundedClaimId,
  DifferenceId,
  EvidenceId,
  EvidenceLearningAction,
  EvidenceLearningState,
  ReadingId,
  ReadingVerdict,
  StanceId,
  TestPredictionId,
  TransferChoiceId,
  TransferOpenQuestionId,
} from "../../../worlds/ai-learning";
import { recordWorldProof } from "../../../lib/forge-evidence";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  sourceCorroborationWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "../../../forge/world-runtime";
import styles from "./EvidenceLearningWorld.module.css";

function classes(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).map((name) => styles[name as keyof typeof styles]).join(" ");
}

type DomainDispatch = (action: EvidenceLearningAction) => void;

function ArrowIcon() {
  return (
    <svg className={styles["forge-evidence-button-icon"]} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 10h12.25M11 5.25 15.75 10 11 14.75" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className={styles["forge-evidence-check-icon"]} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m4.2 10.3 3.5 3.5 8.1-8.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className={styles["forge-evidence-lock-icon"]} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className={styles["forge-evidence-external-icon"]} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8 5H5.8A1.8 1.8 0 0 0 4 6.8v7.4A1.8 1.8 0 0 0 5.8 16h7.4a1.8 1.8 0 0 0 1.8-1.8V12M11 4h5v5M9 11l7-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  testId,
  quiet = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
  quiet?: boolean;
}) {
  return (
    <button
      className={classes("forge-evidence-button", quiet ? "forge-evidence-button-quiet" : "forge-evidence-button-primary")}
      disabled={disabled}
      onClick={onClick}
      type="button"
      data-testid={testId}
    >
      <span>{children}</span>
      {quiet ? null : <ArrowIcon />}
    </button>
  );
}

function StageHeading({ number, title, body, kicker }: { number: string; title: string; body: string; kicker: string }) {
  return (
    <header className={styles["forge-evidence-stage-heading"]}>
      <div className={styles["forge-evidence-stage-number"]} aria-hidden="true">{number}</div>
      <div>
        <p className={styles["forge-evidence-stage-kicker"]}>{kicker}</p>
        <h2>{title}</h2>
        <p className={styles["forge-evidence-stage-copy"]}>{body}</p>
      </div>
    </header>
  );
}

function ErrorNotice({ state }: { state: EvidenceLearningState }) {
  if (!state.lastError) return null;
  return (
    <p className={styles["forge-evidence-error"]} role="alert" data-testid="evidence-error">
      {ERROR_MESSAGES[state.lastError]}
    </p>
  );
}

function ProgressRail({ state }: { state: EvidenceLearningState }) {
  const currentIndex = STAGE_STEPS.findIndex((step) => step.id === state.stage);
  return (
    <ol className={styles["forge-evidence-progress"]} aria-label="Evidence learning progress">
      {STAGE_STEPS.map((step, index) => {
        const status = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.id} data-status={status} aria-current={status === "current" ? "step" : undefined}>
            <span>{status === "complete" ? <CheckIcon /> : index + 1}</span>
            <small>{step.label}</small>
          </li>
        );
      })}
    </ol>
  );
}

function EncounterStage({ state, dispatch, instanceId }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-encounter">
      <StageHeading
        number="01"
        kicker="Encounter the claim"
        title="Commit before the evidence appears."
        body="Choose the stance you hold now, record its strength, and leave a reason that the final record can return to."
      />
      <blockquote className={styles["forge-evidence-claim"]}>
        <span aria-hidden="true">“</span>{WORLD_CLAIM}<span aria-hidden="true">”</span>
      </blockquote>

      <div className={styles["forge-evidence-encounter-grid"]}>
        <fieldset className={styles["forge-evidence-choice-fieldset"]}>
          <legend>Your starting stance</legend>
          <div className={styles["forge-evidence-stance-grid"]}>
            {STANCES.map((stance) => (
              <label
                key={stance.id}
                className={classes("forge-evidence-choice", state.encounter.stanceId === stance.id && "forge-evidence-choice-selected")}
              >
                <input
                  type="radio"
                  name={`${instanceId}-stance`}
                  value={stance.id}
                  checked={state.encounter.stanceId === stance.id}
                  onChange={() => dispatch({ type: "SET_STANCE", stanceId: stance.id as StanceId })}
                />
                <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
                <strong>{stance.label}</strong>
                <small>{stance.note}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles["forge-evidence-confidence"]}>
          <div>
            <label htmlFor={`${instanceId}-confidence`}>Confidence</label>
            <output htmlFor={`${instanceId}-confidence`}>{state.encounter.confidence}%</output>
          </div>
          <input
            id={`${instanceId}-confidence`}
            type="range"
            min="0"
            max="100"
            step="5"
            value={state.encounter.confidence}
            onChange={(event) => dispatch({ type: "SET_CONFIDENCE", confidence: Number(event.target.value) })}
          />
          <div className={styles["forge-evidence-range-labels"]} aria-hidden="true"><span>Unsure</span><span>Certain</span></div>
        </div>
      </div>

      <div className={styles["forge-evidence-textarea"]}>
        <label htmlFor={`${instanceId}-reason`}>Why do you hold that stance?</label>
        <textarea
          id={`${instanceId}-reason`}
          rows={4}
          maxLength={420}
          value={state.encounter.reason}
          onChange={(event) => dispatch({ type: "SET_REASON", reason: event.target.value })}
          placeholder="Name the experience, assumption, or distinction behind your starting view."
        />
        <small>{state.encounter.reason.length} / 420</small>
      </div>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>The evidence cards stay hidden until this answer is committed.</p>
        <ActionButton onClick={() => dispatch({ type: "COMMIT_ENCOUNTER" })} testId="commit-encounter">
          Commit stance
        </ActionButton>
      </div>
    </section>
  );
}

function CompilerStage({ state, dispatch, instanceId, testPrediction, onTestPrediction }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
  testPrediction: TestPredictionId | null;
  onTestPrediction: (predictionId: TestPredictionId) => void;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-compiler">
      <StageHeading
        number="02"
        kicker="Consider two possible readings"
        title="Hold the disagreement before seeing the studies."
        body="These are two possible readings to test against your committed claim and reason, not generated diagnoses of you and not verdicts. The reviewed study briefs remain closed until you commit a prediction."
      />
      <blockquote className={styles["forge-evidence-compiler-commitment"]}>
        <span>Your committed reason · local to this attempt</span>
        “{state.committedEncounter?.reason}”
      </blockquote>
      <div className={styles["forge-evidence-reading-grid"]}>
        {PLAUSIBLE_READINGS.map((reading) => (
          <article key={reading.id} className={styles["forge-evidence-reading-card"]}>
            <span>{reading.label}</span>
            <blockquote>{reading.reading}</blockquote>
            <p>{reading.test}</p>
          </article>
        ))}
      </div>
      <div className={styles["forge-evidence-actions"]}>
        <p>{state.acceptedTwoReadings ? "Both possible readings are now part of this attempt." : "Keep both readings available; they disagree about what the studies will establish."}</p>
        <ActionButton
          quiet
          disabled={state.acceptedTwoReadings}
          onClick={() => dispatch({ type: "ACCEPT_TWO_READINGS" })}
          testId="accept-two-readings"
        >
          {state.acceptedTwoReadings ? "Two readings accepted" : "Accept both possible readings"}
        </ActionButton>
      </div>
      <fieldset className={styles["forge-evidence-choice-fieldset"]} disabled={!state.acceptedTwoReadings}>
        <legend>Before opening the evidence, which reading do you predict the two studies will better support?</legend>
        <div className={styles["forge-evidence-option-list"]}>
          {TEST_PREDICTION_OPTIONS.map((prediction) => (
            <label
              key={prediction.id}
              className={classes("forge-evidence-choice", testPrediction === prediction.id && "forge-evidence-choice-selected")}
            >
              <input
                type="radio"
                name={`${instanceId}-test-prediction`}
                checked={testPrediction === prediction.id}
                onChange={() => onTestPrediction(prediction.id as TestPredictionId)}
              />
              <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
              <strong>{prediction.label}</strong>
              <small>{prediction.detail}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>Your prediction is retained as a commitment, not scored before the evidence review.</p>
        <ActionButton
          disabled={!state.acceptedTwoReadings || !testPrediction}
          onClick={() => dispatch({ type: "COMMIT_TEST_PREDICTION", predictionId: testPrediction })}
          testId="commit-test-prediction"
        >
          Open the reviewed evidence
        </ActionButton>
      </div>
    </section>
  );
}

function EvidenceStage({ state, dispatch }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-evidence">
      <StageHeading
        number="03"
        kicker="Inspect reviewed evidence"
        title="Two results that only look contradictory."
        body="Read the access arrangement, outcome, and boundary on each card. The headline alone is not the evidence."
      />
      <div className={styles["forge-evidence-source-grid"]}>
        {REVIEWED_EVIDENCE.map((source, index) => {
          const reviewed = state.reviewedEvidenceIds.includes(source.id);
          return (
            <article
              key={source.id}
              className={classes("forge-evidence-source-card", reviewed && "forge-evidence-source-card-reviewed")}
              data-testid={`evidence-card-${source.id}`}
            >
              <header>
                <span>Reviewed source brief {String(index + 1).padStart(2, "0")}</span>
                <h3>{source.title}</h3>
                <p>{source.citation}</p>
              </header>
              <dl>
                <div><dt>Method</dt><dd>{source.method}</dd></div>
                <div><dt>Access structure</dt><dd>{source.access}</dd></div>
                <div><dt>Observed result</dt><dd>{source.finding}</dd></div>
                <div><dt>Boundary</dt><dd>{source.boundary}</dd></div>
              </dl>
              <footer>
                <a href={source.href} target="_blank" rel="noreferrer">Open primary source <ExternalLinkIcon /></a>
                <ActionButton
                  quiet
                  disabled={reviewed}
                  onClick={() => dispatch({ type: "REVIEW_EVIDENCE", evidenceId: source.id as EvidenceId })}
                  testId={`review-${source.id}`}
                >
                  {reviewed ? "Reviewed" : "Mark reviewed"}
                </ActionButton>
              </footer>
            </article>
          );
        })}
      </div>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>{state.reviewedEvidenceIds.length} / {REVIEWED_EVIDENCE.length} cards reviewed</p>
        <ActionButton
          onClick={() => dispatch({ type: "CONTINUE_FROM_EVIDENCE" })}
          testId="continue-from-evidence"
        >
          Compare the structures
        </ActionButton>
      </div>
    </section>
  );
}

function DifferenceStage({ state, dispatch, instanceId }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-difference">
      <StageHeading
        number="04"
        kicker="Identify what differs"
        title="Find the variable hiding behind “AI.”"
        body="The papers do not instantiate one identical intervention. Which difference most changes what the evidence can mean?"
      />
      <div className={styles["forge-evidence-contrast-strip"]} aria-label="Access contrast">
        <div><span>Bastani et al.</span><strong>Student → system output</strong><small>Direct interface; answers possible</small></div>
        <span aria-hidden="true">≠</span>
        <div><span>Tutor CoPilot</span><strong>System output → human tutor → student</strong><small>Human-mediated pedagogical choice</small></div>
      </div>
      <fieldset className={styles["forge-evidence-choice-fieldset"]}>
        <legend>Which difference should constrain the claim?</legend>
        <div className={styles["forge-evidence-option-list"]}>
          {DIFFERENCE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={classes("forge-evidence-choice", state.differenceId === option.id && "forge-evidence-choice-selected")}
            >
              <input
                type="radio"
                name={`${instanceId}-difference`}
                checked={state.differenceId === option.id}
                onChange={() => dispatch({ type: "SET_DIFFERENCE", differenceId: option.id as DifferenceId })}
              />
              <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>The authored check tests one structural distinction, not a model-generated judgment.</p>
        <ActionButton onClick={() => dispatch({ type: "COMMIT_DIFFERENCE" })} testId="commit-difference">
          Lock the difference
        </ActionButton>
      </div>
    </section>
  );
}

function ReadingsStage({ state, dispatch, instanceId }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-readings">
      <StageHeading
        number="05"
        kicker="Test two plausible readings"
        title="Make each reading face both cards."
        body="A reading fails when it drops a measurement boundary, access condition, or result that the other card makes visible."
      />
      <div className={styles["forge-evidence-reading-grid"]}>
        {PLAUSIBLE_READINGS.map((reading) => (
          <fieldset key={reading.id} className={styles["forge-evidence-reading-card"]}>
            <legend>{reading.label}</legend>
            <blockquote>{reading.reading}</blockquote>
            <p>{reading.test}</p>
            <div>
              {READING_VERDICTS.map((verdict) => (
                <label key={verdict.id} className={state.readingVerdicts[reading.id] === verdict.id ? styles["forge-evidence-verdict-selected"] : undefined}>
                  <input
                    type="radio"
                    name={`${instanceId}-${reading.id}`}
                    checked={state.readingVerdicts[reading.id] === verdict.id}
                    onChange={() => dispatch({ type: "SET_READING_VERDICT", readingId: reading.id as ReadingId, verdict: verdict.id as ReadingVerdict })}
                  />
                  <span>{verdict.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>Both verdicts must survive both source briefs.</p>
        <ActionButton onClick={() => dispatch({ type: "COMMIT_READINGS" })} testId="commit-readings">
          Test both readings
        </ActionButton>
      </div>
    </section>
  );
}

function ReconstructStage({ state, dispatch, instanceId }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
}) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-reconstruct">
      <StageHeading
        number="06"
        kicker="Reconstruct the claim"
        title="Trade the universal for a bounded statement."
        body="A useful claim says where the evidence applies, what changed, and which outcome was actually measured."
      />
      <div className={styles["forge-evidence-claim-transform"]}>
        <div><span>Started with</span><strong>{WORLD_CLAIM}</strong></div>
        <ArrowIcon />
        <div><span>Evidence requires</span><strong>Role + guardrails + outcome boundary</strong></div>
      </div>
      <fieldset className={styles["forge-evidence-choice-fieldset"]}>
        <legend>Which reconstruction is warranted?</legend>
        <div className={styles["forge-evidence-option-list"]}>
          {BOUNDED_CLAIMS.map((claim) => (
            <label
              key={claim.id}
              className={classes("forge-evidence-choice", "forge-evidence-choice-claim", state.boundedClaimId === claim.id && "forge-evidence-choice-selected")}
            >
              <input
                type="radio"
                name={`${instanceId}-bounded-claim`}
                checked={state.boundedClaimId === claim.id}
                onChange={() => dispatch({ type: "SET_BOUNDED_CLAIM", claimId: claim.id as BoundedClaimId })}
              />
              <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
              <strong>{claim.label}</strong>
              <small>{claim.note}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorNotice state={state} />
      <div className={styles["forge-evidence-actions"]}>
        <p>Next: make the instructional withdrawal explicit before a different claim and one submission.</p>
        <ActionButton onClick={() => dispatch({ type: "COMMIT_BOUNDED_CLAIM" })} testId="commit-bounded-claim">
          Reconstruct this bounded claim
        </ActionButton>
      </div>
    </section>
  );
}

function WithdrawalStage({ dispatch }: { dispatch: DomainDispatch }) {
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-withdrawal">
      <StageHeading
        number="07"
        kicker="Instructional withdrawal"
        title="The evidence desk leaves before this new task."
        body="Cold transfer begins only after this boundary is acknowledged. It is one unfamiliar task with one submission."
      />
      <div className={styles["forge-evidence-claim-transform"]}>
        <div>
          <span>Leaves now</span>
          <strong>Interpretation framing, evidence-selection help, and authored corrective prompts.</strong>
        </div>
        <ArrowIcon />
        <div>
          <span>Stays available</span>
          <strong>Keyboard operation, textual alternatives, reduced motion, and other construct-preserving access.</strong>
        </div>
      </div>
      <div className={styles["forge-evidence-proof-lock"]}>
        <LockIcon />
        <div><strong>No instructional assistance in transfer</strong><span>No model action, replay, retry, or answer-revealing feedback opens with the task.</span></div>
        <small>BOUNDARY</small>
      </div>
      <div className={styles["forge-evidence-actions"]}>
        <p>Only access support remains when the unfamiliar source briefs appear.</p>
        <ActionButton onClick={() => dispatch({ type: "ACKNOWLEDGE_WITHDRAWAL" })} testId="acknowledge-withdrawal">
          Acknowledge and begin cold transfer
        </ActionButton>
      </div>
    </section>
  );
}

function TransferStage({ state, dispatch, instanceId }: {
  state: EvidenceLearningState;
  dispatch: DomainDispatch;
  instanceId: string;
}) {
  return (
    <section className={classes("forge-evidence-stage", "forge-evidence-transfer-stage")} data-testid="stage-transfer">
      <div className={styles["forge-evidence-proof-lock"]}>
        <LockIcon />
        <div><strong>Evidence desk closed</strong><span>One submission. No prompts, retries, or reveal before commit.</span></div>
        <small>SEALED</small>
      </div>
      <StageHeading
        number="08"
        kicker="Cold transfer"
        title="New claim. New measures."
        body={COLD_TRANSFER.instruction}
      />
      <blockquote className={styles["forge-evidence-transfer-claim"]}>“{COLD_TRANSFER.claim}”</blockquote>
      <div className={styles["forge-evidence-transfer-sources"]}>
        {COLD_TRANSFER.sources.map((source) => (
          <article key={source.id} data-testid={`transfer-source-${source.id}`}>
            <span>{source.label}</span>
            <h3>{source.title}</h3>
            <p>{source.body}</p>
          </article>
        ))}
      </div>

      <fieldset className={styles["forge-evidence-transfer-question"]}>
        <legend>What do these sources jointly warrant?</legend>
        {COLD_TRANSFER.choices.map((choice) => (
          <label key={choice.id} className={state.transferChoiceId === choice.id ? styles["forge-evidence-transfer-selected"] : undefined}>
            <input
              type="radio"
              name={`${instanceId}-transfer-choice`}
              checked={state.transferChoiceId === choice.id}
              onChange={() => dispatch({ type: "SET_TRANSFER_CHOICE", choiceId: choice.id as TransferChoiceId })}
            />
            <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
            <strong>{choice.label}</strong>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles["forge-evidence-transfer-question"]}>
        <legend>Which question is still open?</legend>
        {COLD_TRANSFER.openQuestions.map((question) => (
          <label key={question.id} className={state.transferOpenQuestionId === question.id ? styles["forge-evidence-transfer-selected"] : undefined}>
            <input
              type="radio"
              name={`${instanceId}-transfer-open`}
              checked={state.transferOpenQuestionId === question.id}
              onChange={() => dispatch({ type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: question.id as TransferOpenQuestionId })}
            />
            <span className={styles["forge-evidence-radio"]} aria-hidden="true" />
            <strong>{question.label}</strong>
          </label>
        ))}
      </fieldset>
      <div className={classes("forge-evidence-actions", "forge-evidence-actions-transfer")}>
        <p>Your first submission becomes the record.</p>
        <ActionButton
          disabled={!state.transferChoiceId || !state.transferOpenQuestionId}
          onClick={() => dispatch({ type: "SUBMIT_TRANSFER" })}
          testId="submit-transfer"
        >
          Submit once
        </ActionButton>
      </div>
    </section>
  );
}

function ResultStage({
  state,
  receipt,
  onReset,
}: {
  state: EvidenceLearningState;
  receipt: BoundedLocalWorldRuntimeReceipt | null;
  onReset: () => void;
}) {
  if (!state.record || !state.transferScore || !receipt) return null;
  const rows = [
    { id: "started-with", label: "Started with", value: state.record.startedWith },
    { id: "tested-with", label: "Tested with", value: state.record.testedWith },
    { id: "support-used", label: "Support used", value: state.record.supportUsed },
    { id: "did-alone", label: "Did alone", value: state.record.didAlone },
    { id: "still-open", label: "Still open", value: state.record.stillOpen },
    { id: "this-attempt", label: "This attempt", value: state.record.returnProof },
  ];
  return (
    <section className={styles["forge-evidence-stage"]} data-testid="stage-result">
      <StageHeading
        number="09"
        kicker="Bounded evidence"
        title={state.transferScore.outcome === "held" ? "The pattern held once without the desk." : "The attempt is recorded, not smoothed over."}
        body="This is one immediate bounded-reading attempt, not an intelligence score, durable-learning claim, or population-level conclusion. Delayed retention remains untested and no return is scheduled."
      />
      <div className={styles["forge-evidence-result-summary"]} data-outcome={state.transferScore.outcome}>
        <span>{state.transferScore.points} / 2 authored checks</span>
        <strong>{state.transferScore.outcome === "held" ? "Cold transfer held" : state.transferScore.outcome === "partial" ? "Partial transfer" : "Not demonstrated on this attempt"}</strong>
        <p>Deterministic scoring compared two selected authored IDs. No language model judged truth or correctness.</p>
      </div>
      <dl className={styles["forge-evidence-record"]} data-testid="runtime-receipt-limits">
        <div><dt>Proof authority</dt><dd>{receipt.authority.proofAuthority.replaceAll("_", "-")}</dd></div>
        <div><dt>Persistence</dt><dd>{receipt.authority.persistence.replaceAll("_", " ")}</dd></div>
        <div><dt>Durability</dt><dd>{String(receipt.authority.isDurable)}</dd></div>
        <div><dt>Source provenance</dt><dd>{receipt.sourceProvenanceStatus}</dd></div>
      </dl>
      <div className={styles["forge-evidence-record"]}>
        {rows.map((row, index) => (
          <article key={row.id} data-testid={`record-${row.id}`}>
            <span>{String(index + 1).padStart(2, "0")} · {row.label}</span>
            <p>{row.value}</p>
          </article>
        ))}
      </div>
      <div className={styles["forge-evidence-actions"]}>
        <ActionButton onClick={onReset} testId="reset-evidence-world">Start a fresh attempt</ActionButton>
      </div>
    </section>
  );
}

export interface EvidenceLearningWorldProps {
  /** Receipts are local and bounded; callers must not treat this as durability. */
  readonly onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
}

function compatibilityOutcome(receipt: BoundedLocalWorldRuntimeReceipt): "proved" | "not_proved" | "open_question" {
  if (receipt.validator.disposition === "demonstrated") return "proved";
  return receipt.validator.disposition === "open_question" ? "open_question" : "not_proved";
}

export function EvidenceLearningWorld({ onRuntimeReceipt }: EvidenceLearningWorldProps = {}) {
  const [runtime, setRuntime] = useState(() => createWorldRuntimeSession(sourceCorroborationWorldRuntimeAdapter));
  const [testPrediction, setTestPrediction] = useState<TestPredictionId | null>(null);
  const runtimeRef = useRef(runtime);
  const state = runtime.state;
  const instanceId = useId();
  const shellRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const emittedReceiptRef = useRef<BoundedLocalWorldRuntimeReceipt | null>(null);
  const stageScrollReadyRef = useRef(false);
  const proofMode = state.stage === "transfer" || state.stage === "result";

  const dispatch: DomainDispatch = (event) => {
    const result = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtimeRef.current, {
      kind: "domain",
      event,
    });
    runtimeRef.current = result.session;
    setRuntime(result.session);
  };

  useEffect(() => {
    if (!stageScrollReadyRef.current) {
      stageScrollReadyRef.current = true;
      return;
    }
    shellRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
    mainRef.current?.focus({ preventScroll: true });
  }, [state.stage]);

  useEffect(() => {
    const receipt = runtime.receipt;
    if (!receipt || emittedReceiptRef.current === receipt) return;
    emittedReceiptRef.current = receipt;
    recordWorldProof({
      capabilityId: receipt.world.capabilityId,
      conditionId: receipt.world.proofClaimId,
      sourceRefId: receipt.world.id,
      outcome: compatibilityOutcome(receipt),
    });
    onRuntimeReceipt?.(receipt);
  }, [onRuntimeReceipt, runtime.receipt]);

  return (
    <section
      ref={shellRef}
      className={classes("forge-evidence-shell", proofMode && "forge-evidence-shell-proof")}
      data-testid="evidence-learning-world"
      data-stage={state.stage}
    >
      <header className={styles["forge-evidence-header"]}>
        <div className={styles["forge-evidence-mark"]} aria-hidden="true">E</div>
        <div>
          <strong>Evidence World</strong>
          <span>Claim → structure → boundary → proof</span>
        </div>
        <p><span /> Authored scoring only</p>
      </header>
      <ProgressRail state={state} />
      <p className="sr-only" aria-live="polite">Current evidence World stage: {state.stage.replaceAll("_", " ")}</p>
      <main
        ref={mainRef}
        className={styles["forge-evidence-main"]}
        tabIndex={-1}
        aria-label={`${state.stage.replaceAll("_", " ")} learning stage`}
      >
        {state.stage === "encounter" ? <EncounterStage state={state} dispatch={dispatch} instanceId={instanceId} /> : null}
        {state.stage === "compiler" ? (
          <CompilerStage
            state={state}
            dispatch={dispatch}
            instanceId={instanceId}
            testPrediction={testPrediction}
            onTestPrediction={setTestPrediction}
          />
        ) : null}
        {state.stage === "evidence" ? <EvidenceStage state={state} dispatch={dispatch} /> : null}
        {state.stage === "difference" ? <DifferenceStage state={state} dispatch={dispatch} instanceId={instanceId} /> : null}
        {state.stage === "readings" ? <ReadingsStage state={state} dispatch={dispatch} instanceId={instanceId} /> : null}
        {state.stage === "reconstruct" ? <ReconstructStage state={state} dispatch={dispatch} instanceId={instanceId} /> : null}
        {state.stage === "withdrawal" ? <WithdrawalStage dispatch={dispatch} /> : null}
        {state.stage === "transfer" ? <TransferStage state={state} dispatch={dispatch} instanceId={instanceId} /> : null}
        {state.stage === "result" ? <ResultStage state={state} receipt={runtime.receipt} onReset={() => { setTestPrediction(null); dispatch({ type: "RESET" }); }} /> : null}
      </main>
      <footer className={styles["forge-evidence-footer"]}>
        <span>Research claims stay bounded to the cited settings.</span>
        <span>Local state · no learner identity · no generated scoring</span>
      </footer>
    </section>
  );
}
