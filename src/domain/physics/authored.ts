import type { ProbeId } from "@/src/types/modelshift";

import { generateTrajectory, toTrajectorySeries } from "./engine";
import type { AuthoredScenario, AuthoredScenarioId, TrajectoryConfig, TrajectorySeries } from "./types";

const bounds = { minPositionM: -1, maxPositionM: 60 } as const;

const mystery: TrajectoryConfig = {
  id: "mystery_coast",
  title: "Cargo craft after the engine switches off",
  massKg: 2,
  initialPositionM: 0,
  initialVelocityMps: 0,
  durationS: 6,
  sampleIntervalS: 0.1,
  bounds,
  segments: [
    { id: "thrust", startTimeS: 0, endTimeS: 1, forcesN: [6] },
    { id: "coast", startTimeS: 1, endTimeS: 6, forcesN: [0] },
  ],
};

const transfer: TrajectoryConfig = {
  id: "transfer_cargo_pod",
  title: "Cargo pod force-time transfer",
  massKg: 2,
  initialPositionM: 0,
  initialVelocityMps: 0,
  durationS: 5,
  sampleIntervalS: 0.1,
  bounds,
  segments: [
    { id: "brief_thrust", startTimeS: 0, endTimeS: 1, forcesN: [4] },
    { id: "zero_net_force", startTimeS: 1, endTimeS: 5, forcesN: [0] },
  ],
};

const authoredProbes: Record<ProbeId, AuthoredScenario> = {
  friction_contrast: {
    id: "friction_contrast",
    title: "Friction or no friction?",
    trajectories: [
      { ...mystery, id: "friction_contrast_no_resistance", title: "No-resistance puck" },
      {
        ...mystery,
        id: "friction_contrast_friction",
        title: "Friction puck",
        segments: [
          { id: "thrust", startTimeS: 0, endTimeS: 1, forcesN: [6] },
          { id: "friction", startTimeS: 1, endTimeS: 6, forcesN: [0], frictionForceN: 2 },
        ],
      },
    ],
  },
  brief_vs_continuous_force: {
    id: "brief_vs_continuous_force",
    title: "Brief push or continuous push?",
    trajectories: [
      { ...mystery, id: "brief_push", title: "Brief-push puck" },
      {
        ...mystery,
        id: "continuous_push",
        title: "Continuous-push puck",
        segments: [{ id: "continuous_thrust", startTimeS: 0, endTimeS: 6, forcesN: [6] }],
      },
    ],
  },
  zero_force_velocity_contrast: {
    id: "zero_force_velocity_contrast",
    title: "Same force, different starting motion",
    trajectories: [
      {
        ...mystery,
        id: "zero_force_rest",
        title: "Puck initially at rest",
        segments: [{ id: "zero_force", startTimeS: 0, endTimeS: 6, forcesN: [0] }],
      },
      {
        ...mystery,
        id: "zero_force_moving",
        title: "Puck already moving",
        initialVelocityMps: 3,
        segments: [{ id: "zero_force", startTimeS: 0, endTimeS: 6, forcesN: [0] }],
      },
    ],
  },
  neutral_core_probe: {
    id: "neutral_core_probe",
    title: "The baseline coast test",
    trajectories: [
      { ...mystery, id: "neutral_coast", title: "Force-free coast" },
      {
        ...mystery,
        id: "neutral_friction",
        title: "Frictional slowing",
        segments: [
          { id: "thrust", startTimeS: 0, endTimeS: 1, forcesN: [6] },
          { id: "friction", startTimeS: 1, endTimeS: 6, forcesN: [0], frictionForceN: 2 },
        ],
      },
    ],
  },
};

export const AUTHORED_SCENARIOS: Readonly<Record<"mystery_force_cutoff" | "cargo_pod_force_graph", AuthoredScenario> & Record<ProbeId, AuthoredScenario>> = Object.freeze({
  mystery_force_cutoff: Object.freeze({ id: "mystery_force_cutoff", title: "The engine is off", trajectories: Object.freeze([mystery]) }),
  cargo_pod_force_graph: Object.freeze({ id: "cargo_pod_force_graph", title: "New cargo pod", trajectories: Object.freeze([transfer]) }),
  ...Object.fromEntries(Object.entries(authoredProbes).map(([id, scenario]) => [id, Object.freeze({ ...scenario, trajectories: Object.freeze([...scenario.trajectories]) })])),
}) as Readonly<Record<"mystery_force_cutoff" | "cargo_pod_force_graph", AuthoredScenario> & Record<ProbeId, AuthoredScenario>>;

export const AUTHORED_PROBE_TRAJECTORIES: Readonly<Record<ProbeId, AuthoredScenario>> = Object.freeze(
  Object.fromEntries((Object.keys(authoredProbes) as ProbeId[]).map((id) => [id, AUTHORED_SCENARIOS[id]])) as Readonly<Record<ProbeId, AuthoredScenario>>,
);

/** Returns the immutable authored configuration for any mystery, probe, or transfer scene. */
export function getScenario(id: AuthoredScenarioId): AuthoredScenario {
  return AUTHORED_SCENARIOS[id];
}

/** Precomputes a renderer-ready series. Rendering may select samples but must not integrate. */
export function generateScenarioSeries(id: AuthoredScenarioId, sampleIntervalS?: number): TrajectorySeries {
  const scenario = getScenario(id);
  return toTrajectorySeries(
    scenario.id,
    scenario.title,
    scenario.trajectories.map((trajectory) => generateTrajectory(trajectory, sampleIntervalS)),
  );
}
