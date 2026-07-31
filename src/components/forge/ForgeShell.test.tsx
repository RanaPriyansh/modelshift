// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const observedLinks = vi.hoisted(() => [] as Array<{
  href: string;
  prefetch: boolean | undefined;
}>);

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    href: string;
    prefetch?: boolean;
  }) => {
    observedLinks.push({ href, prefetch });
    return <a {...props} href={href}>{children}</a>;
  },
}));

vi.mock("./ForgePathCommand", () => ({
  ForgePathCommand: () => null,
}));

vi.mock("./ForgePrimitives", () => ({
  ForgeTrustLine: () => null,
}));

import { ForgeShell } from "./ForgeShell";

beforeEach(() => {
  observedLinks.length = 0;
});

afterEach(() => {
  cleanup();
});

describe("ForgeShell navigation prefetch", () => {
  it("disables brand and navigation prefetch for effect-free surfaces", () => {
    render(
      <ForgeShell
        active={null}
        mobileNavigation={false}
        navigationPrefetch={false}
        surface="author"
      >
        <main id="forge-main">University fixture</main>
      </ForgeShell>,
    );

    expect(observedLinks).toEqual([
      { href: "/", prefetch: false },
      { href: "/author", prefetch: false },
      { href: "/coverage", prefetch: false },
      { href: "/app", prefetch: false },
      { href: "/app/settings", prefetch: false },
    ]);
  });

  it("keeps the default Link behavior when no override is supplied", () => {
    render(
      <ForgeShell active={null} mobileNavigation={false} surface="author">
        <main id="forge-main">Default surface</main>
      </ForgeShell>,
    );

    expect(observedLinks.every((link) => link.prefetch === undefined)).toBe(true);
  });
});
