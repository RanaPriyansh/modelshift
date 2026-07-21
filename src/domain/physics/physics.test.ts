import { describe, expect, it } from "vitest";

import { AUTHORED_SCENARIOS, sampleTrajectoryAt, simulateTrajectory, trajectoryToSvgPath } from "./index";
import type { TrajectoryConfig } from "./types";

const config = (overrides: Partial<TrajectoryConfig>): TrajectoryConfig => ({
  id: "test",
  title: "Test trajectory",
  massKg: 2,
  initialPositionM: 0,
  initialVelocityMps: 4,
  durationS: 4,
  sampleIntervalS: 0.1,
  bounds: { minPositionM: -10, maxPositionM: 100 },
  segments: [{ id: "whole", startTimeS: 0, endTimeS: 4, forcesN: [0] }],
  ...overrides,
});

describe("analytical 1-D physics", () => {
  it("preserves velocity under zero net force", () => {
    const trajectory = simulateTrajectory(config({}));
    expect(trajectory.samples.at(-1)?.velocityMps).toBeCloseTo(4);
    expect(trajectory.samples.every((sample) => sample.accelerationMps2 === 0)).toBe(true);
  });

  it("cancels equal and opposite forces", () => {
    const trajectory = simulateTrajectory(config({ segments: [{ id: "balanced", startTimeS: 0, endTimeS: 4, forcesN: [12, -12] }] }));
    expect(trajectory.samples.at(-1)?.velocityMps).toBeCloseTo(4);
    expect(trajectory.samples[0].forceN).toBe(0);
  });

  it("scales acceleration with force and inverse mass", () => {
    const base = simulateTrajectory(config({ initialVelocityMps: 0, segments: [{ id: "force", startTimeS: 0, endTimeS: 4, forcesN: [6] }] }));
    const doubledForce = simulateTrajectory(config({ initialVelocityMps: 0, segments: [{ id: "force", startTimeS: 0, endTimeS: 4, forcesN: [12] }] }));
    const doubledMass = simulateTrajectory(config({ massKg: 4, initialVelocityMps: 0, segments: [{ id: "force", startTimeS: 0, endTimeS: 4, forcesN: [6] }] }));
    expect(doubledForce.samples[0].accelerationMps2).toBeCloseTo(base.samples[0].accelerationMps2 * 2);
    expect(doubledMass.samples[0].accelerationMps2).toBeCloseTo(base.samples[0].accelerationMps2 / 2);
  });

  it("slows with friction and clamps at rest without reversal", () => {
    const trajectory = simulateTrajectory(config({
      initialVelocityMps: 3,
      segments: [{ id: "friction", startTimeS: 0, endTimeS: 4, forcesN: [0], frictionForceN: 2 }],
    }));
    expect(trajectory.segments).toHaveLength(2);
    expect(trajectory.samples.every((sample) => sample.velocityMps >= 0)).toBe(true);
    expect(trajectory.samples.at(-1)?.velocityMps).toBe(0);
    expect(trajectory.samples.at(-1)?.positionM).toBeCloseTo(4.5);
  });

  it("keeps position and velocity continuous at authored and friction-stop boundaries", () => {
    const trajectory = simulateTrajectory(config({
      initialVelocityMps: 3,
      segments: [
        { id: "push", startTimeS: 0, endTimeS: 1, forcesN: [2] },
        { id: "friction", startTimeS: 1, endTimeS: 4, forcesN: [0], frictionForceN: 4 },
      ],
    }));
    for (const segment of trajectory.segments.slice(1)) {
      const before = sampleTrajectoryAt(trajectory.segments, segment.startTimeS - 1e-10);
      const at = sampleTrajectoryAt(trajectory.segments, segment.startTimeS);
      expect(at.positionM).toBeCloseTo(before.positionM, 7);
      expect(at.velocityMps).toBeCloseTo(before.velocityMps, 7);
    }
  });

  it("is deterministic for repeated input", () => {
    const input = config({});
    expect(simulateTrajectory(input)).toEqual(simulateTrajectory(input));
  });

  it("keeps every authored trajectory within its declared bounds", () => {
    for (const scenario of Object.values(AUTHORED_SCENARIOS)) {
      for (const authored of scenario.trajectories) expect(simulateTrajectory(authored).metadata.staysWithinBounds).toBe(true);
    }
  });

  it("has frame-rate-independent analytical outcomes while exposing SVG-ready samples", () => {
    const coarse = simulateTrajectory(config({ sampleIntervalS: 1 }));
    const fine = simulateTrajectory(config({ sampleIntervalS: 1 / 60 }));
    expect(coarse.samples.at(-1)).toMatchObject(fine.samples.at(-1) ?? {});
    expect(trajectoryToSvgPath(fine, { width: 320, height: 160, value: "velocityMps" })).toMatch(/^M/);
  });
});
