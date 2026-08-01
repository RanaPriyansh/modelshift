// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  universityDegreeMapPresentation,
} from "@/app/internal/university-degree-map/degree-map-fixture.server";

import { UniversityDegreeMapWorkspace } from "./UniversityDegreeMapWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityDegreeMapWorkspace", () => {
  it("renders the bounded projector presentation with semantic structure", () => {
    const presentation = universityDegreeMapPresentation();
    render(<UniversityDegreeMapWorkspace presentation={presentation} />);

    const article = screen.getByRole("article", {
      name: "Inspect the map. Keep the decision.",
    });
    expect(within(article).getByRole("heading", { level: 1 }))
      .toHaveTextContent("Inspect the map. Keep the decision.");
    expect(screen.getByLabelText("Declared credit totals"))
      .toHaveTextContent("All declared15");
    const courses = screen.getByRole("list", { name: "Declared courses" });
    const requirements = screen.getByRole("list", {
      name: "Declared requirements",
    });
    expect(courses).toHaveAttribute("role", "list");
    expect(requirements).toHaveAttribute("role", "list");
    expect(within(courses).getAllByRole("listitem")).toHaveLength(4);
    expect(within(requirements).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("complementary", {
      name: "Inspection boundary",
    })).toHaveTextContent("No rank or recommendation");
    expect(screen.getByRole("complementary", {
      name: "Inspection boundary",
    })).toHaveTextContent(
      "Course and requirement references use alphabetical order. The order does not show sequence, priority, or recommendation.",
    );
    expect(screen.getByRole("complementary", {
      name: "Inspection boundary",
    })).toHaveTextContent(
      "No automatic network request. Explicit internal navigation only.",
    );
    expect(article).toHaveTextContent("self-attested learner declaration");
    expect(article).not.toHaveTextContent("learner-managed declaration");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", {
      name: "Open university workspaces",
    })).toHaveAttribute("href", "/internal/university-command-center");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();

    expect(presentation.courses.length).toBeLessThanOrEqual(8);
    expect(presentation.requirements.length).toBeLessThanOrEqual(8);
    expect(presentation.authority).toEqual([
      { label: "Adult status", value: "Self-attested; not verified" },
      { label: "Source status", value: "Learner supplied; not verified" },
      { label: "Rank", value: "Not allowed" },
      { label: "Recommendation", value: "Not allowed" },
      { label: "Save", value: "Not allowed" },
      {
        label: "Automatic network effect",
        value: "Absent",
      },
      {
        label: "Permitted network effect",
        value: "Explicit internal navigation only",
      },
      { label: "Event", value: "Not allowed" },
    ]);
    expect(JSON.stringify(presentation)).not.toMatch(
      /sha256:|declaredSourceDigest|sourceRegistry|sourceRef/,
    );
    expect(Object.isFrozen(presentation)).toBe(true);
  });

  it("is effect-free and includes the 320px and access media gates", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(
      <UniversityDegreeMapWorkspace
        presentation={universityDegreeMapPresentation()}
      />,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();

    const css = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university-degree-map/UniversityDegreeMapWorkspace.module.css",
      ),
      "utf8",
    );
    expect(css).toContain("@media (max-width: 320px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain(".workspaceLink:focus-visible");
    expect(css).toContain("outline: 3px solid var(--forge-cyan-deep)");

    const workspace = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university-degree-map/UniversityDegreeMapWorkspace.tsx",
      ),
      "utf8",
    );
    expect(workspace).toContain('href="/internal/university-command-center"');
    expect(workspace).toContain("prefetch={false}");
    expect(workspace).toContain(
      "No automatic network request. Explicit internal navigation only.",
    );

    const page = readFileSync(
      resolve(
        process.cwd(),
        "app/internal/university-degree-map/page.tsx",
      ),
      "utf8",
    );
    expect(page).toContain('process.env.NODE_ENV === "development"');
    expect(page).toContain('await import("./development-surface.server")');
    expect(page).toContain("UniversityDegreeMapUnavailable");
    expect(page).not.toContain("UniversityDegreeMapWorkspace");
    expect(page).not.toContain("projectUniversityDegreeMap");
    expect(page).not.toContain("degree-map-fixture.server");
  });
});
