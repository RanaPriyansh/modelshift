// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ExploratorySourcePlanContract,
  GroundedLearningContract,
} from "@/src/lib/forge-planner/schema";

import { LearningMapPreview } from "./LearningMapPreview";

const PLAN: ExploratorySourcePlanContract = {
  schemaVersion: "1.1",
  contractKind: "exploratory_source_plan",
  request: {
    ageMode: "adult",
    depth: "deep",
    startingPoint: "curious",
    successShape: "build",
    currentKnowledge: "I have repaired simple wooden objects.",
    practicalOutcome: "Restore a chair safely and document the decisions.",
    timeAvailable: "ongoing",
    modalityNeeds: ["text", "video", "hands_on"],
    constraints: "Use low-cost tools.",
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

const GROUNDED_PLAN: GroundedLearningContract = {
  schemaVersion: "1.1",
  contractKind: "grounded_learning",
  request: PLAN.request,
  route: {
    topicId: "force_motion",
    worldId: "world.force-and-motion",
    worldVersion: "1.0.1",
    worldRoute: "/learn/force-and-motion",
    confidence: "authored_match",
  },
  grounding: {
    status: "grounded_in_authored_sources",
    sourceIds: ["source.openstax.newtons-first-law"],
    sources: [{
      id: "source.openstax.newtons-first-law",
      title: "Newton’s First Law of Motion",
      publisher: "OpenStax",
      locator: "https://openstax.org/",
      contentVersion: "2026-07-20",
      kind: "authoritative_educational",
      reviewStatus: "reviewed",
      reviewedAt: "2026-07-20T00:00:00.000Z",
    }],
    claimBoundary: "Only the authored route and source are grounded.",
  },
  learning: {
    title: "Force and motion",
    objective: "Explain what motion does after a short push ends.",
    startingPoint: "curious",
    requestedSuccessShape: "build",
    milestones: [
      { id: "commit", title: "Commit a model", objective: "Predict before seeing the comparison." },
      { id: "test", title: "Run the separating test", objective: "Compare synchronized authored worlds." },
    ],
  },
  sourcePolicy: "authored_only",
  model: PLAN.model,
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

  it("requires explicit acceptance before activating a grounded World and makes rejection reversible", () => {
    render(
      <LearningMapPreview
        learnerQuestion="Why does motion continue after a push?"
        plan={GROUNDED_PLAN}
        routeHref="/learn/force-and-motion"
      />,
    );

    expect(screen.queryByRole("link", { name: "Enter working World" })).not.toBeInTheDocument();
    expect(screen.getByText("Available through authored interface copy and reviewed source links.")).toBeInTheDocument();
    expect(screen.getByText("Requested, but no reviewed video is bound to this route.")).toBeInTheDocument();
    expect(screen.getByText(/accepting the route does not certify that it completes the broader outcome/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept reviewed route" }));
    expect(screen.getByRole("link", { name: "Enter working World" })).toHaveAttribute(
      "href",
      "/learn/force-and-motion",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reject this map" }));
    expect(screen.queryByRole("link", { name: "Enter working World" })).not.toBeInTheDocument();
    expect(screen.getByText("Map rejected for this page. No route, content, or learner record was activated.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Return to draft" }));
    expect(screen.getByRole("button", { name: "Accept reviewed route" })).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });
});
