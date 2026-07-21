import type { ReactNode } from "react";

import { PROPORTIONAL_REASONING_CONTENT, type ExperimentView, type RatioStage } from "../../../worlds/proportional-reasoning";

import styles from "./ProportionalReasoningWorld.module.css";

const STEPS = [
  { id: "MYSTERY", label: "Commit" },
  { id: "EXPLAIN", label: "Explain" },
  { id: "COMPILER", label: "Separate" },
  { id: "EXPERIMENT", label: "Compare" },
  { id: "RECONSTRUCT", label: "Rebuild" },
  { id: "COLD_TRANSFER", label: "Prove" },
  { id: "EVIDENCE", label: "Evidence" },
] as const;

function normalizedStage(stage: RatioStage): (typeof STEPS)[number]["id"] {
  return stage === "WITHDRAWAL" ? "COLD_TRANSFER" : stage;
}

export function RatioStageRail({ stage }: { readonly stage: RatioStage }) {
  const current = STEPS.findIndex((step) => step.id === normalizedStage(stage));
  return (
    <ol className={styles["forge-ratio-stage-rail"]} aria-label="Learning sequence">
      {STEPS.map((step, index) => {
        const status = index < current ? "complete" : index === current ? "current" : "upcoming";
        return (
          <li className={styles["forge-ratio-stage-step"]} data-state={status} key={step.id} aria-current={status === "current" ? "step" : undefined}>
            <span className={styles["forge-ratio-stage-index"]}>{index + 1}</span>
            <span className={styles["forge-ratio-stage-label"]}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RatioStageHeader({
  number,
  marker,
  title,
  body,
}: {
  readonly number: string;
  readonly marker: string;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <header className={styles["forge-ratio-stage-header"]}>
      <span className={styles["forge-ratio-stage-number"]} aria-hidden="true">{number}</span>
      <div>
        <p className={styles["forge-ratio-stage-marker"]}>{marker}</p>
        <h1>{title}</h1>
        <p className={styles["forge-ratio-stage-body"]}>{body}</p>
      </div>
    </header>
  );
}

export function RatioPrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
  testId,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly type?: "button" | "submit";
  readonly testId?: string;
}) {
  return (
    <button
      className={`${styles["forge-ratio-button"]} ${styles["forge-ratio-button-primary"]}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
      data-testid={testId}
    >
      <span>{children}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
    </button>
  );
}

export function RatioSecondaryButton({
  children,
  disabled,
  onClick,
  testId,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly testId?: string;
}) {
  return (
    <button
      className={`${styles["forge-ratio-button"]} ${styles["forge-ratio-button-secondary"]}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function PartMarks({ count, kind }: { readonly count: number; readonly kind: "concentrate" | "water" }) {
  return (
    <span className={styles["forge-ratio-part-marks"]} aria-label={`${count} ${kind} parts`}>
      {Array.from({ length: count }, (_, index) => (
        <i className={styles[`forge-ratio-part-${kind}`]} key={`${kind}-${index}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export function MixtureMystery() {
  const [glass, jug] = PROPORTIONAL_REASONING_CONTENT.mixtures;
  return (
    <figure className={styles["forge-ratio-mystery-world"]}>
      <div className={styles["forge-ratio-mystery-scene"]} aria-hidden="true">
        <div className={`${styles["forge-ratio-vessel"]} ${styles["forge-ratio-vessel-small"]}`}>
          <span className={styles["forge-ratio-liquid"]} />
          <span className={styles["forge-ratio-vessel-letter"]}>A</span>
        </div>
        <div className={styles["forge-ratio-pour-line"]} />
        <div className={`${styles["forge-ratio-vessel"]} ${styles["forge-ratio-vessel-large"]}`}>
          <span className={styles["forge-ratio-liquid"]} />
          <span className={styles["forge-ratio-vessel-letter"]}>B</span>
        </div>
      </div>
      <div className={styles["forge-ratio-recipe-readout"]}>
        <article>
          <strong>{glass.name}</strong>
          <PartMarks count={glass.concentrateParts} kind="concentrate" />
          <PartMarks count={glass.waterParts} kind="water" />
          <span>{glass.vesselLabel}</span>
        </article>
        <article>
          <strong>{jug.name}</strong>
          <PartMarks count={jug.concentrateParts} kind="concentrate" />
          <PartMarks count={jug.waterParts} kind="water" />
          <span>{jug.vesselLabel}</span>
        </article>
      </div>
      <figcaption>
        Both drinks use the same concentrate and water. Amber marks concentrate; cyan marks water. No tasting result is revealed yet.
      </figcaption>
    </figure>
  );
}

function RatioBar({ concentrate, water, label }: { readonly concentrate: number; readonly water: number; readonly label: string }) {
  return (
    <div className={styles["forge-ratio-bar-row"]}>
      <strong>{label}</strong>
      <div className={styles["forge-ratio-bar"]} role="img" aria-label={`${label}: ${concentrate} parts concentrate to ${water} parts water`}>
        <span className={styles["forge-ratio-bar-concentrate"]} style={{ flex: concentrate }} />
        <span className={styles["forge-ratio-bar-water"]} style={{ flex: water }} />
      </div>
      <code>{concentrate}:{water}</code>
    </div>
  );
}

function PartsView() {
  return (
    <div className={styles["forge-ratio-instrument-view"]} data-testid="ratio-view-parts">
      <RatioBar concentrate={2} water={3} label="Glass A" />
      <RatioBar concentrate={5} water={6} label="Jug B" />
      <p className={styles["forge-ratio-instrument-note"]}>The bars preserve each authored part count. A larger total bar does not by itself decide strength.</p>
    </div>
  );
}

function CommonWaterView() {
  return (
    <div className={styles["forge-ratio-instrument-view"]} data-testid="ratio-view-common-water">
      <div className={styles["forge-ratio-equation-line"]}>
        <span>Glass A</span>
        <code>2/3 × 2/2</code>
        <strong>4/6</strong>
      </div>
      <div className={styles["forge-ratio-equation-line"]}>
        <span>Jug B</span>
        <code>5/6 × 1/1</code>
        <strong>5/6</strong>
      </div>
      <div className={styles["forge-ratio-common-grid"]}>
        <article>
          <span>At 6 water</span>
          <PartMarks count={4} kind="concentrate" />
          <strong>Glass A has 4 concentrate</strong>
        </article>
        <span className={styles["forge-ratio-less-than"]} aria-label="is less than">&lt;</span>
        <article>
          <span>At 6 water</span>
          <PartMarks count={5} kind="concentrate" />
          <strong>Jug B has 5 concentrate</strong>
        </article>
      </div>
      <p className={styles["forge-ratio-observation"]}>With water held equal, 4 concentrate parts is less than 5. Jug B is the stronger mixture.</p>
    </div>
  );
}

function TableView() {
  return (
    <div className={styles["forge-ratio-instrument-view"]} data-testid="ratio-view-table">
      <div className={styles["forge-ratio-table-wrap"]}>
        <table className={styles["forge-ratio-table"]}>
          <caption>Exact comparison — no decimals or rounding</caption>
          <thead><tr><th scope="col">Mixture</th><th scope="col">Concentrate</th><th scope="col">Water</th><th scope="col">Concentrate / water</th><th scope="col">At 6 water</th></tr></thead>
          <tbody>
            <tr><th scope="row">Glass A</th><td>2</td><td>3</td><td>2/3</td><td>4/6</td></tr>
            <tr><th scope="row">Jug B</th><td>5</td><td>6</td><td>5/6</td><td>5/6</td></tr>
          </tbody>
        </table>
      </div>
      <p className={styles["forge-ratio-observation"]}><code>2 × 6 = 12</code> and <code>5 × 3 = 15</code>. Because 12 &lt; 15, <code>2/3 &lt; 5/6</code> exactly.</p>
    </div>
  );
}

export function RatioInstrument({ view }: { readonly view: ExperimentView }) {
  return (
    <section className={styles["forge-ratio-instrument"]} aria-label="Exact proportional comparison">
      <header className={styles["forge-ratio-instrument-header"]}>
        <div><span>Controlled comparison</span><strong>Hold water constant</strong></div>
        <code>common amount: 6 cups</code>
      </header>
      {view === "parts" ? <PartsView /> : view === "common_water" ? <CommonWaterView /> : <TableView />}
    </section>
  );
}

