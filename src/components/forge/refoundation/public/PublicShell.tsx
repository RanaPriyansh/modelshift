import Link from "next/link";
import type { ReactNode } from "react";

import { ForgeTrustLine } from "@/src/components/forge/ForgePrimitives";
import { ForgeThemeControl } from "@/src/components/forge/ForgeThemeControl";

import styles from "./PublicShell.module.css";

export const PUBLIC_NAV_ITEMS = [
  { href: "/paths", label: "Paths", section: "paths" },
  { href: "/how-forge-works", label: "How FORGE works", section: "how" },
  { href: "/trust", label: "Evidence and trust", section: "trust" },
  { href: "/start", label: "Start learning", section: "start" },
] as const;

function PublicNavIcon({ section }: { section: string }) {
  if (section === "paths") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h6.3c1 0 1.7.5 1.7 1.4v12.6c0-1.1-.8-1.8-2-1.8H4V5.5Zm16 0h-6.3c-1 0-1.7.5-1.7 1.4v12.6c0-1.1.8-1.8 2-1.8h6V5.5Z" />
      </svg>
    );
  }

  if (section === "how") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 19 7v5.8c0 4.1-2.8 6.8-7 8.2-4.2-1.4-7-4.1-7-8.2V7l7-3.5Zm0 4v5m0 3.6v.1" />
      </svg>
    );
  }

  if (section === "trust") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 18.5c2.2-6.8 4.4-2.4 6.2-7.2C13 6.6 16 10.8 19 5.5M5 18.5h4M19 5.5h-4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

function isPublicNavItemActive(active: string, section: string) {
  return active === section || (active === "learn" && section === "how");
}

function PublicPrimaryNavigation({ active }: { active: string }) {
  return (
    <nav className={styles.primaryNav} aria-label="Public navigation">
      {PUBLIC_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isPublicNavItemActive(active, item.section) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function PublicMobileNavigation({ active }: { active: string }) {
  return (
    <nav className={styles.mobileNav} aria-label="Public mobile navigation">
      {PUBLIC_NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isPublicNavItemActive(active, item.section) ? "page" : undefined}
        >
          <PublicNavIcon section={item.section} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.footerWordmark} href="/">
          FORGE
        </Link>
        <p>Find the path. Do the work. Prove what remains.</p>
      </div>
      <nav aria-label="Public footer navigation">
        {PUBLIC_NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/pricing">Pricing</Link>
        <Link href="/build">Project Sprint</Link>
        <Link href="/app">Open app</Link>
        <Link href="/sign-in">Device access</Link>
      </nav>
      <p className={styles.footerTruth}>
        Four reviewed Worlds work in this build. Broader paths remain candidate directions
        until their sources, work, projects, and proof are reviewed.
      </p>
    </footer>
  );
}

export function PublicShell({
  active,
  children,
  overlayHeader = false,
  rootClassName,
  shellClassName,
}: {
  active: string;
  children: ReactNode;
  overlayHeader?: boolean;
  rootClassName?: string;
  shellClassName?: string;
}) {
  return (
    <div
      className={[styles.shell, shellClassName, rootClassName].filter(Boolean).join(" ")}
      data-forge-surface="public"
    >
      <a className={`${styles.skipLink} forge-skip-link`} href="#forge-main" tabIndex={0}>
        Skip to main content
      </a>
      <header className={`${styles.header} ${overlayHeader ? styles.overlay : ""}`}>
        <Link className={styles.wordmark} href="/" aria-label="FORGE Learning OS home">
          <strong>FORGE</strong>
          <span>Learning OS</span>
        </Link>
        <PublicPrimaryNavigation active={active} />
        <div className={styles.actions}>
          <ForgeTrustLine className={styles.trustLine} />
          <ForgeThemeControl overlay={overlayHeader} />
          <Link className={styles.signIn} href="/sign-in">
            Sign in
          </Link>
          {overlayHeader ? (
            <Link className={styles.headerCta} href="/start">
              Start learning
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </header>
      {children}
      <PublicFooter />
      <PublicMobileNavigation active={active} />
    </div>
  );
}
