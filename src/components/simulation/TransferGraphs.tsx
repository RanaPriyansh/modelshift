import type { TransferChoiceId } from "@/src/types/modelshift";

interface TransferGraphChoiceProps {
  id: TransferChoiceId;
  selected: boolean;
  onSelect: (id: TransferChoiceId) => void;
}

const PATHS: Record<TransferChoiceId, string> = {
  returns_to_zero: "M20 92 L105 30 L170 30 L270 92",
  stays_constant_after_force: "M20 92 L105 30 L270 30",
  keeps_accelerating: "M20 92 L105 52 L270 12",
};

const LABELS: Record<TransferChoiceId, string> = {
  returns_to_zero: "Velocity rises during the thrust and then returns to zero.",
  stays_constant_after_force: "Velocity rises during the thrust and then stays constant above zero.",
  keeps_accelerating: "Velocity rises during and after the thrust.",
};

export function ForceTimeGraph() {
  return (
    <figure className="transfer-force-graph">
      <div className="line-graph__header"><strong>Force vs. time</strong><span>net force</span></div>
      <svg viewBox="0 0 310 138" role="img" aria-label="Net force is positive for two seconds and then becomes zero for the rest of the graph.">
        <g className="graph-grid" aria-hidden="true">
          {[30, 57, 84, 111].map((y) => <line key={y} x1="35" x2="288" y1={y} y2={y} />)}
          {[35, 98, 161, 224, 288].map((x) => <line key={x} x1={x} x2={x} y1="25" y2="111" />)}
        </g>
        <line className="graph-axis" x1="35" x2="288" y1="84" y2="84" />
        <line className="graph-axis" x1="35" x2="35" y1="25" y2="111" />
        <polyline className="graph-line" fill="none" stroke="var(--teal)" points="35,84 78,84 78,35 144,35 144,84 288,84" />
        <text x="35" y="128">0</text><text x="278" y="128">8s</text>
      </svg>
      <figcaption className="world-caption">The thruster produces a forward net force, then the net force becomes zero.</figcaption>
    </figure>
  );
}

export function TransferGraphChoice({ id, selected, onSelect }: TransferGraphChoiceProps) {
  return (
    <label className={["transfer-choice", selected ? "transfer-choice--selected" : ""].join(" ")}>
      <input type="radio" name="transfer-graph" value={id} checked={selected} onChange={() => onSelect(id)} />
      <span className="transfer-choice__letter" aria-hidden="true">{id === "returns_to_zero" ? "A" : id === "stays_constant_after_force" ? "B" : "C"}</span>
      <svg viewBox="0 0 290 108" role="img" aria-label={LABELS[id]}>
        <g className="graph-grid" aria-hidden="true">
          {[18, 42, 66, 90].map((y) => <line key={y} x1="20" x2="270" y1={y} y2={y} />)}
          {[20, 103, 186, 270].map((x) => <line key={x} x1={x} x2={x} y1="12" y2="94" />)}
        </g>
        <polyline className="graph-line" fill="none" stroke="var(--gold)" points={PATHS[id]} />
      </svg>
      <span className="sr-only">{LABELS[id]}</span>
    </label>
  );
}
