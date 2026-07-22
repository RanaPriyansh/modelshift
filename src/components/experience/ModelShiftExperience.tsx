"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { EXPLICIT_UNCERTAINTY, LEVEL_1_QUESTIONS, LEVEL_2_CONTRASTS, LEVEL_3_PRINCIPLE, MYSTERY, PROBES, TRANSFER } from "@/src/content";
import { HYPOTHESES } from "@/src/content/hypotheses";
import { ExperimentWorld } from "@/src/components/simulation/ExperimentWorld";
import { MysteryWorld } from "@/src/components/simulation/MysteryWorld";
import { ForceTimeGraph, TransferGraphChoice } from "@/src/components/simulation/TransferGraphs";
import {
  deriveEvidenceCard,
  type EvidenceCard,
  type LearningEvent,
  type LearningInterpretation,
  type LearningState,
} from "@/src/domain/learning";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  forceAndMotionWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
  type ForceAndMotionRuntimeProof,
  type WorldRuntimeSession,
} from "@/src/forge/world-runtime";
import { interpretationApiResponseSchema } from "@/src/lib/ai/schema";
import { validateInterpretation } from "@/src/lib/ai/validation";
import { recordWorldProof, type RecordWorldProofInput } from "@/src/lib/forge-evidence";
import type {
  FallbackReason,
  LearningStage,
  PredictionId,
  ProbeId,
  SupportLevel,
  TransferChoiceId,
  ValidatedInterpretation,
} from "@/src/types/modelshift";

type ActiveStage = Exclude<LearningStage, "HOOK">;

const STAGE_STEPS: Array<{ id: ActiveStage; label: string }> = [
  { id: "PREDICT", label: "Predict" },
  { id: "EXPLAIN", label: "Explain" },
  { id: "INTERPRET", label: "Choose the test" },
  { id: "PROBE_PREDICT", label: "Choose the test" },
  { id: "EXPERIMENT", label: "Experiment" },
  { id: "REFLECT", label: "Reflect" },
  { id: "RECONSTRUCT", label: "Rebuild" },
  { id: "COLD_TRANSFER", label: "Prove" },
  { id: "PROOF_RESULT", label: "Evidence" },
];

const VISIBLE_STEPS = ["PREDICT", "EXPLAIN", "INTERPRET", "EXPERIMENT", "RECONSTRUCT", "COLD_TRANSFER", "PROOF_RESULT"] as const;

const FALLBACK_COPY = "There are a few ways to read that explanation, so we'll run the baseline test.";
const INTERPRETATION_CLIENT_TIMEOUT_MS = 7_000;

type ClientInterpretationValidation =
  | { readonly ok: true; readonly value: ValidatedInterpretation }
  | { readonly ok: false; readonly reason: FallbackReason };

function validateApiInterpretation(candidate: unknown, explanation: string): ClientInterpretationValidation {
  const parsed = interpretationApiResponseSchema.safeParse(candidate);
  if (!parsed.success) {
    const enumProblem = parsed.error.issues.some((issue) => issue.code === "invalid_value");
    return { ok: false, reason: enumProblem ? "invalid_enum" : "malformed_output" };
  }
  if (parsed.data.source === "fallback") {
    return { ok: false, reason: parsed.data.fallback_reason };
  }

  const value = parsed.data;
  const validated = validateInterpretation({
    schema_version: value.schema_version,
    hypotheses: value.hypotheses,
    missing_distinctions: value.missing_distinctions,
    recommended_probe_id: value.recommended_probe_id,
    recommended_level_1_question_id: value.recommended_level_1_question_id,
    abstain: value.abstain,
    abstain_reason: value.abstain_reason,
  }, explanation);
  if (!validated.ok) return validated;
  return {
    ok: true,
    value: {
      ...validated.value,
      providerId: value.providerId,
      modelId: value.modelId,
      policyId: value.policyId,
    },
  };
}

function compilerHypotheses(interpretation: LearningInterpretation) {
  return interpretation.hypothesisIds.map((id) => HYPOTHESES[id]);
}

function receiptOutcome(receipt: BoundedLocalWorldRuntimeReceipt): "proved" | "not_proved" | "open_question" {
  if (receipt.validator.disposition === "demonstrated") return "proved";
  if (receipt.validator.disposition === "not_demonstrated") return "not_proved";
  return "open_question";
}

function receiptAssistance(receipt: BoundedLocalWorldRuntimeReceipt): NonNullable<RecordWorldProofInput["assistance"]> {
  const assistance: NonNullable<RecordWorldProofInput["assistance"]>[number][] = [];
  for (const support of receipt.cognitiveSupport) {
    if (support.source === "model") {
      assistance.push({ kind: "model_interpretation", sourceId: "model.interpretation.force-motion" });
      continue;
    }
    if (support.actionId === "action.force-and-motion.interpretation" && support.tier === "representation") {
      assistance.push({ kind: "authored_representation", sourceId: "support.force-motion.authored-interpretation" });
      continue;
    }
    if (support.tier === "attention") {
      assistance.push({ kind: "authored_hint", sourceId: "support.force-motion.level-1" });
      continue;
    }
    if (support.tier === "representation") {
      assistance.push({ kind: "authored_contrast", sourceId: "support.force-motion.level-2" });
      continue;
    }
    if (support.tier === "repair") {
      assistance.push({ kind: "authored_principle", sourceId: "support.force-motion.level-3" });
    }
  }
  return assistance;
}

function createStartedRuntimeSession(): WorldRuntimeSession<LearningState, ForceAndMotionRuntimeProof> {
  const initial = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
  const started = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, initial, {
    kind: "domain",
    event: { type: "START" },
  });
  return started.session;
}

function stageIndex(stage: ActiveStage) {
  const normalized = stage === "PROBE_PREDICT" ? "INTERPRET" : stage === "REFLECT" ? "EXPERIMENT" : stage;
  return VISIBLE_STEPS.indexOf(normalized as (typeof VISIBLE_STEPS)[number]);
}

function StageRail({ stage }: { stage: ActiveStage }) {
  const current = stageIndex(stage);
  return (
    <ol className="stage-rail" aria-label="Learning journey progress">
      {VISIBLE_STEPS.map((item, index) => {
        const label = STAGE_STEPS.find((step) => step.id === item)?.label ?? item;
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        return (
          <li key={item} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span>{index + 1}</span><small>{label}</small>
          </li>
        );
      })}
    </ol>
  );
}

function StageHeading({ number, title, eyebrow, body }: { number: string; title: string; eyebrow: string; body?: string }) {
  return (
    <header className="stage-heading">
      <div className="stage-heading__number" aria-hidden="true">{number}</div>
      <div>
        <p className="stage-heading__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {body ? <p className="stage-heading__body">{body}</p> : null}
      </div>
    </header>
  );
}

function PrimaryButton({ children, disabled, onClick, type = "button", testId }: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit"; testId?: string }) {
  return <button className="button button--primary" disabled={disabled} onClick={onClick} type={type} data-testid={testId}>{children}<span aria-hidden="true">→</span></button>;
}

function SecondaryButton({ children, onClick, disabled, testId }: { children: ReactNode; onClick?: () => void; disabled?: boolean; testId?: string }) {
  return <button className="button button--secondary" onClick={onClick} disabled={disabled} type="button" data-testid={testId}>{children}</button>;
}

function PredictionStage({ prediction, confidence, onPrediction, onConfidence, onCommit, predictionName, confidenceId }: {
  prediction: PredictionId | null;
  confidence: number;
  onPrediction: (id: PredictionId) => void;
  onConfidence: (value: number) => void;
  onCommit: () => void;
  predictionName: string;
  confidenceId: string;
}) {
  return (
    <section className="stage stage--predict" data-testid="stage-predict">
      <StageHeading number="01" eyebrow="Commit before help" title={MYSTERY.title} body="The craft is already moving. The engine stops in a region with no horizontal resistance." />
      <MysteryWorld />
      <div className="prediction-layout">
        <fieldset className="choice-list">
          <legend>Choose the best prediction.</legend>
          {MYSTERY.predictions.map((choice) => (
            <label key={choice.id} className={["choice-row", prediction === choice.id ? "choice-row--selected" : ""].join(" ")}>
              <input type="radio" name={predictionName} value={choice.id} checked={prediction === choice.id} onChange={() => onPrediction(choice.id)} />
              <span className="choice-row__control" aria-hidden="true" />
              <span className="choice-row__label">{choice.label}</span>
              <span className={`mini-trace mini-trace--${choice.graphHint}`} aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        <div className="confidence-panel">
          <label htmlFor={confidenceId}>How confident are you?</label>
          <output htmlFor={confidenceId}>{confidence}%</output>
          <input id={confidenceId} type="range" min="0" max="100" step="5" value={confidence} onChange={(event) => onConfidence(Number(event.target.value))} />
          <div className="range-labels" aria-hidden="true"><span>Not sure</span><span>Somewhat sure</span><span>Very sure</span></div>
          <PrimaryButton disabled={!prediction} onClick={onCommit} testId="commit-prediction">Commit prediction</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ExplanationStage({ prediction, explanation, onExplanation, onSubmit, onDontKnow, explanationId }: {
  prediction: PredictionId;
  explanation: string;
  onExplanation: (value: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
  explanationId: string;
}) {
  return (
    <section className="stage stage--explain" data-testid="stage-explain">
      <StageHeading number="02" eyebrow="Reveal the causal model" title="What makes you think that?" body="Describe what you think the force is doing. The goal is not polished wording; it is the model behind your prediction." />
      <div className="writing-stage">
        <div className="committed-answer">
          <span>Prediction locked</span>
          <strong>{MYSTERY.predictions.find((item) => item.id === prediction)?.label ?? "Your prediction"}</strong>
        </div>
        <label className="textarea-field" htmlFor={explanationId}>
          <span>Your explanation</span>
          <textarea id={explanationId} value={explanation} maxLength={600} rows={7} onChange={(event) => onExplanation(event.target.value)} placeholder="For example: What happens when the engine is no longer pushing? Is any other force present?" />
          <small>{explanation.length} / 600</small>
        </label>
        <p className="privacy-note">
          Your explanation goes to the FORGE server. External AI is off by default; if an operator explicitly enables it,
          this text may be sent to OpenAI with storage disabled. Raw explanations are never added to your evidence ledger.
        </p>
        <div className="stage-actions">
          <SecondaryButton onClick={onDontKnow}>I genuinely don&apos;t know</SecondaryButton>
          <PrimaryButton disabled={explanation.trim().length < 8} onClick={onSubmit} testId="submit-explanation">Use my explanation</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function InterpretationStage({ interpretation, explanation, loading, probePrediction, onProbePrediction, onContinue, probePredictionName }: {
  interpretation: LearningInterpretation | undefined;
  explanation: string;
  loading: boolean;
  probePrediction: string | null;
  onProbePrediction: (id: string) => void;
  onContinue: () => void;
  probePredictionName: string;
}) {
  if (loading || !interpretation) {
    return (
      <section className="stage stage--interpreting" data-testid="stage-interpret-loading" aria-busy="true">
        <StageHeading number="03" eyebrow="Bounded language interpretation" title="Finding the smallest useful test" body="The system is matching your words to authored possibilities. Deterministic code will choose the safe baseline if the interpretation is unavailable or uncertain." />
        <div className="compiler-loading" role="status"><span /><span /><span /><p>Reading evidence, checking allowed models, validating a probe…</p></div>
      </section>
    );
  }

  const probe = PROBES[interpretation.recommendedProbeId];
  const evidence = explanation.slice(0, 120);
  const hypotheses = compilerHypotheses(interpretation);
  const interpretationSource = interpretation.source === "model"
    ? interpretation.providerId && interpretation.modelId
      ? `${interpretation.providerId} / ${interpretation.modelId}, after schema and semantic validation`
      : "Validated model interpretation, after schema and semantic validation"
    : `Deterministic fallback (${interpretation.fallbackReason ?? "uncertain"})`;

  return (
    <section className="stage stage--interpret" data-testid="stage-interpret">
      <StageHeading number="03" eyebrow="Mental model → experiment" title="The test that separates the models" body="This is a provisional reading, not a diagnosis. The model may select only authored IDs; code checks the match before anything changes." />
      <div className="compiler-flow">
        <article className="compiler-flow__evidence">
          <span>Your evidence</span>
          <blockquote>“{evidence || "No single phrase was strong enough to use safely."}”</blockquote>
        </article>
        <div className="compiler-arrow" aria-hidden="true">→</div>
        <div className="hypothesis-stack" aria-label="Provisional models">
          {hypotheses.map((item, index) => (
            <article key={item.id} className="hypothesis-card" data-testid="compiler-reading">
              <span>{index === 0 ? "One model that fits" : "Another explanation"}</span>
              <strong>{item.learnerFacingName}</strong>
              <p>{item.learnerFacingSummary}</p>
            </article>
          ))}
        </div>
        <div className="compiler-arrow" aria-hidden="true">→</div>
        <article className="selected-test">
          <span>{interpretation.source === "model" ? "Validated selection" : "Authored baseline"}</span>
          <strong>{probe.title}</strong>
          <p>{probe.purpose}</p>
        </article>
      </div>
      {interpretation.source === "fallback" ? <p className="fallback-notice" role="status">{FALLBACK_COPY}</p> : null}
      <details className="judge-lens">
        <summary>How this test was chosen</summary>
        <div><p><strong>Source:</strong> {interpretationSource}</p><p><strong>Boundary:</strong> The interpretation may choose an authored test. It cannot calculate motion, unlock help, or state the answer.</p></div>
      </details>
      <fieldset className="probe-prediction">
        <legend>{probe.predictionPrompt}</legend>
        <p>Commit before the experiment runs.</p>
        <div className="probe-prediction__choices">
          {probe.predictionChoices.map((choice) => (
            <label key={choice.id} className={probePrediction === choice.id ? "selected" : ""}>
              <input type="radio" name={probePredictionName} value={choice.id} checked={probePrediction === choice.id} onChange={() => onProbePrediction(choice.id)} />
              <strong>{choice.label}</strong><span>{choice.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="stage-actions stage-actions--end"><PrimaryButton disabled={!probePrediction} onClick={onContinue} testId="commit-probe-prediction">Commit and open the test</PrimaryButton></div>
    </section>
  );
}

function ExperimentStage({ probeId, revealed, frictionStrength, reflection, supportLevel, questionId, onRun, onFriction, onReflection, onRequestSupport, onContinue, onDontKnow, frictionId, reflectionId }: {
  probeId: ProbeId;
  revealed: boolean;
  frictionStrength: number;
  reflection: string;
  supportLevel: SupportLevel;
  questionId: keyof typeof LEVEL_1_QUESTIONS;
  onRun: () => void;
  onFriction: (value: number) => void;
  onReflection: (value: string) => void;
  onRequestSupport: () => void;
  onContinue: () => void;
  onDontKnow: () => void;
  frictionId: string;
  reflectionId: string;
}) {
  const probe = PROBES[probeId];
  return (
    <section className="stage stage--experiment" data-testid="stage-experiment">
      <StageHeading number="04" eyebrow="Deterministic world" title={probe.title} body={probe.connection} />
      {probe.adjustableControl === "friction" ? (
        <label className="experiment-control" htmlFor={frictionId}><span>Friction strength</span><output htmlFor={frictionId}>{frictionStrength}%</output><input id={frictionId} type="range" min="25" max="100" value={frictionStrength} disabled={revealed} onChange={(event) => onFriction(Number(event.target.value))} /></label>
      ) : null}
      <ExperimentWorld revealed={revealed} frictionStrength={frictionStrength} probeId={probeId} />
      {!revealed ? <div className="run-panel"><p>The outcome comes from the same tested physics engine for every run.</p><PrimaryButton onClick={onRun} testId="run-experiment">Run experiment</PrimaryButton></div> : (
        <div className="reflection-panel">
          {supportLevel > 0 ? <div className="support-message" role="status"><span>Attention cue • Level {supportLevel}</span><p>{supportLevel === 1 ? LEVEL_1_QUESTIONS[questionId] : supportLevel === 2 ? LEVEL_2_CONTRASTS[probeId].text : LEVEL_3_PRINCIPLE.text}</p></div> : null}
          <label className="textarea-field" htmlFor={reflectionId}><span>What do you notice after the push ends?</span><textarea id={reflectionId} rows={3} maxLength={300} value={reflection} onChange={(event) => onReflection(event.target.value)} placeholder="Compare the force and velocity in both cases." /><small>{reflection.length} / 300</small></label>
          <div className="stage-actions">
            {supportLevel === 0 ? <SecondaryButton onClick={onRequestSupport} testId="request-support">I&apos;m stuck — ask one question</SecondaryButton> : null}
            <SecondaryButton onClick={onDontKnow}>I genuinely don&apos;t know</SecondaryButton>
            <PrimaryButton disabled={reflection.trim().length < 5} onClick={onContinue} testId="submit-reflection">Rebuild the rule</PrimaryButton>
          </div>
        </div>
      )}
    </section>
  );
}

function ReconstructionStage({ value, supportLevel, probeId, questionId, onChange, onRequestSupport, onContinue, onDontKnow, reconstructionId }: {
  value: string;
  supportLevel: SupportLevel;
  probeId: ProbeId;
  questionId: keyof typeof LEVEL_1_QUESTIONS;
  onChange: (value: string) => void;
  onRequestSupport: () => void;
  onContinue: () => void;
  onDontKnow: () => void;
  reconstructionId: string;
}) {
  const nextLabel = supportLevel === 0 ? "Use one attention cue" : supportLevel === 1 ? "Show one contrast" : supportLevel === 2 ? "Show the principle" : null;
  const supportText = supportLevel === 1 ? LEVEL_1_QUESTIONS[questionId] : supportLevel === 2 ? LEVEL_2_CONTRASTS[probeId].text : supportLevel === 3 ? LEVEL_3_PRINCIPLE.text : null;
  return (
    <section className="stage stage--reconstruct" data-testid="stage-reconstruct">
      <StageHeading number="05" eyebrow="Reconstruct, do not copy" title="Build the rule in your own words" body="Connect net force to acceleration, and acceleration to what happens to velocity." />
      <div className="reconstruction-grid">
        <div className="causal-chain" role="img" aria-label="Net force causes acceleration. Acceleration changes velocity.">
          <div><span>cause</span><strong>net force</strong></div><b aria-hidden="true">→</b><div><span>effect</span><strong>acceleration</strong></div><b aria-hidden="true">→</b><div><span>changes</span><strong>velocity</strong></div>
        </div>
        {supportText ? <div className="support-message"><span>Authored support • Level {supportLevel}</span><p>{supportText}</p></div> : null}
        <label className="textarea-field" htmlFor={reconstructionId}><span>Your causal rule</span><textarea id={reconstructionId} rows={5} maxLength={400} value={value} onChange={(event) => onChange(event.target.value)} placeholder="When net force is zero…" /><small>{value.length} / 400</small></label>
        <div className="stage-actions">
          {nextLabel ? <SecondaryButton onClick={onRequestSupport}>{nextLabel}</SecondaryButton> : <span className="support-ceiling">Maximum authored support reached</span>}
          <SecondaryButton onClick={onDontKnow}>I genuinely don&apos;t know</SecondaryButton>
          <PrimaryButton disabled={value.trim().length < 12} onClick={onContinue} testId="enter-proof">Enter proof mode</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ProofStage({ choice, explanation, submitted, onChoice, onExplanation, onSubmit, onDontKnow, transferName, transferExplanationId }: {
  choice: TransferChoiceId | null;
  explanation: string;
  submitted: boolean;
  onChoice: (choice: TransferChoiceId) => void;
  onExplanation: (value: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
  transferName: string;
  transferExplanationId: string;
}) {
  return (
    <section className="stage stage--proof" data-testid="stage-proof" data-proof-locked="true">
      <div className="proof-lock"><span className="proof-lock__icon" aria-hidden="true">✕</span><strong>AI assistance is now off</strong><span>No hints • no replay • submit once</span></div>
      <StageHeading number="06" eyebrow="Cold transfer • new representation" title={TRANSFER.title} body={TRANSFER.setup} />
      <div className="proof-layout">
        <ForceTimeGraph />
        <fieldset className="transfer-choices">
          <legend>{TRANSFER.prompt}</legend>
          {TRANSFER.choices.map((item) => <TransferGraphChoice key={item.id} id={item.id} name={transferName} selected={choice === item.id} onSelect={onChoice} />)}
        </fieldset>
      </div>
      <label className="textarea-field textarea-field--proof" htmlFor={transferExplanationId}><span>Explain your choice in one or two sentences.</span><textarea id={transferExplanationId} rows={3} maxLength={300} value={explanation} onChange={(event) => onExplanation(event.target.value)} placeholder="What does zero net force mean for acceleration and velocity?" disabled={submitted} /><small>{explanation.length} / 300</small></label>
      <div className="stage-actions stage-actions--end"><SecondaryButton onClick={onDontKnow} disabled={submitted}>I don&apos;t know</SecondaryButton><PrimaryButton disabled={submitted || !choice || explanation.trim().length < 8} onClick={onSubmit} testId="submit-proof">Submit once</PrimaryButton></div>
    </section>
  );
}

function ResultStage({ evidence, interpretation, receipt, onRestart }: {
  evidence: EvidenceCard;
  interpretation: LearningInterpretation;
  receipt: BoundedLocalWorldRuntimeReceipt;
  onRestart: () => void;
}) {
  const initial = MYSTERY.predictions.find((item) => item.id === evidence.before.predictionId);
  const probe = PROBES[interpretation.recommendedProbeId];
  const correct = receipt.validator.outcome === "pass";
  const support = evidence.support.kind === "none" ? "No conceptual help" : evidence.support.kind === "attention_cue" ? "One attention cue" : evidence.support.kind === "contrast" ? "An authored contrast" : "The authored principle";
  return (
    <section className="stage stage--result" data-testid="stage-result">
      <StageHeading number="07" eyebrow="Proof after help" title="An evidence trail, not a mastery score" body="This records what you first expected, what tested it, how much help you used, and what you then attempted alone." />
      <div className="evidence-trail">
        <article><span>Before</span><strong>{initial?.label}</strong><p>“{evidence.before.explanationQuote.slice(0, 110)}{evidence.before.explanationQuote.length > 110 ? "…" : ""}”</p></article>
        <article><span>Test</span><strong>{probe.shortTitle}</strong><p>{probe.purpose}</p></article>
        <article><span>Support</span><strong>{support}</strong><p>Accessibility controls did not count as conceptual help.</p></article>
        <article data-result={correct ? "matched" : "different"}><span>Alone</span><strong>{correct ? "Matched the new representation" : evidence.alone.dontKnow ? "Recorded uncertainty" : "A different model appeared"}</strong><p>{correct ? "You chose constant velocity after net force became zero." : evidence.alone.dontKnow ? "You chose I don't know rather than guessing." : "Your transfer choice did not yet match the deterministic graph."}</p></article>
        <article><span>Later</span><strong>Not tested yet</strong><p>This immediate task does not establish delayed retention.</p></article>
      </div>
      <aside className="result-boundary"><strong>What this evidence means</strong><p>{correct ? "On this task, you selected the authored constant-velocity continuation in one assistance-free submission." : "This authored choice did not yet match the constant-velocity continuation."} Causal explanation quality was not evaluated by the current validator. This does not measure intelligence, broad physics mastery, delayed retention, or long-term learning.</p></aside>
      <aside className="result-boundary" data-testid="force-runtime-receipt">
        <strong>Bounded local receipt</strong>
        <p>Authority: {receipt.authority.proofAuthority}. Persistence: {receipt.authority.persistence}. Durable: {String(receipt.authority.isDurable)}.</p>
        <p>Source provenance: {receipt.sourceProvenanceStatus === "incomplete" ? "incomplete legacy metadata" : receipt.sourceProvenanceStatus}.</p>
      </aside>
      <div className="stage-actions stage-actions--between"><SecondaryButton onClick={onRestart}>Start a fresh session</SecondaryButton><span className="privacy-note">No account or learner profile. Only bounded proof metadata remains in this browser; raw explanations stay out of the ledger.</span></div>
    </section>
  );
}

export interface ModelShiftExperienceProps {
  /** Test/compatibility observation only; the receipt remains local and non-durable. */
  readonly onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
}

export function ModelShiftExperience({ onRuntimeReceipt }: ModelShiftExperienceProps) {
  const rawInstanceId = useId();
  const instanceId = rawInstanceId.replaceAll(":", "");
  const mainId = `force-motion-main-${instanceId}`;
  const mainRef = useRef<HTMLElement>(null);
  const hasOpenedInitialStage = useRef(false);
  const interpretationRequestEpochRef = useRef(0);
  const interpretationControllerRef = useRef<AbortController | null>(null);
  const [runtime, setRuntime] = useState(createStartedRuntimeSession);
  const runtimeRef = useRef(runtime);
  const learningState = runtime.state;
  const [prediction, setPrediction] = useState<PredictionId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [explanation, setExplanation] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [probePrediction, setProbePrediction] = useState<string | null>(null);
  const [experimentRevealed, setExperimentRevealed] = useState(false);
  const [frictionStrength, setFrictionStrength] = useState(62);
  const [reflection, setReflection] = useState("");
  const [reconstruction, setReconstruction] = useState("");
  const [transferChoice, setTransferChoice] = useState<TransferChoiceId | null>(null);
  const [transferExplanation, setTransferExplanation] = useState("");
  const emittedReceiptRef = useRef<BoundedLocalWorldRuntimeReceipt | null>(null);

  const stage = learningState.stage === "HOOK" ? "PREDICT" : learningState.stage;
  const interpretation = learningState.context.interpretation;
  const probeId = interpretation?.recommendedProbeId ?? "neutral_core_probe";
  const questionId = interpretation?.recommendedLevel1QuestionId ?? "neutral_observation_prompt";
  const supportLevel = learningState.context.consumedSupport.reduce<SupportLevel>((highest, item) => Math.max(highest, item.level) as SupportLevel, 0);
  const stageLabel = useMemo(() => STAGE_STEPS.find((item) => item.id === stage)?.label ?? stage, [stage]);

  useEffect(() => {
    if (!hasOpenedInitialStage.current) {
      hasOpenedInitialStage.current = true;
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    mainRef.current?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => () => {
    interpretationRequestEpochRef.current += 1;
    interpretationControllerRef.current?.abort();
    interpretationControllerRef.current = null;
  }, []);

  useEffect(() => {
    const receipt = runtime.receipt;
    if (!receipt || emittedReceiptRef.current === receipt) return;
    emittedReceiptRef.current = receipt;
    recordWorldProof({
      capabilityId: receipt.world.capabilityId,
      conditionId: receipt.world.proofClaimId,
      sourceRefId: receipt.world.id,
      outcome: receiptOutcome(receipt),
      assistance: receiptAssistance(receipt),
    });
    onRuntimeReceipt?.(receipt);
  }, [onRuntimeReceipt, runtime.receipt]);

  function send(event: LearningEvent) {
    const result = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtimeRef.current, {
      kind: "domain",
      event,
    });
    runtimeRef.current = result.session;
    setRuntime(result.session);
    return result;
  }

  async function submitExplanation(nextExplanation = explanation) {
    if (!prediction) return;
    const explicitUncertainty = nextExplanation === EXPLICIT_UNCERTAINTY;
    const committed = send({
      type: "COMMIT_EXPLANATION",
      explanation: nextExplanation,
      dontKnow: explicitUncertainty,
    });
    if (!committed.accepted) return;
    if (explicitUncertainty) {
      send({ type: "INTERPRETATION_FAILED", reason: "ambiguous_input" });
      return;
    }
    if (runtimeRef.current.phase !== "learning" || runtimeRef.current.state.stage !== "INTERPRET") return;
    const requestEpoch = interpretationRequestEpochRef.current + 1;
    interpretationRequestEpochRef.current = requestEpoch;
    interpretationControllerRef.current?.abort();
    const controller = new AbortController();
    interpretationControllerRef.current = controller;
    setInterpreting(true);
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, INTERPRETATION_CLIENT_TIMEOUT_MS);
    let validation: ClientInterpretationValidation = { ok: false, reason: "api_error" };
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ scenario_id: MYSTERY.id, prediction_id: prediction, confidence, explanation: nextExplanation, stage: "INTERPRET" }),
      });
      if (!response.ok) {
        validation = { ok: false, reason: "api_error" };
      } else {
        try {
          validation = validateApiInterpretation(await response.json(), nextExplanation);
        } catch {
          validation = { ok: false, reason: "malformed_output" };
        }
      }
    } catch (error) {
      if (interpretationRequestEpochRef.current !== requestEpoch) return;
      const aborted = typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
      validation = { ok: false, reason: timedOut || aborted ? "timeout" : "api_error" };
    } finally {
      window.clearTimeout(timeout);
      if (interpretationControllerRef.current === controller) interpretationControllerRef.current = null;
      if (interpretationRequestEpochRef.current === requestEpoch) setInterpreting(false);
    }
    if (interpretationRequestEpochRef.current !== requestEpoch) return;
    if (runtimeRef.current.phase !== "learning" || runtimeRef.current.state.stage !== "INTERPRET") return;
    if (!validation.ok) {
      send({ type: "INTERPRETATION_FAILED", reason: validation.reason });
      return;
    }
    const resolved = send({ type: "RESOLVE_INTERPRETATION", interpretation: validation.value });
    if (!resolved.accepted) send({ type: "INTERPRETATION_FAILED", reason: "malformed_output" });
  }

  function resetSession() {
    interpretationRequestEpochRef.current += 1;
    interpretationControllerRef.current?.abort();
    interpretationControllerRef.current = null;
    const reset = send({ type: "RESET" });
    if (reset.accepted) send({ type: "START" });
    setPrediction(null); setConfidence(70); setExplanation(""); setInterpreting(false);
    setProbePrediction(null); setExperimentRevealed(false); setFrictionStrength(62); setReflection(""); setReconstruction("");
    setTransferChoice(null); setTransferExplanation("");
    emittedReceiptRef.current = null;
  }

  function requestSupport() {
    const nextLevel = Math.min(3, supportLevel + 1) as Exclude<SupportLevel, 0>;
    const reason = nextLevel === 1 ? "stuck" : nextLevel === 2 ? "second_explicit_request" : "show_principle";
    const requested = send({ type: "REQUEST_SUPPORT", level: nextLevel, reason });
    if (!requested.accepted) return;
    send({ type: "CONSUME_SUPPORT", level: nextLevel });
  }

  function commitPrediction() {
    if (!prediction) return;
    send({ type: "COMMIT_PREDICTION", predictionId: prediction, confidence });
  }

  function commitProbePrediction() {
    if (!probePrediction) return;
    send({ type: "COMMIT_PROBE_PREDICTION", predictionId: probePrediction });
  }

  function runExperiment() {
    const ran = send({ type: "RUN_EXPERIMENT" });
    if (!ran.accepted) return;
    const observed = send({ type: "OBSERVE_EXPERIMENT" });
    if (!observed.accepted) return;
    setExperimentRevealed(true);
  }

  function submitReflection() {
    send({
      type: "SUBMIT_REFLECTION",
      reflection,
      dontKnow: reflection === "I genuinely don't know yet.",
    });
  }

  function enterProof(dontKnow = false, nextReconstruction = reconstruction) {
    const submitted = send({ type: "SUBMIT_RECONSTRUCTION", reconstruction: nextReconstruction, dontKnow });
    if (!submitted.accepted) return;
    send({ type: "CONTINUE_TO_COLD_TRANSFER" });
  }

  function submitTransfer(dontKnow = false) {
    send({
      type: "SUBMIT_TRANSFER",
      choiceId: dontKnow ? undefined : transferChoice ?? undefined,
      explanation: dontKnow ? "I don't know yet." : transferExplanation,
      dontKnow,
    });
  }

  return (
    <div className={["app-shell", stage === "COLD_TRANSFER" ? "app-shell--proof" : ""].join(" ")}>
      <a className="skip-link" href={`#${mainId}`}>Skip to the experiment</a>
      <header className="app-header">
        <a className="wordmark" href={`#${mainId}`} aria-label="Force and motion learning world"><span>M</span><strong>Model World</strong><small>ModelShift protocol</small></a>
        <div className="trust-strip"><span>13+ World</span><span>AI interprets language</span><span>Tested code owns physics</span></div>
      </header>
      <StageRail stage={stage} />
      <div className="sr-only" aria-live="polite">Current stage: {stageLabel}</div>
      <main id={mainId} ref={mainRef} tabIndex={-1}>
        {stage === "PREDICT" ? <PredictionStage prediction={prediction} confidence={confidence} onPrediction={setPrediction} onConfidence={setConfidence} onCommit={commitPrediction} predictionName={`force-motion-prediction-${instanceId}`} confidenceId={`force-motion-confidence-${instanceId}`} /> : null}
        {stage === "EXPLAIN" && prediction ? <ExplanationStage prediction={prediction} explanation={explanation} onExplanation={setExplanation} onSubmit={() => void submitExplanation()} onDontKnow={() => { setExplanation(EXPLICIT_UNCERTAINTY); void submitExplanation(EXPLICIT_UNCERTAINTY); }} explanationId={`force-motion-explanation-${instanceId}`} /> : null}
        {stage === "INTERPRET" || stage === "PROBE_PREDICT" ? <InterpretationStage interpretation={interpretation} explanation={explanation} loading={interpreting} probePrediction={probePrediction} onProbePrediction={setProbePrediction} onContinue={commitProbePrediction} probePredictionName={`force-motion-probe-prediction-${instanceId}`} /> : null}
        {stage === "EXPERIMENT" || stage === "REFLECT" ? <ExperimentStage probeId={probeId} revealed={experimentRevealed} frictionStrength={frictionStrength} reflection={reflection} supportLevel={supportLevel} questionId={questionId} onRun={runExperiment} onFriction={setFrictionStrength} onReflection={setReflection} onRequestSupport={requestSupport} onDontKnow={() => setReflection("I genuinely don't know yet.")} onContinue={submitReflection} frictionId={`force-motion-friction-${instanceId}`} reflectionId={`force-motion-reflection-${instanceId}`} /> : null}
        {stage === "RECONSTRUCT" ? <ReconstructionStage value={reconstruction} supportLevel={supportLevel} probeId={probeId} questionId={questionId} onChange={setReconstruction} onRequestSupport={requestSupport} onContinue={() => enterProof()} onDontKnow={() => { const text = "I genuinely don't know."; setReconstruction(text); enterProof(true, text); }} reconstructionId={`force-motion-reconstruction-${instanceId}`} /> : null}
        {stage === "COLD_TRANSFER" ? <ProofStage choice={transferChoice} explanation={transferExplanation} submitted={false} onChoice={setTransferChoice} onExplanation={setTransferExplanation} onDontKnow={() => submitTransfer(true)} onSubmit={() => submitTransfer(false)} transferName={`force-motion-transfer-${instanceId}`} transferExplanationId={`force-motion-transfer-explanation-${instanceId}`} /> : null}
        {stage === "PROOF_RESULT" && interpretation && runtime.receipt ? <ResultStage evidence={deriveEvidenceCard(learningState)} interpretation={interpretation} receipt={runtime.receipt} onRestart={resetSession} /> : null}
      </main>
      <footer className="app-footer"><span>This World is currently reviewed for learners aged 13+.</span><span>AI interpretation can be wrong. The physics and primary answer checks are deterministic.</span></footer>
    </div>
  );
}
