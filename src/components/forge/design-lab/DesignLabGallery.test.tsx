// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DesignLabGallery } from "./DesignLabGallery";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-forge-theme");
});

describe("DesignLabGallery", () => {
  it("renders the four labeled candidates and safe navigation", () => {
    render(<DesignLabGallery />);

    expect(screen.getByRole("heading", { name: "Student experience design lab." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vivid Learning Landscapes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Expedition Atlas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence Atelier" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Field Guide iOS sample" })).toBeInTheDocument();
    expect(screen.getByText("Candidate 01 / Implemented local visual system")).toBeInTheDocument();
    expect(screen.getByText("Candidate 02 / Alternate application direction")).toBeInTheDocument();
    expect(screen.getByText("Candidate 03 / Alternate homepage direction")).toBeInTheDocument();
    expect(screen.getByText("Candidate 04 / Mobile display study")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Homepage" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Application" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Vivid Learning Landscapes" })).toHaveAttribute(
      "href",
      "#vivid-learning-landscapes",
    );
    expect(screen.getByRole("link", { name: "Expedition Atlas" })).toHaveAttribute(
      "href",
      "#expedition-atlas",
    );
    expect(screen.getByRole("link", { name: "Evidence Atelier" })).toHaveAttribute(
      "href",
      "#evidence-atelier",
    );
    expect(screen.getByRole("link", { name: "Field Guide iOS study" })).toHaveAttribute(
      "href",
      "#field-guide-ios",
    );
  });

  it("renders descriptive visual evidence and the theme choice", () => {
    render(<DesignLabGallery />);

    expect(
      screen.getByAltText(/deep green hills beneath a cobalt sky/i),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(/topographic green terrain and cobalt water/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Color theme" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Evidence Atelier display-only design preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not change learning logic/i)).toBeInTheDocument();
  });
});
