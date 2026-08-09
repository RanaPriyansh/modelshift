// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  universityPostAttemptRepairFixture,
  type UniversityPostAttemptRepairFixture,
} from "@/app/internal/university-post-attempt-repair/post-attempt-repair-fixture.server";

import {
  UniversityPostAttemptRepairWorkspace,
} from "./UniversityPostAttemptRepairWorkspace";
import {
  UniversityPostAttemptRepairUnavailable,
} from "./UniversityPostAttemptRepairUnavailable";

let fixture: UniversityPostAttemptRepairFixture;

beforeAll(async () => {
  fixture = await universityPostAttemptRepairFixture();
});

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UniversityPostAttemptRepairWorkspace", () => {
  it("puts the exact result before one concrete repair move without exposing an answer", () => {
    render(<UniversityPostAttemptRepairWorkspace fixture={fixture} />);

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Repair the boundary, not the answer.",
    })).toBeInTheDocument();
    expect(screen.getByText("1 of 2 authored checks")).toBeInTheDocument();
    expect(screen.getByText("Bounded conclusion")).toBeInTheDocument();
    expect(screen.getByText("held this attempt")).toBeInTheDocument();
    expect(screen.getByText("Unresolved condition")).toBeInTheDocument();
    expect(screen.getByText("still open")).toBeInTheDocument();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "Name the missing comparison.",
    })).toBeInTheDocument();
    expect(screen.getByLabelText(
      "Illustrative response shape, not an input",
    )).toHaveTextContent(
      "Name one condition the briefs do not keep comparable",
    );
    expect(screen.getByLabelText(
      "Illustrative response shape, not an input",
    )).toHaveTextContent("what the two briefs cannot establish");
    expect(screen.getByText(
      "Illustrative response shape — not an input",
    )).toBeInTheDocument();
    expect(screen.getByText(/In your own notes, write one sentence/i))
      .toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {
      name: /start|save|submit|retry|rescore|apply|accept/i,
    })).not.toBeInTheDocument();
    expect(screen.queryByText(/Exact attempt context/i)).not.toBeInTheDocument();
    expect(screen.getByText("Server-paired synthetic context"))
      .toBeInTheDocument();
    expect(screen.getByText(
      /server-paired synthetic course context; not bound into the receipt/i,
    )).toBeInTheDocument();

    const evidence = screen.getByRole("heading", {
      level: 2,
      name: "1 of 2 authored checks",
    });
    const repair = screen.getByRole("heading", {
      level: 2,
      name: "Name the missing comparison.",
    });
    expect(
      evidence.compareDocumentPosition(repair)
      & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("bounded-measures");
    expect(text).not.toContain("color-choice");
    expect(text).not.toContain("held-constant");
  });

  it("keeps missing mapping, pass, and missing receipt visibly distinct", () => {
    render(<UniversityPostAttemptRepairWorkspace fixture={fixture} />);

    fireEvent.click(screen.getByRole("radio", {
      name: /Two checks open\. No authored repair mapping/i,
    }));
    expect(screen.getByRole("heading", {
      level: 1,
      name: "Stop before inventing advice.",
    })).toBeInTheDocument();
    expect(screen.getByText(
      /Check-level repair detail is withheld/i,
    )).toBeInTheDocument();
    expect(screen.queryByText(
      "Name the missing comparison.",
    )).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", {
      name: /Both checks held\. Immediate result only/i,
    }));
    expect(screen.getByRole("heading", {
      level: 1,
      name: "No immediate repair is selected.",
    })).toBeInTheDocument();
    expect(screen.getByText("2 of 2 authored checks")).toBeInTheDocument();
    expect(screen.getByText(
      /retention, repeat reliability, mastery, or broader capability/i,
    )).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", {
      name: /Receipt unavailable\. Attempt boundary stops/i,
    }));
    expect(screen.getByRole("heading", {
      level: 1,
      name: "No result or repair is available.",
    })).toBeInTheDocument();
    expect(screen.queryByText(/of 2 authored checks/)).not.toBeInTheDocument();
    expect(screen.queryByText(
      "Name the missing comparison.",
    )).not.toBeInTheDocument();
  });

  it("preserves native focus and resets to the first closed scenario", () => {
    render(<UniversityPostAttemptRepairWorkspace fixture={fixture} />);
    const group = screen.getByRole("group", {
      name: "Select a closed synthetic result",
    });
    const radios = within(group).getAllByRole("radio");
    const first = radios[0]!;
    const third = radios[2]!;

    expect(first).toBeChecked();
    third.focus();
    fireEvent.click(third);
    expect(third).toHaveFocus();
    expect(third).toBeChecked();

    fireEvent.click(screen.getByRole("button", {
      name: "Reset result",
    }));
    expect(first).toHaveFocus();
    expect(first).toBeChecked();
    expect(screen.getByRole("button", {
      name: "Reset result",
    })).toBeDisabled();
  });

  it("announces one concise state change and keeps mapping rationale optional", () => {
    render(<UniversityPostAttemptRepairWorkspace fixture={fixture} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "One check remains open. One authored repair move is available for inspection.",
    );

    const details = screen.getByText("Why this move").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Why this move"));
    expect(details).toHaveAttribute("open");
    expect(details).toHaveTextContent(
      /fixed mapping for that result, not an inference about the learner/i,
    );

    fireEvent.click(screen.getByRole("radio", {
      name: /Two checks open/i,
    }));
    expect(status).toHaveTextContent(
      "No fixed authored repair mapping exists for this exact result.",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", {
      name: /Both checks held/i,
    }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", {
      name: /Receipt unavailable/i,
    }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("performs no network, storage, history, clipboard, or navigation effect", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const pushState = vi.spyOn(History.prototype, "pushState");
    const replaceState = vi.spyOn(History.prototype, "replaceState");
    const open = vi.spyOn(window, "open");
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<UniversityPostAttemptRepairWorkspace fixture={fixture} />);
    fireEvent.click(screen.getByRole("radio", {
      name: /Two checks open/i,
    }));
    fireEvent.click(screen.getByRole("radio", {
      name: /Both checks held/i,
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Reset result",
    }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("receives a deeply frozen presentation fixture without raw runtime authority", () => {
    const serialized = JSON.stringify(fixture);
    expect(Object.isFrozen(fixture)).toBe(true);
    expect(Object.isFrozen(fixture.scenarios)).toBe(true);
    expect(fixture.scenarios.every(Object.isFrozen)).toBe(true);
    expect(fixture.scenarios.map((scenario) => scenario.view.status)).toEqual([
      "repair_ready",
      "repair_mapping_missing",
      "not_applicable",
      "invalid",
    ]);
    expect(serialized).not.toContain("todayRequest");
    expect(serialized).not.toContain("worldPack");
    expect(serialized).not.toContain("runtimeReceipt");
    expect(serialized).not.toContain("projectionDigest");
    expect(serialized).not.toContain("attempt.university-repair");
    expect(serialized).not.toContain("choice:bounded-measures");
    expect(serialized).not.toContain("open-question:color-choice");
    expect(serialized).not.toContain("choice:always-harms");
    expect(serialized).not.toContain("open-question:reader-preference");
    expect(serialized).not.toContain("open-question:held-constant");
    expect(serialized).not.toContain(
      UNIVERSITY_TEST_RUNTIME_DIGEST_PREFIX,
    );
  });

  it("renders a generic production-safe unavailable shell", () => {
    render(<UniversityPostAttemptRepairUnavailable />);
    expect(screen.getByRole("heading", {
      level: 1,
      name: "Post-attempt repair is unavailable.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(
      /exact server-owned development fixture/i,
    )).toBeInTheDocument();
  });
});

const UNIVERSITY_TEST_RUNTIME_DIGEST_PREFIX = "sha256:a172f067";
