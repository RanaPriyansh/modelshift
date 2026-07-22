"use client";

import { useEffect, useRef, useState } from "react";

import {
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE,
  createInitialArgumentEvidenceState,
  type ArgumentEvidenceWorldEvent,
  type ArgumentEvidenceWorldState,
  type InitialRuleId,
  type ReconstructionRuleId,
  type TestPredictionId,
  type TransferEvidenceItemId,
  type TransferLimitationId,
  type TransferMechanismId,
  type WorkedEvidenceItemId,
  type WorkedRelationId,
} from "../../../worlds/argument-evidence";
import {
  argumentEvidenceWorldRuntimeAdapter,
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  type BoundedLocalWorldRuntimeReceipt,
} from "../../../forge/world-runtime";

import styles from "./ArgumentEvidenceWorld.module.css";

export interface ArgumentEvidenceWorldProps {
  readonly onRuntimeReceipt?: (receipt: BoundedLocalWorldRuntimeReceipt) => void;
}

const STAGE_LABEL: Record<ArgumentEvidenceWorldState["stage"], string> = {
  MYSTERY: "Commit before help", EXPLAIN: "Explain", COMPILER: "Compare readings", TEST: "Separate", SUPPORT: "Optional support", RECONSTRUCT: "Reconstruct", WITHDRAWAL: "Withdraw help", COLD_TRANSFER: "Unaided transfer", RESULT: "Bounded result",
};

function ChoiceList({ name, legend = name, choices, value, onChange }: {
  readonly name: string;
  readonly legend?: string;
  readonly choices: readonly { readonly id: string; readonly label: string }[];
  readonly value: string | null;
  readonly onChange: (value: string) => void;
}) {
  return <fieldset className={styles.choices}><legend>{legend}</legend>{choices.map((choice) => <label key={choice.id}><input type="radio" name={name} checked={value === choice.id} onChange={() => onChange(choice.id)} /> {choice.label}</label>)}</fieldset>;
}

function learnerError(reason: string, domainReason?: string): string {
  const key = domainReason ?? reason;
  const messages: Record<string, string> = {
    explanation_too_short: "Add a little more about how the item would bear on the exact claim.",
    compiler_correction_too_short: "If you correct the readings, add a little more in your own words.",
    disagreement_required: "Name the point where the two readings disagree before making a prediction.",
    comparison_not_revealed: "Compare the two cards before classifying their relation.",
    worked_classification_incomplete: "Choose both a card and a relation before checking the comparison.",
    worked_classification_mismatch: "That pairing does not yet separate topical detail from an outcome-linked comparison. Try again.",
    reconstruction_too_short: "State a little more of the bounded rule in your own words.",
    reconstruction_mismatch: "Choose the rule that relates evidence to the named outcome.",
    transfer_incomplete: "Choose an item, relation, limitation, and confidence before the one transfer submission.",
    transfer_already_submitted: "This transfer has already been submitted. Start a new attempt to try again.",
    invalid_event_shape: "That action did not match the authored activity contract.",
    proof_action_blocked: "Instructional help is unavailable after withdrawal; construct-preserving access remains available.",
  };
  return messages[key] ?? "That action is not available at this point in the investigation.";
}

export function ArgumentEvidenceWorld({ onRuntimeReceipt }: ArgumentEvidenceWorldProps) {
  const [state, setState] = useState(createInitialArgumentEvidenceState);
  const [runtime, setRuntime] = useState(() => createWorldRuntimeSession(argumentEvidenceWorldRuntimeAdapter));
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const emittedAttempt = useRef<string | null>(null);
  const [initialRule, setInitialRule] = useState<string | null>(null);
  const [initialConfidence, setInitialConfidence] = useState(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.initialConfidence);
  const [explanation, setExplanation] = useState("");
  const [correction, setCorrection] = useState("");
  const [workedEvidence, setWorkedEvidence] = useState<string | null>(null);
  const [workedRelation, setWorkedRelation] = useState<string | null>(null);
  const [reconstruction, setReconstruction] = useState("");
  const [transferEvidence, setTransferEvidence] = useState<string | null>(null);
  const [transferMechanism, setTransferMechanism] = useState<string | null>(null);
  const [transferLimitation, setTransferLimitation] = useState<string | null>(null);
  const [transferConfidence, setTransferConfidence] = useState(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.transferConfidence);

  useEffect(() => { mainRef.current?.focus(); }, [state.stage]);
  useEffect(() => {
    if (runtime.receipt && emittedAttempt.current !== runtime.attemptId) {
      emittedAttempt.current = runtime.attemptId;
      onRuntimeReceipt?.(runtime.receipt);
    }
  }, [onRuntimeReceipt, runtime.attemptId, runtime.receipt]);

  const dispatch = (event: ArgumentEvidenceWorldEvent) => {
    const next = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "domain", event });
    setRuntime(next.session);
    setState(next.session.state);
    setError(next.accepted ? null : learnerError(next.reason, next.domainReason));
  };
  const submitTransfer = () => {
    const withConfidence = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, {
      kind: "domain", event: { type: "SET_TRANSFER_CONFIDENCE", confidence: transferConfidence },
    });
    const submitted = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, withConfidence.session, {
      kind: "domain", event: { type: "SUBMIT_TRANSFER" },
    });
    setRuntime(submitted.session);
    setState(submitted.session.state);
    setError(submitted.accepted ? null : learnerError(submitted.reason, submitted.domainReason));
  };
  const activateTextTable = () => {
    const next = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, {
      kind: "access_accommodation", accommodationId: "access.argument-evidence.text-table",
    });
    setRuntime(next.session);
    setState(next.session.state);
    setError(next.accepted ? null : learnerError(next.reason, next.domainReason));
  };
  const reset = () => {
    dispatch({ type: "RESET" });
    setInitialRule(null); setInitialConfidence(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.initialConfidence); setExplanation(""); setCorrection(""); setWorkedEvidence(null); setWorkedRelation(null); setReconstruction(""); setTransferEvidence(null); setTransferMechanism(null); setTransferLimitation(null); setTransferConfidence(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.transferConfidence);
  };
  const supportLevel = state.supportUsed.length + 1;
  const workedItems = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.selectableItemIds.map(
    (itemId) => ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.items.find((item) => item.id === itemId)!,
  );
  const textTableActive = runtime.accessAccommodations.some(
    (accommodation) => accommodation.accommodationId === "access.argument-evidence.text-table",
  );
  const statusText = state.stage === "RESULT"
    ? (state.transferEvaluation?.passed ? "Bounded result: demonstrated on this one task." : "Bounded result: not demonstrated on this attempt.")
    : STAGE_LABEL[state.stage];

  return <div className={`${styles.shell} ${state.stage === "COLD_TRANSFER" || state.stage === "RESULT" ? styles.proof : ""}`}>
    <a className={styles.skip} href="#argument-evidence-main">Skip to current stage</a>
    <header className={styles.header}><span>FORGE</span><strong>Argument &amp; evidence</strong><button type="button" onClick={reset}>Start a new attempt</button></header>
    <ol className={styles.rail} aria-label="World stages">{Object.entries(STAGE_LABEL).map(([key, label]) => <li key={key} data-current={key === state.stage || undefined}>{label}</li>)}</ol>
    <p className={styles.live} role="status" aria-live="polite">{statusText}</p>
    <main id="argument-evidence-main" ref={mainRef} tabIndex={-1} className={styles.main}>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {state.stage === "MYSTERY" && <section data-testid="argument-evidence-stage-mystery"><h1>What makes an item evidence for this claim?</h1><p>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.claim}</p><ChoiceList name="argument-evidence-initial-rule" legend="Choose the starting rule that best matches your thinking" value={initialRule} onChange={setInitialRule} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map((reading) => ({ id: reading.id, label: reading.text }))} /><label>Confidence <input aria-label="Initial confidence" type="range" min="0" max="100" value={initialConfidence} onChange={(event) => setInitialConfidence(Number(event.target.value))} /></label><button data-testid="argument-evidence-commit-initial" disabled={!initialRule} onClick={() => dispatch({ type: "COMMIT_INITIAL", ruleId: initialRule as InitialRuleId, confidence: initialConfidence })}>Commit this starting rule</button></section>}
      {state.stage === "EXPLAIN" && <section><h1>Explain your starting rule</h1><textarea aria-label="Initial explanation" value={explanation} onChange={(event) => setExplanation(event.target.value)} /><button onClick={() => dispatch({ type: "COMMIT_EXPLANATION", text: explanation })}>Continue to two readings</button></section>}
      {state.stage === "COMPILER" && <section><h1>Two plausible readings</h1><blockquote className={styles.quote}><strong>Your starting explanation</strong><p>{state.initialExplanation}</p></blockquote><p>These are exactly two authored possibilities, not a diagnosis or score.</p><div className={styles.cards}>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map((reading) => <article key={reading.id}><h2>{reading.label}</h2><p>{reading.text}</p></article>)}</div><p>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.disagreement}</p><button onClick={() => dispatch({ type: "RESPOND_TO_TWO_READINGS", response: "accept" })}>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.responses.find((response) => response.id === "accept")!.label}</button><button onClick={() => dispatch({ type: "RESPOND_TO_TWO_READINGS", response: "reject" })}>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.responses.find((response) => response.id === "reject")!.label}</button><label>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.responses.find((response) => response.id === "correct")!.label} <textarea aria-label="Compiler correction" value={correction} onChange={(event) => setCorrection(event.target.value)} /></label><button onClick={() => dispatch({ type: "RESPOND_TO_TWO_READINGS", response: "correct", correction })}>Commit my correction</button>{state.compilerResponse && <button onClick={() => dispatch({ type: "NAME_DISAGREEMENT" })}>Name the disagreement</button>}{state.disagreementNamed && <ChoiceList name="argument-evidence-test-prediction" legend="Commit a prediction" value={null} onChange={(predictionId) => dispatch({ type: "COMMIT_TEST_PREDICTION", predictionId: predictionId as TestPredictionId })} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings.map((reading) => ({ id: reading.prediction, label: reading.prediction.replaceAll("_", " ") }))} />}</section>}
      {state.stage === "TEST" && <section><h1>Compare the two cards</h1><button onClick={() => dispatch({ type: "REVEAL_SEPARATING_COMPARISON" })}>Compare the cards</button>{state.comparisonRevealed && <><div className={styles.cards}>{workedItems.map((item) => <article key={item.id}><h2>{item.id}</h2><p>{item.text}</p></article>)}</div><ChoiceList name="Worked evidence item" value={workedEvidence} onChange={(evidenceItemId) => { setWorkedEvidence(evidenceItemId); dispatch({ type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: evidenceItemId as WorkedEvidenceItemId }); }} choices={workedItems.map((item) => ({ id: item.id, label: item.text }))} /><ChoiceList name="Worked relation" value={workedRelation} onChange={(relationId) => { setWorkedRelation(relationId); dispatch({ type: "SET_WORKED_RELATION", relationId: relationId as WorkedRelationId }); }} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.relationChoices} /><button onClick={() => dispatch({ type: "SUBMIT_WORKED_COMPARISON" })}>Check the comparison</button></>}</section>}
      {state.stage === "SUPPORT" && <section><h1>Optional authored support</h1>{state.supportUsed.map((level) => <p key={level}>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.support[level - 1]?.text}</p>)}{state.supportUsed.includes(3) && <table data-testid="argument-evidence-worked-support-table" className={styles.table}><caption>Worked claim, candidate evidence, and relation table</caption><thead><tr><th scope="col">Claim</th><th scope="col">Candidate evidence</th><th scope="col">Relation</th></tr></thead><tbody>{workedItems.map((item) => <tr key={item.id}><td>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.claim}</td><td>{item.text}</td><td>Decide with the comparison controls.</td></tr>)}</tbody></table>}{supportLevel <= ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.support.length && <button data-testid="argument-evidence-support" onClick={() => dispatch({ type: "CONSUME_AUTHORED_SUPPORT", level: supportLevel as 1 | 2 | 3 })}>Use support level {supportLevel}</button>}<button onClick={() => dispatch({ type: "CONTINUE_TO_RECONSTRUCTION" })}>Reconstruct the rule</button></section>}
      {state.stage === "RECONSTRUCT" && <section><h1>Reconstruct the rule</h1><textarea aria-label="Reconstruction" value={reconstruction} onChange={(event) => setReconstruction(event.target.value)} /><button onClick={() => dispatch({ type: "SUBMIT_RECONSTRUCTION", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.reconstruction.expectedRuleId as ReconstructionRuleId, text: reconstruction })}>Commit reconstruction</button></section>}
      {state.stage === "WITHDRAWAL" && <section><h1>Instructional help is leaving</h1><p aria-live="polite">The next task has no hints, model action, or replay. Access accommodations remain available.</p><button onClick={() => dispatch({ type: "ACKNOWLEDGE_WITHDRAWAL" })}>Begin unaided transfer</button></section>}
      {state.stage === "COLD_TRANSFER" && <section data-testid="argument-evidence-stage-transfer" data-assistance="off"><h1>Unaided transfer</h1><p>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.claim}</p><button data-testid="argument-evidence-text-table-control" onClick={activateTextTable}>{textTableActive ? "Text/table alternative recorded" : "Record text/table alternative"}</button><p className={styles.accessStatus} role="status">{textTableActive ? "The construct-preserving text/table alternative is recorded for this attempt." : "The equivalent text/table alternative is available without changing the task."}</p><table data-testid="argument-evidence-transfer-text-table" className={styles.table}><caption>Text/table alternative: candidate items and the named claim outcome. Relations and limitations remain for the learner to decide.</caption><thead><tr><th scope="col">Candidate ID</th><th scope="col">Candidate item</th><th scope="col">Named claim outcome</th></tr></thead><tbody>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items.map((item) => <tr key={item.id}><th scope="row">{item.id}</th><td>{item.text}</td><td>{ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.claim}</td></tr>)}</tbody></table><ChoiceList name="argument-evidence-transfer-evidence" legend="Choose the item that bears on the claim" value={transferEvidence} onChange={(evidenceItemId) => { setTransferEvidence(evidenceItemId); dispatch({ type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: evidenceItemId as TransferEvidenceItemId }); }} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.items.map((item) => ({ id: item.id, label: item.text }))} /><ChoiceList name="argument-evidence-transfer-mechanism" legend="Choose the relation" value={transferMechanism} onChange={(mechanismId) => { setTransferMechanism(mechanismId); dispatch({ type: "SET_TRANSFER_MECHANISM", mechanismId: mechanismId as TransferMechanismId }); }} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.mechanismChoices} /><ChoiceList name="argument-evidence-transfer-limitation" legend="Choose the limitation" value={transferLimitation} onChange={(limitationId) => { setTransferLimitation(limitationId); dispatch({ type: "SET_TRANSFER_LIMITATION", limitationId: limitationId as TransferLimitationId }); }} choices={ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.limitationChoices} /><label>Confidence <input aria-label="Transfer confidence" type="range" min="0" max="100" value={transferConfidence} onChange={(event) => { setTransferConfidence(Number(event.target.value)); dispatch({ type: "SET_TRANSFER_CONFIDENCE", confidence: Number(event.target.value) }); }} /></label><button data-testid="argument-evidence-submit-transfer" onClick={submitTransfer}>Submit one unaided transfer</button></section>}
      {state.stage === "RESULT" && <section data-testid="argument-evidence-stage-result" className={styles.result}><h1>{state.transferEvaluation?.passed ? "Demonstrated on this one task" : "Not demonstrated on this attempt"}</h1><p>{state.proof?.demonstrated}</p><h2>What remains untested</h2><ul>{state.proof?.notYetTested.map((item) => <li key={item}>{item}</li>)}</ul><button onClick={reset}>Start this world again</button></section>}
    </main>
  </div>;
}
