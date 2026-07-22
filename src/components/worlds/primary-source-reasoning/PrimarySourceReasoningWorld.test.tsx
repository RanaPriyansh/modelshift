// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TRANSFER_STATEMENTS,
  WORKED_STATEMENTS,
  type PrimarySourceProofRecord,
} from "../../../worlds/primary-source-reasoning";
import { PrimarySourceReasoningWorld } from "./PrimarySourceReasoningWorld";

function chooseRadio(name: string) {
  fireEvent.click(screen.getByRole("radio", { name }));
}

function advanceToWorkedClassification() {
  chooseRadio("The photograph was commissioned to advertise the shoe store.");
  fireEvent.click(screen.getByTestId("commit-initial"));
  fireEvent.click(screen.getByRole("button", { name: "Use an editable sample" }));
  fireEvent.click(screen.getByTestId("commit-explanation"));
  chooseRadio("At least one reading is plausible enough to test.");
  fireEvent.click(screen.getByTestId("accept-compiler"));
  fireEvent.click(screen.getByTestId("open-catalog"));
}

function assignAll(selects: HTMLElement[], categories: string[]) {
  categories.forEach((category, index) => {
    fireEvent.change(selects[index]!, { target: { value: category } });
  });
}

describe("PrimarySourceReasoningWorld", () => {
  it("runs mystery through one-shot proof and emits only the bounded record", async () => {
    const onEvidence = vi.fn<(record: PrimarySourceProofRecord) => void>();
    const onRuntimeReceipt = vi.fn();
    render(<PrimarySourceReasoningWorld onEvidence={onEvidence} onRuntimeReceipt={onRuntimeReceipt} />);

    expect(screen.getByTestId("stage-mystery")).toBeInTheDocument();
    expect(screen.getByAltText(/sepia stereograph card/i)).toBeInTheDocument();
    expect(screen.queryByText("B.W. Kilburn Company.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Library of Congress catalog record/i)).not.toBeInTheDocument();

    advanceToWorkedClassification();

    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
    expect(screen.getByText("B.W. Kilburn Company.")).toBeInTheDocument();
    expect(screen.getByText("No known restrictions on publication.")).toBeInTheDocument();
    expect(WORKED_STATEMENTS).toHaveLength(4);

    const workedBoard = screen.getByRole("heading", {
      name: /classify each claim by the evidence/i,
    }).parentElement?.parentElement;
    expect(workedBoard).not.toBeNull();
    const workedSelects = within(workedBoard as HTMLElement).getAllByLabelText("Evidence layer");
    assignAll(workedSelects, ["observation", "catalog_fact", "inference", "open_question"]);
    fireEvent.click(screen.getByTestId("request-support"));
    expect(screen.getByText(/Could another viewer verify this from the pixels alone/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("submit-worked-test"));

    chooseRadio("Each claim should be limited to what its evidence layer can establish.");
    fireEvent.change(screen.getByLabelText("State the rule in your own words"), {
      target: {
        value:
          "I will separate what I see, what the record supplies, and what I am interpreting beyond both.",
      },
    });
    fireEvent.click(screen.getByTestId("submit-reconstruction"));

    expect(screen.getByTestId("stage-withdrawal")).toBeInTheDocument();
    expect(screen.getByText("Category definitions and retry feedback")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("acknowledge-withdrawal"));

    expect(screen.getByTestId("stage-transfer")).toBeInTheDocument();
    expect(screen.getByAltText(/black-and-white negative/i)).toBeInTheDocument();
    expect(screen.queryByTestId("request-support")).not.toBeInTheDocument();
    expect(screen.queryByText(/Attention cue/)).not.toBeInTheDocument();
    expect(TRANSFER_STATEMENTS).toHaveLength(4);

    const transferBoard = screen.getByRole("heading", {
      name: /assign the evidence layer for all four claims/i,
    }).parentElement?.parentElement;
    expect(transferBoard).not.toBeNull();
    const transferSelects = within(transferBoard as HTMLElement).getAllByLabelText("Evidence layer");
    assignAll(transferSelects, ["observation", "catalog_fact", "inference", "open_question"]);
    fireEvent.change(screen.getByLabelText("Why do these boundaries fit?"), {
      target: {
        value:
          "The visible scene, the source record, my interpretation, and the missing evidence support different claims.",
      },
    });
    fireEvent.change(screen.getByLabelText("Confidence in this response"), {
      target: { value: "85" },
    });
    fireEvent.click(screen.getByTestId("submit-transfer"));

    expect(await screen.findByTestId("stage-result")).toBeInTheDocument();
    expect(screen.getByText("Pattern held once")).toBeInTheDocument();
    expect(screen.getByText(/does not claim mastery or delayed retention/i)).toBeInTheDocument();
    expect(screen.getByText(/Whether the learner can corroborate conflicting sources/)).toBeInTheDocument();
    await waitFor(() => expect(onEvidence).toHaveBeenCalledTimes(1));
    expect(onEvidence.mock.calls[0]?.[0]).toMatchObject({
      worldId: "world.primary-source-reasoning",
      validatorId: "validator.primary-source-reasoning-transfer.v1",
      assistance: {
        explanationSampleUsed: true,
        levelsUsed: [1],
        wasAvailableDuringProof: false,
      },
      independentTransfer: { correctCount: 4, passed: true, confidence: 85 },
    });
    expect(JSON.stringify(onEvidence.mock.calls[0]?.[0])).not.toContain(
      "The visible scene, the source record",
    );
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      validator: { outcome: "pass", disposition: "demonstrated" },
      sourceProvenanceStatus: "incomplete",
    });
    expect(JSON.stringify(onRuntimeReceipt.mock.calls[0]?.[0])).not.toContain(
      "The visible scene, the source record",
    );
  });

  it("keeps classification feedback bounded and permits a retry before proof", () => {
    render(<PrimarySourceReasoningWorld />);
    advanceToWorkedClassification();

    const selects = screen.getAllByLabelText("Evidence layer");
    assignAll(selects, ["observation", "observation", "observation", "observation"]);
    fireEvent.click(screen.getByTestId("submit-worked-test"));

    expect(screen.getByRole("alert")).toHaveTextContent(/not separated yet/i);
    expect(screen.getByTestId("stage-test")).toBeInTheDocument();
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();

    assignAll(selects, ["observation", "catalog_fact", "inference", "open_question"]);
    fireEvent.click(screen.getByTestId("submit-worked-test"));
    expect(screen.getByTestId("stage-reconstruct")).toBeInTheDocument();
  });

  it("lets the learner reject the compiler reading but requires a real correction", () => {
    render(<PrimarySourceReasoningWorld />);
    chooseRadio("People, vehicles, a streetcar, and storefront signs are visible.");
    fireEvent.click(screen.getByTestId("commit-initial"));
    fireEvent.change(screen.getByLabelText("What made this claim seem supported?"), {
      target: { value: "Another viewer can check these concrete details in the photograph itself." },
    });
    fireEvent.click(screen.getByTestId("commit-explanation"));
    chooseRadio("Neither fits; I want to correct the interpretation.");
    fireEvent.change(screen.getByLabelText("Correction to the two interpretations"), {
      target: { value: "too short" },
    });
    fireEvent.click(screen.getByTestId("accept-compiler"));
    expect(screen.getByRole("alert")).toHaveTextContent(/correct the interpretation/i);
    expect(screen.getByTestId("stage-compiler")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Correction to the two interpretations"), {
      target: { value: "I meant that visible details can be checked without settling the larger story." },
    });
    fireEvent.click(screen.getByTestId("accept-compiler"));
    expect(screen.getByTestId("stage-test")).toBeInTheDocument();
  });
});
