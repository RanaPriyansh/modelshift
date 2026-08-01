// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ForgeShell } from "./ForgeShell";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-forge-theme");
});

describe("ForgeShell", () => {
  it("uses the canonical learner application navigation", () => {
    render(
      <ForgeShell active="today" surface="app">
        <main id="forge-main">Today content</main>
      </ForgeShell>,
    );

    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    const expected = ["Today", "Paths", "Projects", "Evidence", "Account"];

    expect(within(primary).getAllByRole("link").map((link) => link.textContent)).toEqual(expected);
    expect(within(mobile).getAllByRole("link").map((link) => link.textContent)).toEqual(expected);
    expect(within(primary).queryByRole("link", { name: "Explore" })).not.toBeInTheDocument();
    expect(within(primary).queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });
});
