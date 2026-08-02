// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ForgeError from "@/app/error";
import NotFound from "@/app/not-found";
import manifest from "@/app/manifest";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("FORGE public release surfaces", () => {
  it("uses only canonical routes in the semantic missing-page recovery", () => {
    render(<NotFound />);

    expect(screen.getByRole("main")).toHaveAttribute("id", "not-found-main");
    expect(screen.getByRole("heading", { name: "This page is not here." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open your Semester Desk" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "How FORGE works" })).toHaveAttribute("href", "/how-forge-works");
    expect(screen.getByRole("link", { name: "FORGE home" })).toHaveAttribute("href", "/");
  });

  it("keeps the error recovery surface neutral and lets the student retry", () => {
    const reset = vi.fn();
    render(<ForgeError error={new Error("private detail")} reset={reset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "We could not open this page." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Open your Semester Desk" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
    expect(document.body).not.toHaveTextContent("private detail");
  });

  it("declares only the existing icon and local web start route", () => {
    expect(manifest()).toMatchObject({
      name: "FORGE",
      short_name: "FORGE",
      start_url: "/app",
      display: "standalone",
      background_color: "#edf0e8",
      theme_color: "#173c29",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    });
  });

  it("creates public crawler files only when the deployment has an explicit origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_FORGE_SITE_ORIGIN", "https://forge.example.test");
    vi.stubEnv("FORGE_PUBLIC_INDEXING", "true");

    const [{ default: robots }, { default: sitemap }] = await Promise.all([
      import("@/app/robots"),
      import("@/app/sitemap"),
    ]);

    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      host: "https://forge.example.test",
      sitemap: "https://forge.example.test/sitemap.xml",
    });
    expect(sitemap().map((entry) => entry.url)).toEqual([
      "https://forge.example.test/",
      "https://forge.example.test/how-forge-works",
      "https://forge.example.test/university",
      "https://forge.example.test/app",
      "https://forge.example.test/privacy",
      "https://forge.example.test/support",
    ]);
  });
});
