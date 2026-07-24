// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FORGE_DEVICE_PROFILE_KEY,
  createForgeDeviceProfile,
} from "@/src/lib/forge-profile/device-profile";

import { DeviceProfileAccess } from "./DeviceProfileAccess";
import { ProfileExperience } from "./refoundation/app/AppExperience";
import { DeviceLocalAccess } from "./refoundation/orient/DeviceLocalAccess";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function seedAdultProfile() {
  createForgeDeviceProfile(
    window.localStorage,
    "adult",
    false,
    new Date("2026-07-24T00:00:00.000Z"),
    "9be711de-d7a6-4911-b903-f2d829da83d5",
  );
}

function preventRemoval() {
  return vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => undefined);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("truthful device-profile removal", () => {
  it("keeps the active access state and reports failure when removal cannot be confirmed", () => {
    seedAdultProfile();
    preventRemoval();
    render(<DeviceProfileAccess />);

    fireEvent.click(screen.getByRole("button", { name: "Remove device profile" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "could not confirm removal from browser storage",
    );
    expect(screen.getByRole("heading", { name: "Adult learning mode" })).toBeInTheDocument();
    expect(window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY)).not.toBeNull();
  });

  it("does not switch the orientation surface to an unconfigured state after failed removal", () => {
    seedAdultProfile();
    preventRemoval();
    render(<DeviceLocalAccess continueHref="/start" />);

    fireEvent.click(screen.getByRole("button", { name: "Change device mode" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "could not confirm removal from browser storage",
    );
    expect(screen.getByRole("heading", { name: "Adult learning mode" })).toBeInTheDocument();
    expect(window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY)).not.toBeNull();
  });

  it("does not announce settings deletion or hide the control after failed removal", async () => {
    seedAdultProfile();
    preventRemoval();
    render(<ProfileExperience />);

    const remove = await screen.findByRole("button", { name: "Remove mode" });
    fireEvent.click(remove);

    await waitFor(() => {
      expect(screen.getByText(/could not be confirmed removed/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Remove mode" })).toBeInTheDocument();
    expect(window.localStorage.getItem(FORGE_DEVICE_PROFILE_KEY)).not.toBeNull();
  });
});
