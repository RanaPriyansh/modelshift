// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EvidenceAtelierShowcase } from "./EvidenceAtelierShowcase";

afterEach(cleanup);

describe("EvidenceAtelierShowcase", () => {
  it("moves through the display-only learning sequence", () => {
    render(<EvidenceAtelierShowcase />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", {
        name: "How must the recipe change for eight people?",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Commit my attempt" }));
    expect(
      screen.getByRole("heading", { name: "One relationship needs repair." }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Prepare fresh proof" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Solve one unfamiliar ratio case without instructional help.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/larger text, read-aloud/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot prove permanent mastery/i),
    ).toBeInTheDocument();
  });

  it("changes only the local preview theme", () => {
    render(<EvidenceAtelierShowcase />);

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    expect(
      screen.getByRole("region", {
        name: "Evidence Atelier display-only design preview",
      }),
    ).toHaveAttribute("data-theme", "dark");
  });

  it("states that the preview creates no learning record", () => {
    render(<EvidenceAtelierShowcase initialStage="proof" />);

    expect(
      screen.getByText("No learning record is created.", { exact: true }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Begin proof preview" }),
    );
    expect(
      screen.getByText(
        "The preview moved to the delayed return. No proof was submitted.",
      ),
    ).toBeInTheDocument();
  });
});
