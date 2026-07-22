import Link from "next/link";
import type { ReactNode } from "react";

import { ForgeTrustLine } from "./ForgePrimitives";

type ForgeSection = "home" | "learn" | "studio" | "trail" | "evidence" | "account";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
  { href: "/#worlds", label: "Learn", section: "learn" },
  { href: "/studio", label: "Studio", section: "studio" },
  { href: "/trail", label: "Trail", section: "trail" },
  { href: "/evidence", label: "Evidence", section: "evidence" },
  { href: "/account", label: "Account", section: "account" },
];

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

function Brand() {
  return (
    <Link className="forge-brand" href="/" aria-label="FORGE Learning OS home">
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
  if (section === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4v-9Z" />
      </svg>
    );
  }

  if (section === "learn") {
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

  if (section === "account") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.8-4 3.2-6 7-6s6.2 2 7 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h9l3 3v14H6v-17Zm9 0v4h3M9 12h6M9 16h4" />
    </svg>
  );
}

function PrimaryNavigation({ active }: { active: ForgeSection }) {
  return (
    <nav className="forge-primary-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => (
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

function MobileNavigation({ active }: { active: ForgeSection }) {
  const items: ReadonlyArray<{ href: string; label: string; section: ForgeSection }> = [
    { href: "/", label: "Home", section: "home" },
    ...NAV_ITEMS,
  ];

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
}: {
  active: ForgeSection;
  children: ReactNode;
}) {
  return (
    <div className="forge-shell">
      <a className="forge-skip-link" href="#forge-main">
        Skip to main content
      </a>
      <header className="forge-topbar">
        <Brand />
        <PrimaryNavigation active={active} />
        <ForgeTrustLine className="forge-topbar-disclosure" />
      </header>
      {children}
      <MobileNavigation active={active} />
    </div>
  );
}

export function ForgeWorldFrame({
  children,
  worldLabel,
}: {
  children: ReactNode;
  worldLabel: string;
}) {
  return (
    <div className="forge-world-frame">
      <a className="forge-skip-link" href="#world-content">
        Skip to learning world
      </a>
      <header className="forge-worldbar">
        <Brand />
        <span className="forge-worldbar-title">{worldLabel}</span>
        <Link className="forge-exit-world" href="/#worlds">
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
