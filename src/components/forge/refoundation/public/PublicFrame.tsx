import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./PublicExperience.module.css";

type PublicSection =
  | "home"
  | "paths"
  | "how"
  | "trust"
  | "explore"
  | "modelshift"
  | "pricing";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; section: PublicSection }> = [
  { href: "/paths", label: "Paths", section: "paths" },
  { href: "/how-forge-works", label: "How FORGE works", section: "how" },
  { href: "/trust", label: "Evidence and trust", section: "trust" },
];

export function PublicFrame({
  children,
  active,
  overlayHeader = false,
}: {
  children: ReactNode;
  active: PublicSection;
  overlayHeader?: boolean;
}) {
  return (
    <div className={styles.publicRoot}>
      <a className={`${styles.skipLink} forge-skip-link`} href="#forge-main" tabIndex={0}>
        Skip to main content
      </a>
      <header
        className={`${styles.siteHeader} ${overlayHeader ? styles.siteHeaderOverlay : ""}`}
      >
        <Link className={styles.wordmark} href="/" aria-label="FORGE home">
          FORGE
          <span>Learning OS</span>
        </Link>
        <nav className={styles.primaryNav} aria-label="Public">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.section ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.quietHeaderLink} href="/sign-in">
            Device access
          </Link>
          <Link className={styles.headerCta} href="/start">
            Start learning
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
      {children}
      <footer className={styles.siteFooter}>
        <div>
          <Link className={styles.footerWordmark} href="/">
            FORGE
          </Link>
          <p>Find the path. Do the work. Prove what remains.</p>
        </div>
        <nav aria-label="Footer">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/start">Start learning</Link>
          <Link href="/sign-in">Device access</Link>
        </nav>
        <p className={styles.footerTruth}>
          Four reviewed Worlds work in this build. Broader paths remain candidate directions
          until their sources, work, projects, and proof are reviewed.
        </p>
      </footer>
    </div>
  );
}
