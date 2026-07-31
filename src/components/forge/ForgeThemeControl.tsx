"use client";

import { useEffect, useId, useState } from "react";

import styles from "./ForgeThemeControl.module.css";

const THEME_STORAGE_KEY = "forge.color-theme.v1";

export type ForgeThemePreference = "system" | "light" | "dark";

function isThemePreference(value: string | null): value is ForgeThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function applyThemePreference(preference: ForgeThemePreference) {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-forge-theme");
    return;
  }
  document.documentElement.setAttribute("data-forge-theme", preference);
}

export function ForgeThemeControl({ overlay = false }: { overlay?: boolean }) {
  const id = useId();
  const [preference, setPreference] = useState<ForgeThemePreference>("system");

  useEffect(() => {
    let storedPreference: string | null = null;
    try {
      storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      storedPreference = null;
    }
    const nextPreference = isThemePreference(storedPreference) ? storedPreference : "system";
    const frame = window.requestAnimationFrame(() => {
      setPreference(nextPreference);
      applyThemePreference(nextPreference);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function updatePreference(nextPreference: ForgeThemePreference) {
    setPreference(nextPreference);
    applyThemePreference(nextPreference);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // The active theme still works for this page when browser storage is unavailable.
    }
  }

  return (
    <label className={`${styles.control} ${overlay ? styles.overlay : ""}`} htmlFor={id}>
      <span className={styles.label}>Color theme</span>
      <select
        className={styles.select}
        id={id}
        value={preference}
        onChange={(event) => updatePreference(event.currentTarget.value as ForgeThemePreference)}
      >
        <option value="system">System theme</option>
        <option value="light">Light theme</option>
        <option value="dark">Dark theme</option>
      </select>
    </label>
  );
}
