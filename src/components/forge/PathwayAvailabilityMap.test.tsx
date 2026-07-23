// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getCurrentPathwayAvailability } from "@/src/forge/pathways/public-availability";

import { PathwayAvailabilityMap } from "./PathwayAvailabilityMap";

afterEach(cleanup);

describe("PathwayAvailabilityMap", () => {
  it("renders all nine areas with text-labelled working mappings and gap states", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />);

    expect(screen.getByRole("heading", { name: "What FORGE can—and cannot—offer today." })).toBeInTheDocument();
    expect(screen.getByText("Not a curriculum, recommendation, or coverage claim.")).toBeInTheDocument();
    expect(screen.queryByText(/capability coverage/i)).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Current pathway availability by entitlement area" })).toBeInTheDocument();
    expect(screen.getAllByText("Working World mapping")).toHaveLength(4);
    expect(screen.getAllByText("Identified gap")).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "Compare and scale proportional relationships" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Distinguish net force from velocity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Keep historical claims inside their evidence boundary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Corroborate a model-generated factual claim" })).toBeInTheDocument();
  });

  it("derives the hero counts from the availability it receives", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability().slice(0, 2)} />);

    expect(screen.getByText(
      "1 working World mapping appears across 2 entitlement areas. 1 identified gap remains visible instead of being filled with a course list, a generated lesson, or a promise.",
    )).toBeInTheDocument();
  });

  it("gives released Worlds unique accessible actions and gives gaps no fake action", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />);

    const worldLinks = screen.getAllByRole("link", { name: /Open .+ World/ });
    expect(worldLinks).toHaveLength(4);
    expect(worldLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/learn/proportional-reasoning",
      "/learn/force-and-motion",
      "/learn/primary-source-reasoning",
      "/learn/ai-and-learning",
    ]);
    expect(new Set(worldLinks.map((link) => link.textContent)).size).toBe(4);

    for (const area of ["language-literacy", "arts-design", "practical-life", "civic-media", "health-movement"]) {
      const gap = screen.getByTestId(`pathway-identified-gap-${area}`);
      expect(within(gap).queryByRole("link")).not.toBeInTheDocument();
      expect(within(gap).queryByText(/return proof/i)).not.toBeInTheDocument();
      expect(within(gap).queryByText(/recommended|try next|schedule/i)).not.toBeInTheDocument();
    }
  });

  it("makes mode, source, and return-proof limits readable without a learner record", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />);

    const ratio = screen.getByTestId("pathway-released-capability-mathematics");
    expect(within(ratio).getByText("Available to")).toBeInTheDocument();
    expect(within(ratio).getByText("Child + grown-up · Teen · Adult")).toBeInTheDocument();
    expect(within(ratio).getByText("Child + grown-up: Authored only · Teen: Authored only · Adult: Authored only")).toBeInTheDocument();
    expect(within(ratio).getByText(/Return proof is not available/)).toBeInTheDocument();
    expect(screen.queryByText(/your evidence|your path|completed/i)).not.toBeInTheDocument();
  });

  it("keeps working routes distinct from reviewed publication and learner capability claims", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />);

    expect(screen.getByText("Working World mapping and identified gap stay equally visible.")).toBeInTheDocument();
    expect(screen.getByText(/not a coverage claim/i)).toBeInTheDocument();
    expect(screen.queryByText("Released capability")).not.toBeInTheDocument();
    expect(screen.queryByText(/your capability|released capability/i)).not.toBeInTheDocument();
  });
});
