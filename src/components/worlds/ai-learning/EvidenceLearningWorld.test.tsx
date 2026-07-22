// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/forge-evidence", () => ({
  recordWorldProof: vi.fn(),
}));

import { recordWorldProof } from "../../../lib/forge-evidence";
import { EvidenceLearningWorld } from "./EvidenceLearningWorld";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function commitEncounter(): void {
  fireEvent.click(screen.getByRole("radio", { name: /It depends/i }));
  fireEvent.change(screen.getByLabelText(/Why do you hold that stance/i), {
    target: { value: "The role, access conditions, and later measurement probably change the result." },
  });
  fireEvent.click(screen.getByTestId("commit-encounter"));
}

function reachTransfer({ acknowledge = true }: { readonly acknowledge?: boolean } = {}): void {
  commitEncounter();
  fireEvent.click(screen.getByTestId("accept-two-readings"));
  fireEvent.click(screen.getByRole("radio", { name: /better support Reading 02/i }));
  fireEvent.click(screen.getByTestId("commit-test-prediction"));
  fireEvent.click(screen.getByTestId("review-bastani-pnas"));
  fireEvent.click(screen.getByTestId("review-tutor-copilot"));
  fireEvent.click(screen.getByTestId("continue-from-evidence"));
  fireEvent.click(screen.getByRole("radio", { name: /Who receives the output/i }));
  fireEvent.click(screen.getByTestId("commit-difference"));

  const readingOne = screen.getByRole("group", { name: "Reading 01" });
  const readingTwo = screen.getByRole("group", { name: "Reading 02" });
  fireEvent.click(within(readingOne).getByRole("radio", { name: "Overreaches the cards" }));
  fireEvent.click(within(readingTwo).getByRole("radio", { name: "Fits both cards" }));
  fireEvent.click(screen.getByTestId("commit-readings"));
  fireEvent.click(screen.getByRole("radio", { name: /In these studies, learning outcomes differed/i }));
  fireEvent.click(screen.getByTestId("commit-bounded-claim"));
  if (acknowledge) fireEvent.click(screen.getByTestId("acknowledge-withdrawal"));
}

function submitHeldTransfer(): void {
  fireEvent.click(screen.getByRole("radio", { name: /These sources do not warrant/i }));
  fireEvent.click(screen.getByRole("radio", { name: /when the study activity is held constant/i }));
  fireEvent.click(screen.getByTestId("submit-transfer"));
}

describe("EvidenceLearningWorld", () => {
  it("requires the compiler and a prediction before reviewed evidence is visible", () => {
    render(<EvidenceLearningWorld />);
    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "encounter");
    expect(screen.queryByTestId("evidence-card-bastani-pnas")).not.toBeInTheDocument();

    commitEncounter();
    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "compiler");
    expect(screen.getByTestId("stage-compiler")).toHaveTextContent("two possible readings to test");
    expect(screen.getByTestId("stage-compiler")).toHaveTextContent("The role, access conditions, and later measurement probably change the result.");
    expect(screen.getByText("Reading 01")).toBeInTheDocument();
    expect(screen.getByText("Reading 02")).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-card-bastani-pnas")).not.toBeInTheDocument();
    expect(screen.getByTestId("commit-test-prediction")).toBeDisabled();

    fireEvent.click(screen.getByTestId("accept-two-readings"));
    fireEvent.click(screen.getByRole("radio", { name: /better support Reading 01/i }));
    fireEvent.click(screen.getByTestId("commit-test-prediction"));
    expect(screen.getByTestId("stage-evidence")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-card-bastani-pnas")).toBeInTheDocument();
  });

  it("uses runtime-only state, writes one receipt-derived compatibility record, and keeps raw prose out of the receipt", async () => {
    const onRuntimeReceipt = vi.fn();
    const { rerender } = render(<EvidenceLearningWorld onRuntimeReceipt={onRuntimeReceipt} />);
    reachTransfer({ acknowledge: false });

    const withdrawalCopy = screen.getByTestId("stage-withdrawal");
    expect(withdrawalCopy).toHaveTextContent("Interpretation framing, evidence-selection help, and authored corrective prompts");
    expect(withdrawalCopy).toHaveTextContent("Keyboard operation, textual alternatives, reduced motion");
    expect(withdrawalCopy).toHaveTextContent("No model action, replay, retry, or answer-revealing feedback");
    fireEvent.click(screen.getByTestId("acknowledge-withdrawal"));
    const transfer = screen.getByTestId("stage-transfer");
    expect(transfer).toHaveTextContent("Evidence desk closed");
    expect(transfer).toHaveTextContent("No prompts, retries, or reveal before commit");
    expect(within(transfer).getByRole("button", { name: "Submit once" })).toBeDisabled();
    expect(transfer.querySelector("[role=alert]")).toBeNull();

    submitHeldTransfer();
    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "result");
    expect(screen.getByText("Cold transfer held")).toBeInTheDocument();
    expect(screen.getByTestId("runtime-receipt-limits")).toHaveTextContent("honour-based");
    expect(screen.getByTestId("runtime-receipt-limits")).toHaveTextContent("not persisted");
    expect(screen.getByTestId("runtime-receipt-limits")).toHaveTextContent("false");
    expect(screen.getByTestId("runtime-receipt-limits")).toHaveTextContent("incomplete");
    expect(screen.getByText(/Delayed retention remains untested and no return is scheduled/i)).toBeInTheDocument();
    expect(screen.queryByText("Return proof", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByTestId("record-this-attempt")).toBeInTheDocument();

    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(recordWorldProof).toHaveBeenCalledTimes(1);
    expect(recordWorldProof).toHaveBeenCalledWith({
      capabilityId: "capability.ai-literacy.source-corroboration",
      conditionId: "proof.ai-literacy.independent-corroboration",
      sourceRefId: "world.source-corroboration",
      outcome: "proved",
    });
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      cognitiveSupport: [],
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      sourceProvenanceStatus: "incomplete",
    });
    expect(JSON.stringify(onRuntimeReceipt.mock.calls[0]?.[0])).not.toContain("The role, access conditions");
    expect(JSON.stringify(vi.mocked(recordWorldProof).mock.calls)).not.toContain("The role, access conditions");

    rerender(<EvidenceLearningWorld onRuntimeReceipt={onRuntimeReceipt} />);
    expect(recordWorldProof).toHaveBeenCalledTimes(1);
    expect(onRuntimeReceipt).toHaveBeenCalledTimes(1);
  });

  it("keeps corrective feedback neutral and does not create unconsumed support provenance", () => {
    const onRuntimeReceipt = vi.fn();
    render(<EvidenceLearningWorld onRuntimeReceipt={onRuntimeReceipt} />);
    commitEncounter();
    fireEvent.click(screen.getByTestId("accept-two-readings"));
    fireEvent.click(screen.getByRole("radio", { name: /better support Reading 01/i }));
    fireEvent.click(screen.getByTestId("commit-test-prediction"));
    fireEvent.click(screen.getByTestId("review-bastani-pnas"));
    fireEvent.click(screen.getByTestId("review-tutor-copilot"));
    fireEvent.click(screen.getByTestId("continue-from-evidence"));
    fireEvent.click(screen.getByRole("radio", { name: /^Only the number of participants/ }));
    fireEvent.click(screen.getByTestId("commit-difference"));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("does not meet this authored evidence check");
    expect(alert).not.toHaveTextContent("Who receives the output");
    expect(alert).not.toHaveTextContent("directly");
    expect(onRuntimeReceipt).not.toHaveBeenCalled();
  });

  it("starts a clean new runtime attempt after reset", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<EvidenceLearningWorld onRuntimeReceipt={onRuntimeReceipt} />);
    reachTransfer();
    submitHeldTransfer();
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("reset-evidence-world"));
    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "encounter");
    expect(screen.getByRole("radio", { name: /It depends/i })).not.toBeChecked();
    expect(screen.queryByTestId("stage-result")).not.toBeInTheDocument();
  });
});
