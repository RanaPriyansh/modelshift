// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgePathCommand } from "./ForgePathCommand";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ForgePathCommand", () => {
  it("previews a bounded proposal without changing learner-owned storage", () => {
    localStorage.setItem("existing", "unchanged");
    render(<ForgePathCommand />);

    fireEvent.click(screen.getByRole("button", { name: "Plan a change" }));
    const request = screen.getByRole("textbox", {
      name: "Ask a question or preview a direction change",
    });
    expect(document.activeElement).toBe(request);
    fireEvent.change(request, { target: { value: "I have only three hours this week." } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("Weekly availability")).toBeTruthy();
    expect(screen.getByText(/Nothing changes until a reviewed proposal/i)).toBeTruthy();
    expect(localStorage.getItem("existing")).toBe("unchanged");
    expect(localStorage.length).toBe(1);
  });

  it("closes with Escape, restores trigger focus, and traps Tab inside the modal", () => {
    render(<ForgePathCommand />);
    const trigger = screen.getByRole("button", { name: "Plan a change" });
    fireEvent.click(trigger);

    const input = screen.getByRole("textbox", {
      name: "Ask a question or preview a direction change",
    });
    const close = screen.getByRole("button", { name: "Close path command" });
    close.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
