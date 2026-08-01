// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicFrame } from "./PublicFrame";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-forge-theme");
});

describe("PublicFrame", () => {
  it("keeps the scenic shell content and shared public navigation", () => {
    render(
      <PublicFrame active="home" overlayHeader>
        <main id="forge-main">Scenic home content</main>
      </PublicFrame>,
    );

    expect(screen.getByText("Scenic home content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FORGE Learning OS home" })).toBeInTheDocument();
    expect(screen.getByLabelText("Learner acts • AI assists • Evidence decides")).toBeInTheDocument();
    expect(screen.getByLabelText("Color theme")).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Public mobile navigation" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Paths", "How FORGE works", "Evidence and trust", "Start learning"]);
  });
});
