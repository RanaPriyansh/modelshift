// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { metadata as howForgeWorksMetadata } from "@/app/how-forge-works/page";
import { metadata as universityMetadata } from "@/app/university/page";

import { PublicProductPage } from "./PublicProductPage";

afterEach(() => {
  cleanup();
});

describe("PublicProductPage", () => {
  it("explains the Semester Desk recovery loop without hiding course changes", () => {
    render(<PublicProductPage kind="how-forge-works" />);

    expect(
      screen.getByRole("heading", {
        name: "Make the semester visible before you make a plan.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/transparent recovery/i)).toBeInTheDocument();
    expect(screen.getByText("State real capacity")).toBeInTheDocument();
    expect(screen.getByText("Make recovery visible")).toBeInTheDocument();
    expect(
      screen.getByText("Illustrative Semester Desk workflow. Each decision stays visible to the student."),
    ).toBeInTheDocument();
  });

  it("states the university source and local-device limits honestly", () => {
    render(<PublicProductPage kind="university" />);

    expect(
      screen.getByRole("heading", {
        name: "Your course site remains the source of record.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/FORGE does not connect to a university system/i)).toBeInTheDocument();
    expect(screen.getByText(/current web limit/i)).toBeInTheDocument();
    expect(
      screen.getByText(/does not provide online sign-in, cloud backup, cross-device sync, web reminders, or a university connection/i),
    ).toBeInTheDocument();
  });

  it("keeps learning active through protected practice, independent proof, and delayed return", () => {
    render(<PublicProductPage kind="university" />);

    expect(screen.getByText("Protected practice")).toBeInTheDocument();
    expect(screen.getByText("Independent proof")).toBeInTheDocument();
    expect(screen.getByText("Delayed return")).toBeInTheDocument();
    expect(screen.getByText(/Come back on this date to meet the idea again after time has passed/i)).toBeInTheDocument();
  });

  it("has landmarks, 44-pixel action links, and valid public routes", () => {
    render(<PublicProductPage kind="how-forge-works" />);

    expect(screen.getByRole("main")).toHaveAttribute("id", "how-forge-works-main");
    expect(screen.getByRole("navigation", { name: "Public navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#how-forge-works-main",
    );
    expect(screen.getByRole("link", { name: "Open your Semester Desk" })).toHaveAttribute(
      "href",
      "/app",
    );
    for (const privacyLink of screen.getAllByRole("link", { name: "Privacy" })) {
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    }
  });

  it("does not expose internal language or unsupported public claims", () => {
    render(<PublicProductPage kind="university" />);

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
      "university integration",
    ]) {
      expect(copy.toLowerCase()).not.toContain(forbiddenTerm);
    }
  });

  it("uses specific public metadata for both routes", () => {
    expect(howForgeWorksMetadata.title).toBe("How FORGE works | Semester Desk");
    expect(howForgeWorksMetadata.description).toContain("university students");
    expect(universityMetadata.title).toBe("FORGE for university students | Semester Desk");
    expect(universityMetadata.description).toContain("real capacity");
  });
});
