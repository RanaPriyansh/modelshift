// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reviewedUniversitySourceRequest } from "@/app/internal/university-source-review/review-fixture.server";

import { UniversitySourceReview } from "./UniversitySourceReview";

let animationFrameCallbacks: FrameRequestCallback[];

beforeEach(() => {
  animationFrameCallbacks = [];
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
    animationFrameCallbacks.push(callback);
    return animationFrameCallbacks.length;
  }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UniversitySourceReview", () => {
  it("uses one atomic status announcement for each source decision", async () => {
    const { container } = render(
      <UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />,
    );
    const conflictHeading = await screen.findByRole("heading", {
      name: "Two copies give different deadlines.",
    });
    const conflictSection = conflictHeading.closest("section")!;

    const expectAnnouncement = (text: string) => {
      const statuses = screen.getAllByRole("status");
      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toHaveAttribute("aria-live", "polite");
      expect(statuses[0]).toHaveAttribute("aria-atomic", "true");
      expect(statuses[0]).toHaveTextContent(text);
      expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
    };

    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Matches this copy: Copied syllabus, Assignment one deadline",
    }));
    await waitFor(() => expectAnnouncement("Marked as matching this copy."));
    expect(within(conflictSection).getByText("Marked as matching this copy"))
      .not.toHaveAttribute("aria-live");

    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Correct transcription: Copied syllabus, Assignment one deadline",
    }));
    fireEvent.change(screen.getByLabelText("Correct due date and time"), {
      target: { value: "2026-09-14T15:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use my correction" }));
    await waitFor(() => expectAnnouncement("Student correction applied."));

    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Reject extraction: Copied syllabus, Assignment one deadline",
    }));
    await waitFor(() => expectAnnouncement("Extraction rejected."));
  });

  it("keeps conflicting copied facts blocked after both extractions are confirmed", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);

    expect(await screen.findByRole("heading", { name: "Two copies give different deadlines." })).toBeInTheDocument();
    const conflictSection = screen.getByRole("heading", { name: "Two copies give different deadlines." }).closest("section")!;

    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Matches this copy: Copied syllabus, Assignment one deadline",
    }));
    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Matches this copy: Exported course calendar, Assignment one deadline",
    }));

    await waitFor(() => {
      expect(within(conflictSection).getByText("Needs a human answer")).toBeInTheDocument();
      expect(within(conflictSection).getByText(/Which version currently applies/)).toBeInTheDocument();
    });
    expect(screen.getByText(/0 unconflicted reviewed facts eligible as candidate context/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("preserves the copied value while applying a student correction", async () => {
    vi.spyOn(window, "scrollX", "get").mockReturnValue(12.5);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(412);
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    expect((await screen.findAllByText(/Assignment one, due/)).length).toBeGreaterThan(1);

    const correctionTrigger = screen.getByRole("button", {
      name: "Correct transcription: Copied syllabus, Assignment one deadline",
    });
    fireEvent.click(correctionTrigger);
    const correction = screen.getByLabelText("Correct due date and time");
    expect(correction).toHaveFocus();
    fireEvent.change(correction, { target: { value: "2026-09-14T15:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Use my correction" }));
    expect(window.scrollTo).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Your correction:/)).toBeInTheDocument();
      expect(correctionTrigger).toHaveFocus();
      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.scrollTo)).toHaveBeenLastCalledWith({
      behavior: "auto",
      left: 12.5,
      top: 412,
    });
    animationFrameCallbacks[0]?.(0);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(vi.mocked(window.scrollTo)).toHaveBeenLastCalledWith({
      behavior: "auto",
      left: 12.5,
      top: 412,
    });
    expect(screen.getAllByText(/Assignment one, due/).length).toBeGreaterThan(1);
    expect(screen.getByText("Student correction applied")).toBeInTheDocument();
  });

  it("restores correction trigger focus after cancel", async () => {
    vi.spyOn(window, "scrollX", "get").mockReturnValue(18);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(603);
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    await screen.findByRole("heading", { name: "Two copies give different deadlines." });
    const correctionTrigger = screen.getByRole("button", {
      name: "Correct transcription: Exported course calendar, Assignment one deadline",
    });

    fireEvent.click(correctionTrigger);
    const correction = screen.getByLabelText("Correct due date and time");
    expect(correction).toHaveFocus();
    expect(window.scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByLabelText("Correct due date and time")).not.toBeInTheDocument();
    expect(correctionTrigger).toHaveFocus();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.scrollTo)).toHaveBeenLastCalledWith({
      behavior: "auto",
      left: 18,
      top: 603,
    });
    animationFrameCallbacks[0]?.(0);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
    expect(vi.mocked(window.scrollTo)).toHaveBeenLastCalledWith({
      behavior: "auto",
      left: 18,
      top: 603,
    });
  });

  it("keeps copied assessment permission in restricted mode after a transcription match", async () => {
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    const policyHeading = await screen.findByRole("heading", { name: "A copied permission is not authorization." });
    const policySection = policyHeading.closest("section")!;
    fireEvent.click(within(policySection).getByRole("button", {
      name: "Matches this copy: Copied syllabus, assessment assistance policy",
    }));

    await waitFor(() => {
      expect(within(policySection).getByText("Marked as matching this copy")).toBeInTheDocument();
    });
    expect(within(policySection).getByText(/Restricted assessment mode remains active/)).toBeInTheDocument();
    expect(screen.getAllByText("Not established", { selector: "dd" })).toHaveLength(2);
  });

  it("does not write browser storage while reviewing the local sample", async () => {
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    const conflictHeading = await screen.findByRole("heading", {
      name: "Two copies give different deadlines.",
    });
    const conflictSection = conflictHeading.closest("section")!;
    fireEvent.click(within(conflictSection).getByRole("button", {
      name: "Reject extraction: Copied syllabus, Assignment one deadline",
    }));
    await waitFor(() => expect(screen.getByText("Extraction rejected")).toBeInTheDocument());
    expect(storageSetItem).not.toHaveBeenCalled();
    storageSetItem.mockRestore();
  });

  it("gives every rendered action a unique source-and-fact accessible name", async () => {
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);

    const conflictHeading = await screen.findByRole("heading", {
      name: "Two copies give different deadlines.",
    });
    const policyHeading = screen.getByRole("heading", {
      name: "A copied permission is not authorization.",
    });
    const conflictSection = conflictHeading.closest("section")!;
    const policySection = policyHeading.closest("section")!;
    const expectedActions = [
      ["Matches this copy: Copied syllabus, Assignment one deadline", "Matches this copy"],
      ["Correct transcription: Copied syllabus, Assignment one deadline", "Correct transcription"],
      ["Reject extraction: Copied syllabus, Assignment one deadline", "Reject extraction"],
      ["Matches this copy: Exported course calendar, Assignment one deadline", "Matches this copy"],
      ["Correct transcription: Exported course calendar, Assignment one deadline", "Correct transcription"],
      ["Reject extraction: Exported course calendar, Assignment one deadline", "Reject extraction"],
      ["Matches this copy: Copied syllabus, assessment assistance policy", "Matches this copy"],
      ["Reject extraction: Copied syllabus, assessment assistance policy", "Reject extraction"],
    ] as const;
    const renderedActions = [
      ...within(conflictSection).getAllByRole("button"),
      ...within(policySection).getAllByRole("button"),
    ];

    expect(renderedActions).toHaveLength(expectedActions.length);
    expect(new Set(expectedActions.map(([name]) => name)).size).toBe(expectedActions.length);

    for (const [name, visibleLabel] of expectedActions) {
      expect(screen.getByRole("button", { name })).toHaveTextContent(visibleLabel);
    }
  });
});
