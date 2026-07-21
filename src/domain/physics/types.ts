import type { ProbeId } from "@/src/types/modelshift";

/** A signed horizontal force. Positive values point right. */
export interface ForceSegment {
  readonly id: string;
  readonly startTimeS: number;
  readonly endTimeS: number;
  /** Signed non-friction forces applied during this interval, in newtons. */
  readonly forcesN: readonly number[];
  /** Magnitude of kinetic friction in newtons. It always opposes current motion. */
  readonly frictionForceN?: number;
}

export interface TrajectoryBounds {
  readonly minPositionM: number;
  readonly maxPositionM: number;
}

export interface TrajectoryConfig {
  readonly id: string;
  readonly title: string;
  readonly massKg: number;
  readonly initialPositionM: number;
  readonly initialVelocityMps: number;
  readonly durationS: number;
  readonly sampleIntervalS: number;
  readonly segments: readonly ForceSegment[];
  readonly bounds: TrajectoryBounds;
}

export interface TrajectorySample {
  readonly timeS: number;
  readonly forceN: number;
  readonly accelerationMps2: number;
  readonly velocityMps: number;
  readonly positionM: number;
}

/** A resolved interval, including the interval inserted when friction stops an object. */
export interface TrajectorySegment {
  readonly id: string;
  readonly startTimeS: number;
  readonly endTimeS: number;
  readonly initialPositionM: number;
  readonly initialVelocityMps: number;
  readonly netForceN: number;
  readonly accelerationMps2: number;
  readonly stoppedByFriction: boolean;
}

export interface TrajectoryMetadata {
  readonly minimumPositionM: number;
  readonly maximumPositionM: number;
  readonly minimumVelocityMps: number;
  readonly maximumVelocityMps: number;
  readonly endsAtRest: boolean;
  readonly staysWithinBounds: boolean;
  readonly textAlternative: string;
}

export interface Trajectory {
  readonly config: TrajectoryConfig;
  readonly segments: readonly TrajectorySegment[];
  readonly samples: readonly TrajectorySample[];
  readonly metadata: TrajectoryMetadata;
}

/** The renderer-facing shape: values are all analytical samples, never frame-loop state. */
export interface RenderableTrajectory {
  readonly id: string;
  readonly title: string;
  readonly samples: readonly TrajectorySample[];
  readonly metadata: TrajectoryMetadata;
}

export type AuthoredScenarioId = "mystery_force_cutoff" | "cargo_pod_force_graph" | ProbeId;

export interface AuthoredScenario {
  readonly id: AuthoredScenarioId;
  readonly title: string;
  readonly trajectories: readonly TrajectoryConfig[];
}

/** A labelled collection of precomputed trajectories such as a two-track probe. */
export interface TrajectorySeries {
  readonly id: AuthoredScenarioId;
  readonly title: string;
  readonly trajectories: readonly RenderableTrajectory[];
}

export interface SvgPlotOptions {
  readonly width: number;
  readonly height: number;
  readonly padding?: number;
  readonly value: "positionM" | "velocityMps" | "forceN" | "accelerationMps2";
}
