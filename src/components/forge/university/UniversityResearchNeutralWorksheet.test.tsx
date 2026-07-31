// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compileUniversityResearchSurfacePacket } from "@/src/forge/university-research-artifacts/surface-packet";
import {
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
} from "@/src/forge/university-research-operations/contracts";

import { UniversityResearchNeutralWorksheet } from "./UniversityResearchNeutralWorksheet";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityResearchNeutralWorksheet", () => {
  it("renders the exact neutral worksheet structure without FORGE chrome or computed status labels", async () => {
    const packet = await compileUniversityResearchSurfacePacket("pack-p");
    const { container } = render(
      <UniversityResearchNeutralWorksheet packet={packet} />,
    );

    expect(screen.getByRole("heading", {
      level: 1,
      name: "Course worksheet",
    })).toBeInTheDocument();
    expect(screen.getByRole("group", {
      name: "Compare the seven examples",
    })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(screen.getAllByRole("region", {
      name: /Example \d worksheet/,
    })).toHaveLength(7);
    expect(container.querySelectorAll("table")).toHaveLength(7);
    expect(container.querySelectorAll("th[scope='row']")).toHaveLength(49);
    expect(container.textContent).not.toContain("FORGE");
    expect(container.textContent).not.toContain("protected study ready");
    expect(container.textContent).not.toContain("source review required");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("binds native ordinal radios to all seven renderer-owned regions", async () => {
    const packet = await compileUniversityResearchSurfacePacket("pack-q");
    render(<UniversityResearchNeutralWorksheet packet={packet} />);

    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.parentElement?.textContent)).toEqual(
      packet.navigationItems.map((item) => item.label),
    );
    radios.forEach((radio, index) => {
      expect(radio).toHaveAttribute(
        "aria-controls",
        packet.navigationItems[index]?.regionId,
      );
      expect(radio).toHaveAttribute("value", UNIVERSITY_RESEARCH_SCENARIO_IDS[index]);
    });
    expect(radios[0]).toBeChecked();
    expect(radios.slice(1).every((radio) => !radio.hasAttribute("checked"))).toBe(
      true,
    );
  });

  it("pre-renders exact facts, choices, jobs, effects, tasks, and terminal boundaries in document order", async () => {
    const packet = await compileUniversityResearchSurfacePacket("pack-p");
    render(<UniversityResearchNeutralWorksheet packet={packet} />);

    for (const scenario of packet.scenarios) {
      const region = screen.getByRole("region", {
        name: `Example ${scenario.ordinal} worksheet`,
      });
      const headings = within(region).getAllByRole("heading", { level: 2 });
      expect(headings.map((heading) => heading.textContent)).toEqual([
        scenario.factsHeading,
        scenario.choicesHeading,
        scenario.nextJobHeading,
        scenario.effectsHeading,
        scenario.tasksHeading,
        scenario.terminalHeading,
      ]);
      expect(within(region).getAllByRole("row")).toHaveLength(7);
      expect(within(region).getAllByRole("listitem")).toHaveLength(
        scenario.choices.length + UNIVERSITY_RESEARCH_EXPOSURE_TASKS.length,
      );
      expect(region).toHaveTextContent("verified university truth: No");
      expect(region).toHaveTextContent("Changes the path");
      expect(region).toHaveTextContent("Institutional action");
    }
  });

  it("uses only fixed local fragment controls and performs no fetch, storage, or clipboard write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
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
      const packet = await compileUniversityResearchSurfacePacket("pack-p");
      render(<UniversityResearchNeutralWorksheet packet={packet} />);

      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "#neutral-worksheet-title");
      links.slice(1).forEach((link) => {
        expect(link.getAttribute("href")).toMatch(
          /^#research-example-\d-effect-boundary$/,
        );
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });
});
