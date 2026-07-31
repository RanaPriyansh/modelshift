// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  universityRecoveryWhatIfFixture,
} from "@/app/internal/university-recovery/recovery-what-if-fixture.server";

import { UniversityRecoveryWhatIfWorkspace } from "./UniversityRecoveryWhatIfWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderWorkspace() {
  const fixture = await universityRecoveryWhatIfFixture();
  return {
    fixture,
    ...render(<UniversityRecoveryWhatIfWorkspace fixture={fixture} />),
  };
}

describe("UniversityRecoveryWhatIfWorkspace", () => {
  it("shows fixed evidence before neutral choices with no default result", async () => {
    const { container } = await renderWorkspace();
    const evidence = screen.getByRole("heading", {
      level: 2,
      name: "Held fixed in every what-if",
    });
    const choices = screen.getByRole("group", {
      name: "Try a sample amount of available time",
    });
    const radios = screen.getAllByRole("radio");

    expect(screen.getByRole("heading", {
      level: 1,
      name: "What changes if the time you can use changes?",
    })).toBeInTheDocument();
    expect(evidence.compareDocumentPosition(choices)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Argument analysis")).toBeInTheDocument();
    expect(screen.getByText("learner classified: required")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getAllByText(/Reviewed learner-connected copy/))
      .toHaveLength(2);
    expect(radios).toHaveLength(3);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.getByLabelText("No what-if result selected")).toBeInTheDocument();
    expect(container.textContent).not.toContain("draft_ready");
    expect(container.textContent).not.toContain("human_help_required");
    expect(container.textContent).not.toContain("projection digest");
  });

  it.each([
    {
      choice: /4 h available/,
      heading: "The full protected range fits.",
      arithmetic: "240 minus 30 equals 210 workable minutes",
    },
    {
      choice: /2 h 10 min available/,
      heading: "Only the low estimate fits.",
      arithmetic: "130 minus 30 equals 100 workable minutes",
    },
    {
      choice: /1 h 40 min available/,
      heading: "Even the low estimate does not fit.",
      arithmetic: "100 minus 30 equals 70 workable minutes",
    },
  ])("renders transparent arithmetic after choosing $choice", async ({
    choice,
    heading,
    arithmetic,
  }) => {
    await renderWorkspace();

    fireEvent.click(screen.getByRole("radio", { name: choice }));

    expect(screen.getByRole("heading", { level: 2, name: heading }))
      .toBeInTheDocument();
    expect(screen.getByLabelText(arithmetic)).toBeInTheDocument();
    expect(screen.getAllByText("1 h 30 min to 2 h").length)
      .toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Not allowed", { selector: "dd" }))
      .toHaveLength(3);
  });

  it("keeps the prepared human question visibly unsent and exposes no send action", async () => {
    await renderWorkspace();

    fireEvent.click(screen.getByRole("radio", {
      name: /1 h 40 min available/,
    }));

    expect(screen.getByText("Prepared, not sent", { exact: true }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 3,
      name: "Recovery question about Argument analysis",
    })).toBeInTheDocument();
    expect(screen.getByText("No send control exists in this preview."))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send/i }))
      .not.toBeInTheDocument();
  });

  it("retains native radio focus and reset clears selection then focuses the first choice", async () => {
    await renderWorkspace();
    const first = screen.getByRole("radio", { name: /4 h available/ });
    const second = screen.getByRole("radio", {
      name: /2 h 10 min available/,
    });
    second.focus();

    fireEvent.click(second);

    expect(document.activeElement).toBe(second);
    expect(second).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Reset what-if" }));
    expect(document.activeElement).toBe(first);
    expect(screen.getAllByRole("radio").every((radio) => (
      !(radio as HTMLInputElement).checked
    ))).toBe(true);
    expect(screen.getByLabelText("No what-if result selected")).toBeInTheDocument();
  });

  it("announces only one concise consequence in the ready view", async () => {
    await renderWorkspace();
    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("");
    fireEvent.click(screen.getByRole("radio", {
      name: /2 h 10 min available/,
    }));
    expect(status).toHaveTextContent(
      "Only the low estimate fits in 100 workable minutes. Learner choice remains.",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("performs no network, storage, history, clipboard, or navigation effect", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const historySpy = vi.spyOn(History.prototype, "pushState");
    const clipboardWrite = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWrite },
    });
    await renderWorkspace();

    fireEvent.click(screen.getByRole("radio", { name: /4 h available/ }));
    fireEvent.click(screen.getByRole("radio", {
      name: /1 h 40 min available/,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Reset what-if" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(historySpy).not.toHaveBeenCalled();
    expect(clipboardWrite).not.toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save|apply|accept|send/i }))
      .not.toBeInTheDocument();
  });

  it("receives a frozen presentation fixture without raw requests or internal identities", async () => {
    const fixture = await universityRecoveryWhatIfFixture();
    const serialized = JSON.stringify(fixture);

    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.choices)).toBe(true);
    expect(serialized).not.toContain("ownerUserId");
    expect(serialized).not.toContain("tenantId");
    expect(serialized).not.toContain("candidateId");
    expect(serialized).not.toContain("decisionId");
    expect(serialized).not.toContain("recoveryRequest");
    expect(serialized).not.toContain("projectionDigest");
    expect(serialized).not.toContain(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("removes every capacity control when source review is required", async () => {
    const fixture = await universityRecoveryWhatIfFixture("source-review");
    render(<UniversityRecoveryWhatIfWorkspace fixture={fixture} />);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "Review the copied deadline before trying a capacity what-if.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", {
      name: "Try a sample amount of available time",
    })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("No what-if result selected"))
      .not.toBeInTheDocument();
  });
});
