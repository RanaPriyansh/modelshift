"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  reconcileCourseSources,
  type CourseSourceCandidateProjection,
  type CourseSourceDecisionV1,
  type CourseSourceFactV1,
  type CourseSourceReconciliationRequestV1,
  type CourseSourceReconciliationResult,
} from "@/src/forge/course-sources";

import styles from "./UniversitySourceReview.module.css";

type ReviewPhase = "loading" | "ready" | "error";

type ScrollPosition = {
  readonly left: number;
  readonly top: number;
};

function readableDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function readableState(value: string): string {
  return value.replaceAll("_", " ");
}

function decisionId(candidateId: string, kind: CourseSourceDecisionV1["kind"]): string {
  return `course-source-decision.local-${candidateId.replace("course-source-candidate.", "")}-${kind}`;
}

function factSummary(fact: CourseSourceFactV1): string {
  if (fact.kind === "deadline") return `${fact.title}, due ${readableDate(fact.dueAt, fact.timeZone)}`;
  if (fact.kind === "course_commitment") {
    return `${fact.title}, ${readableDate(fact.startsAt, fact.timeZone)} to ${readableDate(fact.endsAt, fact.timeZone)}`;
  }
  return fact.statementSummary;
}

function factActionContext(fact: CourseSourceFactV1): string {
  switch (fact.kind) {
    case "deadline":
      return `${fact.title} deadline`;
    case "course_commitment":
      return `${fact.title} commitment`;
    case "assessment_assistance_policy":
      return "assessment assistance policy";
  }
}

function sourceFor(
  candidate: CourseSourceCandidateProjection,
  result: CourseSourceReconciliationResult,
) {
  return result.sources.find((source) => source.revisionId === candidate.sourceRevisionId);
}

function buildHumanQuestion(
  result: CourseSourceReconciliationResult,
): string | null {
  const conflict = result.conflicts[0];
  if (!conflict) return null;
  const facts = conflict.candidateIds
    .map((candidateId) => result.candidates.find((candidate) => candidate.candidateId === candidateId))
    .filter((candidate): candidate is CourseSourceCandidateProjection => candidate !== undefined)
    .map((candidate) => {
      const source = sourceFor(candidate, result);
      return `${source?.sourceLabel ?? "A connected source"} says ${candidate.effectiveFact ? factSummary(candidate.effectiveFact) : "the item should be omitted"}`;
    });
  return `Which version currently applies to Assignment one? ${facts.join("; ")}. Please confirm against the current course source or with an authorized course contact.`;
}

function candidateDecision(
  candidateId: string,
  decisions: readonly CourseSourceDecisionV1[],
): CourseSourceDecisionV1 | undefined {
  return decisions.find((decision) => decision.candidateId === candidateId);
}

export function UniversitySourceReview({
  initialRequest,
}: {
  initialRequest: Readonly<CourseSourceReconciliationRequestV1>;
}) {
  const [decisions, setDecisions] = useState<readonly CourseSourceDecisionV1[]>(initialRequest.decisions);
  const [result, setResult] = useState<Readonly<CourseSourceReconciliationResult> | null>(null);
  const [phase, setPhase] = useState<ReviewPhase>("loading");
  const [announcement, setAnnouncement] = useState(
    "Comparing the copied facts and their declared source boundaries.",
  );
  const [correctingCandidateId, setCorrectingCandidateId] = useState<string | null>(null);
  const [correctedDueAt, setCorrectedDueAt] = useState("");
  const correctionInputRef = useRef<HTMLInputElement>(null);
  const correctionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const initialLoadRef = useRef(true);
  const pendingScrollPositionRef = useRef<ScrollPosition | null>(null);
  const scrollRestoreFrameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (correctingCandidateId !== null || phase !== "ready") return;
    const pending = pendingScrollPositionRef.current;
    if (!pending) return;
    window.scrollTo({
      behavior: "auto",
      left: pending.left,
      top: pending.top,
    });
    const frame = window.requestAnimationFrame(() => {
      if (scrollRestoreFrameRef.current !== frame) return;
      window.scrollTo({
        behavior: "auto",
        left: pending.left,
        top: pending.top,
      });
      pendingScrollPositionRef.current = null;
      scrollRestoreFrameRef.current = null;
    });
    scrollRestoreFrameRef.current = frame;
    return () => {
      if (scrollRestoreFrameRef.current !== frame) return;
      window.cancelAnimationFrame(frame);
      scrollRestoreFrameRef.current = null;
    };
  }, [correctingCandidateId, phase]);

  useEffect(() => {
    let active = true;
    void reconcileCourseSources({ ...initialRequest, decisions })
      .then((projection) => {
        if (!active) return;
        setResult(projection);
        setPhase("ready");
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          const completed = projection.candidates.filter(
            (candidate) => candidate.extractionState !== "candidate",
          ).length;
          setAnnouncement(
            `Course source review ready. ${completed} of ${projection.candidates.length} copied facts reviewed.`,
          );
        }
      })
      .catch(() => {
        if (!active) return;
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [decisions, initialRequest]);

  useEffect(() => {
    if (correctingCandidateId !== null) correctionInputRef.current?.focus();
  }, [correctingCandidateId]);

  const conflictCandidateIds = useMemo(
    () => new Set(result?.conflicts.flatMap((conflict) => conflict.candidateIds) ?? []),
    [result],
  );
  const conflictCandidates = result?.candidates.filter((candidate) => conflictCandidateIds.has(candidate.candidateId)) ?? [];
  const otherCandidates = result?.candidates.filter((candidate) => !conflictCandidateIds.has(candidate.candidateId)) ?? [];
  const reviewedCount = result?.candidates.filter((candidate) => candidate.extractionState !== "candidate").length ?? 0;
  const humanQuestion = result ? buildHumanQuestion(result) : null;

  function replaceDecision(decision: CourseSourceDecisionV1, nextAnnouncement: string) {
    setPhase("loading");
    setAnnouncement(nextAnnouncement);
    setDecisions((current) => [
      ...current.filter((entry) => entry.candidateId !== decision.candidateId),
      decision,
    ]);
    setCorrectingCandidateId(null);
    setCorrectedDueAt("");
  }

  function accept(candidate: CourseSourceCandidateProjection) {
    correctionTriggerRef.current = null;
    clearCorrectionScrollRestore();
    replaceDecision({
      schemaVersion: "course-source-decision.v1",
      decisionId: decisionId(candidate.candidateId, "accept"),
      candidateId: candidate.candidateId,
      scope: initialRequest.scope,
      actor: "learner",
      kind: "accept",
      extractionMatch: "learner_confirmed",
      decidedAt: initialRequest.asOf,
    }, "Marked as matching this copy.");
  }

  function reject(candidate: CourseSourceCandidateProjection) {
    correctionTriggerRef.current = null;
    clearCorrectionScrollRestore();
    replaceDecision({
      schemaVersion: "course-source-decision.v1",
      decisionId: decisionId(candidate.candidateId, "reject"),
      candidateId: candidate.candidateId,
      scope: initialRequest.scope,
      actor: "learner",
      kind: "reject",
      extractionMatch: "learner_rejected",
      rejectionReasonCode: "source_extraction_mismatch",
      decidedAt: initialRequest.asOf,
    }, "Extraction rejected.");
  }

  function beginCorrection(
    candidate: CourseSourceCandidateProjection,
    trigger: HTMLButtonElement,
  ) {
    if (candidate.originalFact.kind !== "deadline") return;
    correctionTriggerRef.current = trigger;
    const localDate = new Date(candidate.originalFact.dueAt);
    const localValue = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setCorrectedDueAt(localValue);
    setCorrectingCandidateId(candidate.candidateId);
  }

  function commitCorrection(candidate: CourseSourceCandidateProjection) {
    if (candidate.originalFact.kind !== "deadline" || correctedDueAt.length === 0) return;
    const correctedDate = new Date(correctedDueAt);
    if (Number.isNaN(correctedDate.getTime())) return;
    scheduleCorrectionScrollRestore();
    replaceDecision({
      schemaVersion: "course-source-decision.v1",
      decisionId: decisionId(candidate.candidateId, "correct"),
      candidateId: candidate.candidateId,
      scope: initialRequest.scope,
      actor: "learner",
      kind: "correct",
      extractionMatch: "learner_corrected",
      correctedFact: {
        ...candidate.originalFact,
        dueAt: correctedDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      correctionReasonCode: "source_transcription_error",
      decidedAt: initialRequest.asOf,
    }, "Student correction applied.");
    restoreCorrectionTrigger();
  }

  function cancelCorrection() {
    scheduleCorrectionScrollRestore();
    setCorrectingCandidateId(null);
    restoreCorrectionTrigger();
  }

  function scheduleCorrectionScrollRestore() {
    clearCorrectionScrollRestore();
    pendingScrollPositionRef.current = {
      left: window.scrollX,
      top: window.scrollY,
    };
  }

  function clearCorrectionScrollRestore() {
    const frame = scrollRestoreFrameRef.current;
    if (frame !== null) window.cancelAnimationFrame(frame);
    scrollRestoreFrameRef.current = null;
    pendingScrollPositionRef.current = null;
  }

  function restoreCorrectionTrigger() {
    const trigger = correctionTriggerRef.current;
    correctionTriggerRef.current = null;
    trigger?.focus({ preventScroll: true });
  }

  function resetReview() {
    correctionTriggerRef.current = null;
    clearCorrectionScrollRestore();
    setPhase("loading");
    setAnnouncement("Review reset.");
    setDecisions(initialRequest.decisions);
    setCorrectingCandidateId(null);
    setCorrectedDueAt("");
  }

  if (phase === "error") {
    return (
      <section className={`${styles.surface} ${styles.unavailable}`} role="alert">
        <p className={styles.kicker}>Projection unavailable</p>
        <h1>We could not review these sample copies.</h1>
        <p>No facts were saved, emitted, recommended, or sent. Refresh this local fixture to try again.</p>
      </section>
    );
  }

  return (
    <article className={styles.surface} aria-labelledby="source-review-title">
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Sample course source review</p>
          <h1 id="source-review-title">Review what your course sources say.</h1>
          <p className={styles.intro}>
            Connected copies remain outside planning until you inspect the extraction.
            A match confirms transcription only, never whether a source is official or complete.
          </p>
        </div>
        <div className={styles.progress} aria-label={`${reviewedCount} of ${result?.candidates.length ?? 3} copied facts reviewed`}>
          <strong>{reviewedCount}</strong>
          <span>of {result?.candidates.length ?? 3} reviewed</span>
        </div>
      </header>

      <div className={styles.boundary} role="note">
        <strong>Local reviewed sample</strong>
        <span>No durable save</span>
        <span>No automatic network request</span>
        <span>No recommendation</span>
      </div>

      <p
        className="forge-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>

      {result === null ? (
        <section className={styles.loading}>
          <span aria-hidden="true" />
          <p>Comparing the copied facts and their declared source boundaries.</p>
        </section>
      ) : (
        <div className={styles.workspace}>
          <div className={styles.ledger}>
            <section className={styles.conflictSection} aria-labelledby="source-conflict-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionIndex}>01 / Source disagreement</p>
                  <h2 id="source-conflict-title">Two copies give different deadlines.</h2>
                </div>
                <span className={styles.state} data-tone={result.conflicts.length > 0 ? "warning" : "quiet"}>
                  <span aria-hidden="true" />
                  {result.conflicts.length > 0 ? "Needs a human answer" : "No active disagreement"}
                </span>
              </div>
              <p className={styles.sectionBody}>
                Review whether each extraction matches the copy you provided. If both match,
                FORGE keeps both blocked instead of guessing which deadline is current.
              </p>
              <ol className={styles.candidateList}>
                {conflictCandidates.map((candidate) => (
                  <SourceCandidate
                    key={candidate.candidateId}
                    candidate={candidate}
                    sourceLabel={sourceFor(candidate, result)?.sourceLabel ?? "Connected source"}
                    sourceState={result.freshness.find((entry) => entry.sourceRevisionId === candidate.sourceRevisionId)?.state ?? "unknown"}
                    selectedDecision={candidateDecision(candidate.candidateId, decisions)}
                    isCorrecting={correctingCandidateId === candidate.candidateId}
                    correctedDueAt={correctedDueAt}
                    correctionInputRef={correctionInputRef}
                    onAccept={() => accept(candidate)}
                    onCorrect={(trigger) => beginCorrection(candidate, trigger)}
                    onReject={() => reject(candidate)}
                    onCorrectionChange={setCorrectedDueAt}
                    onCorrectionSave={() => commitCorrection(candidate)}
                    onCorrectionCancel={cancelCorrection}
                  />
                ))}
              </ol>
              {humanQuestion ? (
                <div className={styles.humanQuestion}>
                  <p>Question to take to a human</p>
                  <blockquote>{humanQuestion}</blockquote>
                  <small>FORGE has not sent this question.</small>
                </div>
              ) : null}
            </section>

            <section className={styles.policySection} aria-labelledby="source-policy-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.sectionIndex}>02 / Assessment boundary</p>
                  <h2 id="source-policy-title">A copied permission is not authorization.</h2>
                </div>
              </div>
              <p className={styles.sectionBody}>
                Confirm only whether the wording matches your copy. Assessment mode stays
                restricted until an authorized policy source is established separately.
              </p>
              <ol className={styles.candidateList}>
                {otherCandidates.map((candidate) => (
                  <SourceCandidate
                    key={candidate.candidateId}
                    candidate={candidate}
                    sourceLabel={sourceFor(candidate, result)?.sourceLabel ?? "Connected source"}
                    sourceState={result.freshness.find((entry) => entry.sourceRevisionId === candidate.sourceRevisionId)?.state ?? "unknown"}
                    selectedDecision={candidateDecision(candidate.candidateId, decisions)}
                    onAccept={() => accept(candidate)}
                    onReject={() => reject(candidate)}
                  />
                ))}
              </ol>
            </section>

            <footer className={styles.ledgerFooter}>
              <p>
                {phase === "loading"
                  ? "Updating the local projection."
                  : `${reviewedCount} of ${result.candidates.length} copied facts reviewed. Nothing has been saved.`}
              </p>
              <button className={styles.resetButton} type="button" onClick={resetReview} disabled={decisions.length === 0}>
                Reset this sample
              </button>
            </footer>
          </div>

          <aside className={styles.context} aria-labelledby="source-context-title">
            <p className={styles.sectionIndex}>Source boundary</p>
            <h2 id="source-context-title">What FORGE knows here</h2>
            <dl>
              <div>
                <dt>Coverage</dt>
                <dd>{readableState(result.coverage.state)}</dd>
              </div>
              <div>
                <dt>Authenticity</dt>
                <dd>Not established</dd>
              </div>
              <div>
                <dt>Institutional completeness</dt>
                <dd>Not established</dd>
              </div>
              <div>
                <dt>Planning use</dt>
                <dd>{result.contextCandidateIds.length} unconflicted reviewed fact{result.contextCandidateIds.length === 1 ? "" : "s"} eligible as candidate context</dd>
              </div>
            </dl>
            <div className={styles.sourceRegister}>
              <h3>Connected copies</h3>
              <ul>
                {result.sources.map((source) => {
                  const freshness = result.freshness.find((entry) => entry.sourceRevisionId === source.revisionId);
                  return (
                    <li key={source.revisionId}>
                      <strong>{source.sourceLabel}</strong>
                      <span>{freshness ? readableState(freshness.state) : "unknown freshness"}</span>
                      <small>{readableState(source.coverage.status)} coverage</small>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className={styles.privacyNote}>
              The sample declares private owner visibility, derived fields only, no retained
              original bytes, and no redistribution. This fixture does not prove live enforcement.
            </p>
          </aside>
        </div>
      )}
    </article>
  );
}

function SourceCandidate({
  candidate,
  sourceLabel,
  sourceState,
  selectedDecision,
  isCorrecting = false,
  correctedDueAt = "",
  correctionInputRef,
  onAccept,
  onCorrect,
  onReject,
  onCorrectionChange,
  onCorrectionSave,
  onCorrectionCancel,
}: {
  candidate: CourseSourceCandidateProjection;
  sourceLabel: string;
  sourceState: string;
  selectedDecision?: CourseSourceDecisionV1;
  isCorrecting?: boolean;
  correctedDueAt?: string;
  correctionInputRef?: React.RefObject<HTMLInputElement | null>;
  onAccept: () => void;
  onCorrect?: (trigger: HTMLButtonElement) => void;
  onReject: () => void;
  onCorrectionChange?: (value: string) => void;
  onCorrectionSave?: () => void;
  onCorrectionCancel?: () => void;
}) {
  const decisionLabel = selectedDecision?.kind === "accept"
    ? "Marked as matching this copy"
    : selectedDecision?.kind === "correct"
      ? "Student correction applied"
      : selectedDecision?.kind === "reject"
        ? "Extraction rejected"
        : "Not reviewed";
  const correctionFormId = `correction-form-${candidate.candidateId}`;
  const correctionDescriptionId =
    `correction-description-${candidate.candidateId}`;

  return (
    <li className={styles.candidate} data-decision={selectedDecision?.kind ?? "candidate"}>
      <div className={styles.candidateMeta}>
        <span>{sourceLabel}</span>
        <span>{readableState(sourceState)}</span>
      </div>
      <p className={styles.fact}>{factSummary(candidate.originalFact)}</p>
      {selectedDecision?.kind === "correct" && candidate.effectiveFact ? (
        <p className={styles.correctionSummary}>
          Your correction: {factSummary(candidate.effectiveFact)}
        </p>
      ) : null}
      {candidate.effectiveAssessmentMode === "restricted_assessment" ? (
        <p className={styles.policyBoundary}>
          Restricted assessment mode remains active. Policy authorization is not established.
        </p>
      ) : null}
      <p className={styles.decisionState}>{decisionLabel}</p>
      <div className={styles.candidateActions}>
        <button
          type="button"
          aria-label={`Matches this copy: ${sourceLabel}, ${factActionContext(candidate.originalFact)}`}
          aria-pressed={selectedDecision?.kind === "accept"}
          onClick={onAccept}
        >
          Matches this copy
        </button>
        {onCorrect ? (
          <button
            type="button"
            aria-label={`Correct transcription: ${sourceLabel}, ${factActionContext(candidate.originalFact)}`}
            aria-expanded={isCorrecting}
            aria-controls={isCorrecting ? correctionFormId : undefined}
            onClick={(event) => onCorrect(event.currentTarget)}
          >
            Correct transcription
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Reject extraction: ${sourceLabel}, ${factActionContext(candidate.originalFact)}`}
          aria-pressed={selectedDecision?.kind === "reject"}
          onClick={onReject}
        >
          Reject extraction
        </button>
      </div>
      {isCorrecting ? (
        <div className={styles.correctionForm} id={correctionFormId}>
          <label htmlFor={`correction-${candidate.candidateId}`}>
            Correct due date and time
          </label>
          <input
            ref={correctionInputRef}
            id={`correction-${candidate.candidateId}`}
            type="datetime-local"
            value={correctedDueAt}
            aria-describedby={correctionDescriptionId}
            onChange={(event) => onCorrectionChange?.(event.target.value)}
          />
          <p id={correctionDescriptionId}>
            The correction uses this browser&apos;s local time zone. The copied value remains visible above.
          </p>
          <div>
            <button type="button" onClick={onCorrectionSave} disabled={correctedDueAt.length === 0}>
              Use my correction
            </button>
            <button type="button" onClick={onCorrectionCancel}>Cancel</button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
