// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SOURCE_CORROBORATION_PATH_PREVIEW } from "@/src/forge/paths/source-corroboration-preview";

import { SourceCorroborationPath } from "./SourceCorroborationPath";

afterEach(cleanup);

describe("SourceCorroborationPath", () => {
  it("keeps fixture availability and unavailable services explicit", () => {
    render(<SourceCorroborationPath preview={SOURCE_CORROBORATION_PATH_PREVIEW} />);

    expect(screen.getByRole("heading", { name: "Verify before you trust." })).toBeInTheDocument();
    expect(screen.getByText("Adult presentation · fixture path · not assigned")).toBeInTheDocument();
    expect(screen.getByText(SOURCE_CORROBORATION_PATH_PREVIEW.banner.text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the working source-corroboration World" })).toHaveAttribute("href", "/learn/ai-and-learning");
    expect(screen.getByText("Working source-corroboration World").closest("li")).toHaveAttribute("data-projection-status", "working-world");
    expect(screen.getByText("Legacy source metadata")).toBeInTheDocument();
    expect(screen.getByText("Delayed return")).toBeInTheDocument();
    expect(screen.getAllByText("Action unavailable in this presentation.")).toHaveLength(2);
    expect(screen.getByText(/Account, provider, model, database, API, or evidence-record actions/)).toBeInTheDocument();
    expect(screen.queryByText(/complete|mastered|proof/i)).not.toBeInTheDocument();
  });

  it("removes the World CTA when the presentation projection marks it unavailable", () => {
    render(
      <SourceCorroborationPath
        preview={{
          ...SOURCE_CORROBORATION_PATH_PREVIEW,
          primaryAction: {
            ...SOURCE_CORROBORATION_PATH_PREVIEW.primaryAction,
            available: false,
            unavailableReason: "runtime-binding-unavailable",
          },
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: "Open the working source-corroboration World" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The working World action is unavailable in this presentation: runtime-binding-unavailable.");
  });

  it("removes editable scratchpad controls when the exact project action is unavailable", () => {
    render(
      <SourceCorroborationPath
        preview={{
          ...SOURCE_CORROBORATION_PATH_PREVIEW,
          steps: SOURCE_CORROBORATION_PATH_PREVIEW.steps.map((step) => step.id !== "project" || !step.action
            ? step
            : {
                ...step,
                action: { ...step.action, available: false, unavailableReason: "project-template-unavailable" },
              }),
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("The exact authored fixture template did not pass this presentation check.");
    expect(screen.getByText("fixture-template-unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark this revision in this session" })).not.toBeInTheDocument();
  });

  it("keeps the scratchpad ephemeral and length-bounded", () => {
    render(<SourceCorroborationPath preview={SOURCE_CORROBORATION_PATH_PREVIEW} />);

    const draft = screen.getByRole("textbox", { name: "Draft an evidence-labelled explanation" });
    const marker = screen.getByRole("button", { name: "Mark this revision in this session" });
    expect(marker).toBeDisabled();
    expect(draft).toHaveAttribute("maxlength", "480");

    fireEvent.change(draft, { target: { value: "The cited study supports this limited claim." } });
    fireEvent.click(marker);
    expect(screen.getByText("Revision noted only in this open page. Refreshing clears it.")).toBeInTheDocument();
  });
});
