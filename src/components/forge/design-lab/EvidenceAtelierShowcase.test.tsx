// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EvidenceAtelierShowcase } from "./EvidenceAtelierShowcase";

const STORAGE_KEY = "forge.internal.design-lab.evidence-atelier.fixture.v1";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function fillResponse(value: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
}

function moveToProofTask() {
  fireEvent.click(screen.getByRole("button", { name: "Begin recall" }));
  fillResponse("The relationship stays constant when each amount scales together.");
  fireEvent.click(screen.getByRole("button", { name: "Save recall" }));

  fillResponse("Each ingredient must scale by the same factor for eight people.");
  fireEvent.click(screen.getByRole("button", { name: "Commit my attempt" }));

  fillResponse("I will multiply every ingredient by the people ratio.");
  fireEvent.click(screen.getByRole("button", { name: "Prepare protected proof" }));
  fireEvent.click(screen.getByRole("button", { name: "Begin proof task" }));
}

function completeProofFixture() {
  moveToProofTask();
  fillResponse("Ten divided by four is the scale factor for every ingredient.");
  fireEvent.click(screen.getByRole("button", { name: "Submit bounded proof" }));
}

describe("EvidenceAtelierShowcase", () => {
  it("gates future stages until each learner-flow condition is complete", () => {
    render(<EvidenceAtelierShowcase />);

    expect(
      screen.getByRole("button", {
        name: "Attempt, step 3 of 6, locked until recall is saved",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Repair, step 4 of 6, locked until the attempt is committed",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Protected proof, step 5 of 6, locked until the revision is saved",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Delayed return, step 6 of 6, locked until the proof receipt exists",
      }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Recall, step 2 of 6" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "What must stay true when the recipe changes?",
      }),
    ).toBeInTheDocument();
  });

  it("requires revision and creates bounded proof and return fixture receipts", () => {
    render(<EvidenceAtelierShowcase />);

    fireEvent.click(screen.getByRole("button", { name: "Begin recall" }));
    fireEvent.click(screen.getByRole("button", { name: "Save recall" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write one recall sentence before continuing.",
    );

    fillResponse("The relationship stays constant when each amount scales together.");
    fireEvent.click(screen.getByRole("button", { name: "Save recall" }));
    fillResponse("Each ingredient must scale by the same factor for eight people.");
    fireEvent.click(screen.getByRole("button", { name: "Commit my attempt" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Prepare protected proof" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write the correction you will test before opening Proof.",
    );

    fillResponse("I will multiply every ingredient by the people ratio.");
    fireEvent.click(
      screen.getByRole("button", { name: "Prepare protected proof" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Begin proof task" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit bounded proof" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write one protected response before submitting the proof fixture.",
    );

    fillResponse("Ten divided by four is the scale factor for every ingredient.");
    fireEvent.click(screen.getByRole("button", { name: "Submit bounded proof" }));
    expect(
      screen.getByRole("heading", { name: "Test the same relationship in a graph." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Earlier protected proof receipt" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Begin return task" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit return receipt" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Write one return response before submitting the return fixture.",
    );

    fillResponse("The graph keeps the same scale factor across the new context.");
    fireEvent.click(screen.getByRole("button", { name: "Submit return receipt" }));
    expect(
      screen.getByRole("heading", {
        name: "One delayed transfer receipt is stored locally.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Delayed return receipt" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Learning, mastery, durable retention, and broader transfer remain untested.",
      ),
    ).toHaveLength(2);
    expect(window.localStorage).toHaveLength(1);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
      '"fixtureId":"forge-evidence-atelier-audit"',
    );
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"proofReceipt"');
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"returnReceipt"');
  });

  it("restores only the labelled internal fixture through reload", async () => {
    const firstRender = render(<EvidenceAtelierShowcase />);
    completeProofFixture();

    fireEvent.click(screen.getByRole("button", { name: "Begin return task" }));
    fillResponse("The graph keeps the same scale factor across the new context.");
    fireEvent.click(screen.getByRole("button", { name: "Submit return receipt" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"returnReceipt"');
    });

    firstRender.unmount();
    render(<EvidenceAtelierShowcase />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Recall your ratio model before a new case.",
        }),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect fixture receipts" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "One delayed transfer receipt is stored locally.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Internal audit fixture · test data only", { exact: true }),
    ).toHaveLength(3);
  });

  it("changes only the local preview theme and keeps the audit boundary visible", () => {
    render(<EvidenceAtelierShowcase />);

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(
      screen.getByRole("region", {
        name: "Evidence Atelier internal audit fixture",
      }),
    ).toHaveAttribute("data-theme", "dark");
    expect(
      screen.getByText("Browser-local only · no production learner record.", {
        exact: true,
      }),
    ).toBeInTheDocument();
  });
});
