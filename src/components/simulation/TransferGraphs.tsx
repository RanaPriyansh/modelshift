import type { TransferChoiceId } from "@/src/types/modelshift";
import { generateTrajectory, getScenario, trajectoryToSvgPath } from "@/src/domain/physics";

interface TransferGraphChoiceProps {
  id: TransferChoiceId;
  name: string;
  selected: boolean;
  onSelect: (id: TransferChoiceId) => void;
}

const transferTrajectory = generateTrajectory(getScenario("cargo_pod_force_graph").trajectories[0]);
const transferDurationS = transferTrajectory.config.durationS;
const thrustDurationS = transferTrajectory.segments[0]?.endTimeS ?? 0;
const thrustForceN = transferTrajectory.segments[0]?.netForceN ?? 0;

function forceStepPath() {
  const left = 35;
  const right = 288;
  const baseline = 84;
  const top = 35;
  const maxForce = Math.max(...transferTrajectory.segments.map((segment) => Math.abs(segment.netForceN)), 1);
  let path = "";
  let previousY = baseline;
  transferTrajectory.segments.forEach((segment, index) => {
    const startX = left + (segment.startTimeS / transferDurationS) * (right - left);
    const endX = left + (segment.endTimeS / transferDurationS) * (right - left);
    const y = baseline - (segment.netForceN / maxForce) * (baseline - top);
    path += index === 0 ? `M${startX} ${y}` : ` L${startX} ${previousY} L${startX} ${y}`;
    path += ` L${endX} ${y}`;
    previousY = y;
  });
  return path;
}

const PATHS: Record<TransferChoiceId, string> = {
  returns_to_zero: "M20 92 L105 30 L170 30 L270 92",
  stays_constant_after_force: trajectoryToSvgPath(transferTrajectory, { width: 290, height: 108, padding: 20, value: "velocityMps" }),
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
      <svg viewBox="0 0 310 138" role="img" aria-label={`Net force is ${thrustForceN} newtons for ${thrustDurationS} second, then zero through ${transferDurationS} seconds.`}>
        <g className="graph-grid" aria-hidden="true">
          {[30, 57, 84, 111].map((y) => <line key={y} x1="35" x2="288" y1={y} y2={y} />)}
          {[35, 98, 161, 224, 288].map((x) => <line key={x} x1={x} x2={x} y1="25" y2="111" />)}
        </g>
        <line className="graph-axis" x1="35" x2="288" y1="84" y2="84" />
        <line className="graph-axis" x1="35" x2="35" y1="25" y2="111" />
        <path className="graph-line" fill="none" stroke="var(--teal)" d={forceStepPath()} />
        <text x="35" y="128">0</text><text x="278" y="128">{transferDurationS}s</text>
      </svg>
      <figcaption className="world-caption">The thruster produces a forward net force, then the net force becomes zero.</figcaption>
    </figure>
  );
}

export function TransferGraphChoice({ id, name, selected, onSelect }: TransferGraphChoiceProps) {
  return (
    <label className={["transfer-choice", selected ? "transfer-choice--selected" : ""].join(" ")}>
      <input type="radio" name={name} value={id} checked={selected} onChange={() => onSelect(id)} />
      <span className="transfer-choice__letter" aria-hidden="true">{id === "returns_to_zero" ? "A" : id === "stays_constant_after_force" ? "B" : "C"}</span>
      <svg viewBox="0 0 290 108" role="img" aria-label={LABELS[id]}>
        <g className="graph-grid" aria-hidden="true">
          {[18, 42, 66, 90].map((y) => <line key={y} x1="20" x2="270" y1={y} y2={y} />)}
          {[20, 103, 186, 270].map((x) => <line key={x} x1={x} x2={x} y1="12" y2="94" />)}
        </g>
        <path className="graph-line" fill="none" stroke="var(--gold)" d={PATHS[id]} />
      </svg>
      <span className="sr-only">{LABELS[id]}</span>
    </label>
  );
}
