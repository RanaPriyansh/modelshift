// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityResearchReadinessFixtureScenarios } from "@/app/internal/university-research-readiness/research-readiness-fixture.server";
import { projectUniversityResearchReadiness } from "@/src/forge/university-research-operations";

import {
  UniversityResearchReadinessUnavailable,
  UniversityResearchReadinessWorkspace,
} from "./UniversityResearchReadinessWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWorkspace() {
  const scenarios = await universityResearchReadinessFixtureScenarios();
  return {
    scenarios,
    ...render(<UniversityResearchReadinessWorkspace scenarios={scenarios} />),
  };
}

describe("UniversityResearchReadinessWorkspace", () => {
  it("leads with the permission boundary and five ordered readiness gates", async () => {
    await renderWorkspace();

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Rehearsal is not permission.",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Repair the protocol before any rehearsal.",
    })).toBeInTheDocument();

    const readiness = screen.getByRole("region", {
      name: "Research readiness gates",
    });
    expect(readiness).toHaveTextContent("Protocol");
    expect(readiness).toHaveTextContent("Comparator");
    expect(readiness).toHaveTextContent("Approval");
    expect(readiness).toHaveTextContent("Operator");
    expect(readiness).toHaveTextContent("Preflight");
    expect(readiness.querySelectorAll("li")).toHaveLength(5);
    expect(readiness.querySelector('[data-tone="stopped"]')).toHaveTextContent(
      "Protocol",
    );
    expect(readiness).toHaveTextContent("Protocol stopped");
    expect(readiness).toHaveTextContent("Not evaluated");
  });

  it("maps all five fixture projections to their exact visible status", async () => {
    const { container } = await renderWorkspace();
    const cases = [
      ["Invalid protocol", "draft_invalid", "Repair the protocol before any rehearsal."],
      ["Missing approval", "approval_required", "Approval is missing. Stop here."],
      ["Operator gap", "operator_gap", "Every required role needs a fixture placeholder."],
      ["Comparator mismatch", "substitute_mismatch", "The comparator must answer the same question."],
      ["Synthetic plan coherent", "synthetic_plan_coherent", "The synthetic preflight plan is internally coherent."],
    ] as const;

    for (const [radio, status, heading] of cases) {
      fireEvent.click(screen.getByRole("radio", { name: radio }));
      expect(container.querySelector("article")).toHaveAttribute(
        "data-status",
        status,
      );
      expect(screen.getByRole("heading", {
        level: 2,
        name: heading,
      })).toBeInTheDocument();
    }
  });

  it("shows separate protocol, approval, operator, comparator, and sample facts", async () => {
    await renderWorkspace();
    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));

    expect(screen.getByText(
      /university-observation-protocol\.phase-minus-one/,
    )).toBeInTheDocument();
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    expect(screen.getByText("6 of 6 required roles")).toBeInTheDocument();
    expect(screen.getByText(
      "Information and task declarations align; schedule is locked",
    )).toBeInTheDocument();
    expect(screen.getByText(
      "Future adult-only target: 5-10; current fixture: no people",
    )).toBeInTheDocument();
    expect(screen.getByText("Fixture references bound")).toBeInTheDocument();
    expect(screen.getByText("Fixture roles represented")).toBeInTheDocument();
    expect(screen.getByText("Plan coherent")).toBeInTheDocument();
    expect(screen.getAllByText("Not allowed").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/does not establish approval/)).toBeInTheDocument();
  });

  it("does not present downstream facts as evaluated after a protocol stop", async () => {
    await renderWorkspace();

    expect(screen.getAllByText("Supplied, not evaluated")).toHaveLength(5);
    expect(screen.queryByText("4 of 4")).not.toBeInTheDocument();
    expect(screen.queryByText("6 of 6 required roles")).not.toBeInTheDocument();
    expect(screen.queryByText(
      "Information and task declarations align; schedule is locked",
    )).not.toBeInTheDocument();
    expect(screen.getByText(/\(supplied, stopped\)$/)).toBeInTheDocument();
  });

  it("distinguishes structurally unexposed facts from supplied semantic drift", async () => {
    const projection = await projectUniversityResearchReadiness({
      schemaVersion: "university-research-readiness-request.v1",
    });
    render(
      <UniversityResearchReadinessWorkspace
        scenarios={[{
          id: "invalid-protocol",
          label: "Invalid protocol",
          projection,
        }]}
      />,
    );

    expect(screen.getAllByText("Not exposed")).toHaveLength(7);
    expect(screen.queryByText("Supplied, not evaluated")).not.toBeInTheDocument();
    expect(screen.getByText(/Invalid input/)).toBeInTheDocument();
  });

  it("announces only a concise status update when the selected scenario changes", async () => {
    await renderWorkspace();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Protocol stopped. Repair the protocol before any rehearsal.",
    );
    expect(status).not.toHaveTextContent("Declared approvals");

    fireEvent.click(screen.getByRole("radio", {
      name: "Synthetic plan coherent",
    }));
    expect(status).toHaveTextContent(
      "Caller-asserted plan coherent. The synthetic preflight plan is internally coherent.",
    );
    expect(status).not.toHaveTextContent("Future adult-only target");
  });

  it("uses native local controls without action routes or browser effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "clipboard",
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      const { container } = await renderWorkspace();
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(5);
      radios.forEach((radio) => {
        expect(radio).not.toHaveAttribute("tabindex", "-1");
      });

      fireEvent.click(screen.getByRole("radio", {
        name: "Synthetic plan coherent",
      }));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain("—");
      expect(container.textContent).not.toContain("–");
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("fails closed when no fixture scenarios are supplied", () => {
    const { rerender } = render(
      <UniversityResearchReadinessWorkspace scenarios={[]} />,
    );
    expect(screen.getByRole("heading", {
      level: 1,
      name: "No university research-readiness state is available.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(<UniversityResearchReadinessUnavailable />);
    expect(screen.getByText(
      /No protocol, approval, operator plan, comparator, sample, participant, recording, or research evidence was exposed/,
    )).toBeInTheDocument();
  });
});
