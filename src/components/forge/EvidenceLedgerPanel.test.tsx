// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY, recordWorldProof } from "@/src/lib/forge-evidence";

import { EvidenceLedgerPanel } from "./EvidenceLedgerPanel";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("EvidenceLedgerPanel", () => {
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
