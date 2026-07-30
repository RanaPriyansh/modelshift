import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./orient.module.css";

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 10V7a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Zm4 4v2" />
    </svg>
  );
}
export function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h13m-5-5 5 5-5 5" />
    </svg>
  );
}

export function OrientFrame({
  children,
  aside,
  status = "Private on this device",
}: {
  children: ReactNode;
  aside?: ReactNode;
  status?: string;
}) {
  return (
    <div className={styles.frame}>
      <a className={styles.skipLink} href="#forge-main" tabIndex={0}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="FORGE home">
          <span aria-hidden="true">F</span>
          <strong>FORGE</strong>
        </Link>
        <p className={styles.deviceStatus}>
          <LockIcon />
          <span>{status}</span>
        </p>
        <Link className={styles.homeLink} href="/">
          Back to Forge
        </Link>
      </header>
      <div className={aside ? styles.split : styles.centered}>
        {aside ? <aside className={styles.aside}>{aside}</aside> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
