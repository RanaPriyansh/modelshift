// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import PrivacyPage, { metadata as privacyMetadata } from "@/app/privacy/page.release";
import SupportPage, { metadata as supportMetadata } from "@/app/support/page.release";
import TermsPage, { metadata as termsMetadata } from "@/app/terms/page.release";

afterEach(() => {
  cleanup();
});

function expectPublicLandmarks() {
  expect(screen.getByRole("main")).toHaveAttribute("id", "policy-main");
  expect(screen.getByRole("navigation", { name: "Public navigation" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Footer navigation" })).toBeInTheDocument();
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#policy-main",
  );
}

function expectNoUnsupportedPublicClaims() {
  const copy = (document.body.textContent ?? "").toLowerCase();
  for (const forbiddenTerm of [
    "authority object",
    "fixture",
    "participant gate",
    "claim boundary",
    "evidence receipt",
    "protocol version",
    "caller-asserted input",
    "supabase",
    "guaranteed",
    "certified",
    "trusted by",
    "support@",
    "we will reply",
  ]) {
    expect(copy).not.toContain(forbiddenTerm);
  }
}

describe("FORGE policy and support routes", () => {
  it("renders privacy as a device-local boundary with real data controls", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "Your study plan is not a profile." })).toBeInTheDocument();
    expect(screen.getByText("No online sign-in or sync")).toBeInTheDocument();
    expect(screen.getByText("No university connection")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Local data" })).toHaveAttribute("href", "/app#settings");
    expectPublicLandmarks();
    expectNoUnsupportedPublicClaims();
  });

  it("renders terms as a transparent product-use draft", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { name: "Use FORGE to support your work." })).toBeInTheDocument();
    expect(screen.getByText("Do not misrepresent work")).toBeInTheDocument();
    expect(screen.getByText("Draft product-use terms. Legal review is required before publication.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Support" }).some((link) => link.getAttribute("href") === "/support"),
    ).toBe(true);
    expectPublicLandmarks();
    expectNoUnsupportedPublicClaims();
  });

  it("renders self-service support without inventing a contact channel or reminder delivery", () => {
    render(<SupportPage />);

    expect(screen.getByRole("heading", { name: "Return to the next honest action." })).toBeInTheDocument();
    expect(screen.getByText(/The current web app does not send web reminders or calendar events\./)).toBeInTheDocument();
    expect(screen.getByText(/does not provide a monitored email, chat, or ticket channel/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Open FORGE" }).some((link) => link.getAttribute("href") === "/app"),
    ).toBe(true);
    expectPublicLandmarks();
    expectNoUnsupportedPublicClaims();
  });

  it("uses route metadata that matches the current product boundary", () => {
    expect(privacyMetadata.title).toBe("Privacy — FORGE");
    expect(privacyMetadata.description).toContain("browser-local");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(termsMetadata.description).toContain("Legal review");
    expect(termsMetadata.robots).toEqual({ index: false, follow: false });
    expect(supportMetadata.description).toContain("browser-local data");
    expect(supportMetadata.alternates?.canonical).toBe("/support");
  });
});
