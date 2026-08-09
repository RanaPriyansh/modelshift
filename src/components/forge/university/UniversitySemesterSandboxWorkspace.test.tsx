// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  universitySemesterSandboxFixture,
} from "@/app/internal/university-semester-loop/semester-sandbox-fixture.server";

import {
  UniversitySemesterSandboxUnavailable,
  UniversitySemesterSandboxWorkspace,
} from "./UniversitySemesterSandboxWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWorkspace() {
  const fixture = await universitySemesterSandboxFixture();
  return {
    fixture,
    ...render(<UniversitySemesterSandboxWorkspace fixture={fixture} />),
  };
}

describe("UniversitySemesterSandboxWorkspace", () => {
  it("uses the paper token for the selected 10px index", () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university/UniversitySemesterSandboxWorkspace.module.css",
      ),
      "utf8",
    );
    const selectedIndex = css.match(
      /\.choice\[data-selected="true"\] \.choiceIndex\s*\{(?<body>[^}]*)\}/,
    )?.groups?.body;

    expect(selectedIndex).toContain("color: var(--forge-paper);");
    expect(selectedIndex).not.toContain("color: var(--forge-cyan);");
  });

  it("starts with one source judgment and no exposed learning action", async () => {
    const { container } = await renderWorkspace();

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Does this copied deadline match the checked source?",
    })).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "This copy stays outside Today.",
    })).toBeInTheDocument();
    expect(screen.getByText("Sample syllabus copy")).toBeInTheDocument();
    expect(screen.getByText("Assignment one")).toBeInTheDocument();
    expect(screen.getByText("Fixed sample correction")).toBeInTheDocument();
    expect(screen.getByText("No decision")).toBeInTheDocument();
    expect(screen.getByText("Review the copied deadline")).toBeInTheDocument();
    expect(screen.queryByText("Test one claim against two sources")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("article")).toHaveAttribute(
      "data-status",
      "review_required",
    );
    expect(screen.getByRole("button", { name: "Reset review" })).toBeDisabled();
    expect(
      screen.getByRole("heading", { level: 2, name: "Assignment one" })
        .compareDocumentPosition(
          screen.getByRole("group", {
            name: "Choose the fixed sample source decision",
          }),
        )
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the exact accepted-path action after transcription confirmation", async () => {
    const { container } = await renderWorkspace();

    const accept = screen.getByRole("radio", { name: /Copy matches/ });
    accept.focus();
    fireEvent.click(accept);

    const title = screen.getByRole("heading", {
      level: 2,
      name: "Test one claim against two sources",
    });
    expect(accept).toHaveFocus();
    expect(title).not.toHaveFocus();
    expect(screen.getByText("Transcription confirmed")).toBeInTheDocument();
    expect(screen.getByText("Inspect the exact protected-study contract")).toBeInTheDocument();
    expect(screen.getByText(/action still comes from the existing learner-accepted path/i)).toBeInTheDocument();
    expect(screen.getByText("Existing accepted path only")).toBeInTheDocument();
    expect(screen.getAllByText("Not allowed")).not.toHaveLength(0);
    expect(container.querySelector("article")).toHaveAttribute(
      "data-status",
      "ready",
    );
    expect(container.querySelector("article")).toHaveAttribute(
      "data-choice",
      "accept",
    );
  });

  it("keeps the fixed sample correction separate without changing the action", async () => {
    await renderWorkspace();

    const correction = screen.getByRole("radio", {
      name: /Use sample correction/,
    });
    correction.focus();
    fireEvent.click(correction);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Test one claim against two sources",
    })).not.toHaveFocus();
    expect(correction).toHaveFocus();
    expect(screen.getByText("Fixed sample correction selected")).toBeInTheDocument();
    expect(screen.getAllByText("Fixed sample correction")).not.toHaveLength(0);
    expect(screen.getByText(
      /fixed server-authored sample correction changes copied context only/i,
    )).toBeInTheDocument();
    expect(screen.getByText("Corrected deadline bound")).toBeInTheDocument();
  });

  it("renders rejection as a replacement-source refusal with no action", async () => {
    const { container } = await renderWorkspace();

    const reject = screen.getByRole("radio", {
      name: /Copy is not current/,
    });
    reject.focus();
    fireEvent.click(reject);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "This copy stops at the source boundary.",
    })).not.toHaveFocus();
    expect(reject).toHaveFocus();
    expect(screen.getByText("Replacement source required")).toBeInTheDocument();
    expect(screen.getByText("Bring a current source copy")).toBeInTheDocument();
    expect(screen.getByText("Deadline missing")).toBeInTheDocument();
    expect(screen.queryByText("Test one claim against two sources")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspect the exact protected-study contract")).not.toBeInTheDocument();
    expect(container.querySelector("article")).toHaveAttribute(
      "data-status",
      "invalid",
    );
    expect(screen.getByText("Unsigned refusal")).toBeInTheDocument();
  });

  it("resets to the exact pending view in browser memory", async () => {
    const { container } = await renderWorkspace();
    const reset = screen.getByRole("button", { name: "Reset review" });

    fireEvent.click(screen.getByRole("radio", { name: /Copy matches/ }));
    expect(reset).toBeEnabled();
    fireEvent.click(reset);

    expect(screen.getByRole("radio", { name: /Not reviewed/ }))
      .toBeChecked();
    expect(screen.getByRole("radio", { name: /Not reviewed/ }))
      .toHaveFocus();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "This copy stays outside Today.",
    })).not.toHaveFocus();
    expect(container.querySelector("article")).toHaveAttribute(
      "data-status",
      "review_required",
    );
    expect(reset).toBeDisabled();
  });

  it("receives only the closed precomputed matrix and preserves action identity", async () => {
    const fixture = await universitySemesterSandboxFixture();
    const statuses = fixture.scenarios.map((scenario) => [
      scenario.id,
      scenario.projection.status,
    ]);
    const accepted = fixture.scenarios.find((scenario) => scenario.id === "accept");
    const corrected = fixture.scenarios.find(
      (scenario) => scenario.id === "fixed_correct",
    );

    expect(statuses).toEqual([
      ["pending", "review_required"],
      ["accept", "ready"],
      ["fixed_correct", "ready"],
      ["reject", "invalid"],
    ]);
    expect(accepted?.projection.action).toEqual(
      corrected?.projection.action,
    );
    expect(accepted?.projection.projectionDigest).not.toBe(
      corrected?.projection.projectionDigest,
    );
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.scenarios)).toBe(true);
    for (const scenario of fixture.scenarios) {
      expect(Object.keys(scenario.projection).sort()).toEqual([
        "action",
        "loopStatus",
        "projectionDigest",
        "status",
      ]);
    }
    expect(JSON.stringify(fixture)).not.toMatch(
      /decisionId|candidateId|semesterLoopRequest|sourceDecisions|reconciliationRequest/,
    );
  });

  it("uses native local controls without fetch, storage, clipboard, or history effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const pushStateSpy = vi.spyOn(history, "pushState");
    const replaceStateSpy = vi.spyOn(history, "replaceState");
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      "clipboard",
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      await renderWorkspace();
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(4);
      radios.forEach((radio) => {
        expect(radio).not.toHaveAttribute("tabindex", "-1");
      });

      for (const radio of radios.slice(1)) {
        radio.focus();
        fireEvent.click(radio);
        expect(radio).toHaveFocus();
      }
      fireEvent.click(screen.getByRole("button", { name: "Reset review" }));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(replaceStateSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("fails closed when the fixture is unavailable", () => {
    render(<UniversitySemesterSandboxUnavailable />);

    expect(screen.getByRole("heading", {
      level: 1,
      name: "No transient semester review is available.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/No source decision, Today action/)).toBeInTheDocument();
  });
});
