"use client";

import Link from "next/link";
import { useState } from "react";

import type { UniversityProtectedStudyFixtureScenario } from "@/app/internal/university-protected-study/protected-study-fixture.server";
import type { UniversityProtectedStudyProjectionV1 } from "@/src/forge/university-protected-study";

import styles from "./UniversityProtectedStudyWorkspace.module.css";

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function presentation(projection: UniversityProtectedStudyProjectionV1) {
  switch (projection.status) {
    case "ready":
      return {
        eyebrow: "Protected study contract ready",
        title: "Understand it. Then prove it without help.",
        body: projection.context?.objective
          ?? "The exact reviewed activity is ready for inspection.",
      };
    case "today_not_ready":
      return {
        eyebrow: "Today boundary stopped entry",
        title: "Resolve the course context before studying.",
        body: "A source conflict, capacity conflict, or non-ready path cannot be carried into a protected learning activity.",
      };
    case "world_mismatch":
      return {
        eyebrow: "Exact World binding refused",
        title: "The reviewed World changed.",
        body: "FORGE will not substitute a different version, route, protocol, or source set for the World accepted in the learning path.",
      };
    case "world_unavailable":
      return {
        eyebrow: "World entry unavailable",
        title: "This reviewed World is paused.",
        body: "The learning brief stays closed until the exact package is released, available, and bound to the shared runtime.",
      };
    default:
      return {
        eyebrow: "Protected study unavailable",
        title: "No learning contract can be shown.",
        body: "The fixture failed closed before exposing an activity or study claim.",
      };
  }
}

function sequenceLabel(stage: string): string {
  if (stage === "commit_model") return "Commit your first model";
  if (stage === "governed_support") return "Use only governed support";
  if (stage === "withdraw_instructional_ai") return "Withdraw instructional help";
  if (stage === "cold_transfer") return "Try an unfamiliar transfer";
  if (stage === "bounded_result") return "Receive a bounded result";
  return readable(stage);
}

export function UniversityProtectedStudyWorkspace({
  scenarios,
}: {
  scenarios: readonly UniversityProtectedStudyFixtureScenario[];
}) {
  const [selectedId, setSelectedId] = useState<
    UniversityProtectedStudyFixtureScenario["id"]
  >(scenarios[0]?.id ?? "ready");
  const selected =
    scenarios.find((scenario) => scenario.id === selectedId) ?? scenarios[0];
  if (!selected) return <UniversityProtectedStudyWorkspaceUnavailable />;

  const projection = selected.projection;
  const copy = presentation(projection);
  const contract = projection.learningContract;
  const sequence = contract?.semanticStages.filter((stage) => (
    [
      "commit_model",
      "governed_support",
      "withdraw_instructional_ai",
      "cold_transfer",
      "bounded_result",
    ] as const
  ).includes(stage as "commit_model")) ?? [];

  return (
    <article
      className={styles.surface}
      aria-labelledby="university-protected-study-title"
      data-status={projection.status}
    >
      <header className={styles.masthead}>
        <div>
          <p className={styles.kicker}>Internal university workflow research</p>
          <p className={styles.course}>
            {projection.context?.courseLabel ?? "Protected study entry"}
          </p>
        </div>
        <p className={styles.term}>
          {projection.context?.termLabel ?? "Synthetic adult fixture"}
        </p>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Synthetic adult fixture</strong>
        <span>No session start</span>
        <span>No assignment answer</span>
        <span>No save</span>
        <span>No evidence claim</span>
      </div>

      <fieldset className={styles.scenarioPicker}>
        <legend>Test an entry boundary</legend>
        <div>
          {scenarios.map((scenario) => (
            <label key={scenario.id}>
              <input
                type="radio"
                name="university-protected-study-scenario"
                value={scenario.id}
                checked={scenario.id === selected.id}
                onChange={() => setSelectedId(scenario.id)}
              />
              <span>{scenario.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className={styles.hero} aria-live="polite">
        <p className={styles.stateLabel}>{copy.eyebrow}</p>
        <h1 id="university-protected-study-title">{copy.title}</h1>
        <p className={styles.objective}>{copy.body}</p>
        {projection.status === "ready" && projection.world ? (
          <div className={styles.actionControl}>
            <Link href={projection.world.route}>Preview exact reviewed World</Link>
            <p>
              Preview only. This fixture does not create a learner-owned session,
              transfer course state, or record completion.
            </p>
          </div>
        ) : projection.status === "today_not_ready" ? (
          <div className={styles.actionControl}>
            <Link href="/internal/university-source-review">Review source copies</Link>
            <p>No protected activity is exposed while Today is not ready.</p>
          </div>
        ) : (
          <p className={styles.noAction}>
            No launch control is available. Review the exact World binding first.
          </p>
        )}
      </section>

      {contract && projection.world && projection.context ? (
        <>
          <section className={styles.sequence} aria-labelledby="study-sequence-title">
            <div className={styles.sectionHeading}>
              <p>What the runtime enforces</p>
              <h2 id="study-sequence-title">A learning arc, not an answer box.</h2>
            </div>
            <ol>
              {sequence.map((stage, index) => (
                <li key={stage}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{sequenceLabel(stage)}</strong>
                    <small>{readable(stage)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.contractGrid}>
            <section className={styles.contractCard}>
              <p className={styles.cardIndex}>01 / First move</p>
              <h2>You do the thinking first.</h2>
              <p>
                The runtime begins with learner work and a committed model before
                the protected transfer result.
              </p>
              <dl>
                <div>
                  <dt>Activity</dt>
                  <dd>{projection.context.title}</dd>
                </div>
                <div>
                  <dt>Declared fit</dt>
                  <dd>
                    {projection.context.effortMinutesLow} to{" "}
                    {projection.context.effortMinutesHigh} minutes inside{" "}
                    {projection.context.availableMinutes} available
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.contractCard}>
              <p className={styles.cardIndex}>02 / Support</p>
              <h2>Help has a boundary.</h2>
              <p>
                {contract.support.catalog.length > 0
                  ? `${contract.support.catalog.length} catalogued support action${contract.support.catalog.length === 1 ? "" : "s"} may be used only before proof.`
                  : "This World exposes no receipt-eligible cognitive-support action. Neutral authored task feedback is not relabelled as tutoring."}
              </p>
              <dl>
                <div>
                  <dt>During proof</dt>
                  <dd>Not allowed</dd>
                </div>
                <div>
                  <dt>Support policy</dt>
                  <dd>{contract.support.policyId}</dd>
                </div>
              </dl>
            </section>

            <section className={`${styles.contractCard} ${styles.proofCard}`}>
              <p className={styles.cardIndex}>03 / Independent proof</p>
              <h2>Instructional help turns off.</h2>
              <p>{contract.proof.statement}</p>
              <ul>
                {contract.proof.successCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
              <dl>
                <div>
                  <dt>AI in proof</dt>
                  <dd>Off</dd>
                </div>
                <div>
                  <dt>Correctness</dt>
                  <dd>Deterministic validator, not model judgment</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className={styles.receipt} aria-labelledby="receipt-title">
            <div>
              <p>After the attempt</p>
              <h2 id="receipt-title">A receipt with its limits attached.</h2>
            </div>
            <dl>
              <div>
                <dt>Proof authority</dt>
                <dd>{readable(contract.receipt.proofAuthority)}</dd>
              </div>
              <div>
                <dt>Persistence</dt>
                <dd>{readable(contract.receipt.persistence)}</dd>
              </div>
              <div>
                <dt>Source provenance</dt>
                <dd>{readable(projection.world.sourceProvenanceStatus)}</dd>
              </div>
              <div>
                <dt>Delayed return</dt>
                <dd>{contract.receipt.delayedReturnAvailable ? "Available" : "Not available"}</dd>
              </div>
            </dl>
            <p className={styles.limitation}>
              Local runtime receipts are honour-based, non-durable, and not
              independent evidence. Delayed retention and broader capability
              remain untested.
            </p>
          </section>
        </>
      ) : (
        <section className={styles.refusal} role="status">
          <p>Why entry stopped</p>
          <h2>{projection.issues[0]?.message ?? "No validated learning contract is available."}</h2>
          <dl>
            <div>
              <dt>Today state</dt>
              <dd>{projection.todayStatus ? readable(projection.todayStatus) : "unavailable"}</dd>
            </div>
            <div>
              <dt>Recovery</dt>
              <dd>{readable(projection.recovery)}</dd>
            </div>
          </dl>
        </section>
      )}

      <footer className={styles.authority}>
        <p>Authority ceiling</p>
        <dl>
          <div>
            <dt>World facts</dt>
            <dd>Validated supplied package snapshot</dd>
          </div>
          <div>
            <dt>Learner intent</dt>
            <dd>Not established</dd>
          </div>
          <div>
            <dt>Session start</dt>
            <dd>Not allowed</dd>
          </div>
          <div>
            <dt>Projection digest</dt>
            <dd>{projection.projectionDigest?.slice(0, 19) ?? "Unavailable"}…</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

export function UniversityProtectedStudyWorkspaceUnavailable() {
  return (
    <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
      <p className={styles.kicker}>Fixture unavailable</p>
      <h1>No protected-study research state is available.</h1>
      <p>No World was exposed, session was started, or evidence was claimed.</p>
    </section>
  );
}
