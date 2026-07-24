// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_WORLD_SESSION_CHECKPOINT_BYTES } from "../../../lib/forge-continuity/world-session-checkpoint";
import {
  TRANSFER_STATEMENTS,
  WORKED_STATEMENTS,
} from "../../../worlds/primary-source-reasoning";
import { PrimarySourceReasoningWorld } from "./PrimarySourceReasoningWorld";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const CHECKPOINT_IDENTITY = {
  sessionId: "study-session.primary-source-checkpoint",
  worldId: "world.primary-source-reasoning",
  worldVersion: "1.0.2",
} as const;

const CHECKPOINT_KEY =
  "forge.world-session-checkpoint:v1:study-session.primary-source-checkpoint:world.primary-source-reasoning:1.0.2";

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
  chooseRadio("The catalog will distinguish claims the photograph alone cannot establish.");
  fireEvent.click(screen.getByTestId("commit-test-prediction"));
  fireEvent.click(screen.getByTestId("open-catalog"));
}

function assignAll(selects: HTMLElement[], categories: string[]) {
  categories.forEach((category, index) => {
    fireEvent.change(selects[index]!, { target: { value: category } });
  });
}

describe("PrimarySourceReasoningWorld", () => {
  it("runs mystery through one-shot proof and emits only the bounded local receipt", async () => {
    const onRuntimeReceipt = vi.fn();
    render(<PrimarySourceReasoningWorld onRuntimeReceipt={onRuntimeReceipt} />);

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
    await waitFor(() => expect(onRuntimeReceipt).toHaveBeenCalledTimes(1));
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).toMatchObject({
      kind: "forge.runtime.bounded-local-attempt",
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      validator: { outcome: "pass", disposition: "demonstrated" },
      sourceProvenanceStatus: "incomplete",
    });
    expect(onRuntimeReceipt.mock.calls[0]?.[0]).not.toHaveProperty("validatorInput");
    expect(JSON.stringify(onRuntimeReceipt.mock.calls[0]?.[0])).not.toContain(
      "The visible scene, the source record",
    );
    expect(JSON.stringify(onRuntimeReceipt.mock.calls[0]?.[0])).not.toContain("independentTransfer");
  });

  it("keeps classification feedback bounded and permits a retry before proof", () => {
    render(<PrimarySourceReasoningWorld />);
    advanceToWorkedClassification();

    const selects = screen.getAllByLabelText("Evidence layer");
    assignAll(selects, ["observation", "observation", "observation", "observation"]);
    fireEvent.click(screen.getByTestId("submit-worked-test"));

    expect(screen.getByRole("alert")).toHaveTextContent(/not separated yet/i);
    expect(screen.getByTestId("stage-test")).toBeInTheDocument();
    expect(screen.getByTestId("stage-test")).toHaveAttribute("data-worked-test-attempts", "1");
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

  it("restores the canonical stage and the bounded explanation draft", async () => {
    const first = render(
      <PrimarySourceReasoningWorld checkpointIdentity={CHECKPOINT_IDENTITY} />,
    );
    await screen.findByTestId("stage-mystery");
    chooseRadio("The photograph was commissioned to advertise the shoe store.");
    fireEvent.click(screen.getByTestId("commit-initial"));
    fireEvent.change(screen.getByLabelText("What made this claim seem supported?"), {
      target: {
        value: "This is a draft that remains bound to the exact local session.",
      },
    });
    await waitFor(() => {
      const raw = localStorage.getItem(CHECKPOINT_KEY);
      expect(raw).toContain('"type":"COMMIT_INITIAL"');
      expect(raw).toContain("This is a draft that remains bound");
    });
    first.unmount();

    render(
      <PrimarySourceReasoningWorld checkpointIdentity={{ ...CHECKPOINT_IDENTITY }} />,
    );
    expect(await screen.findByTestId("stage-explain")).toBeInTheDocument();
    expect(screen.getByLabelText("What made this claim seem supported?")).toHaveValue(
      "This is a draft that remains bound to the exact local session.",
    );
  });

  it("preserves oversized bytes until explicit discard, then restarts fresh", async () => {
    const raw = "x".repeat(MAX_WORLD_SESSION_CHECKPOINT_BYTES + 1);
    localStorage.setItem(CHECKPOINT_KEY, raw);
    const onCheckpointError = vi.fn();
    render(
      <PrimarySourceReasoningWorld
        checkpointIdentity={CHECKPOINT_IDENTITY}
        onCheckpointError={onCheckpointError}
      />,
    );
    expect(await screen.findByTestId("world-checkpoint-error")).toHaveTextContent(
      "too_large",
    );
    expect(onCheckpointError).toHaveBeenCalledWith("too_large");
    expect(localStorage.getItem(CHECKPOINT_KEY)).toBe(raw);

    fireEvent.click(screen.getByTestId("discard-world-checkpoint"));
    expect(await screen.findByTestId("stage-mystery")).toBeInTheDocument();
    await waitFor(() => {
      const restarted = localStorage.getItem(CHECKPOINT_KEY);
      expect(restarted).not.toBe(raw);
      expect(JSON.parse(restarted ?? "{}")).toMatchObject({
        schemaVersion: "world-session-checkpoint.v1",
        ...CHECKPOINT_IDENTITY,
        events: [],
        ui: {
          mysteryChoice: null,
          initialExplanation: "",
          transferExplanation: "",
        },
      });
    });
  });

  it("does not access checkpoint storage without a session identity", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    render(<PrimarySourceReasoningWorld />);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
