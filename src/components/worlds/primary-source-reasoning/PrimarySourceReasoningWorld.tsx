"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CATEGORIES,
  DISAGREEMENT_POINT,
  ERROR_MESSAGES,
  MYSTERY_CHOICES,
  PHILADELPHIA_CATALOG,
  PLAUSIBLE_READINGS,
  PRIMARY_SOURCE_CONTENT,
  RECONSTRUCTION_CHOICES,
  SUPPORT_LADDER,
  TRANSFER_STATEMENTS,
  WASHINGTON_CATALOG,
  WORKED_STATEMENTS,
  type AssignmentMap,
  type EvidenceCategory,
  type MysteryChoiceId,
  type PrimarySourceProofRecord,
  type PrimarySourceStage,
  type PrimarySourceWorldEvent,
  type ReconstructionChoiceId,
  type TransferStatementId,
  type TransitionRejectReason,
  type WorkedStatementId,
} from "../../../worlds/primary-source-reasoning";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  primarySourceWorldRuntimeAdapter,
  type TrustedWorldRuntimeReceipt,
} from "../../../forge/world-runtime";
import styles from "./PrimarySourceReasoningWorld.module.css";

const STAGES: ReadonlyArray<{
  id: PrimarySourceStage;
  label: string;
}> = [
  { id: "MYSTERY", label: "Notice" },
  { id: "EXPLAIN", label: "Explain" },
  { id: "COMPILER", label: "Interpret" },
  { id: "TEST", label: "Separate" },
  { id: "RECONSTRUCT", label: "Rebuild" },
  { id: "WITHDRAWAL", label: "Withdraw" },
  { id: "COLD_TRANSFER", label: "Transfer" },
  { id: "RESULT", label: "Evidence" },
];

const EXPLANATION_SAMPLE =
  "I can see the street activity, but I may be using details in the photograph to guess who made it and why.";

function classes(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3.5 10h12M11 5.5 15.5 10 11 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  quiet = false,
  testId,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  quiet?: boolean;
  testId?: string;
}) {
  return (
    <button
      className={classes(styles.action, quiet && styles.actionQuiet)}
      disabled={disabled}
      onClick={onClick}
      type="button"
      data-testid={testId}
    >
      <span>{children}</span>
      {quiet ? null : <ArrowIcon />}
    </button>
  );
}

function StageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <header className={styles.stageHeader}>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <div aria-hidden="true" />
      <p>{body}</p>
    </header>
  );
}

function ErrorNotice({ reason }: { reason: TransitionRejectReason | null }) {
  if (!reason) return null;
  return (
    <p className={styles.error} role="alert" data-testid="world-error">
      {ERROR_MESSAGES[reason]}
    </p>
  );
}

function Progress({ stage }: { stage: PrimarySourceStage }) {
  const current = STAGES.findIndex((item) => item.id === stage);
  return (
    <div className={styles.progressShell}>
      <p>
        Step {current + 1} of {STAGES.length}
        <span aria-hidden="true">·</span>
        {STAGES[current]?.label}
      </p>
      <ol aria-label="Primary-source investigation progress">
        {STAGES.map((item, index) => (
          <li
            key={item.id}
            data-status={index < current ? "complete" : index === current ? "current" : "upcoming"}
            aria-current={index === current ? "step" : undefined}
          >
            <span />
            <small className={styles.visuallyHidden}>{item.label}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SourceImage({
  alt,
  caption,
  height,
  priority = false,
  src,
  width,
}: {
  alt: string;
  caption: string;
  height: number;
  priority?: boolean;
  src: string;
  width: number;
}) {
  return (
    <figure className={styles.sourceFigure}>
      <div className={styles.imageMat}>
        <Image
          alt={alt}
          height={height}
          priority={priority}
          sizes="(max-width: 760px) calc(100vw - 32px), 62vw"
          src={src}
          width={width}
        />
      </div>
      <figcaption>
        <span aria-hidden="true" />
        {caption}
      </figcaption>
    </figure>
  );
}

function ConfidenceControl({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className={styles.confidence}>
      <div>
        <label htmlFor={id}>Confidence in this response</label>
        <output htmlFor={id}>{value}%</output>
      </div>
      <input
        id={id}
        max="100"
        min="0"
        onChange={(event) => onChange(Number(event.target.value))}
        step="5"
        type="range"
        value={value}
      />
      <div aria-hidden="true">
        <span>Uncertain</span>
        <span>Very certain</span>
      </div>
    </div>
  );
}

function MysteryStage({
  confidence,
  error,
  onCommit,
  onConfidence,
  onSelect,
  selected,
  instanceId,
}: {
  confidence: number;
  error: TransitionRejectReason | null;
  onCommit: () => void;
  onConfidence: (value: number) => void;
  onSelect: (choice: MysteryChoiceId) => void;
  selected: MysteryChoiceId | null;
  instanceId: string;
}) {
  return (
    <section data-testid="stage-mystery">
      <StageHeader
        eyebrow="An image before its record"
        title={PRIMARY_SOURCE_CONTENT.title}
        body="Look closely. The catalog is closed until you commit what the image itself can establish."
      />
      <div className={styles.mysteryLayout}>
        <SourceImage
          alt={PRIMARY_SOURCE_CONTENT.mystery.alt}
          caption="Primary source · catalog record withheld"
          height={546}
          priority
          src={PRIMARY_SOURCE_CONTENT.mystery.imageSrc}
          width={1024}
        />
        <div className={styles.commitPanel}>
          <fieldset className={styles.choiceFieldset}>
            <legend>{PRIMARY_SOURCE_CONTENT.mystery.prompt}</legend>
            <div className={styles.choiceStack}>
              {MYSTERY_CHOICES.map((choice, index) => (
                <label
                  key={choice.id}
                  className={classes(styles.choice, selected === choice.id && styles.choiceSelected)}
                >
                  <input
                    checked={selected === choice.id}
                    name={`${instanceId}-mystery-choice`}
                    onChange={() => onSelect(choice.id)}
                    type="radio"
                    value={choice.id}
                  />
                  <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <strong>{choice.label}</strong>
                </label>
              ))}
            </div>
          </fieldset>
          <ConfidenceControl
            id={`${instanceId}-initial-confidence`}
            onChange={onConfidence}
            value={confidence}
          />
          <ErrorNotice reason={error} />
          <ActionButton disabled={!selected} onClick={onCommit} testId="commit-initial">
            Commit this claim
          </ActionButton>
          <p className={styles.boundaryNote}>No answer or source metadata is revealed by committing.</p>
        </div>
      </div>
    </section>
  );
}

function ExplainStage({
  error,
  explanation,
  instanceId,
  onChange,
  onCommit,
  onUseSample,
  selectedChoice,
  confidence,
}: {
  error: TransitionRejectReason | null;
  explanation: string;
  instanceId: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onUseSample: () => void;
  selectedChoice: MysteryChoiceId;
  confidence: number;
}) {
  const choice = MYSTERY_CHOICES.find((item) => item.id === selectedChoice);
  return (
    <section data-testid="stage-explain">
      <StageHeader
        eyebrow="Your mechanism"
        title="How did you decide what the image can prove?"
        body="Leave the reasoning in your own words. It stays learner-authored and becomes the input to the next test."
      />
      <div className={styles.explainLayout}>
        <aside className={styles.claimCard} aria-label="Committed claim">
          <span>Committed claim</span>
          <blockquote>“{choice?.label}”</blockquote>
          <p>{confidence}% confidence</p>
        </aside>
        <div className={styles.writingPanel}>
          <label htmlFor={`${instanceId}-initial-explanation`}>
            What made this claim seem supported?
          </label>
          <textarea
            id={`${instanceId}-initial-explanation`}
            maxLength={600}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Describe which details you used and what you assumed."
            rows={7}
            value={explanation}
          />
          <div className={styles.textareaMeta}>
            <span>{explanation.length} / 600</span>
            <button type="button" onClick={onUseSample}>
              Use an editable sample
            </button>
          </div>
          <ErrorNotice reason={error} />
          <ActionButton onClick={onCommit} testId="commit-explanation">
            Interpret my words
          </ActionButton>
          <p className={styles.boundaryNote}>The sample only fills the editor. It never submits for you.</p>
        </div>
      </div>
    </section>
  );
}

function CompilerStage({
  correction,
  error,
  explanation,
  onContinue,
  onCorrection,
  onResponse,
  response,
}: {
  correction: string;
  error: TransitionRejectReason | null;
  explanation: string;
  onContinue: () => void;
  onCorrection: (value: string) => void;
  onResponse: (value: "accepted" | "corrected") => void;
  response: "accepted" | "corrected" | null;
}) {
  return (
    <section data-testid="stage-compiler">
      <StageHeader
        eyebrow="Visible interpretation compiler"
        title="Your words can support two testable readings."
        body="These are uncertain possibilities, not diagnoses. Correct them if neither reflects what you meant."
      />
      <div className={styles.compilerFlow}>
        <article className={styles.compilerClaim}>
          <span>1 · Your exact words</span>
          <blockquote>“{explanation}”</blockquote>
        </article>
        <span className={styles.connector} aria-hidden="true">→</span>
        <div className={styles.readingPair}>
          {PLAUSIBLE_READINGS.map((reading, index) => (
            <article key={reading.id} className={styles.readingCard}>
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <small>Plausible reading</small>
              <h2>{reading.label}</h2>
              <p>{reading.description}</p>
              <footer>{reading.predicts}</footer>
            </article>
          ))}
        </div>
        <span className={styles.connector} aria-hidden="true">→</span>
        <article className={styles.disagreementCard}>
          <span>3 · Point of disagreement</span>
          <h2>{DISAGREEMENT_POINT.question}</h2>
          <p>{DISAGREEMENT_POINT.whyItSeparates}</p>
        </article>
        <span className={styles.connector} aria-hidden="true">→</span>
        <article className={styles.testCard}>
          <span>4 · Selected test</span>
          <h2>{DISAGREEMENT_POINT.separatingTest}</h2>
        </article>
      </div>

      <fieldset className={styles.compilerCheck}>
        <legend>Do these readings include what you meant?</legend>
        <label>
          <input
            checked={response === "accepted"}
            name="compiler-response"
            onChange={() => onResponse("accepted")}
            type="radio"
          />
          At least one reading is plausible enough to test.
        </label>
        <label>
          <input
            checked={response === "corrected"}
            name="compiler-response"
            onChange={() => onResponse("corrected")}
            type="radio"
          />
          Neither fits; I want to correct the interpretation.
        </label>
        {response === "corrected" ? (
          <textarea
            aria-label="Correction to the two interpretations"
            maxLength={420}
            onChange={(event) => onCorrection(event.target.value)}
            placeholder="State what you meant so the correction remains yours."
            rows={3}
            value={correction}
          />
        ) : null}
      </fieldset>
      <ErrorNotice reason={error} />
      <div className={styles.endAction}>
        <ActionButton disabled={!response} onClick={onContinue} testId="accept-compiler">
          Run the separating test
        </ActionButton>
      </div>
    </section>
  );
}

function CatalogRecord({ compact = false }: { compact?: boolean }) {
  return (
    <article className={classes(styles.catalogRecord, compact && styles.catalogCompact)}>
      <header>
        <span>Library of Congress catalog record</span>
        <a href={PHILADELPHIA_CATALOG.href} rel="noreferrer" target="_blank">
          Open official item record ↗
        </a>
      </header>
      <dl>
        <div><dt>Title</dt><dd>{PHILADELPHIA_CATALOG.title}</dd></div>
        <div><dt>Creator</dt><dd>{PHILADELPHIA_CATALOG.creator}</dd></div>
        <div><dt>Date / publication</dt><dd>{PHILADELPHIA_CATALOG.date}</dd></div>
        {compact ? null : (
          <>
            <div><dt>Medium</dt><dd>{PHILADELPHIA_CATALOG.medium}</dd></div>
            <div><dt>Catalog summary</dt><dd>{PHILADELPHIA_CATALOG.summary}</dd></div>
          </>
        )}
        <div><dt>Reproduction no.</dt><dd>{PHILADELPHIA_CATALOG.reproductionNumber}</dd></div>
        <div><dt>Rights advisory</dt><dd>{PHILADELPHIA_CATALOG.rightsAdvisory}</dd></div>
      </dl>
    </article>
  );
}

function ClassificationBoard<StatementId extends string>({
  assignments,
  instanceId,
  onAssign,
  statements,
}: {
  assignments: AssignmentMap<StatementId>;
  instanceId: string;
  onAssign: (statementId: StatementId, category: EvidenceCategory) => void;
  statements: ReadonlyArray<{ id: StatementId; text: string }>;
}) {
  return (
    <div className={styles.classificationBoard}>
      {statements.map((statement, index) => (
        <article key={statement.id}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <p>{statement.text}</p>
          <label htmlFor={`${instanceId}-${statement.id}`}>
            Evidence layer
            <select
              id={`${instanceId}-${statement.id}`}
              onChange={(event) =>
                onAssign(statement.id, event.target.value as EvidenceCategory)
              }
              value={assignments[statement.id] ?? ""}
            >
              <option value="" disabled>Choose a category</option>
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </article>
      ))}
    </div>
  );
}

function SupportPanel({
  onRequest,
  used,
}: {
  onRequest: () => void;
  used: readonly (1 | 2 | 3)[];
}) {
  return (
    <aside className={styles.supportPanel} aria-label="Governed support">
      <header>
        <div>
          <span>Optional support</span>
          <h2>One cue at a time</h2>
        </div>
        <small>{used.length} of {SUPPORT_LADDER.length} used</small>
      </header>
      {used.length > 0 ? (
        <ol>
          {SUPPORT_LADDER.filter((cue) => used.includes(cue.level)).map((cue) => (
            <li key={cue.level}>
              <span>{cue.label}</span>
              <p>{cue.text}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p>No cues used. Asking for one is recorded factually and carries no penalty.</p>
      )}
      {used.length < SUPPORT_LADDER.length ? (
        <ActionButton quiet onClick={onRequest} testId="request-support">
          Reveal the next cue
        </ActionButton>
      ) : null}
    </aside>
  );
}

function TestStage({
  assignments,
  catalogOpened,
  error,
  instanceId,
  onAssign,
  onOpenCatalog,
  onRequestSupport,
  onSubmit,
  supportUsed,
}: {
  assignments: AssignmentMap<WorkedStatementId>;
  catalogOpened: boolean;
  error: TransitionRejectReason | null;
  instanceId: string;
  onAssign: (statementId: WorkedStatementId, category: EvidenceCategory) => void;
  onOpenCatalog: () => void;
  onRequestSupport: () => void;
  onSubmit: () => void;
  supportUsed: readonly (1 | 2 | 3)[];
}) {
  return (
    <section data-testid="stage-test">
      <StageHeader
        eyebrow="Synchronized source comparison"
        title="Separate what the image shows from what the record supplies."
        body="The image and catalog are two instruments aimed at the same item. Neither can answer every kind of claim."
      />
      <div className={styles.instrumentGrid}>
        <SourceImage
          alt={PRIMARY_SOURCE_CONTENT.mystery.alt}
          caption={catalogOpened ? "Image layer · full stereograph" : "Image layer · catalog closed"}
          height={546}
          src={PRIMARY_SOURCE_CONTENT.mystery.imageSrc}
          width={1024}
        />
        {catalogOpened ? (
          <CatalogRecord />
        ) : (
          <aside className={styles.closedCatalog}>
            <span aria-hidden="true">+</span>
            <h2>Bring in the catalog layer</h2>
            <p>Opening it does not replace the photograph. It adds recorded provenance beside it.</p>
            <ActionButton onClick={onOpenCatalog} testId="open-catalog">
              Open catalog record
            </ActionButton>
          </aside>
        )}
      </div>

      {catalogOpened ? (
        <>
          <div className={styles.categoryKey} aria-label="Evidence category definitions">
            {CATEGORIES.map((category) => (
              <article key={category.id}>
                <strong>{category.label}</strong>
                <span>{category.description}</span>
              </article>
            ))}
          </div>
          <section className={styles.classificationSection} aria-labelledby="worked-classification-title">
            <header>
              <span>Selected separating test</span>
              <h2 id="worked-classification-title">Classify each claim by the evidence that can support it.</h2>
            </header>
            <ClassificationBoard
              assignments={assignments}
              instanceId={`${instanceId}-worked`}
              onAssign={onAssign}
              statements={WORKED_STATEMENTS}
            />
          </section>
          <SupportPanel onRequest={onRequestSupport} used={supportUsed} />
          <ErrorNotice reason={error} />
          <div className={styles.endAction}>
            <p>Incorrect checks return a boundary prompt, not the answer.</p>
            <ActionButton onClick={onSubmit} testId="submit-worked-test">
              Check the separation
            </ActionButton>
          </div>
        </>
      ) : (
        <ErrorNotice reason={error} />
      )}
    </section>
  );
}

function ReconstructStage({
  choice,
  error,
  instanceId,
  onChoice,
  onRequestSupport,
  onSubmit,
  onText,
  supportUsed,
  text,
}: {
  choice: ReconstructionChoiceId | null;
  error: TransitionRejectReason | null;
  instanceId: string;
  onChoice: (choice: ReconstructionChoiceId) => void;
  onRequestSupport: () => void;
  onSubmit: () => void;
  onText: (value: string) => void;
  supportUsed: readonly (1 | 2 | 3)[];
  text: string;
}) {
  return (
    <section data-testid="stage-reconstruct">
      <StageHeader
        eyebrow="Learner reconstruction"
        title="What rule will keep your next claim honest?"
        body="Rebuild the evidence boundary in your own language before the worked source and cues leave."
      />
      <div className={styles.reconstructGrid}>
        <fieldset className={styles.ruleChoices}>
          <legend>Choose the core rule</legend>
          {RECONSTRUCTION_CHOICES.map((item, index) => (
            <label key={item.id} className={classes(choice === item.id && styles.ruleSelected)}>
              <input
                checked={choice === item.id}
                name={`${instanceId}-reconstruction-rule`}
                onChange={() => onChoice(item.id)}
                type="radio"
              />
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              <strong>{item.label}</strong>
            </label>
          ))}
        </fieldset>
        <div className={styles.writingPanel}>
          <label htmlFor={`${instanceId}-reconstruction`}>State the rule in your own words</label>
          <textarea
            id={`${instanceId}-reconstruction`}
            maxLength={600}
            onChange={(event) => onText(event.target.value)}
            placeholder="When I read a primary source, I will…"
            rows={7}
            value={text}
          />
          <span className={styles.characterCount}>{text.length} / 600</span>
        </div>
      </div>
      <SupportPanel onRequest={onRequestSupport} used={supportUsed} />
      <ErrorNotice reason={error} />
      <div className={styles.endAction}>
        <ActionButton onClick={onSubmit} testId="submit-reconstruction">
          Lock my rule
        </ActionButton>
      </div>
    </section>
  );
}

function WithdrawalStage({ onContinue }: { onContinue: () => void }) {
  return (
    <section className={styles.withdrawal} data-testid="stage-withdrawal">
      <StageHeader
        eyebrow="The instrument withdraws"
        title="The next source is yours alone."
        body="The worked photograph, interpretation compiler, test selection, feedback, and cue ladder are leaving before the unfamiliar task appears."
      />
      <div className={styles.withdrawalGrid}>
        <article>
          <span aria-hidden="true">−</span>
          <h2>Removed for proof</h2>
          <ul>
            <li>Worked Philadelphia source</li>
            <li>Two authored interpretations</li>
            <li>Category definitions and retry feedback</li>
            <li>Attention, representation, and principle cues</li>
          </ul>
        </article>
        <article>
          <span aria-hidden="true">+</span>
          <h2>Access remains</h2>
          <ul>
            <li>Keyboard operation and visible focus</li>
            <li>Source image description</li>
            <li>Readable catalog text</li>
            <li>Reduced-motion behavior</li>
          </ul>
        </article>
      </div>
      <div className={styles.endAction}>
        <p>Submitting the next task is one-shot. It records what happens without hints.</p>
        <ActionButton onClick={onContinue} testId="acknowledge-withdrawal">
          Begin independent transfer
        </ActionButton>
      </div>
    </section>
  );
}

function TransferCatalog() {
  return (
    <article className={styles.transferCatalog}>
      <header>
        <span>Task source record</span>
        <a href={WASHINGTON_CATALOG.href} rel="noreferrer" target="_blank">
          Official item record ↗
        </a>
      </header>
      <dl>
        <div><dt>Title</dt><dd>{WASHINGTON_CATALOG.title}</dd></div>
        <div><dt>Creator</dt><dd>{WASHINGTON_CATALOG.creator}</dd></div>
        <div><dt>Date</dt><dd>{WASHINGTON_CATALOG.date}</dd></div>
        <div><dt>Medium</dt><dd>{WASHINGTON_CATALOG.medium}</dd></div>
        <div><dt>Record note</dt><dd>{WASHINGTON_CATALOG.note}</dd></div>
        <div><dt>Rights advisory</dt><dd>{WASHINGTON_CATALOG.rightsAdvisory}</dd></div>
      </dl>
    </article>
  );
}

function TransferStage({
  assignments,
  confidence,
  error,
  explanation,
  instanceId,
  onAssign,
  onConfidence,
  onExplanation,
  onSubmit,
}: {
  assignments: AssignmentMap<TransferStatementId>;
  confidence: number;
  error: TransitionRejectReason | null;
  explanation: string;
  instanceId: string;
  onAssign: (statementId: TransferStatementId, category: EvidenceCategory) => void;
  onConfidence: (value: number) => void;
  onExplanation: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className={styles.transferStage} data-testid="stage-transfer">
      <div className={styles.proofStatus} role="status">
        <span aria-hidden="true" />
        Independent task · interpretations, test selection, feedback, and hints are off
      </div>
      <StageHeader
        eyebrow="Unfamiliar cold transfer"
        title={PRIMARY_SOURCE_CONTENT.transfer.prompt}
        body="Use the photograph and its task source record. Each claim gets one category. Your submission locks immediately."
      />
      <div className={styles.transferSourceGrid}>
        <SourceImage
          alt={PRIMARY_SOURCE_CONTENT.transfer.alt}
          caption="Unfamiliar source · full frame"
          height={750}
          src={PRIMARY_SOURCE_CONTENT.transfer.imageSrc}
          width={1024}
        />
        <TransferCatalog />
      </div>
      <section className={styles.classificationSection} aria-labelledby="transfer-classification-title">
        <header>
          <span>One-shot classification</span>
          <h2 id="transfer-classification-title">Assign the evidence layer for all four claims.</h2>
        </header>
        <ClassificationBoard
          assignments={assignments}
          instanceId={`${instanceId}-transfer`}
          onAssign={onAssign}
          statements={TRANSFER_STATEMENTS}
        />
      </section>
      <div className={styles.transferCommit}>
        <div className={styles.writingPanel}>
          <label htmlFor={`${instanceId}-transfer-explanation`}>
            Why do these boundaries fit?
          </label>
          <textarea
            id={`${instanceId}-transfer-explanation`}
            maxLength={600}
            onChange={(event) => onExplanation(event.target.value)}
            placeholder="Explain how you separated source record, visible detail, and interpretation."
            rows={5}
            value={explanation}
          />
          <span className={styles.characterCount}>{explanation.length} / 600</span>
        </div>
        <ConfidenceControl
          id={`${instanceId}-transfer-confidence`}
          onChange={onConfidence}
          value={confidence}
        />
      </div>
      <ErrorNotice reason={error} />
      <div className={styles.endAction}>
        <p>No answer feedback or optional support is available in this task.</p>
        <ActionButton onClick={onSubmit} testId="submit-transfer">
          Submit once and seal
        </ActionButton>
      </div>
    </section>
  );
}

function ResultStage({
  explanation,
  initialChoiceId,
  initialConfidence,
  initialExplanation,
  onReset,
  proof,
}: {
  explanation: string;
  initialChoiceId: MysteryChoiceId;
  initialConfidence: number;
  initialExplanation: string;
  onReset: () => void;
  proof: PrimarySourceProofRecord;
}) {
  const choice = MYSTERY_CHOICES.find((item) => item.id === initialChoiceId);
  const supportDescription = [
    proof.assistance.explanationSampleUsed ? "editable explanation sample" : null,
    ...proof.assistance.levelsUsed.map((level) => SUPPORT_LADDER[level - 1]?.label.toLowerCase()),
  ].filter(Boolean);

  return (
    <section className={styles.resultStage} data-testid="stage-result">
      <article className={styles.evidenceSheet}>
        <header>
          <div>
            <span>Proof after help · sealed attempt</span>
            <p>{proof.proofClaimId}</p>
          </div>
          <strong data-outcome={proof.independentTransfer.passed ? "held" : "not-yet"}>
            {proof.independentTransfer.passed ? "Pattern held once" : "Not yet demonstrated"}
          </strong>
        </header>
        <div className={styles.resultLead}>
          <p>Independent transfer result</p>
          <h1>{proof.demonstrated}</h1>
          <span>
            {proof.independentTransfer.correctCount} of 4 classifications matched the authored source boundary · {proof.independentTransfer.confidence}% confidence
          </span>
        </div>
        <dl className={styles.evidenceRows}>
          <div>
            <dt>Started with</dt>
            <dd>
              <strong>{choice?.label}</strong>
              <span>{initialConfidence}% confidence · “{initialExplanation}”</span>
            </dd>
          </div>
          <div>
            <dt>Tested with</dt>
            <dd>
              Philadelphia image and catalog layers, then a four-category separating test.
            </dd>
          </div>
          <div>
            <dt>Support used</dt>
            <dd>
              {supportDescription.length > 0
                ? `${supportDescription.join(", ")}. All were removed before transfer.`
                : "No optional sample or cue was used. Support was unavailable during transfer."}
            </dd>
          </div>
          <div>
            <dt>Did alone</dt>
            <dd>
              <strong>{proof.demonstrated}</strong>
              <span>Boundary explanation: “{explanation}”</span>
            </dd>
          </div>
          <div>
            <dt>Still untested</dt>
            <dd>
              <ul>
                {proof.notYetTested.map((boundary) => <li key={boundary}>{boundary}</li>)}
              </ul>
            </dd>
          </div>
        </dl>
        <footer>
          <p>
            This record describes one new problem. It does not claim mastery or delayed retention.
          </p>
          <ActionButton quiet onClick={onReset} testId="reset-world">
            Start a new attempt
          </ActionButton>
        </footer>
      </article>
    </section>
  );
}

export function PrimarySourceReasoningWorld({
  onEvidence,
  onRuntimeReceipt,
}: {
  onEvidence?: (record: PrimarySourceProofRecord) => void;
  onRuntimeReceipt?: (receipt: TrustedWorldRuntimeReceipt) => void;
}) {
  const instanceId = useId();
  const mainRef = useRef<HTMLElement>(null);
  const emittedProofRef = useRef<PrimarySourceProofRecord | null>(null);
  const emittedReceiptRef = useRef<TrustedWorldRuntimeReceipt | null>(null);
  const [runtime, setRuntime] = useState(() => createWorldRuntimeSession(primarySourceWorldRuntimeAdapter));
  const runtimeRef = useRef(runtime);
  const state = runtime.state;
  const [error, setError] = useState<TransitionRejectReason | null>(null);

  const [mysteryChoice, setMysteryChoice] = useState<MysteryChoiceId | null>(null);
  const [initialConfidence, setInitialConfidence] = useState(65);
  const [initialExplanation, setInitialExplanation] = useState("");
  const [interpretationResponse, setInterpretationResponse] = useState<"accepted" | "corrected" | null>(null);
  const [compilerCorrection, setCompilerCorrection] = useState("");
  const [reconstructionChoice, setReconstructionChoice] = useState<ReconstructionChoiceId | null>(null);
  const [reconstructionText, setReconstructionText] = useState("");
  const [transferConfidence, setTransferConfidence] = useState(65);
  const [transferExplanation, setTransferExplanation] = useState("");

  const send = useCallback(
    (event: PrimarySourceWorldEvent) => {
      const result = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtimeRef.current, {
        kind: "domain",
        event,
      });
      if (result.accepted) {
        runtimeRef.current = result.session;
        setRuntime(result.session);
        setError(null);
        return true;
      }
      setError((result.domainReason ?? "invalid_event_for_stage") as TransitionRejectReason);
      return false;
    },
    [],
  );

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [state.stage]);

  useEffect(() => {
    if (state.proof && emittedProofRef.current !== state.proof) {
      emittedProofRef.current = state.proof;
      onEvidence?.(state.proof);
    }
  }, [onEvidence, state.proof]);

  useEffect(() => {
    if (runtime.receipt && emittedReceiptRef.current !== runtime.receipt) {
      emittedReceiptRef.current = runtime.receipt;
      onRuntimeReceipt?.(runtime.receipt);
    }
  }, [onRuntimeReceipt, runtime.receipt]);

  function resetWorld() {
    send({ type: "RESET" });
    emittedProofRef.current = null;
    emittedReceiptRef.current = null;
    setMysteryChoice(null);
    setInitialConfidence(65);
    setInitialExplanation("");
    setInterpretationResponse(null);
    setCompilerCorrection("");
    setReconstructionChoice(null);
    setReconstructionText("");
    setTransferConfidence(65);
    setTransferExplanation("");
  }

  let stageContent: ReactNode;

  if (state.stage === "MYSTERY") {
    stageContent = (
      <MysteryStage
        confidence={initialConfidence}
        error={error}
        instanceId={instanceId}
        onCommit={() => {
          if (!mysteryChoice) return;
          send({ type: "COMMIT_INITIAL", choiceId: mysteryChoice, confidence: initialConfidence });
        }}
        onConfidence={setInitialConfidence}
        onSelect={setMysteryChoice}
        selected={mysteryChoice}
      />
    );
  } else if (state.stage === "EXPLAIN" && state.initialChoiceId && state.confidence !== null) {
    stageContent = (
      <ExplainStage
        confidence={state.confidence}
        error={error}
        explanation={initialExplanation}
        instanceId={instanceId}
        onChange={setInitialExplanation}
        onCommit={() => send({ type: "COMMIT_EXPLANATION", explanation: initialExplanation })}
        onUseSample={() => {
          setInitialExplanation(EXPLANATION_SAMPLE);
          send({ type: "USE_EXPLANATION_SAMPLE" });
        }}
        selectedChoice={state.initialChoiceId}
      />
    );
  } else if (state.stage === "COMPILER") {
    stageContent = (
      <CompilerStage
        correction={compilerCorrection}
        error={error}
        explanation={state.initialExplanation}
        onContinue={() => {
          if (!interpretationResponse) return;
          send({
            type: "ACCEPT_INTERPRETATIONS",
            response: interpretationResponse,
            correction: compilerCorrection,
          });
        }}
        onCorrection={setCompilerCorrection}
        onResponse={setInterpretationResponse}
        response={interpretationResponse}
      />
    );
  } else if (state.stage === "TEST") {
    stageContent = (
      <TestStage
        assignments={state.workedAssignments}
        catalogOpened={state.catalogOpened}
        error={error}
        instanceId={instanceId}
        onAssign={(statementId, category) =>
          send({ type: "SET_WORKED_ASSIGNMENT", statementId, category })
        }
        onOpenCatalog={() => send({ type: "OPEN_CATALOG" })}
        onRequestSupport={() => send({ type: "REQUEST_SUPPORT" })}
        onSubmit={() => send({ type: "SUBMIT_WORKED_TEST" })}
        supportUsed={state.supportUsed}
      />
    );
  } else if (state.stage === "RECONSTRUCT") {
    stageContent = (
      <ReconstructStage
        choice={reconstructionChoice}
        error={error}
        instanceId={instanceId}
        onChoice={setReconstructionChoice}
        onRequestSupport={() => send({ type: "REQUEST_SUPPORT" })}
        onSubmit={() => {
          if (!reconstructionChoice) return;
          send({
            type: "SUBMIT_RECONSTRUCTION",
            choiceId: reconstructionChoice,
            reconstruction: reconstructionText,
          });
        }}
        onText={setReconstructionText}
        supportUsed={state.supportUsed}
        text={reconstructionText}
      />
    );
  } else if (state.stage === "WITHDRAWAL") {
    stageContent = (
      <WithdrawalStage onContinue={() => send({ type: "ACKNOWLEDGE_WITHDRAWAL" })} />
    );
  } else if (state.stage === "COLD_TRANSFER") {
    stageContent = (
      <TransferStage
        assignments={state.transferAssignments}
        confidence={transferConfidence}
        error={error}
        explanation={transferExplanation}
        instanceId={instanceId}
        onAssign={(statementId, category) =>
          send({ type: "SET_TRANSFER_ASSIGNMENT", statementId, category })
        }
        onConfidence={setTransferConfidence}
        onExplanation={setTransferExplanation}
        onSubmit={() =>
          send({
            type: "SUBMIT_TRANSFER",
            confidence: transferConfidence,
            explanation: transferExplanation,
          })
        }
      />
    );
  } else if (
    state.stage === "RESULT" &&
    state.proof &&
    state.initialChoiceId &&
    state.confidence !== null
  ) {
    stageContent = (
      <ResultStage
        explanation={state.transferExplanation}
        initialChoiceId={state.initialChoiceId}
        initialConfidence={state.confidence}
        initialExplanation={state.initialExplanation}
        onReset={resetWorld}
        proof={state.proof}
      />
    );
  } else {
    stageContent = null;
  }

  return (
    <div
      className={classes(styles.world, state.stage === "RESULT" && styles.worldResult)}
      data-stage={state.stage.toLowerCase()}
      data-world="primary-source-reasoning"
    >
      <Progress stage={state.stage} />
      <p className={styles.stageAnnouncement} aria-live="polite">
        {STAGES.find((item) => item.id === state.stage)?.label} stage
      </p>
      <main className={styles.main} ref={mainRef} tabIndex={-1}>
        {stageContent}
      </main>
      <footer className={styles.worldFooter}>
        <span>FORGE · Primary source reasoning</span>
        <a href="/worlds/primary-source-reasoning/PROVENANCE.md" target="_blank">
          Image provenance and rights advisories
        </a>
      </footer>
    </div>
  );
}
