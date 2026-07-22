// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProportionalReasoningWorld } from "./ProportionalReasoningWorld";

afterEach(cleanup);

function reachIndependentTransfer({ useSupport = false }: { readonly useSupport?: boolean } = {}): void {
  fireEvent.click(screen.getByLabelText("They taste equally strong"));
  fireEvent.click(screen.getByTestId("ratio-commit-initial"));
  fireEvent.change(screen.getByLabelText(/^Your exact words/), {
    target: { value: "They each have one more water part than concentrate." },
  });
  fireEvent.click(screen.getByTestId("ratio-commit-explanation"));
  fireEvent.click(screen.getByLabelText("The drinks should taste equally strong."));
  fireEvent.click(screen.getByTestId("ratio-commit-test-prediction"));
  fireEvent.click(screen.getByTestId("ratio-run-experiment"));
  if (useSupport) fireEvent.click(screen.getByTestId("ratio-request-support"));
  fireEvent.click(screen.getByTestId("ratio-begin-reconstruction"));
  fireEvent.change(screen.getByLabelText(/^Your proportional rule/), {
    target: { value: "A ratio stays proportional when both quantities scale by the same factor." },
  });
  fireEvent.click(screen.getByTestId("ratio-submit-reconstruction"));
  fireEvent.click(screen.getByTestId("ratio-begin-proof"));
}

describe("ProportionalReasoningWorld", () => {
  it("renders the complete authored flow, records one local receipt, and structurally removes support in proof", async () => {
    const onEvidence = vi.fn();
    const onRuntimeReceipt = vi.fn();
    render(<ProportionalReasoningWorld onEvidence={onEvidence} onRuntimeReceipt={onRuntimeReceipt} />);

    expect(screen.getByTestId("ratio-stage-mystery").textContent).toContain("Which drink will taste more strongly of citrus?");
    reachIndependentTransfer({ useSupport: true });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("main")));

    const transfer = screen.getByTestId("ratio-stage-transfer");
    expect(transfer.getAttribute("data-assistance")).toBe("off");
    expect(screen.queryByTestId("ratio-request-support")).toBeNull();
    expect(transfer.textContent).not.toContain("Attention cue");

    fireEvent.click(screen.getByLabelText("32 km"));
    fireEvent.change(screen.getByLabelText(/^Show the relationship you used/), {
      target: { value: "12 is four times 3, so I scale the real 8 km by four to get 32 km." },
    });
    fireEvent.click(screen.getByTestId("ratio-submit-proof"));

    expect(screen.getByTestId("ratio-stage-evidence").textContent).toContain("What this attempt actually showed.");
    expect(screen.queryByTestId("ratio-submit-proof")).toBeNull();
    await waitFor(() => expect(onEvidence).toHaveBeenCalledTimes(1));
    expect(onEvidence.mock.calls[0]?.[0]).toMatchObject({
      assistance: { levelsUsed: [1], wasAvailableDuringProof: false },
      independentTransfer: { choiceId: "32_km", answerCorrect: true },
      returnProof: { scheduled: false, afterDays: 3 },
    });
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      validator: { outcome: "pass", disposition: "demonstrated" },
      sourceProvenanceStatus: "incomplete",
      world: { version: "1.0.1", contentVersion: "1.0.0" },
    });
    expect(JSON.stringify(onRuntimeReceipt.mock.calls[0]?.[0])).not.toContain("12 is four times 3");
    expect(screen.getByText(/No reviewed delayed task or scheduler is published/i)).toBeTruthy();
    expect(screen.queryByTestId("ratio-schedule-return")).toBeNull();
  });

  it("adapts invitation copy without changing the exact mystery", () => {
    const { rerender } = render(<ProportionalReasoningWorld audience="child_with_grown_up" />);
    expect(screen.getByTestId("ratio-stage-mystery").textContent).toContain("with a grown-up");
    expect(screen.getByText("2 scoops concentrate + 3 cups water")).toBeTruthy();

    rerender(<ProportionalReasoningWorld audience="adult" />);
    expect(screen.getByTestId("ratio-stage-mystery").textContent).toContain("No school shorthand is required");
    expect(screen.getByText("5 scoops concentrate + 6 cups water")).toBeTruthy();
  });

  it("returns to a clean commitment screen after a completed attempt", () => {
    render(<ProportionalReasoningWorld />);
    reachIndependentTransfer();
    fireEvent.click(screen.getByLabelText("24 km"));
    fireEvent.change(screen.getByLabelText(/^Show the relationship you used/), {
      target: { value: "I added the visible numbers and chose twenty four." },
    });
    fireEvent.click(screen.getByTestId("ratio-submit-proof"));
    fireEvent.click(screen.getByRole("button", { name: "Start this world again" }));

    expect(screen.getByTestId("ratio-stage-mystery")).toBeTruthy();
    expect((screen.getByLabelText("They taste equally strong") as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByTestId("ratio-stage-evidence")).toBeNull();
  });

  it("does not label a lucky exact choice as demonstrated", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<ProportionalReasoningWorld onRuntimeReceipt={onRuntimeReceipt} />);
    reachIndependentTransfer();
    fireEvent.click(screen.getByLabelText("32 km"));
    fireEvent.change(screen.getByLabelText(/^Show the relationship you used/), {
      target: { value: "I picked 32 from the list." },
    });
    fireEvent.click(screen.getByTestId("ratio-submit-proof"));

    const evidence = screen.getByTestId("ratio-stage-evidence");
    expect(evidence.textContent).toContain("Not demonstrated on this attempt");
    expect(evidence.textContent).toContain("More independent evidence needed");
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      validator: { outcome: "fail", disposition: "not_demonstrated" },
    });
  });

  it("emits one receipt for each completed attempt after reset", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<ProportionalReasoningWorld onRuntimeReceipt={onRuntimeReceipt} />);

    reachIndependentTransfer();
    fireEvent.click(screen.getByLabelText("32 km"));
    fireEvent.change(screen.getByLabelText(/^Show the relationship you used/), {
      target: { value: "12 is four times 3, so I scale 8 km by four." },
    });
    fireEvent.click(screen.getByTestId("ratio-submit-proof"));
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Start this world again" }));
    reachIndependentTransfer();
    fireEvent.click(screen.getByLabelText("24 km"));
    fireEvent.change(screen.getByLabelText(/^Show the relationship you used/), {
      target: { value: "I added the visible values rather than preserving the relationship." },
    });
    fireEvent.click(screen.getByTestId("ratio-submit-proof"));
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(2));
  });
});
