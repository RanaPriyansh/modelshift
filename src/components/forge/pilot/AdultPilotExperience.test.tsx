// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reviewedAdultPilotProjection } from "@/app/pilot/review-fixture.server";

import { AdultPilotExperience } from "./AdultPilotExperience";

afterEach(cleanup);

function beginAtMapDecision() {
  render(<AdultPilotExperience projection={reviewedAdultPilotProjection()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "What do you want to understand or make?" }), { target: { value: "I want to compare practical mixtures." } });
  fireEvent.change(screen.getByRole("textbox", { name: "What practical outcome would make that useful?" }), { target: { value: "Choose a proportion for a recipe." } });
  fireEvent.click(screen.getByRole("button", { name: "Record my intent and outcome" }));
  fireEvent.click(screen.getByRole("button", { name: "Inspect this candidate map" }));
  fireEvent.change(screen.getByRole("textbox", { name: "State your decision in your own words" }), { target: { value: "I can explain my route decision." } });
}

function commitProse(label: string, actionLabel: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: actionLabel }));
}

describe("AdultPilotExperience", () => {
  it("traverses the reviewed fixture controller deterministically and clears all learner prose at proof withdrawal", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const secret = "EPHEMERAL-LEARNER-PROSE: compare both quantities first.";
    const correction = "EPHEMERAL-READING-CORRECTION: scale the quantities together.";

    beginAtMapDecision();
    fireEvent.click(screen.getByRole("button", { name: "Retain this reviewed route" }));
    commitProse("Your starting strategy", "Commit my starting strategy", secret);
    fireEvent.click(screen.getByRole("button", { name: "Show the two uncertain readings" }));
    fireEvent.click(screen.getByRole("button", { name: "Correct reading 1" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your correction for reading 1" }), { target: { value: correction } });
    fireEvent.click(screen.getByRole("button", { name: "Use my correction for reading 1" }));
    expect(screen.getByText(correction)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reject reading 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Select the equal-quantity comparison" }));
    fireEvent.click(screen.getByRole("button", { name: "Use this reviewed checkpoint" }));
    commitProse("Your reconstruction", "Commit my reconstruction", "I compare equal quantities without the route.");
    commitProse("Your practice plan", "Commit my practice", "I will rehearse with another mixture.");
    commitProse("Your project explanation", "Commit my individual project", "I will make an individual explanation.");
    commitProse("Your critique", "Commit my critique", "I will state one limitation.");
    commitProse("Your individual defence", "Commit my individual defence", "I will defend my own decision.");

    fireEvent.click(screen.getByRole("button", { name: "Withdraw in-product support" }));
    const proof = screen.getByTestId("pilot-proof");
    expect(proof).toHaveAttribute("data-proof-locked", "true");
    expect(screen.queryByTestId("pilot-resource-surface")).not.toBeInTheDocument();
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(screen.queryByText(correction)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Your correction for reading 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Your starting strategy" })).not.toBeInTheDocument();
    expect(within(proof).queryByRole("button", { name: /hint|model|resource|route|support/i })).not.toBeInTheDocument();

    const screenReader = within(proof).getByRole("button", { name: "screen reader" });
    fireEvent.click(screenReader);
    expect(screenReader).toHaveAttribute("aria-pressed", "true");
    commitProse("Your unfamiliar comparison", "Submit this unfamiliar comparison", "I compare the multiplier for both quantities before deciding.");
    fireEvent.click(screen.getByRole("button", { name: "Record this fixture attempt as untested" }));
    fireEvent.click(screen.getByRole("button", { name: "Set the reviewed fixture return" }));
    fireEvent.click(screen.getByRole("button", { name: "Record delayed return as untested" }));

    expect(screen.getByTestId("pilot-completed")).toHaveTextContent("remains untested");
    expect(screen.getByText(/No capability, evidence, retention, or mastery claim was created/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it.each([
    ["Decline this route", "pilot-route-declined", "Route declined."],
    ["Request a reviewed revision", "pilot-route-review-required", "Route review required."],
  ])("keeps %s as a terminal controller path", (actionLabel, testId, heading) => {
    beginAtMapDecision();
    fireEvent.click(screen.getByRole("button", { name: actionLabel }));
    expect(screen.getByTestId(testId)).toHaveTextContent(heading);
    expect(screen.queryByRole("button", { name: /checkpoint|strategy|comparison|support|proof/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("pilot-resource-surface")).not.toBeInTheDocument();
  });

  it("does not write browser storage while rendering or traversing the local fixture", () => {
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");

    beginAtMapDecision();

    expect(storageSetItem).not.toHaveBeenCalled();
    storageSetItem.mockRestore();
  });
});
