"use client";

import { useState } from "react";

import type { UniversityResearchReadinessFixtureScenario } from "@/app/internal/university-research-readiness/research-readiness-fixture.server";

import styles from "./UniversityResearchReadinessWorkspace.module.css";

type Projection =
  UniversityResearchReadinessFixtureScenario["projection"];
type ProjectionStatus = Projection["status"];
type ArtifactProjection = NonNullable<
  UniversityResearchReadinessFixtureScenario["artifactProjection"]
>;
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
  comparator: "Artifact comparator",
  approval: "Research approval refs",
  operator: "Operator",
  preflight: "Plan preflight",
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
          "The bounded fixture aligns its protocol declarations, review references, role placeholders, comparator plan, and sample limits. Exact synthetic artifact identities now appear in the separate ledger. Candidate runtime binding, rendered parity, independent pack equivalence, approval, and permission to involve a person remain unestablished.",
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
    return "Shared information and task manifest aligns; candidate/substitute rendering not checked";
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

type ArtifactResultPresentation = Readonly<{
  title: string;
  body: string;
}>;

function artifactResult(
  projection: ArtifactProjection | null,
): ArtifactResultPresentation {
  if (!projection || projection.status === "invalid") {
    return {
      title: "Artifact preflight was not evaluated.",
      body:
        "No downstream artifact identity or deterministic comparison is exposed while the protocol input is stopped.",
    };
  }
  switch (projection.status) {
    case "neutrality_mismatch":
      return {
        title: "The neutral substitute breaks its declared boundary.",
        body:
          "The authored substitute contains a structure or term outside the locked neutral worksheet contract. Repair is required before independent review.",
      };
    case "scenario_structure_mismatch":
      return {
        title:
          "Pack P and Pack Q do not describe the same seven-state problem.",
        body:
          "The exact scenario order or required state structure differs. No pack comparison or review inference is available.",
      };
    case "mechanical_parity_mismatch":
      return {
        title: "The authored manifests do not match mechanically.",
        body:
          "At least one bounded identity, semantic signature, substitute binding, pairing, or review-checklist rule differs.",
      };
    case "mechanical_parity_passed_review_required":
      return {
        title:
          "The manifests match mechanically. Independent review is still required.",
        body:
          "The frozen semantic, identity, neutrality, density, and binding rules matched. Candidate rendering and substitute rendering were not evaluated. Equivalent difficulty, reviewer identity, and artifact approval remain unestablished.",
      };
  }
}

function Digest({ value }: { value: string }) {
  return (
    <bdi dir="ltr" className={styles.digest}>
      <code>{value}</code>
    </bdi>
  );
}

const OPEN_GATE_PRESENTATIONS = Object.freeze([
  {
    title: "Candidate pack adapter",
    body: "Candidate packs are declared, not runtime-bound.",
  },
  {
    title: "Rendered candidate/substitute parity",
    body: "Manifest parity is not rendered parity.",
  },
  {
    title: "Independent difficulty and equivalence review",
    body: "No independent reviewer has established equivalent difficulty.",
  },
  {
    title: "Artifact approval",
    body: "Artifact identities do not authorize use.",
  },
  {
    title: "Synthetic-persona rehearsal",
    body: "No tabletop rehearsal evidence exists.",
  },
  {
    title: "Participant operation",
    body: "No person may be recruited, contacted, recorded, or observed.",
  },
] as const);

function artifactCheckRows(
  projection: ArtifactProjection | null,
): readonly Readonly<{ label: string; state: string; tone: string }>[] {
  const unavailable = !projection || projection.status === "invalid";
  const booleanState = (value: boolean) => (
    unavailable
      ? { state: "Not evaluated", tone: "waiting" }
      : value
        ? { state: "Matched mechanically", tone: "bound" }
        : { state: "Mismatch", tone: "attention" }
  );
  const checks = projection?.mechanicalChecks;
  return [
    {
      label: "Seven scenario slots appear in protocol order",
      ...booleanState(checks?.exactScenarioOrder ?? false),
    },
    {
      label: "Every scenario matches the frozen authored semantic oracle",
      ...booleanState(checks?.canonicalScenarioSemantics ?? false),
    },
    {
      label: "Pack, scenario, World, choice, and substitute references are unique",
      ...booleanState(checks?.uniqueReferences ?? false),
    },
    {
      label: "Pack-specific labels and identifiers differ",
      ...booleanState(checks?.distinctLexicalVariants ?? false),
    },
    {
      label: "Pack P and Pack Q semantic signatures match",
      ...booleanState(checks?.semanticSignaturesMatch ?? false),
    },
    {
      label: "Pack digests are distinct",
      ...booleanState(checks?.distinctPackDigests ?? false),
    },
    {
      label: "The substitute contains only allowed neutral structure",
      ...booleanState(checks?.substituteNeutrality ?? false),
    },
    {
      label: "Every substitute manifest stays within its declared density budget",
      ...booleanState(checks?.substituteManifestDensity ?? false),
    },
    {
      label: "Renderer identity matches the frozen local descriptor",
      ...booleanState(checks?.rendererBindingVerified ?? false),
    },
    {
      label: "Candidate adapter identity matches its manifest-only descriptor",
      ...booleanState(checks?.candidateAdapterBindingVerified ?? false),
    },
    {
      label: "The substitute is bound to both pack digests",
      ...booleanState(checks?.substitutePackBindings ?? false),
    },
    {
      label: "Four candidate/substitute pairings are declared",
      ...booleanState(checks?.pairingManifestComplete ?? false),
    },
    {
      label: "Candidate rendered parity",
      state: unavailable ? "Not evaluated" : "Not rendered",
      tone: "waiting",
    },
    {
      label: "Substitute rendered parity",
      state: unavailable ? "Not evaluated" : "Not rendered",
      tone: "waiting",
    },
  ];
}

function ArtifactEvidence({
  projection,
}: {
  projection: ArtifactProjection | null;
}) {
  const result = artifactResult(projection);
  const artifacts = projection?.artifacts ?? null;
  const issues = projection?.issues ?? [];
  const checks = artifactCheckRows(projection);
  const mechanicallyMatched = projection?.status
    === "mechanical_parity_passed_review_required";
  const notEvaluated = !projection || projection.status === "invalid";
  const evidenceSteps = [
    {
      title: "Authored manifests",
      state: notEvaluated
        ? "Not evaluated"
        : artifacts
          ? "Present and locally digested"
          : "Not evaluated",
      tone: artifacts ? "bound" : "waiting",
    },
    {
      title: "Deterministic comparison",
      state: notEvaluated
        ? "Not evaluated"
        : mechanicallyMatched
          ? "Matched mechanically; not a human review"
          : "Repair required",
      tone: mechanicallyMatched ? "bound" : notEvaluated ? "waiting" : "attention",
    },
    {
      title: "Independent equivalence review",
      state: notEvaluated
        ? "Not evaluated"
        : mechanicallyMatched
          ? "Requested; not completed"
          : "Requested; blocked until repair",
      tone: notEvaluated ? "waiting" : "attention",
    },
    {
      title: "Artifact approval",
      state: notEvaluated ? "Not evaluated" : "Not established",
      tone: notEvaluated ? "waiting" : "attention",
    },
  ] as const;

  return (
    <section
      className={styles.artifactEvidence}
      aria-labelledby="artifact-evidence-title"
    >
      <header className={styles.artifactHeader}>
        <div>
          <p>Artifact authoring and comparison</p>
          <h2 id="artifact-evidence-title">
            Artifact evidence stops before review.
          </h2>
        </div>
        <p className={styles.artifactScope}>
          Fixture only / local canonical identity / no operational authority
        </p>
      </header>
      <p className={styles.artifactIntro}>
        Pack P, Pack Q, and the neutral substitute can have canonical local
        identities and still be unreviewed. Mechanical checks compare declared
        structure. They do not establish rendered parity, equivalent
        difficulty, approval, or permission to involve a person. The candidate
        build digest remains caller asserted and unverified; adapter and
        renderer identities are recomputed from local manifest descriptors only.
      </p>

      <ol className={styles.evidenceLadder} aria-label="Artifact evidence meaning">
        {evidenceSteps.map((step, index) => (
          <li key={step.title} data-tone={step.tone}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.title}</strong>
            <p>{step.state}</p>
          </li>
        ))}
      </ol>

      <div className={styles.artifactResult}>
        <div>
          <p>Current artifact result</p>
          <h3>{result.title}</h3>
        </div>
        <div>
          <p>{result.body}</p>
          <strong>Open gates: 6</strong>
        </div>
      </div>

      <section className={styles.openGates} aria-labelledby="open-gates-title">
        <div>
          <p>Authority boundary</p>
          <h3 id="open-gates-title">Nothing here closes these gates.</h3>
          <span>All six gates remain open. A mechanical match closes none of them.</span>
        </div>
        <ol>
          {OPEN_GATE_PRESENTATIONS.map((gate, index) => (
            <li key={gate.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{gate.title}</strong>
                <p>{gate.body}</p>
              </div>
              <em>Open</em>
            </li>
          ))}
        </ol>
      </section>

      {artifacts ? (
        <>
          <section
            className={styles.identityLedger}
            aria-labelledby="identity-ledger-title"
          >
            <header>
              <p>Immutable local identities</p>
              <h3 id="identity-ledger-title">Artifact identity ledger</h3>
            </header>
            <div className={styles.packLedger}>
              {([
                ["Scenario Pack P", artifacts.packP],
                ["Scenario Pack Q", artifacts.packQ],
              ] as const).map(([label, pack]) => (
                <section key={label}>
                  <h4>{label}</h4>
                  <dl>
                    <div>
                      <dt>Artifact reference</dt>
                      <dd>{pack.artifactRef}</dd>
                    </div>
                    <div>
                      <dt>Artifact version</dt>
                      <dd>{pack.artifactVersion}</dd>
                    </div>
                    <div>
                      <dt>Canonical pack digest</dt>
                      <dd><Digest value={pack.digest} /></dd>
                    </div>
                    <div>
                      <dt>Authored scenarios</dt>
                      <dd>{pack.scenarios.length}</dd>
                    </div>
                    <div>
                      <dt>Semantic signatures</dt>
                      <dd>{pack.scenarios.length} computed</dd>
                    </div>
                    <div>
                      <dt>Independent review</dt>
                      <dd>Not established</dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
            <div className={styles.supportingLedger}>
              <section>
                <h4>Neutral substitute</h4>
                <dl>
                  <div>
                    <dt>Artifact reference</dt>
                    <dd>{artifacts.substitute.artifactRef}</dd>
                  </div>
                  <div>
                    <dt>Renderer</dt>
                    <dd>{artifacts.substitute.rendererId}</dd>
                  </div>
                  <div>
                    <dt>Supplied renderer binding digest</dt>
                    <dd><Digest value={artifacts.substitute.rendererBindingDigest} /></dd>
                  </div>
                  <div>
                    <dt>Expected renderer descriptor digest</dt>
                    <dd><Digest value={artifacts.substitute.expectedRendererBindingDigest} /></dd>
                  </div>
                  <div>
                    <dt>Template digest</dt>
                    <dd><Digest value={artifacts.substitute.templateDigest} /></dd>
                  </div>
                  <div>
                    <dt>Substitute manifest digest</dt>
                    <dd><Digest value={artifacts.substitute.artifactDigest} /></dd>
                  </div>
                  <div>
                    <dt>Declared delivery contract</dt>
                    <dd>Static local keyboard packet; not rendered</dd>
                  </div>
                  <div>
                    <dt>Neutrality authority</dt>
                    <dd>Mechanical constraints only</dd>
                  </div>
                  <div>
                    <dt>Rendered parity</dt>
                    <dd>Not rendered</dd>
                  </div>
                </dl>
              </section>
              <section>
                <h4>Independent review envelope</h4>
                <dl>
                  <div>
                    <dt>Review reference</dt>
                    <dd>{artifacts.independentReview.reviewRef}</dd>
                  </div>
                  <div>
                    <dt>Request state</dt>
                    <dd>Requested</dd>
                  </div>
                  <div>
                    <dt>Declared checklist digest</dt>
                    <dd><Digest value={artifacts.independentReview.checklistDigest} /></dd>
                  </div>
                  <div>
                    <dt>Expected review checklist digest</dt>
                    <dd><Digest value={artifacts.independentReview.expectedChecklistDigest} /></dd>
                  </div>
                  <div>
                    <dt>Review-envelope digest</dt>
                    <dd><Digest value={artifacts.independentReview.envelopeDigest} /></dd>
                  </div>
                  <div>
                    <dt>Reviewer identity</dt>
                    <dd>Not established</dd>
                  </div>
                  <div>
                    <dt>Approval</dt>
                    <dd>Not established</dd>
                  </div>
                  <div>
                    <dt>Moderator packet</dt>
                    <dd>{artifacts.moderatorPacket.artifactRef}</dd>
                  </div>
                  <div>
                    <dt>Moderator packet digest</dt>
                    <dd><Digest value={artifacts.moderatorPacket.digest} /></dd>
                  </div>
                </dl>
              </section>
            </div>
          </section>

          <section
            className={styles.checkLedger}
            aria-labelledby="check-ledger-title"
          >
            <header>
              <p>Deterministic comparison</p>
              <h3 id="check-ledger-title">What the machine checked</h3>
              <span>
                Matched means the bounded manifest rule matched. It does not
                mean equivalent.
              </span>
            </header>
            {issues.length > 0 ? (
              <ul className={styles.artifactIssues}>
                {issues.map((entry) => (
                  <li key={`${entry.code}:${entry.path}`}>
                    <code>{entry.code}</code>
                    <span>{entry.path || "request"}</span>
                    <p>{entry.message}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            <ol>
              {checks.map((check, index) => (
                <li key={check.label} data-tone={check.tone}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{check.label}</strong>
                  <em>{check.state}</em>
                </li>
              ))}
            </ol>
          </section>

          <section
            className={styles.scenarioLedger}
            aria-labelledby="scenario-ledger-title"
          >
            <header>
              <p>Seven locked states</p>
              <h3 id="scenario-ledger-title">Scenario identity ledger</h3>
            </header>
            <ol>
              {artifacts.packP.scenarios.map((scenario, index) => {
                const paired = artifacts.packQ.scenarios.find(
                  (entry) => entry.scenarioId === scenario.scenarioId,
                );
                const signaturesMatch = paired?.semanticSignatureDigest
                  === scenario.semanticSignatureDigest;
                return (
                  <li key={scenario.scenarioId}>
                    <div>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{scenario.scenarioId.replaceAll("-", " ")}</strong>
                      <code>{scenario.scenarioId}</code>
                    </div>
                    <dl>
                      <div>
                        <dt>Pack P scenario digest</dt>
                        <dd><Digest value={scenario.scenarioDigest} /></dd>
                      </div>
                      <div>
                        <dt>Pack Q scenario digest</dt>
                        <dd>
                          {paired
                            ? <Digest value={paired.scenarioDigest} />
                            : "Not exposed"}
                        </dd>
                      </div>
                      <div>
                        <dt>Semantic signature</dt>
                        <dd>
                          {signaturesMatch
                            ? "Matched mechanically"
                            : "Mismatch"}
                        </dd>
                      </div>
                      <div>
                        <dt>Shared signature digest</dt>
                        <dd>
                          {signaturesMatch
                            ? <Digest value={scenario.semanticSignatureDigest} />
                            : "Not shared"}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      ) : (
        <p className={styles.artifactUnavailable}>
          Artifact identities and deterministic checks were not evaluated.
        </p>
      )}
    </section>
  );
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
  const artifactProjection = selected.artifactProjection;
  const artifactState = artifactResult(artifactProjection);
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
        {state.label}. {state.title} {artifactState.title} Independent review
        remains required.
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

      <ArtifactEvidence projection={artifactProjection} />

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
            <strong>Readiness-plan and operator identity</strong>
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
