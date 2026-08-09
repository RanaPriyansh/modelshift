// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universitySemesterLoopFixtureScenarios } from "@/app/internal/university-semester-loop/semester-loop-fixture.server";

import {
  UniversitySemesterLoopUnavailable,
  UniversitySemesterLoopWorkspace,
} from "./UniversitySemesterLoopWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWorkspace() {
  const scenarios = await universitySemesterLoopFixtureScenarios();
  return {
    scenarios,
    ...render(<UniversitySemesterLoopWorkspace scenarios={scenarios} />),
  };
}

describe("UniversitySemesterLoopWorkspace", () => {
  it("leads with one job and the connected five-stage semester journey", async () => {
    await renderWorkspace();

    expect(screen.getByRole("heading", {
      level: 1,
      name: "One semester. One honest next move.",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Inspect how help turns off before proof.",
    })).toBeInTheDocument();

    const journey = screen.getByRole("navigation", {
      name: "Semester learning loop",
    });
    expect(journey).toHaveTextContent("Sources");
    expect(journey).toHaveTextContent("Today");
    expect(journey).toHaveTextContent("Recovery");
    expect(journey).toHaveTextContent("Protected study");
    expect(journey).toHaveTextContent("Return");
    expect(journey.querySelectorAll("li")).toHaveLength(5);
    expect(journey.querySelector('[aria-current="step"]')).toHaveTextContent(
      "Protected study",
    );
  });

  it("shows exact scope, time, source, capacity, action, and World boundaries", async () => {
    await renderWorkspace();

    expect(screen.getByText("CS102: Evidence and computation")).toBeInTheDocument();
    expect(screen.getByText("term.sample-autumn-2026 / course.sample-cs102")).toBeInTheDocument();
    expect(screen.getByText("2026-08-25T09:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("connected sources reviewed")).toBeInTheDocument();
    expect(screen.getByText("60 minutes")).toBeInTheDocument();
    expect(screen.getByText("Test one claim against two sources")).toBeInTheDocument();
    expect(screen.getByText("world.source-corroboration / 1.0.1")).toBeInTheDocument();
    expect(screen.getByText("Off")).toBeInTheDocument();
    expect(screen.getAllByText("Not allowed").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not establish live data/)).toBeInTheDocument();
  });

  it("renders the only allowed route for each actionable state", async () => {
    await renderWorkspace();

    const protectedStudyLink = screen.getByRole("link", {
      name: "Inspect protected study brief",
    });
    expect(protectedStudyLink).toHaveAccessibleName(
      "Inspect protected study brief",
    );
    expect(protectedStudyLink).toHaveAttribute(
      "href",
      "/internal/university-protected-study",
    );
    expect(protectedStudyLink).toHaveAccessibleDescription(
      "Preview only. No course state, learner session, completion, evidence, or progress transfers or saves.",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(screen.getByRole("radio", { name: "Source review" }));
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Review what the copied sources disagree about.",
    })).toBeInTheDocument();
    const sourceReviewLink = screen.getByRole("link", {
      name: "Review copied sources",
    });
    expect(sourceReviewLink).toHaveAccessibleName("Review copied sources");
    expect(sourceReviewLink).toHaveAttribute(
      "href",
      "/internal/university-source-review",
    );
    expect(sourceReviewLink).toHaveAccessibleDescription(
      "Opens a separate synthetic review. No decision or source state transfers or saves.",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(screen.getByRole("radio", { name: "Capacity break" }));
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Rebuild from the time you actually have.",
    })).toBeInTheDocument();
    const recoveryLink = screen.getByRole("link", {
      name: "Inspect recovery draft",
    });
    expect(recoveryLink).toHaveAccessibleName("Inspect recovery draft");
    expect(recoveryLink).toHaveAttribute(
      "href",
      "/internal/university-recovery",
    );
    expect(recoveryLink).toHaveAccessibleDescription(
      "Opens a separate synthetic draft. No capacity, classification, message, or plan transfers or saves.",
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("heading", {
      level: 2,
      name: "The work stays whole.",
    })).toBeInTheDocument();
  });

  it("keeps every refusal and terminal state free of route controls", async () => {
    await renderWorkspace();

    const states = [
      ["Tight window", "You decide whether this tight window is workable."],
      ["World changed", "The reviewed learning activity changed."],
      ["Path complete", "This action is complete. The course is not."],
      ["Path blocked", "The accepted action is blocked. Do not route around it."],
    ] as const;

    for (const [radio, heading] of states) {
      fireEvent.click(screen.getByRole("radio", { name: radio }));
      expect(screen.getByRole("heading", {
        level: 2,
        name: heading,
      })).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("maps all seven projections to their exact visible status", async () => {
    const { container } = await renderWorkspace();
    const cases = [
      ["Ready", "protected_study_ready"],
      ["Source review", "source_review_required"],
      ["Capacity break", "recovery_required"],
      ["Tight window", "learner_choice_required"],
      ["World changed", "world_review_required"],
      ["Path complete", "path_complete"],
      ["Path blocked", "path_blocked"],
    ] as const;

    for (const [radio, status] of cases) {
      fireEvent.click(screen.getByRole("radio", { name: radio }));
      expect(container.querySelector("article")).toHaveAttribute(
        "data-status",
        status,
      );
    }
  });

  it("uses native local controls without fetch, storage, or clipboard writes", async () => {
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
      expect(radios).toHaveLength(7);
      radios.forEach((radio) => {
        expect(radio).not.toHaveAttribute("tabindex", "-1");
      });

      fireEvent.click(screen.getByRole("radio", { name: "World changed" }));
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
      <UniversitySemesterLoopWorkspace scenarios={[]} />,
    );
    expect(screen.getByRole("heading", {
      level: 1,
      name: "No university semester-loop research state is available.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(<UniversitySemesterLoopUnavailable />);
    expect(screen.getByText(
      /No source, action, recovery draft, World, session, message, or evidence was exposed/,
    )).toBeInTheDocument();
  });
});
