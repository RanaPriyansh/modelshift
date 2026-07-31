import Link from "next/link";
import type { ReactNode } from "react";

import { ForgePathCommand } from "./ForgePathCommand";
import { ForgeTrustLine } from "./ForgePrimitives";

export type ForgeSection =
  | "home"
  | "learn"
  | "studio"
  | "trail"
  | "evidence"
  | "account"
  | "today"
  | "paths"
  | "projects"
  | "explore"
  | "trust"
  | "start"
  | "settings";

export type ForgeSurface = "legacy" | "public" | "app" | "author";

const LEGACY_NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
  { href: "/paths", label: "Learn", section: "learn" },
  { href: "/studio", label: "Studio", section: "studio" },
  { href: "/trail", label: "Trail", section: "trail" },
  { href: "/evidence", label: "Evidence", section: "evidence" },
  { href: "/account", label: "Access", section: "account" },
];

const PUBLIC_NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
  { href: "/paths", label: "Paths", section: "paths" },
  { href: "/how-forge-works", label: "How it works", section: "learn" },
  { href: "/trust", label: "Evidence & trust", section: "trust" },
  { href: "/start", label: "Start learning", section: "start" },
];

const APP_NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
  { href: "/app", label: "Home", section: "today" },
  { href: "/app/paths", label: "Paths", section: "paths" },
  { href: "/paths", label: "Explore", section: "explore" },
  { href: "/app/projects", label: "Projects", section: "projects" },
  { href: "/app/evidence", label: "Evidence", section: "evidence" },
  { href: "/app/settings", label: "Profile", section: "settings" },
];

const AUTHOR_NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
  { href: "/author", label: "Draft studio", section: "studio" },
  { href: "/coverage", label: "Coverage", section: "learn" },
  { href: "/app", label: "Learner app", section: "today" },
  { href: "/app/settings", label: "Settings", section: "settings" },
];

function navItemsFor(surface: ForgeSurface) {
  if (surface === "public") return PUBLIC_NAV_ITEMS;
  if (surface === "app") return APP_NAV_ITEMS;
  if (surface === "author") return AUTHOR_NAV_ITEMS;
  return LEGACY_NAV_ITEMS;
}

function ForgeMark() {
  return (
    <span className="forge-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <path d="M20 2.5 37.5 20 20 37.5 2.5 20 20 2.5Z" />
        <path d="m13.5 13.5 13 13m0-13-13 13" />
      </svg>
    </span>
  );
}

function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="forge-brand" href={href} aria-label="FORGE Learning OS home">
      <ForgeMark />
      <span>
        <strong>FORGE</strong>
        <small>Learning OS</small>
      </span>
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function NavIcon({ section }: { section: ForgeSection }) {
  if (section === "home" || section === "today") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z" />
      </svg>
    );
  }

  if (section === "learn" || section === "paths" || section === "explore") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h6.3c1 0 1.7.5 1.7 1.4v12.6c0-1.1-.8-1.8-2-1.8H4V5.5Zm16 0h-6.3c-1 0-1.7.5-1.7 1.4v12.6c0-1.1.8-1.8 2-1.8h6V5.5Z" />
      </svg>
    );
  }

  if (section === "trail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 18.5c2.2-6.8 4.4-2.4 6.2-7.2C13 6.6 16 10.8 19 5.5M5 18.5h4M19 5.5h-4" />
      </svg>
    );
  }

  if (section === "studio") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16M7 16V8l5-4 5 4v8M9.5 12h5M12 9.5v5" />
      </svg>
    );
  }

  if (section === "account" || section === "settings") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.8-4 3.2-6 7-6s6.2 2 7 6" />
      </svg>
    );
  }

  if (section === "projects") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />
      </svg>
    );
  }

  if (section === "start") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12h15m-6-6 6 6-6 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h9l3 3v14H6v-17Zm9 0v4h3M9 12h6M9 16h4" />
    </svg>
  );
}

function PrimaryNavigation({
  active,
  items,
}: {
  active: ForgeSection | null;
  items: ReadonlyArray<{ href: string; label: string; section: ForgeSection }>;
}) {
  return (
    <nav className="forge-primary-nav" aria-label="Primary navigation">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={active === item.section ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileNavigation({
  active,
  items,
}: {
  active: ForgeSection | null;
  items: ReadonlyArray<{ href: string; label: string; section: ForgeSection }>;
}) {
  return (
    <nav className="forge-mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={active === item.section ? "page" : undefined}
        >
          <NavIcon section={item.section} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ForgeShell({
  active,
  children,
  mobileNavigation = true,
  surface = "legacy",
}: {
  active: ForgeSection | null;
  children: ReactNode;
  mobileNavigation?: boolean;
  surface?: ForgeSurface;
}) {
  const items = navItemsFor(surface);
  const mobileItems = surface === "legacy"
    ? [{ href: "/", label: "Home", section: "home" as const }, ...items]
    : items;
  const homeHref = surface === "app" ? "/app" : "/";
  return (
    <div className="forge-shell" data-forge-surface={surface}>
      <a className="forge-skip-link" href="#forge-main">
        Skip to main content
      </a>
      <header className="forge-topbar">
        <Brand href={homeHref} />
        <PrimaryNavigation active={active} items={items} />
        <div className="forge-topbar-actions">
          {surface === "app" ? <ForgePathCommand /> : null}
          <ForgeTrustLine className="forge-topbar-disclosure" />
        </div>
      </header>
      {children}
      {mobileNavigation
        ? <MobileNavigation active={active} items={mobileItems} />
        : null}
    </div>
  );
}

export function ForgeWorldFrame({
  children,
  worldLabel,
  exitHref = "/paths",
}: {
  children: ReactNode;
  worldLabel: string;
  exitHref?: string;
}) {
  return (
    <div className="forge-world-frame">
      <a className="forge-skip-link" href="#world-content">
        Skip to learning world
      </a>
      <header className="forge-worldbar">
        <Brand />
        <span className="forge-worldbar-title">{worldLabel}</span>
        <Link className="forge-exit-world" href={exitHref}>
          Exit world
          <ArrowIcon />
        </Link>
      </header>
      <div id="world-content" tabIndex={-1}>{children}</div>
    </div>
  );
}

export function ForgeArrow() {
  return <ArrowIcon />;
}
