import type {
  ForceSegment,
  SvgPlotOptions,
  Trajectory,
  TrajectoryConfig,
  TrajectoryMetadata,
  TrajectorySeries,
  TrajectorySample,
  TrajectorySegment,
} from "./types";

export const PHYSICS_EPSILON = 1e-9;

const sumForces = (forcesN: readonly number[]) => forcesN.reduce((sum, force) => sum + force, 0);

const freezeObject = <T extends object>(value: T): Readonly<T> => Object.freeze(value);
const freezeArray = <T>(value: readonly T[]): readonly T[] => Object.freeze([...value]);

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
}

function validateConfig(config: TrajectoryConfig): void {
  if (!(config.massKg > 0)) throw new Error("massKg must be greater than zero.");
  if (!(config.durationS > 0)) throw new Error("durationS must be greater than zero.");
  if (!(config.sampleIntervalS > 0)) throw new Error("sampleIntervalS must be greater than zero.");
  if (config.bounds.minPositionM > config.bounds.maxPositionM) throw new Error("Trajectory bounds are inverted.");
  assertFinite(config.initialPositionM, "initialPositionM");
  assertFinite(config.initialVelocityMps, "initialVelocityMps");

  let expectedStart = 0;
  for (const segment of config.segments) {
    assertFinite(segment.startTimeS, `${segment.id}.startTimeS`);
    assertFinite(segment.endTimeS, `${segment.id}.endTimeS`);
    if (Math.abs(segment.startTimeS - expectedStart) > PHYSICS_EPSILON) {
      throw new Error(`Segments must be contiguous; expected ${expectedStart}, got ${segment.startTimeS}.`);
    }
    if (!(segment.endTimeS > segment.startTimeS)) throw new Error(`${segment.id} must have positive duration.`);
    if ((segment.frictionForceN ?? 0) < 0) throw new Error(`${segment.id}.frictionForceN cannot be negative.`);
    segment.forcesN.forEach((force, index) => assertFinite(force, `${segment.id}.forcesN[${index}]`));
    expectedStart = segment.endTimeS;
  }
  if (Math.abs(expectedStart - config.durationS) > PHYSICS_EPSILON) {
    throw new Error(`Segments must end at durationS (${config.durationS}).`);
  }
}

function resolvedForce(segment: ForceSegment, velocityMps: number): number {
  const appliedForceN = sumForces(segment.forcesN);
  const frictionForceN = segment.frictionForceN ?? 0;
  if (Math.abs(velocityMps) <= PHYSICS_EPSILON || frictionForceN === 0) return appliedForceN;
  return appliedForceN - Math.sign(velocityMps) * frictionForceN;
}

function makeSegment(
  id: string,
  startTimeS: number,
  endTimeS: number,
  initialPositionM: number,
  initialVelocityMps: number,
  netForceN: number,
  massKg: number,
  stoppedByFriction: boolean,
): TrajectorySegment {
  return freezeObject({
    id,
    startTimeS,
    endTimeS,
    initialPositionM,
    initialVelocityMps,
    netForceN,
    accelerationMps2: netForceN / massKg,
    stoppedByFriction,
  });
}

function sampleResolvedSegment(segment: TrajectorySegment, timeS: number): TrajectorySample {
  const elapsedS = Math.min(Math.max(timeS - segment.startTimeS, 0), segment.endTimeS - segment.startTimeS);
  const velocityMps = segment.initialVelocityMps + segment.accelerationMps2 * elapsedS;
  const positionM = segment.initialPositionM + segment.initialVelocityMps * elapsedS + 0.5 * segment.accelerationMps2 * elapsedS ** 2;
  return freezeObject({
    timeS,
    forceN: segment.netForceN,
    accelerationMps2: segment.accelerationMps2,
    velocityMps: Math.abs(velocityMps) < PHYSICS_EPSILON ? 0 : velocityMps,
    positionM,
  });
}

/**
 * Resolves authored segments analytically. A friction-caused stop is represented
 * by a final zero-force subsegment, so no renderer needs to handle a reversal.
 */
export function resolveTrajectorySegments(config: TrajectoryConfig): readonly TrajectorySegment[] {
  validateConfig(config);
  const resolved: TrajectorySegment[] = [];
  let positionM = config.initialPositionM;
  let velocityMps = config.initialVelocityMps;

  for (const authored of config.segments) {
    const durationS = authored.endTimeS - authored.startTimeS;
    const netForceN = resolvedForce(authored, velocityMps);
    const accelerationMps2 = netForceN / config.massKg;
    const frictionForceN = authored.frictionForceN ?? 0;
    const opposesMotion = Math.abs(velocityMps) > PHYSICS_EPSILON && velocityMps * accelerationMps2 < -PHYSICS_EPSILON;
    const stopTimeS = opposesMotion ? -velocityMps / accelerationMps2 : Number.POSITIVE_INFINITY;
    const stopsInSegment = frictionForceN > 0 && stopTimeS > PHYSICS_EPSILON && stopTimeS < durationS - PHYSICS_EPSILON;

    if (stopsInSegment) {
      const movingEndS = authored.startTimeS + stopTimeS;
      const moving = makeSegment(
        `${authored.id}:moving`,
        authored.startTimeS,
        movingEndS,
        positionM,
        velocityMps,
        netForceN,
        config.massKg,
        true,
      );
      resolved.push(moving);
      positionM = sampleResolvedSegment(moving, movingEndS).positionM;
      velocityMps = 0;
      resolved.push(makeSegment(`${authored.id}:rest`, movingEndS, authored.endTimeS, positionM, 0, 0, config.massKg, true));
      continue;
    }

    const next = makeSegment(
      authored.id,
      authored.startTimeS,
      authored.endTimeS,
      positionM,
      velocityMps,
      netForceN,
      config.massKg,
      false,
    );
    resolved.push(next);
    const endpoint = sampleResolvedSegment(next, authored.endTimeS);
    positionM = endpoint.positionM;
    velocityMps = endpoint.velocityMps;
  }
  return freezeArray(resolved);
}

export function sampleTrajectoryAt(segments: readonly TrajectorySegment[], timeS: number): TrajectorySample {
  if (segments.length === 0) throw new Error("A trajectory must have at least one segment.");
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (timeS < first.startTimeS - PHYSICS_EPSILON || timeS > last.endTimeS + PHYSICS_EPSILON) {
    throw new Error(`Time ${timeS} is outside the trajectory.`);
  }
  // At an authored boundary expose the newly active force; position and velocity
  // remain continuous because the following segment starts from the prior endpoint.
  const segment = segments.find((candidate) => timeS < candidate.endTimeS - PHYSICS_EPSILON) ?? last;
  return sampleResolvedSegment(segment, Math.min(Math.max(timeS, first.startTimeS), last.endTimeS));
}

function sampleTimes(config: TrajectoryConfig, segments: readonly TrajectorySegment[]): readonly number[] {
  const values = new Set<number>([0, config.durationS]);
  for (let timeS = config.sampleIntervalS; timeS < config.durationS - PHYSICS_EPSILON; timeS += config.sampleIntervalS) {
    values.add(Number(timeS.toFixed(12)));
  }
  for (const segment of segments) {
    values.add(Number(segment.startTimeS.toFixed(12)));
    values.add(Number(segment.endTimeS.toFixed(12)));
  }
  return freezeArray([...values].sort((a, b) => a - b));
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function createMetadata(config: TrajectoryConfig, samples: readonly TrajectorySample[]): TrajectoryMetadata {
  const positions = samples.map((sample) => sample.positionM);
  const velocities = samples.map((sample) => sample.velocityMps);
  const minimumPositionM = Math.min(...positions);
  const maximumPositionM = Math.max(...positions);
  const minimumVelocityMps = Math.min(...velocities);
  const maximumVelocityMps = Math.max(...velocities);
  const finalSample = samples[samples.length - 1];
  const staysWithinBounds = minimumPositionM >= config.bounds.minPositionM - PHYSICS_EPSILON
    && maximumPositionM <= config.bounds.maxPositionM + PHYSICS_EPSILON;
  return freezeObject({
    minimumPositionM,
    maximumPositionM,
    minimumVelocityMps,
    maximumVelocityMps,
    endsAtRest: Math.abs(finalSample.velocityMps) <= PHYSICS_EPSILON,
    staysWithinBounds,
    textAlternative: `${config.title}: position ranges from ${formatNumber(minimumPositionM)} to ${formatNumber(maximumPositionM)} metres; velocity ranges from ${formatNumber(minimumVelocityMps)} to ${formatNumber(maximumVelocityMps)} metres per second and ends at ${formatNumber(finalSample.velocityMps)} metres per second.`,
  });
}

/** Returns a fully precomputed immutable trajectory; no rendering loop performs integration. */
export function simulateTrajectory(config: TrajectoryConfig): Trajectory {
  const segments = resolveTrajectorySegments(config);
  const samples = freezeArray(sampleTimes(config, segments).map((timeS) => sampleTrajectoryAt(segments, timeS)));
  return freezeObject({ config: freezeObject({ ...config, segments: freezeArray(config.segments.map((segment) => freezeObject({ ...segment, forcesN: freezeArray(segment.forcesN) }))) }), segments, samples, metadata: createMetadata(config, samples) });
}

/**
 * Convenience API for UI callers. The optional sampling interval only changes
 * display density; every sampled value is evaluated from the same equations.
 */
export function generateTrajectory(config: TrajectoryConfig, sampleIntervalS = config.sampleIntervalS): Trajectory {
  return simulateTrajectory({ ...config, sampleIntervalS });
}

/** Produces the compact immutable shape consumed directly by a graph or SVG component. */
export function toTrajectorySeries(id: TrajectorySeries["id"], title: string, trajectories: readonly Trajectory[]): TrajectorySeries {
  return freezeObject({
    id,
    title,
    trajectories: freezeArray(trajectories.map((trajectory) => freezeObject({
      id: trajectory.config.id,
      title: trajectory.config.title,
      samples: trajectory.samples,
      metadata: trajectory.metadata,
    }))),
  });
}

/** Converts precomputed samples to SVG polyline points for a graph. */
export function trajectoryToSvgPoints(trajectory: Trajectory, options: SvgPlotOptions): string {
  const padding = options.padding ?? 12;
  const innerWidth = options.width - padding * 2;
  const innerHeight = options.height - padding * 2;
  if (innerWidth <= 0 || innerHeight <= 0) throw new Error("SVG dimensions must exceed twice the padding.");
  const values = trajectory.samples.map((sample) => sample[options.value]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const duration = trajectory.config.durationS;
  return trajectory.samples.map((sample) => {
    const x = padding + (sample.timeS / duration) * innerWidth;
    const y = padding + (1 - (sample[options.value] - minValue) / valueRange) * innerHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function trajectoryToSvgPath(trajectory: Trajectory, options: SvgPlotOptions): string {
  const points = trajectoryToSvgPoints(trajectory, options).split(" ");
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.replace(",", " ")}`).join(" ");
}
