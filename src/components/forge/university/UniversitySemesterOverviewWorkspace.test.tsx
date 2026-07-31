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
  universitySemesterOverviewFixture,
  type UniversitySemesterOverviewFixture,
} from "@/app/internal/university-semester-overview/semester-overview-fixture.server";

import { UniversitySemesterOverviewUnavailable } from "./UniversitySemesterOverviewUnavailable";
import { UniversitySemesterOverviewWorkspace } from "./UniversitySemesterOverviewWorkspace";

let fixture: UniversitySemesterOverviewFixture;

beforeAll(async () => {
  fixture = await universitySemesterOverviewFixture();
});

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UniversitySemesterOverviewWorkspace", () => {
  it("renders the canonical term Recovery axis and course-ID presentation order", () => {
    render(<UniversitySemesterOverviewWorkspace fixture={fixture} />);

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Every course. No false priority.",
    })).toBeInTheDocument();
    expect(screen.getByText("Autumn 2026")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("Copied sources are not university truth"))
      .toBeInTheDocument();
    expect(screen.getByText("Course-ID order, not priority"))
      .toBeInTheDocument();

    const term = screen.getByRole("region", {
      name: "The term stays one boundary.",
    });
    expect(within(term).getByText("Term Recovery")).toBeInTheDocument();
    expect(within(term).getByText("draft ready", { exact: true }))
      .toBeInTheDocument();
    expect(within(term).getByText("Course set")).toBeInTheDocument();
    expect(within(term).getByText("4 synthetic courses inspected"))
      .toBeInTheDocument();
    expect(within(term).getByText(
      "Ready for inspection does not mean the semester is ready.",
    )).toBeInTheDocument();

    const ledger = screen.getByRole("list", {
      name: "Current-course inspection ledger",
    });
    const rows = within(ledger).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => within(row).getByRole("heading", {
      level: 3,
    }).textContent)).toEqual([
      "CS102: Evidence and computation",
      "MATH110: Discrete structures",
      "HIST204: Modern history",
      "BIO120: Cell systems",
    ]);
    for (const row of rows) {
      expect(within(row).getByText("Today")).toBeInTheDocument();
      expect(within(row).getByText("Semester loop")).toBeInTheDocument();
      expect(within(row).getByText("Explanation")).toBeInTheDocument();
    }
  });

  it("renders the four real aggregate scenarios without changing the course set", () => {
    const { container } = render(
      <UniversitySemesterOverviewWorkspace fixture={fixture} />,
    );
    const cases = [
      {
        radio: /Mixed term\./i,
        termStatus: "draft ready",
        firstLoopStatus: "protected study ready",
      },
      {
        radio: /Term source review\./i,
        termStatus: "source review required",
        firstLoopStatus: "source review required",
      },
      {
        radio: /Capacity choice\./i,
        termStatus: "learner choice required",
        firstLoopStatus: "protected study ready",
      },
      {
        radio: /World changed\./i,
        termStatus: "draft ready",
        firstLoopStatus: "world review required",
      },
    ] as const;

    for (const scenario of cases) {
      fireEvent.click(screen.getByRole("radio", {
        name: scenario.radio,
      }));
      expect(screen.getByRole("heading", {
        level: 1,
        name: "Every course. No false priority.",
      })).toBeInTheDocument();
      expect(container.querySelector("article")).toHaveAttribute(
        "data-status",
        "ready_for_inspection",
      );
      const term = screen.getByRole("region", {
        name: "The term stays one boundary.",
      });
      expect(within(term).getByText(
        scenario.termStatus,
        { exact: true },
      )).toBeInTheDocument();
      const rows = screen.getAllByRole("listitem");
      expect(rows).toHaveLength(4);
      const loopAxis = within(rows[0]!).getByText("Semester loop")
        .parentElement;
      expect(loopAxis).not.toBeNull();
      expect(within(loopAxis!).getByText(
        scenario.firstLoopStatus,
        { exact: true },
      )).toBeInTheDocument();
    }
  });

  it("keeps native focus, one announcement, and bounded scroll behavior", () => {
    vi.spyOn(window, "scrollX", "get").mockReturnValue(8);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(412.5);
    let controlsAreVisible = true;
    vi.spyOn(HTMLInputElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => ({
        bottom: controlsAreVisible ? 120 : 1_056,
        height: 56,
        left: 16,
        right: 304,
        top: controlsAreVisible ? 64 : 1_000,
        width: 288,
        x: 16,
        y: controlsAreVisible ? 64 : 1_000,
        toJSON: () => ({}),
      }));
    render(<UniversitySemesterOverviewWorkspace fixture={fixture} />);
    const group = screen.getByRole("group", {
      name: "Select research scenario for this view",
    });
    const radios = within(group).getAllByRole("radio");
    const first = radios[0] as HTMLInputElement;
    const third = radios[2] as HTMLInputElement;
    const revealFirst = vi.fn();
    Object.defineProperty(first, "scrollIntoView", {
      configurable: true,
      value: revealFirst,
    });

    expect(radios).toHaveLength(4);
    radios.forEach((radio) => {
      expect(radio).toBeInstanceOf(HTMLInputElement);
      expect(radio).not.toHaveAttribute("tabindex", "-1");
    });
    expect(first).toBeChecked();

    third.focus();
    fireEvent.click(third);
    expect(third).toHaveFocus();
    expect(third).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      "4 courses are available for shallow inspection. "
      + "Term recovery is learner choice required.",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(vi.mocked(window.scrollTo)).toHaveBeenLastCalledWith({
      behavior: "auto",
      left: 8,
      top: 412.5,
    });

    controlsAreVisible = false;
    const scrollCallsBeforeReset = vi.mocked(window.scrollTo).mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(first).toHaveFocus();
    expect(first).toBeChecked();
    expect(screen.getByRole("button", { name: "Reset view" })).toBeDisabled();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(vi.mocked(window.scrollTo)).toHaveBeenCalledTimes(
      scrollCallsBeforeReset,
    );
    expect(revealFirst).toHaveBeenCalledWith({
      behavior: "instant",
      block: "nearest",
      inline: "nearest",
    });
  });

  it("exposes no course action, raw identity, digest, or hidden authority", () => {
    const { container } = render(
      <UniversitySemesterOverviewWorkspace fixture={fixture} />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", {
      name: /open|inspect|start|save|send|apply|accept|schedule|continue/i,
    })).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByText("Term feasibility").nextSibling)
      .toHaveTextContent("Not allowed");
    expect(screen.getByText("Course selection").nextSibling)
      .toHaveTextContent("Not allowed");
    expect(screen.getByText("Scheduling").nextSibling)
      .toHaveTextContent("Not allowed");
    expect(screen.getByText("Provider call").nextSibling)
      .toHaveTextContent("Not allowed");

    const text = container.textContent ?? "";
    expect(text).not.toContain("course.sample-");
    expect(text).not.toContain("sha256:");
    expect(text).not.toContain("projectionDigest");
    expect(text).not.toContain("ownerUserId");
    expect(text).not.toContain("tenantId");
    expect(text).not.toContain("mastery");
    expect(text).not.toContain("%");
    expect(JSON.stringify(fixture)).not.toContain("course.sample-");
  });

  it("performs no fetch, storage, history, clipboard, window, or navigation effect", () => {
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

    render(<UniversitySemesterOverviewWorkspace fixture={fixture} />);
    fireEvent.click(screen.getByRole("radio", {
      name: /Term source review\./i,
    }));
    fireEvent.click(screen.getByRole("radio", {
      name: /World changed\./i,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("fails closed with a generic unavailable shell", () => {
    const emptyFixture = {
      ...fixture,
      scenarios: [],
    } satisfies UniversitySemesterOverviewFixture;
    const { rerender } = render(
      <UniversitySemesterOverviewWorkspace fixture={emptyFixture} />,
    );

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Semester overview is unavailable.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(<UniversitySemesterOverviewUnavailable />);
    expect(screen.getByText(
      /No term, course, recommendation, session, save, message, or evidence operation was exposed/i,
    )).toBeInTheDocument();
  });
});
