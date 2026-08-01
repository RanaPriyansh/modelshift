"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import styles from "./EvidenceAtelierShowcase.module.css";

export type EvidenceAtelierStage =
  | "today"
  | "recall"
  | "attempt"
  | "repair"
  | "proof"
  | "return";

export type EvidenceAtelierTheme = "light" | "dark";

type Props = {
  readonly initialStage?: EvidenceAtelierStage;
  readonly initialTheme?: EvidenceAtelierTheme;
};

type ProofMode = "boundary" | "task";
type ReturnMode = "boundary" | "task" | "complete";
type ReceiptKind = "proof" | "return";

type AuditFixtureReceipt = Readonly<{
  kind: ReceiptKind;
  receiptId: string;
  label: string;
  claim: string;
  conditions: string;
  assistance: string;
  notYetTested: string;
  createdAt: string;
}>;

type AuditFixture = Readonly<{
  fixtureId: string;
  schemaVersion: 1;
  recallDraft: string;
  recallCompletedAt: string | null;
  attemptDraft: string;
  attemptCommittedAt: string | null;
  revisionDraft: string;
  revisionSavedAt: string | null;
  proofReceipt: AuditFixtureReceipt | null;
  returnReceipt: AuditFixtureReceipt | null;
}>;

const AUDIT_FIXTURE_ID = "forge-evidence-atelier-audit";
const AUDIT_FIXTURE_LABEL = "Internal audit fixture · test data only";
const AUDIT_FIXTURE_STORAGE_KEY =
  "forge.internal.design-lab.evidence-atelier.fixture.v1";

const EMPTY_AUDIT_FIXTURE: AuditFixture = {
  fixtureId: AUDIT_FIXTURE_ID,
  schemaVersion: 1,
  recallDraft: "",
  recallCompletedAt: null,
  attemptDraft: "The number of people doubles, so I think each ingredient must...",
  attemptCommittedAt: null,
  revisionDraft: "",
  revisionSavedAt: null,
  proofReceipt: null,
  returnReceipt: null,
};

const STAGES: ReadonlyArray<{
  id: EvidenceAtelierStage;
  label: string;
  shortLabel: string;
}> = [
  { id: "today", label: "Today", shortLabel: "Today" },
  { id: "recall", label: "Recall", shortLabel: "Recall" },
  { id: "attempt", label: "Attempt", shortLabel: "Work" },
  { id: "repair", label: "Repair", shortLabel: "Repair" },
  { id: "proof", label: "Protected proof", shortLabel: "Proof" },
  { id: "return", label: "Delayed return", shortLabel: "Return" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isReceipt(value: unknown): value is AuditFixtureReceipt {
  if (!isRecord(value)) return false;
  return (
    (value.kind === "proof" || value.kind === "return")
    && typeof value.receiptId === "string"
    && typeof value.label === "string"
    && typeof value.claim === "string"
    && typeof value.conditions === "string"
    && typeof value.assistance === "string"
    && typeof value.notYetTested === "string"
    && typeof value.createdAt === "string"
  );
}

function readAuditFixture(): AuditFixture {
  if (typeof window === "undefined") return EMPTY_AUDIT_FIXTURE;

  try {
    const raw = window.localStorage.getItem(AUDIT_FIXTURE_STORAGE_KEY);
    if (!raw) return EMPTY_AUDIT_FIXTURE;

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed)
      || parsed.fixtureId !== AUDIT_FIXTURE_ID
      || parsed.schemaVersion !== 1
    ) {
      return EMPTY_AUDIT_FIXTURE;
    }

    return {
      ...EMPTY_AUDIT_FIXTURE,
      recallDraft: stringValue(parsed.recallDraft),
      recallCompletedAt: stringValue(parsed.recallCompletedAt) || null,
      attemptDraft: stringValue(parsed.attemptDraft, EMPTY_AUDIT_FIXTURE.attemptDraft),
      attemptCommittedAt: stringValue(parsed.attemptCommittedAt) || null,
      revisionDraft: stringValue(parsed.revisionDraft),
      revisionSavedAt: stringValue(parsed.revisionSavedAt) || null,
      proofReceipt: isReceipt(parsed.proofReceipt) ? parsed.proofReceipt : null,
      returnReceipt: isReceipt(parsed.returnReceipt) ? parsed.returnReceipt : null,
    };
  } catch {
    return EMPTY_AUDIT_FIXTURE;
  }
}

function writeAuditFixture(fixture: AuditFixture) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      AUDIT_FIXTURE_STORAGE_KEY,
      JSON.stringify(fixture),
    );
  } catch {
    // The preview remains usable when browser storage is unavailable.
  }
}

type AuditFixtureListener = () => void;

let auditFixtureRaw: string | null | undefined;
let auditFixtureSnapshot: AuditFixture = EMPTY_AUDIT_FIXTURE;
const auditFixtureListeners = new Set<AuditFixtureListener>();

function getAuditFixtureSnapshot() {
  if (typeof window === "undefined") return EMPTY_AUDIT_FIXTURE;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(AUDIT_FIXTURE_STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw !== auditFixtureRaw) {
    auditFixtureRaw = raw;
    auditFixtureSnapshot = readAuditFixture();
  }

  return auditFixtureSnapshot;
}

function getServerAuditFixtureSnapshot() {
  return EMPTY_AUDIT_FIXTURE;
}

function subscribeAuditFixture(listener: AuditFixtureListener) {
  auditFixtureListeners.add(listener);
  return () => auditFixtureListeners.delete(listener);
}

function updateAuditFixture(
  nextFixture: AuditFixture | ((current: AuditFixture) => AuditFixture),
) {
  const current = getAuditFixtureSnapshot();
  const next = typeof nextFixture === "function"
    ? nextFixture(current)
    : nextFixture;
  auditFixtureSnapshot = next;
  auditFixtureRaw = JSON.stringify(next);
  writeAuditFixture(next);
  auditFixtureListeners.forEach((listener) => listener());
}

function createFixtureReceipt(kind: ReceiptKind): AuditFixtureReceipt {
  const createdAt = new Date().toISOString();
  const receiptId = `fixture.${kind}.${Date.now().toString(36)}`;

  return {
    kind,
    receiptId,
    label: AUDIT_FIXTURE_LABEL,
    claim: kind === "proof"
      ? "One unfamiliar ratio response was submitted in the protected fixture task."
      : "One graph-transfer response was submitted in the delayed-return fixture task.",
    conditions: kind === "proof"
      ? "One task version. Cognitive help was closed. Accessibility support remained available."
      : "Simulated delayed return. Prior answers and cognitive help stayed unavailable.",
    assistance: "This is local test data. It does not create production evidence or a learner record.",
    notYetTested: "Learning, mastery, durable retention, and broader transfer remain untested.",
    createdAt,
  };
}

function canEnterStage(stage: EvidenceAtelierStage, fixture: AuditFixture) {
  switch (stage) {
    case "today":
    case "recall":
      return true;
    case "attempt":
      return fixture.recallCompletedAt !== null;
    case "repair":
      return fixture.attemptCommittedAt !== null;
    case "proof":
      return fixture.revisionSavedAt !== null;
    case "return":
      return fixture.proofReceipt !== null;
  }
}

function lockReason(stage: EvidenceAtelierStage) {
  switch (stage) {
    case "attempt":
      return "recall is saved";
    case "repair":
      return "the attempt is committed";
    case "proof":
      return "the revision is saved";
    case "return":
      return "the proof receipt exists";
    default:
      return "the prior step is complete";
  }
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path d="M3.75 9h10.5M10.25 5l4 4-4 4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <rect height="10.5" rx="2" width="14" x="5" y="10" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v3" />
    </svg>
  );
}

function PrimaryAction({
  children,
  onClick,
}: {
  readonly children: string;
  readonly onClick: () => void;
}) {
  return (
    <button className={styles.primaryAction} onClick={onClick} type="button">
      <span>{children}</span>
      <span className={styles.actionIcon}><ArrowIcon /></span>
    </button>
  );
}

function QuietAction({
  children,
  onClick,
}: {
  readonly children: string;
  readonly onClick: () => void;
}) {
  return (
    <button className={styles.quietAction} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function FixtureReceiptCard({
  receipt,
  title,
}: {
  readonly receipt: AuditFixtureReceipt;
  readonly title: string;
}) {
  const titleId = `${receipt.kind}-fixture-receipt-title`;

  return (
    <article className={styles.fixtureReceipt} aria-labelledby={titleId}>
      <p className={styles.stateLabel}>{receipt.label}</p>
      <h3 id={titleId}>{title}</h3>
      <dl>
        <div><dt>Receipt</dt><dd><code>{receipt.receiptId}</code></dd></div>
        <div><dt>Bounded claim</dt><dd>{receipt.claim}</dd></div>
        <div><dt>Conditions</dt><dd>{receipt.conditions}</dd></div>
        <div><dt>Assistance</dt><dd>{receipt.assistance}</dd></div>
        <div><dt>Not yet tested</dt><dd>{receipt.notYetTested}</dd></div>
      </dl>
    </article>
  );
}

function TodayScreen({
  fixture,
  onContinue,
  onInspectReceipts,
}: {
  readonly fixture: AuditFixture;
  readonly onContinue: () => void;
  readonly onInspectReceipts: () => void;
}) {
  const hasReceipts = fixture.proofReceipt !== null || fixture.returnReceipt !== null;
  const receiptCount = Number(fixture.proofReceipt !== null) + Number(fixture.returnReceipt !== null);

  return (
    <section className={styles.todayScreen} aria-labelledby="atelier-today-title">
      <div className={styles.thresholdField}>
        <Image
          alt=""
          className={styles.thresholdImage}
          fill
          priority
          sizes="(max-width: 700px) 100vw, 1180px"
          src="/forge/concepts/evidence-atelier-instrument-landscape.png"
        />
        <div className={styles.thresholdCopy}>
          <p className={styles.stateLabel}>
            {hasReceipts ? "Today · Fixture receipt ready" : "Today · One next action"}
          </p>
          <h2 id="atelier-today-title">Recall your ratio model before a new case.</h2>
          <p>
            Start with your own explanation. Hints stay closed until your
            attempt is committed.
          </p>
          <PrimaryAction onClick={onContinue}>Begin recall</PrimaryAction>
        </div>
      </div>

      <dl className={styles.todayDetails}>
        <div><dt>Expected time</dt><dd>About 12 minutes</dd></div>
        <div><dt>Assistance</dt><dd>Hints after commitment</dd></div>
        <div><dt>Source state</dt><dd>Reviewed World v1.3</dd></div>
        <div><dt>Stopping point</dt><dd>After one fresh case</dd></div>
      </dl>

      {hasReceipts ? (
        <section className={styles.fixtureSummary} aria-labelledby="fixture-summary-title">
          <p className={styles.stateLabel}>Local fixture receipts</p>
          <h3 id="fixture-summary-title">{receiptCount} bounded test receipt{receiptCount === 1 ? "" : "s"} remain on this device.</h3>
          <p>No production learner record was created. The fixture survives reload for review.</p>
          <QuietAction onClick={onInspectReceipts}>Inspect fixture receipts</QuietAction>
        </section>
      ) : null}
    </section>
  );
}

function RecallScreen({
  response,
  error,
  onChange,
  onContinue,
  onStop,
}: {
  readonly response: string;
  readonly error: string;
  readonly onChange: (value: string) => void;
  readonly onContinue: () => void;
  readonly onStop: () => void;
}) {
  const responseId = useId();
  const promptId = `${responseId}-prompt`;
  const errorId = `${responseId}-error`;

  return (
    <section className={styles.workScreen} aria-labelledby="atelier-recall-title">
      <aside className={styles.contextRail} aria-label="Recall conditions">
        <h3>Before support</h3>
        <dl>
          <div><dt>Current operation</dt><dd>Retrieve the relationship from memory</dd></div>
          <div><dt>Support</dt><dd>No hints or examples yet</dd></div>
          <div><dt>Evidence</dt><dd>No evidence from this response</dd></div>
        </dl>
        <p>Accessibility support stays available. Cognitive help remains closed until the attempt.</p>
      </aside>

      <div className={styles.workPlateOuter}>
        <article className={styles.workPlate}>
          <header className={styles.workHeader}>
            <p className={styles.stateLabel}>Recall · Before support</p>
            <span className={styles.localSeal}>Internal fixture · test data only</span>
          </header>
          <h2 id="atelier-recall-title">What must stay true when the recipe changes?</h2>
          <p className={styles.prompt} id={promptId}>
            Write one first thought. It can be incomplete.
          </p>
          <label className={styles.answerLabel} htmlFor={responseId}>
            Your first thought
          </label>
          <textarea
            aria-describedby={error ? `${promptId} ${errorId}` : promptId}
            aria-invalid={error ? "true" : "false"}
            id={responseId}
            onChange={(event) => onChange(event.target.value)}
            rows={6}
            value={response}
          />
          {error ? <p className={styles.taskError} id={errorId} role="alert">{error}</p> : null}
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onContinue}>Save recall</PrimaryAction>
            <QuietAction onClick={onStop}>Save and stop</QuietAction>
          </div>
        </article>
      </div>
    </section>
  );
}

function AttemptScreen({
  draft,
  error,
  onChange,
  onCommit,
  onStop,
}: {
  readonly draft: string;
  readonly error: string;
  readonly onChange: (value: string) => void;
  readonly onCommit: () => void;
  readonly onStop: () => void;
}) {
  const answerId = useId();
  const promptId = `${answerId}-prompt`;
  const errorId = `${answerId}-error`;

  return (
    <section className={styles.workScreen} aria-labelledby="atelier-attempt-title">
      <aside className={styles.contextRail} aria-label="Attempt conditions">
        <h3>Conditions</h3>
        <dl>
          <div><dt>Current operation</dt><dd>Name the invariant relationship</dd></div>
          <div><dt>Support</dt><dd>Available after commitment</dd></div>
          <div><dt>Source</dt><dd>Reviewed ratio model</dd></div>
          <div><dt>Evidence</dt><dd>No evidence from this draft</dd></div>
        </dl>
        <p>
          Accessibility support stays available. Cognitive help changes what
          this attempt can show.
        </p>
      </aside>

      <div className={styles.workPlateOuter}>
        <article className={styles.workPlate}>
          <header className={styles.workHeader}>
            <p className={styles.stateLabel}>Attempt · Hints after commitment</p>
            <span className={styles.localSeal}>Internal fixture draft · not evidence</span>
          </header>
          <h2 id="atelier-attempt-title">How must the recipe change for eight people?</h2>
          <p className={styles.prompt} id={promptId}>
            Explain the relationship before you calculate.
          </p>
          <label className={styles.answerLabel} htmlFor={answerId}>
            Your explanation
          </label>
          <textarea
            aria-describedby={error ? `${promptId} ${errorId}` : promptId}
            aria-invalid={error ? "true" : "false"}
            id={answerId}
            onChange={(event) => onChange(event.target.value)}
            rows={7}
            value={draft}
          />
          {error ? <p className={styles.taskError} id={errorId} role="alert">{error}</p> : null}
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onCommit}>Commit my attempt</PrimaryAction>
            <QuietAction onClick={onStop}>Save and stop</QuietAction>
          </div>
        </article>
      </div>
    </section>
  );
}

function RepairScreen({
  response,
  error,
  onChange,
  onSave,
  onStop,
}: {
  readonly response: string;
  readonly error: string;
  readonly onChange: (value: string) => void;
  readonly onSave: () => void;
  readonly onStop: () => void;
}) {
  const responseId = useId();
  const promptId = `${responseId}-prompt`;
  const errorId = `${responseId}-error`;

  return (
    <section className={styles.feedbackScreen} aria-labelledby="atelier-repair-title">
      <header className={styles.screenHeading}>
        <p className={styles.stateLabel}>Repair note</p>
        <h2 id="atelier-repair-title">One relationship needs repair.</h2>
        <p>The note names the useful part. You then write one exact change.</p>
      </header>

      <div className={styles.calibrationSheet}>
        <section>
          <span aria-hidden="true">01</span>
          <div><h3>What held</h3><p>You kept the number of people and the amount linked.</p></div>
        </section>
        <section>
          <span aria-hidden="true">02</span>
          <div><h3>What changed</h3><p>You added four portions only once.</p></div>
        </section>
        <section>
          <span aria-hidden="true">03</span>
          <div><h3>What to test next</h3><p>Scale each ingredient by the same factor.</p></div>
        </section>
      </div>

      <div className={styles.repairEditor}>
        <p className={styles.stateLabel}>Learner revision</p>
        <h3>Write the rule you will test next.</h3>
        <p id={promptId}>This revision unlocks the protected proof boundary.</p>
        <label className={styles.answerLabel} htmlFor={responseId}>
          One change I will test
        </label>
        <textarea
          aria-describedby={error ? `${promptId} ${errorId}` : promptId}
          aria-invalid={error ? "true" : "false"}
          id={responseId}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          value={response}
        />
        {error ? <p className={styles.taskError} id={errorId} role="alert">{error}</p> : null}
        <div className={styles.actionRow}>
          <PrimaryAction onClick={onSave}>Prepare protected proof</PrimaryAction>
          <QuietAction onClick={onStop}>Save this point</QuietAction>
        </div>
      </div>
    </section>
  );
}

function ProofScreen({
  mode,
  response,
  error,
  onChange,
  onBegin,
  onSubmit,
  onLeave,
}: {
  readonly mode: ProofMode;
  readonly response: string;
  readonly error: string;
  readonly onChange: (value: string) => void;
  readonly onBegin: () => void;
  readonly onSubmit: () => void;
  readonly onLeave: () => void;
}) {
  const responseId = useId();
  const promptId = `${responseId}-prompt`;
  const errorId = `${responseId}-error`;

  return (
    <section className={styles.proofScreen} aria-labelledby="atelier-proof-title">
      <div className={styles.proofOuter}>
        <article className={styles.proofBoundary}>
          <LockIcon />
          <p className={styles.stateLabel}>
            {mode === "task" ? "Protected proof · Internal fixture" : "Protected proof"}
          </p>
          <h2 id="atelier-proof-title">
            {mode === "task"
              ? "Submit one unfamiliar ratio response without instructional help."
              : "Read the proof conditions before you open the task."}
          </h2>

          {mode === "task" ? (
            <>
              <p className={styles.proofIntro} id={promptId}>
                A recipe serves four people with three cups of flour. Explain the
                scale factor for ten people.
              </p>
              <label className={styles.answerLabel} htmlFor={responseId}>
                Your protected response
              </label>
              <textarea
                aria-describedby={error ? `${promptId} ${errorId}` : promptId}
                aria-invalid={error ? "true" : "false"}
                className={styles.proofResponse}
                id={responseId}
                onChange={(event) => onChange(event.target.value)}
                rows={6}
                value={response}
              />
              {error ? <p className={styles.taskError} id={errorId} role="alert">{error}</p> : null}
              <div className={styles.actionRow}>
                <PrimaryAction onClick={onSubmit}>Submit bounded proof</PrimaryAction>
                <QuietAction onClick={onLeave}>Leave before submission</QuietAction>
              </div>
            </>
          ) : (
            <>
              <p className={styles.proofIntro}>
                One submission follows the learner revision. The prototype
                stores only a bounded local fixture receipt.
              </p>
              <dl className={styles.proofConditions}>
                <div><dt>Your operation</dt><dd>Find and apply one scale factor.</dd></div>
                <div><dt>Unavailable</dt><dd>Hints, examples, solution steps, and prior answers.</dd></div>
                <div><dt>Available</dt><dd>Keyboard, larger text, read-aloud, and contrast controls.</dd></div>
                <div><dt>Submission</dt><dd>One submission for this fixture task.</dd></div>
              </dl>
              <p className={styles.proofLimit}>
                This result can support one bounded fixture statement. It cannot
                prove permanent mastery.
              </p>
              <div className={styles.actionRow}>
                <PrimaryAction onClick={onBegin}>Begin proof task</PrimaryAction>
                <QuietAction onClick={onLeave}>Leave before submission</QuietAction>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}

function ReturnScreen({
  mode,
  proofReceipt,
  returnReceipt,
  response,
  error,
  onChange,
  onBegin,
  onSubmit,
  onPlanLater,
  onToday,
}: {
  readonly mode: ReturnMode;
  readonly proofReceipt: AuditFixtureReceipt | null;
  readonly returnReceipt: AuditFixtureReceipt | null;
  readonly response: string;
  readonly error: string;
  readonly onChange: (value: string) => void;
  readonly onBegin: () => void;
  readonly onSubmit: () => void;
  readonly onPlanLater: () => void;
  readonly onToday: () => void;
}) {
  const responseId = useId();
  const promptId = `${responseId}-prompt`;
  const errorId = `${responseId}-error`;

  if (mode === "task") {
    return (
      <section className={styles.workScreen} aria-labelledby="atelier-return-task-title">
        <aside className={styles.contextRail} aria-label="Return conditions">
          <h3>Return conditions</h3>
          <dl>
            <div><dt>Current operation</dt><dd>Transfer the ratio to a graph</dd></div>
            <div><dt>Support</dt><dd>Prior answers and cognitive help are closed</dd></div>
            <div><dt>Receipt</dt><dd>{proofReceipt?.receiptId ?? "No proof receipt"}</dd></div>
          </dl>
          <p>Accessibility support stays available. This is a simulated delayed return.</p>
        </aside>

        <div className={styles.workPlateOuter}>
          <article className={styles.workPlate}>
            <header className={styles.workHeader}>
              <p className={styles.stateLabel}>Return · New context</p>
              <span className={styles.localSeal}>Internal fixture · test data only</span>
            </header>
            <h2 id="atelier-return-task-title">Show the same relationship in a graph.</h2>
            <p className={styles.prompt} id={promptId}>
              Describe the scale factor for ten people. Use the graph context,
              not the earlier recipe wording.
            </p>
            <label className={styles.answerLabel} htmlFor={responseId}>
              Your return response
            </label>
            <textarea
              aria-describedby={error ? `${promptId} ${errorId}` : promptId}
              aria-invalid={error ? "true" : "false"}
              id={responseId}
              onChange={(event) => onChange(event.target.value)}
              rows={6}
              value={response}
            />
            {error ? <p className={styles.taskError} id={errorId} role="alert">{error}</p> : null}
            <div className={styles.actionRow}>
              <PrimaryAction onClick={onSubmit}>Submit return receipt</PrimaryAction>
              <QuietAction onClick={onPlanLater}>Plan another time</QuietAction>
            </div>
          </article>
        </div>
      </section>
    );
  }

  if (mode === "complete" && returnReceipt) {
    return (
      <section className={styles.returnScreen} aria-labelledby="atelier-return-title">
        <div className={styles.returnField}>
          <Image
            alt=""
            className={styles.returnImage}
            fill
            sizes="(max-width: 700px) 100vw, 1180px"
            src="/forge/concepts/evidence-atelier-instrument-landscape.png"
          />
          <div className={styles.returnCopy}>
            <p className={styles.stateLabel}>Return · Fixture receipt saved</p>
            <h2 id="atelier-return-title">One delayed transfer receipt is stored locally.</h2>
            <p>
              The fixture records one bounded return attempt. It does not infer
              retention or create a learner record.
            </p>
            <div className={styles.actionRow}>
              <PrimaryAction onClick={onToday}>Return to Today</PrimaryAction>
            </div>
          </div>
        </div>
        {proofReceipt ? <FixtureReceiptCard receipt={proofReceipt} title="Protected proof receipt" /> : null}
        <FixtureReceiptCard receipt={returnReceipt} title="Delayed return receipt" />
      </section>
    );
  }

  return (
    <section className={styles.returnScreen} aria-labelledby="atelier-return-title">
      <div className={styles.returnField}>
        <Image
          alt=""
          className={styles.returnImage}
          fill
          sizes="(max-width: 700px) 100vw, 1180px"
          src="/forge/concepts/evidence-atelier-instrument-landscape.png"
        />
        <div className={styles.returnCopy}>
          <p className={styles.stateLabel}>Return · New context</p>
          <h2 id="atelier-return-title">Test the same relationship in a graph.</h2>
          <p>
            Your earlier proof used a recipe. This fixture checks whether the
            idea travels.
          </p>
          <div className={styles.actionRow}>
            <PrimaryAction onClick={onBegin}>Begin return task</PrimaryAction>
            <QuietAction onClick={onPlanLater}>Plan another time</QuietAction>
          </div>
        </div>
      </div>

      {proofReceipt ? (
        <FixtureReceiptCard receipt={proofReceipt} title="Earlier protected proof receipt" />
      ) : (
        <article className={styles.fixtureReceipt}>
          <p className={styles.stateLabel}>Return locked</p>
          <h3>A proof receipt is required before this fixture can open.</h3>
        </article>
      )}
    </section>
  );
}

export function EvidenceAtelierShowcase({
  initialStage = "today",
  initialTheme = "light",
}: Props) {
  const [stage, setStage] = useState<EvidenceAtelierStage>(initialStage);
  const [theme, setTheme] = useState<EvidenceAtelierTheme>(initialTheme);
  const fixture = useSyncExternalStore(
    subscribeAuditFixture,
    getAuditFixtureSnapshot,
    getServerAuditFixtureSnapshot,
  );
  const [proofMode, setProofMode] = useState<ProofMode>("boundary");
  const [returnMode, setReturnMode] = useState<ReturnMode>("boundary");
  const [proofResponse, setProofResponse] = useState("");
  const [returnResponse, setReturnResponse] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [previewMessage, setPreviewMessage] = useState(
    "Internal audit fixture ready. No production learner record is created.",
  );
  const screenRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const activeStage = canEnterStage(stage, fixture) ? stage : "today";
  const activeReturnMode = fixture.returnReceipt && returnMode !== "task"
    ? "complete"
    : returnMode;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    screenRef.current?.focus();
  }, [activeStage, proofMode, activeReturnMode]);

  function showStage(
    nextStage: EvidenceAtelierStage,
    message = "The internal audit fixture changed screens.",
  ) {
    if (!canEnterStage(nextStage, fixture)) {
      const lockedMessage = `${STAGES.find((item) => item.id === nextStage)?.label ?? "This stage"} stays locked until ${lockReason(nextStage)}.`;
      setPreviewMessage(lockedMessage);
      return;
    }
    setStage(nextStage);
    setProofMode("boundary");
    setReturnMode(fixture.returnReceipt ? "complete" : "boundary");
    setValidationMessage("");
    setPreviewMessage(message);
  }

  function stopPreview() {
    setStage("today");
    setProofMode("boundary");
    setReturnMode(fixture.returnReceipt ? "complete" : "boundary");
    setValidationMessage("");
    setPreviewMessage(
      "The preview returned to Today. Internal fixture drafts remain local. No production record was created.",
    );
  }

  function resetFixture() {
    updateAuditFixture(EMPTY_AUDIT_FIXTURE);
    setStage("today");
    setProofMode("boundary");
    setReturnMode("boundary");
    setProofResponse("");
    setReturnResponse("");
    setValidationMessage("");
    setPreviewMessage("Internal audit fixture reset. No production record was created.");
  }

  function continueRecall() {
    if (!fixture.recallDraft.trim()) {
      setValidationMessage("Write one recall sentence before continuing.");
      setPreviewMessage("Recall needs one learner response before Attempt can open.");
      return;
    }
    updateAuditFixture((current) => ({
      ...current,
      recallCompletedAt: new Date().toISOString(),
    }));
    setStage("attempt");
    setValidationMessage("");
    setPreviewMessage("Recall saved in the internal audit fixture. Attempt is now open.");
  }

  function commitAttempt() {
    if (!fixture.attemptDraft.trim()) {
      setValidationMessage("Add an explanation before committing the attempt.");
      setPreviewMessage("Attempt needs one learner response before Repair can open.");
      return;
    }
    updateAuditFixture((current) => ({
      ...current,
      attemptCommittedAt: new Date().toISOString(),
    }));
    setStage("repair");
    setValidationMessage("");
    setPreviewMessage("Attempt committed in the internal audit fixture. Repair is now open.");
  }

  function saveRevision() {
    if (!fixture.revisionDraft.trim()) {
      setValidationMessage("Write the correction you will test before opening Proof.");
      setPreviewMessage("Repair needs one learner revision before Proof can open.");
      return;
    }
    updateAuditFixture((current) => ({
      ...current,
      revisionSavedAt: new Date().toISOString(),
    }));
    setStage("proof");
    setProofMode("boundary");
    setValidationMessage("");
    setPreviewMessage("Learner revision saved. Protected proof is now available.");
  }

  function submitProof() {
    if (!proofResponse.trim()) {
      setValidationMessage("Write one protected response before submitting the proof fixture.");
      setPreviewMessage("The proof fixture needs one response before Return can open.");
      return;
    }
    const receipt = createFixtureReceipt("proof");
    updateAuditFixture((current) => ({ ...current, proofReceipt: receipt }));
    setProofResponse("");
    setProofMode("boundary");
    setReturnMode("boundary");
    setStage("return");
    setValidationMessage("");
    setPreviewMessage(`Bounded proof receipt ${receipt.receiptId} was created in local test data.`);
  }

  function submitReturn() {
    if (!returnResponse.trim()) {
      setValidationMessage("Write one return response before submitting the return fixture.");
      setPreviewMessage("The return fixture needs one response before it can close.");
      return;
    }
    const receipt = createFixtureReceipt("return");
    updateAuditFixture((current) => ({ ...current, returnReceipt: receipt }));
    setReturnResponse("");
    setReturnMode("complete");
    setValidationMessage("");
    setPreviewMessage(`Bounded return receipt ${receipt.receiptId} was created in local test data.`);
  }

  return (
    <section
      aria-label="Evidence Atelier internal audit fixture"
      className={styles.showcase}
      data-theme={theme}
      data-testid="evidence-atelier-showcase"
    >
      <a className={styles.skipLink} href="#evidence-atelier-preview">
        Skip to concept screen
      </a>

      <div className={styles.previewNotice} data-testid="audit-fixture-notice" role="status">
        <div className={styles.fixtureNoticeCopy}>
          <strong>{AUDIT_FIXTURE_LABEL}</strong>
          <span>Browser-local only · no production learner record.</span>
        </div>
        <button className={styles.resetAction} onClick={resetFixture} type="button">
          Reset test fixture
        </button>
      </div>

      <header className={styles.atelierRail}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">F</span>
          <span><strong>FORGE</strong><small>Evidence Atelier</small></span>
        </div>

        <div className={styles.themeControl} aria-label="Preview theme">
          <span className={styles.themeLabel}>Theme</span>
          {(["light", "dark"] as const).map((themeOption) => (
            <button
              aria-pressed={theme === themeOption}
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              type="button"
            >
              {themeOption === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </header>

      <nav className={styles.stageRail} aria-label="Evidence Atelier learner stages">
        <ol>
          {STAGES.map((item, index) => {
            const available = canEnterStage(item.id, fixture);
            const stageLabel = available
              ? `${item.label}, step ${index + 1} of ${STAGES.length}`
              : `${item.label}, step ${index + 1} of ${STAGES.length}, locked until ${lockReason(item.id)}`;
            return (
              <li key={item.id}>
                <button
                  aria-current={activeStage === item.id ? "step" : undefined}
                  aria-label={stageLabel}
                  data-active={activeStage === item.id ? "true" : undefined}
                  data-locked={!available ? "true" : undefined}
                  disabled={!available}
                  onClick={() => showStage(item.id)}
                  type="button"
                >
                  <span aria-hidden="true" className={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true" className={styles.stageFull}>{item.label}</span>
                  <span aria-hidden="true" className={styles.stageShort}>{item.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        aria-live="polite"
        className={styles.screenViewport}
        id="evidence-atelier-preview"
        ref={screenRef}
        tabIndex={-1}
      >
        {activeStage === "today" ? (
          <TodayScreen
            fixture={fixture}
            onContinue={() => showStage("recall", "Recall is open. Start with your own explanation.")}
            onInspectReceipts={() => showStage("return", "Stored fixture receipts are ready for inspection.")}
          />
        ) : null}
        {activeStage === "recall" ? (
          <RecallScreen
            error={validationMessage}
            onChange={(value) => {
              updateAuditFixture((current) => ({ ...current, recallDraft: value }));
              setValidationMessage("");
            }}
            onContinue={continueRecall}
            onStop={stopPreview}
            response={fixture.recallDraft}
          />
        ) : null}
        {activeStage === "attempt" ? (
          <AttemptScreen
            draft={fixture.attemptDraft}
            error={validationMessage}
            onChange={(value) => {
              updateAuditFixture((current) => ({ ...current, attemptDraft: value }));
              setValidationMessage("");
            }}
            onCommit={commitAttempt}
            onStop={stopPreview}
          />
        ) : null}
        {activeStage === "repair" ? (
          <RepairScreen
            error={validationMessage}
            onChange={(value) => {
              updateAuditFixture((current) => ({ ...current, revisionDraft: value }));
              setValidationMessage("");
            }}
            onSave={saveRevision}
            onStop={stopPreview}
            response={fixture.revisionDraft}
          />
        ) : null}
        {activeStage === "proof" ? (
          <ProofScreen
            error={validationMessage}
            mode={proofMode}
            onBegin={() => {
              setProofMode("task");
              setValidationMessage("");
              setPreviewMessage("Protected proof task open. Cognitive help is unavailable.");
            }}
            onChange={(value) => {
              setProofResponse(value);
              setValidationMessage("");
            }}
            onLeave={stopPreview}
            onSubmit={submitProof}
            response={proofResponse}
          />
        ) : null}
        {activeStage === "return" ? (
          <ReturnScreen
            error={validationMessage}
            mode={activeReturnMode}
            onBegin={() => {
              setReturnMode("task");
              setValidationMessage("");
              setPreviewMessage("Delayed return task open. Prior answers and cognitive help are unavailable.");
            }}
            onChange={(value) => {
              setReturnResponse(value);
              setValidationMessage("");
            }}
            onPlanLater={stopPreview}
            onSubmit={submitReturn}
            onToday={() => showStage("today", "The fixture receipts remain stored locally for review.")}
            proofReceipt={fixture.proofReceipt}
            response={returnResponse}
            returnReceipt={fixture.returnReceipt}
          />
        ) : null}
      </div>

      <p className={styles.liveMessage} aria-live="polite">
        {previewMessage}
      </p>
    </section>
  );
}
