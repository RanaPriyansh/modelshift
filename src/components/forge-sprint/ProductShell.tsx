import Link from "next/link";
import type { ReactNode } from "react";

export type ProductSection = "build" | "sprints" | "templates" | "labs";

const NAVIGATION: ReadonlyArray<{ href: string; label: string; section: ProductSection }> = [
  { href: "/build", label: "Build", section: "build" },
  { href: "/sprints", label: "My Sprints", section: "sprints" },
  { href: "/templates", label: "Templates", section: "templates" },
  { href: "/labs", label: "Labs", section: "labs" },
];

export function ProductShell({
  active,
  children,
  quiet = false,
}: {
  active?: ProductSection;
  children: ReactNode;
  quiet?: boolean;
}) {
  return (
    <div className="forge-sprint-app">
      <a className="forge-sprint-skip" href="#forge-sprint-main">Skip to content</a>
      <header className="forge-sprint-header">
        <div className="forge-sprint-header__inner">
          <Link className="forge-sprint-wordmark" href="/" aria-label="FORGE Learning OS home">
            <span aria-hidden="true">F</span>
            <strong>FORGE <small>Project Sprint</small></strong>
          </Link>
          <nav className="forge-sprint-nav" aria-label="Primary navigation">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active === item.section ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {!quiet ? (
            <Link className="forge-sprint-header__action" href="/build/new">
              Start a sprint <span aria-hidden="true">↗</span>
            </Link>
          ) : null}
        </div>
      </header>
      {children}
      <footer className="forge-sprint-footer">
        <div>
          <Link className="forge-sprint-wordmark forge-sprint-wordmark--footer" href="/">
            <span aria-hidden="true">F</span>
            <strong>FORGE <small>Project Sprint</small></strong>
          </Link>
          <p>Build useful work. Keep the proof honest.</p>
        </div>
        <p>No account · No feed · Stored on this browser</p>
        <nav aria-label="Footer navigation">
          <Link href="/templates">Templates</Link>
          <Link href="/labs">Learning Labs</Link>
          <Link href="/paths">FORGE Learning OS</Link>
        </nav>
      </footer>
    </div>
  );
}
