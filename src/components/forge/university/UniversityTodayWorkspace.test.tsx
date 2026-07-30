// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityTodayFixtureScenarios } from "@/app/internal/university-today/today-fixture.server";

import { UniversityTodayWorkspace } from "./UniversityTodayWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityTodayWorkspace", () => {
  it("makes one accepted-path action dominant without implying a source-based recommendation", async () => {
    render(<UniversityTodayWorkspace scenarios={await universityTodayFixtureScenarios()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Test one claim against two sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspect protected study brief" })).toHaveAttribute(
      "href",
      "/internal/university-protected-study",
    );
    expect(screen.getByText(/It is next in an existing learner-accepted path/)).toBeInTheDocument();
    expect(screen.getByText(/Course-source facts explain context only/)).toBeInTheDocument();
    expect(screen.getByText(/60 minutes available, 30-45 minutes fixture-authored effort/)).toBeInTheDocument();
    expect(screen.getByText(/No action, course state, or session is transferred or saved/)).toBeInTheDocument();
  });

  it("replaces the action with source recovery when copied facts conflict", async () => {
    render(<UniversityTodayWorkspace scenarios={await universityTodayFixtureScenarios()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Source conflict" }));

    expect(screen.getByRole("heading", { level: 1, name: "Resolve the course-source conflict first." })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inspect protected study brief" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review source copies" })).toHaveAttribute("href", "/internal/university-source-review");
    expect(screen.getByText(/has not chosen between copied facts/)).toBeInTheDocument();
    expect(screen.getByText("review required")).toBeInTheDocument();
  });

  it("states capacity tension plainly and never silently compresses the activity", async () => {
    render(<UniversityTodayWorkspace scenarios={await universityTodayFixtureScenarios()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Tight window" }));
    expect(screen.getByRole("heading", { level: 1, name: "The activity fits only at the low estimate." })).toBeInTheDocument();
    expect(screen.getByText(/will not shorten a reviewed activity silently/)).toBeInTheDocument();
    expect(screen.getByText(/35 minutes available, 30-45 minutes fixture-authored effort/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open recovery draft" })).toHaveAttribute(
      "href",
      "/internal/university-recovery",
    );
    expect(screen.queryByRole("link", { name: "Inspect protected study brief" })).not.toBeInTheDocument();
    expect(screen.getByText(/No capacity, work item, deadline, or decision is transferred or saved/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "No room" }));
    expect(screen.getByRole("heading", { level: 1, name: "This activity does not fit this window." })).toBeInTheDocument();
    expect(screen.getByText(/20 minutes available, 30-45 minutes fixture-authored effort/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open recovery draft" })).toHaveAttribute(
      "href",
      "/internal/university-recovery",
    );
    expect(screen.queryByRole("link", { name: "Inspect protected study brief" })).not.toBeInTheDocument();
  });

  it("uses native keyboard-focusable controls and performs no fetch or browser-storage write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const { container } = render(<UniversityTodayWorkspace scenarios={await universityTodayFixtureScenarios()} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    radios.forEach((radio) => expect(radio).not.toHaveAttribute("tabindex", "-1"));
    fireEvent.click(screen.getByRole("radio", { name: "No room" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("—");
    expect(container.textContent).not.toContain("–");
  });
});
