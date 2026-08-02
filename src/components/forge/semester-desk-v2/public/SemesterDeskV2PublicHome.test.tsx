// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { metadata } from "@/app/page";

import { SemesterDeskV2PublicHome } from "./SemesterDeskV2PublicHome";

afterEach(() => {
  cleanup();
});

describe("SemesterDeskV2PublicHome", () => {
  it("states the university recovery promise and links the student to the desk", () => {
    render(<SemesterDeskV2PublicHome />);

    expect(
      screen.getByRole("heading", { name: "Rebuild from today." }),
    ).toBeInTheDocument();
    expect(screen.getByText("FOR UNIVERSITY STUDENTS")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open your Semester Desk" })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(screen.getByRole("link", { name: "See how recovery works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
  });

  it("uses clear course truth and recovery language", () => {
    render(<SemesterDeskV2PublicHome />);

    for (const state of [
      "Checked",
      "Needs review",
      "Changed since last check",
      "Not yet confirmed",
    ]) {
      expect(screen.getByText(state)).toBeInTheDocument();
    }

    expect(screen.getByText("4 hours available")).toBeInTheDocument();
    expect(screen.getByText("Every change stays visible. You choose what to keep.")).toBeInTheDocument();
    expect(screen.getByText("No shame. No hidden ranking. No answer extraction.")).toBeInTheDocument();
  });

  it("uses semantic landmarks and gives every public route link an accessible name", () => {
    render(<SemesterDeskV2PublicHome />);

    expect(screen.getByRole("main")).toHaveAttribute("id", "semester-desk-main");
    expect(screen.getByRole("navigation", { name: "Public navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#semester-desk-main",
    );
  });

  it("keeps internal development jargon and unsupported claims out of the public copy", () => {
    render(<SemesterDeskV2PublicHome />);

    const copy = document.body.textContent ?? "";
    for (const forbiddenTerm of [
      "authority object",
      "fixture",
      "participant gate",
      "claim boundary",
      "evidence receipt",
      "protocol version",
      "caller-asserted input",
      "no effect was created",
      "trusted by",
      "students worldwide",
      "proven results",
    ]) {
      expect(copy.toLowerCase()).not.toContain(forbiddenTerm);
    }
  });

  it("uses university Semester Desk metadata", () => {
    expect(metadata.title).toBe("FORGE | Semester Desk for university students");
    expect(metadata.description).toContain("university students");
    expect(metadata.description).toContain("broken week");
  });
});
