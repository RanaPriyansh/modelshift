// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UniversityCommandCenterWorkspace } from "./UniversityCommandCenterWorkspace";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UniversityCommandCenterWorkspace", () => {
  it("exposes every workspace as an ordered native link with no default priority", () => {
    render(<UniversityCommandCenterWorkspace />);
    const navigation = screen.getByRole("navigation", {
      name: "University workspaces",
    });
    const list = within(navigation).getByRole("list");
    const listItems = within(list).getAllByRole("listitem");
    const links = within(navigation).getAllByRole("link");
    const expectedLinks = [
      ["Open Degree map", "/internal/university-degree-map"],
      ["Open Learning map", "/internal/university-learning-map"],
      ["Open Post-attempt repair", "/internal/university-post-attempt-repair"],
      ["Open Protected study", "/internal/university-protected-study"],
      ["Open Recovery", "/internal/university-recovery"],
      ["Open Research readiness", "/internal/university-research-readiness"],
      ["Open Semester desk", "/internal/university-semester-desk"],
      ["Open Semester loop", "/internal/university-semester-loop"],
      ["Open Semester overview", "/internal/university-semester-overview"],
      ["Open Source review", "/internal/university-source-review"],
      ["Open Today", "/internal/university-today"],
    ] as const;

    expect(list).toHaveAttribute("role", "list");
    expect(listItems).toHaveLength(expectedLinks.length);
    expect(
      links.map((link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual(expectedLinks);

    expectedLinks.forEach(([name, href]) => {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
      expect(screen.getByRole("link", { name }).tagName).toBe("A");
    });

    expect(screen.getByText("Alphabetical order / not priority"))
      .toBeInTheDocument();
    expect(screen.getByText(/Nothing is selected before you act/))
      .toBeInTheDocument();
    expect(navigation.querySelector("[aria-current]")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("performs no hidden browser effect while rendering", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<UniversityCommandCenterWorkspace />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("note")).toHaveTextContent(
      "No save, session, provider, or external action",
    );
  });
});
