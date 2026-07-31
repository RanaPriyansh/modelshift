import Image from "next/image";

import styles from "./FieldGuideIPhoneSample.module.css";

type FieldGuideIconName = "backpack" | "compass" | "notes" | "profile";

function FieldGuideIcon({ name }: { name: FieldGuideIconName }) {
  if (name === "compass") {
    return (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z" />
      </svg>
    );
  }

  if (name === "notes") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 5.5h6.3c1 0 1.7.6 1.7 1.5v12c0-1.1-.8-1.8-2-1.8H4V5.5Zm16 0h-6.3c-1 0-1.7.6-1.7 1.5v12c0-1.1.8-1.8 2-1.8h6V5.5Z" />
      </svg>
    );
  }

  if (name === "backpack") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M7 9V7a5 5 0 0 1 10 0v2M5 10.5A2.5 2.5 0 0 1 7.5 8h9a2.5 2.5 0 0 1 2.5 2.5V21H5V10.5Z" />
        <path d="M8 14h8v4H8z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

const FIELD_GUIDE_TABS = [
  ["compass", "Today"],
  ["notes", "Field Notes"],
  ["backpack", "Backpack"],
  ["profile", "Profile"],
] as const satisfies ReadonlyArray<readonly [FieldGuideIconName, string]>;

export function FieldGuideIPhoneSample() {
  return (
    <figure className={styles.figure}>
      <div className={styles.phone} aria-hidden="true">
        <span className={styles.sideButton} data-side="left" />
        <span className={styles.sideButton} data-side="right" />
        <div className={styles.screen}>
          <Image
            className={styles.landscape}
            src="/forge/landscapes/learning-threshold-cobalt.png"
            alt=""
            fill
            sizes="(max-width: 460px) 88vw, 390px"
          />
          <div className={styles.statusBar}>
            <span>9:41</span>
            <span className={styles.statusMarks}>
              <i />
              <i />
              <i />
            </span>
          </div>
          <span className={styles.dynamicIsland} />
          <header className={styles.header}>
            <span>
              <strong>Today</strong>
              <small>Make one useful move.</small>
            </span>
            <i className={styles.menu}>
              <b />
              <b />
              <b />
            </i>
          </header>

          <section className={styles.actionCard}>
            <p>One useful move.</p>
            <div className={styles.actionTitle}>
              <span>
                <svg viewBox="0 0 24 24">
                  <path d="m5 19 2.8-7.7L16.6 2.5l4.9 4.9-8.8 8.8L5 19Z" />
                  <path d="m13.7 5.4 4.9 4.9M5 19l4.2-1.5L6.5 14.8 5 19Z" />
                </svg>
              </span>
              <div>
                <strong>Write your first model</strong>
                <small>Put your thinking on paper so you can improve it.</small>
              </div>
            </div>
            <dl>
              <div>
                <dt>Why now</dt>
                <dd>This makes the next gap visible.</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>15–20 min</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>Offline OK</dd>
              </div>
            </dl>
            <span className={styles.primaryAction}>Start</span>
          </section>

          <nav className={styles.tabBar}>
            {FIELD_GUIDE_TABS.map(([icon, label], index) => (
              <span className={index === 0 ? styles.activeTab : undefined} key={label}>
                <FieldGuideIcon name={icon} />
                <small>{label}</small>
              </span>
            ))}
          </nav>
          <span className={styles.homeIndicator} />
        </div>
      </div>
      <figcaption>
        Field Guide Today sample. This display study is not a native iOS implementation.
      </figcaption>
    </figure>
  );
}
