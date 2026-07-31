"use client";

import { useState } from "react";

import type { UniversityResearchReadinessFixtureScenario } from "@/app/internal/university-research-readiness/research-readiness-fixture.server";

import styles from "./UniversityResearchReadinessWorkspace.module.css";

type Projection =
  UniversityResearchReadinessFixtureScenario["projection"];
type ProjectionStatus = Projection["status"];
type ReadinessTone = "bound" | "attention" | "stopped" | "waiting";

type ReadinessStage = Readonly<{
  id: "protocol" | "comparator" | "approval" | "operator" | "preflight";
  label: string;
  statusLabel: string;
  tone: ReadinessTone;
  current: boolean;
}>;

type StatePresentation = Readonly<{
  index: string;
  label: string;
  title: string;
  body: string;
}>;

const STAGE_LABELS = Object.freeze({
  protocol: "Protocol",
  comparator: "Comparator",
  approval: "Approval",
  operator: "Operator",
  preflight: "Preflight",
});

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function readinessFor(status: ProjectionStatus): readonly ReadinessStage[] {
  const stages: Record<
    ReadinessStage["id"],
    Omit<ReadinessStage, "id" | "label">
  > = {
    protocol: {
      statusLabel: "Not evaluated",
      tone: "waiting",
      current: false,
    },
    comparator: {
      statusLabel: "Not evaluated",
      tone: "waiting",
      current: false,
    },
    approval: {
      statusLabel: "Not evaluated",
      tone: "waiting",
      current: false,
    },
    operator: {
      statusLabel: "Not evaluated",
      tone: "waiting",
      current: false,
    },
    preflight: {
      statusLabel: "Not evaluated",
      tone: "waiting",
      current: false,
    },
  };

  switch (status) {
    case "draft_invalid":
      stages.protocol = {
        statusLabel: "Protocol stopped",
        tone: "stopped",
        current: true,
      };
      break;
    case "approval_required":
      stages.protocol = {
        statusLabel: "Protocol bound",
        tone: "bound",
        current: false,
      };
      stages.comparator = {
        statusLabel: "Declaration bound",
        tone: "bound",
        current: false,
      };
      stages.approval = {
        statusLabel: "Fixture references required",
        tone: "attention",
        current: true,
      };
      break;
    case "operator_gap":
      stages.protocol = {
        statusLabel: "Protocol bound",
        tone: "bound",
        current: false,
      };
      stages.comparator = {
        statusLabel: "Declaration bound",
        tone: "bound",
        current: false,
      };
      stages.approval = {
        statusLabel: "Fixture references bound",
        tone: "bound",
        current: false,
      };
      stages.operator = {
        statusLabel: "Fixture roles required",
        tone: "attention",
        current: true,
      };
      break;
    case "substitute_mismatch":
      stages.protocol = {
        statusLabel: "Protocol bound",
        tone: "bound",
        current: false,
      };
      stages.comparator = {
        statusLabel: "Repair required",
        tone: "attention",
        current: true,
      };
      break;
    case "synthetic_plan_coherent":
      stages.protocol = {
        statusLabel: "Protocol bound",
        tone: "bound",
        current: false,
      };
      stages.comparator = {
        statusLabel: "Declaration bound",
        tone: "bound",
        current: false,
      };
      stages.approval = {
        statusLabel: "Fixture references bound",
        tone: "bound",
        current: false,
      };
      stages.operator = {
        statusLabel: "Fixture roles represented",
        tone: "bound",
        current: false,
      };
      stages.preflight = {
        statusLabel: "Plan coherent",
        tone: "bound",
        current: true,
      };
      break;
  }

  return (Object.keys(STAGE_LABELS) as ReadinessStage["id"][]).map((id) => ({
    id,
    label: STAGE_LABELS[id],
    ...stages[id],
  }));
}

function presentation(status: ProjectionStatus): StatePresentation {
  switch (status) {
    case "draft_invalid":
      return {
        index: "01",
        label: "Protocol stopped",
        title: "Repair the protocol before any rehearsal.",
        body:
          "The supplied draft did not establish one exact versioned research envelope. Downstream comparator, approval, operator, and preflight facts were not evaluated.",
      };
    case "approval_required":
      return {
        index: "03",
        label: "Authorization boundary",
        title: "Approval is missing. Stop here.",
        body:
          "An inspectable protocol is not authorization to recruit, contact, record, or capture coursework. The fixture remains closed until every required approval is declared.",
      };
    case "operator_gap":
      return {
        index: "04",
        label: "Fixture bindings incomplete",
        title: "Every required role needs a fixture placeholder.",
        body:
          "The synthetic plan is incomplete while required roles lack distinct opaque fixture references. These placeholders establish neither a person nor identity authority, and this workspace does not infer or route around them.",
      };
    case "substitute_mismatch":
      return {
        index: "02",
        label: "Parity broken",
        title: "The comparator must answer the same question.",
        body:
          "Information parity, task-family parity, and counterbalancing are separate requirements. A convenient substitute cannot be treated as a valid comparison.",
      };
    case "synthetic_plan_coherent":
      return {
        index: "05",
        label: "Caller-asserted plan coherent",
        title: "The synthetic preflight plan is internally coherent.",
        body:
          "The bounded fixture aligns its protocol declarations, review references, role placeholders, comparator plan, and sample limits. Substitute artifacts, pack equivalence, approval, and permission to involve a person remain unestablished.",
      };
  }
}

function parityLabel(projection: Projection): string {
  const comparator = projection.comparator;
  if (!comparator) return "Not exposed";
  if (
    comparator.informationParity
    && comparator.taskParity
    && comparator.counterbalanceScheduleDeclared
  ) {
    return "Information and task declarations align; schedule is locked";
  }
  return "Mismatch requires review";
}

function protocolLabel(projection: Projection): string {
  if (!projection.protocol) return "Not exposed";
  if (projection.status === "draft_invalid") {
    return `${projection.protocol.protocolId} / ${projection.protocol.protocolVersion} (supplied, stopped)`;
  }
  return `${projection.protocol.protocolId} / ${projection.protocol.protocolVersion}`;
}

function sampleLabel(projection: Projection): string {
  if (!projection.sample) return "Unavailable";
  return `Future adult-only target: ${projection.sample.targetMinimum}-${projection.sample.targetMaximum}; current fixture: no people`;
}

function shortDigest(value: string | null): string {
  return value ? `${value.slice(0, 19)}...` : "Unavailable";
}

function authorityLabel(value: false): string {
  return value ? "Invalid authority" : "Not allowed";
}

export function UniversityResearchReadinessWorkspace({
  scenarios,
}: {
  scenarios: readonly UniversityResearchReadinessFixtureScenario[];
}) {
  const [selectedId, setSelectedId] = useState<
    UniversityResearchReadinessFixtureScenario["id"]
  >(scenarios[0]?.id ?? "invalid-protocol");
  const selected =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];

  if (!selected) return <UniversityResearchReadinessUnavailable />;

  const projection = selected.projection;
  const state = presentation(projection.status);
  const readiness = readinessFor(projection.status);
  const protocol = projection.protocol;
  const primaryIssue = projection.issues[0] ?? null;
  const downstreamEvaluated = projection.status !== "draft_invalid";
  const downstreamUnavailable = projection.protocol
    ? "Supplied, not evaluated"
    : "Not exposed";

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-research-readiness-title"
      data-status={projection.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university research operations</p>
          <p className={styles.workspaceName}>Phase -1 readiness review</p>
        </div>
        <div className={styles.fixtureScope}>
          <p>Synthetic plan / future adult-only protocol</p>
          <span>No participant state</span>
        </div>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Rehearsal is not permission</strong>
        <span>No recruitment or contact</span>
        <span>No recording or coursework capture</span>
        <span>No export, send, persistence, or external event emission</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Stress-test the research boundary</legend>
        <div>
          {scenarios.map((scenario) => (
            <label key={scenario.id}>
              <input
                type="radio"
                name="university-research-readiness-scenario"
                value={scenario.id}
                checked={scenario.id === selected.id}
                onChange={() => setSelectedId(scenario.id)}
              />
              <span>{scenario.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.hero}>
        <p className={styles.heroIndex} aria-hidden="true">{state.index}</p>
        <div>
          <p className={styles.stateLabel}>{state.label}</p>
          <h1 id="university-research-readiness-title">
            Rehearsal is not permission.
          </h1>
        </div>
      </section>

      <section
        className={styles.readiness}
        aria-labelledby="research-readiness-gates-title"
      >
        <h2 className="sr-only" id="research-readiness-gates-title">
          Research readiness gates
        </h2>
        <ol>
          {readiness.map((stage, index) => (
            <li
              key={stage.id}
              data-tone={stage.tone}
              aria-current={stage.current ? "step" : undefined}
            >
              <span className={styles.stageIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.stageName}>{stage.label}</span>
              <span className={styles.stageState}>{stage.statusLabel}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {state.label}. {state.title}
      </p>
      <section className={styles.currentState}>
        <div className={styles.currentLead}>
          <p>{state.label}</p>
          <h2>{state.title}</h2>
        </div>
        <div className={styles.currentBody}>
          <p>{state.body}</p>
          <dl className={styles.detailGrid}>
            <div>
              <dt>Protocol</dt>
              <dd>{protocolLabel(projection)}</dd>
            </div>
            <div>
              <dt>Candidate route</dt>
              <dd>
                {downstreamEvaluated
                  ? protocol?.candidateRoute ?? "Not exposed"
                  : downstreamUnavailable}
              </dd>
            </div>
            <div>
              <dt>Envelope-bound approval fixtures</dt>
              <dd>
                {downstreamEvaluated
                  ? `${projection.operations.boundApprovalReferenceCount} of ${projection.operations.requiredApprovalCount}`
                  : downstreamUnavailable}
              </dd>
            </div>
            <div>
              <dt>Distinct fixture role bindings</dt>
              <dd>
                {downstreamEvaluated
                  ? `${projection.operations.validFixtureRoleBindingCount} of ${projection.operations.requiredRoleCount} required roles`
                  : downstreamUnavailable}
              </dd>
            </div>
            <div>
              <dt>Comparator</dt>
              <dd>
                {downstreamEvaluated
                  ? parityLabel(projection)
                  : downstreamUnavailable}
              </dd>
            </div>
            <div>
              <dt>Sample plan</dt>
              <dd>
                {downstreamEvaluated
                  ? sampleLabel(projection)
                  : downstreamUnavailable}
              </dd>
            </div>
            <div>
              <dt>Protocol source</dt>
              <dd>
                {protocol
                  ? `${protocol.sourceCommit} / amendment ${protocol.amendmentVersion}`
                  : "Not exposed"}
              </dd>
            </div>
            <div>
              <dt>Current issue</dt>
              <dd>
                {primaryIssue?.message
                  ?? "No projector issue; plan coherence only"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.guardrails} aria-labelledby="research-guardrails-title">
        <div>
          <p>Operator boundary</p>
          <h2 id="research-guardrails-title">
            Review the plan. Do not involve a person.
          </h2>
        </div>
        <ul>
          <li>
            <strong>Evidence dimensions</strong>
            {projection.evidenceDimensions.length > 0
              ? projection.evidenceDimensions.map(readable).join(", ")
              : "None available in this state"}
          </li>
          <li>
            <strong>Decision frame</strong>
            {projection.decisionOutcomes.join(", ")}
          </li>
          <li>
            <strong>Participant enrollment</strong>
            {authorityLabel(projection.authority.participantEnrollmentAllowed)}
          </li>
          <li>
            <strong>Data and coursework capture</strong>
            {authorityLabel(projection.authority.participantDataCaptureAllowed)};{" "}
            {authorityLabel(projection.authority.courseworkCaptureAllowed)}
          </li>
          <li>
            <strong>External send</strong>
            {authorityLabel(projection.authority.externalSendAllowed)}
          </li>
          <li>
            <strong>Claim upgrade</strong>
            {authorityLabel(projection.authority.claimUpgradeAllowed)}
          </li>
          <li>
            <strong>Artifact and operator identity</strong>
            Caller-asserted synthetic fixture only
          </li>
        </ul>
      </section>

      <footer className={styles.authority}>
        <div>
          <p>Authority ceiling</p>
          <strong>Synthetic plan inspection only</strong>
        </div>
        <dl>
          <div>
            <dt>Persistence</dt>
            <dd>{authorityLabel(projection.authority.persistenceAllowed)}</dd>
          </div>
          <div>
            <dt>Event emission</dt>
            <dd>{authorityLabel(projection.authority.eventEmissionAllowed)}</dd>
          </div>
          <div>
            <dt>Fixture digest</dt>
            <dd>{protocol ? shortDigest(protocol.fixtureDigest) : "Unavailable"}</dd>
          </div>
          <div>
            <dt>Projection digest</dt>
            <dd>{shortDigest(projection.projectionDigest)}</dd>
          </div>
        </dl>
        <p className={styles.claimCeiling}>
          This fixture does not establish approval, demand, recruitment
          authority, participant safety, data rights, research validity,
          learning efficacy, accessibility conformance, or production
          readiness.
        </p>
      </footer>
    </article>
  );
}

export function UniversityResearchReadinessUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No university research-readiness state is available.</h1>
      <p>
        No protocol, approval, operator plan, comparator, sample, participant,
        recording, or research evidence was exposed.
      </p>
    </section>
  );
}
