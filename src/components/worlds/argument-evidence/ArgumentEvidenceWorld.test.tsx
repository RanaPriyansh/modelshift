// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARGUMENT_EVIDENCE_AUTHORED_FIXTURE } from "../../../worlds/argument-evidence";
import { ArgumentEvidenceWorld } from "./ArgumentEvidenceWorld";

afterEach(cleanup);

function reachSupport() {
  fireEvent.click(screen.getByLabelText(/An item counts as evidence when it is about the same subject/i));
  fireEvent.click(screen.getByTestId("argument-evidence-commit-initial"));
  fireEvent.change(screen.getByLabelText("Initial explanation"), { target: { value: "I think evidence must bear on the exact claim outcome rather than just share a topic." } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to two readings" }));
  fireEvent.click(screen.getByRole("button", { name: "Accept these readings" }));
  fireEvent.click(screen.getByRole("button", { name: "Name the disagreement" }));
  fireEvent.click(screen.getByLabelText("outcome linked changes credibility"));
  fireEvent.click(screen.getByRole("button", { name: "Compare the cards" }));
  fireEvent.click(screen.getByLabelText(/At 15:00 on six clear days/i));
  fireEvent.click(screen.getByLabelText("Supports with a limit"));
  fireEvent.click(screen.getByRole("button", { name: "Check the comparison" }));
}

function reachTransfer() {
  reachSupport();
  fireEvent.click(screen.getByRole("button", { name: "Reconstruct the rule" }));
  fireEvent.change(screen.getByLabelText("Reconstruction"), { target: { value: "A card counts when it compares the exact named outcome and can change the claim's credibility." } });
  fireEvent.click(screen.getByRole("button", { name: "Commit reconstruction" }));
  fireEvent.click(screen.getByRole("button", { name: "Begin unaided transfer" }));
}

describe("ArgumentEvidenceWorld", () => {
  it("uses a human starting-rule legend and renders the learner quote with exactly two authored readings", () => {
    render(<ArgumentEvidenceWorld />);
    expect(screen.getByText("Choose the starting rule that best matches your thinking")).toBeTruthy();
    expect(screen.getByTestId("argument-evidence-stage-mystery").textContent).not.toContain(":r");
    fireEvent.click(screen.getByLabelText(/An item counts as evidence when it is about the same subject/i));
    fireEvent.click(screen.getByTestId("argument-evidence-commit-initial"));
    const explanation = "The item needs to bear on the exact outcome rather than simply share a topic.";
    fireEvent.change(screen.getByLabelText("Initial explanation"), { target: { value: explanation } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to two readings" }));
    expect(screen.getByText(explanation)).toBeTruthy();
    expect(screen.getByText("Topic match")).toBeTruthy();
    expect(screen.getByText("Credibility relation")).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Topic match",
      "Credibility relation",
    ]);
    expect(screen.getByRole("button", { name: "Commit my correction" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject these readings" })).toBeTruthy();
  });

  it("accepts rejection of the compiler readings and reveals the level-three worked table only on request", () => {
    render(<ArgumentEvidenceWorld />);
    fireEvent.click(screen.getByLabelText(/An item counts as evidence when it is about the same subject/i));
    fireEvent.click(screen.getByTestId("argument-evidence-commit-initial"));
    fireEvent.change(screen.getByLabelText("Initial explanation"), { target: { value: "A detail should bear on the named outcome instead of merely sharing the topic." } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to two readings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject these readings" }));
    fireEvent.click(screen.getByRole("button", { name: "Name the disagreement" }));
    expect(screen.getByText("Commit a prediction")).toBeTruthy();

    cleanup();
    render(<ArgumentEvidenceWorld />);
    reachSupport();
    expect(screen.queryByTestId("argument-evidence-worked-support-table")).toBeNull();
    fireEvent.click(screen.getByTestId("argument-evidence-support"));
    fireEvent.click(screen.getByTestId("argument-evidence-support"));
    expect(screen.queryByTestId("argument-evidence-worked-support-table")).toBeNull();
    fireEvent.click(screen.getByTestId("argument-evidence-support"));
    const table = screen.getByTestId("argument-evidence-worked-support-table");
    expect(table.textContent).toContain(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.claim);
    for (const itemId of ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.selectableItemIds) {
      expect(table.textContent).toContain(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.items.find((item) => item.id === itemId)!.text);
    }
    expect(table.textContent).not.toContain(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.expected.relationId);
    expect(table.textContent).not.toContain(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.items[1].why);
  });

  it("keeps the access-preserving proof scene free of instructional tools and emits one bounded receipt", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<ArgumentEvidenceWorld onRuntimeReceipt={onRuntimeReceipt} />);
    fireEvent.change(screen.getByLabelText("Initial confidence"), { target: { value: "73" } });
    reachTransfer();
    const transfer = screen.getByTestId("argument-evidence-stage-transfer");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("main")));
    expect(transfer.getAttribute("data-assistance")).toBe("off");
    expect(screen.queryByTestId("argument-evidence-support")).toBeNull();
    expect(transfer.textContent).toContain("Unaided transfer");
    const table = screen.getByTestId("argument-evidence-transfer-text-table");
    expect(table.textContent).toContain("candidate items and the named claim outcome");
    expect(table.textContent).not.toContain("supports_with_limit");
    expect(table.textContent).not.toContain("other changes remain possible");
    fireEvent.click(screen.getByTestId("argument-evidence-text-table-control"));
    fireEvent.click(screen.getByTestId("argument-evidence-text-table-control"));
    expect(screen.getByText(/text\/table alternative is recorded/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/The centre logged 31 late arrivals/i));
    fireEvent.click(screen.getByLabelText("Compares named outcome"));
    fireEvent.click(screen.getByLabelText("Other changes not ruled out"));
    fireEvent.change(screen.getByLabelText("Transfer confidence"), { target: { value: "87" } });
    fireEvent.click(screen.getByTestId("argument-evidence-submit-transfer"));
    expect(screen.getByTestId("argument-evidence-stage-result").textContent).toContain("Demonstrated on this one task");
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      authority: { proofAuthority: "honour_based", persistence: "not_persisted" },
      validator: { outcome: "pass", disposition: "demonstrated" },
      sourceProvenanceStatus: "incomplete",
    });
    expect(screen.getByRole("status").textContent).toContain("Bounded result");
    fireEvent.click(screen.getByRole("button", { name: "Start this world again" }));
    expect(screen.getByTestId("argument-evidence-stage-mystery")).toBeTruthy();
    expect((screen.getByLabelText("Initial confidence") as HTMLInputElement).value).toBe(String(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.initialConfidence));
    expect(onRuntimeReceipt).toHaveBeenCalledTimes(1);
    reachTransfer();
    expect((screen.getByLabelText("Transfer confidence") as HTMLInputElement).value).toBe(String(ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.defaults.transferConfidence));
    fireEvent.click(screen.getByLabelText(/The centre logged 31 late arrivals/i));
    fireEvent.click(screen.getByLabelText("Compares named outcome"));
    fireEvent.click(screen.getByLabelText("Other changes not ruled out"));
    fireEvent.click(screen.getByTestId("argument-evidence-submit-transfer"));
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(2));
    expect(onRuntimeReceipt.mock.calls[1]?.[0].attemptId).not.toBe(onRuntimeReceipt.mock.calls[0]?.[0].attemptId);
  });

  it("emits a bounded failed receipt without leaking internal rejection labels", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<ArgumentEvidenceWorld onRuntimeReceipt={onRuntimeReceipt} />);
    reachTransfer();
    fireEvent.click(screen.getByLabelText(/The trial buses were blue/i));
    fireEvent.click(screen.getByLabelText("Same subject"));
    fireEvent.click(screen.getByLabelText("None"));
    fireEvent.click(screen.getByTestId("argument-evidence-submit-transfer"));
    expect(screen.getByTestId("argument-evidence-stage-result").textContent).toContain("Not demonstrated on this attempt");
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({ validator: { outcome: "fail", disposition: "not_demonstrated" } });
    expect(screen.queryByText("domain rejected")).toBeNull();
  });
});
