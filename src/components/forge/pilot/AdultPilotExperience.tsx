"use client";

import { useState, type ReactNode } from "react";

import {
  createAdultPilotExperienceState,
  reduceAdultPilotExperience,
  type AdultPilotExperienceAction,
  type AdultPilotExperienceState,
  type ReviewedFixtureRefs,
} from "@/src/forge/pilot-experience/controller";

import { ForgeKicker, ForgeStatus } from "../ForgePrimitives";

import styles from "./AdultPilotExperience.module.css";

type WithoutActionId<T> = T extends { readonly actionId: string } ? Omit<T, "actionId"> : never;
type RouteAction = WithoutActionId<AdultPilotExperienceAction>;

type Drafts = Readonly<{
  intent: string;
  outcome: string;
  map: string;
  initialModel: string;
  reconstruction: string;
  practice: string;
  project: string;
  critique: string;
  defence: string;
  transfer: string;
}>;

type FixtureReading = Readonly<{ id: string; wording: string }>;
type FixtureMapEntry = Readonly<{ provenance: string; detail: string }>;
type FixtureRouteDetail = Readonly<{ label: string; value: string }>;

/**
 * Reviewed content is projected by a server-only module after the exact
 * review gate admits it. This client shell deliberately owns no fixture IDs,
 * readings, reviewed resource text, test content, or example answers.
 */
export type AdultPilotFixtureProjection = Readonly<{
  fixture: ReviewedFixtureRefs;
  mapEntries: readonly FixtureMapEntry[];
  readings: readonly [FixtureReading, FixtureReading];
  pointOfDisagreement: string;
  separatingOperation: Readonly<{ explanation: string; actionLabel: string }>;
  reviewedRoute: Readonly<{
    title: string;
    description: string;
    details: readonly FixtureRouteDetail[];
    actionLabel: string;
  }>;
  coldTransfer: Readonly<{ heading: string; label: string; submitLabel: string }>;
  delayedReturn: Readonly<{
    scheduledAt: string;
    dueAt: string;
    delayDays: number;
    dueAttemptId: string;
  }>;
}>;

const EMPTY_DRAFTS: Drafts = Object.freeze({
  intent: "",
  outcome: "",
  map: "",
  initialModel: "",
  reconstruction: "",
  practice: "",
  project: "",
  critique: "",
  defence: "",
  transfer: "",
});

function hasWords(value: string) {
  return value.trim().length > 0;
}

function stageTitle(stage: AdultPilotExperienceState["stage"]) {
  return stage.replaceAll("-", " ");
}

/**
 * Local review-fixture shell. It emits only accepted controller actions and
 * intentionally has no fetch, persistence, logger, provider, or evidence API.
 */
export function AdultPilotExperience({ projection }: { projection: AdultPilotFixtureProjection }) {
  const created = createAdultPilotExperienceState(projection.fixture);
  const [state, setState] = useState<AdultPilotExperienceState | null>(() => created.ok ? created.state : null);
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);
  const [readingCorrections, setReadingCorrections] = useState<Readonly<Record<string, string>>>({});
  const [correctingReadingId, setCorrectingReadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!state) {
    return (
      <section className={`${styles.surface} ${styles.unavailable}`} data-testid="pilot-route-invalid-fixture" role="status">
        <h1>Reviewed fixture unavailable.</h1>
        <p>The route did not receive a valid reviewed-fixture projection, so no pilot activity can begin.</p>
      </section>
    );
  }

  const updateDraft = (key: keyof Drafts, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const dispatch = (action: RouteAction) => {
    const transition = reduceAdultPilotExperience(state, { ...action, actionId: `pilot-route-${state.sequence + 1}` });
    if (!transition.accepted) {
      setNotice(`This fixture transition is unavailable: ${transition.reason}.`);
      return;
    }
    setState(transition.state);
    setNotice(null);
    if (transition.state.proofBoundary.solutionBearingState === "invalidated") {
      setDrafts(EMPTY_DRAFTS);
      setReadingCorrections({});
      setCorrectingReadingId(null);
    }
  };

  const updateReadingCorrection = (readingId: string, value: string) => {
    setReadingCorrections((current) => ({ ...current, [readingId]: value }));
  };

  const prosePrompt = (
    key: keyof Pick<Drafts, "reconstruction" | "practice" | "project" | "critique" | "defence">,
    heading: string,
    label: string,
    actionLabel: string,
    type: "COMMIT_RECONSTRUCTION" | "COMMIT_PRACTICE" | "COMMIT_PROJECT" | "COMMIT_CRITIQUE" | "COMMIT_INDIVIDUAL_DEFENCE",
  ) => (
    <section className={styles.question} aria-labelledby={`pilot-${key}-title`}>
      <ForgeStatus tone="learner">Your exact wording · this page only</ForgeStatus>
      <h1 id={`pilot-${key}-title`}>{heading}</h1>
      <label className={styles.field}>
        <span>{label}</span>
        <textarea
          aria-label={label}
          maxLength={1_200}
          onChange={(event) => updateDraft(key, event.target.value)}
          placeholder="Write in your own words. This is not saved or sent."
          rows={6}
          value={drafts[key]}
        />
      </label>
      <button className={styles.primaryAction} disabled={!hasWords(drafts[key])} onClick={() => dispatch({ type, learnerWording: drafts[key] })} type="button">
        {actionLabel}
      </button>
    </section>
  );

  let content: ReactNode;
  switch (state.stage) {
    case "intent":
      content = (
        <section className={styles.question} aria-labelledby="pilot-intent-title">
          <ForgeKicker>Reviewed fixture route · adult presentation</ForgeKicker>
          <ForgeStatus tone="quiet">Ephemeral review mode · not assigned</ForgeStatus>
          <h1 id="pilot-intent-title">What practical outcome do you want to work toward?</h1>
          <p>Start with an intention in your own words. This page keeps it only until support is explicitly withdrawn or the page refreshes.</p>
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span>What do you want to understand or make?</span>
              <textarea aria-label="What do you want to understand or make?" maxLength={1_200} onChange={(event) => updateDraft("intent", event.target.value)} rows={5} value={drafts.intent} />
            </label>
            <label className={styles.field}>
              <span>What practical outcome would make that useful?</span>
              <textarea aria-label="What practical outcome would make that useful?" maxLength={1_200} onChange={(event) => updateDraft("outcome", event.target.value)} rows={5} value={drafts.outcome} />
            </label>
          </div>
          <button className={styles.primaryAction} disabled={!hasWords(drafts.intent) || !hasWords(drafts.outcome)} onClick={() => dispatch({ type: "CAPTURE_INTENT", intentWording: drafts.intent, practicalOutcomeWording: drafts.outcome })} type="button">
            Record my intent and outcome
          </button>
        </section>
      );
      break;
    case "map-inspection":
      content = (
        <section className={styles.question} aria-labelledby="pilot-map-inspection-title">
          <ForgeStatus tone="quiet">Candidate map · fixture-only</ForgeStatus>
          <h1 id="pilot-map-inspection-title">What does this candidate map make visible?</h1>
          <p>The map is presented for inspection. It does not publish a route, assign a resource, or establish what you can do.</p>
          <ul className={styles.mapRows} aria-label="Candidate map provenance and gaps">
            {projection.mapEntries.map((entry) => <li key={`${entry.provenance}-${entry.detail}`}><strong>{entry.provenance}</strong><span>{entry.detail}</span></li>)}
          </ul>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "INSPECT_CANDIDATE_MAP", mapRef: projection.fixture.capabilityMapRef, provenance: "fixture", gapVisibility: "visible" })} type="button">
            Inspect this candidate map
          </button>
        </section>
      );
      break;
    case "map-decision":
      content = (
        <section className={styles.question} aria-labelledby="pilot-map-decision-title">
          <ForgeStatus tone="learner">Your route decision</ForgeStatus>
          <h1 id="pilot-map-decision-title">Should this candidate route remain, stop, or return for review?</h1>
          <label className={styles.field}>
            <span>State your decision in your own words</span>
            <textarea aria-label="State your decision in your own words" maxLength={1_200} onChange={(event) => updateDraft("map", event.target.value)} rows={5} value={drafts.map} />
          </label>
          <div className={styles.choiceActions}>
            <button className={styles.primaryAction} disabled={!hasWords(drafts.map)} onClick={() => dispatch({ type: "DECIDE_MAP_PROPOSAL", decision: "accept", consequence: "route-retained", learnerWording: drafts.map })} type="button">Retain this reviewed route</button>
            <button className={styles.secondaryAction} disabled={!hasWords(drafts.map)} onClick={() => dispatch({ type: "DECIDE_MAP_PROPOSAL", decision: "reject", consequence: "route-declined", learnerWording: drafts.map })} type="button">Decline this route</button>
            <button className={styles.secondaryAction} disabled={!hasWords(drafts.map)} onClick={() => dispatch({ type: "DECIDE_MAP_PROPOSAL", decision: "edit", consequence: "route-requires-review", learnerWording: drafts.map })} type="button">Request a reviewed revision</button>
          </div>
          <p className={styles.boundary}>Declining or requesting revision ends this local fixture route. This interface does not reissue, assign, or approve a replacement.</p>
        </section>
      );
      break;
    case "route-declined":
      content = <TerminalState title="Route declined." testId="pilot-route-declined">Your decision ended this fixture route. No reviewed route, resource, project, support, or proof activity starts from a declined route.</TerminalState>;
      break;
    case "route-review-required":
      content = <TerminalState title="Route review required." testId="pilot-route-review-required">Your edit request ended this fixture route pending a separately designed review and reissue path. Nothing is assigned, approved, or carried forward here.</TerminalState>;
      break;
    case "initial-model":
      content = (
        <section className={styles.question} aria-labelledby="pilot-initial-model-title">
          <ForgeStatus tone="learner">Starting strategy</ForgeStatus>
          <h1 id="pilot-initial-model-title">What mechanism or strategy would you try first?</h1>
          <label className={styles.field}>
            <span>Your starting strategy</span>
            <textarea aria-label="Your starting strategy" maxLength={1_200} onChange={(event) => updateDraft("initialModel", event.target.value)} rows={6} value={drafts.initialModel} />
          </label>
          <button className={styles.primaryAction} disabled={!hasWords(drafts.initialModel)} onClick={() => dispatch({ type: "COMMIT_INITIAL_MODEL", modelKind: "strategy", learnerWording: drafts.initialModel })} type="button">Commit my starting strategy</button>
        </section>
      );
      break;
    case "readings": {
      const readings = state.workspace?.readings ?? [];
      content = readings.length === 0 ? (
        <section className={styles.question} aria-labelledby="pilot-readings-title">
          <ForgeStatus tone="ai">Two uncertain readings · proposal only</ForgeStatus>
          <h1 id="pilot-readings-title">Which two plausible readings should be separated?</h1>
          <p>The fixture can present exactly two interpretations. It does not diagnose, rank, or decide for you.</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "PRESENT_TWO_UNCERTAIN_READINGS", proposer: "ai-proposal", readings: projection.readings, pointOfDisagreement: projection.pointOfDisagreement })} type="button">Show the two uncertain readings</button>
        </section>
      ) : (
        <section className={styles.question} aria-labelledby="pilot-readings-response-title">
          <ForgeStatus tone="ai">Two uncertain readings · proposal only</ForgeStatus>
          <h1 id="pilot-readings-response-title">Which reading do you accept, correct, or reject?</h1>
          <p className={styles.disagreement}><strong>Point of disagreement:</strong> {projection.pointOfDisagreement}</p>
          <ol className={styles.readingList}>
            {readings.map((reading, index) => (
              <li key={reading.id}>
                <span>{index + 1}</span>
                <div><p>{reading.wording}</p><small>{reading.response ? `Your response: ${reading.response}.` : "Awaiting your response."}</small></div>
                {!reading.response ? (
                  <div className={styles.readingActions}>
                    <button className={styles.secondaryAction} onClick={() => dispatch({ type: "RESPOND_TO_READING", readingId: reading.id, response: "accept" })} type="button">Accept reading {index + 1}</button>
                    <button className={styles.secondaryAction} onClick={() => dispatch({ type: "RESPOND_TO_READING", readingId: reading.id, response: "reject" })} type="button">Reject reading {index + 1}</button>
                    {correctingReadingId === reading.id ? (
                      <label className={styles.correctionField}>
                        <span>Your correction for reading {index + 1}</span>
                        <textarea aria-label={`Your correction for reading ${index + 1}`} maxLength={1_200} onChange={(event) => updateReadingCorrection(reading.id, event.target.value)} rows={4} value={readingCorrections[reading.id] ?? ""} />
                        <button className={styles.secondaryAction} disabled={!hasWords(readingCorrections[reading.id] ?? "")} onClick={() => dispatch({ type: "RESPOND_TO_READING", readingId: reading.id, response: "correct", correctedWording: readingCorrections[reading.id] ?? "" })} type="button">Use my correction for reading {index + 1}</button>
                      </label>
                    ) : (
                      <button className={styles.secondaryAction} onClick={() => setCorrectingReadingId(reading.id)} type="button">Correct reading {index + 1}</button>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      );
      break;
    }
    case "separating-operation":
      content = (
        <section className={styles.question} aria-labelledby="pilot-operation-title">
          <ForgeStatus tone="evidence">Selected by you</ForgeStatus>
          <h1 id="pilot-operation-title">What comparison can separate the two readings?</h1>
          <p>{projection.separatingOperation.explanation}</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "SELECT_SEPARATING_OPERATION", selectedOperationRef: projection.fixture.separatingOperationRef, selectedBy: "learner" })} type="button">{projection.separatingOperation.actionLabel}</button>
        </section>
      );
      break;
    case "reviewed-route":
      content = (
        <section className={styles.question} aria-labelledby="pilot-reviewed-route-title" data-testid="pilot-reviewed-route">
          <ForgeStatus tone="evidence">Reviewed sources · non-operative</ForgeStatus>
          <h1 id="pilot-reviewed-route-title">What is the next reviewed checkpoint?</h1>
          <div className={styles.reviewedRoute} data-testid="pilot-resource-surface">
            <strong>{projection.reviewedRoute.title}</strong>
            <p>{projection.reviewedRoute.description}</p>
            <dl>{projection.reviewedRoute.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
          </div>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "ACTIVATE_REVIEWED_ROUTE", routeRef: projection.fixture.reviewedRouteRef, resourceRef: projection.fixture.resourceRef, activeCheckpointRef: projection.fixture.activeCheckpointRef })} type="button">{projection.reviewedRoute.actionLabel}</button>
        </section>
      );
      break;
    case "reconstruction":
      content = prosePrompt("reconstruction", "How would you reconstruct the comparison without the route?", "Your reconstruction", "Commit my reconstruction", "COMMIT_RECONSTRUCTION");
      break;
    case "practice":
      content = prosePrompt("practice", "What different example will you rehearse?", "Your practice plan", "Commit my practice", "COMMIT_PRACTICE");
      break;
    case "project":
      content = prosePrompt("project", "What individual practical explanation will you make?", "Your project explanation", "Commit my individual project", "COMMIT_PROJECT");
      break;
    case "critique":
      content = prosePrompt("critique", "What limitation will you critique or revise?", "Your critique", "Commit my critique", "COMMIT_CRITIQUE");
      break;
    case "individual-defence":
      content = prosePrompt("defence", "How would you defend this individual decision?", "Your individual defence", "Commit my individual defence", "COMMIT_INDIVIDUAL_DEFENCE");
      break;
    case "support-withdrawal":
      content = (
        <section className={styles.question} aria-labelledby="pilot-withdrawal-title">
          <ForgeStatus tone="evidence">Support boundary</ForgeStatus>
          <h1 id="pilot-withdrawal-title">Are you ready to remove in-product instructional support?</h1>
          <p>Entering unfamiliar proof unmounts the candidate map, route references, readings, learner prose, and all instructional assistance for this attempt. Accessibility controls remain available.</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "WITHDRAW_INSTRUCTIONAL_SUPPORT", withdrawal: "explicit" })} type="button">Withdraw in-product support</button>
        </section>
      );
      break;
    case "proof":
      content = (
        <section className={`${styles.question} ${styles.proof}`} aria-labelledby="pilot-proof-title" data-testid="pilot-proof" data-proof-locked="true">
          <ForgeStatus tone="quiet">Proof authority · honour_based</ForgeStatus>
          <h1 id="pilot-proof-title">{projection.coldTransfer.heading}</h1>
          <p>In-product interpretation, resource, experiment-selection, and hint support have been removed. This route does not score, publish, or upgrade evidence. Accessibility controls preserve access without changing the task.</p>
          <fieldset className={styles.accessibility} data-testid="pilot-accessibility-controls">
            <legend>Accessibility controls remain available</legend>
            <div>
              {(["screen-reader", "high-contrast", "keyboard-navigation"] as const).map((control) => (
                <button aria-pressed={state.proofBoundary.accessibilityControls.includes(control)} className={styles.secondaryAction} key={control} onClick={() => dispatch({ type: "RECORD_ACCESSIBILITY_CONTROL", control })} type="button">
                  {control.replaceAll("-", " ")}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={styles.field}>
            <span>{projection.coldTransfer.label}</span>
            <textarea aria-label={projection.coldTransfer.label} maxLength={1_200} onChange={(event) => updateDraft("transfer", event.target.value)} rows={6} value={drafts.transfer} />
          </label>
          <button className={styles.primaryAction} disabled={!hasWords(drafts.transfer)} onClick={() => dispatch({ type: "SUBMIT_COLD_TRANSFER", transferRef: projection.fixture.coldTransferRef, learnerWording: drafts.transfer })} type="button">{projection.coldTransfer.submitLabel}</button>
        </section>
      );
      break;
    case "bounded-result":
      content = (
        <section className={styles.question} aria-labelledby="pilot-result-title">
          <ForgeStatus tone="quiet">Bounded fixture result</ForgeStatus>
          <h1 id="pilot-result-title">What can this fixture honestly say about this attempt?</h1>
          <p>This route records only <strong>untested</strong> for this reviewed fixture flow. It does not score the transfer, claim retention, or name a capability.</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "RECORD_BOUNDED_RESULT", source: "reviewed-fixture-validator", result: "untested", conditionsRef: projection.fixture.evidenceContractRef })} type="button">Record this fixture attempt as untested</button>
        </section>
      );
      break;
    case "delayed-return":
      content = state.delayedReturn ? (
        <section className={styles.question} aria-labelledby="pilot-return-title">
          <ForgeStatus tone="quiet">Delayed return · fixture-only</ForgeStatus>
          <h1 id="pilot-return-title">What is the delayed return result?</h1>
          <p>The delayed attempt is still untested. This page has not scheduled anything, sent a reminder, or retained a task beyond this open review fixture.</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "RECORD_DELAYED_RETURN", dueAttemptId: projection.delayedReturn.dueAttemptId, attemptedAt: projection.delayedReturn.dueAt, result: "untested" })} type="button">Record delayed return as untested</button>
        </section>
      ) : (
        <section className={styles.question} aria-labelledby="pilot-return-schedule-title">
          <ForgeStatus tone="quiet">Delayed return · fixture-only</ForgeStatus>
          <h1 id="pilot-return-schedule-title">When should this fixture return be considered?</h1>
          <p>A whole-day reviewed delay is represented locally for deterministic review. No reminder, calendar event, or persistent schedule is created.</p>
          <button className={styles.primaryAction} onClick={() => dispatch({ type: "SCHEDULE_DELAYED_RETURN", ...projection.delayedReturn })} type="button">Set the reviewed fixture return</button>
        </section>
      );
      break;
    case "completed":
      content = (
        <section className={`${styles.question} ${styles.completed}`} aria-labelledby="pilot-complete-title" data-testid="pilot-completed">
          <ForgeStatus tone="quiet">Fixture complete · no upgrade</ForgeStatus>
          <h1 id="pilot-complete-title">This reviewed fixture remains untested.</h1>
          <p>No capability, evidence, retention, or mastery claim was created. Refreshing returns this route to its initial review-fixture state.</p>
        </section>
      );
      break;
  }

  return (
    <article className={styles.surface} data-testid="pilot-review-route" data-stage={state.stage} aria-label={`Adult pilot stage: ${stageTitle(state.stage)}`}>
      {content}
      <p className={styles.sequence} aria-live="polite">Fixture step {state.sequence} · local only · no evidence upgrade</p>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    </article>
  );
}

function TerminalState({ children, testId, title }: { children: ReactNode; testId: string; title: string }) {
  return (
    <section className={`${styles.question} ${styles.terminal}`} data-testid={testId} aria-labelledby={`${testId}-title`}>
      <ForgeStatus tone="quiet">Non-operational terminal stage</ForgeStatus>
      <h1 id={`${testId}-title`}>{title}</h1>
      <p>{children}</p>
    </section>
  );
}
