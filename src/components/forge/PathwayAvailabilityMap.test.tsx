// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getCurrentPathwayAvailability } from "@/src/forge/pathways/public-availability";

import { PathwayAvailabilityMap } from "./PathwayAvailabilityMap";

afterEach(cleanup);

describe("PathwayAvailabilityMap", () => {
  it("renders all nine areas with text-labelled released capability and gap states", () => {
    render(<PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />);

    expect(screen.getByRole("heading", { name: "What FORGE can—and cannot—offer today." })).toBeInTheDocument();
    expect(screen.getByText("Not a curriculum. Not a recommendation.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Current pathway availability by entitlement area" })).toBeInTheDocument();
    expect(screen.getAllByText("Released capability")).toHaveLength(4);
    expect(screen.getAllByText("Identified gap")).toHaveLength(5);
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
});
