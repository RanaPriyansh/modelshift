// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  state: {
    phase: "ready",
    result: {
      status: "ok",
      ledger: { records: [] as unknown[] },
    },
  },
}));

vi.mock("./continuity-client", () => ({
  createBrowserContinuityStore: () => ({ kind: "browser-continuity-store" }),
  useDeviceContinuity: () => ({ state: mocked.state, refresh: vi.fn() }),
}));

import { ForgeToday } from "./ForgeLearnerWorkspace";

afterEach(() => {
  cleanup();
});

describe("ForgeToday empty state", () => {
  it("shows one question, one dominant action, a manual alternative, and a stop option", () => {
    render(<ForgeToday />);

    expect(
      screen.getByRole("heading", { name: "What do you want to be able to do?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shape a path/ })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Browse reviewed paths" })).toHaveAttribute(
      "href",
      "/paths",
    );
    expect(screen.getByRole("link", { name: "Leave for now" })).toHaveAttribute("href", "/");
    expect(screen.getByText((_, element) => (
      element?.classList.contains("forge-today-empty__stop") ?? false
    ))).toHaveTextContent("Nothing will start.");
  });
});
