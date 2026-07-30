// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityRecoveryFixtureScenarios } from "@/app/internal/university-recovery/recovery-fixture.server";

import { UniversityRecoveryWorkspace } from "./UniversityRecoveryWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityRecoveryWorkspace", () => {
  it("makes the workable reset legible without a backlog score", async () => {
    const { container } = render(
      <UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Rebuild from what fits now." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Protect now" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Decide or ask" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Outside this window" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Argument analysis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Problem set four" })).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
    expect(screen.getByText(/This is not a priority or ability score/)).toBeInTheDocument();
    expect(container.textContent).not.toContain("backlog debt");
  });

  it("keeps a tight effort range and essential negotiable work visible for learner choice", async () => {
    render(<UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Choice needed" }));

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Protect the learning. Choose the trade-off.",
    })).toBeInTheDocument();
    expect(screen.getByText(/kept the effort range intact/)).toBeInTheDocument();
    expect(screen.getByText(/learning value as essential/)).toBeInTheDocument();
    expect(screen.getByText("tight declared window")).toBeInTheDocument();
  });

  it("shows a precise human-help draft as prepared and unsent", async () => {
    render(<UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Ask for help" }));

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Ask before carrying the conflict forward.",
    })).toBeInTheDocument();
    expect(screen.getByText("Prepared, not sent")).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Recovery question about Argument analysis",
    })).toBeInTheDocument();
    expect(screen.getByText(/Could we review what is still required/)).toBeInTheDocument();
    expect(screen.getByText("instructor")).toBeInTheDocument();
    expect(screen.getAllByText("Not allowed")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
  });

  it("withholds the draft and routes to source review when copied deadlines conflict", async () => {
    render(<UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />);

    fireEvent.click(screen.getByRole("radio", { name: "Source review" }));

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Resolve the copied deadline first.",
    })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review source copies" })).toHaveAttribute(
      "href",
      "/internal/university-source-review",
    );
    expect(screen.queryByRole("heading", { level: 2, name: "Protect now" })).not.toBeInTheDocument();
    expect(screen.getByText("Withheld until connected source copies are reviewed.")).toBeInTheDocument();
    expect(screen.getByText("review required")).toBeInTheDocument();
  });

  it("uses native controls and performs no network, storage, or clipboard write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const { container } = render(
      <UniversityRecoveryWorkspace scenarios={await universityRecoveryFixtureScenarios()} />,
    );

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    radios.forEach((radio) => expect(radio).not.toHaveAttribute("tabindex", "-1"));
    fireEvent.click(screen.getByRole("radio", { name: "Ask for help" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("—");
    expect(container.textContent).not.toContain("–");
  });
});
