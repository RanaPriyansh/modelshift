// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reviewedUniversitySourceRequest } from "@/app/internal/university-source-review/review-fixture.server";

import { UniversitySourceReview } from "./UniversitySourceReview";

afterEach(cleanup);

describe("UniversitySourceReview", () => {
  it("keeps conflicting copied facts blocked after both extractions are confirmed", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);

    expect(await screen.findByRole("heading", { name: "Two copies give different deadlines." })).toBeInTheDocument();
    const conflictSection = screen.getByRole("heading", { name: "Two copies give different deadlines." }).closest("section")!;
    const matchButtons = within(conflictSection).getAllByRole("button", { name: "Matches this copy" });

    fireEvent.click(matchButtons[0]!);
    fireEvent.click(matchButtons[1]!);

    await waitFor(() => {
      expect(within(conflictSection).getByText("Needs a human answer")).toBeInTheDocument();
      expect(within(conflictSection).getByText(/Which version currently applies/)).toBeInTheDocument();
    });
    expect(screen.getByText(/0 unconflicted reviewed facts eligible as candidate context/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("preserves the copied value while applying a student correction", async () => {
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    expect((await screen.findAllByText(/Assignment one, due/)).length).toBeGreaterThan(1);

    const correctButtons = screen.getAllByRole("button", { name: "Correct transcription" });
    fireEvent.click(correctButtons[0]!);
    const correction = screen.getByLabelText("Correct due date and time");
    fireEvent.change(correction, { target: { value: "2026-09-14T15:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Use my correction" }));

    await waitFor(() => expect(screen.getByText(/Your correction:/)).toBeInTheDocument());
    expect(screen.getAllByText(/Assignment one, due/).length).toBeGreaterThan(1);
    expect(screen.getByText("Student correction applied")).toBeInTheDocument();
  });

  it("keeps copied assessment permission in restricted mode after a transcription match", async () => {
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    const policyHeading = await screen.findByRole("heading", { name: "A copied permission is not authorization." });
    const policySection = policyHeading.closest("section")!;
    fireEvent.click(within(policySection).getByRole("button", { name: "Matches this copy" }));

    await waitFor(() => {
      expect(within(policySection).getByText("Marked as matching this copy")).toBeInTheDocument();
    });
    expect(within(policySection).getByText(/Restricted assessment mode remains active/)).toBeInTheDocument();
    expect(screen.getAllByText("Not established", { selector: "dd" })).toHaveLength(2);
  });

  it("does not write browser storage while reviewing the local sample", async () => {
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");
    render(<UniversitySourceReview initialRequest={await reviewedUniversitySourceRequest()} />);
    await screen.findByRole("heading", { name: "Two copies give different deadlines." });
    fireEvent.click(screen.getAllByRole("button", { name: "Reject extraction" })[0]!);
    await waitFor(() => expect(screen.getByText("Extraction rejected")).toBeInTheDocument());
    expect(storageSetItem).not.toHaveBeenCalled();
    storageSetItem.mockRestore();
  });
});
