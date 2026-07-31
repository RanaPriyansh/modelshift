// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ForgeThemeControl } from "./ForgeThemeControl";

const THEME_STORAGE_KEY = "forge.color-theme.v1";
const THEME_ATTRIBUTE = "data-forge-theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
});

describe("ForgeThemeControl", () => {
  it("applies a stored dark preference to the control and document", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(<ForgeThemeControl />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Color theme" })).toHaveValue("dark");
    });
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, "dark");
  });

  it("stores and applies a selected light preference", () => {
    render(<ForgeThemeControl />);

    fireEvent.change(screen.getByRole("combobox", { name: "Color theme" }), {
      target: { value: "light" },
    });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, "light");
  });

  it("removes the document theme attribute when system theme is selected", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ForgeThemeControl />);

    const control = screen.getByRole("combobox", { name: "Color theme" });
    await waitFor(() => expect(control).toHaveValue("dark"));

    fireEvent.change(control, { target: { value: "system" } });

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement).not.toHaveAttribute(THEME_ATTRIBUTE);
  });
});
