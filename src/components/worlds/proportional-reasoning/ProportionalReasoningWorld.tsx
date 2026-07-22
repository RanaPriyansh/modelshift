"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  AUDIENCE_COPY,
  PROPORTIONAL_REASONING_CONTENT,
  deriveRatioEvidence,
  validateReconstruction,
  type InitialPredictionId,
  type RatioAudience,
  type RatioEvidenceRecord,
  type RatioWorldEvent,
  type RatioWorldState,
  type SeparatingTestPredictionId,
  type TransferChoiceId,
} from "../../../worlds/proportional-reasoning";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  proportionalReasoningWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "../../../forge/world-runtime";

import styles from "./ProportionalReasoningWorld.module.css";
import {
  MixtureMystery,
  RatioInstrument,
  RatioPrimaryButton,
  RatioSecondaryButton,
  RatioStageHeader,
  RatioStageRail,
} from "./visuals";

const TEST_PREDICTION_OPTIONS: readonly {
  readonly id: SeparatingTestPredictionId;
  readonly label: string;
}[] = [
  { id: "same_strength", label: PROPORTIONAL_REASONING_CONTENT.readings[0].prediction },
  { id: "jug_b_stronger", label: PROPORTIONAL_REASONING_CONTENT.readings[1].prediction },
];

const STAGE_ANNOUNCEMENTS: Readonly<Record<RatioWorldState["stage"], string>> = {
  MYSTERY: "Commit stage",
  EXPLAIN: "Explain stage",
  COMPILER: "Two readings and test prediction stage",
  EXPERIMENT: "Separating comparison stage",
  RECONSTRUCT: "Reconstruct stage",
  WITHDRAWAL: "Assistance withdrawal stage",
  COLD_TRANSFER: "Independent transfer stage",
  EVIDENCE: "Bounded evidence stage",
};

export interface ProportionalReasoningWorldProps {
  readonly audience?: RatioAudience;
  readonly onExit?: () => void;
  /** Compatibility callback for the one local, legacy evidence projection. */
  readonly onEvidence?: (evidence: RatioEvidenceRecord) => void;
  /** Called once per completed local runtime attempt; never persisted here. */
  readonly onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
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
  predictionName,
  confidenceId,
}: {
  readonly audience: RatioAudience;
  readonly prediction: InitialPredictionId | null;
  readonly confidence: number;
  readonly onPrediction: (prediction: InitialPredictionId) => void;
  readonly onConfidence: (confidence: number) => void;
  readonly onCommit: () => void;
  readonly predictionName: string;
  readonly confidenceId: string;
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
                name={predictionName}
                checked={prediction === option.id}
                onChange={() => onPrediction(option.id)}
              />
              <span className={styles["forge-ratio-choice-control"]} aria-hidden="true" />
              <strong>{option.label}</strong>
            </label>
          ))}
        </fieldset>
        <div className={styles["forge-ratio-commit-panel"]}>
          <ConfidenceControl id={confidenceId} value={confidence} onChange={onConfidence} />
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
  explanationId,
}: {
  readonly prediction: InitialPredictionId;
  readonly explanation: string;
  readonly audience: RatioAudience;
  readonly onExplanation: (explanation: string) => void;
  readonly onCommit: () => void;
  readonly explanationId: string;
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
      <label className={styles["forge-ratio-text-field"]} htmlFor={explanationId}>
        <span>Your exact words</span>
        <textarea
          id={explanationId}
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

function CompilerStage({
  explanation,
  prediction,
  predictionName,
  onPrediction,
  onOpenTest,
}: {
  readonly explanation: string;
  readonly prediction: SeparatingTestPredictionId | null;
  readonly predictionName: string;
  readonly onPrediction: (prediction: SeparatingTestPredictionId) => void;
  readonly onOpenTest: () => void;
}) {
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
      <fieldset className={styles["forge-ratio-choice-list"]}>
        <legend>Before opening the comparison, which reading do you predict will hold at 6 cups of water?</legend>
        {TEST_PREDICTION_OPTIONS.map((option) => (
          <label
            className={`${styles["forge-ratio-choice"]} ${prediction === option.id ? styles["forge-ratio-choice-selected"] : ""}`}
            key={option.id}
          >
            <input
              type="radio"
              name={predictionName}
              checked={prediction === option.id}
              onChange={() => onPrediction(option.id)}
            />
            <span className={styles["forge-ratio-choice-control"]} aria-hidden="true" />
            <strong>{option.label}</strong>
          </label>
        ))}
      </fieldset>
      <div className={styles["forge-ratio-actions-end"]}>
        <RatioPrimaryButton disabled={!prediction} onClick={onOpenTest} testId="ratio-commit-test-prediction">Commit this test prediction</RatioPrimaryButton>
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
  reconstructionId,
}: {
  readonly state: RatioWorldState;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSupport: () => void;
  readonly onSubmit: () => void;
  readonly reconstructionId: string;
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
      <label className={styles["forge-ratio-text-field"]} htmlFor={reconstructionId}>
        <span>Your proportional rule</span>
        <textarea
          id={reconstructionId}
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
  choiceName,
  explanationId,
  confidenceId,
}: {
  readonly choice: TransferChoiceId | null;
  readonly explanation: string;
  readonly confidence: number;
  readonly onChoice: (choice: TransferChoiceId) => void;
  readonly onExplanation: (explanation: string) => void;
  readonly onConfidence: (confidence: number) => void;
  readonly onSubmit: () => void;
  readonly choiceName: string;
  readonly explanationId: string;
  readonly confidenceId: string;
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
            <input type="radio" name={choiceName} checked={choice === option.id} onChange={() => onChoice(option.id)} />
            <span aria-hidden="true" />
            <strong>{option.label}</strong>
          </label>
        ))}
      </fieldset>
      <label className={styles["forge-ratio-text-field"]} htmlFor={explanationId}>
        <span>Show the relationship you used</span>
        <textarea id={explanationId} rows={4} maxLength={400} value={explanation} onChange={(event) => onExplanation(event.target.value)} placeholder="I know this because…" />
        <small>{explanation.length} / 400</small>
      </label>
      <div className={styles["forge-ratio-proof-submit"]}>
        <ConfidenceControl id={confidenceId} value={confidence} onChange={onConfidence} label="Confidence in this new problem" />
        <RatioPrimaryButton disabled={!choice || explanation.trim().length < 8} onClick={onSubmit} testId="ratio-submit-proof">Submit this proof once</RatioPrimaryButton>
      </div>
    </section>
  );
}

function EvidenceStage({
  state,
  onReset,
}: {
  readonly state: RatioWorldState;
  readonly onReset: () => void;
}) {
  const evidence = deriveRatioEvidence(state);
  if (!evidence) return null;
  const demonstrated = evidence.independentTransfer.relationshipMechanismDemonstrated;
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
          <strong>{demonstrated ? "Relationship demonstrated on this new problem" : "More independent evidence needed"}</strong>
        </header>
        <dl>
          <div><dt>Initial model</dt><dd>{PROPORTIONAL_REASONING_CONTENT.initialOptions.find((option) => option.id === evidence.before.predictionId)?.label} · {evidence.before.confidence}% confidence</dd></div>
          <div><dt>Separating test</dt><dd><code>{evidence.separatingTest.commonWaterComparison}</code>, observed in the deterministic instrument</dd></div>
          <div><dt>Support used before proof</dt><dd>{evidence.assistance.levelsUsed.length === 0 ? "None" : `Authored levels ${evidence.assistance.levelsUsed.join(", ")}`}</dd></div>
          <div><dt>Independent transfer</dt><dd>{evidence.independentTransfer.answerCorrect ? "Exact choice" : "Choice did not match the exact relationship"}; explanation submitted at {evidence.independentTransfer.confidence}% confidence</dd></div>
        </dl>
        <div className={styles["forge-ratio-evidence-claim"]}>
          <span>{demonstrated ? "Demonstrated on this attempt" : "Not demonstrated on this attempt"}</span>
          <p>{evidence.demonstrated}</p>
        </div>
        <div className={styles["forge-ratio-untested"]}>
          <span>Not tested yet</span>
          <ul>{evidence.notYetTested.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <div className={styles["forge-ratio-return-proof"]}>
        <div><span>Return proof not yet available</span><p>{PROPORTIONAL_REASONING_CONTENT.returnProof.description}</p></div>
        <strong>No reviewed delayed task or scheduler is published for this World.</strong>
      </div>
      <div className={styles["forge-ratio-actions-end"]}><RatioSecondaryButton onClick={onReset}>Start this world again</RatioSecondaryButton></div>
    </section>
  );
}

export function ProportionalReasoningWorld({
  audience = "teen",
  onExit,
  onEvidence,
  onRuntimeReceipt,
}: ProportionalReasoningWorldProps) {
  const id = useId();
  const instanceId = id.replaceAll(":", "");
  const mainId = `forge-ratio-main-${instanceId}`;
  const mainRef = useRef<HTMLElement>(null);
  const emittedReceiptRef = useRef<BoundedLocalWorldRuntimeReceipt | null>(null);
  const [runtime, setRuntime] = useState(() => createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter));
  const runtimeRef = useRef(runtime);
  const state = runtime.state;
  const [prediction, setPrediction] = useState<InitialPredictionId | null>(null);
  const [initialConfidence, setInitialConfidence] = useState(60);
  const [explanation, setExplanation] = useState("");
  const [testPrediction, setTestPrediction] = useState<SeparatingTestPredictionId | null>(null);
  const [reconstruction, setReconstruction] = useState("");
  const [transferChoice, setTransferChoice] = useState<TransferChoiceId | null>(null);
  const [transferExplanation, setTransferExplanation] = useState("");
  const [transferConfidence, setTransferConfidence] = useState(60);
  const evidence = deriveRatioEvidence(state);
  const lastEvidenceKey = useRef<string | null>(null);

  function send(event: RatioWorldEvent): boolean {
    const result = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtimeRef.current, {
      kind: "domain",
      event,
    });
    runtimeRef.current = result.session;
    setRuntime(result.session);
    return result.accepted;
  }

  useEffect(() => {
    if (!evidence || !onEvidence) return;
    const key = `${evidence.independentTransfer.choiceId}:${evidence.independentTransfer.relationshipMechanismDemonstrated}`;
    if (lastEvidenceKey.current === key) return;
    lastEvidenceKey.current = key;
    onEvidence(evidence);
  }, [evidence, onEvidence]);

  useEffect(() => {
    if (runtime.receipt && emittedReceiptRef.current !== runtime.receipt) {
      emittedReceiptRef.current = runtime.receipt;
      onRuntimeReceipt?.(runtime.receipt);
    }
  }, [onRuntimeReceipt, runtime.receipt]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [state.stage]);

  function resetWorld(): void {
    send({ type: "RESET" });
    setPrediction(null);
    setInitialConfidence(60);
    setExplanation("");
    setTestPrediction(null);
    setReconstruction("");
    setTransferChoice(null);
    setTransferExplanation("");
    setTransferConfidence(60);
    lastEvidenceKey.current = null;
    emittedReceiptRef.current = null;
  }

  const proofSurface = state.stage === "COLD_TRANSFER" || state.stage === "EVIDENCE";
  const shellClassName = `${styles["forge-ratio-shell"]} ${proofSurface ? styles["forge-ratio-shell-proof"] : ""}`;

  return (
    <div className={shellClassName} data-world="proportional-reasoning" data-stage={state.stage} id={`forge-ratio-${instanceId}`}>
      <a className={styles["forge-ratio-skip-link"]} href={`#${mainId}`}>Skip to the current question</a>
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
      <p className={styles["forge-ratio-stage-announcement"]} aria-live="polite">{STAGE_ANNOUNCEMENTS[state.stage]}</p>
      <main id={mainId} className={styles["forge-ratio-main"]} ref={mainRef} tabIndex={-1}>
        {state.stage === "MYSTERY" ? (
          <MysteryStage
            audience={audience}
            prediction={prediction}
            confidence={initialConfidence}
            onPrediction={setPrediction}
            onConfidence={setInitialConfidence}
            onCommit={() => {
              if (prediction) send({ type: "COMMIT_INITIAL", predictionId: prediction, confidence: initialConfidence });
            }}
            predictionName={`forge-ratio-initial-prediction-${instanceId}`}
            confidenceId={`forge-ratio-initial-confidence-${instanceId}`}
          />
        ) : null}
        {state.stage === "EXPLAIN" && state.initialPredictionId ? (
          <ExplanationStage
            prediction={state.initialPredictionId}
            explanation={explanation}
            audience={audience}
            onExplanation={setExplanation}
            onCommit={() => send({ type: "COMMIT_EXPLANATION", explanation })}
            explanationId={`forge-ratio-explanation-${instanceId}`}
          />
        ) : null}
        {state.stage === "COMPILER" ? (
          <CompilerStage
            explanation={state.initialExplanation}
            prediction={testPrediction}
            predictionName={`forge-ratio-test-prediction-${instanceId}`}
            onPrediction={setTestPrediction}
            onOpenTest={() => {
              if (testPrediction) send({ type: "COMMIT_TEST_PREDICTION", predictionId: testPrediction });
            }}
          />
        ) : null}
        {state.stage === "EXPERIMENT" ? (
          <ExperimentStage
            state={state}
            audience={audience}
            onRun={() => send({ type: "RUN_EXPERIMENT" })}
            onView={(view) => send({ type: "SET_EXPERIMENT_VIEW", view })}
            onSupport={() => send({ type: "REQUEST_SUPPORT" })}
            onReconstruct={() => send({ type: "BEGIN_RECONSTRUCTION" })}
          />
        ) : null}
        {state.stage === "RECONSTRUCT" ? (
          <ReconstructionStage
            state={state}
            value={reconstruction}
            onChange={setReconstruction}
            onSupport={() => send({ type: "REQUEST_SUPPORT" })}
            onSubmit={() => send({ type: "SUBMIT_RECONSTRUCTION", reconstruction })}
            reconstructionId={`forge-ratio-reconstruction-${instanceId}`}
          />
        ) : null}
        {state.stage === "WITHDRAWAL" ? <WithdrawalStage onBegin={() => send({ type: "ACKNOWLEDGE_WITHDRAWAL" })} /> : null}
        {state.stage === "COLD_TRANSFER" ? (
          <TransferStage
            choice={transferChoice}
            explanation={transferExplanation}
            confidence={transferConfidence}
            onChoice={setTransferChoice}
            onExplanation={setTransferExplanation}
            onConfidence={setTransferConfidence}
            onSubmit={() => {
              if (transferChoice) send({ type: "SUBMIT_TRANSFER", choiceId: transferChoice, explanation: transferExplanation, confidence: transferConfidence });
            }}
            choiceName={`forge-ratio-transfer-${instanceId}`}
            explanationId={`forge-ratio-transfer-explanation-${instanceId}`}
            confidenceId={`forge-ratio-transfer-confidence-${instanceId}`}
          />
        ) : null}
        {state.stage === "EVIDENCE" ? <EvidenceStage state={state} onReset={resetWorld} /> : null}
      </main>
    </div>
  );
}
