"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";

import {
  AUDIENCE_COPY,
  PROPORTIONAL_REASONING_CONTENT,
  createInitialRatioWorldState,
  deriveRatioEvidence,
  transitionRatioWorld,
  validateReconstruction,
  type InitialPredictionId,
  type RatioAudience,
  type RatioEvidenceRecord,
  type RatioWorldEvent,
  type RatioWorldState,
  type TransferChoiceId,
} from "../../../worlds/proportional-reasoning";

import styles from "./ProportionalReasoningWorld.module.css";
import {
  MixtureMystery,
  RatioInstrument,
  RatioPrimaryButton,
  RatioSecondaryButton,
  RatioStageHeader,
  RatioStageRail,
} from "./visuals";

export interface ProportionalReasoningWorldProps {
  readonly audience?: RatioAudience;
  readonly onExit?: () => void;
  /** Called when the evidence record is first created and again if return proof is scheduled. */
  readonly onEvidence?: (evidence: RatioEvidenceRecord) => void;
}

function reduceRatioState(state: RatioWorldState, event: RatioWorldEvent): RatioWorldState {
  return transitionRatioWorld(state, event).state;
}

function ConfidenceControl({
  id,
  value,
  onChange,
  label = "How confident are you?",
}: {
  readonly id: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly label?: string;
}) {
  return (
    <div className={styles["forge-ratio-confidence"]}>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{value}%</output>
      <input id={id} type="range" min="0" max="100" step="5" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <div className={styles["forge-ratio-range-labels"]} aria-hidden="true"><span>Unsure</span><span>Very sure</span></div>
    </div>
  );
}

function SupportLedger({ used }: { readonly used: readonly (1 | 2 | 3)[] }) {
  if (used.length === 0) return null;
  return (
    <div className={styles["forge-ratio-support-ledger"]} aria-live="polite">
      {used.map((level) => {
        const cue = PROPORTIONAL_REASONING_CONTENT.cues[level - 1];
        return (
          <article key={level}>
            <span>{cue.label} · level {cue.level}</span>
            <p>{cue.text}</p>
          </article>
        );
      })}
    </div>
  );
}

function MysteryStage({
  audience,
  prediction,
  confidence,
  onPrediction,
  onConfidence,
  onCommit,
}: {
  readonly audience: RatioAudience;
  readonly prediction: InitialPredictionId | null;
  readonly confidence: number;
  readonly onPrediction: (prediction: InitialPredictionId) => void;
  readonly onConfidence: (confidence: number) => void;
  readonly onCommit: () => void;
}) {
  return (
    <section className={styles["forge-ratio-stage"]} data-testid="ratio-stage-mystery">
      <RatioStageHeader
        number="01"
        marker="Commit before help"
        title={PROPORTIONAL_REASONING_CONTENT.title}
        body={AUDIENCE_COPY[audience].welcome}
      />
      <MixtureMystery />
      <div className={styles["forge-ratio-decision-grid"]}>
        <fieldset className={styles["forge-ratio-choice-list"]}>
          <legend>{PROPORTIONAL_REASONING_CONTENT.initialPrompt}</legend>
          {PROPORTIONAL_REASONING_CONTENT.initialOptions.map((option) => (
            <label
              className={`${styles["forge-ratio-choice"]} ${prediction === option.id ? styles["forge-ratio-choice-selected"] : ""}`}
              key={option.id}
            >
              <input
                type="radio"
                name="forge-ratio-initial-prediction"
                checked={prediction === option.id}
                onChange={() => onPrediction(option.id)}
              />
              <span className={styles["forge-ratio-choice-control"]} aria-hidden="true" />
              <strong>{option.label}</strong>
            </label>
          ))}
        </fieldset>
        <div className={styles["forge-ratio-commit-panel"]}>
          <ConfidenceControl id="forge-ratio-initial-confidence" value={confidence} onChange={onConfidence} />
          <p>Your choice will be preserved. No answer appears until after your explanation.</p>
          <RatioPrimaryButton disabled={!prediction} onClick={onCommit} testId="ratio-commit-initial">Commit my prediction</RatioPrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ExplanationStage({
  prediction,
  explanation,
  audience,
  onExplanation,
  onCommit,
}: {
  readonly prediction: InitialPredictionId;
  readonly explanation: string;
  readonly audience: RatioAudience;
  readonly onExplanation: (explanation: string) => void;
  readonly onCommit: () => void;
}) {
  const predictionLabel = PROPORTIONAL_REASONING_CONTENT.initialOptions.find((option) => option.id === prediction)?.label;
  return (
    <section className={`${styles["forge-ratio-stage"]} ${styles["forge-ratio-stage-narrow"]}`} data-testid="ratio-stage-explain">
      <RatioStageHeader
        number="02"
        marker="Expose the relationship"
        title="What made that answer feel right?"
        body={AUDIENCE_COPY[audience].explanationPrompt}
      />
      <div className={styles["forge-ratio-learner-quote"]}>
        <span>Your prediction is locked</span>
        <strong>{predictionLabel}</strong>
      </div>
      <label className={styles["forge-ratio-text-field"]} htmlFor="forge-ratio-explanation">
        <span>Your exact words</span>
        <textarea
          id="forge-ratio-explanation"
          rows={7}
          maxLength={600}
          value={explanation}
          onChange={(event) => onExplanation(event.target.value)}
          placeholder="For example: I compared…"
          autoFocus
        />
        <small>{explanation.length} / 600</small>
      </label>
      <div className={styles["forge-ratio-actions-end"]}>
        <RatioPrimaryButton disabled={explanation.trim().length < 8} onClick={onCommit} testId="ratio-commit-explanation">Turn my claim into a test</RatioPrimaryButton>
      </div>
    </section>
  );
}

function CompilerStage({ explanation, onOpenTest }: { readonly explanation: string; readonly onOpenTest: () => void }) {
  return (
    <section className={styles["forge-ratio-stage"]} data-testid="ratio-stage-compiler">
      <RatioStageHeader
        number="03"
        marker="Claim → separating test"
        title="Two readings. One point of disagreement."
        body="These are authored possibilities, not a diagnosis of you. The exact comparison can disagree with either model."
      />
      <div className={styles["forge-ratio-compiler"]}>
        <blockquote className={styles["forge-ratio-compiler-claim"]}>
          <span>Your claim</span>
          <p>“{explanation}”</p>
        </blockquote>
        <svg className={styles["forge-ratio-compiler-connector"]} aria-hidden="true" viewBox="0 0 80 220" preserveAspectRatio="none">
          <path d="M0 110H24C42 110 38 43 58 43H80M24 110C42 110 38 177 58 177H80" />
        </svg>
        <div className={styles["forge-ratio-reading-stack"]}>
          {PROPORTIONAL_REASONING_CONTENT.readings.map((reading, index) => (
            <article key={reading.id}>
              <span>{index === 0 ? "One plausible reading" : "Another plausible reading"}</span>
              <h2>{reading.label}</h2>
              <p>{reading.summary}</p>
              <strong>{reading.prediction}</strong>
            </article>
          ))}
        </div>
      </div>
      <div className={styles["forge-ratio-disagreement"]}>
        <div>
          <span>Point of disagreement</span>
          <p>{PROPORTIONAL_REASONING_CONTENT.disagreement}</p>
        </div>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        <div>
          <span>Selected exact test</span>
          <p>{PROPORTIONAL_REASONING_CONTENT.separatingTest}</p>
        </div>
      </div>
      <div className={styles["forge-ratio-actions-end"]}>
        <RatioPrimaryButton onClick={onOpenTest} testId="ratio-open-experiment">Open the exact comparison</RatioPrimaryButton>
      </div>
    </section>
  );
}

function ExperimentStage({
  state,
  audience,
  onRun,
  onView,
  onSupport,
  onReconstruct,
}: {
  readonly state: RatioWorldState;
  readonly audience: RatioAudience;
  readonly onRun: () => void;
  readonly onView: (view: "parts" | "common_water" | "table") => void;
  readonly onSupport: () => void;
  readonly onReconstruct: () => void;
}) {
  const nextCue = PROPORTIONAL_REASONING_CONTENT.cues[state.supportUsed.length];
  return (
    <section className={styles["forge-ratio-stage"]} data-testid="ratio-stage-experiment">
      <RatioStageHeader
        number="04"
        marker="Deterministic instrument"
        title="Make one quantity the same."
        body={AUDIENCE_COPY[audience].experimentNote}
      />
      <div className={styles["forge-ratio-view-controls"]} role="group" aria-label="Comparison representation">
        {(["parts", "common_water", "table"] as const).map((view) => (
          <button
            key={view}
            type="button"
            className={styles["forge-ratio-view-button"]}
            data-selected={state.experimentView === view}
            aria-pressed={state.experimentView === view}
            disabled={!state.experimentRun && view !== "parts"}
            onClick={() => onView(view)}
          >
            {view === "parts" ? "Parts" : view === "common_water" ? "Same water" : "Exact table"}
          </button>
        ))}
      </div>
      <RatioInstrument view={state.experimentView} />
      {!state.experimentRun ? (
        <div className={styles["forge-ratio-run-panel"]}>
          <p>Scaling both quantities by the same whole-number factor is deterministic and reversible.</p>
          <RatioPrimaryButton onClick={onRun} testId="ratio-run-experiment">Normalize both to 6 water</RatioPrimaryButton>
        </div>
      ) : (
        <>
          <SupportLedger used={state.supportUsed} />
          <div className={styles["forge-ratio-actions-between"]}>
            {nextCue ? <RatioSecondaryButton onClick={onSupport} testId="ratio-request-support">{state.supportUsed.length === 0 ? "Ask one attention question" : `Use ${nextCue.label.toLowerCase()}`}</RatioSecondaryButton> : <span className={styles["forge-ratio-support-ceiling"]}>The authored cue ladder is fully visible.</span>}
            <RatioPrimaryButton onClick={onReconstruct} testId="ratio-begin-reconstruction">Rebuild the relationship</RatioPrimaryButton>
          </div>
        </>
      )}
    </section>
  );
}

function ReconstructionStage({
  state,
  value,
  onChange,
  onSupport,
  onSubmit,
}: {
  readonly state: RatioWorldState;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSupport: () => void;
  readonly onSubmit: () => void;
}) {
  const nextCue = PROPORTIONAL_REASONING_CONTENT.cues[state.supportUsed.length];
  return (
    <section className={`${styles["forge-ratio-stage"]} ${styles["forge-ratio-stage-narrow"]}`} data-testid="ratio-stage-reconstruct">
      <RatioStageHeader
        number="05"
        marker="Reconstruct, do not copy"
        title="Build the rule in your own words."
        body={PROPORTIONAL_REASONING_CONTENT.reconstructionPrompt}
      />
      <div className={styles["forge-ratio-mechanism-line"]} role="img" aria-label="Multiply both quantities by the same non-zero factor to preserve a ratio">
        <div><span>relationship</span><strong>2 : 3</strong></div>
        <svg aria-hidden="true" viewBox="0 0 70 28"><path d="M4 14h58M53 5l9 9-9 9" /></svg>
        <div><span>same factor ×2</span><strong>4 : 6</strong></div>
      </div>
      <SupportLedger used={state.supportUsed} />
      <label className={styles["forge-ratio-text-field"]} htmlFor="forge-ratio-reconstruction">
        <span>Your proportional rule</span>
        <textarea
          id="forge-ratio-reconstruction"
          rows={6}
          maxLength={500}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Two relationships are proportional when…"
          autoFocus
        />
        <small>{value.length} / 500</small>
      </label>
      <div className={styles["forge-ratio-actions-between"]}>
        {nextCue ? <RatioSecondaryButton onClick={onSupport}>{state.supportUsed.length === 0 ? "Ask one attention question" : `Use ${nextCue.label.toLowerCase()}`}</RatioSecondaryButton> : <span className={styles["forge-ratio-support-ceiling"]}>The authored cue ladder is fully visible.</span>}
        <RatioPrimaryButton disabled={!validateReconstruction(value)} onClick={onSubmit} testId="ratio-submit-reconstruction">Remove support and test my model</RatioPrimaryButton>
      </div>
    </section>
  );
}

function WithdrawalStage({ onBegin }: { readonly onBegin: () => void }) {
  return (
    <section className={`${styles["forge-ratio-stage"]} ${styles["forge-ratio-withdrawal"]}`} data-testid="ratio-stage-withdrawal">
      <RatioStageHeader
        number="06"
        marker="Assistance withdrawal"
        title="Now the instrument leaves."
        body="The next situation uses the same capability in an unfamiliar form. Your response can be submitted once."
      />
      <div className={styles["forge-ratio-withdrawal-grid"]}>
        <article>
          <span>Removed for proof</span>
          <ul><li>Interpretation of your language</li><li>Selection of a separating test</li><li>The authored cue ladder</li></ul>
        </article>
        <article>
          <span>Still available</span>
          <ul><li>Keyboard and screen-reader access</li><li>Exact numbers and readable labels</li><li>Your own explanation field</li></ul>
        </article>
      </div>
      <div className={styles["forge-ratio-actions-end"]}><RatioPrimaryButton onClick={onBegin} testId="ratio-begin-proof">Begin the map problem alone</RatioPrimaryButton></div>
    </section>
  );
}

function TransferStage({
  choice,
  explanation,
  confidence,
  onChoice,
  onExplanation,
  onConfidence,
  onSubmit,
}: {
  readonly choice: TransferChoiceId | null;
  readonly explanation: string;
  readonly confidence: number;
  readonly onChoice: (choice: TransferChoiceId) => void;
  readonly onExplanation: (explanation: string) => void;
  readonly onConfidence: (confidence: number) => void;
  readonly onSubmit: () => void;
}) {
  return (
    <section className={`${styles["forge-ratio-stage"]} ${styles["forge-ratio-proof-stage"]}`} data-testid="ratio-stage-transfer" data-assistance="off">
      <RatioStageHeader
        number="06"
        marker="Independent transfer · assistance off"
        title="Carry the relationship into a map."
        body={PROPORTIONAL_REASONING_CONTENT.transfer.prompt}
      />
      <div className={styles["forge-ratio-map-figure"]} role="img" aria-label="A map scale shows 3 centimetres corresponding to 8 kilometres, and a new trail measuring 12 centimetres">
        <div><span className={styles["forge-ratio-map-line-short"]} /><strong>3 cm</strong><small>8 km in reality</small></div>
        <div><span className={styles["forge-ratio-map-line-long"]} /><strong>12 cm</strong><small>? km in reality</small></div>
      </div>
      <fieldset className={styles["forge-ratio-transfer-choices"]}>
        <legend>Select one exact distance.</legend>
        {PROPORTIONAL_REASONING_CONTENT.transfer.options.map((option) => (
          <label key={option.id} data-selected={choice === option.id}>
            <input type="radio" name="forge-ratio-transfer" checked={choice === option.id} onChange={() => onChoice(option.id)} />
            <span aria-hidden="true" />
            <strong>{option.label}</strong>
          </label>
        ))}
      </fieldset>
      <label className={styles["forge-ratio-text-field"]} htmlFor="forge-ratio-transfer-explanation">
        <span>Show the relationship you used</span>
        <textarea id="forge-ratio-transfer-explanation" rows={4} maxLength={400} value={explanation} onChange={(event) => onExplanation(event.target.value)} placeholder="I know this because…" />
        <small>{explanation.length} / 400</small>
      </label>
      <div className={styles["forge-ratio-proof-submit"]}>
        <ConfidenceControl id="forge-ratio-transfer-confidence" value={confidence} onChange={onConfidence} label="Confidence in this new problem" />
        <RatioPrimaryButton disabled={!choice || explanation.trim().length < 8} onClick={onSubmit} testId="ratio-submit-proof">Submit this proof once</RatioPrimaryButton>
      </div>
    </section>
  );
}

function EvidenceStage({
  state,
  onSchedule,
  onReset,
}: {
  readonly state: RatioWorldState;
  readonly onSchedule: () => void;
  readonly onReset: () => void;
}) {
  const evidence = deriveRatioEvidence(state);
  if (!evidence) return null;
  return (
    <section className={`${styles["forge-ratio-stage"]} ${styles["forge-ratio-evidence-stage"]}`} data-testid="ratio-stage-evidence">
      <RatioStageHeader
        number="07"
        marker="Bounded evidence · not a mastery score"
        title="What this attempt actually showed."
        body="The record separates what happened with support from what happened after support was removed."
      />
      <div className={styles["forge-ratio-evidence-paper"]}>
        <header>
          <span>Capability evidence</span>
          <strong>{evidence.independentTransfer.answerCorrect ? "Exact result on this new problem" : "More independent evidence needed"}</strong>
        </header>
        <dl>
          <div><dt>Initial model</dt><dd>{PROPORTIONAL_REASONING_CONTENT.initialOptions.find((option) => option.id === evidence.before.predictionId)?.label} · {evidence.before.confidence}% confidence</dd></div>
          <div><dt>Separating test</dt><dd><code>{evidence.separatingTest.commonWaterComparison}</code>, observed in the deterministic instrument</dd></div>
          <div><dt>Support used before proof</dt><dd>{evidence.assistance.levelsUsed.length === 0 ? "None" : `Authored levels ${evidence.assistance.levelsUsed.join(", ")}`}</dd></div>
          <div><dt>Independent transfer</dt><dd>{evidence.independentTransfer.answerCorrect ? "Exact choice" : "Choice did not match the exact relationship"}; explanation submitted at {evidence.independentTransfer.confidence}% confidence</dd></div>
        </dl>
        <div className={styles["forge-ratio-evidence-claim"]}>
          <span>Demonstrated on this attempt</span>
          <p>{evidence.demonstrated}</p>
        </div>
        <div className={styles["forge-ratio-untested"]}>
          <span>Not tested yet</span>
          <ul>{evidence.notYetTested.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <div className={styles["forge-ratio-return-proof"]}>
        <div><span>Return proof</span><p>{PROPORTIONAL_REASONING_CONTENT.returnProof.description}</p></div>
        {state.returnProofScheduled ? <strong role="status">Marked for a new check in {PROPORTIONAL_REASONING_CONTENT.returnProof.afterDays} days.</strong> : <RatioPrimaryButton onClick={onSchedule} testId="ratio-schedule-return">Schedule a quiet return check</RatioPrimaryButton>}
      </div>
      <div className={styles["forge-ratio-actions-end"]}><RatioSecondaryButton onClick={onReset}>Start this world again</RatioSecondaryButton></div>
    </section>
  );
}

export function ProportionalReasoningWorld({
  audience = "teen",
  onExit,
  onEvidence,
}: ProportionalReasoningWorldProps) {
  const id = useId();
  const [state, dispatch] = useReducer(reduceRatioState, createInitialRatioWorldState());
  const [prediction, setPrediction] = useState<InitialPredictionId | null>(null);
  const [initialConfidence, setInitialConfidence] = useState(60);
  const [explanation, setExplanation] = useState("");
  const [reconstruction, setReconstruction] = useState("");
  const [transferChoice, setTransferChoice] = useState<TransferChoiceId | null>(null);
  const [transferExplanation, setTransferExplanation] = useState("");
  const [transferConfidence, setTransferConfidence] = useState(60);
  const evidence = useMemo(() => deriveRatioEvidence(state), [state]);
  const lastEvidenceKey = useRef<string | null>(null);

  useEffect(() => {
    if (!evidence || !onEvidence) return;
    const key = `${evidence.independentTransfer.choiceId}:${evidence.returnProof.scheduled}`;
    if (lastEvidenceKey.current === key) return;
    lastEvidenceKey.current = key;
    onEvidence(evidence);
  }, [evidence, onEvidence]);

  function resetWorld(): void {
    dispatch({ type: "RESET" });
    setPrediction(null);
    setInitialConfidence(60);
    setExplanation("");
    setReconstruction("");
    setTransferChoice(null);
    setTransferExplanation("");
    setTransferConfidence(60);
    lastEvidenceKey.current = null;
  }

  const proofSurface = state.stage === "COLD_TRANSFER" || state.stage === "EVIDENCE";
  const shellClassName = `${styles["forge-ratio-shell"]} ${proofSurface ? styles["forge-ratio-shell-proof"] : ""}`;

  return (
    <div className={shellClassName} data-world="proportional-reasoning" data-stage={state.stage} id={`forge-ratio-${id.replaceAll(":", "")}`}>
      <a className={styles["forge-ratio-skip-link"]} href="#forge-ratio-main">Skip to the current question</a>
      <header className={styles["forge-ratio-topbar"]}>
        <div className={styles["forge-ratio-wordmark"]} aria-label="FORGE model world">
          <span>F</span>
          <div><strong>FORGE</strong><small>Proportional reasoning model world</small></div>
        </div>
        <div className={styles["forge-ratio-top-actions"]}>
          <span>Exact arithmetic · authored support · proof after help</span>
          {onExit ? <button type="button" onClick={onExit}>Leave world</button> : null}
        </div>
      </header>
      <RatioStageRail stage={state.stage} />
      <main id="forge-ratio-main" className={styles["forge-ratio-main"]}>
        {state.stage === "MYSTERY" ? (
          <MysteryStage
            audience={audience}
            prediction={prediction}
            confidence={initialConfidence}
            onPrediction={setPrediction}
            onConfidence={setInitialConfidence}
            onCommit={() => {
              if (prediction) dispatch({ type: "COMMIT_INITIAL", predictionId: prediction, confidence: initialConfidence });
            }}
          />
        ) : null}
        {state.stage === "EXPLAIN" && state.initialPredictionId ? (
          <ExplanationStage
            prediction={state.initialPredictionId}
            explanation={explanation}
            audience={audience}
            onExplanation={setExplanation}
            onCommit={() => dispatch({ type: "COMMIT_EXPLANATION", explanation })}
          />
        ) : null}
        {state.stage === "COMPILER" ? <CompilerStage explanation={state.initialExplanation} onOpenTest={() => dispatch({ type: "ACCEPT_SEPARATING_TEST" })} /> : null}
        {state.stage === "EXPERIMENT" ? (
          <ExperimentStage
            state={state}
            audience={audience}
            onRun={() => dispatch({ type: "RUN_EXPERIMENT" })}
            onView={(view) => dispatch({ type: "SET_EXPERIMENT_VIEW", view })}
            onSupport={() => dispatch({ type: "REQUEST_SUPPORT" })}
            onReconstruct={() => dispatch({ type: "BEGIN_RECONSTRUCTION" })}
          />
        ) : null}
        {state.stage === "RECONSTRUCT" ? (
          <ReconstructionStage
            state={state}
            value={reconstruction}
            onChange={setReconstruction}
            onSupport={() => dispatch({ type: "REQUEST_SUPPORT" })}
            onSubmit={() => dispatch({ type: "SUBMIT_RECONSTRUCTION", reconstruction })}
          />
        ) : null}
        {state.stage === "WITHDRAWAL" ? <WithdrawalStage onBegin={() => dispatch({ type: "ACKNOWLEDGE_WITHDRAWAL" })} /> : null}
        {state.stage === "COLD_TRANSFER" ? (
          <TransferStage
            choice={transferChoice}
            explanation={transferExplanation}
            confidence={transferConfidence}
            onChoice={setTransferChoice}
            onExplanation={setTransferExplanation}
            onConfidence={setTransferConfidence}
            onSubmit={() => {
              if (transferChoice) dispatch({ type: "SUBMIT_TRANSFER", choiceId: transferChoice, explanation: transferExplanation, confidence: transferConfidence });
            }}
          />
        ) : null}
        {state.stage === "EVIDENCE" ? <EvidenceStage state={state} onSchedule={() => dispatch({ type: "SCHEDULE_RETURN_PROOF" })} onReset={resetWorld} /> : null}
      </main>
    </div>
  );
}
