// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityProtectedStudyFixtureScenarios } from "@/app/internal/university-protected-study/protected-study-fixture.server";

import { UniversityProtectedStudyWorkspace } from "./UniversityProtectedStudyWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityProtectedStudyWorkspace", () => {
  it("explains the protected learning arc before exposing an exact preview", async () => {
    render(
      <UniversityProtectedStudyWorkspace
        scenarios={await universityProtectedStudyFixtureScenarios()}
      />,
    );

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Understand it. Then prove it without help.",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "A learning arc, not an answer box.",
    })).toBeInTheDocument();
    expect(screen.getByText("Commit your first model")).toBeInTheDocument();
    expect(screen.getByText("Withdraw instructional help")).toBeInTheDocument();
    expect(screen.getByText("Try an unfamiliar transfer")).toBeInTheDocument();
    expect(screen.getByRole("link", {
      name: "Preview exact reviewed World",
    })).toHaveAttribute("href", "/learn/ai-and-learning");
    expect(screen.getByText(/does not create a learner-owned session/)).toBeInTheDocument();
  });

  it("states support, proof, source, and receipt limits without stronger claims", async () => {
    render(
      <UniversityProtectedStudyWorkspace
        scenarios={await universityProtectedStudyFixtureScenarios()}
      />,
    );

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Help has a boundary.",
    })).toBeInTheDocument();
    expect(screen.getByText(/no receipt-eligible cognitive-support action/)).toBeInTheDocument();
    expect(screen.getByText("Deterministic validator, not model judgment")).toBeInTheDocument();
    expect(screen.getByText("honour based")).toBeInTheDocument();
    expect(screen.getByText("not persisted")).toBeInTheDocument();
    expect(screen.getByText("incomplete")).toBeInTheDocument();
    expect(screen.getByText(/Delayed retention and broader capability remain untested/)).toBeInTheDocument();
  });

  it("withholds the World when Today is source blocked", async () => {
    render(
      <UniversityProtectedStudyWorkspace
        scenarios={await universityProtectedStudyFixtureScenarios()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Source blocked" }));

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Resolve the course context before studying.",
    })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review source copies" })).toHaveAttribute(
      "href",
      "/internal/university-source-review",
    );
    expect(screen.queryByRole("link", {
      name: "Preview exact reviewed World",
    })).not.toBeInTheDocument();
    expect(screen.getByText("source review required")).toBeInTheDocument();
  });

  it("withholds launch for exact binding drift and paused packages", async () => {
    render(
      <UniversityProtectedStudyWorkspace
        scenarios={await universityProtectedStudyFixtureScenarios()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "World changed" }));
    expect(screen.getByRole("heading", {
      level: 1,
      name: "The reviewed World changed.",
    })).toBeInTheDocument();
    expect(screen.getByText(/does not exactly match/)).toBeInTheDocument();
    expect(screen.queryByRole("link", {
      name: "Preview exact reviewed World",
    })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "World paused" }));
    expect(screen.getByRole("heading", {
      level: 1,
      name: "This reviewed World is paused.",
    })).toBeInTheDocument();
    expect(screen.getByText("The exact released World is currently unavailable.")).toBeInTheDocument();
  });

  it("uses native controls and performs no network, storage, or clipboard write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const { container } = render(
      <UniversityProtectedStudyWorkspace
        scenarios={await universityProtectedStudyFixtureScenarios()}
      />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    radios.forEach((radio) => expect(radio).not.toHaveAttribute("tabindex", "-1"));
    fireEvent.click(screen.getByRole("radio", { name: "World changed" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("—");
    expect(container.textContent).not.toContain("–");
  });
});
