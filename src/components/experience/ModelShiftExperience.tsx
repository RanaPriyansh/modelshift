"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EXPLICIT_UNCERTAINTY, LEVEL_1_QUESTIONS, LEVEL_2_CONTRASTS, LEVEL_3_PRINCIPLE, MYSTERY, PROBES, TRANSFER } from "@/src/content";
import { HYPOTHESES } from "@/src/content/hypotheses";
import { ExperimentWorld } from "@/src/components/simulation/ExperimentWorld";
import { MysteryWorld } from "@/src/components/simulation/MysteryWorld";
import { ForceTimeGraph, TransferGraphChoice } from "@/src/components/simulation/TransferGraphs";
import {
  createInitialLearningState,
  deriveEvidenceCard,
  transitionLearningState,
  type EvidenceCard,
  type LearningState,
} from "@/src/domain/learning";
import { recordWorldProof } from "@/src/lib/forge-evidence";
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

function fallbackInterpretation(reason: FallbackReason): ValidatedInterpretation {
  return {
    schema_version: "1.0",
    hypotheses: [
      {
        id: "mixed_or_unclear",
        support: "low",
        evidence_spans: [],
        rationale: "The explanation does not support a single safe interpretation.",
      },
    ],
    missing_distinctions: ["zero_net_force_means_zero_acceleration", "existing_velocity_can_persist"],
    recommended_probe_id: "neutral_core_probe",
    recommended_level_1_question_id: "neutral_observation_prompt",
    abstain: true,
    abstain_reason: "model_uncertain",
    source: "fallback",
    fallback_reason: reason,
  };
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

function PredictionStage({ prediction, confidence, onPrediction, onConfidence, onCommit }: {
  prediction: PredictionId | null;
  confidence: number;
  onPrediction: (id: PredictionId) => void;
  onConfidence: (value: number) => void;
  onCommit: () => void;
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
              <input type="radio" name="initial-prediction" value={choice.id} checked={prediction === choice.id} onChange={() => onPrediction(choice.id)} />
              <span className="choice-row__control" aria-hidden="true" />
              <span className="choice-row__label">{choice.label}</span>
              <span className={`mini-trace mini-trace--${choice.graphHint}`} aria-hidden="true" />
            </label>
          ))}
        </fieldset>
        <div className="confidence-panel">
          <label htmlFor="confidence">How confident are you?</label>
          <output htmlFor="confidence">{confidence}%</output>
          <input id="confidence" type="range" min="0" max="100" step="5" value={confidence} onChange={(event) => onConfidence(Number(event.target.value))} />
          <div className="range-labels" aria-hidden="true"><span>Not sure</span><span>Somewhat sure</span><span>Very sure</span></div>
          <PrimaryButton disabled={!prediction} onClick={onCommit} testId="commit-prediction">Commit prediction</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ExplanationStage({ prediction, explanation, onExplanation, onSubmit, onDontKnow }: {
  prediction: PredictionId;
  explanation: string;
  onExplanation: (value: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
}) {
  return (
    <section className="stage stage--explain" data-testid="stage-explain">
      <StageHeading number="02" eyebrow="Reveal the causal model" title="What makes you think that?" body="Describe what you think the force is doing. The goal is not polished wording; it is the model behind your prediction." />
      <div className="writing-stage">
        <div className="committed-answer">
          <span>Prediction locked</span>
          <strong>{MYSTERY.predictions.find((item) => item.id === prediction)?.label ?? "Your prediction"}</strong>
        </div>
        <label className="textarea-field" htmlFor="explanation">
          <span>Your explanation</span>
          <textarea id="explanation" value={explanation} maxLength={600} rows={7} onChange={(event) => onExplanation(event.target.value)} placeholder="For example: What happens when the engine is no longer pushing? Is any other force present?" autoFocus />
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

function InterpretationStage({ interpretation, explanation, loading, probePrediction, onProbePrediction, onContinue }: {
  interpretation: ValidatedInterpretation | null;
  explanation: string;
  loading: boolean;
  probePrediction: string | null;
  onProbePrediction: (id: string) => void;
  onContinue: () => void;
}) {
  if (loading || !interpretation) {
    return (
      <section className="stage stage--interpreting" data-testid="stage-interpret-loading" aria-busy="true">
        <StageHeading number="03" eyebrow="Bounded language interpretation" title="Finding the smallest useful test" body="The system is matching your words to authored possibilities. Deterministic code will choose the safe baseline if the interpretation is unavailable or uncertain." />
        <div className="compiler-loading" role="status"><span /><span /><span /><p>Reading evidence, checking allowed models, validating a probe…</p></div>
      </section>
    );
  }

  const probe = PROBES[interpretation.recommended_probe_id];
  const evidence = interpretation.hypotheses.flatMap((item) => item.evidence_spans)[0] ?? explanation.slice(0, 120);
  const hypotheses = interpretation.source === "fallback" ? [HYPOTHESES.mixed_or_unclear] : interpretation.hypotheses.slice(0, 2).map((item) => HYPOTHESES[item.id]);

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
            <article key={item.id} className="hypothesis-card">
              <span>{index === 0 ? "One model that fits" : "Another explanation"}</span>
              <strong>{item.learnerFacingName}</strong>
              <p>{item.learnerFacingSummary}</p>
            </article>
          ))}
        </div>
        <div className="compiler-arrow" aria-hidden="true">→</div>
        <article className="selected-test">
          <span>{interpretation.source === "model" ? "Validated selection" : "Safe baseline"}</span>
          <strong>{probe.title}</strong>
          <p>{probe.purpose}</p>
        </article>
      </div>
      {interpretation.source === "fallback" ? <p className="fallback-notice" role="status">{FALLBACK_COPY}</p> : null}
      <details className="judge-lens">
        <summary>How this test was chosen</summary>
        <div><p><strong>Source:</strong> {interpretation.source === "model" ? "GPT-5.6, after schema and semantic validation" : `Deterministic fallback (${interpretation.fallback_reason ?? "uncertain"})`}</p><p><strong>Boundary:</strong> The interpretation may choose an authored test. It cannot calculate motion, unlock help, or state the answer.</p></div>
      </details>
      <fieldset className="probe-prediction">
        <legend>{probe.predictionPrompt}</legend>
        <p>Commit before the experiment runs.</p>
        <div className="probe-prediction__choices">
          {probe.predictionChoices.map((choice) => (
            <label key={choice.id} className={probePrediction === choice.id ? "selected" : ""}>
              <input type="radio" name="probe-prediction" value={choice.id} checked={probePrediction === choice.id} onChange={() => onProbePrediction(choice.id)} />
              <strong>{choice.label}</strong><span>{choice.description}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="stage-actions stage-actions--end"><PrimaryButton disabled={!probePrediction} onClick={onContinue} testId="commit-probe-prediction">Commit and open the test</PrimaryButton></div>
    </section>
  );
}

function ExperimentStage({ probeId, revealed, frictionStrength, reflection, supportLevel, questionId, onRun, onFriction, onReflection, onRequestSupport, onContinue, onDontKnow }: {
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
}) {
  const probe = PROBES[probeId];
  return (
    <section className="stage stage--experiment" data-testid="stage-experiment">
      <StageHeading number="04" eyebrow="Deterministic world" title={probe.title} body={probe.connection} />
      {probe.adjustableControl === "friction" ? (
        <label className="experiment-control" htmlFor="friction-strength"><span>Friction strength</span><output htmlFor="friction-strength">{frictionStrength}%</output><input id="friction-strength" type="range" min="25" max="100" value={frictionStrength} disabled={revealed} onChange={(event) => onFriction(Number(event.target.value))} /></label>
      ) : null}
      <ExperimentWorld revealed={revealed} frictionStrength={frictionStrength} probeId={probeId} />
      {!revealed ? <div className="run-panel"><p>The outcome comes from the same tested physics engine for every run.</p><PrimaryButton onClick={onRun} testId="run-experiment">Run experiment</PrimaryButton></div> : (
        <div className="reflection-panel">
          {supportLevel > 0 ? <div className="support-message" role="status"><span>Attention cue • Level {supportLevel}</span><p>{supportLevel === 1 ? LEVEL_1_QUESTIONS[questionId] : supportLevel === 2 ? LEVEL_2_CONTRASTS[probeId].text : LEVEL_3_PRINCIPLE.text}</p></div> : null}
          <label className="textarea-field" htmlFor="reflection"><span>What do you notice after the push ends?</span><textarea id="reflection" rows={3} maxLength={300} value={reflection} onChange={(event) => onReflection(event.target.value)} placeholder="Compare the force and velocity in both cases." /><small>{reflection.length} / 300</small></label>
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

function ReconstructionStage({ value, supportLevel, probeId, questionId, onChange, onRequestSupport, onContinue, onDontKnow }: {
  value: string;
  supportLevel: SupportLevel;
  probeId: ProbeId;
  questionId: keyof typeof LEVEL_1_QUESTIONS;
  onChange: (value: string) => void;
  onRequestSupport: () => void;
  onContinue: () => void;
  onDontKnow: () => void;
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
        <label className="textarea-field" htmlFor="reconstruction"><span>Your causal rule</span><textarea id="reconstruction" rows={5} maxLength={400} value={value} onChange={(event) => onChange(event.target.value)} placeholder="When net force is zero…" /><small>{value.length} / 400</small></label>
        <div className="stage-actions">
          {nextLabel ? <SecondaryButton onClick={onRequestSupport}>{nextLabel}</SecondaryButton> : <span className="support-ceiling">Maximum authored support reached</span>}
          <SecondaryButton onClick={onDontKnow}>I genuinely don&apos;t know</SecondaryButton>
          <PrimaryButton disabled={value.trim().length < 12} onClick={onContinue} testId="enter-proof">Enter proof mode</PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ProofStage({ choice, explanation, submitted, onChoice, onExplanation, onSubmit, onDontKnow }: {
  choice: TransferChoiceId | null;
  explanation: string;
  submitted: boolean;
  onChoice: (choice: TransferChoiceId) => void;
  onExplanation: (value: string) => void;
  onSubmit: () => void;
  onDontKnow: () => void;
}) {
  return (
    <section className="stage stage--proof" data-testid="stage-proof" data-proof-locked="true">
      <div className="proof-lock"><span className="proof-lock__icon" aria-hidden="true">✕</span><strong>AI assistance is now off</strong><span>No hints • no replay • submit once</span></div>
      <StageHeading number="06" eyebrow="Cold transfer • new representation" title={TRANSFER.title} body={TRANSFER.setup} />
      <div className="proof-layout">
        <ForceTimeGraph />
        <fieldset className="transfer-choices">
          <legend>{TRANSFER.prompt}</legend>
          {TRANSFER.choices.map((item) => <TransferGraphChoice key={item.id} id={item.id} selected={choice === item.id} onSelect={onChoice} />)}
        </fieldset>
      </div>
      <label className="textarea-field textarea-field--proof" htmlFor="transfer-explanation"><span>Explain your choice in one or two sentences.</span><textarea id="transfer-explanation" rows={3} maxLength={300} value={explanation} onChange={(event) => onExplanation(event.target.value)} placeholder="What does zero net force mean for acceleration and velocity?" disabled={submitted} /><small>{explanation.length} / 300</small></label>
      <div className="stage-actions stage-actions--end"><SecondaryButton onClick={onDontKnow} disabled={submitted}>I don&apos;t know</SecondaryButton><PrimaryButton disabled={submitted || !choice || explanation.trim().length < 8} onClick={onSubmit} testId="submit-proof">Submit once</PrimaryButton></div>
    </section>
  );
}

function ResultStage({ evidence, interpretation, onRestart }: {
  evidence: EvidenceCard;
  interpretation: ValidatedInterpretation;
  onRestart: () => void;
}) {
  const initial = MYSTERY.predictions.find((item) => item.id === evidence.before.predictionId);
  const probe = PROBES[interpretation.recommended_probe_id];
  const correct = evidence.alone.correct === true;
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
      <aside className="result-boundary"><strong>What this evidence means</strong><p>{correct ? "You applied the force–acceleration–velocity distinction once, without assistance, in a changed context and representation." : "The experiment exposed the distinction, but this new representation still needs another unaided attempt later."} It does not measure intelligence, broad physics mastery, or long-term learning.</p></aside>
      <div className="stage-actions stage-actions--between"><SecondaryButton onClick={onRestart}>Start a fresh session</SecondaryButton><span className="privacy-note">No account or learner profile. Only bounded proof metadata remains in this browser; raw explanations stay out of the ledger.</span></div>
    </section>
  );
}

export function ModelShiftExperience() {
  const [learningState, setLearningState] = useState<LearningState>(() => {
    const started = transitionLearningState(createInitialLearningState(), { type: "START" });
    return started.accepted ? started.state : createInitialLearningState();
  });
  const [prediction, setPrediction] = useState<PredictionId | null>(null);
  const [confidence, setConfidence] = useState(70);
  const [explanation, setExplanation] = useState("");
  const [interpretation, setInterpretation] = useState<ValidatedInterpretation | null>(null);
  const [interpreting, setInterpreting] = useState(false);
  const [probePrediction, setProbePrediction] = useState<string | null>(null);
  const [experimentRevealed, setExperimentRevealed] = useState(false);
  const [frictionStrength, setFrictionStrength] = useState(62);
  const [reflection, setReflection] = useState("");
  const [reconstruction, setReconstruction] = useState("");
  const [transferChoice, setTransferChoice] = useState<TransferChoiceId | null>(null);
  const [transferExplanation, setTransferExplanation] = useState("");
  const evidenceRecordedRef = useRef(false);

  const stage = learningState.stage === "HOOK" ? "PREDICT" : learningState.stage;
  const probeId = interpretation?.recommended_probe_id ?? "neutral_core_probe";
  const questionId = interpretation?.recommended_level_1_question_id ?? "neutral_observation_prompt";
  const supportLevel = learningState.context.consumedSupport.reduce<SupportLevel>((highest, item) => Math.max(highest, item.level) as SupportLevel, 0);
  const stageLabel = useMemo(() => STAGE_STEPS.find((item) => item.id === stage)?.label ?? stage, [stage]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [stage]);

  useEffect(() => {
    if (stage !== "PROOF_RESULT" || !interpretation || evidenceRecordedRef.current) return;
    evidenceRecordedRef.current = true;
    const evidence = deriveEvidenceCard(learningState);
    const assistance: Array<{
      kind: "authored_hint" | "authored_contrast" | "authored_principle" | "model_interpretation";
      sourceId: string;
    }> = [];
    if (interpretation.source === "model") {
      assistance.push({ kind: "model_interpretation", sourceId: "model.interpretation.force-motion" });
    }
    for (const item of learningState.context.consumedSupport) {
      assistance.push({
        kind: item.level === 1 ? "authored_hint" : item.level === 2 ? "authored_contrast" : "authored_principle",
        sourceId: `support.force-motion.level-${item.level}`,
      });
    }
    recordWorldProof({
      capabilityId: "capability.force-motion.zero-net-force",
      conditionId: "proof.force-motion.independent-transfer",
      sourceRefId: "world.force-and-motion",
      outcome: evidence.alone.correct === true ? "proved" : "not_proved",
      assistance,
    });
  }, [interpretation, learningState, stage]);

  async function submitExplanation(nextExplanation = explanation) {
    if (!prediction) return;
    const explicitUncertainty = nextExplanation === EXPLICIT_UNCERTAINTY;
    const committed = transitionLearningState(learningState, {
      type: "COMMIT_EXPLANATION",
      explanation: nextExplanation,
      dontKnow: explicitUncertainty,
    });
    if (!committed.accepted) return;
    setLearningState(committed.state);
    if (explicitUncertainty) {
      const nextInterpretation = fallbackInterpretation("ambiguous_input");
      setInterpretation(nextInterpretation);
      const resolved = transitionLearningState(committed.state, { type: "RESOLVE_INTERPRETATION", interpretation: nextInterpretation });
      if (resolved.accepted) setLearningState(resolved.state);
      return;
    }
    setInterpreting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), INTERPRETATION_CLIENT_TIMEOUT_MS);
    let nextInterpretation: ValidatedInterpretation;
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ scenario_id: MYSTERY.id, prediction_id: prediction, confidence, explanation: nextExplanation, stage: "INTERPRET" }),
      });
      if (!response.ok) throw new Error("interpretation unavailable");
      nextInterpretation = (await response.json()) as ValidatedInterpretation;
    } catch (error) {
      const reason = typeof error === "object" && error !== null && "name" in error && error.name === "AbortError" ? "timeout" : "api_error";
      nextInterpretation = fallbackInterpretation(reason);
    } finally {
      window.clearTimeout(timeout);
      setInterpreting(false);
    }
    setInterpretation(nextInterpretation);
    const resolved = transitionLearningState(committed.state, { type: "RESOLVE_INTERPRETATION", interpretation: nextInterpretation });
    if (resolved.accepted) setLearningState(resolved.state);
  }

  function resetSession() {
    const started = transitionLearningState(createInitialLearningState(), { type: "START" });
    setLearningState(started.accepted ? started.state : createInitialLearningState());
    setPrediction(null); setConfidence(70); setExplanation(""); setInterpretation(null); setInterpreting(false);
    setProbePrediction(null); setExperimentRevealed(false); setFrictionStrength(62); setReflection(""); setReconstruction("");
    setTransferChoice(null); setTransferExplanation("");
    evidenceRecordedRef.current = false;
  }

  function requestSupport() {
    const nextLevel = Math.min(3, supportLevel + 1) as Exclude<SupportLevel, 0>;
    const reason = nextLevel === 1 ? "stuck" : nextLevel === 2 ? "second_explicit_request" : "show_principle";
    const requested = transitionLearningState(learningState, { type: "REQUEST_SUPPORT", level: nextLevel, reason });
    if (!requested.accepted) return;
    const consumed = transitionLearningState(requested.state, { type: "CONSUME_SUPPORT", level: nextLevel });
    if (consumed.accepted) setLearningState(consumed.state);
  }

  function commitPrediction() {
    if (!prediction) return;
    const result = transitionLearningState(learningState, { type: "COMMIT_PREDICTION", predictionId: prediction, confidence });
    if (result.accepted) setLearningState(result.state);
  }

  function commitProbePrediction() {
    if (!probePrediction) return;
    const result = transitionLearningState(learningState, { type: "COMMIT_PROBE_PREDICTION", predictionId: probePrediction });
    if (result.accepted) setLearningState(result.state);
  }

  function runExperiment() {
    const ran = transitionLearningState(learningState, { type: "RUN_EXPERIMENT" });
    if (!ran.accepted) return;
    const observed = transitionLearningState(ran.state, { type: "OBSERVE_EXPERIMENT" });
    if (!observed.accepted) return;
    setExperimentRevealed(true);
    setLearningState(observed.state);
  }

  function submitReflection() {
    const result = transitionLearningState(learningState, {
      type: "SUBMIT_REFLECTION",
      reflection,
      dontKnow: reflection === "I genuinely don't know yet.",
    });
    if (result.accepted) setLearningState(result.state);
  }

  function enterProof(dontKnow = false, nextReconstruction = reconstruction) {
    const submitted = transitionLearningState(learningState, { type: "SUBMIT_RECONSTRUCTION", reconstruction: nextReconstruction, dontKnow });
    if (!submitted.accepted) return;
    const continued = transitionLearningState(submitted.state, { type: "CONTINUE_TO_COLD_TRANSFER" });
    if (continued.accepted) setLearningState(continued.state);
  }

  function submitTransfer(dontKnow = false) {
    const result = transitionLearningState(learningState, {
      type: "SUBMIT_TRANSFER",
      choiceId: dontKnow ? undefined : transferChoice ?? undefined,
      explanation: dontKnow ? "I don't know yet." : transferExplanation,
      dontKnow,
    });
    if (result.accepted) setLearningState(result.state);
  }

  return (
    <div className={["app-shell", stage === "COLD_TRANSFER" ? "app-shell--proof" : ""].join(" ")}>
      <a className="skip-link" href="#main-content">Skip to the experiment</a>
      <header className="app-header">
        <a className="wordmark" href="#main-content" aria-label="Force and motion learning world"><span>M</span><strong>Model World</strong><small>ModelShift protocol</small></a>
        <div className="trust-strip"><span>13+ World</span><span>AI interprets language</span><span>Tested code owns physics</span></div>
      </header>
      <StageRail stage={stage} />
      <div className="sr-only" aria-live="polite">Current stage: {stageLabel}</div>
      <main id="main-content" tabIndex={-1}>
        {stage === "PREDICT" ? <PredictionStage prediction={prediction} confidence={confidence} onPrediction={setPrediction} onConfidence={setConfidence} onCommit={commitPrediction} /> : null}
        {stage === "EXPLAIN" && prediction ? <ExplanationStage prediction={prediction} explanation={explanation} onExplanation={setExplanation} onSubmit={() => void submitExplanation()} onDontKnow={() => { setExplanation(EXPLICIT_UNCERTAINTY); void submitExplanation(EXPLICIT_UNCERTAINTY); }} /> : null}
        {stage === "INTERPRET" || stage === "PROBE_PREDICT" ? <InterpretationStage interpretation={interpretation} explanation={explanation} loading={interpreting} probePrediction={probePrediction} onProbePrediction={setProbePrediction} onContinue={commitProbePrediction} /> : null}
        {stage === "EXPERIMENT" || stage === "REFLECT" ? <ExperimentStage probeId={probeId} revealed={experimentRevealed} frictionStrength={frictionStrength} reflection={reflection} supportLevel={supportLevel} questionId={questionId} onRun={runExperiment} onFriction={setFrictionStrength} onReflection={setReflection} onRequestSupport={requestSupport} onDontKnow={() => setReflection("I genuinely don't know yet.")} onContinue={submitReflection} /> : null}
        {stage === "RECONSTRUCT" ? <ReconstructionStage value={reconstruction} supportLevel={supportLevel} probeId={probeId} questionId={questionId} onChange={setReconstruction} onRequestSupport={requestSupport} onContinue={() => enterProof()} onDontKnow={() => { const text = "I genuinely don't know."; setReconstruction(text); enterProof(true, text); }} /> : null}
        {stage === "COLD_TRANSFER" ? <ProofStage choice={transferChoice} explanation={transferExplanation} submitted={false} onChoice={setTransferChoice} onExplanation={setTransferExplanation} onDontKnow={() => submitTransfer(true)} onSubmit={() => submitTransfer(false)} /> : null}
        {stage === "PROOF_RESULT" && interpretation ? <ResultStage evidence={deriveEvidenceCard(learningState)} interpretation={interpretation} onRestart={resetSession} /> : null}
      </main>
      <footer className="app-footer"><span>This World is currently reviewed for learners aged 13+.</span><span>AI interpretation can be wrong. The physics and primary answer checks are deterministic.</span></footer>
    </div>
  );
}
