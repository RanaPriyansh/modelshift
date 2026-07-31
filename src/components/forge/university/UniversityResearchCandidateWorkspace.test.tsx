// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { universityResearchCandidateFixture } from "@/app/internal/university-semester-loop/research-candidate-fixture.server";
import type { UniversityResearchSurfaceScenario } from "@/src/forge/university-research-artifacts/surface-packet";

import { UniversityResearchCandidateWorkspace } from "./UniversityResearchCandidateWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function titleCase(value: string): string {
  return value.replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function visibleFact(
  fact: UniversityResearchSurfaceScenario["facts"][number],
): string {
  return fact.tokens.map((token) => token.value).join("");
}

async function renderCandidate() {
  const fixture = await universityResearchCandidateFixture("pack-p");
  return {
    fixture,
    ...render(<UniversityResearchCandidateWorkspace {...fixture} />),
  };
}

describe("UniversityResearchCandidateWorkspace", () => {
  it("renders seven native radios and maps every authored example to its compiled status", async () => {
    const { container, fixture } = await renderCandidate();
    const radios = screen.getAllByRole("radio");

    expect(radios).toHaveLength(7);
    expect(radios[0]).toBeChecked();
    expect(radios.slice(1).every((radio) => !radio.hasAttribute("checked")))
      .toBe(true);
    radios.forEach((radio, index) => {
      expect(radio).not.toHaveAttribute("tabindex", "-1");
      expect(radio).toHaveAttribute(
        "aria-controls",
        `candidate-${fixture.packet.scenarios[index]?.regionId}`,
      );
    });

    for (const [index, scenario] of fixture.packet.scenarios.entries()) {
      const compilation = fixture.compilations[index];
      expect(compilation?.scenarioId).toBe(scenario.scenarioId);
      const radio = screen.getByRole("radio", {
        name: titleCase(scenario.candidateStateLabel),
      });
      expect(radio).toHaveAttribute("value", scenario.scenarioId);
      expect(container.querySelector(
        `section[data-scenario="${scenario.scenarioId}"]`,
      )).toHaveAttribute(
        "data-status",
        compilation?.projection.status,
      );
    }
  });

  it("projects every exact shared fact, choice, effect, task, and terminal claim", async () => {
    const { container, fixture } = await renderCandidate();

    for (const scenario of fixture.packet.scenarios) {
      const region = container.querySelector(
        `section[data-scenario="${scenario.scenarioId}"]`,
      );
      expect(region).not.toBeNull();
      const scoped = within(region as HTMLElement);

      scenario.facts.forEach((fact, index) => {
        const label = scoped.getByText(
          `${String(index + 1).padStart(2, "0")} / ${fact.label}`,
        );
        expect(label.parentElement).toHaveTextContent(visibleFact(fact));
      });

      for (const choice of scenario.choices) {
        const choiceItem = scoped.getByText(choice.label).closest("li");
        expect(choiceItem).not.toBeNull();
        expect(choiceItem).toHaveTextContent(`Owner: ${choice.owner}`);
      }

      for (const effect of scenario.effects) {
        const term = scoped.getByText(effect.label, { selector: "dt" });
        expect(term.parentElement).toHaveTextContent(effect.value);
      }

      for (const task of scenario.tasks) {
        expect(scoped.getByText(task, { selector: "li" })).toBeInTheDocument();
      }

      for (const terminal of scenario.terminal) {
        const term = scoped.getByText(terminal.label, { selector: "dt" });
        expect(term.parentElement).toHaveTextContent(terminal.value);
      }
    }
  });

  it("keeps every available control local to its exact effect boundary", async () => {
    const { container, fixture } = await renderCandidate();

    for (const scenario of fixture.packet.scenarios) {
      const region = container.querySelector(
        `section[data-scenario="${scenario.scenarioId}"]`,
      ) as HTMLElement;
      const links = within(region).queryAllByRole("link");
      const control = scenario.nextJob.primaryControl;
      if (control.kind === "local_anchor_navigation") {
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute("href", `#${control.targetId}`);
        expect(links[0]).not.toHaveAttribute("target");
        expect(document.getElementById(control.targetId ?? "")).toBeInTheDocument();
      } else {
        expect(links).toHaveLength(0);
      }
      links.forEach((link) => {
        expect(link.getAttribute("href")).toMatch(/^#[a-z0-9-]+$/);
      });
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("pre-renders local fixture states without fetch, storage, clipboard, or external effects", async () => {
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
      const { container, fixture } = await renderCandidate();

      for (const scenario of fixture.packet.scenarios) {
        const region = container.querySelector(
          `section[data-scenario="${scenario.scenarioId}"]`,
        ) as HTMLElement;
        const externalEffect = within(region).getByText(
          "External effect",
          { selector: "dt" },
        );
        expect(externalEffect.parentElement).toHaveTextContent("No");
      }

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.getByText(
        /No save, send, session, submission, or evidence/,
      )).toBeInTheDocument();
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("keeps all seven CSS-selected scenarios inside one bounded semantic article", async () => {
    const { fixture } = await renderCandidate();
    const article = screen.getByRole("article", {
      name: "University research candidate",
    });

    expect(within(article).getAllByRole("heading", {
      level: 1,
      name: "One semester. One honest next move.",
    })).toHaveLength(7);
    expect(article).toHaveAttribute("data-pack", fixture.packet.packId);
    expect(article).toHaveTextContent(
      "Synthetic adult fixture",
    );
    expect(article).toHaveTextContent(
      "This local synthetic compilation does not establish live data",
    );
  });

  it("keeps each native radio bound to one separately compiled scenario selector", () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university/UniversityResearchCandidateWorkspace.module.css",
      ),
      "utf8",
    );
    const scenarioIds = [
      "ready",
      "source-review",
      "capacity-break",
      "tight-window",
      "world-changed",
      "path-complete",
      "path-blocked",
    ] as const;

    expect(css).toContain(".scenarios > .scenario {\n  display: none;\n}");
    for (const scenarioId of scenarioIds) {
      expect(css).toContain(
        `.stateSurface:has(input[value="${scenarioId}"]:checked) > .scenarios > .scenario[data-scenario="${scenarioId}"] {\n  display: block;\n}`,
      );
    }
    expect(css.match(/:has\(input\[value=/g)).toHaveLength(scenarioIds.length);
  });
});
