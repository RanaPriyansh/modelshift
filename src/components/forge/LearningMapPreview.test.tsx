// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ExploratorySourcePlanContract } from "@/src/lib/forge-planner/schema";

import { LearningMapPreview } from "./LearningMapPreview";

const PLAN: ExploratorySourcePlanContract = {
  schemaVersion: "1.1",
  contractKind: "exploratory_source_plan",
  request: {
    ageMode: "adult",
    depth: "deep",
    startingPoint: "curious",
    successShape: "build",
    guardianManaged: false,
    sourceMode: "curated",
  },
  route: { topicId: null, worldId: null, confidence: "no_authored_match" },
  grounding: {
    status: "unverified_exploratory",
    sourceIds: [],
    sources: [],
    claimBoundary: "No subject content has been verified.",
  },
  exploration: {
    title: "Source verification required",
    effectiveSourceMode: "curated",
    steps: [
      {
        id: "clarify_scope",
        objective: "Clarify the requested capability and practical outcome.",
        exitGate: "The bounded target is explicit.",
      },
      {
        id: "verify_sources",
        objective: "Review candidate sources for authority and contradiction.",
        exitGate: "The source set is explicitly approved.",
      },
    ],
  },
  model: {
    contribution: "not_used",
    fallbackReason: "disabled",
    rephrasedQuestion: null,
    rephraseStatus: "not_present",
  },
};

afterEach(cleanup);

describe("LearningMapPreview", () => {
  it("preserves learner words, exposes missing authority, and keeps revision requests local", () => {
    render(<LearningMapPreview learnerQuestion="I want to learn how to restore an old chair." plan={PLAN} />);

    expect(screen.getByText("I want to learn how to restore an old chair.")).toBeInTheDocument();
    expect(screen.getByText("Safe practical project and practice sequence")).toBeInTheDocument();
    expect(screen.getByText("No revision requests in this page.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Ask to revise" })[0]!);
    const note = screen.getByLabelText(/^What should change/);
    fireEvent.change(note, { target: { value: "Start with tool safety and a no-cost materials option." } });

    expect(screen.getByText("Learner revision requested")).toBeInTheDocument();
    expect(screen.getByText("1 local revision request — not submitted or saved.")).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Clear local requests" }));
    expect(screen.getByText("No revision requests in this page.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/tool safety/)).not.toBeInTheDocument();
  });
});
