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
  it("exposes six equal, explicit links with no default priority", () => {
    render(<UniversityCommandCenterWorkspace />);
    const navigation = screen.getByRole("navigation", {
      name: "University workspaces",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/internal/university-post-attempt-repair",
      "/internal/university-protected-study",
      "/internal/university-research-readiness",
      "/internal/university-recovery",
      "/internal/university-semester-desk",
      "/internal/university-source-review",
    ]);
    expect(navigation).toHaveTextContent("Post-attempt repair");
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
