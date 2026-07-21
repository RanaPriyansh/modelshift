// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EvidenceLearningWorld } from "./EvidenceLearningWorld";

afterEach(cleanup);

describe("EvidenceLearningWorld", () => {
  it("renders standalone at the encounter and reveals no source card before commitment", () => {
    render(<EvidenceLearningWorld />);
    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "encounter");
    expect(screen.getByRole("blockquote")).toHaveTextContent("AI always helps people learn");
    expect(screen.queryByTestId("evidence-card-bastani-pnas")).not.toBeInTheDocument();
  });

  it("completes the authored workflow, structurally removes the desk for transfer, and emits all six record fields", () => {
    render(<EvidenceLearningWorld />);

    fireEvent.click(screen.getByRole("radio", { name: /It depends/i }));
    fireEvent.change(screen.getByLabelText(/Why do you hold that stance/i), {
      target: { value: "I think the way the tool enters the learning process changes the result." },
    });
    fireEvent.click(screen.getByTestId("commit-encounter"));

    expect(screen.getByTestId("stage-evidence")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("review-bastani-pnas"));
    fireEvent.click(screen.getByTestId("review-tutor-copilot"));
    fireEvent.click(screen.getByTestId("continue-from-evidence"));

    fireEvent.click(screen.getByRole("radio", { name: /Who receives the output/i }));
    fireEvent.click(screen.getByTestId("commit-difference"));

    const readingOne = screen.getByText(/Because assisted practice performance rose/i).closest("fieldset");
    const readingTwo = screen.getByText(/The learning evidence changes with the role/i).closest("fieldset");
    expect(readingOne).not.toBeNull();
    expect(readingTwo).not.toBeNull();
    fireEvent.click(within(readingOne!).getByRole("radio", { name: "Overreaches the cards" }));
    fireEvent.click(within(readingTwo!).getByRole("radio", { name: "Fits both cards" }));
    fireEvent.click(screen.getByTestId("commit-readings"));

    fireEvent.click(screen.getByRole("radio", { name: /In these studies, learning outcomes differed/i }));
    fireEvent.click(screen.getByTestId("commit-bounded-claim"));

    const transfer = screen.getByTestId("stage-transfer");
    expect(transfer).toHaveTextContent("Highlighting always improves memory");
    expect(transfer.textContent).not.toMatch(/\bAI\b/);
    expect(screen.queryByTestId("evidence-card-bastani-pnas")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-card-tutor-copilot")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("submit-transfer")).toHaveTextContent("Submit once");

    fireEvent.click(screen.getByRole("radio", { name: /These sources do not warrant “always”/i }));
    fireEvent.click(screen.getByRole("radio", { name: /held constant/i }));
    fireEvent.click(screen.getByTestId("submit-transfer"));

    expect(screen.getByTestId("evidence-learning-world")).toHaveAttribute("data-stage", "result");
    expect(screen.getByText("Cold transfer held")).toBeInTheDocument();
    for (const id of ["started-with", "tested-with", "support-used", "did-alone", "still-open", "return-proof"]) {
      expect(screen.getByTestId(`record-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("submit-transfer")).not.toBeInTheDocument();
  });
});
