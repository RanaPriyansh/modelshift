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
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  universitySemesterDeskFixture,
  type UniversitySemesterDeskFixture,
} from "@/app/internal/university-semester-desk/semester-desk-fixture.server";

import { UniversitySemesterDeskUnavailable } from "./UniversitySemesterDeskUnavailable";
import { UniversitySemesterDeskWorkspace } from "./UniversitySemesterDeskWorkspace";

let fixture: UniversitySemesterDeskFixture;

beforeAll(async () => {
  fixture = await universitySemesterDeskFixture();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function courseGroup() {
  return screen.getByRole("group", {
    name: "Choose one course to inspect",
  });
}

function scenarioGroup() {
  return screen.getByRole("group", {
    name: "Select research scenario for this view",
  });
}

describe("UniversitySemesterDeskWorkspace", () => {
  it("starts with one shallow term ledger and no implicitly inspected course", () => {
    render(<UniversitySemesterDeskWorkspace fixture={fixture} />);

    expect(screen.getByRole("heading", {
      level: 1,
      name: "See the whole term. Choose where to look closer.",
    })).toBeInTheDocument();
    expect(screen.getByText("Autumn 2026")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
    expect(screen.getByText("Copied sources are not university truth"))
      .toBeInTheDocument();
    expect(screen.getByText("Course-ID order, not priority"))
      .toBeInTheDocument();

    const scenarioRadios = within(scenarioGroup()).getAllByRole("radio");
    expect(scenarioRadios).toHaveLength(4);
    expect(scenarioRadios[0]).toBeChecked();

    const courseRadios = within(courseGroup()).getAllByRole("radio");
    expect(courseRadios).toHaveLength(4);
    courseRadios.forEach((radio) => expect(radio).not.toBeChecked());
    expect(courseRadios.map((radio) => radio.getAttribute("aria-label")))
      .toEqual([
        expect.stringContaining("CS102: Evidence and computation"),
        expect.stringContaining("MATH110: Discrete structures"),
        expect.stringContaining("HIST204: Modern history"),
        expect.stringContaining("BIO120: Cell systems"),
      ]);

    expect(screen.getByRole("heading", {
      level: 2,
      name: "No course is selected.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("button", {
      name: "Clear course inspection",
    })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("reveals one learner-chosen course chapter without hiding the term", () => {
    render(<UniversitySemesterDeskWorkspace fixture={fixture} />);
    const firstCourse = within(courseGroup()).getByRole("radio", {
      name: /CS102: Evidence and computation/i,
    });

    fireEvent.click(firstCourse);

    expect(firstCourse).toBeChecked();
    expect(screen.getByRole("heading", {
      level: 2,
      name: "CS102: Evidence and computation",
    })).toBeInTheDocument();
    expect(screen.getByText(
      "You choose what to inspect. FORGE does not choose what to do.",
      { exact: true },
    )).toBeInTheDocument();
    const journey = screen.getByRole("region", {
      name: "Selected course semester loop",
    });
    expect(journey).toBeInTheDocument();
    for (
      const stage
      of ["Sources", "Today", "Recovery", "Protected study", "Return"]
    ) {
      expect(within(journey).getByText(stage, { exact: true }))
        .toBeInTheDocument();
    }
    expect(screen.getByRole("heading", {
      level: 2,
      name: "The term stays one boundary.",
    })).toBeInTheDocument();
    expect(within(courseGroup()).getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent(
      "selected for inspection",
    );
  });

  it("clears the inspected course, restores its focus, and reveals it only when needed", () => {
    let controlIsVisible = true;
    vi.spyOn(HTMLInputElement.prototype, "getBoundingClientRect")
      .mockImplementation(() => ({
        bottom: controlIsVisible ? 120 : 1_056,
        height: 44,
        left: 16,
        right: 304,
        top: controlIsVisible ? 76 : 1_012,
        width: 288,
        x: 16,
        y: controlIsVisible ? 76 : 1_012,
        toJSON: () => ({}),
      }));
    render(<UniversitySemesterDeskWorkspace fixture={fixture} />);
    const secondCourse = within(courseGroup()).getByRole("radio", {
      name: /MATH110: Discrete structures/i,
    }) as HTMLInputElement;
    const revealCourse = vi.fn();
    Object.defineProperty(secondCourse, "scrollIntoView", {
      configurable: true,
      value: revealCourse,
    });

    fireEvent.click(secondCourse);
    controlIsVisible = false;
    fireEvent.click(screen.getByRole("button", {
      name: "Clear course inspection",
    }));

    expect(secondCourse).toHaveFocus();
    expect(secondCourse).not.toBeChecked();
    expect(revealCourse).toHaveBeenCalledWith({
      behavior: "instant",
      block: "nearest",
      inline: "nearest",
    });
    expect(screen.getByRole("heading", {
      level: 2,
      name: "No course is selected.",
    })).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Course inspection cleared.",
    );
  });

  it("clears inspection whenever the research scenario changes", () => {
    render(<UniversitySemesterDeskWorkspace fixture={fixture} />);
    fireEvent.click(within(courseGroup()).getByRole("radio", {
      name: /HIST204: Modern history/i,
    }));
    expect(screen.getByRole("heading", {
      level: 2,
      name: "HIST204: Modern history",
    })).toBeInTheDocument();

    fireEvent.click(within(scenarioGroup()).getByRole("radio", {
      name: /^World changed\./i,
    }));

    expect(within(courseGroup()).getAllByRole("radio")).toHaveLength(4);
    within(courseGroup()).getAllByRole("radio").forEach((radio) => {
      expect(radio).not.toBeChecked();
    });
    expect(screen.getByRole("heading", {
      level: 2,
      name: "No course is selected.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("button", {
      name: "Clear course inspection",
    })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "World changed research scenario selected.",
    );
  });

  it("shows the authority ceiling and performs no consequential browser effect", () => {
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

    const { container } = render(
      <UniversitySemesterDeskWorkspace fixture={fixture} />,
    );
    fireEvent.click(within(courseGroup()).getByRole("radio", {
      name: /BIO120: Cell systems/i,
    }));
    fireEvent.click(screen.getByRole("button", {
      name: "Clear course inspection",
    }));
    fireEvent.click(within(scenarioGroup()).getByRole("radio", {
      name: /^Capacity choice\./i,
    }));

    expect(screen.getByText("Identity").nextSibling)
      .toHaveTextContent("Caller-asserted synthetic input; not verified");
    expect(screen.getByText("Tenant isolation").nextSibling)
      .toHaveTextContent("Not established");
    expect(screen.getByText("Rights enforcement").nextSibling)
      .toHaveTextContent("Not established");
    expect(screen.getByText("Inspection selection").nextSibling)
      .toHaveTextContent(
        "Allowed only for explicit refresh-clear synthetic inspection",
      );
    expect(screen.getByText("Priority").nextSibling)
      .toHaveTextContent("Not allowed");
    expect(screen.getByText("Provider call").nextSibling)
      .toHaveTextContent("Not allowed");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    const text = container.textContent ?? "";
    expect(text).not.toContain("course.sample-");
    expect(text).not.toContain("sha256:");
    expect(text).not.toContain("projectionDigest");
    expect(text).not.toContain("ownerUserId");
    expect(text).not.toContain("tenantId");
    expect(text).not.toContain("%");
  });

  it("fails closed with the generic unavailable shell", () => {
    const emptyFixture = {
      ...fixture,
      scenarios: [],
    } satisfies UniversitySemesterDeskFixture;
    const { rerender } = render(
      <UniversitySemesterDeskWorkspace fixture={emptyFixture} />,
    );

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Semester desk is unavailable.",
    })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    rerender(<UniversitySemesterDeskUnavailable />);
    expect(screen.getByText(
      /No term boundary, course inspection, learner choice, source, capacity, path, World, session, evidence, or external effect was exposed/i,
    )).toBeInTheDocument();
  });
});
