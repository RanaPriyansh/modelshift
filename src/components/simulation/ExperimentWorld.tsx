import { useMemo, type CSSProperties } from "react";
import { generateTrajectory, getScenario } from "@/src/domain/physics";
import type { Trajectory, TrajectoryConfig } from "@/src/domain/physics";
import type { ProbeId } from "@/src/types/modelshift";
import { LineGraph, type GraphPoint } from "./LineGraph";

interface ExperimentWorldProps {
  revealed: boolean;
  frictionStrength: number;
  probeId: ProbeId;
}

interface TrackCopy {
  force: string;
  velocity: string;
  outcome: string;
}

const TRACK_COPY: Record<ProbeId, [TrackCopy, TrackCopy]> = {
  friction_contrast: [
    { force: "net force = 0 N", velocity: "velocity stays constant →", outcome: "coasts" },
    { force: "friction ←", velocity: "velocity decreases →", outcome: "slows" },
  ],
  brief_vs_continuous_force: [
    { force: "force ends at 1 s", velocity: "velocity becomes constant →", outcome: "coasts" },
    { force: "force continues →", velocity: "velocity keeps changing →", outcome: "accelerates" },
  ],
  zero_force_velocity_contrast: [
    { force: "net force = 0 N", velocity: "starts at rest", outcome: "stays at rest" },
    { force: "net force = 0 N", velocity: "already moving →", outcome: "keeps moving" },
  ],
  neutral_core_probe: [
    { force: "net force = 0 N", velocity: "velocity stays constant →", outcome: "coasts" },
    { force: "friction ←", velocity: "velocity decreases →", outcome: "slows" },
  ],
};

function withFrictionStrength(config: TrajectoryConfig, strength: number): TrajectoryConfig {
  if (!config.segments.some((segment) => (segment.frictionForceN ?? 0) > 0)) return config;
  const frictionForceN = 0.8 + (strength / 100) * 2.2;
  return {
    ...config,
    segments: config.segments.map((segment) => segment.frictionForceN ? { ...segment, frictionForceN } : segment),
  };
}

function asGraphPoints(trajectory: Trajectory): GraphPoint[] {
  return trajectory.samples.map((sample) => ({ t: sample.timeS, value: sample.velocityMps }));
}

function Track({ title, copy, revealed, endProgress }: { title: string; copy: TrackCopy; revealed: boolean; endProgress: number }) {
  const puckStyle = { "--puck-end-left": `${14 + 62 * endProgress}%` } as CSSProperties;
  return (
    <div className="track">
      <div className="track__labels">
        <strong>{title}</strong>
        <span>{copy.force}</span>
      </div>
      <div className="track__world" aria-label={`${title}: ${copy.outcome}. ${copy.force}. ${copy.velocity}.`}>
        <span className={["puck", revealed ? "puck--revealed" : ""].join(" ")} style={puckStyle} />
        <span className={copy.force.includes("←") ? "track__friction-arrow" : "track__zero-force"}>{copy.force}</span>
        <span className="track__velocity-arrow">{copy.velocity}</span>
        <span className="track__rail" />
      </div>
    </div>
  );
}

export function ExperimentWorld({ revealed, frictionStrength, probeId }: ExperimentWorldProps) {
  const trajectories = useMemo(() => {
    const scenario = getScenario(probeId);
    return scenario.trajectories.map((config) => generateTrajectory(withFrictionStrength(config, frictionStrength)));
  }, [frictionStrength, probeId]);
  const copy = TRACK_COPY[probeId];
  const displacements = trajectories.map((trajectory) => {
    const first = trajectory.samples[0]?.positionM ?? 0;
    const last = trajectory.samples[trajectory.samples.length - 1]?.positionM ?? first;
    return Math.max(0, last - first);
  });
  const maximumDisplacement = Math.max(...displacements, 0);
  const observation = probeId === "brief_vs_continuous_force"
    ? "The brief-push puck keeps the velocity it had when force became zero. The continuing force keeps changing the other puck's velocity."
    : probeId === "zero_force_velocity_contrast"
      ? "Both pucks have zero net force. Rest stays rest, while the puck that already had velocity keeps that velocity."
      : "Same short push. Different force afterward. Only the puck with friction changes velocity.";

  return (
    <section className="experiment-world" aria-label="Side-by-side deterministic experiment">
      <div className="experiment-world__tracks">
        {trajectories.map((trajectory, index) => (
          <Track
            key={trajectory.config.id}
            title={trajectory.config.title}
            copy={copy[index] ?? copy[0]}
            revealed={revealed}
            endProgress={maximumDisplacement > 0 ? displacements[index] / maximumDisplacement : 0}
          />
        ))}
      </div>
      <div className="experiment-world__graphs">
        {trajectories.map((trajectory) => (
          <LineGraph
            key={trajectory.config.id}
            title={trajectory.config.title}
            description={trajectory.metadata.textAlternative}
            series={[{ label: "velocity", color: "gold", points: asGraphPoints(trajectory) }]}
          />
        ))}
      </div>
      {revealed ? <p className="observation-callout" role="status">{observation}</p> : null}
    </section>
  );
}
