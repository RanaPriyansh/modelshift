// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  universityLearningMapFixture,
  universityLearningMapFixtureRequest,
} from "@/app/internal/university-learning-map/learning-map-fixture.server";
import {
  projectUniversityLearningMap,
} from "@/src/forge/university-learning-map";

import type { UniversityLearningMapPresentation } from "./presentation";
import { UniversityLearningMapWorkspace } from "./UniversityLearningMapWorkspace";

let presentation: UniversityLearningMapPresentation;

beforeAll(() => {
  const fixture = universityLearningMapFixture();
  if (!fixture) throw new Error("Expected the exact learning-map fixture.");
  presentation = fixture;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UniversityLearningMapWorkspace", () => {
  it("uses the real projector and sends only a bounded presentation", () => {
    const projection = projectUniversityLearningMap(
      universityLearningMapFixtureRequest(),
    );
    expect(projection.status).toBe("review_required");
    expect(projection.review?.explicitUnknownCount).toBe(2);
    expect(presentation.status).toBe("review_required");
    expect(presentation.outcomes).toHaveLength(2);
    expect(presentation.concepts).toHaveLength(3);
    expect(presentation.unknowns).toHaveLength(2);

    const serialized = JSON.stringify(presentation);
    expect(serialized).not.toMatch(
      /(?:course|outcome|concept|attempt|evidence|help|return|unknown)\.[a-z0-9]/,
    );
    expect(serialized).not.toMatch(
      /schemaVersion|projectionDigest|studentName|email|mastery|score|recommend|generated|answer|%/i,
    );
    expect(presentation.authority).toEqual([
      {
        label: "Ownership",
        value: "Learner-declared and self-attested",
      },
      { label: "Input", value: "Synthetic and learner-declared" },
      { label: "Source state", value: "Unverified" },
      { label: "Learning assessment", value: "Not made" },
      { label: "Persistence", value: "None" },
      { label: "Network", value: "None" },
      { label: "External action", value: "None" },
    ]);
  });

  it("renders one semantic, inert map with visible limits", () => {
    const { container } = render(
      <UniversityLearningMapWorkspace presentation={presentation} />,
    );
    const article = screen.getByRole("article", {
      name: "See the map. Keep the limits.",
    });

    expect(article).toHaveAttribute("data-status", "review_required");
    expect(within(article).getByRole("heading", {
      level: 2,
      name: "Declared outcomes",
    })).toBeInTheDocument();
    expect(within(article).getByRole("list", {
      name: "Declared course outcomes",
    }).children).toHaveLength(2);
    expect(within(article).getByRole("list", {
      name: "Declared concept path",
    }).children).toHaveLength(3);
    expect(within(article).getAllByRole("heading", { level: 3 }))
      .toHaveLength(3);
    expect(screen.getByText(
      "Resource help was recorded. Its effect remains unknown.",
    )).toBeInTheDocument();
    expect(screen.getByText(
      "The authority of one evidence reference remains unknown.",
    )).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Declaration order, not priority",
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /mastery|score|recommend|generated answer|%/i,
    );
  });

  it("performs no browser, storage, clipboard, history, or network effect", () => {
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

    render(<UniversityLearningMapWorkspace presentation={presentation} />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("keeps production imports unavailable-only and declares access modes", () => {
    const route = readFileSync(
      resolve(
        process.cwd(),
        "app/internal/university-learning-map/page.tsx",
      ),
      "utf8",
    );
    const workspace = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university-learning-map/UniversityLearningMapWorkspace.tsx",
      ),
      "utf8",
    );
    const css = readFileSync(
      resolve(
        process.cwd(),
        "src/components/forge/university-learning-map/UniversityLearningMapWorkspace.module.css",
      ),
      "utf8",
    );

    expect(route).toContain(
      "process.env.NODE_ENV === \"development\"",
    );
    expect(route).toContain(
      "await import(\"./development-surface.server\")",
    );
    expect(route).toContain("UniversityLearningMapUnavailable");
    expect(route).not.toContain("ForgeShell");
    expect(route).not.toContain("UniversityLearningMapWorkspace");
    expect(route).not.toContain("projectUniversityLearningMap");
    expect(route).not.toContain("FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE");

    expect(workspace).not.toMatch(
      /["']use client["']|useEffect|useLayoutEffect|fetch\(|localStorage|sessionStorage/,
    );
    expect(css).toContain("@media (max-width: 360px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
