// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgeStart } from "./ForgeStart";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ForgeStart field semantics", () => {
  it("keeps textarea names stable while their descriptions update", () => {
    render(<ForgeStart />);

    const goal = screen.getByRole("textbox", { name: "Your words" });
    expect(goal).toHaveAccessibleName("Your words");
    expect(goal).toHaveAccessibleDescription(
      "0 / 600 · remains unsaved until you choose to save a reviewed result",
    );

    fireEvent.change(goal, { target: { value: "Force" } });
    expect(goal).toHaveAccessibleName("Your words");
    expect(goal).toHaveAccessibleDescription(
      "5 / 600 · remains unsaved until you choose to save a reviewed result",
    );

    fireEvent.click(screen.getByRole("button", { name: /Name the outcome/i }));

    const outcome = screen.getByRole("textbox", { name: "Meaningful outcome" });
    expect(outcome).toHaveAccessibleName("Meaningful outcome");
    expect(outcome).toHaveAccessibleDescription("0 / 280");

    fireEvent.change(outcome, { target: { value: "Explain" } });
    expect(outcome).toHaveAccessibleName("Meaningful outcome");
    expect(outcome).toHaveAccessibleDescription("7 / 280");
  });
});
