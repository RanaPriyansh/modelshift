// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PUBLIC_GOAL_DIRECTIONS } from "@/src/forge/public-paths";
import { PUBLIC_WORLD_CATALOG } from "@/src/forge/worlds";

import { PublicPaths } from "./PublicPaths";

afterEach(cleanup);

describe("PublicPaths", () => {
  it("separates reviewed activities from unpublished broad directions", () => {
    render(<PublicPaths />);

    expect(screen.getByRole("heading", { name: "No complete broad path is published yet." }))
      .toBeInTheDocument();
    expect(screen.getAllByText("Open reviewed activity")).toHaveLength(PUBLIC_WORLD_CATALOG.length);
    expect(screen.getAllByText("Start from this goal")).toHaveLength(PUBLIC_GOAL_DIRECTIONS.length);
  });

  it("keeps every publication gap inspectable", () => {
    render(<PublicPaths />);

    expect(screen.getAllByText("What is missing before publication?")).toHaveLength(
      PUBLIC_GOAL_DIRECTIONS.length,
    );
    expect(screen.getByRole("heading", { name: "Software development" })).toBeInTheDocument();
    expect(screen.getAllByText("No reviewed activity is bound to this direction yet.")).toHaveLength(
      PUBLIC_GOAL_DIRECTIONS.filter((direction) => direction.status === "outline_only").length,
    );
  });

  it("keeps example learner wording out of the URL while passing it only through tab-local draft storage", () => {
    render(<PublicPaths />);

    const first = screen.getAllByRole("link", { name: "Start from this goal" })[0]!;
    expect(first.getAttribute("href")).toBe("/start");
    fireEvent.click(first);
    expect(window.sessionStorage.getItem("forge.start-draft:v1")).toContain(
      PUBLIC_GOAL_DIRECTIONS[0]!.learnerQuestion,
    );
  });
});
