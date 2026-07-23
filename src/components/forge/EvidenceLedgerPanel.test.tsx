// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY, recordWorldProof } from "@/src/lib/forge-evidence";

import { EvidenceLedgerPanel } from "./EvidenceLedgerPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("EvidenceLedgerPanel", () => {
  it("describes proved outcomes as bounded browser-local records rather than independent capability claims", async () => {
    expect(recordWorldProof({
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      conditionId: "proof.test.new-context",
      sourceRefId: "world.proportional-reasoning",
      outcome: "proved",
      recordedAt: "2026-07-22T00:00:00.000Z",
    }).ok).toBe(true);

    render(<EvidenceLedgerPanel />);

    await waitFor(() => expect(screen.getByText("Matched this World’s protected transfer criteria (local record)")).toBeInTheDocument());
    expect(screen.getByText("One local result")).toBeInTheDocument();
    expect(screen.queryByText("Independent transfer observed")).not.toBeInTheDocument();
    expect(screen.queryByText("Proved once")).not.toBeInTheDocument();
  });

  it("does not imply a saved record when browser storage fails and offers an honest retry", async () => {
    const read = vi.spyOn(Storage.prototype, "getItem")
      .mockImplementationOnce(() => {
        throw new Error("storage denied");
      })
      .mockReturnValue(null);

    render(<EvidenceLedgerPanel />);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Browser storage is unavailable." })).toBeInTheDocument());
    expect(screen.getByText(/No record was saved or shared/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try local storage again" }));
    await waitFor(() => expect(screen.getByText("No local evidence records yet.")).toBeInTheDocument());
    expect(read).toHaveBeenCalled();
  });

  it("renders canonical Ratio capability IDs and retained version-1 aliases without rewriting local records", async () => {
    const recordedAt = "2026-07-22T00:00:00.000Z";
    for (const capabilityId of [
      "capability.proportional-reasoning.compare-and-scale",
      "proportional-reasoning.compare-and-scale",
    ]) {
      expect(recordWorldProof({
        capabilityId,
        conditionId: "proof.test.new-context",
        sourceRefId: `world.${capabilityId}`,
        outcome: "not_proved",
        recordedAt,
      }).ok).toBe(true);
    }
    const beforeRender = window.localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY);

    render(<EvidenceLedgerPanel />);

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Proportional relationships" })).toHaveLength(2));
    for (const link of screen.getAllByRole("link", { name: "Proportional relationships" })) {
      expect(link).toHaveAttribute("href", "/learn/proportional-reasoning");
    }
    expect(window.localStorage.getItem(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY)).toBe(beforeRender);
  });
});
