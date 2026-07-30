// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LessonStudio } from "./LessonStudio";

afterEach(cleanup);

describe("LessonStudio authoring authority", () => {
  it("fails closed without a distinct server-owned author entitlement", () => {
    render(<LessonStudio authoringAvailable={false} />);

    expect(screen.getByRole("heading", { name: "Adult author connector unavailable" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Generate unverified lesson draft" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/API key/i)).not.toBeInTheDocument();
  });
});
