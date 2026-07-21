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
  fireEvent.click(screen.getByTestId("ratio-open-experiment"));
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
  it("renders the complete authored flow and structurally removes support in proof", async () => {
    const onEvidence = vi.fn();
    render(<ProportionalReasoningWorld onEvidence={onEvidence} />);

    expect(screen.getByTestId("ratio-stage-mystery").textContent).toContain("Which drink will taste more strongly of citrus?");
    reachIndependentTransfer({ useSupport: true });

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

    fireEvent.click(screen.getByTestId("ratio-schedule-return"));
    expect(screen.getByRole("status").textContent).toContain("3 days");
    await waitFor(() => expect(onEvidence).toHaveBeenCalledTimes(2));
    expect(onEvidence.mock.calls[1]?.[0].returnProof.scheduled).toBe(true);
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
});
